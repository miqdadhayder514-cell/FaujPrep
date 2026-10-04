import test from 'node:test';
import assert from 'node:assert/strict';

const { default: questions } = await import('../src/data/mostRepeatedPhysicsMcqs.js');

test('Most Repeated Physics MCQS includes all 50 source questions with explanations', () => {
  assert.equal(questions.length, 50);
  assert.ok(questions.every((question) => question.question_text && question.option_a && question.option_b && question.option_c && question.option_d));
  assert.ok(questions.every((question) => question.correct_option && question.explanation && question.explanation.length > 80));
});
