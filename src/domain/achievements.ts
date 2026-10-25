import { addDays, stats, type State } from '../domain';
import { cards } from '../data/cards';
import { grantReward } from './rewards';

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
// Difficulty is assigned explicitly across categories: gray / green / blue / purple / gold.
export const ACHIEVEMENTS = [
 ...[3,7,14,30,60,100].map((target,i)=>({id:`streak-${target}`,title:['一心一意','专心致志','日积月累','持之以恒','锲而不舍','坚持不懈'][i],metric:'streak' as const,target,coins:[5,10,20,40,60,100][i],rarity:(['common','common','uncommon','rare','epic','legendary'] as const)[i]})),
 ...[20,50,100,200,365].map((target,i)=>({id:`days-${target}`,title:['积少成多','集腋成裘','聚沙成塔','水滴石穿','绳锯木断'][i],metric:'days' as const,target,coins:[10,20,40,80,150][i],rarity:(['common','uncommon','rare','epic','legendary'] as const)[i]})),
 ...[100,500,1000].map((target,i)=>({id:`learned-${target}`,title:['初窥门径','登堂入室','学富五车'][i],metric:'learned' as const,target,coins:[40,100,200][i],rarity:(['rare','epic','legendary'] as const)[i]})),
 ...[30,100,300,500,1000].map((target,i)=>({id:`mastered-${target}`,title:['温故知新','融会贯通','举一反三','触类旁通','学以致用'][i],metric:'mastered' as const,target,coins:[10,40,80,100,200][i],rarity:(['common','uncommon','rare','epic','legendary'] as const)[i]})),
 ...[1,10,30,60].map((target,i)=>({id:`collection-${target}`,title:['如获至宝','琳琅满目','美不胜收','包罗万象'][i],metric:'collection' as const,target,coins:[5,10,20,40][i],rarity:(['common','uncommon','rare','epic'] as const)[i]})),
];
export const MASTERY_RULE = '初识后完成至少三次有效跨天复习（学习阶段 ≥ 3 且有有效进阶记录）才算掌握；同日重复、同日纠错和提示作答不算，不另累计次数。';
export function masteredCount(s:State):number {
 return Object.values(s.progress).filter(p=>p.stage>=3&&p.lastAdvanced!==null).length;
}
const cardIds = new Set(cards.map(card=>card.id));
function measures(s:State,date:string){
 const valid=s.logs.filter(l=>l.correct&&!l.hinted&&l.pairComplete!==false&&l.kind!=='correction'&&(l.kind!=='assessment'||l.advanced));
 const days=new Set(valid.map(l=>l.date));
 let best=0;
 for(const d of days){let count=0,at=d;while(days.has(at)){count++;at=addDays(at,-1);}best=Math.max(best,count);}
 return {streak:best,days:days.size,learned:stats(s,date).learned,mastered:masteredCount(s),collection:new Set(s.owned.filter(id=>cardIds.has(id))).size};
}
export function achievementProgress(s:State,date:string=new Date().toLocaleDateString('sv-SE')){const m=measures(s,date);return ACHIEVEMENTS.map(a=>({...a,progress:m[a.metric],unlocked:s.achievements[a.id]??null}));}
export function settleAchievements(s:State,date:string,baseline=false){for(const a of achievementProgress(s,date)){if(a.progress<a.target||s.achievements[a.id])continue;s.achievements[a.id]={date,baseline};if(!baseline)grantReward(s,{key:`achievement:${a.id}`,date,source:'achievement',xp:0,coins:a.coins});}}
export function equipTitle(s:State,id:string|null):State {if(id!==null&&(!ACHIEVEMENTS.some(a=>a.id===id)||!s.achievements[id]||s.achievements[id].baseline))throw new Error('不能佩戴未获得的称号');return {...s,equippedTitle:id};}
