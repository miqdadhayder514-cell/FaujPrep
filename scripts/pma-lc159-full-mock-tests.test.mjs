import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const testCases = [
  ['5', 'pmaLongCourse159MockTest5.json', 'pma-lc159-mock-test-5'],
  ['6', 'pmaLongCourse159MockTest6.json', 'pma-lc159-mock-test-6'],
];

for (const [testNumber, dataFile, imageDirectory] of testCases) {
  test(`PMA Long Course 159 Mock test ${testNumber} includes all 220 answered questions and figures`, async () => {
    const questions = JSON.parse(await readFile(new URL(`../src/data/${dataFile}`, import.meta.url), 'utf8'));
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
    assert.ok(questions.every((question) => ['A', 'B', 'C', 'D'].includes(question.correct_option)));
    const visualQuestions = questions.filter((question) => question.image_url);
    assert.equal(visualQuestions.length, 60);
    await Promise.all(visualQuestions.map((question) => {
      const filename = question.image_url.split('/').at(-1);
      return access(fileURLToPath(new URL(`../public/images/full-mock-tests/${imageDirectory}/${filename}`, import.meta.url)));
    }));
  });
}