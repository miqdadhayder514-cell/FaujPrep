import { useEffect, useState } from 'react';
import { getAdminAnalytics } from '../lib/analytics';

const RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const numberFormat = new Intl.NumberFormat('en-PK');
const currencyFormat = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });

function Metric({ label, value, note }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-[10px] font-mono uppercase text-slate-500">{label}</p>
      <p className="mt-2 truncate text-2xl font-bold text-slate-100">{value}</p>
      {note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

function Ranking({ title, rows = [], labelKey = 'name', countKey = 'views' }) {
  return (
    <section className="min-w-0 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {rows.length ? (
        <ol className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
          {rows.slice(0, 6).map((row, index) => (
            <li key={row.id || `${row[labelKey]}-${index}`} className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5 text-xs">
              <span className="min-w-0 truncate text-slate-300">{row[labelKey]}</span>
              <span className="shrink-0 font-mono text-emerald-400">{numberFormat.format(row[countKey] || 0)}</span>
            </li>
          ))}
        </ol>
      ) : <p className="rounded-xl border border-dashed border-slate-800 px-3 py-5 text-xs text-slate-500">No data yet.</p>}
    </section>
  );
}

function Funnel({ conversion }) {
  const steps = [
    ['Visitors', conversion.visitors],
    ['Registered', conversion.registrations],
    ['Pricing viewed', conversion.pricing_views],
    ['Checkout started', conversion.checkout_started],
    ['Payments submitted', conversion.payments_submitted],
    ['Payments approved', conversion.payments_approved],
  ];
  const maximum = Math.max(1, ...steps.map(([, value]) => Number(value || 0)));
  return (
    <div className="space-y-3">
      {steps.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[minmax(100px,140px)_1fr_auto] items-center gap-3 text-xs">
          <span className="text-slate-400">{label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(value ? 2 : 0, (Number(value || 0) / maximum) * 100)}%` }} />
          </div>
          <span className="w-12 text-right font-mono text-slate-200">{numberFormat.format(value || 0)}</span>
        </div>
      ))}
    </div>
  );
}

function DailyActivity({ rows = [] }) {
  const visibleRows = rows.slice(-30);
  const maxViews = Math.max(1, ...visibleRows.map((row) => Number(row.page_views || 0)));
  return (
    <div className="space-y-2">
      <div className="flex h-28 items-end gap-1 border-b border-slate-800 px-1" role="img" aria-label="Daily page views for up to the last 30 days">
        {visibleRows.map((row) => (
          <div key={row.date} className="group relative flex h-full min-w-1 flex-1 items-end" title={`${row.date}: ${numberFormat.format(row.page_views)} views`}>
            <div className="w-full rounded-t-sm bg-emerald-500/80" style={{ height: `${row.page_views ? Math.max(4, (Number(row.page_views) / maxViews) * 100) : 0}%` }} />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">Daily page views · up to 30 most recent days</p>
    </div>
  );
}

export default function AdminAnalyticsPanel() {
  const [range, setRange] = useState('30d');
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    getAdminAnalytics(range)
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState({ data: null, loading: false, error: error.message || 'Unable to load analytics.' }));
    return () => { active = false; };
  }, [range]);

  const data = state.data;
  const overview = data?.overview || {};
  const practice = data?.practice || {};
  const mock = data?.mock_tests || {};
  const conversion = data?.conversion || {};
  const popular = data?.popular || {};
  const revenue = data?.revenue || {};

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase text-emerald-400">Administrator workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">Platform Analytics</h1>
          <p className="mt-1 text-xs text-slate-400">Aggregated usage and verified business activity.</p>
        </div>
        <label className="flex items-center gap-3 text-xs text-slate-400">
          <span>Date range</span>
          <select value={range} onChange={(event) => setRange(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200">
            {RANGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {state.loading && <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">Loading analytics…</p>}
      {state.error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-5 text-sm text-rose-200">{state.error}</p>}
      {!state.loading && data && !data.has_data && <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-5 text-sm text-slate-300">No analytics data yet.</p>}

      {!state.loading && data?.has_data && (
        <>
          <section aria-label="Usage overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Page views" value={numberFormat.format(overview.page_views || 0)} />
            <Metric label="Unique signed-in users" value={numberFormat.format(overview.unique_authenticated_users || 0)} />
            <Metric label="Practice sessions" value={`${numberFormat.format(practice.sessions_started || 0)} / ${numberFormat.format(practice.sessions_completed || 0)}`} note="Started / completed" />
            <Metric label="Mock tests" value={`${numberFormat.format(mock.started || 0)} / ${numberFormat.format(mock.completed || 0)}`} note={`${numberFormat.format(mock.completion_rate || 0)}% completion`} />
            <Metric label="Study material views" value={numberFormat.format(overview.study_material_views || 0)} />
            <Metric label="Current-affairs views" value={numberFormat.format(overview.current_affairs_views || 0)} />
            <Metric label="ISSB resource views" value={numberFormat.format(overview.issb_views || 0)} />
            <Metric label="Pricing views" value={numberFormat.format(overview.pricing_views || 0)} />
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-100">Usage over time</h2>
            <DailyActivity rows={data.daily || []} />
          </section>

          <section className="grid gap-6 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2 xl:grid-cols-3">
            <Ranking title="Most viewed branches" rows={popular.branches} />
            <Ranking title="Most viewed study materials" rows={popular.study_materials} labelKey="title" />
            <Ranking title="Most viewed current affairs" rows={popular.current_affairs} labelKey="title" />
            <Ranking title="Most viewed ISSB modules" rows={popular.issb_modules} labelKey="title" />
            <Ranking title="Most started mock tests" rows={popular.mock_tests} labelKey="title" />
            <Ranking title="Most attempted subjects" rows={popular.subjects} countKey="attempts" />
            <Ranking title="Most attempted topics" rows={popular.topics} countKey="attempts" />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-100">Practice activity</h2>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Questions" value={numberFormat.format(practice.questions_attempted || 0)} />
                <Metric label="Correct" value={numberFormat.format(practice.correct_answers || 0)} />
                <Metric label="Incorrect" value={numberFormat.format(practice.incorrect_answers || 0)} />
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-100">Mock test performance</h2>
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Average score" value={mock.average_score == null ? '—' : numberFormat.format(mock.average_score)} />
                <Metric label="Avg. completion" value={mock.average_completion_seconds == null ? '—' : `${numberFormat.format(mock.average_completion_seconds)} sec`} />
                <Metric label="Completion rate" value={`${numberFormat.format(mock.completion_rate || 0)}%`} />
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-100">User funnel</h2>
              <Funnel conversion={conversion} />
              <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-4 text-xs">
                {['free', 'pro', 'premium'].map((plan) => (
                  <div key={plan}><p className="font-mono uppercase text-slate-500">{plan}</p><p className="mt-1 font-semibold text-slate-200">{numberFormat.format(conversion.users_by_plan?.[plan] || 0)}</p></div>
                ))}
              </div>
              {conversion.upgrades?.length > 0 && <ul className="space-y-1 text-xs text-slate-400">{conversion.upgrades.map((upgrade, index) => <li key={`${upgrade.from}-${upgrade.to}-${index}`}>{upgrade.from} → {upgrade.to}: {numberFormat.format(upgrade.count)}</li>)}</ul>}
            </div>
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div><h2 className="text-sm font-semibold text-slate-100">Approved revenue</h2><p className="mt-1 text-2xl font-bold text-emerald-400">{currencyFormat.format(revenue.approved_total_pkr || 0)}</p></div>
              {revenue.by_plan?.length ? (
                <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950 px-3">
                  {revenue.by_plan.map((row) => <li key={row.plan} className="flex justify-between gap-3 py-2.5 text-xs"><span className="uppercase text-slate-300">{row.plan}</span><span className="text-right text-slate-400">{currencyFormat.format(row.amount_pkr)} · {numberFormat.format(row.transactions)} approved</span></li>)}
                </ul>
              ) : <p className="text-xs text-slate-500">No approved payments in this range.</p>}
              <p className="text-[10px] text-slate-500">Revenue includes APPROVED transactions only.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}