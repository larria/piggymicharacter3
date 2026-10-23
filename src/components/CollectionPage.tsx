import { useEffect, useRef, useState } from 'react';
import { cards, cardById, cardUrl } from '../data/cards';
import { redeemCard, type State } from '../domain';
import { CoinIcon, LockIcon } from './GameIcons';
import { CardWall } from './CardWall';
import { AvatarEditor } from './AvatarEditor';
import './collection.css';

export interface CollectionPageProps { state: State; onCommit(next: State): boolean; onError(message: string): void }
export function CollectionPage({ state, onCommit, onError }: CollectionPageProps) {
  const [tab, setTab] = useState<'shop' | 'wall'>('shop');
  const [preview, setPreview] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [avatarCard, setAvatarCard] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const purchasing = useRef(false);
  const openCard = preview !== null && state.owned.includes(preview) ? cardById.get(preview) : undefined;
  useEffect(() => { if (openCard) dialog.current?.showModal(); else dialog.current?.close(); }, [openCard]);
  const buy = (id: number) => {
    if (purchasing.current || state.owned.includes(id)) return;
    purchasing.current = true;
    try {
      const next = redeemCard(state, id);
      if (next === state) { onError('猪头币不足，完成学习后再来收藏吧。'); return; }
      if (onCommit(next)) { setRevealed(id); setPending(null); }
    } catch (error) { onError(error instanceof Error ? error.message : '购买未成功，请重试。'); }
    finally { purchasing.current = false; }
  };
  return <section className="collection-page" aria-label="卡片收藏">
    <header className="collection-heading"><div><p className="collection-eyebrow">把喜欢，慢慢收集</p><h1>我的卡片小屋</h1><p>每一次认真学习，都离下一张收藏更近一点。</p></div></header>
    <div className="collection-tabs" aria-label="收藏页面"><button type="button" aria-pressed={tab === 'shop'} onClick={() => setTab('shop')}>卡片商店</button><button type="button" aria-pressed={tab === 'wall'} onClick={() => setTab('wall')}>我的收藏墙 · {state.owned.length}</button></div>
    {tab === 'shop' ? <><p className="collection-note">每张 <span className="coin-amount" role="img" aria-label="20 猪头币"><CoinIcon size={19}/>20</span> · 把喜欢的画面带回小屋</p><div className="collection-grid">{cards.map(card => {
      const owned = state.owned.includes(card.id);
      return <article className={`collection-card ${owned ? 'is-owned' : ''} ${revealed === card.id ? 'is-revealed' : ''}`} key={card.id}>
        <button type="button" className="collection-art" aria-label={owned ? `查看卡片 ${card.id + 1} 大图` : `卡片 ${card.id + 1} 尚未收藏，点击查看购买确认`} onClick={() => { if (owned) { setZoom(1); setPreview(card.id); } else setPending(card.id); }}><img src={cardUrl(card)} alt={owned ? `收藏卡片 ${card.id + 1}` : '尚未揭晓的模糊卡片'} loading="lazy" decoding="async" draggable={false} />{!owned && <span className="collection-lock" aria-hidden="true"><LockIcon size={44}/></span>}</button>
      </article>;
    })}</div></> : <CardWall state={state} onCommit={onCommit} onError={onError} onPreview={id => { if (state.owned.includes(id)) { setZoom(1); setPreview(id); } }} />}
    {pending !== null && !state.owned.includes(pending) && <div className="collection-purchase" role="region" aria-label="确认收藏"><span>揭晓 No. {pending + 1}？</span><button type="button" aria-label="花费 20 猪头币确认收藏" disabled={state.coins < 20} onClick={() => buy(pending)}><CoinIcon size={21}/>20 · 确认收藏</button><button type="button" onClick={() => setPending(null)}>再想想</button>{state.coins < 20 && <small>还差 <span className="coin-amount" role="img" aria-label={`${20 - state.coins} 猪头币`}><CoinIcon size={19}/>{20 - state.coins}</span>，先去学习吧。</small>}</div>}
    <dialog ref={dialog} className="collection-dialog" onCancel={() => setPreview(null)} onClose={() => setPreview(null)}>
      {openCard && <><header><strong>No. {openCard.id + 1} · 我的收藏</strong><button type="button" onClick={() => setPreview(null)} autoFocus>关闭</button></header><div className="collection-zoom-tools"><button type="button" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .25))}>缩小</button><output aria-live="polite">{Math.round(zoom * 100)}%</output><button type="button" disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + .25))}>放大</button><button type="button" onClick={() => setZoom(1)}>原尺寸</button><button type="button" onClick={() => { const id = openCard.id; dialog.current?.close(); setPreview(null); setAvatarCard(id); }}>设为头像</button></div><div className="collection-image-scroll"><img src={cardUrl(openCard)} alt={`卡片 ${openCard.id + 1} 清晰大图`} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} /></div></>}
    </dialog>
    {avatarCard !== null && <AvatarEditor state={state} onCommit={onCommit} onClose={() => setAvatarCard(null)} initialCardId={avatarCard}/>}
  </section>;
}
