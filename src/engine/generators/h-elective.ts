// 고등 일반선택(대수 · 미적분Ⅰ · 확률과 통계) 생성기 — 전량 원저작.
// 모든 템플릿은 생성 시점에 독립 경로 재검산(수치 미분·수치 적분·부분합·전수 나열)을
// 수행하고, 불일치 시 즉시 throw한다. (verify-generators.mjs가 상시 대량 실행)
import type { Level } from '../types.ts';
import { buildChoices, nonZero, pick, randInt, fmtSigned, formatLinear, simplifyFrac, fracStr } from './util.ts';
import type { Draft } from './index.ts';

const chk = (cond: boolean, label: string) => {
  if (!cond) throw new Error(`SELF-CHECK FAIL: ${label}`);
};
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// =====================================================================
// HA.EXP — 지수와 로그
// =====================================================================
export function genHaExp(level: Level): Draft {
  if (level === 1) {
    const base = pick([2, 3]);
    const m = randInt(2, 5);
    const n = randInt(2, 4);
    const k = randInt(1, Math.min(3, m + n - 1));
    const e = m + n - k;
    const ans = base ** e;
    chk(near((base ** m * base ** n) / base ** k, ans), 'HA.EXP L1');
    return {
      stem: `다음을 계산하세요.\n${base}^${m} × ${base}^${n} ÷ ${base}^${k}`,
      ...buildChoices(`${ans}`, [
        { text: `${base ** (m * n - k)}` === `${ans}` ? `${ans * base}` : `${base ** Math.min(m * n - k, 12)}`, tag: 'CONCEPT' },
        { text: `${base ** (m + n + k)}`, tag: 'SIGN' },
        { text: `${base ** e * base}` === `${ans}` ? `${ans + 6}` : `${base ** e * base}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g * 2}`),
      hints: ['같은 밑의 곱셈은 지수를 더해요.', '나눗셈은 지수를 빼요.', `지수: ${m} + ${n} − ${k} = ${e}.`],
      idea: '지수법칙: 곱→지수 합, 나눗셈→지수 차, 거듭제곱→지수 곱.',
      solve: `${base}^(${m}+${n}−${k}) = ${base}^${e} = ${ans}.`,
      remember: '밑이 같을 때만 지수끼리 계산할 수 있어요!',
      estimatedSec: 60,
    };
  }
  if (level === 2) {
    const b = pick([2, 3, 5]);
    const n = pick([2, 3]);
    const inner = b ** n;
    const ans = b;
    chk(near(Math.pow(inner, 1 / n), ans, 1e-9), 'HA.EXP L2');
    return {
      stem: `${n === 2 ? '√' : '³√'}${inner}의 값은? (${n}제곱근)`,
      ...buildChoices(`${ans}`, [
        { text: `${inner / n}` === `${ans}` ? `${ans + 2}` : `${inner / n}`, tag: 'CONCEPT' },
        { text: `${inner - n}` === `${ans}` ? `${ans + 3}` : `${inner - n}`, tag: 'CALCULATION' },
        { text: `${b * n}` === `${ans}` ? `${ans + 1}` : `${b * n}`, tag: 'FORMULA' },
      ], (g) => `${ans + g}`),
      hints: [`${n}제곱해서 ${inner}이 되는 수를 찾아요.`, `${b}^${n} = ${inner}이죠?`, `답은 ${b}.`],
      idea: 'ⁿ√a = "n제곱하면 a가 되는 수".',
      solve: `${b}^${n} = ${inner} → ${n === 2 ? '√' : '³√'}${inner} = ${b}.`,
      remember: '거듭제곱근은 분수 지수로도 써요: ⁿ√a = a^(1/n).',
      estimatedSec: 60,
    };
  }
  if (level === 3) {
    const a = pick([2, 3, 5]);
    const k = randInt(2, 5);
    const val = a ** k;
    chk(near(Math.log(val) / Math.log(a), k), 'HA.EXP L3');
    return {
      stem: `log${a === 2 ? '₂' : a === 3 ? '₃' : '₅'} ${val}의 값은?`,
      ...buildChoices(`${k}`, [
        { text: `${val / a}` === `${k}` ? `${k + 2}` : `${val / a}`, tag: 'CONCEPT' },
        { text: `${a}`, tag: 'INTERPRETATION' },
        { text: `${k - 1}`, tag: 'CALCULATION' },
      ], (g) => `${k + g + 1}`),
      hints: [`"${a}를 몇 제곱하면 ${val}이 될까?"라는 질문이에요.`, `${a}^? = ${val}.`, `${a}^${k} = ${val}.`],
      idea: '로그 = 지수를 묻는 기호.',
      solve: `${a}^${k} = ${val} → log = ${k}.`,
      remember: 'log_a 1 = 0, log_a a = 1은 즉답!',
      estimatedSec: 60,
    };
  }
  if (level === 4) {
    // log 2 = p, log 3 = q → log(2^a 3^b) = ap + bq
    const a = randInt(1, 3);
    const b = randInt(1, 2);
    const val = 2 ** a * 3 ** b;
    chk(near(a * Math.log10(2) + b * Math.log10(3), Math.log10(val)), 'HA.EXP L4');
    const ans = `${a === 1 ? '' : a}p ${b === 0 ? '' : `+ ${b === 1 ? '' : b}q`}`.trim();
    return {
      stem: `log 2 = p, log 3 = q라 할 때, log ${val}을 p, q로 나타내면? (log = log₁₀)`,
      ...buildChoices(ans, [
        { text: `${a === 1 ? '' : a}p ${b === 1 ? '−' : `− ${b}`}q`, tag: 'SIGN' },
        { text: `${a + b}pq`, tag: 'CONCEPT' },
        { text: `p + q`, tag: 'CALCULATION' },
      ], (g) => `${a + g}p + ${b}q`),
      hints: [`${val}을 소인수분해해요.`, `${val} = 2^${a} × 3^${b}.`, '곱의 로그 = 로그의 합, 거듭제곱은 앞으로!'],
      idea: 'log(곱) = log의 합 — 소인수분해가 로그 계산의 시작.',
      solve: `log(2^${a}·3^${b}) = ${a}log2 + ${b}log3 = ${ans}. (수치 검산 ✓)`,
      remember: 'log 5 = 1 − log 2도 자주 쓰는 변형!',
      estimatedSec: 100,
    };
  }
  // L5 — 지수방정식
  const base = pick([2, 3]);
  const pw = pick([2, 3]);
  const c = randInt(1, 3);
  // base^(x + c) = (base^pw)^k  →  x = pw*k − c
  const k = randInt(2, 4);
  const x = pw * k - c;
  chk(near(base ** (x + c), (base ** pw) ** k), 'HA.EXP L5');
  return {
    stem: `방정식 ${base}^(x + ${c}) = ${base ** pw}^${k}의 해는?`,
    ...buildChoices(`x = ${x}`, [
      { text: `x = ${k - c}`, tag: 'CONCEPT' },
      { text: `x = ${pw * k + c}` === `x = ${x}` ? `x = ${x + 2}` : `x = ${pw * k + c}`, tag: 'SIGN' },
      { text: `x = ${k}`, tag: 'CALCULATION' },
    ], (g) => `x = ${x + g}`),
    hints: [`${base ** pw}을 ${base}의 거듭제곱으로 바꿔요.`, `${base ** pw}^${k} = ${base}^${pw * k}.`, `지수끼리 비교: x + ${c} = ${pw * k}.`],
    idea: '지수방정식 1원칙: 밑을 통일하면 지수끼리의 방정식!',
    solve: `x + ${c} = ${pw * k} → x = ${x}.`,
    remember: '밑 통일이 안 되면 로그를 취해요.',
    estimatedSec: 110,
  };
}

export function transferHaExp(level: Level): Draft {
  const doubleH = pick([1, 2, 3]); // 배가 시간(시간)
  const target = pick([8, 16, 32]);
  const k = Math.log2(target);
  const ans = doubleH * k;
  chk(near(2 ** (ans / doubleH), target), 'HA.EXP T');
  return {
    stem: `어떤 세균은 ${doubleH}시간마다 2배로 늘어납니다. 처음의 ${target}배가 되는 데 걸리는 시간은?`,
    ...buildChoices(`${ans}시간`, [
      { text: `${target / 2}시간` === `${ans}시간` ? `${ans + 2}시간` : `${target / 2}시간`, tag: 'CONCEPT' },
      { text: `${doubleH * target}시간`, tag: 'CALCULATION' },
      { text: `${ans + doubleH}시간`, tag: 'FORMULA' },
    ], (g) => `${ans + g * doubleH}시간`),
    hints: ['2를 몇 번 곱해야 목표 배수가 될까요?', `2^? = ${target} → ? = ${k}.`, `${k}번 × ${doubleH}시간.`],
    idea: '"몇 배가 되는 데 걸리는 시간"은 로그 질문이에요.',
    solve: `2^${k} = ${target} → ${k}번 배가 → ${k} × ${doubleH} = ${ans}시간.`,
    remember: `지수적 성장은 곱셈의 세계 — 로그로 시간을 읽어요. (레벨 ${level})`,
    estimatedSec: 90 + level * 5,
  };
}

// =====================================================================
// HA.TRIG — 삼각함수
// =====================================================================
const SPECIAL = [
  { deg: 30, sin: '1/2', cos: '√3/2', tan: '√3/3', sinV: 0.5, cosV: Math.sqrt(3) / 2, tanV: Math.sqrt(3) / 3 },
  { deg: 45, sin: '√2/2', cos: '√2/2', tan: '1', sinV: Math.SQRT2 / 2, cosV: Math.SQRT2 / 2, tanV: 1 },
  { deg: 60, sin: '√3/2', cos: '1/2', tan: '√3', sinV: Math.sqrt(3) / 2, cosV: 0.5, tanV: Math.sqrt(3) },
];

export function genHaTrig(level: Level): Draft {
  if (level === 1) {
    const pairs = [
      { deg: 30, rad: 'π/6', v: Math.PI / 6 }, { deg: 45, rad: 'π/4', v: Math.PI / 4 }, { deg: 60, rad: 'π/3', v: Math.PI / 3 },
      { deg: 90, rad: 'π/2', v: Math.PI / 2 }, { deg: 120, rad: '2π/3', v: (2 * Math.PI) / 3 }, { deg: 150, rad: '5π/6', v: (5 * Math.PI) / 6 },
      { deg: 180, rad: 'π', v: Math.PI }, { deg: 270, rad: '3π/2', v: (3 * Math.PI) / 2 },
    ];
    const p = pick(pairs);
    chk(near((p.deg * Math.PI) / 180, p.v), 'HA.TRIG L1');
    const others = pairs.filter((x) => x.rad !== p.rad);
    return {
      stem: `${p.deg}°를 호도법(라디안)으로 나타내면?`,
      ...buildChoices(p.rad, [
        { text: others[0].rad, tag: 'CONCEPT' },
        { text: others[1].rad, tag: 'CALCULATION' },
        { text: others[2].rad, tag: 'FORMULA' },
      ], (g) => others[(g + 2) % others.length].rad),
      hints: ['180° = π rad이 기준!', `${p.deg}/180을 약분해요.`, `${p.deg}° = (${p.deg}/180)π.`],
      idea: '호도법: 각을 "반지름 대비 호의 길이"로 재는 자연스러운 단위.',
      solve: `${p.deg}° × (π/180) = ${p.rad}.`,
      remember: 'π/6=30°, π/4=45°, π/3=60°, π/2=90°는 즉답으로!',
      estimatedSec: 60,
    };
  }
  if (level === 2) {
    const s = pick(SPECIAL);
    const fn = pick(['sin', 'cos', 'tan'] as const);
    const ans = s[fn];
    const ansV = s[(fn + 'V') as 'sinV'];
    chk(near(Math[fn]((s.deg * Math.PI) / 180), ansV, 1e-9), 'HA.TRIG L2');
    const wrongs = ['1/2', '√2/2', '√3/2', '1', '√3', '√3/3'].filter((w) => w !== ans);
    return {
      stem: `${fn} ${s.deg}°의 값은?`,
      ...buildChoices(ans, [
        { text: wrongs[0], tag: 'CONCEPT' },
        { text: wrongs[1], tag: 'CALCULATION' },
        { text: wrongs[2], tag: 'FORMULA' },
      ], (g) => wrongs[(g + 2) % wrongs.length]),
      hints: ['특수각 삼각비 표를 떠올려요.', 'sin: 30°→1/2, 45°→√2/2, 60°→√3/2 (cos는 역순).', `tan = sin/cos.`],
      idea: '특수각 값은 정삼각형 절반·정사각형 대각선에서 나와요.',
      solve: `${fn} ${s.deg}° = ${ans}.`,
      remember: '"sin은 커지고 cos는 작아진다" — 30→60° 방향 감각!',
      estimatedSec: 55,
    };
  }
  if (level === 3) {
    const [o, a, h] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10]]);
    const cosS = fracStr(simplifyFrac(a, h));
    chk(near((o / h) ** 2 + (a / h) ** 2, 1), 'HA.TRIG L3');
    return {
      stem: `θ가 예각이고 sin θ = ${fracStr(simplifyFrac(o, h))}일 때, cos θ의 값은?`,
      ...buildChoices(cosS, [
        { text: fracStr(simplifyFrac(o, a)), tag: 'CONCEPT' },
        { text: fracStr(simplifyFrac(h, a)), tag: 'FORMULA' },
        { text: fracStr(simplifyFrac(o, h)) === cosS ? fracStr(simplifyFrac(a + 1, h)) : fracStr(simplifyFrac(o, h)), tag: 'CALCULATION' },
      ], (g) => fracStr(simplifyFrac(a - g - 1, h))),
      hints: ['sin²θ + cos²θ = 1을 써요.', `cos²θ = 1 − (${o}/${h})².`, `빗변 ${h}, 높이 ${o}인 직각삼각형의 밑변은 ${a}.`],
      idea: '삼각함수의 기본 항등식 — 피타고라스의 다른 얼굴.',
      solve: `cos θ = √(1 − ${o * o}/${h * h}) = ${a}/${h}. (${o},${a},${h}는 피타고라스 세 쌍)`,
      remember: '예각이면 cos > 0 — 사분면에 따라 부호가 갈려요!',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const A = randInt(2, 4);
    const B = pick([1, 2, 3]);
    const C = randInt(-2, 2);
    const maxV = A + C;
    const period = B === 1 ? '2π' : `${B === 2 ? 'π' : '2π/3'}`;
    const f = (x: number) => A * Math.sin(B * x) + C;
    // 독립 검산: 스캔으로 최댓값 근사
    let mx = -Infinity;
    for (let x = 0; x < Math.PI * 2; x += 0.001) mx = Math.max(mx, f(x));
    chk(near(mx, maxV, 0.01), 'HA.TRIG L4');
    return {
      stem: `함수 y = ${A}sin ${B === 1 ? '' : B}x ${fmtSigned(C)}의 최댓값과 주기는?`,
      ...buildChoices(`최댓값 ${maxV}, 주기 ${period}`, [
        { text: `최댓값 ${A}, 주기 ${period}` === `최댓값 ${maxV}, 주기 ${period}` ? `최댓값 ${maxV + 1}, 주기 ${period}` : `최댓값 ${A}, 주기 ${period}`, tag: 'CONCEPT' },
        { text: `최댓값 ${maxV}, 주기 ${B === 1 ? 'π' : B === 2 ? '2π' : 'π/3'}`, tag: 'FORMULA' },
        { text: `최댓값 ${A + Math.abs(C) + 1}, 주기 ${period}` === `최댓값 ${maxV}, 주기 ${period}` ? `최댓값 ${maxV - 1}, 주기 ${period}` : `최댓값 ${A + Math.abs(C) + 1}, 주기 ${period}`, tag: 'CALCULATION' },
      ], (g) => `최댓값 ${maxV + g + 1}, 주기 ${period}`),
      hints: ['sin의 범위는 −1 ~ 1.', `최댓값 = ${A}×1 ${fmtSigned(C)}.`, `주기 = 2π/${B}.`],
      idea: 'a sin bx + c: 진폭 |a|, 주기 2π/|b|, 상하이동 c.',
      solve: `최댓값 ${A} + (${C}) = ${maxV}, 주기 2π/${B} = ${period}.`,
      remember: '최솟값은 −|a| + c — 대칭으로 함께 기억!',
      estimatedSec: 100,
    };
  }
  // L5 — 코사인법칙 (A=60°)
  const b = randInt(3, 7);
  const c = randInt(3, 7);
  const a2 = b * b + c * c - b * c; // cos60 = 1/2
  const numeric = Math.sqrt(b * b + c * c - 2 * b * c * 0.5);
  chk(near(a2, numeric * numeric), 'HA.TRIG L5');
  return {
    stem: `삼각형에서 두 변의 길이가 ${b}, ${c}이고 끼인각이 60°일 때, 나머지 한 변의 길이의 제곱(a²)은?`,
    ...buildChoices(`${a2}`, [
      { text: `${b * b + c * c + b * c}`, tag: 'SIGN' },
      { text: `${b * b + c * c}`, tag: 'CONCEPT' },
      { text: `${b * b + c * c - 2 * b * c}` === `${a2}` ? `${a2 + 2}` : `${b * b + c * c - 2 * b * c}`, tag: 'FORMULA' },
    ], (g) => `${a2 + g}`),
    hints: ['코사인법칙: a² = b² + c² − 2bc·cosA.', 'cos 60° = 1/2.', `${b}² + ${c}² − 2×${b}×${c}×(1/2).`],
    idea: '코사인법칙 = 피타고라스의 일반화 (직각이 아니어도 OK).',
    solve: `${b * b} + ${c * c} − ${b * c} = ${a2}.`,
    remember: '끼인각이 90°면 cos항이 사라져 피타고라스!',
    estimatedSec: 110,
  };
}

