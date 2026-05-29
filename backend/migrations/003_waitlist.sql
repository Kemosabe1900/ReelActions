create table waitlist (
    id         uuid        default gen_random_uuid() primary key,
    email      text        unique not null,
    created_at timestamptz default now()
);

alter table waitlist enable row level security;

create policy "anon can insert" on waitlist
  for insert to anon
  with check (true);
