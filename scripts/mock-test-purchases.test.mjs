import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ACADEMIC_PORTION_MOCK_TEST_2 } from '../src/data/academicPortionMockTest2.js';
import { PMA_LONG_COURSE_159_MOCK_TEST_2 } from '../src/data/pmaLongCourse159MockTest2.js';

const migration = readFileSync(fileURLToPath(new URL('../supabase/migrations/025_mock_test_purchases.sql', import.meta.url)), 'utf8');
const perUserAccessMigration = readFileSync(fileURLToPath(new URL('../supabase/migrations/027_enforce_per_user_paid_mock_test_access.sql', import.meta.url)), 'utf8');
const bankMigration = readFileSync(fileURLToPath(new URL('../supabase/migrations/026_seed_paid_mock_test_question_banks.sql', import.meta.url)), 'utf8');
const academicModule = readFileSync(fileURLToPath(new URL('../src/data/academicPortionMockTest2.js', import.meta.url)), 'utf8');
const pmaModule = readFileSync(fileURLToPath(new URL('../src/data/pmaLongCourse159MockTest2.js', import.meta.url)), 'utf8');

const getSeededBank = (slug) => {
  const prefix = `('${slug}', convert_from(decode('`;
  const start = bankMigration.indexOf(prefix);
  assert.notEqual(start, -1, `Missing seeded question bank ${slug}`);
  const jsonStart = start + prefix.length;
  const end = bankMigration.indexOf("', 'base64'), 'UTF8')::jsonb)", jsonStart);
  assert.notEqual(end, -1, `Missing JSON terminator for ${slug}`);
  return JSON.parse(Buffer.from(bankMigration.slice(jsonStart, end), 'base64').toString('utf8'));
};

test('mock-test payments use fixed product prices and pending approval', () => {
  assert.equal(PMA_LONG_COURSE_159_MOCK_TEST_2.title, 'PMA Long Course 159 Mock Test 2');
  assert.equal(PMA_LONG_COURSE_159_MOCK_TEST_2.pricePkr, 49);
  assert.equal(ACADEMIC_PORTION_MOCK_TEST_2.title, 'Academic Portion Mock Test 2');
  assert.equal(ACADEMIC_PORTION_MOCK_TEST_2.pricePkr, 20);
  assert.match(migration, /pma-long-course-159-mock-test-2' then 49/);
  assert.match(migration, /academic-portion-mock-test-2' then 20/);
  assert.match(migration, /'PENDING'/);
  assert.match(migration, /payment_screenshot_url text not null/);
});

test('approved mock-test purchases grant permanent access without plan upgrades', () => {
  const accessFunction = migration.slice(migration.indexOf('create or replace function public.get_paid_mock_test_questions'));
  assert.match(accessFunction, /purchase\.user_id = v_user_id/);
  assert.match(accessFunction, /purchase\.test_slug = p_test_slug/);
  assert.match(accessFunction, /purchase\.status = 'APPROVED'/);
  assert.doesNotMatch(accessFunction, /is_editor_or_admin|from public\.subscriptions/i);
  assert.match(perUserAccessMigration, /purchase\.user_id = v_user_id/);
  assert.match(perUserAccessMigration, /purchase\.status = 'APPROVED'/);
  assert.doesNotMatch(perUserAccessMigration, /is_editor_or_admin|from public\.subscriptions/i);
  assert.match(migration, /function public\.admin_approve_mock_test_purchase/);
  assert.doesNotMatch(migration.slice(migration.indexOf('function public.admin_approve_mock_test_purchase'), migration.indexOf('function public.admin_reject_mock_test_purchase')), /insert into public\.subscriptions/i);
  assert.match(migration, /on public\.mock_test_purchase_requests \(user_id, test_slug\)\s+where status in \('PENDING', 'APPROVED'\)/);
  assert.doesNotMatch(migration, /mock_test_global_access|global_unlocked/i);
  assert.doesNotMatch(perUserAccessMigration, /mock_test_global_access|global_unlocked/i);
  assert.match(migration, /alter table public\.paid_mock_test_question_banks enable row level security/i);
  assert.match(migration, /revoke all on table public\.paid_mock_test_question_banks from anon, authenticated/i);
  assert.doesNotMatch(academicModule, /academicPortionMockTest2\.json/);
  assert.doesNotMatch(pmaModule, /pmaLongCourse159MockTest2\.json/);
});

test('protected database seed contains both complete paid question banks', () => {
  const pmaQuestions = getSeededBank('pma-long-course-159-mock-test-2');
  const academicQuestions = getSeededBank('academic-portion-mock-test-2');
  assert.equal(pmaQuestions.length, 220);
  assert.equal(academicQuestions.length, 100);
  assert.equal(pmaQuestions[60].image_url, '/images/mock-tests/pma-lc159-mock-test-2/q061.png');
  assert.equal(pmaQuestions[66].option_e, 'Figure E');
  assert.ok(pmaQuestions.every((question) => question.correct_option && question.explanation));
  assert.ok(academicQuestions.every((question) => question.correct_option && question.explanation));
});