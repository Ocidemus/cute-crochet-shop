package handlers

import (
	"context"
	"net/http"

	"crochet-backend-go/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AddressesHandler struct {
	Queries db.Queries
	DB      *pgxpool.Pool
}

type CreateAddressRequest struct {
	Line1     string `json:"line1" validate:"required,min=5"`
	Line2     string `json:"line2"`
	City      string `json:"city" validate:"required,min=2"`
	State     string `json:"state" validate:"required,min=2"`
	Pincode   string `json:"pincode" validate:"required,min=4"`
	IsDefault bool   `json:"isDefault"`
}

func (h *AddressesHandler) CreateAddress(c *gin.Context) {
	userIdStr, _ := c.Get("userId")
	userID, _ := uuid.Parse(userIdStr.(string))

	var req CreateAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var pgUserID pgtype.UUID
	pgUserID.Bytes = userID
	pgUserID.Valid = true

	addr, err := h.Queries.CreateAddress(context.Background(), db.CreateAddressParams{
		UserID:    pgUserID,
		Line1:     req.Line1,
		Line2:     pgtype.Text{String: req.Line2, Valid: req.Line2 != ""},
		City:      req.City,
		State:     req.State,
		Pincode:   req.Pincode,
		IsDefault: req.IsDefault,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save address."})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "address": addr})
}

func (h *AddressesHandler) ListAddresses(c *gin.Context) {
	userIdStr, _ := c.Get("userId")
	userID, _ := uuid.Parse(userIdStr.(string))

	var pgUserID pgtype.UUID
	pgUserID.Bytes = userID
	pgUserID.Valid = true

	addrs, err := h.Queries.ListAddressesByUserID(context.Background(), pgUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch addresses."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "addresses": addrs})
}
