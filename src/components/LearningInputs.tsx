import type {FormEvent, KeyboardEvent, ReactNode} from 'react';
import {TargetText} from './TargetText';
import type {PinyinTone} from '../pinyin';

/** One preparation tile per word, in the order of its first learning task. */
export function preparationWordIds(tasks:readonly {kind:string;wordId:string}[]):string[]{
  return [...new Set(tasks.filter(task=>task.kind==='learn').map(task=>task.wordId))];
}
export function togglePreparationWord(ids:readonly string[],wordId:string):string[]{
  return ids.includes(wordId)?ids.filter(id=>id!==wordId):[...ids,wordId];
}
export function PreparationGrid({wordIds,claimedWordIds,character,onChange}:{wordIds:string[];claimedWordIds:string[];character:(id:string)=>string|undefined;onChange:(ids:string[])=>void}){
  return <><div className="button-row"><button className="secondary" onClick={()=>onChange(wordIds)}>全选</button><button className="secondary" onClick={()=>onChange([])}>清除</button></div><div className="preparation-grid">{wordIds.map(id=><button key={id} className="choice" aria-pressed={claimedWordIds.includes(id)} onClick={()=>onChange(togglePreparationWord(claimedWordIds,id))}>{character(id)}<small>我认识</small></button>)}</div></>;
}
export const pinyinTones=[{tone:1,label:'ˉ'},{tone:2,label:'ˊ'},{tone:3,label:'ˇ'},{tone:4,label:'ˋ'},{tone:0,label:'轻声'}] as const;
export function PinyinAnswer({target,targetCharacter,promptAccessory,value,tone,onChange,onTone,onSubmit,onCompositionStart,onCompositionEnd,onKeyDown}:{target:string;targetCharacter?:string;promptAccessory?:ReactNode;value:string;tone:PinyinTone|null;onChange:(value:string)=>void;onTone:(tone:PinyinTone)=>void;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;onCompositionStart:()=>void;onCompositionEnd:()=>void;onKeyDown:(event:KeyboardEvent<HTMLInputElement>)=>void}){
  return <form className="pinyin-form compact-pinyin" onSubmit={onSubmit} onKeyDown={event=>{if(event.repeat||event.nativeEvent.isComposing||event.keyCode===229){if(event.key==='Enter'||event.key===' ')event.preventDefault()}}} onClick={event=>{if(event.detail>1)event.preventDefault()}}><input id="pinyin-syllable" aria-label="不带声调的拼音" placeholder="输入拼音" autoComplete="off" autoCapitalize="none" spellCheck={false} value={value} onChange={event=>onChange(event.target.value)} onCompositionStart={onCompositionStart} onCompositionEnd={onCompositionEnd} onKeyDown={onKeyDown}/><h2 className="question-prompt" aria-label="题目"><span className="pinyin-target-prompt">{targetCharacter?<TargetText target={targetCharacter} text={target}/>:target}</span>{promptAccessory}</h2><div className="pinyin-tone-options" role="group" aria-label="选择声调">{pinyinTones.map(option=><button type="button" className={'pinyin-tone '+(tone===option.tone?'selected':'')} key={option.tone} aria-label={option.tone===0?'轻声':`${['','一声','二声','三声','四声'][option.tone]} ${option.label}`} aria-pressed={tone===option.tone} onClick={()=>onTone(option.tone)}>{option.label}</button>)}</div><button className="primary" type="submit">提交拼音</button></form>;
}
