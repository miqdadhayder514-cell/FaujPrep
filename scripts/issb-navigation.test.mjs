import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('ISSB navigation provides a direct destination on desktop and mobile', () => {
  assert.match(app, /onClick=\{\(\) => navigateTo\('issb'\)\}[\s\S]{0,250}>[\s\S]{0,100}ISSB\s*</);
  assert.match(app, /renderMobileNavLink\('issb', 'ISSB'\)/);
});

test('ISSB hub omits the interview-preparation module card', () => {
  assert.match(app, /\.filter\(\(module\) => module\.slug !== 'interview-preparation' && module\.title !== 'Interview Preparation'\)/);
});
