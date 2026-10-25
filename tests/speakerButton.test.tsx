import {afterEach,describe,expect,it,vi} from 'vitest';
const store=vi.hoisted(()=>({snapshot:{owner:null as string|null,status:'idle',generation:0,identity:null as string|null}}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useSyncExternalStore:()=>store.snapshot}));
import {SpeakerButton} from '../src/components/SpeakerButton';
afterEach(()=>{store.snapshot={owner:null,status:'idle',generation:0,identity:null}});
describe('owned speaker feedback',()=>{
 it('animates only the matching owner and learning segment',()=>{
  store.snapshot={owner:'learning',status:'speaking',generation:2,identity:'word'};
  expect(SpeakerButton({owner:'learning',identity:'word',label:'听词语',onPlay:()=>{}}).props['aria-pressed']).toBe(true);
  expect(SpeakerButton({owner:'learning',identity:'sentence',label:'听句子',onPlay:()=>{}}).props['aria-pressed']).toBe(false);
  expect(SpeakerButton({owner:'question',label:'听题',onPlay:()=>{}}).props['aria-pressed']).toBe(false);
 });
 it('stops animation for completed and retry requests and supports replay',()=>{
  const play=vi.fn();store.snapshot={owner:'question',status:'retry',generation:3,identity:null};
  let button=SpeakerButton({owner:'question',label:'朗读题目',onPlay:play});expect(button.props['aria-pressed']).toBe(false);button.props.onClick();expect(play).toHaveBeenCalledOnce();
  store.snapshot={owner:null,status:'idle',generation:4,identity:null};button=SpeakerButton({owner:'question',label:'朗读题目',onPlay:play});expect(button.props.className).not.toContain('is-speaking');expect(button.props.children.props['aria-hidden']).toBe('true');
 });
});
