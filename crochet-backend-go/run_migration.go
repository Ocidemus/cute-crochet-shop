package main

import (
	"context"
	"fmt"
	"os"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil { panic(err) }
	defer pool.Close()
	
	_, err = pool.Exec(context.Background(), `
CREATE TABLE IF NOT EXISTS stored_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL,
    image_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`)
	if err != nil { panic(err) }
	fmt.Println("Table created successfully")
}
