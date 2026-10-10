import { readFile, writeFile } from 'node:fs/promises';

const testSlug = 'pma-long-course-159-academic-portion-mock-test-3';
const testTitle = 'PMA Long 159 Academic Portion Mock Test 3';
const previousSlug = 'academic-portion-mock-test-1';
const questions = JSON.parse(await readFile(new URL('../src/data/pmaLong159AcademicPortionMockTest3.json', import.meta.url), 'utf8'));
let migration = await readFile(new URL('../supabase/migrations/036_add_paid_academic_portion_mock_test_1.sql', import.meta.url), 'utf8');

if (questions.length !== 120 || questions.some((question) => !question.correct_option || !question.explanation)) {
  throw new Error('PMA Long 159 Academic Portion Mock Test 3 must contain 120 answered questions with explanations.');
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
  `    '${previousSlug}'`,
  `    '${previousSlug}',\n    '${testSlug}'`,
  3,
);
migration = replaceExactly(
  migration,
  `    or (test_slug = '${previousSlug}' and amount_pkr = 30)`,
  `    or (test_slug = '${previousSlug}' and amount_pkr = 30)\n    or (test_slug = '${testSlug}' and amount_pkr = 49)`,
);
migration = replaceExactly(
  migration,
  `        when '${previousSlug}' then 'Academic Portion Mock Test 1'`,
  `        when '${previousSlug}' then 'Academic Portion Mock Test 1'\n        when '${testSlug}' then '${testTitle}'`,
  2,
);
migration = replaceExactly(
  migration,
  `    when '${previousSlug}' then 30`,
  `    when '${previousSlug}' then 30\n    when '${testSlug}' then 49`,
);

const bankInsertPrefix = `insert into public.paid_mock_test_question_banks (test_slug, questions)\nvalues ('${previousSlug}', convert_from(decode('`;
const bankInsertStart = migration.indexOf(bankInsertPrefix);
if (bankInsertStart === -1) throw new Error('Could not find the Academic Portion Mock Test 1 question-bank seed in migration 036.');
const bankInsertEndMarker = "on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();";
const bankInsertEnd = migration.indexOf(bankInsertEndMarker, bankInsertStart);
if (bankInsertEnd === -1) throw new Error('Could not find the end of the Academic Portion Mock Test 1 seed in migration 036.');
const bankInsertEndWithStatement = bankInsertEnd + bankInsertEndMarker.length;
migration = `${migration.slice(0, bankInsertEndWithStatement)}

insert into public.paid_mock_test_question_banks (test_slug, questions)
values ('${testSlug}', convert_from(decode('${encodedQuestions}', 'base64'), 'UTF8')::jsonb)
on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();${migration.slice(bankInsertEndWithStatement)}`;

await writeFile(new URL('../supabase/migrations/037_add_paid_pma_lc159_academic_test_3.sql', import.meta.url), migration);