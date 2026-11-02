import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PSYCHOLOGICAL_INTERVIEW_QUESTIONS } from '../src/data/psychologicalInterviewQuestions.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const questionRows = PSYCHOLOGICAL_INTERVIEW_QUESTIONS.map((question) => `  (${[
  quote(question.id),
  quote(question.categoryId),
  quote(question.category),
  quote(question.text),
  quote(question.explanation),
  quote(question.difficulty),
  quote(question.guidance),
  quote(question.classification),
  quote(question.commonMistake),
  quote(question.weakResponse),
  quote(question.weakExplanation),
  quote(question.sampleResponse),
  json(question.followUps),
  question.displayOrder,
].join(', ')})`).join(',\n');

const migration = `begin;

create table if not exists public.psychological_interview_questions (
  id text primary key,
  category_id text not null,
  category_name text not null,
  question_text text not null,
  explanation text not null,
  difficulty text not null check (difficulty in ('easy', 'moderate', 'challenging')),
  practice_guidance text not null,
  classification text not null check (classification in ('commonly-reported', 'personal-background', 'extended-practice', 'situational-practice', 'challenging-follow-up')),
  common_mistake text not null,
  weak_response text not null,
  weak_explanation text not null,
  sample_response text not null,
  follow_up_questions jsonb not null default '[]'::jsonb,
  display_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists psychological_interview_questions_category_idx
  on public.psychological_interview_questions (category_id, display_order);
create index if not exists psychological_interview_questions_filters_idx
  on public.psychological_interview_questions (classification, difficulty) where is_active;

create table if not exists public.psychological_interview_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('learning', 'mock', 'rapid-fire', 'voice', 'random', 'challenging', 'personalized')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  question_ids text[] not null default '{}',
  profile_snapshot jsonb not null default '{}'::jsonb,
  feedback_json jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists psychological_interview_attempts_user_started_idx
  on public.psychological_interview_attempts (user_id, started_at desc);

create table if not exists public.psychological_interview_responses (
  attempt_id uuid not null references public.psychological_interview_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null references public.psychological_interview_questions (id) on delete restrict,
  category_id text not null,
  question_text text not null,
  response_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create index if not exists psychological_interview_responses_user_attempt_idx
  on public.psychological_interview_responses (user_id, attempt_id);

create table if not exists public.psychological_interview_messages (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.psychological_interview_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('assistant', 'candidate')),
  question_id text references public.psychological_interview_questions (id) on delete set null,
  category_id text,
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists psychological_interview_messages_attempt_idx
  on public.psychological_interview_messages (user_id, attempt_id, created_at);

create table if not exists public.psychological_interview_feedback (
  attempt_id uuid primary key references public.psychological_interview_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback_json jsonb not null,
  provider text not null,
  model text not null,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.psychological_candidate_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.psychological_interview_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, action)
);
alter table public.psychological_interview_rate_limits enable row level security;

create or replace function public.consume_psychological_interview_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  insert into public.psychological_interview_rate_limits (user_id, action, window_started_at, request_count)
  values (p_user_id, p_action, now(), 1)
  on conflict (user_id, action) do update
  set request_count = case
        when psychological_interview_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
        else psychological_interview_rate_limits.request_count + 1
      end,
      window_started_at = case
        when psychological_interview_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
        else psychological_interview_rate_limits.window_started_at
      end
  returning request_count <= p_limit into allowed;
  return allowed;
end;
$$;
revoke all on function public.consume_psychological_interview_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_psychological_interview_limit(uuid, text, integer, integer) to service_role;

alter table public.psychological_interview_questions enable row level security;
alter table public.psychological_interview_attempts enable row level security;
alter table public.psychological_interview_responses enable row level security;
alter table public.psychological_interview_messages enable row level security;
alter table public.psychological_interview_feedback enable row level security;
alter table public.psychological_candidate_profiles enable row level security;

drop policy if exists psychological_interview_questions_read_active on public.psychological_interview_questions;
create policy psychological_interview_questions_read_active on public.psychological_interview_questions
for select to authenticated using (is_active);

drop policy if exists psychological_interview_attempts_read_own on public.psychological_interview_attempts;
create policy psychological_interview_attempts_read_own on public.psychological_interview_attempts
for select to authenticated using (user_id = auth.uid());
drop policy if exists psychological_interview_attempts_insert_own on public.psychological_interview_attempts;
create policy psychological_interview_attempts_insert_own on public.psychological_interview_attempts
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists psychological_interview_attempts_update_own on public.psychological_interview_attempts;
create policy psychological_interview_attempts_update_own on public.psychological_interview_attempts
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists psychological_interview_attempts_delete_own on public.psychological_interview_attempts;
create policy psychological_interview_attempts_delete_own on public.psychological_interview_attempts
for delete to authenticated using (user_id = auth.uid());

drop policy if exists psychological_interview_responses_own on public.psychological_interview_responses;
create policy psychological_interview_responses_own on public.psychological_interview_responses
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists psychological_interview_messages_read_own on public.psychological_interview_messages;
create policy psychological_interview_messages_read_own on public.psychological_interview_messages
for select to authenticated using (user_id = auth.uid());
drop policy if exists psychological_interview_feedback_read_own on public.psychological_interview_feedback;
create policy psychological_interview_feedback_read_own on public.psychological_interview_feedback
for select to authenticated using (user_id = auth.uid());
drop policy if exists psychological_candidate_profiles_own on public.psychological_candidate_profiles;
create policy psychological_candidate_profiles_own on public.psychological_candidate_profiles
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.psychological_interview_questions to authenticated;
grant select, insert, update, delete on public.psychological_interview_attempts to authenticated;
grant select, insert, update, delete on public.psychological_interview_responses to authenticated;
grant select on public.psychological_interview_messages to authenticated;
grant select on public.psychological_interview_feedback to authenticated;
grant select, insert, update, delete on public.psychological_candidate_profiles to authenticated;
grant all on public.psychological_interview_questions to service_role;
grant all on public.psychological_interview_attempts to service_role;
grant all on public.psychological_interview_responses to service_role;
grant all on public.psychological_interview_messages to service_role;
grant all on public.psychological_interview_feedback to service_role;
grant all on public.psychological_candidate_profiles to service_role;
grant all on public.psychological_interview_rate_limits to service_role;

insert into public.psychological_interview_questions (
  id, category_id, category_name, question_text, explanation, difficulty,
  practice_guidance, classification, common_mistake, weak_response,
  weak_explanation, sample_response, follow_up_questions, display_order
) values
${questionRows}
on conflict (id) do nothing;

commit;
`;

const destination = join(root, 'supabase', 'migrations', '060_issb_psychological_interview.sql');
await writeFile(destination, migration, 'utf8');
console.log(`Generated ${destination} with ${PSYCHOLOGICAL_INTERVIEW_QUESTIONS.length} question seeds.`);
