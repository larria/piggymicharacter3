import manifest from './cards.json';
export interface Card { id: number; file: string }
export const cards: readonly Card[] = manifest;
export const cardIds = new Set(cards.map(card => card.id));
export const cardById = new Map(cards.map(card => [card.id, card]));
