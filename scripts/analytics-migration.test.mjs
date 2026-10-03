import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/014_analytics_events_and_admin_reporting.sql', import.meta.url), 'utf8');
const revenueFixMigration = readFileSync(new URL('../supabase/migrations/022_fix_admin_analytics_revenue.sql', import.meta.url), 'utf8');

test('analytics events cannot be read or written directly by browser roles', () => {
  assert.match(migration, /alter table public\.analytics_events enable row level security/i);
  assert.match(migration, /revoke all on public\.analytics_events from anon, authenticated/i);
  assert.doesNotMatch(migration, /create policy .*analytics_events/i);
});

test('client RPC excludes trusted payment and plan events and validates event properties', () => {
  const clientRpc = migration.split('create or replace function public.track_analytics_event')[1]
    .split('create or replace function public.is_analytics_admin')[0];
  assert.match(clientRpc, /Unsupported client analytics event/);
  assert.match(clientRpc, /Unsupported analytics property/);
  assert.match(clientRpc, /octet_length\(coalesce\(p_properties/i);
  assert.match(clientRpc, /Anonymous analytics requires a session identifier/);
  assert.match(clientRpc, /v_session_count >= 120/);
  assert.doesNotMatch(clientRpc, /'PAYMENT_APPROVED'|'PAYMENT_REJECTED'|'PLAN_UPGRADED'/);
});

test('aggregate read RPC is explicitly ADMIN-only and revenue uses approved records only', () => {
  assert.match(migration, /where id = auth\.uid\(\) and role = 'ADMIN'/i);
  assert.match(migration, /if not public\.is_analytics_admin\(\) then/i);
  assert.match(migration, /revoke all on function public\.get_admin_analytics\(text\) from public, anon/i);
  const revenueQuery = migration.split("'approved_total_pkr'")[1].split("'daily'")[0];
  assert.match(revenueQuery, /where status = 'APPROVED'/i);
  assert.doesNotMatch(revenueQuery, /'SUCCESS'|'PENDING'|'REJECTED'/i);
});

test('analytics revenue sums the derived per-plan total alias', () => {
  assert.match(revenueFixMigration, /'approved_total_pkr',\s*coalesce\(sum\(plan_totals\.total\), 0\)/i);
  assert.match(revenueFixMigration, /select coalesce\(sum\(amount_pkr\), 0\) as total from public\.payment_transactions/i);
});

test('payment outcomes are recorded by database triggers, not client insertion', () => {
  assert.match(migration, /after insert or update of status on public\.payment_transactions/i);
  assert.match(migration, /new\.status is distinct from old\.status and new\.status = 'APPROVED'/i);
  assert.match(migration, /new\.status is distinct from old\.status and new\.status = 'REJECTED'/i);
  assert.match(migration, /after insert or update of plan_id on public\.subscriptions/i);
});