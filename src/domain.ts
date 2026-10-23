import { grantReward, type RewardEntry } from './domain/rewards';
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
export interface Word { id: string; char: string; pinyin: string; words: string[]; sentences: string[] }
export interface Progress { stage: number; due: string; firstSeen: string; lastAdvanced: string | null; lastStudied: string; failures: number }
export interface Settings { dailyGoal: number; newLimit: number; weeklyGoal: number; sound: boolean; music: boolean }
export type TaskKind = 'assessment' | 'learn' | 'review' | 'correction';
export interface Task { id: string; wordId: string; kind: TaskKind; questionKind: 'character' | 'word'; pair?: string; notBefore?: number }
export interface Session { id: string; date: string; tasks: Task[]; cursor: number; completed: boolean; submissions: string[]; assessmentPassed: string[] }
export interface Log { id: string; date: string; wordId: string; kind: TaskKind; correct: boolean; hinted: boolean; advanced: boolean }
export interface Avatar { cardId: number; dataUrl: string }
export interface State { avatar: Avatar | null; version: 2; xp:number; coins:number; unlockedWallCount:number; passedGates:number[]; rewardLedger:RewardEntry[]; achievements:Record<string,{date:string;baseline:boolean}>; equippedTitle:string|null; exam:ExamSession|null; revision: number; settings: Settings; progress: Record<string, Progress>; logs: Log[]; rewards: string[]; owned: number[]; session: Session | null }
export interface Question { kind: 'character' | 'word'; prompt: string; options: string[]; answer: string; independent: boolean; cue?: string; maskedText: string; speechText: string; segments: { text: string; masked: boolean }[] }
export const INTERVALS = [1, 3, 7, 14, 30] as const;
export function createState(): State { return { avatar:null, version: 2, xp:0, coins:0, unlockedWallCount:1, passedGates:[], rewardLedger:[], achievements:{}, equippedTitle:null, exam:null, revision: 0, settings: { dailyGoal: 8, newLimit: 3, weeklyGoal: 3, sound: true, music: false }, progress: {}, logs: [], rewards: [], owned: [], session: null }; }
export function localDate(value: Date | string = new Date()): string { if (typeof value === 'string') { if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T12:00:00')) || new Date(value + 'T12:00:00').getDate() !== Number(value.slice(8))) throw new Error('日期无效'); return value; } if (!Number.isFinite(value.getTime())) throw new Error('日期无效'); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
export function addDays(date: string, days: number): string { const d = new Date(localDate(date) + 'T12:00:00'); d.setDate(d.getDate() + days); return localDate(d); }
export function effectiveDate(state: State, value: Date | string = new Date()): string { return [localDate(value), ...(state.session ? [state.session.date] : []), ...state.rewardLedger.map(e=>e.date), ...(state.exam?[state.exam.date]:[]), ...state.logs.map(l => l.date), ...Object.values(state.progress).map(p => p.lastStudied)].sort().at(-1)!; }
const copy = (state: State): State => JSON.parse(JSON.stringify(state)) as State;
export function buildQueue(state: State, words: Word[], value: Date | string = new Date()): Task[] { const date = effectiveDate(state, value); const studied = new Set(state.logs.filter(l => l.date === date).map(l => l.wordId)); const introduced = new Set(state.logs.filter(l => l.date === date && (l.kind === 'learn' || l.kind === 'assessment')).map(l => l.wordId)); const remainingGoal = Math.max(0, state.settings.dailyGoal - studied.size); const due = words.filter(w => !studied.has(w.id) && state.progress[w.id] && state.progress[w.id].due <= date).sort((a,b) => state.progress[a.id].due.localeCompare(state.progress[b.id].due) || a.id.localeCompare(b.id)); const reviews = due.slice(0, remainingGoal); const limit = Math.min(Math.max(0, state.settings.newLimit - introduced.size), Math.max(0, remainingGoal - reviews.length)); const fresh = words.filter(w => !state.progress[w.id] && !state.rewards.includes(`word:${date}:${w.id}`)).slice(0, limit); return [...reviews.map(w => ({ id: `${date}:${w.id}:review`, wordId: w.id, kind: 'review' as const, questionKind: 'character' as const })), ...fresh.map(w => ({ id: `${date}:${w.id}:learn`, wordId: w.id, kind: 'learn' as const, questionKind: 'character' as const }))]; }
export function startSession(state: State, words: Word[], value: Date | string = new Date()): State { if(state.exam&&!state.exam.completed) throw new Error('请先完成考试，再开始学习'); if (state.session && !state.session.completed) return state; const date = effectiveDate(state, value); const tasks = buildQueue(state, words, date); const s = copy(state); s.session = { id: `${date}:session:${state.logs.length}`, date, tasks, cursor: 0, completed: tasks.length === 0, submissions: [], assessmentPassed: [] }; return s; }
export function startSelectedSession(state: State, words: Word[], selectedIds: string[], value: Date | string = new Date()): State {
 if(state.exam&&!state.exam.completed) throw new Error('请先完成考试，再开始学习'); if (state.session && !state.session.completed) return state;
 const ids = [...new Set(selectedIds)];
 if (!ids.length || ids.length > 10 || ids.some(id => !words.some(w => w.id === id))) throw new Error('请选择字库中的1至10个字');
 const date = effectiveDate(state,value); const s = copy(state);
 const tasks: Task[] = ids.flatMap(wordId => { const pair = `${date}:selected:${state.logs.length}:${wordId}`; return [{id:`${pair}:a`,wordId,kind:'assessment',questionKind:'character',pair},{id:`${pair}:b`,wordId,kind:'assessment',questionKind:'word',pair}]; });
 s.session = {id:`${date}:selected:${state.logs.length}`,date,tasks,cursor:0,completed:false,submissions:[],assessmentPassed:[]}; return s;
}
/** Unlimited independent review, sharing ordinary daily rewards without advancing same-day stages. */
export function startPractice(state:State,words:Word[],value:Date|string=new Date(),rng:()=>number=Math.random):State {
 if(state.exam&&!state.exam.completed)throw new Error('请先完成考试，再开始学习');if(state.session&&!state.session.completed)return state;
 const pool=words.filter(w=>state.progress[w.id]?.lastAdvanced!=null);if(!pool.length)throw new Error('请先学习至少一个字');
 for(let i=pool.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const date=effectiveDate(state,value),id=`${date}:practice:${state.logs.length}`;return {...state,session:{id,date,tasks:pool.slice(0,10).map((w,i)=>({id:`${id}:${i}`,wordId:w.id,kind:'review',questionKind:i%2?'word':'character'})),cursor:0,completed:false,submissions:[],assessmentPassed:[]}};
}
export function sessionSummary(state: State) {
 const session = state.session; const tasks = session?.tasks ?? []; const pending = tasks.slice(session?.cursor ?? 0);
 const totalWords = new Set(tasks.map(t => t.wordId)).size; const remainingWords = new Set(pending.map(t => t.wordId)).size;
 return {totalWords,completedWords:totalWords-remainingWords,remainingWords,totalTasks:tasks.length,remainingTasks:pending.length};
}
export function currentTask(state: State): Task | null { const s = state.session; return s && !s.completed ? s.tasks[s.cursor] ?? null : null; }
export function markKnown(state: State, known: boolean): State { const task = currentTask(state); if (!task || task.kind !== 'learn' || !known) return state; const s = copy(state); const session = s.session!; const pair = task.id; session.tasks[session.cursor] = { ...task, kind: 'assessment', pair, id: `${pair}:a` }; session.tasks.splice(session.cursor + 1, 0, { ...task, kind: 'assessment', pair, questionKind: 'word', id: `${pair}:b` }); return s; }

export function answerTask(state: State, input: { correct: boolean; hinted?: boolean; independent?: boolean; submissionId: string }, value: Date | string = new Date()): State { const task = currentTask(state); if (!task || !input.submissionId || state.logs.some(l => l.id === input.submissionId)) return state; const s = copy(state); const session = s.session!; const date = effectiveDate(s, value); const hinted = !!input.hinted || input.independent === false; let p = s.progress[task.wordId]; let advanced = false; const valid = input.correct && !hinted && task.kind !== 'correction';
 if (task.kind === 'assessment' && task.pair && valid) session.assessmentPassed.push(task.id);
 const pairValid = task.kind !== 'assessment' || (task.questionKind === 'word' && session.assessmentPassed.includes(`${task.pair}:a`) && valid);
 if (!input.correct) { p = p ?? { stage: 0, due: addDays(date,1), firstSeen: date, lastAdvanced: null, lastStudied: date, failures: 0 }; p.stage = Math.max(0, p.stage - 1); p.due = addDays(date, 1); p.lastStudied = date; p.failures++; s.progress[task.wordId] = p;
 // Only schedule a correction when two other word tasks can actually intervene.
 const remainingIds = [...new Set(session.tasks.slice(session.cursor + 1).filter(t => t.wordId !== task.wordId && t.kind !== 'correction').map(t => t.wordId))]; if (task.kind !== 'correction' && remainingIds.length >= 2 && !session.tasks.some(t => t.kind === 'correction' && t.wordId === task.wordId)) { let second = session.cursor; session.tasks.forEach((t,i) => { if (t.wordId === remainingIds[1] && t.kind !== 'correction') second = i; }); session.tasks.splice(second + 1, 0, { id: `${task.id}:correction`, wordId: task.wordId, kind: 'correction', questionKind: 'word', notBefore: second + 1 }); }
 if (task.kind !== 'correction' && !task.id.endsWith(':teach')) { session.tasks = session.tasks.filter((t,i) => i <= session.cursor || !task.pair || t.pair !== task.pair); session.tasks.splice(session.cursor + 1, 0, { id: `${task.id}:teach`, wordId: task.wordId, kind: 'learn', questionKind: 'character' }); }
 } else if (valid && pairValid) { if (!p) { p = { stage: 0, due: addDays(date,1), firstSeen: date, lastAdvanced: date, lastStudied: date, failures: 0 }; advanced = true; } else if (p.lastAdvanced !== date && p.lastStudied < date && p.due <= date) { p.stage = Math.min(4, p.stage + 1); p.lastAdvanced = date; p.due = addDays(date, INTERVALS[p.stage]); advanced = true; } p.lastStudied = date; s.progress[task.wordId] = p; if(!s.rewards.includes(`word:${date}:${task.wordId}`))s.rewards.push(`word:${date}:${task.wordId}`); }
 if (task.kind === 'assessment' && input.correct && hinted) { session.tasks = session.tasks.filter((t,i) => i <= session.cursor || t.pair !== task.pair); session.tasks.splice(session.cursor + 1, 0, { id: `${task.id}:teach`, wordId: task.wordId, kind: 'learn', questionKind: 'character' }); }
 // Hints do not establish mastery; an unverified new word still returns tomorrow.
 if (input.correct && hinted && !p) s.progress[task.wordId] = { stage: 0, due: addDays(date,1), firstSeen: date, lastAdvanced: null, lastStudied: date, failures: 0 };
 if(valid) grantReward(s,{key:`practice:${input.submissionId}`,date,source:'practice',wordId:task.wordId,xp:5,coins:1}); else if(input.correct) grantReward(s,{key:`effort:${date}:${task.wordId}`,date,source:'effort',wordId:task.wordId,xp:1,coins:0});
 s.logs.push({ id: input.submissionId, date, wordId: task.wordId, kind: task.kind, correct: input.correct, hinted, advanced }); session.submissions.push(input.submissionId); session.cursor++; session.completed = session.cursor >= session.tasks.length; settleAchievements(s,date); return s; }
export function makeQuestion(task: Task, words: Word[], rng: () => number = Math.random): Question {
 const target = words.find(w => w.id === task.wordId); if (!target) throw new Error('字库中找不到该字');
 const curated = practiceByCharacter.get(target.char);
 const isWord = task.questionKind === 'word' && (!!curated || target.words.some(w => w.includes(target.char)));
 const answer = isWord ? curated?.word ?? target.words.find(w => w.includes(target.char))! : target.char;
 const sentence = (isWord ? curated?.wordSentence : curated?.characterSentence) ?? curated?.sentence ?? (target.sentences.find(x => x.includes(answer)) ?? answer);
 // Mask the whole answer for word questions, including every repeated occurrence.
 const pieces = sentence.split(answer); const segments: Question['segments'] = [];
 pieces.forEach((text,i) => { if (i) segments.push({text:'□',masked:true}); if (text) text.split(target.char).forEach((part,j) => { if (j) segments.push({text:'□',masked:true}); if (part) segments.push({text:part,masked:false}); }); });
 const maskedText = segments.map(s => s.text).join('');
 const cue = curated ? undefined : `读音线索：${target.pinyin}${isWord ? '（选择含这个读音的目标字的词语）' : ''}`;
 const candidates = curated ? (isWord ? curated.words : curated.characters) : [...new Set(words.filter(w => w.id !== target.id && w.pinyin !== target.pinyin).flatMap(w => isWord ? w.words.filter(x => !x.includes(target.char)) : [w.char]))];
 const shuffle = (items:string[]) => { for (let i=items.length-1;i>0;i--) { const j = Math.min(i,Math.max(0,Math.floor(rng()*(i+1)))); [items[i],items[j]]=[items[j],items[i]]; } return items; };
 const prompt = `${isWord ? '哪个词语能补全' : '选字补全'}「${maskedText}」？${cue ? ` ${cue}` : ''}`;
 return {kind:isWord ? 'word' : 'character',prompt,options:shuffle([answer,...shuffle([...new Set(candidates)].filter(x => x !== answer)).slice(0,3)]),answer,independent:!!curated,cue,maskedText,segments,speechText:prompt.replaceAll('□','空白')};
}
export function updateSettings(state: State, patch: Partial<Settings>): State { const settings = { ...state.settings, ...patch }; if (!Number.isInteger(settings.dailyGoal) || settings.dailyGoal < 1 || settings.dailyGoal > 30 || !Number.isInteger(settings.newLimit) || settings.newLimit < 0 || settings.newLimit > 10 || !Number.isInteger(settings.weeklyGoal) || settings.weeklyGoal < 1 || settings.weeklyGoal > 7 || typeof settings.sound !== 'boolean' || typeof settings.music !== 'boolean') throw new Error('设置超出允许范围'); return { ...state, settings }; }
export const WALL_COSTS = [20,30,50,80,120,170,230,300,400] as const;
export const MAX_WALLS = 10;
export function unlockNextWall(state: State): State { const count=state.unlockedWallCount;if(!Number.isInteger(count)||count<1||count>MAX_WALLS)throw new Error('收藏墙数量无效');if(count===MAX_WALLS)return state;const cost=WALL_COSTS[count-1];if(state.coins<cost)return state;return {...state,coins:state.coins-cost,unlockedWallCount:count+1}; }
export function redeemCard(state: State, index: number, cost = 20): State { if (!Number.isSafeInteger(index) || !cardIds.has(index) || !Number.isInteger(cost) || cost !== 20) throw new Error('兑换参数无效'); if (state.owned.includes(index) || state.coins < cost) return state; const next=JSON.parse(JSON.stringify(state)) as State;next.coins-=cost;next.owned.push(index);settleAchievements(next,effectiveDate(next));return next; }
export function stats(state: State, value: Date | string = new Date()) { const date = effectiveDate(state,value); const d = new Date(date + 'T12:00:00'); const monday = addDays(date, -((d.getDay() + 6) % 7)); const evidence = state.logs.filter(l => l.correct && !l.hinted && l.kind !== 'correction' && (l.kind !== 'assessment' || l.advanced)); const learned = Object.values(state.progress).filter(p => p.lastAdvanced !== null).length; const days = new Set(evidence.map(l => l.date)); let streak = 0; let day = days.has(date) ? date : addDays(date,-1); while (days.has(day)) { streak++; day = addDays(day,-1); } return { date, learned, streak, due: Object.values(state.progress).filter(p => p.due <= date).length, overdue: Object.values(state.progress).filter(p => p.due < date).length, stable: Object.values(state.progress).filter(p => p.stage >= 3).length, today: new Set(evidence.filter(l => l.date === date).map(l => l.wordId)).size, weekDays: new Set(evidence.filter(l => l.date >= monday && l.date <= date).map(l => l.date)).size }; }
