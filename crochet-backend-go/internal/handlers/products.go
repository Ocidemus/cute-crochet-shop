package handlers

import (
	"context"
	"net/http"

	"crochet-backend-go/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductsHandler struct {
	Queries db.Queries
	DB      *pgxpool.Pool
}

type ProductWithVariants struct {
	db.Products
	Variants []db.ProductVariants `json:"variants"`
}

func (h *ProductsHandler) ListProducts(c *gin.Context) {
	ctx := context.Background()

	products, err := h.Queries.ListActiveProducts(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query active catalog."})
		return
	}

	// Batch query all variants in 1 round trip instead of N+1 sequential database round trips
	variantsMap := make(map[[16]byte][]db.ProductVariants)
	if h.DB != nil {
		rows, err := h.DB.Query(ctx, "SELECT id, product_id, variant_name, stock_quantity, sku, created_at FROM product_variants ORDER BY variant_name ASC")
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var v db.ProductVariants
				if err := rows.Scan(&v.ID, &v.ProductID, &v.VariantName, &v.StockQuantity, &v.Sku, &v.CreatedAt); err == nil {
					pID := v.ProductID.Bytes
					variantsMap[pID] = append(variantsMap[pID], v)
				}
			}
		}
	}

	var results []ProductWithVariants
	for _, p := range products {
		pID := p.ID.Bytes
		vars, exists := variantsMap[pID]
		if !exists || vars == nil {
			vars = []db.ProductVariants{}
		}

		results = append(results, ProductWithVariants{
			Products: p,
			Variants: vars,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "products": results})
}

func (h *ProductsHandler) GetProductDetail(c *gin.Context) {
	idStr := c.Param("id")
	prodID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID format."})
		return
	}

	ctx := context.Background()
	
	// Convert uuid.UUID to pgtype.UUID
	var pgProdID pgtypeUUID
	pgProdID.Bytes = prodID
	pgProdID.Valid = true

	product, err := h.Queries.GetProductByID(ctx, pgProdID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product details not found."})
		return
	}

	if !product.IsActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product is no longer active."})
		return
	}

	variants, err := h.Queries.GetVariantsByProductID(ctx, product.ID)
	if err != nil {
		variants = []db.ProductVariants{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"product": ProductWithVariants{
			Products: product,
			Variants: variants,
		},
	})
}

// Define local alias to avoid pgtype dependency in parsing if needed
type pgtypeUUID = struct {
	Bytes [16]byte
	Valid bool
}
