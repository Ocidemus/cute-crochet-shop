package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"crochet-backend-go/internal/db"
	"crochet-backend-go/internal/razorpay"

	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WebhooksHandler struct {
	Queries db.Queries
	DB      *pgxpool.Pool
}

type RazorpayPaymentEntity struct {
	ID      string `json:"id"`
	OrderID string `json:"order_id"`
	Amount  int64  `json:"amount"` // in paise
	Status  string `json:"status"`
}

type RazorpayPayload struct {
	Payment struct {
		Entity RazorpayPaymentEntity `json:"entity"`
	} `json:"payment"`
}

type RazorpayWebhookEvent struct {
	Event   string          `json:"event"`
	Payload RazorpayPayload `json:"payload"`
}

// POST /api/webhooks/razorpay - Captures Razorpay payment webhooks, verifies HMAC signature, updates order status, and reserves stock
func (h *WebhooksHandler) HandleRazorpay(c *gin.Context) {
	signature := c.GetHeader("X-Razorpay-Signature")
	if signature == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing X-Razorpay-Signature header."})
		return
	}

	// 1. Read raw body payload buffer for HMAC-SHA256 verification
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read request body."})
		return
	}

	rzClient := razorpay.NewClient()
	err = rzClient.VerifyWebhookSignature(bodyBytes, signature)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 2. Parse event structure
	var webhookEvent RazorpayWebhookEvent
	if err := json.Unmarshal(bodyBytes, &webhookEvent); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook JSON structure."})
		return
	}

	// 3. Process payment status (handle order.paid or payment.captured)
	if webhookEvent.Event == "order.paid" || webhookEvent.Event == "payment.captured" {
		entity := webhookEvent.Payload.Payment.Entity
		rzpOrderID := entity.OrderID
		rzpPaymentID := entity.ID
		amountInRupees := float64(entity.Amount) / 100.0

		if rzpOrderID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing order_id in payment entity."})
			return
		}

		ctx := context.Background()

		// Run order finalizing and stock decrementing inside a single database transaction
		// This guarantees that we never save payments without decrementing stock (no oversell)
		tx, err := h.DB.BeginTx(ctx, pgx.TxOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to lock database transaction."})
			return
		}
		defer tx.Rollback(ctx)

		qtx := h.Queries.WithTx(tx)

		// Get local order mapping to this Razorpay Order ID
		order, err := qtx.GetOrderByRazorpayOrderID(ctx, rzpOrderID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order matching Razorpay ID not found."})
			return
		}

		// Idempotency: skip if already paid
		if order.Status == "paid" {
			tx.Commit(ctx)
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "Order was already marked paid."})
			return
		}

		// a) Update status to 'paid'
		err = qtx.UpdateOrderStatus(ctx, db.UpdateOrderStatusParams{
			ID:     order.ID,
			Status: "paid",
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order state."})
			return
		}

		var pgAmount pgtype.Numeric
		pgAmount.Scan(fmt.Sprintf("%.2f", amountInRupees))

		// b) Insert Payment log row
		_, err = qtx.CreatePayment(ctx, db.CreatePaymentParams{
			OrderID:           order.ID,
			RazorpayPaymentID: rzpPaymentID,
			RazorpaySignature: signature,
			Status:            entity.Status,
			Amount:            pgAmount,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save transaction payment log."})
			return
		}

		// c) Query order items and reserve/decrement stock
		items, err := qtx.GetOrderItemsByOrderID(ctx, order.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read order details."})
			return
		}

		for _, item := range items {
			variant, err := qtx.GetVariantByIDForUpdate(ctx, item.VariantID)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Variant no longer exists."})
				return
			}

			// Verify stock constraints inside transaction block
			if variant.StockQuantity < item.Quantity {
				// Aborts transaction automatically via rollback on defer
				c.JSON(http.StatusConflict, gin.H{
					"error": "Oversell check triggered. Insufficient stock quantity available for shipment.",
				})
				return
			}

			// Decrement variant stock
			newStock := variant.StockQuantity - item.Quantity
			err = qtx.UpdateVariantStock(ctx, db.UpdateVariantStockParams{
				ID:            item.VariantID,
				StockQuantity: newStock,
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update stock quantity."})
				return
			}
		}

		// Commit all operations safely
		err = tx.Commit(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit payment confirmation."})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Payment logged and stock reserved."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Event received and ignored."})
}
