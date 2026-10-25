import {beforeEach,describe,expect,it,vi} from 'vitest';
const harness=vi.hoisted(()=>({ref:{current:0},deps:[] as unknown[],effect:null as null|(()=>void)}));
vi.mock('react',()=>({
 useRef:()=>harness.ref,
 useEffect:(effect:()=>void,deps:unknown[])=>{if(deps.some((value,i)=>value!==harness.deps[i])||!harness.effect){harness.deps=deps;harness.effect=effect}},
}));
import {useRenderedNarration} from '../src/useRenderedNarration';
function render(request:number,identity:string|null,enabled:boolean,read:()=>void){harness.effect=null;useRenderedNarration(request,identity,enabled,read);}
function flush(){harness.effect?.();}
describe('App and Exam rendered narration effect',()=>{
 beforeEach(()=>{harness.ref.current=0;harness.deps=[];harness.effect=null});
 it('does not narrate saved active question on refresh, even after unrelated renders',()=>{
  const read=vi.fn();render(0,'saved:question',true,read);flush();render(0,'saved:question',true,read);flush();expect(read).not.toHaveBeenCalled();
 });
 it('waits for render effect and reads actual newly saved question once',()=>{
  const previous=vi.fn(),saved=vi.fn();render(0,'previous',true,previous);flush();
  render(1,'saved-next',true,saved);expect(saved).not.toHaveBeenCalled();flush();flush();
  render(1,'saved-next',true,saved);flush();expect(saved).toHaveBeenCalledTimes(1);expect(previous).not.toHaveBeenCalled();
 });
 it('save failure without a request never narrates',()=>{
  const read=vi.fn();render(0,'unchanged',true,read);flush();render(0,'unchanged',true,read);flush();expect(read).not.toHaveBeenCalled();
 });
 it('consumes mismatched stale task request without reading previous or later questions',()=>{
  const read=vi.fn();render(1,'old',false,read);flush();render(1,'new',true,read);flush();expect(read).not.toHaveBeenCalled();
 });
 it.each(['start','preparation confirmation','finish teaching','automatic next','feedback next','exam start','exam resume'])('%s request narrates once after saved render',()=>{
  const read=vi.fn();render(1,'saved',true,read);flush();flush();expect(read).toHaveBeenCalledTimes(1);
 });
 it('paused/completed exam request cannot leak into a later resume render',()=>{
  const read=vi.fn();render(1,null,false,read);flush();render(1,'exam:0',true,read);flush();expect(read).not.toHaveBeenCalled();render(2,'exam:0',true,read);flush();expect(read).toHaveBeenCalledTimes(1);
 });
});
