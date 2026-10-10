import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3 } from '../src/data/pmaLong159AcademicPortionMockTest3.js';

const questions = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/pmaLong159AcademicPortionMockTest3.json', import.meta.url)), 'utf8'));
const migration = readFileSync(fileURLToPath(new URL('../supabase/migrations/037_add_paid_pma_lc159_academic_test_3.sql', import.meta.url)), 'utf8');
const appSource = readFileSync(fileURLToPath(new URL('../src/App.jsx', import.meta.url)), 'utf8');

const getSeededBank = (source, slug) => {
  const prefix = `('${slug}', convert_from(decode('`;
  const start = source.indexOf(prefix);
  assert.notEqual(start, -1, `Missing seeded question bank ${slug}`);
  const jsonStart = start + prefix.length;
  const end = source.indexOf("', 'base64'), 'UTF8')::jsonb)", jsonStart);
  assert.notEqual(end, -1, `Missing JSON terminator for ${slug}`);
  return JSON.parse(Buffer.from(source.slice(jsonStart, end), 'base64').toString('utf8'));
};

test('PMA Long 159 Academic Portion Mock Test 3 contains all 120 source questions', () => {
  assert.equal(PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3.title, 'PMA Long 159 Academic Portion Mock Test 3');
  assert.equal(PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3.pricePkr, 49);
  assert.equal(PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3.duration, '60 mins');
  assert.equal(PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3.durationMinutes, 60);
  assert.equal(PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3.questionsCount, 120);
  assert.equal(PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3.timed, true);
  assert.doesNotMatch(JSON.stringify(PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3), /practiceOnly/);

  assert.deepEqual(questions.map((question) => question.id), Array.from({ length: 120 }, (_, index) => index + 1));
  assert.deepEqual(
    questions.reduce((counts, question) => ({ ...counts, [question.section]: (counts[question.section] || 0) + 1 }), {}),
    { 'Pakistan Studies': 25, 'General Knowledge': 20, Islamiyat: 25, Physics: 25, English: 25 }
  );
  assert.ok(questions.every((question) => question.question_text && question.correct_option && question.explanation));
  assert.ok(questions.every((question) => ['A', 'B', 'C', 'D'].includes(question.correct_option)));
  assert.ok(questions.every((question) => [question.option_a, question.option_b, question.option_c, question.option_d].every((option) => option?.trim())));
  assert.ok(questions.every((question) => ['Easy', 'Medium', 'Hard'].includes(question.difficulty)));
  assert.equal(questions[0].question_text, 'Sir Syed Ahmad Khan founded the Muhammadan Anglo-Oriental (M.A.O.) College at Aligarh in:');
  assert.equal(questions[0].option_a, '1875');
  assert.equal(questions[0].correct_option, 'A');
});

test('the 120-question bank is protected and priced at PKR 49 in Supabase', () => {
  const slug = 'pma-long-course-159-academic-portion-mock-test-3';
  assert.deepEqual(getSeededBank(migration, slug), questions);
  assert.match(migration, /pma-long-course-159-academic-portion-mock-test-3' and amount_pkr = 49/);
  assert.match(migration, /pma-long-course-159-academic-portion-mock-test-3' then 49/);
  assert.match(migration, /pma-long-course-159-academic-portion-mock-test-3' then 'PMA Long 159 Academic Portion Mock Test 3'/);
  assert.match(migration, /purchase\.user_id = v_user_id[\s\S]*?purchase\.test_slug = p_test_slug[\s\S]*?purchase\.status = 'APPROVED'/);
  assert.match(appSource, /PMA_LONG_COURSE_159_ACADEMIC_PORTION_MOCK_TEST_3/);
  assert.match(appSource, /renderPaidTestAction\(pmaAcademicMockTest3\)/);
});