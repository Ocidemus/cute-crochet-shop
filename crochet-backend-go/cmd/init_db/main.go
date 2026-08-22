package main

import (
	"context"
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

	// 1. Connect to PostgreSQL
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer conn.Close(ctx)

	log.Println("Connected to Supabase PostgreSQL database successfully.")

	// 2. Read schema.sql file content
	schemaFile := "internal/db/schema.sql"
	schemaBytes, err := os.ReadFile(schemaFile)
	if err != nil {
		log.Fatalf("Failed to read schema.sql: %v", err)
	}

	// 3. Execute Schema queries to drop/create tables
	log.Println("Applying schema.sql database layout...")
	
	// Split schema by semicolons to execute clean queries
	// (Alternatively, we can execute the whole string directly)
	_, err = conn.Exec(ctx, string(schemaBytes))
	if err != nil {
		log.Fatalf("Failed to apply database schema: %v", err)
	}
	log.Println("Schema applied successfully. All tables dropped and created!")

	// 4. Seed Products and Variants
	log.Println("Seeding crochet e-commerce products...")

	products := []struct {
		Slug        string
		Name        string
		Description string
		Price       float64
		Images      []string
		SKU         string
	}{
		{
			Slug:        "panda",
			Name:        "Panda Crochet Keychain",
			Description: "Super round and squishy panda keychain with rosy cheeks. Made with soft velvet yarn.",
			Price:       799.00,
			Images:      []string{"assets/panda_keychain_1.jpg", "assets/panda_keychain_2.jpg"},
			SKU:         "PANDA-KEYCHAIN-STD",
		},
		{
			Slug:        "brown-bear",
			Name:        "Teddy Bear Plushie (Brown)",
			Description: "Classic chocolate brown teddy bear plushie wearing a cute white bow ribbon.",
			Price:       1299.00,
			Images:      []string{"assets/bears_group.jpg"},
			SKU:         "BROWN-BEAR-STD",
		},
		{
			Slug:        "white-bear",
			Name:        "Teddy Bear Plushie (White)",
			Description: "Dreamy vanilla white teddy bear plushie with adorable hand-stitched details.",
			Price:       1299.00,
			Images:      []string{"assets/bears_group.jpg"},
			SKU:         "WHITE-BEAR-STD",
		},
		{
			Slug:        "pink-bear",
			Name:        "Teddy Bear Plushie (Pink)",
			Description: "Sweet pastel pink teddy bear plushie, ultra-soft and perfect for comforting hugs.",
			Price:       1299.00,
			Images:      []string{"assets/bears_group.jpg"},
			SKU:         "PINK-BEAR-STD",
		},
		{
			Slug:        "beige-bear",
			Name:        "Teddy Bear Plushie (Beige)",
			Description: "Warm sandy beige teddy bear plushie, hand-crocheted with premium fluffy yarn.",
			Price:       1299.00,
			Images:      []string{"assets/bears_group.jpg"},
			SKU:         "BEIGE-BEAR-STD",
		},
		{
			Slug:        "penguin",
			Name:        "Mini Penguin Keychain",
			Description: "Tiny penguin companion keychain featuring custom knit details and cute webbed feet.",
			Price:       599.00,
			Images:      []string{"assets/bears_group.jpg"},
			SKU:         "PENGUIN-KEYCHAIN-STD",
		},
		{
			Slug:        "tulips",
			Name:        "Double Tulip Keychains",
			Description: "A matching pair of pastel pink and purple crochet tulip flower keychains.",
			Price:       499.00,
			Images:      []string{"assets/bears_group.jpg"},
			SKU:         "TULIPS-KEYCHAIN-STD",
		},
		{
			Slug:        "heart",
			Name:        "Crochet Heart Keychain",
			Description: "A cozy pink puffy heart keychain to remind you of warm handmade love.",
			Price:       299.00,
			Images:      []string{"assets/bears_group.jpg"},
			SKU:         "HEART-KEYCHAIN-STD",
		},
	}

	for _, p := range products {
		var productID string
		// Insert Product
		err = conn.QueryRow(ctx, `
			INSERT INTO products (slug, name, description, price, images, is_active)
			VALUES ($1, $2, $3, $4, $5, TRUE)
			RETURNING id
		`, p.Slug, p.Name, p.Description, p.Price, p.Images).Scan(&productID)

		if err != nil {
			log.Fatalf("Failed to seed product %s: %v", p.Name, err)
		}

		// Insert Standard Variant with 100 stock
		_, err = conn.Exec(ctx, `
			INSERT INTO product_variants (product_id, variant_name, stock_quantity, sku)
			VALUES ($1, 'Standard', 100, $2)
		`, productID, p.SKU)

		if err != nil {
			log.Fatalf("Failed to seed variant for product %s: %v", p.Name, err)
		}
	}

	log.Println("Database seeded successfully with all 8 crochet products and standard variants!")
}
