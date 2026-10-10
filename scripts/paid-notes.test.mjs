import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PAID_NOTE_PRODUCTS } from '../src/data/paidNotes.js';

const migration = await readFile(new URL('../supabase/migrations/039_paid_note_downloads.sql', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const subscriptionsSource = await readFile(new URL('../src/lib/subscriptions.js', import.meta.url), 'utf8');

test('four PMA notes are priced individually and have source PDFs', async () => {
  assert.equal(PAID_NOTE_PRODUCTS.length, 4);
  assert.ok(PAID_NOTE_PRODUCTS.every((product) => product.pricePkr === 14 && product.isNote));
  assert.equal(new Set(PAID_NOTE_PRODUCTS.map((product) => product.id)).size, 4);
  await Promise.all(PAID_NOTE_PRODUCTS.map((product) => access(fileURLToPath(new URL(`../../Notes/${product.sourceFile}`, import.meta.url)))));
});

test('notes use the responsive Notes grid and approval-gated download actions', () => {
  assert.match(appSource, /grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(appSource, /Buy to View/);
  assert.match(appSource, /View Notes/);
  assert.doesNotMatch(appSource, /Download PDF/);
  assert.match(appSource, /paid-note-viewer/);
  assert.match(appSource, /<iframe[\s\S]*?src=\{paidNoteViewerState\.url\}/);
  assert.match(appSource, /submitPaidNotePaymentProof/);
  assert.match(appSource, /getPaidNoteDownloadUrl/);
});

test('note purchases are fixed at PKR 14 and private files require the matching approved purchase', () => {
  assert.match(migration, /amount_pkr = 14/);
  assert.match(migration, /insert into storage\.buckets[\s\S]*?'paid-notes', 'paid-notes', false/);
  assert.match(migration, /create policy paid_notes_approved_purchase_read[\s\S]*?can_download_paid_note\(storage\.objects\.name\)/);
  assert.match(migration, /function public\.can_download_paid_note[\s\S]*?security definer[\s\S]*?purchase\.status = 'APPROVED'/);
  for (const product of PAID_NOTE_PRODUCTS) {
    assert.ok(migration.includes(`purchase.test_slug = '${product.id}' and p_object_name = '${product.downloadPath}'`));
    assert.ok(migration.includes(`when '${product.id}' then '${product.title}'`));
  }
  assert.match(subscriptionsSource, /get_admin_paid_note_purchase_queue/);
  assert.match(subscriptionsSource, /\.from\('paid-notes'\)[\s\S]*?createSignedUrl\(downloadPath, 3600\)/);
  assert.doesNotMatch(subscriptionsSource, /createSignedUrl\(downloadPath, 3600, \{ download: true \}\)/);
});