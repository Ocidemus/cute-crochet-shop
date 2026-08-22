-- queries.sql

-- ============================================================================
-- Users
-- ============================================================================

-- name: CreateUser :one
INSERT INTO users (name, email, password_hash, phone)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1;

-- ============================================================================
-- Addresses
-- ============================================================================

-- name: CreateAddress :one
INSERT INTO addresses (user_id, line1, line2, city, state, pincode, is_default)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetAddressByID :one
SELECT * FROM addresses
WHERE id = $1;

-- name: ListAddressesByUserID :many
SELECT * FROM addresses
WHERE user_id = $1
ORDER BY created_at DESC;

-- ============================================================================
-- Products & Variants
-- ============================================================================

-- name: ListActiveProducts :many
SELECT * FROM products
WHERE is_active = TRUE
ORDER BY created_at DESC;

-- name: GetProductByID :one
SELECT * FROM products
WHERE id = $1;

-- name: GetVariantsByProductID :many
SELECT * FROM product_variants
WHERE product_id = $1
ORDER BY variant_name ASC;

-- name: GetVariantByID :one
SELECT * FROM product_variants
WHERE id = $1;

-- name: GetVariantByIDForUpdate :one
SELECT pv.*, p.price, p.name AS product_name
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE pv.id = $1
FOR UPDATE;

-- name: GetVariantByProductSlug :one
SELECT pv.*, p.price, p.name AS product_name
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE p.slug = $1
LIMIT 1;

-- name: GetVariantByProductSlugForUpdate :one
SELECT pv.*, p.price, p.name AS product_name
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE p.slug = $1
LIMIT 1
FOR UPDATE;

-- name: UpdateVariantStock :exec
UPDATE product_variants
SET stock_quantity = $2
WHERE id = $1;

-- ============================================================================
-- Orders & OrderItems
-- ============================================================================

-- name: CreateOrder :one
INSERT INTO orders (user_id, address_id, status, total_amount, razorpay_order_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: CreateOrderItem :one
INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetOrderByID :one
SELECT * FROM orders
WHERE id = $1;

-- name: GetOrderByRazorpayOrderID :one
SELECT * FROM orders
WHERE razorpay_order_id = $1;

-- name: UpdateOrderStatus :exec
UPDATE orders
SET status = $2
WHERE id = $1;

-- name: ListOrdersByUserID :many
SELECT * FROM orders
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: GetOrderItemsByOrderID :many
SELECT oi.*, pv.variant_name, pv.sku, p.name AS product_name
FROM order_items oi
JOIN product_variants pv ON oi.variant_id = pv.id
JOIN products p ON pv.product_id = p.id
WHERE oi.order_id = $1;

-- ============================================================================
-- Payments
-- ============================================================================

-- name: CreatePayment :one
INSERT INTO payments (order_id, razorpay_payment_id, razorpay_signature, status, amount)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- ============================================================================
-- Shipments
-- ============================================================================

-- name: CreateShipment :one
INSERT INTO shipments (order_id, courier_name, tracking_number, status)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetShipmentsByOrderID :many
SELECT * FROM shipments
WHERE order_id = $1
ORDER BY shipped_at DESC;
