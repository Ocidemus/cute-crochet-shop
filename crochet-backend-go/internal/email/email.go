package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type EmailService struct {
	ResendAPIKey string
	SenderEmail  string
}

func NewEmailService() *EmailService {
	apiKey := os.Getenv("RESEND_API_KEY")
	sender := os.Getenv("SENDER_EMAIL")
	if sender == "" {
		sender = "CuteCrochet Shop <onboarding@resend.dev>"
	}
	return &EmailService{
		ResendAPIKey: apiKey,
		SenderEmail:  sender,
	}
}

type ResendEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

type OrderItemSummary struct {
	ProductName string
	Quantity    int32
	Price       float64
}

// SendOrderConfirmation handles sending clean HTML receipt emails upon payment completion
func (e *EmailService) SendOrderConfirmation(toEmail, customerName, orderID string, totalAmount float64, items []OrderItemSummary, address string) {
	if e.ResendAPIKey == "" {
		log.Printf("[INFO] Email notification skipped for order %s (RESEND_API_KEY environment variable is not configured)", orderID)
		return
	}

	// Build items HTML list
	itemsHTML := ""
	for _, item := range items {
		itemsHTML += fmt.Sprintf(`
			<tr style="border-bottom: 1px dashed #FFE0E6;">
				<td style="padding: 10px 0; color: #4A3B40;">%s</td>
				<td style="padding: 10px 0; text-align: center; color: #4A3B40;">%d</td>
				<td style="padding: 10px 0; text-align: right; color: #8A4B58; font-weight: 600;">₹%.2f</td>
			</tr>
		`, item.ProductName, item.Quantity, item.Price*float64(item.Quantity))
	}

	subject := fmt.Sprintf("🌸 Order Confirmed! CuteCrochet Shop Receipt #%s", orderID)

	htmlBody := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<style>
				body { font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FFFDF8; margin: 0; padding: 20px; color: #4A3B40; }
				.card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 2px solid #FFD6E0; border-radius: 16px; padding: 30px; box-shadow: 0 4px 15px rgba(255, 141, 161, 0.1); }
				.header { text-align: center; padding-bottom: 20px; border-bottom: 2px dashed #FFD6E0; }
				.title { color: #D84A67; font-size: 24px; font-weight: 700; margin: 10px 0 4px 0; }
				.badge { background: #EBFDF8; color: #1E6652; border: 1px solid #C4F7E6; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; display: inline-block; }
				.table { width: 100%%; border-collapse: collapse; margin: 20px 0; }
				.total-row { font-size: 18px; font-weight: 700; color: #D84A67; }
				.footer { text-align: center; margin-top: 30px; font-size: 13px; color: #A08890; }
			</style>
		</head>
		<body>
			<div class="card">
				<div class="header">
					<div style="font-size: 36px;">🧸🌸</div>
					<div class="title">Thank you for your order!</div>
					<p style="margin: 0; color: #7A656C;">Hi <strong>%s</strong>, your handmade crochet items are being prepared with love!</p>
					<div style="margin-top: 15px;"><span class="badge">🌸 PAYMENT VERIFIED & PAID</span></div>
				</div>

				<div style="margin-top: 20px;">
					<p style="margin: 4px 0; font-size: 13px; color: #7A656C;">Order Reference ID: <strong style="font-family: monospace;">%s</strong></p>
					<p style="margin: 4px 0; font-size: 13px; color: #7A656C;">Shipping Destination: %s</p>
				</div>

				<table class="table">
					<thead>
						<tr style="text-align: left; color: #A08890; font-size: 12px; border-bottom: 1px solid #FFD6E0;">
							<th style="padding-bottom: 8px;">ITEM</th>
							<th style="padding-bottom: 8px; text-align: center;">QTY</th>
							<th style="padding-bottom: 8px; text-align: right;">TOTAL</th>
						</tr>
					</thead>
					<tbody>
						%s
					</tbody>
				</table>

				<div style="text-align: right; padding-top: 10px; border-top: 2px dashed #FFD6E0;" class="total-row">
					Total Paid: ₹%.2f
				</div>

				<div class="footer">
					<p>Handmade with ❤️ by CuteCrochet Shop © 2026</p>
					<p style="font-size: 11px;">You can view your order tracking anytime in your <a href="https://your-domain.com/orders.html" style="color: #D84A67;">My Orders Account</a>.</p>
				</div>
			</div>
		</body>
		</html>
	`, customerName, orderID, address, itemsHTML, totalAmount)

	reqPayload := ResendEmailRequest{
		From:    e.SenderEmail,
		To:      []string{toEmail},
		Subject: subject,
		HTML:    htmlBody,
	}

	jsonBytes, err := json.Marshal(reqPayload)
	if err != nil {
		log.Printf("[ERROR] Failed to marshal confirmation email payload: %v", err)
		return
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonBytes))
	if err != nil {
		log.Printf("[ERROR] Failed to create Resend email HTTP request: %v", err)
		return
	}

	req.Header.Set("Authorization", "Bearer "+e.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[ERROR] Failed to send email via Resend API: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("🌸 [SUCCESS] Order confirmation email dispatched to %s for order %s", toEmail, orderID)
	} else {
		log.Printf("[WARNING] Resend API returned status code %d for email to %s", resp.StatusCode, toEmail)
	}
}
