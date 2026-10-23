import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { importCards, parseArgs } from './import-cards.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cards-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceDir = path.join(root, 'input');
  const cardsDir = path.join(root, 'public/cards');
  await mkdir(sourceDir, { recursive: true });
  await mkdir(cardsDir, { recursive: true });
  return { sourceDir, cardsDir, publicManifest: path.join(cardsDir, 'manifest.json'), sourceManifest: path.join(root, 'src/data/cards.json'), log: () => {} };
}
const image = (file, width = 20, height = 10) => sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).toFile(file);

test('smallest holes, deterministic source order, preservation and identical safe manifests', async t => {
  const opts = await fixture(t);
  await writeFile(path.join(opts.cardsDir, 'c0.jpg'), 'original zero');
  await writeFile(path.join(opts.cardsDir, 'c2.jpg'), 'original two');
  await image(path.join(opts.sourceDir, 'z.png'), 12, 10);
  await image(path.join(opts.sourceDir, 'a.png'), 20, 10);
  const result = await importCards(opts);
  assert.deepEqual(result.cards, [{ id: 0, file: 'c0.jpg' }, { id: 1, file: 'c1.jpg' }, { id: 2, file: 'c2.jpg' }, { id: 3, file: 'c3.jpg' }]);
  assert.equal(await readFile(path.join(opts.cardsDir, 'c0.jpg'), 'utf8'), 'original zero');
  assert.equal(await readFile(path.join(opts.cardsDir, 'c2.jpg'), 'utf8'), 'original two');
  assert.equal((await sharp(path.join(opts.cardsDir, 'c1.jpg')).metadata()).width, 20);
  assert.equal((await sharp(path.join(opts.cardsDir, 'c3.jpg')).metadata()).width, 12);
  assert.equal(await readFile(opts.publicManifest, 'utf8'), await readFile(opts.sourceManifest, 'utf8'));
  assert.equal((await readdir(opts.sourceDir)).length, 2);
  assert.ok(result.inputBytes > 0 && result.outputBytes > 0);
});

test('auto orientation, edge limit, JPEG encoding and white flattening', async t => {
  const opts = await fixture(t);
  await sharp({ create: { width: 2400, height: 1200, channels: 3, background: 'red' } }).jpeg().withMetadata({ orientation: 6 }).toFile(path.join(opts.sourceDir, 'a.jpeg'));
  await image(path.join(opts.sourceDir, 'b.png'));
  await importCards(opts);
  const meta = await sharp(path.join(opts.cardsDir, 'c0.jpg')).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, 800);
  assert.equal(meta.height, 1600);
  assert.equal(meta.orientation, undefined);
  const { data } = await sharp(path.join(opts.cardsDir, 'c1.jpg')).raw().toBuffer({ resolveWithObject: true });
  assert.ok([...data].every(channel => channel >= 254));
});

test('all documented formats accepted, unsupported files ignored', async t => {
  const opts = await fixture(t);
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tif', 'tiff']) {
    const format = ext === 'jpg' ? 'jpeg' : ext === 'tif' ? 'tiff' : ext;
    await sharp({ create: { width: 8, height: 8, channels: 3, background: 'blue' } }).toFormat(format).toFile(path.join(opts.sourceDir, `input.${ext}`));
  }
  await writeFile(path.join(opts.sourceDir, 'notes.txt'), 'ignored');
  assert.equal((await importCards(opts)).imported, 7);
});

test('invalid image aborts before any publication and preserves sources/manifests', async t => {
  const opts = await fixture(t);
  await image(path.join(opts.sourceDir, 'a.png'));
  await writeFile(path.join(opts.sourceDir, 'z.jpg'), 'invalid image');
  await writeFile(opts.publicManifest, 'old manifest');
  await assert.rejects(importCards(opts));
  assert.deepEqual(await readdir(opts.cardsDir), ['manifest.json']);
  assert.equal(await readFile(opts.publicManifest, 'utf8'), 'old manifest');
  await assert.rejects(readFile(opts.sourceManifest), { code: 'ENOENT' });
  assert.equal((await readdir(opts.sourceDir)).length, 2);
});

test('dry run converts and reports without writing; sync reflects manual deletions without deleting assets', async t => {
  const opts = await fixture(t);
  await image(path.join(opts.sourceDir, 'a.png'));
  assert.equal((await importCards({ ...opts, dryRun: true })).imported, 1);
  assert.deepEqual(await readdir(opts.cardsDir), []);
  await writeFile(path.join(opts.cardsDir, 'c8.webp'), 'existing');
  await writeFile(path.join(opts.cardsDir, 'keep.txt'), 'keep');
  await importCards({ ...opts, sourceDir: undefined, sync: true });
  assert.deepEqual(JSON.parse(await readFile(opts.sourceManifest)), [{ id: 8, file: 'c8.webp' }]);
  await rm(path.join(opts.cardsDir, 'c8.webp'));
  await importCards({ ...opts, sourceDir: undefined, sync: true });
  assert.deepEqual(JSON.parse(await readFile(opts.sourceManifest)), []);
  assert.equal(await readFile(path.join(opts.cardsDir, 'keep.txt'), 'utf8'), 'keep');
});

test('publication failure rolls back only new files and restores first manifest', async t => {
  const opts = await fixture(t);
  await image(path.join(opts.sourceDir, 'a.png'));
  await writeFile(path.join(opts.cardsDir, 'c0.jpg'), 'original');
  await writeFile(opts.publicManifest, 'previous');
  // This parent is absent during snapshot, then becomes a JPEG during publication.
  await assert.rejects(importCards({ ...opts, sourceManifest: path.join(opts.cardsDir, 'c1.jpg', 'cards.json') }));
  assert.deepEqual((await readdir(opts.cardsDir)).sort(), ['c0.jpg', 'manifest.json']);
  assert.equal(await readFile(opts.publicManifest, 'utf8'), 'previous');
});

test('rejects ambiguous IDs and invalid command arguments', async t => {
  const opts = await fixture(t);
  await writeFile(path.join(opts.cardsDir, 'c0.jpg'), 'existing');
  await writeFile(path.join(opts.cardsDir, 'c00.png'), 'duplicate');
  await assert.rejects(importCards(opts), /duplicate/);
  assert.throws(() => parseArgs(['--unknown']), /Unknown/);
  await assert.rejects(importCards({ ...opts, sourceDir: 'relative' }), /absolute/);
  await assert.rejects(importCards({ ...opts, sync: true }), /does not accept/);
});
