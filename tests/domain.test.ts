import { describe, expect, it } from 'vitest';
import { recordLearningPage, rewardQuota, grantReward, giftCoins, addDays, acknowledgeNarration, deferRewardEntitlements, settlePendingRewards, ensureSessionPractice, completePractice, confirmPreparation, finishTeaching, setPreparationClaims, skipPractice, updatePracticeTime, answerTask, buildQueue, createState, currentTask, INTERVALS, localDate, makeQuestion, markKnown, redeemCard, startSession, startPractice, startSelectedSession, sessionSummary, stats, updateSettings, type State, type Word } from '../src/domain';
import { catalog } from '../src/data/catalog';
import { practice } from '../src/data/practice';
import { exportBackup, importBackup, loadState, restoreBackup, saveState, STORAGE_KEY, type StorageLike } from '../src/storage';
const words: Word[] = ['山','水','火','木','土'].map((char,i) => ({ id: String(i),char,pinyin: ['shān','shuǐ','huǒ','mù','tǔ'][i],words:[`${char}中`],sentences:[`这里有${char}。`] }));
const answer = (s: State, date: string, correct = true, hinted = false): State => { s=confirmPreparation(s);const t=currentTask(s);if(t?.kind==='learn')s=finishTeaching(completePractice(s,t.id,date),t.id);return answerTask(s,{correct,hinted,submissionId:`${s.session!.id}:${s.logs.length}`},date); };
const selected = (state:State, ids:string[],date:string) => confirmPreparation(setPreparationClaims(startSelectedSession(state,words,ids,date),ids));
function first(date = '2026-10-21') { let s = createState(); s.settings = {...s.settings,dailyGoal:1,newLimit:1}; s=answer(answer(startSession(s,words,date),date),date);s.settings.newLimit=0;return s; }
function memory(): StorageLike { const data = new Map<string,string>(); return {getItem:k => data.get(k) ?? null,setItem:(k,v) => {data.set(k,v);} }; }
describe('settings and resumable learning presentation', () => {
 it('defaults to 30 daily, 20 new and five weekly days; validates twenty new', () => {
  expect(createState().settings).toMatchObject({dailyGoal:30,newLimit:20,weeklyGoal:5});
  expect(updateSettings(createState(),{newLimit:20}).settings.newLimit).toBe(20);
  for (const newLimit of [-1,21,1.5,NaN]) expect(() => updateSettings(createState(),{newLimit})).toThrow();
  expect(buildQueue(createState(),catalog,'2026-10-21')).toHaveLength(20);
 });
 it('preserves saved old settings and session, including required teaching markers', () => {
  let s = startSession(updateSettings(createState(),{dailyGoal:8,newLimit:3,weeklyGoal:3}),words,'2026-10-21');
  s.session!.learningRequired = [currentTask(s)!.id];
  expect(markKnown(s,true)).toBe(s);
  const restored = loadState({getItem:key=>key===STORAGE_KEY?JSON.stringify(s):null,setItem:()=>{}},words);
  expect(restored).toEqual(s);
  expect(importBackup(exportBackup(s),words)).toEqual(s);
  expect(startSession(restored,words,'2026-10-22')).toBe(restored);
  for (const ids of [['missing'],[s.session!.tasks[0].id,s.session!.tasks[0].id]]) {
   expect(() => importBackup(JSON.stringify({...s,session:{...s.session,learningRequired:ids}}),words)).toThrow();
  }
 });
 it('summarizes empty, completed, inserted teaching and correction work honestly', () => {
  expect(sessionSummary(createState())).toEqual({totalWords:0,completedWords:0,remainingWords:0,totalTasks:0,remainingTasks:0});
  let s = startSession(updateSettings(createState(),{dailyGoal:3,newLimit:3}),words,'2026-10-21');
  s = answer(s,'2026-10-21',false);
  expect(sessionSummary(s)).toMatchObject({totalWords:3,completedWords:0,remainingWords:3,totalTasks:8,remainingTasks:7});
  while(currentTask(s)) s = answer(s,'2026-10-21');
  expect(sessionSummary(s)).toMatchObject({completedWords:3,remainingWords:0,remainingTasks:0});
 });
});
describe('learning evidence and schedule', () => {
 it('enforces daily new and workload caps across sessions', () => { let s = createState(); s.settings = {...s.settings, dailyGoal: 4, newLimit: 2}; s = startSession(s,words,'2026-10-21'); while (currentTask(s)) s = answer(s,'2026-10-21'); expect(buildQueue(s,words,'2026-10-21')).toHaveLength(0); s.settings.newLimit = 5; s = startSession(s,words,'2026-10-21'); expect(s.session!.tasks).toHaveLength(4); while (currentTask(s)) s = answer(s,'2026-10-21'); expect(buildQueue(s,words,'2026-10-21')).toHaveLength(0); });
 it('does not count incomplete known assessment as learning or a study day', () => { let s = markKnown(startSession(createState(),words,'2026-10-21'),true); s = answer(s,'2026-10-21'); expect(stats(s,'2026-10-21')).toMatchObject({learned:0,today:0,weekDays:0,streak:0}); s = answer(s,'2026-10-21'); expect(stats(s,'2026-10-21')).toMatchObject({learned:1,today:1,weekDays:1,streak:1}); });
 it('routes hinted known assessments to teaching without losing the word', () => { let s = markKnown(startSession(createState(),words,'2026-10-21'),true); s = answer(s,'2026-10-21',true,true); expect(currentTask(s)).toMatchObject({wordId:'0',kind:'learn'}); expect(s.session!.tasks.filter(t => t.pair&&t.wordId==='0')).toHaveLength(3); expect(s.progress['0'].lastAdvanced).toBeNull(); expect(s.progress['0'].due).toBe('2026-10-22'); });
 it('known requires two distinct questions, skips teaching, and returns tomorrow', () => { let s = startSession(createState(),words,'2026-10-21'); s = markKnown(s,true); expect(currentTask(s)?.kind).toBe('assessment'); s = answer(s,'2026-10-21'); expect(s.progress['0']).toBeUndefined(); expect(currentTask(s)?.questionKind).toBe('word'); s = answer(s,'2026-10-21'); expect(s.progress['0'].due).toBe('2026-10-22'); expect(s.coins).toBe(2); });
 it('finishes mastery only after the final 30-day paired review', () => { let s = first(); let date = '2026-10-21'; for (const interval of INTERVALS.slice(1)) { date=s.progress['0'].due;s=answer(answer(startSession(s,words,date),date),date);expect(s.progress['0'].due).toBe(addDays(date,interval));expect(s.progress['0'].mastered).not.toBe(true); } date=s.progress['0'].due;s=answer(answer(startSession(s,words,date),date),date);expect(s.progress['0'].mastered).toBe(true);expect(buildQueue(s,words,addDays(date,60))).toEqual([]);expect(stats(s,addDays(date,60))).toMatchObject({due:0,overdue:0});s=importBackup(exportBackup(s),words);s=answer(answer(startPractice(s,words,addDays(date,61)),addDays(date,61)),addDays(date,61));expect(s.progress['0'].mastered).toBe(true);expect(importBackup(exportBackup(s),words)).toEqual(s); });
 it('hints and correction cannot advance; errors downgrade and retain tomorrow', () => { let s = first(); s = answer(answer(startSession(s,words,'2026-10-22'),'2026-10-22'),'2026-10-22'); expect(s.progress['0'].stage).toBe(1); s = answer(startSession(s,words,'2026-10-25'),'2026-10-25',true,true); expect(s.progress['0'].stage).toBe(1); s = answer(startSession(s,words,'2026-10-26'),'2026-10-26',false); expect(s.progress['0'].stage).toBe(0); expect(s.progress['0'].due).toBe('2026-10-27'); });
 it('protects rollback, local midnight and duplicate submissions', () => { const s = first(); expect(buildQueue(s,words,'2026-10-20').every(t => t.wordId !== '0')).toBe(true); expect(localDate(new Date(2026,9,21,23,59))).toBe('2026-10-21'); expect(localDate(new Date(2026,9,22,0,1))).toBe('2026-10-22'); const active = startSession(s,words,'2026-10-22'); const result = answerTask(active,{correct:true,submissionId:'unique'},'2026-10-22'); expect(answerTask(result,{correct:true,submissionId:'unique'},'2026-10-22')).toEqual(result); });
 it('delays correction behind two other word tasks and never undoes next-day review', () => { let s = startSession(updateSettings(createState(),{dailyGoal:3,newLimit:3}),words,'2026-10-21'); delete s.session!.flowVersion;delete s.session!.xpVersion;s.session!.tasks=buildQueue(createState(),words,'2026-10-21').slice(0,3);delete s.session!.practice;s=ensureSessionPractice(s);s = answer(s,'2026-10-21',false); expect(s.session!.tasks.map(t => t.kind)).toEqual(['learn','learn','learn','learn','correction']); s = answer(s,'2026-10-21',true,true); s = answer(s,'2026-10-21'); s = answer(s,'2026-10-21'); expect(currentTask(s)?.kind).toBe('correction'); s = answer(s,'2026-10-21'); expect(s.progress['0'].due).toBe('2026-10-22'); expect(s.progress['0'].lastAdvanced).toBeNull(); });
 it('cannot farm word or completion rewards on one day', () => { let s = first(); const coins = s.coins; s.progress['0'].due = '2026-10-21'; s = answer(startSession(s,words,'2026-10-21'),'2026-10-21'); expect(s.coins).toBe(coins); expect(s.progress['0'].stage).toBe(0); });
 it('prioritizes overdue reviews and removes new letters under backlog', () => { const s = createState(); s.settings.dailyGoal = 2; for (const w of words) s.progress[w.id] = {stage:0,due: w.id === '0' ? '2026-10-19' : '2026-10-21',firstSeen:'2026-10-18',lastStudied:'2026-10-18',lastAdvanced:'2026-10-18',failures:0}; expect(buildQueue(s,words,'2026-10-21').map(t => t.wordId)).toEqual(['0','1']); });
 it('unique options and idempotent affordable card ownership', () => { const task = currentTask(startSession(createState(),words,'2026-10-21'))!; const q = makeQuestion({...task,questionKind:'word'},words,() => 0); expect(new Set(q.options).size).toBe(q.options.length); expect(q.options.filter(x => x === q.answer)).toHaveLength(1); let s = createState(); expect(redeemCard(s,0)).toBe(s); s.coins = 20; s = redeemCard(s,0); expect(s.coins).toBe(5); expect(s.achievements['collection-1']).toBeDefined(); expect(s.rewardLedger.filter(r=>r.key==='achievement:collection-1')).toHaveLength(1); expect(redeemCard(s,0)).toBe(s); expect(s.coins).toBe(5); });
});
describe('fair practice and selected sessions', () => {
 it('all curated entries exist first in catalog with distinct safe distractors', () => { expect(catalog.slice(0,practice.length).map(w=>w.char)).toEqual(practice.map(p=>p.char)); for (const p of practice) { const w=catalog.find(w=>w.char===p.char)!; for (const questionKind of ['character','word'] as const) { const q=makeQuestion({id:'test',wordId:w.id,kind:'assessment',questionKind},catalog,()=>0); expect(q.options).toHaveLength(4); expect(new Set(q.options).size).toBe(4); expect(q.independent).toBe(true); expect(q.maskedText).not.toContain(q.answer); expect(q.options.filter(x=>x===q.answer)).toHaveLength(1); } } });
 it('masks whole word answers without hiding unrelated target-character occurrences', () => { for (const [char,answer,maskedText] of [['篮','篮球','□比赛时，投进篮筐就能得分。'],['手','双手','我的□各有五根手指。']]) { const w=catalog.find(w=>w.char===char)!; const q=makeQuestion({id:'x',wordId:w.id,kind:'assessment',questionKind:'word'},catalog,()=>0); expect(q.independent).toBe(true); expect(q.answer).toBe(answer); expect(q.maskedText).toBe(maskedText); expect(q.speechText).toContain(maskedText.replaceAll('□','空白')); expect(q.speechText).not.toContain(answer); expect(q.segments.filter(s=>s.masked)).toEqual([{text:'□',masked:true}]); } });
 it('masks all repeated character answers and all repeated whole word answers', () => { const w=catalog.find(w=>w.char==='手')!; const character=makeQuestion({id:'char',wordId:w.id,kind:'assessment',questionKind:'character'},catalog,()=>0); expect(character.maskedText).toBe('□掌连着五根□指。'); expect(character.speechText).not.toContain('手'); expect(character.segments.filter(s=>s.masked)).toHaveLength(2); const repeated:Word={id:'fallback',char:'龘',pinyin:'dá',words:['龘字'],sentences:['龘字和龘字旁边还有龘。']}; const word=makeQuestion({id:'word',wordId:repeated.id,kind:'assessment',questionKind:'word'},[repeated],()=>0); expect(word.maskedText).toBe('□和□旁边还有龘。'); expect(word.segments.filter(s=>s.masked)).toHaveLength(2); });
 it('fallback clues never establish independent evidence or loop teaching', () => { let s = selected(createState(),['0'],'2026-10-21'); const fallbackWords=words.map(w=>({...w,char:'龘'})); const q = makeQuestion({...currentTask(s)!,questionKind:'character'},fallbackWords); expect(q.independent).toBe(false); expect(q.cue).toContain('shān'); s = answerTask(s,{correct:true,independent:q.independent,submissionId:'fallback'},'2026-10-21'); expect(currentTask(s)?.kind).toBe('learn'); s = finishTeaching(completePractice(s,currentTask(s)!.id,'2026-10-21')); s = answerTask(s,{correct:true,independent:false,submissionId:'teach'},'2026-10-21'); expect(s.session!.completed).toBe(true); expect(stats(s,'2026-10-21')).toMatchObject({learned:0,today:0,weekDays:0}); expect(s.rewards.some(k=>k.startsWith('word:'))).toBe(false); expect(importBackup(exportBackup(s),words)).toEqual(s); });
 it('deduplicates selected IDs, limits ten, preserves active sessions and progress', () => { const base = first(); const s = selected(base,['0','0','1'],'2026-10-22'); expect(s.progress).toEqual(base.progress); expect(sessionSummary(s)).toMatchObject({totalWords:2,totalTasks:4,remainingWords:2}); expect(startSelectedSession(s,words,['2'])).toBe(s); expect(startSession(s,words)).toBe(s); expect(() => startSelectedSession(createState(),words,[])).toThrow(); expect(() => startSelectedSession(createState(),words,['bad'])).toThrow(); const many = Array.from({length:11},(_,i)=>({...words[0],id:String(i)})); expect(() => startSelectedSession(createState(),many,many.map(w=>w.id))).toThrow(); });
 it('summarizes actual unique words despite dual questions and teaching', () => { let s = selected(createState(),['0','1'],'2026-10-21'); s = answer(s,'2026-10-21'); expect(sessionSummary(s).completedWords).toBe(0); s = answer(s,'2026-10-21'); expect(sessionSummary(s)).toMatchObject({totalWords:2,completedWords:1,remainingWords:1}); });
 it('two questions on one other word do not qualify for delayed correction', () => { let s = selected(createState(),['0','1'],'2026-10-21'); s = answer(s,'2026-10-21',false); expect(s.session!.tasks.some(t=>t.kind==='correction')).toBe(false); expect(currentTask(s)).toMatchObject({wordId:'0',kind:'learn'}); });
 it('failed teaching cannot repeat forever', () => { let s = selected(createState(),['0'],'2026-10-21'); s=answer(s,'2026-10-21',false); s=answer(s,'2026-10-21',false); expect(s.session!.completed).toBe(true); });
});
describe('storage and backup', () => {
 it('round-trips a resumable session and preserves honest evidence', () => { const s = answer(startSession(createState(),words,'2026-10-21'),'2026-10-21'); const imported = importBackup(exportBackup(s),words); expect(imported).toEqual(s); expect(startSession(imported,words,'2026-10-22')).toBe(imported); });
 it('rejects malformed dates, versions, duplicate IDs and unknown catalog words', () => { const s = first(); for (const corrupt of [{...s,version:3},{...s,logs:[...s.logs,...s.logs]},{...s,rewards:['x','x']},{...s,owned:[0,0]},{...s,settings:{...s.settings,sound:'yes'}}]) expect(() => importBackup(JSON.stringify(corrupt),words)).toThrow(); s.progress['0'].due = '2026-02-30'; expect(() => importBackup(JSON.stringify(s))).toThrow(); expect(() => importBackup(exportBackup(first()),[])).toThrow(); });
 it('detects stale tabs and only restores validated backups', () => { const store = memory(); const a = saveState(createState(),store); const b = loadState(store); const newer = saveState(a,store); expect(() => saveState(b,store)).toThrow(/标签页/); const before = store.getItem(STORAGE_KEY); expect(() => restoreBackup('bad',newer,store)).toThrow(); expect(store.getItem(STORAGE_KEY)).toBe(before); expect(restoreBackup(exportBackup(first()),newer,store,words).revision).toBe(3); });
});

