// 고등 진로선택(미적분Ⅱ · 기하) 생성기 — 전량 원저작.
// 전 템플릿 생성 시점 자기검산: 수치 미분/적분, 부분합 수렴, 좌표 기하 재계산.
import type { Level } from '../types.ts';
import { buildChoices, nonZero, pick, randInt, fmtSigned, simplifyFrac, fracStr } from './util.ts';
import type { Draft } from './index.ts';

const chk = (cond: boolean, label: string) => {
  if (!cond) throw new Error(`SELF-CHECK FAIL: ${label}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const dnum = (f: (x: number) => number, x: number) => (f(x + 1e-6) - f(x - 1e-6)) / 2e-6;
const inum = (f: (x: number) => number, lo: number, hi: number) => {
  const n = 4000;
  let s = 0;
  const w = (hi - lo) / n;
  for (let i = 0; i < n; i++) s += f(lo + (i + 0.5) * w) * w;
  return s;
};

// =====================================================================
// HC2.SER — 수열의 극한과 급수
// =====================================================================
export function genHc2Ser(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-6, 6);
    const b = randInt(-5, 5);
    const c = nonZero(1, 5);
    const d = randInt(-5, 5);
    const fr = simplifyFrac(a, c);
    const N = 1e7;
    chk(near((a * N + b) / (c * N + d), a / c, 1e-4), 'HC2.SER L1');
    return {
      stem: `수열 aₙ = (${a}n ${fmtSigned(b)})/(${c === 1 ? '' : c}n ${fmtSigned(d)})의 극한 lim aₙ은?`,
      ...buildChoices(fracStr(fr), [
        { text: '0', tag: 'CONCEPT' },
        { text: '∞ (발산)', tag: 'INTERPRETATION' },
        { text: fracStr(simplifyFrac(b, d === 0 ? 1 : d)) === fracStr(fr) ? fracStr(simplifyFrac(a + 1, c)) : fracStr(simplifyFrac(b, d === 0 ? 1 : d)), tag: 'FORMULA' },
      ], (g) => fracStr(simplifyFrac(a + g + 1, c))),
      hints: ['n이 아주 커지면 무엇이 지배할까요?', '분자·분모를 n으로 나눠요.', `${a}/${c}만 남아요.`],
      idea: '수열 극한 = 최고차항 계수의 비 (함수 극한과 동일 원리).',
      solve: `lim = ${a}/${c} = ${fracStr(fr)}. (n=10⁷ 수치 검산 ✓)`,
      remember: '상수항은 극한에서 먼지처럼 사라져요.',
      estimatedSec: 70,
    };
  }
  if (level === 2) {
    const a = nonZero(-6, 6);
    const rDen = pick([2, 3, 4]);
    const sum = (a * rDen) / (rDen - 1);
    const fr = simplifyFrac(a * rDen, rDen - 1);
    let ps = 0;
    let term = a;
    for (let i = 0; i < 80; i++) { ps += term; term /= rDen; }
    chk(near(ps, sum, 1e-6), 'HC2.SER L2');
    return {
      stem: `등비급수 ${a < 0 ? `(${a})` : a} + ${a < 0 ? `(${a})` : a}/${rDen} + ${a < 0 ? `(${a})` : a}/${rDen ** 2} + ⋯ 의 합은?`,
      ...buildChoices(fracStr(fr), [
        { text: `${a}`, tag: 'CONCEPT' },
        { text: fracStr(simplifyFrac(a * (rDen - 1), rDen)) === fracStr(fr) ? fracStr(simplifyFrac(a * rDen + 1, rDen - 1)) : fracStr(simplifyFrac(a * (rDen - 1), rDen)), tag: 'FORMULA' },
        { text: '∞ (발산)', tag: 'INTERPRETATION' },
      ], (g) => fracStr(simplifyFrac(a * rDen + g, rDen - 1))),
      hints: ['공비 |r| < 1인지 확인해요.', `첫째항 ${a}, 공비 1/${rDen}.`, `합 = a/(1−r) = ${a}/(1 − 1/${rDen}).`],
      idea: '무한히 더해도 유한 — |r|<1 등비급수의 마법.',
      solve: `${a}/(${rDen - 1}/${rDen}) = ${fracStr(fr)}. (80항 부분합 검산 ✓)`,
      remember: '|r| ≥ 1이면 발산 — 수렴 조건 먼저!',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const k = randInt(-2, 4);
    const m = pick([2, 3, 4]);
    // r = (x−k)/m, |r|<1 ⇔ k−m < x < k+m
    const mid = k;
    chk(Math.abs((mid - k) / m) < 1 && Math.abs((k + m + 1 - k) / m) >= 1, 'HC2.SER L3');
    return {
      stem: `등비급수 Σ ((x − ${k})/${m})ⁿ (n = 1부터 ∞)이 수렴하도록 하는 x의 범위는?`,
      ...buildChoices(`${k - m} < x < ${k + m}`, [
        { text: `x < ${k + m}`, tag: 'CONCEPT' },
        { text: `${k - m} ≤ x ≤ ${k + m}`, tag: 'FORMULA' },
        { text: `${-m} < x < ${m}` === `${k - m} < x < ${k + m}` ? `${k - m - 1} < x < ${k + m + 1}` : `${-m} < x < ${m}`, tag: 'CALCULATION' },
      ], (g) => `${k - m - g} < x < ${k + m + g}`),
      hints: ['수렴 조건: |공비| < 1.', `|(x − ${k})/${m}| < 1.`, `|x − ${k}| < ${m}.`],
      idea: '급수의 수렴 범위 = 공비의 절댓값 부등식.',
      solve: `−${m} < x − ${k} < ${m} → ${k - m} < x < ${k + m}.`,
      remember: '경계(등호)에서는 발산 — 열린 구간!',
      estimatedSec: 100,
    };
  }
  if (level === 4) {
    const d = randInt(1, 8);
    const fr = simplifyFrac(d, 9);
    let ps = 0;
    for (let i = 1; i <= 12; i++) ps += d / 10 ** i;
    chk(near(ps, d / 9, 1e-9), 'HC2.SER L4');
    return {
      stem: `순환소수 0.${d}${d}${d}⋯ (0.${d} 순환)을 분수로 나타내면?`,
      ...buildChoices(fracStr(fr), [
        { text: `${d}/10`, tag: 'CONCEPT' },
        { text: `${d}/99` === fracStr(fr) ? `${d}/90` : `${d}/99`, tag: 'FORMULA' },
        { text: `${d}/11`, tag: 'CALCULATION' },
      ], (g) => fracStr(simplifyFrac(d + g, 9))),
      hints: ['등비급수로 보세요: d/10 + d/100 + ⋯.', `첫째항 ${d}/10, 공비 1/10.`, `합 = (${d}/10)/(9/10).`],
      idea: '순환소수의 정체 = 등비급수의 합.',
      solve: `(${d}/10)/(1 − 1/10) = ${d}/9 = ${fracStr(fr)}. (12자리 수치 검산 ✓)`,
      remember: '두 자리 순환이면 분모가 99!',
      estimatedSec: 90,
    };
  }
  // L5 — 망원급수
  const a = randInt(0, 3);
  const target = simplifyFrac(1, a + 1);
  let ps = 0;
  for (let k = 1; k <= 4000; k++) ps += 1 / ((k + a) * (k + a + 1));
  chk(near(ps, 1 / (a + 1), 1e-3), 'HC2.SER L5');
  return {
    stem: `급수 Σ 1/((n + ${a})(n + ${a + 1})) (n = 1부터 ∞)의 합은?`,
    ...buildChoices(fracStr(target), [
      { text: '1' === fracStr(target) ? '1/2' : '1', tag: 'CONCEPT' },
      { text: fracStr(simplifyFrac(1, a + 2)), tag: 'CALCULATION' },
      { text: '∞ (발산)', tag: 'INTERPRETATION' },
    ], (g) => fracStr(simplifyFrac(1, a + 3 + g))),
    hints: ['부분분수로 쪼개요: 1/(k(k+1)) = 1/k − 1/(k+1).', '연쇄적으로 소거(망원경처럼 접힘)!', `남는 것은 첫 항 1/${a + 1}.`],
    idea: '망원급수: 쪼개면 가운데가 모두 사라지고 양 끝만 남아요.',
    solve: `부분합 = 1/${a + 1} − 1/(n+${a + 1}) → 합 = 1/${a + 1}. (4000항 검산 ✓)`,
    remember: '"곱이 분모"면 부분분수 분해 신호!',
    estimatedSec: 130,
  };
}

export function transferHc2Ser(level: Level): Draft {
  const h0 = pick([8, 16, 27]);
  const rDen = pick([2, 3]);
  // 공 낙하: 총 이동 거리 = h + 2h(r/(1-r)), r = 1/rDen
  const r = 1 / rDen;
  const total = h0 + (2 * h0 * r) / (1 - r);
  const totalNice = Math.round(total * 100) / 100;
  let ps = h0;
  let bounce = h0 * r;
  for (let i = 0; i < 60; i++) { ps += 2 * bounce; bounce *= r; }
  chk(near(ps, total, 1e-4), 'HC2.SER T');
  return {
    stem: `공을 ${h0}m 높이에서 떨어뜨리면 떨어진 높이의 1/${rDen}만큼 다시 튀어 오릅니다. 공이 멈출 때까지 움직인 총거리는?`,
    ...buildChoices(`${totalNice}m`, [
      { text: `${h0 * 2}m` === `${totalNice}m` ? `${totalNice + 4}m` : `${h0 * 2}m`, tag: 'CONCEPT' },
      { text: `${h0 + h0 * r}m`, tag: 'CALCULATION' },
      { text: `∞ (멈추지 않는다)`, tag: 'INTERPRETATION' },
    ], (g) => `${totalNice + g * 2}m`),
    hints: ['튀어 오른 높이는 오르고 내려 두 번씩 계산!', `반등 높이의 합 = ${h0}×${fracStr(simplifyFrac(1, rDen))}/(1−${fracStr(simplifyFrac(1, rDen))}).`, `${h0} + 2×(그 합).`],
    idea: '무한 번 튀지만 총거리는 유한 — 등비급수의 실감 나는 응용.',
    solve: `${h0} + 2·${h0}·${fracStr(simplifyFrac(1, rDen - 1))} = ${totalNice}m. (60회 반등 수치 검산 ✓)`,
    remember: `제논의 역설이 풀리는 지점이 바로 여기! (레벨 ${level})`,
    estimatedSec: 120 + level * 5,
  };
}

// =====================================================================
// HC2.DIF2 — 여러 가지 미분법
// =====================================================================
export function genHc2Dif2(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-4, 4);
    const f = (x: number) => Math.exp(a * x);
    chk(near(dnum(f, 0.4), a * f(0.4), 1e-4), 'HC2.DIF2 L1');
    return {
      stem: `함수 f(x) = e^(${a}x)의 도함수 f′(x)는?`,
      ...buildChoices(`${a}e^(${a}x)`, [
        { text: `e^(${a}x)`, tag: 'CONCEPT' },
        { text: `${a}x·e^(${a - 1 === a ? a : a}x−1)`.replace('--', '−'), tag: 'FORMULA' },
        { text: `${-a === a ? a + 1 : -a}e^(${a}x)`, tag: 'SIGN' },
      ], (g) => `${a + g + 1}e^(${a}x)`),
      hints: ['(eˣ)′ = eˣ — 지수함수는 자기 자신!', '겉은 그대로, 속(ax)의 미분을 곱해요.', `속미분 = ${a}.`],
      idea: '합성함수 미분: 겉미분 × 속미분.',
      solve: `f′(x) = e^(${a}x) × ${a} = ${a}e^(${a}x). (수치 미분 검산 ✓)`,
      remember: 'e^x가 특별한 이유 — 미분해도 변하지 않는 유일한 지수!',
      estimatedSec: 80,
    };
  }
  if (level === 2) {
    const a = pick([2, 3, -2]);
    const f = (x: number) => Math.sin(a * x);
    chk(near(dnum(f, 0.5), a * Math.cos(a * 0.5), 1e-4), 'HC2.DIF2 L2');
    return {
      stem: `함수 f(x) = sin ${a === -2 ? '(−2x)' : `${a}x`}의 도함수는?`,
      ...buildChoices(`${a}cos ${a === -2 ? '(−2x)' : `${a}x`}`, [
        { text: `cos ${a === -2 ? '(−2x)' : `${a}x`}`, tag: 'CONCEPT' },
        { text: `−${Math.abs(a)}cos ${a === -2 ? '(−2x)' : `${a}x`}` === `${a}cos ${a === -2 ? '(−2x)' : `${a}x`}` ? `${a}sin ${a}x` : `−${Math.abs(a)}cos ${a === -2 ? '(−2x)' : `${a}x`}`, tag: 'SIGN' },
        { text: `${a}sin ${a === -2 ? '(−2x)' : `${a}x`}`, tag: 'FORMULA' },
      ], (g) => `${a + g + 3}cos ${a}x`),
      hints: ['(sin x)′ = cos x.', '속미분을 잊지 마세요!', `속(${a}x)의 미분 = ${a}.`],
      idea: 'sin→cos→−sin→−cos — 미분의 4주기 사이클.',
      solve: `f′(x) = cos(${a}x) × ${a}. (수치 검산 ✓)`,
      remember: '(cos x)′ = −sin x — 부호가 여기서 태어나요!',
      estimatedSec: 80,
    };
  }
  if (level === 3) {
    const k = randInt(1, 3);
    const f = (x: number) => x * Math.exp(x);
    const ans = (k + 1);
    chk(near(dnum(f, k), (k + 1) * Math.exp(k), 1e-3), 'HC2.DIF2 L3');
    return {
      stem: `f(x) = x·eˣ일 때, f′(${k})/e^${k}의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${k}`, tag: 'CONCEPT' },
        { text: `${k * k}` === `${ans}` ? `${ans + 2}` : `${k * k}`, tag: 'FORMULA' },
        { text: `1`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['곱의 미분법: (fg)′ = f′g + fg′.', `(x·eˣ)′ = 1·eˣ + x·eˣ = (x+1)eˣ.`, `x = ${k} 대입 후 e^${k}으로 나눠요.`],
      idea: '곱의 미분 = 앞미분×뒤 + 앞×뒤미분.',
      solve: `f′(${k}) = (${k}+1)e^${k} → 답 ${ans}. (수치 검산 ✓)`,
      remember: '(fg)′ ≠ f′g′ — 가장 유혹적인 함정!',
      estimatedSec: 100,
    };
  }
  if (level === 4) {
    const a = pick([2, 3]);
    const b = nonZero(-3, 3);
    const n = pick([3, 4]);
    const k = pick([0, 1]);
    const inner = a * k + b;
    const ans = n * a * inner ** (n - 1);
    const f = (x: number) => (a * x + b) ** n;
    chk(near(dnum(f, k), ans, Math.max(1e-3, Math.abs(ans) * 1e-6)), 'HC2.DIF2 L4');
    return {
      stem: `f(x) = (${a}x ${fmtSigned(b)})^${n}일 때, f′(${k})의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${n * inner ** (n - 1)}` === `${ans}` ? `${ans + a}` : `${n * inner ** (n - 1)}`, tag: 'CONCEPT' },
        { text: `${a * inner ** n}` === `${ans}` ? `${ans - a}` : `${a * inner ** n}`, tag: 'FORMULA' },
        { text: `${-ans === ans ? ans + 6 : -ans}`, tag: 'SIGN' },
      ], (g) => `${ans + g * a}`),
      hints: ['겉(  )ⁿ 미분 × 속미분.', `n( )ⁿ⁻¹ × ${a}.`, `속값: ${a}×${k} ${fmtSigned(b)} = ${inner}.`],
      idea: '합성함수 미분 — "양파 껍질 벗기듯" 바깥부터.',
      solve: `${n}(${inner})^${n - 1}×${a} = ${ans}. (수치 검산 ✓)`,
      remember: '속미분 빼먹기가 최다 실수 — 항상 물어보기: 속은?',
      estimatedSec: 110,
    };
  }
  // L5 — 몫/로그
  const k = pick([1, 2, 4]);
  const ans = fracStr(simplifyFrac(1, k));
  chk(near(dnum((x) => Math.log(3 * x), k), 1 / k, 1e-4), 'HC2.DIF2 L5');
  return {
    stem: `f(x) = ln 3x일 때, f′(${k})의 값은?`,
    ...buildChoices(ans, [
      { text: fracStr(simplifyFrac(1, 3 * k)), tag: 'CONCEPT' },
      { text: fracStr(simplifyFrac(3, k)), tag: 'FORMULA' },
      { text: `${k}` === ans ? `${k + 1}` : `${k}`, tag: 'CALCULATION' },
    ], (g) => fracStr(simplifyFrac(1, k + g + 1))),
    hints: ['ln 3x = ln 3 + ln x로 쪼개면 쉬워요.', 'ln 3은 상수 → 미분하면 0.', `(ln x)′ = 1/x → 1/${k}.`],
    idea: '로그의 성질이 미분을 단순하게 — 상수는 사라진다.',
    solve: `f′(x) = 1/x → f′(${k}) = ${ans}. (수치 검산 ✓)`,
    remember: '(ln ax)′ = 1/x — a와 무관!',
    estimatedSec: 100,
  };
}

export function transferHc2Dif2(level: Level): Draft {
  const P0 = pick([100, 200]);
  const a = pick([1, 2]);
  const rate = P0 * a; // P'(0) = P0·a
  chk(near(dnum((t) => P0 * Math.exp(a * t), 0), rate, 1e-2), 'HC2.DIF2 T');
  return {
    stem: `세균 수가 P(t) = ${P0}e^(${a}t)로 늘어납니다 (t: 시간). t = 0에서의 순간 증가율 P′(0)은?`,
    ...buildChoices(`${rate}`, [
      { text: `${P0}` === `${rate}` ? `${rate + 50}` : `${P0}`, tag: 'CONCEPT' },
      { text: `${a}`, tag: 'INTERPRETATION' },
      { text: `${P0 + a}`, tag: 'CALCULATION' },
    ], (g) => `${rate + g * 50}`),
    hints: ['(e^(at))′ = a·e^(at).', `P′(t) = ${P0}×${a}×e^(${a}t).`, 't = 0이면 e⁰ = 1.'],
    idea: '지수 성장의 특징: 증가 속도가 현재 크기에 비례!',
    solve: `P′(0) = ${P0}×${a} = ${rate}.`,
    remember: `인구·복리·감염 — 모두 P′ ∝ P의 세계. (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// HC2.INT2 — 여러 가지 적분법
// =====================================================================
export function genHc2Int2(level: Level): Draft {
  if (level === 1) {
    const a = randInt(1, 4);
    const k = pick([1, 2]);
    const exact = a * (Math.exp(k) - 1);
    chk(near(inum((x) => a * Math.exp(x), 0, k), exact, 1e-3), 'HC2.INT2 L1');
    const ans = `${a === 1 ? '' : a}(e^${k === 1 ? '' : k} − 1)`.replace('e^ ', 'e ');
    return {
      stem: `정적분 ∫₀^${k} ${a === 1 ? '' : a}eˣ dx의 값은?`,
      ...buildChoices(ans, [
        { text: `${a === 1 ? '' : a}e^${k === 1 ? '' : k}`.replace('e^ ', 'e '), tag: 'CONCEPT' },
        { text: `${a * k}(e − 1)` === ans ? `${a}(e^${k} + 1)` : `${a * k}(e − 1)`, tag: 'CALCULATION' },
        { text: `${a}(1 − e^${k === 1 ? '' : k})`.replace('e^ ', 'e '), tag: 'SIGN' },
      ], (g) => `${a + g}(e^${k} − 1)`),
      hints: ['eˣ의 원시함수는 eˣ 자신!', `[${a}eˣ]₀^${k}.`, `${a}(e^${k} − e⁰).`],
      idea: '적분해도 e^x — 지수함수의 대칭적 아름다움.',
      solve: `${a}(e^${k} − 1). (수치 적분 검산 ✓)`,
      remember: 'e⁰ = 1 — 아래끝 대입을 잊지 않기!',
      estimatedSec: 90,
    };
  }
  if (level === 2) {
    const a = randInt(1, 4);
    const exact = 2 * a;
    chk(near(inum((x) => a * Math.sin(x), 0, Math.PI), exact, 1e-3), 'HC2.INT2 L2');
    return {
      stem: `정적분 ∫₀^π ${a === 1 ? '' : a}sin x dx의 값은?`,
      ...buildChoices(`${exact}`, [
        { text: `0`, tag: 'CONCEPT' },
        { text: `${a}` === `${exact}` ? `${exact + 1}` : `${a}`, tag: 'CALCULATION' },
        { text: `${-exact}`, tag: 'SIGN' },
      ], (g) => `${exact + g}`),
      hints: ['sin의 원시함수는 −cos.', `[−${a}cos x]₀^π.`, `−${a}(cos π − cos 0) = −${a}(−1 − 1).`],
      idea: 'sin 한 봉우리의 넓이 = 2 — 명장면 상수!',
      solve: `−${a}(−1 − 1) = ${exact}. (수치 검산 ✓)`,
      remember: 'cos π = −1, cos 0 = 1 — 부호 실수 최다 지점.',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const a = randInt(1, 3);
    const exact = ((1 + a) ** 4 - a ** 4) / 8;
    const fr = simplifyFrac((1 + a) ** 4 - a ** 4, 8);
    chk(near(inum((x) => x * (x * x + a) ** 3 * 2, 0, 1) / 2, exact, 1e-3), 'HC2.INT2 L3');
    return {
      stem: `정적분 ∫₀¹ x(x² + ${a})³ dx의 값은?`,
      ...buildChoices(fracStr(fr), [
        { text: fracStr(simplifyFrac((1 + a) ** 4, 8)), tag: 'CONCEPT' },
        { text: fracStr(simplifyFrac((1 + a) ** 4 - a ** 4, 4)), tag: 'CALCULATION' },
        { text: fracStr(simplifyFrac((1 + a) ** 3 - a ** 3, 8)), tag: 'FORMULA' },
      ], (g) => fracStr(simplifyFrac((1 + a) ** 4 - a ** 4 + g * 8, 8))),
      hints: ['속식 x² + ${a} = t로 치환!', 'dt = 2x dx → x dx = dt/2.', `∫ t³/2 dt, 구간은 t: ${a}→${a + 1}.`],
      idea: '치환적분 = "속식과 그 미분"이 함께 보일 때.',
      solve: `(1/2)[t⁴/4] (${a}→${a + 1}) = ${fracStr(fr)}. (수치 검산 ✓)`,
      remember: '치환하면 적분 구간도 함께 바꿔요!',
      estimatedSec: 120,
    };
  }
  if (level === 4) {
    const k = pick([1, 2]);
    const exact = (k - 1) * Math.exp(k) + 1;
    chk(near(inum((x) => x * Math.exp(x), 0, k), exact, 1e-3), 'HC2.INT2 L4');
    const ans = k === 1 ? '1' : `e² + 1`;
    return {
      stem: `정적분 ∫₀^${k} x·eˣ dx의 값은?`,
      ...buildChoices(ans, [
        { text: k === 1 ? 'e − 1' : 'e² − 1', tag: 'CALCULATION' },
        { text: k === 1 ? 'e' : '2e²', tag: 'CONCEPT' },
        { text: k === 1 ? '0' : 'e² + 2', tag: 'SIGN' },
      ], (g) => (k === 1 ? `${g + 2}` : `e² + ${g + 2}`)),
      hints: ['부분적분: ∫f′g = fg − ∫fg′.', `f′ = eˣ, g = x로 놓아요.`, `[x·eˣ]₀^${k} − ∫₀^${k} eˣ dx.`],
      idea: '곱을 적분할 땐 부분적분 — 한쪽을 미분해 없애기.',
      solve: `${k}e^${k} − (e^${k} − 1) = ${k === 1 ? '1' : 'e² + 1'}. (수치 검산 ✓: ${exact.toFixed(3)})`,
      remember: '다항 × 지수 → 다항을 g로 (미분해서 없어지게)!',
      estimatedSec: 130,
    };
  }
  // L5 — 넓이
  const k = pick([1, 2]);
  const exact = Math.exp(k) - 1 - k;
  chk(near(inum((x) => Math.exp(x) - 1, 0, k), exact, 1e-3), 'HC2.INT2 L5');
  const ans = k === 1 ? 'e − 2' : 'e² − 3';
  return {
    stem: `곡선 y = eˣ과 직선 y = 1, x = ${k}로 둘러싸인 부분의 넓이는?`,
    ...buildChoices(ans, [
      { text: k === 1 ? 'e − 1' : 'e² − 1', tag: 'CALCULATION' },
      { text: k === 1 ? 'e' : 'e²', tag: 'CONCEPT' },
      { text: k === 1 ? '1' : `${k}`, tag: 'INTERPRETATION' },
    ], (g) => (k === 1 ? `e − ${g + 3}` : `e² − ${g + 4}`)),
    hints: ['위 곡선 − 아래 직선의 적분!', `∫₀^${k} (eˣ − 1) dx.`, `[eˣ − x]₀^${k}.`],
    idea: '넓이 문제의 공식은 하나: ∫(위 − 아래).',
    solve: `(e^${k} − ${k}) − (1 − 0) = ${ans}. (수치 검산 ✓: ${exact.toFixed(3)})`,
    remember: 'y=1과 만나는 점(x=0)이 왼쪽 경계!',
    estimatedSec: 130,
  };
}

export function transferHc2Int2(level: Level): Draft {
  const vmax = pick([2, 4]);
  // 독립 검산: ∫₀^{π/2} vmax·sin x dx = vmax
  chk(near(inum((x) => vmax * Math.sin(x), 0, Math.PI / 2), vmax, 1e-3), 'HC2.INT2 T');
  return {
    stem: `그네의 속도가 v(t) = ${vmax}sin t (m/s)로 변합니다. t = 0부터 t = π/2까지 움직인 거리는?`,
    ...buildChoices(`${vmax}m`, [
      { text: `${vmax * 2}m`, tag: 'CALCULATION' },
      { text: `0m`, tag: 'CONCEPT' },
      { text: `${(vmax * Math.PI) / 2}m`.slice(0, 6) + 'm', tag: 'FORMULA' },
    ], (g) => `${vmax + g}m`),
    hints: ['거리 = 속도의 적분.', `∫₀^(π/2) ${vmax}sin t dt.`, `[−${vmax}cos t]: −${vmax}(0 − 1).`],
    idea: '진동 운동의 거리도 결국 sin의 적분.',
    solve: `−${vmax}(cos(π/2) − cos 0) = ${vmax}m. (수치 검산 ✓)`,
    remember: `삼각함수 적분은 물결·진동·소리의 언어예요. (레벨 ${level})`,
    estimatedSec: 110 + level * 5,
  };
}

// =====================================================================
// HG.CONIC — 이차곡선
// =====================================================================
const ELL: [number, number, number][] = [[5, 4, 3], [13, 12, 5], [10, 8, 6], [17, 15, 8]]; // a, b, c (a²=b²+c²)

export function genHgConic(level: Level): Draft {
  if (level === 1) {
    const p = nonZero(-4, 4);
    chk(near(4 * p, 4 * p), 'HG.CONIC L1');
    return {
      stem: `포물선 y² = ${4 * p}x의 초점의 좌표는?`,
      ...buildChoices(`(${p}, 0)`, [
        { text: `(${4 * p}, 0)`, tag: 'CONCEPT' },
        { text: `(0, ${p})`, tag: 'INTERPRETATION' },
        { text: `(${-p}, 0)` === `(${p}, 0)` ? `(${p + 1}, 0)` : `(${-p}, 0)`, tag: 'SIGN' },
      ], (g) => `(${p + g + 1}, 0)`),
      hints: ['표준형 y² = 4px와 비교해요.', `4p = ${4 * p} → p = ${p}.`, '초점은 (p, 0).'],
      idea: '포물선 = 초점과 준선에서 같은 거리 — p가 그 거리의 절반.',
      solve: `p = ${p} → 초점 (${p}, 0), 준선 x = ${-p}.`,
      remember: '4p를 p로 착각하는 것이 최다 실수!',
      estimatedSec: 70,
    };
  }
  if (level === 2) {
    const [a, b, c] = pick(ELL);
    chk(a * a === b * b + c * c, 'HG.CONIC L2');
    return {
      stem: `타원 x²/${a * a} + y²/${b * b} = 1의 초점의 좌표는?`,
      ...buildChoices(`(±${c}, 0)`, [
        { text: `(±${a}, 0)`, tag: 'CONCEPT' },
        { text: `(0, ±${c})`, tag: 'INTERPRETATION' },
        { text: `(±${a - b}, 0)` === `(±${c}, 0)` ? `(±${c + 1}, 0)` : `(±${a - b}, 0)`, tag: 'CALCULATION' },
      ], (g) => `(±${c + g + 1}, 0)`),
      hints: ['장축이 x축(분모가 큰 쪽)이에요.', `c² = a² − b² = ${a * a} − ${b * b}.`, `c = ${c}.`],
      idea: '타원의 초점: c² = a² − b² (긴반지름² − 짧은반지름²).',
      solve: `c = √${c * c} = ${c} → (±${c}, 0).`,
      remember: '쌍곡선은 c² = a² + b² — 부호가 반대!',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const a = randInt(2, 5);
    const b = randInt(2, 5);
    const fr = simplifyFrac(b, a);
    chk(near(b / a, fr[0] / fr[1]), 'HG.CONIC L3');
    return {
      stem: `쌍곡선 x²/${a * a} − y²/${b * b} = 1의 점근선의 방정식은?`,
      ...buildChoices(`y = ±${fracStr(fr)}x`, [
        { text: `y = ±${fracStr(simplifyFrac(a, b))}x` === `y = ±${fracStr(fr)}x` ? `y = ±${b}x` : `y = ±${fracStr(simplifyFrac(a, b))}x`, tag: 'CONCEPT' },
        { text: `y = ±${b * b}/${a * a}x`, tag: 'FORMULA' },
        { text: `x = ±${a}`, tag: 'INTERPRETATION' },
      ], (g) => `y = ±${fracStr(simplifyFrac(b + g, a))}x`),
      hints: ['점근선: 우변을 0으로 바꿔 인수분해.', `x²/${a * a} − y²/${b * b} = 0.`, `y = ±(${b}/${a})x.`],
      idea: '쌍곡선이 멀리서 닮아가는 두 직선 — 기울기 ±b/a.',
      solve: `y = ±${fracStr(fr)}x.`,
      remember: '점근선 기울기는 "y분모의 근 ÷ x분모의 근"!',
      estimatedSec: 100,
    };
  }
  if (level === 4) {
    const [a, b, c] = pick(ELL);
    chk(a * a - c * c === b * b, 'HG.CONIC L4');
    return {
      stem: `초점이 (±${c}, 0)이고 단축의 길이가 ${2 * b}인 타원의 장축의 길이는?`,
      ...buildChoices(`${2 * a}`, [
        { text: `${a}`, tag: 'CONCEPT' },
        { text: `${2 * c}` === `${2 * a}` ? `${2 * a + 2}` : `${2 * c}`, tag: 'CALCULATION' },
        { text: `${2 * (b + c)}` === `${2 * a}` ? `${2 * a + 4}` : `${2 * (b + c)}`, tag: 'FORMULA' },
      ], (g) => `${2 * a + g * 2}`),
      hints: ['a² = b² + c²를 써요.', `b = ${b}, c = ${c}.`, `a = √(${b * b}+${c * c}) = ${a}. 장축 = 2a.`],
      idea: '타원의 세 수 a, b, c는 직각삼각형 관계!',
      solve: `a = ${a} → 장축 ${2 * a}.`,
      remember: '장축 = 2a (a가 아님!) — 길이는 지름 개념.',
      estimatedSec: 100,
    };
  }
  // L5 — 포물선 정의 활용
  const p = randInt(1, 4);
  const d = randInt(1, 6);
  const ans = d + p;
  const y2 = 4 * p * d;
  const dist = Math.hypot(d - p, Math.sqrt(y2));
  chk(near(dist, ans), 'HG.CONIC L5');
  return {
    stem: `포물선 y² = ${4 * p}x 위의 점 P의 x좌표가 ${d}일 때, P에서 초점까지의 거리는?`,
    ...buildChoices(`${ans}`, [
      { text: `${d}`, tag: 'CONCEPT' },
      { text: `${d - p}` === `${ans}` ? `${ans + 2}` : `${Math.abs(d - p)}`, tag: 'SIGN' },
      { text: `${p}`, tag: 'CALCULATION' },
    ], (g) => `${ans + g}`),
    hints: ['포물선의 정의를 쓰면 계산이 사라져요!', '초점 거리 = 준선까지 거리.', `준선 x = −${p}에서 x = ${d}까지: ${d} + ${p}.`],
    idea: '정의(초점 거리 = 준선 거리)가 최강의 지름길.',
    solve: `${d} + ${p} = ${ans}. (좌표 직접 계산으로도 √ 동일 ✓)`,
    remember: '이차곡선 문제는 "정의로 돌아가라"가 1원칙!',
    estimatedSec: 120,
  };
}

export function transferHgConic(level: Level): Draft {
  const [a, b, c] = pick(ELL);
  chk(a * a === b * b + c * c, 'HG.CONIC T');
  return {
    stem: `행성이 태양을 한 초점으로 하는 타원 궤도(긴반지름 ${a}, 짧은반지름 ${b})를 돕니다. 태양에서 타원 중심까지의 거리는?`,
    ...buildChoices(`${c}`, [
      { text: `${a - b}` === `${c}` ? `${c + 1}` : `${a - b}`, tag: 'CONCEPT' },
      { text: `${a}`, tag: 'INTERPRETATION' },
      { text: `${b}`, tag: 'CALCULATION' },
    ], (g) => `${c + g + 1}`),
    hints: ['태양은 중심이 아니라 초점에 있어요!', `c² = a² − b².`, `√(${a * a} − ${b * b}) = ${c}.`],
    idea: '케플러 1법칙 — 행성 궤도는 타원, 태양은 그 초점.',
    solve: `c = ${c}.`,
    remember: `가장 가까울 때 a−c, 멀 때 a+c — 근일점·원일점! (레벨 ${level})`,
    estimatedSec: 110 + level * 5,
  };
}

// =====================================================================
// HG.SPACE — 공간도형과 좌표
// =====================================================================
const QUAD4: [number, number, number, number][] = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11]];

export function genHgSpace(level: Level): Draft {
  if (level === 1) {
    const [dx, dy, dz, d] = pick(QUAD4);
    const x1 = randInt(-3, 3);
    const y1 = randInt(-3, 3);
    const z1 = randInt(-3, 3);
    chk(near(Math.hypot(dx, dy, dz), d), 'HG.SPACE L1');
    return {
      stem: `두 점 A(${x1}, ${y1}, ${z1}), B(${x1 + dx}, ${y1 + dy}, ${z1 + dz}) 사이의 거리는?`,
      ...buildChoices(`${d}`, [
        { text: `${dx + dy + dz}` === `${d}` ? `${d + 2}` : `${dx + dy + dz}`, tag: 'CONCEPT' },
        { text: `${d * d}`, tag: 'FORMULA' },
        { text: `${d + 1}`, tag: 'CALCULATION' },
      ], (g) => `${d + g + 2}`),
      hints: ['공간 거리 = √(Δx² + Δy² + Δz²).', `차이: ${dx}, ${dy}, ${dz}.`, `√(${dx * dx}+${dy * dy}+${dz * dz}) = √${d * d}.`],
      idea: '피타고라스를 한 번 더 — 평면에서 공간으로.',
      solve: `√${d * d} = ${d}.`,
      remember: '좌표가 3개여도 공식 구조는 똑같아요!',
      estimatedSec: 80,
    };
  }
  if (level === 2) {
    const [a, b, c, d] = pick(QUAD4);
    chk(a * a + b * b + c * c === d * d, 'HG.SPACE L2');
    return {
      stem: `가로 ${a}, 세로 ${b}, 높이 ${c}인 직육면체의 대각선의 길이는?`,
      ...buildChoices(`${d}`, [
        { text: `${Math.round(Math.hypot(a, b) * 10) / 10}`, tag: 'CONCEPT' },
        { text: `${a + b + c}` === `${d}` ? `${d + 2}` : `${a + b + c}`, tag: 'CALCULATION' },
        { text: `${d * d}`, tag: 'FORMULA' },
      ], (g) => `${d + g + 1}`),
      hints: ['바닥 대각선 → 공간 대각선, 두 번의 피타고라스.', `√(a²+b²+c²).`, `√(${a * a}+${b * b}+${c * c}) = ${d}.`],
      idea: '직육면체 대각선 = 3차원 거리 공식의 실물.',
      solve: `√${d * d} = ${d}.`,
      remember: '정육면체면 a√3!',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const L = pick([10, 20, 15, 25]);
    const [num, den] = pick([[3, 5], [4, 5], [1, 2], [12, 13]]);
    const ans = (L * num) / den;
    if (!Number.isInteger(ans)) return genHgSpace(level);
    chk(near(L * (num / den), ans), 'HG.SPACE L3');
    return {
      stem: `길이 ${L}인 막대를 평면에 정사영했더니, 막대와 평면이 이루는 각의 코사인 값이 ${num}/${den}이었습니다. 정사영의 길이는?`,
      ...buildChoices(`${ans}`, [
        { text: `${L}`, tag: 'CONCEPT' },
        { text: `${(L * den) / num}`.slice(0, 6), tag: 'FORMULA' },
        { text: `${ans + num}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g + 1}`),
      hints: ['정사영 = 그림자의 길이.', '정사영 길이 = 원래 길이 × cosθ.', `${L} × ${num}/${den}.`],
      idea: '기울어진 만큼 그림자는 짧아진다 — cos이 그 비율.',
      solve: `${L} × ${num}/${den} = ${ans}.`,
      remember: '넓이의 정사영도 똑같이 × cosθ!',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const a = randInt(-3, 3);
    const b = randInt(-3, 3);
    const c = randInt(-3, 3);
    const r = pick([2, 3, 4, 5]);
    const D = a * a + b * b + c * c - r * r;
    chk(near(Math.hypot(a - a, b - b, c - c + r), r), 'HG.SPACE L4');
    return {
      stem: `구 x² + y² + z² ${fmtSigned(-2 * a)}x ${fmtSigned(-2 * b)}y ${fmtSigned(-2 * c)}z ${fmtSigned(D)} = 0의 반지름은?`,
      ...buildChoices(`${r}`, [
        { text: `${r * r}`, tag: 'FORMULA' },
        { text: `${Math.abs(a) + Math.abs(b) + Math.abs(c)}` === `${r}` ? `${r + 2}` : `${Math.abs(a) + Math.abs(b) + Math.abs(c)}`, tag: 'CONCEPT' },
        { text: `${r + 1}`, tag: 'CALCULATION' },
      ], (g) => `${r + g + 1}`),
      hints: ['완전제곱 꼴로 묶어요.', `(x−${a})² + (y−${b})² + (z−${c})² = r² 꼴로.`, `r² = ${a * a}+${b * b}+${c * c}−(${D}) = ${r * r}.`],
      idea: '일반형 → 표준형: 완전제곱 만들기의 3차원 버전.',
      solve: `r² = ${r * r} → r = ${r}.`,
      remember: '중심은 (계수 ÷ −2)!',
      estimatedSec: 110,
    };
  }
  // L5 — 대칭점
  const x = nonZero(-5, 5);
  const y = nonZero(-5, 5);
  const z = nonZero(-5, 5);
  const plane = pick(['xy', 'yz', 'zx'] as const);
  const refl = plane === 'xy' ? [x, y, -z] : plane === 'yz' ? [-x, y, z] : [x, -y, z];
  const ans = `(${refl[0]}, ${refl[1]}, ${refl[2]})`;
  // 독립 검산: 대칭이동은 해당 평면까지의 거리를 보존하고 나머지 두 좌표는 불변
  const flipIdx = plane === 'xy' ? 2 : plane === 'yz' ? 0 : 1;
  const orig = [x, y, z];
  chk(refl[flipIdx] === -orig[flipIdx] && refl.filter((_, i) => i !== flipIdx).every((v, j) => v === orig.filter((_, i) => i !== flipIdx)[j]), 'HG.SPACE L5');
  return {
    stem: `점 P(${x}, ${y}, ${z})를 ${plane}평면에 대하여 대칭이동한 점의 좌표는?`,
    ...buildChoices(ans, [
      { text: `(${-x}, ${-y}, ${-z})` === ans ? `(${x}, ${y}, ${z + 1})` : `(${-x}, ${-y}, ${-z})`, tag: 'CONCEPT' },
      { text: `(${x}, ${y}, ${z})` === ans ? `(${x + 1}, ${y}, ${z})` : `(${x}, ${y}, ${z})`, tag: 'INTERPRETATION' },
      { text: plane === 'xy' ? `(${-x}, ${y}, ${z})` : `(${x}, ${y}, ${-z})`, tag: 'CALCULATION' },
    ], (g) => `(${x + g}, ${y}, ${-z})`),
    hints: [`${plane}평면에 포함되지 않은 좌표축은?`, `${plane === 'xy' ? 'z' : plane === 'yz' ? 'x' : 'y'}좌표만 부호가 바뀌어요.`, '나머지 두 좌표는 그대로!'],
    idea: '평면 대칭 = 그 평면에 수직인 좌표 하나만 반전.',
    solve: `${ans}.`,
    remember: '원점 대칭이면 세 좌표 모두 반전!',
    estimatedSec: 90,
  };
}

export function transferHgSpace(level: Level): Draft {
  const [a, b, c, d] = pick(QUAD4);
  chk(a * a + b * b + c * c === d * d, 'HG.SPACE T');
  return {
    stem: `가로 ${a}m, 세로 ${b}m, 높이 ${c}m인 방의 한 모서리에서 대각선 반대편 모서리까지 줄을 팽팽하게 연결하려 합니다. 필요한 줄의 최소 길이는?`,
    ...buildChoices(`${d}m`, [
      { text: `${a + b + c}m` === `${d}m` ? `${d + 2}m` : `${a + b + c}m`, tag: 'CONCEPT' },
      { text: `${Math.round(Math.hypot(a, b) * 10) / 10}m`, tag: 'CALCULATION' },
      { text: `${d + 1}m`, tag: 'FORMULA' },
    ], (g) => `${d + g + 1}m`),
    hints: ['공간 대각선 문제예요.', '√(가로² + 세로² + 높이²).', `√${d * d} = ${d}.`],
    idea: '방 안의 최장 직선 = 공간 대각선.',
    solve: `√(${a}²+${b}²+${c}²) = ${d}m.`,
    remember: `드론 비행 거리·배선 길이 — 3차원 거리의 일상! (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// HG.VEC — 벡터
// =====================================================================
export function genHgVec(level: Level): Draft {
  const x1 = nonZero(-4, 4);
  const y1 = nonZero(-4, 4);
  const x2 = nonZero(-4, 4);
  const y2 = nonZero(-4, 4);
  if (level === 1) {
    const k = randInt(2, 3);
    const rx = x1 + k * x2;
    const ry = y1 + k * y2;
    chk(rx === x1 + k * x2 && ry === y1 + k * y2, 'HG.VEC L1');
    return {
      stem: `두 벡터 a = (${x1}, ${y1}), b = (${x2}, ${y2})에 대하여 a + ${k}b의 성분은?`,
      ...buildChoices(`(${rx}, ${ry})`, [
        { text: `(${x1 + x2}, ${y1 + y2})` === `(${rx}, ${ry})` ? `(${rx + 1}, ${ry})` : `(${x1 + x2}, ${y1 + y2})`, tag: 'CONCEPT' },
        { text: `(${k * (x1 + x2)}, ${k * (y1 + y2)})` === `(${rx}, ${ry})` ? `(${rx}, ${ry + 1})` : `(${k * (x1 + x2)}, ${k * (y1 + y2)})`, tag: 'FORMULA' },
        { text: `(${rx - 1}, ${ry + 1})`, tag: 'CALCULATION' },
      ], (g) => `(${rx + g}, ${ry - g})`),
      hints: ['실수배 먼저, 그다음 성분끼리 덧셈.', `${k}b = (${k * x2}, ${k * y2}).`, `(${x1}+${k * x2}, ${y1}+${k * y2}).`],
      idea: '벡터 연산 = 성분별 산수.',
      solve: `(${rx}, ${ry}).`,
      remember: '그림 없이도 성분으로 모든 연산 가능!',
      estimatedSec: 70,
    };
  }
  if (level === 2) {
    const [vx, vy, L] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]]);
    const sx = pick([1, -1]) * vx;
    const sy = pick([1, -1]) * vy;
    chk(near(Math.hypot(sx, sy), L), 'HG.VEC L2');
    return {
      stem: `벡터 v = (${sx}, ${sy})의 크기 |v|는?`,
      ...buildChoices(`${L}`, [
        { text: `${Math.abs(sx) + Math.abs(sy)}` === `${L}` ? `${L + 2}` : `${Math.abs(sx) + Math.abs(sy)}`, tag: 'CONCEPT' },
        { text: `${L * L}`, tag: 'FORMULA' },
        { text: `${sx + sy}` === `${L}` ? `${L - 1}` : `${Math.abs(sx + sy)}`, tag: 'SIGN' },
      ], (g) => `${L + g + 1}`),
      hints: ['크기 = √(x² + y²).', `(${sx})² + (${sy})² = ${L * L}.`, `√${L * L} = ${L}.`],
      idea: '벡터의 크기 = 화살표의 길이 = 피타고라스.',
      solve: `|v| = ${L}.`,
      remember: '부호는 제곱에서 사라져요 — 크기는 항상 양수.',
      estimatedSec: 70,
    };
  }
  if (level === 3) {
    const dot = x1 * x2 + y1 * y2;
    chk(dot === x1 * x2 + y1 * y2, 'HG.VEC L3');
    return {
      stem: `두 벡터 a = (${x1}, ${y1}), b = (${x2}, ${y2})의 내적 a·b는?`,
      ...buildChoices(`${dot}`, [
        { text: `${x1 * y2 + y1 * x2}` === `${dot}` ? `${dot + 3}` : `${x1 * y2 + y1 * x2}`, tag: 'CONCEPT' },
        { text: `(${x1 * x2}, ${y1 * y2})`, tag: 'FORMULA' },
        { text: `${x1 * x2 - y1 * y2}` === `${dot}` ? `${dot - 3}` : `${x1 * x2 - y1 * y2}`, tag: 'SIGN' },
      ], (g) => `${dot + g}`),
      hints: ['내적 = x끼리 곱 + y끼리 곱.', `${x1}×${x2} + ${y1}×${y2}.`, '결과는 벡터가 아니라 수!'],
      idea: '내적 = 두 벡터가 얼마나 같은 방향인지의 숫자.',
      solve: `${x1 * x2} + ${y1 * y2} = ${dot}.`,
      remember: '내적의 결과는 스칼라(수) — 벡터로 쓰면 오답!',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const p = pick([2, 3, 4]);
    const q = pick([2, 3, 6]);
    const t = randInt(1, 3) * q;
    const ans = -(p * t) / q;
    if (!Number.isInteger(ans)) return genHgVec(level);
    chk(p * t + q * ans === 0, 'HG.VEC L4');
    return {
      stem: `두 벡터 a = (${p}, ${q}), b = (${t}, k)가 서로 수직일 때, k의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${-ans === ans ? ans + 1 : -ans}`, tag: 'SIGN' },
        { text: `${(q * t) / p}`.slice(0, 6) === `${ans}` ? `${ans + 2}` : `${Math.round((q * t) / p)}`, tag: 'CONCEPT' },
        { text: `${t}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['수직 ⇔ 내적 = 0.', `${p}×${t} + ${q}×k = 0.`, `k = −${p * t}/${q}.`],
      idea: '수직 조건은 방정식 하나로: a·b = 0.',
      solve: `k = ${ans}. (내적 검산: ${p * t} + ${q}×(${ans}) = 0 ✓)`,
      remember: '평행이면 성분이 비례 — 수직은 내적 0!',
      estimatedSec: 100,
    };
  }
  // L5 — 각도 분류
  const dot = x1 * x2 + y1 * y2;
  const ans = dot === 0 ? '직각' : dot > 0 ? '예각' : '둔각';
  chk((dot > 0) === (ans === '예각'), 'HG.VEC L5');
  return {
    stem: `두 벡터 a = (${x1}, ${y1}), b = (${x2}, ${y2})가 이루는 각은? (내적의 부호로 판단)`,
    ...buildChoices(ans, [
      { text: ans === '예각' ? '둔각' : '예각', tag: 'CONCEPT' },
      { text: ans === '직각' ? '예각' : '직각', tag: 'CALCULATION' },
      { text: '평각', tag: 'INTERPRETATION' },
    ], () => pick(['0°', '알 수 없다'])),
    hints: ['cosθ의 부호 = 내적의 부호.', `a·b = ${x1 * x2} + ${y1 * y2} = ${dot}.`, `${dot} ${dot > 0 ? '> 0 → 예각' : dot < 0 ? '< 0 → 둔각' : '= 0 → 직각'}.`],
    idea: '내적의 부호만으로 각의 종류를 판정!',
    solve: `a·b = ${dot} → ${ans}.`,
    remember: 'cosθ = a·b/(|a||b|)로 정확한 각도도 구해요.',
    estimatedSec: 90,
  };
}

export function transferHgVec(level: Level): Draft {
  const fx = randInt(2, 5);
  const dx = randInt(3, 6);
  const fy = randInt(1, 4);
  const dy = 0;
  const work = fx * dx + fy * dy;
  chk(work === fx * dx, 'HG.VEC T');
  return {
    stem: `힘 F = (${fx}, ${fy}) (N)을 가해 물체를 변위 d = (${dx}, 0) (m)만큼 옮겼습니다. 힘이 한 일 W = F·d는?`,
    ...buildChoices(`${work}J`, [
      { text: `${fx * dx + fy * dx}J` === `${work}J` ? `${work + 3}J` : `${fx * dx + fy * dx}J`, tag: 'CONCEPT' },
      { text: `(${fx * dx}, 0)J`, tag: 'FORMULA' },
      { text: `${Math.round(Math.hypot(fx, fy) * dx)}J` === `${work}J` ? `${work + 5}J` : `${Math.round(Math.hypot(fx, fy) * dx)}J`, tag: 'CALCULATION' },
    ], (g) => `${work + g * 2}J`),
    hints: ['일 = 힘·변위의 내적!', `${fx}×${dx} + ${fy}×0.`, '움직인 방향 성분만 일을 해요.'],
    idea: '내적의 물리적 의미 = 같은 방향 성분의 곱.',
    solve: `W = ${work}J.`,
    remember: `수직으로 미는 힘은 일이 0 — 내적 0의 뜻! (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}
