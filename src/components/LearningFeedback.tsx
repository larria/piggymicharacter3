import {X} from 'lucide-react';
import {CoinIcon,XpIcon} from './GameIcons';
import './learning-feedback.css';
export interface LearningFeedbackProps {title:string;detail?:string;xp:number;coins:number;pendingCoins?:number;milestone?:boolean;closed:boolean;onClose:()=>void;action?:{label:string;onClick:()=>void}}
/** Keep the original accessible text while accenting targets and reward amounts. */
function accentedText(text:string){
 return text.split(/(「[^」]+」|[+-]?\d+(?:\.\d+)?)/g).map((part,index)=>{
  if(/^「[^」]+」$/.test(part))return <span key={index}>「<span className="learning-feedback-accent">{part.slice(1,-1)}</span>」</span>;
  return /^[+-]?\d+(?:\.\d+)?$/.test(part)?<span key={index} className="learning-feedback-accent">{part}</span>:part;
 });
}
/** Dismissal affects presentation only; the persistent action never traps a learner. */
export function LearningFeedback({title,detail,xp,coins,pendingCoins=0,milestone=false,closed,onClose,action}:LearningFeedbackProps){
 if(closed)return action?<div className="learning-feedback learning-feedback-compact"><button className="primary" onClick={action.onClick}>{action.label}</button></div>:null;
 return <section className={'learning-feedback '+(milestone?'learning-feedback-milestone':'')} aria-label="学习反馈">
  <div className="learning-feedback-status" role="status" aria-live="polite">
   <div className="learning-feedback-copy"><strong>{accentedText(title)}</strong>{detail&&<p>{accentedText(detail)}</p>}</div>
   <span className="learning-feedback-rewards">
    {xp>0&&<span aria-label={`获得 ${xp} 经验`}><XpIcon size={22}/><span className="learning-feedback-accent">+{xp}</span></span>}
    {coins>0&&<span aria-label={`获得 ${coins} 猪头币`}><CoinIcon size={22}/><span className="learning-feedback-accent">+{coins}</span></span>}
    {pendingCoins>0&&<span aria-label={`${pendingCoins} 猪头币待到账`}><CoinIcon size={22}/><span className="learning-feedback-accent">+{pendingCoins}</span><small>待到账</small></span>}
   </span>
  </div>
  <button type="button" className="ghost learning-feedback-close" aria-label="关闭学习反馈" onClick={onClose}><X size={18}/></button>
  {action&&<button className="primary" onClick={action.onClick}>{action.label}</button>}
 </section>;
}
