import {describe,it,expect} from 'vitest';
import {createState,setAvatar} from '../src/domain';
import {cards} from '../src/data/cards';
import {cropGeometry,isAvatarDataUrl} from '../src/avatarCrop';
import {validateState,saveState,loadState,exportBackup,importBackup,STORAGE_KEY,type StorageLike} from '../src/storage';
const jpeg=(w=256,h=256)=>'data:image/jpeg;base64,'+btoa(String.fromCharCode(255,216,255,192,0,8,8,h>>8,h&255,w>>8,w&255,1,255,218,0,2,255,217));
const memory=():StorageLike=>{const data=new Map<string,string>();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}};};
describe('avatar state and cropping',()=>{
 it('defaults old v2 states and newly created states to null',()=>{expect(createState().avatar).toBeNull();const {avatar,...old}=createState();expect(validateState(old).avatar).toBeNull();});
 it('validates MIME, encoded size and JPEG dimensions',()=>{expect(isAvatarDataUrl(jpeg())).toBe(true);expect(isAvatarDataUrl(jpeg(255))).toBe(false);expect(isAvatarDataUrl(jpeg(256,512))).toBe(false);expect(isAvatarDataUrl('data:image/png;base64,AAAA')).toBe(false);expect(isAvatarDataUrl('data:image/jpeg;base64,'+btoa('x'.repeat(262145)))).toBe(false);});
 it('only permits purchased available cards and allows restoring default',()=>{const cardId=cards[0].id;expect(()=>setAvatar(createState(),{cardId,dataUrl:jpeg()})).toThrow();const state={...createState(),owned:[cardId]};expect(setAvatar(state,{cardId,dataUrl:jpeg()}).avatar?.cardId).toBe(cardId);expect(setAvatar(state,null).avatar).toBeNull();expect(()=>validateState({...state,avatar:{cardId:cards[1].id,dataUrl:jpeg()}})).toThrow();});
 it('retired resources normalize to default on load and save',()=>{const cardId=9999999,state={...createState(),owned:[cardId],avatar:{cardId,dataUrl:jpeg()}};expect(validateState(state).avatar).toBeNull();const storage=memory();storage.setItem(STORAGE_KEY,JSON.stringify(state));expect(loadState(storage).avatar).toBeNull();expect(loadState(storage).owned).toEqual([]);});
 it('round trips avatar through saved state and backup without mutating state',()=>{const state=setAvatar({...createState(),owned:[cards[0].id]},{cardId:cards[0].id,dataUrl:jpeg()}),storage=memory();expect(saveState(state,storage).avatar).toEqual(state.avatar);expect(state.revision).toBe(0);expect(loadState(storage).avatar).toEqual(state.avatar);expect(importBackup(exportBackup(state)).avatar).toEqual(state.avatar);});
 it('covers a square and clamps movement and zoom',()=>{const wide=cropGeometry(600,300,{zoom:1,x:1000,y:1000});expect(wide.width).toBe(512);expect(wide.height).toBe(256);expect(wide.left).toBe(0);expect(wide.top).toBe(0);const zoom=cropGeometry(300,600,{zoom:10,x:-99999,y:-99999});expect(zoom.zoom).toBe(4);expect(zoom.left+zoom.width).toBe(256);expect(zoom.top+zoom.height).toBe(256);expect(()=>cropGeometry(0,10,{zoom:1,x:0,y:0})).toThrow();});
});
