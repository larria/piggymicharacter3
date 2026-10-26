/** Failure recovery is a wait after a terminal playback result, never a speech timeout. */
export class NarrationWait {
 private timer:ReturnType<typeof setTimeout>|null=null;
 cancel(){if(this.timer!==null)clearTimeout(this.timer);this.timer=null;}
 start(valid:()=>boolean,release:()=>void){this.cancel();this.timer=setTimeout(()=>{this.timer=null;if(valid())release();},10000);}
}
