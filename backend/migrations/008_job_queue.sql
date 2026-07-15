-- 008: table-based job queue with retries.
-- The processing_jobs table becomes the queue. A worker claims rows atomically
-- via claim_next_job(); FastAPI only inserts rows. Transient failures are
-- rescheduled with next_retry_at; attempts tracks total claims.

alter table processing_jobs add column if not exists attempts int not null default 0;
alter table processing_jobs add column if not exists next_retry_at timestamptz;
alter table processing_jobs add column if not exists video_id uuid;

create index if not exists idx_processing_jobs_pending
  on processing_jobs (created_at)
  where status = 'pending';

-- Claims the oldest runnable job. Runnable means:
--   * pending and due (next_retry_at empty or in the past), or
--   * stuck mid-pipeline with no heartbeat for 20 minutes (worker died mid-job,
--     e.g. a deploy) -- reclaimed for another attempt. 20 min because the
--     download stage can legitimately stay silent ~12 min (two primary actor
--     runs + fallback actor at 240s each).
-- FOR UPDATE SKIP LOCKED makes concurrent workers safe.
create or replace function claim_next_job()
returns setof processing_jobs
language sql
as $$
  update processing_jobs
  set status = 'processing',
      attempts = attempts + 1,
      next_retry_at = null,
      updated_at = now()
  where id = (
    select id from processing_jobs
    where (
        status = 'pending'
        and (next_retry_at is null or next_retry_at <= now())
      )
      or (
        status in ('processing', 'downloading', 'transcribing', 'classifying', 'embedding')
        and updated_at < now() - interval '20 minutes'
      )
    order by created_at
    limit 1
    for update skip locked
  )
  returning *;
$$;
