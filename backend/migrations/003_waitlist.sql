create table waitlist (
    id         uuid        default gen_random_uuid() primary key,
    email      text        unique not null,
    created_at timestamptz default now()
);
