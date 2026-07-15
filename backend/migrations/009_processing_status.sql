-- 009: allow 'processing' in the status check constraint.
-- claim_next_job() (migration 008) marks claimed rows 'processing', but the
-- original constraint predates that value, so every claim failed with
-- processing_jobs_status_check violations.

alter table processing_jobs drop constraint processing_jobs_status_check;
alter table processing_jobs add constraint processing_jobs_status_check
  check (status in ('pending', 'processing', 'downloading', 'transcribing',
                    'classifying', 'embedding', 'completed', 'failed'));
