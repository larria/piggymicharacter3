import { cardIds } from './data/cards';
import { createState, localDate, updateSettings, type State, type Word } from './domain';
export const STORAGE_KEY = 'mizhupig.expedition.v1';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 500;
function date(v: unknown): boolean { try { return typeof v === 'string' && localDate(v) === v; } catch { return false; } }
const unique = (v: unknown[]): boolean => new Set(v).size === v.length;
export function validateState(value: unknown, catalog?: Word[]): State {
 const fail = (): never => { throw new Error('备份格式无效或包含重复、异常记录，未替换当前数据'); };
 if (!object(value) || value.version !== 1 || !integer(value.revision) || !object(value.settings) || !object(value.progress) || !Array.isArray(value.logs) || !Array.isArray(value.rewards) || !Array.isArray(value.owned) || !integer(value.shells)) return fail();
 const ids = catalog ? new Set(catalog.map(w => w.id)) : null; if (catalog && ids!.size !== catalog.length) return fail(); const wordId = (v: unknown) => text(v) && (!ids || ids.has(v));
 try { const settings = value.settings; if (!['dailyGoal','newLimit','weeklyGoal','sound','music'].every(k => k in settings)) return fail(); updateSettings(createState(), settings); } catch { return fail(); }
 for (const [id,p] of Object.entries(value.progress)) { if (!wordId(id) || ['__proto__','constructor','prototype'].includes(id) || !object(p) || !integer(p.stage,0,4) || !date(p.due) || !date(p.firstSeen) || !date(p.lastStudied) || !(p.lastAdvanced === null || date(p.lastAdvanced)) || !integer(p.failures) || String(p.firstSeen) > String(p.lastStudied) || (p.lastAdvanced !== null && String(p.lastAdvanced) > String(p.lastStudied))) return fail(); }
 const logs = value.logs;
 const kinds = ['assessment','learn','review','correction'];
 for (const l of value.logs) if (!object(l) || !text(l.id) || !wordId(l.wordId) || !date(l.date) || !kinds.includes(String(l.kind)) || typeof l.correct !== 'boolean' || typeof l.hinted !== 'boolean' || typeof l.advanced !== 'boolean' || (l.advanced && (!l.correct || l.hinted || l.kind === 'correction'))) return fail();
 if (!unique(value.logs.map(l => l.id)) || !value.rewards.every(text) || !unique(value.rewards) || !value.owned.every(n => integer(n)) || !unique(value.owned)) return fail();
 if (value.session !== null) { const s = value.session; if (!object(s) || !text(s.id) || !date(s.date) || !Array.isArray(s.tasks) || !integer(s.cursor,0,s.tasks.length) || typeof s.completed !== 'boolean' || s.completed !== (s.cursor === s.tasks.length) || !Array.isArray(s.submissions) || !s.submissions.every(text) || !unique(s.submissions) || !Array.isArray(s.assessmentPassed) || !s.assessmentPassed.every(text) || !unique(s.assessmentPassed)) return fail(); for (const t of s.tasks) if (!object(t) || !text(t.id) || !wordId(t.wordId) || !kinds.includes(String(t.kind)) || !['character','word'].includes(String(t.questionKind)) || (t.pair !== undefined && !text(t.pair)) || (t.notBefore !== undefined && !integer(t.notBefore))) return fail(); if (!unique(s.tasks.map(t => t.id)) || s.submissions.some(id => !logs.some(l => l.id === id))) return fail(); }
 return JSON.parse(JSON.stringify(value)) as State;
}
// No backward compatibility for removed card slots: stale ownership is dropped on load/restore.
function pruneOwned(state: State): State { return state.owned.every(id => cardIds.has(id)) ? state : { ...state, owned: state.owned.filter(id => cardIds.has(id)) }; }
function defaultStorage(): StorageLike { if (typeof localStorage === 'undefined') throw new Error('当前环境无法使用本地存储'); return localStorage; }
export function loadState(storage: StorageLike = defaultStorage(), catalog?: Word[]): State { const raw = storage.getItem(STORAGE_KEY); return raw === null ? createState() : pruneOwned(importBackup(raw,catalog)); }
export function saveState(state: State, storage: StorageLike = defaultStorage()): State { validateState(state); const raw = storage.getItem(STORAGE_KEY); if (raw !== null) { const saved = importBackup(raw); if (saved.revision !== state.revision) throw new Error('其他标签页已更新数据，请刷新后继续；本次未覆盖保存'); } else if (state.revision !== 0) throw new Error('本地数据已被移除，请刷新后继续'); const next = { ...state, revision: state.revision + 1 }; try { storage.setItem(STORAGE_KEY,JSON.stringify(next)); } catch { throw new Error('保存失败：存储空间不足或浏览器禁止存储，请导出备份'); } return next; }
export function exportBackup(state: State): string { return JSON.stringify({ format: 'mizhupig-backup', version: 1, state: validateState(state) }, null, 2); }
export function importBackup(raw: string, catalog?: Word[]): State { if (raw.length > 10_000_000) throw new Error('备份过大'); let value: unknown; try { value = JSON.parse(raw); } catch { throw new Error('文件不是有效 JSON，未替换当前数据'); } if (object(value) && 'format' in value) { if (value.format !== 'mizhupig-backup' || value.version !== 1) throw new Error('不支持的备份版本'); value = value.state; } return validateState(value,catalog); }
export function restoreBackup(raw: string, current: State, storage: StorageLike = defaultStorage(), catalog?: Word[]): State { const imported = pruneOwned(importBackup(raw,catalog)); return saveState({ ...imported, revision: current.revision },storage); }
