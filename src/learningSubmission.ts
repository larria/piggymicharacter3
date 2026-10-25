import type {State} from './domain';
import {currentTask} from './domain';

/** Only independent, unhinted success can skip the instructional answer page. */
export function advancesImmediately(correct:boolean,hinted:boolean,independent:boolean){
  return correct&&!hinted&&independent;
}

/** Keep a successful task locked until its identity changes; failed saves may retry. */
export class TaskSubmissionLock {
  private accepted:string|null=null;
  private busy=false;
  acquire(expected:string,current:string|undefined){
    if(this.busy||expected!==current||this.accepted===expected)return false;
    this.busy=true;
    return true;
  }
  release(expected:string,saved:boolean){
    if(saved)this.accepted=expected;
    this.busy=false;
  }
}
export function learningTaskIdentity(state:State){
  const task=currentTask(state);
  return task?`${state.session?.id}|${task.id}`:undefined;
}
