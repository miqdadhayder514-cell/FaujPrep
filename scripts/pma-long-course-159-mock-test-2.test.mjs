import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const questions = JSON.parse(await readFile(new URL('../src/data/pmaLongCourse159MockTest2.json', import.meta.url), 'utf8'));

test('PMA Long Course159 Mock Test 2 includes all 220 questions, detailed answers, and visual figures', async () => {
  assert.equal(questions.length, 220);
  assert.deepEqual(questions.map((question) => question.id), Array.from({ length: 220 }, (_, index) => index + 1));
  assert.deepEqual(
    questions.reduce((counts, question) => ({ ...counts, [question.section]: (counts[question.section] || 0) + 1 }), {}),
    {
      'Verbal Intelligence': 60,
      'Non-Verbal Intelligence': 60,
      Mathematics: 10,
      'Pakistan Studies': 20,
      Physics: 10,
      English: 30,
      'General Knowledge': 20,
      'Islamic Studies': 10,
    }
  );
  assert.ok(questions.every((question) => question.question_text && question.correct_option && question.explanation.trim()));
  assert.ok(questions.every((question) => ['A', 'B', 'C', 'D', 'E'].includes(question.correct_option)));
  assert.ok(questions.every((question) => [question.option_a, question.option_b, question.option_c, question.option_d, question.option_e].filter(Boolean).every((option) => option.length < 200)));

  const visualQuestions = questions.filter((question) => question.image_url);
  assert.equal(visualQuestions.length, 60);
  assert.ok(visualQuestions.every((question) => question.option_a && question.option_d));
  assert.ok(visualQuestions.filter((question) => question.option_e).every((question) => question.correct_option !== 'E' || question.option_e));
  await Promise.all(visualQuestions.map((question) => {
    const filename = question.image_url.split('/').at(-1);
    return access(fileURLToPath(new URL(`../public/images/mock-tests/pma-lc159-mock-test-2/${filename}`, import.meta.url)));
  }));
});