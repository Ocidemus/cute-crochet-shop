package handlers

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"crochet-backend-go/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminHandler struct {
	Queries db.Queries
	DB      *pgxpool.Pool
}

type CreateShipmentRequest struct {
	OrderID        string `json:"orderId" validate:"required,uuid"`
	CourierName    string `json:"courierName" validate:"required,min=2"`
	TrackingNumber string `json:"trackingNumber" validate:"required,min=3"`
}

// AdminAuth limits routes to admin users by checking the database for the official email
func (h *AdminHandler) AdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userIdVal, exists := c.Get("userId")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized session."})
			c.Abort()
			return
		}
		
		userIdStr := userIdVal.(string)
		userID, err := uuid.Parse(userIdStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session."})
			c.Abort()
			return
		}

		var pgUserID pgtype.UUID
		pgUserID.Bytes = userID
		pgUserID.Valid = true

		user, err := h.Queries.GetUserByID(context.Background(), pgUserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found."})
			c.Abort()
			return
		}
		
		if user.Email != "craftingforyouofficial@gmail.com" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied. Only the store owner can access the admin portal."})
			c.Abort()
			return
		}

		c.Next()
	}
}

// POST /api/admin/shipments - Updates order status to shipped and logs shipment details
func (h *AdminHandler) AttachShipment(c *gin.Context) {
	var req CreateShipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID format."})
		return
	}

	ctx := context.Background()

	var pgOrderID pgtype.UUID
	pgOrderID.Bytes = orderID
	pgOrderID.Valid = true

	// Verify order exists
	order, err := h.Queries.GetOrderByID(ctx, pgOrderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order details not found."})
		return
	}

	if order.Status != "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order cannot be shipped. Current state is: " + order.Status})
		return
	}

	// Create Shipment and update Order status in a transaction
	tx, err := h.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipment transaction."})
		return
	}
	defer tx.Rollback(ctx)

	qtx := h.Queries.WithTx(tx)

	// 1. Update Order status to 'shipped'
	err = qtx.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{
		ID:     pgOrderID,
		Status: "shipped",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order state."})
		return
	}

	// 2. Create Shipment record
	shipment, err := qtx.CreateShipment(ctx, db.CreateShipmentParams{
		OrderID:        pgOrderID,
		CourierName:    req.CourierName,
		TrackingNumber: req.TrackingNumber,
		Status:         "shipped",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipment log."})
		return
	}

	err = tx.Commit(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize shipment transaction."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":   true,
		"message":   "Shipment tracking mapped and order status marked SHIPPED.",
		"shipment":  shipment,
	})
}

