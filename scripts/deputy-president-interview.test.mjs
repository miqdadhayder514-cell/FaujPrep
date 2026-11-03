import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  DEPUTY_PRESIDENT_CATEGORIES,
  DEPUTY_PRESIDENT_CIVICS_LESSONS,
  DEPUTY_PRESIDENT_CURRENT_AFFAIRS_SOURCES,
  DEPUTY_PRESIDENT_FRAMEWORKS,
  DEPUTY_PRESIDENT_KNOWLEDGE_LESSONS,
  DEPUTY_PRESIDENT_QUESTIONS,
  DEPUTY_PRESIDENT_ROADMAP,
} from '../src/data/deputyPresidentInterview.js';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const component = await readFile(new URL('../src/components/DeputyPresidentInterviewModule.jsx', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/061_deputy_president_interview.sql', import.meta.url), 'utf8');
const edgeFunction = await readFile(new URL('../supabase/functions/deputy-president-interview/index.ts', import.meta.url), 'utf8');
const functionConfig = await readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8');

test('question bank preserves all supplied prompts and the selected category allocation', () => {
  const expected = [
    ['Personal Introduction and Biodata', 15],
    ['Education and Academic Background', 15],
    ['Family and Social Background', 15],
    ['Motivation and Armed Forces Career', 15],
    ['Pakistan Armed Forces Knowledge', 20],
    ['Pakistan Studies and History', 20],
    ['Current Affairs and International Relations', 15],
    ['Hobbies, Books and Sports', 15],
    ['Leadership and Situational Judgment', 15],
    ['Mental Mathematics and Numerical Reasoning', 15],
    ['General Knowledge and Everyday Science', 10],
    ['Challenging and Follow-up Questions', 10],
  ];
  assert.equal(DEPUTY_PRESIDENT_QUESTIONS.length, 180);
  assert.deepEqual(DEPUTY_PRESIDENT_CATEGORIES.map(({ title, count }) => [title, count]), expected);
  assert.equal(new Set(DEPUTY_PRESIDENT_QUESTIONS.map((item) => item.id)).size, 180);
  assert.equal(new Set(DEPUTY_PRESIDENT_QUESTIONS.map((item) => item.question)).size, 180);
  for (const question of DEPUTY_PRESIDENT_QUESTIONS) {
    assert.ok(question.explanation);
    assert.ok(question.preparationGuidance);
    assert.ok(question.suggestedAnswerStructure);
    assert.ok(question.followUpQuestions.length);
    assert.ok(question.sourceClassification);
    assert.ok(['easy', 'moderate', 'challenging'].includes(question.difficulty));
  }
});

test('answer examples, framework, roadmap, and lessons avoid unsupported current officeholders', () => {
  assert.ok(DEPUTY_PRESIDENT_FRAMEWORKS.some((framework) => framework.title.includes('STAR')));
  assert.equal(DEPUTY_PRESIDENT_ROADMAP.length, 14);
  assert.equal(DEPUTY_PRESIDENT_ROADMAP[0].day, 1);
  assert.equal(DEPUTY_PRESIDENT_ROADMAP.at(-1).title, 'Complete mock interview');
  assert.equal(DEPUTY_PRESIDENT_KNOWLEDGE_LESSONS.length, 10);
  assert.equal(DEPUTY_PRESIDENT_CIVICS_LESSONS.length, 7);
  assert.ok(DEPUTY_PRESIDENT_CURRENT_AFFAIRS_SOURCES.every((source) => source.url.startsWith('https://')));
  const timeSensitive = DEPUTY_PRESIDENT_QUESTIONS.filter((item) => item.requiresCurrentVerification);
  assert.ok(timeSensitive.length >= 5);
  assert.ok(timeSensitive.every((item) => item.sourceClassification.includes('verify')));
});

test('module route, practice flows, privacy migration, and secure AI endpoint are wired', () => {
  assert.match(app, /issb-deputy-president-interview/);
  assert.match(app, /DeputyPresidentInterviewModule/);
  assert.match(component, /Complete Interview/);
  assert.match(component, /Rapid-Fire Interview/);
  assert.match(component, /Request AI feedback/);
  assert.match(component, /learningAiConsent/);
  assert.match(component, /14-day preparation roadmap/);
  for (const focus of [
    'A. Complete Interview',
    'B. Personal Background',
    'C. Academic Background',
    'D. Armed Forces Motivation',
    'E. Military Awareness',
    'F. Pakistan Studies',
    'G. Current Affairs',
    'H. Leadership and Judgment',
    'I. General Knowledge',
    'J. Mental Mathematics',
    'K. Challenging Follow-ups',
    'L. Closing Interview',
  ]) assert.ok(component.includes(focus), `Missing mock interview focus: ${focus}`);
  assert.match(edgeFunction, /'sports'/);
  assert.match(edgeFunction, /'academicMarks'/);
  assert.match(component, /onConflict: 'user_id,question_id'/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /user_id = auth\.uid\(\)/i);
  assert.match(migration, /s\.id = deputy_interview_responses\.session_id and s\.user_id = auth\.uid\(\)/i);
  assert.match(migration, /last_verified_at/);
  assert.match(edgeFunction, /OPENAI_API_KEY/);
  assert.match(edgeFunction, /action === 'review'/);
  assert.match(edgeFunction, /deputy-president-review/);
  assert.match(edgeFunction, /cleanConversation/);
  assert.match(component, /history: interview\.messages/);
  assert.match(edgeFunction, /exactly ONE clear question/i);
  assert.doesNotMatch(edgeFunction, /from\('deputy_interview_sessions'\)/);
  assert.match(component, /Retry AI interviewer/);
  assert.match(component, /Continue without AI/);
  assert.match(component, /nextIndex = !isStart && !retrying \? interview\.index \+ 1/);
  assert.match(component, /if \(interview\.aiEnabled\) \{/);
  assert.match(edgeFunction, /consentToAiProcessing !== true/);
  assert.match(edgeFunction, /getUser\(token\)/);
  assert.match(edgeFunction, /consume_psychological_interview_limit/);
  assert.match(edgeFunction, /not an actual ISSB Deputy President/i);
  assert.match(functionConfig, /\[functions\.deputy-president-interview\]\s+verify_jwt = true/);
});
