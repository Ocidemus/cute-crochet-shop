package handlers

import (
	"context"
	"net/http"
	"os"

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

// AdminAuth limits routes to admin queries using x-admin-key headers
func AdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		adminKey := c.GetHeader("X-Admin-Key")
		expectedKey := os.Getenv("ADMIN_API_KEY")

		if expectedKey == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Admin portal key is not configured on server."})
			c.Abort()
			return
		}

		if adminKey == "" || adminKey != expectedKey {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied. Invalid or missing administrator credentials."})
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
