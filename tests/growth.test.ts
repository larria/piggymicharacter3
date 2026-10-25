import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AvatarFrame,RankBadge} from '../src/components/GameIcons';
import {GrowthPage} from '../src/components/GrowthPage';
import {catalog} from '../src/data/catalog';
import {createState,growth,RANKS,grantReward,rewardQuota,startExam,answerExam,pauseExam,resumeExam,currentExamQuestion,examEligibility,settleAchievements,achievementProgress,ACHIEVEMENTS,masteredCount,MASTERY_RULE,addDays,equipTitle,createWall,placeOnWall,normalizeWall,unlockNextWall,WALL_COSTS,stats,startPractice,answerTask,currentTask,type State} from '../src/domain';
import {loadState,saveState,loadWall,saveWall,exportBackup,importBackup,LEGACY_KEY,STORAGE_KEY,MIGRATION_BACKUP_KEY,WALL_KEY,RESTORE_TRANSACTION_KEY,restoreBackup,type StorageLike} from '../src/storage';
import {cards} from '../src/data/cards';
function eligible(){const s=createState();for(const w of catalog.slice(0,40))s.progress[w.id]={stage:0,due:'2026-10-24',firstSeen:'2026-10-23',lastAdvanced:'2026-10-23',lastStudied:'2026-10-23',failures:0};s.xp=300;settleAchievements(s,'2026-10-23',true);return s;}
function memory(){const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};}
describe('v2 growth and reward rules',()=>{
 it('uses the six requested ranks without changing positional XP or saved gates',()=>{
  expect(RANKS.map(r=>r.name)).toEqual(['青铜','白银','黄金','钻石','星曜','咪猪头']);
  expect(RANKS.map(r=>r.step)).toEqual([100,150,200,250,300,400]);
  const bases=[0,300,750,1550,2550,4050];
  for(let index=0;index<6;index++){
   const s=createState();s.xp=bases[index];s.passedGates=Array.from({length:index},(_,i)=>i+1);
   const m=memory();m.setItem(STORAGE_KEY,JSON.stringify(s));
   for(const restored of [loadState(m,catalog),importBackup(exportBackup(s),catalog)]){
    expect(restored.xp).toBe(s.xp);expect(restored.passedGates).toEqual(s.passedGates);
    expect(growth(restored)).toMatchObject({index,name:RANKS[index].name,base:bases[index],stars:1});
   }
   if(index<5){s.xp=bases[index+1]-1;expect(growth(s).gateReady).toBe(false);s.xp++;expect(growth(s)).toMatchObject({index,gateReady:true});s.passedGates.push(index+1);expect(growth(s).index).toBe(index+1);}
  }
 });
 it('renders matching rank names and accessible badge/frame labels with diamond and star palettes',()=>{
  for(const [tier,rank] of RANKS.entries()){
   expect(renderToStaticMarkup(createElement(RankBadge,{tier}))).toContain(`aria-label="${rank.name}段位"`);
   expect(renderToStaticMarkup(createElement(AvatarFrame,{tier}))).toContain(`aria-label="${rank.name}段位头像框"`);
  }
  expect(renderToStaticMarkup(createElement(RankBadge,{tier:3}))).toContain('#80b5de');
  expect(renderToStaticMarkup(createElement(RankBadge,{tier:4}))).toContain('#ba97da');
  const markup=renderToStaticMarkup(createElement(GrowthPage,{state:createState(),onCommit:()=>true,onError:()=>{},onExamStart:()=>{}}));
  expect(markup).not.toContain('白金');
  for(const rank of RANKS)expect(markup).toContain(`<strong>${rank.name}</strong>`);
 });
 it('has six star counts and never skips gates despite XP overflow',()=>{expect(RANKS.map(r=>r.stars)).toEqual([3,3,4,4,5,5]);const s=createState();s.xp=10000;expect(growth(s)).toMatchObject({index:0,stars:3,gateReady:true});s.passedGates=[1];expect(growth(s)).toMatchObject({index:1,stars:3,gateReady:true});s.passedGates=[1,2,3,4,5];expect(growth(s)).toMatchObject({index:5,stars:5,gateReady:false});});
 it('shares two daily independent rewards, caps assets, and grants effort once',()=>{const s=createState(),date='2026-10-23';for(let i=0;i<3;i++)grantReward(s,{key:`p${i}`,date,wordId:'x',source:i===1?'quiz':'practice',xp:i===1?8:5,coins:i===1?2:1});expect(s).toMatchObject({xp:13,coins:3});for(let i=0;i<100;i++)grantReward(s,{key:`q${i}`,date,wordId:String(i),source:'quiz',xp:8,coins:2});expect(s).toMatchObject({xp:150,coins:30});expect(rewardQuota(s,date).xp).toBe(0);const t=createState();for(let i=0;i<12;i++)grantReward(t,{key:`e${i}`,date,wordId:String(i),source:'effort',xp:1,coins:0});grantReward(t,{key:'repeat',date,wordId:'0',source:'effort',xp:1,coins:0});expect(t.xp).toBe(10);});
 it('marks migrated achievement baselines with no retroactive coins or titles',()=>{const s=eligible();s.owned=[cards[0].id];settleAchievements(s,'2026-10-23',true);expect(s.achievements['collection-1'].baseline).toBe(true);expect(s.coins).toBe(0);expect(()=>equipTitle(s,'collection-1')).toThrow();const t=eligible();t.owned=[cards[0].id];t.achievements={};settleAchievements(t,'2026-10-23');const coins=t.coins;settleAchievements(t,'2026-10-23');expect(t.coins).toBe(coins);expect(equipTitle(t,'collection-1').equippedTitle).toBe('collection-1');});
});
describe('progressive idiom achievements',()=>{
 const progress=(s:State,id:string)=>achievementProgress(s,'2026-10-23').find(a=>a.id===id)!;
 it('keeps only meaningful literacy milestones and rejects retired titles',()=>{
  expect(ACHIEVEMENTS.filter(a=>a.metric==='learned').map(a=>[a.target,a.title])).toEqual([[100,'初窥门径'],[500,'登堂入室'],[1000,'学富五车']]);
  const s=createState();s.achievements['learned-30']={date:'2026-10-23',baseline:false};expect(()=>equipTitle(s,'learned-30')).toThrow();
  for(const count of [99,100,499,500,999,1000]){s.progress={};for(let i=0;i<count;i++)s.progress[String(i)]={stage:0,due:'2026-10-24',firstSeen:'2026-10-23',lastAdvanced:'2026-10-23',lastStudied:'2026-10-23',failures:0};settleAchievements(s,'2026-10-23');for(const target of [100,500,1000])expect(!!s.achievements[`learned-${target}`]).toBe(count>=target);}
 });
 it('counts distinct effective days, excludes assisted work, and preserves longest streak',()=>{
  const s=createState();for(let i=0;i<365;i++){const date=addDays('2025-01-01',i*2);s.logs.push({id:`d${i}`,date,wordId:'x',kind:'review',correct:true,hinted:false,advanced:false});}
  expect(progress(s,'days-365').progress).toBe(365);expect(progress(s,'streak-3').progress).toBe(1);
  for(let i=0;i<100;i++)s.logs.push({id:`s${i}`,date:addDays('2023-01-01',i),wordId:'x',kind:'review',correct:true,hinted:false,advanced:false});
  for(const patch of [{correct:false},{hinted:true},{kind:'correction' as const},{kind:'assessment' as const,advanced:false}])s.logs.push({id:JSON.stringify(patch),date:'2023-04-11',wordId:'x',kind:'review',correct:true,hinted:false,advanced:false,...patch});
  s.logs.push({...s.logs[0],id:'duplicate'});
  expect(progress(s,'streak-100').progress).toBe(100);expect(progress(s,'days-365').progress).toBe(465);
  settleAchievements(s,'2026-10-23');for(const a of ACHIEVEMENTS.filter(a=>a.metric==='streak'||a.metric==='days'))expect(s.achievements[a.id]).toBeDefined();
 });
 it('replaces promotions with five mastery milestones based on existing stages',()=>{
  expect(ACHIEVEMENTS.filter(a=>a.metric==='mastered').map(a=>[a.target,a.title])).toEqual([[30,'温故知新'],[100,'融会贯通'],[300,'举一反三'],[500,'触类旁通'],[1000,'学以致用']]);
  expect(ACHIEVEMENTS.some(a=>a.id.startsWith('promotion-'))).toBe(false);
  const s=createState();s.xp=10000;s.passedGates=[1,2,3,4,5];expect(masteredCount(s)).toBe(0);
  for(const count of [29,30,99,100,299,300,499,500,999,1000]){s.progress={};for(let i=0;i<count;i++)s.progress[String(i)]={stage:i%2?3:4,due:'2026-10-24',firstSeen:'2026-10-01',lastAdvanced:'2026-10-23',lastStudied:'2026-10-23',failures:0};expect(progress(s,'mastered-30').progress).toBe(count);settleAchievements(s,'2026-10-23');for(const target of [30,100,300,500,1000])expect(!!s.achievements[`mastered-${target}`]).toBe(count>=target);const coins=s.coins;settleAchievements(s,'2026-10-23');expect(s.coins).toBe(coins);}
 });
 it('requires three effective cross-day advances and excludes same-day, hinted and correction work',()=>{
  const w=catalog[0];let s=createState();
  const answer=(date:string,kind:'learn'|'review'|'correction'='review',hinted=false)=>{s.session={id:date,date,tasks:[{id:date,wordId:w.id,kind,questionKind:'character'}],cursor:0,completed:false,submissions:[],assessmentPassed:[]};s=answerTask(s,{correct:true,hinted,submissionId:`${date}:${s.logs.length}`},date);};
  answer('2026-10-01','learn');expect(s.progress[w.id].stage).toBe(0);
  for(let i=0;i<4;i++)answer('2026-10-01');expect(masteredCount(s)).toBe(0);
  answer('2026-10-02','review',true);answer('2026-10-02','correction');expect(s.progress[w.id].stage).toBe(0);
  for(const [date,stage] of [['2026-10-03',1],['2026-10-06',2],['2026-10-13',3]] as const){answer(date);expect(s.progress[w.id].stage).toBe(stage);expect(masteredCount(s)).toBe(stage===3?1:0);}
  s.logs=[];expect(masteredCount(s)).toBe(1);s.progress[w.id].lastAdvanced=null;expect(masteredCount(s)).toBe(0);expect(MASTERY_RULE).toContain('同日纠错');
 });
 it('excludes first pair successes from effective days and streak awards while keeping legacy logs',()=>{
  const s=createState();for(let i=0;i<3;i++)s.logs.push({id:`first${i}`,date:addDays('2026-10-01',i),wordId:catalog[0].id,kind:'review',correct:true,hinted:false,advanced:false,pairComplete:false});
  expect(progress(s,'days-20').progress).toBe(0);expect(progress(s,'streak-3').progress).toBe(0);settleAchievements(s,'2026-10-03');expect(s.achievements['streak-3']).toBeUndefined();expect(stats(s,'2026-10-03').today).toBe(0);
  for(const log of s.logs)delete log.pairComplete;expect(progress(s,'streak-3').progress).toBe(3);settleAchievements(s,'2026-10-03');expect(s.achievements['streak-3']).toBeDefined();
 });
 it('assigns explicit progressive rarity without duplicate titles',()=>{
  expect(new Set(ACHIEVEMENTS.map(a=>a.title)).size).toBe(ACHIEVEMENTS.length);
  const levels=['common','uncommon','rare','epic','legendary'];
  for(const metric of ['streak','days','learned','mastered','collection']){const ranks=ACHIEVEMENTS.filter(a=>a.metric===metric).map(a=>levels.indexOf(a.rarity));expect(ranks.every((r,i)=>r>=0&&(i===0||r>=ranks[i-1]))).toBe(true);}
  expect(ACHIEVEMENTS.filter(a=>a.metric==='mastered').map(a=>a.rarity)).toEqual(levels);
 });
 it('counts unique real collections and grants each milestone once',()=>{
  const s=createState();s.owned=[cards[0].id,cards[0].id,-1];expect(progress(s,'collection-1').progress).toBe(1);
  for(const target of [1,10,30,60]){expect(cards.length).toBeGreaterThanOrEqual(target);s.owned=cards.slice(0,target-1).map(c=>c.id);expect(progress(s,`collection-${target}`).progress).toBe(target-1);s.owned=cards.slice(0,target).map(c=>c.id);settleAchievements(s,'2026-10-23');expect(s.achievements[`collection-${target}`]).toBeDefined();const coins=s.coins;settleAchievements(s,'2026-10-23');expect(s.coins).toBe(coins);}
 });
});
describe('fixed snapshot examinations',()=>{
 it('enforces eligibility and learning/exam mutual exclusion',()=>{expect(examEligibility(createState(),catalog,'promotion')).toMatchObject({eligible:false,required:30});const s=eligible();s.session={id:'s',date:'2026-10-23',tasks:[{id:'t',wordId:catalog[0].id,kind:'learn',questionKind:'character'}],cursor:0,completed:false,submissions:[],assessmentPassed:[]};expect(()=>startExam(s,catalog,'promotion')).toThrow();});
 for(const score of [26,27])it(`30 distinct questions, ${score} boundary and no examination rewards`,()=>{let s=startExam(eligible(),catalog,'promotion','2026-10-23',()=>.5);expect(new Set(s.exam!.questions.map(q=>q.wordId)).size).toBe(30);const snapshot=JSON.stringify(s.exam!.questions);s=importBackup(exportBackup(s),catalog);s=pauseExam(s);expect(answerExam(s,{answer:currentExamQuestion(s)!.answer,submissionId:'paused'})).toBe(s);s=resumeExam(s);for(let i=0;i<30;i++){const q=currentExamQuestion(s)!;s=answerExam(s,{answer:i<score?q.answer:q.options.find(x=>x!==q.answer)!,submissionId:`a${i}`},'2026-10-23');}expect(JSON.stringify(s.exam!.questions)).toBe(snapshot);expect(s.exam).toMatchObject({score,passed:score>=27,completed:true});expect(s.passedGates).toEqual(score===27?[1]:[]);expect(s.xp).toBe(300);expect(s.coins).toBe(0);expect(s.rewardLedger.filter(r=>r.source!=='achievement')).toHaveLength(0);expect(s.rewardLedger.filter(r=>r.key==='achievement:promotion-1')).toHaveLength(0);expect(answerExam(s,{answer:'x',submissionId:'a29'})).toBe(s);const coins=s.coins;settleAchievements(s,'2026-10-23');expect(s.coins).toBe(coins);expect(importBackup(exportBackup(s),catalog)).toEqual(s);});
 it('quiz stays ten questions, wrong answers never insert teaching, correct earns 8/2',()=>{let s=startExam(eligible(),catalog,'quiz','2026-10-23',()=>.5);s=answerExam(s,{answer:currentExamQuestion(s)!.answer,submissionId:'q0'},'2026-10-23');expect(s).toMatchObject({xp:308,coins:2});expect(stats(s,'2026-10-23').today).toBe(1);const q=currentExamQuestion(s)!;s=answerExam(s,{answer:q.options.find(a=>a!==q.answer)!,submissionId:'q1'},'2026-10-23');expect(s.exam!.questions).toHaveLength(10);expect(s.exam!.cursor).toBe(2);});
 it('rejects corrupted persisted answer and score',()=>{const s=startExam(eligible(),catalog,'promotion','2026-10-23');expect(()=>importBackup(JSON.stringify({...s,exam:{...s.exam,score:1}}))).toThrow();});
});
describe('migration and independent wall persistence',()=>{
 for(const id of ['learned-10','learned-30',...Array.from({length:6},(_,i)=>`promotion-${i+1}`)])it(`clears retired equipped ${id} on v2 load and backup import without losing assets`,()=>{
  const s=createState();s.coins=23;s.xp=45;s.achievements[id]={date:'2026-10-23',baseline:false};s.equippedTitle=id;s.achievements['learned-100']={date:'2026-10-23',baseline:false};s.rewardLedger.push({key:`achievement:${id}`,source:'achievement',date:'2026-10-23',xp:0,coins:10});
  const m=memory();m.setItem(STORAGE_KEY,JSON.stringify(s));
  for(const normalized of [loadState(m,catalog),importBackup(JSON.stringify(s),catalog)]){expect(normalized.equippedTitle).toBeNull();expect(normalized.coins).toBe(23);expect(normalized.xp).toBe(45);expect(normalized.achievements[id]).toBeUndefined();expect(normalized.achievements['learned-100']).toEqual(s.achievements['learned-100']);expect(normalized.rewardLedger).toEqual(s.rewardLedger);expect(()=>equipTitle(normalized,id)).toThrow();}
 });
 it('journals original data when rollback also fails and retries recovery on load',()=>{const m=memory(),current=saveState(createState(),m);let writes=0;const broken:StorageLike={getItem:m.getItem,setItem:(k,v)=>{writes++;if(writes>=3)throw new Error('full');m.setItem(k,v);}};expect(()=>restoreBackup(exportBackup({...createState(),coins:99}),current,broken)).toThrow(/混合状态/);expect(JSON.parse(m.getItem(STORAGE_KEY)!).coins).toBe(99);expect(m.getItem(RESTORE_TRANSACTION_KEY)).not.toBe('null');expect(()=>loadState(broken)).toThrow(/回滚失败/);expect(loadState(m)).toEqual(current);expect(m.getItem(RESTORE_TRANSACTION_KEY)).toBe('null');});
 it('unlimited practice bypasses daily queue but keeps shared reward limits and same-day stage',()=>{let s=eligible();const w=catalog[0];s.progress= {[w.id]:s.progress[w.id]};for(let i=0;i<3;i++){s=startPractice(s,catalog,'2026-10-23',()=>0);expect(currentTask(s)).not.toBeNull();s=answerTask(s,{correct:true,submissionId:`practice${i}:a`},'2026-10-23');expect(s.xp).toBe(300+Math.min(i,2)*5);expect(s.progress[w.id].stage).toBe(0);expect(currentTask(s)?.questionKind).toBe('word');s=answerTask(s,{correct:true,submissionId:`practice${i}:b`},'2026-10-23');}expect(s.xp).toBe(310);expect(s.coins).toBe(2);expect(s.progress[w.id].stage).toBe(0);});

 it('requires legacy restore confirmation and rolls back state when wall storage fails',()=>{const m=memory();const current=saveState(createState(),m);const old=JSON.stringify({...createState(),version:1,shells:10});expect(()=>restoreBackup(old,current,m)).toThrow(/确认/);const before=m.getItem(STORAGE_KEY);const broken:StorageLike={getItem:m.getItem,setItem:(k,v)=>{if(k===WALL_KEY&&JSON.parse(v).revision!==0)throw new Error('full');m.setItem(k,v);}};expect(()=>restoreBackup(exportBackup({...createState(),coins:5}),current,broken)).toThrow(/收藏墙/);expect(m.getItem(STORAGE_KEY)).toBe(before);});

 it('backs up v1 before migrating, keeps learning, resets assets, does not reset twice',()=>{const m=memory(),s=eligible();const old={...s,version:1,shells:99,owned:[cards[0].id],rewards:['old']};m.setItem(LEGACY_KEY,JSON.stringify(old));const next=loadState(m,catalog);expect(next).toMatchObject({version:2,xp:0,coins:0,owned:[],rewards:[],exam:null,session:null});expect(next.progress).toEqual(s.progress);expect(m.getItem(MIGRATION_BACKUP_KEY)).toBe(JSON.stringify(old));next.coins=9;saveState(next,m);expect(loadState(m).coins).toBe(9);});
 it('stops migration on storage failure and does not overwrite original',()=>{const m=memory(),old=JSON.stringify({...createState(),version:1,shells:20});m.setItem(LEGACY_KEY,old);const broken:StorageLike={getItem:m.getItem,setItem:()=>{throw new Error('full');}};expect(()=>loadState(broken)).toThrow(/升级/);expect(m.getItem(LEGACY_KEY)).toBe(old);expect(m.getItem(STORAGE_KEY)).toBeNull();});
 it('unlocks exactly ten walls at fixed costs and defaults legacy state to one',()=>{expect(createState().unlockedWallCount).toBe(1);expect(WALL_COSTS).toEqual([20,30,50,80,120,170,230,300,400]);let s={...createState(),coins:1400};for(const cost of WALL_COSTS){const before=s.coins;s=unlockNextWall(s);expect(s.coins).toBe(before-cost);}expect(s.unlockedWallCount).toBe(10);expect(unlockNextWall(s)).toBe(s);const legacy={...createState()} as any;delete legacy.unlockedWallCount;expect(importBackup(JSON.stringify(legacy)).unlockedWallCount).toBe(1);});
 it('unlocks one wall exactly at the balance boundary and leaves shortages untouched',()=>{const exact={...createState(),coins:WALL_COSTS[0]};const unlocked=unlockNextWall(exact);expect(unlocked).not.toBe(exact);expect(unlocked).toMatchObject({coins:0,unlockedWallCount:2});expect(exact).toMatchObject({coins:WALL_COSTS[0],unlockedWallCount:1});const short={...createState(),coins:WALL_COSTS[0]-1};expect(unlockNextWall(short)).toBe(short);expect(short).toMatchObject({coins:WALL_COSTS[0]-1,unlockedWallCount:1});});
 it('wall revisions cannot conflict with learning, migrates v1, and reuses cards only across walls',()=>{const m=memory(),id=cards[0].id,s={...createState(),owned:[id],unlockedWallCount:2};let wall=placeOnWall(createWall(2),0,id,s.owned);expect(placeOnWall(wall,0,id,s.owned)).toBe(wall);wall=placeOnWall(wall,1,id,s.owned);expect(wall.walls.map(w=>w.items.map(i=>i.cardId))).toEqual([[id],[id]]);const saved=saveWall(wall,m,s.owned,2);saveState(s,m);expect(loadWall(m,s.owned,2)).toEqual(saved);expect(()=>saveWall(wall,m,s.owned,2)).toThrow(/标签页/);expect(()=>normalizeWall({...wall,walls:[{...wall.walls[0],items:[{...wall.walls[0].items[0],x:NaN}]},wall.walls[1]]},s.owned)).toThrow();expect(JSON.parse(exportBackup(s,saved)).wall).toEqual(saved);expect(loadWall(m,[],2).walls.every(w=>!w.items.length)).toBe(true);const v1={version:1,revision:7,items:wall.walls[0].items};m.setItem(WALL_KEY,JSON.stringify(v1));expect(loadWall(m,s.owned,2)).toMatchObject({version:2,revision:7,walls:[{id:0,items:[{cardId:id}]},{id:1,items:[]}]});});
});
