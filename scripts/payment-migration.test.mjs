import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/023_prevent_duplicate_manual_payment_rows.sql', import.meta.url), 'utf8');
const checkoutRpc = migration.split('create or replace function public.create_plan_checkout')[1]
  .split('revoke all on function public.create_plan_checkout(text)')[0];
const duplicateCleanup = migration.split('delete from public.payment_transactions placeholder')[1];

test('paid manual checkout does not create a placeholder payment transaction', () => {
  assert.doesNotMatch(checkoutRpc, /insert\s+into\s+public\.payment_transactions/i);
  assert.match(checkoutRpc, /'provider', 'JAZZCASH_MANUAL'/);
  assert.match(checkoutRpc, /'transaction_id', null/);
  assert.match(migration, /seed_free_subscription_for_user\(v_user_id\)/);
});

test('cleanup removes only pending JazzCash rows paired with submitted proof', () => {
  assert.match(duplicateCleanup, /placeholder\.payment_method = 'JAZZCASH'/);
  assert.match(duplicateCleanup, /submitted_proof\.payment_method = 'JAZZCASH_MANUAL'/);
  assert.match(duplicateCleanup, /submitted_proof\.payment_screenshot_url is not null/);
  assert.match(duplicateCleanup, /placeholder\.user_id = submitted_proof\.user_id/);
  assert.match(duplicateCleanup, /placeholder\.plan_id = submitted_proof\.plan_id/);
  assert.match(duplicateCleanup, /placeholder\.amount_pkr = submitted_proof\.amount_pkr/);
});
