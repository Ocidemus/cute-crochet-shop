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
		// 24 Folder Products + Storefront Items
		{Slug: "four-bear-combo", Name: "4 Bear Family Combo Set", Description: "Complete set of 4 handcrafted pastel plush bears (Chocolate Brown, Vanilla White, Pastel Pink & Sandy Beige) with cute bow ribbons.", Price: 1249.00, Images: []string{"assets/four_bear_combo_1.jpg", "assets/four_bear_combo_2.jpg", "assets/four_bear_combo_3.jpg", "assets/four_bear_combo_4.jpg"}, SKU: "FOUR-BEAR-COMBO-STD"},
		{Slug: "brown-white-bear-combo", Name: "Brown & White Bear Duo Combo", Description: "Matching pair of chocolate brown and vanilla white plush teddy bears with sweet ribbon bows.", Price: 699.00, Images: []string{"assets/brown_white_bear_1.jpg", "assets/brown_white_bear_2.jpg", "assets/brown_white_bear_3.jpg", "assets/brown_white_bear_4.jpg"}, SKU: "BRN-WHT-BEAR-STD"},
		{Slug: "brown-bear", Name: "Chocolate Brown Teddy Bear", Description: "Classic chocolate brown velvet teddy bear plushie wearing a cute white bow ribbon.", Price: 399.00, Images: []string{"assets/brown_bear_1.jpg", "assets/brown_bear_2.jpg", "assets/brown_bear_3.jpg", "assets/brown_bear_4.jpg"}, SKU: "BROWN-BEAR-STD"},
		{Slug: "white-bear", Name: "Vanilla White Teddy Bear", Description: "Dreamy vanilla white velvet teddy bear plushie with a pastel pink bow ribbon and rosy cheeks.", Price: 399.00, Images: []string{"assets/white_bear_1.jpg", "assets/white_bear_2.jpg", "assets/white_bear_3.jpg"}, SKU: "WHITE-BEAR-STD"},
		{Slug: "pink-bear", Name: "Pastel Pink Teddy Bear", Description: "Sweet pastel pink velvet teddy bear plushie with a white bow ribbon, ultra-soft and huggable.", Price: 399.00, Images: []string{"assets/pink_bear_1.jpg", "assets/pink_bear_2.jpg"}, SKU: "PINK-BEAR-STD"},
		{Slug: "beige-bear", Name: "Sandy Beige Teddy Bear", Description: "Warm sandy beige velvet teddy bear plushie wearing a pastel pink bow ribbon.", Price: 399.00, Images: []string{"assets/beige_bear.jpg", "assets/four_bear_combo_1.jpg"}, SKU: "BEIGE-BEAR-STD"},
		{Slug: "bears", Name: "Custom Bear Pack (Choose Size & Color)", Description: "Customize your own handcrafted plush bear bundle! Choose single, pair, or set of 3/4 in your favorite pastel color.", Price: 399.00, Images: []string{"assets/bears_colors.jpg", "assets/four_bear_combo_1.jpg", "assets/brown_white_bear_1.jpg", "assets/brown_bear_1.jpg", "assets/white_bear_1.jpg"}, SKU: "BEARS-STD"},
		{Slug: "trio-combo", Name: "Cute Companions Trio Combo", Description: "Adorable 3-piece plush keychain bundle featuring Creamy White Capybara, Earmuff Penguin, and Chubby Panda.", Price: 899.00, Images: []string{"assets/trio_combo_1.jpg", "assets/trio_combo_2.jpg", "assets/trio_combo_3.jpg", "assets/trio_combo_4.jpg"}, SKU: "TRIO-COMBO-STD"},
		{Slug: "tulip-panda-combo", Name: "Twin Pandas & White Tulip Combo Set", Description: "Special gift set of two rosy-cheeked panda plush keychains paired with a double white tulip charm.", Price: 799.00, Images: []string{"assets/tulip_panda_combo_1.jpg", "assets/tulip_panda_combo_2.jpg", "assets/tulip_panda_combo_3.jpg", "assets/tulip_panda_combo_4.jpg"}, SKU: "TULIP-PANDA-STD"},
		{Slug: "panda", Name: "Chubby Panda Plush Keychain", Description: "Super round and squishy panda keychain with rosy pink cheeks and happy stitched eyes.", Price: 349.00, Images: []string{"assets/panda_new_1.jpg", "assets/panda_new_2.jpg", "assets/panda_new_3.jpg", "assets/panda_new_4.jpg", "assets/panda_new_5.jpg"}, SKU: "PANDA-STD"},
		{Slug: "penguin", Name: "Cozy Mini Penguin Keychain", Description: "Tiny penguin companion keychain featuring custom knit details, orange beak, and cute webbed feet.", Price: 349.00, Images: []string{"assets/penguin_new_1.jpg", "assets/penguin_new_2.jpg", "assets/penguin_new_3.jpg", "assets/penguin_new_4.jpg"}, SKU: "PENGUIN-STD"},
		{Slug: "capybara", Name: "Chubby Brown Capybara Keychain", Description: "Squishy brown capybara plushie keychain with closed happy eyes and cute little ears.", Price: 349.00, Images: []string{"assets/capybara_new_1.jpg", "assets/capybara_new_2.jpg", "assets/capybara_new_3.jpg", "assets/capybara_new_4.jpg"}, SKU: "CAPYBARA-STD"},
		{Slug: "white-capybara", Name: "Creamy White Capybara Keychain", Description: "Cozy cream-white capybara plush keychain with chocolate brown ears, paws, and sleepy eyes.", Price: 349.00, Images: []string{"assets/white_capybara_1.jpg", "assets/white_capybara_2.jpg", "assets/white_capybara_3.jpg", "assets/white_capybara_4.jpg"}, SKU: "WHITE-CAPYBARA-STD"},
		{Slug: "white-teddy", Name: "Mini White Panda Bear with Bow Tie", Description: "Cute standing mini white bear keychain with black panda ears, rosy cheeks, and a dapper bow tie.", Price: 349.00, Images: []string{"assets/white_teddy_1.jpg", "assets/white_teddy_2.jpg", "assets/white_teddy_3.jpg", "assets/white_teddy_4.jpg"}, SKU: "WHITE-TEDDY-STD"},
		{Slug: "duck-holding-flower", Name: "Little Duck Holding Pink Flower", Description: "Adorable handmade white duckling with rosy cheeks holding a blooming pink flower.", Price: 399.00, Images: []string{"assets/duck_flower_1.jpg", "assets/duck_flower_2.jpg", "assets/duck_flower_3.jpg", "assets/duck_flower_4.jpg", "assets/duck_flower_5.jpg"}, SKU: "DUCK-FLOWER-STD"},
		{Slug: "baby-chick", Name: "Fluffy Baby Chick Plushie", Description: "Super soft and round yellow baby chick plushie keychain crafted with cozy chenille velvet yarn.", Price: 299.00, Images: []string{"assets/baby_chick_1.jpg", "assets/baby_chick_2.jpg"}, SKU: "BABY-CHICK-STD"},
		{Slug: "piggy", Name: "Cute Pastel Piggy Moo Keychain", Description: "Adorable pastel plush keychain with a pink snout, cute ears, and soft spotted patches.", Price: 299.00, Images: []string{"assets/piggy_1.jpg", "assets/piggy_2.jpg", "assets/piggy_3.jpg", "assets/piggy_4.jpg"}, SKU: "PIGGY-STD"},
		{Slug: "bouquet", Name: "Everlasting Red Rose Bouquet", Description: "Romantic handmade crochet red rose bouquet wrapped in a cozy cream cone that blooms forever.", Price: 799.00, Images: []string{"assets/rose_bouquet_1.jpg", "assets/rose_bouquet_2.jpg", "assets/rose_bouquet_3.jpg", "assets/rose_bouquet_4.jpg", "assets/rose_bouquet_5.jpg"}, SKU: "BOUQUET-STD"},
		{Slug: "rose-flower-pot", Name: "Mini Crochet Rose Flower Pot", Description: "Charming white crochet basket pot filled with a lush removable bouquet of handcrafted red roses.", Price: 649.00, Images: []string{"assets/rose_pot_1.jpg", "assets/rose_pot_2.jpg", "assets/rose_pot_3.jpg", "assets/rose_pot_4.jpg", "assets/rose_pot_5.jpg"}, SKU: "ROSE-POT-STD"},
		{Slug: "flower-mat", Name: "Blooming Rose Bouquet Coaster Mat", Description: "Handcrafted cream crochet table mat bordered with 3D red roses that folds into a mini rose bouquet.", Price: 549.00, Images: []string{"assets/flower_mat_1.jpg", "assets/flower_mat_2.jpg", "assets/flower_mat_3.jpg", "assets/flower_mat_4.jpg"}, SKU: "FLOWER-MAT-STD"},
		{Slug: "sunflower-and-bee", Name: "Sunflower & Bumblebee Keychain Duo", Description: "Cheerful crochet sunflower paired with a chubby striped bumblebee on pearl beaded keychains.", Price: 499.00, Images: []string{"assets/sunflower_bee_1.jpg", "assets/sunflower_bee_2.jpg", "assets/sunflower_bee_3.jpg", "assets/sunflower_bee_4.jpg"}, SKU: "SUNFLOWER-BEE-STD"},
		{Slug: "sunflower", Name: "Pearl Beaded Sunflower Keychain", Description: "Bright golden crochet sunflower charm suspended from an iridescent pearl bead keychain strap.", Price: 299.00, Images: []string{"assets/sunflower_1.jpg", "assets/sunflower_2.jpg", "assets/sunflower_3.jpg", "assets/sunflower_4.jpg"}, SKU: "SUNFLOWER-STD"},
		{Slug: "pink-purple-tulip", Name: "Pink & Purple Double Tulip Keychain", Description: "Matching pair of pastel pink and lavender purple crochet tulip flower buds on a leafy green stem.", Price: 299.00, Images: []string{"assets/pink_purple_tulip_1.jpg", "assets/flowers_1.jpg", "assets/flowers_2.jpg"}, SKU: "PINK-PURPLE-TULIP-STD"},
		{Slug: "white-pink-flower", Name: "Pink & White Twin Tulip Keychain", Description: "Soft blush pink and pure white crochet tulip flower duo hanging from a braided green leaf strap.", Price: 299.00, Images: []string{"assets/white_pink_flower_1.jpg", "assets/white_pink_flower_2.jpg", "assets/white_pink_flower_3.jpg"}, SKU: "WHITE-PINK-FLOWER-STD"},
		{Slug: "white-tulip", Name: "Pure White Double Tulip Keychain", Description: "Elegant twin white crochet bell-tulip flowers with a hand-stitched green leaf loop for bags and keys.", Price: 299.00, Images: []string{"assets/white_tulip_1.jpg", "assets/white_tulip_2.jpg", "assets/white_tulip_3.jpg", "assets/white_tulip_4.jpg"}, SKU: "WHITE-TULIP-STD"},
		{Slug: "black-bow", Name: "Classic Black Ribbon Bow Keychain", Description: "Chic handcrafted black crochet ribbon bow charm keychain, perfect for bags, backpacks, and keys.", Price: 249.00, Images: []string{"assets/black_bow_1.jpg", "assets/black_bow_2.jpg", "assets/black_bow_3.jpg", "assets/black_bow_4.jpg", "assets/black_bow_5.jpg"}, SKU: "BLACK-BOW-STD"},
		{Slug: "hearts", Name: "Puffy Crochet Heart Keychain", Description: "A cozy puffy pink heart keychain to remind you of warm handmade love.", Price: 299.00, Images: []string{"assets/hearts_1.jpg", "assets/hearts_2.jpg", "assets/hearts_3.jpg", "assets/hearts_4.jpg"}, SKU: "HEARTS-STD"},
		{Slug: "spiderman", Name: "Spiderman Crochet Keychain", Description: "Handcrafted Spiderman hero crochet keychain with detailed mask pattern.", Price: 499.00, Images: []string{"assets/spiderman_1.jpg", "assets/spiderman_2.jpg", "assets/spiderman_3.jpg", "assets/spiderman_4.jpg"}, SKU: "SPIDERMAN-STD"},
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

		// Legacy Slugs for Backward Compatibility
		{Slug: "bow", Name: "Classic Black Ribbon Bow Keychain", Description: "Chic handcrafted black crochet ribbon bow charm keychain.", Price: 249.00, Images: []string{"assets/black_bow_1.jpg"}, SKU: "BOW-STD"},
		{Slug: "cute", Name: "Little Duck Holding Pink Flower", Description: "Adorable handmade white duckling with rosy cheeks holding a blooming pink flower.", Price: 399.00, Images: []string{"assets/duck_flower_1.jpg"}, SKU: "CUTE-STD"},
		{Slug: "flowers", Name: "Pink & Purple Double Tulip Keychain", Description: "Matching pair of pastel pink and lavender purple crochet tulip flower buds.", Price: 299.00, Images: []string{"assets/pink_purple_tulip_1.jpg"}, SKU: "FLOWERS-STD"},
		{Slug: "combo", Name: "Cute Companions Trio Combo", Description: "Adorable 3-piece plush keychain bundle.", Price: 899.00, Images: []string{"assets/trio_combo_1.jpg"}, SKU: "COMBO-STD"},
		{Slug: "duck", Name: "Little Duck Holding Pink Flower", Description: "Cute white chick/duck holding a pink flower.", Price: 399.00, Images: []string{"assets/duck_flower_1.jpg"}, SKU: "DUCK-LEG"},
		{Slug: "tulips", Name: "Pink & Purple Double Tulip Keychain", Description: "A matching pair of pastel pink and purple crochet tulip flower keychains.", Price: 299.00, Images: []string{"assets/pink_purple_tulip_1.jpg"}, SKU: "TULIPS-LEG"},
		{Slug: "heart", Name: "Puffy Crochet Heart Keychain", Description: "A cozy pink puffy heart keychain to remind you of warm handmade love.", Price: 299.00, Images: []string{"assets/hearts_1.jpg"}, SKU: "HEART-LEG"},
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
