import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { matchStroke, toBoardMedian, type Point } from './strokeMatching';

function medians(character: string): Point[][] {
  const filename = character.codePointAt(0)!.toString(16);
  return JSON.parse(readFileSync(new URL(`../public/hanzi/${filename}.json`, import.meta.url), 'utf8')).medians.map(toBoardMedian);
}
function dense(points: Point[], jitter = 0): Point[] {
  const output: Point[] = [];
  points.slice(1).forEach((b, i) => {
    const a = points[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
    for (let j = 0; j < steps; j++) {
      const t = j / steps, noise = Math.sin(output.length * 1.7) * jitter;
      output.push([a[0] + (b[0] - a[0]) * t + noise, a[1] + (b[1] - a[1]) * t - noise]);
    }
  });
  output.push([...points[points.length - 1]]);
  return output;
}
const line: Point[] = [[100, 200], [700, 200]];

describe('board coordinate conversion', () => {
  it('flips y about 900 without mutating resources or aliasing points', () => {
    const input: Point[] = [[10, 900], [20, 0], [30, -50]];
    expect(toBoardMedian(input)).toEqual([[10, 0], [20, 900], [30, 950]]);
    expect(input[0]).toEqual([10, 900]);
    expect(toBoardMedian(input)[0]).not.toBe(input[0]);
    expect(toBoardMedian([])).toEqual([]);
  });
});

describe('real local Hanzi medians', () => {
  for (const character of ['口', '课', '心', '小', '了', '也', '我', '女', '飞']) {
    it(`${character}: accepts every median, dense tracing and small jitter; rejects reverse and offset`, () => {
      for (const expected of medians(character)) {
        for (const input of [expected, dense(expected), dense(expected, 2)]) {
          const result = matchStroke(input, expected);
          expect(result.accepted, `${character}: ${result.reason}`).toBe(true);
          expect(result.coverage).toBeGreaterThanOrEqual(.85);
          expect(result.precision).toBeGreaterThanOrEqual(.85);
        }
        expect(matchStroke([...expected].reverse(), expected).accepted).toBe(false);
        expect(matchStroke(expected.map(([x, y]) => [x + 100, y + 100]), expected).accepted).toBe(false);
      }
    });
  }
  it('rejects a chord shortcut across the bent 口 median', () => {
    const expected = medians('口')[1];
    expect(expected.length).toBeGreaterThan(2);
    expect(matchStroke([expected[0], expected[expected.length - 1]], expected).accepted).toBe(false);
  });
});

// 一 and 二 are not present in this checkout's public/hanzi resources.
// Keep explicit horizontal-stroke regressions without fabricating resource fixtures.
describe('一 / 二 horizontal strokes (local resources unavailable)', () => {
  for (const [character, strokes] of [
    ['一', [line]],
    ['二', [[[250, 300], [550, 300]], [[100, 600], [700, 600]]]],
  ] as [string, Point[][]][]) {
    it(`${character}: accepts tracing and rejects reversed, offset and incomplete strokes`, () => {
      for (const expected of strokes) {
        expect(matchStroke(dense(expected, 2), expected).accepted).toBe(true);
        expect(matchStroke([...expected].reverse(), expected).accepted).toBe(false);
        expect(matchStroke(expected.map(([x, y]) => [x, y + 100]), expected).accepted).toBe(false);
        expect(matchStroke([expected[0], [(expected[0][0] + expected[1][0]) / 2, expected[0][1]]], expected).accepted).toBe(false);
      }
    });
  }
});

describe('pure matching safeguards', () => {
  it('ignores event density, duplicate points and pauses', () => {
    const input: Point[] = [[100, 200], ...Array.from({length: 200}, (): Point => [100, 200]), [101, 200], [102, 200], [500, 200], [700, 200], [700, 200]];
    expect(matchStroke(input, line)).toMatchObject({accepted: true, coverage: 1, precision: 1});
  });
  it('returns bounded numeric scores and Chinese feedback for malformed or empty data', () => {
    for (const input of [[], [[100, 200]], [[100, 200], [100, 200]], [[NaN, 0], [0, 0]], [[Infinity, 0], [0, 0]], null] as unknown as Point[][]) {
      const result = matchStroke(input, line);
      expect(result.accepted).toBe(false);
      expect(result.reason).toMatch(/[一-鿿]/);
      expect(result.coverage).toBe(0);
      expect(result.precision).toBe(0);
    }
    for (const expected of [[], [[1, 1], [1, 1]], [[0, 0], [Infinity, 1]]]) {
      expect(matchStroke(line, expected as Point[]).accepted).toBe(false);
    }
  });
  it('checks start and end independently', () => {
    expect(matchStroke([[200, 200], [700, 200]], line).reason).toContain('起点');
    expect(matchStroke([[100, 200], [600, 200]], line).reason).toContain('终点');
  });
  it('does not confuse precision with coverage for partial tracing', () => {
    const result = matchStroke([[100, 200], [300, 200]], line);
    expect(result.accepted).toBe(false);
    expect(result.precision).toBe(1);
    expect(result.coverage).toBeLessThan(.85);
  });
  it('does not confuse coverage with precision for off-path detours', () => {
    const result = matchStroke([[100, 200], [400, 200], [400, 500], [400, 200], [700, 200]], line);
    expect(result.accepted).toBe(false);
    expect(result.coverage).toBe(1);
    expect(result.precision).toBeLessThan(.85);
  });
  it('rejects out-of-order retracing even when both spatial scores are perfect', () => {
    const result = matchStroke([[100, 200], [550, 200], [400, 200], [700, 200]], line);
    expect(result.coverage).toBe(1);
    expect(result.precision).toBe(1);
    expect(result.accepted).toBe(false);
  });
  it('handles very short dots without accepting a tap or reverse', () => {
    const dot: Point[] = [[200, 200], [208, 212]];
    expect(matchStroke(dense(dot, .5), dot).accepted).toBe(true);
    expect(matchStroke([[200, 200], [200, 200]], dot).accepted).toBe(false);
    expect(matchStroke([...dot].reverse(), dot).accepted).toBe(false);
    expect(matchStroke([[200, 200], [202, 202]], dot).accepted).toBe(false);
  });
  it('requires the final turn of a hook even when omission fits endpoint tolerance', () => {
    const hook: Point[] = [[300, 100], [300, 600], [284, 585]];
    expect(matchStroke(dense(hook, 2), hook).accepted).toBe(true);
    expect(matchStroke([[300, 100], [300, 600]], hook).accepted).toBe(false);
  });
  it('is deterministic and does not mutate either input', () => {
    const input = dense(line, 2), before = JSON.stringify([input, line]);
    expect(matchStroke(input, line)).toEqual(matchStroke(input, line));
    expect(JSON.stringify([input, line])).toBe(before);
  });
});

describe('generous CSS-scaled tracing',()=>{
  for(const cssSize of [240,300,480]) for(const pointerType of ['mouse','touch']) {
    it(`accepts natural ${pointerType} offsets at ${cssSize}px without accepting distant scribbles`,()=>{
      const context={cssSize,pointerType},offset=(pointerType==='touch'?18:12)*1024/cssSize;
      expect(matchStroke(dense(line,2).map(([x,y])=>[x,y+offset]),line,context).accepted).toBe(true);
      expect(matchStroke([[100,200],[100,200]],line,context).accepted).toBe(false);
      expect(matchStroke([...line].reverse(),line,context).accepted).toBe(false);
      expect(matchStroke(line.map(([x,y])=>[x,y+300]),line,context).accepted).toBe(false);
    });
  }
});
describe('adaptive short strokes in CSS device scale', () => {
  for (const cssSize of [240,300,480]) for (const pointerType of ['mouse','touch']) {
    it(`外 third stroke ${cssSize}px ${pointerType}: offset succeeds, adversarial paths fail`, () => {
      const expected=medians('外')[2], context={cssSize,pointerType};
      const offset=(pointerType==='touch'?9:6)*1024/cssSize;
      expect(matchStroke(dense(expected,1).map(([x,y])=>[x+offset,y]),expected,context).accepted).toBe(true);
      const a=expected[0],b=expected.at(-1)!;
      for(const input of [[a,a], [...expected].reverse(), [a,[(a[0]+b[0])/2,(a[1]+b[1])/2]],medians('外')[3], expected.map(([x,y])=>[x+200,y+200])] as Point[][]) expect(matchStroke(input,expected,context).accepted).toBe(false);
      const hook=medians('口')[1];
      expect(matchStroke([hook[0],hook.at(-1)!],hook,context).accepted).toBe(false);
    });
  }
});
