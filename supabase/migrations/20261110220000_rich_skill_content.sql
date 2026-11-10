alter table public.skills
  add column if not exists course_content jsonb not null default '{}'::jsonb;

alter table public.learning_progress
  add column if not exists notes text not null default '',
  add column if not exists quiz_scores jsonb not null default '{}'::jsonb,
  add column if not exists time_spent_seconds integer not null default 0
    check (time_spent_seconds >= 0);

create table if not exists public.saved_lessons (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id text not null references public.skills (id) on delete cascade,
  lesson_title text not null check (char_length(lesson_title) between 1 and 200),
  saved_at timestamptz not null default now(),
  primary key (user_id, skill_id, lesson_title)
);

alter table public.saved_lessons enable row level security;
revoke all on public.saved_lessons from anon, authenticated;
grant select, insert, delete on public.saved_lessons to authenticated;

create policy "Users can read their saved lessons"
on public.saved_lessons for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can save their own lessons"
on public.saved_lessons for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can remove their saved lessons"
on public.saved_lessons for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, bio)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), ''),
      'Learner'
    ),
    coalesce(new.raw_user_meta_data ->> 'bio', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

insert into public.skills (id, title, category, description, course_content) values
  ('html-css', 'HTML & CSS', 'Development', 'Build reliable, modern web layouts and ship polished pages that work across devices.', '{}'::jsonb),
  ('javascript', 'JavaScript', 'Development', 'Add real interactions to web apps so interfaces feel responsive and production-ready.', '{}'::jsonb),
  ('python', 'Python', 'Development', 'Use Python to solve practical problems and automate repetitive work with confidence.', '{}'::jsonb),
  ('ai-automation', 'AI Automation', 'Development', 'Learn how to use AI tools to automate repetitive work, generate content, and improve business workflows.', '{}'::jsonb),
  ('ai-prompt-engineering', 'AI Prompt Engineering', 'Development', 'Master the art of crafting prompts that produce better answers, clearer outputs, and more reliable AI results.', '{}'::jsonb),
  ('uiux', 'UI/UX Design', 'Design', 'Shape better digital experiences with research-backed decisions and elegant product flows.', '{}'::jsonb),
  ('graphic-design', 'Graphic Design', 'Design', 'Learn how layout, color, and typography create memorable visual stories for brands and products.', '{}'::jsonb),
  ('photography', 'Photography', 'Photography', 'Develop a professional eye for light, framing, and storytelling through real-world shooting exercises.', '{}'::jsonb),
  ('mathematics', 'Mathematics', 'Academic', 'Strengthen problem solving with clear methods and peer explanation.', '{}'::jsonb),
  ('public-speaking', 'Public Speaking', 'Communication', 'Build confidence, structure, and presence for presentations.', '{}'::jsonb),
  ('video-editing', 'Video Editing', 'Creative', 'Plan, cut, refine, and publish compelling short videos.', '{}'::jsonb),
  ('html', 'HTML', 'Development', 'Learn the semantic structure that makes every web page readable and accessible.', '{}'::jsonb),
  ('css', 'CSS', 'Development', 'Style pages with modern layouts, responsive design, and purposeful motion.', '{}'::jsonb),
  ('kotlin', 'Kotlin', 'Development', 'Learn Kotlin syntax, object-oriented thinking, and Android-ready foundations.', '{}'::jsonb),
  ('mobile-app-development', 'Mobile App Development', 'Development', 'Design and build mobile experiences that solve a real user need.', '{}'::jsonb),
  ('entrepreneurship', 'Entrepreneurship', 'Business', 'Validate ideas, understand customers, and plan a small sustainable venture.', '{}'::jsonb),
  ('communication-skills', 'Communication Skills', 'Communication', 'Communicate clearly in conversations, writing, and collaborative work.', '{}'::jsonb)
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description;
