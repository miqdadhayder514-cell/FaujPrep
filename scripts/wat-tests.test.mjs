import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import WAT_TESTS from '../src/data/watTests.js';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const normalizeWord = (word) => word.toLowerCase().replace(/[^a-z0-9]/g, '');

test('seven new WAT sets contain 50 distinct words each with illustrative responses', () => {
  assert.equal(WAT_TESTS.length, 12);
  const existingWords = new Set(WAT_TESTS.slice(0, 5).flatMap((practiceTest) => practiceTest.entries.map(({ word }) => normalizeWord(word))));
  const newWords = new Set();
  for (const practiceTest of WAT_TESTS.slice(5)) {
    assert.equal(practiceTest.entries.length, 50, `${practiceTest.title} must contain 50 words`);
    for (const { word, answer } of practiceTest.entries) {
      const normalized = normalizeWord(word);
      assert.ok(normalized, 'stimulus word must not be empty');
      assert.ok(!existingWords.has(normalized), `${word} repeats a word from an existing test`);
      assert.ok(!newWords.has(normalized), `${word} repeats a word in the new tests`);
      assert.ok(answer.length >= 20, `${word} needs a useful example response`);
      newWords.add(normalized);
    }
  }
  assert.equal(newWords.size, 350);
});

test('WAT page keeps the 15-second pace and presents examples only after completion', () => {
  assert.match(app, /Math\.floor\(elapsedSeconds \/ 15\)/);
  assert.match(app, /50 words · 15 seconds per word/);
  assert.match(app, /Illustrative response/);
  assert.match(app, /not official answer keys/);
});
