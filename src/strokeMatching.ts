import { medianLength } from './data/hanzi';

export type Point = [number, number];
export interface StrokeContext { cssSize: number; pointerType: string }
export function strokeTolerances(length: number, context?: StrokeContext) {
  const scale = context && Number.isFinite(context.cssSize) && context.cssSize > 0 ? context.cssSize / 1024 : 300 / 1024;
  const pixels = context?.pointerType === 'touch' ? 20 : 14;
  // Dots keep independent length-relative protection; longer strokes get CSS-sized slack.
  const short = length * scale < 65;
  const tolerance = Math.min(pixels / scale, length * .4);
  const endpointTolerance = Math.min(pixels * 1.5 / scale, length * .45);
  return { tolerance, endpointTolerance, short };
}
export interface StrokeMatch { accepted: boolean; reason: string; coverage: number; precision: number }

/** Hanzi resources use upward-positive y; the drawing board uses downward-positive y. */
export function toBoardMedian(points: Point[]): Point[] {
  return points.map(([x, y]) => [x, 900 - y]);
}

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const valid = (points: Point[]) => Array.isArray(points) && points.length >= 2 &&
  points.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));

/** Uniform arc-length sampling, independent of pointer event frequency. */
function resample(points: Point[], length: number, count: number): Point[] {
  const samples: Point[] = [];
  let segment = 1, traversed = 0;
  for (let i = 0; i < count; i++) {
    const target = length * i / (count - 1);
    let span = distance(points[segment - 1], points[segment]);
    while (segment < points.length - 1 && traversed + span < target) {
      traversed += span;
      segment++;
      span = distance(points[segment - 1], points[segment]);
    }
    const t = span ? Math.max(0, Math.min(1, (target - traversed) / span)) : 0;
    const a = points[segment - 1], b = points[segment];
    samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return samples;
}

function distanceToPath(point: Point, path: Point[]): number {
  let nearest = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const squared = dx * dx + dy * dy;
    const t = squared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / squared)) : 0;
    nearest = Math.min(nearest, Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy));
  }
  return nearest;
}

function sameDirection(a: Point, b: Point, c: Point, d: Point): boolean {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const ex = d[0] - c[0], ey = d[1] - c[1];
  const scale = Math.hypot(dx, dy) * Math.hypot(ex, ey);
  return scale > 0 && (dx * ex + dy * ey) / scale >= .1;
}

/** Both arguments are board coordinates (roughly a 1024-unit square), not CSS pixels.
 * Coverage measures the expected path traced; precision measures input on that path.
 * Scores are arc-length weighted, and never compensate for incorrect order/direction.
 */
export function matchStroke(input: Point[], expected: Point[], context?: StrokeContext): StrokeMatch {
  let coverage = 0, precision = 0;
  const result = (accepted: boolean, reason: string): StrokeMatch => ({ accepted, reason, coverage, precision });
  if (!valid(expected)) return result(false, '笔画数据无效，请换一个字试试');
  if (!valid(input)) return result(false, '请沿着提示写出完整的一笔');
  const expectedLength = medianLength(expected), inputLength = medianLength(input);
  if (!Number.isFinite(expectedLength) || expectedLength < 1) return result(false, '笔画数据无效，请换一个字试试');
  if (!Number.isFinite(inputLength) || inputLength < 1) return result(false, '请写出这一笔，不要只点一下');
  // Scale down tolerances for dots so a nearby tap or reversed dot cannot pass.
  const { tolerance, endpointTolerance, short } = strokeTolerances(expectedLength, context);
  const sampledInput = resample(input, inputLength, Math.min(512, Math.max(64, Math.ceil(inputLength / 4) + 1)));
  const sampledExpected = resample(expected, expectedLength, Math.min(512, Math.max(64, Math.ceil(expectedLength / 4) + 1)));
  coverage = sampledExpected.filter(p => distanceToPath(p, input) <= tolerance).length / sampledExpected.length;
  precision = sampledInput.filter(p => distanceToPath(p, expected) <= tolerance).length / sampledInput.length;
  if (distance(input[0], expected[0]) > endpointTolerance) return result(false, '请从提示的起点开始写');
  if (distance(input[input.length - 1], expected[expected.length - 1]) > endpointTolerance) return result(false, '请写到提示的终点，别漏掉收笔');
  if (inputLength / expectedLength < (short ? .65 : .6)) return result(false, '这一笔还没写完整，请沿提示写完');
  if (inputLength / expectedLength > 2) return result(false, '这一笔绕得太远了，请沿提示一笔写完');
  const orderedInput = resample(input, inputLength, 128);
  const orderedExpected = resample(expected, expectedLength, 128);
  // Compare the initial and final arc directions rather than only the endpoint chord:
  // a hook may end near its start, and its final turn must not be skipped.
  const window = Math.max(3, Math.min(16, Math.round(24 / expectedLength * 127)));
  if (short && distance(expected[0], expected[expected.length-1]) / expectedLength > .9 ? !sameDirection(input[0], input[input.length-1], expected[0], expected[expected.length-1]) || distance(input[0],input[input.length-1]) < distance(expected[0],expected[expected.length-1]) * .7 :
      !sameDirection(orderedInput[0], orderedInput[window], orderedExpected[0], orderedExpected[window]) ||
      !sameDirection(orderedInput[127 - window], orderedInput[127], orderedExpected[127 - window], orderedExpected[127])) {
    return result(false, '方向不对，请顺着提示写，注意转弯和收笔');
  }
  const orderedDistance = orderedInput.reduce((sum, p, i) => sum + distance(p, orderedExpected[i]), 0) / 128;
  if (orderedDistance > tolerance * 1.25) return result(false, '请按提示的顺序写，转弯处不要抄近路');
  if (coverage < .65) return result(false, '还有一段没写到，请沿着整条提示写');
  if (precision < .6) return result(false, '有些地方偏离了提示，请顺着笔画写');
  return result(true, '写得好，这一笔完成了');
}
