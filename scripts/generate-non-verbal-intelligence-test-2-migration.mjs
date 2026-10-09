import { readFile, writeFile } from 'node:fs/promises';

const testSlug = 'pma-long-course-159-non-verbal-intelligence-test-2';
const testTitle = 'Non-Verbal Intelligence Test 2 (Most Repeated Questions)';
const questions = JSON.parse(await readFile(new URL('../src/data/nonVerbalIntelligenceTest2.json', import.meta.url), 'utf8'));
let migration = await readFile(new URL('../supabase/migrations/034_add_non_verbal_intelligence_test_1.sql', import.meta.url), 'utf8');

if (questions.length !== 100 || questions.some((question) => !question.explanation || !question.image_url)) {
  throw new Error('The non-verbal test bank must contain 100 illustrated questions with explanations.');
}

const testOneSlug = 'pma-long-course-159-non-verbal-intelligence-test-1';
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
  `    '${testOneSlug}'`,
  `    '${testOneSlug}',\n    '${testSlug}'`,
  3,
);
migration = replaceExactly(
  migration,
  `    or (test_slug = '${testOneSlug}' and amount_pkr = 49)`,
  `    or (test_slug = '${testOneSlug}' and amount_pkr = 49)\n    or (test_slug = '${testSlug}' and amount_pkr = 49)`,
);
migration = replaceExactly(
  migration,
  `        when '${testOneSlug}' then 'Non-Verbal Intelligence Test 1 (Most Repeated Questions)'`,
  `        when '${testOneSlug}' then 'Non-Verbal Intelligence Test 1 (Most Repeated Questions)'\n        when '${testSlug}' then '${testTitle}'`,
  2,
);
migration = replaceExactly(
  migration,
  `    when '${testOneSlug}' then 49`,
  `    when '${testOneSlug}' then 49\n    when '${testSlug}' then 49`,
);

const questionBankInsert = `insert into public.paid_mock_test_question_banks (test_slug, questions)
values ('${testOneSlug}', convert_from(decode('`;
const insertStart = migration.indexOf(questionBankInsert);
if (insertStart === -1) throw new Error('Could not find the Test 1 question-bank seed in migration 034.');
const insertEnd = migration.indexOf('on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();', insertStart);
if (insertEnd === -1) throw new Error('Could not find the end of the Test 1 question-bank seed in migration 034.');
const insertEndWithStatement = insertEnd + 'on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();'.length;
migration = `${migration.slice(0, insertEndWithStatement)}

insert into public.paid_mock_test_question_banks (test_slug, questions)
values ('${testSlug}', convert_from(decode('${encodedQuestions}', 'base64'), 'UTF8')::jsonb)
on conflict (test_slug) do update set questions = excluded.questions, updated_at = now();${migration.slice(insertEndWithStatement)}`;

await writeFile(new URL('../supabase/migrations/035_add_non_verbal_intelligence_test_2.sql', import.meta.url), migration);
