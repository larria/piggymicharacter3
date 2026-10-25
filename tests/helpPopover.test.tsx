import {afterEach,describe,expect,it,vi} from 'vitest';

const harness=vi.hoisted(()=>({open:false,refs:[] as {current:any}[],cursor:0,effect:undefined as undefined|(()=>void|(()=>void)),deps:undefined as unknown[]|undefined,cleanup:undefined as undefined|(()=>void)}));
vi.mock('react',async importOriginal=>({...await importOriginal<typeof import('react')>(),
 useState:()=>[harness.open,(value:boolean)=>{harness.open=value}],
 useId:()=> 'help-owner',
 useRef:(initial:unknown)=>{const index=harness.cursor++;return harness.refs[index]??(harness.refs[index]={current:initial})},
 useEffect:(effect:()=>void|(()=>void),deps:unknown[])=>{if(!harness.deps||deps.some((value,index)=>value!==harness.deps![index])){harness.cleanup?.();harness.deps=deps;harness.effect=effect}},
}));
import {HelpPopover} from '../src/components/HelpPopover';

function setup(){
 const listeners=new Map<string,EventListener>();
 const add=vi.fn((name:string,listener:EventListener)=>listeners.set(name,listener));
 const remove=vi.fn((name:string)=>listeners.delete(name));
 vi.stubGlobal('document',{addEventListener:add,removeEventListener:remove});
 const focus=vi.fn();const contains=vi.fn(()=>false);const read=vi.fn();const close=vi.fn();
 function render(onClose=close){
  harness.cursor=0;
  const tree=HelpPopover({text:'咪猪头，先填拼音，再选声调吧。',onRead:read,onClose});
  harness.refs[0].current={contains};harness.refs[1].current={focus};
  if(harness.effect){const effect=harness.effect;harness.effect=undefined;harness.cleanup=effect()||undefined}
  return tree;
 }
 return {render,read,close,focus,contains,listeners,add,remove};
}
afterEach(()=>{harness.cleanup?.();harness.open=false;harness.refs=[];harness.cursor=0;harness.effect=undefined;harness.deps=undefined;harness.cleanup=undefined;vi.unstubAllGlobals()});
describe('HelpPopover',()=>{
 it('uses a decorative small SVG and reads only when opening',()=>{
  const h=setup();let tree=h.render();const button=tree.props.children[0];
  expect(button.props['aria-expanded']).toBe(false);expect(button.props['aria-label']).toContain('咪猪头');
  expect(button.props.children.type).toBe('svg');expect(button.props.children.props['aria-hidden']).toBe('true');expect(button.props.children.props.width).toBe('20');
  button.props.onClick();tree=h.render();expect(h.read).toHaveBeenCalledWith('咪猪头，先填拼音，再选声调吧。','help-owner');
  tree.props.children[0].props.onClick();h.render();expect(h.close).toHaveBeenCalledTimes(1);expect(h.read).toHaveBeenCalledTimes(1);
 });
 it('keeps help open across inline callback rerenders and cleans up with the latest callback',()=>{
  const h=setup();h.render().props.children[0].props.onClick();h.render();const latest=vi.fn();h.render(latest);
  expect(h.close).not.toHaveBeenCalled();expect(latest).not.toHaveBeenCalled();expect(h.add).toHaveBeenCalledTimes(2);
  harness.cleanup?.();harness.cleanup=undefined;expect(latest).toHaveBeenCalledWith('help-owner');expect(h.remove).toHaveBeenCalledTimes(2);
 });
 it('restores trigger focus on Escape and closes once',()=>{
  const h=setup();h.render().props.children[0].props.onClick();h.render();const preventDefault=vi.fn();
  h.listeners.get('keydown')!({key:'Enter',preventDefault} as unknown as Event);expect(harness.open).toBe(true);
  h.listeners.get('keydown')!({key:'Escape',preventDefault} as unknown as Event);h.render();
  expect(preventDefault).toHaveBeenCalledTimes(1);expect(h.focus).toHaveBeenCalledTimes(1);expect(h.close).toHaveBeenCalledTimes(1);expect(h.listeners.size).toBe(0);
 });
 it('ignores inside pointers and preserves outside focus on dismissal',()=>{
  const h=setup();h.render().props.children[0].props.onClick();h.render();h.contains.mockReturnValue(true);
  h.listeners.get('pointerdown')!({target:{}} as unknown as Event);expect(harness.open).toBe(true);
  h.contains.mockReturnValue(false);h.listeners.get('pointerdown')!({target:{}} as unknown as Event);h.render();
  expect(h.close).toHaveBeenCalledTimes(1);expect(h.focus).not.toHaveBeenCalled();
 });
 it('returns focus when acknowledging help',()=>{
  const h=setup();h.render().props.children[0].props.onClick();const tree=h.render();tree.props.children[1].props.children[1].props.onClick();h.render();
  expect(h.focus).toHaveBeenCalledTimes(1);expect(h.close).toHaveBeenCalledTimes(1);
 });
});
