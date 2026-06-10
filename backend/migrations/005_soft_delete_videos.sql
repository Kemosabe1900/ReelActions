ALTER TABLE videos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_videos_user_active ON videos (user_id, deleted_at) WHERE deleted_at IS NULL;
