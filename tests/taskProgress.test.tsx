import {describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {TaskProgressRing,taskProgress} from '../src/components/TaskProgressRing';
import {SessionProgress} from '../src/components/SessionProgress';
import {ExamPanel,createExamSubmissionGate,examQuestionIdentity} from '../src/components/ExamPanel';
import {catalog} from '../src/data/catalog';
import {createState,startSelectedSession,startExam,pauseExam,answerExam,currentExamQuestion} from '../src/domain';

function examState(){const state=createState();for(const word of catalog.slice(0,40))state.progress[word.id]={stage:0,due:'2026-10-24',firstSeen:'2026-10-23',lastAdvanced:'2026-10-23',lastStudied:'2026-10-23',failures:0};return startExam(state,catalog,'quiz','2026-10-25');}
describe('numeric task progress ring',()=>{
 it('renders real numeric progress with accessible semantics and decorative SVG',()=>{
  const html=renderToStaticMarkup(<TaskProgressRing done={3} total={10}/>);
  expect(html).toContain('role="progressbar"');expect(html).toContain('aria-valuenow="3"');expect(html).toContain('aria-valuemax="10"');expect(html).toContain('已完成 3 / 10 道题');expect(html).toContain('stroke-dasharray="30 100"');expect(html).toContain('aria-hidden="true" focusable="false"');
 });
 it('clamps invalid counts and keeps empty progress honest',()=>{
  expect(taskProgress(12,10)).toEqual({done:10,total:10,ratio:1});expect(taskProgress(-3,10).done).toBe(0);expect(taskProgress(NaN,Infinity)).toEqual({done:0,total:0,ratio:0});
  const html=renderToStaticMarkup(<TaskProgressRing done={0} total={0}/>);expect(html).toContain('aria-valuemax="1"');expect(html).toContain('已完成 0 / 0 道题');expect(html).toContain('stroke-dasharray="0 100"');
 });
 it('uses completed tasks rather than completed words while retaining pause without help UI',()=>{
  const state=startSelectedSession(createState(),catalog,[catalog[0].id],'2026-10-25');state.session!.cursor=1;
  const html=renderToStaticMarkup(<SessionProgress state={state} onPause={()=>{}}/>);
  expect(html).toContain(`已完成 1 / ${state.session!.tasks.length} 道题`);expect(html).toContain('退出并保存');expect(html).not.toContain('咪猪头，看看怎么玩');expect(html).not.toContain('help-popover');expect(html).not.toContain('help-trigger');expect(html).not.toContain('<progress');expect(html).not.toContain('已完成 <b>');
 });
});
describe('exam task identity and submission',()=>{
 it('locks before synchronous callbacks and ignores duplicates and stale identities',()=>{
  const gate=createExamSubmissionGate();const nested=vi.fn();const commit=vi.fn(()=>{expect(gate.submit('a:0','a:0',nested)).toBe(false);return true});
  expect(gate.submit('a:0','a:0',commit)).toBe(true);expect(gate.submit('a:0','a:0',commit)).toBe(false);expect(gate.submit('a:0','a:1',commit)).toBe(false);expect(gate.submit('a:1','a:1',()=>true)).toBe(true);expect(commit).toHaveBeenCalledTimes(1);expect(nested).not.toHaveBeenCalled();
 });
 it('allows retry after failed or thrown saves',()=>{
  const gate=createExamSubmissionGate();expect(gate.submit('a','a',()=>false)).toBe(false);expect(()=>gate.submit('a','a',()=>{throw Error('save')})).toThrow('save');expect(gate.submit('a','a',()=>true)).toBe(true);
 });
 it('renders answered/total, preserves pause and changes identity per question',()=>{
  const initial=examState();const key=examQuestionIdentity(initial);const state=answerExam(initial,{answer:currentExamQuestion(initial)!.answer,submissionId:`${key}:submit`},'2026-10-25');expect(examQuestionIdentity(state)).not.toBe(key);
  const html=renderToStaticMarkup(<ExamPanel state={state} onCommit={()=>true} onError={()=>{}} onExit={()=>{}}/>);expect(html).toContain('已完成 1 / 10 道题');expect(html).toContain('暂停并保存');expect(html).toContain('type="button" class="choice"');
  const paused=pauseExam(state);expect(examQuestionIdentity(paused)).toBeNull();const pausedHtml=renderToStaticMarkup(<ExamPanel state={paused} onCommit={()=>true} onError={()=>{}} onExit={()=>{}}/>);expect(pausedHtml).toContain('已完成 1 / 10 道题');expect(pausedHtml).toContain('继续原卷');expect(pausedHtml).not.toContain('class="choice"');
 });
});
