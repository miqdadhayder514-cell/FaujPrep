import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seed = readFileSync(new URL('../supabase/migrations/018_seed_pma_400_questions.sql', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../supabase/migrations/017_pma_intelligence_question_metadata.sql', import.meta.url), 'utf8');
const questionSecurity = readFileSync(new URL('../supabase/migrations/017_pma_intelligence_question_metadata.sql', import.meta.url), 'utf8');
const lines = seed.split(/\r?\n/).filter((line) => /^\('pma-/.test(line));
const paperSlugs = [
  'pma-verbal-intelligence-test-1',
  'pma-verbal-intelligence-test-2',
  'pma-verbal-intelligence-test-3',
  'pma-non-verbal-intelligence-test-1',
  'pma-non-verbal-intelligence-test-2',
  'pma-non-verbal-intelligence-test-3',
  'pma-analogy-test',
  'pma-mathematical-series-test',
];

function parseSqlColumns(line) {
  const columns = [];
  let start = 1;
  let quote = false;
  let depth = 1;
  for (let index = 1; index < line.length; index += 1) {
    if (quote) {
      if (line[index] === "'" && line[index + 1] === "'") {
        index += 1;
      } else if (line[index] === "'") {
        quote = false;
      }
      continue;
    }
    if (line[index] === "'") {
      quote = true;
    } else if (line[index] === '(') {
      depth += 1;
    } else if (line[index] === ')') {
      depth -= 1;
      if (depth === 0) {
        columns.push(line.slice(start, index).trim());
        break;
      }
    } else if (line[index] === ',' && depth === 1) {
      columns.push(line.slice(start, index).trim());
      start = index + 1;
      if (columns.length === 12) break;
    }
  }
  return columns.map((column) => {
    if (column.startsWith("'") && column.endsWith("'")) return column.slice(1, -1).replaceAll("''", "'");
    return column;
  });
}

function parseFigureCodes(expression) {
  return [...expression.matchAll(/'([^']*)'/g)].map((match) => match[1]);
}

const knownVisualCodes = new Set([
  'circle', 'square', 'tri-up', 'tri-right', 'tri-down', 'tri-left', 'diamond',
  'small-diamond', 'pentagon', 'hexagon', 'heptagon', 'hexagon-rotated', 'small-hexagon',
  'dot-nw', 'dot-ne', 'dot-se', 'dot-sw', 'dot-center', 'dot-top', 'dot-right', 'dot-bottom', 'dot-left',
  'dot-pent-ne', 'dot-pent-se', 'dot-pent-sw', 'dot-pent-nw', 'dot-square-ne', 'dot-hex-ne', 'dot-hex-se',
  'small-circle', 'tiny-circle', 'mini-circle', 'small-square', 'small-north', 'small-east', 'small-south', 'small-west',
  'bar-h', 'bar-v', 'seg-top-h', 'seg-right-v', 'seg-bottom-h', 'seg-left-v', 'slash', 'backslash',
  'corner-nw', 'corner-ne', 'corner-se', 'corner-sw',
]);

const questions = lines.map((line) => {
  const values = parseSqlColumns(line);
  assert.ok(values.length >= 12, `Expected at least 12 string columns: ${line.slice(0, 100)}`);
  return {
    line,
    slug: values[0],
    number: Number(values[1]),
    topic: values[2],
    text: values[3],
    difficulty: values[4],
    priority: values[5],
    options: values.slice(6, 10),
    answer: values[10],
    explanation: values[11],
  };
});

const difficultyBlock = seed.match(/with difficulty_overrides\(paper_slug, question_number, difficulty\) as \(\s*values([\s\S]*?)\)\s*update pma_seed_questions/i)?.[1] || '';
const priorityBlock = seed.match(/with priority_overrides\(paper_slug, question_number, priority\) as \(\s*values([\s\S]*?)\)\s*update pma_seed_questions/i)?.[1] || '';
const difficultyOverrides = new Map([...difficultyBlock.matchAll(/\('([^']+)',\s*(\d+),\s*'(EASY|MEDIUM|HARD)'\)/g)].map((match) => [`${match[1]}:${match[2]}`, match[3]]));
const priorityOverrides = new Map([...priorityBlock.matchAll(/\('([^']+)',\s*(\d+),\s*'(HIGH|MEDIUM|LOW)'\)/g)].map((match) => [`${match[1]}:${match[2]}`, match[3]]));
assert.ok(difficultyOverrides.size > 0, 'Seed should define explicit difficulty review overrides');
assert.ok(priorityOverrides.size > 0, 'Seed should define explicit priority review overrides');
for (const question of questions) {
  const key = `${question.slug}:${question.number}`;
  question.difficulty = difficultyOverrides.get(key) || question.difficulty;
  question.priority = priorityOverrides.get(key) || question.priority;
}

assert.match(seed, /create temporary table pma_seed_questions on commit drop as/i);
assert.match(seed, /on conflict \(content_key\) where content_key is not null do update/i);
assert.match(seed, /insert into public\.mock_test_questions \(mock_test_id, question_id, question_number\)/i);
assert.match(seed, /'ORIGINAL_VARIATION'/);
assert.match(seed, /source_reference/);
assert.match(seed, /https:\/\/gotest\.com\.pk\/intelligence-test\//);
assert.match(seed, /https:\/\/studyspur\.com\/pma-long-course-158-verbal-intelligence\//);
assert.match(schema, /add column if not exists content_key text/i);
assert.match(schema, /add column if not exists priority text/i);
assert.match(schema, /add column if not exists source_type text/i);
assert.match(schema, /add column if not exists source_reference text/i);
assert.match(schema, /add column if not exists visual_data jsonb/i);
assert.doesNotMatch(questionSecurity.split('create view public.public_mock_test_questions')[1], /correct_option|explanation/i);

assert.equal(questions.length, 400, `Expected 400 seed rows, found ${questions.length}`);
assert.deepEqual([...new Set(questions.map((question) => question.slug))].sort(), [...paperSlugs].sort());

const normalizedQuestions = new Map();
const questionsByPaper = new Map();
for (const question of questions) {
  const paperQuestions = questionsByPaper.get(question.slug) || [];
  paperQuestions.push(question);
  questionsByPaper.set(question.slug, paperQuestions);

  assert.ok(Number.isInteger(question.number) && question.number >= 1 && question.number <= 50, `${question.slug} has invalid position ${question.number}`);
  assert.ok(question.text.trim(), `${question.slug} Q${question.number} is missing question text`);
  assert.ok(['EASY', 'MEDIUM', 'HARD'].includes(question.difficulty), `${question.slug} Q${question.number} has invalid difficulty`);
  assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(question.priority), `${question.slug} Q${question.number} has invalid priority`);
  assert.equal(question.options.length, 4, `${question.slug} Q${question.number} must have four options`);
  assert.equal(new Set(question.options.map((option) => option.toLowerCase().trim())).size, 4, `${question.slug} Q${question.number} has duplicate options`);
  assert.ok(['A', 'B', 'C', 'D'].includes(question.answer), `${question.slug} Q${question.number} has invalid answer`);
  assert.ok(question.explanation.trim(), `${question.slug} Q${question.number} is missing its explanation`);
  assert.doesNotMatch(question.explanation, /correct option is|revise|needs correction|not listed/i, `${question.slug} Q${question.number} contains draft explanation text`);
  assert.doesNotMatch(question.text, /question coming|lorem ipsum|TODO|placeholder/i, `${question.slug} Q${question.number} is placeholder text`);

  const normalized = question.text.toLowerCase().normalize('NFKC').replace(/[\p{P}\p{S}\s]+/gu, ' ').trim();
  const existing = normalizedQuestions.get(normalized);
  assert.equal(existing, undefined, `Normalized duplicate question text in ${question.slug} Q${question.number} and ${existing}`);
  normalizedQuestions.set(normalized, `${question.slug} Q${question.number}`);

  const visualMatch = question.line.match(/pg_temp\.pma_visual\(ARRAY\[(.*?)\],ARRAY\[(.*?)\]\)/);
  const isVisual = question.slug.startsWith('pma-non-verbal-');
  if (isVisual) {
    assert.ok(visualMatch, `${question.slug} Q${question.number} is missing visual data`);
    const promptCodes = parseFigureCodes(visualMatch[1]);
    const optionCodes = parseFigureCodes(visualMatch[2]);
    assert.equal(optionCodes.length, 4, `${question.slug} Q${question.number} needs four visual choices`);
    for (const code of [...promptCodes, ...optionCodes]) {
      for (const token of code.split('+')) {
        assert.ok(token === '?' || knownVisualCodes.has(token), `${question.slug} Q${question.number} uses unknown visual token ${token}`);
      }
    }
  } else {
    assert.match(question.line, /'null'::jsonb/, `${question.slug} Q${question.number} unexpectedly lacks or misstates visual data`);
  }
}

for (const slug of paperSlugs) {
  const paperQuestions = questionsByPaper.get(slug) || [];
  assert.equal(paperQuestions.length, 50, `${slug} must have 50 questions`);
  assert.deepEqual(paperQuestions.map((question) => question.number).sort((a, b) => a - b), Array.from({ length: 50 }, (_, index) => index + 1), `${slug} must be ordered 1 through 50`);
  assert.deepEqual(
    Object.fromEntries(['EASY', 'MEDIUM', 'HARD'].map((value) => [value, paperQuestions.filter((question) => question.difficulty === value).length])),
    { EASY: 15, MEDIUM: 25, HARD: 10 },
    `${slug} must have a balanced 15/25/10 difficulty curve`,
  );
  assert.deepEqual(
    Object.fromEntries(['HIGH', 'MEDIUM', 'LOW'].map((value) => [value, paperQuestions.filter((question) => question.priority === value).length])),
    { HIGH: 20, MEDIUM: 20, LOW: 10 },
    `${slug} must have a balanced 20/20/10 priority distribution`,
  );
}

const expectedMathAnswers = new Map([
  [1, '336'], [2, '65'], [3, '216'], [4, '2310'], [5, '49'], [6, '25'], [7, '42'], [8, '64'], [9, '30'], [10, '9'],
  [11, '39'], [12, '2520'], [13, '29'], [14, '13'], [15, '78'], [16, '37'], [17, '106'], [18, '255'], [19, '90'], [20, '67'],
  [21, '3'], [22, '191'], [23, '41'], [24, '56'], [25, '97'], [26, '41'], [27, '55'], [28, '67'], [29, '8'], [30, '53'],
  [31, '63'], [32, '26'], [33, '5040'], [34, '1'], [35, '70'], [36, '1024'], [37, '96'], [38, '50'], [39, '13'], [40, '61'],
  [41, '11'], [42, '217'], [43, '33'], [44, '75'], [45, '5'], [46, '125'], [47, '17280'], [48, '156'], [49, '123'], [50, '53'],
]);

for (const [number, expectedAnswer] of expectedMathAnswers) {
  const question = questionsByPaper.get('pma-mathematical-series-test').find((item) => item.number === number);
  assert.ok(question, `Missing mathematical series Q${number}`);
  const answerIndex = ['A', 'B', 'C', 'D'].indexOf(question.answer);
  assert.equal(question.options[answerIndex], expectedAnswer, `Mathematical series Q${number} should answer ${expectedAnswer}`);
  assert.ok(question.explanation.includes(expectedAnswer), `Mathematical series Q${number} explanation must show ${expectedAnswer}`);
}

const categoryTotals = {
  verbal: questions.filter((question) => /^pma-verbal-intelligence-test-/.test(question.slug)).length,
  nonVerbal: questions.filter((question) => /^pma-non-verbal-intelligence-test-/.test(question.slug)).length,
  analogy: questions.filter((question) => question.slug === 'pma-analogy-test').length,
  mathematicalSeries: questions.filter((question) => question.slug === 'pma-mathematical-series-test').length,
};
assert.deepEqual(categoryTotals, { verbal: 150, nonVerbal: 150, analogy: 50, mathematicalSeries: 50 });

const questionInsert = seed.match(/insert into public\.questions\s*\(([^)]*)\)\s*select/is);
assert.ok(questionInsert, 'Seed must insert into the existing questions table');
const questionColumns = new Set(questionInsert[1].split(',').map((column) => column.trim()));
for (const column of [
  'subject_id', 'topic_id', 'question_text', 'question_type', 'difficulty',
  'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'explanation',
  'source', 'source_url', 'is_verified', 'is_active', 'content_key', 'category',
  'priority', 'source_type', 'source_reference', 'visual_data',
]) {
  assert.ok(questionColumns.has(column), `Seed question insert is missing ${column}`);
}
assert.match(seed, /insert into public\.mock_test_questions\s*\(mock_test_id, question_id, question_number\)/i);
assert.match(seed, /from pma_seed_questions raw/i);
assert.match(seed, /case when raw\.visual_data = 'null'::jsonb then 'MCQ' else 'NON_VERBAL' end/i);
assert.match(seed, /nullif\(raw\.visual_data, 'null'::jsonb\)/i);
assert.match(seed, /raw\.paper_slug \|\| '-q' \|\| lpad\(raw\.question_number::text, 3, '0'\)/i);
assert.match(seed, /'ORIGINAL_VARIATION'/i);
assert.match(seed, /source_reference/i);
assert.match(seed, /on conflict \(content_key\) where content_key is not null do update/i);
assert.match(seed, /on conflict \(slug\) do update/i);
assert.match(seed, /on conflict \(subject_id, slug\) do update/i);
assert.match(seed, /insert into public\.mock_test_questions/i);
assert.match(seed, /Expected 8 PMA papers/i);
assert.match(seed, /Expected 400 unique linked PMA questions/i);
assert.match(seed, /Duplicate normalized PMA question text found/i);

for (const topic of new Set(questions.map((question) => question.topic))) {
  assert.match(seed, /select distinct topic_slug, paper_slug from pma_seed_questions/i);
}

const difficultyPriority = Object.fromEntries(paperSlugs.map((slug) => {
  const rows = questionsByPaper.get(slug);
  return [slug, {
    difficulty: Object.fromEntries(['EASY', 'MEDIUM', 'HARD'].map((value) => [value, rows.filter((question) => question.difficulty === value).length])),
    difficultyQuestionNumbers: Object.fromEntries(['EASY', 'MEDIUM', 'HARD'].map((value) => [value, rows.filter((question) => question.difficulty === value).map((question) => question.number)])),
    priority: Object.fromEntries(['HIGH', 'MEDIUM', 'LOW'].map((value) => [value, rows.filter((question) => question.priority === value).length])),
    highQuestionNumbers: rows.filter((question) => question.priority === 'HIGH').map((question) => question.number),
    lowQuestionNumbers: rows.filter((question) => question.priority === 'LOW').map((question) => question.number),
  }];
}));

console.log(JSON.stringify({ papers: paperSlugs.length, questions: questions.length, categoryTotals, normalizedTextDuplicates: 0, optionKeyAndVisualChecks: 'PASS', schemaAndSeedContracts: 'PASS', mathematicalAnswerChecks: expectedMathAnswers.size, difficultyPriority }, null, 2));