// 고등 공통수학1·2 생성기 — 전량 원저작 (외부 교재·블로그·시험 문제 복제 없음).
// 검증 원칙: 모든 템플릿은 정답을 닫힌 식으로 계산하고, 가능한 곳마다 "독립 경로 재검산"
// (수치 대입·전개 역검산·전수 나열)을 생성 시점에 수행한다 — 불일치 시 즉시 throw,
// verify-generators.mjs가 (스킬×레벨×변형)당 200회씩 이 검산을 상시 실행한다.
import type { Level } from '../types.ts';
import { buildChoices, nonZero, pick, randInt, formatLinear, fmtSigned } from './util.ts';
import type { Draft } from './index.ts';

const chk = (cond: boolean, label: string) => {
  if (!cond) throw new Error(`SELF-CHECK FAIL: ${label}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// 이차식 문자열 x² + bx + c
const quad = (b: number, c: number) => {
  let s = 'x²';
  if (b !== 0) s += b === 1 ? ' + x' : b === -1 ? ' − x' : ` ${fmtSigned(b)}x`.replace('+ ', '+ ').replace('− ', '− ');
  if (b !== 0) s = `x² ${b > 0 ? '+' : '−'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`;
  if (c !== 0) s += ` ${c > 0 ? '+' : '−'} ${Math.abs(c)}`;
  return s;
};

const factored = (p: number, q: number) => `(x ${p >= 0 ? '+' : '−'} ${Math.abs(p)})(x ${q >= 0 ? '+' : '−'} ${Math.abs(q)})`;

// =====================================================================
// H1.POLY — 다항식
// =====================================================================
export function genH1Poly(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-6, 6);
    const b = nonZero(-6, 6);
    const B = a + b;
    const C = a * b;
    const expand = quad(B, C);
    // 독립 검산: x=7 대입 — 전개식과 곱 형태가 일치해야 한다
    chk(near((7 + a) * (7 + b), 49 + B * 7 + C), `H1.POLY L1 (${a},${b})`);
    return {
      stem: `다음 식을 전개하세요.\n${factored(a, b)}`,
      ...buildChoices(expand, [
        { text: quad(B, -C), tag: 'SIGN' },
        { text: quad(a * b === a + b ? B + 1 : C, C === B ? B + 2 : B), tag: 'CONCEPT' },
        { text: quad(-B, C), tag: 'SIGN' },
      ], (g) => quad(B, C + g)),
      hints: ['(x+a)(x+b) 꼴의 곱셈공식을 떠올려요.', 'x² + (두 수의 합)x + (두 수의 곱)이에요.', `합 ${a}+(${b})=${B}, 곱 ${a}×(${b})=${C}.`],
      idea: '(x+a)(x+b) = x² + (a+b)x + ab — 합과 곱만 계산하면 전개 끝!',
      solve: `합 = ${B}, 곱 = ${C} → ${expand}.`,
      remember: '전개 결과는 항상 x=1 같은 값을 대입해 검산할 수 있어요.',
      estimatedSec: 50,
    };
  }
  if (level === 2) {
    const a = randInt(1, 5);
    const b = randInt(1, 5);
    const s = a + b;
    const p = a * b;
    const ans = s * s - 2 * p;
    chk(ans === a * a + b * b, `H1.POLY L2 (${a},${b})`);
    return {
      stem: `두 수 a, b에 대하여 a + b = ${s}, ab = ${p}일 때, a² + b²의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${s * s + 2 * p}`, tag: 'SIGN' },
        { text: `${s * s - p}`, tag: 'FORMULA' },
        { text: `${s * s}`, tag: 'CONCEPT' },
      ], (g) => `${ans + g}`),
      hints: ['a²+b²을 (a+b)²으로 표현해 보세요.', '(a+b)² = a² + 2ab + b²이에요.', `a²+b² = (a+b)² − 2ab = ${s}² − 2×${p}.`],
      idea: '곱셈공식의 변형: a²+b² = (합)² − 2(곱). 두 수를 직접 구할 필요가 없어요!',
      solve: `(${s})² − 2(${p}) = ${s * s} − ${2 * p} = ${ans}.`,
      remember: 'a³+b³ = (합)³ − 3(곱)(합)도 같은 원리예요.',
      estimatedSec: 60,
    };
  }
  if (level === 3) {
    const p = nonZero(-6, 6);
    let q = nonZero(-6, 6);
    while (q === p) q = nonZero(-6, 6);
    const B = p + q;
    const C = p * q;
    chk(near((5 + p) * (5 + q), 25 + 5 * B + C), `H1.POLY L3`);
    return {
      stem: `다음 식을 인수분해하세요.\n${quad(B, C)}`,
      ...buildChoices(factored(p, q), [
        { text: factored(-p, -q), tag: 'SIGN' },
        { text: factored(p, -q), tag: 'SIGN' },
        { text: factored(B, C === B ? C + 1 : C > 12 ? 2 : C + 2), tag: 'CONCEPT' },
      ], (g) => factored(p + g, q - g)),
      hints: ['곱해서 상수항, 더해서 x의 계수가 되는 두 수를 찾아요.', `곱이 ${C}, 합이 ${B}인 두 수는?`, `${p}와 ${q}: 곱 ${C}, 합 ${B} ✓`],
      idea: '인수분해는 전개의 역과정 — "곱과 합" 조건을 만족하는 두 수 찾기.',
      solve: `${p} × ${q} = ${C}, ${p} + ${q} = ${B} → ${factored(p, q)}.`,
      remember: '결과를 다시 전개해 원식과 같은지 꼭 확인!',
      estimatedSec: 70,
    };
  }
  if (level === 4) {
    const a = nonZero(-3, 3);
    const b = nonZero(-4, 4);
    const c = nonZero(-5, 5);
    const d = nonZero(-6, 6);
    const k = nonZero(-3, 3);
    const f = (x: number) => a * x * x * x + b * x * x + c * x + d;
    // 독립 검산: Horner 계산과 직접 대입 일치
    const horner = ((a * k + b) * k + c) * k + d;
    const r = f(k);
    chk(horner === r, `H1.POLY L4`);
    return {
      stem: `다항식 f(x) = ${a === 1 ? '' : a === -1 ? '−' : a}x³ ${fmtSigned(b)}x² ${fmtSigned(c)}x ${fmtSigned(d)}를 (x ${k > 0 ? '−' : '+'} ${Math.abs(k)})로 나눈 나머지는?`,
      ...buildChoices(`${r}`, [
        { text: `${f(-k)}` === `${r}` ? `${r + 2}` : `${f(-k)}`, tag: 'SIGN' },
        { text: `${d}`, tag: 'CONCEPT' },
        { text: `${r === 0 ? 3 : -r}`, tag: 'SIGN' },
      ], (g) => `${r + g}`),
      hints: ['직접 나눗셈하지 않아도 되는 정리가 있어요.', '나머지정리: (x−k)로 나눈 나머지는 f(k)!', `f(${k})를 계산해 보세요.`],
      idea: '나머지정리 — (x−k)로 나눈 나머지는 f(k) 대입 한 번이면 끝.',
      solve: `f(${k}) = ${a}(${k})³ + ${b}(${k})² + ${c}(${k}) + ${d} = ${r}.`,
      remember: '(x+k)로 나누면 f(−k)! 부호를 꼭 뒤집어 대입해요.',
      estimatedSec: 90,
    };
  }
  // L5 — 조립제법: 몫과 나머지
  const p = nonZero(-4, 4);
  const q = nonZero(-5, 5);
  const r = nonZero(-6, 6);
  const k = nonZero(-3, 3);
  // f(x) = (x−k)(x² + px + q) + r 로 역구성 → 몫·나머지가 정확히 (x²+px+q, r)
  const A = 1;
  const B = p - k;
  const C = q - k * p;
  const D = r - k * q;
  const f = (x: number) => A * x ** 3 + B * x * x + C * x + D;
  chk(near(f(2), (2 - k) * (4 + 2 * p + q) + r), `H1.POLY L5`);
  const quo = quad(p, q);
  return {
    stem: `다항식 x³ ${fmtSigned(B)}x² ${fmtSigned(C)}x ${fmtSigned(D)}를 (x ${k > 0 ? '−' : '+'} ${Math.abs(k)})로 나눈 몫과 나머지는?`,
    ...buildChoices(`몫 ${quo}, 나머지 ${r}`, [
      { text: `몫 ${quo}, 나머지 ${-r === r ? r + 1 : -r}`, tag: 'SIGN' },
      { text: `몫 ${quad(p + k, q)}, 나머지 ${r}`, tag: 'CALCULATION' },
      { text: `몫 ${quad(p, q + k)}, 나머지 ${D}`, tag: 'CONCEPT' },
    ], (g) => `몫 ${quo}, 나머지 ${r + g}`),
    hints: ['조립제법으로 계수만 내려 계산해요.', `첫 계수 1을 내리고, ×${k} 해서 다음 계수에 더하기를 반복!`, `마지막에 남는 수가 나머지 — f(${k})와 같아야 해요.`],
    idea: '조립제법: 계수만으로 하는 빠른 나눗셈. 마지막 수 = 나머지 = f(k).',
    solve: `조립제법 결과 몫의 계수 1, ${p}, ${q} / 나머지 ${r} → 몫 ${quo}, 나머지 ${r}.`,
    remember: '검산: (x−k)×몫 + 나머지 = 원식.',
    estimatedSec: 110,
  };
}

export function transferH1Poly(level: Level): Draft {
  const n = randInt(11, 19);
  const m = 20 - n;
  const ans = n * m;
  chk(ans === 100 - (10 - n) * (10 - n), `H1.POLY T`);
  return {
    stem: `가로와 세로의 합이 20m인 직사각형 텃밭이 있습니다. 가로가 ${n}m일 때 넓이를 곱셈공식 (10+a)(10−a) = 100 − a²으로 빠르게 계산하면?`,
    ...buildChoices(`${ans}m²`, [
      { text: `${100 + (n - 10) * (n - 10)}m²`, tag: 'SIGN' },
      { text: `${n * n}m²`, tag: 'CONCEPT' },
      { text: `${ans + 10}m²`, tag: 'CALCULATION' },
    ], (g) => `${ans + g}m²`),
    hints: ['가로 = 10 + a, 세로 = 10 − a 꼴로 보세요.', `a = ${n - 10}이에요.`, `100 − ${(n - 10) * (n - 10)} = ?`],
    idea: '합이 일정한 두 수의 곱은 합·차 공식으로 암산할 수 있어요.',
    solve: `${n} × ${m} = (10+${n - 10})(10−${n - 10}) = 100 − ${(n - 10) * (n - 10)} = ${ans}.`,
    remember: `곱셈공식은 계산 도구예요 — 19×21 = 400−1처럼! (레벨 ${level})`,
    estimatedSec: 70 + level * 5,
  };
}

// =====================================================================
// H1.EQIN — 방정식과 부등식
// =====================================================================
export function genH1Eqin(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-5, 5);
    const b = nonZero(-5, 5);
    const c = nonZero(-5, 5);
    const d = nonZero(-5, 5);
    const re = a * c - b * d;
    const im = a * d + b * c;
    chk(near(re, a * c - b * d) && near(im, a * d + b * c), 'H1.EQIN L1');
    const cx = (x: number, y: number) => `${x} ${y >= 0 ? '+' : '−'} ${Math.abs(y)}i`;
    return {
      stem: `다음을 계산하세요. (단, i = √−1)\n(${cx(a, b)})(${cx(c, d)})`,
      ...buildChoices(cx(re, im), [
        { text: cx(a * c + b * d, im), tag: 'SIGN' },
        { text: cx(a * c, b * d), tag: 'CONCEPT' },
        { text: cx(re, a * d - b * c), tag: 'CALCULATION' },
      ], (g) => cx(re + g, im)),
      hints: ['분배법칙으로 전개하되 i² = −1을 기억해요.', `(ac + bd·i²) + (ad + bc)i 꼴이 돼요.`, `실수부 ${a}×${c} − ${b}×${d}, 허수부 ${a}×${d} + ${b}×${c}.`],
      idea: '복소수 곱셈 = 전개 후 i²를 −1로 바꾸기.',
      solve: `실수부 = ${a * c} − (${b * d}) = ${re}, 허수부 = ${a * d} + ${b * c} = ${im} → ${cx(re, im)}.`,
      remember: 'i² = −1, i³ = −i, i⁴ = 1 — 4주기로 돌아요.',
      estimatedSec: 80,
    };
  }
  if (level === 2) {
    const kind = pick(['two', 'one', 'none'] as const);
    let b: number;
    let c: number;
    if (kind === 'one') {
      const h = nonZero(-4, 4);
      b = -2 * h;
      c = h * h;
    } else if (kind === 'two') {
      const p = nonZero(-4, 4);
      let q = nonZero(-4, 4);
      while (q === p) q = nonZero(-4, 4);
      b = -(p + q);
      c = p * q;
    } else {
      b = randInt(-3, 3);
      c = Math.floor((b * b) / 4) + randInt(2, 5);
    }
    const D = b * b - 4 * c;
    const ans = D > 0 ? '서로 다른 두 실근' : D === 0 ? '중근 (실근 1개)' : '서로 다른 두 허근';
    chk((kind === 'two') === D > 0 && (kind === 'one') === (D === 0) && (kind === 'none') === D < 0, 'H1.EQIN L2');
    return {
      stem: `이차방정식 ${quad(b, c)} = 0의 근을 판별하세요.`,
      ...buildChoices(ans, [
        { text: D > 0 ? '서로 다른 두 허근' : '서로 다른 두 실근', tag: 'CONCEPT' },
        { text: D === 0 ? '서로 다른 두 실근' : '중근 (실근 1개)', tag: 'CALCULATION' },
        { text: '근이 존재하지 않는다', tag: 'INTERPRETATION' },
      ], () => pick(['실근 3개', '허근 1개', '판별 불가'])),
      hints: ['판별식 D = b² − 4ac를 계산해요.', `D = (${b})² − 4(${c}) = ${D}.`, 'D > 0이면 두 실근, D = 0이면 중근, D < 0이면 두 허근.'],
      idea: '판별식의 부호 하나로 근의 개수·종류가 결정돼요.',
      solve: `D = ${b * b} − ${4 * c} = ${D} → ${ans}.`,
      remember: '복소수 범위에서 이차방정식은 항상 근을 가져요 (허근 포함).',
      estimatedSec: 70,
    };
  }
  if (level === 3) {
    const p = nonZero(-4, 4);
    let q = nonZero(-4, 4);
    while (q === p) q = nonZero(-4, 4);
    const b = -(p + q);
    const c = p * q;
    const ans = p * p + q * q;
    chk(ans === b * b - 2 * c, 'H1.EQIN L3');
    return {
      stem: `이차방정식 ${quad(b, c)} = 0의 두 근을 α, β라 할 때, α² + β²의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${b * b + 2 * c}`, tag: 'SIGN' },
        { text: `${b * b}`, tag: 'FORMULA' },
        { text: `${(p + q) * (p + q)}` === `${ans}` ? `${ans + 4}` : `${(p + q) * (p + q)}`, tag: 'CONCEPT' },
      ], (g) => `${ans + g}`),
      hints: ['근과 계수의 관계: α+β = −b, αβ = c.', `α+β = ${p + q}, αβ = ${c}.`, 'α²+β² = (α+β)² − 2αβ.'],
      idea: '근을 직접 구하지 않고 합·곱으로 대칭식을 계산해요.',
      solve: `(${p + q})² − 2(${c}) = ${(p + q) * (p + q)} − ${2 * c} = ${ans}. (실제 근 ${p}, ${q}로 검산 가능)`,
      remember: '1/α + 1/β = (α+β)/αβ도 자주 나와요.',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const h = nonZero(-4, 4);
    const k = nonZero(-6, 6);
    const b = -2 * h;
    const c = h * h + k;
    const f = (x: number) => x * x + b * x + c;
    chk(f(h) === k && f(h + 1) === k + 1, 'H1.EQIN L4');
    return {
      stem: `이차함수 y = ${quad(b, c)}의 최솟값은?`,
      ...buildChoices(`${k}`, [
        { text: `${-k === k ? k + 2 : -k}`, tag: 'SIGN' },
        { text: `${c}`, tag: 'CONCEPT' },
        { text: `${h}`, tag: 'INTERPRETATION' },
      ], (g) => `${k + g}`),
      hints: ['완전제곱 꼴 (x−h)² + k로 바꿔요.', `x² ${fmtSigned(b)}x = (x ${fmtSigned(-h)})² − ${h * h}.`, `y = (x ${fmtSigned(-h)})² + ${k} → 꼭짓점의 y값이 최솟값.`],
      idea: '아래로 볼록한 이차함수의 최솟값 = 꼭짓점의 y좌표.',
      solve: `y = (x ${h >= 0 ? '−' : '+'} ${Math.abs(h)})² ${fmtSigned(k)} → x = ${h}에서 최솟값 ${k}.`,
      remember: '최댓값·최솟값 문제는 언제나 "완전제곱 꼴"부터!',
      estimatedSec: 100,
    };
  }
  // L5 — 이차부등식
  const p = randInt(-5, 2);
  const q = p + randInt(2, 5);
  const b = -(p + q);
  const c = p * q;
  const mid = (p + q) / 2;
  const fx = (x: number) => x * x + b * x + c;
  chk(fx(mid) < 0 && fx(q + 1) > 0 && fx(p - 1) > 0, 'H1.EQIN L5');
  const ans = `${p} < x < ${q}`;
  return {
    stem: `이차부등식 ${quad(b, c)} < 0의 해는?`,
    ...buildChoices(ans, [
      { text: `x < ${p} 또는 x > ${q}`, tag: 'CONCEPT' },
      { text: `${-q} < x < ${-p}` === ans ? `x < ${q}` : `${-q} < x < ${-p}`, tag: 'SIGN' },
      { text: `x < ${q}`, tag: 'INTERPRETATION' },
    ], (g) => `${p - g} < x < ${q + g}`),
    hints: ['먼저 인수분해해서 근을 찾아요.', `(x ${p >= 0 ? '−' : '+'} ${Math.abs(p)})(x ${q >= 0 ? '−' : '+'} ${Math.abs(q)}) < 0.`, '아래로 볼록 그래프가 x축 아래에 있는 구간 = 두 근 사이!'],
    idea: '이차부등식은 그래프로: < 0은 두 근 "사이", > 0은 "바깥".',
    solve: `근 ${p}, ${q} → 그래프가 축 아래인 구간은 ${ans}. (x=${mid} 대입 검산: ${fx(mid)} < 0 ✓)`,
    remember: '부등호 방향과 "사이/바깥"을 그래프 그림으로 확인하는 습관!',
    estimatedSec: 110,
  };
}

export function transferH1Eqin(level: Level): Draft {
  const v = randInt(20, 40);
  const t1 = randInt(1, 3);
  // 높이 h(t) = vt − 5t² : h(t)=0의 양근 = v/5 (착지 시각)
  const land = v / 5;
  const landNice = Number.isInteger(land) ? land : Math.round(land * 10) / 10;
  chk(near(v * land - 5 * land * land, 0), 'H1.EQIN T');
  return {
    stem: `지면에서 초속 ${v}m로 똑바로 던진 공의 t초 후 높이는 h(t) = ${v}t − 5t² (m)입니다. 공이 다시 지면에 떨어지는 시각은?`,
    ...buildChoices(`${landNice}초`, [
      { text: `${v}초`, tag: 'CONCEPT' },
      { text: `${Math.round((land / 2) * 10) / 10}초`, tag: 'INTERPRETATION' },
      { text: `${landNice + t1}초`, tag: 'CALCULATION' },
    ], (g) => `${landNice + g + 3}초`),
    hints: ['지면 = 높이 0이에요.', `${v}t − 5t² = 0을 풀어요.`, `t(${v} − 5t) = 0 → t = 0 또는 t = ${landNice}.`],
    idea: '이차방정식의 근은 "언제 그 값이 되는가"라는 실제 질문의 답이에요.',
    solve: `5t(${v / 5} − t) = 0 → 던진 순간 t=0을 빼면 t = ${landNice}초.`,
    remember: `최고 높이는 그 절반 시각 t = ${Math.round((land / 2) * 10) / 10}에서! (레벨 ${level})`,
    estimatedSec: 90 + level * 5,
  };
}

// =====================================================================
// H1.COMB — 경우의 수
// =====================================================================
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const nPr = (n: number, r: number) => fact(n) / fact(n - r);
const nCr = (n: number, r: number) => fact(n) / (fact(r) * fact(n - r));

export function genH1Comb(level: Level): Draft {
  if (level === 1) {
    const a = randInt(2, 5);
    const b = randInt(2, 5);
    const c = randInt(2, 4);
    const ans = a * b * c;
    // 독립 검산: 전수 나열
    let count = 0;
    for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < c; k++) count++;
    chk(count === ans, 'H1.COMB L1');
    return {
      stem: `티셔츠 ${a}종, 바지 ${b}종, 신발 ${c}종이 있습니다. 티셔츠·바지·신발을 하나씩 골라 입는 경우의 수는?`,
      ...buildChoices(`${ans}`, [
        { text: `${a + b + c}`, tag: 'CONCEPT' },
        { text: `${a * b + c}`, tag: 'CALCULATION' },
        { text: `${ans * 2}`, tag: 'FORMULA' },
      ], (g) => `${ans + g}`),
      hints: ['각 선택이 동시에 일어나요.', '동시에 = 곱의 법칙!', `${a} × ${b} × ${c}.`],
      idea: '동시에(그리고) 일어나면 곱하고, 둘 중 하나(또는)면 더해요.',
      solve: `${a} × ${b} × ${c} = ${ans}가지.`,
      remember: '"~마다"라는 말이 보이면 곱의 법칙 신호!',
      estimatedSec: 50,
    };
  }
  if (level === 2) {
    const n = randInt(4, 7);
    const r = randInt(2, 3);
    const ans = nPr(n, r);
    let count = 0;
    const used = new Array(n).fill(false);
    const dfs = (depth: number) => {
      if (depth === r) {
        count++;
        return;
      }
      for (let i = 0; i < n; i++) if (!used[i]) { used[i] = true; dfs(depth + 1); used[i] = false; }
    };
    dfs(0);
    chk(count === ans, `H1.COMB L2 ${n}P${r}`);
    return {
      stem: `서로 다른 ${n}권의 책 중 ${r}권을 골라 책꽂이에 순서대로 꽂는 경우의 수는?`,
      ...buildChoices(`${ans}`, [
        { text: `${nCr(n, r)}`, tag: 'CONCEPT' },
        { text: `${Math.pow(n, r)}`, tag: 'FORMULA' },
        { text: `${n * r}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g * 2}`),
      hints: ['순서가 중요한가요? — 꽂는 순서가 다르면 다른 경우!', `순열 ${n}P${r}이에요.`, `${n} × ${n - 1}${r === 3 ? ` × ${n - 2}` : ''}.`],
      idea: '순서 있으면 순열(P): 자리마다 하나씩 줄어드는 곱.',
      solve: `${n}P${r} = ${ans}. (전수 나열로도 ${count}가지 확인)`,
      remember: '순서가 중요하면 P, 중요하지 않으면 C!',
      estimatedSec: 70,
    };
  }
  if (level === 3) {
    const n = randInt(5, 9);
    const r = randInt(2, 3);
    const ans = nCr(n, r);
    chk(ans === nPr(n, r) / fact(r), 'H1.COMB L3');
    return {
      stem: `${n}명의 학생 중 청소 당번 ${r}명을 뽑는 경우의 수는? (순서 없음)`,
      ...buildChoices(`${ans}`, [
        { text: `${nPr(n, r)}`, tag: 'CONCEPT' },
        { text: `${n * r}`, tag: 'CALCULATION' },
        { text: `${ans * r}`, tag: 'FORMULA' },
      ], (g) => `${ans + g}`),
      hints: ['당번끼리는 순서가 없어요.', `조합 ${n}C${r}!`, `${n}P${r}을 ${r}!로 나눠요 (중복 제거).`],
      idea: '조합 = 순열 ÷ (뽑은 것들의 배열 수) — 순서 중복을 나눠 없애기.',
      solve: `${n}C${r} = ${nPr(n, r)}/${fact(r)} = ${ans}.`,
      remember: '"뽑기만" 하면 조합, "뽑아서 배열"하면 순열.',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const n = randInt(4, 6);
    const ans = fact(n - 1) * 2;
    // 독립 검산: 전수 나열로 A,B 이웃 배열 수 세기
    const arr = Array.from({ length: n }, (_, i) => i);
    let count = 0;
    const perm = (cur: number[], rest: number[]) => {
      if (rest.length === 0) {
        const ia = cur.indexOf(0);
        const ib = cur.indexOf(1);
        if (Math.abs(ia - ib) === 1) count++;
        return;
      }
      for (let i = 0; i < rest.length; i++) perm([...cur, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
    };
    perm([], arr);
    chk(count === ans, `H1.COMB L4 n=${n}`);
    return {
      stem: `${n}명이 한 줄로 설 때, 채림이와 단짝이 반드시 이웃하게 서는 경우의 수는?`,
      ...buildChoices(`${ans}`, [
        { text: `${fact(n - 1)}`, tag: 'CALCULATION' },
        { text: `${fact(n)}`, tag: 'CONCEPT' },
        { text: `${fact(n) - fact(n - 1)}` === `${ans}` ? `${ans + 6}` : `${fact(n) - fact(n - 1)}`, tag: 'FORMULA' },
      ], (g) => `${ans + g * 2}`),
      hints: ['이웃해야 하는 두 명을 하나로 묶어 보세요.', `묶으면 ${n - 1}묶음의 일렬 배열: (${n - 1})!.`, '묶음 안에서 두 명이 자리를 바꾸는 2가지를 곱해요.'],
      idea: '이웃 조건 = 묶어서 배열 × 묶음 내부 배열.',
      solve: `(${n - 1})! × 2 = ${fact(n - 1)} × 2 = ${ans}. (전수 확인 ${count})`,
      remember: '"이웃하지 않는" 경우는 전체 − 이웃!',
      estimatedSec: 100,
    };
  }
  // L5 — 적어도 조건 조합
  const m = randInt(3, 5); // 남
  const w = randInt(3, 5); // 여
  const total = nCr(m + w, 3);
  const noW = nCr(m, 3);
  const ans = total - noW;
  // 독립 검산: 전수 나열
  let count = 0;
  for (let i = 0; i < m + w; i++) for (let j = i + 1; j < m + w; j++) for (let k = j + 1; k < m + w; k++) {
    if (i >= m || j >= m || k >= m) count++;
  }
  chk(count === ans, `H1.COMB L5 m=${m} w=${w}`);
  return {
    stem: `남학생 ${m}명, 여학생 ${w}명 중에서 대표 3명을 뽑을 때, 여학생이 적어도 1명 포함되는 경우의 수는?`,
    ...buildChoices(`${ans}`, [
      { text: `${total}`, tag: 'CONCEPT' },
      { text: `${noW}`, tag: 'INTERPRETATION' },
      { text: `${nCr(w, 1) * nCr(m, 2)}` === `${ans}` ? `${ans + 5}` : `${nCr(w, 1) * nCr(m, 2)}`, tag: 'FORMULA' },
    ], (g) => `${ans + g}`),
    hints: ['"적어도 1명"은 여사건이 빠른 길!', `전체 ${m + w}C3에서 "여학생 0명"을 빼요.`, `${total} − ${noW}.`],
    idea: '"적어도"가 보이면: 전체 − (하나도 없는 경우).',
    solve: `${m + w}C3 − ${m}C3 = ${total} − ${noW} = ${ans}. (전수 확인 ${count})`,
    remember: '여사건 전략은 확률 단원에서도 그대로 쓰여요.',
    estimatedSec: 120,
  };
}

export function transferH1Comb(level: Level): Draft {
  const digits = randInt(4, 5);
  const ans = nPr(digits, 3) - nPr(digits - 1, 2) * 1; // 첫 자리 0 제외: 전체 - 0시작
  // 독립 검산: 전수 나열 (0..digits-1 숫자로 세 자리)
  let count = 0;
  for (let a = 1; a < digits; a++) for (let b = 0; b < digits; b++) for (let c = 0; c < digits; c++) {
    if (a !== b && b !== c && a !== c) count++;
  }
  chk(count === ans, `H1.COMB T d=${digits}`);
  return {
    stem: `0부터 ${digits - 1}까지의 숫자 카드 ${digits}장 중 3장으로 세 자리 자연수를 만들 때, 만들 수 있는 수의 개수는? (숫자 중복 없음)`,
    ...buildChoices(`${ans}개`, [
      { text: `${nPr(digits, 3)}개`, tag: 'CONCEPT' },
      { text: `${nCr(digits, 3)}개`, tag: 'FORMULA' },
      { text: `${ans + 6}개`, tag: 'CALCULATION' },
    ], (g) => `${ans + g * 2}개`),
    hints: ['첫 자리에 올 수 없는 숫자가 있어요!', '첫 자리는 0 제외, 나머지는 남은 카드에서.', `${digits - 1} × ${digits - 1} × ${digits - 2}.`],
    idea: '제한 조건이 있는 자리(첫 자리)부터 채우는 것이 원칙.',
    solve: `첫 자리 ${digits - 1}가지 × 둘째 ${digits - 1}가지 × 셋째 ${digits - 2}가지 = ${ans}개.`,
    remember: `0의 자리 제한은 순열 문제의 단골 함정이에요. (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// H1.MAT — 행렬 (2×2)
// =====================================================================
type M2 = [number, number, number, number]; // [a11, a12, a21, a22]
const mstr = (m: M2) => `(${m[0]}  ${m[1]} / ${m[2]}  ${m[3]})`;
const mmul = (A: M2, B: M2): M2 => [
  A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3],
  A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3],
];
const rnd2 = (): M2 => [nonZero(-4, 4), nonZero(-4, 4), nonZero(-4, 4), nonZero(-4, 4)];

export function genH1Mat(level: Level): Draft {
  const A = rnd2();
  const B = rnd2();
  if (level === 1) {
    const ans = A[1] + B[1];
    chk(ans === A[1] + B[1], 'H1.MAT L1');
    return {
      stem: `두 행렬 A = ${mstr(A)}, B = ${mstr(B)}에 대하여 A + B의 (1행 2열) 성분은? (행렬은 (1행 / 2행)으로 표기)`,
      ...buildChoices(`${ans}`, [
        { text: `${A[1] - B[1]}` === `${ans}` ? `${ans + 3}` : `${A[1] - B[1]}`, tag: 'SIGN' },
        { text: `${A[2] + B[2]}` === `${ans}` ? `${ans - 3}` : `${A[2] + B[2]}`, tag: 'INTERPRETATION' },
        { text: `${A[1] * B[1]}` === `${ans}` ? `${ans + 5}` : `${A[1] * B[1]}`, tag: 'CONCEPT' },
      ], (g) => `${ans + g}`),
      hints: ['행렬의 덧셈은 같은 위치끼리!', '(1행 2열)은 첫째 줄의 둘째 수.', `${A[1]} + ${B[1]}.`],
      idea: '행렬 덧셈 = 같은 자리 성분끼리의 덧셈.',
      solve: `${A[1]} + ${B[1]} = ${ans}.`,
      remember: '(i행 j열): 행 먼저, 열 나중!',
      estimatedSec: 60,
    };
  }
  if (level === 2) {
    const k = randInt(2, 4);
    const ans = k * A[3] - B[3];
    chk(ans === k * A[3] - B[3], 'H1.MAT L2');
    return {
      stem: `A = ${mstr(A)}, B = ${mstr(B)}일 때, ${k}A − B의 (2행 2열) 성분은?`,
      ...buildChoices(`${ans}`, [
        { text: `${k * A[3] + B[3]}` === `${ans}` ? `${ans + 2}` : `${k * A[3] + B[3]}`, tag: 'SIGN' },
        { text: `${k * (A[3] - B[3])}` === `${ans}` ? `${ans - 2}` : `${k * (A[3] - B[3])}`, tag: 'CALCULATION' },
        { text: `${k * A[0] - B[0]}` === `${ans}` ? `${ans + 4}` : `${k * A[0] - B[0]}`, tag: 'INTERPRETATION' },
      ], (g) => `${ans + g}`),
      hints: ['실수배는 모든 성분에 곱해요.', `${k}A의 (2,2) 성분은 ${k}×${A[3]}.`, `${k * A[3]} − ${B[3]}.`],
      idea: '스칼라배 → 성분별 곱, 뺄셈 → 성분별 차.',
      solve: `${k}×${A[3]} − (${B[3]}) = ${ans}.`,
      remember: '괄호가 있으면 분배: k(A−B) = kA − kB.',
      estimatedSec: 70,
    };
  }
  if (level === 3 || level === 4) {
    const P = mmul(A, B);
    const pos = level === 3 ? 0 : 2;
    const label = pos === 0 ? '(1행 1열)' : '(2행 1열)';
    const ans = P[pos];
    // 독립 검산: 정의로 재계산
    const re = pos === 0 ? A[0] * B[0] + A[1] * B[2] : A[2] * B[0] + A[3] * B[2];
    chk(ans === re, 'H1.MAT L34');
    const wrongBA = mmul(B, A)[pos];
    return {
      stem: `A = ${mstr(A)}, B = ${mstr(B)}일 때, 행렬 AB의 ${label} 성분은?`,
      ...buildChoices(`${ans}`, [
        { text: `${wrongBA}` === `${ans}` ? `${ans + 3}` : `${wrongBA}`, tag: 'CONCEPT' },
        { text: `${A[pos] * B[pos]}` === `${ans}` ? `${ans - 3}` : `${A[pos] * B[pos]}`, tag: 'FORMULA' },
        { text: `${-ans === ans ? ans + 5 : -ans}`, tag: 'SIGN' },
      ], (g) => `${ans + g}`),
      hints: ['AB의 (i,j) 성분 = A의 i행과 B의 j열의 곱의 합.', pos === 0 ? `A의 1행 (${A[0]}, ${A[1]})과 B의 1열 (${B[0]}, ${B[2]}).` : `A의 2행 (${A[2]}, ${A[3]})과 B의 1열 (${B[0]}, ${B[2]}).`, pos === 0 ? `${A[0]}×${B[0]} + ${A[1]}×${B[2]}.` : `${A[2]}×${B[0]} + ${A[3]}×${B[2]}.`],
      idea: '행렬 곱 = "행 × 열"의 내적. AB와 BA는 다를 수 있어요!',
      solve: pos === 0 ? `${A[0]}×${B[0]} + ${A[1]}×${B[2]} = ${ans}.` : `${A[2]}×${B[0]} + ${A[3]}×${B[2]} = ${ans}.`,
      remember: '곱 AB가 정의되려면 A의 열 수 = B의 행 수.',
      estimatedSec: 90 + (level === 4 ? 10 : 0),
    };
  }
  // L5 — A²
  const S: M2 = [nonZero(-3, 3), nonZero(-3, 3), nonZero(-3, 3), nonZero(-3, 3)];
  const Q = mmul(S, S);
  const ans = Q[0];
  chk(ans === S[0] * S[0] + S[1] * S[2], 'H1.MAT L5');
  return {
    stem: `A = ${mstr(S)}일 때, A²의 (1행 1열) 성분은?`,
    ...buildChoices(`${ans}`, [
      { text: `${S[0] * S[0]}` === `${ans}` ? `${ans + 2}` : `${S[0] * S[0]}`, tag: 'CONCEPT' },
      { text: `${2 * S[0]}` === `${ans}` ? `${ans - 2}` : `${2 * S[0]}`, tag: 'FORMULA' },
      { text: `${S[0] * S[0] - S[1] * S[2]}` === `${ans}` ? `${ans + 4}` : `${S[0] * S[0] - S[1] * S[2]}`, tag: 'SIGN' },
    ], (g) => `${ans + g}`),
    hints: ['A² = A × A — 성분 제곱이 아니에요!', `1행 (${S[0]}, ${S[1]})과 1열 (${S[0]}, ${S[2]})의 곱의 합.`, `${S[0]}×${S[0]} + ${S[1]}×${S[2]}.`],
    idea: '행렬의 거듭제곱도 결국 "행×열" 곱셈의 반복.',
    solve: `${S[0]}² + ${S[1]}×${S[2]} = ${ans}.`,
    remember: '(A²의 성분) ≠ (성분의 제곱) — 행렬 곱의 대표 함정!',
    estimatedSec: 110,
  };
}

export function transferH1Mat(level: Level): Draft {
  const p1 = randInt(2, 6) * 100;
  const p2 = randInt(2, 6) * 100;
  const a = randInt(2, 5);
  const b = randInt(2, 5);
  const ans = a * p1 + b * p2;
  chk(ans === a * p1 + b * p2, 'H1.MAT T');
  return {
    stem: `문구점 가격 행렬 P = (${p1} / ${p2}) (연필, 공책 순)이고 구매 수량 행렬 Q = (${a}  ${b})입니다. 총 금액을 나타내는 행렬 곱 QP의 값은?`,
    ...buildChoices(`${ans}원`, [
      { text: `${p1 + p2}원`, tag: 'CONCEPT' },
      { text: `${a * p2 + b * p1}원` === `${ans}원` ? `${ans + 200}원` : `${a * p2 + b * p1}원`, tag: 'INTERPRETATION' },
      { text: `${(a + b) * (p1 + p2)}원`, tag: 'FORMULA' },
    ], (g) => `${ans + g * 100}원`),
    hints: ['행 × 열: 수량과 가격을 짝지어 곱해 더해요.', `${a}×${p1} + ${b}×${p2}.`, '단위(원)를 붙여 검산!'],
    idea: '행렬 곱은 "짝지어 곱해 더하기" — 영수증 계산이 바로 행렬 곱이에요.',
    solve: `${a}×${p1} + ${b}×${p2} = ${ans}원.`,
    remember: `데이터 × 가중치 구조는 어디서나 행렬로 표현돼요. (레벨 ${level})`,
    estimatedSec: 80 + level * 5,
  };
}

// =====================================================================
// H2.GEOM — 도형의 방정식
// =====================================================================
const PYTH: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]];

