import type { State } from '../domain';
export const RANKS = [
 {name:'青铜',stars:3,step:100},{name:'白银',stars:3,step:150},{name:'黄金',stars:4,step:200},{name:'钻石',stars:4,step:250},{name:'星曜',stars:5,step:300},{name:'咪猪头',stars:5,step:400},
] as const;
export function growth(state: Pick<State,'xp'|'passedGates'>) {
 let index=0, base=0;
 while(index<5 && state.xp>=base+RANKS[index].stars*RANKS[index].step && state.passedGates.includes(index+1)) {base+=RANKS[index].stars*RANKS[index].step;index++;}
 const rank=RANKS[index], earned=Math.max(0,state.xp-base), gateReady=index<5&&earned>=rank.stars*rank.step;
 const stars=Math.min(rank.stars,1+Math.floor(earned/rank.step));
 return {tier:index,index,name:rank.name,stars,maxStars:rank.stars,step:rank.step,xpInStar:gateReady?rank.step:index===5&&stars===rank.stars?earned-(rank.stars-1)*rank.step:earned%rank.step,gateReady,nextTier:index<5?index+1:null,capped:gateReady,base};
}
