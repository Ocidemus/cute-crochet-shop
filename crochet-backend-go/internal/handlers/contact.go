package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"crochet-backend-go/internal/db"
	"crochet-backend-go/internal/email"
	"fmt"
	"io"
	"path/filepath"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/pgtype"
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
	// Restrict to 5MB max memory to be safe, though we enforce 2MB on file
	c.Request.ParseMultipartForm(5 << 20)
	
	name := strings.TrimSpace(c.PostForm("name"))
	emailAddr := strings.ToLower(strings.TrimSpace(c.PostForm("email")))
	message := strings.TrimSpace(c.PostForm("message"))

	if name == "" || emailAddr == "" || message == "" {
		// Fallback to try JSON binding if form-data isn't used
		var req ContactRequest
		if err := c.ShouldBindJSON(&req); err == nil {
			name = strings.TrimSpace(req.Name)
			emailAddr = strings.ToLower(strings.TrimSpace(req.Email))
			message = strings.TrimSpace(req.Message)
		}
	}

	if name == "" || emailAddr == "" || message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All fields (Name, Email, Message) are required."})
		return
	}

	// 1. Validate email format & prevent disposable addresses
	if !emailFormatPattern.MatchString(emailAddr) || disposableEmailPattern.MatchString(emailAddr) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Please enter a valid, active email address (e.g. user@domain.com).",
		})
		return
	}

	// 2. Validate that the email belongs to a registered account in the DB (if DB is active)
	if h.DB != nil {
		ctx := c.Request.Context()
		_, err := h.Queries.GetUserByEmail(ctx, emailAddr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "This email address is not registered in our system. Only validated registered accounts can submit support inquiries. Please sign up or log in first!",
			})
			return
		}
	}

	// 3. Profanity validation check
	if profanityPattern.MatchString(name) || profanityPattern.MatchString(message) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Profanity or offensive language is not allowed. Please keep your message friendly & polite! 🌸",
		})
		return
	}

	// 4. Handle Optional Image Upload
	var imageUrl pgtype.Text
	file, err := c.FormFile("image")
	if err == nil {
		// We have an image
		if file.Size > 2*1024*1024 { // 2MB Limit
			c.JSON(http.StatusBadRequest, gin.H{"error": "Image file too large. Max size is 2MB."})
			return
		}
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Only JPG, PNG, and WebP images are allowed."})
			return
		}

		// Read file into memory
		f, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open image."})
			return
		}
		defer f.Close()
		
		data, err := io.ReadAll(f)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read image."})
			return
		}

		contentType := file.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		
		id, err := h.Queries.SaveImage(c.Request.Context(), db.SaveImageParams{
			ContentType: contentType,
			ImageData:   data,
		})
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image to db."})
			return
		}
		
		var uuidStr string
		if id.Valid {
			uuidStr = fmt.Sprintf("%x-%x-%x-%x-%x", id.Bytes[0:4], id.Bytes[4:6], id.Bytes[6:8], id.Bytes[8:10], id.Bytes[10:16])
		}
		
		imageUrl = pgtype.Text{String: "/api/images/" + uuidStr, Valid: true}
	}

	// 5. Store in Database
	if h.DB != nil {
		ctx := c.Request.Context()
		_, err = h.Queries.CreateCustomRequest(ctx, db.CreateCustomRequestParams{
			Name:     name,
			Email:    emailAddr,
			Message:  message,
			ImageUrl: imageUrl,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store request."})
			return
		}
	}

	// 6. Send email notification
	emailSvc := email.NewEmailService()
	go emailSvc.SendContactEmail(name, emailAddr, message)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Thank you for reaching out! Your message has been received.",
	})
}
