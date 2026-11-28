package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"crochet-backend-go/internal/db"
	"crochet-backend-go/internal/handlers"
	"crochet-backend-go/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatalf("DATABASE_URL environment variable is required but missing.")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatalf("JWT_SECRET environment variable is required but missing.")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// 1. Initialize PostgreSQL Connection Pool using pgx
	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse DATABASE_URL: %v", err)
	}

	// Disable prepared statement caching globally to prevent PgBouncer transaction pooler collisions (SQLSTATE 42P05)
	config.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	dbPool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to create database pool: %v", err)
	}
	defer dbPool.Close()

	// Test connection with a generous timeout (e.g. 30 seconds)
	pingCtx, pingCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer pingCancel()

	if err := dbPool.Ping(pingCtx); err != nil {
		log.Fatalf("Database connection ping failed: %v", err)
	}
	log.Println("Connected to Supabase PostgreSQL Database successfully.")

	// Automatically synchronize catalog products & variants on startup
	syncCatalogProducts(context.Background(), dbPool)

	// 2. Initialize sqlc Queries engine
	queries := db.New(dbPool)

	// 3. Instantiate Resource Handlers
	authHandler := &handlers.AuthHandler{Queries: *queries, DB: dbPool}
	productsHandler := &handlers.ProductsHandler{Queries: *queries, DB: dbPool}
	ordersHandler := &handlers.OrdersHandler{Queries: *queries, DB: dbPool}
	webhooksHandler := &handlers.WebhooksHandler{Queries: *queries, DB: dbPool}
	adminHandler := &handlers.AdminHandler{Queries: *queries, DB: dbPool}
	addressesHandler := &handlers.AddressesHandler{Queries: *queries, DB: dbPool}

	contactHandler := &handlers.ContactHandler{Queries: *queries, DB: dbPool}

	// 4. Initialize Gin Framework
	isProd := os.Getenv("NODE_ENV") == "production"
	if isProd {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// Security Headers & Restricted CORS Allowlist Middleware
	allowedOrigins := map[string]bool{
		"https://craftingforyou.in":     true,
		"https://www.craftingforyou.in": true,
		"https://cutecrochet.shop":      true,
		"https://www.cutecrochet.shop":  true,
	}
	if fe := strings.TrimRight(strings.TrimSpace(os.Getenv("FRONTEND_URL")), "/"); fe != "" {
		allowedOrigins[fe] = true
	}
	if re := strings.TrimRight(strings.TrimSpace(os.Getenv("RENDER_EXTERNAL_URL")), "/"); re != "" {
		allowedOrigins[re] = true
	}
	if !isProd {
		allowedOrigins["http://localhost:3000"] = true
		allowedOrigins["http://localhost:8080"] = true
		allowedOrigins["http://127.0.0.1:3000"] = true
		allowedOrigins["http://127.0.0.1:8080"] = true
	}

	r.Use(func(c *gin.Context) {
		// Standard Defense-in-Depth HTTP Security Headers
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")
		c.Writer.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		if isProd {
			c.Writer.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		origin := strings.TrimRight(strings.TrimSpace(c.Request.Header.Get("Origin")), "/")
		if origin != "" && allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Admin-Key")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// Clean URL Redirection Middleware: automatically strips .html extensions and redirects to canonical clean URLs
	r.Use(func(c *gin.Context) {
		path := c.Request.URL.Path
		if path != "/" && strings.HasSuffix(path, ".html") {
			cleanPath := strings.TrimSuffix(path, ".html")
			if cleanPath == "/index" {
				cleanPath = "/"
			} else if cleanPath == "/admin" {
				cleanPath = "/dashboard"
			}

			if rawQuery := c.Request.URL.RawQuery; rawQuery != "" {
				cleanPath += "?" + rawQuery
			}
			c.Redirect(http.StatusMovedPermanently, cleanPath)
			c.Abort()
			return
		}
		c.Next()
	})

	// Rate Limit configuration definitions
	loginLimit := middleware.RateLimit(15*time.Minute, 10, "Too many login attempts. Please try again after 15 minutes.")
	registerLimit := middleware.RateLimit(15*time.Minute, 10, "Too many registration attempts. Please try again after 15 minutes.")
	contactLimit := middleware.RateLimit(15*time.Minute, 5, "Too many custom design / contact submissions. Please try again after 15 minutes.")
	orderLimit := middleware.RateLimit(5*time.Minute, 5, "Too many order attempts. Please try again in 5 minutes.")

	// 5. Mount API Routes
	api := r.Group("/api")
	{
		// Health Check Endpoint (used by UptimeRobot / Cron-Job.org / Keep-Alive to prevent Render free-tier sleep)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "awake", "timestamp": time.Now().UTC()})
		})

		// Contact Form Endpoint
		api.POST("/contact", contactLimit, contactHandler.SubmitContact)

		// Auth Endpoints
		auth := api.Group("/auth")
		{
			auth.GET("/config", authHandler.GetAuthConfig)
			auth.POST("/send-otp", registerLimit, authHandler.SendOTP)
			auth.POST("/register", registerLimit, authHandler.Register)
			auth.POST("/login", loginLimit, authHandler.Login)
			auth.POST("/google", loginLimit, authHandler.GoogleAuth)
		}
		
		// Legacy auth aliases for frontend compatibility
		api.POST("/send-otp", registerLimit, authHandler.SendOTP)
		api.POST("/register", registerLimit, authHandler.Register)
		api.POST("/login", loginLimit, authHandler.Login)
		api.POST("/google", loginLimit, authHandler.GoogleAuth)

		// User Profile Endpoints
		userGroup := api.Group("/user")
		userGroup.Use(middleware.AuthRequired())
		{
			userGroup.GET("/profile", authHandler.GetProfile)
			userGroup.PUT("/profile", authHandler.UpdateProfile)
			userGroup.DELETE("/profile", authHandler.DeleteAccount)
		}

		// Products Catalog Endpoints
		products := api.Group("/products")
		{
			products.GET("", productsHandler.ListProducts)
			products.GET("/:id", productsHandler.GetProductDetail)
		}

		// Orders Endpoints
		orders := api.Group("/orders")
		orders.Use(middleware.AuthRequired())
		{
			orders.GET("", ordersHandler.ListOrders)
			orders.POST("/create", orderLimit, ordersHandler.CreateOrder)
			orders.POST("/verify", ordersHandler.VerifyPayment)
			orders.GET("/:id/track", ordersHandler.TrackOrder)
		}

		// Legacy checkout alias for frontend compatibility
		api.POST("/checkout", middleware.AuthRequired(), orderLimit, ordersHandler.CreateOrder)

		// Addresses Endpoints
		addresses := api.Group("/addresses")
		addresses.Use(middleware.AuthRequired())
		{
			addresses.GET("", addressesHandler.ListAddresses)
			addresses.POST("", addressesHandler.CreateAddress)
		}

		// Webhooks Endpoints (Signature-verified public gateway route)
		webhooks := api.Group("/webhooks")
		{
			webhooks.POST("/razorpay", webhooksHandler.HandleRazorpay)
		}

		// Admin Endpoints
		admin := api.Group("/admin")
		admin.Use(middleware.AuthRequired(), adminHandler.AdminAuth())
		{
			admin.GET("/orders", adminHandler.ListAllOrders)
			admin.POST("/shipments", adminHandler.AttachShipment)
			admin.POST("/upload", adminHandler.UploadImage)
			admin.POST("/products", adminHandler.CreateProduct)
			admin.PUT("/products/:id", adminHandler.UpdateProduct)
			admin.DELETE("/products/:id", adminHandler.DeleteProduct)
			admin.GET("/requests", adminHandler.ListCustomRequests)
		}
		
		api.GET("/images/:id", adminHandler.ServeImage)
	}

	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../cute-crochet-shop/static"
	}

	// Serve static frontend assets with directory listing disabled
	r.StaticFS("/assets", NoDirListingFileSystem{fs: http.Dir(filepath.Join(staticDir, "assets"))})
	r.StaticFS("/css", NoDirListingFileSystem{fs: http.Dir(filepath.Join(staticDir, "css"))})
	r.StaticFS("/js", NoDirListingFileSystem{fs: http.Dir(filepath.Join(staticDir, "js"))})

	// Clean, extensionless page routes (SEO-friendly & architecture-obfuscated)
	r.StaticFile("/", filepath.Join(staticDir, "index.html"))
	r.StaticFile("/about", filepath.Join(staticDir, "about.html"))
	r.StaticFile("/cart", filepath.Join(staticDir, "cart.html"))
	r.StaticFile("/checkout", filepath.Join(staticDir, "checkout.html"))
	r.StaticFile("/contact", filepath.Join(staticDir, "contact.html"))
	r.StaticFile("/login", filepath.Join(staticDir, "login.html"))
	r.StaticFile("/orders", filepath.Join(staticDir, "orders.html"))
	r.StaticFile("/profile", filepath.Join(staticDir, "profile.html"))
	r.StaticFile("/dashboard", filepath.Join(staticDir, "admin.html"))
	r.StaticFile("/portal", filepath.Join(staticDir, "admin.html"))
	r.StaticFile("/admin", filepath.Join(staticDir, "admin.html"))
	r.StaticFile("/privacy", filepath.Join(staticDir, "privacy.html"))
	r.StaticFile("/terms", filepath.Join(staticDir, "terms.html"))
	r.StaticFile("/refund", filepath.Join(staticDir, "refund.html"))

	r.StaticFile("/sitemap.xml", filepath.Join(staticDir, "sitemap.xml"))
	r.StaticFile("/robots.txt", filepath.Join(staticDir, "robots.txt"))

	// Custom 404 Handler for undefined page or API routes
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":  "API route not found.",
				"status": 404,
			})
			return
		}

		page404Path := filepath.Join(staticDir, "404.html")
		htmlBytes, err := os.ReadFile(page404Path)
		if err != nil {
			c.String(http.StatusNotFound, "404 - Page Not Found")
			return
		}

		c.Data(http.StatusNotFound, "text/html; charset=utf-8", htmlBytes)
	})

	// Start background keep-alive ticker to keep Render instance and DB connection warm
	go func() {
		targetURL := strings.TrimRight(os.Getenv("RENDER_EXTERNAL_URL"), "/")
		if targetURL == "" {
			targetURL = strings.TrimRight(os.Getenv("FRONTEND_URL"), "/")
		}
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		client := &http.Client{Timeout: 10 * time.Second}
		for range ticker.C {
			_ = dbPool.Ping(context.Background())
			if targetURL != "" && strings.HasPrefix(targetURL, "http") {
				resp, err := client.Get(targetURL + "/api/health")
				if err == nil && resp != nil {
					resp.Body.Close()
				}
			}
		}
	}()

	// Start Gin Server
	log.Printf("Go Crochet Backend running on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run HTTP server: %v", err)
	}
}

