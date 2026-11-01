import { describe, expect, it } from 'vitest';
import { answerTask, completePractice, confirmPreparation, createState, currentTask, finishTeaching, recordLearningPage, setPreparationClaims, settlePendingRewards, startSelectedSession, type State } from '../src/domain';
import { catalog } from '../src/data/catalog';
import { validateState } from '../src/storage';
import { claimRewardSummary, isIndependentlyClaimedWord, isIndependentlyLearnedWord, learningRewardSummary, learningSessionSummary } from '../src/learningCompletion';

const date = '2026-10-26';
function ready(): State {
  let s = confirmPreparation(startSelectedSession(createState(), catalog, ['手', '耳'], date));
  const id = currentTask(s)!.id;
  s = recordLearningPage(s, id, 'intro', 'success', date);
  return finishTeaching(completePractice(s, id, date), id);
}
function pair(): State {
  let s = answerTask(ready(), { correct: true, independent: true, submissionId: 'pinyin' }, date);
  return answerTask(s, { correct: true, independent: true, submissionId: 'word' }, date);
}
function claimedPair(): State {
  let s = confirmPreparation(setPreparationClaims(startSelectedSession(createState(), catalog, ['手', '耳'], date), ['手']));
  s = answerTask(s, { correct: true, submissionId: 'claim-pinyin' }, date);
  const id = currentTask(s)!.id;
  return answerTask(s, { correct: true, submissionId: 'claim-word' }, date, {
    deferRewards: { sourceId: id, sessionId: s.session!.id, destination: 'next', narrationId: 'claim-next' },
  });
}

describe('claim completion evidence and rewards', () => {
  it('accepts saved preparation claims without requiring newly advanced mastery', () => {
    const s = claimedPair(), id = s.session!.tasks[1].id;
    s.logs[1].advanced = false;
    expect(isIndependentlyClaimedWord(s, id)).toBe(true);
    expect(isIndependentlyLearnedWord(s, id)).toBe(false);
    expect(isIndependentlyClaimedWord(s, s.session!.tasks[0].id)).toBe(false);
  });
  it('rejects ordinary assessments, missing submissions, hints and incomplete pairs', () => {
    const s = claimedPair(), id = s.session!.tasks[1].id;
    const mutations: ((state: State) => void)[] = [
      state => { delete state.session!.preparation; },
      state => { state.session!.preparation!.confirmed = false; },
      state => { state.session!.preparation!.claimedWordIds = []; },
      state => { state.session!.cursor = 1; },
      state => { state.session!.submissions[0] = 'historical'; },
      state => { state.logs[0].hinted = true; },
      state => { state.logs[0].correct = false; },
      state => { state.logs[1].hinted = true; },
      state => { state.logs[1].correct = false; },
      state => { delete state.logs[1].pairComplete; },
      state => { state.session!.tasks[0].wordId = '耳'; },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(s); mutate(changed);
      expect(isIndependentlyClaimedWord(changed, id)).toBe(false);
    }
  });
  it('sums capped pair submissions separately from explicitly linked achievement rewards', () => {
    const s = claimedPair(), id = s.session!.tasks[1].id;
    const reward = s.rewardLedger.find(entry => entry.key === 'practice:claim-word')!;
    reward.xp = 2; reward.coins = 0;
    s.rewardLedger.push(
      { key: 'practice:unrelated', date, source: 'practice', taskId: id, wordId: '手', xp: 99, coins: 99 },
      { key: 'achievement:unrelated', date, source: 'achievement', xp: 50, coins: 50 },
      { key: 'achievement:linked', date, source: 'achievement', xp: 3, coins: 20, pending: { ...reward.pending! } },
    );
    expect(claimRewardSummary(s, id)).toEqual({
      xp: 7, coins: 1, pendingXp: 2, settledXp: 5, pendingCoins: 0, settledCoins: 1,
      achievements: { xp: 3, coins: 20, pendingXp: 3, settledXp: 0, pendingCoins: 20, settledCoins: 0 },
    });
    expect(claimRewardSummary(s, s.session!.tasks[0].id)).toEqual(claimRewardSummary(s, id));
    expect(claimRewardSummary(settlePendingRewards(s), id)).toMatchObject({ pendingXp: 0, settledXp: 7, achievements: { pendingXp: 0, settledCoins: 0 } });
    s.session!.preparation!.claimedWordIds = [];
    expect(claimRewardSummary(s, id)).toMatchObject({ xp: 0, coins: 0 });
  });
  it('keeps partial claimed-pair rewards without claiming completion', () => {
    const s = claimedPair(), id = s.session!.tasks[1].id;
    s.session!.cursor = 1; s.session!.submissions.pop();
    expect(isIndependentlyClaimedWord(s, id)).toBe(false);
    expect(claimRewardSummary(s, id)).toMatchObject({ xp: 5, coins: 1, pendingXp: 0 });
  });
});

