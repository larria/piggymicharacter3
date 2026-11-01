import type { Log, State, Task } from './domain';

/** Submission IDs, not dates or word IDs, identify the work saved in this session. */
function sessionEvidence(state: State): { task: Task; log: Log }[] {
  const session = state.session;
  if (!session) return [];
  const logs = new Map(state.logs.map(log => [log.id, log]));
  return session.submissions.flatMap((id, index) => {
    const task = session.tasks[index], log = logs.get(id);
    return task && log && index < session.cursor && task.wordId === log.wordId && task.kind === log.kind
      ? [{ task, log }] : [];
  });
}

/** Shared proof from the two saved submissions, never from mastery or queue position. */
function independentPairEvidence(state: State, taskId: string, kind: 'learn' | 'assessment'): { task: Task; log: Log } | undefined {
  const evidence = sessionEvidence(state);
  const result = evidence.find(item => item.task.id === taskId);
  if (!result) return undefined;
  const { task, log } = result;
  if (task.kind !== kind || task.questionKind !== 'word' || !task.pair ||
      !log.correct || log.hinted || log.pairComplete !== true) return undefined;
  const pinyin = evidence.find(item => item.task.id === `${task.pair}:a`);
  if (!pinyin || pinyin.task.kind !== kind || pinyin.task.questionKind !== 'pinyin' ||
      pinyin.task.wordId !== task.wordId || !pinyin.log.correct || pinyin.log.hinted) return undefined;
  return result;
}

/** A fourth-page success is earned by a real, independent learning pair, not queue position. */
export function isIndependentlyLearnedWord(state: State, taskId: string): boolean {
  // Historical mastery does not prove that this session taught a new word.
  return independentPairEvidence(state, taskId, 'learn')?.log.advanced === true;
}

/** Only a confirmed preparation claim can turn an assessment pair into claim success. */
export function isIndependentlyClaimedWord(state: State, taskId: string): boolean {
  const result = independentPairEvidence(state, taskId, 'assessment');
  const preparation = state.session?.preparation;
  return !!result && preparation?.confirmed === true && preparation.claimedWordIds.includes(result.task.wordId);
}

export interface LearningRewardSummary {
  xp: number;
  coins: number;
  pendingXp: number;
  settledXp: number;
  pendingCoins: number;
  settledCoins: number;
}

export interface ClaimRewardSummary extends LearningRewardSummary {
  /** Separate from the practice totals above; only explicitly linked achievements count. */
  achievements: LearningRewardSummary;
}

function emptyRewardSummary(): LearningRewardSummary {
  return { xp: 0, coins: 0, pendingXp: 0, settledXp: 0, pendingCoins: 0, settledCoins: 0 };
}

/** Actual ledger amounts for this claimed pair, including partial/failed pairs, never estimates. */
export function claimRewardSummary(state: State, taskId: string): ClaimRewardSummary {
  const total: ClaimRewardSummary = { ...emptyRewardSummary(), achievements: emptyRewardSummary() };
  const session = state.session, task = session?.tasks.find(item => item.id === taskId);
  if (!session || !task || task.kind !== 'assessment' || !task.pair ||
      !session.preparation?.confirmed || !session.preparation.claimedWordIds.includes(task.wordId)) return total;
  const identities = new Set(session.tasks.filter(item => item.kind === 'assessment' &&
    item.pair === task.pair && item.wordId === task.wordId).map(item => item.id));
  const submissions = new Set(sessionEvidence(state).filter(item => identities.has(item.task.id)).map(item => item.log.id));
  for (const entry of state.rewardLedger) {
    const practice = entry.source === 'practice' && entry.wordId === task.wordId &&
      !!entry.taskId && identities.has(entry.taskId) && submissions.has(entry.key.replace(/^practice:/, ''));
    const achievement = entry.source === 'achievement' &&
      (entry.wordId === undefined || entry.wordId === task.wordId) &&
      ((entry.pending?.sessionId === session.id && identities.has(entry.pending.sourceId)) ||
        (entry.sessionId === session.id && !!entry.taskId && identities.has(entry.taskId)));
    if (!practice && !achievement) continue;
    const target = achievement ? total.achievements : total;
    target.xp += entry.xp;
    target.coins += entry.coins;
    if (entry.pending) { target.pendingXp += entry.xp; target.pendingCoins += entry.coins; }
    else { target.settledXp += entry.xp; target.settledCoins += entry.coins; }
  }
  return total;
}

