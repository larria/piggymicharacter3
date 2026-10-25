import {describe,it,expect} from 'vitest';
import {advancesImmediately,learningTaskIdentity,TaskSubmissionLock} from '../src/learningSubmission';
import {answerTask,confirmPreparation,createState,currentTask,setPreparationClaims,startSelectedSession} from '../src/domain';
import {catalog} from '../src/data/catalog';

describe('learning submission presentation',()=>{
 it('bypasses feedback only for independent unhinted success',()=>{
  for(const correct of [false,true])for(const hinted of [false,true])for(const independent of [false,true]){
   expect(advancesImmediately(correct,hinted,independent)).toBe(correct&&!hinted&&independent);
  }
 });
 it('uses saved next identity through both assessment questions and final completion',()=>{
  const id=catalog[0].id;
  let state=confirmPreparation(setPreparationClaims(startSelectedSession(createState(),catalog,[id],'2026-10-25'),[id]));
  const lock=new TaskSubmissionLock();
  const first=learningTaskIdentity(state)!;
  for(let i=0;i<2;i++){
   const identity=learningTaskIdentity(state)!;
   expect(lock.acquire(identity,identity)).toBe(true);
   const task=currentTask(state)!;
   state=answerTask(state,{correct:true,hinted:false,independent:true,submissionId:task.id+':submit'},'2026-10-25');
   lock.release(identity,true);
   expect(lock.acquire(identity,learningTaskIdentity(state))).toBe(false);
  }
  expect(state.session?.completed).toBe(true);
  expect(currentTask(state)).toBeNull();
  expect(learningTaskIdentity(state)).toBeUndefined();
  expect(state.logs).toHaveLength(2);
  expect(first).toContain(state.session!.id);
 });
 it('rejects reentrant/stale submissions, retains success lock, and permits failed save retry',()=>{
  const lock=new TaskSubmissionLock();
  expect(lock.acquire('a','a')).toBe(true);
  expect(lock.acquire('a','a')).toBe(false);
  expect(lock.acquire('b','b')).toBe(false);
  lock.release('a',false);
  expect(lock.acquire('a','a')).toBe(true);
  lock.release('a',true);
  expect(lock.acquire('a','a')).toBe(false);
  expect(lock.acquire('a','b')).toBe(false);
  expect(lock.acquire('b','b')).toBe(true);
 });
});
