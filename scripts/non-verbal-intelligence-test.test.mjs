import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { NON_VERBAL_INTELLIGENCE_TEST_1 } from '../src/data/nonVerbalIntelligenceTest1.js';

const questions = JSON.parse(await readFile(new URL('../src/data/nonVerbalIntelligenceTest1.json', import.meta.url), 'utf8'));
const migration = await readFile(new URL('../supabase/migrations/034_add_non_verbal_intelligence_test_1.sql', import.meta.url), 'utf8');

test('Non-Verbal Intelligence Test 1 is a 40-minute PKR 49 Practice Test', () => {
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_1.pricePkr, 49);
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_1.durationMinutes, 40);
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_1.questionsCount, 100);
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_1.practiceOnly, true);
  assert.equal(NON_VERBAL_INTELLIGENCE_TEST_1.timed, true);
});

test('all 100 questions include answers, detailed explanations, and existing diagram assets', async () => {
  assert.equal(questions.length, 100);

  for (const [index, question] of questions.entries()) {
    assert.equal(question.id, index + 1);
    assert.match(question.correct_option, /^[A-D]$/);
    assert.ok(question.explanation.trim().length > 0);
    assert.ok(question.image_url.startsWith('/images/practice-tests/non-verbal-intelligence-test-1/'));
    await access(new URL(`../public${question.image_url}`, import.meta.url));
  }
});

test('the paid-test migration seeds the same explained question bank and access rules', () => {
  const encodedBank = migration.match(
    /values \('pma-long-course-159-non-verbal-intelligence-test-1', convert_from\(decode\('([^']+)'/,
  )?.[1];

  assert.ok(encodedBank, 'migration must seed this test slug');
  assert.deepEqual(JSON.parse(Buffer.from(encodedBank, 'base64').toString('utf8')), questions);
  assert.match(migration, /test_slug = 'pma-long-course-159-non-verbal-intelligence-test-1' and amount_pkr = 49/);
  assert.match(migration, /when 'pma-long-course-159-non-verbal-intelligence-test-1' then 49/);
});
