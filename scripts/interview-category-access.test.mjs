import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appSource = readFileSync(fileURLToPath(new URL('../src/App.jsx', import.meta.url)), 'utf8');
const migrationSource = readFileSync(fileURLToPath(new URL('../supabase/migrations/044_paid_interview_category_practice.sql', import.meta.url)), 'utf8');
const priceMigrationSource = readFileSync(fileURLToPath(new URL('../supabase/migrations/045_interview_category_price_pkr_50.sql', import.meta.url)), 'utf8');
const categoryKeys = [
  'personal',
  'academic',
  'general-knowledge',
  'current-affairs',
  'defense',
  'rapid-fire',
  'mock',
];

test('all question-based interview categories use the PKR 50 approval-gated purchase flow', () => {
  for (const category of categoryKeys) {
    const slug = `interview-practice-${category}`;
    assert.ok(migrationSource.includes(`'${slug}'`), `Migration is missing ${slug}`);
  }

  assert.match(appSource, /pricePkr: 50,\s+isInterviewPractice: true/);
  assert.match(appSource, /Your PKR 50 payment proof is pending administrator approval/);
  assert.match(appSource, /categoryPurchase\?\.status === 'APPROVED'/);
  assert.match(migrationSource, /and amount_pkr = 70/);
  assert.match(migrationSource, /after admin approval/i);
  assert.match(priceMigrationSource, /and amount_pkr in \(50, 70\)/);
  for (const category of categoryKeys) {
    assert.match(priceMigrationSource, new RegExp(`when 'interview-practice-${category}' then 50`));
  }
  assert.match(appSource, /!isProgress && \(!isPaidCategory \|\| isApproved\) && questions\.length > 0/);
  assert.match(appSource, /accessLoading = backendConfigured && \(mockTestPurchaseState\.loading \|\| !purchaseStateMatchesUser\)/);
  assert.match(appSource, /window\.setInterval\(refreshWhenVisible, 10000\)/);
});

test('interview practice requests are labelled for candidates and admin reviewers', () => {
  for (const title of [
    'Personal Interview Practice',
    'Academic Interview Practice',
    'General Knowledge Interview Practice',
    'Current Affairs Interview Practice',
    'Pakistan & Defense Knowledge Interview Practice',
    'Rapid Fire Interview Practice',
    'Mock Interview Practice',
  ]) {
    assert.ok(migrationSource.includes(title), `Missing payment queue label ${title}`);
  }

  assert.match(appSource, /Pay PKR 50 and submit proof/);
  assert.match(appSource, /Submit answer for feedback/);
  assert.match(appSource, /Submit follow-up and see marks/);
  assert.match(appSource, /Example of a strong interview answer/);
  assert.match(appSource, /Check approval now/);
  assert.match(appSource, /Interviewer-style counter questions/);
  assert.match(appSource, /Get a practice score, actionable feedback, and a strong sample answer/);
  assert.match(appSource, /cannot guarantee selection or a passing result/);
  assert.match(appSource, /not an AI interviewer or a guarantee of selection/);
  assert.match(appSource, /motion-reduce:animate-none animate-pulse border-amber-400\/50/);
});
