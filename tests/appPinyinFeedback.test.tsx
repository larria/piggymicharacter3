import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';

// Run the actual App handlers/effects without introducing a DOM test dependency.
const hooks=vi.hoisted(()=>({slots:[] as any[],cursor:0,effects:[] as (()=>void)[],dirty:false}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),
 useState:(initial:any)=>{const i=hooks.cursor++;if(!(i in hooks.slots))hooks.slots[i]=typeof initial==='function'?initial():initial;return [hooks.slots[i],(value:any)=>{hooks.slots[i]=typeof value==='function'?value(hooks.slots[i]):value;hooks.dirty=true}]},
 useRef:(initial:any)=>{const i=hooks.cursor++;return hooks.slots[i]??(hooks.slots[i]={current:initial})},
 useMemo:(fn:()=>any)=>{hooks.cursor++;return fn()},
 useEffect:(effect:()=>void|(()=>void),deps:any[])=>{const i=hooks.cursor++,old=hooks.slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j]))){hooks.slots[i]={deps,cleanup:old?.cleanup};hooks.effects.push(()=>{old?.cleanup?.();hooks.slots[i].cleanup=effect()})}},
}));
vi.mock('../src/audio/coordinator',()=>({audioCoordinator:{activate:vi.fn(),configure:vi.fn(),setScene:vi.fn(),playSfx:vi.fn(),dispose:vi.fn()}}));
vi.mock('../src/audio/speech',()=>({speechQueue:{activateFromGesture:vi.fn(),cancelAll:vi.fn(),speak:vi.fn(),readMasked:vi.fn(),readLearning:vi.fn(),acquireFirstEntryLock:()=>()=>{}}}));
vi.mock('../src/useWallDraft',()=>({useWallDraft:()=>({})}));
import App from '../src/App';
import {LearningFeedback} from '../src/components/LearningFeedback';
import {SessionCelebration} from '../src/components/SessionCelebration';
import {MaskedText} from '../src/components/MaskedText';
import {PinyinAnswer} from '../src/components/LearningInputs';
import {SessionProgress} from '../src/components/SessionProgress';
import {catalog} from '../src/data/catalog';
import {acknowledgeNarration,answerTask,confirmPreparation,createState,currentTask,completePractice,finishTeaching,makeQuestion,setPreparationClaims,startSelectedSession,type State} from '../src/domain';
import {learningTaskIdentity} from '../src/learningSubmission';
import {deferRewardEntitlements} from '../src/domain/rewards';
import {loadState,STORAGE_KEY,validateState} from '../src/storage';

