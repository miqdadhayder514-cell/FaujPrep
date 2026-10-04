import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const questions = JSON.parse(await readFile(new URL('../src/data/academicPortionMockTest2.json', import.meta.url), 'utf8'));

test('Academic Portion Mock Test 2 includes all source questions with clear headings and detailed answers', () => {
  assert.equal(questions.length, 100);
  assert.deepEqual(questions.map((question) => question.id), Array.from({ length: 100 }, (_, index) => index + 1));
  assert.deepEqual(
    questions.reduce((counts, question) => ({ ...counts, [question.section]: (counts[question.section] || 0) + 1 }), {}),
    { English: 40, Mathematics: 20, Islamiyat: 20, 'Pakistan Studies': 10, Physics: 10 }
  );
  assert.ok(questions.every((question) => question.question_text && question.option_a && question.option_b && question.option_c && question.option_d));
  assert.ok(questions.every((question) => question.correct_option && question.explanation));
  assert.match(questions[0].question_text, /^Synonym: Choose the word closest in meaning/);
  assert.match(questions[40].question_text, /^Algebra: The sum of the roots/);
  assert.match(questions[99].question_text, /^Nuclear: Which of the following radiations/);
});