# Stage 1: Build the Go backend binary
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

# Copy Go module files from crochet-backend-go
COPY crochet-backend-go/go.mod crochet-backend-go/go.sum ./crochet-backend-go/
WORKDIR /app/crochet-backend-go
RUN go mod download

# Copy backend source code and build production binary
WORKDIR /app
COPY crochet-backend-go/ ./crochet-backend-go/
WORKDIR /app/crochet-backend-go
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/api cmd/api/main.go

# Stage 2: Minimal production runner image
FROM alpine:3.18 AS runner

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy compiled Go backend binary
COPY --from=builder /app/bin/api /app/api

# Copy frontend static files from cute-crochet-shop/static
COPY cute-crochet-shop/static /app/static

# Set production environment variables
ENV PORT=3000
ENV NODE_ENV=production
ENV STATIC_DIR=/app/static

EXPOSE 3000

CMD ["/app/api"]
