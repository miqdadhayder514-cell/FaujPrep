import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrimaryAdmin, PRIMARY_ADMIN_EMAIL } from '../src/lib/adminAccess.js';

test('only the confirmed primary admin email is authorized', () => {
  assert.equal(isPrimaryAdmin({ email: PRIMARY_ADMIN_EMAIL, email_confirmed_at: '2026-01-01T00:00:00Z' }), true);
  assert.equal(isPrimaryAdmin({ email: PRIMARY_ADMIN_EMAIL.toUpperCase(), confirmed_at: '2026-01-01T00:00:00Z' }), true);
  assert.equal(isPrimaryAdmin({ email: PRIMARY_ADMIN_EMAIL }), false);
  assert.equal(isPrimaryAdmin({ email: 'someone-else@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }), false);
  assert.equal(isPrimaryAdmin(null), false);
});