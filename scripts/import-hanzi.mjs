import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, writeFile, rename, rm, lstat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const operators = { '⿰': ['左右', 2], '⿱': ['上下', 2], '⿲': ['左中右', 3], '⿳': ['上中下', 3], '⿴': ['全包围', 2], '⿵': ['上三包围', 2], '⿶': ['下三包围', 2], '⿷': ['左三包围', 2], '⿸': ['左上包围', 2], '⿹': ['右上包围', 2], '⿺': ['左下包围', 2], '⿻': ['重叠', 2] };

// IDS describes glyph composition, not an independently reviewed school taxonomy.
// Unknown placeholders anywhere, invalid trees, and bare components stay unknown.
export function classifyStructure(ids) {
  if (typeof ids !== 'string' || /[?？]/u.test(ids)) return '未知';
  const tokens = [...ids]; let index = 0;
  function consume() {
    const token = tokens[index++];
    if (!token || /\s/u.test(token)) return false;
    const arity = operators[token]?.[1] ?? 0;
    for (let child = 0; child < arity; child++) if (!consume()) return false;
    return true;
  }
  return operators[tokens[0]] && consume() && index === tokens.length ? operators[tokens[0]][0] : '未知';
}

async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function hashes(files) {
  return Object.fromEntries(await Promise.all(files.map(async file => [file, await hashFile(file)])));
}
async function filterJsonLines(file, wanted, conflicts, kind) {
  const selected = new Map();
  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let lineNumber = 0;
  try {
    for await (const line of lines) {
      lineNumber++;
      if (!line.trim()) continue;
      let item;
      try { item = JSON.parse(line); } catch { throw new Error(`${kind}: invalid JSON at line ${lineNumber}`); }
      if (!wanted.has(item.character)) continue;
      if (selected.has(item.character)) {
        conflicts.push({ character: item.character, type: `${kind}-duplicate`, line: lineNumber });
        throw new Error(`${kind}: duplicate ${item.character}`);
      }
      selected.set(item.character, item);
    }
  } finally { lines.close(); }
  return selected;
}
export function validateGraphics(item) {
  if (!item || !Array.isArray(item.strokes) || !item.strokes.length ||
      item.strokes.some(stroke => typeof stroke !== 'string' || !stroke.trim()) ||
      !Array.isArray(item.medians) || item.medians.length !== item.strokes.length ||
      item.medians.some(median => !Array.isArray(median) || median.length < 2 || median.some(point => !Array.isArray(point) || point.length !== 2 || point.some(value => !Number.isFinite(value))))) {
    throw new Error(`Invalid strokes/medians for ${item?.character ?? 'missing character'}`);
  }
}
async function exists(file) { try { await access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }

// Stage everything before publishing. If a rename or injected failure occurs,
// restore all previous targets; never leave a partially generated batch.
export async function publishBatch(targets, failAt = '') {
  const installed = [], backups = [];
  try {
    for (let i = 0; i < targets.length; i++) {
      const { staged, target } = targets[i];
      const backup = `${target}.backup-${randomUUID()}`;
      if (await exists(target)) {
        if ((await lstat(target)).isSymbolicLink()) throw new Error(`Refusing symlink target ${target}`);
        await rename(target, backup); backups.push({ target, backup });
      }
      if (failAt === `before-${i}`) throw new Error('Injected publish failure');
      await rename(staged, target); installed.push(target);
      if (failAt === `after-${i}`) throw new Error('Injected publish failure');
    }
  } catch (error) {
    for (const target of installed.reverse()) await rm(target, { recursive: true, force: true });
    for (const { target, backup } of backups.reverse()) await rename(backup, target);
    throw error;
  }
  for (const { backup } of backups) await rm(backup, { recursive: true, force: true });
}

export async function importHanzi({ root = projectRoot, reference = path.resolve(root, '../汉字学习资源'), expectedCount = 1292, failAt = '' } = {}) {
  root = path.resolve(root); reference = path.resolve(reference);
  const protectedFiles = ['source.json', 'practice.ts', 'catalog.ts'].map(file => path.join(root, 'src/data', file));
  const graphicsPath = path.join(reference, 'data/makemeahanzi/graphics.txt');
  const dictionaryPath = path.join(reference, 'data/makemeahanzi/dictionary.txt');
  const mergedPath = path.join(reference, 'data/字库-融合拼音笔画部首.json');
  const tracked = [...protectedFiles, graphicsPath, dictionaryPath, mergedPath];
  const before = await hashes(tracked);
  const source = JSON.parse(await readFile(protectedFiles[0], 'utf8'));
  const characters = [...new Set([...source.map(item => item.character), '牌', '魔'])].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  if (characters.length !== expectedCount || characters.some(char => [...char].length !== 1)) throw new Error(`Expected ${expectedCount} unique single characters, got ${characters.length}`);
  const wanted = new Set(characters), conflicts = [];
  const [graphics, dictionary] = await Promise.all([
    filterJsonLines(graphicsPath, wanted, conflicts, 'graphics'),
    filterJsonLines(dictionaryPath, wanted, conflicts, 'dictionary'),
  ]);
  const referenceItems = JSON.parse(await readFile(mergedPath, 'utf8'));
  const merged = new Map();
  for (const item of referenceItems) {
    if (!wanted.has(item.char)) continue;
    if (merged.has(item.char)) throw new Error(`Duplicate reference character ${item.char}`);
    merged.set(item.char, item);
  }
  const missing = { graphics: characters.filter(char => !graphics.has(char)), dictionary: characters.filter(char => !dictionary.has(char)), radical: [] };
  if (missing.graphics.length || missing.dictionary.length) throw new Error(`Missing source data: ${JSON.stringify(missing)}`);
  const radicalFills = [], unknownStructure = [], entries = {}, records = [];
  for (const character of characters) {
    const g = graphics.get(character), d = dictionary.get(character), r = merged.get(character);
    validateGraphics(g);
    const radical = typeof d.radical === 'string' && d.radical.trim() ? d.radical : typeof r?.radical === 'string' ? r.radical : '';
    const radicalSource = d.radical?.trim() ? 'dictionary' : radical ? 'reference' : null;
    // Audit the reference's 127 empty Unihan radicals filled by MMAH, too.
    if (!r?.radical && radical) radicalFills.push({ character, radical, source: radicalSource, reason: 'reference-radical-empty' });
    else if (radicalSource === 'reference') radicalFills.push({ character, radical, source: radicalSource, reason: 'dictionary-radical-empty' });
    if (!radical) missing.radical.push(character);
    if (r?.radical && d.radical && r.radical !== d.radical) conflicts.push({ character, type: 'radical', reference: r.radical, dictionary: d.radical, chosen: radical });
    if (r?.stroke_count != null && r.stroke_count !== g.strokes.length) conflicts.push({ character, type: 'strokeCount', reference: r.stroke_count, graphics: g.strokes.length, chosen: g.strokes.length });
    const decomposition = typeof d.decomposition === 'string' ? d.decomposition : null;
    const structure = classifyStructure(decomposition);
    if (structure === '未知') unknownStructure.push({ character, decomposition, reason: /[?？]/u.test(decomposition ?? '') ? 'placeholder' : 'no-complete-explicit-ids-tree' });
    const file = `${character.codePointAt(0).toString(16)}.json`;
    const record = { schemaVersion: 1, character, strokes: g.strokes, medians: g.medians, strokeCount: g.strokes.length, radical, structure, decomposition, source: { graphics: 'makemeahanzi', dictionary: 'makemeahanzi', radical: radicalSource, structure: structure === '未知' ? 'unknown' : 'ids' } };
    records.push(record); entries[character] = { file, strokeCount: record.strokeCount, radical, structure };
  }
  const practiceText = await readFile(protectedFiles[1], 'utf8');
  const curatedCharacters = [...new Set([...practiceText.matchAll(/\bchar\s*:\s*['"]([^'"]+)['"]/gu)].map(match => match[1]))];
  const curated = { characterCount: curatedCharacters.length, characters: curatedCharacters, missing: curatedCharacters.filter(char => !entries[char]), unknownStructure: curatedCharacters.filter(char => entries[char]?.structure === '未知') };
  const after = await hashes(tracked);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Read-only source changed during import; refusing to publish');
  const stage = path.join(root, `.hanzi-staging-${randomUUID()}`);
  const output = path.join(stage, 'hanzi');
  const report = { schemaVersion: 1, characterCount: characters.length, missing, conflicts, radicalFills, unknownStructure, curated, audio: { prerecordedAvailable: 0, prerecordedMissing: characters.length, existingTts: 'Existing browser TTS remains unchanged; prerecorded audio is not required by the current app, and browser voice availability is device-dependent.' }, selected: records.filter(item => '一丁七口水心汉国包凶区床句近同圆品树森牌魔'.includes(item.character)).map(({ strokes, medians, ...metadata }) => metadata), integrity: { algorithm: 'sha256', before, after, unchanged: true }, license: { status: 'pending-public-release-verification', note: 'Local Make Me a Hanzi license full text unavailable. No network used. See THIRD_PARTY_NOTICES.md.' } };
  try {
    await mkdir(output, { recursive: true });
    for (const record of records) await writeFile(path.join(output, entries[record.character].file), JSON.stringify(record) + '\n');
    await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ schemaVersion: 1, characterCount: characters.length, characters, entries, sourceHashes: Object.fromEntries([graphicsPath, dictionaryPath, mergedPath].map(file => [path.relative(reference, file), before[file]])) }, null, 2) + '\n');
    await writeFile(path.join(stage, 'hanzi-import.json'), JSON.stringify(report, null, 2) + '\n');
    const md = [
      '# 汉字资源覆盖报告', '',
      `覆盖 ${characters.length}/${characters.length} 字；graphics缺失 ${missing.graphics.length}，dictionary缺失 ${missing.dictionary.length}，部首缺失 ${missing.radical.length}。`, '',
      `参考空部首填补 ${radicalFills.length} 字；冲突 ${conflicts.length} 项。部首选择MMAH dictionary，缺失才使用参考；笔画数选择graphics实际路径数，不覆盖应用字库。差异不是自动判定来源错误，康熙部首与字典偏旁归类可能不同。`, '',
      `未知结构 ${unknownStructure.length} 字：问号占位或无完整明确IDS，保守保留未知，不猜独体。`, '',
      '## 未知结构完整字表', '',
      '| 字 | IDS | 原因 |', '|---|---|---|',
      ...unknownStructure.map(item => `| ${item.character} | ${item.decomposition ?? '缺失'} | ${item.reason} |`), '',
      `## ${curated.characterCount} 字精选练习覆盖`, '',
      `精选字：${curated.characters.join('、') || '无'}。`,
      `资源缺失 ${curated.missing.length}：${curated.missing.join('、') || '无'}。`,
      `结构未知 ${curated.unknownStructure.length}：${curated.unknownStructure.join('、') || '无'}。`, '',
      '## 音频与现有TTS', '',
      `此次资源没有预录音频，预录音频覆盖0/${characters.length}。现有浏览器TTS功能未改动，当前应用不要求预录音频，因此并非现有朗读功能资源缺失；设备语音包及离线可用性仍取决于浏览器。`, '',
      '## 数据保护及许可', '',
      'SHA-256前后全部相同；完整输入和source/practice/catalog哈希见hanzi-import.json。MMAH/Arphic许可全文本地缺失，公开发布前核验；本次不联网、不执行参考脚本。', '',
    ].join('\n');
    const csvEscape = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
    const csv = [['character', 'codepoint', 'graphicsAvailable', 'dictionaryAvailable', 'strokeCount', 'radical', 'radicalSource', 'referenceRadicalFilled', 'structure', 'decomposition', 'unknownReason', 'conflicts', 'curated', 'prerecordedAudioAvailable'], ...records.map(record => [record.character, record.character.codePointAt(0).toString(16), true, true, record.strokeCount, record.radical, record.source.radical, radicalFills.some(item => item.character === record.character), record.structure, record.decomposition, unknownStructure.find(item => item.character === record.character)?.reason ?? '', JSON.stringify(conflicts.filter(item => item.character === record.character)), curatedCharacters.includes(record.character), false])].map(row => row.map(csvEscape).join(',')).join('\r\n') + '\r\n';
    await writeFile(path.join(stage, 'hanzi-resource-coverage.md'), md);
    await writeFile(path.join(stage, 'hanzi-resource-coverage.csv'), csv);
    await mkdir(path.join(root, 'public'), { recursive: true });
    await mkdir(path.join(root, 'reports'), { recursive: true });
    await publishBatch([{ staged: output, target: path.join(root, 'public/hanzi') }, ...['hanzi-import.json', 'hanzi-resource-coverage.md', 'hanzi-resource-coverage.csv'].map(file => ({ staged: path.join(stage, file), target: path.join(root, 'reports', file) }))], failAt);
  } finally { await rm(stage, { recursive: true, force: true }); }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 2 && args[0] === '--reference')) throw new Error('Usage: npm run hanzi:import -- [--reference /path/to/汉字学习资源]');
  importHanzi(args.length ? { reference: args[1] } : {}).then(report => {
    console.log(`Imported ${report.characterCount} characters; missing radicals ${report.missing.radical.length}; conflicts ${report.conflicts.length}; radical fills ${report.radicalFills.length}; unknown structures ${report.unknownStructure.length}; protected hashes unchanged.`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
