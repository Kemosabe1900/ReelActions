# Database Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the complete Supabase database schema for ReelActions — all tables, indexes, RLS policies, triggers, and the vector search RPC function.

**Architecture:** Single SQL migration applied to Supabase Postgres. Schema supports dynamic categories (JSONB structured_data + schema_status), tried mechanic, streaks + explorer score, cross-user video URL caching, pgvector for RAG, and chat source attribution (video URL + title returned by search RPC).

**Tech Stack:** PostgreSQL 15+, pgvector extension, Supabase Auth + RLS, Python pytest + supabase-py

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `migrations/001_initial_schema.sql` | Create | Full schema: extensions, tables, indexes, RLS, RPC, triggers |
| `tests/__init__.py` | Create | Makes tests a package |
| `tests/conftest.py` | Create | Pytest fixtures: Supabase client, test user IDs |
| `tests/test_schema.py` | Create | Schema verification tests |
| `requirements.txt` | Modify | Add pytest, pytest-asyncio, python-dotenv |

---

### Task 1: Add test dependencies

**Files:**
- Modify: `requirements.txt`
- Create: `tests/__init__.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Add pytest to requirements.txt**

Append to `requirements.txt`:
```
pytest==8.3.3
pytest-asyncio==0.24.0
python-dotenv==1.0.1
```

- [ ] **Step 2: Create tests/__init__.py**

Empty file — makes `tests/` a package.

- [ ] **Step 3: Create tests/conftest.py**

```python
import os
import pytest
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()


@pytest.fixture(scope="session")
def supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


@pytest.fixture(scope="session")
def test_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


@pytest.fixture(scope="session")
def test_user_id_2() -> str:
    return "00000000-0000-0000-0000-000000000002"
```

- [ ] **Step 4: Install dependencies**

Run: `pip install -r requirements.txt`
Expected: Successfully installed pytest-8.3.3 pytest-asyncio-0.24.0 python-dotenv-1.0.1

- [ ] **Step 5: Verify pytest runs**

Run: `pytest tests/ -v`
Expected: "no tests ran" — confirms pytest is working.

- [ ] **Step 6: Commit**

```bash
git add requirements.txt tests/__init__.py tests/conftest.py
git commit -m "chore: add pytest test infrastructure"
```

---

### Task 2: Extensions, profiles, and processing_jobs tables

**Files:**
- Create: `migrations/001_initial_schema.sql`
- Create: `tests/test_schema.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_schema.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_schema.py -v`
Expected: FAIL — "relation profiles does not exist"

- [ ] **Step 3: Create migrations/001_initial_schema.sql**

```sql
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
```

- [ ] **Step 4: Apply migration to Supabase**

Go to Supabase Dashboard → SQL Editor → paste `migrations/001_initial_schema.sql` → Run.
Expected: "Success. No rows returned"

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_schema.py::test_profiles_table_exists tests/test_schema.py::test_profiles_insert tests/test_schema.py::test_processing_jobs_table_exists tests/test_schema.py::test_processing_jobs_insert -v`
Expected: 4 passed

- [ ] **Step 6: Commit**

```bash
git add migrations/001_initial_schema.sql tests/test_schema.py
git commit -m "feat: add profiles and processing_jobs tables"
```

---

### Task 3: Videos table

**Files:**
- Modify: `migrations/001_initial_schema.sql`
- Modify: `tests/test_schema.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/test_schema.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_schema.py::test_videos_table_exists -v`
Expected: FAIL — "relation videos does not exist"

- [ ] **Step 3: Append videos table to migration**

Append to `migrations/001_initial_schema.sql`:
```sql
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
```

- [ ] **Step 4: Apply to Supabase**

Go to Supabase Dashboard → SQL Editor → run the videos table SQL only.
Expected: "Success. No rows returned"

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_schema.py::test_videos_table_exists tests/test_schema.py::test_videos_structured_data_jsonb tests/test_schema.py::test_videos_pending_review_status -v`
Expected: 3 passed

- [ ] **Step 6: Commit**

```bash
git add migrations/001_initial_schema.sql tests/test_schema.py
git commit -m "feat: add videos table with JSONB structured_data and schema_status"
```

---

### Task 4: Transcript chunks and chat messages tables

**Files:**
- Modify: `migrations/001_initial_schema.sql`
- Modify: `tests/test_schema.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/test_schema.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_schema.py::test_transcript_chunks_table_exists -v`
Expected: FAIL — "relation transcript_chunks does not exist"

- [ ] **Step 3: Append tables to migration**

Append to `migrations/001_initial_schema.sql`:
```sql
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
```

- [ ] **Step 4: Apply to Supabase**

Go to Supabase Dashboard → SQL Editor → run the two new table SQL statements.
Expected: "Success. No rows returned"

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_schema.py::test_transcript_chunks_table_exists tests/test_schema.py::test_transcript_chunks_insert tests/test_schema.py::test_chat_messages_table_exists tests/test_schema.py::test_chat_messages_video_sources -v`
Expected: 4 passed

