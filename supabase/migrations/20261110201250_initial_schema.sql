create table public.skills (
  id text primary key,
  title text not null,
  category text not null,
  description text not null default ''
);

insert into public.skills (id, title, category, description) values
  ('html-css', 'HTML & CSS', 'Development', 'Build reliable, modern web layouts and ship polished pages that work across devices.'),
  ('javascript', 'JavaScript', 'Development', 'Learn interactive logic, websites, and small apps.'),
  ('python', 'Python', 'Development', 'Practice coding fundamentals and automation projects.'),
  ('ai-automation', 'AI Automation', 'AI', 'Use AI tools to simplify repetitive tasks and workflows.'),
  ('ai-prompt-engineering', 'AI Prompt Engineering', 'AI', 'Write clearer prompts and evaluate AI-generated responses.'),
  ('uiux', 'UI/UX Design', 'Design', 'Shape better digital experiences with thoughtful design.'),
  ('graphic-design', 'Graphic Design', 'Design', 'Create visuals that stand out for portfolios and social posts.'),
  ('photography', 'Photography', 'Creative', 'Capture striking shots with composition and storytelling.')
on conflict (id) do update
set title = excluded.title,
    category = excluded.category,
    description = excluded.description;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Learner'
    check (char_length(display_name) between 1 and 80),
  bio text not null default ''
    check (char_length(bio) <= 500),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id text not null references public.skills (id) on delete cascade,
  intent text not null check (intent in ('teach', 'learn')),
  proficiency smallint check (proficiency between 1 and 5),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, skill_id, intent)
);

create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  learn_skill_id text not null references public.skills (id),
  teach_skill_id text not null references public.skills (id),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> receiver_id)
);

create index swap_requests_requester_created_idx
  on public.swap_requests (requester_id, created_at desc);
create index swap_requests_receiver_created_idx
  on public.swap_requests (receiver_id, created_at desc);

create table public.saved_skills (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id text not null references public.skills (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table public.learning_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id text not null references public.skills (id) on delete cascade,
  completed_lessons text[] not null default '{}',
  active_lesson text,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger learning_progress_touch_updated_at
before update on public.learning_progress
for each row execute function public.touch_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), ''),
      'Learner'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.enforce_swap_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if (select auth.uid()) = old.requester_id then
    if not (
      (old.status in ('requested', 'accepted') and new.status = 'cancelled')
      or (old.status = 'accepted' and new.status = 'completed')
    ) then
      raise exception 'Invalid swap request status change';
    end if;
  elsif (select auth.uid()) = old.receiver_id then
    if not (
      (old.status = 'requested' and new.status in ('accepted', 'declined'))
      or (old.status = 'accepted' and new.status = 'completed')
    ) then
      raise exception 'Invalid swap request status change';
    end if;
  else
    raise exception 'Only a swap participant can change its status';
  end if;

  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.enforce_swap_status_transition() from public, anon, authenticated;

create trigger swap_requests_status_transition
before update of status on public.swap_requests
for each row execute function public.enforce_swap_status_transition();

alter table public.skills enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_skills enable row level security;
alter table public.swap_requests enable row level security;
alter table public.saved_skills enable row level security;
alter table public.learning_progress enable row level security;

revoke all on public.skills, public.profiles, public.profile_skills,
  public.swap_requests, public.saved_skills, public.learning_progress
from anon, authenticated;

grant select on public.skills to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, bio, avatar_path) on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_skills to authenticated;
grant select, insert on public.swap_requests to authenticated;
grant update (status) on public.swap_requests to authenticated;
grant select, insert, update, delete on public.saved_skills to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;

create policy "Anyone can read the skill catalog"
on public.skills for select
to anon, authenticated
using (true);

create policy "Authenticated users can read public profiles"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Authenticated users can discover offered and wanted skills"
on public.profile_skills for select
to authenticated
using (true);

create policy "Users can add their own skills"
on public.profile_skills for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own skills"
on public.profile_skills for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can remove their own skills"
on public.profile_skills for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Participants can read their swap requests"
on public.swap_requests for select
to authenticated
using ((select auth.uid()) in (requester_id, receiver_id));

create policy "Users can create requests as themselves"
on public.swap_requests for insert
to authenticated
with check (
  (select auth.uid()) = requester_id
  and (select auth.uid()) <> receiver_id
  and status = 'requested'
);

create policy "Participants can change request status"
on public.swap_requests for update
to authenticated
using ((select auth.uid()) in (requester_id, receiver_id))
with check ((select auth.uid()) in (requester_id, receiver_id));

create policy "Users can read their saved skills"
on public.saved_skills for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can save skills for themselves"
on public.saved_skills for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can remove their saved skills"
on public.saved_skills for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own learning progress"
on public.learning_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own learning progress"
on public.learning_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own learning progress"
on public.learning_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own learning progress"
on public.learning_progress for delete
to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Signed-in members can view avatars"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
