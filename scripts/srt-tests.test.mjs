import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import SRT_TESTS from '../src/data/srtTests.js';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('SRT practice contains the original five tests and seven complete new tests', () => {
  assert.equal(SRT_TESTS.length, 12);
  assert.deepEqual(SRT_TESTS.slice(5).map((practiceTest) => practiceTest.entries.length), Array(7).fill(10));
  for (const practiceTest of SRT_TESTS.slice(5)) {
    assert.ok(practiceTest.title);
    for (const entry of practiceTest.entries) {
      assert.ok(entry.category);
      assert.ok(entry.question.endsWith('What will you do?'));
      assert.ok(entry.answer.length >= 40);
    }
  }
});

test('SRT practice uses 50-second situations and reveals illustrative answers only at the end', () => {
  assert.match(app, /elapsedSeconds >= 50/);
  assert.match(app, /Each question has 50 seconds/);
  assert.match(app, /Illustrative practice response/);
  assert.match(app, /not official ISSB answer keys/);
  assert.match(app, /String\(index \+ 1\)\.padStart\(2, '0'\)/);
});
