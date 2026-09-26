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
	var imgs []string
	pool.QueryRow(context.Background(), "SELECT images FROM products WHERE slug = 'brown-bear'").Scan(&imgs)
	fmt.Printf("%v\n", imgs)
}
