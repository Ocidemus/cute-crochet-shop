package razorpay

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"encoding/json"
	"bytes"
)

// RazorpayClient handles communication with Razorpay API endpoints
type RazorpayClient struct {
	KeyID     string
	KeySecret string
}

// NewClient returns a configured client instance
func NewClient() *RazorpayClient {
	keyID := os.Getenv("RAZORPAY_KEY_ID")
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")

	if keyID == "" || keySecret == "" {
		log.Println("WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables are missing.")
	}

	return &RazorpayClient{
		KeyID:     keyID,
		KeySecret: keySecret,
	}
}

// RazorpayOrderResponse maps Razorpay order JSON responses
type RazorpayOrderResponse struct {
	ID        string `json:"id"`
	Entity    string `json:"entity"`
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
	Receipt   string `json:"receipt"`
	Status    string `json:"status"`
	CreatedAt int64  `json:"created_at"`
}

// CreateOrder calls Razorpay's Orders API via standard basic HTTP authentication
func (r *RazorpayClient) CreateOrder(amountInPaise int64, receiptID string) (*RazorpayOrderResponse, error) {
	apiURL := "https://api.razorpay.com/v1/orders"

	// Prepare payload mapping parameters
	payload := map[string]interface{}{
		"amount":   amountInPaise,
		"currency": "INR",
		"receipt":  receiptID,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(r.KeyID, r.KeySecret)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errData map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errData)
		return nil, fmt.Errorf("razorpay order creation failed: status %d. Details: %v", resp.StatusCode, errData)
	}

	var rzOrder RazorpayOrderResponse
	if err := json.NewDecoder(resp.Body).Decode(&rzOrder); err != nil {
		return nil, err
	}

	return &rzOrder, nil
}

// VerifyWebhookSignature verifies HMAC webhook checksum signatures
func (r *RazorpayClient) VerifyWebhookSignature(payloadBody []byte, signature string) error {
	webhookSecret := os.Getenv("RAZORPAY_WEBHOOK_SECRET")
	if webhookSecret == "" {
		return errors.New("webhook secret not set in environment configurations")
	}

	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write(payloadBody)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	if signature != expectedSignature {
		return errors.New("cryptographic signature mismatch. Untrusted webhook sender")
	}

	return nil
}

// VerifyPaymentSignature checks payment signatures during checkout callbacks
func (r *RazorpayClient) VerifyPaymentSignature(razorpayOrderID, razorpayPaymentID, razorpaySignature string) error {
	signatureString := razorpayOrderID + "|" + razorpayPaymentID
	
	mac := hmac.New(sha256.New, []byte(r.KeySecret))
	mac.Write([]byte(signatureString))
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	if razorpaySignature != expectedSignature {
		return errors.New("invalid checkout payment signature")
	}

	return nil
}
