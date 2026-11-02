import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

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
