package handlers

import (
	"context"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"

	"crochet-backend-go/internal/db"
	"crochet-backend-go/internal/razorpay"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrdersHandler struct {
	Queries db.Queries
	DB      *pgxpool.Pool
}

type OrderItemRequest struct {
	ProductID string `json:"product_id" validate:"required"`
	Quantity  int32  `json:"quantity" validate:"required,gt=0"`
}

type CreateOrderRequest struct {
	ShippingAddress string             `json:"shipping_address" validate:"required"`
	Items           []OrderItemRequest `json:"items" validate:"required,min=1"`
}

// CreateOrder handles stock checking, database pricing, address mapping, and Razorpay Order launching
func (h *OrdersHandler) CreateOrder(c *gin.Context) {
	userIdStr, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context session missing."})
		return
	}

	userID, err := uuid.Parse(userIdStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user context."})
		return
	}

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()

	var pgUserID pgtype.UUID
	pgUserID.Bytes = userID
	pgUserID.Valid = true

	// Verify user exists in database (defends against stale session tokens after db wipes)
	_, err = h.Queries.GetUserByID(ctx, pgUserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Your login session is stale (user no longer exists in database). Please Logout and Login/Register again."})
		return
	}

	// Open Transaction
	tx, err := h.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open database transaction session."})
		return
	}
	defer tx.Rollback(ctx)

	qtx := h.Queries.WithTx(tx)

	// 1. Resolve or Create shipping address for user
	// Check if user has any address. If not, split/save the shipping_address string.
	addrs, err := qtx.ListAddressesByUserID(ctx, pgUserID)
	var addressRecord db.Addresses
	if err == nil && len(addrs) > 0 {
		addressRecord = addrs[0]
	} else {
		// Create a mock shipping address row using the text string
		parts := strings.Split(req.ShippingAddress, ",")
		line1 := req.ShippingAddress
		city := "Cozy Town"
		state := "Crochet State"
		pincode := "700001"

		if len(parts) >= 3 {
			line1 = strings.TrimSpace(parts[0])
			city = strings.TrimSpace(parts[1])
			// Last part might contain zip
			zipParts := strings.Fields(strings.TrimSpace(parts[len(parts)-1]))
			if len(zipParts) > 0 {
				pincode = zipParts[len(zipParts)-1]
			}
			state = strings.TrimSpace(parts[2])
		}

		addressRecord, err = qtx.CreateAddress(ctx, db.CreateAddressParams{
			UserID:    pgUserID,
			Line1:     line1,
			Line2:     pgtype.Text{String: "", Valid: false},
			City:      city,
			State:     state,
			Pincode:   pincode,
			IsDefault: true,
		})
		if err != nil {
			log.Printf("[Checkout Error] Failed to create address record: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipping address record."})
			return
		}
	}

	var calculatedTotal float64 = 0.0
	type itemDetail struct {
		variantID       pgtype.UUID
		quantity        int32
		priceAtPurchase float64
	}
	var itemsToInsert []itemDetail

	// 2. Fetch variants and enforce database pricing by joining product slugs
	for _, item := range req.Items {
		// Look up product variant using product slug (e.g. "panda", "brown-bear")
		variant, err := qtx.GetVariantByProductSlugForUpdate(ctx, item.ProductID)
		if err != nil {
			log.Printf("[Checkout Error] Variant slug lookup failed for '%s': %v", item.ProductID, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Product SKU not found: %s", item.ProductID)})
			return
		}

		if variant.StockQuantity < item.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Insufficient stock for %s. Only %d items available.", variant.ProductName, variant.StockQuantity),
			})
			return
		}

		// Re-read price from database
		fValue, _ := variant.Price.Float64Value()
		priceVal := fValue.Float64
		calculatedTotal += priceVal * float64(item.Quantity)

		itemsToInsert = append(itemsToInsert, itemDetail{
			variantID:       variant.ID,
			quantity:        item.Quantity,
			priceAtPurchase: priceVal,
		})
	}

	// Calculate cozy shipping (₹99.00 flat shipping)
	const shippingFee float64 = 99.00
	grandTotal := calculatedTotal + shippingFee

	// 3. Create the Local Order with status = PENDING
	// We use a temporary Razorpay order ID initially and replace it after the API call
	tempRzpOrderID := "temp_" + uuid.NewString()
	
	var pgTotal pgtype.Numeric
	pgTotal.Scan(fmt.Sprintf("%.2f", grandTotal))

	orderParams := db.CreateOrderParams{
		UserID:          pgUserID,
		AddressID:       addressRecord.ID,
		Status:          "pending",
		TotalAmount:     pgTotal,
		RazorpayOrderID: tempRzpOrderID,
	}

	localOrder, err := qtx.CreateOrder(ctx, orderParams)
	if err != nil {
		log.Printf("[Checkout Error] Failed to create order row: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checkout order row."})
		return
	}

	// 4. Create local order item rows
	for _, item := range itemsToInsert {
		var pgPrice pgtype.Numeric
		pgPrice.Scan(fmt.Sprintf("%.2f", item.priceAtPurchase))

		_, err = qtx.CreateOrderItem(ctx, db.CreateOrderItemParams{
			OrderID:         localOrder.ID,
			VariantID:       item.variantID,
			Quantity:        item.quantity,
			PriceAtPurchase: pgPrice,
		})
		if err != nil {
			log.Printf("[Checkout Error] Failed to insert order items: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to map order items to checkout record."})
			return
		}
	}

	// 5. Connect to Razorpay API to generate Payment Order ID
	rzClient := razorpay.NewClient()
	amountInPaise := int64(math.Round(grandTotal * 100))
	
	localOrderIDStr, _ := uuid.FromBytes(localOrder.ID.Bytes[:])
	rzOrder, err := rzClient.CreateOrder(amountInPaise, localOrderIDStr.String())
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to initiate payment session with Razorpay gateway."})
		return
	}

	// 6. Update the temporary order id with Razorpay's returned official Order ID
	err = qtx.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{
		ID:     localOrder.ID,
		Status: "pending",
	})
	if err != nil {
		log.Printf("[Checkout Error] Failed to update temporary order status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize database order."})
		return
	}

	// Explicit override of the Razorpay Order ID
	_, err = tx.Exec(ctx, "UPDATE orders SET razorpay_order_id = $1 WHERE id = $2", rzOrder.ID, localOrder.ID)
	if err != nil {
		log.Printf("[Checkout Error] Failed to override Razorpay Order ID: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to map payment tokens."})
		return
	}

	// Commit Transaction
	err = tx.Commit(ctx)
	if err != nil {
		log.Printf("[Checkout Error] Transaction commit failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit order details."})
		return
	}

	// Return data parameters to frontend standard checkout
	c.JSON(http.StatusCreated, gin.H{
		"success":         true,
		"orderId":         localOrderIDStr,
		"order_id":        localOrderIDStr.String(),
		"razorpayOrderId": rzOrder.ID,
		"amount":          rzOrder.Amount,
		"currency":        rzOrder.Currency,
		"keyId":           rzClient.KeyID,
	})
}

