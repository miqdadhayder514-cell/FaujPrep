begin;

create table if not exists public.deputy_interview_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_json jsonb not null default '{}'::jsonb check (jsonb_typeof(profile_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deputy_interview_question_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  saved_answer text not null default '',
  is_saved boolean not null default false,
  is_reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index if not exists deputy_interview_question_progress_user_updated_idx
  on public.deputy_interview_question_progress (user_id, updated_at desc);

create table if not exists public.deputy_interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('complete', 'rapid')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  duration_minutes integer not null check (duration_minutes in (10, 15, 20, 30)),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  service text not null check (service in ('Pakistan Army', 'Pakistan Navy', 'Pakistan Air Force')),
  category_id text,
  question_ids text[] not null default '{}',
  feedback_json jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deputy_interview_sessions_user_started_idx
  on public.deputy_interview_sessions (user_id, started_at desc);

create table if not exists public.deputy_interview_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.deputy_interview_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  question_text text not null,
  response_text text not null default '',
  feedback_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists deputy_interview_responses_session_created_idx
  on public.deputy_interview_responses (user_id, session_id, created_at);

create table if not exists public.deputy_interview_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.deputy_interview_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('assistant', 'candidate')),
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists deputy_interview_messages_session_created_idx
  on public.deputy_interview_messages (user_id, session_id, created_at);

create table if not exists public.deputy_interview_feedback (
  session_id uuid primary key references public.deputy_interview_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback_json jsonb not null check (jsonb_typeof(feedback_json) = 'object'),
  provider text not null,
  model text not null,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists deputy_interview_feedback_user_created_idx
  on public.deputy_interview_feedback (user_id, created_at desc);

create table if not exists public.deputy_interview_roadmap_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 14),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_number)
);

create or replace function public.set_deputy_interview_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.set_deputy_interview_updated_at() from public, anon, authenticated;

drop trigger if exists deputy_interview_profiles_updated_at on public.deputy_interview_profiles;
create trigger deputy_interview_profiles_updated_at before update on public.deputy_interview_profiles
for each row execute function public.set_deputy_interview_updated_at();
drop trigger if exists deputy_interview_question_progress_updated_at on public.deputy_interview_question_progress;
create trigger deputy_interview_question_progress_updated_at before update on public.deputy_interview_question_progress
for each row execute function public.set_deputy_interview_updated_at();
drop trigger if exists deputy_interview_sessions_updated_at on public.deputy_interview_sessions;
create trigger deputy_interview_sessions_updated_at before update on public.deputy_interview_sessions
for each row execute function public.set_deputy_interview_updated_at();
drop trigger if exists deputy_interview_roadmap_progress_updated_at on public.deputy_interview_roadmap_progress;
create trigger deputy_interview_roadmap_progress_updated_at before update on public.deputy_interview_roadmap_progress
for each row execute function public.set_deputy_interview_updated_at();

alter table public.deputy_interview_profiles enable row level security;
alter table public.deputy_interview_question_progress enable row level security;
alter table public.deputy_interview_sessions enable row level security;
alter table public.deputy_interview_responses enable row level security;
alter table public.deputy_interview_messages enable row level security;
alter table public.deputy_interview_feedback enable row level security;
alter table public.deputy_interview_roadmap_progress enable row level security;

drop policy if exists deputy_interview_profiles_own on public.deputy_interview_profiles;
create policy deputy_interview_profiles_own on public.deputy_interview_profiles
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists deputy_interview_question_progress_own on public.deputy_interview_question_progress;
create policy deputy_interview_question_progress_own on public.deputy_interview_question_progress
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists deputy_interview_sessions_own on public.deputy_interview_sessions;
create policy deputy_interview_sessions_own on public.deputy_interview_sessions
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists deputy_interview_responses_own on public.deputy_interview_responses;
create policy deputy_interview_responses_own on public.deputy_interview_responses
for all to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.deputy_interview_sessions s
    where s.id = deputy_interview_responses.session_id and s.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.deputy_interview_sessions s
    where s.id = deputy_interview_responses.session_id and s.user_id = auth.uid()
  )
);

drop policy if exists deputy_interview_messages_read_own on public.deputy_interview_messages;
create policy deputy_interview_messages_read_own on public.deputy_interview_messages
for select to authenticated using (user_id = auth.uid());

drop policy if exists deputy_interview_feedback_read_own on public.deputy_interview_feedback;
create policy deputy_interview_feedback_read_own on public.deputy_interview_feedback
for select to authenticated using (user_id = auth.uid());

drop policy if exists deputy_interview_roadmap_progress_own on public.deputy_interview_roadmap_progress;
create policy deputy_interview_roadmap_progress_own on public.deputy_interview_roadmap_progress
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.deputy_interview_profiles to authenticated;
grant select, insert, update, delete on public.deputy_interview_question_progress to authenticated;
grant select, insert, update, delete on public.deputy_interview_sessions to authenticated;
grant select, insert, update, delete on public.deputy_interview_responses to authenticated;
grant select on public.deputy_interview_messages to authenticated;
grant select on public.deputy_interview_feedback to authenticated;
grant select, insert, update, delete on public.deputy_interview_roadmap_progress to authenticated;
grant all on public.deputy_interview_profiles to service_role;
grant all on public.deputy_interview_question_progress to service_role;
grant all on public.deputy_interview_sessions to service_role;
grant all on public.deputy_interview_responses to service_role;
grant all on public.deputy_interview_messages to service_role;
grant all on public.deputy_interview_feedback to service_role;
grant all on public.deputy_interview_roadmap_progress to service_role;

alter table public.current_affairs
  add column if not exists last_verified_at timestamptz,
  add column if not exists why_it_matters text,
  add column if not exists interview_questions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(interview_questions) = 'array'),
  add column if not exists verified_answer_guidance text;

commit;
