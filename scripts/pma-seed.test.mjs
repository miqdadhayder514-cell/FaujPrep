import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const validator = fileURLToPath(new URL('./validate-pma-seed.mjs', import.meta.url));

function auditSeed() {
  const output = execFileSync(process.execPath, [validator], { encoding: 'utf8' });
  return JSON.parse(output);
}

test('PMA seed contains exactly eight complete papers and 400 questions', () => {
  const audit = auditSeed();
  assert.equal(audit.papers, 8);
  assert.equal(audit.questions, 400);
  assert.deepEqual(audit.categoryTotals, {
    verbal: 150,
    nonVerbal: 150,
    analogy: 50,
    mathematicalSeries: 50,
  });
  assert.equal(audit.normalizedTextDuplicates, 0);
  assert.equal(audit.optionKeyAndVisualChecks, 'PASS');
  assert.equal(audit.schemaAndSeedContracts, 'PASS');
  assert.equal(audit.mathematicalAnswerChecks, 50);
});

test('every paper uses the reviewed difficulty and priority balance', () => {
  const { difficultyPriority } = auditSeed();
  for (const [slug, distribution] of Object.entries(difficultyPriority)) {
    assert.deepEqual(distribution.difficulty, { EASY: 15, MEDIUM: 25, HARD: 10 }, `${slug} difficulty`);
    assert.deepEqual(distribution.priority, { HIGH: 20, MEDIUM: 20, LOW: 10 }, `${slug} priority`);
  }
});
