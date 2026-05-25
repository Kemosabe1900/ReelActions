-- Add tried_at timestamp to videos table
-- Records when the user last marked a video as tried (NULL when untried)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tried_at TIMESTAMPTZ;
