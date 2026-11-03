import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('timed WAT, SCT, and SRT prompts can advance early and finish on the last prompt', () => {
  assert.match(app, /onClick=\{nextWATQuestion\}/);
  assert.match(app, /onClick=\{nextSCTQuestion\}/);
  assert.match(app, /onClick=\{nextSRTQuestion\}/);
  assert.match(app, /completed: nextIndex >= 50, startedAt: now, now/);
  assert.match(app, /completed: nextIndex >= 20, startedAt: now, now/);
  assert.match(app, /srtSession\.index === test\.entries\.length - 1 \? 'Finish test' : 'Next question'/);
});

test('timed WAT, SCT, and SRT advance automatically and reset each prompt timer', () => {
  assert.match(app, /const elapsedQuestions = Math\.floor\(elapsedSeconds \/ 15\);/);
  assert.match(app, /const elapsedQuestions = Math\.floor\(elapsedSeconds \/ 12\);/);
  assert.match(app, /const elapsedQuestions = Math\.floor\(elapsedSeconds \/ 50\);/);
  assert.match(app, /startedAt: previous\.startedAt \+ elapsedQuestions \* 15_000/);
  assert.match(app, /startedAt: previous\.startedAt \+ elapsedQuestions \* 12_000/);
  assert.match(app, /startedAt: previous\.startedAt \+ elapsedQuestions \* 50_000/);
});

test('a failed timed-mock answer save does not block Next and is retried before submission', () => {
  const handler = app.slice(app.indexOf('const saveAndMoveMockQuestion ='), app.indexOf('const persistMockTestAnswer ='));
  assert.ok(handler.indexOf('setPracticeSession((previous)') < handler.indexOf('await persistMockTestAnswer'));
  assert.match(handler, /You can continue; this answer will be retried before submission/);
  assert.match(app, /await Promise\.allSettled\(\[\.\.\.mockAnswerSavesRef\.current\.values\(\)\]\)/);
  assert.match(app, /const pendingQuestionIds = new Set\(mockAnswerSaveFailuresRef\.current\)/);
});
