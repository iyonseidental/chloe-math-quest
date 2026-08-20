// 중3 — 제곱근과 실수 / 곱셈공식·인수분해 / 이차방정식 / 이차함수 / 삼각비 / 대푯값과 산포도
import type { Level } from '../types.ts';
import { buildChoices, fmtSigned, nonZero, pick, randInt, simplifyFrac, fracStr } from './util.ts';
import type { Draft } from './index.ts';

const simplifySqrt = (n: number): [number, number] => {
  for (let k = Math.floor(Math.sqrt(n)); k >= 1; k--) if (n % (k * k) === 0) return [k, n / (k * k)];
  return [1, n];
};
const sqrtStr = ([k, rest]: [number, number]) => (rest === 1 ? `${k}` : k === 1 ? `√${rest}` : `${k}√${rest}`);

// =====================================================================
// M3.NUM.SQRT — 제곱근과 실수
// =====================================================================
export function genNumSqrt(level: Level): Draft {
  if (level === 1) {
    const k = randInt(4, 13);
    const sq = k * k;
    return {
      stem: `다음 값을 구하세요.\n√${sq}`,
      ...buildChoices(
        `${k}`,
        [
          { text: `${sq / 2}`, tag: 'CONCEPT' },
          { text: `±${k}`, tag: 'CONCEPT' },
          { text: `${k + 1}`, tag: 'CALCULATION' },
        ],
        (g) => `${k + g}`,
      ),
      hints: ['√a는 "제곱해서 a가 되는 양수"예요.', `어떤 수를 제곱하면 ${sq}이 될까요?`, `${k}² = ${sq}.`],
      idea: '√(제곱수)는 근호가 벗겨져요. 제곱수(1,4,9,16,…)와 친해지는 것이 시작!',
      solve: `${k}² = ${sq} 이므로 √${sq} = ${k}.`,
      remember: '기호 √a 자체는 양수 하나만 가리켜요. "제곱근"(±)과 구분!',
      estimatedSec: 35,
    };
  }
  if (level === 2) {
    const b = pick([2, 3, 5, 7]);
    const a = randInt(2, 6);
    const c = nonZero(-5, 5);
    const sum = a + c;
    return {
      stem: `다음을 간단히 하세요.\n${a}√${b} ${fmtSigned(c)}√${b}`,
      ...buildChoices(
        sum === 0 ? '0' : sqrtStr([sum, b]),
        [
          { text: sqrtStr([a * c === sum ? sum + 1 : a * c, b]), tag: 'CONCEPT' },
          { text: `${sum}√${b * 2}`, tag: 'CALCULATION' },
          { text: sqrtStr([a - c === sum ? sum + 2 : a - c, b]), tag: 'SIGN' },
        ],
        (g) => sqrtStr([sum + g, b]),
      ),
      hints: ['√b를 하나의 문자처럼 생각해요.', `${a}√${b}는 √${b}가 ${a}개라는 뜻.`, `계수끼리 계산: ${a} ${fmtSigned(c)}.`],
      idea: '같은 근호는 동류항 — 문자와 식에서 배운 규칙이 그대로 적용돼요.',
      solve: `(${a} ${fmtSigned(c)})√${b} = ${sum === 0 ? '0' : sqrtStr([sum, b])}.`,
      remember: '근호 안 수가 다르면 절대 합칠 수 없어요 (√2+√3 ≠ √5).',
      estimatedSec: 50,
    };
  }
  if (level === 3) {
    const x = pick([2, 3, 6, 8]);
    const y = pick([2, 3, 6, 12].filter((v) => simplifySqrt(v * x)[0] > 1));
    const prod = x * y;
    const simp = simplifySqrt(prod);
    return {
      stem: `다음을 계산하세요.\n√${x} × √${y}`,
      ...buildChoices(
        sqrtStr(simp),
        [
          { text: `√${prod}`, tag: 'CONCEPT' },
          { text: sqrtStr(simplifySqrt(x + y)), tag: 'FORMULA' },
          { text: sqrtStr([simp[0] + 1, simp[1]]), tag: 'CALCULATION' },
        ],
        (g) => sqrtStr([simp[0] + g, simp[1]]),
      ),
      hints: ['√a × √b = √(ab)로 합쳐요.', `√${prod}이 됐다면, 안에 제곱수가 숨어 있는지 확인!`, `${prod} = ${simp[0] * simp[0]} × ${simp[1]}.`],
      idea: '근호의 곱셈 후엔 반드시 "가장 간단한 꼴"로 — 제곱수를 밖으로 꺼내요.',
      solve: `√${x}×√${y} = √${prod} = √(${simp[0]}²×${simp[1]}) = ${sqrtStr(simp)}.`,
      remember: '답이 √(큰 수)로 끝나면 아직 끝난 게 아닐 수 있어요!',
      estimatedSec: 65,
    };
  }
  if (level === 4) {
    const a = randInt(2, 9);
    const b = pick([2, 3, 5]);
    const g = simplifyFrac(a, b); // a/√b = (a/b)√b 를 약분한 몫
    const correct = g[1] === 1 ? (g[0] === 1 ? `√${b}` : `${g[0]}√${b}`) : `${g[0] === 1 ? '' : g[0]}√${b}/${g[1]}`;
    return {
      stem: `분모를 유리화하세요.\n${a}/√${b}`,
      ...buildChoices(
        correct,
        [
          { text: `${a}√${b}`, tag: 'CONCEPT' },
          { text: `${a}√${b}/${b * b}`, tag: 'CALCULATION' },
          { text: `√${b}/${a}`, tag: 'FORMULA' },
        ],
        (gg) => `${a + gg}√${b}/${b}`,
      ),
      hints: [
        '분모와 분자에 같은 수(√b)를 곱해도 값은 변하지 않아요.',
        `분모: √${b} × √${b} = ${b}.`,
        `분자: ${a} × √${b} = ${a}√${b}. 약분 가능하면 약분!`,
      ],
      idea: '유리화 = 분모에서 근호 없애기. √b/√b(=1)를 곱하는 것이 전부예요.',
      solve: `${a}/√${b} = ${a}√${b}/${b}${g[1] === 1 ? ` = ${g[0]}√${b}` : ''}.`,
      remember: '유리화 후 약분 확인까지가 한 세트!',
      estimatedSec: 80,
    };
  }
  // L5 — 곱셈공식과 근호
  const a = pick([3, 5, 6, 7]);
  const b = pick([2, 3].filter((v) => v < a));
  const answer = a - b;
  return {
    stem: `다음을 계산하세요.\n(√${a} + √${b})(√${a} − √${b})`,
    ...buildChoices(
      `${answer}`,
      [
        { text: `${a + b}`, tag: 'SIGN' },
        { text: sqrtStr(simplifySqrt(a - b)) === `${answer}` ? `${answer + 2}` : `√${a - b}`, tag: 'CONCEPT' },
        { text: `${a * b - b}`, tag: 'CALCULATION' },
      ],
      (g) => `${answer + g}`,
    ),
    hints: ['(A+B)(A−B) 꼴이에요 — 곱셈공식을 떠올려요.', '(A+B)(A−B) = A² − B².', `(√${a})² = ${a}, (√${b})² = ${b}.`],
    idea: '합차공식은 근호를 "증발"시켜요 — 유리화와 고난도 계산의 핵심 무기예요.',
    solve: `(√${a})² − (√${b})² = ${a} − ${b} = ${answer}.`,
    remember: '(√a)² = a. 근호와 제곱은 서로를 지워요.',
    estimatedSec: 80,
  };
}

