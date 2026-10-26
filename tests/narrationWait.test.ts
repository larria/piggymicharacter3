import {afterEach,expect,it,vi} from 'vitest';
import {NarrationWait} from '../src/narrationWait';
afterEach(()=>vi.useRealTimers());
it('releases only at ten seconds after failure',()=>{vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn();gate.start(()=>true,release);vi.advanceTimersByTime(9999);expect(release).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(release).toHaveBeenCalledTimes(1);});
it('retry replaces the old failure wait',()=>{vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn();gate.start(()=>true,release);vi.advanceTimersByTime(9000);gate.cancel();vi.advanceTimersByTime(1000);expect(release).not.toHaveBeenCalled();gate.start(()=>true,release);vi.advanceTimersByTime(10000);expect(release).toHaveBeenCalledTimes(1);});
it('exit cancellation and stale rendered task never release',()=>{vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn();gate.start(()=>false,release);vi.advanceTimersByTime(10000);gate.start(()=>true,release);gate.cancel();vi.advanceTimersByTime(10000);expect(release).not.toHaveBeenCalled();});
