import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appSource = readFileSync(fileURLToPath(new URL('../src/App.jsx', import.meta.url)), 'utf8');
const paidNotesSource = readFileSync(fileURLToPath(new URL('../src/data/paidNotes.js', import.meta.url)), 'utf8');
const subscriptionsSource = readFileSync(fileURLToPath(new URL('../src/lib/subscriptions.js', import.meta.url)), 'utf8');
const migrationSource = readFileSync(fileURLToPath(new URL('../supabase/migrations/041_live_interview_video_assessment.sql', import.meta.url)), 'utf8');
const paidInterviewMigrationSource = readFileSync(fileURLToPath(new URL('../supabase/migrations/042_paid_interview_preparation_pdf.sql', import.meta.url)), 'utf8');

test('live interview includes the five prompts, instructions, and approved-payment upload flow', () => {
  for (const question of [
    'Gentleman, introduce yourself.',
    'Why do you want to join the military forces?',
    'What are your hobbies?',
    'What will you do if you are recommended?',
    'If you are not recommended, what will you do?',
  ]) {
    assert.ok(appSource.includes(question), `Missing interview question: ${question}`);
  }

  assert.match(appSource, /✨ NEW · Live Interview · PKR 250/);
  assert.match(appSource, /{isApproved && \(\s*<ol[\s\S]*?questions\.map/);
  assert.match(appSource, /PKR 250<\/span>/);
  assert.match(appSource, /face clearly visible throughout/);
  assert.match(appSource, /Pay PKR 250 for Assessment/);
  assert.match(appSource, /Your PKR 250 live interview payment must be approved before you can upload a video/);
  assert.match(appSource, /Live interview video assessments/);
  assert.match(appSource, /Save Assessment/);
});

test('live interview payments and private videos are authorization-gated in the database', () => {
  assert.match(migrationSource, /'live-interview-assessment' and amount_pkr in \(200, 250\)/);
  assert.match(migrationSource, /when 'live-interview-assessment' then 250/);
  assert.match(migrationSource, /approved PKR 250 live interview assessment purchase/);
  assert.match(migrationSource, /'live-interview-videos',[\s\S]*?false,[\s\S]*?104857600/);
  assert.match(migrationSource, /create policy candidates_upload_own_live_interview_video/);
  assert.match(migrationSource, /and public\.can_upload_live_interview_video\(\)/);
  assert.match(migrationSource, /create policy admins_read_live_interview_videos/);
  assert.match(migrationSource, /purchase\.test_slug = 'live-interview-assessment'[\s\S]*?purchase\.status = 'APPROVED'/);
  assert.match(migrationSource, /revoke all on table public\.live_interview_submissions from public, anon, authenticated/);
  assert.match(migrationSource, /revoke all on function public\.submit_live_interview_video\(text\) from public, anon/);
});

test('paid interview PDF is linked from the interview hub and requires approved payment', () => {
  assert.match(paidNotesSource, /id: 'pma-long-course-159-interview-fully-cracked'/);
  assert.match(paidNotesSource, /title: 'PMA_Long_Course_159_Interview fully Cracked'/);
  assert.match(paidNotesSource, /sourceFile: 'PMA_Long_Course_159_Interview fully Cracked\.pdf'/);
  assert.ok(existsSync(fileURLToPath(new URL('../../interview/PMA_Long_Course_159_Interview fully Cracked.pdf', import.meta.url))));
  assert.match(paidNotesSource, /downloadPath: 'pma-long-course-159-interview-fully-cracked\.pdf'/);
  assert.match(paidNotesSource, /pricePkr: 150/);
  assert.match(appSource, /Crack Interview · PKR 150/);
  assert.match(appSource, /requests\.some\(\(request\) => request\.test_slug === product\.id && request\.status === 'APPROVED'\)/);
  assert.match(appSource, /PAID_NOTE_PRODUCTS\.filter\(\(product\) => !product\.interviewResource\)/);
  assert.match(subscriptionsSource, /'pma-long-course-159-interview-fully-cracked': 'pma-long-course-159-interview-fully-cracked\.pdf'/);
  assert.match(paidInterviewMigrationSource, /test_slug = 'pma-long-course-159-interview-fully-cracked' and amount_pkr = 150/);
  assert.match(paidInterviewMigrationSource, /purchase\.test_slug = 'pma-long-course-159-interview-fully-cracked' and p_object_name = 'pma-long-course-159-interview-fully-cracked\.pdf'/);
  assert.match(paidInterviewMigrationSource, /when 'pma-long-course-159-interview-fully-cracked' then 150/);
  assert.match(paidInterviewMigrationSource, /'pma-long-course-159-interview-fully-cracked'\s*\)\s*\n\s*\), '\[\]'::jsonb\)/);
});
