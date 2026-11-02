import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PAID_NOTE_PRODUCTS } from '../src/data/paidNotes.js';

const migration = await readFile(new URL('../supabase/migrations/039_paid_note_downloads.sql', import.meta.url), 'utf8');
const lc160Migration = await readFile(new URL('../supabase/migrations/057_paid_pma_lc160_preparation_notes.sql', import.meta.url), 'utf8');
const interviewMigration = await readFile(new URL('../supabase/migrations/042_paid_interview_preparation_pdf.sql', import.meta.url), 'utf8');
const doubleExtensionMigration = await readFile(new URL('../supabase/migrations/043_paid_interview_pdf_double_extension.sql', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const subscriptionsSource = await readFile(new URL('../src/lib/subscriptions.js', import.meta.url), 'utf8');

test('existing paid notes retain their products and prices', () => {
  const pmaNotes = PAID_NOTE_PRODUCTS.filter((product) => !product.interviewResource && !product.collection);
  const interviewNotes = PAID_NOTE_PRODUCTS.filter((product) => product.interviewResource);
  assert.equal(pmaNotes.length, 4);
  assert.ok(pmaNotes.every((product) => product.pricePkr === 30 && product.isNote));
  assert.equal(interviewNotes.length, 1);
  assert.equal(interviewNotes[0].pricePkr, 150);
  assert.ok(PAID_NOTE_PRODUCTS.every((product) => product.isNote));
  assert.equal(new Set(PAID_NOTE_PRODUCTS.map((product) => product.id)).size, 15);
});

test('ten researched LC 160 guides cover the requested sections and generate private PDFs', async () => {
  const products = PAID_NOTE_PRODUCTS.filter((product) => product.collection === 'pma-lc160');
  assert.equal(products.length, 10);
  assert.deepEqual(
    products.reduce((counts, product) => ({ ...counts, [product.category]: (counts[product.category] || 0) + 1 }), {}),
    { 'Initial Test': 2, 'Initial Interview': 3, 'ISSB Preparation': 3, 'Physical Test': 2 },
  );
  for (const product of products) {
    assert.equal(product.pricePkr, 30);
    const markdownName = product.sourceFile.replace(/\.pdf$/i, '.md');
    const markdown = await readFile(new URL(`../notes/pma-lc160/${markdownName}`, import.meta.url), 'utf8');
    const pdf = await readFile(new URL(`../notes/pma-lc160/pdfs/${product.sourceFile}`, import.meta.url));
    assert.match(markdown, /^# .+/);
    assert.match(markdown, /## Research basis/);
    if (product.category === 'Initial Test') {
      assert.match(markdown, /## Worked question-solving tricks|## Example:/);
      assert.match(markdown, /Example:/);
    }
    if (product.category === 'Initial Interview') {
      assert.match(markdown, /## A sample introduction|## Counter-question practice|## Example: handle an opinion/);
    }
    if (product.category === 'ISSB Preparation') {
      assert.match(markdown, /## Worked planning example|## Worked situation example|## Example: prepare for the counter-question chain/);
    }
    if (product.category === 'Physical Test') {
      assert.match(markdown, /## Example beginner week|## Turn a confirmed run target into a pace/);
    }
    assert.match(pdf.toString('ascii', 0, 8), /^%PDF-/);
  }
});

test('paid-note uploader can target the interview PDF in its interview folder', async () => {
  const uploaderSource = await readFile(new URL('./upload-paid-notes.mjs', import.meta.url), 'utf8');
  assert.match(uploaderSource, /--product=/);
  assert.match(uploaderSource, /--collection=/);
  assert.match(uploaderSource, /product\.sourceDirectory \|\| 'Notes'/);
  assert.match(uploaderSource, /resolve\(projectRoot, sourceDirectory, product\.sourceFile\)/);
});

test('notes use the responsive Notes grid and approval-gated download actions', () => {
  assert.match(appSource, /grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(appSource, /Buy to View/);
  assert.match(appSource, /View Notes/);
  assert.doesNotMatch(appSource, /Download PDF/);
  assert.match(appSource, /paid-note-viewer/);
  assert.match(appSource, /<iframe[\s\S]*?src=\{paidNoteViewerState\.url\}/);
  assert.match(appSource, /submitPaidNotePaymentProof/);
  assert.match(appSource, /getPaidNoteViewerUrl/);
  assert.match(appSource, /no notes can guarantee selection/);
});

test('note purchases are fixed at PKR 14 and private files require the matching approved purchase', () => {
  assert.match(migration, /amount_pkr = 14/);
  assert.match(migration, /insert into storage\.buckets[\s\S]*?'paid-notes', 'paid-notes', false/);
  assert.match(migration, /create policy paid_notes_approved_purchase_read[\s\S]*?can_download_paid_note\(storage\.objects\.name\)/);
  assert.match(migration, /function public\.can_download_paid_note[\s\S]*?security definer[\s\S]*?purchase\.status = 'APPROVED'/);
  for (const product of PAID_NOTE_PRODUCTS.filter((item) => !item.interviewResource && !item.collection)) {
    assert.ok(migration.includes(`purchase.test_slug = '${product.id}' and p_object_name = '${product.downloadPath}'`));
    assert.ok(migration.includes(`when '${product.id}' then '${product.title}'`));
  }
  const interviewProduct = PAID_NOTE_PRODUCTS.find((item) => item.interviewResource);
  assert.ok(doubleExtensionMigration.includes(`purchase.test_slug = '${interviewProduct.id}'`));
  assert.ok(doubleExtensionMigration.includes(interviewProduct.downloadPath));
  assert.ok(interviewMigration.includes(`when '${interviewProduct.id}' then '${interviewProduct.title}'`));
  assert.match(subscriptionsSource, /get_admin_paid_note_purchase_queue/);
  assert.match(subscriptionsSource, /\.from\('paid-notes'\)\.download\(downloadPath\)/);
  assert.match(subscriptionsSource, /URL\.createObjectURL\(data\)/);
  assert.match(appSource, /PDF is not available yet/);
});

test('LC 160 notes use PKR 30 purchase validation and approved-purchase storage access', () => {
  for (const product of PAID_NOTE_PRODUCTS.filter((item) => item.collection === 'pma-lc160')) {
    assert.ok(lc160Migration.includes(`'${product.id}'`));
    assert.ok(lc160Migration.includes(`purchase.test_slug = '${product.id}' and p_object_name = '${product.downloadPath}'`));
    assert.ok(lc160Migration.includes(`when '${product.id}' then '${product.title}'`));
    assert.ok(subscriptionsSource.includes(`'${product.id}': '${product.downloadPath}'`));
  }
  assert.match(lc160Migration, /when p_note_slug like 'pma-lc160-%' then 30/);
  assert.match(lc160Migration, /and amount_pkr = 30/);
  assert.match(lc160Migration, /purchase\.status = 'APPROVED'/);
});