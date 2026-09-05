package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
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

	// 2. Initialize sqlc Queries engine
	queries := db.New(dbPool)

	// 3. Instantiate Resource Handlers
	authHandler := &handlers.AuthHandler{Queries: *queries, DB: dbPool}
	productsHandler := &handlers.ProductsHandler{Queries: *queries}
	ordersHandler := &handlers.OrdersHandler{Queries: *queries, DB: dbPool}
	webhooksHandler := &handlers.WebhooksHandler{Queries: *queries, DB: dbPool}
	adminHandler := &handlers.AdminHandler{Queries: *queries, DB: dbPool}
	addressesHandler := &handlers.AddressesHandler{Queries: *queries, DB: dbPool}

	// 4. Initialize Gin Framework
	if os.Getenv("NODE_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// CORS Setup
	r.Use(func(c *gin.Context) {
		allowedOrigin := os.Getenv("FRONTEND_URL")
		origin := c.Request.Header.Get("Origin")

		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else if allowedOrigin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Admin-Key")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// Rate Limit configuration definitions
	loginLimit := middleware.RateLimit(15*time.Minute, 10, "Too many login attempts. Please try again after 15 minutes.")
	orderLimit := middleware.RateLimit(5*time.Minute, 5, "Too many order attempts. Please try again in 5 minutes.")

	// 5. Mount API Routes
	api := r.Group("/api")
	{
		// Auth Endpoints
		auth := api.Group("/auth")
		{
			auth.GET("/config", authHandler.GetAuthConfig)
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", loginLimit, authHandler.Login)
			auth.POST("/google", authHandler.GoogleAuth)
		}
		
		// Legacy auth aliases for frontend compatibility
		api.POST("/register", authHandler.Register)
		api.POST("/login", loginLimit, authHandler.Login)
		api.POST("/google", authHandler.GoogleAuth)

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
		admin.Use(handlers.AdminAuth())
		{
			admin.GET("/orders", adminHandler.ListAllOrders)
			admin.POST("/shipments", adminHandler.AttachShipment)
		}
	}

	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../cute-crochet-shop/static"
	}

	// Serve static frontend assets & individual HTML files directly
	r.Static("/assets", filepath.Join(staticDir, "assets"))
	r.Static("/css", filepath.Join(staticDir, "css"))
	r.Static("/js", filepath.Join(staticDir, "js"))

	r.StaticFile("/", filepath.Join(staticDir, "index.html"))
	r.StaticFile("/index.html", filepath.Join(staticDir, "index.html"))
	r.StaticFile("/about.html", filepath.Join(staticDir, "about.html"))
	r.StaticFile("/cart.html", filepath.Join(staticDir, "cart.html"))
	r.StaticFile("/checkout.html", filepath.Join(staticDir, "checkout.html"))
	r.StaticFile("/contact.html", filepath.Join(staticDir, "contact.html"))
	r.StaticFile("/login.html", filepath.Join(staticDir, "login.html"))
	r.StaticFile("/orders.html", filepath.Join(staticDir, "orders.html"))
	r.StaticFile("/admin.html", filepath.Join(staticDir, "admin.html"))

	// Start Gin Server
	log.Printf("Go Crochet Backend running on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run HTTP server: %v", err)
	}
}
