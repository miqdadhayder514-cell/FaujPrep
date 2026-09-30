import { isSupabaseConfigured, supabase } from './supabase';
import { isClientAnalyticsEvent, sanitizeAnalyticsProperties } from './analytics-events';

const recentEvents = new Map();
const DEDUPE_WINDOW_MS = 1500;

function getSessionId() {
  try {
    let sessionId = window.sessionStorage.getItem('faujprep.analytics.session');
    if (!sessionId) {
      sessionId = window.crypto.randomUUID();
      window.sessionStorage.setItem('faujprep.analytics.session', sessionId);
    }
    return sessionId;
  } catch {
    return null;
  }
}

function getCleanPath(path) {
  const value = String(path || window.location.pathname || '/').split('?')[0];
  return /^\/[a-zA-Z0-9/_-]{0,199}$/.test(value) ? value : '/';
}

export function trackAnalyticsEvent(eventName, {
  pagePath,
  entityType = null,
  entityId = null,
  properties = {},
  dedupeKey = null,
} = {}) {
  if (!isSupabaseConfigured || !isClientAnalyticsEvent(eventName)) return;

  const now = Date.now();
  const key = dedupeKey ? `${eventName}:${dedupeKey}` : null;
  if (key && now - (recentEvents.get(key) || 0) < DEDUPE_WINDOW_MS) return;
  if (key) {
    recentEvents.set(key, now);
    if (recentEvents.size > 100) {
      for (const [cachedKey, timestamp] of recentEvents) {
        if (now - timestamp >= DEDUPE_WINDOW_MS) recentEvents.delete(cachedKey);
      }
      if (recentEvents.size > 100) recentEvents.delete(recentEvents.keys().next().value);
    }
  }

  const safeEntityId = typeof entityId === 'string' && /^[0-9a-f-]{36}$/i.test(entityId) ? entityId : null;
  const payload = {
    p_event_name: eventName,
    p_session_id: getSessionId(),
    p_page_path: getCleanPath(pagePath),
    p_entity_type: entityType,
    p_entity_id: safeEntityId,
    p_properties: sanitizeAnalyticsProperties(eventName, properties),
  };

  void Promise.resolve(supabase.rpc('track_analytics_event', payload)).catch(() => {});
}

export function trackPageView({ pagePath, eventName, entityType, entityId, properties } = {}) {
  const cleanPath = getCleanPath(pagePath);
  trackAnalyticsEvent('PAGE_VIEW', { pagePath: cleanPath, dedupeKey: cleanPath });
  if (eventName) {
    trackAnalyticsEvent(eventName, {
      pagePath: cleanPath,
      entityType,
      entityId,
      properties,
      dedupeKey: `${cleanPath}:${entityId || ''}`,
    });
  }
}

export async function getAdminAnalytics(range = '30d') {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('get_admin_analytics', { p_range: range });
  if (error) throw error;
  return data;
}