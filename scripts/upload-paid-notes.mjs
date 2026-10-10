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
if (!serviceRoleKey.startsWith('sb_secret_')) {
  throw new Error('Use a replacement Supabase secret key beginning with sb_secret_; legacy service_role JWT keys are not supported.');
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const notesDirectory = resolve(projectRoot, 'Notes');
let lastFetchFailure = null;
const diagnosticFetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    let host = 'unknown host';
    try {
      host = new URL(typeof input === 'string' ? input : input.url).host;
    } catch {
      // Keep the diagnostic free of request headers or credential values.
    }
    const causes = [];
    let current = error;
    while (current && causes.length < 4) {
      causes.push([current.name, current.message, current.code].filter(Boolean).join(': '));
      current = current.cause;
    }
    lastFetchFailure = `request to ${host} failed (${causes.join(' <- ')})`;
    throw error;
  }
};
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  global: { fetch: diagnosticFetch },
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const product of PAID_NOTE_PRODUCTS) {
  const file = await readFile(resolve(notesDirectory, product.sourceFile));
  const { error } = await supabase.storage.from('paid-notes').upload(product.downloadPath, file, {
    cacheControl: '3600',
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) {
    const details = [
      error.message,
      error.statusCode ? `HTTP ${error.statusCode}` : null,
      error.cause?.code ? `network code ${error.cause.code}` : null,
      error.cause?.message ? `network detail ${error.cause.message}` : null,
      lastFetchFailure,
      error.error ? `server detail ${error.error}` : null,
    ].filter(Boolean).join('; ');
    throw new Error(`Unable to upload ${product.sourceFile}: ${details}`);
  }
  console.log(`Uploaded ${product.sourceFile} to paid-notes/${product.downloadPath}`);
}