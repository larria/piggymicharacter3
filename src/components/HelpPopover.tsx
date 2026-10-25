import {useEffect,useId,useRef,useState} from 'react';

export function HelpPopover({text,onRead,onClose}:{text:string;onRead:(text:string,owner:string)=>void;onClose:(owner:string)=>void}) {
 const [open,setOpen]=useState(false);
 const id=useId();
 const root=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const closeCallback=useRef(onClose);
 closeCallback.current=onClose;

 useEffect(()=>{
  if(!open)return;
  function outside(event:PointerEvent){
   if(!root.current?.contains(event.target as Node))setOpen(false);
  }
  function key(event:KeyboardEvent){
   if(event.key==='Escape'){
    event.preventDefault();
    setOpen(false);
    trigger.current?.focus();
   }
  }
  document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',key);
  return()=>{
   document.removeEventListener('pointerdown',outside);
   document.removeEventListener('keydown',key);
   closeCallback.current(id);
  };
 },[open,id]);

 return <div className="help-popover" ref={root}>
  <button ref={trigger} type="button" className="help-trigger" aria-label="咪猪头，看看怎么玩" aria-expanded={open} aria-controls={id} onClick={()=>{
   if(open)setOpen(false);
   else{setOpen(true);onRead(text,id)}
  }}>
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 1.8-2.5 3.7"/><path d="M12 16.5h.01"/></svg>
  </button>
  {open&&<div className="help-content" id={id} role="region" aria-label="咪猪头，看看怎么玩"><p>{text}</p><button type="button" onClick={()=>{setOpen(false);trigger.current?.focus()}}>知道啦</button></div>}
 </div>;
}
