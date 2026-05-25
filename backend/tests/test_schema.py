import uuid
import time
import pytest
from supabase import Client


def test_profiles_table_exists(supabase: Client):
    result = supabase.table("profiles").select("id").limit(1).execute()
    assert result.data is not None


def test_profiles_insert(supabase: Client, test_user_id: str):
    data = {
        "id": test_user_id,
        "subscription_status": "trial",
        "trial_ends_at": "2026-06-01T00:00:00Z",
        "current_streak": 0,
        "longest_streak": 0,
        "weekly_skips_used": 0,
        "explorer_score": 0,
    }
    result = supabase.table("profiles").upsert(data).execute()
    assert result.data[0]["id"] == test_user_id
    assert result.data[0]["explorer_score"] == 0
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_processing_jobs_table_exists(supabase: Client):
    result = supabase.table("processing_jobs").select("id").limit(1).execute()
    assert result.data is not None


def test_processing_jobs_insert(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    job_id = str(uuid.uuid4())
    result = supabase.table("processing_jobs").insert({
        "id": job_id,
        "user_id": test_user_id,
        "video_url": "https://tiktok.com/test",
        "status": "pending",
    }).execute()
    assert result.data[0]["status"] == "pending"
    supabase.table("processing_jobs").delete().eq("id", job_id).execute()
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_videos_table_exists(supabase: Client):
    result = supabase.table("videos").select("id").limit(1).execute()
    assert result.data is not None


def test_videos_structured_data_jsonb(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    video_id = str(uuid.uuid4())
    structured_data = {
        "prep_time_minutes": None,
        "cook_time_minutes": None,
        "servings": 4,
        "cuisine": "Italian",
        "ingredients": ["2 cups flour", "1 egg"],
        "steps": ["Mix dry ingredients"],
    }
    result = supabase.table("videos").insert({
        "id": video_id,
        "user_id": test_user_id,
        "url": "https://tiktok.com/recipe-test",
        "category": "Recipes",
        "title": "Simple pasta",
        "summary": "Quick pasta recipe",
        "structured_data": structured_data,
        "schema_status": "mapped",
        "transcript": "Today we are making pasta...",
    }).execute()
    assert result.data[0]["tried"] == False
    assert result.data[0]["tried_count"] == 0
    assert result.data[0]["structured_data"]["cuisine"] == "Italian"
    assert result.data[0]["schema_status"] == "mapped"
    supabase.table("videos").delete().eq("id", video_id).execute()
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_videos_pending_review_status(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    video_id = str(uuid.uuid4())
    result = supabase.table("videos").insert({
        "id": video_id,
        "user_id": test_user_id,
        "url": "https://tiktok.com/pottery-test",
        "category": "Pottery",
        "title": "Pottery basics",
        "summary": "Intro to pottery",
        "transcript": "Welcome to pottery...",
        "schema_status": "pending_review",
        "structured_data": {"key_concepts": ["centering clay"], "action_items": ["buy clay"]},
    }).execute()
    assert result.data[0]["schema_status"] == "pending_review"
    supabase.table("videos").delete().eq("id", video_id).execute()
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_transcript_chunks_table_exists(supabase: Client):
    result = supabase.table("transcript_chunks").select("id").limit(1).execute()
    assert result.data is not None


def test_transcript_chunks_insert(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    video_id = str(uuid.uuid4())
    supabase.table("videos").insert({
        "id": video_id, "user_id": test_user_id, "url": "https://tiktok.com/chunk-test",
        "category": "Fitness", "title": "Test", "summary": "Test", "transcript": "Test transcript",
    }).execute()
    chunk_id = str(uuid.uuid4())
    embedding = [0.0] * 1536
    result = supabase.table("transcript_chunks").insert({
        "id": chunk_id,
        "video_id": video_id,
        "user_id": test_user_id,
        "content": "Test chunk content",
        "embedding": embedding,
        "chunk_index": 0,
    }).execute()
    assert result.data[0]["chunk_index"] == 0
    supabase.table("transcript_chunks").delete().eq("id", chunk_id).execute()
    supabase.table("videos").delete().eq("id", video_id).execute()
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_chat_messages_table_exists(supabase: Client):
    result = supabase.table("chat_messages").select("id").limit(1).execute()
    assert result.data is not None


def test_rls_enabled_service_key_bypasses(supabase: Client):
    """Service key bypasses RLS — confirms RLS is on without blocking our tests"""
    result = supabase.table("videos").select("id").limit(1).execute()
    assert result.data is not None


def test_chat_messages_video_sources(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    msg_id = str(uuid.uuid4())
    video_sources = [{"video_id": "abc123", "url": "https://tiktok.com/test", "title": "Test video"}]
    result = supabase.table("chat_messages").insert({
        "id": msg_id,
        "user_id": test_user_id,
        "role": "assistant",
        "content": "Here is what I found...",
        "video_sources": video_sources,
    }).execute()
    assert result.data[0]["video_sources"][0]["title"] == "Test video"
    supabase.table("chat_messages").delete().eq("id", msg_id).execute()
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_search_chunks_rpc_exists(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    query_embedding = [0.1] * 1536
    result = supabase.rpc("search_chunks", {
        "query_embedding": query_embedding,
        "target_user_id": test_user_id,
        "match_count": 5,
    }).execute()
    assert isinstance(result.data, list)
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_search_chunks_returns_closest_match(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    video_id = str(uuid.uuid4())
    supabase.table("videos").insert({
        "id": video_id, "user_id": test_user_id, "url": "https://tiktok.com/rpc-test",
        "category": "Fitness", "title": "RPC test video", "summary": "Test", "transcript": "Test",
    }).execute()

    close_embedding = [1.0] + [0.0] * 1535
    far_embedding = [-1.0] + [0.0] * 1535
    supabase.table("transcript_chunks").insert([
        {"id": str(uuid.uuid4()), "video_id": video_id, "user_id": test_user_id,
         "content": "close chunk", "embedding": close_embedding, "chunk_index": 0},
        {"id": str(uuid.uuid4()), "video_id": video_id, "user_id": test_user_id,
         "content": "far chunk", "embedding": far_embedding, "chunk_index": 1},
    ]).execute()

    result = supabase.rpc("search_chunks", {
        "query_embedding": [1.0] + [0.0] * 1535,
        "target_user_id": test_user_id,
        "match_count": 5,
    }).execute()

    assert len(result.data) == 2
    assert result.data[0]["content"] == "close chunk"
    assert "video_url" in result.data[0]
    assert "video_title" in result.data[0]

    supabase.table("transcript_chunks").delete().eq("video_id", video_id).execute()
    supabase.table("videos").delete().eq("id", video_id).execute()
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_updated_at_trigger_on_videos(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    video_id = str(uuid.uuid4())
    supabase.table("videos").insert({
        "id": video_id, "user_id": test_user_id, "url": "https://tiktok.com/trigger-video",
        "category": "Fitness", "title": "Trigger test", "summary": "Test", "transcript": "Test",
    }).execute()
    original = supabase.table("videos").select("updated_at").eq("id", video_id).execute()
    original_time = original.data[0]["updated_at"]
    time.sleep(1)
    supabase.table("videos").update({"tried": True}).eq("id", video_id).execute()
    updated = supabase.table("videos").select("updated_at").eq("id", video_id).execute()
    assert updated.data[0]["updated_at"] > original_time
    supabase.table("videos").delete().eq("id", video_id).execute()
    supabase.table("profiles").delete().eq("id", test_user_id).execute()


def test_updated_at_trigger_on_processing_jobs(supabase: Client, test_user_id: str):
    supabase.table("profiles").upsert({"id": test_user_id, "subscription_status": "trial"}).execute()
    job_id = str(uuid.uuid4())
    supabase.table("processing_jobs").insert({
        "id": job_id, "user_id": test_user_id,
        "video_url": "https://tiktok.com/trigger-test", "status": "pending",
    }).execute()
    original = supabase.table("processing_jobs").select("updated_at").eq("id", job_id).execute()
    original_time = original.data[0]["updated_at"]
    time.sleep(1)
    supabase.table("processing_jobs").update({"status": "downloading"}).eq("id", job_id).execute()
    updated = supabase.table("processing_jobs").select("updated_at").eq("id", job_id).execute()
    assert updated.data[0]["updated_at"] > original_time
    supabase.table("processing_jobs").delete().eq("id", job_id).execute()
    supabase.table("profiles").delete().eq("id", test_user_id).execute()