describe('batch plan and linked trace rewards',()=>{
 it('reserves 16 new and 14 earliest reviews; low caps shorten with a majority',()=>{
  const pool=Array.from({length:60},(_,i)=>({...words[0],id:String(i)}));const s=createState();for(const w of pool.slice(20))s.progress[w.id]={stage:0,due:'2026-10-20',firstSeen:'2026-10-19',lastStudied:'2026-10-19',lastAdvanced:'2026-10-19',failures:0};
  const q=buildQueue(s,pool,'2026-10-21');expect(q.filter(t=>t.kind==='learn')).toHaveLength(16);expect(q.filter(t=>t.kind==='review')).toHaveLength(14);
  s.settings.newLimit=3;expect(buildQueue(s,pool,'2026-10-21').map(t=>t.kind)).toEqual(['learn','learn','learn','review','review']);
  const active=startSession(s,pool,'2026-10-21');expect(startSession(active,pool,'2026-10-21')).toBe(active);expect(buildQueue(active,pool,'2026-10-21')).toHaveLength(0);
 });
 it('persists claims, orders paired verification first and refuses early submissions',()=>{
  let s=startSession(createState(),words,'2026-10-21');const before=s;expect(answerTask(s,{correct:true,submissionId:'early'},'2026-10-21')).toBe(before);
  s=setPreparationClaims(s,['2','0']);s=importBackup(exportBackup(s),words);s=confirmPreparation(s);expect(s.session!.tasks.slice(0,4).map(t=>[t.wordId,t.questionKind])).toEqual([['0','pinyin'],['0','word'],['2','pinyin'],['2','word']]);expect(confirmPreparation(s)).toBe(s);
 });
 it('rewards a completed task 2 plus 3, deduplicates and gates teaching',()=>{
  let s=confirmPreparation(startSession(updateSettings(createState(),{dailyGoal:1,newLimit:1}),words,'2026-10-21'));delete s.session!.xpVersion;const id=currentTask(s)!.id;
  expect(answerTask(s,{correct:true,submissionId:'early'},'2026-10-21')).toBe(s);expect(finishTeaching(s)).toBe(s);
  s=completePractice(s,id,'2026-10-21');expect(s.xp).toBe(2);expect(completePractice(s,id,'2026-10-21')).toBe(s);s=finishTeaching(s);s=answerTask(s,{correct:true,submissionId:'first'},'2026-10-21');expect(s.xp).toBe(2);s=answerTask(s,{correct:true,submissionId:'ok'},'2026-10-21');expect(s.rewardLedger.filter(e=>e.source==='trace'||e.source==='practice').map(e=>e.xp)).toEqual([2,3]);expect(s.coins).toBe(1);expect(importBackup(exportBackup(s),words)).toEqual(s);
 });
 it('requires 180 active seconds to skip, limits sleep deltas and gives no trace reward',()=>{
  let s=confirmPreparation(startSession(createState(),words,'2026-10-21'));delete s.session!.xpVersion;const id=currentTask(s)!.id;expect(skipPractice(s,id)).toBe(s);s=updatePracticeTime(s,id,600000);expect(s.session!.practice![id].activeMs).toBe(5000);for(let i=0;i<35;i++)s=updatePracticeTime(s,id,5000);s=skipPractice(s,id);expect(s.session!.practice![id]).toMatchObject({activeMs:180000,skipped:true,completed:false});expect(completePractice(s,id)).toBe(s);expect(s.xp).toBe(0);expect(importBackup(exportBackup(finishTeaching(s)),words).session!.practice![id].phase).toBe('ready');
 });
 it('rejects corrupt new fields but accepts legacy sessions without them',()=>{
  const s=startSession(createState(),words,'2026-10-21');const id=currentTask(s)!.id;
  for(const patch of [{dailyPlans:[{date:'2026-10-21',newWordIds:['0'],reviewWordIds:['0']}]},{session:{...s.session,practice:{[id]:{phase:'ready',activeMs:0,completed:false,skipped:false}}}},{rewardLedger:[{key:'trace:2026-10-21:0',date:'2026-10-21',source:'trace',wordId:'0',xp:2,coins:0}]}])expect(()=>importBackup(JSON.stringify({...s,...patch}),words)).toThrow();
  delete s.dailyPlans;delete s.session!.practice;delete s.session!.preparation;expect(importBackup(exportBackup(s),words)).toEqual(s);
 });
});

