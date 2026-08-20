import type { Choice, ErrorType } from '../types.ts';

export const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const nonZero = (min: number, max: number) => {
  let v = 0;
  while (v === 0) v = randInt(min, max);
  return v;
};

export const pick = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];

export const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

export type Frac = [number, number];

export const simplifyFrac = (n: number, d: number): Frac => {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};

export const fracStr = ([n, d]: Frac) => (d === 1 ? `${n}` : `${n}/${d}`);

export const fmtSigned = (n: number) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);

export const formatLinear = (m: number, b: number) => {
  const parts: string[] = [];
  if (m !== 0) parts.push(m === 1 ? 'x' : m === -1 ? '−x' : `${m}x`);
  if (b !== 0 || m === 0) {
    if (parts.length === 0) parts.push(`${b}`);
    else parts.push(fmtSigned(b));
  }
  return parts.join(' ');
};

interface Distractor {
  text: string;
  tag: ErrorType;
  // Phase 2 PART 5-1: 이 오답이 특정 오규칙의 기계적 산물일 때만 태깅 (선택)
  misconceptionId?: string;
  diagnosticStrength?: 'HIGH' | 'MEDIUM' | 'LOW';
}

// 정답 + error-type 태깅된 오답 후보로 4지선다를 만든다.
// 후보가 겹치면 fallback(g)으로 근사값(CARELESS 태그)을 보충한다.
export function buildChoices(
  correctText: string,
  distractors: Distractor[],
  fallback: (g: number) => string,
): { choices: Choice[]; answerIndex: number } {
  const seen = new Set([correctText]);
  const list: Choice[] = [{ text: correctText, errorType: null }];
  const pool = distractors.slice();
  let guard = 0;
  while (list.length < 4 && guard < 200) {
    guard++;
    let cand: Distractor;
    if (pool.length) cand = pool.shift()!;
    else cand = { text: fallback(guard), tag: 'CARELESS' };
    if (!seen.has(cand.text)) {
      seen.add(cand.text);
      list.push({ text: cand.text, errorType: cand.tag, misconceptionId: cand.misconceptionId, diagnosticStrength: cand.diagnosticStrength });
    }
  }
  if (list.length < 4) throw new Error(`buildChoices: 4개 보기 생성 실패 (${correctText})`);
  // shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return { choices: list, answerIndex: list.findIndex((c) => c.errorType === null) };
}

let seq = 0;
export const problemId = (skillId: string, level: number) =>
  `${skillId}.L${level}.${Date.now().toString(36)}${(seq++ % 1000).toString(36)}`;
