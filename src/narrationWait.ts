/** Failure recovery is a wait after a terminal playback result, never a speech timeout. */
export class NarrationWait {
 private timer:ReturnType<typeof setTimeout>|null=null;
 private generation=0;
 cancel(){if(this.timer!==null)clearTimeout(this.timer);this.timer=null;this.generation++;}
 start(valid:()=>boolean,release:()=>void,onTick?:(secondsRemaining:number)=>void){
  this.cancel();
  const generation=this.generation;
  let remaining=10;
  const active=()=>generation===this.generation&&valid();
  const tick=()=>{
   if(generation!==this.generation)return;
   this.timer=null;
   if(!active()){this.cancel();return;}
   if(remaining>0)this.timer=setTimeout(()=>{remaining--;tick();},1000);
   onTick?.(remaining);
   if(remaining===0&&active())release();
  };
  tick();
 }
}