it('initializes legacy teaching without rebuilding queue or adding claims',()=>{
 let s=startSession(createState(),words,'2026-10-21');delete s.session!.practice;delete s.session!.preparation;const tasks=s.session!.tasks;
 s=ensureSessionPractice(s);expect(s.session!.tasks).toEqual(tasks);expect(s.session!.preparation).toBeUndefined();expect(ensureSessionPractice(s)).toBe(s);const id=currentTask(s)!.id;s=finishTeaching(completePractice(s,id,'2026-10-21'));expect(s.session!.practice![id].phase).toBe('ready');expect(importBackup(exportBackup(s),words)).toEqual(s);
});

describe('versioned shared pairs',()=>{
 it('uses twenty questions for ten free-review characters and pays five per completed pair',()=>{
  const pool=Array.from({length:12},(_,i)=>({...words[0],id:String(i)}));const base=createState();for(const w of pool)base.progress[w.id]={stage:0,due:'2026-10-22',firstSeen:'2026-10-20',lastStudied:'2026-10-20',lastAdvanced:'2026-10-20',failures:0};
  let s=startPractice(base,pool,'2026-10-21',()=>0);expect(sessionSummary(s)).toMatchObject({totalWords:10,totalTasks:20});expect(s.session!.tasks.map(t=>t.questionKind)).toEqual(Array.from({length:10},()=>['pinyin','word']).flat());
  s=answer(s,'2026-10-21');expect(s.xp).toBe(0);expect(stats(s,'2026-10-21').today).toBe(0);expect(s.progress[currentTask(s)!.wordId].lastStudied).toBe('2026-10-20');s=importBackup(exportBackup(s),pool);s=answer(s,'2026-10-21');expect(s.xp).toBe(5);expect(sessionSummary(s).completedWords).toBe(1);
 });
 it('reteaches once with the original completed trace and settles only the successful second answer',()=>{
  let s=confirmPreparation(startSelectedSession(createState(),words,['0'],'2026-10-21'));delete s.session!.xpVersion;const origin=currentTask(s)!.id;s=answer(s,'2026-10-21');expect(s.xp).toBe(2);s=answer(s,'2026-10-21',false);
  const retry=currentTask(s)!;expect(retry).toMatchObject({questionKind:'pinyin',retry:1,teachingOrigin:origin});expect(s.session!.practice![retry.id]).toMatchObject({phase:'teaching',completed:true});s=importBackup(exportBackup(s),words);s=answer(s,'2026-10-21');expect(s.xp).toBe(2);s=answer(s,'2026-10-21');expect(s.xp).toBe(5);expect(s.progress['0'].lastAdvanced).toBe('2026-10-21');expect(s.rewardLedger.filter(e=>e.source==='trace')).toHaveLength(1);expect(importBackup(exportBackup(s),words)).toEqual(s);
 });
 it('rejects reordered pairs, forged success, unsupported versions and mismatched origins',()=>{
  let s=confirmPreparation(startSelectedSession(createState(),words,['0'],'2026-10-21'));s=answer(s,'2026-10-21');
  const changes=[{assessmentPassed:[]},{flowVersion:3},{tasks:[...s.session!.tasks].reverse()},{assessmentPassed:[s.session!.tasks[1].id]},{tasks:s.session!.tasks.map(t=>({...t,teachingOrigin:'missing'}))}];for(const patch of changes)expect(()=>importBackup(JSON.stringify({...s,session:{...s.session,...patch}}),words)).toThrow();
 });
 it('validates correction origin and refuses pair evidence on correction tasks',()=>{
  let s=confirmPreparation(startSelectedSession(createState(),words,['0','1','2'],'2026-10-21'));s=answer(s,'2026-10-21',false);expect(importBackup(exportBackup(s),words)).toEqual(s);
  const correction=s.session!.tasks.find(t=>t.kind==='correction')!;expect(correction).toBeDefined();
  for(const patch of [{id:'fake:correction'},{pair:'fake'},{questionKind:'character'}]){const corrupt={...s,session:{...s.session,tasks:s.session!.tasks.map(t=>t===correction?{...t,...patch}:t)}};expect(()=>importBackup(JSON.stringify(corrupt),words)).toThrow();}
 });
 it('restores unversioned single-task learning without changing task IDs or rewards',()=>{
  const s=createState();s.session={id:'old',date:'2026-10-21',tasks:[{id:'old-task',wordId:'0',kind:'learn',questionKind:'character'}],cursor:0,completed:false,submissions:[],assessmentPassed:[]};let restored=importBackup(exportBackup(s),words);restored=answer(restored,'2026-10-21');expect(restored.session!.completed).toBe(true);expect(restored.session!.tasks[0].id).toBe('old-task');expect(restored.session!.flowVersion).toBeUndefined();expect(restored.xp).toBe(5);
 });
});

