import {useEffect, useId, useRef, useState, type PointerEvent} from 'react';
import {medianLength, medianPath, strokeStep, type HanziData} from '../data/hanzi';
import {matchStroke, strokeTolerances, toBoardMedian, type StrokeContext, type Point} from '../strokeMatching';
import {acceptTracingStroke, advanceDemo, createTracingStatus, demoSpeed, type PracticeStatus, type TracingStatus} from '../strokeGate';

export interface StrokePlayerProps { data: HanziData; onStop?: () => void; taskId?: string; resetKey?: string | number; onTracingChange?: (status: TracingStatus) => boolean | void; practiceStatus?: PracticeStatus; paused?: boolean }
export function StrokePlayer({data,onStop,taskId='',resetKey,onTracingChange,practiceStatus,paused=false}: StrokePlayerProps) {
  const id = useId().replaceAll(':','');
  const [reduced,setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [position,setPosition] = useState(0), [playing,setPlaying] = useState(!reduced), [speed,setSpeed] = useState('auto'), [grid,setGrid] = useState(true);
  const [demoReset,setDemoReset] = useState(0);
  const [hidden,setHidden] = useState(() => document.hidden);
  const [ink,setInk] = useState<Point[][]>([]), [draft,setDraft] = useState<Point[]>([]), [feedback,setFeedback] = useState('从亮起的起笔点开始，按笔顺跟写。');
  const pointer = useRef<number | null>(null), points = useRef<Point[]>([]), inkFrame = useRef<number | null>(null);
  const device = useRef<StrokeContext>({cssSize:300,pointerType:'mouse'});
  const tracing = useRef(createTracingStatus(taskId,data.character,data.strokeCount));
  // Once completed, repeats belong only to this board, never persisted readiness or rewards.
  const completedOnce = useRef(practiceStatus==='complete');
  if(practiceStatus==='complete')completedOnce.current=true;
  const callback = useRef(onTracingChange); callback.current=onTracingChange;
  const publishTracing = () => {if(completedOnce.current)return;const accepted=callback.current?.(tracing.current);if(tracing.current.complete&&accepted!==false)completedOnce.current=true;};
  const stopRef = useRef(onStop); stopRef.current=onStop;
  const clearDraft = () => {pointer.current=null;points.current=[];if(inkFrame.current!==null)cancelAnimationFrame(inkFrame.current);inkFrame.current=null;setDraft([]);};
  const reset = () => {clearDraft();setInk([]);tracing.current=createTracingStatus(taskId,data.character,data.strokeCount);publishTracing();setFeedback('从亮起的起笔点开始，按笔顺跟写。');};
  useEffect(() => {
    if(typeof matchMedia==='undefined')return;
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>{setReduced(media.matches);if(media.matches){setPlaying(false);setPosition(0);}};
    media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
  },[]);
  useEffect(()=>{const change=()=>{setHidden(document.hidden);if(document.hidden)clearDraft();};document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
  useEffect(()=>{
    clearDraft();
    tracing.current=createTracingStatus(taskId,data.character,data.strokeCount);
    completedOnce.current=practiceStatus==='complete';
    if(practiceStatus==='complete'){
      tracing.current={...tracing.current,acceptedStrokes:data.strokeCount,complete:true};
      setInk(data.medians.map(toBoardMedian));setFeedback('跟写已经完成，可以试一试。');
    }else{setInk([]);if(practiceStatus!=='skipped')callback.current?.(tracing.current);}
    setPosition(0);setPlaying(!reduced);
    // Speech belongs to the caller's task. Old classroom cleanup must not stop a new queue.
    return()=>{if(inkFrame.current!==null)cancelAnimationFrame(inkFrame.current);pointer.current=null;points.current=[];};
  },[data,taskId,resetKey]);
  useEffect(()=>{if(paused||practiceStatus==='skipped')clearDraft();},[paused,practiceStatus]);
  useEffect(()=>{
    if(!playing || reduced || hidden || paused)return;
    let frame=0,previous:number|null=null,cancelled=false,clock={position,waitingMs:0};
    const tick=(now:number)=>{if(cancelled)return;const elapsed=previous===null?0:now-previous;previous=now;clock=advanceDemo(clock,elapsed,speed==='auto'?demoSpeed(data.strokeCount):Number(speed),data.strokeCount);setPosition(clock.position);frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>{cancelled=true;cancelAnimationFrame(frame);};
    // Position is owned by this clock while playing; manual controls stop it first.
  },[playing,reduced,hidden,paused,speed,data,taskId,resetKey,demoReset]);
  const point=(event: PointerEvent<SVGSVGElement> | globalThis.PointerEvent, svg: SVGSVGElement):Point=>{
    const matrix=svg.getScreenCTM();if(matrix){const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());return[p.x,p.y];}
    const r=svg.getBoundingClientRect();const scale=Math.min(r.width,r.height)/1024;return[(event.clientX-r.left-(r.width-1024*scale)/2)/scale,(event.clientY-r.top-(r.height-1024*scale)/2)/scale];
  };
  const append=(event:PointerEvent<SVGSVGElement>)=>{const samples=event.nativeEvent.getCoalescedEvents?.()??[];for(const sample of samples.length?samples:[event]){if(points.current.length<10000)points.current.push(point(sample,event.currentTarget));}};
  const finish=(event:PointerEvent<SVGSVGElement>,cancelled=false)=>{
    if(pointer.current!==event.pointerId)return;
    if(!cancelled)append(event);
    const line=points.current;
    clearDraft();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(cancelled||paused||practiceStatus==='skipped'||tracing.current.complete)return;
    const median=data.medians[tracing.current.acceptedStrokes];
    if(!median)return;
    const reference=toBoardMedian(median);
    const result=matchStroke(line,reference,device.current);
    // Capture the reference before incrementing: React may run this updater later.
    if(result.accepted){setInk(lines=>[...lines,reference]);tracing.current=acceptTracingStroke(tracing.current);publishTracing();setFeedback(tracing.current.complete?'每一笔都跟写好了！可以继续学习。':`这一笔写好了，继续第 ${tracing.current.acceptedStrokes+1} 笔。`);}else setFeedback(result.reason);
  };
  const current=ink.length, expected=current<data.strokeCount?toBoardMedian(data.medians[current]):null;
  const shown=position;
  return <div className="stroke-player"><div className="stroke-canvases">
    <div><h4>看笔顺</h4><svg className="stroke-board" viewBox="0 0 1024 1024" role="img" aria-label={`${data.character}的笔顺，${data.strokeCount}笔`}>
      {grid&&<Grid/>}<g transform="translate(0 900) scale(1 -1)"><defs>{data.strokes.map((path,i)=><clipPath id={`${id}-stroke-${i}`} key={i}><path d={path}/></clipPath>)}</defs>
      {data.strokes.map((path,i)=><path key={`ghost-${i}`} d={path} fill="#e5ded6"/>)}
      {data.strokes.map((path,i)=>{const progress=Math.max(0,Math.min(1,shown-i));if(!progress)return null;if(progress===1)return <path key={i} d={path} fill="#604442"/>;const length=Math.max(1,medianLength(data.medians[i]));return <path key={i} d={medianPath(data.medians[i])} clipPath={`url(#${id}-stroke-${i})`} fill="none" stroke="#b65867" strokeWidth="200" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${length+400}`} strokeDashoffset={(length+400)*(1-progress)}/>;})}</g></svg></div>
    <div><h4>逐笔跟写 · {current}/{data.strokeCount}</h4><svg className="stroke-board stroke-writing" style={{touchAction:'none'}} viewBox="0 0 1024 1024" role="img" aria-label={`按笔顺跟写${data.character}，已完成${current}笔`} onPointerDown={e=>{if(paused||hidden||practiceStatus==='skipped'||pointer.current!==null||tracing.current.complete||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();const rect=e.currentTarget.getBoundingClientRect();device.current={cssSize:Math.min(rect.width,rect.height),pointerType:e.pointerType};pointer.current=e.pointerId;points.current=[point(e,e.currentTarget)];setDraft([...points.current]);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(pointer.current!==e.pointerId)return;append(e);if(inkFrame.current===null)inkFrame.current=requestAnimationFrame(()=>{inkFrame.current=null;setDraft([...points.current]);});}} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>{if(pointer.current===e.pointerId)clearDraft();}}>
      {grid&&<Grid/>}<g transform="translate(0 900) scale(1 -1)">{data.strokes.map((path,i)=><path key={i} d={path} fill={i<current?'#46776b':i===current?'#b65867':'#604442'} opacity={i<current ? 1 : i===current ? .48 : .1}/>)}</g>
      {expected&&<circle cx={expected[0][0]} cy={expected[0][1]} r={strokeTolerances(medianLength(expected),device.current).endpointTolerance} fill="#b65867" fillOpacity=".25" stroke="#b65867" strokeWidth="3"/>}
      {[draft].filter(line=>line.length).map((line,i)=><path key={i} d={medianPath(line)} fill="none" stroke="#46776b" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round"/>)}</svg>
      <p role="status">{feedback}</p><button type="button" disabled={paused||practiceStatus==='skipped'} onClick={reset}>重新跟写</button></div></div>
    <p className="stroke-status" role="status">{reduced?'静态逐笔展示':`第 ${Math.min(data.strokeCount,Math.floor(position)+1)} 笔 / 共 ${data.strokeCount} 笔${position>=data.strokeCount?' · 等待3秒后再演示':''}`}</p>
    <div className="stroke-controls"><button type="button" disabled={reduced} onClick={()=>{stopRef.current?.();if(playing)setPlaying(false);else{if(position>=data.strokeCount)setPosition(0);setPlaying(true);}}}>{playing?'暂停':'播放笔顺'}</button>
      <button type="button" disabled={reduced} onClick={()=>{stopRef.current?.();setPosition(0);setDemoReset(n=>n+1);setPlaying(true);}}>重播</button>
      <button type="button" disabled={position<=0} onClick={()=>{setPlaying(false);setPosition(p=>strokeStep(p,-1,data.strokeCount));}}>上一笔</button>
      <button type="button" disabled={position>=data.strokeCount} onClick={()=>{setPlaying(false);setPosition(p=>strokeStep(p,1,data.strokeCount));}}>下一笔</button>
      <label>速度 <select value={speed} disabled={reduced} onChange={e=>setSpeed(e.target.value)}><option value="auto">自动</option><option value="0.5">慢速 0.5×</option><option value="1">正常 1×</option><option value="2">快速 2×</option></select></label>
      <label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>田字格</label></div>
    </div>;
}
function Grid(){return <g className="stroke-grid" fill="none" stroke="#dbcfc3" strokeWidth="3"><rect x="3" y="3" width="1018" height="1018"/><path d="M512 0V1024 M0 512H1024" strokeDasharray="14 14"/></g>;}
