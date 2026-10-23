import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import type {State} from '../domain';
import {growth} from '../domain/growth';
import {achievementProgress,equipTitle} from '../domain/achievements';
import {AchievementIcon,AvatarFrame,CoinIcon,RankBadge,StarIcon} from './GameIcons';
import {AvatarEditor} from './AvatarEditor';
import {XpProgress} from './XpProgress';

export function PlayerHeader({state,onCommit}:{state:State;onCommit:(next:State)=>boolean}) {
  const [open,setOpen]=useState(false);
  const [avatarOpen,setAvatarOpen]=useState(false);
  const dialog=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const rank=growth(state);
  const titles=achievementProgress(state).filter(a=>a.unlocked&&!a.unlocked.baseline);
  const title=titles.find(a=>a.id===state.equippedTitle);
  useEffect(()=>{
    if(!open)return;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function key(e:KeyboardEvent){
      if(e.key==='Escape')setOpen(false);
      if(e.key==='Tab'){
        const nodes=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button')||[]);
        if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus();}
        else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus();}
      }
    }
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);trigger.current?.focus();};
  },[open]);
  function select(id:string|null){if(onCommit(equipTitle(state,id)))setOpen(false);}
  return <>
    <header className="topbar player-header">
      <div className="player-profile">
        <button type="button" className="avatar-trigger" aria-label="编辑我的头像" aria-haspopup="dialog" onClick={()=>setAvatarOpen(true)}><AvatarFrame tier={rank.index} size={88} image={state.avatar?.dataUrl}/></button>
      </div>
      <div className="player-overview">
        <div className="player-overview-top">
          <button ref={trigger} className={'title-trigger rarity-'+(title?.rarity||'common')+(title?'':' default-title')} onClick={()=>setOpen(true)} aria-haspopup="dialog"><span aria-hidden="true"><AchievementIcon rarity={title?.rarity||'common'} size={24}/></span><span className="title-name">{title?.title||'初来乍到'}</span><svg className="title-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <span className="wallet" role="img" aria-label={`余额 ${state.coins} 猪头币`}><CoinIcon size={27}/><strong>{state.coins}</strong></span>
        </div>
        <div className="player-growth-summary">
          <span className="player-rank-mark"><RankBadge tier={rank.index} size={38}/></span>
          <span aria-label={`${rank.stars}星，共${rank.maxStars}星`} className="rank-stars">{Array.from({length:rank.maxStars},(_,i)=><span aria-hidden="true" key={i}><StarIcon size={17} filled={i<rank.stars}/></span>)}</span>
          <XpProgress state={state} compact visualOnly/>
        </div>
      </div>
    </header>
    {avatarOpen&&<AvatarEditor state={state} onCommit={onCommit} onClose={()=>setAvatarOpen(false)}/ >}
    {open&&<div className="modal-backdrop" onClick={()=>setOpen(false)}><div ref={dialog} className="modal title-modal" role="dialog" aria-modal="true" aria-label="选择称号" onClick={e=>e.stopPropagation()}><button className="close" aria-label="关闭称号选择" onClick={()=>setOpen(false)}><X/></button><h2>佩戴一个属于你的称号</h2><p>称号来自真实学习成就。历史基线不会补发称号。</p><div className="title-options"><button className="secondary" onClick={()=>select(null)}>初来乍到 · 默认称号</button>{titles.map(a=><button key={a.id} className={(state.equippedTitle===a.id?'primary':'secondary')+' rarity-'+a.rarity} onClick={()=>select(a.id)}>{a.title}</button>)}</div>{!titles.length&&<p>还没有新解锁的称号。继续认真练习，成长会留下纪念。</p>}</div></div>}
  </>;
}
