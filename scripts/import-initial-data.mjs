import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const envPath = resolve(root, '.env.import.local');
if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const importEmail = process.env.IMPORT_USER_EMAIL?.trim().toLowerCase();

if (!supabaseUrl || !serviceKey || !importEmail || supabaseUrl.includes('SEU-PROJETO') || serviceKey.includes('COLE_SUA')) {
  console.error('\nConfiguração incompleta. Copie .env.import.example para .env.import.local e preencha as três variáveis.');
  process.exit(1);
}

const seedPath = resolve(root, 'data/initialSeed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function stableUuid(value) {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function norm(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en-US');
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (users.length < 1000) break;
  }
  return null;
}

async function insertInBatches(table, rows) {
  const batchSize = 150;
  let inserted = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`Falha ao importar em ${table}: ${error.message}`);
    inserted += batch.length;
    console.log(`  ${table}: ${inserted}/${rows.length}`);
  }
}

async function main() {
  console.log(`Procurando a conta ${importEmail}…`);
  const user = await findUserByEmail(importEmail);
  if (!user) {
    throw new Error('Conta não encontrada. Primeiro crie a conta no EuFluente e confirme o e-mail, se a confirmação estiver habilitada.');
  }

  const [{ data: existingVocabulary, error: existingVocabularyError }, { data: existingContents, error: existingContentsError }] = await Promise.all([
    supabase.from('vocabulary_items').select('section_key, word').eq('user_id', user.id),
    supabase.from('learning_contents').select('title').eq('user_id', user.id),
  ]);
  if (existingVocabularyError) throw existingVocabularyError;
  if (existingContentsError) throw existingContentsError;

  const existingWordKeys = new Set((existingVocabulary ?? []).map((item) => `${item.section_key}:${norm(item.word)}`));
  const existingContentTitles = new Set((existingContents ?? []).map((item) => norm(item.title)));

  const vocabularyToInsert = seed.vocabulary
    .filter((item) => !existingWordKeys.has(`${item.section_key}:${norm(item.word)}`))
    .map((item) => ({
      ...item,
      id: stableUuid(`${user.id}|${item.section_key}|${norm(item.word)}`),
      user_id: user.id,
    }));

  const contentsToInsert = seed.contents
    .filter((item) => !existingContentTitles.has(norm(item.title)))
    .map((item) => ({
      ...item,
      id: stableUuid(`${user.id}|contents|${norm(item.title)}`),
      user_id: user.id,
    }));

  console.log(`\nConta identificada. Itens de vocabulário existentes: ${existingWordKeys.size}. Conteúdos existentes: ${existingContentTitles.size}.`);
  console.log(`Novos itens a importar: ${vocabularyToInsert.length} palavras e ${contentsToInsert.length} conteúdos.`);
  console.log('A importação preserva os registros já existentes; itens duplicados serão ignorados.');

  await insertInBatches('vocabulary_items', vocabularyToInsert);
  await insertInBatches('learning_contents', contentsToInsert);

  console.log('\nImportação concluída. Abra ou atualize o EuFluente para ver a base carregada.');
}

main().catch((error) => {
  console.error(`\nErro: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
