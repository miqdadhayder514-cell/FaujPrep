import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import SCT_TESTS from '../src/data/sctTests.js';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const normalizeStem = (stem) => stem.toLowerCase().replace(/[^a-z0-9]/g, '');

test('SCT bank contains seven new complete tests with unique stems', () => {
  assert.equal(SCT_TESTS.length, 12);
  const existingStems = new Set(SCT_TESTS.slice(0, 5).flatMap((practiceTest) => practiceTest.entries.map(({ stem }) => normalizeStem(stem))));
  const newStems = new Set();
  for (const practiceTest of SCT_TESTS.slice(5)) {
    assert.equal(practiceTest.entries.length, 20, `${practiceTest.title} must contain 20 sentence stems`);
    for (const { stem, answer } of practiceTest.entries) {
      const normalized = normalizeStem(stem);
      assert.ok(normalized, 'sentence stem must not be empty');
      assert.ok(!existingStems.has(normalized), `${stem} repeats a stem from an existing test`);
      assert.ok(!newStems.has(normalized), `${stem} repeats a stem in the new tests`);
      assert.ok(answer.trim().length > 0, `${stem} needs an illustrative completion`);
      newStems.add(normalized);
    }
  }
  assert.equal(newStems.size, 140);
});

test('SCT keeps the 12-second pace and identifies completions as illustrative', () => {
  assert.match(app, /Math\.floor\(elapsedSeconds \/ 12\)/);
  assert.match(app, /20 sentence stems · 12 seconds per stem · 4 minutes/);
  assert.match(app, /illustrative practice completions/);
  assert.match(app, /not official ISSB answers or a scoring key/);
});
