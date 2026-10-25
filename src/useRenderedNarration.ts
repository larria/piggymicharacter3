import {useEffect,useRef} from 'react';

/** A gesture request is consumed only by its matching rendered, saved question.
 * Initial render/refresh has no request and must never unlock automatic speech. */
export function useRenderedNarration(request:number,identity:string|null,enabled:boolean,read:()=>void){
 const handled=useRef(0);
 useEffect(()=>{
  if(request===handled.current)return;
  handled.current=request;
  if(identity&&enabled)read();
 },[request,identity,enabled]);
}
