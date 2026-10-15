import { Fragment } from 'react';

type Language = 'ts' | 'html';

type CodeBlockProps = {
  code: string;
  language?: Language;
  filename?: string;
  className?: string;
};

type TokenType = 'comment' | 'string' | 'keyword' | 'number' | 'fn' | 'punct' | 'text' | 'attr' | 'tag';
type Token = { type: TokenType; value: string };

const KEYWORDS = new Set([
  'import', 'from', 'const', 'let', 'await', 'async', 'if', 'return', 'throw', 'new', 'export', 'function', 'true', 'false', 'null',
]);

const TOKEN_CLASS: Record<TokenType, string> = {
  comment: 'text-faint italic',
  string: 'text-accent',
  keyword: 'text-violet-300',
  number: 'text-warn',
  fn: 'text-sky-300',
  punct: 'text-muted',
  text: 'text-ink-2',
  attr: 'text-sky-300',
  tag: 'text-rose-300',
};

/** Tokenizer for TypeScript/JavaScript. Covers what the snippets use. */
const TS_PATTERN = /(\/\/[^\n]*)|('[^'\n]*'|"[^"\n]*"|`[^`]*`)|(\b\d[\d_]*\b)|([A-Za-z_$][\w$]*)|(\s+)|([\s\S])/g;

function tokenizeTs(code: string): Token[] {
  const out: Token[] = [];
  for (const m of code.matchAll(TS_PATTERN)) {
    const [raw, comment, str, num, word, , other] = m;
    if (comment) out.push({ type: 'comment', value: raw });
    else if (str) out.push({ type: 'string', value: raw });
    else if (num) out.push({ type: 'number', value: raw });
    else if (word) {
      const after = code.slice((m.index ?? 0) + raw.length);
      const isCall = /^\s*\(/.test(after);
      out.push({ type: KEYWORDS.has(raw) ? 'keyword' : isCall ? 'fn' : 'text', value: raw });
    } else if (other) out.push({ type: /[{}()[\];,.:=<>!&|?+\-*/]/.test(other) ? 'punct' : 'text', value: other });
    else out.push({ type: 'text', value: raw });
  }
  return out;
}

/** Tokenizer for HTML snippets: comments, tags, attributes, quoted values. */
const HTML_PATTERN = /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][\w-]*)|("[^"]*"|'[^']*')|([A-Za-z-:]+(?==))|(\s+)|([\s\S])/g;

function tokenizeHtml(code: string): Token[] {
  const out: Token[] = [];
  for (const m of code.matchAll(HTML_PATTERN)) {
    const [raw, comment, tag, str, attr, , other] = m;
    if (comment) out.push({ type: 'comment', value: raw });
    else if (tag) out.push({ type: 'tag', value: raw });
    else if (str) out.push({ type: 'string', value: raw });
    else if (attr) out.push({ type: 'attr', value: raw });
    else if (other) out.push({ type: /[<>/=]/.test(other) ? 'punct' : 'text', value: other });
    else out.push({ type: 'text', value: raw });
  }
  return out;
}

/** Split tokens into per-line arrays so line numbers can be rendered. */
function toLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.value.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1]!.push({ type: token.type, value: part });
    });
  }
  return lines;
}

export function CodeBlock({ code, language = 'ts', filename, className = '' }: CodeBlockProps) {
  const source = code.replace(/\n$/, '');
  const lines = toLines(language === 'html' ? tokenizeHtml(source) : tokenizeTs(source));

  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-canvas ${className}`}>
      {filename && (
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
          <span className="font-mono text-xs text-muted">{filename}</span>
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
        </div>
      )}
      <div className="overflow-x-auto py-4">
        <pre className="min-w-max font-mono text-[0.8rem] leading-relaxed sm:text-[0.85rem]">
          <code>
            {lines.map((tokens, i) => (
              <Fragment key={i}>
                <span className="inline-block w-10 shrink-0 pr-4 text-right text-faint/50 select-none" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="pr-6">
                  {tokens.map((t, j) => (
                    <span key={j} className={TOKEN_CLASS[t.type]}>
                      {t.value}
                    </span>
                  ))}
                </span>
                {'\n'}
              </Fragment>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