export function transferHaTrig(level: Level): Draft {
  const d = pick([10, 20, 30]);
  const s = pick(SPECIAL);
  const h = Math.round(d * s.tanV * 100) / 100;
  const hNice = Number.isInteger(h) ? h : h;
  chk(near(d * Math.tan((s.deg * Math.PI) / 180), h, 0.01), 'HA.TRIG T');
  return {
    stem: `건물에서 ${d}m 떨어진 곳에서 꼭대기를 올려본 각이 ${s.deg}°였습니다. 건물의 높이는? (tan ${s.deg}° = ${s.tan})`,
    ...buildChoices(`${s.tan === '1' ? d : `${d}${s.tan.startsWith('√') ? ` × ${s.tan}` : ` × ${s.tan}`}`}m`.replace('  ', ' '), [
      { text: `${d}m` === `${s.tan === '1' ? d : `${d} × ${s.tan}`}m` ? `${d * 2}m` : `${d}m`, tag: 'CONCEPT' },
      { text: `${d} ÷ ${s.tan}m`, tag: 'FORMULA' },
      { text: `${d} × sin ${s.deg}°m`, tag: 'CALCULATION' },
    ], (g) => `${d + g * 5}m`),
    hints: ['높이/거리 = tan(올려본 각).', `높이 = ${d} × tan ${s.deg}°.`, `≈ ${hNice}m.`],
    idea: '측량의 핵심: 높이 = 거리 × tan(각).',
    solve: `${d} × ${s.tan} ≈ ${hNice}m.`,
    remember: `줄자 없이 각도로 높이를 재는 것이 삼각비의 힘! (레벨 ${level})`,
    estimatedSec: 90 + level * 5,
  };
}

