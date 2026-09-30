import { useEffect, useState } from 'react';
import {
  getMyNotificationPage,
  getMyNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  updateMyNotificationPreferences,
} from '../lib/notifications';

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const DEFAULT_PREFERENCES = {
  study_reminders_enabled: false,
  preferred_time: '18:00:00',
  preferred_days: [1, 2, 3, 4, 5],
  timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  new_content_enabled: true,
  mock_test_notifications_enabled: true,
  subscription_notifications_enabled: true,
};

const TYPE_LABELS = {
  STUDY_REMINDER: 'Study reminder',
  NEW_CONTENT: 'New content',
  MOCK_TEST_AVAILABLE: 'Mock test',
  PAYMENT_SUBMITTED: 'Payment submitted',
  PAYMENT_APPROVED: 'Payment approved',
  PAYMENT_REJECTED: 'Payment update',
  SUBSCRIPTION_EXPIRING: 'Subscription',
  SUBSCRIPTION_EXPIRED: 'Subscription',
  ACCOUNT: 'Account',
  SYSTEM: 'FaujPrep',
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 border-b border-slate-800 py-3 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-400" />
    </label>
  );
}

export default function NotificationCenter({ onNavigate, onUnreadCountChange }) {
  const [page, setPage] = useState(1);
  const [notificationState, setNotificationState] = useState({ items: [], total: 0, unread_count: 0, has_more: false, loading: true, error: null });
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferencesState, setPreferencesState] = useState({ loading: true, saving: false, error: null, saved: false });

  const loadNotifications = async (requestedPage = page) => {
    setNotificationState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const result = await getMyNotificationPage(requestedPage);
      setNotificationState({ ...result, loading: false, error: null });
      onUnreadCountChange?.(result.unread_count || 0);
    } catch {
      setNotificationState((previous) => ({ ...previous, loading: false, error: 'Unable to load notifications. Please try again.' }));
    }
  };

  useEffect(() => {
    let active = true;
    getMyNotificationPage(page)
      .then((result) => {
        if (!active) return;
        setNotificationState({ ...result, loading: false, error: null });
        onUnreadCountChange?.(result.unread_count || 0);
      })
      .catch(() => active && setNotificationState((previous) => ({ ...previous, loading: false, error: 'Unable to load notifications. Please try again.' })));
    return () => { active = false; };
  }, [page, onUnreadCountChange]);

  useEffect(() => {
    let active = true;
    getMyNotificationPreferences()
      .then((value) => active && setPreferences({
        ...DEFAULT_PREFERENCES,
        ...value,
        preferred_time: String(value?.preferred_time || DEFAULT_PREFERENCES.preferred_time).slice(0, 5),
        preferred_days: Array.isArray(value?.preferred_days) ? value.preferred_days : DEFAULT_PREFERENCES.preferred_days,
      }))
      .catch(() => active && setPreferencesState({ loading: false, saving: false, error: 'Unable to load notification settings.', saved: false }))
      .finally(() => active && setPreferencesState((previous) => ({ ...previous, loading: false })));
    return () => { active = false; };
  }, []);

  const updatePreference = (key, value) => setPreferences((previous) => ({ ...previous, [key]: value }));

  const handleMarkRead = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
      } catch {
        setNotificationState((previous) => ({ ...previous, error: 'Unable to update this notification. Please try again.' }));
        return;
      }
    }
    if (notification.action_url) onNavigate(notification.action_url);
    else await loadNotifications(page);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await loadNotifications(page);
    } catch {
      setNotificationState((previous) => ({ ...previous, error: 'Unable to mark notifications as read.' }));
    }
  };

  const handleSavePreferences = async (event) => {
    event.preventDefault();
    setPreferencesState({ loading: false, saving: true, error: null, saved: false });
    try {
      const saved = await updateMyNotificationPreferences({
        ...preferences,
        preferred_time: preferences.preferred_time.length === 5 ? `${preferences.preferred_time}:00` : preferences.preferred_time,
      });
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...saved,
        preferred_time: String(saved?.preferred_time || DEFAULT_PREFERENCES.preferred_time).slice(0, 5),
        preferred_days: Array.isArray(saved?.preferred_days) ? saved.preferred_days : DEFAULT_PREFERENCES.preferred_days,
      });
      setPreferencesState({ loading: false, saving: false, error: null, saved: true });
    } catch (error) {
      setPreferencesState({ loading: false, saving: false, error: error.message || 'Unable to save notification settings.', saved: false });
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:px-8">
      <section className="min-w-0 space-y-4" aria-labelledby="notifications-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="notifications-heading" className="text-2xl font-bold text-slate-100">Notifications</h1>
            <p className="mt-1 text-xs text-slate-400">{notificationState.unread_count || 0} unread</p>
          </div>
          {notificationState.unread_count > 0 && <button type="button" onClick={handleMarkAllRead} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300">Mark all as read</button>}
        </div>

        {notificationState.error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200">{notificationState.error} <button type="button" onClick={() => loadNotifications(page)} className="ml-2 underline">Try again</button></div>}
        {notificationState.loading && <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">Loading notifications…</p>}
        {!notificationState.loading && !notificationState.error && notificationState.items.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No notifications yet.</p>}

        {!notificationState.loading && notificationState.items.length > 0 && (
          <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            {notificationState.items.map((notification) => (
              <li key={notification.id} className={`flex min-w-0 gap-3 p-4 ${notification.is_read ? '' : 'bg-slate-900/80'}`}>
                <span aria-label={notification.is_read ? 'Read' : 'Unread'} className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.is_read ? 'bg-slate-600' : 'bg-emerald-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="text-sm font-semibold text-slate-100">{notification.title}</h2>
                    {!notification.is_read && <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[9px] font-mono uppercase text-emerald-300">Unread</span>}
                    <span className="text-[10px] text-slate-500">{TYPE_LABELS[notification.notification_type] || 'FaujPrep'}</span>
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-slate-300">{notification.message}</p>
                  <p className="mt-2 text-[10px] text-slate-500">{formatDate(notification.created_at)}</p>
                  {notification.action_url && <button type="button" onClick={() => handleMarkRead(notification)} className="mt-3 text-xs font-semibold text-emerald-400 hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">Open</button>}
                  {!notification.action_url && !notification.is_read && <button type="button" onClick={() => handleMarkRead(notification)} className="mt-3 text-xs text-slate-400 hover:text-slate-200">Mark as read</button>}
                </div>
              </li>
            ))}
          </ul>
        )}

        {(page > 1 || notificationState.has_more) && (
          <div className="flex items-center justify-between gap-3">
            <button type="button" disabled={page <= 1 || notificationState.loading} onClick={() => setPage((previous) => Math.max(1, previous - 1))} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-40">Previous</button>
            <span className="text-xs text-slate-500">Page {page}</span>
            <button type="button" disabled={!notificationState.has_more || notificationState.loading} onClick={() => setPage((previous) => previous + 1)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-40">Next</button>
          </div>
        )}
      </section>

      <section className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-5" aria-labelledby="notification-settings-heading">
        <h2 id="notification-settings-heading" className="text-base font-semibold text-slate-100">Notification settings</h2>
        {preferencesState.loading ? <p className="py-5 text-sm text-slate-400">Loading settings…</p> : (
          <form onSubmit={handleSavePreferences} className="mt-2">
            <Toggle label="Study reminders" checked={preferences.study_reminders_enabled} onChange={(value) => updatePreference('study_reminders_enabled', value)} />
            {preferences.study_reminders_enabled && (
              <div className="space-y-3 border-b border-slate-800 py-3">
                <label className="flex items-center justify-between gap-3 text-xs text-slate-400">Preferred time<input type="time" value={preferences.preferred_time} onChange={(event) => updatePreference('preferred_time', event.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100" /></label>
                <fieldset>
                  <legend className="mb-2 text-xs text-slate-400">Reminder days</legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => <label key={day.value} className="flex items-center gap-1.5 text-[11px] text-slate-300"><input type="checkbox" checked={preferences.preferred_days.includes(day.value)} onChange={(event) => updatePreference('preferred_days', event.target.checked ? [...new Set([...preferences.preferred_days, day.value])].sort() : preferences.preferred_days.filter((value) => value !== day.value))} className="accent-emerald-400" />{day.label}</label>)}
                  </div>
                </fieldset>
              </div>
            )}
            <Toggle label="New study/current affairs content" checked={preferences.new_content_enabled} onChange={(value) => updatePreference('new_content_enabled', value)} />
            <Toggle label="New mock tests" checked={preferences.mock_test_notifications_enabled} onChange={(value) => updatePreference('mock_test_notifications_enabled', value)} />
            <Toggle label="Subscription reminders" checked={preferences.subscription_notifications_enabled} onChange={(value) => updatePreference('subscription_notifications_enabled', value)} />
            <div className="border-b border-slate-800 py-3 text-xs text-slate-400">Payment and verification updates are always enabled.</div>
            {preferencesState.error && <p role="alert" className="mt-3 text-xs text-rose-300">{preferencesState.error}</p>}
            {preferencesState.saved && <p role="status" className="mt-3 text-xs text-emerald-300">Settings saved.</p>}
            <button type="submit" disabled={preferencesState.saving || preferences.preferred_days.length === 0} className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">{preferencesState.saving ? 'Saving…' : 'Save settings'}</button>
          </form>
        )}
        <p className="mt-3 text-[10px] leading-5 text-slate-500">Study reminders appear after the site scheduler has been configured.</p>
      </section>
    </div>
  );
}