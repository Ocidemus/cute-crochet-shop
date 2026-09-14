package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"crochet-backend-go/internal/db"
	"crochet-backend-go/internal/email"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ContactHandler struct {
	Queries db.Queries
	DB      *pgxpool.Pool
}

type ContactRequest struct {
	Name    string `json:"name" binding:"required"`
	Email   string `json:"email" binding:"required"`
	Message string `json:"message" binding:"required"`
}

// Validation patterns
var (
	emailFormatPattern      = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	disposableEmailPattern = regexp.MustCompile(`(?i)@(test|example|invalid|disposable|mailinator|tempmail|10minutemail|guerrillamail)\.`)
	profanityPattern       = regexp.MustCompile(`(?i)\b(fuck|fucking|fucked|fucker|shit|shitting|bitch|bitches|bitching|asshole|bastard|cunt|dick|pussy|whore|slut|motherfucker|cock|crap|damn|bullshit|dumbass|douchebag)\b`)
)

func (h *ContactHandler) SubmitContact(c *gin.Context) {
	var req ContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide your name, email, and message."})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Message = strings.TrimSpace(req.Message)

	if req.Name == "" || req.Email == "" || req.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All fields (Name, Email, Message) are required."})
		return
	}

	// 1. Validate email format & prevent disposable addresses
	if !emailFormatPattern.MatchString(req.Email) || disposableEmailPattern.MatchString(req.Email) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Please enter a valid, active email address (e.g. user@domain.com).",
		})
		return
	}

	// 2. Validate that the email belongs to a registered account in the DB (if DB is active)
	if h.DB != nil {
		ctx := c.Request.Context()
		_, err := h.Queries.GetUserByEmail(ctx, req.Email)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "This email address is not registered in our system. Only validated registered accounts can submit support inquiries. Please sign up or log in first!",
			})
			return
		}
	}

	// 3. Profanity validation check
	if profanityPattern.MatchString(req.Name) || profanityPattern.MatchString(req.Message) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Profanity or offensive language is not allowed. Please keep your message friendly & polite! 🌸",
		})
		return
	}

	// 4. Send email notification
	emailSvc := email.NewEmailService()
	go emailSvc.SendContactEmail(req.Name, req.Email, req.Message)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Thank you for reaching out! Your message has been received.",
	})
}
