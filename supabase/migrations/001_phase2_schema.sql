create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.military_branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  short_description text,
  description text,
  logo_url text,
  banner_image_url text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.military_branches(id) on delete set null,
  name text not null,
  slug text unique not null,
  short_description text,
  description text,
  exam_type text,
  difficulty text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  total_questions integer check (total_questions is null or total_questions > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon_name text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_subjects (
  exam_id uuid not null references public.exams(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  weight integer check (weight is null or weight >= 0),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (exam_id, subject_id)
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  difficulty text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, slug)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  question_text text not null,
  question_type text not null check (question_type in ('MCQ', 'TRUE_FALSE', 'NUMERIC', 'TEXT')),
  difficulty text check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_option text,
  explanation text,
  solution text,
  image_url text,
  source text,
  source_url text,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.question_tag_map (
  question_id uuid not null references public.questions(id) on delete cascade,
  tag_id uuid not null references public.question_tags(id) on delete cascade,
  primary key (question_id, tag_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  target_branch_id uuid references public.military_branches(id) on delete set null,
  target_exam_id uuid references public.exams(id) on delete set null,
  experience_level text,
  role text not null default 'USER' check (role in ('USER', 'EDITOR', 'ADMIN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option text,
  is_correct boolean not null,
  time_taken_seconds integer check (time_taken_seconds is null or time_taken_seconds >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  branch_id uuid references public.military_branches(id) on delete set null,
  exam_id uuid references public.exams(id) on delete set null,
  duration_minutes integer not null check (duration_minutes > 0),
  total_questions integer not null check (total_questions > 0),
  difficulty text,
  is_premium boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mock_test_questions (
  mock_test_id uuid not null references public.mock_tests(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  primary key (mock_test_id, question_id),
  unique (mock_test_id, question_number)
);

create table if not exists public.mock_test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mock_test_id uuid not null references public.mock_tests(id) on delete restrict,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer,
  total_questions integer,
  correct_answers integer,
  incorrect_answers integer,
  unanswered integer,
  time_taken_seconds integer,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED', 'ABANDONED'))
);

create table if not exists public.mock_test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_test_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  selected_option text,
  is_correct boolean not null,
  time_taken_seconds integer,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  content text,
  material_type text check (material_type is null or material_type in ('ARTICLE', 'PDF', 'NOTES', 'GUIDE', 'CHEATSHEET', 'VIDEO')),
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  branch_id uuid references public.military_branches(id) on delete set null,
  cover_image_url text,
  pdf_url text,
  is_premium boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.current_affairs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  summary text not null,
  content text,
  category text,
  published_at timestamptz,
  source_name text,
  source_url text,
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issb_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  content text,
  module_type text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exams_branch_id_idx on public.exams(branch_id);
create index if not exists subjects_active_order_idx on public.subjects(is_active, display_order);
create index if not exists topics_subject_id_idx on public.topics(subject_id);
create index if not exists questions_subject_id_idx on public.questions(subject_id);
create index if not exists questions_topic_id_idx on public.questions(topic_id);
create index if not exists questions_active_difficulty_idx on public.questions(is_active, difficulty);
create unique index if not exists questions_question_text_unique_idx on public.questions(question_text);
create index if not exists mock_tests_branch_id_idx on public.mock_tests(branch_id);
create index if not exists mock_tests_exam_id_idx on public.mock_tests(exam_id);
create index if not exists question_attempts_user_id_idx on public.question_attempts(user_id, created_at desc);
create index if not exists mock_test_attempts_user_id_idx on public.mock_test_attempts(user_id, started_at desc);
create index if not exists study_materials_published_idx on public.study_materials(is_published, created_at desc);
create index if not exists current_affairs_published_idx on public.current_affairs(is_published, published_at desc);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['military_branches','exams','subjects','topics','questions','mock_tests','study_materials','current_affairs','issb_modules','profiles'] LOOP
    EXECUTE format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    EXECUTE format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  END LOOP;
END $$;

create or replace view public.public_questions as
select id, subject_id, topic_id, question_text, question_type, difficulty,
       option_a, option_b, option_c, option_d, explanation, image_url
from public.questions
where is_active = true;

grant select on public.public_questions to anon, authenticated;

create or replace view public.public_mock_test_questions as
select mtq.mock_test_id, mtq.question_id, mtq.question_number,
       pq.subject_id, pq.topic_id, pq.question_text, pq.question_type,
       pq.difficulty, pq.option_a, pq.option_b, pq.option_c, pq.option_d,
       pq.explanation, pq.image_url
from public.mock_test_questions mtq
join public.public_questions pq on pq.id = mtq.question_id;

grant select on public.public_mock_test_questions to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, target_branch_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    (new.raw_user_meta_data ->> 'target_branch_id')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.submit_question_answer(
  p_question_id uuid,
  p_selected_option text,
  p_time_taken_seconds integer default null
)
returns table (is_correct boolean, explanation text)
language plpgsql
security definer set search_path = public
as $$
declare question_row public.questions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into question_row from public.questions
  where id = p_question_id and is_active = true;
  if not found then raise exception 'Question not found'; end if;

  return query
  insert into public.question_attempts (user_id, question_id, selected_option, is_correct, time_taken_seconds)
  values (auth.uid(), p_question_id, p_selected_option, upper(coalesce(p_selected_option, '')) = upper(coalesce(question_row.correct_option, '')), p_time_taken_seconds)
  returning question_attempts.is_correct, question_row.explanation;
end;
$$;

grant execute on function public.submit_question_answer(uuid, text, integer) to authenticated;

create or replace function public.start_mock_test(p_mock_test_id uuid)
returns table (attempt_id uuid, duration_minutes integer, total_questions integer)
language plpgsql
security definer set search_path = public
as $$
declare test_row public.mock_tests%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into test_row from public.mock_tests where id = p_mock_test_id and is_active = true;
  if not found then raise exception 'Mock test not found'; end if;

  return query
  insert into public.mock_test_attempts (user_id, mock_test_id, total_questions)
  values (auth.uid(), p_mock_test_id, test_row.total_questions)
  returning mock_test_attempts.id, test_row.duration_minutes, test_row.total_questions;
end;
$$;

create or replace function public.save_mock_test_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option text,
  p_time_taken_seconds integer default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare correct_value text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.mock_test_attempts a
    join public.mock_test_questions mtq on mtq.mock_test_id = a.mock_test_id and mtq.question_id = p_question_id
    where a.id = p_attempt_id and a.user_id = auth.uid() and a.status = 'IN_PROGRESS'
  ) then raise exception 'Invalid mock test attempt'; end if;

  select correct_option into correct_value from public.questions where id = p_question_id and is_active = true;
  if not found then raise exception 'Question not found'; end if;

  insert into public.mock_test_answers (attempt_id, question_id, selected_option, is_correct, time_taken_seconds)
  values (p_attempt_id, p_question_id, p_selected_option, upper(coalesce(p_selected_option, '')) = upper(coalesce(correct_value, '')), p_time_taken_seconds)
  on conflict (attempt_id, question_id) do update set selected_option = excluded.selected_option, is_correct = excluded.is_correct, time_taken_seconds = excluded.time_taken_seconds;
end;
$$;

create or replace function public.submit_mock_test(p_attempt_id uuid, p_time_taken_seconds integer default null)
returns table (score integer, total_questions integer, correct_answers integer, incorrect_answers integer, unanswered integer, time_taken_seconds integer)
language plpgsql
security definer set search_path = public
as $$
declare attempt_row public.mock_test_attempts%rowtype;
declare total_count integer;
declare correct_count integer;
declare answered_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into attempt_row from public.mock_test_attempts where id = p_attempt_id and user_id = auth.uid() for update;
  if not found or attempt_row.status <> 'IN_PROGRESS' then raise exception 'Invalid or already submitted attempt'; end if;

  select count(*) into total_count from public.mock_test_questions where mock_test_id = attempt_row.mock_test_id;
  select count(*) into answered_count from public.mock_test_answers where attempt_id = p_attempt_id;
  select count(*) into correct_count from public.mock_test_answers where attempt_id = p_attempt_id and is_correct = true;

  update public.mock_test_attempts
  set submitted_at = now(), score = correct_count, total_questions = total_count,
      correct_answers = correct_count, incorrect_answers = greatest(answered_count - correct_count, 0),
      unanswered = greatest(total_count - answered_count, 0), time_taken_seconds = p_time_taken_seconds, status = 'COMPLETED'
  where id = p_attempt_id;

  return query select correct_count, total_count, correct_count, greatest(answered_count - correct_count, 0), greatest(total_count - answered_count, 0), p_time_taken_seconds;
end;
$$;

grant execute on function public.start_mock_test(uuid) to authenticated;
grant execute on function public.save_mock_test_answer(uuid, uuid, text, integer) to authenticated;
grant execute on function public.submit_mock_test(uuid, integer) to authenticated;

alter table public.military_branches enable row level security;
alter table public.exams enable row level security;
alter table public.subjects enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_tags enable row level security;
alter table public.question_tag_map enable row level security;
alter table public.profiles enable row level security;
alter table public.question_attempts enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_test_questions enable row level security;
alter table public.mock_test_attempts enable row level security;
alter table public.mock_test_answers enable row level security;
alter table public.study_materials enable row level security;
alter table public.current_affairs enable row level security;
alter table public.issb_modules enable row level security;

DROP POLICY IF EXISTS branches_public_read ON public.military_branches;
CREATE POLICY branches_public_read ON public.military_branches FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS exams_public_read ON public.exams;
CREATE POLICY exams_public_read ON public.exams FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS subjects_public_read ON public.subjects;
CREATE POLICY subjects_public_read ON public.subjects FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS exam_subjects_public_read ON public.exam_subjects;
CREATE POLICY exam_subjects_public_read ON public.exam_subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS topics_public_read ON public.topics;
CREATE POLICY topics_public_read ON public.topics FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS mock_tests_public_read ON public.mock_tests;
CREATE POLICY mock_tests_public_read ON public.mock_tests FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS mock_test_questions_public_read ON public.mock_test_questions;
CREATE POLICY mock_test_questions_public_read ON public.mock_test_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS materials_public_read ON public.study_materials;
CREATE POLICY materials_public_read ON public.study_materials FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS affairs_public_read ON public.current_affairs;
CREATE POLICY affairs_public_read ON public.current_affairs FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS issb_public_read ON public.issb_modules;
CREATE POLICY issb_public_read ON public.issb_modules FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS attempts_self_read ON public.question_attempts;
CREATE POLICY attempts_self_read ON public.question_attempts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS attempts_self_insert ON public.question_attempts;
CREATE POLICY attempts_self_insert ON public.question_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS mock_attempts_self_read ON public.mock_test_attempts;
CREATE POLICY mock_attempts_self_read ON public.mock_test_attempts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS mock_attempts_self_insert ON public.mock_test_attempts;
CREATE POLICY mock_attempts_self_insert ON public.mock_test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS mock_answers_self_read ON public.mock_test_answers;
CREATE POLICY mock_answers_self_read ON public.mock_test_answers FOR SELECT USING (exists (select 1 from public.mock_test_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

insert into public.military_branches (name, slug, short_description, description, display_order)
values
  ('Pakistan Army', 'pak-army', 'Army entry-test preparation resources.', 'Independent educational preparation resources for Pakistan Army entry routes.', 1),
  ('Pakistan Air Force', 'paf', 'PAF aptitude and academic preparation resources.', 'Independent educational preparation resources for Pakistan Air Force entry routes.', 2),
  ('Pakistan Navy', 'pak-navy', 'Navy aptitude and academic preparation resources.', 'Independent educational preparation resources for Pakistan Navy entry routes.', 3),
  ('ISSB', 'issb', 'ISSB practice and preparation guidance.', 'Independent practice resources for psychological, interview, and group-evaluation preparation. FaujPrep does not guarantee selection.', 4)
on conflict (slug) do update set name = excluded.name, short_description = excluded.short_description, description = excluded.description, display_order = excluded.display_order, updated_at = now();

insert into public.subjects (name, slug, description, display_order)
values
  ('English', 'english', 'Vocabulary, grammar, comprehension, and sentence practice.', 1),
  ('Mathematics', 'mathematics', 'Quantitative and mathematical reasoning practice.', 2),
  ('General Knowledge', 'general-knowledge', 'General knowledge practice content.', 3),
  ('Pakistan Studies', 'pakistan-studies', 'Pakistan Studies practice content.', 4),
  ('Islamiyat', 'islamiyat', 'Islamiyat practice content.', 5),
  ('Current Affairs', 'current-affairs', 'Current-affairs preparation content sourced from published references.', 6),
  ('Everyday Science', 'everyday-science', 'Everyday science practice content.', 7),
  ('Verbal Intelligence', 'verbal-intelligence', 'Verbal reasoning and intelligence practice.', 8),
  ('Non-Verbal Intelligence', 'non-verbal-intelligence', 'Non-verbal reasoning and pattern practice.', 9),
  ('Analytical Reasoning', 'analytical-reasoning', 'Analytical reasoning practice.', 10),
  ('ISSB Intelligence', 'issb-intelligence', 'Preparation content for intelligence practice.', 11),
  ('ISSB Psychological Preparation', 'issb-psychological-preparation', 'Preparation guidance and practice structures.', 12),
  ('ISSB Interview', 'issb-interview', 'Interview preparation guidance.', 13),
  ('ISSB GTO', 'issb-gto', 'Group task preparation guidance.', 14),
  ('Personality Preparation', 'personality-preparation', 'Reflective preparation guidance without selection guarantees.', 15)
on conflict (slug) do update set name = excluded.name, description = excluded.description, display_order = excluded.display_order, updated_at = now();

insert into public.exams (branch_id, name, slug, short_description, exam_type, difficulty, duration_minutes, total_questions)
select b.id, x.name, x.slug, x.description, x.exam_type, x.difficulty, x.duration_minutes, x.total_questions
from (values
  ('pak-army', 'Army Initial Test', 'army-initial-test', 'Army initial-test preparation structure.', 'INITIAL_TEST', 'MEDIUM', 90, 50),
  ('paf', 'PAF Initial Test', 'paf-initial-test', 'PAF initial-test preparation structure.', 'INITIAL_TEST', 'MEDIUM', 100, 60),
  ('pak-navy', 'Navy Initial Test', 'navy-initial-test', 'Navy initial-test preparation structure.', 'INITIAL_TEST', 'MEDIUM', 90, 50),
  ('issb', 'ISSB Screening Preparation', 'issb-screening-preparation', 'ISSB screening preparation resources.', 'PREPARATION', 'MEDIUM', 60, 40),
  ('issb', 'ISSB Interview Preparation', 'issb-interview-preparation', 'ISSB interview preparation resources.', 'PREPARATION', 'MEDIUM', null, null),
  ('issb', 'ISSB GTO Preparation', 'issb-gto-preparation', 'ISSB GTO preparation resources.', 'PREPARATION', 'MEDIUM', null, null)
) as x(branch_slug, name, slug, description, exam_type, difficulty, duration_minutes, total_questions)
join public.military_branches b on b.slug = x.branch_slug
on conflict (slug) do update set name = excluded.name, description = excluded.description, updated_at = now();

insert into public.topics (subject_id, name, slug, description, difficulty, display_order)
select s.id, x.name, x.slug, x.description, x.difficulty, x.display_order
from (values
  ('english', 'Synonyms', 'synonyms', 'Meaning and vocabulary practice.', 'EASY', 1),
  ('english', 'Grammar', 'grammar', 'Grammar practice.', 'MEDIUM', 2),
  ('mathematics', 'Percentages', 'percentages', 'Percentage calculations.', 'EASY', 1),
  ('mathematics', 'Algebra', 'algebra', 'Algebra practice.', 'MEDIUM', 2),
  ('verbal-intelligence', 'Analogies', 'analogies', 'Verbal analogy practice.', 'MEDIUM', 1),
  ('verbal-intelligence', 'Number Series', 'number-series', 'Number series practice.', 'MEDIUM', 2),
  ('issb-psychological-preparation', 'Psychological Preparation', 'psychological-preparation', 'Preparation guidance, not official scoring criteria.', 'MEDIUM', 1),
  ('issb-interview', 'Interview Practice', 'interview-practice', 'Interview reflection and practice.', 'MEDIUM', 1),
  ('issb-gto', 'Group Planning', 'group-planning', 'Group planning preparation guidance.', 'MEDIUM', 1)
) as x(subject_slug, name, slug, description, difficulty, display_order)
join public.subjects s on s.slug = x.subject_slug
on conflict (subject_id, slug) do update set name = excluded.name, description = excluded.description, updated_at = now();

insert into public.issb_modules (title, slug, description, module_type, display_order, is_published)
values
  ('Intelligence Practice', 'intelligence-practice', 'Practice structures for verbal and non-verbal reasoning. This is not an official ISSB test.', 'PSYCHOLOGICAL', 1, true),
  ('Psychological Preparation', 'psychological-preparation', 'Reflective practice guidance for preparation purposes.', 'PSYCHOLOGICAL', 2, true),
  ('Interview Preparation', 'interview-preparation', 'Practice prompts for structured personal interviews.', 'INTERVIEW', 3, true),
  ('Group Discussion', 'group-discussion', 'Communication and discussion practice guidance.', 'GROUP_DISCUSSION', 4, true),
  ('GTO Preparation', 'gto-preparation', 'Overview and practice guidance for group tasks.', 'GTO', 5, true)
on conflict (slug) do update set title = excluded.title, description = excluded.description, is_published = excluded.is_published, updated_at = now();

insert into public.questions (subject_id, topic_id, question_text, question_type, difficulty, option_a, option_b, option_c, option_d, correct_option, explanation, source, is_verified)
select s.id, t.id, x.question_text, 'MCQ', x.difficulty, x.option_a, x.option_b, x.option_c, x.option_d, x.correct_option, x.explanation, 'FaujPrep educational starter content', false
from (values
  ('english', 'synonyms', 'Choose the closest meaning of "brief".', 'EASY', 'A. Short', 'B. Loud', 'C. Bright', 'D. Heavy', 'A', 'Brief means short.'),
  ('english', 'grammar', 'Choose the grammatically correct sentence.', 'EASY', 'A. She go to school.', 'B. She goes to school.', 'C. She going school.', 'D. She gone school.', 'B', 'The singular subject she takes goes.'),
  ('mathematics', 'percentages', 'What is 20 percent of 150?', 'EASY', 'A. 20', 'B. 25', 'C. 30', 'D. 35', 'C', '20 percent of 150 is 30.'),
  ('mathematics', 'algebra', 'If x + 7 = 12, what is x?', 'EASY', 'A. 3', 'B. 5', 'C. 7', 'D. 19', 'B', 'Subtracting 7 from both sides gives x = 5.'),
  ('general-knowledge', null, 'Which instrument is used to measure temperature?', 'EASY', 'A. Barometer', 'B. Thermometer', 'C. Hygrometer', 'D. Compass', 'B', 'A thermometer measures temperature.'),
  ('pakistan-studies', null, 'What is the capital city of Pakistan?', 'EASY', 'A. Lahore', 'B. Karachi', 'C. Islamabad', 'D. Peshawar', 'C', 'Islamabad is the capital city.'),
  ('islamiyat', null, 'How many obligatory daily prayers are there in Islam?', 'EASY', 'A. Three', 'B. Four', 'C. Five', 'D. Six', 'C', 'There are five obligatory daily prayers.'),
  ('verbal-intelligence', 'analogies', 'Book is to reading as fork is to:', 'MEDIUM', 'A. Writing', 'B. Eating', 'C. Drawing', 'D. Sleeping', 'B', 'A fork is used for eating.'),
  ('verbal-intelligence', 'number-series', 'What comes next: 2, 4, 6, 8, ?', 'EASY', 'A. 9', 'B. 10', 'C. 12', 'D. 14', 'B', 'The series increases by two.'),
  ('analytical-reasoning', null, 'If all pilots are trained and Ali is a pilot, Ali is:', 'MEDIUM', 'A. Trained', 'B. Untrained', 'C. Retired', 'D. Unknown', 'A', 'The conclusion follows directly from the stated premise.'),
  ('everyday-science', null, 'Which gas do plants generally absorb during photosynthesis?', 'EASY', 'A. Oxygen', 'B. Nitrogen', 'C. Carbon dioxide', 'D. Hydrogen', 'C', 'Plants generally absorb carbon dioxide during photosynthesis.'),
  ('current-affairs', null, 'Which source should be used to verify a current-affairs fact?', 'EASY', 'A. An unsourced post', 'B. A current official or reputable source', 'C. A random comment', 'D. An old rumour', 'B', 'Current facts should be checked against reliable current sources.')
) as x(subject_slug, topic_slug, question_text, difficulty, option_a, option_b, option_c, option_d, correct_option, explanation)
join public.subjects s on s.slug = x.subject_slug
left join public.topics t on t.subject_id = s.id and t.slug = x.topic_slug
on conflict (question_text) do update set explanation = excluded.explanation, updated_at = now();

insert into public.mock_tests (title, slug, description, branch_id, exam_id, duration_minutes, total_questions, difficulty, is_premium)
select x.title, x.slug, x.description, b.id, e.id, x.duration_minutes, x.total_questions, x.difficulty, x.is_premium
from (values
  ('Army Initial Practice Mock', 'army-initial-practice-mock', 'A database-backed starter mock test.', 'pak-army', 'army-initial-test', 30, 10, 'MEDIUM', false),
  ('ISSB Screening Practice Mock', 'issb-screening-practice-mock', 'A database-backed ISSB screening practice mock.', 'issb', 'issb-screening-preparation', 30, 10, 'MEDIUM', false)
) as x(title, slug, description, branch_slug, exam_slug, duration_minutes, total_questions, difficulty, is_premium)
join public.military_branches b on b.slug = x.branch_slug
join public.exams e on e.slug = x.exam_slug
on conflict (slug) do update set title = excluded.title, description = excluded.description, updated_at = now();

insert into public.study_materials (title, slug, description, material_type, is_premium, is_published)
values
  ('FaujPrep Preparation Orientation', 'faujprep-preparation-orientation', 'An independent orientation to structured preparation resources.', 'GUIDE', false, true),
  ('ISSB Preparation Principles', 'issb-preparation-principles', 'General preparation guidance. Not an official ISSB document and no selection guarantee is implied.', 'GUIDE', false, true)
on conflict (slug) do update set title = excluded.title, description = excluded.description, is_published = excluded.is_published, updated_at = now();
