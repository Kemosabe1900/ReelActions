-- 010: dedup guard for the daily 6PM streak reminder.
-- Nothing previously tracked "already notified today" per user, so if more
-- than one app instance was alive during the target hour (e.g. a Railway
-- redeploy overlapping 6PM local), each instance sent its own notification
-- independently. This column lets the scheduler claim "today" atomically via
-- a conditional UPDATE, so only one instance's send wins.

alter table profiles add column if not exists last_streak_notified_date date;
