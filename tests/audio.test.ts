import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {SpeechQueue} from '../src/audio/speech';
import {AudioCoordinator} from '../src/audio/coordinator';
class Utterance {lang='';rate=1;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(public text:string){}}
class FakeAudio {static all:FakeAudio[]=[];paused=true;loop=false;volume=1;onended:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(public src:string){FakeAudio.all.push(this)}play=vi.fn(async()=>{this.paused=false});pause=vi.fn(()=>{this.paused=true})}
let spoken:Utterance[];let cancel:ReturnType<typeof vi.fn>;let visibility:()=>void;let doc:{hidden:boolean;addEventListener:ReturnType<typeof vi.fn>;removeEventListener:ReturnType<typeof vi.fn>};
beforeEach(()=>{vi.useFakeTimers();spoken=[];cancel=vi.fn();FakeAudio.all=[];vi.stubGlobal('window',{speechSynthesis:{cancel,speak:(u:Utterance)=>spoken.push(u)}});vi.stubGlobal('SpeechSynthesisUtterance',Utterance);vi.stubGlobal('Audio',FakeAudio);doc={hidden:false,addEventListener:vi.fn((_name,fn)=>{visibility=fn}),removeEventListener:vi.fn()};vi.stubGlobal('document',doc)});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});
describe('speech ownership and sequencing',()=>{
 it('requires a speech gesture independently of music activation',()=>{const speech=new SpeechQueue();const audio=new AudioCoordinator(speech);audio.activate();const statuses=vi.fn();speech.subscribeStatus(statuses);speech.readLearning('task',{character:'山'});expect(spoken).toHaveLength(0);expect(statuses).toHaveBeenLastCalledWith('retry');speech.activateFromGesture();speech.readLearning('task',{character:'山'});expect(spoken[0].text).toBe('山');audio.dispose()});
 it('does not let stale same-owner playback cleanup cancel a replacement',()=>{const queue=new SpeechQueue();queue.activateFromGesture();const old=queue.readLearning('task',{character:'甲'});queue.readLearning('task',{character:'乙'});const count=cancel.mock.calls.length;old.cancel();expect(cancel).toHaveBeenCalledTimes(count);spoken[1].onend?.();vi.advanceTimersByTime(450);expect(spoken.at(-1)?.text).toBe('乙');queue.cancelAll()});
 it('does not start speech on a hidden page and exposes one retry status',()=>{const queue=new SpeechQueue();const statuses=vi.fn();queue.subscribeStatus(statuses);doc.hidden=true;queue.speak('task','甲');expect(spoken).toHaveLength(0);expect(statuses).toHaveBeenLastCalledWith('retry');queue.cancelAll();expect(statuses).toHaveBeenLastCalledWith('idle')});
 it('only lets the current owner cancel and ignores stale end callbacks',()=>{const queue=new SpeechQueue();queue.speak('a','甲');const old=spoken[0];queue.speak('b','乙');queue.cancel('a');old.onend?.();expect(spoken.map(u=>u.text)).toEqual(['甲','乙']);const count=cancel.mock.calls.length;queue.cancel('b');expect(cancel).toHaveBeenCalledTimes(count+1)});
 it('reads three slow characters then word and sentence',()=>{const queue=new SpeechQueue();queue.activateFromGesture();queue.readLearning('learning',{character:'山',word:'山水',sentence:'山上有树。'});for(let i=0;i<4;i++){spoken[i].onend?.();vi.advanceTimersByTime(450)}expect(spoken.map(u=>u.text)).toEqual(['山','山','山','山水','山上有树。']);expect(spoken.slice(0,3).map(u=>u.rate)).toEqual([.65,.65,.65]);queue.cancelAll()});
 it('does not read masked answers and cancels pending gap timers',()=>{const queue=new SpeechQueue();queue.readMasked('exam',[{text:'前',masked:false},{text:'秘密答案',masked:true},{text:'后',masked:false}],'character');spoken[0].onend?.();queue.cancel('exam');vi.runAllTimers();expect(spoken.map(u=>u.text)).toEqual(['前']);queue.readMasked('exam',[{text:'秘密答案',masked:true},{text:'后',masked:false}],'character');vi.advanceTimersByTime(500);expect(spoken.at(-1)?.text).toBe('哪个字');spoken.at(-1)?.onend?.();vi.advanceTimersByTime(500);expect(spoken.at(-1)?.text).toBe('后');queue.cancelAll()});
 it('reports failure once and ends active state on stuck engines',()=>{const queue=new SpeechQueue();const error=vi.fn();const active=vi.fn();queue.subscribe(active);queue.speak('a','甲',{onError:error});vi.advanceTimersByTime(15000);spoken[0].onerror?.();expect(error).toHaveBeenCalledTimes(1);expect(active).toHaveBeenLastCalledWith(false)});
});
describe('observable speech snapshots',()=>{
 it('tracks learning line identities only during utterances while retaining sequence ownership',()=>{
  const queue=new SpeechQueue();queue.activateFromGesture();queue.readLearning('task',{character:'山',word:'山水',sentence:'山上有树。'},undefined,{character:'char',word:'word',sentence:'sentence'});
  expect(queue.getSnapshot().identity).toBe('char');const generation=queue.getSnapshot().generation;
  for(let i=0;i<3;i++){spoken[i].onend?.();expect(queue.getSnapshot().identity).toBeNull();expect(queue.getSnapshot().owner).toBe('task');vi.advanceTimersByTime(450)}
  expect(queue.getSnapshot().identity).toBe('word');spoken[3].onend?.();vi.advanceTimersByTime(450);expect(queue.getSnapshot().identity).toBe('sentence');expect(queue.getSnapshot().generation).toBe(generation);
  spoken[4].onend?.();expect(queue.getSnapshot().identity).toBeNull();expect(queue.getSnapshot().owner).toBeNull();
 });
 it('provides stable immutable snapshots and unsubscribe without changing legacy subscriptions',()=>{
  const queue=new SpeechQueue();const initial=queue.getSnapshot();const changed=vi.fn();const active=vi.fn();const status=vi.fn();
  const unsubscribe=queue.subscribeSnapshot(changed);queue.subscribe(active);queue.subscribeStatus(status);
  expect(initial).toEqual({status:'idle',owner:null,identity:null,generation:0});expect(Object.isFrozen(initial)).toBe(true);expect(queue.getSnapshot()).toBe(initial);
  queue.speak('character','甲');expect(queue.getSnapshot()).toEqual({status:'speaking',owner:'character',identity:'character',generation:1});expect(active).toHaveBeenLastCalledWith(true);expect(status).toHaveBeenLastCalledWith('speaking');
  const playing=queue.getSnapshot();queue.cancel('other');expect(queue.getSnapshot()).toBe(playing);
  spoken[0].onend?.();expect(queue.getSnapshot()).toEqual({status:'idle',owner:null,identity:null,generation:1});expect(initial.status).toBe('idle');
  unsubscribe();const calls=changed.mock.calls.length;queue.cancelAll();expect(changed).toHaveBeenCalledTimes(calls);
 });
 it('notifies same-owner replacements and ignores stale handles and callbacks',()=>{
  const queue=new SpeechQueue();const seen:ReturnType<SpeechQueue['getSnapshot']>[]=[];queue.subscribeSnapshot(()=>seen.push(queue.getSnapshot()));
  const first=queue.speak('task','甲');const old=spoken[0];queue.speak('task','乙');const current=queue.getSnapshot();
  expect(current).toEqual({status:'speaking',owner:'task',identity:'task',generation:2});expect(seen.some(s=>s.status==='speaking'&&s.generation===1)).toBe(true);
  first.cancel();old.onend?.();old.onerror?.();expect(queue.getSnapshot()).toBe(current);
  queue.cancel('task');expect(queue.getSnapshot()).toEqual({status:'idle',owner:null,identity:null,generation:3});
 });
 it('keeps the sequence owner active during masked pauses and clears it at completion',()=>{
  const queue=new SpeechQueue();queue.readMasked('exam',[{text:'秘密',masked:true},{text:'后',masked:false}],'character');
  expect(queue.getSnapshot().owner).toBe('exam');expect(queue.getSnapshot().status).toBe('speaking');vi.advanceTimersByTime(500);
  spoken[0].onend?.();vi.advanceTimersByTime(500);spoken[1].onend?.();expect(queue.getSnapshot().owner).toBeNull();expect(queue.getSnapshot().status).toBe('idle');
 });
 it('attributes gesture denial and engine failures to the owner and permits owner cleanup',()=>{
  const queue=new SpeechQueue();queue.readLearning('learning',{character:'山'});expect(queue.getSnapshot()).toEqual({status:'retry',owner:'learning',identity:null,generation:2});
  queue.cancel('learning');expect(queue.getSnapshot().status).toBe('idle');queue.speak('word','山水');vi.advanceTimersByTime(15000);
  expect(queue.getSnapshot()).toEqual({status:'retry',owner:'word',identity:null,generation:5});queue.cancel('word');expect(queue.getSnapshot().owner).toBeNull();
 });
});
describe('audio coordination',()=>{
 it('does not cancel narration started by the gesture before a scene effect',()=>{const speech=new SpeechQueue();const audio=new AudioCoordinator(speech);audio.activate();speech.activateFromGesture();speech.readLearning('new-task',{character:'山'});const count=cancel.mock.calls.length;audio.setScene('learning');expect(cancel).toHaveBeenCalledTimes(count);spoken[0].onend?.();vi.advanceTimersByTime(450);expect(spoken).toHaveLength(2);audio.dispose()});
 it('defaults music off and throttles repeated clicks',()=>{const audio=new AudioCoordinator(new SpeechQueue());audio.activate();expect(FakeAudio.all).toHaveLength(0);audio.playSfx('click');audio.playSfx('click');expect(FakeAudio.all).toHaveLength(1);vi.advanceTimersByTime(120);audio.playSfx('click');expect(FakeAudio.all).toHaveLength(2);audio.dispose()});
 it('plays result once per scene entry and allows explicit retry after denial',async()=>{const audio=new AudioCoordinator(new SpeechQueue());audio.configure({music:true,sound:true});audio.setScene('result');audio.activate();const result=FakeAudio.all[0];await vi.advanceTimersByTimeAsync(0);result.paused=true;result.onended?.();audio.activate();audio.configure({music:true,sound:true});expect(result.play).toHaveBeenCalledTimes(1);audio.setScene('exam');audio.setScene('result');const retry=FakeAudio.all[1];await vi.advanceTimersByTimeAsync(0);retry.paused=true;retry.play.mockRejectedValueOnce(new Error('denied'));audio.activate();audio.activate();expect(retry.play).toHaveBeenCalledTimes(2);await vi.advanceTimersByTimeAsync(0);audio.activate();expect(retry.play).toHaveBeenCalledTimes(3);audio.dispose()});
 it('gates activation, ducks during speech, resumes, and silences exam',async()=>{const speech=new SpeechQueue();const audio=new AudioCoordinator(speech);audio.configure({music:true,sound:true});expect(FakeAudio.all).toHaveLength(0);audio.activate();const music=FakeAudio.all[0];expect(music.paused).toBe(false);await vi.advanceTimersByTimeAsync(0);speech.speak('a','甲');expect(music.paused).toBe(true);speech.cancel('a');expect(music.paused).toBe(false);audio.setScene('exam');expect(music.paused).toBe(true);audio.dispose()});
 it('cancels speech and effects while hidden and honors live settings',()=>{const speech=new SpeechQueue();const audio=new AudioCoordinator(speech);audio.configure({music:true,sound:true});audio.activate();audio.playSfx('correct');const effect=FakeAudio.all[1];speech.speak('a','甲');doc.hidden=true;visibility();expect(effect.paused).toBe(true);expect(FakeAudio.all[0].paused).toBe(true);audio.configure({sound:false,music:false});doc.hidden=false;visibility();audio.playSfx('wrong');expect(FakeAudio.all).toHaveLength(2);expect(FakeAudio.all[0].paused).toBe(true);audio.dispose();expect(doc.removeEventListener).toHaveBeenCalled()});
});

