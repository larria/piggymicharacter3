import {describe,expect,it} from 'vitest';
import {questionInstruction,teachingExample} from '../src/App';
import {catalog} from '../src/data/catalog';

it('teaching uses actual catalog words rather than the bare character fallback',()=>{
 for(const target of catalog){const example=teachingExample(target);if(example)expect(example).not.toBe(target.char);}
 expect(teachingExample({id:'x',char:'龘',pinyin:'dá',words:['龘','龘字'],sentences:[]})).toBe('龘字');
 expect(teachingExample({id:'x',char:'龘',pinyin:'dá',words:['龘'],sentences:[]})).toBeUndefined();
});

describe('rendered question narration',()=>{
 it('pinyin narration is fixed and never reads target or context even with a cue',()=>{
  for(const prompt of ['苹果里的苹','答案：píng']){
   expect(questionInstruction({kind:'pinyin',cue:'píng',prompt})).toBe('请输入不带声调的拼音，再选择声调。');
  }
 });
 it('cue-based questions speak the actual displayed prompt instead of mismatched segments',()=>{
  expect(questionInstruction({kind:'word',cue:'hǎo',prompt:'请选择读音是 hǎo 的字。'})).toBe('请选择读音是 hǎo 的字。');
 });
 it('ordinary masked questions continue using safe structured segments',()=>{
  expect(questionInstruction({kind:'word',prompt:'我吃苹果。'})).toBeNull();
 });
});