export function transferNumSqrt(level: Level): Draft {
  const area = pick([18, 32, 48, 50, 72]);
  const simp = simplifySqrt(area);
  return {
    stem: `넓이가 ${area}cm²인 정사각형 모양 색종이의 한 변의 길이를 가장 간단한 꼴로 나타내면?`,
    ...buildChoices(
      `${sqrtStr(simp)}cm`,
      [
        { text: `√${area}cm`, tag: 'CONCEPT' },
        { text: `${area / 4}cm`, tag: 'FORMULA' },
        { text: `${sqrtStr([simp[0] + 1, simp[1]])}cm`, tag: 'CALCULATION' },
      ],
      (g) => `${sqrtStr([simp[0] + g, simp[1]])}cm`,
    ),
    hints: ['정사각형 넓이 = (한 변)².', `한 변 = √${area}.`, `${area}에서 제곱수를 꺼내 간단히!`],
    idea: '제곱근은 "넓이에서 길이로 돌아가는 문" — 실측과 설계에서 늘 쓰여요.',
    solve: `한 변 = √${area} = ${sqrtStr(simp)}cm.`,
    remember: '넓이→길이 = 제곱근, 길이→넓이 = 제곱.',
    estimatedSec: 70 + level * 5,
  };
}

// =====================================================================
// M3.ALG.FACT — 곱셈공식과 인수분해
// =====================================================================
export function genAlgFact(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-7, 7);
    const b = nonZero(-7, 7);
    const B = a + b;
    const C = a * b;
    return {
      stem: `다음을 전개하세요.\n(x ${fmtSigned(a)})(x ${fmtSigned(b)})`,
      ...buildChoices(
        `x² ${fmtSigned(B)}x ${fmtSigned(C)}`.replace(/ \+ 0x/g, '').replace(/ \+ 0$/g, ''),
        [
          { text: `x² ${fmtSigned(C)}x ${fmtSigned(B)}`, tag: 'FORMULA' },
          { text: `x² ${fmtSigned(a - b)}x ${fmtSigned(C)}`, tag: 'SIGN' },
          { text: `x² ${fmtSigned(B)}x ${fmtSigned(C + 1)}`, tag: 'CALCULATION' },
        ],
        (g) => `x² ${fmtSigned(B)}x ${fmtSigned(C + g)}`,
      ),
      hints: ['각 항을 빠짐없이 곱해요 (분배법칙).', 'x항의 계수 = 두 수의 합.', '상수항 = 두 수의 곱.'],
      idea: '(x+a)(x+b) = x² + (합)x + (곱). 전개의 표준 공식이에요.',
      solve: `합 ${a}+(${b}) = ${B}, 곱 ${a}×(${b}) = ${C} → x² ${fmtSigned(B)}x ${fmtSigned(C)}.`,
      remember: '합은 x의 계수로, 곱은 상수항으로.',
      estimatedSec: 60,
    };
  }
  if (level === 2) {
    const a = randInt(2, 8);
    const plus = Math.random() < 0.5;
    return {
      stem: `다음을 전개하세요.\n(x ${plus ? '+' : '−'} ${a})²`,
      ...buildChoices(
        `x² ${plus ? '+' : '−'} ${2 * a}x + ${a * a}`,
        [
          { text: `x² + ${a * a}`, tag: 'FORMULA' },
          { text: `x² ${plus ? '+' : '−'} ${a}x + ${a * a}`, tag: 'CALCULATION' },
          { text: `x² ${plus ? '−' : '+'} ${2 * a}x + ${a * a}`, tag: 'SIGN' },
        ],
        (g) => `x² ${plus ? '+' : '−'} ${2 * a + g}x + ${a * a}`,
      ),
      hints: ['(A±B)² = A² ± 2AB + B².', '가운데 항은 "2 × 두 항의 곱".', `2×x×${a} = ${2 * a}x.`],
      idea: '완전제곱 공식의 핵심은 "가운데 2AB" — 이걸 빼먹는 것이 최다 오답이에요.',
      solve: `(x ${plus ? '+' : '−'} ${a})² = x² ${plus ? '+' : '−'} ${2 * a}x + ${a * a}.`,
      remember: '(x+a)² ≠ x²+a². 가운데 항을 잊지 마세요!',
      estimatedSec: 60,
    };
  }
  if (level === 3) {
    const p = nonZero(-8, 8);
    const q = nonZero(-8, 8);
    const B = p + q;
    const C = p * q;
    const fmtPair = (u: number, v: number) => {
      const [lo, hi] = [Math.min(u, v), Math.max(u, v)];
      return `(x ${fmtSigned(lo)})(x ${fmtSigned(hi)})`;
    };
    return {
      stem: `다음을 인수분해하세요.\nx² ${fmtSigned(B)}x ${fmtSigned(C)}`,
      ...buildChoices(
        fmtPair(p, q),
        [
          { text: fmtPair(-p, -q) === fmtPair(p, q) ? fmtPair(p + 1, q) : fmtPair(-p, -q), tag: 'SIGN' },
          { text: fmtPair(B, C % B === 0 ? C / B : 1) === fmtPair(p, q) ? fmtPair(p, q + 2) : fmtPair(B, C % B === 0 ? C / B : 1), tag: 'CONCEPT' },
          { text: fmtPair(p + 1, q - 1) === fmtPair(p, q) ? fmtPair(p + 2, q - 2) : fmtPair(p + 1, q - 1), tag: 'CALCULATION' },
        ],
        (g) => fmtPair(p + g, q),
      ),
      hints: [`곱해서 ${C}, 더해서 ${B}가 되는 두 수를 찾아요.`, `${C}의 약수 쌍을 나열해보세요.`, `${p}와 ${q}: 곱 ${C}, 합 ${B} ✓`],
      idea: '인수분해는 전개의 역주행 — "곱과 합" 퍼즐로 접근해요.',
      solve: `${p} × ${q} = ${C}, ${p} + ${q} = ${B} → (x ${fmtSigned(p)})(x ${fmtSigned(q)}).`,
      remember: '부호 결정: 곱이 양수면 같은 부호, 음수면 다른 부호.',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const a = randInt(2, 9);
    return {
      stem: `다음을 인수분해하세요.\nx² − ${a * a}`,
      ...buildChoices(
        `(x + ${a})(x − ${a})`,
        [
          { text: `(x − ${a})²`, tag: 'FORMULA' },
          { text: `(x + ${a})²`, tag: 'FORMULA' },
          { text: `x(x − ${a * a})`, tag: 'CONCEPT' },
        ],
        (g) => `(x + ${a + g})(x − ${a + g})`,
      ),
      hints: ['두 항이 모두 "제곱꼴"인지 확인해요.', `${a * a} = ${a}².`, 'A² − B² = (A+B)(A−B).'],
      idea: '합차공식의 역방향 — "제곱 빼기 제곱"이 보이면 즉시 (합)(차)!',
      solve: `x² − ${a}² = (x + ${a})(x − ${a}).`,
      remember: 'x² + a²은 (실수 범위에서) 인수분해되지 않아요 — 부호를 확인!',
      estimatedSec: 60,
    };
  }
  // L5 — 수 계산 활용
  const base = pick([98, 99, 101, 102, 97]);
  const d = base - 100;
  const answer = base * base;
  return {
    stem: `곱셈공식을 이용하여 ${base}² 을 계산하세요.`,
    ...buildChoices(
      `${answer}`,
      [
        { text: `${10000 + d * d}`, tag: 'FORMULA' },
        { text: `${10000 + 200 * d === answer ? answer + 10 : 10000 + 200 * d}`, tag: 'CALCULATION' },
        { text: `${answer + 100}`, tag: 'CALCULATION' },
      ],
      (g) => `${answer + g * 10}`,
    ),
    hints: [
      `${base} = 100 ${fmtSigned(d)} 로 바꿔보세요.`,
      '(100 ± a)² = 10000 ± 200a + a².',
      `10000 ${fmtSigned(200 * d)} + ${d * d}.`,
    ],
    idea: '곱셈공식은 계산 무기 — 100 근처의 제곱은 암산 영역이 돼요.',
    solve: `(100 ${fmtSigned(d)})² = 10000 ${fmtSigned(200 * d)} + ${d * d} = ${answer}.`,
    remember: '복잡한 수는 "깔끔한 수 ± 작은 수"로 쪼개 공식에 태우기.',
    estimatedSec: 90,
  };
}

