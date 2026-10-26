import {describe,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PinyinAnswer,PreparationGrid,preparationWordIds,togglePreparationWord} from '../src/components/LearningInputs';

describe('preparation words',()=>{
 const tasks=[{kind:'learn',wordId:'b'},{kind:'review',wordId:'r'},{kind:'learn',wordId:'a'},{kind:'learn',wordId:'b'},{kind:'assessment',wordId:'a'}];
 it('dedupes by word ID, preserves first order and does not change task counts',()=>{
  expect(preparationWordIds(tasks)).toEqual(['b','a']);
  expect(tasks).toHaveLength(5);
  const html=renderToStaticMarkup(<PreparationGrid wordIds={preparationWordIds(tasks)} claimedWordIds={['b']} character={id=>id} onChange={()=>{}}/>);
  expect(html.match(/class="choice"/g)).toHaveLength(2);
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
 });
 it('toggles one claim without duplicates and clears all occurrences',()=>{
  expect(togglePreparationWord(['b'],'a')).toEqual(['b','a']);
  expect(togglePreparationWord(['b','b','a'],'b')).toEqual(['a']);
  expect(togglePreparationWord([], 'b')).toEqual(['b']);
 });
});
describe('compact pinyin answer',()=>{
 const props={target:'汉',value:'han',tone:null,onChange:()=>{},onTone:()=>{},onSubmit:()=>{},onCompositionStart:()=>{},onCompositionEnd:()=>{},onKeyDown:()=>{}};
 it('renders prompt first, a non-editable answer and QWERTY keyboard with five unselected tones',()=>{
  const html=renderToStaticMarkup(<PinyinAnswer {...props}/>);
  expect(html.indexOf('<h2')).toBeLessThan(html.indexOf('<output'));
  expect(html.indexOf('<output')).toBeLessThan(html.indexOf('<fieldset'));
  expect(html).not.toContain('<input');expect(html).not.toContain('contenteditable');
  expect(html).toContain('aria-label="拼音答案"');expect(html).toContain('未选择声调');
  expect(html).toContain('aria-label="字母 ü"');expect(html).not.toContain('aria-label="字母 v"');
  for(const label of ['一声 ˉ','二声 ˊ','三声 ˇ','四声 ˋ','轻声'])expect(html).toContain(`aria-label="${label}" aria-pressed="false"`);
  for(const symbol of ['ˉ','ˊ','ˇ','ˋ','轻声'])expect(html).toContain(`>${symbol}</button>`);
  expect(html).not.toContain('type="radio"');
  expect(html).not.toContain('pinyin-instructions');
 });
 function nodes(element:ReactElement<any>):ReactElement<any>[]{const children=element.props.children;return [element,...(Array.isArray(children)?children:[children]).flat(Infinity).filter(child=>child&&typeof child==='object'&&'props' in child).flatMap(child=>nodes(child))]}
 it('supports soft letters ü backspace tones and confirmation',()=>{
  const onChange=vi.fn(),onTone=vi.fn(),onSubmit=vi.fn();const form=PinyinAnswer({...props,value:'l',onChange,onTone,onSubmit});const all=nodes(form);
  all.find(node=>node.props['aria-label']==='字母 ü')!.props.onClick();expect(onChange).toHaveBeenLastCalledWith('lü');
  all.find(node=>node.props['aria-label']==='删除最后一个拼音字母')!.props.onClick();expect(onChange).toHaveBeenLastCalledWith('');
  all.find(node=>node.props['aria-label']==='四声 ˋ')!.props.onClick();expect(onTone).toHaveBeenCalledWith(4);
  form.props.onSubmit({});expect(onSubmit).toHaveBeenCalledOnce();
 });
 it('scopes physical shortcuts to form and suppresses composition modifiers and repeated submit',()=>{
  const onChange=vi.fn(),onTone=vi.fn(),requestSubmit=vi.fn(),preventDefault=vi.fn();const form=PinyinAnswer({...props,value:'l',onChange,onTone});
  const event={key:'v',nativeEvent:{},target:{tagName:'FORM',closest:()=>null},currentTarget:{requestSubmit},preventDefault};
  form.props.onKeyDown(event);expect(onChange).toHaveBeenLastCalledWith('lü');
  form.props.onKeyDown({...event,key:'Backspace'});expect(onChange).toHaveBeenLastCalledWith('');
  form.props.onKeyDown({...event,key:'5'});expect(onTone).toHaveBeenCalledWith(0);
  form.props.onKeyDown({...event,key:'Enter'});expect(requestSubmit).toHaveBeenCalledOnce();
  form.props.onKeyDown({...event,key:'Enter',repeat:true});expect(requestSubmit).toHaveBeenCalledOnce();
  form.props.onKeyDown({...event,key:'Enter',nativeEvent:{isComposing:true}});expect(requestSubmit).toHaveBeenCalledOnce();
  onChange.mockClear();form.props.onKeyDown({...event,ctrlKey:true});form.props.onKeyDown({...event,target:{closest:()=>({}),tagName:'BUTTON'}});expect(onChange).not.toHaveBeenCalled();
 });
 it('locks all soft and physical answering actions and submit together',()=>{
  const onChange=vi.fn(),onTone=vi.fn(),onSubmit=vi.fn(),preventDefault=vi.fn();const form=PinyinAnswer({...props,disabled:true,onChange,onTone,onSubmit});
  const all=nodes(form);expect(all.find(node=>node.type==='fieldset')!.props.disabled).toBe(true);
  for(const node of all.filter(node=>node.type==='button'&&node.props.onClick))node.props.onClick();
  form.props.onKeyDown({key:'a',nativeEvent:{},preventDefault});form.props.onSubmit({preventDefault});
  expect(onChange).not.toHaveBeenCalled();expect(onTone).not.toHaveBeenCalled();expect(onSubmit).not.toHaveBeenCalled();expect(preventDefault).toHaveBeenCalledOnce();
 });
 it('selects neutral only when explicitly chosen',()=>{
  const html=renderToStaticMarkup(<PinyinAnswer {...props} tone={0}/>);
  expect(html).toContain('aria-label="轻声" aria-pressed="true"');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
 });
});
