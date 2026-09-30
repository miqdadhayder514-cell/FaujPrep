import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/015_restrict_admin_to_primary_email.sql', import.meta.url), 'utf8');

test('database admin helpers require the confirmed primary email and ADMIN profile', () => {
  assert.match(migration, /lower\(auth_user\.email\) = 'miqdadhayder514@gmail\.com'/i);
  assert.match(migration, /auth_user\.email_confirmed_at is not null/i);
  assert.match(migration, /profile\.role = 'ADMIN'/i);
  assert.match(migration, /set role = 'ADMIN'/i);
});

test('content/payment and analytics authorization delegate to the same primary-admin helper', () => {
  const adminHelpers = migration.split('create or replace function public.is_editor_or_admin')[1];
  assert.match(adminHelpers, /select public\.is_primary_admin\(\)/i);
  assert.match(adminHelpers, /create or replace function public\.is_analytics_admin[\s\S]*?select public\.is_primary_admin\(\)/i);
  assert.match(migration, /revoke all on function public\.is_editor_or_admin\(\) from public, anon/i);
  assert.match(migration, /revoke all on function public\.is_analytics_admin\(\) from public, anon/i);
});