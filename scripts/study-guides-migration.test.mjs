import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/020_candidate_test_preparation_guides.sql', import.meta.url), 'utf8');
const expectedSlugs = [
  'pakistan-army-initial-test-guide',
  'paf-initial-test-guide',
  'pakistan-navy-initial-test-guide',
  'non-verbal-intelligence-test-guide',
  'verbal-intelligence-practice-notes',
  'general-knowledge-revision-sheet',
  'issb-psychological-preparation-overview',
  'faujprep-preparation-orientation',
  'issb-preparation-principles',
];
const guideContents = [...migration.matchAll(/\$guide\$(.*?)\$guide\$/gs)].map((match) => match[1]);

test('guide migration upgrades existing resources and includes every requested guide', () => {
  for (const slug of expectedSlugs) assert.match(migration, new RegExp(`'${slug}'`));
  assert.equal(guideContents.length, expectedSlugs.length);
  assert.match(migration, /on conflict \(slug\) do update/i);
  assert.match(migration, /is_published = excluded\.is_published/i);
});

test('migration has no unterminated SQL string literals outside article bodies', () => {
  const sql = migration.replace(/\$guide\$[\s\S]*?\$guide\$/g, '').replace(/'(?:[^']|'')*'/g, '');
  assert.doesNotMatch(sql, /'/);
});

test('each candidate guide is structured, substantial, and has source citations', () => {
  for (const content of guideContents) {
    assert.ok(content.length > 1800, 'guide content should be long-form');
    assert.match(content, /## /, 'guide should have section headings');
    assert.match(content, /SOURCE\|https:\/\//, 'guide should cite a source URL');
  }
});

test('guides preserve route-specific caveats and avoid selection guarantees', () => {
  assert.match(migration, /course-specific/);
  assert.match(migration, /current advertisement/);
  assert.match(migration, /flexible/);
  assert.match(migration, /guarantee/);
  assert.match(migration, /Dunlosky/);
  assert.match(migration, /Pakistan Bureau of Statistics/);
});
