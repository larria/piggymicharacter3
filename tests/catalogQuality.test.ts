import {expect, it} from 'vitest';
import source from '../src/data/source.json';
import {catalog} from '../src/data/catalog';
import {exampleOverrides} from '../src/data/exampleOverrides';
import {practice, PRACTICE_VERSION} from '../src/data/practice';
import {getVerifiedPinyinContext, isValidPinyinSpelling, normalizePinyin, buildPinyinAnswer, formatPinyinAnswer, type PinyinTone} from '../src/pinyin';
import {makeQuestion, createState, startExam, pauseExam, resumeExam, currentExamQuestion, type Task, type Question} from '../src/domain';
import {exportBackup, importBackup} from '../src/storage';
function collisions(rows:{key:string;char:string}[]) {
 const groups=new Map<string,Set<string>>();
 for(const row of rows){if(!groups.has(row.key))groups.set(row.key,new Set());groups.get(row.key)!.add(row.char);}
 return [...groups].filter(([,chars])=>chars.size>1).map(([text,chars])=>({text,chars:[...chars]}));
}
const questions=catalog.flatMap(w=>(['character','word'] as const).map(kind=>({char:w.char,requested:kind,q:makeQuestion({wordId:w.id,questionKind:kind} as Task,catalog,()=>0)})));
it('roundtrips every effective catalog reading through parse, explicit tone build, and display',()=>{
 for(const word of catalog){
  expect(isValidPinyinSpelling(word.pinyin),`${word.char}: ${word.pinyin}`).toBe(true);
  const parsed=normalizePinyin(word.pinyin);
  expect(parsed,`${word.char}: ${word.pinyin}`).not.toBeNull();
  if(!parsed)continue;
  const tone=parsed.tone as PinyinTone;
  const answer=buildPinyinAnswer(parsed.syllable,tone);
  expect(answer,word.char).not.toBeNull();
  expect(normalizePinyin(answer!),word.char).toEqual(parsed);
  expect(formatPinyinAnswer(parsed.syllable,tone),word.char).toBe(word.pinyin);
 }
});
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
 expect(PRACTICE_VERSION).toBe('life-reviewed-45-v4');
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
  const w=catalog.find(w=>w.char===char)!;
  if(['子','漂','挑','炸','杆','曲','闷','假','哗','啦'].includes(char)){expect(w.sentences.some(s=>w.words.some(word=>s.includes(word)))).toBe(true);continue}
  expect(w.sentences).toEqual(sentences);
  for(const sentence of sentences)expect(sentence).toContain(char);
  expect(sentences.some(s=>w.words.some(word=>s.includes(word)))).toBe(true);
 }
});
it('uses only the finite selected vocabulary for corrected polyphonic and neutral readings',()=>{
 const selected=[['曲','qǔ','歌曲'],['闷','mèn','闷闷不乐'],['假','jiǎ','假山'],['哗','huá','喧哗'],['子','zǐ','子女'],['啦','la','好啦'],['漂','piāo','漂流'],['挑','tiāo','挑选'],['炸','zhá','油炸'],['杆','gān','旗杆'],['大','dà','大象']];
 for(const [char,pinyin,word] of selected){
  const w=catalog.find(w=>w.char===char)!;
  expect(w.pinyin,char).toBe(pinyin);expect(w.words,char).toEqual([word]);
  expect(getVerifiedPinyinContext(char,pinyin)?.word,char).toBe(word);
  expect(w.sentences.length).toBeGreaterThan(0);
  for(const sentence of w.sentences)expect(sentence,char).toContain(word);
  for(const questionKind of ['character','word','pinyin'] as const){
   const q=makeQuestion({wordId:char,questionKind} as Task,catalog,()=>0);
   if(questionKind==='pinyin'){expect(q.answer,char).toBe(pinyin);expect(q.prompt,char).toContain(word);expect(q.speechText,char).toBe('');}
   else if(char!=='大')expect(q.independent,char).toBe(false);
  }
 }
 expect(source.find(w=>w.character==='啦')?.pinyin).toBe('lā');
});
it('preserves old exam snapshots and bank version across import and resume after catalog corrections',()=>{
 const oldCatalog=catalog.map(w=>w.char==='大'?{...w,pinyin:'dà',words:['大人'],sentences:['大人走进房间。']}:w);
 const state=createState();state.xp=300;
 for(const w of oldCatalog.slice(0,40))state.progress[w.id]={stage:0,due:'2026-10-24',firstSeen:'2026-10-23',lastAdvanced:'2026-10-23',lastStudied:'2026-10-23',failures:0};
 const saved=pauseExam(startExam(state,oldCatalog,'quiz','2026-10-23',()=>0));
 saved.exam!.bankVersion='life-reviewed-45-v3';
 // A real old-context snapshot must remain authoritative even if its word has changed.
 const oldQuestionIndex=Math.max(0,saved.exam!.questions.findIndex(q=>q.wordId==='大'));
 saved.exam!.questions[oldQuestionIndex]={...saved.exam!.questions[oldQuestionIndex],wordId:'大',prompt:'请选择“大人”中的第一个字。',answer:'大',options:['大','耳','田','雨'],maskedText:'□人走进房间。',speechText:'空白人走进房间。',segments:[{text:'大',masked:true},{text:'人走进房间。',masked:false}]};
 const snapshot=JSON.stringify(saved.exam!.questions);
 const resumed=resumeExam(importBackup(exportBackup(saved),catalog));
 expect(resumed.exam!.bankVersion).toBe('life-reviewed-45-v3');
 expect(JSON.stringify(resumed.exam!.questions)).toBe(snapshot);
 expect(resumed.exam!.questions[oldQuestionIndex].prompt).toContain('大人');
 expect(currentExamQuestion(resumed)).toEqual(saved.exam!.questions[0]);
 expect(resumed.progress).toEqual(saved.progress);expect(resumed.xp).toBe(saved.xp);expect(resumed.coins).toBe(saved.coins);
});
it('labels missing context and generated reading templates honestly without promoting evidence',()=>{
 const fixtures=[{id:'甲',char:'甲',pinyin:'jiǎ',words:['甲板'],sentences:[]},{id:'乙',char:'乙',pinyin:'yǐ',words:['乙方'],sentences:['我会读词语“乙方”。']},...catalog];
 for(const wordId of ['甲','乙'])for(const questionKind of ['character','word'] as const){
  const q:Question=makeQuestion({wordId,questionKind} as Task,fixtures,()=>0);
  expect(q.presentation).toBe('reading-aid');expect(q.independent).toBe(false);expect(q.speechText).not.toContain('空白');
 }
});