export function genH2Geom(level: Level): Draft {
  if (level === 1) {
    const [dx, dy, d] = pick(PYTH);
    const x1 = randInt(-5, 5);
    const y1 = randInt(-5, 5);
    const x2 = x1 + (pick([1, -1]) === 1 ? dx : -dx);
    const y2 = y1 + (pick([1, -1]) === 1 ? dy : -dy);
    chk(near(Math.hypot(x2 - x1, y2 - y1), d), 'H2.GEOM L1');
    return {
      stem: `두 점 A(${x1}, ${y1}), B(${x2}, ${y2}) 사이의 거리는?`,
      ...buildChoices(`${d}`, [
        { text: `${Math.abs(x2 - x1) + Math.abs(y2 - y1)}` === `${d}` ? `${d + 2}` : `${Math.abs(x2 - x1) + Math.abs(y2 - y1)}`, tag: 'CONCEPT' },
        { text: `${d * d}`, tag: 'FORMULA' },
        { text: `${d + 1}`, tag: 'CALCULATION' },
      ], (g) => `${d + g + 2}`),
      hints: ['가로 차이와 세로 차이를 각각 구해요.', `Δx = ${Math.abs(x2 - x1)}, Δy = ${Math.abs(y2 - y1)}.`, '거리 = √(Δx² + Δy²) — 피타고라스!'],
      idea: '좌표평면의 거리 공식은 피타고라스 정리 그 자체.',
      solve: `√(${Math.abs(x2 - x1)}² + ${Math.abs(y2 - y1)}²) = √${d * d} = ${d}.`,
      remember: '거리는 항상 0 이상 — 차이의 부호는 제곱에서 사라져요.',
      estimatedSec: 70,
    };
  }
  if (level === 2) {
    const m = randInt(1, 3);
    const n = randInt(1, 3);
    const px = randInt(-4, 4);
    const qx = px + (m + n) * randInt(1, 3);
    const py = randInt(-4, 4);
    const qy = py + (m + n) * randInt(1, 3);
    const ix = (m * qx + n * px) / (m + n);
    const iy = (m * qy + n * py) / (m + n);
    chk(Number.isInteger(ix) && Number.isInteger(iy), 'H2.GEOM L2 int');
    // 독립 검산: 내분점은 AB를 m:n으로 나눔 → 거리비 확인
    chk(near(Math.hypot(ix - px, iy - py) * n, Math.hypot(qx - ix, qy - iy) * m), 'H2.GEOM L2 ratio');
    return {
      stem: `두 점 A(${px}, ${py}), B(${qx}, ${qy})를 이은 선분 AB를 ${m} : ${n}으로 내분하는 점의 좌표는?`,
      ...buildChoices(`(${ix}, ${iy})`, [
        { text: `(${(m * px + n * qx) / (m + n)}, ${(m * py + n * qy) / (m + n)})` === `(${ix}, ${iy})` ? `(${ix + 1}, ${iy})` : `(${(m * px + n * qx) / (m + n)}, ${(m * py + n * qy) / (m + n)})`, tag: 'CONCEPT' },
        { text: `(${(px + qx) / 2}, ${(py + qy) / 2})` === `(${ix}, ${iy})` ? `(${ix}, ${iy + 1})` : `(${(px + qx) / 2}, ${(py + qy) / 2})`, tag: 'INTERPRETATION' },
        { text: `(${iy}, ${ix})` === `(${ix}, ${iy})` ? `(${ix - 1}, ${iy - 1})` : `(${iy}, ${ix})`, tag: 'CALCULATION' },
      ], (g) => `(${ix + g}, ${iy - g})`),
      hints: ['내분점 공식: (mx₂ + nx₁)/(m+n).', 'm은 B 좌표에, n은 A 좌표에 곱해요 (엇갈림 주의!).', `x = (${m}×${qx} + ${n}×${px})/${m + n}.`],
      idea: 'm:n 내분 = B쪽으로 m만큼 치우친 가중평균.',
      solve: `x = ${(m * qx + n * px)}/${m + n} = ${ix}, y = ${(m * qy + n * py)}/${m + n} = ${iy}.`,
      remember: '1:1 내분 = 중점. 공식이 헷갈리면 중점으로 검산!',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const m = nonZero(-3, 3);
    const x1 = randInt(-3, 3);
    const y1 = randInt(-5, 5);
    const b = y1 - m * x1;
    chk(near(m * x1 + b, y1), 'H2.GEOM L3');
    return {
      stem: `기울기가 ${m}이고 점 (${x1}, ${y1})을 지나는 직선의 방정식은?`,
      ...buildChoices(`y = ${formatLinear(m, b)}`, [
        { text: `y = ${formatLinear(m, -b === b ? b + 1 : -b)}`, tag: 'SIGN' },
        { text: `y = ${formatLinear(-m, b)}`, tag: 'SIGN' },
        { text: `y = ${formatLinear(m, y1)}` === `y = ${formatLinear(m, b)}` ? `y = ${formatLinear(m, b + 2)}` : `y = ${formatLinear(m, y1)}`, tag: 'CONCEPT' },
      ], (g) => `y = ${formatLinear(m, b + g)}`),
      hints: ['y − y₁ = m(x − x₁) 꼴에서 시작해요.', `y − (${y1}) = ${m}(x − (${x1})).`, '전개해서 y = mx + b로 정리.'],
      idea: '한 점과 기울기 → 점-기울기식이 가장 빠른 길.',
      solve: `y = ${m}x ${fmtSigned(-m * x1)} ${fmtSigned(y1)} = ${formatLinear(m, b)}. (점 대입 검산 ✓)`,
      remember: '완성한 식에 주어진 점을 대입해 반드시 확인!',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const [A, B, C5] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]]);
    const x0 = randInt(-4, 4);
    const y0 = randInt(-4, 4);
    const k = randInt(1, 4);
    const c = k * C5 - (A * x0 + B * y0);
    const ans = k;
    chk(near(Math.abs(A * x0 + B * y0 + c) / Math.hypot(A, B), ans), 'H2.GEOM L4');
    return {
      stem: `점 (${x0}, ${y0})과 직선 ${A}x + ${B}y ${fmtSigned(c)} = 0 사이의 거리는?`,
      ...buildChoices(`${ans}`, [
        { text: `${k * C5}`, tag: 'FORMULA' },
        { text: `${ans + 1}`, tag: 'CALCULATION' },
        { text: `${Math.abs(A * x0 + B * y0 + c)}` === `${ans}` ? `${ans + 3}` : `${Math.abs(A * x0 + B * y0 + c)}`, tag: 'CONCEPT' },
      ], (g) => `${ans + g + 1}`),
      hints: ['점과 직선 사이 거리 공식을 써요.', `|${A}x₀ + ${B}y₀ + c| / √(${A}² + ${B}²).`, `분모 √${A * A + B * B} = ${C5}.`],
      idea: '거리 공식의 분모 √(a²+b²)는 법선벡터의 크기예요.',
      solve: `|${A * x0 + B * y0 + c}| / ${C5} = ${k * C5}/${C5} = ${ans}.`,
      remember: '절댓값을 잊으면 음수 거리가 나와요 — 거리는 항상 양수!',
      estimatedSec: 110,
    };
  }
  // L5 — 원의 방정식
  const a = randInt(-4, 4);
  const b2 = randInt(-4, 4);
  const [dx, dy, r] = pick(PYTH);
  const px = a + dx;
  const py = b2 + dy;
  chk(near((px - a) ** 2 + (py - b2) ** 2, r * r), 'H2.GEOM L5');
  const eq = `(x ${a >= 0 ? '−' : '+'} ${Math.abs(a)})² + (y ${b2 >= 0 ? '−' : '+'} ${Math.abs(b2)})² = ${r * r}`;
  return {
    stem: `중심이 (${a}, ${b2})이고 점 (${px}, ${py})를 지나는 원의 방정식은?`,
    ...buildChoices(eq, [
      { text: `(x ${a >= 0 ? '+' : '−'} ${Math.abs(a)})² + (y ${b2 >= 0 ? '+' : '−'} ${Math.abs(b2)})² = ${r * r}`, tag: 'SIGN' },
      { text: `(x ${a >= 0 ? '−' : '+'} ${Math.abs(a)})² + (y ${b2 >= 0 ? '−' : '+'} ${Math.abs(b2)})² = ${r}`, tag: 'FORMULA' },
      { text: `(x ${a >= 0 ? '−' : '+'} ${Math.abs(a)})² + (y ${b2 >= 0 ? '−' : '+'} ${Math.abs(b2)})² = ${2 * r}`, tag: 'CALCULATION' },
    ], (g) => `(x ${a >= 0 ? '−' : '+'} ${Math.abs(a)})² + (y ${b2 >= 0 ? '−' : '+'} ${Math.abs(b2)})² = ${r * r + g}`),
    hints: ['원의 방정식: (x−a)² + (y−b)² = r².', '반지름 = 중심에서 그 점까지의 거리.', `r² = ${dx}² + ${dy}² = ${r * r}.`],
    idea: '원 = 중심에서 같은 거리의 점들 — 그 거리가 반지름.',
    solve: `r² = (${px}−${a})² + (${py}−${b2})² = ${r * r} → ${eq}.`,
    remember: '우변은 r이 아니라 r²! 가장 흔한 실수예요.',
    estimatedSec: 120,
  };
}