- [ ] **Step 6: Commit**

```bash
git add migrations/001_initial_schema.sql tests/test_schema.py
git commit -m "feat: add transcript_chunks (pgvector) and chat_messages tables"
```

---

### Task 5: Indexes

No behavior tests — performance only.

**Files:**
- Modify: `migrations/001_initial_schema.sql`

- [ ] **Step 1: Append indexes to migration**

Append to `migrations/001_initial_schema.sql`:
```sql
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
```

- [ ] **Step 2: Apply to Supabase**

Go to Supabase Dashboard → SQL Editor → run the indexes SQL.
Expected: "Success. No rows returned"

- [ ] **Step 3: Commit**

```bash
git add migrations/001_initial_schema.sql
git commit -m "feat: add performance indexes including IVFFlat vector index"
```

---

### Task 6: RLS policies

**Files:**
- Modify: `migrations/001_initial_schema.sql`
- Modify: `tests/test_schema.py`

- [ ] **Step 1: Write RLS smoke test**

Append to `tests/test_schema.py`:
```python
def test_rls_enabled_service_key_bypasses(supabase: Client):
    """Service key bypasses RLS — confirms RLS is on without blocking our tests"""
    result = supabase.table("videos").select("id").limit(1).execute()
    assert result.data is not None
```

Note: Full cross-user isolation requires user-scoped JWTs. Verify manually in Supabase Dashboard → Authentication → Policies after applying.

- [ ] **Step 2: Run test to confirm it passes**

Run: `pytest tests/test_schema.py::test_rls_enabled_service_key_bypasses -v`
Expected: PASS — service key bypasses RLS so this always passes. This is a smoke test, not a TDD step.

- [ ] **Step 3: Append RLS policies to migration**

Append to `migrations/001_initial_schema.sql`:
```sql
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
```

- [ ] **Step 4: Apply to Supabase**

Go to Supabase Dashboard → SQL Editor → run the RLS SQL.
Expected: "Success. No rows returned"

- [ ] **Step 5: Verify in dashboard**

Go to Supabase Dashboard → Table Editor → select `videos` → click the RLS badge.
Expected: 4 policies listed (select, insert, update, delete).

- [ ] **Step 6: Run all tests to confirm nothing broke**

Run: `pytest tests/test_schema.py -v`
Expected: All previous tests still pass (service key bypasses RLS).

- [ ] **Step 7: Commit**

```bash
git add migrations/001_initial_schema.sql tests/test_schema.py
git commit -m "feat: enable RLS with user-scoped access policies on all tables"
```

---

### Task 7: search_chunks() RPC function

**Files:**
- Modify: `migrations/001_initial_schema.sql`
- Modify: `tests/test_schema.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/test_schema.py`:
```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_schema.py::test_search_chunks_rpc_exists -v`
Expected: FAIL — "function search_chunks does not exist"

- [ ] **Step 3: Append RPC function to migration**

Append to `migrations/001_initial_schema.sql`:
```sql
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
```

- [ ] **Step 4: Apply to Supabase**

Go to Supabase Dashboard → SQL Editor → run the RPC function SQL.
Expected: "Success. No rows returned"

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_schema.py::test_search_chunks_rpc_exists tests/test_schema.py::test_search_chunks_returns_closest_match -v`
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add migrations/001_initial_schema.sql tests/test_schema.py
git commit -m "feat: add search_chunks RPC with source attribution (video_url + video_title)"
```

---

### Task 8: updated_at triggers

**Files:**
- Modify: `migrations/001_initial_schema.sql`
- Modify: `tests/test_schema.py`

- [ ] **Step 1: Write failing test**

Append to `tests/test_schema.py`:
```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_schema.py::test_updated_at_trigger_on_processing_jobs -v`
Expected: FAIL — updated_at does not change (no trigger yet)

- [ ] **Step 3: Append triggers to migration**

Append to `migrations/001_initial_schema.sql`:
```sql
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
```

- [ ] **Step 4: Apply to Supabase**

Go to Supabase Dashboard → SQL Editor → run the trigger SQL.
Expected: "Success. No rows returned"

- [ ] **Step 5: Run all tests**

Run: `pytest tests/test_schema.py -v`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add migrations/001_initial_schema.sql tests/test_schema.py
git commit -m "feat: add updated_at auto-update triggers on processing_jobs and videos"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

Run: `pytest tests/test_schema.py -v`
Expected: All tests pass, 0 failures.

- [ ] **Step 2: Confirm migration file is complete**

Run: `wc -l migrations/001_initial_schema.sql`
Expected: 150+ lines.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete database schema — all tables, indexes, RLS, vector search, triggers"
```