describe('review correctness regressions',()=>{
 it('keeps same-day allocations disjoint when a new word is selected again',()=>{let s=selected(createState(),['0'],'2026-10-21');s=answer(answer(s,'2026-10-21'),'2026-10-21');s=startSelectedSession(s,words,['0'],'2026-10-21');expect(s.dailyPlans![0].newWordIds).toEqual(['0']);expect(s.dailyPlans![0].reviewWordIds).toEqual([]);expect(()=>saveState(s,memory())).not.toThrow();});
 it('reserves safe balance headroom for pending rewards',()=>{const metadata={sourceId:'source',sessionId:'session',destination:'session|next',narrationId:'session|next|teach'};const base=createState();const pending={...base,rewardLedger:[{key:'practice:2026-10-21:0',date:'2026-10-21',source:'practice' as const,wordId:'0',xp:5,coins:1,pending:metadata}]};expect(()=>giftCoins(pending,Number.MAX_SAFE_INTEGER)).toThrow();const safe=giftCoins(pending,Number.MAX_SAFE_INTEGER-1);expect(settlePendingRewards(safe).coins).toBe(Number.MAX_SAFE_INTEGER);expect(()=>importBackup(JSON.stringify({...pending,coins:Number.MAX_SAFE_INTEGER}),words)).toThrow();expect(()=>importBackup(JSON.stringify({...pending,xp:Number.MAX_SAFE_INTEGER}),words)).toThrow();expect(()=>settlePendingRewards({...pending,xp:Number.MAX_SAFE_INTEGER})).toThrow();});
});
 describe('persisted reward entitlements',()=>{
 const metadata={sourceId:'source',sessionId:'session',destination:'session|next',narrationId:'session|next|teach'};
 it('saves trace and independent progress immediately while reserving rewards until narration',()=>{
 let s=confirmPreparation(startSelectedSession(createState(),words,['0'],'2026-10-21'));delete s.session!.xpVersion;const taskId=currentTask(s)!.id;
 s=completePractice(s,taskId,'2026-10-21',{deferRewards:metadata});expect(s.xp).toBe(0);expect(s.session!.practice![taskId].completed).toBe(true);expect(s.rewardLedger[0].pending).toEqual(metadata);
 s=finishTeaching(s);s=answerTask(s,{correct:true,submissionId:'a'},'2026-10-21',{deferRewards:metadata});s=answerTask(s,{correct:true,submissionId:'b'},'2026-10-21',{deferRewards:metadata});
 expect(s.progress['0'].lastAdvanced).toBe('2026-10-21');expect(s.xp).toBe(0);expect(s.coins).toBe(0);expect(s.rewardLedger.filter(e=>e.source==='practice')[0].xp).toBe(3);
 const store=memory();s=saveState(s,store);s=loadState(store,words);expect(settlePendingRewards(s,'wrong')).toBe(s);const settled=settlePendingRewards(s,metadata.narrationId);expect(settled.xp).toBe(5);expect(settled.coins).toBe(1);expect(settlePendingRewards(settled)).toBe(settled);expect(importBackup(exportBackup(settled),words)).toEqual(settled);
 });
 it('defers newly earned achievements too and rejects malformed entitlement metadata',()=>{
 const before=createState();before.coins=20;const next=redeemCard(before,0);const pending=deferRewardEntitlements(before,next,metadata);expect(pending.coins).toBe(0);expect(pending.owned).toEqual([0]);expect(settlePendingRewards(pending).coins).toBe(5);
 for(const patch of [{narrationId:''},{sessionId:3},{extra:'bad'}])expect(()=>importBackup(JSON.stringify({...pending,rewardLedger:pending.rewardLedger.map(e=>({...e,pending:{...metadata,...patch}}))}),words)).toThrow();
 });
 it('persists narration acknowledgement and never relocks replayed identities',()=>{const base=acknowledgeNarration(createState(),metadata.narrationId);expect(acknowledgeNarration(base,metadata.narrationId)).toBe(base);expect(importBackup(exportBackup(base),words)).toEqual(base);const funded={...base,coins:20};const next=redeemCard(funded,0);expect(deferRewardEntitlements(funded,next,metadata)).toBe(next);expect(()=>importBackup(JSON.stringify({...base,completedNarrations:[metadata.narrationId,metadata.narrationId]}),words)).toThrow();});
 it('does not infer mastery from a legacy stage-four record',()=>{const s=first();s.progress['0'].stage=4;expect(importBackup(exportBackup(s),words).progress['0'].mastered).toBeUndefined();s.progress['0'].mastered=true;expect(()=>importBackup(JSON.stringify(s),words)).toThrow();});
 });

 describe('independent page XP ledger',()=>{
 const date='2026-10-21';
 const fresh=()=>confirmPreparation(startSelectedSession(createState(),words,['0'],date));
 it('awards four pages totaling five immediately while only coins defer',()=>{
  let s=fresh();const id=currentTask(s)!.id,metadata={sourceId:'source',sessionId:'session',destination:'session|next',narrationId:'session|next|teach'};
  s=recordLearningPage(s,id,'intro','success',date);expect(s.xp).toBe(1);
  expect(recordLearningPage(s,id,'intro','failure',date)).toBe(s);
  s=completePractice(s,id,date,{deferRewards:metadata});expect(s.xp).toBe(3);
  s=finishTeaching(s);s=answerTask(s,{correct:true,submissionId:'a'},date,{deferRewards:metadata});expect(s.xp).toBe(4);
  s=answerTask(s,{correct:true,submissionId:'b'},date,{deferRewards:metadata});expect(s.xp).toBe(5);expect(s.coins).toBe(0);
  expect(s.rewardLedger.filter(e=>e.source==='learning-page').map(e=>[e.page,e.xp,e.coins,e.pending])).toEqual([['intro',1,0,undefined],['trace',2,0,undefined],['pinyin',1,0,undefined],['word',1,0,undefined]]);
  expect(rewardQuota(s,date,'0')).toMatchObject({independent:1,effort:10});
  expect(settlePendingRewards(s,'wrong')).toBe(s);expect(settlePendingRewards(s,metadata.narrationId)).toMatchObject({xp:5,coins:1});expect(importBackup(exportBackup(s),words)).toEqual(s);
 });
 it('deduplicates failed pages and retry origins, upgrading trace on its original date',()=>{
  let s=fresh();const id=currentTask(s)!.id;
  s=recordLearningPage(s,id,'intro','failure',date);s=recordLearningPage(s,id,'trace','failure',date);expect(s.xp).toBe(2);
  expect(recordLearningPage(s,id,'trace','failure',date)).toBe(s);
  s=completePractice(s,id,'2026-10-22');expect(s.xp).toBe(3);expect(s.rewardLedger[1]).toMatchObject({xp:2,date,targetXp:2,outcome:'success'});
  s=finishTeaching(s);s=answerTask(s,{correct:false,submissionId:'fail'},'2026-10-22');const retry=currentTask(s)!.id;
  expect(recordLearningPage(s,retry,'intro','success','2026-10-22')).toBe(s);
  s=finishTeaching(s);s=answerTask(s,{correct:true,submissionId:'retry-a'},'2026-10-22');expect(s.xp).toBe(4);
  s=answerTask(s,{correct:false,submissionId:'retry-b'},'2026-10-22');expect(s.xp).toBe(5);expect(s.rewardLedger.filter(e=>e.source==='learning-page')).toHaveLength(4);expect(importBackup(exportBackup(s),words)).toEqual(s);
 });
 it('records capped results and cannot move a trace upgrade to a fresh date',()=>{
  let s=fresh();for(let i=0;i<30;i++)grantReward(s,{key:`seed:${i}`,date,source:'practice',wordId:`seed${i}`,xp:5,coins:0});
  const id=currentTask(s)!.id;s=recordLearningPage(s,id,'trace','failure',date);expect(s.rewardLedger.at(-1)).toMatchObject({xp:0,targetXp:1});
  s=completePractice(s,id,'2026-10-22');expect(s.xp).toBe(150);expect(s.rewardLedger.at(-1)).toMatchObject({xp:0,targetXp:2,date});
  expect(importBackup(exportBackup(s))).toEqual(s);
 });
 it('resource failures and stale callbacks do not award, and save failure leaves retryable state',()=>{
  const s=fresh(),id=currentTask(s)!.id;
  expect(recordLearningPage(s,'stale','intro','success',date)).toBe(s);
  expect(skipPractice(s,id,'load-error',date).xp).toBe(0);
  const store=memory(),saved=saveState(s,store),before=store.getItem(STORAGE_KEY),next=recordLearningPage(saved,id,'intro','success',date);
  expect(()=>saveState(next,{getItem:store.getItem,setItem:()=>{throw Error('full');}})).toThrow(/保存失败/);expect(saved.xp).toBe(0);expect(store.getItem(STORAGE_KEY)).toBe(before);
  const retry=saveState(recordLearningPage(saved,id,'intro','success',date),store);expect(retry.xp).toBe(1);expect(loadState(store,words)).toEqual(retry);
 });
 it('strictly rejects malformed page metadata and preserves legacy mixed ledgers',()=>{
  let s=fresh();s=recordLearningPage(s,currentTask(s)!.id,'intro','failure',date);const e=s.rewardLedger[0];
  for(const patch of [{coins:1},{xp:2},{targetXp:2},{page:'unknown'},{outcome:'cancel'},{key:'bad'},{sessionId:'bad'},{teachingOrigin:'bad'},{pending:{sourceId:'s',sessionId:'s',destination:'s|next',narrationId:'s|next|teach'}}])expect(()=>importBackup(JSON.stringify({...s,rewardLedger:[{...e,...patch}]}),words)).toThrow();
  expect(()=>importBackup(JSON.stringify({...s,session:{...s.session,xpVersion:3}}),words)).toThrow();
  grantReward(s,{key:'old',date,source:'practice',wordId:'1',xp:5,coins:1});expect(importBackup(exportBackup(s),words)).toEqual(s);
  const legacy=fresh();delete legacy.session!.xpVersion;const result=completePractice(legacy,currentTask(legacy)!.id,date);expect(result.xp).toBe(2);expect(result.rewardLedger[0].source).toBe('trace');expect(importBackup(exportBackup(result),words)).toEqual(result);
 });
 });
