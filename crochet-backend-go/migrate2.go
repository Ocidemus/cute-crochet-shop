package main

import (
	"context"
	"log"
	"os"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil { log.Fatal(err) }
	defer pool.Close()
	
	query := `
CREATE TABLE IF NOT EXISTS custom_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);`
	_, err = pool.Exec(context.Background(), query)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Migration successful!")
}
