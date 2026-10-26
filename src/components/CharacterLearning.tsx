import {useEffect,useRef,useState} from 'react';
import type {Word} from '../domain';
import {loadHanzi,type HanziData} from '../data/hanzi';
import {advancePracticeTime,createTracingStatus,type PracticeStatus,type TracingStatus} from '../strokeGate';
import {StrokePlayer} from './StrokePlayer';
import {SpeakerButton} from './SpeakerButton';
import '../character-learning.css';
export interface CharacterLearningProps {word:Word;onSpeak:(text:string)=>void;onStop?:()=>void;taskId?:string;resetKey?:string|number;onTracingChange?:(status:TracingStatus)=>boolean|void;onTracingFailure?:()=>void;practiceStatus?:PracticeStatus;activeMs?:number;onActiveTime?:(totalMs:number)=>void;paused?:boolean;onLoadError?:(failed:boolean)=>void;tracingCelebration?:boolean;showSpeaker?:boolean}
export function CharacterLearning({word,onSpeak,onStop,taskId='',resetKey,onTracingChange,onTracingFailure,practiceStatus,activeMs=0,onActiveTime,paused=false,onLoadError,tracingCelebration=false,showSpeaker=true}:CharacterLearningProps){
  const [result,setResult]=useState<{character:string;data:HanziData|null}|null>(null),[retry,setRetry]=useState(0);
  const callback=useRef(onTracingChange);callback.current=onTracingChange;
  useEffect(()=>{let active=true;setResult(null);if(practiceStatus!=='complete'&&practiceStatus!=='skipped')callback.current?.(createTracingStatus(taskId,word.char));loadHanzi(word.char).then(data=>{if(active)setResult({character:word.char,data});});return()=>{active=false;};},[word.char,taskId,resetKey,retry]);
  const loaded=result?.character===word.char;
  const data=loaded?result.data:null;
  const loadCallback=useRef(onLoadError);loadCallback.current=onLoadError;
  useEffect(()=>{loadCallback.current?.(!!loaded&&!data);},[loaded,data]);
  const timeCallback=useRef(onActiveTime);timeCallback.current=onActiveTime;
  const [tracingFinished,setTracingFinished]=useState(practiceStatus==='complete'||practiceStatus==='skipped');
  useEffect(()=>{setTracingFinished(practiceStatus==='complete'||practiceStatus==='skipped');},[taskId,word.char,resetKey]);
  const total=useRef(activeMs),completed=useRef(practiceStatus==='complete'||practiceStatus==='skipped');
  useEffect(()=>{completed.current=practiceStatus==='complete'||practiceStatus==='skipped';},[practiceStatus,taskId,word.char,resetKey]);
  useEffect(()=>{total.current=Math.max(0,Number.isFinite(activeMs)?activeMs:0);},[activeMs,taskId,word.char,resetKey]);
  useEffect(()=>{
    if(tracingFinished||practiceStatus==='complete'||practiceStatus==='skipped')return;
    let previous=performance.now();
    const cleanupCallback=timeCallback.current;
    const tick=(persist=timeCallback.current)=>{const now=performance.now();const next=advancePracticeTime(total.current,now-previous,!!data&&!paused&&!document.hidden&&!completed.current);previous=now;if(next!==total.current){total.current=next;persist?.(next);}};
    const visibility=()=>{previous=performance.now();timeCallback.current?.(total.current);};
    const timer=window.setInterval(()=>tick(),1000);document.addEventListener('visibilitychange',visibility);
    return()=>{tick(cleanupCallback);window.clearInterval(timer);document.removeEventListener('visibilitychange',visibility);cleanupCallback?.(total.current);};
  },[data,paused,taskId,word.char,resetKey,tracingFinished,practiceStatus]);
  const tracingChange=(status:TracingStatus)=>{const accepted=callback.current?.(status);if(status.complete&&accepted!==false){completed.current=true;setTracingFinished(true);}return accepted;};
  return <section className={'character-learning '+(tracingCelebration?'tracing-celebration':'')} aria-label={`${word.char}的笔画学习`}>
    <div className="character-learning-heading"><h3>{word.char} · 笔画小课堂</h3>{showSpeaker&&<SpeakerButton owner="app" identity={`${word.id}:character`} label={`听听${word.char}和例子`} onPlay={()=>onSpeak(word.char)}/>}</div>
    {data?<><dl className="character-metadata"><div><dt>笔画</dt><dd>{data.strokeCount} 笔</dd></div><div><dt>部首</dt><dd>{data.radical??'未知'}</dd></div><div><dt>结构</dt><dd>{data.structure||'未知'}</dd></div></dl><StrokePlayer key={`${taskId}:${word.char}:${resetKey??''}:${retry}`} data={data} onStop={onStop} taskId={taskId} resetKey={resetKey} onTracingChange={tracingChange} onTracingFailure={onTracingFailure} practiceStatus={practiceStatus} paused={paused}/></>:<div className="character-fallback"><span className="character-fallback-glyph" aria-label={word.char}>{word.char}</span><p role="status">{loaded?'笔画资料暂不可用，请重试，也可以使用故障出口继续试题；这不会算作跟写完成。':'正在加载这个字的笔画…'}</p>{loaded&&<button type="button" onClick={()=>setRetry(n=>n+1)}>重试加载笔画</button>}</div>}
  </section>;
}
export default CharacterLearning;
