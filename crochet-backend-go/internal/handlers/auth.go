package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"crochet-backend-go/internal/db"
	"crochet-backend-go/internal/email"
	"crochet-backend-go/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var validate = validator.New()

type OTPItem struct {
	Code      string
	ExpiresAt time.Time
}

var otpStore sync.Map

type AuthHandler struct {
	Queries db.Queries
	DB      *pgxpool.Pool
}

type SendOTPRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type RegisterRequest struct {
	Name     string `json:"username" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Phone    string `json:"phone" validate:"omitempty,min=7,max=20"`
	OTPCode  string `json:"otp_code"`
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

// SendOTP generates a 6-digit code and emails it to the user
func (h *AuthHandler) SendOTP(c *gin.Context) {
	var req SendOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := validate.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please enter a valid email address."})
		return
	}

	// Check if user already exists
	_, err := h.Queries.GetUserByEmail(context.Background(), req.Email)
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "An account with this email address already exists."})
		return
	}

	// Generate 6-digit code
	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	otpStore.Store(strings.ToLower(req.Email), OTPItem{
		Code:      code,
		ExpiresAt: time.Now().Add(10 * time.Minute),
	})

	// Dispatch email
	emailSvc := email.NewEmailService()
	go emailSvc.SendOTPEmail(req.Email, code)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Verification code dispatched to your email address.",
	})
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

	// Verify OTP if provided or required
	cleanEmail := strings.ToLower(req.Email)
	if val, ok := otpStore.Load(cleanEmail); ok {
		item := val.(OTPItem)
		if time.Now().After(item.ExpiresAt) {
			otpStore.Delete(cleanEmail)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Verification code has expired. Please request a new code."})
			return
		}
		if req.OTPCode != item.Code {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification code. Please check your email."})
			return
		}
		otpStore.Delete(cleanEmail)
	} else if req.OTPCode != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code."})
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

// GetAuthConfig returns public authentication configuration (e.g. GOOGLE_CLIENT_ID from environment)
func (h *AuthHandler) GetAuthConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"googleClientId": os.Getenv("GOOGLE_CLIENT_ID"),
	})
}

type GoogleAuthRequest struct {
	Credential string `json:"credential" validate:"required"`
}

type GoogleTokenInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// GoogleAuth verifies Google ID Tokens and logs in or creates user account automatically
func (h *AuthHandler) GoogleAuth(c *gin.Context) {
	var req GoogleAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Credential == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or missing Google credential token."})
		return
	}

	// Verify ID Token with Google's tokeninfo OAuth2 verification service
	googleInfoURL := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", req.Credential)
	resp, err := http.Get(googleInfoURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to verify Google token credential with Google authentication servers."})
		return
	}
	defer resp.Body.Close()

	var tokenInfo GoogleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&tokenInfo); err != nil || tokenInfo.Email == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google user identity payload."})
		return
	}

	ctx := context.Background()

	// 1. Check if user already exists by email
	user, err := h.Queries.GetUserByEmail(ctx, tokenInfo.Email)
	if err != nil {
		// 2. User does not exist, create user account automatically from Google profile info
		dummyHash, _ := bcrypt.GenerateFromPassword([]byte("oauth_google_"+tokenInfo.Sub), 12)
		userName := tokenInfo.Name
		if userName == "" {
			userName = strings.Split(tokenInfo.Email, "@")[0]
		}

		user, err = h.Queries.CreateUser(ctx, db.CreateUserParams{
			Name:         userName,
			Email:        tokenInfo.Email,
			PasswordHash: string(dummyHash),
			Phone:        pgtype.Text{String: "", Valid: false},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user profile from Google authentication."})
			return
		}
	}

	// 3. Issue application JWT Session Token
	idUUID, _ := uuid.FromBytes(user.ID.Bytes[:])
	token, err := middleware.GenerateJWT(idUUID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authorization token."})
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

type UpdateProfileRequest struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Line1   string `json:"line1"`
	Line2   string `json:"line2"`
	City    string `json:"city"`
	State   string `json:"state"`
	Pincode string `json:"pincode"`
}

// GetProfile retrieves user details and default shipping address
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized session."})
		return
	}

	userIdStr, ok := userIdVal.(string)
	if !ok || userIdStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session user ID."})
		return
	}

	userID, err := uuid.Parse(userIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format."})
		return
	}

	var pgUserID pgtype.UUID
	pgUserID.Bytes = userID
	pgUserID.Valid = true

	user, err := h.Queries.GetUserByID(context.Background(), pgUserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User profile not found."})
		return
	}

	userPayload := UserPayload{
		ID:       userIdStr,
		Name:     user.Name,
		Username: user.Name,
		Email:    user.Email,
		Phone:    "",
	}
	if user.Phone.Valid {
		userPayload.Phone = user.Phone.String
	}

	// Fetch saved address if exists
	addrs, _ := h.Queries.ListAddressesByUserID(context.Background(), pgUserID)
	var addressData interface{}
	if len(addrs) > 0 {
		addr := addrs[0]
		addressData = gin.H{
			"id":      uuid.UUID(addr.ID.Bytes).String(),
			"line1":   addr.Line1,
			"line2":   addr.Line2.String,
			"city":    addr.City,
			"state":   addr.State,
			"pincode": addr.Pincode,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    userPayload,
		"address": addressData,
	})
}

// UpdateProfile updates user personal info and default shipping address
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized session."})
		return
	}

	userIdStr := userIdVal.(string)
	userID, err := uuid.Parse(userIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format."})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()

	// 1. Update User Name and Phone
	if req.Name != "" || req.Phone != "" {
		_, err := h.DB.Exec(ctx, `
			UPDATE users
			SET name = COALESCE(NULLIF($1, ''), name),
			    phone = COALESCE(NULLIF($2, ''), phone)
			WHERE id = $3
		`, req.Name, req.Phone, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user profile info."})
			return
		}
	}

	var pgUserID pgtype.UUID
	pgUserID.Bytes = userID
	pgUserID.Valid = true

	// 2. Save/Update Shipping Address if provided
	if req.Line1 != "" && req.City != "" && req.State != "" && req.Pincode != "" {
		_, err = h.Queries.CreateAddress(ctx, db.CreateAddressParams{
			UserID:    pgUserID,
			Line1:     req.Line1,
			Line2:     pgtype.Text{String: req.Line2, Valid: req.Line2 != ""},
			City:      req.City,
			State:     req.State,
			Pincode:   req.Pincode,
			IsDefault: true,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save shipping address."})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully.",
	})
}


