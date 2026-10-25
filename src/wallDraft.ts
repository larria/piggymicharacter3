import { normalizeWall, type State, type WallState, type Word } from './domain';
import { loadWall, saveWall, validateWall, restoreBackup, type StorageLike } from './storage';

/** Session-owned memory, independent of collection-page mounts. No fallback on read errors. */
export function createWallDraft() {
  const snapshot = { current: null as WallState | null };
  const dirtyRef = { current: false }, blockedRef = { current: false };
  const adopt = (wall: WallState) => { snapshot.current = wall; dirtyRef.current = false; blockedRef.current = false; };
  const change = (wall: WallState, state: State) => {
    if (blockedRef.current) return false;
    snapshot.current = normalizeWall(wall, state.owned, state.unlockedWallCount);
    dirtyRef.current = true;
    return true;
  };
  const forBackup = (state: State, storage?: StorageLike) => snapshot.current
    ? validateWall(normalizeWall(snapshot.current, state.owned, state.unlockedWallCount), state.owned, state.unlockedWallCount)
    : loadWall(storage, state.owned, state.unlockedWallCount);
  const reload = (state: State, confirm: () => boolean, storage?: StorageLike) => {
    if (dirtyRef.current && !confirm()) return false;
    const next = loadWall(storage, state.owned, state.unlockedWallCount);
    adopt(next);
    return true;
  };
  const persist = (state: State, storage?: StorageLike) => {
    if (!dirtyRef.current || blockedRef.current || !snapshot.current) return false;
    try { adopt(saveWall(snapshot.current, storage, state.owned, state.unlockedWallCount)); return true; }
    catch (error) { blockedRef.current = true; throw error; }
  };
  const restore = (raw: string, state: State, confirm: () => boolean, storage: StorageLike, expectedWallRevision: number, catalog?: Word[], legacy = false) => {
    if (!confirm()) return null;
    const restored = restoreBackup(raw, state, storage, catalog, legacy, expectedWallRevision);
    adopt(loadWall(storage, restored.owned, restored.unlockedWallCount));
    return restored;
  };
  return { snapshot, dirtyRef, blockedRef, adopt, change, forBackup, reload, persist, restore };
}
