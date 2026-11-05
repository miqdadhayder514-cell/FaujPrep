import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PAID_NOTE_PRODUCTS } from '../src/data/paidNotes.js';

const migration = await readFile(new URL('../supabase/migrations/039_paid_note_downloads.sql', import.meta.url), 'utf8');
const lc160Migration = await readFile(new URL('../supabase/migrations/057_paid_pma_lc160_preparation_notes.sql', import.meta.url), 'utf8');
const lc160ContentMigration = await readFile(new URL('../supabase/migrations/058_pma_lc160_notes_in_database.sql', import.meta.url), 'utf8');
const interviewMigration = await readFile(new URL('../supabase/migrations/042_paid_interview_preparation_pdf.sql', import.meta.url), 'utf8');
const doubleExtensionMigration = await readFile(new URL('../supabase/migrations/043_paid_interview_pdf_double_extension.sql', import.meta.url), 'utf8');
const ebookMigration = await readFile(new URL('../supabase/migrations/062_pma_lc160_preparation_ebook.sql', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const subscriptionsSource = await readFile(new URL('../src/lib/subscriptions.js', import.meta.url), 'utf8');

test('existing paid notes retain their products and prices', () => {
  const pmaNotes = PAID_NOTE_PRODUCTS.filter((product) => !product.interviewResource && !product.collection && !product.isEbook);
  const interviewNotes = PAID_NOTE_PRODUCTS.filter((product) => product.interviewResource);
  assert.equal(pmaNotes.length, 4);
  assert.ok(pmaNotes.every((product) => product.pricePkr === 30 && product.isNote));
  assert.equal(interviewNotes.length, 1);
  assert.equal(interviewNotes[0].pricePkr, 150);
  assert.ok(PAID_NOTE_PRODUCTS.every((product) => product.isNote));
  assert.equal(new Set(PAID_NOTE_PRODUCTS.map((product) => product.id)).size, 16);
});

test('PMA LC 160 e-book is listed at PKR 350 and only approved purchases unlock the private PDF', async () => {
  const product = PAID_NOTE_PRODUCTS.find((item) => item.isEbook);
  assert.ok(product);
  assert.equal(product.id, 'pma-lc160-preparation-book');
  assert.equal(product.pricePkr, 350);
  assert.equal(product.sourceFile, 'PMA Long Course 160 Preparation.pdf');
  assert.equal(product.downloadPath, 'pma-lc160-preparation-book.pdf');
  assert.ok(product.coverImage);
  const pdf = await readFile(new URL(`../../e-books/${product.sourceFile}`, import.meta.url));
  assert.match(pdf.toString('ascii', 0, 8), /^%PDF-1\./);
  assert.match(appSource, /PAID_NOTE_PRODUCTS\.filter\(\(product\) => product\.isEbook\)/);
  assert.match(appSource, /request\?\.status === 'APPROVED'/);
  assert.match(ebookMigration, /p_ebook_slug <> 'pma-lc160-preparation-book'/);
  assert.match(ebookMigration, /amount_pkr = 350/);
  assert.match(ebookMigration, /p_object_name <> 'pma-lc160-preparation-book\.pdf'/);
  assert.match(ebookMigration, /purchase\.test_slug = 'pma-lc160-preparation-book' and p_object_name = 'pma-lc160-preparation-book\.pdf'/);
  assert.match(subscriptionsSource, /submit_paid_ebook_payment_proof/);
  assert.match(subscriptionsSource, /get_admin_ebook_purchase_queue/);
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
  for (const product of PAID_NOTE_PRODUCTS.filter((item) => !item.interviewResource && !item.collection && !item.isEbook)) {
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

test('LC 160 note text is seeded by migration and retrieved through purchase-gated RPC', async () => {
  assert.match(lc160ContentMigration, /create table if not exists public\.paid_note_contents/);
  assert.match(lc160ContentMigration, /alter table public\.paid_note_contents enable row level security/);
  assert.match(lc160ContentMigration, /revoke all on table public\.paid_note_contents from public, anon, authenticated/);
  assert.match(lc160ContentMigration, /create or replace function public\.get_paid_note_content/);
  assert.match(lc160ContentMigration, /purchase\.status = 'APPROVED'/);
  assert.match(lc160ContentMigration, /active Pro plan/);
  assert.match(lc160ContentMigration, /p_note_slug is null or p_note_slug not in/);
  assert.match(lc160ContentMigration, /grant execute on function public\.get_paid_note_content\(text\) to authenticated/);
  assert.doesNotMatch(lc160ContentMigration, /storage\.objects|create policy/i);
  assert.match(subscriptionsSource, /rpc\('get_paid_note_content'/);
  assert.match(appSource, /getPaidNoteContent\(product\.id\)/);
  assert.match(appSource, /renderPaidNoteMarkdown\(paidNoteViewerState\.content\)/);

  for (const product of PAID_NOTE_PRODUCTS.filter((item) => item.collection === 'pma-lc160')) {
    const markdownPath = new URL(`../notes/pma-lc160/${product.sourceFile.replace(/\.pdf$/i, '.md')}`, import.meta.url);
    const markdown = await readFile(markdownPath, 'utf8');
    assert.ok(lc160ContentMigration.includes(Buffer.from(markdown, 'utf8').toString('base64')));
  }
});