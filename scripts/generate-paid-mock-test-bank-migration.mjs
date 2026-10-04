import { readFile, writeFile } from 'node:fs/promises';

const banks = [
  ['pma-long-course-159-mock-test-2', '../src/data/pmaLongCourse159MockTest2.json'],
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
console.log(`Generated ${destination.pathname}`);