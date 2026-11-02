import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PMA_LONG_COURSE_159_MOCK_TEST_7 } from '../src/data/pmaLongCourse159MockTest7.js';
import { PMA_LONG_COURSE_159_MOCK_TEST_8 } from '../src/data/pmaLongCourse159MockTest8.js';
import { PMA_LONG_COURSE_159_MOCK_TEST_9 } from '../src/data/pmaLongCourse159MockTest9.js';
import { PMA_LONG_COURSE_159_MOCK_TEST_10 } from '../src/data/pmaLongCourse159MockTest10.js';

const products = [
  PMA_LONG_COURSE_159_MOCK_TEST_7,
  PMA_LONG_COURSE_159_MOCK_TEST_8,
  PMA_LONG_COURSE_159_MOCK_TEST_9,
  PMA_LONG_COURSE_159_MOCK_TEST_10,
];
const expectedSectionCounts = {
  'Verbal Intelligence': 60,
  'Non-Verbal Intelligence': 60,
  Physics: 30,
  English: 30,
  'General Knowledge': 20,
};

for (const product of products) {
  const testNumber = product.title.match(/(\d+)$/)[1];
  const dataFile = `pmaLongCourse159MockTest${testNumber}.json`;
  const imageDirectory = `pma-lc159-mock-test-${testNumber}`;

  test(`PMA Long Course 159 Mock Test ${testNumber} includes 200 answered questions and figures`, async () => {
    const questions = JSON.parse(await readFile(new URL(`../src/data/${dataFile}`, import.meta.url), 'utf8'));
    assert.equal(questions.length, 200);
    assert.deepEqual(questions.map((question) => question.id), Array.from({ length: 200 }, (_, index) => index + 1));
    assert.deepEqual(
      questions.reduce((counts, question) => ({ ...counts, [question.section]: (counts[question.section] || 0) + 1 }), {}),
      expectedSectionCounts
    );
    assert.ok(questions.every((question) => question.question_text && question.correct_option && question.explanation.trim()));
    assert.ok(questions.every((question) => ['A', 'B', 'C', 'D', 'E'].includes(question.correct_option)));
    assert.ok(questions.every((question) => question.correct_option !== 'E' || question.option_e));
    const visualQuestions = questions.filter((question) => question.image_url);
    assert.equal(visualQuestions.length, 60);
    await Promise.all(visualQuestions.map((question) => {
      const filename = question.image_url.split('/').at(-1);
      return access(fileURLToPath(new URL(`../public/images/full-mock-tests/${imageDirectory}/${filename}`, import.meta.url)));
    }));
    assert.equal(product.questionsCount, 200);
    assert.equal(product.durationMinutes, 120);
    assert.equal(product.pricePkr, 100);
    assert.equal(product.timed, true);
  });
}

test('Tests 7-10 have matching purchase and question-access migration entries', async () => {
  const migration = await readFile(new URL('../supabase/migrations/056_paid_pma_lc159_full_mock_tests_7_10.sql', import.meta.url), 'utf8');
  for (const product of products) {
    assert.match(migration, new RegExp(`'${product.id}'`));
    assert.match(migration, new RegExp(`when '${product.id}' then 100`));
  }
  assert.match(migration, /create or replace function public\.get_paid_mock_test_questions/);
  assert.match(migration, /create or replace function public\.submit_mock_test_payment_proof/);
});
