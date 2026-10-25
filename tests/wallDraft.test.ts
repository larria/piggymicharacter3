import { describe, expect, it } from 'vitest';
import { createWallDraft } from '../src/wallDraft';
import { createState, createWall, placeOnWall, updateWallItem } from '../src/domain';
import { exportBackup, loadWall, saveWall, saveState, WALL_KEY, STORAGE_KEY } from '../src/storage';

function setup() {
  const data = new Map<string,string>();
  const storage = { getItem: (key:string) => data.get(key) ?? null, setItem: (key:string,value:string) => { data.set(key,value); } };
  const state = saveState({...createState(), owned:[0]}, storage);
  const wall = saveWall(placeOnWall(createWall(),0,0,state.owned),storage,state.owned);
  const memory = createWallDraft(); memory.adopt(wall);
  const draft = updateWallItem(wall,0,0,{x:.7},state.owned);
  memory.change(draft,state);
  return {data,storage,state,wall,draft,memory};
}

describe('session-owned shared wall draft', () => {
  it('retains dirty memory across collection/parent consumers without reading disk', () => {
    const {memory,state,storage,draft}=setup();
    const collection=memory;
    const parent=memory;
    expect(parent.snapshot.current).toBe(collection.snapshot.current);
    expect(parent.dirtyRef.current).toBe(true);
    expect(parent.forBackup(state,storage)).toEqual(draft);
    expect(loadWall(storage,state.owned).walls[0].items[0].x).not.toBe(.7);
    expect(JSON.parse(exportBackup(state,parent.forBackup(state,storage))).wall.walls[0].items[0].x).toBe(.7);
  });
  it('blocks failed saving, keeps draft exportable and refuses further mutation', () => {
    const {memory,state,storage,draft}=setup();
    const denied={...storage,setItem:()=>{throw new Error('quota');}};
    expect(()=>memory.persist(state,denied)).toThrow();
    expect(memory.blockedRef.current).toBe(true);
    expect(memory.dirtyRef.current).toBe(true);
    expect(memory.forBackup(state,denied)).toEqual(draft);
    expect(memory.change(createWall(),state)).toBe(false);
    expect(memory.snapshot.current).toEqual(draft);
    expect(memory.persist(state,storage)).toBe(false);
  });
  it('never exports a fabricated empty wall when initial reading fails', () => {
    const memory=createWallDraft(),state=createState();
    const storage={getItem:()=>{throw new Error('read denied');},setItem:()=>{}};
    expect(()=>memory.reload(state,()=>true,storage)).toThrow('read denied');
    expect(memory.snapshot.current).toBeNull();
    expect(()=>memory.forBackup(state,storage)).toThrow('read denied');
    const corrupt={...storage,getItem:()=>'{invalid'};
    expect(()=>memory.forBackup(state,corrupt)).toThrow();
  });
  it('cancelled reload and restore leave dirty/blocked snapshot unchanged', () => {
    const {memory,state,storage,draft,wall}=setup(); memory.blockedRef.current=true;
    expect(memory.reload(state,()=>false,storage)).toBe(false);
    expect(memory.restore(exportBackup(state,wall),state,()=>false,storage,wall.revision)).toBeNull();
    expect(memory.snapshot.current).toEqual(draft);
    expect(memory.dirtyRef.current).toBe(true);
    expect(memory.blockedRef.current).toBe(true);
  });
  it('failed reload retains a valid dirty draft despite corrupted disk', () => {
    const {memory,state,storage,data,draft}=setup(); data.set(WALL_KEY,'{invalid');
    expect(()=>memory.reload(state,()=>true,storage)).toThrow();
    expect(memory.snapshot.current).toEqual(draft);
    expect(memory.dirtyRef.current).toBe(true);
    expect(memory.forBackup(state,storage)).toEqual(draft);
  });
  it('transaction failure rolls disk back without replacing the memory draft', () => {
    const {memory,state,storage,data,draft,wall}=setup();
    const beforeState=data.get(STORAGE_KEY),beforeWall=data.get(WALL_KEY);
    let failed=false;
    const failing={...storage,setItem:(key:string,value:string)=>{if(key===WALL_KEY&&!failed){failed=true;throw new Error('quota');}storage.setItem(key,value);}};
    expect(()=>memory.restore(exportBackup(state,wall),state,()=>true,failing,wall.revision)).toThrow('恢复失败');
    expect(memory.snapshot.current).toEqual(draft);
    expect(memory.dirtyRef.current).toBe(true);
    expect(data.get(STORAGE_KEY)).toBe(beforeState);
    expect(data.get(WALL_KEY)).toBe(beforeWall);
  });
  it('wall revision conflict blocks save and restore without overwriting either snapshot', () => {
    const {memory,state,storage,data,draft,wall}=setup();
    const newer=saveWall(wall,storage,state.owned),disk=data.get(WALL_KEY);
    expect(()=>memory.persist(state,storage)).toThrow('其他标签页');
    expect(()=>memory.restore(exportBackup(state,wall),state,()=>true,storage,wall.revision)).toThrow('其他标签页');
    expect(memory.snapshot.current).toEqual(draft);
    expect(memory.blockedRef.current).toBe(true);
    expect(data.get(WALL_KEY)).toBe(disk);
    expect(newer.revision).toBe(wall.revision+1);
  });
  it('main-state revision conflict leaves memory and disk untouched', () => {
    const {memory,state,storage,data,draft,wall}=setup();
    saveState(state,storage);const disk=data.get(STORAGE_KEY);
    expect(()=>memory.restore(exportBackup(state,wall),state,()=>true,storage,wall.revision)).toThrow('其他标签页');
    expect(data.get(STORAGE_KEY)).toBe(disk);
    expect(memory.snapshot.current).toEqual(draft);
    expect(memory.dirtyRef.current).toBe(true);
  });
  it('successful restore adopts persisted revision and clears dirty/blocked', () => {
    const {memory,state,storage,wall}=setup(); memory.blockedRef.current=true;
    const restored=memory.restore(exportBackup(state,wall),state,()=>true,storage,wall.revision)!;
    expect(memory.snapshot.current).toEqual(loadWall(storage,restored.owned));
    expect(memory.snapshot.current!.walls[0].items).toEqual(wall.walls[0].items);
    expect(memory.dirtyRef.current).toBe(false);
    expect(memory.blockedRef.current).toBe(false);
  });
});