describe('speech terminal outcomes and first-entry lock',()=>{
 it('completes once only after every actual utterance end',async()=>{
  const queue=new SpeechQueue();queue.activateFromGesture();const done=vi.fn();
  const playback=queue.readLearning('first',{character:'山',word:'山水',sentence:'山上有树。'},undefined,{},done);
  for(let i=0;i<4;i++){spoken[i].onend?.();spoken[i].onend?.();vi.advanceTimersByTime(450)}
  expect(done).not.toHaveBeenCalled();spoken[4].onend?.();spoken[4].onend?.();spoken[4].onerror?.();
  await expect(playback.finished).resolves.toBe('completed');expect(done).toHaveBeenCalledExactlyOnceWith('completed');
 });
 it('reports timeout failure rather than timer success and ignores late engine events',async()=>{
  const queue=new SpeechQueue();const done=vi.fn();const playback=queue.speak('first','山',{onFinish:done});
  vi.advanceTimersByTime(15000);spoken[0].onend?.();spoken[0].onerror?.();
  await expect(playback.finished).resolves.toBe('failed');expect(done).toHaveBeenCalledExactlyOnceWith('failed');
 });
 it('resolves replacement, safety cancellation, and unavailable outcomes',async()=>{
  const queue=new SpeechQueue();const old=queue.speak('a','甲');const current=queue.speak('b','乙');
  await expect(old.finished).resolves.toBe('cancelled');queue.cancelAll();await expect(current.finished).resolves.toBe('cancelled');
  doc.hidden=true;await expect(queue.speak('a','甲').finished).resolves.toBe('unavailable');
  doc.hidden=false;vi.stubGlobal('SpeechSynthesisUtterance',undefined);await expect(queue.speak('a','甲').finished).resolves.toBe('unavailable');
 });
 it('protects first entry from other owners, same-owner replay, and cancellation until released',async()=>{
  const queue=new SpeechQueue();queue.activateFromGesture();const release=queue.acquireFirstEntryLock('first')!;
  expect(queue.acquireFirstEntryLock('other')).toBeNull();const first=queue.readLearning('first',{character:'山'});
  const count=cancel.mock.calls.length;first.cancel();queue.cancel('first');
  await expect(queue.speak('other','秘密').finished).resolves.toBe('cancelled');
  await expect(queue.readLearning('first',{character:'乙'}).finished).resolves.toBe('cancelled');
  expect(cancel).toHaveBeenCalledTimes(count);expect(spoken.map(u=>u.text)).toEqual(['山']);
  for(let i=0;i<3;i++){spoken[i].onend?.();vi.advanceTimersByTime(450)}
  await expect(first.finished).resolves.toBe('completed');release();queue.speak('other','乙');expect(spoken.at(-1)?.text).toBe('乙');queue.cancelAll();
 });
 it.each(['sequence','masked','speak'] as const)('protects a first quiz %s from replay and ordinary cancellation',async(method)=>{
  const queue=new SpeechQueue();const release=queue.acquireFirstEntryLock('app-question')!;
  const first=method==='sequence'?queue.sequence('app-question',[{text:'请选择拼音'}]):method==='masked'?queue.readMasked('app-question',[{text:'答案',masked:true}],'word'):queue.speak('app-question','请选择拼音');
  const count=cancel.mock.calls.length;first.cancel();queue.cancel('app-question');
  await expect(queue.sequence('app-question',[{text:'重播'}]).finished).resolves.toBe('cancelled');
  await expect(queue.speak('other','插话').finished).resolves.toBe('cancelled');
  expect(cancel).toHaveBeenCalledTimes(count);
  if(method==='masked')vi.advanceTimersByTime(500);
  expect(spoken).toHaveLength(1);spoken[0].onend?.();if(method==='masked')vi.advanceTimersByTime(500);
  await expect(first.finished).resolves.toBe('completed');release();queue.speak('app-question','重播');expect(spoken).toHaveLength(2);queue.cancelAll();
 });
 it('allows explicit safety cancellation to release first-entry protection',async()=>{
  const queue=new SpeechQueue();queue.activateFromGesture();queue.acquireFirstEntryLock('first');const first=queue.readLearning('first',{character:'山'});
  queue.cancelAll();await expect(first.finished).resolves.toBe('cancelled');queue.speak('other','乙');expect(spoken.at(-1)?.text).toBe('乙');queue.cancelAll();
 });
 it.each(['character','word'] as const)('reads a %s mask label between exact 500ms gaps without accessing its answer',async(kind)=>{
  const queue=new SpeechQueue();const masked={masked:true,get text():string{throw new Error('answer accessed')}};
  const playback=queue.readMasked('exam',[masked,{text:'后',masked:false}],kind);vi.advanceTimersByTime(499);expect(spoken).toHaveLength(0);
  vi.advanceTimersByTime(1);expect(spoken[0].text).toBe(kind==='character'?'哪个字':'哪个词');spoken[0].onend?.();
  vi.advanceTimersByTime(499);expect(spoken).toHaveLength(1);vi.advanceTimersByTime(1);expect(spoken[1].text).toBe('后');spoken[1].onend?.();
  await expect(playback.finished).resolves.toBe('completed');
 });
});
