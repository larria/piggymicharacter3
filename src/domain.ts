import { grantReward, deferRewardEntitlements, type RewardOptions, type RewardEntry } from './domain/rewards';
import { settleAchievements } from './domain/achievements';
import type { ExamSession } from './domain/exams';
export * from './domain/growth';
export * from './domain/rewards';
export * from './domain/achievements';
export * from './domain/exams';
export * from './domain/wall';
import { cardIds } from './data/cards';
import { isAvatarDataUrl } from './avatarCrop';
export function setAvatar(state: State, avatar: Avatar | null): State {
 if (avatar !== null && (!Number.isSafeInteger(avatar.cardId) || !cardIds.has(avatar.cardId) || !state.owned.includes(avatar.cardId) || !isAvatarDataUrl(avatar.dataUrl))) throw new Error('请选择已购买的卡片并保存256×256 JPEG头像（不超过256KB）');
 return {...state, avatar: avatar === null ? null : {...avatar}};
}
import { practiceByCharacter } from './data/practice';
import { resolvePinyinContext } from './pinyin';
export function giftCoins(state:State,amount:number):State {if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(state.coins+amount+state.rewardLedger.filter(e=>e.pending).reduce((n,e)=>n+e.coins,0)))throw new Error('赠币数量无效或余额超出安全范围');return {...state,coins:state.coins+amount};}
export interface Word { id: string; char: string; pinyin: string; words: string[]; sentences: string[] }
export interface Progress { mastered?: boolean; stage: number; due: string; firstSeen: string; lastAdvanced: string | null; lastStudied: string; failures: number }
export interface Settings { dailyGoal: number; newLimit: number; weeklyGoal: number; sound: boolean; music: boolean }
export type TaskKind = 'assessment' | 'learn' | 'review' | 'correction';
export interface Task { id: string; wordId: string; kind: TaskKind; questionKind: 'character' | 'word' | 'pinyin'; pair?: string; teachingOrigin?: string; retry?: 0 | 1; notBefore?: number }
export interface TaskPractice { phase: 'teaching' | 'ready'; activeMs: number; completed: boolean; skipped: boolean; skipReason?: 'timeout' | 'load-error' }
export interface DailyPlan { date: string; newWordIds: string[]; reviewWordIds: string[] }
export interface Session { flowVersion?: 2; id: string; date: string; tasks: Task[]; cursor: number; completed: boolean; submissions: string[]; assessmentPassed: string[]; learningRequired?: string[]; preparation?: { confirmed: boolean; claimedWordIds: string[] }; practice?: Record<string, TaskPractice> }
export interface Log { id: string; date: string; wordId: string; kind: TaskKind; correct: boolean; hinted: boolean; advanced: boolean; pairComplete?: boolean }
export interface Avatar { cardId: number; dataUrl: string }
export interface State { completedNarrations?:string[]; dailyPlans?: DailyPlan[]; avatar: Avatar | null; version: 2; xp:number; coins:number; unlockedWallCount:number; passedGates:number[]; rewardLedger:RewardEntry[]; achievements:Record<string,{date:string;baseline:boolean}>; equippedTitle:string|null; exam:ExamSession|null; revision: number; settings: Settings; progress: Record<string, Progress>; logs: Log[]; rewards: string[]; owned: number[]; session: Session | null }
export interface Question { kind: 'character' | 'word' | 'pinyin'; prompt: string; options: string[]; answer: string; independent: boolean; cue?: string; maskedText: string; speechText: string; segments: { text: string; masked: boolean }[] }
export const INTERVALS = [1, 3, 7, 14, 30] as const;
export function createState(): State { return { avatar:null, version: 2, xp:0, coins:0, unlockedWallCount:1, passedGates:[], rewardLedger:[], achievements:{}, equippedTitle:null, exam:null, revision: 0, settings: { dailyGoal: 30, newLimit: 20, weeklyGoal: 5, sound: true, music: false }, progress: {}, logs: [], rewards: [], owned: [], session: null }; }
export function localDate(value: Date | string = new Date()): string { if (typeof value === 'string') { if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T12:00:00')) || new Date(value + 'T12:00:00').getDate() !== Number(value.slice(8))) throw new Error('日期无效'); return value; } if (!Number.isFinite(value.getTime())) throw new Error('日期无效'); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
export function addDays(date: string, days: number): string { const d = new Date(localDate(date) + 'T12:00:00'); d.setDate(d.getDate() + days); return localDate(d); }
export function effectiveDate(state: State, value: Date | string = new Date()): string { return [localDate(value), ...(state.session ? [state.session.date] : []), ...state.rewardLedger.map(e=>e.date), ...(state.exam?[state.exam.date]:[]), ...state.logs.map(l => l.date), ...Object.values(state.progress).map(p => p.lastStudied)].sort().at(-1)!; }
const copy = (state: State): State => JSON.parse(JSON.stringify(state)) as State;
export function buildQueue(state: State, words: Word[], value: Date | string = new Date()): Task[] {
 const date = effectiveDate(state,value), plan = state.dailyPlans?.find(p=>p.date===date);
 const introduced = new Set([...(plan?.newWordIds??[]),...state.logs.filter(l=>l.date===date&&(l.kind==='learn'||l.kind==='assessment')).map(l=>l.wordId)]);
 const reviewed = new Set([...(plan?.reviewWordIds??[]),...state.logs.filter(l=>l.date===date&&l.kind==='review').map(l=>l.wordId)]);
 const allocated = new Set([...introduced,...reviewed]);
 const remaining = Math.max(0,state.settings.dailyGoal-allocated.size);
 const fresh = words.filter(w=>!state.progress[w.id]&&!allocated.has(w.id)&&!state.rewards.includes(`word:${date}:${w.id}`));
 const due = words.filter(w=>!allocated.has(w.id)&&!state.progress[w.id]?.mastered&&state.progress[w.id]?.due<=date).sort((a,b)=>state.progress[a.id].due.localeCompare(state.progress[b.id].due)||a.id.localeCompare(b.id));
 const availableNew = Math.min(fresh.length,Math.max(0,state.settings.newLimit-introduced.size),remaining);
 const preferredNew = Math.max(0,Math.floor(state.settings.dailyGoal/2)+1-introduced.size);
 let newCount = Math.min(availableNew,preferredNew);
 let reviewCount = Math.min(due.length,Math.max(0,remaining-newCount));
 newCount = Math.min(availableNew,Math.max(newCount,remaining-reviewCount));
 if(introduced.size+newCount>0) reviewCount = Math.min(reviewCount,Math.max(0,introduced.size+newCount-1-reviewed.size));
 return [...fresh.slice(0,newCount).map(w=>({id:`${date}:${w.id}:learn`,wordId:w.id,kind:'learn' as const,questionKind:'character' as const})),...due.slice(0,reviewCount).map(w=>({id:`${date}:${w.id}:review`,wordId:w.id,kind:'review' as const,questionKind:'character' as const}))];
}
/** One independently verified pinyin/word pair per allocated character. */
export function createTaskPair(task:Task):Task[] {
 const pair=task.id;
 return [{...task,id:`${pair}:a`,pair,questionKind:'pinyin',retry:task.retry??0,...(task.kind==='learn'?{teachingOrigin:task.teachingOrigin??`${pair}:a`}:{})},{...task,id:`${pair}:b`,pair,questionKind:'word',retry:task.retry??0,...(task.kind==='learn'?{teachingOrigin:task.teachingOrigin??`${pair}:a`}:{})}];
}
function prepareSession(state:State):State {
 const session=state.session!; session.practice={};
 for(const task of session.tasks) if(task.kind==='learn') session.practice[task.id]={phase:task.questionKind==='word'&&session.flowVersion===2?'ready':'teaching',activeMs:0,completed:task.questionKind==='word'&&session.flowVersion===2,skipped:false};
 if(session.tasks.some(t=>t.kind==='learn'))session.preparation={confirmed:false,claimedWordIds:[]};
 const plans=state.dailyPlans??(state.dailyPlans=[]);let plan=plans.find(p=>p.date===session.date);if(!plan){plan={date:session.date,newWordIds:[],reviewWordIds:[]};plans.push(plan);}
 for(const t of session.tasks){if(plan.newWordIds.includes(t.wordId)||plan.reviewWordIds.includes(t.wordId))continue;const ids=t.kind==='learn'&&!state.progress[t.wordId]?plan.newWordIds:plan.reviewWordIds;ids.push(t.wordId);}
 return state;
}
export function setPreparationClaims(state:State,wordIds:string[]):State {
 const prep=state.session?.preparation;if(!prep||prep.confirmed)return state;
 const ids=[...new Set(wordIds)];if(ids.some(id=>!state.session!.tasks.some(t=>t.kind==='learn'&&t.wordId===id&&!state.session!.learningRequired?.includes(t.id))))throw new Error('认领字不在本轮新字中');
 const s=copy(state);s.session!.preparation!.claimedWordIds=ids;return s;
}
export function confirmPreparation(state:State):State {
 if(!state.session?.preparation||state.session.preparation.confirmed)return state;
 const s=copy(state),session=s.session!,claims=new Set(session.preparation!.claimedWordIds);const assessments:Task[]=[],rest:Task[]=[];
 for(const task of session.tasks){if(task.kind==='learn'&&claims.has(task.wordId)){if(session.flowVersion===2){if(task.questionKind==='pinyin')assessments.push(...createTaskPair({id:task.pair!,wordId:task.wordId,kind:'assessment',questionKind:'pinyin'}));delete session.practice?.[task.id];continue;}assessments.push({...task,id:`${task.id}:a`,pair:task.id,kind:'assessment',questionKind:'pinyin'},{...task,id:`${task.id}:b`,pair:task.id,kind:'assessment',questionKind:'word'});delete session.practice?.[task.id];}else rest.push(task);}
 session.tasks=[...assessments,...rest];session.preparation!.confirmed=true;return s;
}
/** Initialize legacy teaching gates without rebuilding its queue or requiring batch preparation. */
export function ensureSessionPractice(state:State):State {
 const session=state.session;if(!session||session.completed)return state;
 const missing=session.tasks.slice(session.cursor).filter(t=>t.kind==='learn'&&!session.practice?.[t.id]);if(!missing.length)return state;
 const s=copy(state);s.session!.practice??={};for(const t of missing)s.session!.practice![t.id]={phase:'teaching',activeMs:0,completed:false,skipped:false};return s;
}
export function updatePracticeTime(state:State,taskId:string,deltaMs:number):State {
 state=ensureSessionPractice(state);
 const p=state.session?.practice?.[taskId];if(currentTask(state)?.id!==taskId||!p||p.phase!=='teaching'||!Number.isFinite(deltaMs)||deltaMs<=0)return state;
 const s=copy(state);s.session!.practice![taskId].activeMs+=Math.min(5000,Math.floor(deltaMs));return s;
}
export function completePractice(state:State,taskId:string,value:Date|string=new Date(),options:RewardOptions={}):State {
 state=ensureSessionPractice(state);
 const p=state.session?.practice?.[taskId],task=currentTask(state);if(state.session?.preparation&&!state.session.preparation.confirmed)return state; if(!p||task?.id!==taskId||p.completed||p.skipped||p.phase!=='teaching')return state;
 const s=copy(state);s.session!.practice![taskId].completed=true;
 grantReward(s,{key:`trace:${effectiveDate(s,value)}:${task.wordId}`,date:effectiveDate(s,value),source:'trace',wordId:task.wordId,taskId,xp:2,coins:0});return options.deferRewards?deferRewardEntitlements(state,s,options.deferRewards):s;
}
export function skipPractice(state:State,taskId:string,reason:'timeout'|'load-error'='timeout'):State {
 state=ensureSessionPractice(state);
 const p=state.session?.practice?.[taskId];if(currentTask(state)?.id!==taskId||!p||p.completed||p.skipped||(reason==='timeout'&&p.activeMs<180000))return state;
 const s=copy(state);Object.assign(s.session!.practice![taskId],{skipped:true,skipReason:reason});return s;
}
export function finishTeaching(state:State,taskId=currentTask(state)?.id):State {
 const p=taskId?state.session?.practice?.[taskId]:undefined;if(!p||currentTask(state)?.id!==taskId||(!p.completed&&!p.skipped)||p.phase==='ready')return state;
 const s=copy(state);s.session!.practice![taskId!].phase='ready';return s;
}
export function startSession(state: State, words: Word[], value: Date | string = new Date()): State { if(state.exam&&!state.exam.completed) throw new Error('请先完成考试，再开始学习'); if (state.session && !state.session.completed) return state; const date = effectiveDate(state, value); const tasks = buildQueue(state, words, date).flatMap(createTaskPair); const s = copy(state); s.session = { flowVersion:2, id: `${date}:session:${state.logs.length}`, date, tasks, cursor: 0, completed: tasks.length === 0, submissions: [], assessmentPassed: [] }; return prepareSession(s); }
export function startSelectedSession(state: State, words: Word[], selectedIds: string[], value: Date | string = new Date()): State {
 if(state.exam&&!state.exam.completed) throw new Error('请先完成考试，再开始学习'); if (state.session && !state.session.completed) return state;
 const ids = [...new Set(selectedIds)];
 if (!ids.length || ids.length > 10 || ids.some(id => !words.some(w => w.id === id))) throw new Error('请选择字库中的1至10个字');
 const date = effectiveDate(state,value); const s = copy(state);
 const tasks: Task[] = ids.map(wordId=>({id:`${date}:selected:${state.logs.length}:${wordId}`,wordId,kind:'learn' as const,questionKind:'character' as const})).flatMap(createTaskPair);
 s.session = {flowVersion:2,id:`${date}:selected:${state.logs.length}`,date,tasks,cursor:0,completed:false,submissions:[],assessmentPassed:[]}; return prepareSession(s);
}
/** Unlimited independent review, sharing ordinary daily rewards without advancing same-day stages. */
export function startPractice(state:State,words:Word[],value:Date|string=new Date(),rng:()=>number=Math.random):State {
 if(state.exam&&!state.exam.completed)throw new Error('请先完成考试，再开始学习');if(state.session&&!state.session.completed)return state;
 const pool=words.filter(w=>state.progress[w.id]?.lastAdvanced!=null);if(!pool.length)throw new Error('请先学习至少一个字');
 for(let i=pool.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const date=effectiveDate(state,value),id=`${date}:practice:${state.logs.length}`;return {...state,session:{flowVersion:2,id,date,tasks:pool.slice(0,10).flatMap((w,i)=>createTaskPair({id:`${id}:${i}`,wordId:w.id,kind:'review',questionKind:'pinyin'})),cursor:0,completed:false,submissions:[],assessmentPassed:[]}};
}
export function sessionSummary(state: State) {
 const session = state.session; const tasks = session?.tasks ?? []; const pending = tasks.slice(session?.cursor ?? 0);
 const totalWords = new Set(tasks.map(t => t.wordId)).size; const remainingWords = new Set(pending.map(t => t.wordId)).size;
 return {totalWords,completedWords:totalWords-remainingWords,remainingWords,totalTasks:tasks.length,remainingTasks:pending.length};
}
export function currentTask(state: State): Task | null { const s = state.session; return s && !s.completed ? s.tasks[s.cursor] ?? null : null; }
export function markKnown(state: State, known: boolean): State { if(state.session?.preparation&&!state.session.preparation.confirmed&&known&&!state.session.learningRequired?.includes(currentTask(state)?.id??''))return confirmPreparation(setPreparationClaims(state,[currentTask(state)!.wordId])); const task = currentTask(state); if (!task || task.kind !== 'learn' || !known || state.session?.learningRequired?.includes(task.id)) return state; const s = copy(state); const session = s.session!; const pair = session.flowVersion===2?task.pair!:task.id; if(session.flowVersion===2){session.tasks.splice(session.cursor,2,...createTaskPair({id:pair,wordId:task.wordId,kind:'assessment',questionKind:'pinyin'}));delete session.practice?.[`${pair}:a`];delete session.practice?.[`${pair}:b`];return s;}delete session.practice?.[task.id]; session.tasks[session.cursor] = { ...task, kind: 'assessment', questionKind:'pinyin', pair, id: `${pair}:a` }; session.tasks.splice(session.cursor + 1, 0, { ...task, kind: 'assessment', pair, questionKind: 'word', id: `${pair}:b` }); return s; }

export function answerTask(state: State, input: { correct: boolean; hinted?: boolean; independent?: boolean; submissionId: string }, value: Date | string = new Date(), options:RewardOptions={}): State { if(state.session?.flowVersion===2)return answerPairTask(state,input,value,options); const task = currentTask(state); if (state.session?.preparation && !state.session.preparation.confirmed) return state; if(task?.kind==='learn'&&state.session?.practice&&state.session.practice[task.id]?.phase!=='ready') return state; if (!task || !input.submissionId || state.logs.some(l => l.id === input.submissionId)) return state; const s = copy(state); const session = s.session!; const date = effectiveDate(s, value); const hinted = !!input.hinted || input.independent === false; let p = s.progress[task.wordId]; let advanced = false; const valid = input.correct && !hinted && task.kind !== 'correction';
 if (task.kind === 'assessment' && task.pair && valid) session.assessmentPassed.push(task.id);
 const pairValid = task.kind !== 'assessment' || (task.questionKind === 'word' && session.assessmentPassed.includes(`${task.pair}:a`) && valid);
 if (!input.correct) { p = p ?? { stage: 0, due: addDays(date,1), firstSeen: date, lastAdvanced: null, lastStudied: date, failures: 0 }; p.mastered=false; p.stage = Math.max(0, p.stage - 1); p.due = addDays(date, 1); p.lastStudied = date; p.failures++; s.progress[task.wordId] = p;
 // Only schedule a correction when two other word tasks can actually intervene.
 const remainingIds = [...new Set(session.tasks.slice(session.cursor + 1).filter(t => t.wordId !== task.wordId && t.kind !== 'correction').map(t => t.wordId))]; if (task.kind !== 'correction' && remainingIds.length >= 2 && !session.tasks.some(t => t.kind === 'correction' && t.wordId === task.wordId)) { let second = session.cursor; session.tasks.forEach((t,i) => { if (t.wordId === remainingIds[1] && t.kind !== 'correction') second = i; }); session.tasks.splice(second + 1, 0, { id: `${task.id}:correction`, wordId: task.wordId, kind: 'correction', questionKind: 'word', notBefore: second + 1 }); }
 if (task.kind !== 'correction' && !task.id.endsWith(':teach')) { session.tasks = session.tasks.filter((t,i) => i <= session.cursor || !task.pair || t.pair !== task.pair); session.tasks.splice(session.cursor + 1, 0, { id: `${task.id}:teach`, wordId: task.wordId, kind: 'learn', questionKind: 'character' }); }
 } else if (valid && pairValid) { if (!p) { p = { stage: 0, due: addDays(date,1), firstSeen: date, lastAdvanced: date, lastStudied: date, failures: 0 }; advanced = true; } else if (!p.mastered && p.lastAdvanced !== date && p.lastStudied < date && p.due <= date) { p.stage = Math.min(4, p.stage + 1); p.lastAdvanced = date; p.due = addDays(date, INTERVALS[p.stage]); advanced = true; } p.lastStudied = date; s.progress[task.wordId] = p; if(!s.rewards.includes(`word:${date}:${task.wordId}`))s.rewards.push(`word:${date}:${task.wordId}`); }
 if (task.kind === 'assessment' && input.correct && hinted) { session.tasks = session.tasks.filter((t,i) => i <= session.cursor || t.pair !== task.pair); session.tasks.splice(session.cursor + 1, 0, { id: `${task.id}:teach`, wordId: task.wordId, kind: 'learn', questionKind: 'character' }); }
 // Hints do not establish mastery; an unverified new word still returns tomorrow.
 if (input.correct && hinted && !p) s.progress[task.wordId] = { stage: 0, due: addDays(date,1), firstSeen: date, lastAdvanced: null, lastStudied: date, failures: 0 };
 const linkedTrace=s.rewardLedger.some(e=>e.source==='trace'&&e.taskId===task.id);
 if(valid) grantReward(s,{taskId:task.id,key:`practice:${input.submissionId}`,date,source:'practice',wordId:task.wordId,xp:linkedTrace?3:5,coins:1}); else if(input.correct&&!linkedTrace) grantReward(s,{key:`effort:${date}:${task.wordId}`,date,source:'effort',wordId:task.wordId,xp:1,coins:0});
 if(session.practice)for(const t of session.tasks)if(t.kind==='learn'&&!session.practice[t.id])session.practice[t.id]={phase:'teaching',activeMs:0,completed:false,skipped:false};
 s.logs.push({ id: input.submissionId, date, wordId: task.wordId, kind: task.kind, correct: input.correct, hinted, advanced }); session.submissions.push(input.submissionId); session.cursor++; session.completed = session.cursor >= session.tasks.length; settleAchievements(s,date); return options.deferRewards?deferRewardEntitlements(state,s,options.deferRewards):s; }
function answerPairTask(state:State,input:{correct:boolean;hinted?:boolean;independent?:boolean;submissionId:string},value:Date|string,options:RewardOptions):State {
 const task=currentTask(state),old=state.session!;
 if(!task||!input.submissionId||state.logs.some(l=>l.id===input.submissionId)||(old.preparation&&!old.preparation.confirmed)||(task.kind==='learn'&&old.practice?.[task.id]?.phase!=='ready'))return state;
 const s=copy(state),session=s.session!,date=effectiveDate(s,value),hinted=!!input.hinted||input.independent===false;
 const valid=input.correct&&!hinted&&task.kind!=='correction';
 if(valid&&task.pair)session.assessmentPassed.push(task.id);
 const complete=valid&&task.questionKind==='word'&&!!task.pair&&session.assessmentPassed.includes(`${task.pair}:a`);
 let p=s.progress[task.wordId],advanced=false;
 if(!input.correct){p??={stage:0,due:addDays(date,1),firstSeen:date,lastAdvanced:null,lastStudied:date,failures:0};p.mastered=false;p.stage=Math.max(0,p.stage-1);p.due=addDays(date,1);p.lastStudied=date;p.failures++;s.progress[task.wordId]=p;}
 if(!input.correct&&task.kind!=='correction'){
  const remaining=[...new Set(session.tasks.slice(session.cursor+1).filter(t=>t.wordId!==task.wordId&&t.kind!=='correction').map(t=>t.wordId))];
  if(remaining.length>=2&&!session.tasks.some(t=>t.kind==='correction'&&t.wordId===task.wordId)){let second=session.cursor;session.tasks.forEach((t,i)=>{if(t.wordId===remaining[1]&&t.kind!=='correction')second=i;});session.tasks.splice(second+1,0,{id:`${task.id}:correction`,wordId:task.wordId,kind:'correction',questionKind:'word'});}
 }
 if(complete){if(!p){p={stage:0,due:addDays(date,1),firstSeen:date,lastAdvanced:date,lastStudied:date,failures:0};advanced=true;}else if(p.lastAdvanced===null){p.lastAdvanced=date;advanced=true;}else if(!p.mastered&&p.lastAdvanced!==date&&p.lastStudied<date&&p.due<=date){if(p.stage===4&&task.kind==='review')p.mastered=true;p.stage=Math.min(4,p.stage+1);p.lastAdvanced=date;p.due=addDays(date,INTERVALS[p.stage]);advanced=true;}p.lastStudied=date;s.progress[task.wordId]=p;if(!s.rewards.includes(`word:${date}:${task.wordId}`))s.rewards.push(`word:${date}:${task.wordId}`);}
 if(!valid&&task.kind!=='correction'){
  for(const t of session.tasks.slice(session.cursor+1))if(t.pair===task.pair)delete session.practice?.[t.id];
  session.tasks=session.tasks.filter((t,i)=>i<=session.cursor||t.pair!==task.pair);
  // A failed claimed/ordinary pair gets exactly one teaching retry, never a new retry budget.
  if(!task.retry){const origin=task.teachingOrigin;const retry=createTaskPair({id:`${task.pair}:teach`,wordId:task.wordId,kind:'learn',questionKind:'pinyin',retry:1,teachingOrigin:origin});session.tasks.splice(session.cursor+1,0,...retry);session.practice??={};const previous=origin?session.practice[origin]:undefined;for(const t of retry)session.practice[t.id]=previous?.phase==='ready'?{...previous,phase:t.questionKind==='word'?'ready':'teaching'}:{phase:t.questionKind==='word'?'ready':'teaching',activeMs:0,completed:t.questionKind==='word',skipped:false};}
  if(hinted&&!p)s.progress[task.wordId]={stage:0,due:addDays(date,1),firstSeen:date,lastAdvanced:null,lastStudied:date,failures:0};
 }
 const origin=task.teachingOrigin??task.id,linkedTrace=s.rewardLedger.some(e=>e.source==='trace'&&e.taskId===origin);
 if(valid&&(task.kind==='assessment'||complete))grantReward(s,{taskId:linkedTrace?origin:task.id,key:`practice:${input.submissionId}`,date,source:'practice',wordId:task.wordId,xp:linkedTrace?3:5,coins:1});
 else if(input.correct&&!valid&&!linkedTrace)grantReward(s,{key:`effort:${date}:${task.wordId}`,date,source:'effort',wordId:task.wordId,xp:1,coins:0});
 s.logs.push({id:input.submissionId,date,wordId:task.wordId,kind:task.kind,correct:input.correct,hinted,advanced,pairComplete:complete});session.submissions.push(input.submissionId);session.cursor++;session.completed=session.cursor>=session.tasks.length;settleAchievements(s,date);return options.deferRewards?deferRewardEntitlements(state,s,options.deferRewards):s;
}
export function makeQuestion(task: Task, words: Word[], rng: () => number = Math.random): Question {
 const target = words.find(w => w.id === task.wordId); if (!target) throw new Error('字库中找不到该字');
 if(task.questionKind==='pinyin'){const context=resolvePinyinContext(target);const prompt=`输入「${context.word}」中「${target.char}」的不带声调拼音，并选择声调`;return {kind:'pinyin',prompt,options:[],answer:context.pinyin,independent:true,maskedText:prompt,speechText:'',segments:[]};}
 const curated = practiceByCharacter.get(target.char);
 const isWord = task.questionKind === 'word' && (!!curated || target.words.some(w => w.includes(target.char)));
 const context = resolvePinyinContext(target);
 const answer = isWord ? curated?.word ?? (context.word !== target.char ? context.word : target.words.find(w => w.includes(target.char))!) : target.char;
 const sentence = (isWord ? curated?.wordSentence : curated?.characterSentence) ?? curated?.sentence ?? (target.sentences.find(x => x.includes(answer)) ?? answer);
 // Mask the whole answer for word questions, including every repeated occurrence.
 const pieces = sentence.split(answer); const segments: Question['segments'] = [];
 pieces.forEach((text,i) => { if (i) segments.push({text:'□',masked:true}); if (text) segments.push({text,masked:false}); });
 const maskedText = segments.map(s => s.text).join('');
 const cue = curated ? undefined : `读音线索：${target.pinyin}${isWord ? '（选择含这个读音的目标字的词语）' : ''}`;
 const candidates = curated ? (isWord ? curated.words : curated.characters) : [...new Set(words.filter(w => w.id !== target.id && w.pinyin !== target.pinyin).flatMap(w => isWord ? w.words.filter(x => !x.includes(target.char)) : [w.char]))];
 const shuffle = (items:string[]) => { for (let i=items.length-1;i>0;i--) { const j = Math.min(i,Math.max(0,Math.floor(rng()*(i+1)))); [items[i],items[j]]=[items[j],items[i]]; } return items; };
 const prompt = `${isWord ? '哪个词语能补全' : '选字补全'}「${maskedText}」？${cue ? ` ${cue}` : ''}`;
 return {kind:isWord ? 'word' : 'character',prompt,options:shuffle([answer,...shuffle([...new Set(candidates)].filter(x => x !== answer)).slice(0,3)]),answer,independent:!!curated,cue,maskedText,segments,speechText:prompt.replaceAll('□','空白')};
}
export function updateSettings(state: State, patch: Partial<Settings>): State { const settings = { ...state.settings, ...patch }; if (!Number.isInteger(settings.dailyGoal) || settings.dailyGoal < 1 || settings.dailyGoal > 30 || !Number.isInteger(settings.newLimit) || settings.newLimit < 0 || settings.newLimit > 20 || !Number.isInteger(settings.weeklyGoal) || settings.weeklyGoal < 1 || settings.weeklyGoal > 7 || typeof settings.sound !== 'boolean' || typeof settings.music !== 'boolean') throw new Error('设置超出允许范围'); return { ...state, settings }; }
export const WALL_COSTS = [20,30,50,80,120,170,230,300,400] as const;
export const MAX_WALLS = 10;
export function unlockNextWall(state: State): State { const count=state.unlockedWallCount;if(!Number.isInteger(count)||count<1||count>MAX_WALLS)throw new Error('收藏墙数量无效');if(count===MAX_WALLS)return state;const cost=WALL_COSTS[count-1];if(state.coins<cost)return state;return {...state,coins:state.coins-cost,unlockedWallCount:count+1}; }
export function redeemCard(state: State, index: number, cost = 20): State { if (!Number.isSafeInteger(index) || !cardIds.has(index) || !Number.isInteger(cost) || cost !== 20) throw new Error('兑换参数无效'); if (state.owned.includes(index) || state.coins < cost) return state; const next=JSON.parse(JSON.stringify(state)) as State;next.coins-=cost;next.owned.push(index);settleAchievements(next,effectiveDate(next));return next; }
export function stats(state: State, value: Date | string = new Date()) { const date = effectiveDate(state,value); const d = new Date(date + 'T12:00:00'); const monday = addDays(date, -((d.getDay() + 6) % 7)); const evidence = state.logs.filter(l => l.correct && !l.hinted && l.kind !== 'correction' && l.pairComplete!==false && (l.kind !== 'assessment' || l.advanced)); const learned = Object.values(state.progress).filter(p => p.lastAdvanced !== null).length; const days = new Set(evidence.map(l => l.date)); let streak = 0; let day = days.has(date) ? date : addDays(date,-1); while (days.has(day)) { streak++; day = addDays(day,-1); } return { date, learned, streak, due: Object.values(state.progress).filter(p => !p.mastered && p.due <= date).length, overdue: Object.values(state.progress).filter(p => !p.mastered && p.due < date).length, stable: Object.values(state.progress).filter(p => p.stage >= 3).length, today: new Set(evidence.filter(l => l.date === date).map(l => l.wordId)).size, weekDays: new Set(evidence.filter(l => l.date >= monday && l.date <= date).map(l => l.date)).size }; }
