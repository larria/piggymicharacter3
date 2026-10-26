/** A saved answer owns at most one delayed transition; navigation invalidates it. */
export class PinyinFeedbackTimer {
  private timer:ReturnType<typeof setTimeout>|undefined;
  cancel(){if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
  start(valid:()=>boolean,advance:()=>void){
    this.cancel();
    this.timer=setTimeout(()=>{this.timer=undefined;if(valid())advance();},2000);
  }
}