export function transferAlgFact(level: Level): Draft {
  const a = randInt(2, 6);
  const b = randInt(1, a - 1) || 1;
  const answer = (a + b) * (a - b);
  return {
    stem: `한 변이 ${a}m인 정사각형 텃밭의 가로를 ${b}m 늘리고 세로를 ${b}m 줄였습니다. 새 텃밭의 넓이는? (곱셈공식 이용)`,
    ...buildChoices(
      `${answer}m²`,
      [
        { text: `${a * a}m²`, tag: 'CONCEPT' },
        { text: `${a * a + b * b}m²`, tag: 'SIGN' },
        { text: `${answer - 1}m²`, tag: 'CALCULATION' },
      ],
      (g) => `${answer + g}m²`,
    ),
    hints: [`새 가로 = ${a}+${b}, 새 세로 = ${a}−${b}.`, '(a+b)(a−b) 꼴이에요.', `= a² − b² = ${a * a} − ${b * b}.`],
    idea: '"늘리고 줄이면 원래보다 작아진다"(a²−b² < a²) — 공식이 직관을 증명해요.',
    solve: `(${a}+${b})(${a}−${b}) = ${a}² − ${b}² = ${answer}m².`,
    remember: '같은 양을 늘리고 줄여도 넓이는 그대로가 아니에요 — b²만큼 손해!',
    estimatedSec: 90 + level * 5,
  };
}

