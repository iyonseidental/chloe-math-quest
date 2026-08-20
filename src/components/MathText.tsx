// 수식 조판 — 생성기의 plain 수식 표기를 LaTeX로 변환해 KaTeX로 렌더한다.
// 규칙: 한글이 없는 줄/텍스트는 수식으로 간주해 통째로 조판하고,
//       한글이 섞인 문장은 그대로 텍스트로 둔다 (문장제는 자연문이 읽기 좋다).
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const HANGUL = /[가-힣]/;

// plain 표기 → LaTeX
export function toTex(src: string): string {
  let t = src
    .replace(/−/g, '-')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/°/g, '^\\circ ')
    .replace(/±/g, '\\pm ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/∠/g, '\\angle ')
    .replace(/π/g, '\\pi ');

  // a√b/c 꼴 (특수각 삼각비 등) → \frac{a\sqrt{b}}{c}
  t = t.replace(/(\d*)√(\d+)\/(\d+)/g, (_m, a, b, c) => `\\frac{${a}\\sqrt{${b}}}{${c}}`);
  // a/√b 꼴 (유리화 전) → \frac{a}{\sqrt{b}}
  t = t.replace(/(-?\d+[a-z]?)\/√(\d+)/g, (_m, a, b) => `\\frac{${a}}{\\sqrt{${b}}}`);
  // 남은 루트
  t = t.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}').replace(/√(\d+|[a-z])/g, '\\sqrt{$1}');

  // 분수: -6/4, a/x, 3x/2 형태 → \frac{}{} (수식 줄에서만 호출되므로 안전)
  t = t.replace(/(-?\d*[a-z]?\d*|\([^)]+\))\/(\d+[a-z]?|[a-z]|\([^)]+\))/g, (m, num, den) => {
    if (num === '' || num === '-') return m;
    const clean = (s: string) => (s.startsWith('(') && s.endsWith(')') ? s.slice(1, -1) : s);
    return `\\frac{${clean(num)}}{${clean(den)}}`;
  });

  // 절댓값 |...| 은 KaTeX가 그대로 처리
  return t;
}

function renderTex(tex: string): string {
  try {
    return katex.renderToString(tex, { throwOnError: true, output: 'html' });
  } catch {
    return ''; // 변환 실패 시 호출부에서 plain으로 폴백
  }
}

// 수식이 들어있을 법한 줄인지 판단
function isMathLine(line: string): boolean {
  const s = line.trim();
  if (!s || HANGUL.test(s)) return false;
  return /[0-9=+\-−×÷√²³|]/.test(s) || /^[a-zA-Z][\s^=]/.test(s);
}

// 여러 줄 텍스트: 수식 줄은 조판, 문장 줄은 그대로
export function MathText({ text, className = '' }: { text: string; className?: string }) {
  const lines = useMemo(() => {
    return text.split('\n').map((line) => {
      if (isMathLine(line)) {
        const html = renderTex(toTex(line.trim()));
        if (html) return { type: 'math' as const, html, raw: line };
      }
      return { type: 'text' as const, html: '', raw: line };
    });
  }, [text]);

  return (
    <div className={className}>
      {lines.map((l, i) =>
        l.type === 'math' ? (
          <div key={i} className="katex-line my-1.5 text-[1.15em]" dangerouslySetInnerHTML={{ __html: l.html }} />
        ) : (
          <p key={i} className={l.raw.trim() === '' ? 'h-2' : ''}>
            {l.raw}
          </p>
        ),
      )}
    </div>
  );
}

// 한 줄짜리 (선택지 등): 한글 없으면 통째로 조판, 아니면 plain
export function MathInline({ text, className = '' }: { text: string; className?: string }) {
  const html = useMemo(() => {
    const s = text.trim();
    if (!s || HANGUL.test(s)) return '';
    return renderTex(toTex(s));
  }, [text]);

  if (html) return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  return <span className={className}>{text}</span>;
}
