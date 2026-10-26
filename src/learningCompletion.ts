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

/** A fourth-page success is earned by a real, independent learning pair, not queue position. */
export function isIndependentlyLearnedWord(state: State, taskId: string): boolean {
  const evidence = sessionEvidence(state);
  const result = evidence.find(item => item.task.id === taskId);
  if (!result) return false;
  const { task, log } = result;
  if (task.kind !== 'learn' || task.questionKind !== 'word' || !task.pair ||
      !log.correct || log.hinted || log.pairComplete !== true) return false;
  const pinyin = evidence.find(item => item.task.id === `${task.pair}:a`);
  if (!pinyin || pinyin.task.kind !== 'learn' || pinyin.task.questionKind !== 'pinyin' ||
      pinyin.task.wordId !== task.wordId || !pinyin.log.correct || pinyin.log.hinted) return false;
  // Historical mastery does not prove that this session taught a new word.
  return log.advanced;
}

export interface LearningRewardSummary {
  xp: number;
  coins: number;
  pendingXp: number;
  settledXp: number;
  pendingCoins: number;
  settledCoins: number;
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
