with expected_papers(slug, paper_title, paper_category) as (
  values
    ('pma-verbal-intelligence-test-1', 'PMA Long Course Initial Test — Verbal Intelligence Test 1', 'Verbal Intelligence'),
    ('pma-verbal-intelligence-test-2', 'PMA Long Course Initial Test — Verbal Intelligence Test 2', 'Verbal Intelligence'),
    ('pma-verbal-intelligence-test-3', 'PMA Long Course Initial Test — Verbal Intelligence Test 3', 'Verbal Intelligence'),
    ('pma-non-verbal-intelligence-test-1', 'PMA Long Course Initial Test — Non-Verbal Intelligence Test 1', 'Non-Verbal Intelligence'),
    ('pma-non-verbal-intelligence-test-2', 'PMA Long Course Initial Test — Non-Verbal Intelligence Test 2', 'Non-Verbal Intelligence'),
    ('pma-non-verbal-intelligence-test-3', 'PMA Long Course Initial Test — Non-Verbal Intelligence Test 3', 'Non-Verbal Intelligence'),
    ('pma-analogy-test', 'PMA Long Course Initial Test — Analogy Test', 'Analogy'),
    ('pma-mathematical-series-test', 'PMA Long Course Initial Test — Mathematical Series Test', 'Mathematical Series')
)
select expected.slug,
       expected.paper_category,
       mock.id as mock_test_id,
      mock.title as actual_title,
      (mock.title = expected.paper_title) as title_matches,
       mock.total_questions as declared_question_count,
       count(link.question_id) as linked_question_count,
       count(question.id) as existing_question_count,
       min(link.question_number) as first_question_number,
       max(link.question_number) as last_question_number,
       count(distinct link.question_number) as unique_question_numbers
from expected_papers expected
left join public.mock_tests mock on mock.slug = expected.slug
left join public.mock_test_questions link on link.mock_test_id = mock.id
left join public.questions question on question.id = link.question_id
group by expected.slug, expected.paper_title, expected.paper_category, mock.id, mock.title, mock.total_questions
order by expected.slug;

with pma_questions as (
  select question.id,
         question.question_text,
         question.option_a,
         question.option_b,
         question.option_c,
         question.option_d,
         question.correct_option,
         question.explanation,
         question.priority,
         question.source_type,
         question.source_reference,
         question.category,
         question.difficulty,
         question.visual_data,
         link.question_number,
         mock.slug as paper_slug
  from public.mock_tests mock
  join public.mock_test_questions link on link.mock_test_id = mock.id
  join public.questions question on question.id = link.question_id
  where mock.slug in (
    'pma-verbal-intelligence-test-1', 'pma-verbal-intelligence-test-2',
    'pma-verbal-intelligence-test-3', 'pma-non-verbal-intelligence-test-1',
    'pma-non-verbal-intelligence-test-2', 'pma-non-verbal-intelligence-test-3',
    'pma-analogy-test', 'pma-mathematical-series-test'
  )
)
select count(*) as total_questions,
       count(*) filter (where correct_option not in ('A', 'B', 'C', 'D') or correct_option is null) as invalid_answers,
       count(*) filter (where nullif(trim(option_a), '') is null
                          or nullif(trim(option_b), '') is null
                          or nullif(trim(option_c), '') is null
                          or nullif(trim(option_d), '') is null) as missing_options,
       count(*) filter (where lower(trim(option_a)) = lower(trim(option_b))
                          or lower(trim(option_a)) = lower(trim(option_c))
                          or lower(trim(option_a)) = lower(trim(option_d))
                          or lower(trim(option_b)) = lower(trim(option_c))
                          or lower(trim(option_b)) = lower(trim(option_d))
                          or lower(trim(option_c)) = lower(trim(option_d))) as duplicate_options,
       count(*) filter (where nullif(trim(explanation), '') is null) as missing_explanations,
       count(*) filter (where priority not in ('HIGH', 'MEDIUM', 'LOW') or priority is null) as missing_priorities,
       count(*) filter (where source_type not in (
         'PAST_PAPER_REPORTED', 'PAST_PAPER_PATTERN', 'CANDIDATE_RECALLED',
         'PREPARATION_PATTERN', 'ORIGINAL_VARIATION'
       ) or source_type is null or nullif(trim(source_reference), '') is null) as missing_source_metadata,
       count(*) filter (where difficulty not in ('EASY', 'MEDIUM', 'HARD') or difficulty is null) as invalid_difficulties,
       count(*) filter (where paper_slug like 'pma-non-verbal-%'
                          and (jsonb_typeof(visual_data) <> 'object'
                            or jsonb_typeof(visual_data->'prompt') <> 'array'
                            or jsonb_typeof(visual_data->'options') <> 'array'
                            or case when jsonb_typeof(visual_data->'options') = 'array'
                              then jsonb_array_length(visual_data->'options') <> 4
                              else true end)) as invalid_visual_data
from pma_questions;

with pma_questions as (
  select question.id,
         regexp_replace(
           regexp_replace(lower(trim(question.question_text)), '[[:punct:]]+', ' ', 'g'),
           '[[:space:]]+', ' ', 'g'
         ) as normalized_question_text
  from public.mock_tests mock
  join public.mock_test_questions link on link.mock_test_id = mock.id
  join public.questions question on question.id = link.question_id
  where mock.slug like 'pma-%'
)
select normalized_question_text, count(*) as duplicate_count, array_agg(id) as question_ids
from pma_questions
group by normalized_question_text
having count(*) > 1
order by duplicate_count desc, normalized_question_text;

select mock.slug,
       count(*) as linked_questions,
       count(distinct link.question_number) as distinct_positions,
       min(link.question_number) as first_position,
       max(link.question_number) as last_position,
       count(distinct link.question_id) as distinct_questions
from public.mock_tests mock
join public.mock_test_questions link on link.mock_test_id = mock.id
where mock.slug like 'pma-%'
group by mock.slug
having count(*) <> 50
    or count(distinct link.question_number) <> 50
    or min(link.question_number) <> 1
    or max(link.question_number) <> 50
    or count(distinct link.question_id) <> 50
order by mock.slug;