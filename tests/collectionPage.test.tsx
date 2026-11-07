import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
const hooks=vi.hoisted(()=>({slots:[] as any[],cursor:0}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),
 useState:(initial:any)=>{const i=hooks.cursor++;if(!(i in hooks.slots))hooks.slots[i]=initial;return [hooks.slots[i],(value:any)=>{hooks.slots[i]=typeof value==='function'?value(hooks.slots[i]):value}]},
 useRef:(initial:any)=>{const i=hooks.cursor++;return hooks.slots[i]??(hooks.slots[i]={current:initial})},
 useEffect:()=>{},
}));
import {CollectionPage,type CollectionPageProps} from '../src/components/CollectionPage';
import {createState} from '../src/domain';
import {cardById,cardUrl} from '../src/data/cards';
function nodes(node:any):ReactElement<any>[]{if(!node||typeof node!=='object'||!('props'in node))return [];return [node,...[node.props.children].flat(Infinity).flatMap(nodes)]}
let tree:ReactElement<any>,props:CollectionPageProps;
function render(){hooks.cursor=0;tree=CollectionPage(props)}
function button(label:string){return nodes(tree).find(n=>n.type==='button'&&(n.props['aria-label']===label||n.props.children===label))!}
function purchase(){return nodes(tree).find(n=>n.props.role==='region')}
function select(id:number){button(`卡片 ${id+1} 尚未收藏，点击查看购买确认`).props.onClick({detail:1});render()}
beforeEach(()=>{hooks.slots=[];props={state:{...createState(),coins:40},onCommit:vi.fn(()=>true),onError:vi.fn(),onPractice:vi.fn(),onBackup:vi.fn(),controller:{} as CollectionPageProps['controller']};render()});
describe('collection confirmation',()=>{
 it('ignores a purchase double-click landing on another card while preserving single and keyboard activation',()=>{vi.mocked(props.onCommit).mockImplementation(next=>{props.state=next;return true});select(0);button('花费 20 猪头币确认收藏卡片 1').props.onClick();render();const purchasedBalance=props.state.coins;expect(props.state.owned).toContain(0);expect(props.onCommit).toHaveBeenCalledOnce();const lower=button('卡片 10 尚未收藏，点击查看购买确认');lower.props.onClick({detail:2});render();expect(purchase()).toBeUndefined();button('卡片 10 尚未收藏，点击查看购买确认').props.onClick({detail:1});render();expect(purchase()?.props['aria-label']).toBe('确认收藏卡片 10');button('再想想').props.onClick();render();button('卡片 10 尚未收藏，点击查看购买确认').props.onClick({detail:0});render();expect(purchase()?.props['aria-label']).toBe('确认收藏卡片 10');expect(props.state.coins).toBe(purchasedBalance);expect(props.onCommit).toHaveBeenCalledOnce();});
 it('identifies the exact selected card and updates its thumbnail',()=>{
  select(0);expect(purchase()?.props['aria-label']).toBe('确认收藏卡片 1');
  let image=nodes(purchase()).find(n=>n.type==='img')!;expect(image.props.src).toBe(cardUrl(cardById.get(0)!));expect(image.props.alt).toBe('待收藏卡片 1 缩略图');
  select(1);expect(purchase()?.props['aria-label']).toBe('确认收藏卡片 2');image=nodes(purchase()).find(n=>n.type==='img')!;expect(image.props.src).toBe(cardUrl(cardById.get(1)!));
 });
 it('clears confirmation when switching tabs, including switching back',()=>{
  select(0);nodes(tree).find(n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children[0]==='我的收藏墙 · ')!.props.onClick();render();expect(purchase()).toBeUndefined();
  button('卡片商店').props.onClick();render();expect(purchase()).toBeUndefined();
 });
 it('offers practice without purchasing when balance is insufficient',()=>{
  props.state={...props.state,coins:3};render();select(0);expect(button('花费 20 猪头币确认收藏卡片 1').props.disabled).toBe(true);
  button('去练习赚猪头币').props.onClick();render();expect(props.onPractice).toHaveBeenCalledOnce();expect(props.onCommit).not.toHaveBeenCalled();expect(purchase()).toBeUndefined();
 });
 it('preserves the synchronous purchase lock and clears only after successful saving',()=>{
  select(0);const confirm=button('花费 20 猪头币确认收藏卡片 1');
  vi.mocked(props.onCommit).mockImplementation(next=>{confirm.props.onClick();expect(next.owned).toContain(0);props.state=next;return true});
  confirm.props.onClick();render();expect(props.onCommit).toHaveBeenCalledOnce();expect(purchase()).toBeUndefined();
 });
 it('retains confirmation and allows retry when saving fails',()=>{
  vi.mocked(props.onCommit).mockReturnValue(false);select(0);button('花费 20 猪头币确认收藏卡片 1').props.onClick();render();expect(purchase()).toBeDefined();
  vi.mocked(props.onCommit).mockReturnValue(true);button('花费 20 猪头币确认收藏卡片 1').props.onClick();render();expect(props.onCommit).toHaveBeenCalledTimes(2);expect(purchase()).toBeUndefined();
 });
});
