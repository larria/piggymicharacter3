#!/usr/bin/env node
import { constants } from 'node:fs';
import { readdir, stat, readFile, writeFile, mkdir, mkdtemp, rm, copyFile, rename } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensions = /\.(jpe?g|png|webp|avif|tiff?)$/i;
const cardName = /^c(\d+)\.(jpe?g|png|webp|avif|tiff?)$/i;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export async function scanCards(cardsDir) {
  let files;
  try { files = await readdir(cardsDir, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const ids = new Set();
  const cards = [];
  for (const entry of files) {
    const match = cardName.exec(entry.name);
    if (!match) continue;
    if (!entry.isFile()) throw new Error(`Card is not a regular file: ${entry.name}`);
    const id = Number(match[1]);
    if (!Number.isSafeInteger(id) || ids.has(id)) throw new Error(`Invalid or duplicate card ID: ${entry.name}`);
    ids.add(id);
    cards.push({ id, file: entry.name });
  }
  return cards.sort((a, b) => a.id - b.id);
}

async function snapshot(file) {
  try { return await readFile(file); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function atomicWrite(file, contents) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = await mkdtemp(path.join(path.dirname(file), '.cards-manifest-'));
  try {
    const staged = path.join(temp, 'manifest.json');
    await writeFile(staged, contents);
    await rename(staged, file);
  } finally { await rm(temp, { recursive: true, force: true }); }
}

/** Injectable paths keep tests and automation completely separate from shipped assets. */
export async function importCards({ sourceDir, sync = false, dryRun = false,
  cardsDir = path.join(root, 'public/cards'),
  publicManifest = path.join(cardsDir, 'manifest.json'),
  sourceManifest = path.join(root, 'src/data/cards.json'),
  log = console.log } = {}) {
  if (sync && sourceDir) throw new Error('--sync does not accept an import directory');
  if (!sync && (!sourceDir || !path.isAbsolute(sourceDir))) throw new Error('Provide an absolute source directory, or use --sync');
  const existing = await scanCards(cardsDir);
  const used = new Set(existing.map(card => card.id));
  const planned = [];
  let inputBytes = 0;
  let outputBytes = 0;
  const stage = !sync ? await mkdtemp(path.join(os.tmpdir(), 'cards-import-')) : null;
  try {
    if (!sync) {
      const entries = await readdir(sourceDir, { withFileTypes: true });
      const sources = entries.filter(entry => entry.isFile() && extensions.test(entry.name)).map(entry => entry.name).sort(compare);
      let next = 0;
      for (const name of sources) {
        while (used.has(next)) next++;
        const id = next;
        used.add(id);
        const file = `c${id}.jpg`;
        const input = path.join(sourceDir, name);
        const output = path.join(stage, file);
        // Decode every supported source before publishing any image or manifest.
        await sharp(input, { failOn: 'warning' }).rotate().flatten({ background: '#ffffff' })
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 }).toFile(output);
        inputBytes += (await stat(input)).size;
        outputBytes += (await stat(output)).size;
        planned.push({ id, file });
      }
    }
    const cards = [...existing, ...planned].sort((a, b) => a.id - b.id);
    if (!dryRun) {
      const manifests = [...new Set([publicManifest, sourceManifest])];
      const backups = await Promise.all(manifests.map(snapshot));
      const published = [];
      const changed = [];
      try {
        if (planned.length) await mkdir(cardsDir, { recursive: true });
        for (const card of planned) {
          const target = path.join(cardsDir, card.file);
          await copyFile(path.join(stage, card.file), target, constants.COPYFILE_EXCL);
          published.push(target);
        }
        const json = `${JSON.stringify(cards, null, 2)}\n`;
        for (const [index, file] of manifests.entries()) {
          await atomicWrite(file, json);
          changed.push(index);
        }
      } catch (error) {
        for (const index of changed.reverse()) {
          if (backups[index] === null) await rm(manifests[index], { force: true });
          else await atomicWrite(manifests[index], backups[index]);
        }
        for (const file of published) await rm(file, { force: true });
        throw error;
      }
    }
    const savedBytes = inputBytes - outputBytes;
    const savings = inputBytes ? (savedBytes / inputBytes * 100).toFixed(1) : '0.0';
    log(`${dryRun ? 'Dry run: ' : ''}${sync ? 'Synced' : 'Imported'} ${planned.length} images; ${existing.length} existing; ${cards.length} total. Input ${inputBytes} bytes; output ${outputBytes} bytes; savings ${savedBytes} bytes (${savings}%).`);
    return { cards, imported: planned.length, inputBytes, outputBytes, savedBytes };
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
  }
}

export function parseArgs(args) {
  const result = {};
  for (const arg of args) {
    if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--sync') result.sync = true;
    else if (arg.startsWith('-') || result.sourceDir) throw new Error(`Unknown or extra argument: ${arg}`);
    else result.sourceDir = arg;
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve().then(() => importCards(parseArgs(process.argv.slice(2)))).catch(error => {
    console.error(`Card import failed: ${error.message}`);
    process.exitCode = 1;
  });
}
