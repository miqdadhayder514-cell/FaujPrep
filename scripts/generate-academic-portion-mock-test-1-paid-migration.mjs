import { readFile, writeFile } from 'node:fs/promises';

const testSlug = 'academic-portion-mock-test-1';
const testTitle = 'Academic Portion Mock Test 1';
const testTwoSlug = 'pma-long-course-159-non-verbal-intelligence-test-2';
const questions = JSON.parse(await readFile(new URL('../src/data/academicPortionMockTest1.json', import.meta.url), 'utf8'));
let migration = await readFile(new URL('../supabase/migrations/035_add_non_verbal_intelligence_test_2.sql', import.meta.url), 'utf8');

if (questions.length !== 100 || questions.some((question) => !question.correct_option || !question.explanation)) {
  throw new Error('Academic Portion Mock Test 1 must contain 100 questions with answers and explanations.');
}

const encodedQuestions = Buffer.from(JSON.stringify(questions), 'utf8').toString('base64');
const replaceExactly = (source, before, after, expectedCount = 1) => {
  const actualCount = source.split(before).length - 1;
  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} occurrences of ${before}, found ${actualCount}.`);
  }
  return source.replaceAll(before, after);
};

migration = replaceExactly(
  migration,
  `    '${testTwoSlug}'`,
  `    '${testTwoSlug}',\n    '${testSlug}'`,
  3,
);
migration = replaceExactly(
  migration,
  `    or (test_slug = '${testTwoSlug}' and amount_pkr = 49)`,
  `    or (test_slug = '${testTwoSlug}' and amount_pkr = 49)\n    or (test_slug = '${testSlug}' and amount_pkr = 30)`,
);
migration = replaceExactly(
  migration,
  `        when '${testTwoSlug}' then 'Non-Verbal Intelligence Test 2 (Most Repeated Questions)'`,
  `        when '${testTwoSlug}' then 'Non-Verbal Intelligence Test 2 (Most Repeated Questions)'\n        when '${testSlug}' then '${testTitle}'`,
  2,
);
migration = replaceExactly(
  migration,
  `    when '${testTwoSlug}' then 49`,
  `    when '${testTwoSlug}' then 49\n    when '${testSlug}' then 30`,
);

const bankInsertPrefix = `insert into public.paid_mock_test_question_banks (test_slug, questions)\nvalues ('${testTwoSlug}', convert_from(decode('`;
const bankInsertStart = migration.indexOf(bankInsertPrefix);
if (bankInsertStart === -1) throw new Error('Could not find the Test 2 question-bank seed in migration 035.');
const bankInsertEndMarker = "on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();";
const bankInsertEnd = migration.indexOf(bankInsertEndMarker, bankInsertStart);
if (bankInsertEnd === -1) throw new Error('Could not find the end of the Test 2 question-bank seed in migration 035.');
const bankInsertEndWithStatement = bankInsertEnd + bankInsertEndMarker.length;
migration = `${migration.slice(0, bankInsertEndWithStatement)}

insert into public.paid_mock_test_question_banks (test_slug, questions)
values ('${testSlug}', convert_from(decode('${encodedQuestions}', 'base64'), 'UTF8')::jsonb)
on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();${migration.slice(bankInsertEndWithStatement)}`;

await writeFile(new URL('../supabase/migrations/036_add_paid_academic_portion_mock_test_1.sql', import.meta.url), migration);