import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInterviewAnswers } from '../src/lib/interviewEvaluation.js';
import { INTERVIEW_MODEL_ANSWERS } from '../src/data/interviewModelAnswers.js';

test('interview evaluation returns a bounded rubric score and polished response', () => {
  const result = evaluateInterviewAnswers({
    question: 'Why do you want to join the armed forces?',
    answer: 'I want to join the armed forces because service matters to me. For example, I lead my class team and learned to take responsibility.',
    counterAnswer: 'I would show this through consistent discipline and teamwork in difficult situations.',
  });

  assert.equal(result.maxScore, 10);
  assert.ok(result.score >= 0 && result.score <= 10);
  assert.equal(result.criteria.length, 5);
  assert.equal('correctedAnswer' in result, false);
});

test('short or empty responses receive actionable feedback without throwing', () => {
  const result = evaluateInterviewAnswers({
    question: 'Tell me about yourself.',
    answer: 'Me',
    counterAnswer: '',
  });

  assert.equal(result.score, 0);
  assert.ok(result.feedback.length > 0);
});

test('every question in a paid interview category has a curated model answer', () => {
  const questionIds = [
    'tell-me-about-yourself',
    'why-join-armed-forces',
    'strengths-weaknesses',
    'biggest-challenge',
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

  assert.equal(questionIds.length, 30);
  for (const questionId of questionIds) {
    assert.ok(INTERVIEW_MODEL_ANSWERS[questionId]?.length > 100, `Missing useful sample answer for ${questionId}`);
  }
});
