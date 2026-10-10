import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appSource = readFileSync(fileURLToPath(new URL('../src/App.jsx', import.meta.url)), 'utf8');
const migrationSource = readFileSync(fileURLToPath(new URL('../supabase/migrations/041_live_interview_video_assessment.sql', import.meta.url)), 'utf8');

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
