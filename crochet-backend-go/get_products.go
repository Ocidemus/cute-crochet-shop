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
	
	rows, err := pool.Query(context.Background(), "SELECT name, images, created_at FROM products ORDER BY created_at DESC LIMIT 5;")
	if err != nil { panic(err) }
	defer rows.Close()
	
	for rows.Next() {
		var name string
		var images []string
        var created_at interface{}
		rows.Scan(&name, &images, &created_at)
		fmt.Printf("Product: %s, Created: %v, Images: %v\n", name, created_at, images)
	}
}
