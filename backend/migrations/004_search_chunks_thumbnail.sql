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
    video_title TEXT,
    thumbnail_url TEXT
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
        v.title AS video_title,
        v.thumbnail_url AS thumbnail_url
    FROM transcript_chunks tc
    JOIN videos v ON tc.video_id = v.id
    WHERE tc.user_id = target_user_id
    ORDER BY tc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