// GET /api/admin/orders - Returns list of all customer orders with metadata for Admin Portal
func (h *AdminHandler) ListAllOrders(c *gin.Context) {
	ctx := c.Request.Context()

	query := `
		SELECT 
			o.id, o.status, o.total_amount, o.razorpay_order_id, o.created_at,
			u.email, u.name, COALESCE(u.phone, ''),
			COALESCE(a.line1, ''), COALESCE(a.line2, ''), COALESCE(a.city, ''), COALESCE(a.state, ''), COALESCE(a.pincode, ''),
			COALESCE(s.courier_name, ''), COALESCE(s.tracking_number, ''), COALESCE(s.status, '')
		FROM orders o
		JOIN users u ON o.user_id = u.id
		LEFT JOIN addresses a ON o.address_id = a.id
		LEFT JOIN shipments s ON o.id = s.order_id
		ORDER BY o.created_at DESC
	`

	rows, err := h.DB.Query(ctx, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders list: " + err.Error()})
		return
	}
	defer rows.Close()

	type AdminOrder struct {
		ID              string  `json:"id"`
		Status          string  `json:"status"`
		TotalAmount     float64 `json:"total_amount"`
		RazorpayOrderID string  `json:"razorpay_order_id"`
		CreatedAt       string  `json:"created_at"`
		UserEmail       string  `json:"user_email"`
		UserName        string  `json:"user_name"`
		UserPhone       string  `json:"user_phone"`
		Address         struct {
			Line1   string `json:"line1"`
			Line2   string `json:"line2"`
			City    string `json:"city"`
			State   string `json:"state"`
			Pincode string `json:"pincode"`
		} `json:"address"`
		Shipment struct {
			CourierName    string `json:"courier_name"`
			TrackingNumber string `json:"tracking_number"`
			Status         string `json:"status"`
		} `json:"shipment"`
		Items []map[string]interface{} `json:"items"`
	}

	orders := []AdminOrder{}

	for rows.Next() {
		var o AdminOrder
		var pgID pgtype.UUID
		var total pgtype.Numeric
		var createdAt pgtype.Timestamptz

		err := rows.Scan(
			&pgID, &o.Status, &total, &o.RazorpayOrderID, &createdAt,
			&o.UserEmail, &o.UserName, &o.UserPhone,
			&o.Address.Line1, &o.Address.Line2, &o.Address.City, &o.Address.State, &o.Address.Pincode,
			&o.Shipment.CourierName, &o.Shipment.TrackingNumber, &o.Shipment.Status,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan order row: " + err.Error()})
			return
		}

		if pgID.Valid {
			uID, _ := pgID.Value()
			if strVal, ok := uID.(string); ok {
				o.ID = strVal
			} else {
				var bytes [16]byte
				copy(bytes[:], pgID.Bytes[:])
				u, _ := uuid.FromBytes(bytes[:])
				o.ID = u.String()
			}
		}

		if total.Valid {
			fVal, _ := total.Float64Value()
			o.TotalAmount = fVal.Float64
		}

		if createdAt.Valid {
			o.CreatedAt = createdAt.Time.Format("2006-01-02T15:04:05Z")
		}

		// Fetch items for this order
		itemRows, err := h.Queries.GetOrderItemsByOrderID(ctx, pgID)
		if err == nil {
			for _, item := range itemRows {
				priceVal, _ := item.PriceAtPurchase.Float64Value()
				o.Items = append(o.Items, map[string]interface{}{
					"product_name": item.ProductName,
					"variant_name": item.VariantName,
					"sku":          item.Sku,
					"quantity":     item.Quantity,
					"price":        priceVal.Float64,
				})
			}
		}
		if o.Items == nil {
			o.Items = []map[string]interface{}{}
		}

		orders = append(orders, o)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"orders":  orders,
	})
}

// POST /api/admin/upload - Uploads a product image
func (h *AdminHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image uploaded."})
		return
	}

	// Generate a unique filename
	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext

	// Save the file to the static assets directory
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../cute-crochet-shop/static"
	}
	
	uploadPath := filepath.Join(staticDir, "assets", "uploads")
	// Ensure directory exists
	os.MkdirAll(uploadPath, os.ModePerm)

	savePath := filepath.Join(uploadPath, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"url":     "/assets/uploads/" + filename,
	})
}

type CreateProductRequest struct {
	Name        string   `json:"name" validate:"required"`
	Description string   `json:"description" validate:"required"`
	Price       float64  `json:"price" validate:"required,gt=0"`
	Images      []string `json:"images" validate:"required"`
}

// POST /api/admin/products - Creates a new product
func (h *AdminHandler) CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	
	// Create slug from name
	slug := strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
	slug = strings.ReplaceAll(slug, "/", "-")
	slug = fmt.Sprintf("%s-%s", slug, uuid.New().String()[:8]) // ensure uniqueness

	var price pgtype.Numeric
	price.Scan(strconv.FormatFloat(req.Price, 'f', 2, 64))

	product, err := h.Queries.CreateProduct(ctx, db.CreateProductParams{
		Slug:        slug,
		Name:        req.Name,
		Description: req.Description,
		Price:       price,
		Images:      req.Images,
		IsActive:    true,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"product": product,
	})
}

// DELETE /api/admin/products/:id - Deletes a product
func (h *AdminHandler) DeleteProduct(c *gin.Context) {
	productIDParam := c.Param("id")
	productID, err := uuid.Parse(productIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID."})
		return
	}

	ctx := context.Background()
	var pgProductID pgtype.UUID
	pgProductID.Bytes = productID
	pgProductID.Valid = true

	err = h.Queries.DeleteProduct(ctx, pgProductID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Product deleted successfully.",
	})
}
