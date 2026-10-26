import {useEffect, type ReactNode} from 'react';
import {Check, Sparkles} from 'lucide-react';
import './session-celebration.css';

export interface SessionCelebrationProps {
  /** Stable identity of the successfully saved, completed session, not a render ID. */
  eventId: string;
  title?: string;
  summary?: ReactNode;
  onHome: () => void;
  onCollection: () => void;
}

const celebratedEvents = new Set<string>();
type ConfettiModule = {default: typeof import('canvas-confetti')};

/** Kept separate from React so cancellation and lazy loading can be tested directly. */
export function startSessionConfetti(eventId: string, load: () => Promise<ConfettiModule> = () => import('canvas-confetti')): () => void {
  if (!eventId || celebratedEvents.has(eventId) || typeof document === 'undefined') return () => {};
  const motion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : undefined;
  if (motion?.matches) {
    celebratedEvents.add(eventId);
    return () => {};
  }
  let cancelled = false;
  let canvas: HTMLCanvasElement | undefined;
  let fire: ReturnType<ConfettiModule['default']['create']> | undefined;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const cleanup = () => {
    if (cancelled) return;
    cancelled = true;
    timers.forEach(clearTimeout);
    fire?.reset();
    canvas?.remove();
    motion?.removeEventListener?.('change', onMotionChange);
  };
  const onMotionChange = (event: MediaQueryListEvent) => { if (event.matches) cleanup(); };
  motion?.addEventListener?.('change', onMotionChange);
  // Resolve in a microtask as well, so a synchronously throwing importer is harmless.
  void Promise.resolve().then(load).then(module => {
    if (cancelled || celebratedEvents.has(eventId)) return;
    celebratedEvents.add(eventId);
    canvas = document.createElement('canvas');
    canvas.className = 'session-celebration-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1001;';
    document.body.appendChild(canvas);
    fire = module.default.create(canvas, {resize: true, useWorker: false});
    const burst = (origin: {x: number; y: number}, angle: number) => {
      if (!cancelled) void fire?.({particleCount: 38, spread: 62, startVelocity: 34, ticks: 85, gravity: 1.1, origin, angle, colors: ['#ba8255', '#edbf67', '#efb8c0', '#9fbba1'], disableForReducedMotion: true});
    };
    burst({x: 0.12, y: 0.7}, 65);
    timers.push(setTimeout(() => burst({x: 0.88, y: 0.7}, 115), 220));
    timers.push(setTimeout(() => burst({x: 0.3, y: 0.55}, 75), 500));
    timers.push(setTimeout(() => burst({x: 0.7, y: 0.55}, 105), 850));
    timers.push(setTimeout(cleanup, 2600));
  }).catch(cleanup);
  return cleanup;
}

/** Presentation only: rewards, saved-session eligibility and audio remain owned by App. */
export function SessionCelebration({eventId, title = '完成今天这次练习', summary, onHome, onCollection}: SessionCelebrationProps) {
  useEffect(() => startSessionConfetti(eventId), [eventId]);
  return <section className="session-celebration" aria-labelledby="session-celebration-title">
    <div className="session-celebration-content">
      <div className="session-celebration-emblem" aria-hidden="true"><Sparkles className="session-celebration-stars" size={36}/><Check size={76} strokeWidth={3}/></div>
      <p className="session-celebration-eyebrow">做得真棒，咪猪头！</p>
      <h1 id="session-celebration-title">{title}</h1>
      {summary != null && <div className="session-celebration-summary">{summary}</div>}
      <div className="session-celebration-actions">
        <button type="button" className="primary" onClick={onHome}>回首页</button>
        <button type="button" className="ghost" onClick={onCollection}>去看收藏</button>
      </div>
    </div>
  </section>;
}
