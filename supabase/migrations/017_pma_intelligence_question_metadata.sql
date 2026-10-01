alter table public.questions
  add column if not exists content_key text,
  add column if not exists category text,
  add column if not exists priority text,
  add column if not exists source_type text,
  add column if not exists source_reference text,
  add column if not exists visual_data jsonb;

alter table public.questions
  drop constraint if exists questions_question_type_check,
  drop constraint if exists questions_priority_check,
  drop constraint if exists questions_source_type_check,
  drop constraint if exists questions_content_key_nonempty_check,
  drop constraint if exists questions_visual_data_object_check;

alter table public.questions
  add constraint questions_question_type_check
  check (question_type in ('MCQ', 'TRUE_FALSE', 'NUMERIC', 'TEXT', 'DESCRIPTIVE', 'NON_VERBAL')),
  add constraint questions_priority_check
  check (priority is null or priority in ('HIGH', 'MEDIUM', 'LOW')),
  add constraint questions_source_type_check
  check (source_type is null or source_type in (
    'PAST_PAPER_REPORTED', 'PAST_PAPER_PATTERN', 'CANDIDATE_RECALLED',
    'PREPARATION_PATTERN', 'ORIGINAL_VARIATION'
  )),
  add constraint questions_content_key_nonempty_check
  check (content_key is null or length(trim(content_key)) > 0),
  add constraint questions_visual_data_object_check
  check (visual_data is null or jsonb_typeof(visual_data) = 'object');

create unique index if not exists questions_content_key_unique_idx
  on public.questions (content_key)
  where content_key is not null;

create index if not exists questions_priority_category_idx
  on public.questions (priority, category)
  where is_active = true;

alter table public.mock_tests
  add column if not exists category text;

alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check
  check (event_name in (
    'PAGE_VIEW', 'SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'LOGIN_COMPLETED',
    'BRANCH_VIEWED', 'EXAM_VIEWED', 'SUBJECT_VIEWED', 'TOPIC_VIEWED',
    'QUESTION_PRACTICE_STARTED', 'QUESTION_PRACTICE_COMPLETED',
    'MOCK_TEST_VIEWED', 'MOCK_TEST_STARTED', 'MOCK_TEST_COMPLETED',
    'PMA_PAPER_VIEW', 'PMA_PAPER_STARTED', 'PMA_PAPER_COMPLETED',
    'STUDY_MATERIAL_VIEWED', 'CURRENT_AFFAIRS_VIEWED', 'ISSB_MODULE_VIEWED',
    'SEARCH_PERFORMED', 'PRICING_VIEWED', 'CHECKOUT_STARTED',
    'PAYMENT_SUBMITTED', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'PLAN_UPGRADED'
  ));

