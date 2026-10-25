import {useSyncExternalStore} from 'react';
import {speechQueue} from '../audio/speech';
import './speaker-button.css';

/** A reading control observes only its own queue owner and optional learning segment. */
export function SpeakerButton({owner,identity,label,onPlay}:{owner:string;identity?:string;label:string;onPlay:()=>void}){
  const playback=useSyncExternalStore(speechQueue.subscribeSnapshot,speechQueue.getSnapshot,speechQueue.getSnapshot);
  const active=playback.owner===owner&&playback.status==='speaking'&&(!identity||playback.identity===identity);
  return <button type="button" className={'speaker-button'+(active?' is-speaking':'')} aria-label={label} aria-pressed={active} onClick={onPlay}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 5.5 6 9H3v6h3l4.5 3.5z"/><path className="speaker-wave speaker-wave-near" d="M14 8.5a5 5 0 0 1 0 7"/><path className="speaker-wave speaker-wave-far" d="M17 5.5a9 9 0 0 1 0 13"/></svg>
  </button>;
}
