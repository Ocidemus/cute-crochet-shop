package handlers

import (
	"context"
	"net/http"

	"crochet-backend-go/internal/db"
	"crochet-backend-go/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var validate = validator.New()

type AuthHandler struct {
	Queries db.Queries
	DB      *pgxpool.Pool
}

type RegisterRequest struct {
	Name     string `json:"username" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Phone    string `json:"phone" validate:"omitempty,min=7,max=20"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type UserPayload struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
}

type AuthResponse struct {
	Success bool        `json:"success"`
	User    UserPayload `json:"user"`
	Token   string      `json:"token"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Password Hashing
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt credentials."})
		return
	}

	// Insert into DB
	user, err := h.Queries.CreateUser(context.Background(), db.CreateUserParams{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedBytes),
		Phone:        pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A user with this email already exists."})
		return
	}

	// Format UUID to String
	idUUID, _ := uuid.FromBytes(user.ID.Bytes[:])
	token, err := middleware.GenerateJWT(idUUID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authorization session token."})
		return
	}

	userPayload := UserPayload{
		ID:       idUUID.String(),
		Name:     user.Name,
		Username: user.Name,
		Email:    user.Email,
		Phone:    "",
	}
	if user.Phone.Valid {
		userPayload.Phone = user.Phone.String
	}

	c.JSON(http.StatusCreated, AuthResponse{
		Success: true,
		User:    userPayload,
		Token:   token,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.Queries.GetUserByEmail(context.Background(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password."})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password."})
		return
	}

	// Format UUID to String
	idUUID, _ := uuid.FromBytes(user.ID.Bytes[:])
	token, err := middleware.GenerateJWT(idUUID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication session token."})
		return
	}

	userPayload := UserPayload{
		ID:       idUUID.String(),
		Name:     user.Name,
		Username: user.Name,
		Email:    user.Email,
		Phone:    "",
	}
	if user.Phone.Valid {
		userPayload.Phone = user.Phone.String
	}

	c.JSON(http.StatusOK, AuthResponse{
		Success: true,
		User:    userPayload,
		Token:   token,
	})
}
