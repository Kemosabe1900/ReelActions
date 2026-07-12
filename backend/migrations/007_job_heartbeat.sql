-- Heartbeat column for processing_jobs: every status transition touches it,
-- so liveness (not age) decides when a job is considered dead.
alter table processing_jobs
  add column if not exists updated_at timestamptz not null default now();
