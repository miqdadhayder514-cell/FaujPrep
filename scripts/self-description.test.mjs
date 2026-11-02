import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SELF_DESCRIPTION_BANK_NOTICE,
  SELF_DESCRIPTION_CATEGORIES,
  SELF_DESCRIPTION_CATEGORY_EXAMPLES,
  SELF_DESCRIPTION_CLASSIC_QUESTION_IDS,
  SELF_DESCRIPTION_QUESTIONS,
} from '../src/data/selfDescriptionQuestions.js';

const root = new URL('../', import.meta.url);
const [appSource, moduleSource, migration, edgeFunction, seoSource, seoGenerator] = await Promise.all([
  readFile(new URL('src/App.jsx', root), 'utf8'),
  readFile(new URL('src/components/SelfDescriptionModule.jsx', root), 'utf8'),
  readFile(new URL('supabase/migrations/059_issb_self_description.sql', root), 'utf8'),
  readFile(new URL('supabase/functions/self-description-feedback/index.ts', root), 'utf8'),
  readFile(new URL('src/lib/seo.js', root), 'utf8'),
  readFile(new URL('scripts/generate-seo-assets.mjs', root), 'utf8'),
]);

test('all 88 supplied prompts exist once across the ten required categories', () => {
  assert.equal(SELF_DESCRIPTION_QUESTIONS.length, 88);
  assert.equal(new Set(SELF_DESCRIPTION_QUESTIONS.map((question) => question.id)).size, 88);
  assert.deepEqual(SELF_DESCRIPTION_CATEGORIES.map((category) => category.questionIds.length), [12, 8, 8, 8, 6, 12, 8, 8, 8, 10]);
  assert.equal(SELF_DESCRIPTION_CATEGORIES.length, 10);
  assert.match(SELF_DESCRIPTION_BANK_NOTICE, /not an official, exhaustive ISSB question paper/i);

  for (const question of SELF_DESCRIPTION_QUESTIONS) {
    assert.ok(question.id);
    assert.ok(question.categoryId);
    assert.match(question.title, /[?.]$/);
    assert.ok(question.description.length > 20);
    assert.ok(question.writingGuidance.length > 40);
    assert.ok(['easy', 'medium', 'hard'].includes(question.difficulty));
    assert.ok(Number.isInteger(question.displayOrder));
    assert.equal(question.questionType, 'written');
    assert.equal(question.isActive, true);
  }
});

test('classic and commonly reported core sets are separately identified', () => {
  assert.deepEqual(SELF_DESCRIPTION_CLASSIC_QUESTION_IDS, [
    'parents-think',
    'teachers-think',
    'best-friends-think',
    'personal-opinion',
    'qualities-to-develop',
  ]);
  assert.equal(SELF_DESCRIPTION_QUESTIONS.filter((question) => question.isCore).length, 8);
  assert.ok(SELF_DESCRIPTION_QUESTIONS.every((question) => Boolean(SELF_DESCRIPTION_CATEGORY_EXAMPLES[question.categoryId])));
});

test('migration seeds the full bank idempotently and protects user-owned records', () => {
  const seededIds = [...migration.matchAll(/^  \('([^']+)'/gm)].map((match) => match[1]);
  assert.equal(seededIds.length, 88);
  assert.deepEqual(new Set(seededIds), new Set(SELF_DESCRIPTION_QUESTIONS.map((question) => question.id)));
  assert.match(migration, /on conflict \(id\) do nothing/i);
  assert.match(migration, /user_id = auth\.uid\(\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /self_description_feedback_read_own/i);
  assert.doesNotMatch(migration, /on public\.self_description_feedback for insert/i);
});

test('practice modes, autosave, refresh recovery, simulation timing, and feedback consent are implemented', () => {
  assert.match(moduleSource, /mode: 'classic'/);
  assert.match(moduleSource, /mode: 'core'/);
  assert.match(moduleSource, /mode: 'category'/);
  assert.match(moduleSource, /mode: 'random'/);
  assert.match(moduleSource, /mode: 'full'/);
  assert.match(moduleSource, /DURATION_OPTIONS = \[5, 10, 15\]/);
  assert.match(moduleSource, /setInterval\(\(\) => setNow\(Date\.now\(\)\), 1000\)/);
  assert.match(moduleSource, /localStorage\.setItem/);
  assert.match(moduleSource, /localStorage\.getItem/);
  assert.match(moduleSource, /Automatically|automatically/i);
  assert.match(moduleSource, /navigate\(`results\/\$\{completed\.id\}`\)/);
  assert.match(moduleSource, /\.range\(offset, offset \+ 499\)/);
  assert.match(moduleSource, /requestAiFeedback\(savedAttempt\)/);
  assert.match(moduleSource, /consentToAiProcessing: true/);
  assert.match(moduleSource, /disabled=\{!aiConsent/);
  assert.match(appSource, /\/issb\/psychological-tests\/selfdescriptiontest/);
  assert.match(appSource, /case 'issb-self-description'/);
});

test('AI feedback requires authentication, consent, ownership, and stays server-side', () => {
  assert.match(edgeFunction, /consentToAiProcessing !== true/);
  assert.match(edgeFunction, /\.eq\('user_id', userData\.user\.id\)/);
  assert.match(edgeFunction, /Deno\.env\.get\('OPENAI_API_KEY'\)/);
  assert.match(edgeFunction, /Never diagnose personality/);
  assert.match(edgeFunction, /predict ISSB selection/);
  for (const dimension of [
    'self-awareness',
    'clarity',
    'specificity',
    'strength-recognition',
    'weakness-recognition',
    'consistency',
    'development-goals',
    'reflection',
    'relevance',
    'grammar-and-communication',
  ]) assert.ok(edgeFunction.includes(dimension));
  assert.match(edgeFunction, /self_description_feedback/);
  assert.doesNotMatch(moduleSource, /OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});

test('dedicated route is generated without indexing personal practice content', () => {
  assert.match(seoSource, /'issb-self-description'/);
  assert.match(seoSource, /indexable = false/);
  assert.match(seoGenerator, /selfdescriptiontest/);
  assert.match(seoGenerator, /sitemap: false/);
  assert.match(seoGenerator, /pages\.filter\(\(page\) => page\.sitemap !== false\)/);
});
