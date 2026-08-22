package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatalf("DATABASE_URL environment variable is required but missing.")
	}

	ctx := context.Background()
	config, err := pgx.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("ParseConfig failed: %v", err)
	}
	config.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	conn, err := pgx.ConnectConfig(ctx, config)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer conn.Close(ctx)

	fmt.Println("=== CONNECTED TO SUPABASE POSTGRESQL ===")

	// 1. Query Users
	fmt.Println("\n--- REGISTERED USERS ---")
	rows, err := conn.Query(ctx, "SELECT id, name, email, phone, created_at FROM users")
	if err != nil {
		fmt.Printf("Users query failed: %v\n", err)
	} else {
		for rows.Next() {
			var id, name, email, phone string
			var createdAt interface{}
			_ = rows.Scan(&id, &name, &email, &phone, &createdAt)
			fmt.Printf("User: ID=%s | Name=%s | Email=%s | Phone=%s\n", id, name, email, phone)
		}
		rows.Close()
	}

	// 2. Query Orders
	fmt.Println("\n--- ORDERS CREATED ---")
	rows, err = conn.Query(ctx, "SELECT id, user_id, status, total_amount, razorpay_order_id, created_at FROM orders")
	if err != nil {
		fmt.Printf("Orders query failed: %v\n", err)
	} else {
		for rows.Next() {
			var id, userID, status, totalAmount, rzpOrderID string
			var createdAt interface{}
			_ = rows.Scan(&id, &userID, &status, &totalAmount, &rzpOrderID, &createdAt)
			fmt.Printf("Order: ID=%s | UserID=%s | Status=%s | Total=₹%s | RazorpayOrderID=%s\n", id, userID, status, totalAmount, rzpOrderID)
		}
		rows.Close()
	}

	// 3. Query Payments
	fmt.Println("\n--- CAPTURED PAYMENTS ---")
	rows, err = conn.Query(ctx, "SELECT id, order_id, razorpay_payment_id, status, amount, verified_at FROM payments")
	if err != nil {
		fmt.Printf("Payments query failed: %v\n", err)
	} else {
		for rows.Next() {
			var id, orderID, rzpPaymentID, status, amount string
			var verifiedAt interface{}
			_ = rows.Scan(&id, &orderID, &rzpPaymentID, &status, &amount, &verifiedAt)
			fmt.Printf("Payment: ID=%s | OrderID=%s | RazorpayPaymentID=%s | Status=%s | Amount=₹%s\n", id, orderID, rzpPaymentID, status, amount)
		}
		rows.Close()
	}

	// 4. Query Product stock
	fmt.Println("\n--- CURRENT PRODUCT VARIANTS STOCK LEVEL ---")
	rows, err = conn.Query(ctx, `
		SELECT pv.sku, p.name, pv.stock_quantity 
		FROM product_variants pv 
		JOIN products p ON pv.product_id = p.id
	`)
	if err != nil {
		fmt.Printf("Stock query failed: %v\n", err)
	} else {
		for rows.Next() {
			var sku, name string
			var stock int
			_ = rows.Scan(&sku, &name, &stock)
			fmt.Printf("Stock: SKU=%s | Product=%s | StockRemaining=%d\n", sku, name, stock)
		}
		rows.Close()
	}
}
