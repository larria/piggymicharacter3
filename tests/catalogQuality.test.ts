import {expect, it} from 'vitest';
import source from '../src/data/source.json';
import {catalog} from '../src/data/catalog';
import {exampleOverrides} from '../src/data/exampleOverrides';
import {practice, PRACTICE_VERSION} from '../src/data/practice';
import {getVerifiedPinyinContext} from '../src/pinyin';
import {makeQuestion, type Task, type Question} from '../src/domain';
function collisions(rows:{key:string;char:string}[]) {
 const groups=new Map<string,Set<string>>();
 for(const row of rows){if(!groups.has(row.key))groups.set(row.key,new Set());groups.get(row.key)!.add(row.char);}
 return [...groups].filter(([,chars])=>chars.size>1).map(([text,chars])=>({text,chars:[...chars]}));
}
const questions=catalog.flatMap(w=>(['character','word'] as const).map(kind=>({char:w.char,requested:kind,q:makeQuestion({wordId:w.id,questionKind:kind} as Task,catalog,()=>0)})));
it('audits every effective teaching sentence and both generated question kinds',()=>{
 expect(catalog).toHaveLength(1292);expect(questions).toHaveLength(2584);
 expect(collisions(catalog.flatMap(w=>w.sentences.filter(s=>!/^我会读词语/.test(s)).map(key=>({char:w.char,key}))))).toEqual([]);
 for(const kind of ['character','word']) expect(collisions(questions.filter(x=>x.requested===kind&&x.q.presentation==='context').map(x=>({char:x.char,key:x.q.maskedText})))).toEqual([]);
 expect(collisions(questions.filter(x=>x.q.independent).map(x=>({char:x.char,key:`${x.q.prompt}|${x.q.answer}`})))).toEqual([]);
 for(const {char,q} of questions){
  expect(q.options).toHaveLength(4);expect(new Set(q.options).size).toBe(4);expect(q.options.filter(x=>x===q.answer)).toHaveLength(1);
  if(q.presentation==='reading-aid'){expect(q.independent).toBe(false);expect(q.prompt).toContain('不计独立掌握');expect(q.prompt).toContain(char);expect(q.maskedText).not.toContain('□');expect(q.segments.every(s=>!s.masked)).toBe(true);}
  else {expect(q.segments.some(s=>s.masked)).toBe(true);expect(q.maskedText).not.toBe('□');expect(q.maskedText).not.toMatch(/^我会读词语/);expect(q.maskedText).not.toContain(q.answer);}
 }
 const summary={characters:catalog.length,questions:questions.length,readingAids:questions.filter(x=>x.q.presentation==='reading-aid').length,wordReadingAids:questions.filter(x=>x.requested==='word'&&x.q.presentation==='reading-aid').length,independent:questions.filter(x=>x.q.independent).length,overrides:Object.keys(exampleOverrides).length};
 console.log('CATALOG QUALITY',JSON.stringify(summary));
});
it('keeps reviewed vocabulary, character and word contexts, and distractors consistent',()=>{
 expect(PRACTICE_VERSION).toBe('life-reviewed-45-v3');
 for(const p of practice){
  expect(p.word).toContain(p.char);expect(getVerifiedPinyinContext(p.char,p.pinyin)?.pinyin).toBe(p.pinyin);
  const a=makeQuestion({wordId:p.char,questionKind:'character'} as Task,catalog,()=>0);
  const b=makeQuestion({wordId:p.char,questionKind:'word'} as Task,catalog,()=>0);
  expect(a.maskedText).not.toBe(b.maskedText);expect(a.independent&&b.independent).toBe(true);
  expect(p.characters).not.toContain(p.char);expect(p.words).not.toContain(p.word);
 }
 expect(catalog.find(w=>w.char==='球')?.words).toEqual(['皮球']);
 expect(catalog.find(w=>w.char==='篮')?.words).toEqual(['篮球']);
});
it('retains the original imported records and applies valid overrides after lexical filtering',()=>{
 expect(source).toHaveLength(1290);
 for(const [char,sentences] of Object.entries(exampleOverrides)){
  const w=catalog.find(w=>w.char===char)!;expect(w.sentences).toEqual(sentences);
  for(const sentence of sentences)expect(sentence).toContain(char);
  expect(sentences.some(s=>w.words.some(word=>s.includes(word)))).toBe(true);
 }
});
it('labels missing context and generated reading templates honestly without promoting evidence',()=>{
 const fixtures=[{id:'甲',char:'甲',pinyin:'jiǎ',words:['甲板'],sentences:[]},{id:'乙',char:'乙',pinyin:'yǐ',words:['乙方'],sentences:['我会读词语“乙方”。']},...catalog];
 for(const wordId of ['甲','乙'])for(const questionKind of ['character','word'] as const){
  const q:Question=makeQuestion({wordId,questionKind} as Task,fixtures,()=>0);
  expect(q.presentation).toBe('reading-aid');expect(q.independent).toBe(false);expect(q.speechText).not.toContain('空白');
 }
});
