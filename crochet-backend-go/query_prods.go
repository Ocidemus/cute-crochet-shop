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
	rows, _ := pool.Query(context.Background(), "SELECT slug, name, price FROM products;")
	for rows.Next() {
		var s, n string
		var p float64
		rows.Scan(&s, &n, &p)
		fmt.Printf("%s | %s | %f\n", s, n, p)
	}
}
