import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS } from '../src/data/pmaLongCourseAcademicPortionMostRepeatedQuestions.js';

const questions = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/pmaLong159AcademicPortionMockTest4.json', import.meta.url)), 'utf8'));
const migration = readFileSync(fileURLToPath(new URL('../supabase/migrations/038_add_paid_academic_most_repeated_questions.sql', import.meta.url)), 'utf8');
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

test('PMA Long Course Academic Portion Most Repeated Questions contains all 120 source questions', () => {
  assert.equal(PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS.title, 'PMA Long Course Academic Portion Most Repeated Questions');
  assert.equal(PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS.pricePkr, 49);
  assert.equal(PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS.duration, '55 mins');
  assert.equal(PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS.durationMinutes, 55);
  assert.equal(PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS.questionsCount, 120);
  assert.equal(PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS.timed, true);
  assert.doesNotMatch(JSON.stringify(PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS), /practiceOnly/);

  assert.deepEqual(questions.map((question) => question.id), Array.from({ length: 120 }, (_, index) => index + 1));
  assert.deepEqual(
    questions.reduce((counts, question) => ({ ...counts, [question.section]: (counts[question.section] || 0) + 1 }), {}),
    { 'Pakistan Studies': 24, 'General Knowledge': 24, Islamiyat: 24, Physics: 24, English: 24 }
  );
  assert.ok(questions.every((question) => question.question_text && question.correct_option && question.explanation));
  assert.ok(questions.every((question) => ['A', 'B', 'C', 'D'].includes(question.correct_option)));
  assert.ok(questions.every((question) => [question.option_a, question.option_b, question.option_c, question.option_d].every((option) => option?.trim())));
  assert.ok(questions.every((question) => ['Easy', 'Medium', 'Hard'].includes(question.difficulty)));
  assert.equal(questions[0].question_text, 'The Lahore (Pakistan) Resolution was passed on:');
  assert.equal(questions[0].option_c, '23 March 1940');
  assert.equal(questions[0].correct_option, 'C');
});

test('the 120-question bank is protected and priced at PKR 49 in Supabase', () => {
  const slug = 'pma-long-course-academic-portion-most-repeated-questions';
  assert.deepEqual(getSeededBank(migration, slug), questions);
  assert.match(migration, /pma-long-course-academic-portion-most-repeated-questions' and amount_pkr = 49/);
  assert.match(migration, /pma-long-course-academic-portion-most-repeated-questions' then 49/);
  assert.match(migration, /pma-long-course-academic-portion-most-repeated-questions' then 'PMA Long Course Academic Portion Most Repeated Questions'/);
  assert.match(migration, /purchase\.user_id = v_user_id[\s\S]*?purchase\.test_slug = p_test_slug[\s\S]*?purchase\.status = 'APPROVED'/);
  assert.match(appSource, /PMA_LONG_COURSE_ACADEMIC_PORTION_MOST_REPEATED_QUESTIONS/);
  assert.match(appSource, /renderPaidTestAction\(pmaMostRepeatedAcademicQuestions\)/);
});