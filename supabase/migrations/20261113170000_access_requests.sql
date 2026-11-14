create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  interests text not null default '' check (char_length(interests) <= 1000),
  request_token_hash text not null unique
    check (char_length(request_token_hash) = 64),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'invited', 'completed', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index access_requests_email_created_idx
  on public.access_requests (email, created_at desc);
create index access_requests_status_created_idx
  on public.access_requests (status, created_at desc);

create trigger access_requests_touch_updated_at
before update on public.access_requests
for each row execute function public.touch_updated_at();

alter table public.access_requests enable row level security;

revoke all on public.access_requests from public, anon, authenticated;
grant all on public.access_requests to service_role;