// =====================================================================
// M3.ALG.QUAD — 이차방정식
// =====================================================================
export function genAlgQuad(level: Level): Draft {
  if (level === 1) {
    const k = pick([4, 9, 16, 25, 36, 49]);
    const r = Math.sqrt(k);
    return {
      stem: `이차방정식을 푸세요.\nx² = ${k}`,
      ...buildChoices(
        `x = ±${r}`,
        [
          { text: `x = ${r}`, tag: 'CONCEPT' },
          { text: `x = ±${k / 2}`, tag: 'FORMULA' },
          { text: `x = ±${r + 1}`, tag: 'CALCULATION' },
        ],
        (g) => `x = ±${r + g}`,
      ),
      hints: ['제곱해서 k가 되는 수는 몇 개일까요?', `${r}² = ${k}, 그리고 또 하나…`, `(−${r})² 도 ${k}이에요.`],
      idea: '이차방정식의 해는 (보통) 2개 — 양수 근과 음수 근을 모두 챙겨요.',
      solve: `x = ±√${k} = ±${r}.`,
      remember: '± 를 빠뜨리면 해의 절반을 잃어요!',
      estimatedSec: 40,
    };
  }
  if (level === 2) {
    const p = nonZero(-8, 8);
    let q = nonZero(-8, 8);
    while (q === p) q = nonZero(-8, 8);
    const [lo, hi] = [Math.min(p, q), Math.max(p, q)];
    return {
      stem: `이차방정식을 푸세요.\n(x ${fmtSigned(-lo)})(x ${fmtSigned(-hi)}) = 0`,
      ...buildChoices(
        `x = ${lo} 또는 x = ${hi}`,
        [
          { text: `x = ${-lo} 또는 x = ${-hi}`, tag: 'SIGN' },
          { text: `x = ${lo * hi}`, tag: 'CONCEPT' },
          { text: `x = ${lo} 또는 x = ${hi + 1}`, tag: 'CALCULATION' },
        ],
        (g) => `x = ${lo + g} 또는 x = ${hi}`,
      ),
      hints: ['두 수의 곱이 0이면?', 'AB = 0 ⇔ A = 0 또는 B = 0.', '각 괄호를 0으로 만드는 x를 찾아요.'],
      idea: '"곱이 0" 원리 — 이차방정식 풀이 전체를 지탱하는 기둥이에요.',
      solve: `x ${fmtSigned(-lo)} = 0 → x = ${lo}, x ${fmtSigned(-hi)} = 0 → x = ${hi}.`,
      remember: '(x−3)=0의 해는 x=3. 괄호 안 부호 반대!',
      estimatedSec: 55,
    };
  }
  if (level === 3) {
    const p = nonZero(-7, 7);
    let q = nonZero(-7, 7);
    while (q === p) q = nonZero(-7, 7);
    const B = -(p + q);
    const C = p * q;
    const [lo, hi] = [Math.min(p, q), Math.max(p, q)];
    return {
      stem: `이차방정식을 푸세요.\nx² ${fmtSigned(B)}x ${fmtSigned(C)} = 0`,
      ...buildChoices(
        `x = ${lo} 또는 x = ${hi}`,
        [
          { text: `x = ${-lo} 또는 x = ${-hi}`, tag: 'SIGN' },
          { text: `x = ${lo + 1} 또는 x = ${hi}`, tag: 'CALCULATION' },
          { text: `x = ${B} 또는 x = ${C}`, tag: 'CONCEPT' },
        ],
        (g) => `x = ${lo} 또는 x = ${hi + g}`,
      ),
      hints: [`곱해서 ${C}, 더해서 ${-B} 인 두 수를 찾아 인수분해해요.`, `(x ${fmtSigned(-p)})(x ${fmtSigned(-q)}) = 0.`, '각 괄호 = 0.'],
      idea: '인수분해 → 곱이 0 → 두 해. 중3 이차방정식의 표준 루트예요.',
      solve: `x² ${fmtSigned(B)}x ${fmtSigned(C)} = (x ${fmtSigned(-p)})(x ${fmtSigned(-q)}) = 0 → x = ${p} 또는 ${q}.`,
      remember: '해를 원래 식에 대입해 검산하는 습관 — 부호 실수를 잡아줘요.',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const r = nonZero(-6, 6);
    const B = -2 * r;
    const C = r * r;
    return {
      stem: `이차방정식 x² ${fmtSigned(B)}x ${fmtSigned(C)} = 0 의 해를 구하세요.`,
      ...buildChoices(
        `x = ${r} (중근)`,
        [
          { text: `x = ${-r === r ? r + 1 : -r} (중근)`, tag: 'SIGN' },
          { text: `x = ${r} 또는 x = ${-r === r ? r + 2 : -r}`, tag: 'CONCEPT' },
          { text: `x = ${B}`, tag: 'FORMULA' },
        ],
        (g) => `x = ${r + g} (중근)`,
      ),
      hints: ['완전제곱꼴로 인수분해되는지 확인해요.', `x² ${fmtSigned(B)}x ${fmtSigned(C)} = (x ${fmtSigned(-r)})².`, '같은 괄호가 두 번 → 해는 하나(중근).'],
      idea: '(x−r)² = 0 이면 해가 겹쳐요 — 이것이 "중근"이에요.',
      solve: `(x ${fmtSigned(-r)})² = 0 → x = ${r} (중근).`,
      remember: '상수항이 (x계수 절반)²이면 완전제곱 — 중근 신호!',
      estimatedSec: 80,
    };
  }
  // L5 — 활용
  const n = randInt(4, 11);
  const prod = n * (n + 1);
  return {
    stem: `연속하는 두 자연수의 곱이 ${prod}입니다. 두 수 중 작은 수를 구하세요.`,
    ...buildChoices(
      `${n}`,
      [
        { text: `${n + 1}`, tag: 'INTERPRETATION' },
        { text: `${n - 1}`, tag: 'CALCULATION' },
        { text: `${Math.round(prod / 2)}`, tag: 'CONCEPT' },
      ],
      (g) => `${n + g + 1}`,
    ),
    hints: [
      '작은 수를 x로 놓으면 다음 수는 x+1.',
      `x(x+1) = ${prod} → x² + x − ${prod} = 0.`,
      `인수분해: (x ${fmtSigned(-n)})(x ${fmtSigned(n + 1)}) = 0. 자연수 조건!`,
    ],
    idea: '활용 문제의 마무리: 방정식의 해 중 "조건에 맞는 것"만 답이에요.',
    solve: `x² + x − ${prod} = 0 → x = ${n} 또는 x = ${-(n + 1)} → 자연수이므로 ${n}.`,
    remember: '음수 해는 버려야 할 때가 있어요 — 문제의 조건을 끝까지!',
    estimatedSec: 110,
  };
}

export function transferAlgQuad(level: Level): Draft {
  const t = randInt(2, 5);
  const h0 = 5 * t * t; // h = 5t² 낙하 모델
  return {
    stem: `높이 ${h0}m인 절벽에서 공을 가만히 떨어뜨리면 t초 후 낙하 거리는 약 5t² m입니다. 공이 바닥에 닿는 것은 몇 초 후일까요?`,
    ...buildChoices(
      `${t}초`,
      [
        { text: `${h0 / 5}초`, tag: 'CONCEPT' },
        { text: `${t * t}초`, tag: 'FORMULA' },
        { text: `${t + 1}초`, tag: 'CALCULATION' },
      ],
      (g) => `${t + g + 1}초`,
    ),
    hints: ['바닥에 닿는다 = 낙하 거리가 절벽 높이와 같다.', `5t² = ${h0}.`, `t² = ${t * t} → t = ? (시간은 양수)`],
    idea: '물체의 낙하는 이차방정식 — 물리와 수학이 만나는 지점이에요.',
    solve: `5t² = ${h0} → t² = ${t * t} → t = ${t}초 (양수 해만).`,
    remember: '시간·길이 문제에서 음수 해는 버려요.',
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// M3.FUN.QUAD — 이차함수
// =====================================================================
export function genFunQuad(level: Level): Draft {
  if (level === 1) {
    const a = pick([-3, -2, -1, 1, 2, 3]);
    const k = nonZero(-4, 4);
    const answer = a * k * k;
    return {
      stem: `이차함수 y = ${a === 1 ? '' : a === -1 ? '−' : a}x² 에서 x = ${k} 일 때 y 값은?`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${-answer === answer ? answer + 1 : -answer}`, tag: 'SIGN' },
          { text: `${a * k}`, tag: 'CONCEPT' },
          { text: `${a * k * 2}`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + (g % 2 ? g : -g)}`,
      ),
      hints: ['x를 제곱부터 해요.', `(${k})² = ${k * k}.`, `${a} × ${k * k} = ?`],
      idea: 'y = ax²의 값 계산 — 제곱 먼저, 계수는 나중. 순서가 실수를 막아요.',
      solve: `y = ${a}×(${k})² = ${a}×${k * k} = ${answer}.`,
      remember: '(음수)²는 양수 — 그다음 a의 부호가 최종 부호를 정해요.',
      estimatedSec: 45,
    };
  }
  if (level === 2) {
    const p = nonZero(-6, 6);
    const q = nonZero(-6, 6);
    return {
      stem: `이차함수 y = (x ${fmtSigned(-p)})² ${fmtSigned(q)} 의 그래프의 꼭짓점의 좌표는?`,
      ...buildChoices(
        `(${p}, ${q})`,
        [
          { text: `(${-p}, ${q})`, tag: 'SIGN' },
          { text: `(${q}, ${p})`, tag: 'INTERPRETATION' },
          { text: `(${p}, ${-q === q ? q + 1 : -q})`, tag: 'SIGN' },
        ],
        (g) => `(${p + g}, ${q})`,
      ),
      hints: ['y = (x−p)² + q의 꼭짓점은 (p, q).', '괄호 안 부호가 "반대로" 나와요.', `x ${fmtSigned(-p)} = 0 이 되는 x가 꼭짓점의 x좌표.`],
      idea: '꼭짓점은 "괄호를 0으로 만드는 x"에서 — 부호 반전의 이유를 이해하면 안 헷갈려요.',
      solve: `꼭짓점 = (${p}, ${q}).`,
      remember: '(x−3)²의 꼭짓점 x는 +3. 괄호 안 부호의 반대!',
      estimatedSec: 55,
    };
  }
  if (level === 3) {
    const a = pick([-2, -1, 1, 2]);
    const p = nonZero(-5, 5);
    const q = nonZero(-6, 6);
    const isMin = a > 0;
    return {
      stem: `이차함수 y = ${a === 1 ? '' : a === -1 ? '−' : a}(x ${fmtSigned(-p)})² ${fmtSigned(q)} 의 최${isMin ? '솟' : '댓'}값은?`,
      ...buildChoices(
        `x = ${p} 일 때 최${isMin ? '솟' : '댓'}값 ${q}`,
        [
          { text: `x = ${q} 일 때 최${isMin ? '솟' : '댓'}값 ${p}`, tag: 'INTERPRETATION' },
          { text: `x = ${-p === p ? p + 1 : -p} 일 때 최${isMin ? '솟' : '댓'}값 ${q}`, tag: 'SIGN' },
          { text: `최${isMin ? '댓' : '솟'}값 ${q}`, tag: 'CONCEPT' },
        ],
        (g) => `x = ${p} 일 때 최${isMin ? '솟' : '댓'}값 ${q + g}`,
      ),
      hints: [
        `a = ${a} 의 부호를 보세요.`,
        `${isMin ? 'a > 0 → 아래로 볼록 → 가장 낮은 점이 존재(최솟값)' : 'a < 0 → 위로 볼록 → 가장 높은 점이 존재(최댓값)'}.`,
        '그 극값은 꼭짓점에서 나와요.',
      ],
      idea: '최대·최소는 그래프의 모양(볼록 방향)과 꼭짓점 — 두 정보의 결합이에요.',
      solve: `${isMin ? '아래로' : '위로'} 볼록이므로 꼭짓점 (${p}, ${q})에서 최${isMin ? '솟' : '댓'}값 ${q}.`,
      remember: 'a>0 웃는 얼굴(∪) 최솟값, a<0 우는 얼굴(∩) 최댓값.',
      estimatedSec: 70,
    };
  }
  if (level === 4) {
    const p = nonZero(-4, 4);
    const q = nonZero(-8, 8);
    const B = -2 * p;
    const C = p * p + q;
    return {
      stem: `이차함수 y = x² ${fmtSigned(B)}x ${fmtSigned(C)} 의 그래프의 꼭짓점의 좌표는?`,
      ...buildChoices(
        `(${p}, ${q})`,
        [
          { text: `(${-p === p ? p + 1 : -p}, ${q})`, tag: 'SIGN' },
          { text: `(${B}, ${C})`, tag: 'CONCEPT' },
          { text: `(${p}, ${q + p * p})`, tag: 'CALCULATION' },
        ],
        (g) => `(${p + g}, ${q})`,
      ),
      hints: [
        '완전제곱꼴 y = (x−p)² + q 로 바꿔요.',
        `x² ${fmtSigned(B)}x = (x ${fmtSigned(-p)})² − ${p * p}.`,
        `y = (x ${fmtSigned(-p)})² ${fmtSigned(q)}.`,
      ],
      idea: '일반형 → 표준형(완전제곱) 변환이 이차함수 분석의 핵심 기술이에요.',
      solve: `y = (x ${fmtSigned(-p)})² − ${p * p} ${fmtSigned(C)} = (x ${fmtSigned(-p)})² ${fmtSigned(q)} → 꼭짓점 (${p}, ${q}).`,
      remember: '(x계수 절반)²을 더하고 빼기 — 완전제곱 만들기의 공식 동작.',
      estimatedSec: 100,
    };
  }
  // L5 — 최대 활용
  const r = randInt(2, 5);
  const maxH = 5 * r * r;
  return {
    stem: `위로 던진 공의 높이가 y = −5(x − ${r})² + ${maxH} (x는 초)로 주어집니다. 공이 가장 높이 올라가는 시각과 그때의 높이는?`,
    ...buildChoices(
      `${r}초, ${maxH}m`,
      [
        { text: `${r}초, ${maxH + 5}m`, tag: 'CALCULATION' },
        { text: `${-r}초, ${maxH}m`, tag: 'SIGN' },
        { text: `${maxH}초, ${r}m`, tag: 'INTERPRETATION' },
      ],
      (g) => `${r + g}초, ${maxH}m`,
    ),
    hints: ['식이 이미 표준형이에요 — 꼭짓점을 읽어요.', `꼭짓점 = (${r}, ${maxH}).`, 'a = −5 < 0이므로 꼭짓점이 최고점.'],
    idea: '포물선 운동의 최고점 = 이차함수의 꼭짓점. 스포츠와 로켓의 수학이에요.',
    solve: `꼭짓점 (${r}, ${maxH}) → ${r}초에 최고 높이 ${maxH}m.`,
    remember: '표준형이 주어지면 계산 없이 꼭짓점을 "읽기"만 하면 돼요.',
    estimatedSec: 90,
  };
}

export function transferFunQuad(level: Level): Draft {
  const w = randInt(3, 6) * 2;
  const half = w / 2;
  const maxArea = half * half;
  return {
    stem: `길이 ${2 * w}m의 울타리로 직사각형 닭장을 만들려고 합니다. 가로를 x m라 할 때 넓이는 y = x(${w} − x)입니다. 넓이가 최대가 되는 가로 길이는?`,
    ...buildChoices(
      `${half}m (최대 넓이 ${maxArea}m²)`,
      [
        { text: `${w}m (최대 넓이 0m²)`, tag: 'CONCEPT' },
        { text: `${half - 1}m (최대 넓이 ${(half - 1) * (half + 1)}m²)`, tag: 'CALCULATION' },
        { text: `${half + 2}m (최대 넓이 ${(half + 2) * (half - 2)}m²)`, tag: 'CALCULATION' },
      ],
      (g) => `${half + g}m`,
    ),
    hints: ['y = x(w−x)를 전개하면 위로 볼록한 포물선이에요.', `y = −x² + ${w}x — 꼭짓점의 x는 두 근(0과 ${w})의 한가운데.`, `x = ${w}/2.`],
    idea: '넓이 최대 문제 = 이차함수 꼭짓점 찾기. 답은 늘 "정사각형에 가깝게"!',
    solve: `두 근 0, ${w}의 중점 x = ${half} → 최대 넓이 ${half}×${half} = ${maxArea}m².`,
    remember: '같은 둘레라면 정사각형이 가장 넓다 — 이차함수가 주는 결론.',
    estimatedSec: 110 + level * 5,
  };
}

// =====================================================================
// M3.GEO.TRIG — 삼각비
// =====================================================================
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
];

export function genGeoTrig(level: Level): Draft {
  if (level === 1) {
    const [opp, adj, hyp] = TRIPLES[randInt(0, TRIPLES.length - 1)];
    const which = pick(['sin', 'cos', 'tan'] as const);
    const val: [number, number] = which === 'sin' ? simplifyFrac(opp, hyp) : which === 'cos' ? simplifyFrac(adj, hyp) : simplifyFrac(opp, adj);
    return {
      stem: `직각삼각형에서 ∠A의 대변이 ${opp}, 밑변이 ${adj}, 빗변이 ${hyp}일 때, ${which} A 의 값은?`,
      ...buildChoices(
        fracStr(val),
        [
          { text: fracStr(which === 'sin' ? simplifyFrac(adj, hyp) : simplifyFrac(opp, hyp)), tag: 'FORMULA' },
          { text: fracStr(which === 'tan' ? simplifyFrac(adj, opp) : simplifyFrac(opp, adj)), tag: 'FORMULA' },
          { text: fracStr(simplifyFrac(hyp, opp)), tag: 'CONCEPT' },
        ],
        (g) => fracStr(simplifyFrac(val[0] + g, val[1])),
      ),
      hints: ['sin = 대변/빗변, cos = 밑변/빗변, tan = 대변/밑변.', '빗변은 직각의 맞은편, 가장 긴 변이에요.', `${which}이니까 분자·분모를 정확히 골라요.`],
      idea: '삼각비는 "직각삼각형 변들의 비율"에 붙인 이름이에요. 정의가 전부!',
      solve: `${which} A = ${which === 'sin' ? `${opp}/${hyp}` : which === 'cos' ? `${adj}/${hyp}` : `${opp}/${adj}`} = ${fracStr(val)}.`,
      remember: 'SOH-CAH-TOA — sin은 대/빗, cos는 밑/빗, tan은 대/밑.',
      estimatedSec: 60,
    };
  }
  if (level === 2) {
    const table: Record<string, string> = {
      'sin 30°': '1/2',
      'sin 45°': '√2/2',
      'sin 60°': '√3/2',
      'cos 30°': '√3/2',
      'cos 45°': '√2/2',
      'cos 60°': '1/2',
      'tan 45°': '1',
      'tan 60°': '√3',
    };
    const key = pick(Object.keys(table));
    const answer = table[key];
    const others = [...new Set(Object.values(table))].filter((v) => v !== answer);
    return {
      stem: `${key} 의 값은?`,
      ...buildChoices(
        answer,
        others.slice(0, 3).map((t) => ({ text: t, tag: 'FORMULA' as const })),
        () => '√3/3',
      ),
      hints: ['특수각 표를 떠올려요 — 30°, 45°, 60°.', 'sin은 30→45→60으로 갈수록 커져요: 1/2, √2/2, √3/2.', 'cos는 그 반대 순서, tan 45°는 1.'],
      idea: '특수각 삼각비는 두 개의 삼각자(30-60-90, 45-45-90)에서 나온 값이에요.',
      solve: `${key} = ${answer}.`,
      remember: 'sin 커지는 순서 = cos 작아지는 순서. 표를 한 번 직접 그려보기!',
      estimatedSec: 45,
    };
  }
  if (level === 3) {
    const hyp = pick([4, 6, 8, 10, 12]);
    const angle = pick([30, 60] as const);
    const answer = angle === 30 ? hyp / 2 : hyp / 2; // sin30=1/2 (대변), cos60=1/2
    const which = angle === 30 ? 'sin' : 'cos';
    return {
      stem: `직각삼각형에서 빗변의 길이가 ${hyp}이고 한 예각이 ${angle}° 입니다. ${angle === 30 ? '30° 의 대변' : '60° 와 이웃한 밑변'}의 길이는? (${which} ${angle}° = 1/2)`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${hyp}`, tag: 'CONCEPT' },
          { text: `${answer * 2 === hyp ? hyp - 1 : answer * 2}`, tag: 'CALCULATION' },
          { text: `${answer + 1}`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g}`,
      ),
      hints: [`${which} = ${angle === 30 ? '대변/빗변' : '밑변/빗변'}.`, `1/2 = (구하는 변)/${hyp}.`, `구하는 변 = ${hyp} × 1/2.`],
      idea: '삼각비의 실전 사용법: (변) = (빗변) × (삼각비). 비율이 길이를 만들어요.',
      solve: `변 = ${hyp} × ${which} ${angle}° = ${hyp} × 1/2 = ${answer}.`,
      remember: '어느 변인지(대변? 밑변?)를 그림에서 먼저 확정!',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const dist = pick([10, 20, 30, 40]);
    const answer = dist; // tan45 = 1
    return {
      stem: `건물에서 ${dist}m 떨어진 곳에서 건물 꼭대기를 올려본 각이 45° 였습니다. 눈높이를 무시할 때 건물의 높이는? (tan 45° = 1)`,
      ...buildChoices(
        `${answer}m`,
        [
          { text: `${Math.round(dist * 1.414)}m`, tag: 'FORMULA' },
          { text: `${dist / 2}m`, tag: 'CONCEPT' },
          { text: `${answer + 5}m`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g}m`,
      ),
      hints: ['높이와 거리의 관계를 만드는 삼각비는?', 'tan = 높이(대변)/거리(밑변).', `높이 = ${dist} × tan 45°.`],
      idea: '측량의 원리 — 닿을 수 없는 높이를 각도와 거리로 계산해요.',
      solve: `높이 = ${dist} × tan 45° = ${dist} × 1 = ${answer}m.`,
      remember: '"올려본 각" 문제 = tan. 높이 = 거리 × tan(각).',
      estimatedSec: 90,
    };
  }
  // L5 — 넓이 공식
  const a = pick([4, 6, 8]);
  const b = pick([5, 7, 10]);
  const answer = (a * b) / 2 / 2; // ½ab·sin30 = ¼ab
  return {
    stem: `두 변의 길이가 ${a}, ${b}이고 그 끼인각이 30°인 삼각형의 넓이는? (넓이 = (1/2) × a × b × sin C, sin 30° = 1/2)`,
    ...buildChoices(
      `${answer}`,
      [
        { text: `${(a * b) / 2}`, tag: 'FORMULA' },
        { text: `${a * b}`, tag: 'CONCEPT' },
        { text: `${answer + 2}`, tag: 'CALCULATION' },
      ],
      (g) => `${answer + g}`,
    ),
    hints: ['주어진 넓이 공식에 값을 그대로 넣어요.', `(1/2) × ${a} × ${b} × sin 30°.`, `sin 30° = 1/2 을 곱하는 것을 잊지 말기.`],
    idea: '높이를 몰라도 끼인각만 알면 넓이가 나온다 — 삼각비가 주는 새로운 공식이에요.',
    solve: `(1/2)×${a}×${b}×(1/2) = ${answer}.`,
    remember: '넓이 = ½ab·sinC. 끼인각이어야 해요(마주보는 각 아님)!',
    estimatedSec: 100,
  };
}

export function transferGeoTrig(level: Level): Draft {
  const dist = pick([5, 10, 15]);
  return {
    stem: `연을 날리는데 실이 지면과 30° 를 이루며 팽팽합니다. 실의 길이가 ${dist * 2}m라면 연의 높이는? (sin 30° = 1/2)`,
    ...buildChoices(
      `${dist}m`,
      [
        { text: `${dist * 2}m`, tag: 'CONCEPT' },
        { text: `${Math.round(dist * 2 * 0.866)}m`, tag: 'FORMULA' },
        { text: `${dist + 2}m`, tag: 'CALCULATION' },
      ],
      (g) => `${dist + g}m`,
    ),
    hints: ['실이 빗변, 높이가 대변인 직각삼각형을 그려요.', 'sin = 대변/빗변.', `높이 = ${dist * 2} × sin 30°.`],
    idea: '연·사다리·케이블카 — 기울어진 길이에서 수직 높이를 꺼내는 것이 sin이에요.',
    solve: `높이 = ${dist * 2} × 1/2 = ${dist}m.`,
    remember: '기울어진 것(빗변)에서 높이를 구할 땐 sin!',
    estimatedSec: 80 + level * 5,
  };
}

// =====================================================================
// M3.STA.STAT — 대푯값과 산포도
// =====================================================================
export function genStaStat(level: Level): Draft {
  if (level === 1) {
    const vals = Array.from({ length: 5 }, () => randInt(1, 9)).sort((a, b) => a - b);
    const median = vals[2];
    return {
      stem: `다음 자료의 중앙값을 구하세요.\n${[...vals].sort(() => Math.random() - 0.5).join(', ')}`,
      ...buildChoices(
        `${median}`,
        [
          { text: `${Math.round(vals.reduce((a, b) => a + b, 0) / 5) === median ? median + 1 : Math.round(vals.reduce((a, b) => a + b, 0) / 5)}`, tag: 'CONCEPT' },
          { text: `${vals[4]}`, tag: 'FORMULA' },
          { text: `${vals[0]}`, tag: 'FORMULA' },
        ],
        (g) => `${median + g}`,
      ),
      hints: ['중앙값은 "크기 순으로 줄 세웠을 때 한가운데" 값이에요.', `작은 것부터: ${vals.join(', ')}.`, '5개 중 3번째.'],
      idea: '평균과 중앙값은 다른 대푯값 — 극단값이 있을 때 중앙값이 더 믿음직해요.',
      solve: `정렬: ${vals.join(', ')} → 가운데(3번째) = ${median}.`,
      remember: '중앙값은 반드시 "정렬 먼저"!',
      estimatedSec: 50,
    };
  }
  if (level === 2) {
    const mean = randInt(10, 30);
    const d1 = nonZero(-5, 5);
    const d2 = nonZero(-5, 5);
    let d3 = nonZero(-5, 5);
    while (d1 + d2 + d3 === 0) d3 = nonZero(-5, 5); // x가 0이 되지 않게
    const x = -(d1 + d2 + d3);
    return {
      stem: `평균이 ${mean}인 4개 자료의 편차가 ${d1}, ${d2}, ${d3}, x 일 때, x의 값은?`,
      ...buildChoices(
        `${x}`,
        [
          { text: `${-x}`, tag: 'SIGN' },
          { text: `${mean}`, tag: 'CONCEPT' },
          { text: `0`, tag: 'FORMULA' },
        ],
        (g) => `${x + g}`,
      ),
      hints: ['편차 = 자료값 − 평균.', '모든 편차를 더하면 항상 얼마가 될까요?', `${d1} + ${d2} + ${d3} + x = 0.`],
      idea: '편차의 합 = 0은 평균의 정의에서 자동으로 나오는 성질이에요.',
      solve: `${d1}+${d2}+${d3} = ${d1 + d2 + d3} → x = ${x}.`,
      remember: '편차 문제 1순위 무기: "합이 0".',
      estimatedSec: 60,
    };
  }
  if (level === 3) {
    const k = randInt(1, 3);
    const mean = randInt(10, 30);
    const devs = [-2 * k, -k, 0, k, 2 * k];
    const vals = devs.map((d) => mean + d);
    const variance = (devs.reduce((a, d) => a + d * d, 0)) / 5;
    return {
      stem: `다음 자료의 분산을 구하세요. (평균은 ${mean})\n${vals.join(', ')}`,
      ...buildChoices(
        `${variance}`,
        [
          { text: `${mean}`, tag: 'CONCEPT' },
          { text: `${devs.reduce((a, d) => a + d * d, 0)}`, tag: 'FORMULA' },
          { text: `${Math.sqrt(variance) % 1 === 0 ? Math.sqrt(variance) : variance + 1}`, tag: 'FORMULA' },
        ],
        (g) => `${variance + g}`,
      ),
      hints: ['편차부터: 각 값 − 평균.', `편차: ${devs.join(', ')}.`, '분산 = 편차²의 평균 (합을 5로 나누기).'],
      idea: '분산은 "흩어짐을 제곱으로 측정한 평균" — 음수 편차도 기여하게 만드는 장치예요.',
      solve: `편차² 합 = ${devs.map((d) => d * d).join('+')} = ${devs.reduce((a, d) => a + d * d, 0)} → ÷5 = ${variance}.`,
      remember: '분산 계산 마지막의 "개수로 나누기"를 잊지 말기!',
      estimatedSec: 90,
    };
  }
  if (level === 4) {
    const varA = pick([4, 9, 16]);
    const varB = pick([25, 36].filter((v) => v > varA));
    const sdA = Math.sqrt(varA);
    const sdB = Math.sqrt(varB);
    return {
      stem: `두 반의 수학 점수 평균은 같고, 분산은 A반 ${varA}, B반 ${varB}입니다. 다음 중 옳은 것은?`,
      ...buildChoices(
        `A반의 표준편차는 ${sdA}점이고, A반 점수가 더 고르게 모여 있다`,
        [
          { text: `B반의 표준편차는 ${sdB}점이고, B반 점수가 더 고르게 모여 있다`, tag: 'CONCEPT' },
          { text: `A반의 표준편차는 ${varA}점이다`, tag: 'FORMULA' },
          { text: `평균이 같으므로 흩어진 정도도 같다`, tag: 'CONCEPT' },
        ],
        () => `두 반의 표준편차는 비교할 수 없다`,
      ),
      hints: ['표준편차 = √분산.', `√${varA} = ${sdA}, √${varB} = ${sdB}.`, '분산·표준편차가 작을수록 자료가 평균 근처에 모여 있어요.'],
      idea: '평균이 같아도 흩어짐은 다르다 — 산포도가 필요한 이유예요.',
      solve: `A: √${varA} = ${sdA}, B: √${varB} = ${sdB} → A반이 더 고르게 분포.`,
      remember: '작은 표준편차 = 고른 자료 = 안정적.',
      estimatedSec: 80,
    };
  }
  // L5 — 자료 변환
  const mean = randInt(8, 20);
  const variance = pick([4, 9, 16]);
  const add = randInt(2, 9);
  return {
    stem: `자료 전체의 평균이 ${mean}, 분산이 ${variance}입니다. 모든 자료에 ${add}씩 더하면 평균과 분산은 각각 어떻게 될까요?`,
    ...buildChoices(
      `평균 ${mean + add}, 분산 ${variance}`,
      [
        { text: `평균 ${mean + add}, 분산 ${variance + add}`, tag: 'CONCEPT' },
        { text: `평균 ${mean}, 분산 ${variance}`, tag: 'CONCEPT' },
        { text: `평균 ${mean + add}, 분산 ${variance + 2 * add}`, tag: 'CALCULATION' },
      ],
      (g) => `평균 ${mean + add + g}, 분산 ${variance}`,
    ),
    hints: [
      '전체가 같이 이동하면 "위치"는 변하지만 "간격"은?',
      `평균은 ${add}만큼 커져요.`,
      '편차(자료 − 평균)는 그대로 → 분산도 그대로.',
    ],
    idea: '평행이동은 흩어짐을 바꾸지 않는다 — 산포도의 본질을 묻는 최상위 관점이에요.',
    solve: `평균 ${mean}+${add} = ${mean + add}, 편차 불변 → 분산 ${variance} 유지.`,
    remember: '더하기: 평균만 이동. 곱하기: 평균 a배, 분산 a²배 (다음 단계 예고!).',
    estimatedSec: 100,
  };
}

export function transferStaStat(level: Level): Draft {
  const meanSame = randInt(75, 85);
  const sdA = pick([2, 3]);
  const sdB = pick([6, 8]);
  return {
    stem: `양궁 선수 A와 B의 평균 점수는 둘 다 ${meanSame}점으로 같지만, 표준편차는 A가 ${sdA}점, B가 ${sdB}점입니다. 더 "꾸준한" 선수를 고르고 이유를 설명한 것으로 옳은 것은?`,
    ...buildChoices(
      `A — 표준편차가 작아 점수가 평균 근처에 모여 있다`,
      [
        { text: `B — 표준편차가 커서 더 높은 점수를 자주 낸다`, tag: 'CONCEPT' },
        { text: `A — 평균이 더 높기 때문이다`, tag: 'INTERPRETATION' },
        { text: `알 수 없다 — 평균이 같으면 실력도 같다`, tag: 'CONCEPT' },
      ],
      () => `B — 분산이 작기 때문이다`,
    ),
    hints: ['"꾸준함" = 점수의 흩어짐이 작다.', '흩어짐을 재는 값이 표준편차예요.', `${sdA} < ${sdB} — 누가 더 몰려 있나요?`],
    idea: '스포츠 기록 분석은 산포도의 실전 무대 — 평균만으론 선수를 평가할 수 없어요.',
    solve: `표준편차 ${sdA} < ${sdB} → A의 점수가 더 고르게 분포 → A가 꾸준하다.`,
    remember: '평균 = 실력의 높이, 표준편차 = 실력의 안정성.',
    estimatedSec: 80 + level * 5,
  };
}
