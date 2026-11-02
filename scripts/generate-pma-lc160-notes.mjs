import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { PAID_NOTE_PRODUCTS } from '../src/data/paidNotes.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const notesDirectory = resolve(scriptDirectory, '../notes/pma-lc160');
const outputDirectory = join(notesDirectory, 'pdfs');
const markdownFiles = (await readdir(notesDirectory))
  .filter((file) => /^\d{2}-.*\.md$/i.test(file))
  .sort();

if (markdownFiles.length !== 10) {
  throw new Error(`Expected exactly 10 PMA LC 160 notes; found ${markdownFiles.length}.`);
}

await mkdir(outputDirectory, { recursive: true });

function cleanInlineMarkdown(value) {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

for (const [index, fileName] of markdownFiles.entries()) {
  const markdown = await readFile(join(notesDirectory, fileName), 'utf8');
  const title = markdown.match(/^#\s+(.+)$/m)?.[1];
  if (!title) throw new Error(`Missing title in ${fileName}.`);

  const outputName = fileName.replace(/\.md$/i, '.pdf');
  const outputPath = join(outputDirectory, outputName);
  const document = new PDFDocument({
    autoFirstPage: true,
    margins: { top: 62, bottom: 56, left: 58, right: 58 },
    size: 'A4',
    info: {
      Title: title,
      Author: 'FaujPrep',
      Subject: 'PMA Long Course 160 preparation',
      Keywords: 'PMA, Long Course 160, preparation',
    },
  });
  const chunks = [];
  document.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolvePromise, rejectPromise) => {
    document.on('end', resolvePromise);
    document.on('error', rejectPromise);
  });

  document
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor('#0f172a')
    .text('FaujPrep', { characterSpacing: 0.4 });
  document.moveDown(0.45);
  document
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#059669')
    .text(`PMA LONG COURSE 160 PREPARATION NOTES  |  NOTE ${index + 1} OF 10`);
  document.moveDown(0.5);
  document
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#0f172a')
    .text(title, { lineGap: 3 });
  document.moveDown(0.45);
  document
    .moveTo(document.page.margins.left, document.y)
    .lineTo(document.page.width - document.page.margins.right, document.y)
    .lineWidth(1.5)
    .strokeColor('#10b981')
    .stroke();
  document.moveDown(0.85);

  const lines = markdown.split(/\r?\n/);
  let paragraph = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = cleanInlineMarkdown(paragraph.join(' '));
    document.font('Helvetica').fontSize(10.5).fillColor('#1e293b').text(text, {
      align: 'left',
      lineGap: 3,
      paragraphGap: 4,
    });
    document.moveDown(0.35);
    paragraph = [];
  };

  for (const line of lines) {
    if (/^#\s/.test(line)) {
      flushParagraph();
      continue;
    }

    if (/^##\s/.test(line)) {
      flushParagraph();
      document.moveDown(0.45);
      document
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#047857')
        .text(cleanInlineMarkdown(line.replace(/^##\s+/, '')), { lineGap: 2 });
      document.moveDown(0.25);
      continue;
    }

    if (/^###\s/.test(line)) {
      flushParagraph();
      document.moveDown(0.3);
      document
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#0f172a')
        .text(cleanInlineMarkdown(line.replace(/^###\s+/, '')));
      document.moveDown(0.15);
      continue;
    }

    const bullet = line.match(/^\s*-\s+(.+)$/);
    const numbered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      const listText = cleanInlineMarkdown((bullet || numbered)[bullet ? 1 : 2]);
      document.font('Helvetica').fontSize(10.5).fillColor('#1e293b');
      document.text(bullet ? `-  ${listText}` : `${numbered[1]}.  ${listText}`, {
        indent: bullet ? 5 : 0,
        hanging: 16,
        lineGap: 2,
        paragraphGap: 2,
      });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    paragraph.push(line.trim());
  }
  flushParagraph();

  document.end();
  await finished;
  await writeFile(outputPath, Buffer.concat(chunks));
  console.log(`Created ${outputPath}`);
}

const collectionProducts = PAID_NOTE_PRODUCTS.filter((product) => product.collection === 'pma-lc160');
if (collectionProducts.length !== markdownFiles.length) {
  throw new Error(`Expected ${markdownFiles.length} LC 160 note products; found ${collectionProducts.length}.`);
}

const sqlRows = await Promise.all(collectionProducts.map(async (product) => {
  const markdown = await readFile(join(notesDirectory, product.sourceFile.replace(/\.pdf$/i, '.md')), 'utf8');
  if (!markdown.match(/^#\s+(.+)$/m)) throw new Error(`Missing title for paid note ${product.id}.`);
  const encodedContent = Buffer.from(markdown, 'utf8').toString('base64');
  return `  ('${product.id}', '${product.title.replace(/'/g, "''")}', convert_from(decode('${encodedContent}', 'base64'), 'UTF8'))`;
}));

const noteSlugs = collectionProducts.map((product) => `'${product.id}'`).join(',\n    ');
const noteRows = sqlRows.join(',\n');
const migration = `-- Seed PMA Long Course 160 note content in Supabase so no Storage upload is required.
begin;

create table if not exists public.paid_note_contents (
  note_slug text primary key,
  title text not null,
  content_markdown text not null,
  updated_at timestamptz not null default now(),
  constraint paid_note_contents_slug_check check (note_slug in (
    ${noteSlugs}
  ))
);

alter table public.paid_note_contents enable row level security;
revoke all on table public.paid_note_contents from public, anon, authenticated;

insert into public.paid_note_contents (note_slug, title, content_markdown)
values
${noteRows}
on conflict (note_slug) do update
set title = excluded.title,
    content_markdown = excluded.content_markdown,
    updated_at = now();

create or replace function public.get_paid_note_content(p_note_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_content public.paid_note_contents%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_note_slug is null or p_note_slug not in (
    ${noteSlugs}
  ) then
    raise exception 'This paid note is not available';
  end if;
  if public.get_access_level_for_user(v_user_id) not in ('pro', 'premium')
    and not exists (
      select 1
      from public.mock_test_purchase_requests purchase
      where purchase.user_id = v_user_id
        and purchase.test_slug = p_note_slug
        and purchase.status = 'APPROVED'
    ) then
    raise exception 'An approved purchase or active Pro plan is required to view this note';
  end if;

  select * into v_content
  from public.paid_note_contents
  where note_slug = p_note_slug;
  if not found then
    raise exception 'Paid note content is not available';
  end if;

  return jsonb_build_object(
    'note_slug', v_content.note_slug,
    'title', v_content.title,
    'content_markdown', v_content.content_markdown
  );
end;
$$;

revoke all on function public.get_paid_note_content(text) from public, anon;
grant execute on function public.get_paid_note_content(text) to authenticated;

commit;
`;

const migrationPath = resolve(scriptDirectory, '../supabase/migrations/058_pma_lc160_notes_in_database.sql');
await writeFile(migrationPath, migration, 'utf8');
console.log(`Created ${migrationPath}`);
