import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {LearningFeedback} from '../src/components/LearningFeedback';

const props={title:'恭喜咪猪头，学完「篮」啦！',xp:5,coins:0,pendingCoins:1,milestone:true,closed:false,onClose:()=>{},action:{label:'学习下一个字',onClick:()=>{}}};
const source=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
describe('learning feedback presentation',()=>{
 it('shows one XP amount and an icon-based pending coin without duplicate visible wording',()=>{
  const html=renderToStaticMarkup(<LearningFeedback {...props}/>);
  expect(html.match(/>\+5</g)).toHaveLength(1);
  expect(html.match(/>\+1</g)).toHaveLength(1);
  expect(html).toContain('class="coin-icon ');
  expect(html).toContain('<small>待到账</small>');
  expect(html).toContain('aria-label="1 猪头币待到账"');
  expect(html).not.toContain('本轮获得');
  expect(html).not.toContain('>1 猪头币待到账<');
  expect(source('../src/App.tsx')).not.toContain('detail:`本轮获得 ${reward.xp} XP`');
 });
 it('accents quoted targets and every reward number while preserving readable strings',()=>{
  const html=renderToStaticMarkup(<LearningFeedback {...props} coins={2} detail="「篮」获得 12 XP 和 +3 奖励"/>);
  for(const text of ['篮','+5','+2','+1','12','+3'])expect(html).toContain(`<span class="learning-feedback-accent">${text}</span>`);
  expect(html.replace(/<[^>]*>/g,'')).toContain(props.title);
  expect(html.replace(/<[^>]*>/g,'')).toContain('「篮」获得 12 XP 和 +3 奖励');
  expect(html).toContain('role="status" aria-live="polite"');
 });
 it('uses a centered flex row, quiet cream styling and a non-overlapping responsive action',()=>{
  const css=source('../src/components/learning-feedback.css');
  expect(css).toContain('border:1px solid #d5e2cc');
  expect(css).toContain('background:#fffdf3');
  expect(css).toContain('box-shadow:0 4px 18px #263b2512');
  expect(css).toContain('.learning-feedback-status{display:flex;align-items:center;');
  expect(css).toContain('.learning-feedback-rewards,.learning-feedback-rewards>span{display:inline-flex;align-items:center;');
  expect(css).toContain('.learning-feedback .learning-feedback-close{position:static;display:flex;align-items:center;justify-content:center;');
  expect(css).toContain('.learning-feedback>button.primary{flex-basis:100%;width:100%}');
  expect(css).toContain('.learning-feedback .learning-feedback-accent{color:#b86643}');
  expect(css).not.toContain('border:3px');
  expect(css).not.toContain('top:8px');
 });
 it('keeps the destination available after dismissal and hides rewards',()=>{
  const html=renderToStaticMarkup(<LearningFeedback {...props} closed/>);
  expect(html).toContain('学习下一个字');expect(html).not.toContain('+5');
  expect(renderToStaticMarkup(<LearningFeedback {...props} closed action={undefined}/>)).toBe('');
 });
});
