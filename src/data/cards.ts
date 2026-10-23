import manifest from './cards.json';
export interface Card { id: number; file: string }
export const cards: readonly Card[] = manifest;
export const cardIds = new Set(cards.map(card => card.id));
export const cardById = new Map(cards.map(card => [card.id, card]));
/** Deployed base path (with trailing slash, empty for root hosting). */
export const BASE = import.meta.env.BASE_URL;
export function assetUrl(path: string): string {
  return `${BASE}${path.replace(/^\//, '')}`;
}
export function cardUrl(card: Pick<Card, 'file'>): string {
  return assetUrl(`cards/${card.file}`);
}