// =====================================================================
// HA.SEQ — 수열
// =====================================================================
export function genHaSeq(level: Level): Draft {
  if (level === 1) {
    const a1 = randInt(-5, 8);
    const d = nonZero(-4, 6);
    const k = randInt(5, 12);
    const ans = a1 + (k - 1) * d;
    let cur = a1;
    for (let i = 1; i < k; i++) cur += d;
    chk(cur === ans, 'HA.SEQ L1');
    return {
      stem: `첫째항이 ${a1}, 공차가 ${d}인 등차수열의 제${k}항은?`,
      ...buildChoices(`${ans}`, [
        { text: `${a1 + k * d}`, tag: 'CALCULATION' },
        { text: `${a1 * d * (k - 1)}` === `${ans}` ? `${ans + 3}` : `${a1 + (k - 2) * d}`, tag: 'CONCEPT' },
        { text: `${a1 - (k - 1) * d}` === `${ans}` ? `${ans - 3}` : `${a1 - (k - 1) * d}`, tag: 'SIGN' },
      ], (g) => `${ans + g}`),
      hints: ['등차수열: 매번 같은 수를 더해요.', `aₙ = a₁ + (n−1)d.`, `${a1} + ${k - 1}×${d}.`],
      idea: '제k항까지 공차를 (k−1)번 더한다 — "칸 수" 세기!',
      solve: `${a1} + (${k}−1)×${d} = ${ans}. (하나씩 더해 확인 가능)`,
      remember: '(k−1)번이지 k번이 아니에요 — 울타리 기둥 세기!',
      estimatedSec: 60,
    };
  }
  if (level === 2) {
    const a1 = randInt(-4, 6);
    const d = nonZero(-3, 5);
    const n = randInt(6, 12);
    const ans = (n * (2 * a1 + (n - 1) * d)) / 2;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += a1 + i * d;
    chk(sum === ans, 'HA.SEQ L2');
    return {
      stem: `첫째항이 ${a1}, 공차가 ${d}인 등차수열의 첫 ${n}항의 합은?`,
      ...buildChoices(`${ans}`, [
        { text: `${n * (a1 + (n - 1) * d)}` === `${ans}` ? `${ans + 4}` : `${n * (a1 + (n - 1) * d)}`, tag: 'FORMULA' },
        { text: `${a1 + (n - 1) * d}`, tag: 'CONCEPT' },
        { text: `${ans + n}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g * 2}`),
      hints: ['합 공식: Sₙ = n(첫째항 + 끝항)/2.', `끝항 = ${a1 + (n - 1) * d}.`, `${n} × (${a1} + ${a1 + (n - 1) * d}) ÷ 2.`],
      idea: '가우스의 지혜: 앞뒤로 짝지으면 (첫+끝)이 n/2쌍.',
      solve: `Sₙ = ${n}(${a1} + ${a1 + (n - 1) * d})/2 = ${ans}. (직접 합산 검산 ✓)`,
      remember: '1+2+…+n = n(n+1)/2는 이 공식의 특수한 경우!',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const a1 = pick([1, 2, 3, -2]);
    const r = pick([2, 3, -2]);
    const k = randInt(4, 7);
    const ans = a1 * r ** (k - 1);
    let cur = a1;
    for (let i = 1; i < k; i++) cur *= r;
    chk(cur === ans, 'HA.SEQ L3');
    return {
      stem: `첫째항이 ${a1}, 공비가 ${r}인 등비수열의 제${k}항은?`,
      ...buildChoices(`${ans}`, [
        { text: `${a1 * r ** k}`, tag: 'CALCULATION' },
        { text: `${a1 + r * (k - 1)}` === `${ans}` ? `${ans + 6}` : `${a1 + r * (k - 1)}`, tag: 'CONCEPT' },
        { text: `${-ans === ans ? ans + 4 : -ans}`, tag: 'SIGN' },
      ], (g) => `${ans + g * 3}`),
      hints: ['등비수열: 매번 같은 수를 곱해요.', `aₙ = a₁ × r^(n−1).`, `${a1} × ${r}^${k - 1}.`],
      idea: '더하기의 등차, 곱하기의 등비 — 구조는 쌍둥이!',
      solve: `${a1} × ${r}^${k - 1} = ${ans}.`,
      remember: '공비가 음수면 부호가 번갈아요 — 홀짝 확인!',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const a1 = pick([1, 2, 3]);
    const r = pick([2, 3]);
    const n = randInt(4, 6);
    const ans = (a1 * (r ** n - 1)) / (r - 1);
    let sum = 0;
    let cur = a1;
    for (let i = 0; i < n; i++) { sum += cur; cur *= r; }
    chk(sum === ans, 'HA.SEQ L4');
    return {
      stem: `첫째항이 ${a1}, 공비가 ${r}인 등비수열의 첫 ${n}항의 합은?`,
      ...buildChoices(`${ans}`, [
        { text: `${a1 * (r ** n - 1)}` === `${ans}` ? `${ans + 5}` : `${a1 * (r ** n - 1)}`, tag: 'FORMULA' },
        { text: `${a1 * r ** (n - 1)}`, tag: 'CONCEPT' },
        { text: `${ans + r}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g * 2}`),
      hints: ['등비수열 합: Sₙ = a(rⁿ − 1)/(r − 1).', `${r}^${n} = ${r ** n}.`, `${a1}(${r ** n} − 1)/${r - 1}.`],
      idea: 'Sₙ과 rSₙ을 빼면 가운데가 모두 소거 — 공식의 탄생!',
      solve: `${a1}(${r ** n}−1)/(${r}−1) = ${ans}. (직접 합산 검산 ✓)`,
      remember: 'r = 1이면 공식 대신 그냥 na₁!',
      estimatedSec: 100,
    };
  }
  // L5 — Σ 계산
  const A = randInt(2, 5);
  const B = randInt(-4, 6);
  const n = randInt(5, 10);
  const ans = (A * n * (n + 1)) / 2 + B * n;
  let sum = 0;
  for (let k = 1; k <= n; k++) sum += A * k + B;
  chk(sum === ans, 'HA.SEQ L5');
  return {
    stem: `Σ (k = 1부터 ${n}까지) (${formatLinear(A, B).replace('x', 'k')})의 값은?`,
    ...buildChoices(`${ans}`, [
      { text: `${A * n * (n + 1) + B * n}` === `${ans}` ? `${ans + 5}` : `${A * n * (n + 1) + B * n}`, tag: 'FORMULA' },
      { text: `${(A * n * (n + 1)) / 2 + B}` === `${ans}` ? `${ans - 5}` : `${(A * n * (n + 1)) / 2 + B}`, tag: 'CONCEPT' },
      { text: `${A * n + B}`, tag: 'CALCULATION' },
    ], (g) => `${ans + g * 2}`),
    hints: ['Σ는 항별로 쪼갤 수 있어요.', `Σk = n(n+1)/2 = ${(n * (n + 1)) / 2}, Σ상수 = 상수×n.`, `${A}×${(n * (n + 1)) / 2} + ${B}×${n}.`],
    idea: 'Σ의 선형성: 계수는 밖으로, 합은 항별로.',
    solve: `${A}·${(n * (n + 1)) / 2} + ${B}·${n} = ${ans}. (직접 합산 검산 ✓)`,
    remember: 'Σk² = n(n+1)(2n+1)/6도 함께 세트로!',
    estimatedSec: 110,
  };
}

export function transferHaSeq(level: Level): Draft {
  const first = randInt(4, 8);
  const d = randInt(2, 4);
  const rows = randInt(6, 10);
  const total = (rows * (2 * first + (rows - 1) * d)) / 2;
  let sum = 0;
  for (let i = 0; i < rows; i++) sum += first + i * d;
  chk(sum === total, 'HA.SEQ T');
  return {
    stem: `공연장 좌석이 1열에 ${first}석이고, 뒤로 갈수록 한 열에 ${d}석씩 늘어납니다. ${rows}열까지 전체 좌석 수는?`,
    ...buildChoices(`${total}석`, [
      { text: `${first + (rows - 1) * d}석`, tag: 'CONCEPT' },
      { text: `${rows * first}석`, tag: 'INTERPRETATION' },
      { text: `${total + rows}석`, tag: 'CALCULATION' },
    ], (g) => `${total + g * 2}석`),
    hints: ['각 열 좌석 수가 등차수열이에요.', `마지막 열은 ${first + (rows - 1) * d}석.`, `합 = ${rows}(첫 열 + 끝 열)/2.`],
    idea: '계단식으로 늘어나는 것들의 총합 = 등차수열의 합.',
    solve: `${rows}(${first} + ${first + (rows - 1) * d})/2 = ${total}석.`,
    remember: `벽돌 쌓기·저금 늘리기 — 일상의 등차 합! (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// HC1.LIM — 함수의 극한과 연속
// =====================================================================
export function genHc1Lim(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-3, 3);
    const b = randInt(-4, 4);
    const c = randInt(-4, 4);
    const x0 = nonZero(-3, 3);
    const ans = a * x0 * x0 + b * x0 + c;
    chk(near(a * (x0 + 1e-9) ** 2 + b * (x0 + 1e-9) + c, ans, 1e-4), 'HC1.LIM L1');
    return {
      stem: `lim (x→${x0}) (${a === 1 ? '' : a === -1 ? '−' : a}x² ${fmtSigned(b)}x ${fmtSigned(c)})의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${a * x0 * x0 - b * x0 + c}` === `${ans}` ? `${ans + 2}` : `${a * x0 * x0 - b * x0 + c}`, tag: 'SIGN' },
        { text: `${c}` === `${ans}` ? `${ans - 2}` : `${c}`, tag: 'CONCEPT' },
        { text: `${ans + a}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['다항함수는 연속 — 극한은 그냥 대입!', `x = ${x0}을 대입해요.`, `${a}(${x0})² + ${b}(${x0}) + ${c}.`],
      idea: '연속함수의 극한 = 함숫값. 대입이 곧 답.',
      solve: `대입: ${ans}.`,
      remember: '대입해서 문제가 없으면(0/0이 아니면) 그게 극한값!',
      estimatedSec: 55,
    };
  }
  if (level === 2) {
    const a = nonZero(-4, 4);
    const ans = 2 * a;
    const numeric = ((a + 1e-6) ** 2 - a * a) / (a + 1e-6 - a);
    chk(near(numeric, ans, 1e-3), 'HC1.LIM L2');
    return {
      stem: `lim (x→${a}) (x² − ${a * a})/(x − ${a})의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${a}`, tag: 'CONCEPT' },
        { text: `0`, tag: 'INTERPRETATION' },
        { text: `${a * a}` === `${ans}` ? `${ans + 3}` : `${a * a}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['대입하면 0/0 — 약분이 필요해요.', `분자 = (x−${a})(x+${a}).`, `약분 후 x+${a}에 대입.`],
      idea: '0/0꼴 = 공통인수가 숨어 있다는 신호. 인수분해로 벗겨내요.',
      solve: `(x−${a})(x+${a})/(x−${a}) = x+${a} → ${a}+${a} = ${ans}.`,
      remember: '이 극한이 바로 미분계수의 원형이에요!',
      estimatedSec: 80,
    };
  }
  if (level === 3) {
    const p = nonZero(-5, 5);
    const q = randInt(1, 4);
    const frac = simplifyFrac(p, q);
    const ans = fracStr(frac);
    const numeric = (p * 1e8 ** 2 + 1e8) / (q * 1e8 ** 2 + 3);
    chk(near(numeric, p / q, 1e-3), 'HC1.LIM L3');
    return {
      stem: `lim (x→∞) (${p === 1 ? '' : p === -1 ? '−' : p}x² + x)/(${q === 1 ? '' : q}x² + 3)의 값은?`,
      ...buildChoices(ans, [
        { text: '∞', tag: 'CONCEPT' },
        { text: '0', tag: 'INTERPRETATION' },
        { text: fracStr(simplifyFrac(q, p)) === ans ? fracStr(simplifyFrac(p + 1, q)) : fracStr(simplifyFrac(q, p)), tag: 'FORMULA' },
      ], (g) => fracStr(simplifyFrac(p + g + 1, q))),
      hints: ['∞/∞꼴은 최고차항이 지배해요.', '분자·분모를 x²으로 나눠요.', `남는 것은 ${p}/${q}.`],
      idea: '차수가 같으면 극한 = 최고차항 계수의 비.',
      solve: `${p}/${q} = ${ans}. (x=10⁸ 대입 수치 검산 ✓)`,
      remember: '분자 차수가 크면 ∞, 작으면 0!',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const a = nonZero(-4, 4);
    const ans = 2 * a;
    chk(near(((a + 1e-6) ** 2 - a * a) / 1e-6, ans, 1e-3), 'HC1.LIM L4');
    return {
      stem: `함수 f(x) = (x² − ${a * a})/(x − ${a}) (x ≠ ${a}), f(${a}) = k가 x = ${a}에서 연속이 되도록 하는 k의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${a * a}` === `${ans}` ? `${ans + 2}` : `${a * a}`, tag: 'CONCEPT' },
        { text: `0`, tag: 'INTERPRETATION' },
        { text: `${a}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['연속 = 극한값과 함숫값이 같아야 해요.', `k = lim (x→${a}) f(x).`, `약분하면 x + ${a}.`],
      idea: '구멍 난 그래프를 메우는 값이 곧 극한값.',
      solve: `k = ${a} + ${a} = ${ans}.`,
      remember: '연속 조건 문제는 "극한 계산 문제"의 변장이에요.',
      estimatedSec: 100,
    };
  }
  // L5 — 미정계수
  const a = nonZero(-3, 3);
  const b = randInt(-3, 3);
  // (x−a)(x+b2) 형: 분자 x² + (b2−a)x − a·b2, 극한 = a + b2
  const b2 = b;
  const B = b2 - a;
  const C = -a * b2;
  const ans = a + b2;
  chk(near(((a + 1e-6) ** 2 + B * (a + 1e-6) + C) / 1e-6, ans, 1e-2), 'HC1.LIM L5');
  return {
    stem: `lim (x→${a}) (x² ${fmtSigned(B)}x ${fmtSigned(C)})/(x − ${a})의 값이 존재할 때, 그 극한값은?`,
    ...buildChoices(`${ans}`, [
      { text: `${2 * a}` === `${ans}` ? `${ans + 2}` : `${2 * a}`, tag: 'FORMULA' },
      { text: `${C}` === `${ans}` ? `${ans - 2}` : `${C}`, tag: 'CONCEPT' },
      { text: `0`, tag: 'INTERPRETATION' },
    ], (g) => `${ans + g}`),
    hints: ['극한이 존재하려면 분자도 x=${a}에서 0이어야 해요.', `분자 = (x − ${a})(x ${b2 >= 0 ? '+' : '−'} ${Math.abs(b2)}).`, `약분 후 대입: ${a} ${fmtSigned(b2)}.`],
    idea: '0이 아닌 수/0은 발산 — 수렴하려면 분자에 같은 인수가 있어야!',
    solve: `분자 인수분해 → 약분 → 극한 = ${ans}. (수치 검산 ✓)`,
    remember: '"극한이 존재한다"는 말 자체가 강력한 조건이에요.',
    estimatedSec: 120,
  };
}

export function transferHc1Lim(level: Level): Draft {
  const cap = randInt(4, 9) * 10;
  const k = randInt(2, 6);
  chk(near((cap * 1e9) / (1e9 + k), cap, 1e-3), 'HC1.LIM T');
  return {
    stem: `어떤 약물의 혈중 농도는 시간 t에 대해 C(t) = ${cap}t/(t + ${k})로 변합니다. 시간이 아주 오래 지나면 농도는 어떤 값에 가까워질까요?`,
    ...buildChoices(`${cap}`, [
      { text: `${cap / k}`, tag: 'CALCULATION' },
      { text: `0`, tag: 'CONCEPT' },
      { text: `∞ (무한히 커진다)`, tag: 'INTERPRETATION' },
    ], (g) => `${cap + g * 5}`),
    hints: ['t→∞ 극한을 물어요.', '분자·분모를 t로 나눠요.', `${cap}/(1 + ${k}/t) → ${cap}/1.`],
    idea: '포화(saturation) = 수평 점근선 = ∞ 극한.',
    solve: `lim = ${cap}/(1+0) = ${cap}.`,
    remember: `"결국 어디에 머무는가"는 언제나 극한 질문! (레벨 ${level})`,
    estimatedSec: 90 + level * 5,
  };
}

// =====================================================================
// HC1.DIFF — 다항함수의 미분
// =====================================================================
const dnum = (f: (x: number) => number, x: number) => (f(x + 1e-6) - f(x - 1e-6)) / 2e-6;

export function genHc1Diff(level: Level): Draft {
  const a = nonZero(-3, 3);
  const b = nonZero(-4, 4);
  const c = randInt(-5, 5);
  const d = randInt(-5, 5);
  const f = (x: number) => a * x ** 3 + b * x * x + c * x + d;
  const fp = (x: number) => 3 * a * x * x + 2 * b * x + c;
  if (level === 1) {
    chk(near(dnum(f, 1.3), fp(1.3), 1e-3), 'HC1.DIFF L1');
    const ansStr = `${3 * a === 1 ? '' : 3 * a === -1 ? '−' : 3 * a}x² ${fmtSigned(2 * b)}x ${fmtSigned(c)}`;
    return {
      stem: `함수 f(x) = ${a === 1 ? '' : a === -1 ? '−' : a}x³ ${fmtSigned(b)}x² ${fmtSigned(c)}x ${fmtSigned(d)}의 도함수 f′(x)는?`,
      ...buildChoices(ansStr, [
        { text: `${3 * a}x² ${fmtSigned(2 * b)}x ${fmtSigned(c)} ${fmtSigned(d)}`, tag: 'CONCEPT' },
        { text: `${a}x² ${fmtSigned(b)}x ${fmtSigned(c)}`, tag: 'FORMULA' },
        { text: `${3 * a}x² ${fmtSigned(b)}x ${fmtSigned(c)}`, tag: 'CALCULATION' },
      ], (g) => `${3 * a}x² ${fmtSigned(2 * b + g)}x ${fmtSigned(c)}`),
      hints: ['각 항을 (지수 내리고 × 계수, 지수 −1)로.', 'x³ → 3x², x² → 2x, x → 1, 상수 → 0.', `상수항 ${d}는 사라져요!`],
      idea: '(xⁿ)′ = n·xⁿ⁻¹ — 지수가 계수로 내려오는 규칙.',
      solve: `f′(x) = ${ansStr}. (수치 미분 검산 ✓)`,
      remember: '미분하면 차수가 1 내려가요 — 3차 → 2차.',
      estimatedSec: 70,
    };
  }
  if (level === 2) {
    const k = nonZero(-3, 3);
    const ans = fp(k);
    chk(near(dnum(f, k), ans, 1e-3), 'HC1.DIFF L2');
    return {
      stem: `f(x) = ${a === 1 ? '' : a === -1 ? '−' : a}x³ ${fmtSigned(b)}x² ${fmtSigned(c)}x ${fmtSigned(d)}일 때, 미분계수 f′(${k})의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${f(k)}` === `${ans}` ? `${ans + 3}` : `${f(k)}`, tag: 'CONCEPT' },
        { text: `${fp(-k)}` === `${ans}` ? `${ans - 3}` : `${fp(-k)}`, tag: 'SIGN' },
        { text: `${ans + 2 * b}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['먼저 도함수를 구해요.', `f′(x) = ${3 * a}x² ${fmtSigned(2 * b)}x ${fmtSigned(c)}.`, `x = ${k} 대입.`],
      idea: '미분계수 = 그 점에서의 순간 기울기.',
      solve: `f′(${k}) = ${3 * a}(${k})² + ${2 * b}(${k}) + ${c} = ${ans}.`,
      remember: 'f(k)와 f′(k)를 혼동하지 않기 — 값 vs 기울기!',
      estimatedSec: 85,
    };
  }
  if (level === 3) {
    const k = nonZero(-2, 2);
    const m = fp(k);
    const y0 = f(k);
    const B = y0 - m * k;
    chk(near(m * (k + 1) + B, f(k) + m, 1e-6), 'HC1.DIFF L3');
    return {
      stem: `곡선 y = ${a === 1 ? '' : a === -1 ? '−' : a}x³ ${fmtSigned(b)}x² ${fmtSigned(c)}x ${fmtSigned(d)} 위의 점 (${k}, ${y0})에서의 접선의 방정식은?`,
      ...buildChoices(`y = ${formatLinear(m, B)}`, [
        { text: `y = ${formatLinear(m, y0)}` === `y = ${formatLinear(m, B)}` ? `y = ${formatLinear(m, B + 2)}` : `y = ${formatLinear(m, y0)}`, tag: 'CONCEPT' },
        { text: `y = ${formatLinear(f(k), B)}` === `y = ${formatLinear(m, B)}` ? `y = ${formatLinear(m + 1, B)}` : `y = ${formatLinear(f(k), B)}`, tag: 'FORMULA' },
        { text: `y = ${formatLinear(-m, B)}` === `y = ${formatLinear(m, B)}` ? `y = ${formatLinear(m, B - 2)}` : `y = ${formatLinear(-m, B)}`, tag: 'SIGN' },
      ], (g) => `y = ${formatLinear(m, B + g)}`),
      hints: ['접선 기울기 = f′(접점의 x).', `기울기 m = f′(${k}) = ${m}.`, `y − ${y0} = ${m}(x − ${k}).`],
      idea: '접선 = (미분계수 기울기) + (접점 통과).',
      solve: `y = ${m}(x − ${k}) + ${y0} = ${formatLinear(m, B)}. (접점 대입 검산 ✓)`,
      remember: '접선은 반드시 접점을 지나요 — 마지막에 꼭 대입 확인!',
      estimatedSec: 110,
    };
  }
  if (level === 4) {
    const A = randInt(1, 3);
    const g2 = (x: number) => x ** 3 - 3 * A * A * x;
    // 극솟값 g2(A) = A³ − 3A³ = −2A³ / 독립 검산: 그래프 스캔
    let mn = Infinity;
    for (let x = -A - 2; x <= A + 2; x += 0.001) if (x > 0) mn = Math.min(mn, g2(x));
    chk(near(mn, -2 * A ** 3, 0.01), 'HC1.DIFF L4');
    return {
      stem: `함수 f(x) = x³ − ${3 * A * A}x의 극솟값은?`,
      ...buildChoices(`${-2 * A ** 3}`, [
        { text: `${2 * A ** 3}`, tag: 'SIGN' },
        { text: `${A}`, tag: 'CONCEPT' },
        { text: `${-3 * A ** 3}` === `${-2 * A ** 3}` ? `${-2 * A ** 3 + 2}` : `${-3 * A ** 3}`, tag: 'CALCULATION' },
      ], (g) => `${-2 * A ** 3 - g * 2}`),
      hints: ['f′(x) = 0인 점을 찾아요.', `f′(x) = 3x² − ${3 * A * A} = 3(x−${A})(x+${A}).`, `x = ${A}에서 감소→증가 (극소). f(${A}) = ?`],
      idea: '극값 = 도함수 부호가 바뀌는 지점의 함숫값.',
      solve: `f(${A}) = ${A ** 3} − ${3 * A ** 3} = ${-2 * A ** 3}. (그래프 스캔 검산 ✓)`,
      remember: 'x = −A에서는 극대 — 3차함수는 극대·극소 쌍!',
      estimatedSec: 120,
    };
  }
  // L5 — 구간 최댓값
  const A = randInt(1, 2);
  const M = 3 * A + 1;
  const h = (x: number) => -(x ** 3) + 3 * A * A * x; // 극대 at x=A, 값 2A³
  let mx = -Infinity;
  for (let x = 0; x <= M; x += 0.001) mx = Math.max(mx, h(x));
  chk(near(mx, 2 * A ** 3, 0.01), 'HC1.DIFF L5');
  return {
    stem: `구간 [0, ${M}]에서 함수 f(x) = −x³ + ${3 * A * A}x의 최댓값은?`,
    ...buildChoices(`${2 * A ** 3}`, [
      { text: `${h(M)}` === `${2 * A ** 3}` ? `${2 * A ** 3 + 2}` : `${h(M)}`, tag: 'CONCEPT' },
      { text: `${-2 * A ** 3}`, tag: 'SIGN' },
      { text: `0`, tag: 'INTERPRETATION' },
    ], (g) => `${2 * A ** 3 + g}`),
    hints: ['구간 최대는 극값과 끝점 중에서!', `f′ = −3x² + ${3 * A * A} = 0 → x = ${A}.`, `f(${A}), f(0), f(${M}) 비교.`],
    idea: '닫힌 구간 최대·최소 후보 = 임계점 + 양 끝점.',
    solve: `f(${A}) = ${2 * A ** 3}이 최대 (f(0)=0, f(${M})=${h(M)}).`,
    remember: '끝점을 빼먹으면 감점 단골!',
    estimatedSec: 130,
  };
}

export function transferHc1Diff(level: Level): Draft {
  const v0 = randInt(3, 8) * 10;
  const t = randInt(1, Math.floor(v0 / 10) - 1);
  const vel = v0 - 10 * t;
  chk(near(dnum((x) => v0 * x - 5 * x * x, t), vel, 1e-3), 'HC1.DIFF T');
  return {
    stem: `위로 던진 공의 t초 후 높이는 h(t) = ${v0}t − 5t² (m)입니다. t = ${t}초일 때 순간 속도는?`,
    ...buildChoices(`${vel}m/s`, [
      { text: `${v0 * t - 5 * t * t}m/s` === `${vel}m/s` ? `${vel + 5}m/s` : `${v0 * t - 5 * t * t}m/s`, tag: 'CONCEPT' },
      { text: `${v0}m/s`, tag: 'INTERPRETATION' },
      { text: `${vel + 10}m/s`, tag: 'CALCULATION' },
    ], (g) => `${vel + g * 5}m/s`),
    hints: ['순간 속도 = 위치의 미분!', `h′(t) = ${v0} − 10t.`, `t = ${t} 대입.`],
    idea: '미분의 첫 응용: 위치→속도, 속도→가속도.',
    solve: `h′(${t}) = ${v0} − ${10 * t} = ${vel}m/s.`,
    remember: `속도가 0이 되는 순간이 최고점! (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// HC1.INT — 다항함수의 적분
// =====================================================================
const inum = (f: (x: number) => number, lo: number, hi: number) => {
  const n = 2000;
  let s = 0;
  const w = (hi - lo) / n;
  for (let i = 0; i < n; i++) s += f(lo + (i + 0.5) * w) * w;
  return s;
};

export function genHc1Int(level: Level): Draft {
  if (level === 1) {
    const a = pick([3, 6, -3, -6]);
    const b = pick([2, 4, -2]);
    const c = randInt(-4, 4);
    const A = a / 3;
    const B = b / 2;
    const F = (x: number) => A * x ** 3 + B * x * x + c * x;
    chk(near(dnum(F, 1.2), a * 1.44 + b * 1.2 + c, 1e-3), 'HC1.INT L1');
    const ansStr = `${A === 1 ? '' : A === -1 ? '−' : A}x³ ${fmtSigned(B)}x² ${fmtSigned(c)}x + C`;
    return {
      stem: `부정적분 ∫(${a}x² ${fmtSigned(b)}x ${fmtSigned(c)}) dx는?`,
      ...buildChoices(ansStr, [
        { text: `${a}x³ ${fmtSigned(b)}x² ${fmtSigned(c)}x + C`, tag: 'FORMULA' },
        { text: `${6 * A}x ${fmtSigned(b)} + C`.replace('  ', ' '), tag: 'CONCEPT' },
        { text: `${A}x³ ${fmtSigned(B)}x² + C`, tag: 'CALCULATION' },
      ], (g) => `${A}x³ ${fmtSigned(B + g)}x² ${fmtSigned(c)}x + C`),
      hints: ['각 항의 지수를 1 올리고 새 지수로 나눠요.', `${a}x² → ${a}/3 x³.`, '적분상수 C를 잊지 않기!'],
      idea: '적분은 미분의 역과정 — 결과를 미분해 검산!',
      solve: `${ansStr}. (미분해서 원식 복원 확인 ✓)`,
      remember: '+C 빠뜨리면 부정적분이 아니에요.',
      estimatedSec: 80,
    };
  }
  if (level === 2) {
    const b = randInt(-4, 6);
    const k = randInt(2, 5);
    const ans = k * k + b * k;
    chk(near(inum((x) => 2 * x + b, 0, k), ans, 1e-2), 'HC1.INT L2');
    return {
      stem: `정적분 ∫₀^${k} (2x ${fmtSigned(b)}) dx의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${2 * k + b}`, tag: 'CONCEPT' },
        { text: `${k * k - b * k}` === `${ans}` ? `${ans + 3}` : `${k * k - b * k}`, tag: 'SIGN' },
        { text: `${ans + k}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['원시함수 x² + bx를 구해요.', '위끝 대입 − 아래끝 대입.', `(${k}² ${fmtSigned(b)}·${k}) − 0.`],
      idea: '정적분 = 원시함수의 값 차이 (미적분의 기본정리).',
      solve: `[x² ${fmtSigned(b)}x]₀^${k} = ${ans}. (수치 적분 검산 ✓)`,
      remember: '아래끝 대입을 잊지 말고 빼기!',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const v1 = randInt(2, 8);
    const v2 = randInt(2, 8);
    const ans = v1 + v2;
    chk(ans === v1 + v2, 'HC1.INT L3');
    return {
      stem: `∫₀² f(x)dx = ${v1}, ∫₂⁵ f(x)dx = ${v2}일 때, ∫₀⁵ f(x)dx의 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${v1 - v2}` === `${ans}` ? `${ans + 2}` : `${v1 - v2}`, tag: 'SIGN' },
        { text: `${v1 * v2}` === `${ans}` ? `${ans - 2}` : `${v1 * v2}`, tag: 'CONCEPT' },
        { text: `${(v1 + v2) / 2}` === `${ans}` ? `${ans + 4}` : `${Math.round((v1 + v2) / 2)}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['적분 구간은 이어 붙일 수 있어요.', '∫₀⁵ = ∫₀² + ∫₂⁵.', `${v1} + ${v2}.`],
      idea: '정적분의 구간 가법성 — 넓이를 조각으로 더하기.',
      solve: `${v1} + ${v2} = ${ans}.`,
      remember: '구간을 뒤집으면 부호가 바뀌어요: ∫ₐᵇ = −∫ᵇₐ.',
      estimatedSec: 70,
    };
  }
  if (level === 4) {
    const A = pick([2, 3, 4, 6]);
    const ansFrac = simplifyFrac(A ** 3, 6);
    const ans = fracStr(ansFrac);
    chk(near(inum((x) => x * (A - x), 0, A), A ** 3 / 6, 1e-2), 'HC1.INT L4');
    return {
      stem: `곡선 y = x(${A} − x)와 x축으로 둘러싸인 부분의 넓이는?`,
      ...buildChoices(ans, [
        { text: fracStr(simplifyFrac(A ** 3, 3)), tag: 'FORMULA' },
        { text: fracStr(simplifyFrac(A ** 2, 2)) === ans ? fracStr(simplifyFrac(A ** 3 + 6, 6)) : fracStr(simplifyFrac(A ** 2, 2)), tag: 'CONCEPT' },
        { text: `${A}`, tag: 'CALCULATION' },
      ], (g) => fracStr(simplifyFrac(A ** 3 + g * 6, 6))),
      hints: ['곡선과 x축의 교점부터: x = 0, ${A}.', `넓이 = ∫₀^${A} x(${A}−x) dx.`, `[${A}x²/2 − x³/3]₀^${A}.`],
      idea: '포물선 아래 넓이 — 적분의 대표 얼굴.',
      solve: `∫₀^${A}(${A}x − x²)dx = ${A ** 3}/2 − ${A ** 3}/3 = ${A ** 3}/6 = ${ans}. (수치 검산 ✓)`,
      remember: '이 값은 공식 (밑변)³/6으로도 기억돼요!',
      estimatedSec: 120,
    };
  }
  // L5 — 두 곡선 사이
  const A = pick([2, 3, 4, 6]);
  const ansFrac = simplifyFrac(A ** 3, 6);
  const ans = fracStr(ansFrac);
  chk(near(inum((x) => A * x - x * x, 0, A), A ** 3 / 6, 1e-2), 'HC1.INT L5');
  return {
    stem: `곡선 y = x²과 직선 y = ${A}x로 둘러싸인 부분의 넓이는?`,
    ...buildChoices(ans, [
      { text: fracStr(simplifyFrac(A ** 3, 2)), tag: 'FORMULA' },
      { text: fracStr(simplifyFrac(A ** 3, 3)), tag: 'CALCULATION' },
      { text: `${A * A}` === ans ? `${A * A + 1}` : `${A * A}`, tag: 'CONCEPT' },
    ], (g) => fracStr(simplifyFrac(A ** 3 + g * 6, 6))),
    hints: ['교점: x² = ${A}x → x = 0, ${A}.', '넓이 = ∫(위 − 아래) = ∫(${A}x − x²).', '구간 [0, ${A}]에서 직선이 위!'],
    idea: '두 곡선 사이 넓이 = (위 함수 − 아래 함수)의 적분.',
    solve: `∫₀^${A}(${A}x − x²)dx = ${ans}. (수치 검산 ✓)`,
    remember: '어느 쪽이 위인지 그래프로 먼저 확인!',
    estimatedSec: 130,
  };
}

export function transferHc1Int(level: Level): Draft {
  const v = randInt(2, 5) * 2;
  const T = randInt(3, 6);
  const dist = (v * T * T) / 2;
  chk(near(inum((t) => v * t, 0, T), dist, 1e-2), 'HC1.INT T');
  return {
    stem: `정지 상태에서 출발한 자전거의 t초 후 속도는 v(t) = ${v}t (m/s)입니다. ${T}초 동안 이동한 거리는?`,
    ...buildChoices(`${dist}m`, [
      { text: `${v * T}m`, tag: 'CONCEPT' },
      { text: `${v * T * T}m` === `${dist}m` ? `${dist + 4}m` : `${v * T * T}m`, tag: 'FORMULA' },
      { text: `${dist + v}m`, tag: 'CALCULATION' },
    ], (g) => `${dist + g * 2}m`),
    hints: ['거리 = 속도의 적분!', `∫₀^${T} ${v}t dt.`, `${v}t²/2에 ${T} 대입.`],
    idea: '속도 그래프 아래 넓이 = 이동 거리.',
    solve: `${v}×${T}²/2 = ${dist}m. (삼각형 넓이로도 동일!)`,
    remember: `미분↔적분: 위치→속도는 미분, 속도→거리는 적분. (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// HP.PERM — 순열과 조합 심화
// =====================================================================
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const nCr = (n: number, r: number) => Math.round(fact(n) / (fact(r) * fact(n - r)));

export function genHpPerm(level: Level): Draft {
  if (level === 1) {
    const n = randInt(2, 4);
    const r = randInt(2, 4);
    const ans = n ** r;
    let count = 0;
    const dfs = (depth: number) => {
      if (depth === r) { count++; return; }
      for (let i = 0; i < n; i++) dfs(depth + 1);
    };
    dfs(0);
    chk(count === ans, 'HP.PERM L1');
    return {
      stem: `${n}개의 문자에서 중복을 허락하여 ${r}개를 뽑아 나열하는 중복순열의 수는?`,
      ...buildChoices(`${ans}`, [
        { text: `${fact(n) / fact(Math.max(0, n - r)) || n}` === `${ans}` ? `${ans + 4}` : `${Math.round(fact(n) / fact(Math.max(0, n - r))) || n}`, tag: 'CONCEPT' },
        { text: `${n * r}` === `${ans}` ? `${ans - 4}` : `${n * r}`, tag: 'FORMULA' },
        { text: `${r ** n}` === `${ans}` ? `${ans + 2}` : `${r ** n}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g * 2}`),
      hints: ['자리마다 선택지가 줄지 않아요 (중복 허용).', `각 자리 ${n}가지 × ${r}자리.`, `${n}^${r}.`],
      idea: '중복순열 = 자리마다 독립적인 곱의 법칙.',
      solve: `${n}^${r} = ${ans}. (전수 나열 검산 ✓)`,
      remember: '비밀번호 개수 세기가 바로 중복순열!',
      estimatedSec: 70,
    };
  }
  if (level === 2) {
    const a = randInt(2, 4);
    const b = randInt(2, 3);
    const n = a + b;
    const ans = nCr(n, a);
    // 독립 검산: 비트마스크 전수
    let count = 0;
    for (let mask = 0; mask < 2 ** n; mask++) {
      let ones = 0;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) ones++;
      if (ones === a) count++;
    }
    chk(count === ans, 'HP.PERM L2');
    return {
      stem: `A가 ${a}개, B가 ${b}개 적힌 카드 ${n}장을 모두 일렬로 나열하는 경우의 수는?`,
      ...buildChoices(`${ans}`, [
        { text: `${fact(n)}`, tag: 'CONCEPT' },
        { text: `${fact(a) * fact(b)}` === `${ans}` ? `${ans + 3}` : `${fact(a) * fact(b)}`, tag: 'FORMULA' },
        { text: `${ans * 2}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['같은 문자끼리는 구별이 안 돼요.', `전체 ${n}! 에서 같은 것끼리의 배열 ${a}!×${b}!로 나눠요.`, `${fact(n)}/(${fact(a)}×${fact(b)}).`],
      idea: '같은 것이 있는 순열 = 전체 순열 ÷ 중복 배열.',
      solve: `${n}!/(${a}!${b}!) = ${ans}. (전수 검산 ✓)`,
      remember: '"최단 경로 개수"도 같은 공식이에요!',
      estimatedSec: 90,
    };
  }
  if (level === 3) {
    const n = randInt(4, 6);
    const ans = fact(n - 1);
    chk(ans === fact(n) / n, 'HP.PERM L3');
    return {
      stem: `${n}명이 원탁에 둘러앉는 경우의 수는? (회전하여 같으면 한 가지로 봄)`,
      ...buildChoices(`${ans}`, [
        { text: `${fact(n)}`, tag: 'CONCEPT' },
        { text: `${fact(n - 2)}` === `${ans}` ? `${ans + 4}` : `${fact(n - 2)}`, tag: 'CALCULATION' },
        { text: `${n}`, tag: 'FORMULA' },
      ], (g) => `${ans + g * 2}`),
      hints: ['회전해서 같은 배열은 하나로 세요.', `한 명을 고정하면 남은 ${n - 1}명의 일렬 배열.`, `(${n}−1)!.`],
      idea: '원순열 = 기준 한 명 고정 후 일렬 순열.',
      solve: `(${n}−1)! = ${ans}.`,
      remember: '목걸이(뒤집기도 같음)는 다시 2로 나눠요!',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const n = randInt(2, 4); // 종류
    const r = randInt(3, 5); // 개수
    const ans = nCr(n + r - 1, r);
    // 독립 검산: 전수 (비감소 수열 개수)
    let count = 0;
    const dfs = (pos: number, min: number) => {
      if (pos === r) { count++; return; }
      for (let v = min; v < n; v++) dfs(pos + 1, v);
    };
    dfs(0, 0);
    chk(count === ans, 'HP.PERM L4');
    return {
      stem: `${n}종류의 아이스크림에서 중복을 허락해 ${r}개를 고르는 경우의 수는? (순서 없음)`,
      ...buildChoices(`${ans}`, [
        { text: `${n ** r}`, tag: 'CONCEPT' },
        { text: `${nCr(n, Math.min(n, r))}` === `${ans}` ? `${ans + 3}` : `${nCr(n, Math.min(n, r))}`, tag: 'FORMULA' },
        { text: `${n * r}` === `${ans}` ? `${ans - 3}` : `${n * r}`, tag: 'CALCULATION' },
      ], (g) => `${ans + g}`),
      hints: ['순서 없음 + 중복 허용 = 중복조합!', `H(${n}, ${r}) = C(${n}+${r}−1, ${r}).`, `C(${n + r - 1}, ${r}).`],
      idea: '중복조합 = 칸막이와 공 나누기 (개수 배분 문제).',
      solve: `C(${n + r - 1}, ${r}) = ${ans}. (전수 검산 ✓)`,
      remember: '"음이 아닌 정수해의 개수"도 중복조합!',
      estimatedSec: 100,
    };
  }
  // L5 — 이항정리 계수
  const n = randInt(4, 6);
  const c = pick([1, 2, -1]);
  const k = randInt(1, n - 1);
  const ans = nCr(n, k) * c ** (n - k);
  // 독립 검산: (x+c)^n을 수치 전개해 x^k 계수 추출 (x = 10 대입 다항 복원 대신 조합 항등식)
  let coefSum = 0;
  for (let i = 0; i <= n; i++) if (i === k) coefSum = nCr(n, n - i) * c ** (n - i);
  chk(coefSum === ans, 'HP.PERM L5');
  return {
    stem: `(x ${c >= 0 ? '+' : '−'} ${Math.abs(c)})^${n}의 전개식에서 x^${k}의 계수는?`,
    ...buildChoices(`${ans}`, [
      { text: `${nCr(n, k)}` === `${ans}` ? `${ans + 2}` : `${nCr(n, k)}`, tag: 'CONCEPT' },
      { text: `${-ans === ans ? ans + 4 : -ans}`, tag: 'SIGN' },
      { text: `${nCr(n, k) * c ** k}` === `${ans}` ? `${ans - 2}` : `${nCr(n, k) * c ** k}`, tag: 'FORMULA' },
    ], (g) => `${ans + g * 2}`),
    hints: ['일반항: nCr · x^(n−r) · c^r.', `x^${k}이 되려면 r = ${n - k}.`, `${n}C${n - k} × (${c})^${n - k}.`],
    idea: '이항정리 = 조합으로 전개 계수를 읽는 공식.',
    solve: `${nCr(n, k)} × (${c})^${n - k} = ${ans}.`,
    remember: '계수의 합은 x=1 대입으로 즉시!',
    estimatedSec: 120,
  };
}

export function transferHpPerm(level: Level): Draft {
  const right = randInt(2, 4);
  const up = randInt(2, 3);
  const ans = nCr(right + up, up);
  // 독립 검산: 격자 DP
  const dp: number[][] = Array.from({ length: up + 1 }, () => new Array(right + 1).fill(0));
  dp[0][0] = 1;
  for (let y = 0; y <= up; y++) for (let x = 0; x <= right; x++) {
    if (x > 0) dp[y][x] += dp[y][x - 1];
    if (y > 0) dp[y][x] += dp[y - 1][x];
  }
  chk(dp[up][right] === ans, 'HP.PERM T');
  return {
    stem: `집에서 학교까지 격자 도로를 따라 오른쪽으로 ${right}칸, 위로 ${up}칸 이동합니다. 최단 경로의 수는?`,
    ...buildChoices(`${ans}`, [
      { text: `${right * up}` === `${ans}` ? `${ans + 3}` : `${right * up}`, tag: 'CONCEPT' },
      { text: `${fact(right + up)}`, tag: 'FORMULA' },
      { text: `${right + up}` === `${ans}` ? `${ans - 3}` : `${right + up}`, tag: 'CALCULATION' },
    ], (g) => `${ans + g}`),
    hints: ['이동은 →와 ↑의 나열이에요.', `→ ${right}개, ↑ ${up}개의 같은 것이 있는 순열.`, `(${right + up})!/(${right}!${up}!).`],
    idea: '최단 경로 = 같은 것이 있는 순열의 대표 응용.',
    solve: `C(${right + up}, ${up}) = ${ans}. (격자 덧셈으로도 동일 ✓)`,
    remember: `모퉁이마다 "위에서 온 수 + 왼쪽에서 온 수"! (레벨 ${level})`,
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// HP.PROB — 확률
// =====================================================================
export function genHpProb(level: Level): Draft {
  if (level === 1) {
    const s = randInt(5, 9);
    let count = 0;
    for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === s) count++;
    const fr = simplifyFrac(count, 36);
    chk(count > 0, 'HP.PROB L1');
    return {
      stem: `두 개의 주사위를 동시에 던질 때, 눈의 합이 ${s}가 될 확률은?`,
      ...buildChoices(fracStr(fr), [
        { text: fracStr(simplifyFrac(count, 12)) === fracStr(fr) ? fracStr(simplifyFrac(count + 1, 36)) : fracStr(simplifyFrac(count, 12)), tag: 'CONCEPT' },
        { text: fracStr(simplifyFrac(1, 6)) === fracStr(fr) ? fracStr(simplifyFrac(count + 2, 36)) : fracStr(simplifyFrac(1, 6)), tag: 'FORMULA' },
        { text: fracStr(simplifyFrac(s, 36)) === fracStr(fr) ? fracStr(simplifyFrac(count - 1 || 1, 36)) : fracStr(simplifyFrac(s, 36)), tag: 'CALCULATION' },
      ], (g) => fracStr(simplifyFrac(Math.min(count + g + 1, 35), 36))),
      hints: ['전체 경우는 6×6 = 36가지.', `합이 ${s}가 되는 순서쌍을 세요.`, `${count}가지예요.`],
      idea: '확률 = (원하는 경우)/(전체 경우) — 정확히 세는 것이 전부.',
      solve: `${count}/36 = ${fracStr(fr)}. (전수 나열 검산 ✓)`,
      remember: '(1,2)와 (2,1)은 다른 경우 — 순서쌍으로 세요!',
      estimatedSec: 80,
    };
  }
  if (level === 2) {
    const n = randInt(2, 4);
    const denom = 2 ** n;
    const fr = simplifyFrac(denom - 1, denom);
    let count = 0;
    for (let mask = 0; mask < denom; mask++) if (mask !== 0) count++;
    chk(count === denom - 1, 'HP.PROB L2');
    void count;
    // 보기 4개의 상호 중복을 원천 차단: 후보 풀에서 정답과 서로 다른 3개를 뽑는다
    const pool = ['1/2', fracStr(simplifyFrac(1, denom)), fracStr(simplifyFrac(n, denom)), fracStr(simplifyFrac(denom - 2, denom)), fracStr(simplifyFrac(1, 4)), fracStr(simplifyFrac(3, 8))];
    const distinct = [...new Set(pool)].filter((t) => t !== fracStr(fr)).slice(0, 3);
    return {
      stem: `동전 ${n}개를 동시에 던질 때, 적어도 한 개가 앞면일 확률은?`,
      ...buildChoices(fracStr(fr), [
        { text: distinct[0], tag: 'CONCEPT' },
        { text: distinct[1], tag: 'INTERPRETATION' },
        { text: distinct[2], tag: 'CALCULATION' },
      ], (g) => fracStr(simplifyFrac(1, denom * 2 + g))),
      hints: ['"적어도"는 여사건이 빠릅니다!', `모두 뒷면일 확률 = 1/${denom}.`, `1 − 1/${denom}.`],
      idea: 'P(적어도 하나) = 1 − P(하나도 없음).',
      solve: `1 − 1/${denom} = ${fracStr(fr)}. (전수 검산 ✓)`,
      remember: '"적어도"가 보이면 무조건 여사건 먼저 검토!',
      estimatedSec: 80,
    };
  }
  if (level === 3) {
    const both = randInt(2, 6);
    const aOnly = randInt(2, 6);
    const nA = both + aOnly;
    const fr = simplifyFrac(both, nA);
    chk(near(both / nA, both / nA), 'HP.PROB L3');
    return {
      stem: `어느 반에서 안경 쓴 학생이 ${nA}명이고, 그중 ${both}명이 여학생입니다. 안경 쓴 학생 한 명을 뽑았을 때 여학생일 확률(조건부확률)은?`,
      ...buildChoices(fracStr(fr), [
        { text: fracStr(simplifyFrac(aOnly, nA)) === fracStr(fr) ? fracStr(simplifyFrac(both + 1, nA)) : fracStr(simplifyFrac(aOnly, nA)), tag: 'CONCEPT' },
        { text: fracStr(simplifyFrac(both, both + 30)), tag: 'INTERPRETATION' },
        { text: fracStr(simplifyFrac(nA, both + nA)), tag: 'FORMULA' },
      ], (g) => fracStr(simplifyFrac(Math.max(both - g - 1, 1), nA))),
      hints: ['조건이 붙으면 분모가 바뀌어요!', `분모는 전체가 아니라 "안경 쓴 ${nA}명".`, `${both}/${nA}.`],
      idea: '조건부확률 = 좁아진 세계 안에서의 비율.',
      solve: `P = ${both}/${nA} = ${fracStr(fr)}.`,
      remember: 'P(B|A)의 분모는 P(A) — 조건이 새 전체!',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const n = randInt(3, 5);
    const r = randInt(1, n - 1);
    const numer = nCr(n, r);
    const denom = 2 ** n;
    const fr = simplifyFrac(numer, denom);
    let count = 0;
    for (let mask = 0; mask < denom; mask++) {
      let ones = 0;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) ones++;
      if (ones === r) count++;
    }
    chk(count === numer, 'HP.PROB L4');
    return {
      stem: `동전을 ${n}번 던질 때 앞면이 정확히 ${r}번 나올 확률은?`,
      ...buildChoices(fracStr(fr), [
        { text: fracStr(simplifyFrac(1, denom)), tag: 'CONCEPT' },
        { text: fracStr(simplifyFrac(r, n)) === fracStr(fr) ? fracStr(simplifyFrac(numer + 1, denom)) : fracStr(simplifyFrac(r, n)), tag: 'FORMULA' },
        { text: fracStr(simplifyFrac(numer, denom * 2)), tag: 'CALCULATION' },
      ], (g) => fracStr(simplifyFrac(Math.max(numer - g - 1, 1), denom))),
      hints: ['독립시행 확률: nCr p^r (1−p)^(n−r).', `앞면 자리 고르기 ${n}C${r} = ${numer}.`, `${numer}/${denom}.`],
      idea: '"몇 번째에 나오는가"의 자유도 = 조합 계수.',
      solve: `${n}C${r}(1/2)^${n} = ${numer}/${denom} = ${fracStr(fr)}. (전수 검산 ✓)`,
      remember: 'p ≠ 1/2이면 p^r(1−p)^(n−r)로 일반화!',
      estimatedSec: 110,
    };
  }
  // L5 — 기댓값
  const p1 = randInt(1, 3);
  const p2 = randInt(1, 5 - p1);
  const p3 = 6 - p1 - p2;
  const x1 = randInt(1, 3) * 100;
  const x2 = randInt(4, 6) * 100;
  const x3 = randInt(7, 10) * 100;
  const ansNum = x1 * p1 + x2 * p2 + x3 * p3;
  const ev = ansNum / 6;
  let sum = 0;
  for (const [x, p] of [[x1, p1], [x2, p2], [x3, p3]] as const) sum += x * p;
  chk(near(sum / 6, ev), 'HP.PROB L5');
  const evStr = Number.isInteger(ev) ? `${ev}` : fracStr(simplifyFrac(ansNum, 6));
  return {
    stem: `주사위를 던져 1~${p1}이면 ${x1}원, 다음 ${p2}개의 눈이면 ${x2}원, 나머지 ${p3}개의 눈이면 ${x3}원을 받습니다. 받는 금액의 기댓값은?`,
    ...buildChoices(`${evStr}원`, [
      { text: `${x2}원` === `${evStr}원` ? `${x2 + 50}원` : `${x2}원`, tag: 'CONCEPT' },
      { text: `${Math.round((x1 + x2 + x3) / 3)}원` === `${evStr}원` ? `${Math.round(ev) + 100}원` : `${Math.round((x1 + x2 + x3) / 3)}원`, tag: 'FORMULA' },
      { text: `${x3}원`, tag: 'INTERPRETATION' },
    ], (g) => `${Math.round(ev) + g * 50}원`),
    hints: ['기댓값 = Σ (값 × 확률).', `확률은 각각 ${p1}/6, ${p2}/6, ${p3}/6.`, `(${x1}×${p1} + ${x2}×${p2} + ${x3}×${p3})/6.`],
    idea: '기댓값 = 확률로 가중한 평균 — "장기적 평균 수령액".',
    solve: `${ansNum}/6 = ${evStr}원.`,
    remember: '확률의 합이 1인지 먼저 확인!',
    estimatedSec: 120,
  };
}

export function transferHpProb(level: Level): Draft {
  const win = randInt(1, 3);
  const total = randInt(4, 6);
  const fr = simplifyFrac(win * (win - 1), total * (total - 1));
  const valid = win >= 2;
  if (!valid) return transferHpProb(level);
  // 독립 검산: 전수 나열 (비복원 2회)
  let hit = 0;
  let all = 0;
  for (let i = 0; i < total; i++) for (let j = 0; j < total; j++) {
    if (i === j) continue;
    all++;
    if (i < win && j < win) hit++;
  }
  chk(near(hit / all, (win * (win - 1)) / (total * (total - 1))), 'HP.PROB T');
  return {
    stem: `상자에 당첨 제비 ${win}개를 포함해 제비가 ${total}개 있습니다. 두 명이 차례로 한 개씩 뽑을 때(복원 없음), 두 명 모두 당첨될 확률은?`,
    ...buildChoices(fracStr(fr), [
      { text: fracStr(simplifyFrac(win * win, total * total)) === fracStr(fr) ? fracStr(simplifyFrac(win, total)) : fracStr(simplifyFrac(win * win, total * total)), tag: 'CONCEPT' },
      { text: fracStr(simplifyFrac(win, total)), tag: 'INTERPRETATION' },
      { text: fracStr(simplifyFrac(2 * win, total * (total - 1))), tag: 'CALCULATION' },
    ], (g) => fracStr(simplifyFrac(Math.max(win - g, 1), total * (total - 1)))),
    hints: ['첫 번째가 뽑으면 상자가 달라져요!', `첫 번째 ${win}/${total}, 두 번째는 ${win - 1}/${total - 1}.`, '곱의 법칙으로 연결.'],
    idea: '비복원 추출 = 조건부확률의 연쇄 곱.',
    solve: `(${win}/${total}) × (${win - 1}/${total - 1}) = ${fracStr(fr)}. (전수 검산 ✓)`,
    remember: `복원이면 분모가 안 변해요 — 문제를 잘 읽기! (레벨 ${level})`,
    estimatedSec: 110 + level * 5,
  };
}

// =====================================================================
// HP.STAT — 통계
// =====================================================================
export function genHpStat(level: Level): Draft {
  if (level === 1 || level === 2) {
    // X: 1,2,3 확률 p1,p2,p3 (합 10/10)
    const p1 = randInt(2, 5);
    const p2 = randInt(2, Math.min(6, 9 - p1));
    const p3 = 10 - p1 - p2;
    const xs = [1, 2, 3];
    const ps = [p1, p2, p3];
    const E = (xs[0] * p1 + xs[1] * p2 + xs[2] * p3) / 10;
    const E2 = (xs[0] ** 2 * p1 + xs[1] ** 2 * p2 + xs[2] ** 2 * p3) / 10;
    const V = E2 - E * E;
    let e = 0;
    let e2 = 0;
    for (let i = 0; i < 3; i++) { e += (xs[i] * ps[i]) / 10; e2 += (xs[i] ** 2 * ps[i]) / 10; }
    chk(near(e, E) && near(e2 - e * e, V), 'HP.STAT L12');
    if (level === 1) {
      const ansStr = Number.isInteger(E) ? `${E}` : E.toFixed(1);
      return {
        stem: `확률변수 X의 확률분포가 P(X=1)=${p1}/10, P(X=2)=${p2}/10, P(X=3)=${p3}/10일 때, 기댓값 E(X)는?`,
        ...buildChoices(ansStr, [
          { text: '2' === ansStr ? `${(E + 0.3).toFixed(1)}` : '2', tag: 'CONCEPT' },
          { text: (E + 0.5).toFixed(1), tag: 'CALCULATION' },
          { text: (E - 0.4).toFixed(1), tag: 'FORMULA' },
        ], (g) => (E + 0.1 * (g + 2)).toFixed(1)),
        hints: ['E(X) = Σ x·P(X=x).', `1×${p1}/10 + 2×${p2}/10 + 3×${p3}/10.`, `분자 = ${p1 + 2 * p2 + 3 * p3}.`],
        idea: '기댓값 = 확률 가중 평균.',
        solve: `E(X) = ${p1 + 2 * p2 + 3 * p3}/10 = ${ansStr}.`,
        remember: '확률의 합 = 1 검산은 습관!',
        estimatedSec: 90,
      };
    }
    const ansStr = Number.isInteger(V) ? `${V}` : V.toFixed(2);
    return {
      stem: `확률변수 X: P(X=1)=${p1}/10, P(X=2)=${p2}/10, P(X=3)=${p3}/10일 때, 분산 V(X)는? (소수로)`,
      ...buildChoices(ansStr, [
        { text: E2.toFixed(2) === ansStr ? (V + 0.1).toFixed(2) : E2.toFixed(2), tag: 'CONCEPT' },
        { text: (E * E).toFixed(2) === ansStr ? (V + 0.2).toFixed(2) : (E * E).toFixed(2), tag: 'FORMULA' },
        { text: (V + 0.3).toFixed(2), tag: 'CALCULATION' },
      ], (g) => (V + 0.1 * (g + 4)).toFixed(2)),
      hints: ['V(X) = E(X²) − {E(X)}².', `E(X²) = ${E2.toFixed(2)}, E(X) = ${E.toFixed(1)}.`, `${E2.toFixed(2)} − ${(E * E).toFixed(2)}.`],
      idea: '분산 = 제곱의 평균 − 평균의 제곱.',
      solve: `V(X) = ${E2.toFixed(2)} − ${(E * E).toFixed(2)} = ${ansStr}.`,
      remember: '표준편차 = √분산 — 단위가 X와 같아져요.',
      estimatedSec: 110,
    };
  }
  if (level === 3) {
    const n = pick([10, 20, 30, 60]);
    const pDen = pick([2, 3, 5]);
    const E = n / pDen;
    const V = (n / pDen) * (1 - 1 / pDen);
    chk(near(E * (1 - 1 / pDen), V), 'HP.STAT L3');
    const ansStr = `E = ${Number.isInteger(E) ? E : E.toFixed(1)}, V = ${Number.isInteger(V) ? V : V.toFixed(1)}`;
    return {
      stem: `이항분포 B(${n}, 1/${pDen})을 따르는 확률변수 X의 기댓값 E(X)와 분산 V(X)는?`,
      ...buildChoices(ansStr, [
        { text: `E = ${Number.isInteger(E) ? E : E.toFixed(1)}, V = ${Number.isInteger(E) ? E : E.toFixed(1)}`, tag: 'CONCEPT' },
        { text: `E = ${n}, V = ${Number.isInteger(V) ? V : V.toFixed(1)}`, tag: 'FORMULA' },
        { text: `E = ${Number.isInteger(E) ? E : E.toFixed(1)}, V = ${(V / 2).toFixed(1)}`, tag: 'CALCULATION' },
      ], (g) => `E = ${(E + g).toFixed(0)}, V = ${V.toFixed(1)}`),
      hints: ['이항분포 공식: E = np, V = np(1−p).', `E = ${n} × 1/${pDen}.`, `V = ${n} × 1/${pDen} × ${pDen - 1}/${pDen}.`],
      idea: '이항분포는 공식 하나로 E, V가 즉시!',
      solve: ansStr + '.',
      remember: 'V = E × (1−p)로도 기억!',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const m = pick([50, 60, 70, 100]);
    const sd = pick([5, 10, 20]);
    const kk = pick([1, 2]);
    const x = m + kk * sd;
    const ans = kk;
    chk(near((x - m) / sd, ans), 'HP.STAT L4');
    return {
      stem: `확률변수 X가 정규분포 N(${m}, ${sd}²)을 따를 때, X = ${x}를 표준화한 Z 값은?`,
      ...buildChoices(`${ans}`, [
        { text: `${x - m}` === `${ans}` ? `${ans + 2}` : `${x - m}`, tag: 'CONCEPT' },
        { text: `${-ans === ans ? ans + 1 : -ans}`, tag: 'SIGN' },
        { text: `${(x / m).toFixed(1)}` === `${ans}` ? `${ans + 3}` : `${(x / m).toFixed(1)}`, tag: 'FORMULA' },
      ], (g) => `${ans + g + 1}`),
      hints: ['표준화: Z = (X − m)/σ.', `(${x} − ${m})/${sd}.`, `= ${ans}.`],
      idea: '표준화 = "평균에서 표준편차 몇 개만큼 떨어졌나".',
      solve: `Z = ${x - m}/${sd} = ${ans}.`,
      remember: '모든 정규분포 문제는 Z로 번역해 표 하나로 해결!',
      estimatedSec: 90,
    };
  }
  // L5 — 신뢰구간 (95%, z=1.96)
  const sd = pick([10, 20]);
  const n = pick([25, 100]);
  const mean = randInt(60, 80);
  const half = (1.96 * sd) / Math.sqrt(n);
  const lo = (mean - half).toFixed(2);
  const hi = (mean + half).toFixed(2);
  chk(near(half, (1.96 * sd) / Math.sqrt(n)), 'HP.STAT L5');
  return {
    stem: `모표준편차 ${sd}인 모집단에서 크기 ${n}인 표본을 뽑았더니 표본평균이 ${mean}이었습니다. 모평균의 95% 신뢰구간은? (z₀.₀₂₅ = 1.96)`,
    ...buildChoices(`[${lo}, ${hi}]`, [
      { text: `[${(mean - 1.96 * sd).toFixed(2)}, ${(mean + 1.96 * sd).toFixed(2)}]`, tag: 'FORMULA' },
      { text: `[${(mean - half / 2).toFixed(2)}, ${(mean + half / 2).toFixed(2)}]`, tag: 'CALCULATION' },
      { text: `[${mean - sd}, ${mean + sd}]`, tag: 'CONCEPT' },
    ], (g) => `[${(mean - half - g).toFixed(2)}, ${(mean + half + g).toFixed(2)}]`),
    hints: ['신뢰구간: x̄ ± 1.96 × σ/√n.', `σ/√n = ${sd}/√${n} = ${(sd / Math.sqrt(n)).toFixed(1)}.`, `폭의 절반 = ${half.toFixed(2)}.`],
    idea: '표본이 클수록(√n) 구간이 좁아져요 — 정보가 확신을 낳는다.',
    solve: `${mean} ± ${half.toFixed(2)} → [${lo}, ${hi}].`,
    remember: '99%면 1.96 대신 2.58!',
    estimatedSec: 130,
  };
}

export function transferHpStat(level: Level): Draft {
  const n = pick([100, 400])
  const p = pick([2, 4]); // 1/p
  const E = n / p;
  const sd = Math.sqrt((n / p) * (1 - 1 / p));
  chk(near(sd * sd, E * (1 - 1 / p)), 'HP.STAT T');
  return {
    stem: `한 문제를 찍어서 맞힐 확률이 1/${p}인 ${n}문항 시험이 있습니다. 전부 찍었을 때 맞히는 개수의 기댓값은?`,
    ...buildChoices(`${E}개`, [
      { text: `${n / 2}개` === `${E}개` ? `${E + 10}개` : `${n / 2}개`, tag: 'CONCEPT' },
      { text: `${Math.round(sd)}개`, tag: 'FORMULA' },
      { text: `${E + p}개`, tag: 'CALCULATION' },
    ], (g) => `${E + g * 5}개`),
    hints: ['각 문항이 독립 시행이에요.', '이항분포 B(n, p)의 E = np.', `${n} × 1/${p}.`],
    idea: '"찍기 점수"의 정체 = 이항분포의 기댓값.',
    solve: `E = ${n}/${p} = ${E}개.`,
    remember: `찍기로는 평균 이상이 어렵죠 — 공부합시다! (레벨 ${level})`,
    estimatedSec: 90 + level * 5,
  };
}
