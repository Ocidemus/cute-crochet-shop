# Stage 1: Build the Go application binary
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

# Copy Go modules manifests
COPY go.mod go.sum ./
RUN go mod download

# Copy backend codebase
COPY . .

# Compile high-performance production binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o bin/api cmd/api/main.go

# Stage 2: Create a minimal production runner image
FROM alpine:3.18 AS runner

# Install timezone database and CA certificates for secure TLS connections (Supabase, Razorpay)
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy compiled binary from builder
COPY --from=builder /app/bin/api /app/api

# Copy the static frontend directory (needs to be copied inside the build context prior to build)
COPY ./static /app/static

# Set default production environment settings
ENV PORT=3000
ENV NODE_ENV=production
ENV STATIC_DIR=/app/static

EXPOSE 3000

# Run backend server
CMD ["/app/api"]
