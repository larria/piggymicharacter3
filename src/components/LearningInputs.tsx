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
export const pinyinKeyRows=['qwertyuiop','asdfghjkl','zxcübnm'] as const;
const toneNames=['轻声','一声','二声','三声','四声'] as const;
export function PinyinAnswer({target,targetCharacter,promptAccessory,value,tone,onChange,onTone,onSubmit,disabled=false}:{target:string;targetCharacter?:string;promptAccessory?:ReactNode;value:string;tone:PinyinTone|null;onChange:(value:string)=>void;onTone:(tone:PinyinTone)=>void;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;disabled?:boolean;onCompositionStart?:()=>void;onCompositionEnd?:()=>void;onKeyDown?:(event:KeyboardEvent<HTMLInputElement>)=>void}){
  const append=(letter:string)=>{if(!disabled)onChange(value+letter)};
  const erase=()=>{if(!disabled)onChange(Array.from(value).slice(0,-1).join(''))};
  function handleKey(event:KeyboardEvent<HTMLFormElement>){
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.nativeEvent.isComposing||event.keyCode===229||event.repeat){if(event.key==='Enter'||event.key===' ')event.preventDefault();return}
    if(disabled){if(event.key==='Enter'||event.key===' ')event.preventDefault();return}
    // Accessory speakers retain their own native keyboard behavior.
    const element=event.target as HTMLElement;
    if(element.closest('.question-prompt'))return;
    const key=event.key.toLowerCase();
    if(/^[a-zü]$/.test(key)){event.preventDefault();append(key==='v'?'ü':key)}
    else if(key==='backspace'){event.preventDefault();erase()}
    else if(/^[0-5]$/.test(key)){event.preventDefault();onTone((Number(key)%5) as PinyinTone)}
    else if(key==='enter'&&element.tagName!=='BUTTON'){event.preventDefault();event.currentTarget.requestSubmit()}
  }
  return <form className="pinyin-form compact-pinyin" tabIndex={0} aria-label="拼音答题" aria-disabled={disabled} onSubmit={event=>{if(disabled){event.preventDefault();return}onSubmit(event)}} onKeyDown={handleKey} onClick={event=>{if(event.detail>1)event.preventDefault()}}>
    <h2 className="question-prompt" aria-label="题目"><span className="pinyin-target-prompt">{targetCharacter?<TargetText target={targetCharacter} text={target}/>:target}</span>{promptAccessory}</h2>
    <output className="pinyin-answer-display" aria-label="拼音答案" aria-live="polite"><span className="pinyin-answer-syllable">{value||'待输入拼音'}</span><span className="pinyin-answer-tone">{tone===null?'未选择声调':`${toneNames[tone]} ${pinyinTones.find(option=>option.tone===tone)!.label}`}</span></output>
    <fieldset className="pinyin-keyboard" disabled={disabled} aria-label="拼音键盘"><legend className="sr-only">拼音键盘：输入字母，选择声调后确认；实体键盘 1–4 选声调，0 或 5 选轻声</legend>
      {pinyinKeyRows.map(row=><div className="pinyin-key-row" key={row}>{Array.from(row).map(letter=><button type="button" className="pinyin-letter" aria-label={`字母 ${letter}`} key={letter} onClick={()=>append(letter)}>{letter}</button>)}</div>)}
      <div className="pinyin-tone-options" role="group" aria-label="选择声调">{pinyinTones.map(option=><button type="button" className={'pinyin-tone '+(tone===option.tone?'selected':'')} key={option.tone} aria-label={option.tone===0?'轻声':`${toneNames[option.tone]} ${option.label}`} aria-pressed={tone===option.tone} onClick={()=>{if(!disabled)onTone(option.tone)}}>{option.label}</button>)}</div>
      <div className="pinyin-key-actions"><button type="button" aria-label="删除最后一个拼音字母" onClick={erase}>退格</button><button className="primary" type="submit">确认拼音</button></div>
    </fieldset>
  </form>;
}
