import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { MECHANICAL_APTITUDE_TESTS } from '../src/data/mechanicalAptitudeTests.js';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('four free mechanical aptitude tests each contain 50 pictured, explained A/B/C questions', async () => {
  assert.equal(MECHANICAL_APTITUDE_TESTS.length, 4);

  for (const [testIndex, aptitudeTest] of MECHANICAL_APTITUDE_TESTS.entries()) {
    assert.equal(aptitudeTest.id, String(testIndex + 1));
    assert.equal(aptitudeTest.durationMinutes, 23);
    assert.ok(aptitudeTest.instructions.length > 10);
    assert.equal(aptitudeTest.questions.length, 50);

    for (const [questionIndex, question] of aptitudeTest.questions.entries()) {
      assert.equal(question.number, questionIndex + 1);
      assert.ok(question.prompt.length > 10);
      assert.ok(['A', 'B', 'C'].includes(question.correctOption));
      assert.ok(question.explanation.length > 10);
      assert.deepEqual(question.options, ['A', 'B', 'C']);
      await access(new URL(`../public${question.image}`, import.meta.url));
    }
  }
});

test('test-specific answer conventions and labelled choices are visible to candidates', () => {
  const [test1, test2, test3, test4] = MECHANICAL_APTITUDE_TESTS;
  assert.match(test1.instructions, /C when both pictures are equal/i);
  assert.deepEqual(test2.questions[2].optionLabels, {
    A: 'Clockwise',
    B: 'Anticlockwise',
    C: 'Will not turn',
  });
  assert.deepEqual(test2.questions[3].optionLabels, {
    A: 'Small wheel',
    B: 'Big wheel',
    C: 'Same speed',
  });
  assert.deepEqual(test2.questions[4].optionLabels, {
    A: 'Left man',
    B: 'Right man',
    C: 'Equal',
  });
  assert.match(test3.instructions, /C when both pictures are equal/i);
  assert.match(test4.instructions, /C when both pictures are equal/i);
});

test('mechanical aptitude practice is linked from ISSB psychology and gives immediate feedback', () => {
  assert.match(appSource, /id: 'mechanical-aptitude', title: 'Mechanical Aptitude Test'/);
  assert.match(appSource, /'issb-mechanical-aptitude-tests': '\/issb\/psychological-tests\/mechanicalapptitudetests'/);
  assert.match(appSource, /now - previous\.startedAt >= 23 \* 60 \* 1000/);
  assert.match(appSource, /You have 23 minutes to complete each test/);
  assert.match(appSource, /question\.correctOption/);
  assert.match(appSource, /question\.explanation/);
  assert.match(appSource, /question\.optionLabels\?\.\[option\]/);
  assert.match(appSource, /test\.instructions/);
  assert.match(appSource, /case 'issb-mechanical-aptitude-test':\s+return renderMechanicalAptitudeTestPage\(\);/);
});
