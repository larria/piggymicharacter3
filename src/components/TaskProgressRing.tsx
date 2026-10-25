import './task-progress.css';

export function taskProgress(done: number, total: number) {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const completed = Number.isFinite(done) ? Math.min(count, Math.max(0, Math.floor(done))) : 0;
  return { done: completed, total: count, ratio: count ? completed / count : 0 };
}

/** Numeric task completion, not an assessment of mastery. */
export function TaskProgressRing({ done, total, label = '题目进度' }: { done: number; total: number; label?: string }) {
  const progress = taskProgress(done, total);
  return <div className="task-progress-ring" role="progressbar" aria-label={label}
    aria-valuemin={0} aria-valuemax={Math.max(1, progress.total)} aria-valuenow={progress.done}
    aria-valuetext={`已完成 ${progress.done} / ${progress.total} 道题`}>
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle className="task-progress-track" cx="32" cy="32" r="28" />
      <circle className="task-progress-fill" cx="32" cy="32" r="28" pathLength="100"
        strokeDasharray={`${progress.ratio * 100} 100`} transform="rotate(-90 32 32)" />
    </svg>
    <span aria-hidden="true">{progress.done}<small>/{progress.total}</small></span>
  </div>;
}
