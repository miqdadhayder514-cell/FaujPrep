import { readFile, writeFile } from 'node:fs/promises';

const banks = [
  ['pma-long-course-159-mock-test-2', '../src/data/pmaLongCourse159MockTest2.json'],
  ['pma-long-course-159-most-repeated-questions-bank', '../src/data/pmaLongCourse159MostRepeatedQuestionsBank.json'],
  ['academic-portion-mock-test-2', '../src/data/academicPortionMockTest2.json'],
];

const values = await Promise.all(banks.map(async ([slug, path]) => {
  const questions = JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const encoded = Buffer.from(JSON.stringify(questions), 'utf8').toString('base64');
  return `  ('${slug}', convert_from(decode('${encoded}', 'base64'), 'UTF8')::jsonb)`;
}));

const migration = `begin;\n\ninsert into public.paid_mock_test_question_banks (test_slug, questions) values\n${values.join(',\n')}\non conflict (test_slug) do update set questions = excluded.questions, updated_at = now();\n\ncommit;\n`;
const destination = new URL('../supabase/migrations/026_seed_paid_mock_test_question_banks.sql', import.meta.url);
await writeFile(destination, migration, 'utf8');
const mostRepeatedBankIndex = banks.findIndex(([slug]) => slug === 'pma-long-course-159-most-repeated-questions-bank');
const latestBankMigration = `begin;\n\nalter table public.paid_mock_test_question_banks\n  drop constraint if exists paid_mock_test_question_banks_test_slug_check;\n\nalter table public.paid_mock_test_question_banks\n  add constraint paid_mock_test_question_banks_test_slug_check\n  check (test_slug in (\n    'pma-long-course-159-mock-test-2',\n    'pma-long-course-159-most-repeated-questions-bank',\n    'academic-portion-mock-test-2'\n  ));\n\ninsert into public.paid_mock_test_question_banks (test_slug, questions) values\n${values[mostRepeatedBankIndex]}\non conflict (test_slug) do update set questions = excluded.questions, updated_at = now();\n\ncommit;\n`;
const latestBankDestination = new URL('../supabase/migrations/028_refresh_most_repeated_mock_test_question_bank.sql', import.meta.url);
await writeFile(latestBankDestination, latestBankMigration, 'utf8');
console.log(`Generated ${destination.pathname} and ${latestBankDestination.pathname}`);