create or replace function public.track_analytics_event(
  p_event_name text,
  p_session_id uuid default null,
  p_page_path text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_properties jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_path text;
declare v_key text;
declare v_value jsonb;
declare v_session_count integer;
declare v_user_count integer;
begin
  if p_event_name not in (
    'PAGE_VIEW', 'SIGNUP_STARTED', 'SIGNUP_COMPLETED', 'LOGIN_COMPLETED',
    'BRANCH_VIEWED', 'EXAM_VIEWED', 'SUBJECT_VIEWED', 'TOPIC_VIEWED',
    'QUESTION_PRACTICE_STARTED', 'QUESTION_PRACTICE_COMPLETED',
    'MOCK_TEST_VIEWED', 'MOCK_TEST_STARTED', 'MOCK_TEST_COMPLETED',
    'PMA_PAPER_VIEW', 'PMA_PAPER_STARTED', 'PMA_PAPER_COMPLETED',
    'STUDY_MATERIAL_VIEWED', 'CURRENT_AFFAIRS_VIEWED', 'ISSB_MODULE_VIEWED',
    'SEARCH_PERFORMED', 'PRICING_VIEWED', 'CHECKOUT_STARTED'
  ) then
    raise exception 'Unsupported client analytics event';
  end if;

  if auth.uid() is null and p_session_id is null then
    raise exception 'Anonymous analytics requires a session identifier';
  end if;

  if jsonb_typeof(coalesce(p_properties, '{}'::jsonb)) <> 'object'
    or octet_length(coalesce(p_properties, '{}'::jsonb)::text) > 2048 then
    raise exception 'Invalid analytics properties';
  end if;

  for v_key, v_value in select key, value from jsonb_each(coalesce(p_properties, '{}'::jsonb)) loop
    if v_key not in (
      'branch', 'subject', 'topic', 'difficulty', 'question_count',
      'result_count', 'content_type_filter', 'branch_filter', 'subject_filter',
      'duration_minutes', 'plan_slug', 'paper_category', 'completion_status'
    ) then
      raise exception 'Unsupported analytics property';
    end if;
    if jsonb_typeof(v_value) not in ('string', 'number', 'boolean')
      or length(v_value::text) > 110 then
      raise exception 'Invalid analytics property value';
    end if;
    if v_key in ('question_count', 'result_count', 'duration_minutes')
      and (jsonb_typeof(v_value) <> 'number' or (v_value #>> '{}')::numeric < 0 or (v_value #>> '{}')::numeric > 1000) then
      raise exception 'Invalid analytics numeric property';
    end if;
    if v_key = 'plan_slug' and (v_value #>> '{}') not in ('free', 'pro', 'premium') then
      raise exception 'Invalid plan property';
    end if;
  end loop;

  if p_entity_type is not null and p_entity_type not in (
    'branch', 'exam', 'subject', 'topic', 'mock_test', 'study_material', 'current_affair', 'issb_module'
  ) then
    raise exception 'Unsupported analytics entity';
  end if;

  v_path := split_part(coalesce(p_page_path, ''), '?', 1);
  if v_path = '' or v_path !~ '^/[a-zA-Z0-9/_-]{0,199}$' then
    v_path := null;
  end if;

  if p_session_id is not null then
    select count(*) into v_session_count
    from public.analytics_events
    where session_id = p_session_id and created_at > now() - interval '1 hour';
    if v_session_count >= 120 then
      return false;
    end if;
  end if;

  if auth.uid() is not null then
    select count(*) into v_user_count
    from public.analytics_events
    where user_id = auth.uid() and created_at > now() - interval '1 hour';
    if v_user_count >= 300 then
      return false;
    end if;
  end if;

  insert into public.analytics_events (user_id, session_id, event_name, page_path, entity_type, entity_id, properties)
  values (auth.uid(), p_session_id, p_event_name, v_path, p_entity_type, p_entity_id, coalesce(p_properties, '{}'::jsonb));
  return true;
end;
$$;

revoke all on function public.track_analytics_event(text, uuid, text, text, uuid, jsonb) from public;
grant execute on function public.track_analytics_event(text, uuid, text, text, uuid, jsonb) to anon, authenticated;

create index if not exists mock_tests_category_exam_active_idx
  on public.mock_tests (category, exam_id)
  where is_active = true;

insert into public.exams (branch_id, name, slug, short_description, exam_type, difficulty, duration_minutes, total_questions)
select branch.id, 'PMA Long Course Initial Test', 'pma-long-course-initial-test',
       'Independent preparation for PMA Long Course initial-test reasoning patterns.',
       'INITIAL_TEST', 'MEDIUM', 60, 50
from public.military_branches branch
where branch.slug = 'pak-army'
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  updated_at = now();

insert into public.exam_subjects (exam_id, subject_id)
select exam.id, subject.id
from public.exams exam
join public.subjects subject on subject.slug in (
  'verbal-intelligence', 'non-verbal-intelligence', 'analytical-reasoning', 'mathematics'
)
where exam.slug = 'pma-long-course-initial-test'
on conflict (exam_id, subject_id) do nothing;

insert into public.topics (subject_id, name, slug, description, difficulty, display_order)
select subject.id, topic.name, topic.slug, topic.description, 'MEDIUM', topic.display_order
from (values
  ('verbal-intelligence', 'Word Relationship', 'pma-word-relationship', 'Verbal relationship reasoning.', 1),
  ('verbal-intelligence', 'Letter Series', 'pma-letter-series', 'Alphabetic and positional sequences.', 2),
  ('verbal-intelligence', 'Number Series', 'pma-verbal-number-series', 'Numerical patterns used in verbal reasoning practice.', 3),
  ('verbal-intelligence', 'Coding Decoding', 'pma-coding-decoding', 'Letter and symbol coding rules.', 4),
  ('verbal-intelligence', 'Classification', 'pma-classification', 'Word and concept classification.', 5),
  ('verbal-intelligence', 'Odd One Out', 'pma-odd-one-out', 'Identify the item that does not share the rule.', 6),
  ('verbal-intelligence', 'Word Formation', 'pma-word-formation', 'Form words from constrained letter sets.', 7),
  ('verbal-intelligence', 'Jumbled Words', 'pma-jumbled-words', 'Reorder letters or words into a valid sequence.', 8),
  ('verbal-intelligence', 'Direction Sense', 'pma-direction-sense', 'Track movement and orientation.', 9),
  ('verbal-intelligence', 'Blood Relations', 'pma-blood-relations', 'Resolve family relationships from statements.', 10),
  ('verbal-intelligence', 'Logical Reasoning', 'pma-logical-reasoning', 'Draw only warranted conclusions.', 11),
  ('non-verbal-intelligence', 'Figure Series', 'pma-figure-series', 'Continue a sequence of structured figures.', 1),
  ('non-verbal-intelligence', 'Pattern Completion', 'pma-pattern-completion', 'Complete a deterministic visual pattern.', 2),
  ('non-verbal-intelligence', 'Matrix Reasoning', 'pma-matrix-reasoning', 'Infer row and column transformations.', 3),
  ('non-verbal-intelligence', 'Figure Analogy', 'pma-figure-analogy', 'Apply a visual transformation to a new figure.', 4),
  ('non-verbal-intelligence', 'Odd Figure', 'pma-odd-figure', 'Identify a figure that breaks the shared rule.', 5),
  ('non-verbal-intelligence', 'Rotation', 'pma-rotation', 'Track orientation through rotation.', 6),
  ('non-verbal-intelligence', 'Mirror Reflection', 'pma-mirror-reflection', 'Reason about horizontal or vertical reflection.', 7),
  ('non-verbal-intelligence', 'Spatial Reasoning', 'pma-spatial-reasoning', 'Reason about positions and spatial transformations.', 8),
  ('non-verbal-intelligence', 'Counting Shapes', 'pma-counting-shapes', 'Count composite shapes without double-counting.', 9),
  ('analytical-reasoning', 'Word Analogy', 'pma-word-analogy', 'Infer the relationship between word pairs.', 1),
  ('analytical-reasoning', 'Number Analogy', 'pma-number-analogy', 'Infer a consistent numeric relationship.', 2),
  ('analytical-reasoning', 'Letter Analogy', 'pma-letter-analogy', 'Infer a consistent alphabetic transformation.', 3),
  ('analytical-reasoning', 'Functional Analogy', 'pma-functional-analogy', 'Match objects by their function or use.', 4),
  ('analytical-reasoning', 'Part to Whole', 'pma-part-to-whole', 'Relate a part to the structure containing it.', 5),
  ('analytical-reasoning', 'Object to Function', 'pma-object-to-function', 'Match an object to its characteristic purpose.', 6),
  ('mathematics', 'Arithmetic Series', 'pma-arithmetic-series', 'Find constant-step numerical sequences.', 1),
  ('mathematics', 'Difference Series', 'pma-difference-series', 'Use changing first differences.', 2),
  ('mathematics', 'Second Difference', 'pma-second-difference', 'Use a constant second difference.', 3),
  ('mathematics', 'Multiplication Series', 'pma-multiplication-series', 'Identify multiplicative sequences.', 4),
  ('mathematics', 'Alternating Series', 'pma-alternating-series', 'Resolve interleaved or alternating operations.', 5),
  ('mathematics', 'Square and Cube Pattern', 'pma-square-cube-pattern', 'Recognize powers and related offsets.', 6),
  ('mathematics', 'Prime Number Pattern', 'pma-prime-pattern', 'Recognize prime-number sequences.', 7),
  ('mathematics', 'Mixed Operation Series', 'pma-mixed-operation-series', 'Combine arithmetic operations in a sequence.', 8)
) as topic(subject_slug, name, slug, description, display_order)
join public.subjects subject on subject.slug = topic.subject_slug
on conflict (subject_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order,
  updated_at = now();

drop view if exists public.public_mock_test_questions;
drop view if exists public.public_questions;

create view public.public_questions
with (security_barrier = true)
as
select id, subject_id, topic_id, question_text, question_type, difficulty,
       option_a, option_b, option_c, option_d, image_url, category, priority,
       visual_data
from public.questions
where is_active = true;

grant select on public.public_questions to anon, authenticated;

create view public.public_mock_test_questions
with (security_barrier = true)
as
select mtq.mock_test_id, mtq.question_id, mtq.question_number,
       pq.subject_id, pq.topic_id, pq.question_text, pq.question_type,
       pq.difficulty, pq.option_a, pq.option_b, pq.option_c, pq.option_d,
       pq.image_url, pq.category, pq.priority, pq.visual_data
from public.mock_test_questions mtq
join public.public_questions pq on pq.id = mtq.question_id;

grant select on public.public_mock_test_questions to anon, authenticated;