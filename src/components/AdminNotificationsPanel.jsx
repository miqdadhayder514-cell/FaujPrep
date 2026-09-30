import { useEffect, useState } from 'react';
import {
  createAdminNotification,
  getAdminNotificationHistory,
  getAdminNotificationTargets,
} from '../lib/notifications';

const EMPTY_TARGETS = { studyMaterials: [], currentAffairs: [], issbModules: [] };

export default function AdminNotificationsPanel() {
  const [form, setForm] = useState({ title: '', message: '', notificationType: 'NEW_CONTENT', audience: 'ALL', actionUrl: '', expiresAt: '' });
  const [targets, setTargets] = useState(EMPTY_TARGETS);
  const [history, setHistory] = useState([]);
  const [state, setState] = useState({ loading: true, saving: false, error: null, success: null });

  const loadHistory = async () => {
    const result = await getAdminNotificationHistory();
    setHistory(result);
  };

  useEffect(() => {
    let active = true;
    Promise.all([getAdminNotificationHistory(), getAdminNotificationTargets()])
      .then(([items, contentTargets]) => {
        if (!active) return;
        setHistory(items);
        setTargets(contentTargets);
        setState({ loading: false, saving: false, error: null, success: null });
      })
      .catch((error) => active && setState({ loading: false, saving: false, error: error.message || 'Unable to load notification management.', success: null }));
    return () => { active = false; };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: false, saving: true, error: null, success: null });
    try {
      const result = await createAdminNotification({
        ...form,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      });
      await loadHistory();
      setForm({ title: '', message: '', notificationType: 'NEW_CONTENT', audience: 'ALL', actionUrl: '', expiresAt: '' });
      setState({ loading: false, saving: false, error: null, success: `Notification sent to ${result.recipient_count} eligible users.` });
    } catch (error) {
      setState({ loading: false, saving: false, error: error.message || 'Unable to create notification.', success: null });
    }
  };

  const contentDestinations = [
    ...targets.studyMaterials.map((item) => ({ value: `/study-materials/${item.slug}`, label: `Study material · ${item.title}`, premium: item.is_premium })),
    ...targets.currentAffairs.map((item) => ({ value: `/current-affairs/${item.slug}`, label: `Current affairs · ${item.title}`, premium: false })),
    ...targets.issbModules.map((item) => ({ value: `/issb/${item.slug}`, label: `ISSB · ${item.title}`, premium: false })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-[10px] font-mono uppercase text-emerald-400">Primary administrator</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-100">Notification management</h1>
        <p className="mt-1 text-xs text-slate-400">Send a database-backed notice to a subscription audience.</p>
      </div>

      {state.error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200">{state.error}</p>}
      {state.success && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200">{state.success}</p>}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-xs text-slate-400">Title
            <input required maxLength={120} value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
          </label>
          <label className="space-y-1 text-xs text-slate-400">Type
            <select value={form.notificationType} onChange={(event) => setForm((previous) => ({ ...previous, notificationType: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100">
              <option value="NEW_CONTENT">New content</option>
              <option value="MOCK_TEST_AVAILABLE">Mock test available</option>
              <option value="SYSTEM">System announcement</option>
              <option value="ACCOUNT">Account</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400 md:col-span-2">Message
            <textarea required maxLength={600} rows={3} value={form.message} onChange={(event) => setForm((previous) => ({ ...previous, message: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
          </label>
          <label className="space-y-1 text-xs text-slate-400">Audience
            <select value={form.audience} onChange={(event) => setForm((previous) => ({ ...previous, audience: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100">
              <option value="ALL">All users</option>
              <option value="FREE">Free users</option>
              <option value="PRO">Pro users</option>
              <option value="PREMIUM">Premium users</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">Link to a page or published content
            <select value={form.actionUrl} onChange={(event) => setForm((previous) => ({ ...previous, actionUrl: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100">
              <option value="">No action link</option>
              <optgroup label="Platform pages">
                <option value="/study-materials">Study materials</option>
                <option value="/current-affairs">Current affairs</option>
                <option value="/issb">ISSB preparation</option>
                <option value="/mock-tests">Mock tests</option>
                <option value="/practice">Practice</option>
                <option value="/pricing">Pricing</option>
              </optgroup>
              {contentDestinations.length > 0 && <optgroup label="Published content">{contentDestinations.map((item) => <option key={item.value} value={item.value}>{item.label}{item.premium ? ' · Premium' : ''}</option>)}</optgroup>}
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-400">Expiration (optional)
            <input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((previous) => ({ ...previous, expiresAt: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100" />
          </label>
          <div className="flex items-end md:col-span-2">
            <button type="submit" disabled={state.saving || state.loading} className="rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">{state.saving ? 'Sending…' : 'Send notification'}</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3"><h2 className="text-base font-semibold text-slate-100">Notification history</h2><span className="text-[10px] text-slate-500">Latest 100 campaigns</span></div>
        {state.loading ? <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">Loading history…</p> : history.length ? (
          <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            {history.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-100">{item.title}</h3><span className="rounded bg-slate-800 px-2 py-1 text-[9px] font-mono uppercase text-slate-300">{item.notification_type}</span><span className="text-[10px] text-slate-500">{item.audience}</span></div><p className="mt-1 break-words text-xs text-slate-400">{item.message}</p><p className="mt-2 text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString()} · {item.recipient_count} recipients · {item.unread_count} unread{item.expires_at ? ` · expires ${new Date(item.expires_at).toLocaleString()}` : ''}</p></div>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No admin notifications have been sent.</p>}
      </section>
    </div>
  );
}