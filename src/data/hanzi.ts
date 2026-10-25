import { assetUrl } from './cards';
export interface HanziData { character: string; strokes: string[]; medians: [number, number][][]; strokeCount: number; radical: string | null; structure: string }
export function hanziUrl(character: string): string {
  if (Array.from(character).length !== 1 || !/^\p{Script=Han}$/u.test(character)) throw new Error('无效汉字');
  return assetUrl(`hanzi/${character.codePointAt(0)!.toString(16)}.json`);
}
/** Restrict SVG to numeric path commands, with finite bounded coordinates. */
export function isSafeStrokePath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length > 24000 || !/^\s*[Mm]/.test(path)) return false;
  const tokens = path.match(/[MmLlHhVvCcSsQqTtZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens || path.replace(/[MmLlHhVvCcSsQqTtZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|[\s,]/g, '') !== '') return false;
  const arity: Record<string, number> = {m:2,l:2,h:1,v:1,c:6,s:4,q:4,t:2,z:0};
  let command = '', count = 0;
  const valid = () => !!command && (arity[command] === 0 ? count === 0 : count > 0 && count % arity[command] === 0);
  for (const token of tokens) {
    if (/^[a-z]$/i.test(token)) { if (command && !valid()) return false; command = token.toLowerCase(); count = 0; }
    else { const n = Number(token); if (!command || arity[command] === 0 || !Number.isFinite(n) || n < -2048 || n > 4096) return false; count++; }
  }
  return valid();
}
export function validateHanzi(value: unknown, character: string): HanziData {
  if (!value || typeof value !== 'object') throw new Error('笔画数据无效');
  const d = value as HanziData;
  if (d.character !== character || !Array.isArray(d.strokes) || d.strokes.length < 1 || d.strokes.length > 64 || d.strokeCount !== d.strokes.length || !d.strokes.every(isSafeStrokePath) || !Array.isArray(d.medians) || d.medians.length !== d.strokes.length || !d.medians.every(line => Array.isArray(line) && line.length >= 2 && line.length <= 1000 && line.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && Number.isFinite(n) && n >= -2048 && n <= 4096))) || (d.radical !== null && (typeof d.radical !== 'string' || d.radical.length > 20)) || typeof d.structure !== 'string' || d.structure.length > 40) throw new Error('笔画数据无效');
  if (d.medians.some(line => medianLength(line) < 1)) throw new Error('笔画中线无效');
  return d;
}
export function createHanziLoader(fetcher: typeof fetch = (...args) => fetch(...args)) {
  const cache = new Map<string, Promise<HanziData | null>>();
  return (character: string): Promise<HanziData | null> => {
    let url: string; try { url = hanziUrl(character); } catch { return Promise.resolve(null); }
    const existing = cache.get(character); if (existing) return existing;
    const request = (async () => {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000);
      try { const response = await fetcher(url, {signal:controller.signal}); if (!response.ok) return null; return validateHanzi(await response.json(), character); }
      catch { return null; } finally { clearTimeout(timeout); }
    })();
    cache.set(character, request);
    void request.then(data => { if (!data && cache.get(character) === request) cache.delete(character); });
    return request;
  };
}
export const loadHanzi = createHanziLoader();
export function advanceStroke(position: number, elapsedMs: number, speed: number, count: number): number {
  const safeCount = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
  const start = Math.max(0, Math.min(safeCount, Number.isFinite(position) ? position : 0));
  return Math.min(safeCount, start + Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) * Math.max(.25, Math.min(3, Number.isFinite(speed) ? speed : 1)) / 1000);
}
export function medianPath(points: [number,number][]): string { return points.map(([x,y],i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' '); }
export function medianLength(points: [number,number][]): number { return points.slice(1).reduce((sum,p,i) => sum + Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0); }
export function strokeStep(position: number, direction: -1 | 1, count: number): number { return Math.max(0, Math.min(count, direction === 1 ? Math.floor(position) + 1 : Math.ceil(position) - 1)); }
