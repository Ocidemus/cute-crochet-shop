# Crochet E-Commerce Store Backend - Go / Gin / pgx / sqlc

Production-ready backend for cute e-commerce crochet storefront. Built in Go using Gin routing framework, sqlc PostgreSQL queries compiler, and pgx v5 transaction pool driver. Integrates authentication logic, server-side database price matching, ACID transaction stock decrements, and Razorpay standard checkout.

---

## 🛠️ Secure Order & Payment Webhook Flow

```mermaid
sequenceDiagram
    participant User as Frontend Store
    participant Server as Go API Server
    participant DB as Postgres (Supabase)
    participant Gateway as Razorpay Checkout

    User->>Server: POST /api/orders/create
    activate Server
    Server->>DB: BeginTx (pgx.Tx)
    Server->>DB: Check Stock & Pricing (SELECT FOR UPDATE)
    Server->>DB: Write Pending Order (status = pending)
    Server->>Gateway: Create Order API Call (Secret Auth Keys)
    Gateway-->>Server: Return razorpay_order_id
    Server->>DB: Map razorpay_order_id to Order
    Server->>DB: CommitTx
    Server-->>User: Return Order Token details
    deactivate Server

    User->>Gateway: Open Standard Checkout Form
    activate Gateway
    User->>Gateway: Enter Payment details (UPI/Card)
    Gateway->>Gateway: Verify bank funds
    Gateway-->>User: Visual success screen UI
    Gateway->>Server: POST /api/webhooks/razorpay (Raw payload + signature)
    deactivate Gateway

    activate Server
    Note over Server: Cryptographic Checksum:<br/>HMAC-SHA256(RawBody, WebhookSecret) == HeaderSignature
    Server->>DB: BeginTx
    Server->>DB: Idempotency check: Order PAID?
    Server->>DB: Update Order status = PAID
    Server->>DB: Log Payment Transaction row
    Server->>DB: Decrement product_variants.stock_quantity (SELECT FOR UPDATE)
    Note over Server: If stock < 0, rollback Tx
    Server->>DB: CommitTx
    Server-->>Gateway: HTTP 200 OK (Webhook confirmed)
    deactivate Server
```

---

## 🧪 Local Webhook Testing Guide using Ngrok

Payment gateways (like Razorpay) cannot send payment webhook notifications to a `localhost` URL. To verify webhook triggers locally on your machine during development:

### Step 1: Fire up the Go server locally
1. Launch the server (running on port `3000` by default):
   ```bash
   go run cmd/api/main.go
   ```

### Step 2: Establish a secure public tunnel via Ngrok
1. Run Ngrok to forward port 3000 to the public web:
   ```bash
   ngrok http 3000
   ```
2. Ngrok will assign a unique public forwarding address:
   `https://f438-12-34-56-78.ngrok-free.app`

### Step 3: Configure Webhook in Razorpay Test Mode
1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/) and verify you are in **Test Mode** (the header should show yellow).
2. Go to **Settings > Webhooks > Add New Webhook**.
3. Set the **Webhook URL** to your Ngrok tunnel forwarding endpoint:
   `https://f438-12-34-56-78.ngrok-free.app/api/webhooks/razorpay`
4. Set a custom string as the **Secret** (e.g. `my_secret_webhook_passphrase`).
5. Under **Active Events**, select:
   - `order.paid`
   - `payment.captured`
6. Click **Create Webhook**.

### Step 4: Configure environment configurations
Configure your local `.env` variables to match the settings:
```bash
RAZORPAY_WEBHOOK_SECRET="my_secret_webhook_passphrase"
```
Once configured, test pay on standard checkout using test methods (e.g. UPI or test cards). Razorpay will notify your API backend, validating payment, reserving stock, and generating transactions in Supabase automatically!
