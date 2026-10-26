import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { BlankSlot, MaskedText } from '../src/components/MaskedText';

const render = (props: Parameters<typeof MaskedText>[0]) => renderToStaticMarkup(<MaskedText {...props} />);

describe('safe masked sentence display', () => {
  it('renders multiple accessible blanks without leaking masked answer contents', () => {
    const html = render({ segments: [{ text: '我用', masked: false }, { text: '秘密答案', masked: true }, { text: '洗', masked: false }, { text: '另一答案', masked: true }], text: '不应使用的后备' });
    expect(html.match(/aria-label="空白待填写"/g)).toHaveLength(2);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
    expect(html).toContain('我用');
    expect(html).toContain('洗');
    for (const hiddenText of ['秘密答案', '另一答案', '不应使用的后备']) expect(html).not.toContain(hiddenText);
    expect(html).not.toContain('<title');
  });

  it('does not even read masked segment text', () => {
    const segment = { masked: true, get text(): string { throw new Error('answer read'); } };
    expect(() => render({ segments: [segment] })).not.toThrow();
  });

  it('splits safe fallback text including adjacent, leading and trailing blanks', () => {
    const html = render({ text: '□□洗手□', segments: [] });
    expect(html.match(/aria-label="空白待填写"/g)).toHaveLength(3);
    expect(html).toContain('洗手');
    expect(html).not.toContain('□');
  });

  it('renders plain text safely, supports no content and does not modify source segments', () => {
    const segments = Object.freeze([Object.freeze({ text: '□', masked: true }), Object.freeze({ text: '<script>安全</script>', masked: false })]);
    const html = render({ segments, className: 'exam-mask' });
    expect(html).toContain('class="masked-text exam-mask"');
    expect(html).toContain('&lt;script&gt;安全&lt;/script&gt;');
    expect(segments[0].text).toBe('□');
    expect(render({ text: '普通句子' })).not.toContain('<svg');
    expect(render({})).not.toContain('<svg');
  });

  it('keeps the SVG decorative and scalable with a safe accessible outer label', () => {
    const html = renderToStaticMarkup(<BlankSlot />);
    expect(html).toContain('role="img" aria-label="空白待填写"');
    expect(html).toContain('width="1em" height="1em" aria-hidden="true" focusable="false"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toContain('title=');
  });
});

describe('touch hover isolation', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  it('gates choice color and generic button movement behind fine-pointer hover', () => {
    expect(css).toMatch(/@media \(hover:hover\) and \(pointer:fine\)\s*\{\s*button:hover/);
    expect(css).toMatch(/@media \(hover:hover\) and \(pointer:fine\)\s*\{\s*\.choice:hover:not\(:disabled\):not\(\[aria-pressed="true"\]\)/);
  });
  it('retains keyboard focus and selected choices outside hover rules', () => {
    expect(css).toContain('button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible');
    expect(css).toContain('.tabs button.selected');
    expect(css).toContain('.pinyin-tone.selected');
  });
});
