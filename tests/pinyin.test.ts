import {describe,it,expect} from 'vitest';
import {normalizePinyin,isValidPinyinSpelling,matchesPinyinSearch,classifyPinyinAnswer,normalizePinyinSpelling,formatPinyinAnswer,buildPinyinAnswer,type PinyinTone,matchesPinyin,parseCoinGift,pinyinContext,resolvePinyinContext,getVerifiedPinyinContext,verifiedPinyinContexts} from '../src/pinyin';
import {createState,startSession,startSelectedSession,markKnown,currentTask,makeQuestion,answerTask,giftCoins,redeemCard} from '../src/domain';
import {catalog} from '../src/data/catalog';
import {exportBackup,importBackup,saveState,STORAGE_KEY,type StorageLike} from '../src/storage';
it('uses distinct teaching and masked word sentences for 魔 and 方',()=>{
 const words=['魔','方'].map(char=>catalog.find(word=>word.char===char)!);
 expect(words[0].sentences[0]).not.toBe(words[1].sentences[0]);
 const prompts=words.map(word=>{const state=startSelectedSession(createState(),catalog,[word.id]);return makeQuestion(state.session!.tasks.find(task=>task.questionKind==='word')!,catalog)});
 expect(prompts[0].maskedText).not.toBe(prompts[1].maskedText);
 expect(prompts[1].answer).toBe('魔方');expect(prompts[1].maskedText).toBe('□的每一面都是正方形。');
});
describe('explicit pinyin tone answers',()=>{
 it('builds all five tones for the existing matcher',()=>{for(const [tone,expected] of [[1,'mā'],[2,'má'],[3,'mǎ'],[4,'mà'],[0,'ma']] as const){const answer=buildPinyinAnswer(' MA ',tone);expect(answer).toBe(`ma${tone}`);expect(matchesPinyin(answer!,expected)).toBe(true)}});
 it('requires selection, including explicit neutral zero',()=>{expect(buildPinyinAnswer('zhe',null)).toBeNull();expect(buildPinyinAnswer('zhe',undefined as unknown as PinyinTone)).toBeNull();expect(buildPinyinAnswer('zhe',0)).toBe('zhe0');for(const tone of [-1,5,1.5,NaN])expect(buildPinyinAnswer('ma',tone as PinyinTone)).toBeNull()});
 it('accepts spelling aliases and combining diaeresis',()=>{for(const input of ['lü','lv','lu:',' LU: ','lü']){expect(buildPinyinAnswer(input,4)).toBe('lü4');expect(matchesPinyin(buildPinyinAnswer(input,4)!,'lǜ')).toBe(true)}});
 it('rejects blank, invalid, multiple syllables and typed tones',()=>{for(const input of ['', ' ', 'ni hao','nihao','ke!','u::','foo','ma0','ma1','ma5','1ma','mā','má','mǎ','mà','mā','má','lǜ','lu:4','maˉ'])expect(buildPinyinAnswer(input,1),input).toBeNull()});
});
describe('umlaut orthography and tone display',()=>{
 it('canonicalizes every j/q/x/y umlaut final and input alias for all tones',()=>{
  for(const initial of ['j','q','x','y'])for(const final of ['u','ue','uan','un'])for(const tone of [0,1,2,3,4] as const){
   const standard=initial+final;
   for(const alias of ['ü','v','u:','ü']){
    const raw=initial+alias+final.slice(1);
    expect(normalizePinyinSpelling(raw)).toBe(standard);
    expect(buildPinyinAnswer(raw,tone)).toBe(standard+tone);
    expect(matchesPinyin(raw+tone,formatPinyinAnswer(standard,tone))).toBe(true);
    expect(formatPinyinAnswer(raw,tone)).toBe(formatPinyinAnswer(standard,tone));
   }
  }
 });
 it('keeps n/l dotted and plain u distinct, including tone and aliases',()=>{
  for(const initial of ['n','l'])for(const tone of [0,1,2,3,4] as const){
   for(const alias of ['ü','v','u:','ü'])expect(matchesPinyin(initial+alias+tone,formatPinyinAnswer(initial+'ü',tone))).toBe(true);
   expect(matchesPinyin(initial+'u'+tone,initial+'ü'+tone)).toBe(false);
   expect(formatPinyinAnswer(initial+'ü',tone)).not.toBe(formatPinyinAnswer(initial+'u',tone));
   expect(buildPinyinAnswer(initial+'üe',tone)).toBe(initial+'üe'+tone);
  }
 });
 it('places tones by a/e priority, ou and last vowel in iu/ui',()=>{
  for(const [raw,tone,display] of [['yüe',4,'yuè'],['lü',4,'lǜ'],['nü',3,'nǚ'],['liu',2,'liú'],['gui',4,'guì'],['shui',3,'shuǐ'],['ou',3,'ǒu'],['jüan',3,'juǎn'],['xü',1,'xū'],['m',2,'ḿ'],['ng',2,'ńg']] as const){
   expect(formatPinyinAnswer(raw,tone)).toBe(display);
   expect(matchesPinyin(buildPinyinAnswer(raw,tone)!,display)).toBe(true);
  }
 });
 it('displays partial and invalid input without making it a valid answer',()=>{
  expect(formatPinyinAnswer('yü',null)).toBe('yu');expect(formatPinyinAnswer('yüe',null)).toBe('yue');
  for(const raw of ['bü','düe','yüü','nue','lue','u::','jü!'])expect(buildPinyinAnswer(raw,4),raw).toBeNull();
  expect(formatPinyinAnswer('',4)).toBe('');expect(formatPinyinAnswer('yü!',4)).toBe('yu!');
 });
 it('accepts decomposed tone/diaeresis in either Unicode order',()=>{
  for(const raw of ['yüè','yüè','yve4','yu:e4','jǚ','jǔ̈','jǚ'])expect(normalizePinyin(raw),raw).not.toBeNull();
  expect(matchesPinyin('jǔ̈','jǔ')).toBe(true);
 });
});
describe('canonical display strict spelling and forgiving search',()=>{
 it('replaces existing tones without stacking',()=>{expect(formatPinyinAnswer('ke4',2)).toBe('ké');expect(formatPinyinAnswer('kè',0)).toBe('ke');expect(formatPinyinAnswer('kè',null)).toBe('kè');expect(formatPinyinAnswer('lǔ̈',4)).toBe('lǜ')});
 it('rejects misplaced marks and aliases only in strict validation',()=>{for(const raw of ['lǜ','liú','shuǐ','ḿ','ńg','ma0'])expect(isValidPinyinSpelling(raw),raw).toBe(true);for(const raw of ['líu','shǔi','jǚ','lv4','LU:4','kè4','lü̈'])expect(isValidPinyinSpelling(raw),raw).toBe(false);expect(normalizePinyin('líu')).toEqual({syllable:'liu',tone:2})});
 it('round trips every catalog reading canonically',()=>{for(const word of catalog){expect(isValidPinyinSpelling(word.pinyin),word.char+' '+word.pinyin).toBe(true);const parsed=normalizePinyin(word.pinyin)!;const built=buildPinyinAnswer(parsed.syllable,parsed.tone as PinyinTone)!;expect(normalizePinyin(formatPinyinAnswer(built,null))).toEqual(parsed)}});
 it('searches Chinese substrings and reviewed alternative readings with aliases',()=>{for(const query of ['lv','LÜ','lu:','lǜ'])expect(matchesPinyinSearch({char:'绿',pinyin:'lǜ'},query)).toBe(true);expect(matchesPinyinSearch({char:'绿',pinyin:'lǜ'},'lu')).toBe(false);expect(matchesPinyinSearch({char:'居',pinyin:'jū'},'jv')).toBe(true);expect(matchesPinyinSearch({char:'乐',pinyin:'lè'},'yue')).toBe(true);expect(matchesPinyinSearch({char:'妈妈',pinyin:'mā'},'妈')).toBe(true)});
 it('classifies malformed syllable and tone errors independently',()=>{expect(classifyPinyinAnswer('kè4','kè')).toBe('spelling');expect(classifyPinyinAnswer('ma4','kè')).toBe('syllable');expect(classifyPinyinAnswer('ke3','kè')).toBe('tone');expect(classifyPinyinAnswer('ke4','kè')).toBeNull();expect(classifyPinyinAnswer('ke4','invalid')).toBe('unknown')});
});
describe('single syllable pinyin',()=>{
 it('normalizes tones, aliases and unicode',()=>{for(const v of ['kè','ke4',' KE4 ','kè'])expect(matchesPinyin(v,'kè')).toBe(true);for(const v of ['lǜ','lü4','lv4','lu:4','LU:4'])expect(matchesPinyin(v,'lǜ')).toBe(true);for(const v of ['zhe','zhe0','zhe5'])expect(matchesPinyin(v,'zhe')).toBe(true)});
 it('rejects missing/wrong tones and malformed inputs',()=>{for(const v of ['ke','ke3'])expect(matchesPinyin(v,'kè')).toBe(false);for(const v of ['','ni hao','nihao3','ke44','kè4','kè́','ke!','ke6','1ke','k̄e','u::4'])expect(normalizePinyin(v),v).toBe(null)});
 it('all catalog readings parse',()=>{for(const w of catalog)expect(normalizePinyin(w.pinyin),w.char+' '+w.pinyin).not.toBeNull()});
 it('uses context matching catalog reading',()=>{expect(pinyinContext({char:'薄',pinyin:'bó',words:['薄荷']})).toBe('单薄');expect(pinyinContext({char:'觉',pinyin:'jiào',words:['觉得']})).toBe('睡觉')});
});
describe('verified pronunciation contexts',()=>{
 it('uses reviewed hand vocabulary and non-repetitive safe fallback prompts without answer speech',()=>{
  const hand=catalog.find(word=>word.char==='手')!;
  expect(getVerifiedPinyinContext('手','shou3')).toEqual({char:'手',word:'双手',pinyin:'shǒu'});
  const task={id:'pinyin',wordId:hand.id,kind:'learn' as const,questionKind:'pinyin' as const};
  expect(makeQuestion(task,[hand]).prompt).toBe('请写出「双手」中「手」的拼音，并选择声调');
  const fallback=makeQuestion({...task,wordId:'unknown'},[{id:'unknown',char:'未',pinyin:'wèi',words:['未知'],sentences:[]}]);
  expect(fallback.prompt).toBe('请写出「未」的拼音并选择声调');expect(fallback.speechText).toBe('');expect(fallback.prompt).not.toContain(fallback.answer);
 });
 it('distinguishes planting/seeds and quantity/measuring',()=>{
  for(const [char,pinyin,word] of [['种','zhong4','种花'],['种','zhong3','种子'],['量','liang4','数量'],['量','liang2','测量']]){
   const context=resolvePinyinContext({char,pinyin,words:['任意'+char]});
   expect(context.word).toBe(word);expect(context.char).toBe(char);expect(matchesPinyin(context.pinyin,pinyin)).toBe(true);
  }
 });
 it('never infers a reading from an arbitrary supplied word',()=>{
  expect(resolvePinyinContext({char:'薄',pinyin:'bao1',words:['薄荷']})).toEqual({char:'薄',word:'薄',pinyin:'bao1'});
  expect(pinyinContext({char:'未',pinyin:'wèi',words:['未知']})).toBe('未');
  expect(getVerifiedPinyinContext('量','liang')).toBeNull();
 });
 it('accepts normalized reading aliases and has valid immutable records',()=>{
  expect(getVerifiedPinyinContext('种',' ZHONG4 ')).toEqual({char:'种',word:'种花',pinyin:'zhòng'});
  const keys=new Set<string>();for(const context of verifiedPinyinContexts){
   expect(context.word).toContain(context.char);expect(normalizePinyin(context.pinyin)).not.toBeNull();
   const key=context.char+JSON.stringify(normalizePinyin(context.pinyin));expect(keys.has(key),key).toBe(false);keys.add(key);
   expect(Object.isFrozen(context)).toBe(true);
  }
 });
 it('synchronizes catalog examples with verified default readings',()=>{
  for(const entry of catalog){const context=getVerifiedPinyinContext(entry.char,entry.pinyin);if(!context)continue;
   expect(entry.words,entry.char).toEqual([context.word]);expect(entry.sentences[0],entry.char).toContain(context.word);
  }
 });
});
describe('direct pair and compatible persistence',()=>{
 it('only direct starts with pinyin and both independent answers are needed',()=>{let s=markKnown(startSession(createState(),catalog,'2026-10-25'),true);const task=currentTask(s)!;expect(task.questionKind).toBe('pinyin');expect(makeQuestion(task,catalog).speechText).toBe('');expect(makeQuestion(task,catalog).independent).toBe(true);s=importBackup(exportBackup(s),catalog);s=answerTask(s,{correct:true,submissionId:task.id+':submit'},'2026-10-25');expect(s.progress[task.wordId]).toBeUndefined();expect(currentTask(s)?.questionKind).toBe('word');expect(answerTask(s,{correct:true,submissionId:task.id+':submit'},'2026-10-25')).toBe(s);s=answerTask(s,{correct:true,independent:true,submissionId:currentTask(s)!.id+':submit'},'2026-10-25');expect(s.progress[task.wordId].lastAdvanced).toBe('2026-10-25');expect(currentTask(startSelectedSession(createState(),catalog,[task.wordId],'2026-10-25'))?.questionKind).toBe('pinyin')});
 it('wrong or hinted first answer returns to teaching and removes second',()=>{for(const input of [{correct:false},{correct:true,hinted:true}]){let s=markKnown(startSession(createState(),catalog,'2026-10-25'),true);const task=currentTask(s)!;s=answerTask(s,{...input,submissionId:task.id+':submit'},'2026-10-25');expect(currentTask(s)?.kind).toBe('learn');expect(currentTask(s)?.questionKind).toBe('pinyin');expect(currentTask(s)?.retry).toBe(1);expect(s.progress[task.wordId]?.lastAdvanced).toBe(null);expect(s.session!.tasks.some(t=>t.id===task.pair+':b')).toBe(false)}});
 it('keeps genuinely unversioned legacy queues and rewards',()=>{
  const s=createState();s.session={id:'legacy',date:'2026-10-25',tasks:[{id:'legacy:0',wordId:catalog[0].id,kind:'learn',questionKind:'character'},{id:'legacy:1',wordId:catalog[0].id,kind:'review',questionKind:'word'}],cursor:0,completed:false,submissions:[],assessmentPassed:[]};
  const restored=importBackup(exportBackup(s),catalog);
  expect(restored.session?.flowVersion).toBeUndefined();expect(restored.session?.tasks).toEqual(s.session.tasks);
  expect(currentTask(restored)?.questionKind).toBe('character');expect(restored.logs).toEqual(s.logs);expect(restored.rewardLedger).toEqual(s.rewardLedger);expect(restored.coins).toBe(s.coins);
 });
});
describe('dad gifts',()=>{
 it('only changes balance and leaves daily learning ledger untouched',()=>{const s=createState(),next=giftCoins(s,40);expect(next).toEqual({...s,coins:40});expect(s.coins).toBe(0);expect(redeemCard(next,0).owned).toContain(0)});
 it('checks text, integer bounds and overflow',()=>{for(const v of ['0','-1','1.2','1e3','Infinity','9007199254740992',''])expect(()=>parseCoinGift(v)).toThrow();expect(parseCoinGift(' 20 ')).toBe(20);for(const n of [0,-1,1.1,NaN,Infinity])expect(()=>giftCoins(createState(),n)).toThrow();expect(()=>giftCoins({...createState(),coins:Number.MAX_SAFE_INTEGER},1)).toThrow()});
 it('persists gifts but preserves old balance on save failure and stale revision',()=>{const data=new Map<string,string>();const storage:StorageLike={getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v)}};const s=saveState(createState(),storage);const saved=saveState(giftCoins(s,20),storage);expect(importBackup(data.get(STORAGE_KEY)!).coins).toBe(20);expect(()=>saveState(giftCoins(s,30),storage)).toThrow(/标签页/);expect(importBackup(data.get(STORAGE_KEY)!).coins).toBe(20);expect(()=>saveState(giftCoins(saved,30),{getItem:storage.getItem,setItem:()=>{throw new Error('quota')}})).toThrow(/保存失败/);expect(importBackup(data.get(STORAGE_KEY)!).coins).toBe(20)});
});
