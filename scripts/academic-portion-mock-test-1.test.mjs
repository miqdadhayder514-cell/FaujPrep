import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseAcademicMockTest } from '../src/data/parseAcademicMockTest.js';

const source = await readFile(new URL('../../Full mock tests/PMA_LC159_Academic_MCQs_Set2.md', import.meta.url), 'utf8');
const questions = parseAcademicMockTest(source);

test('Academic Portion Mock Test 1 parses every source question and answer', () => {
  assert.equal(questions.length, 100);
  assert.deepEqual(questions.map((question) => question.id), Array.from({ length: 100 }, (_, index) => index + 1));
  assert.deepEqual(
    questions.reduce((counts, question) => ({ ...counts, [question.section]: (counts[question.section] || 0) + 1 }), {}),
    { English: 40, Mathematics: 20, Islamiyat: 20, 'Pakistan Studies': 10, Physics: 10 }
  );
  assert.ok(questions.every((question) => question.question_text && question.option_a && question.option_b && question.option_c && question.option_d));
  assert.ok(questions.every((question) => question.correct_option && question.explanation));
  assert.equal(questions[0].question_text, 'ABUNDANT');
  assert.equal(questions[0].correct_option, 'C');
  assert.equal(questions[99].question_text, "According to Ohm's law");
});
