import {advanceStroke} from './data/hanzi';
export interface TracingStatus { taskId: string; character: string; acceptedStrokes: number; totalStrokes: number; complete: boolean }
export function createTracingStatus(taskId: string, character: string, totalStrokes = 0): TracingStatus {
  return {taskId, character, acceptedStrokes: 0, totalStrokes: Math.max(0, Math.floor(Number.isFinite(totalStrokes) ? totalStrokes : 0)), complete: false};
}
export function acceptTracingStroke(state: TracingStatus): TracingStatus {
  const acceptedStrokes = Math.min(state.totalStrokes, state.acceptedStrokes + 1);
  return {...state, acceptedStrokes, complete: state.totalStrokes > 0 && acceptedStrokes === state.totalStrokes};
}
export function isTracingComplete(state: TracingStatus | null | undefined, taskId: string, character: string): boolean {
  return !!state && state.taskId === taskId && state.character === character && state.totalStrokes > 0 && state.acceptedStrokes === state.totalStrokes && state.complete;
}
export type PracticeStatus = 'not-started' | 'in-progress' | 'complete' | 'skipped';
export const PRACTICE_SKIP_AFTER_MS = 180_000;
/** A bounded foreground heartbeat never credits a long sleep as active practice. */
export function advancePracticeTime(activeMs: number, elapsedMs: number, active: boolean): number {
  const total = Number.isFinite(activeMs) ? Math.max(0, activeMs) : 0;
  return total + (active && Number.isFinite(elapsedMs) ? Math.max(0, Math.min(1500, elapsedMs)) : 0);
}
/** Pure clock transition: reaching the end starts a fresh 3-second hold, not a partial hold. */
export interface DemoClock { position: number; waitingMs: number }
export function advanceDemo(clock: DemoClock, elapsedMs: number, speed: number, count: number): DemoClock {
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  if (clock.position >= count) {
    const waitingMs = clock.waitingMs + elapsed;
    return waitingMs >= 3000 ? {position: 0, waitingMs: 0} : {...clock, waitingMs};
  }
  const position = advanceStroke(clock.position, elapsed, speed, count);
  return {position: count - position < 1e-9 ? count : position, waitingMs: 0};
}
export function demoSpeed(count: number): number { return Math.min(2.5, Math.max(1, 1 + (count - 5) / 15)); }
