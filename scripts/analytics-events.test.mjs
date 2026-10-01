import test from 'node:test';
import assert from 'node:assert/strict';
import { ANALYTICS_EVENTS, isClientAnalyticsEvent, sanitizeAnalyticsProperties } from '../src/lib/analytics-events.js';

test('client events are controlled and payment outcomes remain server-only', () => {
  assert.equal(isClientAnalyticsEvent(ANALYTICS_EVENTS.PAGE_VIEW), true);
  assert.equal(isClientAnalyticsEvent('MADE_UP_EVENT'), false);
  assert.equal(isClientAnalyticsEvent(ANALYTICS_EVENTS.PAYMENT_APPROVED), false);
  assert.equal(isClientAnalyticsEvent(ANALYTICS_EVENTS.PLAN_UPGRADED), false);
});

test('analytics properties drop arbitrary queries and bound supported values', () => {
  const safe = sanitizeAnalyticsProperties(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
    result_count: 2500,
    content_type_filter: 'Exam\nFilter'.repeat(20),
    search_query: 'private search text',
    password: 'never-store',
  });
  assert.equal(safe.result_count, 1000);
  assert.equal(safe.content_type_filter.length, 100);
  assert.equal('search_query' in safe, false);
  assert.equal('password' in safe, false);
});

test('event sanitizer rejects system events and non-object properties', () => {
  assert.deepEqual(sanitizeAnalyticsProperties(ANALYTICS_EVENTS.PAYMENT_SUBMITTED, { plan_slug: 'pro' }), {});
  assert.deepEqual(sanitizeAnalyticsProperties(ANALYTICS_EVENTS.SEARCH_PERFORMED, ['secret']), {});
});

test('PMA paper events accept useful paper metadata without storing arbitrary identifiers', () => {
  assert.equal(isClientAnalyticsEvent(ANALYTICS_EVENTS.PMA_PAPER_VIEW), true);
  assert.equal(isClientAnalyticsEvent(ANALYTICS_EVENTS.PMA_PAPER_STARTED), true);
  assert.equal(isClientAnalyticsEvent(ANALYTICS_EVENTS.PMA_PAPER_COMPLETED), true);
  assert.deepEqual(sanitizeAnalyticsProperties(ANALYTICS_EVENTS.PMA_PAPER_COMPLETED, {
    paper_category: 'Non-Verbal Intelligence',
    question_count: 50,
    completion_status: 'COMPLETED',
    paper_id: 'not-a-property',
  }), {
    paper_category: 'Non-Verbal Intelligence',
    question_count: 50,
    completion_status: 'COMPLETED',
  });
});