import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { NON_VERBAL_INTELLIGENCE_TEST_2 } from '../src/data/nonVerbalIntelligenceTest2.js';

const questions = JSON.parse(await readFile(new URL('../src/data/nonVerbalIntelligenceTest2.json', import.meta.url), 'utf8'));
const migration = await readFile(new URL('../supabase/migrations/035_add_non_verbal_intelligence_test_2.sql', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('Non-Verbal Intelligence Test 2 is a 40-minute PKR 49 Practice Test', () => {
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_2.pricePkr, 49);
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_2.durationMinutes, 40);
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_2.questionsCount, 100);
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_2.practiceOnly, true);
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_2.timed, true);
});

test('all 100 five-option questions include answers, detailed explanations, and diagram assets', async () => {
  assert.equal(questions.length, 100);

  for (const [index, question] of questions.entries()) {
    assert.equal(question.id, index + 1);
    assert.match(question.correct_option, /^[A-E]$/);
    assert.ok(question.explanation.trim().length > 0);
    assert.ok(question.explanation.length > 40);
    assert.equal(question.option_e, 'Figure E');
    assert.ok(question.image_url.startsWith('/images/practice-tests/non-verbal-intelligence-test-2/'));
    await access(new URL(`../public${question.image_url}`, import.meta.url));
  }
});

test('the paid-test migration seeds the same explained question bank and purchase-access rules', () => {
  const encodedBank = migration.match(
    /values \('pma-long-course-159-non-verbal-intelligence-test-2', convert_from\(decode\('([^']+)'/,
  )?.[1];

  assert.ok(encodedBank, 'migration must seed this test slug');
  assert.deepEqual(JSON.parse(Buffer.from(encodedBank, 'base64').toString('utf8')), questions);
  assert.match(migration, /test_slug = 'pma-long-course-159-non-verbal-intelligence-test-2' and amount_pkr = 49/);
  assert.match(migration, /when 'pma-long-course-159-non-verbal-intelligence-test-2' then 49/);
  assert.match(migration, /when 'pma-long-course-159-non-verbal-intelligence-test-2' then 'Non-Verbal Intelligence Test 2 \(Most Repeated Questions\)'/);
  assert.match(migration, /purchase\.status = 'APPROVED'/);
  assert.match(migration, /purchase\.user_id = v_user_id/);
});

test('both paid non-verbal tests use the Practice Tests card grid and approval-gated actions', () => {
  assert.match(appSource, /import \{ NON_VERBAL_INTELLIGENCE_TEST_1 \} from '\.\/data\/nonVerbalIntelligenceTest1'/);
  assert.match(appSource, /import \{ NON_VERBAL_INTELLIGENCE_TEST_2 \} from '\.\/data\/nonVerbalIntelligenceTest2'/);
  assert.match(appSource, /NON_VERBAL_INTELLIGENCE_TEST_1,\s+NON_VERBAL_INTELLIGENCE_TEST_2,/);
  assert.match(appSource, /\.\.\.PAID_MOCK_TEST_PRODUCTS\.filter\(\(product\) => product\.practiceOnly\)\.map/);
  assert.match(appSource, /hasPaidTestAccess\s*\?\s*startPaidMockTest\(item\.paidProduct\)/);
  assert.match(appSource, /Payment Pending Admin Approval/);
});