// NoDirListingFileSystem wraps http.FileSystem to disable directory browsing indexes
type NoDirListingFileSystem struct {
	fs http.FileSystem
}

func (nfs NoDirListingFileSystem) Open(name string) (http.File, error) {
	f, err := nfs.fs.Open(name)
	if err != nil {
		return nil, err
	}

	stat, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, err
	}

	if stat.IsDir() {
		f.Close()
		return nil, os.ErrNotExist
	}

	return f, nil
}

func syncCatalogProducts(ctx context.Context, dbPool *pgxpool.Pool) {
	// Ensure custom_requests table has whatsapp column for customer callbacks
	_, _ = dbPool.Exec(ctx, `ALTER TABLE custom_requests ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50) DEFAULT '' NOT NULL;`)

	type catalogSeed struct {
		Slug        string
		Name        string
		Description string
		Price       float64
		Images      []string
		SKU         string
		IsActive    bool
	}

	items := []catalogSeed{
		// 24 Folder Products + Storefront Items (Active)
		{Slug: "four-bear-combo", Name: "4 Bear Family Combo Set", Description: "Complete set of 4 handcrafted pastel plush bears (Chocolate Brown, Vanilla White, Pastel Pink & Sandy Beige) with cute bow ribbons.", Price: 1249.00, Images: []string{"assets/four_bear_combo_1.jpg", "assets/four_bear_combo_2.jpg", "assets/four_bear_combo_3.jpg", "assets/four_bear_combo_4.jpg"}, SKU: "FOUR-BEAR-COMBO-STD", IsActive: true},
		{Slug: "brown-white-bear-combo", Name: "Brown & White Bear Duo Combo", Description: "Matching pair of chocolate brown and vanilla white plush teddy bears with sweet ribbon bows.", Price: 699.00, Images: []string{"assets/brown_white_bear_1.jpg", "assets/brown_white_bear_2.jpg", "assets/brown_white_bear_3.jpg", "assets/brown_white_bear_4.jpg"}, SKU: "BRN-WHT-BEAR-STD", IsActive: true},
		{Slug: "brown-bear", Name: "Chocolate Brown Teddy Bear", Description: "Classic chocolate brown velvet teddy bear plushie wearing a cute white bow ribbon.", Price: 399.00, Images: []string{"assets/brown_bear_1.jpg", "assets/brown_bear_2.jpg", "assets/brown_bear_3.jpg", "assets/brown_bear_4.jpg"}, SKU: "BROWN-BEAR-STD", IsActive: true},
		{Slug: "white-bear", Name: "Vanilla White Teddy Bear", Description: "Dreamy vanilla white velvet teddy bear plushie with a pastel pink bow ribbon and rosy cheeks.", Price: 399.00, Images: []string{"assets/white_bear_1.jpg", "assets/white_bear_2.jpg", "assets/white_bear_3.jpg"}, SKU: "WHITE-BEAR-STD", IsActive: true},
		{Slug: "pink-bear", Name: "Pastel Pink Teddy Bear", Description: "Sweet pastel pink velvet teddy bear plushie with a white bow ribbon, ultra-soft and huggable.", Price: 399.00, Images: []string{"assets/pink_bear_1.jpg", "assets/pink_bear_2.jpg"}, SKU: "PINK-BEAR-STD", IsActive: true},
		{Slug: "beige-bear", Name: "Sandy Beige Teddy Bear", Description: "Warm sandy beige velvet teddy bear plushie wearing a pastel pink bow ribbon.", Price: 399.00, Images: []string{"assets/beige_bear.jpg", "assets/four_bear_combo_1.jpg"}, SKU: "BEIGE-BEAR-STD", IsActive: true},
		{Slug: "bears", Name: "Custom Bear Pack (Choose Size & Color)", Description: "Customize your own handcrafted plush bear bundle! Choose single, pair, or set of 3/4 in your favorite pastel color.", Price: 399.00, Images: []string{"assets/bears_colors.jpg", "assets/four_bear_combo_1.jpg", "assets/brown_white_bear_1.jpg", "assets/brown_bear_1.jpg", "assets/white_bear_1.jpg"}, SKU: "BEARS-STD", IsActive: true},
		{Slug: "trio-combo", Name: "Cute Companions Trio Combo", Description: "Adorable 3-piece plush keychain bundle featuring Creamy White Capybara, Earmuff Penguin, and Chubby Panda.", Price: 899.00, Images: []string{"assets/trio_combo_1.jpg", "assets/trio_combo_2.jpg", "assets/trio_combo_3.jpg", "assets/trio_combo_4.jpg"}, SKU: "TRIO-COMBO-STD", IsActive: true},
		{Slug: "tulip-panda-combo", Name: "Twin Pandas & White Tulip Combo Set", Description: "Special gift set of two rosy-cheeked panda plush keychains paired with a double white tulip charm.", Price: 799.00, Images: []string{"assets/tulip_panda_combo_1.jpg", "assets/tulip_panda_combo_2.jpg", "assets/tulip_panda_combo_3.jpg", "assets/tulip_panda_combo_4.jpg"}, SKU: "TULIP-PANDA-STD", IsActive: true},
		{Slug: "panda", Name: "Chubby Panda Plush Keychain", Description: "Super round and squishy panda keychain with rosy pink cheeks and happy stitched eyes.", Price: 349.00, Images: []string{"assets/panda_new_1.jpg", "assets/panda_new_2.jpg", "assets/panda_new_3.jpg", "assets/panda_new_4.jpg", "assets/panda_new_5.jpg"}, SKU: "PANDA-STD", IsActive: true},
		{Slug: "penguin", Name: "Cozy Mini Penguin Keychain", Description: "Tiny penguin companion keychain featuring custom knit details, orange beak, and cute webbed feet.", Price: 349.00, Images: []string{"assets/penguin_new_1.jpg", "assets/penguin_new_2.jpg", "assets/penguin_new_3.jpg", "assets/penguin_new_4.jpg"}, SKU: "PENGUIN-STD", IsActive: true},
		{Slug: "capybara", Name: "Chubby Brown Capybara Keychain", Description: "Squishy brown capybara plushie keychain with closed happy eyes and cute little ears.", Price: 349.00, Images: []string{"assets/capybara_new_1.jpg", "assets/capybara_new_2.jpg", "assets/capybara_new_3.jpg", "assets/capybara_new_4.jpg"}, SKU: "CAPYBARA-STD", IsActive: true},
		{Slug: "white-capybara", Name: "Creamy White Capybara Keychain", Description: "Cozy cream-white capybara plush keychain with chocolate brown ears, paws, and sleepy eyes.", Price: 349.00, Images: []string{"assets/white_capybara_1.jpg", "assets/white_capybara_2.jpg", "assets/white_capybara_3.jpg", "assets/white_capybara_4.jpg"}, SKU: "WHITE-CAPYBARA-STD", IsActive: true},
		{Slug: "white-teddy", Name: "Mini White Panda Bear with Bow Tie", Description: "Cute standing mini white bear keychain with black panda ears, rosy cheeks, and a dapper bow tie.", Price: 349.00, Images: []string{"assets/white_teddy_1.jpg", "assets/white_teddy_2.jpg", "assets/white_teddy_3.jpg", "assets/white_teddy_4.jpg"}, SKU: "WHITE-TEDDY-STD", IsActive: true},
		{Slug: "duck-holding-flower", Name: "Little Duck Holding Pink Flower", Description: "Adorable handmade white duckling with rosy cheeks holding a blooming pink flower.", Price: 399.00, Images: []string{"assets/duck_flower_1.jpg", "assets/duck_flower_2.jpg", "assets/duck_flower_3.jpg", "assets/duck_flower_4.jpg", "assets/duck_flower_5.jpg"}, SKU: "DUCK-FLOWER-STD", IsActive: true},
		{Slug: "baby-chick", Name: "Fluffy Baby Chick Plushie", Description: "Super soft and round yellow baby chick plushie keychain crafted with cozy chenille velvet yarn.", Price: 299.00, Images: []string{"assets/baby_chick_1.jpg", "assets/baby_chick_2.jpg"}, SKU: "BABY-CHICK-STD", IsActive: true},
		{Slug: "piggy", Name: "Cute Pastel Piggy Moo Keychain", Description: "Adorable pastel plush keychain with a pink snout, cute ears, and soft spotted patches.", Price: 299.00, Images: []string{"assets/piggy_1.jpg", "assets/piggy_2.jpg", "assets/piggy_3.jpg", "assets/piggy_4.jpg"}, SKU: "PIGGY-STD", IsActive: true},
		{Slug: "bouquet", Name: "Everlasting Red Rose Bouquet", Description: "Romantic handmade crochet red rose bouquet wrapped in a cozy cream cone that blooms forever.", Price: 799.00, Images: []string{"assets/rose_bouquet_1.jpg", "assets/rose_bouquet_2.jpg", "assets/rose_bouquet_3.jpg", "assets/rose_bouquet_4.jpg", "assets/rose_bouquet_5.jpg"}, SKU: "BOUQUET-STD", IsActive: true},
		{Slug: "rose-flower-pot", Name: "Mini Crochet Rose Flower Pot", Description: "Charming white crochet basket pot filled with a lush removable bouquet of handcrafted red roses.", Price: 649.00, Images: []string{"assets/rose_pot_1.jpg", "assets/rose_pot_2.jpg", "assets/rose_pot_3.jpg", "assets/rose_pot_4.jpg", "assets/rose_pot_5.jpg"}, SKU: "ROSE-POT-STD", IsActive: true},
		{Slug: "flower-mat", Name: "Blooming Rose Bouquet Coaster Mat", Description: "Handcrafted cream crochet table mat bordered with 3D red roses that folds into a mini rose bouquet.", Price: 549.00, Images: []string{"assets/flower_mat_1.jpg", "assets/flower_mat_2.jpg", "assets/flower_mat_3.jpg", "assets/flower_mat_4.jpg"}, SKU: "FLOWER-MAT-STD", IsActive: true},
		{Slug: "sunflower-and-bee", Name: "Sunflower & Bumblebee Keychain Duo", Description: "Cheerful crochet sunflower paired with a chubby striped bumblebee on pearl beaded keychains.", Price: 499.00, Images: []string{"assets/sunflower_bee_1.jpg", "assets/sunflower_bee_2.jpg", "assets/sunflower_bee_3.jpg", "assets/sunflower_bee_4.jpg"}, SKU: "SUNFLOWER-BEE-STD", IsActive: true},
		{Slug: "sunflower", Name: "Pearl Beaded Sunflower Keychain", Description: "Bright golden crochet sunflower charm suspended from an iridescent pearl bead keychain strap.", Price: 299.00, Images: []string{"assets/sunflower_1.jpg", "assets/sunflower_2.jpg", "assets/sunflower_3.jpg", "assets/sunflower_4.jpg"}, SKU: "SUNFLOWER-STD", IsActive: true},
		{Slug: "pink-purple-tulip", Name: "Pink & Purple Double Tulip Keychain", Description: "Matching pair of pastel pink and lavender purple crochet tulip flower buds on a leafy green stem.", Price: 299.00, Images: []string{"assets/pink_purple_tulip_1.jpg", "assets/flowers_1.jpg", "assets/flowers_2.jpg"}, SKU: "PINK-PURPLE-TULIP-STD", IsActive: true},
		{Slug: "white-pink-flower", Name: "Pink & White Twin Tulip Keychain", Description: "Soft blush pink and pure white crochet tulip flower duo hanging from a braided green leaf strap.", Price: 299.00, Images: []string{"assets/white_pink_flower_1.jpg", "assets/white_pink_flower_2.jpg", "assets/white_pink_flower_3.jpg"}, SKU: "WHITE-PINK-FLOWER-STD", IsActive: true},
		{Slug: "white-tulip", Name: "Pure White Double Tulip Keychain", Description: "Elegant twin white crochet bell-tulip flowers with a hand-stitched green leaf loop for bags and keys.", Price: 299.00, Images: []string{"assets/white_tulip_1.jpg", "assets/white_tulip_2.jpg", "assets/white_tulip_3.jpg", "assets/white_tulip_4.jpg"}, SKU: "WHITE-TULIP-STD", IsActive: true},
		{Slug: "black-bow", Name: "Classic Black Ribbon Bow Keychain", Description: "Chic handcrafted black crochet ribbon bow charm keychain, perfect for bags, backpacks, and keys.", Price: 249.00, Images: []string{"assets/black_bow_1.jpg", "assets/black_bow_2.jpg", "assets/black_bow_3.jpg", "assets/black_bow_4.jpg", "assets/black_bow_5.jpg"}, SKU: "BLACK-BOW-STD", IsActive: true},
		{Slug: "hearts", Name: "Puffy Crochet Heart Keychain", Description: "A cozy puffy pink heart keychain to remind you of warm handmade love.", Price: 299.00, Images: []string{"assets/hearts_1.jpg", "assets/hearts_2.jpg", "assets/hearts_3.jpg", "assets/hearts_4.jpg"}, SKU: "HEARTS-STD", IsActive: true},
		{Slug: "spiderman", Name: "Spiderman Crochet Keychain", Description: "Handcrafted Spiderman hero crochet keychain with detailed mask pattern.", Price: 499.00, Images: []string{"assets/spiderman_1.jpg", "assets/spiderman_2.jpg", "assets/spiderman_3.jpg", "assets/spiderman_4.jpg"}, SKU: "SPIDERMAN-STD", IsActive: true},

		// Internal Pack/Color Variant & Legacy Slugs (IsActive: false so they don't duplicate in catalog grid, but resolve on checkout)
		{Slug: "bears-single-brown", Name: "Custom Bear Pack (Single Bear - Brown)", Description: "Single handcrafted brown crochet bear.", Price: 399.00, Images: []string{"assets/brown_bear_1.jpg"}, SKU: "BEARS-S-BRN", IsActive: false},
		{Slug: "bears-single-white", Name: "Custom Bear Pack (Single Bear - White)", Description: "Single handcrafted white crochet bear.", Price: 399.00, Images: []string{"assets/white_bear_1.jpg"}, SKU: "BEARS-S-WHT", IsActive: false},
		{Slug: "bears-single-beige", Name: "Custom Bear Pack (Single Bear - Beige)", Description: "Single handcrafted beige crochet bear.", Price: 399.00, Images: []string{"assets/beige_bear.jpg"}, SKU: "BEARS-S-BGE", IsActive: false},
		{Slug: "bears-single-pink", Name: "Custom Bear Pack (Single Bear - Pink)", Description: "Single handcrafted pink crochet bear.", Price: 399.00, Images: []string{"assets/pink_bear_1.jpg"}, SKU: "BEARS-S-PNK", IsActive: false},
		{Slug: "bears-pair-brown", Name: "Custom Bear Pack (Pair - Brown)", Description: "Pair of handcrafted brown crochet bears.", Price: 699.00, Images: []string{"assets/brown_white_bear_1.jpg"}, SKU: "BEARS-P-BRN", IsActive: false},
		{Slug: "bears-pair-white", Name: "Custom Bear Pack (Pair - White)", Description: "Pair of handcrafted white crochet bears.", Price: 699.00, Images: []string{"assets/brown_white_bear_1.jpg"}, SKU: "BEARS-P-WHT", IsActive: false},
		{Slug: "bears-pair-beige", Name: "Custom Bear Pack (Pair - Beige)", Description: "Pair of handcrafted beige crochet bears.", Price: 699.00, Images: []string{"assets/brown_white_bear_1.jpg"}, SKU: "BEARS-P-BGE", IsActive: false},
		{Slug: "bears-pair-pink", Name: "Custom Bear Pack (Pair - Pink)", Description: "Pair of handcrafted pink crochet bears.", Price: 699.00, Images: []string{"assets/brown_white_bear_1.jpg"}, SKU: "BEARS-P-PNK", IsActive: false},
		{Slug: "bears-set3-brown", Name: "Custom Bear Pack (Set of 3 - Brown)", Description: "Set of 3 handcrafted brown crochet bears.", Price: 999.00, Images: []string{"assets/four_bear_combo_1.jpg"}, SKU: "BEARS-S3-BRN", IsActive: false},
		{Slug: "bears-set3-white", Name: "Custom Bear Pack (Set of 3 - White)", Description: "Set of 3 handcrafted white crochet bears.", Price: 999.00, Images: []string{"assets/four_bear_combo_1.jpg"}, SKU: "BEARS-S3-WHT", IsActive: false},
		{Slug: "bears-set3-beige", Name: "Custom Bear Pack (Set of 3 - Beige)", Description: "Set of 3 handcrafted beige crochet bears.", Price: 999.00, Images: []string{"assets/four_bear_combo_1.jpg"}, SKU: "BEARS-S3-BGE", IsActive: false},
		{Slug: "bears-set3-pink", Name: "Custom Bear Pack (Set of 3 - Pink)", Description: "Set of 3 handcrafted pink crochet bears.", Price: 999.00, Images: []string{"assets/four_bear_combo_1.jpg"}, SKU: "BEARS-S3-PNK", IsActive: false},
		{Slug: "bears-set4-brown", Name: "Custom Bear Pack (Set of 4 - Brown)", Description: "Set of 4 handcrafted brown crochet bears.", Price: 1249.00, Images: []string{"assets/four_bear_combo_1.jpg"}, SKU: "BEARS-S4-BRN", IsActive: false},
		{Slug: "bears-set4-white", Name: "Custom Bear Pack (Set of 4 - White)", Description: "Set of 4 handcrafted white crochet bears.", Price: 1249.00, Images: []string{"assets/four_bear_combo_1.jpg"}, SKU: "BEARS-S4-WHT", IsActive: false},
		{Slug: "bears-set4-beige", Name: "Custom Bear Pack (Set of 4 - Beige)", Description: "Set of 4 handcrafted beige crochet bears.", Price: 1249.00, Images: []string{"assets/four_bear_combo_1.jpg"}, SKU: "BEARS-S4-BGE", IsActive: false},
		{Slug: "bears-set4-pink", Name: "Custom Bear Pack (Set of 4 - Pink)", Description: "Set of 4 handcrafted pink crochet bears.", Price: 1249.00, Images: []string{"assets/four_bear_combo_1.jpg"}, SKU: "BEARS-S4-PNK", IsActive: false},
		{Slug: "teddy", Name: "Cozy Teddy Bear", Description: "Super soft crochet teddy bear plushie wearing a cute ribbon.", Price: 349.00, Images: []string{"assets/white_teddy_1.jpg"}, SKU: "TEDDY-STD", IsActive: false},
		{Slug: "cute", Name: "Little Duck Holding Pink Flower", Description: "Adorable handmade white duckling with rosy cheeks holding a blooming pink flower.", Price: 399.00, Images: []string{"assets/duck_flower_1.jpg"}, SKU: "CUTE-STD", IsActive: false},
		{Slug: "duck", Name: "Little Duck Holding Pink Flower", Description: "Adorable handmade white duckling with rosy cheeks holding a blooming pink flower.", Price: 399.00, Images: []string{"assets/duck_flower_1.jpg"}, SKU: "DUCK-LEG", IsActive: false},
		{Slug: "bow", Name: "Classic Black Ribbon Bow Keychain", Description: "Chic handcrafted black crochet ribbon bow charm keychain.", Price: 249.00, Images: []string{"assets/black_bow_1.jpg"}, SKU: "BOW-STD", IsActive: false},
		{Slug: "flowers", Name: "Pink & Purple Double Tulip Keychain", Description: "Matching pair of pastel pink and lavender purple crochet tulip flower buds.", Price: 299.00, Images: []string{"assets/pink_purple_tulip_1.jpg"}, SKU: "FLOWERS-STD", IsActive: false},
		{Slug: "tulips", Name: "Pink & Purple Double Tulip Keychain", Description: "Matching pair of pastel pink and lavender purple crochet tulip flower buds.", Price: 299.00, Images: []string{"assets/pink_purple_tulip_1.jpg"}, SKU: "TULIPS-LEG", IsActive: false},
		{Slug: "heart", Name: "Puffy Crochet Heart Keychain", Description: "A cozy pink puffy heart keychain to remind you of warm handmade love.", Price: 299.00, Images: []string{"assets/hearts_1.jpg"}, SKU: "HEART-LEG", IsActive: false},
		{Slug: "combo", Name: "Cute Companions Trio Combo", Description: "Adorable 3-piece plush keychain bundle.", Price: 899.00, Images: []string{"assets/trio_combo_1.jpg"}, SKU: "COMBO-STD", IsActive: false},
	}

	for _, p := range items {
		var productID string
		err := dbPool.QueryRow(ctx, `
			INSERT INTO products (slug, name, description, price, images, is_active)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (slug) DO UPDATE
			SET name = EXCLUDED.name,
			    description = EXCLUDED.description,
			    price = EXCLUDED.price,
			    images = EXCLUDED.images,
			    is_active = EXCLUDED.is_active
			RETURNING id
		`, p.Slug, p.Name, p.Description, p.Price, p.Images, p.IsActive).Scan(&productID)
		if err != nil {
			log.Printf("[Catalog Sync Warning] Failed to upsert product %s: %v", p.Slug, err)
			continue
		}

		var variantCount int
		_ = dbPool.QueryRow(ctx, `SELECT COUNT(*) FROM product_variants WHERE product_id = $1`, productID).Scan(&variantCount)
		if variantCount == 0 {
			_, err = dbPool.Exec(ctx, `
				INSERT INTO product_variants (product_id, variant_name, stock_quantity, sku)
				VALUES ($1, 'Standard', 100, $2)
				ON CONFLICT (sku) DO NOTHING
			`, productID, p.SKU)
			if err != nil {
				log.Printf("[Catalog Sync Warning] Failed to ensure variant for %s: %v", p.Slug, err)
			}
		}
	}
	log.Printf("Synchronized %d catalog product definitions.", len(items))
}
