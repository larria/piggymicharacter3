import {afterEach,expect,it,vi} from 'vitest';
import {NarrationWait} from '../src/narrationWait';
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
it('emits ten immediately and every second through zero before release',()=>{
 vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn(),onTick=vi.fn();
 gate.start(()=>true,release,onTick);
 expect(onTick.mock.calls).toEqual([[10]]);
 for(let remaining=9;remaining>=0;remaining--){
  vi.advanceTimersByTime(999);expect(onTick).toHaveBeenCalledTimes(10-remaining);
  expect(release).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);expect(onTick).toHaveBeenLastCalledWith(remaining);
 }
 expect(onTick.mock.calls).toEqual(Array.from({length:11},(_,i)=>[10-i]));
 expect(release).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
 vi.advanceTimersByTime(10000);expect(onTick).toHaveBeenCalledTimes(11);
});
it('cancel stops countdown notifications and release',()=>{
 vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn(),onTick=vi.fn();
 gate.start(()=>true,release,onTick);vi.advanceTimersByTime(2000);gate.cancel();gate.cancel();
 vi.advanceTimersByTime(10000);expect(onTick.mock.calls).toEqual([[10],[9],[8]]);
 expect(release).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('invalid waits never emit, and invalidated waits stop emitting and releasing',()=>{
 vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn(),onTick=vi.fn();let valid=false;
 gate.start(()=>valid,release,onTick);expect(onTick).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 valid=true;gate.start(()=>valid,release,onTick);vi.advanceTimersByTime(1000);valid=false;
 vi.advanceTimersByTime(10000);expect(onTick.mock.calls).toEqual([[10],[9]]);expect(release).not.toHaveBeenCalled();
 expect(vi.getTimerCount()).toBe(0);
});
it('start replaces the previous countdown',()=>{
 vi.useFakeTimers();const gate=new NarrationWait(),oldRelease=vi.fn(),oldTick=vi.fn(),release=vi.fn(),onTick=vi.fn();
 gate.start(()=>true,oldRelease,oldTick);vi.advanceTimersByTime(9000);
 gate.start(()=>true,release,onTick);vi.advanceTimersByTime(1000);
 expect(oldTick).toHaveBeenCalledTimes(10);expect(oldRelease).not.toHaveBeenCalled();
 expect(onTick.mock.calls).toEqual([[10],[9]]);expect(release).not.toHaveBeenCalled();
 vi.advanceTimersByTime(9000);expect(release).toHaveBeenCalledTimes(1);
});
it('tick callback cancellation also guards the terminal release',()=>{
 vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn();
 gate.start(()=>true,release,remaining=>{if(remaining===0)gate.cancel();});
 vi.advanceTimersByTime(10000);expect(release).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('initial tick callback can cancel without leaving a timer',()=>{
 vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn(),onTick=vi.fn(()=>gate.cancel());
 gate.start(()=>true,release,onTick);vi.advanceTimersByTime(10000);
 expect(onTick.mock.calls).toEqual([[10]]);expect(release).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
});
it('terminal tick invalidation prevents release',()=>{
 vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn();let valid=true;
 gate.start(()=>valid,release,remaining=>{if(remaining===0)valid=false;});
 vi.advanceTimersByTime(10000);expect(release).not.toHaveBeenCalled();
});
it('releases only at ten seconds after failure',()=>{vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn();gate.start(()=>true,release);vi.advanceTimersByTime(9999);expect(release).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(release).toHaveBeenCalledTimes(1);});
it('retry replaces the old failure wait',()=>{vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn();gate.start(()=>true,release);vi.advanceTimersByTime(9000);gate.cancel();vi.advanceTimersByTime(1000);expect(release).not.toHaveBeenCalled();gate.start(()=>true,release);vi.advanceTimersByTime(10000);expect(release).toHaveBeenCalledTimes(1);});
it('exit cancellation and stale rendered task never release',()=>{vi.useFakeTimers();const gate=new NarrationWait(),release=vi.fn();gate.start(()=>false,release);vi.advanceTimersByTime(10000);gate.start(()=>true,release);gate.cancel();vi.advanceTimersByTime(10000);expect(release).not.toHaveBeenCalled();});