// GET /api/orders - List user order histories
func (h *OrdersHandler) ListOrders(c *gin.Context) {
	userIdStr, _ := c.Get("userId")
	userID, _ := uuid.Parse(userIdStr.(string))

	ctx := context.Background()

	var pgUserID pgtype.UUID
	pgUserID.Bytes = userID
	pgUserID.Valid = true

	orders, err := h.Queries.ListOrdersByUserID(ctx, pgUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order history."})
		return
	}

	type orderDetailResponse struct {
		db.Orders
		Items     []db.GetOrderItemsByOrderIDRow `json:"items"`
		Shipments []db.Shipments                 `json:"shipments"`
	}

	var results []orderDetailResponse
	for _, o := range orders {
		items, err := h.Queries.GetOrderItemsByOrderID(ctx, o.ID)
		if err != nil {
			items = []db.GetOrderItemsByOrderIDRow{}
		}

		shipments, err := h.Queries.GetShipmentsByOrderID(ctx, o.ID)
		if err != nil {
			shipments = []db.Shipments{}
		}

		results = append(results, orderDetailResponse{
			Orders:    o,
			Items:     items,
			Shipments: shipments,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "orders": results})
}

// GET /api/orders/:id/track - Tracking detail fetches
func (h *OrdersHandler) TrackOrder(c *gin.Context) {
	userIdStr, _ := c.Get("userId")
	userID, _ := uuid.Parse(userIdStr.(string))

	orderIDStr := c.Param("id")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID format."})
		return
	}

	ctx := context.Background()

	var pgOrderID pgtype.UUID
	pgOrderID.Bytes = orderID
	pgOrderID.Valid = true

	var pgUserID pgtype.UUID
	pgUserID.Bytes = userID
	pgUserID.Valid = true

	order, err := h.Queries.GetOrderByID(ctx, pgOrderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found."})
		return
	}

	if order.UserID != pgUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to order."})
		return
	}

	shipments, err := h.Queries.GetShipmentsByOrderID(ctx, order.ID)
	if err != nil {
		shipments = []db.Shipments{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"orderId":     orderID,
		"orderStatus": order.Status,
		"shipments":   shipments,
	})
}

