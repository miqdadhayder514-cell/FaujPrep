import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { PAID_NOTE_PRODUCTS } from '../src/data/paidNotes.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before uploading paid notes.');
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const notesDirectory = resolve(projectRoot, 'Notes');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const product of PAID_NOTE_PRODUCTS) {
  const file = await readFile(resolve(notesDirectory, product.sourceFile));
  const { error } = await supabase.storage.from('paid-notes').upload(product.downloadPath, file, {
    cacheControl: '3600',
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw new Error(`Unable to upload ${product.sourceFile}: ${error.message}`);
  console.log(`Uploaded ${product.sourceFile} to paid-notes/${product.downloadPath}`);
}