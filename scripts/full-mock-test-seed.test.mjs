import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const migrationPath = fileURLToPath(new URL('../supabase/migrations/021_seed_first_full_mock_test.sql', import.meta.url));
const renameMigrationPath = fileURLToPath(new URL('../supabase/migrations/024_rename_first_full_mock_test.sql', import.meta.url));
const imageDirectory = fileURLToPath(new URL('../public/images/full-mock-tests/first-full-mock-test/', import.meta.url));
const migration = readFileSync(migrationPath, 'utf8');
const renameMigration = readFileSync(renameMigrationPath, 'utf8');
const seedInsertStart = migration.indexOf('with first_full_mock_seed');
const seedValuesStart = migration.indexOf('values', seedInsertStart) + 'values'.length;
const seedValuesEnd = migration.indexOf('\r\n),\r\nquestion_upserts', seedValuesStart);
const seedRows = seedValuesEnd > seedValuesStart ? migration.slice(seedValuesStart, seedValuesEnd) : '';

test('first full mock seed contains 200 ordered source questions', () => {
  const questionNumbers = [...seedRows.matchAll(/^\((\d+),/gm)].map((match) => Number(match[1]));

  assert.deepEqual(questionNumbers, Array.from({ length: 200 }, (_, index) => index + 1));
  assert.match(migration, /'first-full-mock-test'/);
  assert.match(migration, /branch\.id, exam\.id, 105, 200/);
  assert.match(migration, /<> 200 then/);
});

test('first full mock test uses its PMA Long Course 159 title', () => {
  assert.match(renameMigration, /update public\.mock_tests/i);
  assert.match(renameMigration, /set title = 'PMA Long Course 159 Mock Test 1'/i);
  assert.match(renameMigration, /where slug = 'first-full-mock-test'/i);
});

test('every referenced non-verbal source crop is present exactly once', () => {
  const referencedImages = [...seedRows.matchAll(/'\/images\/full-mock-tests\/first-full-mock-test\/(q\d{3}\.png)'/g)]
    .map((match) => match[1])
    .sort();
  const storedImages = readdirSync(imageDirectory)
    .filter((name) => /^q\d{3}\.png$/.test(name))
    .sort();

  assert.equal(referencedImages.length, 58);
  assert.deepEqual(referencedImages, storedImages);
});