describe('learning completion evidence', () => {
  it('requires actual independently submitted learn word and its own pinyin pair', () => {
    const s = pair(), id = s.session!.tasks[1].id;
    expect(isIndependentlyLearnedWord(validateState(s, catalog), id)).toBe(true);
    expect(isIndependentlyLearnedWord(ready(), id)).toBe(false);
    for (const field of ['hinted', 'correct', 'pairComplete', 'advanced'] as const) {
      const changed = structuredClone(s);
      changed.logs[1][field] = field === 'hinted';
      expect(isIndependentlyLearnedWord(changed, id)).toBe(false);
    }
    const changed = structuredClone(s); changed.logs[0].hinted = true;
    expect(isIndependentlyLearnedWord(changed, id)).toBe(false);
  });
  it('does not turn review or assessment into newly learned words', () => {
    const s = pair(); s.session!.tasks.forEach(t => t.kind = 'assessment'); s.logs.forEach(l => l.kind = 'assessment');
    expect(learningSessionSummary(s).independentlyLearnedWords).toBe(0);
  });
  it('counts actual session submissions rather than all same-date logs or cursor alone', () => {
    const s = pair(); s.logs.push({ ...s.logs[1], id: 'other-session' });
    expect(learningSessionSummary(s)).toMatchObject({ completedTasks: 2, independentWordIds: ['手'], independentlyLearnedWords: 1 });
    s.logs = s.logs.filter(l => l.id !== 'word');
    expect(learningSessionSummary(s)).toMatchObject({ completedTasks: 1, independentlyLearnedWords: 0 });
  });
  it('aggregates pages and paired practice by origin and splits reserved coins', () => {
    const s = pair(), id = s.session!.tasks[1].id;
    const reward = s.rewardLedger.find(e => e.source === 'practice')!;
    reward.pending = { sourceId: id, sessionId: s.session!.id, destination: 'next', narrationId: 'next-narration' };
    s.rewardLedger.push({ key: 'achievement:test', date, source: 'achievement', xp: 0, coins: 100 });
    s.rewardLedger.push({ key: 'practice:unrelated', date, source: 'practice', taskId: reward.taskId, wordId: '手', xp: 3, coins: 1 });
    expect(learningRewardSummary(s, id)).toEqual({ xp: 5, coins: 1, pendingXp: 0, settledXp: 5, pendingCoins: 1, settledCoins: 0 });
  });
  it('does not reuse historical learning evidence for a preexisting word', () => {
    const s = pair(), id = s.session!.tasks[1].id;
    s.logs.push({ ...s.logs[1], id: 'historical-learn', date: '2026-10-25' });
    s.logs[1].advanced = false;
    expect(isIndependentlyLearnedWord(s, id)).toBe(false);
  });
  it('summarizes all session rewards, including review, excluding unrelated awards', () => {
    const s = pair(), id = s.session!.tasks[1].id;
    s.session!.tasks.forEach(t => t.kind = 'review'); s.logs.forEach(l => l.kind = 'review');
    s.rewardLedger = [
      { key: 'practice:word', date, source: 'practice', taskId: id, wordId: '手', xp: 5, coins: 1 },
      { key: 'practice:pinyin', date, source: 'practice', taskId: s.session!.tasks[0].id, wordId: '手', xp: 0, coins: 1,
        pending: { sourceId: id, sessionId: s.session!.id, destination: 'next', narrationId: 'next-narration' } },
      { key: 'practice:elsewhere', date, source: 'practice', taskId: id, wordId: '手', xp: 5, coins: 1 },
      { key: 'achievement:a', date, source: 'achievement', xp: 0, coins: 100 },
    ];
    expect(learningSessionSummary(s)).toMatchObject({ completedTasks: 2, xp: 5, settledCoins: 1, pendingCoins: 1, independentlyLearnedWords: 0 });
    expect(learningSessionSummary(createState())).toMatchObject({ xp: 0, settledCoins: 0, pendingCoins: 0 });
  });
  it('summarizes current session page XP and excludes another session pages', () => {
    const s = pair();
    s.rewardLedger.push({ ...s.rewardLedger[0], key: 'different-session', sessionId: 'another-session' });
    expect(learningSessionSummary(s)).toMatchObject({ xp: 5, settledCoins: 1, pendingCoins: 0 });
  });
  it('links old paired word practice to its pinyin trace without teachingOrigin', () => {
    const s = pair(), id = s.session!.tasks[1].id, pinyinId = s.session!.tasks[0].id;
    s.session!.tasks.slice(0, 2).forEach(task => delete task.teachingOrigin);
    s.rewardLedger = [
      { key: 'trace:'+date+':手', date, source: 'trace', taskId: pinyinId, wordId: '手', xp: 2, coins: 0 },
      { key: 'practice:word', date, source: 'practice', taskId: id, wordId: '手', xp: 3, coins: 1 },
      { key: 'practice:old', date, source: 'practice', taskId: 'old-task', wordId: '手', xp: 5, coins: 1 },
    ];
    expect(learningRewardSummary(s, id)).toMatchObject({ xp: 5, coins: 1, settledCoins: 1, pendingCoins: 0 });
    expect(learningRewardSummary(s, pinyinId)).toEqual(learningRewardSummary(s, id));
  });
  it('handles legacy unpaired trace and practice with exact submitted task identity', () => {
    const s = pair(), id = s.session!.tasks[1].id;
    delete s.session!.tasks[1].teachingOrigin;
    delete s.session!.tasks[1].pair;
    s.rewardLedger = [
      { key: 'trace:'+date+':手', date, source: 'trace', taskId: id, wordId: '手', xp: 2, coins: 0 },
      { key: 'practice:word', date, source: 'practice', taskId: id, wordId: '手', xp: 3, coins: 1 },
      { key: 'practice:old', date, source: 'practice', taskId: 'old-task', wordId: '手', xp: 5, coins: 1 },
    ];
    expect(learningRewardSummary(s, id)).toMatchObject({ xp: 5, coins: 1, settledCoins: 1, pendingCoins: 0 });
  });
});
