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

	// 1. Connect to PostgreSQL with SimpleProtocol to prevent PgBouncer caching collisions
	config, err := pgx.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse DATABASE_URL: %v", err)
	}
	config.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	conn, err := pgx.ConnectConfig(ctx, config)
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
		// Bears variants
		{Slug: "bears", Name: "Handcrafted Crochet Bears", Description: "Custom handcrafted plush bears. Choose single, pair, or set of 3/4 in cute pastel colors.", Price: 399.00, Images: []string{"assets/bears_colors.jpg", "assets/bears_single.jpg", "assets/bears_pair.jpg", "assets/bears_set.jpg"}, SKU: "BEARS-STD"},
		{Slug: "bears-single-brown", Name: "Handcrafted Crochet Bears (Single Bear - Brown)", Description: "Single handcrafted brown crochet bear.", Price: 399.00, Images: []string{"assets/bears_single.jpg"}, SKU: "BEARS-S-BRN"},
		{Slug: "bears-single-white", Name: "Handcrafted Crochet Bears (Single Bear - White)", Description: "Single handcrafted white crochet bear.", Price: 399.00, Images: []string{"assets/bears_single.jpg"}, SKU: "BEARS-S-WHT"},
		{Slug: "bears-single-beige", Name: "Handcrafted Crochet Bears (Single Bear - Beige)", Description: "Single handcrafted beige crochet bear.", Price: 399.00, Images: []string{"assets/bears_single.jpg"}, SKU: "BEARS-S-BGE"},
		{Slug: "bears-single-pink", Name: "Handcrafted Crochet Bears (Single Bear - Pink)", Description: "Single handcrafted pink crochet bear.", Price: 399.00, Images: []string{"assets/bears_single.jpg"}, SKU: "BEARS-S-PNK"},
		{Slug: "bears-pair-brown", Name: "Handcrafted Crochet Bears (Pair - Brown)", Description: "Pair of handcrafted brown crochet bears.", Price: 699.00, Images: []string{"assets/bears_pair.jpg"}, SKU: "BEARS-P-BRN"},
		{Slug: "bears-pair-white", Name: "Handcrafted Crochet Bears (Pair - White)", Description: "Pair of handcrafted white crochet bears.", Price: 699.00, Images: []string{"assets/bears_pair.jpg"}, SKU: "BEARS-P-WHT"},
		{Slug: "bears-pair-beige", Name: "Handcrafted Crochet Bears (Pair - Beige)", Description: "Pair of handcrafted beige crochet bears.", Price: 699.00, Images: []string{"assets/bears_pair.jpg"}, SKU: "BEARS-P-BGE"},
		{Slug: "bears-pair-pink", Name: "Handcrafted Crochet Bears (Pair - Pink)", Description: "Pair of handcrafted pink crochet bears.", Price: 699.00, Images: []string{"assets/bears_pair.jpg"}, SKU: "BEARS-P-PNK"},
		{Slug: "bears-set3-brown", Name: "Handcrafted Crochet Bears (Set of 3 - Brown)", Description: "Set of 3 handcrafted brown crochet bears.", Price: 999.00, Images: []string{"assets/bears_set.jpg"}, SKU: "BEARS-S3-BRN"},
		{Slug: "bears-set3-white", Name: "Handcrafted Crochet Bears (Set of 3 - White)", Description: "Set of 3 handcrafted white crochet bears.", Price: 999.00, Images: []string{"assets/bears_set.jpg"}, SKU: "BEARS-S3-WHT"},
		{Slug: "bears-set3-beige", Name: "Handcrafted Crochet Bears (Set of 3 - Beige)", Description: "Set of 3 handcrafted beige crochet bears.", Price: 999.00, Images: []string{"assets/bears_set.jpg"}, SKU: "BEARS-S3-BGE"},
		{Slug: "bears-set3-pink", Name: "Handcrafted Crochet Bears (Set of 3 - Pink)", Description: "Set of 3 handcrafted pink crochet bears.", Price: 999.00, Images: []string{"assets/bears_set.jpg"}, SKU: "BEARS-S3-PNK"},
		{Slug: "bears-set4-brown", Name: "Handcrafted Crochet Bears (Set of 4 - Brown)", Description: "Set of 4 handcrafted brown crochet bears.", Price: 1249.00, Images: []string{"assets/bears_set.jpg"}, SKU: "BEARS-S4-BRN"},
		{Slug: "bears-set4-white", Name: "Handcrafted Crochet Bears (Set of 4 - White)", Description: "Set of 4 handcrafted white crochet bears.", Price: 1249.00, Images: []string{"assets/bears_set.jpg"}, SKU: "BEARS-S4-WHT"},
		{Slug: "bears-set4-beige", Name: "Handcrafted Crochet Bears (Set of 4 - Beige)", Description: "Set of 4 handcrafted beige crochet bears.", Price: 1249.00, Images: []string{"assets/bears_set.jpg"}, SKU: "BEARS-S4-BGE"},
		{Slug: "bears-set4-pink", Name: "Handcrafted Crochet Bears (Set of 4 - Pink)", Description: "Set of 4 handcrafted pink crochet bears.", Price: 1249.00, Images: []string{"assets/bears_set.jpg"}, SKU: "BEARS-S4-PNK"},

		// Teddy variants
		{Slug: "teddy", Name: "Cozy Teddy Bear", Description: "Super soft crochet teddy bear plushie wearing a cute ribbon.", Price: 449.00, Images: []string{"assets/teddy_1.jpg", "assets/teddy_2.jpg"}, SKU: "TEDDY-STD"},
		{Slug: "teddy-single-white", Name: "Cozy Teddy Bear (Single Teddy - White)", Description: "Single white soft crochet teddy bear.", Price: 449.00, Images: []string{"assets/teddy_1.jpg"}, SKU: "TEDDY-S-WHT"},
		{Slug: "teddy-single-brown", Name: "Cozy Teddy Bear (Single Teddy - Brown)", Description: "Single brown soft crochet teddy bear.", Price: 449.00, Images: []string{"assets/teddy_2.jpg"}, SKU: "TEDDY-S-BRN"},
		{Slug: "teddy-pair-white", Name: "Cozy Teddy Bear (Pair - White)", Description: "Pair of white soft crochet teddy bears.", Price: 799.00, Images: []string{"assets/teddy_3.jpg"}, SKU: "TEDDY-P-WHT"},
		{Slug: "teddy-pair-brown", Name: "Cozy Teddy Bear (Pair - Brown)", Description: "Pair of brown soft crochet teddy bears.", Price: 799.00, Images: []string{"assets/teddy_4.jpg"}, SKU: "TEDDY-P-BRN"},

		// Standalone folder products
		{Slug: "panda", Name: "Panda Crochet Keychain", Description: "Super round and squishy panda keychain with rosy cheeks.", Price: 799.00, Images: []string{"assets/panda_1.jpg", "assets/panda_2.jpg", "assets/panda_3.jpg", "assets/panda_4.jpg", "assets/panda_5.jpg"}, SKU: "PANDA-STD"},
		{Slug: "capybara", Name: "Capybara Plushie Keychain", Description: "Squishy brown capybara plushie keychain with closed happy eyes.", Price: 899.00, Images: []string{"assets/capybara_1.jpg", "assets/capybara_2.jpg", "assets/capybara_3.jpg", "assets/capybara_4.jpg"}, SKU: "CAPYBARA-STD"},
		{Slug: "spiderman", Name: "Spiderman Crochet Keychain", Description: "Handcrafted Spiderman hero crochet keychain with detailed mask pattern.", Price: 599.00, Images: []string{"assets/spiderman_1.jpg", "assets/spiderman_2.jpg", "assets/spiderman_3.jpg", "assets/spiderman_4.jpg"}, SKU: "SPIDERMAN-STD"},
		{Slug: "bow", Name: "Crochet Ribbon Bow Keychain", Description: "Cozy handmade crochet ribbon bow keychains in aesthetic pastel colors.", Price: 349.00, Images: []string{"assets/bow_1.jpg", "assets/bow_2.jpg", "assets/bow_3.jpg", "assets/bow_4.jpg", "assets/bow_5.jpg"}, SKU: "BOW-STD"},
		{Slug: "cute", Name: "Little Duck holding Flower", Description: "Cute white chick/duck holding a pink flower. Adorable handmade desk buddy featuring full photo gallery.", Price: 699.00, Images: []string{"assets/cute_1.jpg", "assets/cute_2.jpg", "assets/cute_3.jpg", "assets/cute_4.jpg"}, SKU: "CUTE-STD"},
		{Slug: "penguin", Name: "Mini Penguin Keychain", Description: "Tiny penguin companion keychain featuring custom knit details and cute webbed feet.", Price: 699.00, Images: []string{"assets/penguin_1.jpg", "assets/penguin_2.jpg"}, SKU: "PENGUIN-STD"},
		{Slug: "flowers", Name: "Handmade Crochet Flowers", Description: "Everlasting crochet flower stems and keychains made with love.", Price: 499.00, Images: []string{"assets/flowers_1.jpg", "assets/flowers_2.jpg"}, SKU: "FLOWERS-STD"},
		{Slug: "hearts", Name: "Puffy Crochet Heart Keychain", Description: "A cozy puffy heart keychain to remind you of warm handmade love.", Price: 299.00, Images: []string{"assets/hearts_1.jpg", "assets/hearts_2.jpg", "assets/hearts_3.jpg", "assets/hearts_4.jpg"}, SKU: "HEARTS-STD"},
		{Slug: "combo", Name: "Crochet Super Combo Bundle", Description: "Special discount bundle featuring a mix of our most popular crochet plushies.", Price: 1199.00, Images: []string{"assets/combo_1.jpg", "assets/combo_2.jpg", "assets/combo_3.jpg"}, SKU: "COMBO-STD"},
		{Slug: "bouquet", Name: "Handcrafted Flower Bouquet", Description: "Gorgeous handmade crochet flower bouquet that never fades.", Price: 999.00, Images: []string{"assets/bouquet_1.jpg"}, SKU: "BOUQUET-STD"},

		// Legacy Slugs for Backward Compatibility
		{Slug: "duck", Name: "Little Duck holding Flower", Description: "Cute white chick/duck holding a pink flower.", Price: 699.00, Images: []string{"assets/cute_1.jpg"}, SKU: "DUCK-LEG"},
		{Slug: "brown-bear", Name: "Teddy Bear Plushie (Brown)", Description: "Classic chocolate brown teddy bear plushie wearing a cute white bow ribbon.", Price: 399.00, Images: []string{"assets/bears_single.jpg"}, SKU: "BROWN-BEAR-LEG"},
		{Slug: "white-bear", Name: "Teddy Bear Plushie (White)", Description: "Dreamy vanilla white teddy bear plushie with adorable hand-stitched details.", Price: 399.00, Images: []string{"assets/bears_single.jpg"}, SKU: "WHITE-BEAR-LEG"},
		{Slug: "pink-bear", Name: "Teddy Bear Plushie (Pink)", Description: "Sweet pastel pink teddy bear plushie, ultra-soft and perfect for comforting hugs.", Price: 399.00, Images: []string{"assets/bears_single.jpg"}, SKU: "PINK-BEAR-LEG"},
		{Slug: "beige-bear", Name: "Teddy Bear Plushie (Beige)", Description: "Warm sandy beige teddy bear plushie, hand-crocheted with premium fluffy yarn.", Price: 399.00, Images: []string{"assets/bears_single.jpg"}, SKU: "BEIGE-BEAR-LEG"},
		{Slug: "tulips", Name: "Double Tulip Keychains", Description: "A matching pair of pastel pink and purple crochet tulip flower keychains.", Price: 499.00, Images: []string{"assets/flowers_1.jpg"}, SKU: "TULIPS-LEG"},
		{Slug: "heart", Name: "Crochet Heart Keychain", Description: "A cozy pink puffy heart keychain to remind you of warm handmade love.", Price: 299.00, Images: []string{"assets/hearts_1.jpg"}, SKU: "HEART-LEG"},
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

	log.Println("Database seeded successfully with all product variants and catalog items!")
}
