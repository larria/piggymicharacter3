import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {SessionCelebration, startSessionConfetti} from '../src/components/SessionCelebration';

function environment(reduced = false) {
  const canvas = {className: '', style: {cssText: ''}, setAttribute: vi.fn(), remove: vi.fn()};
  const motion = {matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn()};
  const appendChild = vi.fn();
  vi.stubGlobal('window', {matchMedia: () => motion});
  vi.stubGlobal('document', {createElement: vi.fn(() => canvas), body: {appendChild}});
  const fire = Object.assign(vi.fn(() => Promise.resolve(null)), {reset: vi.fn()});
  const create = vi.fn(() => fire);
  const load = vi.fn(async () => ({default: {create}} as unknown as {default: typeof import('canvas-confetti')}));
  return {canvas, motion, appendChild, fire, create, load};
}
async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }
afterEach(() => {vi.useRealTimers(); vi.unstubAllGlobals();});
describe('session celebration', () => {
  it('shows honest completion wording, flexible actual summary and only destination actions', () => {
    const html = renderToStaticMarkup(<SessionCelebration eventId="display" summary={<p>本轮获得 4 XP；1 猪头币待到账</p>} onHome={() => {}} onCollection={() => {}}/>);
    expect(html).toContain('完成今天这次练习');
    expect(html).toContain('1 猪头币待到账');
    expect(html).toContain('回首页'); expect(html).toContain('去看收藏');
    expect(html).not.toContain('下一个字'); expect(html).not.toContain('全部掌握');
  });
  it('fires a finite sequence on a custom noninteractive canvas only once per event across remounts', async () => {
    vi.useFakeTimers(); const env = environment();
    startSessionConfetti('finite', env.load); await flush();
    expect(env.create).toHaveBeenCalledWith(env.canvas, {resize: true, useWorker: false});
    expect(env.canvas.style.cssText).toContain('pointer-events:none');
    expect(env.canvas.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
    vi.advanceTimersByTime(2600);
    expect(env.fire).toHaveBeenCalledTimes(4); expect(env.fire.reset).toHaveBeenCalledOnce(); expect(env.canvas.remove).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    startSessionConfetti('finite', env.load); await flush(); expect(env.load).toHaveBeenCalledOnce();
  });
  it('skips importing for reduced motion and keeps that event consumed', async () => {
    const env = environment(true); startSessionConfetti('reduced', env.load); await flush();
    expect(env.load).not.toHaveBeenCalled();
    env.motion.matches = false; startSessionConfetti('reduced', env.load); await flush(); expect(env.load).not.toHaveBeenCalled();
  });
  it('cleans timers, animation and canvas immediately on leaving', async () => {
    vi.useFakeTimers(); const env = environment(); const stop = startSessionConfetti('leave', env.load); await flush(); stop();
    vi.advanceTimersByTime(5000); expect(env.fire).toHaveBeenCalledOnce(); expect(env.fire.reset).toHaveBeenCalledOnce(); expect(env.canvas.remove).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels late imports without consuming the event, including StrictMode effect replay', async () => {
    const env = environment(); let resolve!: (module: {default: typeof import('canvas-confetti')}) => void;
    const stop = startSessionConfetti('late', () => new Promise(done => {resolve = done;})); await flush(); stop(); resolve(await env.load()); await flush();
    expect(env.create).not.toHaveBeenCalled();
    const cleanup = startSessionConfetti('late', env.load); await flush(); expect(env.create).toHaveBeenCalledOnce(); cleanup();
  });
  it('absorbs rejected and synchronously throwing imports without mounting a canvas', async () => {
    const env = environment();
    startSessionConfetti('reject', () => Promise.reject(new Error('offline')));
    startSessionConfetti('throw', () => {throw new Error('offline');}); await flush();
    expect(env.appendChild).not.toHaveBeenCalled(); expect(env.motion.removeEventListener).toHaveBeenCalledTimes(2);
  });
  it('stops an active effect when reduced motion is enabled', async () => {
    vi.useFakeTimers(); const env = environment(); startSessionConfetti('motion-change', env.load); await flush();
    const listener = env.motion.addEventListener.mock.calls[0][1]; listener({matches: true});
    expect(env.fire.reset).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
});
