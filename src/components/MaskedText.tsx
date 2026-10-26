import './masked-text.css';

export interface MaskedTextSegment {
  readonly text: string;
  readonly masked: boolean;
}

export interface MaskedTextProps {
  /** Masked segment contents are never read or rendered. */
  segments?: readonly MaskedTextSegment[];
  /** Already-masked safe display text, used only when segments are absent or empty. */
  text?: string;
  className?: string;
}

export function BlankSlot() {
  return (
    <span className="blank-slot" role="img" aria-label="空白待填写">
      <svg viewBox="0 0 40 40" width="1em" height="1em" aria-hidden="true" focusable="false">
        <rect x="3" y="4" width="34" height="32" rx="7" fill="currentColor" fillOpacity=".06" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    </span>
  );
}

/** Inline sentence display; callers must supply safe, already-masked fallback text. */
export function MaskedText({ segments, text = '', className }: MaskedTextProps) {
  const parts = segments?.length ? segments : text.split('□').flatMap((part, index) =>
    index ? [{ text: '', masked: true }, { text: part, masked: false }] : [{ text: part, masked: false }],
  );
  return (
    <span className={['masked-text', className].filter(Boolean).join(' ')}>
      {parts.map((part, index) => part.masked ? <BlankSlot key={index} /> : <span key={index}>{part.text}</span>)}
    </span>
  );
}
