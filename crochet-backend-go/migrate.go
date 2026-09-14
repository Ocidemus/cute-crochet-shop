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
	
	_, err = pool.Exec(context.Background(), "ALTER TABLE products ADD COLUMN colors TEXT[] DEFAULT '{}';")
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Migration successful!")
}
