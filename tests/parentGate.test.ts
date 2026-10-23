import {describe, expect, it} from 'vitest';
const productText = import.meta.glob<string>(['../src/**/*.{ts,tsx,css,json}', '../public/**/*.{js,json,webmanifest,html}', '../index.html', '../README.md'], {query: '?raw', import: 'default', eager: true});
import {createParentChallenge} from '../src/parentGate';

const count = 21;
const all = Array.from({length: count}, (_, i) => createParentChallenge(undefined, () => (i + .5) / count));

describe('parent knowledge gate', () => {
  it('uses small dynamic legs with integer answers greater than ten', () => {
    expect(new Set(all.map(c => c.kind))).toEqual(new Set(['pythagorean']));
    expect(new Set(all.map(c => c.question)).size).toBe(count);
    for (const c of all) {
      expect(Number.isInteger(c.answer)).toBe(true);
      expect(c.answer).toBeGreaterThan(10);
      expect(c.question).not.toMatch(/答案|提示|=\s*\d+|√/);
    }
  });
  it('answers match the knowledge expressed in every question', () => {
    for (const c of all) {
      const numbers = c.question.match(/\d+/g)!.map(Number);
      expect(numbers).toHaveLength(2);
      for (const leg of numbers) {
        expect(leg).toBeGreaterThanOrEqual(3);
        expect(leg).toBeLessThanOrEqual(8);
      }
      expect(c.answer).toBe(numbers[0] ** 2 + numbers[1] ** 2);
      expect(c.question).toContain('斜边的平方');
    }
  });
  it('excludes the previous full question even with deterministic randomness', () => {
    for (const previous of all) {
      for (let i = 0; i < count - 1; i++) {
        expect(createParentChallenge(previous.question, () => (i + .5) / (count - 1)).question).not.toBe(previous.question);
      }
    }
  });
});

describe('product naming', () => {
  it('uses 咪猪头 consistently without doubling existing names', () => {
    expect(Object.keys(productText).length).toBeGreaterThan(5);
    for (const [file, text] of Object.entries(productText)) {
      expect(text, file).not.toMatch(/咪猪(?!头)|咪猪头头/);
    }
    expect(productText['../src/data/source.json']).toContain('咪猪头是一个勇敢的人。');
    expect(productText['../src/App.tsx']).toContain('咪猪头识字备份-');
  });
});
