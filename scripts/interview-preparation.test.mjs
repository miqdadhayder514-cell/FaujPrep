import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appSource = readFileSync(fileURLToPath(new URL('../src/App.jsx', import.meta.url)), 'utf8');

test('interview categories provide guided questions, answer drafts, and tips', () => {
  const categoryQuestionIds = [
    'academic-strongest-subject',
    'academic-explain-concept',
    'academic-favorite-topic',
    'academic-improvement-plan',
    'gk-constitution',
    'gk-geography',
    'gk-national-day',
    'gk-international-organizations',
    'affairs-national-issue',
    'affairs-international-development',
    'affairs-regional-relations',
    'affairs-source-checking',
    'defense-service-branches',
    'defense-civilian-authority',
    'defense-geography',
    'defense-national-resilience',
    'rapid-fire-integrity',
    'rapid-fire-teamwork',
    'rapid-fire-disagreement',
    'rapid-fire-setback',
    'rapid-fire-pressure',
    'mock-introduction',
    'mock-service-motivation',
    'mock-leadership-example',
    'mock-setback-response',
    'mock-final-question',
  ];

  for (const questionId of categoryQuestionIds) {
    assert.match(appSource, new RegExp(`'${questionId}'`));
  }

  assert.match(appSource, /const createInterviewQuestion = \(id, question, thinkBeforeAnswering, assessing, strategy, mistakes\)/);
  assert.match(appSource, /const questions = INTERVIEW_QUESTION_SETS\[categoryKey\] \|\| \[\]/);
  assert.match(appSource, /What the interviewer is assessing/);
  assert.match(appSource, /Answer strategy/);
  assert.match(appSource, /Common mistakes/);
  assert.match(appSource, /aria-label=\{`Practice answer: \$\{question\.question\}`\}/);
  assert.match(appSource, /const INTERVIEW_TIP_GUIDES = \[/);
  assert.match(appSource, /const ALL_INTERVIEW_QUESTIONS = Object\.values\(INTERVIEW_QUESTION_SETS\)\.flat\(\)/);
});
