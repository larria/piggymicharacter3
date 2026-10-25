import type { State } from '../domain';
export interface RewardDestination { sourceId:string; sessionId:string; destination:string; narrationId:string }
export interface RewardOptions { deferRewards?:RewardDestination }
export interface RewardEntry { key:string; date:string; source:'practice'|'quiz'|'effort'|'achievement'|'trace'; wordId?:string; taskId?:string; xp:number; coins:number; pending?:RewardDestination }
/** Reserve ledger quotas now, but release balances only after the destination narration. */
export function deferRewardEntitlements(before:State,next:State,metadata:RewardDestination):State {
 if(!metadata||Object.keys(metadata).length!==4||Object.values(metadata).some(v=>typeof v!=='string'||!v.length||v.length>=500)||!['sourceId','sessionId','destination','narrationId'].every(k=>k in metadata))throw new Error('奖励交接信息无效');
 if(before.completedNarrations?.includes(metadata.narrationId))return next;
 const keys=new Set(before.rewardLedger.map(e=>e.key)),fresh=next.rewardLedger.filter(e=>!keys.has(e.key)&&!e.pending);
 if(!fresh.length)return next;
 const deferred=new Set(fresh.map(e=>e.key));return {...next,xp:next.xp-fresh.reduce((n,e)=>n+e.xp,0),coins:next.coins-fresh.reduce((n,e)=>n+e.coins,0),rewardLedger:next.rewardLedger.map(e=>deferred.has(e.key)?{...e,pending:{...metadata}}:e)};
}
/** Without an identity, recover all persisted entitlements; repeating settlement is a no-op. */
export function settlePendingRewards(state:State,narrationId?:string):State {
 const pending=state.rewardLedger.filter(e=>e.pending&&(narrationId===undefined||e.pending.narrationId===narrationId));if(!pending.length)return state;
 const xp=state.xp+pending.reduce((n,e)=>n+e.xp,0),coins=state.coins+pending.reduce((n,e)=>n+e.coins,0);if(!Number.isSafeInteger(xp)||!Number.isSafeInteger(coins))throw new Error('奖励结算超出安全范围');const keys=new Set(pending.map(e=>e.key));return {...state,xp,coins,rewardLedger:state.rewardLedger.map(e=>{if(!keys.has(e.key))return e;const {pending:_,...settled}=e;return settled;})};
}
export function rewardQuota(state:State,date:string,wordId?:string) {const entries=state.rewardLedger.filter(e=>e.date===date&&e.source!=='achievement');return {xp:Math.max(0,150-entries.reduce((n,e)=>n+e.xp,0)),coins:Math.max(0,30-entries.reduce((n,e)=>n+e.coins,0)),independent:Math.max(0,2-entries.filter(e=>e.wordId===wordId&&(e.source==='practice'||e.source==='quiz')).length),effort:Math.max(0,10-entries.filter(e=>e.source==='effort').length)};}
/** Mutates only a caller-owned cloned state; keys also record zero rewards at the cap. */
export function grantReward(s:State,entry:RewardEntry) {if(s.rewardLedger.some(e=>e.key===entry.key))return; if(entry.source==='trace'&&s.rewardLedger.some(e=>e.source==='trace'&&e.date===entry.date&&e.wordId===entry.wordId))return; const q=rewardQuota(s,entry.date,entry.wordId);if(entry.source==='practice'||entry.source==='quiz'){if(!q.independent)return;}if(entry.source==='effort'&&(!q.effort||s.rewardLedger.some(e=>e.date===entry.date&&e.wordId===entry.wordId&&e.source==='effort')))return;const e={...entry,xp:entry.source==='achievement'?entry.xp:Math.min(entry.xp,q.xp),coins:entry.source==='achievement'?entry.coins:Math.min(entry.coins,q.coins)};const pending=s.rewardLedger.filter(r=>r.pending);if(!Number.isSafeInteger(s.xp+e.xp+pending.reduce((n,r)=>n+r.xp,0))||!Number.isSafeInteger(s.coins+e.coins+pending.reduce((n,r)=>n+r.coins,0)))throw new Error('奖励余额超出安全范围');s.rewardLedger.push(e);s.xp+=e.xp;s.coins+=e.coins;}

/** Persist successful first narration even when no reward is currently pending. */
export function acknowledgeNarration(state:State,identity:string):State {
 if(typeof identity!=='string'||!identity.length||identity.length>=500)throw new Error('朗读标识无效');
 const next=settlePendingRewards(state,identity);if(next.completedNarrations?.includes(identity))return next;
 return {...next,completedNarrations:[...(next.completedNarrations??[]),identity]};
}
