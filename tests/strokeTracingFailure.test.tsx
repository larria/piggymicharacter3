import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
import {readFileSync} from 'node:fs';

const hooks=vi.hoisted(()=>({slots:[] as any[],cursor:0,effects:[] as (()=>void)[],dirty:false}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),
 useId:()=> 'test',
 useState:(initial:any)=>{const i=hooks.cursor++;if(!(i in hooks.slots))hooks.slots[i]=typeof initial==='function'?initial():initial;return [hooks.slots[i],(value:any)=>{hooks.slots[i]=typeof value==='function'?value(hooks.slots[i]):value;hooks.dirty=true}]},
 useRef:(initial:any)=>{const i=hooks.cursor++;return hooks.slots[i]??(hooks.slots[i]={current:initial})},
 useEffect:(effect:()=>void|(()=>void),deps:any[])=>{const i=hooks.cursor++,old=hooks.slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j]))){hooks.slots[i]={deps,cleanup:old?.cleanup};hooks.effects.push(()=>{old?.cleanup?.();hooks.slots[i].cleanup=effect()})}},
}));
vi.mock('../src/data/hanzi',async original=>({...await original<typeof import('../src/data/hanzi')>(),loadHanzi:vi.fn()}));
import {StrokePlayer,type StrokePlayerProps} from '../src/components/StrokePlayer';
import {CharacterLearning} from '../src/components/CharacterLearning';
import {loadHanzi} from '../src/data/hanzi';
import {catalog} from '../src/data/catalog';
const data={character:'一',strokeCount:1,strokes:['M 100 400 L 900 400'],medians:[[[100,400],[900,400]] as [number,number][]],radical:null,structure:''};
let tree:ReactElement<any>,frame:FrameRequestCallback|undefined;
function render(component:()=>ReactElement<any>){do{hooks.dirty=false;hooks.cursor=0;tree=component();hooks.effects.splice(0).forEach(fn=>fn())}while(hooks.dirty)}
function nodes(node:any):ReactElement<any>[]{if(!node||typeof node!=='object'||!('props'in node))return [];return [node,...[node.props.children].flat(Infinity).flatMap(nodes)]}
function board(){return nodes(tree).find(n=>n.props.className==='stroke-board stroke-writing')!}
function demonstrate(props:StrokePlayerProps){render(()=>StrokePlayer(props));for(let now=0;now<=2000;now+=100){frame?.(now);render(()=>StrokePlayer(props))}expect(board()).toBeDefined()}
const svg={getScreenCTM:()=>null,getBoundingClientRect:()=>({left:0,top:0,width:1024,height:1024}),setPointerCapture:vi.fn(),hasPointerCapture:()=>true,releasePointerCapture:vi.fn()};
function event(x:number,y:number,id=1){return {pointerId:id,pointerType:'mouse',button:0,clientX:x,clientY:y,currentTarget:svg,nativeEvent:{},preventDefault:vi.fn()}}
function draw(points:[number,number][],cancel=false){const b=board();b.props.onPointerDown(event(...points[0]));for(const p of points.slice(1,-1))b.props.onPointerMove(event(...p));b.props[cancel?'onPointerCancel':'onPointerUp'](event(...points[points.length-1]))}
beforeEach(()=>{hooks.slots=[];hooks.cursor=0;hooks.effects=[];hooks.dirty=false;frame=undefined;
 vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn()});
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frame=fn;return 1});vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('window',{setInterval:vi.fn(),clearInterval:vi.fn()});
});
afterEach(()=>{hooks.slots.forEach(slot=>slot?.cleanup?.());vi.unstubAllGlobals();vi.clearAllMocks()});
describe('tracing failure callback',()=>{
 it('publishes only a rejected stroke, preserving accepted progress',()=>{const onTracingFailure=vi.fn(),onTracingChange=vi.fn();demonstrate({data,onTracingFailure,onTracingChange});onTracingChange.mockClear();draw([[100,100],[150,150]]);expect(onTracingFailure).toHaveBeenCalledOnce();expect(onTracingChange).not.toHaveBeenCalled();draw([[100,500],[300,500],[500,500],[700,500],[900,500]]);expect(onTracingFailure).toHaveBeenCalledOnce();expect(onTracingChange).toHaveBeenCalledWith(expect.objectContaining({acceptedStrokes:1,complete:true}))});
 it('does not count pointer cancellation, lost capture or unmatched pointer up',()=>{const onTracingFailure=vi.fn();demonstrate({data,onTracingFailure});draw([[100,100],[150,150]],true);const b=board();b.props.onPointerDown(event(100,100));b.props.onLostPointerCapture(event(100,100));b.props.onPointerUp(event(150,150));b.props.onPointerUp(event(150,150,2));expect(onTracingFailure).not.toHaveBeenCalled()});
 it.each(['paused','skipped'] as const)('does not report failure while %s',mode=>{const onTracingFailure=vi.fn();const props:StrokePlayerProps={data,onTracingFailure};demonstrate(props);board().props.onPointerDown(event(100,100));if(mode==='paused')props.paused=true;else props.practiceStatus=mode;render(()=>StrokePlayer(props));board().props.onPointerUp(event(150,150));expect(onTracingFailure).not.toHaveBeenCalled()});
 it('passes the callback through CharacterLearning, but not a missing resource',async()=>{const onTracingFailure=vi.fn(),props={word:catalog[0],onSpeak:vi.fn(),onTracingFailure};vi.mocked(loadHanzi).mockResolvedValue(data);render(()=>CharacterLearning(props));await Promise.resolve();render(()=>CharacterLearning(props));expect(nodes(tree).find(n=>n.type===StrokePlayer)?.props.onTracingFailure).toBe(onTracingFailure);vi.mocked(loadHanzi).mockResolvedValue(null);render(()=>CharacterLearning({...props,resetKey:1}));await Promise.resolve();render(()=>CharacterLearning({...props,resetKey:1}));expect(nodes(tree).some(n=>n.type===StrokePlayer)).toBe(false);expect(onTracingFailure).not.toHaveBeenCalled()});
 it('limits regular and reduced-motion celebration to the writing board',()=>{const css=readFileSync(new URL('../src/character-learning.css',import.meta.url),'utf8');expect(css.match(/\.tracing-celebration \.stroke-board\.stroke-writing/g)).toHaveLength(2);expect(css).not.toMatch(/\.tracing-celebration \.stroke-board\s*\{/)});
});