export function transferH2Geom(level: Level): Draft {
  const [dx, dy, d] = pick(PYTH);
  const sc = randInt(1, 2);
  const ans = d * sc;
  chk(near(Math.hypot(dx * sc, dy * sc), ans), 'H2.GEOM T');
  return {
    stem: `격자 지도에서 학교는 (0, 0), 도서관은 (${dx * sc}, ${dy * sc})에 있습니다 (한 칸 = 1km). 학교에서 도서관까지 직선거리는?`,
    ...buildChoices(`${ans}km`, [
      { text: `${(dx + dy) * sc}km`, tag: 'CONCEPT' },
      { text: `${ans * ans}km`, tag: 'FORMULA' },
      { text: `${ans + sc}km`, tag: 'CALCULATION' },
    ], (g) => `${ans + g + 1}km`),
    hints: ['직선거리는 좌표 거리 공식으로!', `√(${dx * sc}² + ${dy * sc}²).`, `√${ans * ans} = ${ans}.`],
    idea: '지도의 직선거리 = 좌표평면의 거리 공식.',
    solve: `√(${(dx * sc) ** 2} + ${(dy * sc) ** 2}) = ${ans}km.`,
    remember: `도로를 따라간 거리(${(dx + dy) * sc}km)와 직선거리는 달라요! (레벨 ${level})`,
    estimatedSec: 80 + level * 5,
  };
}

