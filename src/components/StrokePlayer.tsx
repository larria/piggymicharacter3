import {useEffect, useId, useRef, useState, type PointerEvent} from 'react';
import {advanceStroke, medianLength, medianPath, strokeStep, type HanziData} from '../data/hanzi';

export interface StrokePlayerProps { data: HanziData; onStop?: () => void }
export function StrokePlayer({data,onStop}: StrokePlayerProps) {
  const id = useId().replaceAll(':','');
  const [position,setPosition] = useState(0), [playing,setPlaying] = useState(false), [speed,setSpeed] = useState(1), [grid,setGrid] = useState(true);
  const [reduced,setReduced] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ink,setInk] = useState<[number,number][][]>([]);
  const pointer = useRef<number | null>(null);
  const stopRef = useRef(onStop); stopRef.current = onStop;
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {setReduced(media.matches); if(media.matches) setPlaying(false);};
    media.addEventListener('change',change); return () => media.removeEventListener('change',change);
  },[]);
  useEffect(() => {setPosition(0);setPlaying(false);setInk([]);pointer.current=null;return () => stopRef.current?.();},[data.character]);
  useEffect(() => {
    if (!playing || reduced) return;
    let frame = 0, previous: number | null = null, cancelled = false;
    const tick = (now: number) => {
      if(cancelled) return;
      const elapsed = previous === null ? 0 : Math.max(0,now-previous); previous = now;
      setPosition(p => advanceStroke(p,elapsed,speed,data.strokeCount));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {cancelled=true;cancelAnimationFrame(frame);};
  },[playing,reduced,speed,data.character,data.strokeCount]);
  useEffect(() => {if(position >= data.strokeCount) setPlaying(false);},[position,data.strokeCount]);
  const point = (event: PointerEvent<SVGSVGElement>): [number,number] => {
    const r=event.currentTarget.getBoundingClientRect();
    return [Math.max(0,Math.min(1024,(event.clientX-r.left)/r.width*1024)),Math.max(0,Math.min(1024,(event.clientY-r.top)/r.height*1024))];
  };
  const endPointer = (event: PointerEvent<SVGSVGElement>) => {if(pointer.current===event.pointerId) {pointer.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);}};
  const shown = reduced ? data.strokeCount : position;
  return <div className="stroke-player">
    <div className="stroke-canvases">
      <div><h4>看笔顺</h4><svg className="stroke-board" viewBox="0 0 1024 1024" role="img" aria-label={`${data.character}的笔顺，${data.strokeCount}笔`}>
        {grid && <Grid/>}
        <g transform="translate(0 900) scale(1 -1)">
          <defs>{data.strokes.map((path,i)=><clipPath id={`${id}-stroke-${i}`} key={i}><path d={path}/></clipPath>)}</defs>
          {data.strokes.map((path,i)=><path key={`ghost-${i}`} d={path} fill="#e5ded6"/>)}
          {data.strokes.map((path,i) => {
            const progress = Math.max(0,Math.min(1,shown-i));
            if(progress===0) return null;
            if(progress===1) return <path key={i} d={path} fill="#604442"/>;
            const length = Math.max(1,medianLength(data.medians[i]));
            return <path key={i} d={medianPath(data.medians[i])} clipPath={`url(#${id}-stroke-${i})`} fill="none" stroke="#b65867" strokeWidth="200" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${length+400}`} strokeDashoffset={(length+400)*(1-progress)}/>;
          })}
        </g>
      </svg></div>
      <div><h4>自由跟写</h4><svg className="stroke-board stroke-writing" viewBox="0 0 1024 1024" role="img" aria-label={`在田字格上自由跟写${data.character}`} onPointerDown={e=>{if(pointer.current!==null || (e.pointerType==='mouse' && e.button!==0))return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);const startPoint=point(e);setInk(lines=>[...lines,[startPoint]]);}} onPointerMove={e=>{if(pointer.current!==e.pointerId)return;const p=point(e);setInk(lines=>lines.map((line,i)=>i===lines.length-1 && line.length<10000?[...line,p]:line));}} onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={()=>{pointer.current=null;}}>
        {grid && <Grid/>}<g transform="translate(0 900) scale(1 -1)" opacity=".13">{data.strokes.map((path,i)=><path key={i} d={path} fill="#604442"/>)}</g>
        {ink.map((line,i)=><path key={i} d={medianPath(line.length===1?[line[0],[line[0][0]+.1,line[0][1]]]:line)} fill="none" stroke="#46776b" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round"/>)}
      </svg><button type="button" onClick={()=>{pointer.current=null;setInk([]);}} disabled={!ink.length}>清空跟写</button></div>
    </div>
    <p className="stroke-status" role="status">{reduced ? `静态笔顺展示 · 共 ${data.strokeCount} 笔` : `第 ${Math.min(data.strokeCount,Math.floor(position)+1)} 笔 / 共 ${data.strokeCount} 笔${position>=data.strokeCount?' · 播放完成':''}`}</p>
    <div className="stroke-controls">
      <button type="button" disabled={reduced} onClick={()=>{stopRef.current?.();if(playing)setPlaying(false);else{if(position>=data.strokeCount)setPosition(0);setPlaying(true);}}}>{playing?'暂停':position>0 && position<data.strokeCount?'继续':'播放笔顺'}</button>
      <button type="button" disabled={reduced} onClick={()=>{stopRef.current?.();setPosition(0);setPlaying(true);}}>重播</button>
      <button type="button" disabled={reduced || position<=0} onClick={()=>{setPlaying(false);setPosition(p=>strokeStep(p,-1,data.strokeCount));}}>上一笔</button>
      <button type="button" disabled={reduced || position>=data.strokeCount} onClick={()=>{setPlaying(false);setPosition(p=>strokeStep(p,1,data.strokeCount));}}>下一笔</button>
      <label>速度 <select value={speed} disabled={reduced} onChange={e=>setSpeed(Number(e.target.value))}><option value="0.5">慢速 0.5×</option><option value="1">正常 1×</option><option value="2">快速 2×</option></select></label>
      <label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}/>田字格</label>
    </div>
    <p className="stroke-note">{reduced?'已遵循减少动态效果设置，笔画静态显示。':'点击播放后才会演示，随时可以暂停。'} 跟写仅供练习，不评判对错，也不计入奖励。</p>
  </div>;
}
function Grid(){return <g className="stroke-grid" fill="none" stroke="#dbcfc3" strokeWidth="3"><rect x="3" y="3" width="1018" height="1018"/><path d="M512 0V1024 M0 512H1024" strokeDasharray="14 14"/></g>;}
