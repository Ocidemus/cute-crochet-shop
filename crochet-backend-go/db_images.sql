CREATE TABLE IF NOT EXISTS stored_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL,
    image_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
