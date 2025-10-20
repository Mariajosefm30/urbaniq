-- Make qr_token_hash nullable since we're using demo_code for validation instead
ALTER TABLE guests ALTER COLUMN qr_token_hash DROP NOT NULL;