type VerifyPaymentRequest struct {
	RazorpayPaymentID string `json:"razorpayPaymentId" validate:"required"`
	RazorpayOrderID   string `json:"razorpayOrderId" validate:"required"`
	RazorpaySignature string `json:"razorpaySignature" validate:"required"`
}

// POST /api/orders/verify - Synchronous payment verification endpoint using Razorpay cryptographic signature check
func (h *OrdersHandler) VerifyPayment(c *gin.Context) {
	var req VerifyPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()

	// 1. Verify Payment Signature
	rzClient := razorpay.NewClient()
	err := rzClient.VerifyPaymentSignature(req.RazorpayOrderID, req.RazorpayPaymentID, req.RazorpaySignature)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cryptographic signature check failed. Unauthorized payment."})
		return
	}

	// 2. Finalize order state inside a secure database transaction
	tx, err := h.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start verification transaction."})
		return
	}
	defer tx.Rollback(ctx)

	qtx := h.Queries.WithTx(tx)

	order, err := qtx.GetOrderByRazorpayOrderID(ctx, req.RazorpayOrderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order matching Razorpay ID not found."})
		return
	}

	if order.Status == "paid" {
		tx.Commit(ctx)
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Order has already been processed and paid."})
		return
	}

	// a) Update status to 'paid'
	err = qtx.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{
		ID:     order.ID,
		Status: "paid",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize order status."})
		return
	}

	var pgAmount pgtype.Numeric
	fVal, _ := order.TotalAmount.Float64Value()
	pgAmount.Scan(fmt.Sprintf("%.2f", fVal.Float64))

	// b) Insert Payment record row
	_, err = qtx.CreatePayment(ctx, db.CreatePaymentParams{
		OrderID:           order.ID,
		RazorpayPaymentID: req.RazorpayPaymentID,
		RazorpaySignature: req.RazorpaySignature,
		Status:            "captured",
		Amount:            pgAmount,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log payment transaction details."})
		return
	}

	// c) Decrement variant stock
	items, err := qtx.GetOrderItemsByOrderID(ctx, order.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify order details."})
		return
	}

	for _, item := range items {
		variant, err := qtx.GetVariantByIDForUpdate(ctx, item.VariantID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Variant no longer exists."})
			return
		}

		if variant.StockQuantity < item.Quantity {
			c.JSON(http.StatusConflict, gin.H{"error": "Insufficient stock levels to complete verification."})
			return
		}

		newStock := variant.StockQuantity - item.Quantity
		err = qtx.UpdateVariantStock(ctx, db.UpdateVariantStockParams{
			ID:            item.VariantID,
			StockQuantity: newStock,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decrement product variant stock."})
			return
		}
	}

	err = tx.Commit(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit verification transaction."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Order verified and payment recorded successfully."})
}
