export const ANALYTICS_EVENTS = Object.freeze({
  PAGE_VIEW: 'PAGE_VIEW',
  SIGNUP_STARTED: 'SIGNUP_STARTED',
  SIGNUP_COMPLETED: 'SIGNUP_COMPLETED',
  LOGIN_COMPLETED: 'LOGIN_COMPLETED',
  BRANCH_VIEWED: 'BRANCH_VIEWED',
  EXAM_VIEWED: 'EXAM_VIEWED',
  SUBJECT_VIEWED: 'SUBJECT_VIEWED',
  TOPIC_VIEWED: 'TOPIC_VIEWED',
  QUESTION_PRACTICE_STARTED: 'QUESTION_PRACTICE_STARTED',
  QUESTION_PRACTICE_COMPLETED: 'QUESTION_PRACTICE_COMPLETED',
  MOCK_TEST_VIEWED: 'MOCK_TEST_VIEWED',
  MOCK_TEST_STARTED: 'MOCK_TEST_STARTED',
  MOCK_TEST_COMPLETED: 'MOCK_TEST_COMPLETED',
  STUDY_MATERIAL_VIEWED: 'STUDY_MATERIAL_VIEWED',
  CURRENT_AFFAIRS_VIEWED: 'CURRENT_AFFAIRS_VIEWED',
  ISSB_MODULE_VIEWED: 'ISSB_MODULE_VIEWED',
  SEARCH_PERFORMED: 'SEARCH_PERFORMED',
  PRICING_VIEWED: 'PRICING_VIEWED',
  CHECKOUT_STARTED: 'CHECKOUT_STARTED',
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PLAN_UPGRADED: 'PLAN_UPGRADED',
});

const CLIENT_EVENT_NAMES = new Set([
  ANALYTICS_EVENTS.PAGE_VIEW,
  ANALYTICS_EVENTS.SIGNUP_STARTED,
  ANALYTICS_EVENTS.SIGNUP_COMPLETED,
  ANALYTICS_EVENTS.LOGIN_COMPLETED,
  ANALYTICS_EVENTS.BRANCH_VIEWED,
  ANALYTICS_EVENTS.EXAM_VIEWED,
  ANALYTICS_EVENTS.SUBJECT_VIEWED,
  ANALYTICS_EVENTS.TOPIC_VIEWED,
  ANALYTICS_EVENTS.QUESTION_PRACTICE_STARTED,
  ANALYTICS_EVENTS.QUESTION_PRACTICE_COMPLETED,
  ANALYTICS_EVENTS.MOCK_TEST_VIEWED,
  ANALYTICS_EVENTS.MOCK_TEST_STARTED,
  ANALYTICS_EVENTS.MOCK_TEST_COMPLETED,
  ANALYTICS_EVENTS.STUDY_MATERIAL_VIEWED,
  ANALYTICS_EVENTS.CURRENT_AFFAIRS_VIEWED,
  ANALYTICS_EVENTS.ISSB_MODULE_VIEWED,
  ANALYTICS_EVENTS.SEARCH_PERFORMED,
  ANALYTICS_EVENTS.PRICING_VIEWED,
  ANALYTICS_EVENTS.CHECKOUT_STARTED,
]);

const EVENT_PROPERTY_KEYS = {
  QUESTION_PRACTICE_STARTED: ['difficulty', 'question_count'],
  QUESTION_PRACTICE_COMPLETED: ['difficulty', 'question_count'],
  MOCK_TEST_VIEWED: ['difficulty', 'duration_minutes', 'question_count'],
  MOCK_TEST_STARTED: ['difficulty', 'duration_minutes', 'question_count'],
  MOCK_TEST_COMPLETED: ['difficulty', 'duration_minutes', 'question_count'],
  SEARCH_PERFORMED: ['result_count', 'content_type_filter', 'branch_filter', 'subject_filter'],
  CHECKOUT_STARTED: ['plan_slug'],
};

export function isClientAnalyticsEvent(eventName) {
  return CLIENT_EVENT_NAMES.has(eventName);
}

export function sanitizeAnalyticsProperties(eventName, properties = {}) {
  if (!isClientAnalyticsEvent(eventName) || !properties || typeof properties !== 'object' || Array.isArray(properties)) return {};
  const allowedKeys = EVENT_PROPERTY_KEYS[eventName] || [];
  const sanitized = {};
  for (const key of allowedKeys) {
    const value = properties[key];
    if (typeof value === 'string') {
      const normalized = value.replace(/[\r\n\t]/g, ' ').trim().slice(0, 100);
      if (normalized) sanitized[key] = normalized;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = Math.max(0, Math.min(1000, Math.trunc(value)));
    }
  }
  return sanitized;
}