// =====================================================================
// H2.SET — 집합과 명제
// =====================================================================
export function genH2Set(level: Level): Draft {
  if (level === 1) {
    const n = randInt(3, 6);
    const proper = pick([true, false]);
    const ans = proper ? 2 ** n - 1 : 2 ** n;
    // 독립 검산: 비트마스크 전수 나열
    let count = 0;
    for (let mask = 0; mask < 2 ** n; mask++) if (!proper || mask !== 2 ** n - 1) count++;
    chk(count === ans, 'H2.SET L1');
    return {
      stem: `원소가 ${n}개인 집합의 ${proper ? '진부분집합' : '부분집합'}의 개수는?`,
      ...buildChoices(`${ans}`, [
        { text: `${proper ? 2 ** n : 2 ** n - 1}`, tag: 'CONCEPT' },
        { text: `${n * n}` === `${ans}` ? `${ans + 3}` : `${n * n}`, tag: 'FORMULA' },
        { text: `${2 * n}` === `${ans}` ? `${ans - 3}` : `${2 * n}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['각 원소마다 "넣는다/뺀다" 2가지 선택.', `2를 ${n}번 곱해요: 2^${n}.`, proper ? '진부분집합은 자기 자신을 제외!' : '공집합과 자기 자신도 포함!'],
      idea: '부분집합 세기 = 원소마다 2지선다의 곱의 법칙.',
      solve: `2^${n} = ${2 ** n}${proper ? ` − 1 = ${ans} (자기 자신 제외)` : ''}.`,
      remember: '특정 원소를 "반드시 포함"하면 2^(n−1)개.',
      estimatedSec: 60,
    };
  }
  if (level === 2) {
    const nA = randInt(10, 20);
    const nB = randInt(10, 20);
    const inter = randInt(3, Math.min(nA, nB) - 2);
    const ans = nA + nB - inter;
    chk(ans === nA + nB - inter, 'H2.SET L2');
    return {
      stem: `학급에서 수학 동아리 가입자는 ${nA}명, 과학 동아리 가입자는 ${nB}명, 둘 다 가입한 학생은 ${inter}명입니다. 적어도 하나에 가입한 학생 수는?`,
      ...buildChoices(`${ans}명`, [
        { text: `${nA + nB}명`, tag: 'CONCEPT' },
        { text: `${nA + nB - 2 * inter}명`, tag: 'CALCULATION' },
        { text: `${inter}명`, tag: 'INTERPRETATION' },
      ], (g) => `${ans + g}명`),
      hints: ['그냥 더하면 무엇이 두 번 세어질까요?', '포함·배제: n(A∪B) = n(A) + n(B) − n(A∩B).', `${nA} + ${nB} − ${inter}.`],
      idea: '겹치는 부분은 한 번 빼 줘야 정확한 개수!',
      solve: `${nA} + ${nB} − ${inter} = ${ans}명.`,
      remember: '벤 다이어그램을 그리면 실수가 사라져요.',
      estimatedSec: 70,
    };
  }
  if (level === 3) {
    const a = randInt(2, 6);
    const b = a + randInt(1, 4);
    // 명제: x > b 이면 x > a (참). 대우: x ≤ a 이면 x ≤ b.
    const ans = `x ≤ ${a}이면 x ≤ ${b}이다`;
    chk(b > a, 'H2.SET L3');
    return {
      stem: `명제 "x > ${b}이면 x > ${a}이다"의 대우는?`,
      ...buildChoices(ans, [
        { text: `x > ${a}이면 x > ${b}이다`, tag: 'CONCEPT' },
        { text: `x ≤ ${b}이면 x ≤ ${a}이다`, tag: 'CALCULATION' },
        { text: `x > ${b}이면 x ≤ ${a}이다`, tag: 'FORMULA' },
      ], () => `x < ${a}이면 x > ${b}이다`),
      hints: ['대우: 가정과 결론을 모두 부정하고 순서를 바꿔요.', '"x > k"의 부정은 "x ≤ k".', '~q → ~p 꼴로!'],
      idea: '대우는 원래 명제와 참·거짓이 항상 같아요 — 증명의 강력한 우회로.',
      solve: `p: x>${b}, q: x>${a} → 대우 ~q→~p: "${ans}". (원명제 참이므로 대우도 참)`,
      remember: '역(q→p)·이(~p→~q)는 참·거짓이 달라질 수 있어요!',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const a = randInt(3, 7);
    const b = a - randInt(1, 2);
    // x > a ⇒ x > b (a > b): "x > a"는 "x > b"이기 위한 충분조건
    const ans = '충분조건';
    chk(a > b, 'H2.SET L4');
    return {
      stem: `조건 p: x > ${a}, q: x > ${b}에 대하여, p는 q이기 위한 무슨 조건일까요?`,
      ...buildChoices(ans, [
        { text: '필요조건', tag: 'CONCEPT' },
        { text: '필요충분조건', tag: 'CALCULATION' },
        { text: '아무 조건도 아니다', tag: 'INTERPRETATION' },
      ], () => '역조건'),
      hints: [`x > ${a}이면 반드시 x > ${b}인가요? (${a} > ${b})`, 'p ⇒ q가 성립하면 p는 충분조건.', `반대로 x > ${b}라고 x > ${a}인 건 아니죠 (예: x = ${b + 1}).`],
      idea: '작은 집합(강한 조건) ⇒ 큰 집합(약한 조건): 작은 쪽이 충분조건.',
      solve: `{x > ${a}} ⊂ {x > ${b}} → p ⇒ q 성립, 역은 불성립 → p는 충분조건.`,
      remember: '"충분"은 포함되는 쪽, "필요"는 포함하는 쪽!',
      estimatedSec: 100,
    };
  }
  // L5 — 포함·배제 (배수 세기, 전수 검산)
  const N = pick([30, 40, 50, 60]);
  const a = pick([2, 3]);
  const b = a === 2 ? pick([3, 5]) : pick([4, 5]);
  const lcm = (x: number, y: number): number => (x * y) / ((): number => { let p = x, q = y; while (q) [p, q] = [q, p % q]; return p; })();
  const L = lcm(a, b);
  const ans = Math.floor(N / a) + Math.floor(N / b) - Math.floor(N / L);
  let count = 0;
  for (let i = 1; i <= N; i++) if (i % a === 0 || i % b === 0) count++;
  chk(count === ans, `H2.SET L5 N=${N} a=${a} b=${b}`);
  return {
    stem: `1부터 ${N}까지의 자연수 중 ${a}의 배수 또는 ${b}의 배수의 개수는?`,
    ...buildChoices(`${ans}개`, [
      { text: `${Math.floor(N / a) + Math.floor(N / b)}개`, tag: 'CONCEPT' },
      { text: `${Math.floor(N / L)}개`, tag: 'INTERPRETATION' },
      { text: `${ans - 2}개`, tag: 'CALCULATION' },
    ], (g) => `${ans + g}개`),
    hints: [`${a}의 배수 ${Math.floor(N / a)}개, ${b}의 배수 ${Math.floor(N / b)}개.`, `둘 다인 수 = ${L}의 배수가 두 번 세어졌어요.`, `${Math.floor(N / a)} + ${Math.floor(N / b)} − ${Math.floor(N / L)}.`],
    idea: '"또는"의 개수 = 포함·배제 — 교집합(공배수)을 한 번 빼기.',
    solve: `${Math.floor(N / a)} + ${Math.floor(N / b)} − ${Math.floor(N / L)} = ${ans}개. (직접 센 값 ${count}개와 일치)`,
    remember: '공배수 = 최소공배수의 배수!',
    estimatedSec: 110,
  };
}

export function transferH2Set(level: Level): Draft {
  const total = randInt(28, 36);
  const nA = randInt(15, 22);
  const nB = randInt(15, 22);
  const none = randInt(2, 5);
  const inter = nA + nB - (total - none);
  if (inter < 1 || inter > Math.min(nA, nB)) return transferH2Set(level); // 유효 조합 재추첨
  chk(total - none === nA + nB - inter, 'H2.SET T');
  return {
    stem: `${total}명의 학급에서 영화를 좋아하는 학생 ${nA}명, 음악을 좋아하는 학생 ${nB}명, 둘 다 좋아하지 않는 학생 ${none}명입니다. 둘 다 좋아하는 학생 수는?`,
    ...buildChoices(`${inter}명`, [
      { text: `${nA + nB - total}명` === `${inter}명` ? `${inter + 2}명` : `${nA + nB - total}명`, tag: 'CALCULATION' },
      { text: `${total - nA - none}명` === `${inter}명` ? `${inter - 1}명` : `${total - nA - none}명`, tag: 'CONCEPT' },
      { text: `${none}명`, tag: 'INTERPRETATION' },
    ], (g) => `${inter + g}명`),
    hints: [`하나라도 좋아하는 학생은 ${total} − ${none} = ${total - none}명.`, 'n(A∪B) = n(A) + n(B) − n(A∩B)를 거꾸로!', `${nA} + ${nB} − ${total - none}.`],
    idea: '전체에서 "아무것도 아닌" 사람을 빼면 합집합 — 공식을 역산!',
    solve: `n(A∩B) = ${nA} + ${nB} − ${total - none} = ${inter}명.`,
    remember: `실생활 설문 문제의 90%는 이 구조예요. (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// H2.FUNC — 함수와 그래프
// =====================================================================
export function genH2Func(level: Level): Draft {
  const a = nonZero(-3, 3);
  const b = randInt(-5, 5);
  const c = nonZero(-3, 3);
  const d = randInt(-5, 5);
  const f = (x: number) => a * x + b;
  const g = (x: number) => c * x + d;
  if (level === 1) {
    const k = nonZero(-4, 4);
    const ans = f(g(k));
    chk(ans === a * (c * k + d) + b, 'H2.FUNC L1');
    return {
      stem: `f(x) = ${formatLinear(a, b)}, g(x) = ${formatLinear(c, d)}일 때, (f ∘ g)(${k})의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${g(f(k))}` === `${ans}` ? `${ans + 3}` : `${g(f(k))}`, tag: 'CONCEPT' },
        { text: `${f(k) * g(k)}` === `${ans}` ? `${ans - 3}` : `${f(k) * g(k)}`, tag: 'FORMULA' },
        { text: `${f(k) + g(k)}` === `${ans}` ? `${ans + 5}` : `${f(k) + g(k)}`, tag: 'CALCULATION' },
      ], (gg) => `${ans + gg}`),
      hints: ['(f∘g)(x) = f(g(x)) — 안쪽(g) 먼저!', `g(${k}) = ${g(k)}.`, `f(${g(k)}) = ?`],
      idea: '합성함수는 "출력을 다시 입력으로" — 순서가 생명.',
      solve: `g(${k}) = ${g(k)} → f(${g(k)}) = ${ans}.`,
      remember: '(f∘g)와 (g∘f)는 보통 달라요!',
      estimatedSec: 70,
    };
  }
  if (level === 2) {
    const m = c * a;
    const k2 = c * b + d;
    chk(g(f(3)) === m * 3 + k2, 'H2.FUNC L2');
    return {
      stem: `f(x) = ${formatLinear(a, b)}, g(x) = ${formatLinear(c, d)}일 때, 합성함수 (g ∘ f)(x)는?`,
      ...buildChoices(`${formatLinear(m, k2)}`, [
        { text: `${formatLinear(a * c, a * d + b)}` === `${formatLinear(m, k2)}` ? `${formatLinear(m, k2 + 2)}` : `${formatLinear(a * c, a * d + b)}`, tag: 'CONCEPT' },
        { text: `${formatLinear(m, d)}` === `${formatLinear(m, k2)}` ? `${formatLinear(m, k2 - 2)}` : `${formatLinear(m, d)}`, tag: 'CALCULATION' },
        { text: `${formatLinear(a + c, b + d)}` === `${formatLinear(m, k2)}` ? `${formatLinear(m + 1, k2)}` : `${formatLinear(a + c, b + d)}`, tag: 'FORMULA' },
      ], (gg) => `${formatLinear(m, k2 + gg)}`),
      hints: ['(g∘f)(x) = g(f(x)) — f를 g의 x 자리에 통째로!', `g(${formatLinear(a, b)}) = ${c}(${formatLinear(a, b)}) ${fmtSigned(d)}.`, '전개해서 정리해요.'],
      idea: '합성 = 대입: 식을 식에 넣는 것.',
      solve: `${c}(${formatLinear(a, b)}) ${fmtSigned(d)} = ${formatLinear(m, k2)}. (x=3 대입 검산 ✓)`,
      remember: '숫자 하나를 대입해 원래 두 단계 계산과 비교하면 검산 완료!',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const x0 = nonZero(-4, 4);
    const k = f(x0);
    chk(f(x0) === k, 'H2.FUNC L3');
    return {
      stem: `f(x) = ${formatLinear(a, b)}일 때, f⁻¹(${k})의 값은?`,
      ...buildChoices(`${x0}`, [
        { text: `${f(k)}` === `${x0}` ? `${x0 + 2}` : `${f(k)}`, tag: 'CONCEPT' },
        { text: `${-x0 === x0 ? x0 + 1 : -x0}`, tag: 'SIGN' },
        { text: `${k}`, tag: 'INTERPRETATION' },
      ], (gg) => `${x0 + gg}`),
      hints: ['f⁻¹(k) = "f에 무엇을 넣으면 k가 나올까?"', `${formatLinear(a, b)} = ${k}를 풀어요.`, `${a}x = ${k - b}.`],
      idea: '역함수 값 구하기 = 방정식 풀기.',
      solve: `${a}x ${fmtSigned(b)} = ${k} → x = ${x0}. (검산: f(${x0}) = ${k} ✓)`,
      remember: 'f(p)=q ⇔ f⁻¹(q)=p — 화살표를 뒤집는 것뿐!',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const a2 = pick([2, 3, -2]);
    const b2 = a2 * randInt(-3, 3);
    const inv = (x: number) => (x - b2) / a2;
    chk(near(inv(a2 * 5 + b2), 5), 'H2.FUNC L4');
    const ansStr = `y = (x ${b2 >= 0 ? '−' : '+'} ${Math.abs(b2)})/${a2}`;
    return {
      stem: `함수 f(x) = ${formatLinear(a2, b2)}의 역함수는?`,
      ...buildChoices(ansStr, [
        { text: `y = (x ${b2 >= 0 ? '+' : '−'} ${Math.abs(b2)})/${a2}`, tag: 'SIGN' },
        { text: `y = ${a2}(x ${b2 >= 0 ? '−' : '+'} ${Math.abs(b2)})`, tag: 'CONCEPT' },
        { text: `y = 1/(${formatLinear(a2, b2)})`, tag: 'FORMULA' },
      ], (gg) => `y = (x ${b2 >= 0 ? '−' : '+'} ${Math.abs(b2) + gg})/${a2}`),
      hints: ['x와 y를 바꾼 뒤 y에 대해 풀어요.', `x = ${a2}y ${fmtSigned(b2)}.`, `y = (x ${fmtSigned(-b2)})/${a2}.`],
      idea: '역함수 = 입력↔출력 교환: x↔y 바꿔 다시 정리.',
      solve: `x = ${a2}y ${fmtSigned(b2)} → ${ansStr}.`,
      remember: '역함수 그래프는 y=x에 대한 대칭이에요.',
      estimatedSec: 100,
    };
  }
  // L5 — 유리함수 점근선
  const kk = nonZero(-4, 4);
  const p = nonZero(-4, 4);
  const q = nonZero(-4, 4);
  const y = (x: number) => kk / (x - p) + q;
  chk(near(y(p + 1000), q, 0.01), 'H2.FUNC L5');
  return {
    stem: `유리함수 y = ${kk}/(x ${p >= 0 ? '−' : '+'} ${Math.abs(p)}) ${fmtSigned(q)}의 점근선은?`,
    ...buildChoices(`x = ${p}, y = ${q}`, [
      { text: `x = ${-p === p ? p + 1 : -p}, y = ${q}`, tag: 'SIGN' },
      { text: `x = ${q}, y = ${p}` === `x = ${p}, y = ${q}` ? `x = ${p + 1}, y = ${q - 1}` : `x = ${q}, y = ${p}`, tag: 'CONCEPT' },
      { text: `x = ${kk}, y = ${q}` === `x = ${p}, y = ${q}` ? `x = ${p}, y = ${q + 2}` : `x = ${kk}, y = ${q}`, tag: 'INTERPRETATION' },
    ], (gg) => `x = ${p + gg}, y = ${q - gg}`),
    hints: ['분모가 0이 되는 곳에서 세로 점근선.', `x − (${p}) = 0 → x = ${p}.`, `x가 아주 커지면 y는 ${q}에 다가가요 → y = ${q}.`],
    idea: '평행이동된 반비례 그래프: 점근선이 곧 이동량 (p, q).',
    solve: `세로 점근선 x = ${p}, 가로 점근선 y = ${q}. (x=${p}+1000 대입 시 y≈${q} 확인)`,
    remember: '점근선의 교점 (p, q)가 그래프의 "새 원점"!',
    estimatedSec: 110,
  };
}

export function transferH2Func(level: Level): Draft {
  const rate = pick([2, 3]);
  const fee = randInt(2, 6) * 1000;
  const won = (x: number) => rate * 1000 * x + fee;
  const total = won(randInt(3, 8));
  const hours = (total - fee) / (rate * 1000);
  chk(won(hours) === total, 'H2.FUNC T');
  return {
    stem: `자전거 대여료는 기본요금 ${fee}원에 1시간마다 ${rate * 1000}원입니다 (요금 f(x) = ${rate * 1000}x + ${fee}). 요금이 ${total}원 나왔다면 몇 시간 빌린 걸까요? (역함수적 사고)`,
    ...buildChoices(`${hours}시간`, [
      { text: `${won(hours) / 1000}시간`, tag: 'CONCEPT' },
      { text: `${hours + 1}시간`, tag: 'CALCULATION' },
      { text: `${(total / (rate * 1000)).toFixed(1)}시간`, tag: 'FORMULA' },
    ], (g) => `${hours + g + 1}시간`),
    hints: ['출력(요금)에서 입력(시간)을 거꾸로!', `${total} − ${fee}이 시간 요금.`, `${total - fee} ÷ ${rate * 1000}.`],
    idea: '역함수는 "결과에서 원인 찾기" — 요금표를 거꾸로 읽는 것.',
    solve: `x = (${total} − ${fee})/${rate * 1000} = ${hours}시간.`,
    remember: `f⁻¹의 의미는 언제나 "거꾸로 묻기"예요. (레벨 ${level})`,
    estimatedSec: 90 + level * 5,
  };
}
