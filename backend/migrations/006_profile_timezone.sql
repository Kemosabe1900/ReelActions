-- Store each user's IANA timezone so streak reminders fire at their local 6PM.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
