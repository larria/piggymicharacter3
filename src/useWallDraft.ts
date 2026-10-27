import { useEffect, useRef, useState } from 'react';
import { normalizeWall, type State, type WallState } from './domain';
import { loadWall, WALL_KEY } from './storage';

import { createWallDraft } from './wallDraft';

export function useWallDraft(state: State, onError: (message: string) => void) {
  const [wall, setWall] = useState<WallState | null>(null);
  const [dirty, setDirty] = useState(false), [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState('正在加载收藏墙…');
  const memoryRef = useRef<ReturnType<typeof createWallDraft> | null>(null);
  if (!memoryRef.current) memoryRef.current = createWallDraft();
  const memory = memoryRef.current;
  const { snapshot, dirtyRef, blockedRef } = memory;
  const stateRef = useRef(state); stateRef.current = state;
  const errorRef = useRef(onError); errorRef.current = onError;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const adopt = (next: WallState) => { cancel(); memory.adopt(next); setWall(next); setDirty(false); setBlocked(false); setNotice('布局已载入'); };
  const fail = (error: unknown) => { const message = error instanceof Error ? error.message : '收藏墙操作失败'; blockedRef.current = true; setBlocked(true); setNotice(`${message}。有效草稿仅保留在当前会话，刷新或关闭可能丢失；请前往爸爸空间备份与恢复。`); errorRef.current(message); };
  const persist = (): boolean => { cancel(); if (blockedRef.current || !snapshot.current) return false; if (!dirtyRef.current) { try { const s = stateRef.current; if (loadWall(undefined, s.owned, s.unlockedWallCount).revision !== snapshot.current.revision) throw new Error('另一个页面更新了收藏墙，请刷新后重试'); return true; } catch (error) { fail(error); return false; } } try { const s = stateRef.current; memory.persist(s); adopt(snapshot.current!); setNotice('布局已保存'); return true; } catch (error) { fail(error); return false; } };
  const change = (next: WallState, flush = false) => { if (blockedRef.current) return; const s = stateRef.current; memory.change(next, s); setWall(snapshot.current); setDirty(true); cancel(); timer.current = setTimeout(persist, 300); if (flush) persist(); };
  const reload = () => { if (dirtyRef.current && !window.confirm('载入最新布局将覆盖未保存草稿。请先在爸爸空间导出完整备份。确认继续？')) return; try { const s = stateRef.current; adopt(loadWall(undefined, s.owned, s.unlockedWallCount)); } catch (error) { fail(error); } };
  const forBackup = () => { const s = stateRef.current; return memory.forBackup(s); };
  useEffect(() => { reload(); const storage = (event: StorageEvent) => { if (event.key === WALL_KEY || event.key === null) { cancel(); fail(new Error('另一个页面更新了收藏墙，已暂停保存，未覆盖草稿')); } }; const hide = () => { if (document.hidden) persist(); }; window.addEventListener('storage', storage); window.addEventListener('pagehide', persist); document.addEventListener('visibilitychange', hide); return () => { persist(); cancel(); window.removeEventListener('storage', storage); window.removeEventListener('pagehide', persist); document.removeEventListener('visibilitychange', hide); }; }, []);
  useEffect(() => { if (!snapshot.current || blockedRef.current) return; const next = normalizeWall(snapshot.current, state.owned, state.unlockedWallCount); if (JSON.stringify(next.walls) !== JSON.stringify(snapshot.current.walls)) change(next, true); }, [state.owned, state.unlockedWallCount]);
  return { wall, snapshot, dirty, dirtyRef, blocked, blockedRef, loaded: wall !== null, notice, change, persist, reload, forBackup, adopt, cancel, restore: memory.restore };
}
export type WallDraftController = ReturnType<typeof useWallDraft>;
