import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { classifyStructure, validateGraphics, importHanzi } from '../scripts/import-hanzi.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'hanzi-import-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const reference = path.join(root, 'reference');
  await mkdir(path.join(root, 'src/data'), { recursive: true });
  await mkdir(path.join(reference, 'data/makemeahanzi'), { recursive: true });
  await writeFile(path.join(root, 'src/data/source.json'), JSON.stringify([{ character: '一', pinyin: 'untouched' }]));
  for (const file of ['practice.ts', 'catalog.ts']) await writeFile(path.join(root, 'src/data', file), '// unchanged');
  const chars = ['一', '牌', '魔'];
  const graphics = chars.map(character => ({ character, strokes: ['M 0 0 L 1 1'], medians: [[[0, 0], [1, 1]]] }));
  await writeFile(path.join(reference, 'data/makemeahanzi/graphics.txt'), graphics.map(JSON.stringify).join('\n'));
  await writeFile(path.join(reference, 'data/makemeahanzi/dictionary.txt'), chars.map(character => JSON.stringify({ character, radical: '一', decomposition: character === '一' ? '？' : '⿰木木' })).join('\n'));
  await writeFile(path.join(reference, 'data/字库-融合拼音笔画部首.json'), JSON.stringify(chars.map(char => ({ char, radical: '', stroke_count: 2 }))));
  return { root, reference, expectedCount: 3 };
}

test('IDS is conservative, complete and placeholder-aware', () => {
  assert.equal(classifyStructure('⿰木木'), '左右');
  assert.equal(classifyStructure('⿱⿰木木口'), '上下');
  for (const ids of ['⿰木?', '⿱木？', '一', '', null, '⿰木', '⿰木木木']) assert.equal(classifyStructure(ids), '未知');
});
test('invalid medians and empty strokes rejected', () => {
  for (const item of [{ strokes: [], medians: [] }, { strokes: ['M'], medians: [] }, { strokes: ['M'], medians: [[[0, 0], [1, NaN]]] }]) assert.throws(() => validateGraphics(item));
});
test('import filters, audits and preserves protected hashes', async t => {
  const options = await fixture(t);
  const report = await importHanzi(options);
  assert.equal(report.characterCount, 3);
  assert.equal(report.integrity.unchanged, true);
  assert.deepEqual(report.integrity.before, report.integrity.after);
  assert.equal(report.conflicts.length, 3);
  assert.equal(report.radicalFills.length, 3);
  const manifest = JSON.parse(await readFile(path.join(options.root, 'public/hanzi/manifest.json')));
  assert.equal(manifest.entries['一'].file, '4e00.json');
  const record = JSON.parse(await readFile(path.join(options.root, 'public/hanzi/4e00.json')));
  assert.equal(record.strokeCount, record.strokes.length);
  assert.equal(record.structure, '未知');
  assert.equal((await readdir(path.join(options.root, 'public/hanzi'))).length, 4);
});
test('publish failure rolls back BOTH old output and report and cleans staging', async t => {
  const options = await fixture(t);
  await importHanzi(options);
  const output = path.join(options.root, 'public/hanzi/4e00.json'), reportPath = path.join(options.root, 'reports/hanzi-import.json');
  const oldOutput = await readFile(output, 'utf8'), oldReport = await readFile(reportPath, 'utf8');
  const reportFiles = ['hanzi-resource-coverage.md', 'hanzi-resource-coverage.csv'].map(file => path.join(options.root, 'reports', file));
  const oldReports = await Promise.all(reportFiles.map(file => readFile(file, 'utf8')));
  for (const failAt of ['before-0', 'after-0', 'before-1', 'after-1', 'before-2', 'after-2', 'before-3', 'after-3']) {
    await assert.rejects(importHanzi({ ...options, failAt }), /Injected/);
    assert.equal(await readFile(output, 'utf8'), oldOutput);
    assert.equal(await readFile(reportPath, 'utf8'), oldReport);
    assert.deepEqual(await Promise.all(reportFiles.map(file => readFile(file, 'utf8'))), oldReports);
    assert.equal((await readdir(options.root)).filter(name => name.includes('staging')).length, 0);
    assert.equal((await readdir(path.join(options.root, 'public'))).filter(name => name.includes('backup')).length, 0);
  }
});
test('missing, duplicate, malformed inputs leave existing batch untouched', async t => {
  const options = await fixture(t);
  await importHanzi(options);
  const file = path.join(options.reference, 'data/makemeahanzi/graphics.txt');
  const oldInput = await readFile(file, 'utf8');
  const reportPath = path.join(options.root, 'reports/hanzi-import.json');
  const oldReport = await readFile(reportPath, 'utf8');
  for (const input of ['{broken', oldInput.split('\n').slice(1).join('\n'), oldInput + '\n' + oldInput.split('\n')[0]]) {
    await writeFile(file, input);
    await assert.rejects(importHanzi(options));
    assert.equal(await readFile(reportPath, 'utf8'), oldReport);
  }
});
