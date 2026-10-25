import {assetUrl} from '../data/cards';
import {speechQueue,type SpeechQueue} from './speech';
export type AudioScene='home'|'learning'|'exam'|'collection'|'growth'|'parent'|'result';
export type SfxName='click'|'correct'|'wrong'|'unlock'|'celebrate';
const tracks:Record<AudioScene,string|null>={home:'bgm-sunny-30s',learning:'bgm-main',exam:null,collection:'bgm-sunny-30s',growth:'bgm-sunny-30s',parent:null,result:'bgm-result-5s'};
export class AudioCoordinator {
  private settings={sound:true,music:false};
  private resultFinished=false;
  private playPending=false;
  private lastClick=-Infinity;
  private scene:AudioScene='home';
  private activated=false;
  private hidden=false;
  private speaking=false;
  private music:HTMLAudioElement|null=null;
  private effects=new Set<HTMLAudioElement>();
  private unsubscribe:(()=>void)|null=null;
  private listening=false;
  constructor(private speech:SpeechQueue=speechQueue){}
  private visibility=()=>{this.hidden=document.hidden;if(this.hidden){this.speech.cancelAll();this.pauseEffects()}this.sync()};
  private init(){if(this.listening||typeof document==='undefined')return;this.listening=true;this.hidden=document.hidden;document.addEventListener('visibilitychange',this.visibility);this.unsubscribe=this.speech.subscribe(active=>{this.speaking=active;if(active)this.pauseEffects();this.sync()})}
  configure(settings:{sound:boolean;music:boolean}){this.init();this.settings={...settings};if(!settings.sound)this.pauseEffects();this.sync()}
  setScene(scene:AudioScene){this.init();if(this.scene!==scene){this.pauseEffects();this.music?.pause();this.music=null;this.playPending=false;this.resultFinished=false;this.scene=scene}this.sync()}
  activate(){this.init();this.activated=true;this.sync()}
  private sync(){
    if(!this.activated||this.hidden||!this.settings.music||this.speaking||!tracks[this.scene]){this.music?.pause();return}
    if(this.scene==='result'&&this.resultFinished)return;
    if(!this.music){if(typeof Audio==='undefined')return;this.music=new Audio(assetUrl(`audio/${tracks[this.scene]}.mp3`));this.music.loop=this.scene!=='result';this.music.volume=.1;const music=this.music;music.onended=()=>{if(this.music===music&&this.scene==='result')this.resultFinished=true}}
    if(this.music.paused&&!this.playPending){const music=this.music;this.playPending=true;try{void music.play().catch(()=>{/* A later user activation can retry an autoplay denial. */}).finally(()=>{if(this.music===music)this.playPending=false})}catch{this.playPending=false}}
  }
  playSfx(name:SfxName){this.activate();if(!this.settings.sound||this.hidden||this.speaking||typeof Audio==='undefined')return;if(name==='click'){const now=Date.now();if(now-this.lastClick<120)return;this.lastClick=now}this.pauseEffects();const audio=new Audio(assetUrl(`audio/sfx_${name}.mp3`));audio.volume=.3;this.effects.add(audio);const cleanup=()=>this.effects.delete(audio);audio.onended=cleanup;audio.onerror=cleanup;try{void audio.play().catch(cleanup)}catch{cleanup()}}
  private pauseEffects(){for(const effect of this.effects){effect.pause();effect.onended=null;effect.onerror=null}this.effects.clear()}
  stop(){this.activated=false;this.speech.cancelAll();this.music?.pause();this.pauseEffects()}
  dispose(){this.stop();this.music=null;this.unsubscribe?.();this.unsubscribe=null;if(this.listening)document.removeEventListener('visibilitychange',this.visibility);this.listening=false}
}
export const audioCoordinator=new AudioCoordinator();
