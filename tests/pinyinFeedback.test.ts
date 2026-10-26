import {afterEach,describe,expect,it,vi} from 'vitest';
import {PinyinFeedbackTimer} from '../src/pinyinFeedback';
describe('saved pinyin feedback timer',()=>{
 afterEach(()=>vi.useRealTimers());
 it('waits two seconds and advances once',()=>{vi.useFakeTimers();const timer=new PinyinFeedbackTimer();const next=vi.fn();timer.start(()=>true,next);vi.advanceTimersByTime(1999);expect(next).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(next).toHaveBeenCalledTimes(1);vi.runAllTimers();expect(next).toHaveBeenCalledTimes(1)});
 it('cancels navigation and replaces older schedules',()=>{vi.useFakeTimers();const timer=new PinyinFeedbackTimer();const next=vi.fn();timer.start(()=>true,next);timer.cancel();vi.runAllTimers();expect(next).not.toHaveBeenCalled();timer.start(()=>true,next);timer.start(()=>true,next);vi.runAllTimers();expect(next).toHaveBeenCalledTimes(1)});
 it('rejects changed destination or session and can restart after pause',()=>{vi.useFakeTimers();const timer=new PinyinFeedbackTimer();let live='session|next';const next=vi.fn();timer.start(()=>live==='session|next',next);live='another|next';vi.runAllTimers();expect(next).not.toHaveBeenCalled();live='session|next';timer.start(()=>live==='session|next',next);vi.runAllTimers();expect(next).toHaveBeenCalledTimes(1)});
});
