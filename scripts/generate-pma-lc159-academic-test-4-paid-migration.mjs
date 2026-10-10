import { readFile, writeFile } from 'node:fs/promises';

const testSlug = 'pma-long-course-academic-portion-most-repeated-questions';
const testTitle = 'PMA Long Course Academic Portion Most Repeated Questions';
const previousSlug = 'pma-long-course-159-academic-portion-mock-test-3';
const previousTitle = 'PMA Long 159 Academic Portion Mock Test 3';
const questions = JSON.parse(await readFile(new URL('../src/data/pmaLong159AcademicPortionMockTest4.json', import.meta.url), 'utf8'));
let migration = await readFile(new URL('../supabase/migrations/037_add_paid_pma_lc159_academic_test_3.sql', import.meta.url), 'utf8');

if (questions.length !== 120 || questions.some((question) => !question.correct_option || !question.explanation)) {
  throw new Error('PMA Long Course Academic Portion Most Repeated Questions must contain 120 answered questions with explanations.');
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
  `    or (test_slug = '${previousSlug}' and amount_pkr = 49)`,
  `    or (test_slug = '${previousSlug}' and amount_pkr = 49)\n    or (test_slug = '${testSlug}' and amount_pkr = 49)`,
);
migration = replaceExactly(
  migration,
  `        when '${previousSlug}' then '${previousTitle}'`,
  `        when '${previousSlug}' then '${previousTitle}'\n        when '${testSlug}' then '${testTitle}'`,
  2,
);
migration = replaceExactly(
  migration,
  `    when '${previousSlug}' then 49`,
  `    when '${previousSlug}' then 49\n    when '${testSlug}' then 49`,
);

const bankInsertPrefix = `insert into public.paid_mock_test_question_banks (test_slug, questions)\nvalues ('${previousSlug}', convert_from(decode('`;
const bankInsertStart = migration.indexOf(bankInsertPrefix);
if (bankInsertStart === -1) throw new Error('Could not find the Mock Test 3 question-bank seed in migration 037.');
const bankInsertEndMarker = "on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();";
const bankInsertEnd = migration.indexOf(bankInsertEndMarker, bankInsertStart);
if (bankInsertEnd === -1) throw new Error('Could not find the end of the Mock Test 3 seed in migration 037.');
const bankInsertEndWithStatement = bankInsertEnd + bankInsertEndMarker.length;
migration = `${migration.slice(0, bankInsertEndWithStatement)}

insert into public.paid_mock_test_question_banks (test_slug, questions)
values ('${testSlug}', convert_from(decode('${encodedQuestions}', 'base64'), 'UTF8')::jsonb)
on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();${migration.slice(bankInsertEndWithStatement)}`;

await writeFile(new URL('../supabase/migrations/038_add_paid_academic_most_repeated_questions.sql', import.meta.url), migration);