import {describe,it,expect} from 'vitest';
import {cards,cardIds} from '../src/data/cards';
import {createState,redeemCard} from '../src/domain';
import {validateState,loadState,STORAGE_KEY,type StorageLike} from '../src/storage';
const memoryWith=(state:ReturnType<typeof createState>):StorageLike=>{let raw=JSON.stringify({...state,revision:1});return{getItem:(k)=>k===STORAGE_KEY?raw:null,setItem:(_k,v)=>{raw=v}}};
describe('dynamic card slots',()=>{
  it('redeems catalog IDs and rejects missing IDs regardless of catalog size',()=>{
    const state={...createState(),coins:20};
    if(cards.length)expect(redeemCard(state,cards[cards.length-1].id).owned).toContain(cards[cards.length-1].id);
    let absent=0;while(cardIds.has(absent))absent++;
    expect(()=>redeemCard(state,absent)).toThrow();
    expect(()=>redeemCard(state,-1)).toThrow();
  });
  it('drops ownership of deleted slots on load and restore without backward compatibility',()=>{
    const state={...createState(),owned:[Number.MAX_SAFE_INTEGER]};
    expect(validateState(state).owned).toEqual(state.owned);
    expect(()=>validateState({...state,owned:[-1]})).toThrow();
    expect(()=>validateState({...state,owned:[1,1]})).toThrow();
    expect(loadState(memoryWith(state)).owned).toEqual([]);
    expect(loadState(memoryWith({...state,owned:[cards[0].id,Number.MAX_SAFE_INTEGER]})).owned).toEqual([cards[0].id]);
  });
});
