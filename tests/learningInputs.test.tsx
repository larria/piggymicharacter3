import {describe,expect,it} from 'vitest';
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
 it('renders an accessible real input above target and five exact toggle names with no default',()=>{
  const html=renderToStaticMarkup(<PinyinAnswer {...props}/>);
  expect(html.indexOf('<input')).toBeLessThan(html.indexOf('<h2'));
  expect(html).toContain('aria-label="不带声调的拼音"');
  for(const label of ['一声 ˉ','二声 ˊ','三声 ˇ','四声 ˋ','轻声'])expect(html).toContain(`aria-label="${label}" aria-pressed="false"`);
  for(const symbol of ['ˉ','ˊ','ˇ','ˋ','轻声'])expect(html).toContain(`>${symbol}</button>`);
  expect(html).not.toContain('type="radio"');
  expect(html).not.toContain('pinyin-instructions');
 });
 it('selects neutral only when explicitly chosen',()=>{
  const html=renderToStaticMarkup(<PinyinAnswer {...props} tone={0}/>);
  expect(html).toContain('aria-label="轻声" aria-pressed="true"');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
 });
});
