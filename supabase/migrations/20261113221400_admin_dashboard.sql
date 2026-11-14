create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id text not null references public.skills (id),
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'published'
    check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_posts_skill_created_idx
  on public.community_posts (skill_id, created_at desc);
create index community_posts_status_created_idx
  on public.community_posts (status, created_at desc);

create trigger community_posts_touch_updated_at
before update on public.community_posts
for each row execute function public.touch_updated_at();

alter table public.community_posts enable row level security;
revoke all on public.community_posts from public, anon, authenticated;
grant select, insert, delete on public.community_posts to authenticated;

create policy "Members can read published posts and their own posts"
on public.community_posts for select
to authenticated
using (status = 'published' or (select auth.uid()) = user_id);

create policy "Members can publish posts as themselves"
on public.community_posts for insert
to authenticated
with check ((select auth.uid()) = user_id and status = 'published');

create policy "Members can remove their own posts"
on public.community_posts for delete
to authenticated
using ((select auth.uid()) = user_id);

create table public.site_pages (
  page_key text primary key check (page_key ~ '^[a-z0-9-]{1,60}$'),
  title text not null check (char_length(title) between 1 and 120),
  content jsonb not null default '{}'::jsonb,
  draft_content jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger site_pages_touch_updated_at
before update on public.site_pages
for each row execute function public.touch_updated_at();

alter table public.site_pages enable row level security;
revoke all on public.site_pages from public, anon, authenticated;
grant select (page_key, title, content, published_at, updated_at) on public.site_pages to anon, authenticated;

create policy "Anyone can read published site page content"
on public.site_pages for select
to anon, authenticated
using (published_at is not null);

create table public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_announcements_published_idx
  on public.site_announcements (published_at desc)
  where status = 'published';

create trigger site_announcements_touch_updated_at
before update on public.site_announcements
for each row execute function public.touch_updated_at();

alter table public.site_announcements enable row level security;
revoke all on public.site_announcements from public, anon, authenticated;
grant select (id, title, body, published_at, created_at, updated_at)
  on public.site_announcements to anon, authenticated;

create policy "Anyone can read published announcements"
on public.site_announcements for select
to anon, authenticated
using (status = 'published' and published_at is not null);

grant all on public.community_posts, public.site_pages, public.site_announcements to service_role;
