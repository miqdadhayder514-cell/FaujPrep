import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/017_pma_intelligence_question_metadata.sql', import.meta.url), 'utf8');
const audit = readFileSync(new URL('../supabase/validation/pma_intelligence_audit.sql', import.meta.url), 'utf8');

test('question metadata supports priorities, honest sources, stable seed keys, and visual data', () => {
  assert.match(migration, /add column if not exists content_key text/i);
  assert.match(migration, /add column if not exists priority text/i);
  assert.match(migration, /add column if not exists source_type text/i);
  assert.match(migration, /add column if not exists source_reference text/i);
  assert.match(migration, /add column if not exists visual_data jsonb/i);
  assert.match(migration, /'PAST_PAPER_REPORTED'.*'PAST_PAPER_PATTERN'.*'CANDIDATE_RECALLED'.*'PREPARATION_PATTERN'.*'ORIGINAL_VARIATION'/is);
  assert.match(migration, /unique index if not exists questions_content_key_unique_idx/i);
  assert.match(migration, /add column if not exists category text/i);
  assert.match(migration, /pma-long-course-initial-test/i);
  assert.match(migration, /add constraint analytics_events_event_name_check/i);
  assert.match(migration, /'PMA_PAPER_VIEW'.*'PMA_PAPER_STARTED'.*'PMA_PAPER_COMPLETED'/is);
});

test('public question views never expose answers or explanations before submission', () => {
  const publicQuestionView = migration.split('create view public.public_questions')[1].split('grant select on public.public_questions')[0];
  const publicMockView = migration.split('create view public.public_mock_test_questions')[1].split('grant select on public.public_mock_test_questions')[0];
  for (const view of [publicQuestionView, publicMockView]) {
    assert.doesNotMatch(view, /correct_option|explanation/i);
  }
  assert.match(publicQuestionView, /visual_data/i);
  assert.match(publicMockView, /visual_data/i);
});

test('database audit checks eight paper slugs, 50-question order, answer metadata, and normalized duplicates', () => {
  const expectedPapers = audit.split('with expected_papers(slug, paper_title, paper_category) as (')[1].split(')\nselect')[0];
  assert.equal((expectedPapers.match(/\('pma-/g) || []).length, 8);
  assert.match(audit, /count\(\*\) <> 50/i);
  assert.match(audit, /min\(link\.question_number\) <> 1/i);
  assert.match(audit, /max\(link\.question_number\) <> 50/i);
  assert.match(audit, /missing_explanations/i);
  assert.match(audit, /missing_priorities/i);
  assert.match(audit, /missing_source_metadata/i);
  assert.match(audit, /normalized_question_text/i);
  assert.match(audit, /invalid_visual_data/i);
});