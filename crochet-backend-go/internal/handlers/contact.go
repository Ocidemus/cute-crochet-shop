package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

type ContactHandler struct{}

type ContactRequest struct {
	Name    string `json:"name" binding:"required"`
	Email   string `json:"email" binding:"required"`
	Message string `json:"message" binding:"required"`
}

// Comprehensive profanity blocklist regex
var profanityPattern = regexp.MustCompile(`(?i)\b(fuck|fucking|fucked|fucker|shit|shitting|bitch|bitches|bitching|asshole|bastard|cunt|dick|pussy|whore|slut|motherfucker|cock|crap|damn|bullshit|dumbass|douchebag)\b`)

func (h *ContactHandler) SubmitContact(c *gin.Context) {
	var req ContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please provide your name, email, and message."})
		return;
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	req.Message = strings.TrimSpace(req.Message)

	if req.Name == "" || req.Email == "" || req.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All fields (Name, Email, Message) are required."})
		return;
	}

	// Profanity validation check
	if profanityPattern.MatchString(req.Name) || profanityPattern.MatchString(req.Message) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Profanity or offensive language is not allowed. Please keep your message friendly & polite! 🌸",
		})
		return;
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Thank you for reaching out! Your message has been received.",
	})
}
