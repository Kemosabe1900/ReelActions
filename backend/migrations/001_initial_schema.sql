-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles (one per auth user)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_status TEXT NOT NULL DEFAULT 'trial'
        CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired')),
    trial_ends_at TIMESTAMPTZ,
    stripe_customer_id TEXT,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_activity_date DATE,
    weekly_skips_used INT NOT NULL DEFAULT 0,
    weekly_skip_reset_date DATE,
    explorer_score INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Processing jobs
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'downloading', 'transcribing', 'classifying', 'embedding', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Videos
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    category TEXT,
    title TEXT,
    summary TEXT,
    structured_data JSONB,
    schema_status TEXT NOT NULL DEFAULT 'mapped'
        CHECK (schema_status IN ('mapped', 'pending_review')),
    transcript TEXT,
    tried BOOLEAN NOT NULL DEFAULT FALSE,
    tried_count INT NOT NULL DEFAULT 0,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transcript chunks (pgvector)
CREATE TABLE transcript_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    chunk_index INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    video_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_url ON videos(url);
CREATE INDEX idx_videos_tried ON videos(tried);
CREATE INDEX idx_transcript_chunks_video_id ON transcript_chunks(video_id);
CREATE INDEX idx_transcript_chunks_user_id ON transcript_chunks(user_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- IVFFlat index for vector similarity (100 lists is appropriate for <1M vectors)
CREATE INDEX idx_transcript_chunks_embedding ON transcript_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "jobs_select_own" ON processing_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "jobs_insert_own" ON processing_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jobs_update_own" ON processing_jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "videos_select_own" ON videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "videos_insert_own" ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "videos_update_own" ON videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "videos_delete_own" ON videos FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "chunks_select_own" ON transcript_chunks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chunks_insert_own" ON transcript_chunks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chunks_delete_own" ON transcript_chunks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "chat_select_own" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_insert_own" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vector similarity search RPC
-- Returns chunks with source video URL + title for chat attribution
CREATE OR REPLACE FUNCTION search_chunks(
    query_embedding VECTOR(1536),
    target_user_id UUID,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    video_id UUID,
    content TEXT,
    similarity FLOAT,
    video_url TEXT,
    video_title TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tc.id,
        tc.video_id,
        tc.content,
        1 - (tc.embedding <=> query_embedding) AS similarity,
        v.url AS video_url,
        v.title AS video_title
    FROM transcript_chunks tc
    JOIN videos v ON tc.video_id = v.id
    WHERE tc.user_id = target_user_id
    ORDER BY tc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER processing_jobs_updated_at
    BEFORE UPDATE ON processing_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