let tree:ReactElement<any>,data:Map<string,string>,failSave=false;
function render(){do{hooks.dirty=false;hooks.cursor=0;tree=App();const effects=hooks.effects.splice(0);effects.forEach(fn=>fn())}while(hooks.dirty)}
function nodes(node:any):ReactElement<any>[]{if(!node||typeof node!=='object'||!('props'in node))return [];if(node.type===LearningFeedback)return nodes(LearningFeedback(node.props));return [node,...[node.props.children].flat(Infinity).flatMap(nodes)]}
function find(predicate:(node:ReactElement<any>)=>boolean){const node=nodes(tree).find(predicate);expect(node).toBeDefined();return node!}
function button(label:string){return find(n=>n.type==='button'&&[n.props.children].flat(Infinity).some(v=>typeof v==='string'&&v.trim()===label))}
function click(label:string){button(label).props.onClick({detail:1});render()}
function pinyin(){return find(n=>n.type===PinyinAnswer)}
function stored(){return loadState(localStorage,catalog)}
function fixture(){const word=catalog.find(w=>w.char==='手')!;let s=startSelectedSession(createState(),catalog,[word.id],'2026-10-26');s=confirmPreparation(setPreparationClaims(s,[word.id]));s=acknowledgeNarration(s,`${learningTaskIdentity(s)}|quiz`);return validateState(s,catalog)}
function learnedFixture(later: 'learn'|'review'|null = 'learn') {
 const word=catalog.find(w=>w.char==='手')!,other=catalog.find(w=>w.char==='口')!;
 let s=confirmPreparation(startSelectedSession(createState(),catalog,later?[word.id,other.id]:[word.id],'2026-10-26'));
 s.session!.preparation!.claimedWordIds=[];
 s.session!.tasks.forEach(t=>{t.kind='learn';if(t.wordId===other.id&&later==='review'){t.kind='review';delete t.teachingOrigin}});
 const first=currentTask(s)!.id;s=finishTeaching(completePractice(s,first,'2026-10-26'),first);
 if(later==='learn'){const following=s.session!.tasks.find(t=>t.wordId===other.id&&t.questionKind==='pinyin')!;s.session!.practice![following.id]={phase:'ready',activeMs:0,completed:true,skipped:false};}
 if(later==='review')for(const t of s.session!.tasks.filter(t=>t.wordId===other.id))delete s.session!.practice![t.id];
 return validateState(acknowledgeNarration(s,`${learningTaskIdentity(s)}|quiz`),catalog);
}
function answerPinyinThenWord(hinted=false){fill();submit();vi.advanceTimersByTime(2000);render();const q=makeQuestion(currentTask(stored())!,catalog);if(hinted)click('需要一点提示');click(q.answer);return q;}
function mount(s=fixture()){data.set(STORAGE_KEY,JSON.stringify(s));render();return s}
function fill(value='shou',tone=3){pinyin().props.onChange(value);pinyin().props.onTone(tone);render()}
function submit(){pinyin().props.onSubmit({preventDefault:()=>{}});render()}
function text(){
 function content(node:any):string{if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(content).join('');if(node.type===LearningFeedback)return content(LearningFeedback(node.props));return content(node.props?.children)}
 return content(tree);
}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-26T12:00:00'));hooks.slots=[];hooks.effects=[];hooks.cursor=0;hooks.dirty=false;data=new Map();failSave=false;
 vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{if(failSave&&key===STORAGE_KEY)throw Error('quota');data.set(key,value)}});
 vi.stubGlobal('window',{setTimeout,clearTimeout,addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('navigator',{});
});
afterEach(()=>{for(const slot of hooks.slots)slot?.cleanup?.();vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks()});
describe('App pinyin feedback integration',()=>{
 it('independent learned word keeps its locked snapshot past two seconds until manual next',()=>{mount(learnedFixture());const q=answerPinyinThenWord(),saved=stored();expect(text()).toContain('恭喜咪猪头，学完「手」啦！');vi.advanceTimersByTime(6000);render();expect(text()).toContain('恭喜咪猪头，学完「手」啦！');for(const option of q.options){expect(button(option).props.disabled).toBe(true);expect(button(option).props['aria-pressed']).toBe(option===q.answer)}expect(stored()).toEqual(saved);click('学习下一个字');expect(text()).not.toContain('学完「手」');expect(stored()).toEqual(saved)});
 it('closing learned milestone retains a manual action without granting again',()=>{mount(learnedFixture());answerPinyinThenWord();const saved=stored();find(n=>n.props['aria-label']==='关闭学习反馈').props.onClick();render();expect(text()).not.toContain('学完「手」');vi.advanceTimersByTime(6000);render();click('学习下一个字');expect(stored()).toEqual(saved)});
 it('last new word with later review is a milestone, not terminal celebration',()=>{mount(learnedFixture('review'));answerPinyinThenWord();expect(stored().session!.completed).toBe(false);expect(text()).toContain('学完「手」');expect(nodes(tree).some(n=>n.type===SessionCelebration)).toBe(false);click('继续练习');expect(currentTask(stored())!.kind).toBe('review')});
 it('final independent word replaces its small milestone with celebration immediately',()=>{mount(learnedFixture(null));answerPinyinThenWord();expect(stored().session!.completed).toBe(true);expect(nodes(tree).some(n=>n.type===SessionCelebration)).toBe(true);expect(text()).not.toContain('学完「手」');expect(nodes(tree).some(n=>n.props['aria-label']==='学习反馈')).toBe(false)});
 it('hinted word neither reports independent learning nor false terminal completion',()=>{mount(learnedFixture(null));answerPinyinThenWord(true);expect(text()).not.toContain('学完「手」');expect(stored().logs.at(-1)!.hinted).toBe(true);expect(stored().session!.completed).toBe(false);expect(nodes(tree).some(n=>n.type===SessionCelebration)).toBe(false)});
 it('failed final word save shows neither milestone nor terminal and retry commits only once',()=>{mount(learnedFixture(null));fill();submit();vi.advanceTimersByTime(2000);render();const saved=stored(),q=makeQuestion(currentTask(saved)!,catalog);failSave=true;click(q.answer);expect(stored()).toEqual(saved);expect(text()).toContain('保存失败');expect(text()).not.toContain('学完「手」');expect(nodes(tree).some(n=>n.type===SessionCelebration)).toBe(false);failSave=false;click(q.answer);expect(stored().logs).toHaveLength(2);expect(nodes(tree).some(n=>n.type===SessionCelebration)).toBe(true)});
 it('allows pinyin and word answers before question narration completes',()=>{
  const initial=fixture();initial.completedNarrations=[];mount(initial);
  expect(pinyin().props.disabled).toBe(false);expect(text()).not.toContain('先完整听完入场朗读');
  fill();submit();expect(stored().logs).toHaveLength(1);vi.advanceTimersByTime(2000);render();
  expect(text()).not.toContain('先完整听完入场朗读');
  const question=makeQuestion(currentTask(stored())!,catalog);
  click(question.options!.find(option=>option===question.answer)!);
  expect(stored().logs).toHaveLength(2);
 });
 it('saves once, keeps submitted prompt/input/tone for exactly two seconds, then enters the destination',()=>{
  const initial=mount(),prompt=pinyin().props.target;fill();submit();const saved=stored();expect(saved.logs).toHaveLength(1);expect(saved.session!.cursor).toBe(1);
  expect(pinyin().props.value).toBe('shou');expect(pinyin().props.tone).toBe(3);expect(pinyin().props.target).toBe(prompt);expect(pinyin().props.disabled).toBe(true);expect(text()).toContain('拼音答对啦！');
  expect(nodes(tree).some(n=>n.type==='button'&&[n.props.children].flat(Infinity).includes('继续练习'))).toBe(false);
  vi.advanceTimersByTime(1999);render();expect(text()).toContain('马上继续');vi.advanceTimersByTime(1);render();expect(text()).not.toContain('马上继续');expect(stored().logs).toHaveLength(1);expect(currentTask(saved)!.id).not.toBe(currentTask(initial)!.id);
 });
 it('wrong answers stay on their snapshot until explicit continue',()=>{mount();fill('ma',1);submit();const saved=stored();expect(saved.logs[0].correct).toBe(false);vi.advanceTimersByTime(5000);render();expect(text()).toContain('没关系，慢慢来。');expect(pinyin().props.value).toBe('ma');expect(pinyin().props.disabled).toBe(true);expect(text()).toContain('正确读音是');expect(text()).not.toContain('明天再见这个字');expect(nodes(tree).some(n=>n.props.className==='feedback ')).toBe(false);click('继续练习');expect(text()).not.toContain('没关系，慢慢来。');expect(stored()).toEqual(saved)});
 it.each([true,false])('fourth page preserves options and source for correct=%s until the permitted transition',correct=>{let initial=startSelectedSession(createState(),catalog,['手','口'],'2026-10-26');initial=confirmPreparation(setPreparationClaims(initial,['手','口']));initial=acknowledgeNarration(initial,`${learningTaskIdentity(initial)}|quiz`);mount(validateState(initial,catalog));fill();submit();vi.advanceTimersByTime(2000);render();const source=currentTask(stored())!,question=makeQuestion(source,catalog),before=text();click(correct?question.answer:question.options.find(option=>option!==question.answer)!);const saved=stored();expect(saved.logs).toHaveLength(2);for(const option of question.options){expect(button(option).props.disabled).toBe(true)}expect(find(n=>n.type===MaskedText).props.text).toBe(question.maskedText);vi.advanceTimersByTime(1999);render();expect(find(n=>n.type===MaskedText).props.text).toBe(question.maskedText);if(correct){vi.advanceTimersByTime(1);render();expect(text()).not.toContain('马上继续')}else{vi.advanceTimersByTime(6000);render();expect(find(n=>n.type===MaskedText).props.text).toBe(question.maskedText);click('继续练习');expect(text()).not.toContain('正确答案是')}expect(stored()).toEqual(saved);expect(before).toContain('选词补全')});
 it('dismissing a wrong card leaves a fixed continuation action and does not alter evidence',()=>{mount();fill('ma',1);submit();const saved=stored();find(n=>n.props['aria-label']==='关闭学习反馈').props.onClick();render();expect(text()).not.toContain('正确读音是');click('继续练习');expect(stored()).toEqual(saved)});
 it('hinted correct answers retain domain retry, evidence and deferred reward semantics',()=>{const initial=mount();click('需要一点提示');fill();const task=currentTask(initial)!,question=makeQuestion(task,catalog);let expected=answerTask(initial,{correct:true,hinted:true,independent:question.independent,submissionId:task.id+':submit'});const destination=learningTaskIdentity(expected)!;expected=deferRewardEntitlements(initial,expected,{sourceId:task.id,sessionId:expected.session!.id,destination,narrationId:`${destination}|teach`});submit();const actual=stored();expect(actual).toEqual({...validateState(expected,catalog),revision:initial.revision+1});expect(actual.logs[0].hinted).toBe(true);expect(actual.logs[0].advanced).toBe(false);expect(text()).toContain('借助提示完成啦');vi.advanceTimersByTime(2000);render();expect(text()).not.toContain('马上继续')});
 it('ignores duplicate stale submit callbacks after the successful commit',()=>{mount();fill();const handler=pinyin().props.onSubmit;handler({preventDefault:()=>{}});handler({preventDefault:()=>{}});render();expect(stored().logs).toHaveLength(1);expect(stored().session!.submissions).toHaveLength(1);expect(stored().revision).toBe(1)});
 it('failed save keeps input/tone and original state and permits retry',()=>{const initial=mount();fill();failSave=true;submit();expect(stored()).toEqual(initial);expect(pinyin().props.value).toBe('shou');expect(pinyin().props.tone).toBe(3);expect(text()).toContain('保存失败');failSave=false;submit();expect(stored().logs).toHaveLength(1);expect(text()).toContain('马上继续')});
 it.each(['pause','navigation'])('%s cancels pending feedback timer without further writes',action=>{mount();fill();submit();const saved=stored();if(action==='pause'){find(n=>n.type===SessionProgress).props.onPause();render()}else click('卡片收藏');vi.advanceTimersByTime(2000);render();expect(stored()).toEqual(saved);expect(text()).not.toContain('马上继续');expect(hooks.effects).toHaveLength(0)});
 it('pause then resume discards old feedback without resubmitting the saved answer',()=>{mount();fill();submit();const saved=stored();find(n=>n.type===SessionProgress).props.onPause();render();vi.advanceTimersByTime(2000);render();click('继续今日练习');expect(text()).not.toContain('马上继续');expect(stored().logs).toEqual(saved.logs);expect(stored().session!.cursor).toBe(saved.session!.cursor);vi.advanceTimersByTime(2000);render();expect(stored().logs).toHaveLength(1)});
 it('unmount cancels the pending transition and preserves saved evidence',()=>{mount();fill();submit();const saved=stored();for(const slot of hooks.slots){slot?.cleanup?.();if(slot?.cleanup)slot.cleanup=undefined}hooks.dirty=false;vi.advanceTimersByTime(2000);expect(hooks.dirty).toBe(false);expect(stored()).toEqual(saved)});
 it('final saved pinyin immediately shows full celebration instead of a two-second small card',()=>{let s=createState();s.session={id:'2026-10-26:legacy',date:'2026-10-26',tasks:[{id:'last:a',pair:'last',wordId:catalog.find(w=>w.char==='手')!.id,kind:'assessment',questionKind:'pinyin'}],cursor:0,completed:false,submissions:[],assessmentPassed:[]};s=acknowledgeNarration(s,`${learningTaskIdentity(s)}|quiz`);mount(validateState(s,catalog));fill();submit();expect(stored().session!.completed).toBe(true);expect(find(n=>n.type===SessionCelebration).props.eventId).toBe(s.session!.id);expect(nodes(tree).some(n=>n.type===LearningFeedback||n.props['aria-label']==='学习反馈')).toBe(false);expect(text()).not.toContain('马上继续');vi.advanceTimersByTime(5000);render();expect(nodes(tree).some(n=>n.type===SessionCelebration)).toBe(true);expect(stored().logs).toHaveLength(1)});
});
