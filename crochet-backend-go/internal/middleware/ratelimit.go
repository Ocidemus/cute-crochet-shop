package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// rateLimiter stores client request counts mapping IPs in memory
type rateLimiter struct {
	requests map[string][]time.Time
	mu       sync.Mutex
	window   time.Duration
	limit    int
}

// newRateLimiter instantiates a sliding window rate limiter
func newRateLimiter(window time.Duration, limit int) *rateLimiter {
	return &rateLimiter{
		requests: make(map[string][]time.Time),
		window:   window,
		limit:    limit,
	}
}

// Allow checks if client request passes current window restrictions
func (rl *rateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Clean outdated requests
	var active []time.Time
	for _, t := range rl.requests[ip] {
		if t.After(cutoff) {
			active = append(active, t)
		}
	}

	if len(active) >= rl.limit {
		rl.requests[ip] = active
		return false
	}

	rl.requests[ip] = append(active, now)
	return true
}

// RateLimit creates customized path rate limits for login and order pathways
func RateLimit(window time.Duration, limit int, errMsg string) gin.HandlerFunc {
	rl := newRateLimiter(window, limit)
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.Allow(ip) {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": errMsg})
			c.Abort()
			return
		}
		c.Next()
	}
}
