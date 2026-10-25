export type SpeechStep = {text:string;rate?:number;identity?:string} | {pauseMs:number};
export type LearningSpeechIdentities = {character?:string;word?:string;sentence?:string};
export type SpeechOutcome = 'completed'|'cancelled'|'failed'|'unavailable';
export type SpeechOptions = {rate?:number;onError?:(message:string)=>void;onFinish?:(outcome:SpeechOutcome)=>void};
export type MaskedSegment = {text:string;masked:boolean};
export type SpeechStatus = 'idle'|'speaking'|'retry';
export type SpeechPlayback = {cancel:()=>void;finished:Promise<SpeechOutcome>};
/** Stable external-store snapshot; retry belongs to the caller whose request failed. */
export type SpeechSnapshot = Readonly<{status:SpeechStatus;owner:string|null;identity:string|null;generation:number}>;
export const SPEECH_ERROR='点击朗读，再试一次。';

/** Speech permission is independent of music. Only engine end events complete speech. */
export class SpeechQueue {
  private owner:string|null=null;
  private generation=0;
  private identity:string|null=null;
  private activated=false;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private finishCurrent:((outcome:SpeechOutcome)=>void)|null=null;
  private firstEntryLock:{owner:string;started:boolean}|null=null;
  private listeners=new Set<(active:boolean)=>void>();
  private statusListeners=new Set<(status:SpeechStatus)=>void>();
  private status:SpeechStatus='idle';
  private active=false;
  private snapshot:SpeechSnapshot=Object.freeze({status:'idle',owner:null,identity:null,generation:0});
  private snapshotListeners=new Set<()=>void>();
  getSnapshot=():SpeechSnapshot=>this.snapshot;
  subscribeSnapshot=(listener:()=>void)=>{this.snapshotListeners.add(listener);return ()=>{this.snapshotListeners.delete(listener)}};
  private publishSnapshot(){
    if(this.snapshot.status===this.status&&this.snapshot.owner===this.owner&&this.snapshot.generation===this.generation&&this.snapshot.identity===this.identity)return;
    this.snapshot=Object.freeze({status:this.status,owner:this.owner,identity:this.identity,generation:this.generation});
    for(const listener of this.snapshotListeners)listener();
  }
  private emit(active:boolean){if(this.active===active)return;this.active=active;for(const listener of this.listeners)listener(active)}
  private setStatus(status:SpeechStatus){const changed=this.status!==status;this.status=status;this.publishSnapshot();if(changed)for(const listener of this.statusListeners)listener(status)}
  activateFromGesture(){this.activated=true}
  subscribe(listener:(active:boolean)=>void){this.listeners.add(listener);listener(this.active);return ()=>{this.listeners.delete(listener)}}
  subscribeStatus(listener:(status:SpeechStatus)=>void){this.statusListeners.add(listener);listener(this.status);return ()=>{this.statusListeners.delete(listener)}}
  /** Release after playback.finished. While held, only the owner's first narration can start. */
  acquireFirstEntryLock(owner:string):(()=>void)|null{
    if(this.firstEntryLock)return null;
    const lock={owner,started:false};this.firstEntryLock=lock;
    return ()=>{if(this.firstEntryLock===lock)this.firstEntryLock=null};
  }
  cancel(owner:string){if(!this.firstEntryLock&&this.owner===owner)this.cancelAll()}
  /** Explicit navigation/visibility safety override, including a first-entry lock. */
  cancelAll(){this.firstEntryLock=null;this.stop('cancelled')}
  private stop(outcome:SpeechOutcome,retryOwner?:string){
    const finish=this.finishCurrent;this.finishCurrent=null;
    this.generation++;this.owner=retryOwner??null;this.identity=null;
    if(this.timer!==null){clearTimeout(this.timer);this.timer=null}
    if(typeof window!=='undefined')try{window.speechSynthesis?.cancel()}catch{/* Broken engines must not block navigation. */}
    this.emit(false);this.setStatus(retryOwner?'retry':'idle');finish?.(outcome);
  }
  private rejected(onFinish?:SpeechOptions['onFinish']):SpeechPlayback{
    onFinish?.('cancelled');return {cancel:()=>{},finished:Promise.resolve('cancelled')};
  }
  sequence(owner:string,steps:readonly SpeechStep[],onError?:SpeechOptions['onError'],onFinish?:SpeechOptions['onFinish']):SpeechPlayback{
    return this.run(owner,steps,onError,onFinish);
  }
  private run(owner:string,steps:readonly SpeechStep[],onError?:SpeechOptions['onError'],onFinish?:SpeechOptions['onFinish'],unavailable=false):SpeechPlayback{
    if(this.firstEntryLock){if(this.firstEntryLock.owner!==owner||this.firstEntryLock.started)return this.rejected(onFinish);this.firstEntryLock.started=true}
    this.stop('cancelled');
    const generation=this.generation;
    let settled=false;let resolve!:(outcome:SpeechOutcome)=>void;
    const finished=new Promise<SpeechOutcome>(done=>{resolve=done});
    const finish=(outcome:SpeechOutcome)=>{if(settled)return;settled=true;resolve(outcome);onFinish?.(outcome)};
    this.finishCurrent=finish;
    const playback={finished,cancel:()=>{if(!this.firstEntryLock&&generation===this.generation)this.cancelAll()}};
    const fail=(outcome:SpeechOutcome='failed')=>{if(generation!==this.generation||settled)return;this.stop(outcome,owner);onError?.(SPEECH_ERROR)};
    if(unavailable||typeof window==='undefined'||!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined'||(typeof document!=='undefined'&&document.hidden)){fail('unavailable');return playback}
    this.owner=owner;let index=0;this.emit(true);this.setStatus('speaking');
    const next=()=>{
      if(generation!==this.generation||settled)return;
      if(this.timer!==null){clearTimeout(this.timer);this.timer=null}
      const step=steps[index++];if(!step){this.finishCurrent=null;this.owner=null;this.identity=null;this.emit(false);this.setStatus('idle');finish('completed');return}
      if('pauseMs'in step){this.identity=null;this.publishSnapshot();this.timer=setTimeout(next,step.pauseMs);return}
      if(!step.text.trim()){next();return}
      this.identity=step.identity??owner;this.publishSnapshot();
      if(generation!==this.generation||settled)return;
      try{
        const utterance=new SpeechSynthesisUtterance(step.text);utterance.lang='zh-CN';utterance.rate=step.rate??.8;
        let ended=false;
        utterance.onend=()=>{if(ended)return;ended=true;next()};
        utterance.onerror=()=>{if(ended)return;ended=true;fail()};
        this.timer=setTimeout(()=>{ended=true;fail()},Math.max(15000,step.text.length*1500));
        window.speechSynthesis.speak(utterance);
      }catch{fail()}
    };next();return playback;
  }
  speak(owner:string,text:string,options:SpeechOptions={}){this.activateFromGesture();return this.sequence(owner,[{text,rate:options.rate}],options.onError,options.onFinish)}
  readLearning(owner:string,word:{character:string;word?:string;sentence?:string},onError?:SpeechOptions['onError'],identities:LearningSpeechIdentities={},onFinish?:SpeechOptions['onFinish']):SpeechPlayback{
    const steps:SpeechStep[]=[];for(let i=0;i<3;i++){steps.push({text:word.character,rate:.65,identity:identities.character});if(i<2)steps.push({pauseMs:450})}
    for(const key of ['word','sentence'] as const){const text=word[key];if(text?.trim())steps.push({pauseMs:450},{text,rate:.8,identity:identities[key]})}
    return this.run(owner,steps,onError,onFinish,!this.activated);
  }
  readMasked(owner:string,segments:readonly MaskedSegment[],kind:'character'|'word',onError?:SpeechOptions['onError'],onFinish?:SpeechOptions['onFinish']):SpeechPlayback{
    this.activateFromGesture();
    // Never access a masked segment's text: it may contain the answer.
    const steps:SpeechStep[]=segments.flatMap<SpeechStep>(part=>part.masked?[{pauseMs:500},{text:kind==='character'?'哪个字':'哪个词',rate:.8},{pauseMs:500}]:[{text:part.text,rate:.8}]);
    return this.sequence(owner,steps,onError,onFinish);
  }
}
export const speechQueue=new SpeechQueue();
