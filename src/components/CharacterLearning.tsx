import {useEffect,useState} from 'react';
import type {Word} from '../domain';
import {loadHanzi,type HanziData} from '../data/hanzi';
import {StrokePlayer} from './StrokePlayer';
import '../character-learning.css';
export interface CharacterLearningProps {word:Word;onSpeak:(text:string)=>void;onStop?:()=>void}
export function CharacterLearning({word,onSpeak,onStop}:CharacterLearningProps){
  const [result,setResult]=useState<{character:string;data:HanziData|null}|null>(null);
  useEffect(()=>{let active=true;loadHanzi(word.char).then(data=>{if(active)setResult({character:word.char,data});});return()=>{active=false;};},[word.char]);
  const loaded=result?.character===word.char;
  const data=loaded?result.data:null;
  return <section className="character-learning" aria-label={`${word.char}的笔画学习`}>
    <div className="character-learning-heading"><h3>笔画小课堂</h3><button type="button" onClick={()=>onSpeak(word.char)}>听读音</button></div>
    {data?<><dl className="character-metadata"><div><dt>笔画</dt><dd>{data.strokeCount} 笔</dd></div><div><dt>部首</dt><dd>{data.radical??'未知'}</dd></div><div><dt>结构</dt><dd>{data.structure||'未知'}</dd></div></dl><StrokePlayer key={word.char} data={data} onStop={onStop}/></>:<div className="character-fallback"><span className="character-fallback-glyph" aria-label={word.char}>{word.char}</span><p role="status">{loaded?'这个字的笔画资料暂不可用，你仍然可以听读音、读词语和句子。':'正在加载这个字的笔画…'}</p></div>}
  </section>;
}
export default CharacterLearning;
