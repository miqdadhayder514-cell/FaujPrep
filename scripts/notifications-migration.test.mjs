import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/016_notifications_and_study_reminders.sql', import.meta.url), 'utf8');

test('users can read only their own active notifications and only update read state', () => {
  assert.match(migration, /using \(user_id = auth\.uid\(\) and \(expires_at is null or expires_at > now\(\)\)\)/i);
  assert.match(migration, /grant update \(is_read, read_at\) on public\.notifications to authenticated/i);
  assert.match(migration, /revoke all on public\.notifications from anon, authenticated/i);
  assert.doesNotMatch(migration, /grant insert on public\.notifications to authenticated/i);
});

test('sensitive payment notifications are created from actual status transitions', () => {
  assert.match(migration, /after insert or update of status on public\.payment_transactions/i);
  assert.match(migration, /new\.payment_method is distinct from 'JAZZCASH_MANUAL'/i);
  assert.match(migration, /new\.status is distinct from old\.status and new\.status = 'APPROVED'/i);
  assert.match(migration, /new\.status is distinct from old\.status and new\.status = 'REJECTED'/i);
  assert.match(migration, /payment:' \|\| new\.id::text \|\| ':approved/i);
});

test('campaign creation is admin-only, plan-targeted, and notification routes remain internal', () => {
  const createRpc = migration.split('create or replace function public.create_admin_notification')[1]
    .split('create or replace function public.get_admin_notification_history')[0];
  assert.match(createRpc, /if not public\.is_primary_admin\(\) then/i);
  assert.match(createRpc, /p_audience not in \('ALL', 'FREE', 'PRO', 'PREMIUM'\)/i);
  assert.match(createRpc, /active_plan\.slug = lower\(p_audience\)/i);
  assert.match(createRpc, /Notification destination is not an available internal route/i);
});

test('scheduled reminder function is service-role-only and uses per-day source keys', () => {
  assert.match(migration, /study_reminder.*preferred_days/s);
  assert.match(migration, /study-reminder:' \|\| v_user\.user_id::text \|\| ':' \|\| v_local_now::date::text/i);
  assert.match(migration, /revoke all on function public\.generate_scheduled_notifications\(integer\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.generate_scheduled_notifications\(integer\) to service_role/i);
  assert.doesNotMatch(migration, /cron\.schedule/i);
});