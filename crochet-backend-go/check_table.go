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
	
	var count int
	err = pool.QueryRow(context.Background(), "SELECT count(*) FROM stored_images").Scan(&count)
	if err != nil { panic(err) }
	fmt.Printf("Table exists! Rows: %d\n", count)
}