/** Include actual capped ledger amounts; achievements and unrelated same-word work are excluded. */
export function learningRewardSummary(state: State, taskId: string): LearningRewardSummary {
  const session = state.session, task = session?.tasks.find(item => item.id === taskId);
  const total: LearningRewardSummary = { xp: 0, coins: 0, pendingXp: 0, settledXp: 0, pendingCoins: 0, settledCoins: 0 };
  if (!session || !task || task.kind !== 'learn') return total;
  const teachingIdentity = (item: Task) => item.teachingOrigin ?? (item.pair ? `${item.pair}:a` : item.id);
  const origin = teachingIdentity(task);
  const identities = new Set(session.tasks.filter(item => item.kind === 'learn' &&
    teachingIdentity(item) === origin).map(item => item.id));
  identities.add(origin);
  const submissionIds = new Set(sessionEvidence(state).filter(item => identities.has(item.task.id)).map(item => item.log.id));
  for (const entry of state.rewardLedger) {
    const page = entry.source === 'learning-page' && entry.sessionId === session.id && entry.teachingOrigin === origin;
    const legacy = (entry.source === 'trace' || entry.source === 'practice') && !!entry.taskId && identities.has(entry.taskId) &&
      (entry.source === 'trace' || submissionIds.has(entry.key.replace(/^practice:/, '')));
    if ((!page && !legacy) || entry.wordId !== task.wordId) continue;
    total.xp += entry.xp;
    total.coins += entry.coins;
    if (entry.pending) { total.pendingXp += entry.xp; total.pendingCoins += entry.coins; }
    else { total.settledXp += entry.xp; total.settledCoins += entry.coins; }
  }
  return total;
}

export function learningSessionSummary(state: State) {
  const evidence = sessionEvidence(state);
  const independentWordIds = [...new Set(evidence.filter(item => isIndependentlyLearnedWord(state, item.task.id)).map(item => item.task.wordId))];
  const session = state.session;
  const tasks = new Map(session?.tasks.map(task => [task.id, task]) ?? []);
  const submissions = new Set(evidence.map(item => item.log.id));
  const entries = state.rewardLedger.filter(entry => {
    if (!session || entry.source === 'achievement' || entry.source === 'quiz') return false;
    if (entry.source === 'learning-page') return entry.sessionId === session.id &&
      !!entry.teachingOrigin && tasks.get(entry.teachingOrigin)?.wordId === entry.wordId;
    if (entry.source === 'practice') return submissions.has(entry.key.replace(/^practice:/, '')) &&
      (!entry.taskId || tasks.get(entry.taskId)?.wordId === entry.wordId);
    if (entry.source === 'trace') return !!entry.taskId && tasks.get(entry.taskId)?.wordId === entry.wordId;
    // Old daily effort keys lack task identity; only explicit handoff metadata proves session ownership.
    return entry.pending?.sessionId === session.id;
  });
  const xp = entries.reduce((sum, entry) => sum + entry.xp, 0);
  const settledCoins = entries.filter(entry => !entry.pending).reduce((sum, entry) => sum + entry.coins, 0);
  const pendingCoins = entries.filter(entry => entry.pending).reduce((sum, entry) => sum + entry.coins, 0);
  return {
    xp,
    settledCoins,
    pendingCoins,
    totalTasks: state.session?.tasks.length ?? 0,
    completedTasks: evidence.length,
    correctTasks: evidence.filter(item => item.log.correct).length,
    independentCorrectTasks: evidence.filter(item => item.log.correct && !item.log.hinted && item.task.kind !== 'correction').length,
    independentWordIds,
    independentlyLearnedWords: independentWordIds.length,
  };
}
