import { Pause } from 'lucide-react';
import { TaskProgressRing } from './TaskProgressRing';
import { sessionSummary, type State } from '../domain';

/** Actual retained task workload, including appended teaching/correction tasks. */
export function SessionProgress({ state, onPause }: { state: State; onPause?: () => void }) {
  const summary = sessionSummary(state);
  return <section className="session-progress session-progress-compact" aria-label="这次学习进度">
    <div className="session-progress-heading">
      <TaskProgressRing done={summary.totalTasks - summary.remainingTasks} total={summary.totalTasks} label="这次学习题目进度" />
      
      {onPause&&<button className="secondary session-pause" onClick={onPause}><Pause size={16}/>退出并保存</button>}
    </div>
  </section>;
}

export default SessionProgress;
