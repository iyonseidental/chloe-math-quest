// 중2 — 식의 계산 / 일차부등식 / 연립방정식 / 일차함수 / 도형의 성질 / 확률
// 수식은 KaTeX 조판을 전제로 ^{n}, ², ³, √, ×, − 표기를 사용한다.
import type { Level } from '../types.ts';
import { buildChoices, fmtSigned, formatLinear, fracStr, nonZero, pick, randInt, simplifyFrac } from './util.ts';
import type { Draft } from './index.ts';

// =====================================================================
// M2.ALG.MONO — 식의 계산 (지수법칙·단항식)
// =====================================================================
export function genAlgMono(level: Level): Draft {
  if (level === 1) {
    const m = randInt(2, 5);
    const n = randInt(2, 5);
    return {
      stem: `다음을 간단히 하세요.\nx^{${m}} × x^{${n}}`,
      ...buildChoices(
        `x^{${m + n}}`,
        [
          { text: `x^{${m * n}}`, tag: 'FORMULA' },
          { text: `2x^{${m + n}}`, tag: 'CONCEPT' },
          { text: `x^{${m + n + 1}}`, tag: 'CALCULATION' },
        ],
        (g) => `x^{${m + n + g}}`,
      ),
      hints: [
        '같은 문자의 거듭제곱을 곱할 때의 규칙을 떠올려요.',
        'x³ × x² = (x·x·x) × (x·x) — 전부 몇 개일까요?',
        `지수끼리 더해요: ${m} + ${n}.`,
      ],
      idea: '거듭제곱의 곱 = 지수의 덧셈. 개수를 세어보면 공식이 왜 성립하는지 보여요.',
      solve: `x^{${m}} × x^{${n}} = x^{${m}+${n}} = x^{${m + n}}.`,
      remember: '곱하면 더하고, 거듭제곱하면 곱한다 — 헷갈리면 개수를 직접 세기!',
      estimatedSec: 35,
    };
  }
  if (level === 2) {
    const m = randInt(2, 4);
    const n = randInt(2, 4);
    return {
      stem: `다음을 간단히 하세요.\n(x^{${m}})^{${n}}`,
      ...buildChoices(
        `x^{${m * n}}`,
        [
          { text: `x^{${m + n}}`, tag: 'FORMULA' },
          { text: `x^{${Math.pow(m, n)}}`, tag: 'CONCEPT' },
          { text: `x^{${m * n + 1}}`, tag: 'CALCULATION' },
        ],
        (g) => `x^{${m * n + g}}`,
      ),
      hints: [
        '괄호 밖 지수는 안의 것을 통째로 반복한다는 뜻이에요.',
        `(x^{${m}})^{${n}} = x^{${m}} 을 ${n}번 곱한 것.`,
        `지수끼리 곱해요: ${m} × ${n}.`,
      ],
      idea: '거듭제곱의 거듭제곱 = 지수의 곱셈.',
      solve: `(x^{${m}})^{${n}} = x^{${m}×${n}} = x^{${m * n}}.`,
      remember: '(xᵐ)ⁿ = xᵐⁿ. "곱은 덧셈, 거듭제곱은 곱셈" 구분이 핵심.',
      estimatedSec: 40,
    };
  }
  if (level === 3) {
    const a = pick([-4, -3, -2, 2, 3]);
    const b = pick([-3, -2, 2, 3, 4]);
    const p = randInt(1, 3);
    const q = randInt(1, 2);
    const coef = a * b;
    return {
      stem: `다음을 계산하세요.\n${a}x^{${p}}y × (${b}xy^{${q}})`,
      ...buildChoices(
        `${coef}x^{${p + 1}}y^{${q + 1}}`,
        [
          { text: `${a + b}x^{${p + 1}}y^{${q + 1}}`, tag: 'CONCEPT' },
          { text: `${-coef}x^{${p + 1}}y^{${q + 1}}`, tag: 'SIGN' },
          { text: `${coef}x^{${p}}y^{${q}}`, tag: 'CALCULATION' },
        ],
        (g) => `${coef + g}x^{${p + 1}}y^{${q + 1}}`,
      ),
      hints: [
        '계수는 계수끼리, 같은 문자는 문자끼리 곱해요.',
        `계수: ${a} × (${b}) = ${coef}. 부호에 주의!`,
        `x는 x^{${p}} × x = x^{${p + 1}}, y는 y × y^{${q}} = y^{${q + 1}}.`,
      ],
      idea: '단항식 곱셈 = (계수 곱) × (문자별 지수 덧셈). 두 단계로 나누면 실수가 없어요.',
      solve: `계수 ${a}×(${b}) = ${coef}, x^{${p}}·x = x^{${p + 1}}, y·y^{${q}} = y^{${q + 1}} → ${coef}x^{${p + 1}}y^{${q + 1}}.`,
      remember: '음수 × 음수 = 양수. 계수의 부호를 먼저 확정하고 시작!',
      estimatedSec: 60,
    };
  }
  if (level === 4) {
    const b = pick([2, 3]);
    const a = b * pick([2, 3, 4]); // 나눗셈이 정수가 되도록 b의 배수로
    const c = randInt(2, 4);
    const p = randInt(2, 4);
    const coef = (a / b) * c;
    return {
      stem: `다음을 계산하세요.\n${a}x^{${p}}y² ÷ ${b}xy × ${c}y`,
      ...buildChoices(
        `${coef}x^{${p - 1}}y²`,
        [
          { text: `${a / b / c % 1 === 0 ? a / b / c : coef + 2}x^{${p - 1}}y²`, tag: 'CONCEPT' },
          { text: `${coef}x^{${p}}y²`, tag: 'CALCULATION' },
          { text: `${coef}x^{${p - 1}}y³`, tag: 'CALCULATION' },
        ],
        (g) => `${coef + g}x^{${p - 1}}y²`,
      ),
      hints: [
        '나눗셈은 역수의 곱셈으로 바꿔 왼쪽부터 차례로 계산해요.',
        `${a} ÷ ${b} × ${c} 를 왼쪽부터: ${a / b} × ${c} = ${coef}.`,
        `x: x^{${p}} ÷ x = x^{${p - 1}}. y: y² ÷ y × y = y².`,
      ],
      idea: '곱셈·나눗셈 혼합은 반드시 왼쪽부터. ÷ 뒤를 통째로 곱하면 함정에 빠져요.',
      solve: `계수 ${a}÷${b}×${c} = ${coef}, x^{${p}}÷x = x^{${p - 1}}, y²÷y×y = y² → ${coef}x^{${p - 1}}y².`,
      remember: 'A ÷ B × C = A × C/B이지 A ÷ (B×C)가 아니에요!',
      estimatedSec: 80,
    };
  }
  // L5 — 지수 미지수
  const m = randInt(2, 4);
  const total = m + randInt(3, 6);
  const n = total - m;
  return {
    stem: `x^{${m}} × x^{n} = x^{${total}} 일 때, 자연수 n의 값은?`,
    ...buildChoices(
      `n = ${n}`,
      [
        { text: `n = ${total % m === 0 && total / m !== n ? total / m : n + 2}`, tag: 'FORMULA' },
        { text: `n = ${total}`, tag: 'CONCEPT' },
        { text: `n = ${n + 1}`, tag: 'CALCULATION' },
      ],
      (g) => `n = ${n + g}`,
    ),
    hints: [
      '좌변을 지수법칙으로 정리해보세요.',
      `x^{${m}} × x^{n} = x^{${m}+n}.`,
      `${m} + n = ${total} 인 n은?`,
    ],
    idea: '지수법칙을 "거꾸로" 쓰는 문제 — 방정식과 지수법칙의 만남이에요.',
    solve: `x^{${m}+n} = x^{${total}} → ${m} + n = ${total} → n = ${n}.`,
    remember: '밑이 같으면 지수끼리 비교할 수 있어요.',
    estimatedSec: 70,
  };
}

export function transferAlgMono(level: Level): Draft {
  const kind = pick(['area', 'cell'] as const);
  if (kind === 'area') {
    const a = randInt(2, 4);
    const b = randInt(2, 5);
    return {
      stem: `가로가 ${a}x²y, 세로가 ${b}xy인 직사각형 모양 스티커의 넓이를 식으로 나타내면?`,
      ...buildChoices(
        `${a * b}x³y²`,
        [
          { text: `${a + b}x³y²`, tag: 'CONCEPT' },
          { text: `${a * b}x²y`, tag: 'CALCULATION' },
          { text: `${2 * (a + b)}x²y`, tag: 'INTERPRETATION' },
        ],
        (g) => `${a * b + g}x³y²`,
      ),
      hints: ['직사각형 넓이 = 가로 × 세로.', '계수는 계수끼리, 문자는 지수법칙으로.', `${a} × ${b} = ${a * b}, x²·x = x³, y·y = y².`],
      idea: '도형 공식에 단항식을 넣으면 식의 계산이 現실이 돼요.',
      solve: `${a}x²y × ${b}xy = ${a * b}x³y².`,
      remember: '넓이는 곱 — 둘레(합)와 헷갈리면 함정 선택지에 걸려요.',
      estimatedSec: 60 + level * 5,
    };
  }
  const n = randInt(3, 6);
  return {
    stem: `어떤 세균은 1시간마다 2배로 늘어납니다. 세균 1마리에서 시작해 ${n}시간 후의 세균 수를 거듭제곱으로 나타내면?`,
    ...buildChoices(
      `2^{${n}} = ${Math.pow(2, n)}마리`,
      [
        { text: `2 × ${n} = ${2 * n}마리`, tag: 'CONCEPT' },
        { text: `${n}^{2} = ${n * n}마리`, tag: 'FORMULA' },
        { text: `2^{${n - 1}} = ${Math.pow(2, n - 1)}마리`, tag: 'INTERPRETATION' },
      ],
      (g) => `${Math.pow(2, n) + g}마리`,
    ),
    hints: ['1시간 후 2마리, 2시간 후 4마리… 규칙이 보이나요?', '매번 2를 곱하는 것 = 2의 거듭제곱.', `${n}시간이면 2를 ${n}번 곱해요.`],
    idea: '거듭제곱은 "반복되는 곱셈"의 언어 — 세균, 이자, 데이터가 모두 이렇게 자라요.',
    solve: `매시간 ×2 → ${n}시간 후 = 2^{${n}} = ${Math.pow(2, n)}마리.`,
    remember: '"n배씩 k번" = nᵏ. 곱셈(2×n)과 거듭제곱(2ⁿ)의 차이를 확실히!',
    estimatedSec: 70,
  };
}

// =====================================================================
// M2.ALG.INEQ — 일차부등식
// =====================================================================
export function genAlgIneq(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-9, 9);
    const b = randInt(-5, 10);
    const bound = b - a;
    return {
      stem: `부등식을 푸세요.\nx ${fmtSigned(a)} < ${b}`,
      ...buildChoices(
        `x < ${bound}`,
        [
          { text: `x > ${bound}`, tag: 'CONCEPT' },
          { text: `x < ${b + a}`, tag: 'SIGN' },
          { text: `x < ${bound + 1}`, tag: 'CALCULATION' },
        ],
        (g) => `x < ${bound + g}`,
      ),
      hints: ['방정식처럼 이항해요.', '양수를 더하거나 빼는 것은 부등호 방향을 바꾸지 않아요.', `x < ${b} ${a >= 0 ? `− ${a}` : `+ ${Math.abs(a)}`}.`],
      idea: '부등식의 이항은 방정식과 똑같아요. 방향이 바뀌는 건 "음수 곱·나눗셈"뿐!',
      solve: `x < ${b} ${a >= 0 ? `− ${a}` : `+ ${Math.abs(a)}`} = ${bound}.`,
      remember: '덧셈·뺄셈 이항은 부등호 방향 유지.',
      estimatedSec: 40,
    };
  }
  if (level === 2) {
    const a = randInt(2, 6);
    const sol = nonZero(-6, 8);
    const b = nonZero(-10, 10);
    const c = a * sol + b;
    return {
      stem: `부등식을 푸세요.\n${formatLinear(a, b)} ≤ ${c}`,
      ...buildChoices(
        `x ≤ ${sol}`,
        [
          { text: `x ≥ ${sol}`, tag: 'CONCEPT' },
          { text: `x ≤ ${sol + (b > 0 ? b : 1)}`, tag: 'SIGN' },
          { text: `x ≤ ${sol - 1}`, tag: 'CALCULATION' },
        ],
        (g) => `x ≤ ${sol + g}`,
      ),
      hints: ['상수항을 이항한 뒤 계수로 나눠요.', `${a}x ≤ ${c - b}.`, `양변을 양수 ${a}로 나누면 방향은 그대로예요.`],
      idea: '양수로 나누면 부등호 방향은 그대로 — 방정식과 완전히 같은 절차예요.',
      solve: `${a}x ≤ ${c} ${fmtSigned(-b)} = ${c - b} → x ≤ ${sol}.`,
      remember: '나누는 수의 부호를 먼저 확인하는 습관!',
      estimatedSec: 55,
    };
  }
  if (level === 3) {
    const a = pick([2, 3, 4, 5]);
    const sol = nonZero(-6, 8);
    const b = nonZero(-10, 10);
    const c = -a * sol + b;
    return {
      stem: `부등식을 푸세요.\n${formatLinear(-a, b)} < ${c}`,
      ...buildChoices(
        `x > ${sol}`,
        [
          { text: `x < ${sol}`, tag: 'SIGN' },
          { text: `x > ${-sol === sol ? sol + 1 : -sol}`, tag: 'CALCULATION' },
          { text: `x < ${-sol === sol ? sol - 1 : -sol}`, tag: 'SIGN' },
        ],
        (g) => `x > ${sol + g}`,
      ),
      hints: [
        '이항까지는 똑같이 진행해요.',
        `${-a}x < ${c - b} — 이제 음수로 나눌 차례예요.`,
        '음수로 나누면 부등호 방향이 뒤집혀요!',
      ],
      idea: '부등식의 유일한 함정 — 음수로 나눌 때 방향 반전. 이 문제가 바로 그 훈련이에요.',
      solve: `${-a}x < ${c - b} → 양변을 ${-a}로 나누면 방향이 바뀌어 x > ${sol}.`,
      remember: '음수로 곱하거나 나누면 < 는 > 로, ≤ 는 ≥ 로!',
      estimatedSec: 65,
    };
  }
  if (level === 4) {
    const a = pick([2, 3]);
    const b = nonZero(-4, 4);
    const c = pick([4, 5, 6].filter((v) => v !== a));
    const sol = nonZero(-5, 5);
    const d = a * sol + a * b - c * sol;
    const dir = a - c < 0; // 계수가 음수가 되면 방향 반전
    return {
      stem: `부등식을 푸세요.\n${a}(x ${fmtSigned(b)}) > ${formatLinear(c, d)}`,
      ...buildChoices(
        `x ${dir ? '<' : '>'} ${sol}`,
        [
          { text: `x ${dir ? '>' : '<'} ${sol}`, tag: 'SIGN' },
          { text: `x ${dir ? '<' : '>'} ${sol + b}`, tag: 'CALCULATION' },
          { text: `x ${dir ? '<' : '>'} ${sol - 1}`, tag: 'CALCULATION' },
        ],
        (g) => `x ${dir ? '<' : '>'} ${sol + g}`,
      ),
      hints: [
        '괄호를 분배법칙으로 풀고 x항을 모아요.',
        `${formatLinear(a, a * b)} > ${formatLinear(c, d)} → ${a - c}x > ${d - a * b}.`,
        `${a - c}는 ${dir ? '음수이므로 방향 반전!' : '양수이므로 방향 유지.'}`,
      ],
      idea: '괄호 풀기 → 이항 → 나누기. 마지막 나누는 수의 부호가 방향을 결정해요.',
      solve: `${a - c}x > ${d - a * b} → x ${dir ? '<' : '>'} ${sol}.`,
      remember: 'x의 계수가 음수가 되는 순간을 놓치지 마세요.',
      estimatedSec: 85,
    };
  }
  // L5 — 활용 (최대 개수)
  const price = randInt(8, 15) * 100;
  const fee = randInt(10, 20) * 100;
  const budget0 = randInt(5, 9) * 1000;
  const maxN = Math.floor((budget0 - fee) / price);
  const budget = fee + price * maxN + randInt(0, price - 1); // maxN이 답이 되도록
  return {
    stem: `한 송이에 ${price}원인 꽃을 사서 ${fee}원짜리 포장을 하려고 합니다. 전체 금액이 ${budget}원 이하가 되게 하려면 꽃을 최대 몇 송이까지 살 수 있을까요?`,
    ...buildChoices(
      `${maxN}송이`,
      [
        { text: `${maxN + 1}송이`, tag: 'INTERPRETATION' },
        { text: `${Math.floor(budget / price)}송이`, tag: 'CONCEPT' },
        { text: `${maxN - 1}송이`, tag: 'CALCULATION' },
      ],
      (g) => `${maxN + g + 1}송이`,
    ),
    hints: [
      '꽃 수를 x로 놓고 부등식을 세워요.',
      `${price}x + ${fee} ≤ ${budget}.`,
      `x ≤ ${((budget - fee) / price).toFixed(1)} — 자연수 최댓값은?`,
    ],
    idea: '부등식 활용의 마무리는 "조건에 맞는 자연수 찾기". 소수점을 버릴지 올릴지 문맥이 결정해요.',
    solve: `${price}x + ${fee} ≤ ${budget} → x ≤ ${((budget - fee) / price).toFixed(2)} → 최대 ${maxN}송이.`,
    remember: '"최대 몇 개" = 내림, "최소 몇 개" = 올림. 마지막 해석까지가 풀이!',
    estimatedSec: 120,
  };
}

export function transferAlgIneq(level: Level): Draft {
  const base = randInt(2, 4) * 1000;
  const perMin = randInt(50, 150);
  const rival = base + randInt(10, 20) * 100;
  const mins = Math.ceil((rival - base) / perMin);
  return {
    stem: `A 요금제는 기본요금 ${base}원에 1분당 ${perMin}원, B 요금제는 통화량과 관계없이 ${rival}원입니다. A 요금제가 B보다 비싸지는 것은 몇 분을 초과해 통화할 때부터일까요?`,
    ...buildChoices(
      `${Math.floor((rival - base) / perMin)}분 초과`,
      [
        { text: `${Math.floor((rival - base) / perMin) + 5}분 초과`, tag: 'CALCULATION' },
        { text: `${Math.floor(rival / perMin)}분 초과`, tag: 'CONCEPT' },
        { text: `${mins + 3}분 초과`, tag: 'CALCULATION' },
      ],
      (g) => `${Math.floor((rival - base) / perMin) + g + 1}분 초과`,
    ),
    hints: [
      '통화 시간을 x분으로 놓고 두 요금을 식으로 써요.',
      `A: ${base} + ${perMin}x, B: ${rival}. "A가 B보다 비싸다"를 부등식으로.`,
      `${perMin}x > ${rival - base} → x > ?`,
    ],
    idea: '요금제 비교는 부등식의 대표 실전 — "언제부터 역전되는가"를 찾는 문제예요.',
    solve: `${base} + ${perMin}x > ${rival} → x > ${((rival - base) / perMin).toFixed(1)} → ${Math.floor((rival - base) / perMin)}분 초과부터.`,
    remember: '"초과/이상/미만/이하"의 부등호 번역을 정확히!',
    estimatedSec: 100 + level * 5,
  };
}

// =====================================================================
// M2.ALG.SYS — 연립방정식
// =====================================================================
export function genAlgSys(level: Level): Draft {
  if (level === 1) {
    const x = randInt(1, 9);
    const y = randInt(1, 9);
    return {
      stem: `연립방정식을 푸세요.\nx + y = ${x + y}\nx − y = ${x - y}`,
      ...buildChoices(
        `x = ${x}, y = ${y}`,
        [
          { text: `x = ${y}, y = ${x}` === `x = ${x}, y = ${y}` ? `x = ${x + 1}, y = ${y - 1}` : `x = ${y}, y = ${x}`, tag: 'INTERPRETATION' },
          { text: `x = ${x + y}, y = ${x - y}`, tag: 'CONCEPT' },
          { text: `x = ${x}, y = ${y + 1}`, tag: 'CALCULATION' },
        ],
        (g) => `x = ${x + g}, y = ${y}`,
      ),
      hints: ['두 식을 그대로 더해보세요.', `더하면 y가 사라져요: 2x = ${2 * x}.`, `x = ${x}를 첫 식에 넣으면 y는?`],
      idea: '가감법의 출발 — 두 식을 더해 문자 하나를 소거해요.',
      solve: `두 식을 더하면 2x = ${2 * x} → x = ${x}. 대입하면 y = ${y}.`,
      remember: '부호가 반대인 문자는 "더하면" 사라진다.',
      estimatedSec: 60,
    };
  }
  if (level === 2) {
    const x = nonZero(-6, 8);
    const y = nonZero(-6, 8);
    const a = pick([2, 3, 4]);
    const t = a * x + y;
    return {
      stem: `연립방정식을 푸세요.\nx + y = ${x + y}\n${a}x + y = ${t}`,
      ...buildChoices(
        `x = ${x}, y = ${y}`,
        [
          { text: `x = ${y === x ? x + 1 : y}, y = ${y === x ? y - 1 : x}`, tag: 'INTERPRETATION' },
          { text: `x = ${-x === x ? x + 2 : -x}, y = ${y}`, tag: 'SIGN' },
          { text: `x = ${x + 1}, y = ${y - 1}`, tag: 'CALCULATION' },
        ],
        (g) => `x = ${x + g}, y = ${y}`,
      ),
      hints: ['두 식을 빼면 y가 사라져요.', `(${a}x + y) − (x + y) = ${t} − ${x + y}.`, `${a - 1}x = ${t - x - y} → x = ${x}.`],
      idea: '계수가 같은 문자는 "빼서" 소거. 가감법의 기본기예요.',
      solve: `둘째 식 − 첫 식: ${a - 1}x = ${t - x - y} → x = ${x}, y = ${x + y} − ${x} = ${y}.`,
      remember: '뺄 때는 뒤 식의 모든 항의 부호가 바뀌는 것에 주의!',
      estimatedSec: 75,
    };
  }
  if (level === 3) {
    const x = nonZero(-5, 6);
    const y = nonZero(-5, 6);
    const a = pick([2, 3]);
    const b = pick([3, 5].filter((v) => v !== a));
    const c = pick([2, 5]);
    const d = pick([3, 4]);
    return {
      stem: `연립방정식을 푸세요.\n${a}x + ${b}y = ${a * x + b * y}\n${c}x + ${d}y = ${c * x + d * y}`,
      ...buildChoices(
        `x = ${x}, y = ${y}`,
        [
          { text: `x = ${-x === x ? x + 1 : -x}, y = ${-y === y ? y + 1 : -y}`, tag: 'SIGN' },
          { text: `x = ${y === x ? x + 2 : y}, y = ${y === x ? y + 1 : x}`, tag: 'INTERPRETATION' },
          { text: `x = ${x + 1}, y = ${y}`, tag: 'CALCULATION' },
        ],
        (g) => `x = ${x}, y = ${y + g}`,
      ),
      hints: [
        '한 문자의 계수를 맞추기 위해 식에 적당한 수를 곱해요.',
        `첫 식 × ${d}, 둘째 식 × ${b} 하면 y의 계수가 같아져요.`,
        '계수를 맞춘 뒤 두 식을 빼서 x를 구해요.',
      ],
      idea: '계수가 다르면 최소공배수로 맞춘 뒤 가감법 — 연립방정식의 완성형이에요.',
      solve: `첫 식×${d} − 둘째 식×${b} 로 y 소거 → x = ${x}, 대입하여 y = ${y}.`,
      remember: '어느 문자를 소거할지 먼저 정하면 계산량이 줄어요.',
      estimatedSec: 100,
    };
  }
  if (level === 4) {
    const p = nonZero(-4, 5);
    const q = nonZero(-4, 5);
    const a = pick([2, 3, 4]);
    const bVal = a * p - q; // ax - y = b 형태에서 b
    return {
      stem: `연립방정식 ${a}x − y = b, x + y = ${p + q} 의 해가 x = ${p}, y = ${q} 일 때, 상수 b의 값은?`,
      ...buildChoices(
        `b = ${bVal}`,
        [
          { text: `b = ${a * p + q}`, tag: 'SIGN' },
          { text: `b = ${p + q}`, tag: 'CONCEPT' },
          { text: `b = ${bVal + 2}`, tag: 'CALCULATION' },
        ],
        (g) => `b = ${bVal + g}`,
      ),
      hints: [
        '"해"란 두 식을 모두 참으로 만드는 값이에요.',
        `x = ${p}, y = ${q} 를 b가 있는 식에 대입해요.`,
        `b = ${a}×(${p}) − (${q}).`,
      ],
      idea: '해가 주어지면 대입이 전부 — 미지수가 상수로 이동한 관점 전환 문제예요.',
      solve: `${a}×(${p}) − (${q}) = ${bVal} → b = ${bVal}.`,
      remember: '"해가 ~이다" = "대입하면 성립한다".',
      estimatedSec: 80,
    };
  }
  // L5 — 활용
  const legs = pick(['animal', 'ticket'] as const);
  if (legs === 'animal') {
    const chickens = randInt(3, 8);
    const rabbits = randInt(2, 6);
    const heads = chickens + rabbits;
    const legsN = 2 * chickens + 4 * rabbits;
    return {
      stem: `농장에 닭과 토끼가 모두 ${heads}마리 있고, 다리 수의 합은 ${legsN}개입니다. 토끼는 몇 마리일까요?`,
      ...buildChoices(
        `${rabbits}마리`,
        [
          { text: `${chickens}마리`, tag: 'INTERPRETATION' },
          { text: `${rabbits + 1}마리`, tag: 'CALCULATION' },
          { text: `${Math.round(legsN / 4)}마리`, tag: 'CONCEPT' },
        ],
        (g) => `${rabbits + g + 1}마리`,
      ),
      hints: [
        '닭을 x, 토끼를 y로 놓아요.',
        `마리 수: x + y = ${heads}. 다리: 2x + 4y = ${legsN}.`,
        '첫 식 ×2를 둘째 식에서 빼면 y만 남아요.',
      ],
      idea: '두 가지 수량(마리 수·다리 수)이 각각 식 하나씩 — 연립방정식 활용의 고전이에요.',
      solve: `x + y = ${heads}, 2x + 4y = ${legsN} → 2y = ${legsN - 2 * heads} → y = ${rabbits}.`,
      remember: '조건 2개 = 식 2개. 문장에서 "합"을 찾는 것이 시작!',
      estimatedSec: 130,
    };
  }
  const adult = randInt(3, 6) * 1000;
  const child = randInt(1, 2) * 1000 + 500;
  const nA = randInt(2, 5);
  const nC = randInt(3, 7);
  return {
    stem: `어른 요금이 ${adult}원, 어린이 요금이 ${child}원인 공원에 총 ${nA + nC}명이 입장해 ${adult * nA + child * nC}원을 냈습니다. 어린이는 몇 명일까요?`,
    ...buildChoices(
      `${nC}명`,
      [
        { text: `${nA}명`, tag: 'INTERPRETATION' },
        { text: `${nC + 1}명`, tag: 'CALCULATION' },
        { text: `${nC - 1}명`, tag: 'CALCULATION' },
      ],
      (g) => `${nC + g + 1}명`,
    ),
    hints: [
      '어른 x명, 어린이 y명으로 놓아요.',
      `x + y = ${nA + nC}, ${adult}x + ${child}y = ${adult * nA + child * nC}.`,
      '첫 식에서 x를 y로 표현해 둘째 식에 대입해요.',
    ],
    idea: '인원과 금액 — 실생활 연립방정식의 대표 패턴이에요.',
    solve: `x = ${nA + nC} − y 를 대입 → y = ${nC}.`,
    remember: '단위(명·원)가 다른 두 조건이 두 식이 돼요.',
    estimatedSec: 130,
  };
}

export function transferAlgSys(level: Level): Draft {
  const speed1 = pick([2, 3, 4]);
  const speed2 = speed1 + pick([1, 2]);
  const t1 = randInt(1, 3);
  const t2 = randInt(1, 3);
  const dist = speed1 * t1 + speed2 * t2;
  return {
    stem: `채림이는 총 ${dist}km를 이동했습니다. 처음에는 시속 ${speed1}km로 걷고, 나중에는 시속 ${speed2}km로 빠르게 걸어 총 ${t1 + t2}시간이 걸렸습니다. 빠르게 걸은 시간은 몇 시간일까요?`,
    ...buildChoices(
      `${t2}시간`,
      [
        { text: `${t1}시간`, tag: 'INTERPRETATION' },
        { text: `${t2 + 1}시간`, tag: 'CALCULATION' },
        { text: `${Math.round(dist / speed2)}시간`, tag: 'CONCEPT' },
      ],
      (g) => `${t2 + g + 1}시간`,
    ),
    hints: [
      '걸은 시간을 x, 빠르게 걸은 시간을 y로 놓아요.',
      `시간: x + y = ${t1 + t2}. 거리: ${speed1}x + ${speed2}y = ${dist}.`,
      '거리 = 속력 × 시간을 두 구간에 각각 적용한 거예요.',
    ],
    idea: '"구간 나누기" 문제 — 시간의 합과 거리의 합이 각각 식이 돼요.',
    solve: `x + y = ${t1 + t2}, ${speed1}x + ${speed2}y = ${dist} → y = ${t2}.`,
    remember: '거리·속력·시간 표를 그리면 식이 저절로 보여요.',
    estimatedSec: 120 + level * 5,
  };
}

// =====================================================================
// M2.FUN.LINEAR — 일차함수
// =====================================================================
export function genFunLinear(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-5, 5);
    const b = nonZero(-8, 8);
    const k = nonZero(-5, 5);
    const answer = a * k + b;
    return {
      stem: `일차함수 f(x) = ${formatLinear(a, b)} 에 대하여 f(${k}) 의 값은?`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${a * -k + b}`, tag: 'SIGN' },
          { text: `${a * k - b}`, tag: 'SIGN' },
          { text: `${a + k + b}`, tag: 'CONCEPT' },
        ],
        (g) => `${answer + (g % 2 ? g : -g)}`,
      ),
      hints: ['f(k)는 x 자리에 k를 넣으라는 뜻이에요.', `f(${k}) = ${a}×(${k}) ${fmtSigned(b)}.`, '음수 대입은 괄호와 함께!'],
      idea: 'f(x)는 "x를 넣으면 값이 나오는 기계" — 함수 기호에 익숙해지는 첫걸음이에요.',
      solve: `f(${k}) = ${a}×(${k}) ${fmtSigned(b)} = ${answer}.`,
      remember: 'f(2)의 2는 곱하는 수가 아니라 "입력값"이에요.',
      estimatedSec: 45,
    };
  }
  if (level === 2) {
    const x1 = nonZero(-6, 6);
    let x2 = nonZero(-6, 6);
    while (x2 === x1) x2 = nonZero(-6, 6);
    const a = nonZero(-4, 4);
    const y1 = nonZero(-8, 8);
    const y2 = y1 + a * (x2 - x1);
    return {
      stem: `두 점 (${x1}, ${y1}), (${x2}, ${y2}) 를 지나는 일차함수 그래프의 기울기는?`,
      ...buildChoices(
        `${a}`,
        [
          { text: `${-a === a ? a + 1 : -a}`, tag: 'SIGN' },
          { text: fracStr(simplifyFrac(x2 - x1, y2 - y1)) === `${a}` ? `${a + 2}` : fracStr(simplifyFrac(x2 - x1, y2 - y1)), tag: 'FORMULA' },
          { text: `${y2 - y1}`, tag: 'CONCEPT' },
        ],
        (g) => `${a + g}`,
      ),
      hints: ['기울기 = (y의 증가량) ÷ (x의 증가량).', `y 증가량: ${y2} − (${y1}) = ${y2 - y1}.`, `x 증가량: ${x2} − (${x1}) = ${x2 - x1}. 나누면?`],
      idea: '기울기는 "x가 1 커질 때 y가 얼마나 변하는가" — 변화율의 첫 개념이에요.',
      solve: `기울기 = (${y2} − (${y1})) / (${x2} − (${x1})) = ${y2 - y1}/${x2 - x1} = ${a}.`,
      remember: '분자는 y, 분모는 x. 순서를 바꾸면 함정!',
      estimatedSec: 70,
    };
  }
  if (level === 3) {
    const a = nonZero(-4, 4);
    const px = nonZero(-5, 5);
    const py = nonZero(-8, 8);
    const b = py - a * px;
    return {
      stem: `기울기가 ${a}이고 점 (${px}, ${py}) 를 지나는 일차함수의 식은?`,
      ...buildChoices(
        `y = ${formatLinear(a, b)}`,
        [
          { text: `y = ${formatLinear(a, py)}`, tag: 'CONCEPT' },
          { text: `y = ${formatLinear(a, -b === b ? b + 1 : -b)}`, tag: 'SIGN' },
          { text: `y = ${formatLinear(a, b + 1)}`, tag: 'CALCULATION' },
        ],
        (g) => `y = ${formatLinear(a, b + g)}`,
      ),
      hints: [
        'y = ax + b에서 a는 이미 알고 있어요. b만 찾으면 돼요.',
        `점을 지나므로 대입하면 성립: ${py} = ${a}×(${px}) + b.`,
        `b = ${py} − (${a * px}).`,
      ],
      idea: '"지나는 점" = "대입하면 참" — 일차함수 식 구하기의 만능 원리예요.',
      solve: `${py} = ${a}×(${px}) + b → b = ${b} → y = ${formatLinear(a, b)}.`,
      remember: '기울기 먼저, 절편은 대입으로. 2단계 루틴!',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const a = nonZero(-4, 4);
    const b = nonZero(-6, 6) * (a > 0 ? 1 : 1);
    const bNice = a * Math.sign(b) !== 0 ? b : b + 1;
    const xInt = simplifyFrac(-bNice, a);
    return {
      stem: `일차함수 y = ${formatLinear(a, bNice)} 의 그래프가 x축과 만나는 점의 x좌표는?`,
      ...buildChoices(
        fracStr(xInt),
        [
          { text: `${bNice}`, tag: 'CONCEPT' },
          { text: fracStr(simplifyFrac(bNice, a)) === fracStr(xInt) ? `${bNice + 1}` : fracStr(simplifyFrac(bNice, a)), tag: 'SIGN' },
          { text: fracStr(simplifyFrac(-a, bNice)), tag: 'FORMULA' },
        ],
        (g) => fracStr(simplifyFrac(-bNice + g, a)),
      ),
      hints: ['x축 위의 점은 y좌표가 0이에요.', `0 = ${formatLinear(a, bNice)} 을 풀어요.`, `${a}x = ${-bNice} → x = ?`],
      idea: 'x절편 = y에 0을 넣은 해. "축과 만난다"를 방정식으로 번역하는 문제예요.',
      solve: `0 = ${formatLinear(a, bNice)} → x = ${fracStr(xInt)}.`,
      remember: 'x절편은 y=0, y절편은 x=0. 반대로 넣으면 함정!',
      estimatedSec: 85,
    };
  }
  // L5 — 활용
  const start = randInt(20, 40);
  const rate = pick([2, 3, 4]);
  const target = start - rate * randInt(5, 9);
  const answer = (start - target) / rate;
  return {
    stem: `길이 ${start}cm인 양초에 불을 붙이면 1분에 ${rate}cm씩 짧아집니다. 남은 길이 y를 시간 x의 식으로 나타내고, 길이가 ${target}cm가 되는 시각을 구하세요.`,
    ...buildChoices(
      `y = ${formatLinear(-rate, start)}, ${answer}분`,
      [
        { text: `y = ${formatLinear(rate, start)}, ${answer}분`, tag: 'SIGN' },
        { text: `y = ${formatLinear(-rate, start)}, ${answer + 2}분`, tag: 'CALCULATION' },
        { text: `y = ${formatLinear(-rate, target)}, ${answer}분`, tag: 'INTERPRETATION' },
      ],
      (g) => `y = ${formatLinear(-rate, start)}, ${answer + g}분`,
    ),
    hints: [
      '짧아진다 = 기울기가 음수.',
      `y = ${start} − ${rate}x.`,
      `${target} = ${start} − ${rate}x 를 풀어요.`,
    ],
    idea: '일차함수 활용의 틀: (시작값) + (변화율)×x. 감소는 음의 기울기로!',
    solve: `y = ${start} − ${rate}x. ${target} = ${start} − ${rate}x → x = ${answer}분.`,
    remember: '문장의 "매분 ~씩 줄어든다"가 그대로 기울기가 돼요.',
    estimatedSec: 120,
  };
}

export function transferFunLinear(level: Level): Draft {
  const base = randInt(3, 5) * 1000;
  const per = randInt(6, 12) * 100;
  const km = randInt(3, 8);
  const answer = base + per * km;
  return {
    stem: `어느 택시는 기본요금 ${base}원에 1km마다 ${per}원이 추가됩니다. 요금 y를 거리 x(km)의 식으로 나타내고, ${km}km를 갔을 때 요금을 구하세요.`,
    ...buildChoices(
      `y = ${per}x + ${base}, ${answer}원`,
      [
        { text: `y = ${base}x + ${per}, ${base * km + per}원`, tag: 'INTERPRETATION' },
        { text: `y = ${per}x + ${base}, ${answer - per}원`, tag: 'CALCULATION' },
        { text: `y = ${per}x, ${per * km}원`, tag: 'CONCEPT' },
      ],
      (g) => `y = ${per}x + ${base}, ${answer + g * 100}원`,
    ),
    hints: ['고정된 값(기본요금)이 y절편, km당 추가금이 기울기예요.', `y = ${per}x + ${base}.`, `x = ${km} 대입.`],
    idea: '택시요금, 통신요금, 렌탈료 — "기본 + 비례" 구조는 모두 일차함수예요.',
    solve: `y = ${per}x + ${base} → x=${km}: ${per}×${km} + ${base} = ${answer}원.`,
    remember: '기울기 = 단위당 변화량, 절편 = 시작값. 현실 번역 공식!',
    estimatedSec: 90 + level * 5,
  };
}

// =====================================================================
// M2.GEO.TRI — 도형의 성질
// =====================================================================
export function genGeoTri(level: Level): Draft {
  if (level === 1) {
    const base = randInt(35, 75);
    const vertex = 180 - 2 * base;
    return {
      stem: `이등변삼각형에서 두 밑각의 크기가 각각 ${base}° 일 때, 꼭지각의 크기는?`,
      ...buildChoices(
        `${vertex}°`,
        [
          { text: `${180 - base}°`, tag: 'CONCEPT' },
          { text: `${base}°`, tag: 'CONCEPT' },
          { text: `${vertex + 10}°`, tag: 'CALCULATION' },
        ],
        (g) => `${vertex + g}°`,
      ),
      hints: ['삼각형 세 각의 합은 180°.', '이등변삼각형은 밑각 두 개가 같아요.', `180 − ${base} − ${base} = ?`],
      idea: '이등변삼각형의 핵심 성질: 두 밑각이 같다. 여기에 내각의 합 180°를 결합!',
      solve: `꼭지각 = 180 − 2×${base} = ${vertex}°.`,
      remember: '"이등변" 단어가 보이면 곧바로 "밑각 같음"을 떠올리기.',
      estimatedSec: 50,
    };
  }
  if (level === 2) {
    const a = randInt(35, 70);
    const b = randInt(35, 70);
    return {
      stem: `삼각형에서 두 내각이 ${a}°, ${b}° 일 때, 나머지 한 내각의 외각의 크기는?`,
      ...buildChoices(
        `${a + b}°`,
        [
          { text: `${180 - a - b}°`, tag: 'INTERPRETATION' },
          { text: `${360 - a - b}°`, tag: 'FORMULA' },
          { text: `${a + b + 10}°`, tag: 'CALCULATION' },
        ],
        (g) => `${a + b + g}°`,
      ),
      hints: ['먼저 나머지 내각을 구할 수도 있어요.', '삼각형의 외각 정리: 외각 = 이웃하지 않는 두 내각의 합.', `${a} + ${b} = ?`],
      idea: '외각 정리는 두 번 계산할 것을 한 번에 끝내는 상위권의 지름길이에요.',
      solve: `외각 = ${a} + ${b} = ${a + b}°.`,
      remember: '"외각"과 "내각"을 구분해 읽기 — 문제 해석이 반이에요.',
      estimatedSec: 60,
    };
  }
  if (level === 3) {
    const a = randInt(50, 120);
    return {
      stem: `평행사변형 ABCD에서 ∠A = ${a}° 일 때, ∠B의 크기는?`,
      ...buildChoices(
        `${180 - a}°`,
        [
          { text: `${a}°`, tag: 'CONCEPT' },
          { text: `${360 - a}°`, tag: 'FORMULA' },
          { text: `${180 - a + 10}°`, tag: 'CALCULATION' },
        ],
        (g) => `${180 - a + g}°`,
      ),
      hints: ['평행사변형에서 이웃한 두 각의 관계를 떠올려요.', 'AD ∥ BC이므로 ∠A와 ∠B는 동측내각이에요.', '동측내각의 합 = 180°.'],
      idea: '평행사변형 각의 성질은 결국 평행선 성질(동측내각)에서 나와요 — 연결해서 기억!',
      solve: `∠B = 180 − ${a} = ${180 - a}°. (이웃각 합 180°, 대각 ∠C = ${a}°)`,
      remember: '평행사변형: 대각은 같고, 이웃각은 합이 180°.',
      estimatedSec: 60,
    };
  }
  if (level === 4) {
    const half1 = randInt(3, 8);
    const half2 = randInt(4, 9);
    return {
      stem: `평행사변형 ABCD의 두 대각선이 점 O에서 만납니다. AO = ${half1}cm, BO = ${half2}cm일 때, AC + BD의 길이는?`,
      ...buildChoices(
        `${2 * half1 + 2 * half2}cm`,
        [
          { text: `${half1 + half2}cm`, tag: 'CONCEPT' },
          { text: `${2 * half1 + half2}cm`, tag: 'CALCULATION' },
          { text: `${4 * (half1 + half2)}cm`, tag: 'FORMULA' },
        ],
        (g) => `${2 * (half1 + half2) + g}cm`,
      ),
      hints: [
        '평행사변형의 대각선은 서로를 어떻게 나눌까요?',
        '두 대각선은 서로를 "이등분"해요 — O는 각 대각선의 중점.',
        `AC = 2×${half1}, BD = 2×${half2}.`,
      ],
      idea: '대각선 이등분 성질은 평행사변형 판별에도 쓰이는 핵심 성질이에요.',
      solve: `AC = ${2 * half1}, BD = ${2 * half2} → 합 = ${2 * half1 + 2 * half2}cm.`,
      remember: '평행사변형 대각선: 길이가 같은 게 아니라 "서로 이등분"!',
      estimatedSec: 80,
    };
  }
  // L5 — 이등변 + 외각 복합
  const base = randInt(30, 55);
  const ext = 2 * base;
  return {
    stem: `이등변삼각형 ABC에서 AB = AC이고 ∠B = ${base}° 입니다. 변 BC의 연장선 위 점 D에 대하여 ∠ACD의 크기는?`,
    ...buildChoices(
      `${180 - base}°`,
      [
        { text: `${ext}°`, tag: 'CONCEPT' },
        { text: `${base}°`, tag: 'INTERPRETATION' },
        { text: `${180 - 2 * base}°`, tag: 'CALCULATION' },
      ],
      (g) => `${180 - base + g}°`,
    ),
    hints: [
      '∠ACB를 먼저 구해요 — 이등변이므로 ∠B와 같아요.',
      `∠ACB = ${base}°.`,
      '∠ACD는 ∠ACB와 평각(180°)을 이뤄요.',
    ],
    idea: '성질 두 개(이등변 밑각 + 평각)를 이어 쓰는 복합 문제 — 연결이 실력이에요.',
    solve: `∠ACB = ${base}° (밑각) → ∠ACD = 180 − ${base} = ${180 - base}°.`,
    remember: '복합 도형 문제는 "아는 각부터 차례로 채우기"가 정석.',
    estimatedSec: 100,
  };
}

export function transferGeoTri(level: Level): Draft {
  const angle = randInt(25, 40);
  return {
    stem: `지붕 트러스가 이등변삼각형 모양입니다. 수평 보와 경사 기둥이 이루는 밑각이 양쪽 모두 ${angle}° 일 때, 꼭대기에서 두 경사 기둥이 이루는 각은?`,
    ...buildChoices(
      `${180 - 2 * angle}°`,
      [
        { text: `${180 - angle}°`, tag: 'CALCULATION' },
        { text: `${2 * angle}°`, tag: 'CONCEPT' },
        { text: `${90 - angle}°`, tag: 'FORMULA' },
      ],
      (g) => `${180 - 2 * angle + g}°`,
    ),
    hints: ['트러스를 삼각형으로 추상화해요.', '두 밑각이 같은 이등변삼각형이에요.', `꼭지각 = 180 − 2×${angle}.`],
    idea: '건축의 트러스, 다리의 골조 — 이등변삼각형 성질이 실제 구조물을 지탱해요.',
    solve: `꼭지각 = 180 − 2×${angle} = ${180 - 2 * angle}°.`,
    remember: '현실 문제 → 도형 추상화 → 성질 적용. 3단 변환!',
    estimatedSec: 80 + level * 5,
  };
}

// =====================================================================
// M2.STA.PROB — 확률
// =====================================================================
export function genStaProb(level: Level): Draft {
  if (level === 1) {
    const n = randInt(3, 5);
    const m = randInt(2, 4);
    return {
      stem: `티셔츠 ${n}벌과 바지 ${m}벌이 있습니다. 티셔츠와 바지를 하나씩 골라 입는 경우의 수는?`,
      ...buildChoices(
        `${n * m}가지`,
        [
          { text: `${n + m}가지`, tag: 'CONCEPT' },
          { text: `${n * m + m}가지`, tag: 'CALCULATION' },
          { text: `${Math.pow(2, Math.min(n, m))}가지`, tag: 'FORMULA' },
        ],
        (g) => `${n * m + g}가지`,
      ),
      hints: ['티셔츠 하나마다 바지를 몇 가지씩 고를 수 있나요?', '"동시에/그리고" 상황은 곱셈이에요.', `${n} × ${m} = ?`],
      idea: '경우의 수의 두 법칙: "그리고"는 곱, "또는"은 합. 이 문제는 "그리고"!',
      solve: `${n} × ${m} = ${n * m}가지.`,
      remember: '나뭇가지 그림(수형도)을 그리면 곱의 법칙이 눈에 보여요.',
      estimatedSec: 45,
    };
  }
  if (level === 2) {
    const n = randInt(4, 6);
    const answer = (n * (n - 1)) / 2;
    return {
      stem: `${n}명의 학생 중 대표 2명을 뽑는 경우의 수는? (뽑는 순서는 상관없음)`,
      ...buildChoices(
        `${answer}가지`,
        [
          { text: `${n * (n - 1)}가지`, tag: 'CONCEPT' },
          { text: `${n * n}가지`, tag: 'FORMULA' },
          { text: `${answer + n}가지`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g}가지`,
      ),
      hints: [
        '먼저 순서를 고려해 뽑아보세요.',
        `순서 있게 뽑으면 ${n} × ${n - 1} = ${n * (n - 1)}가지.`,
        '순서가 상관없으니 (A,B)와 (B,A)는 같은 경우 — 2로 나눠요.',
      ],
      idea: '"순서 무시 = 겹치는 만큼 나누기" — 조합 개념의 씨앗이에요.',
      solve: `${n}×${n - 1} ÷ 2 = ${answer}가지.`,
      remember: '자격이 같은 대표 뽑기는 ÷2, 회장·부회장처럼 다르면 나누지 않아요.',
      estimatedSec: 60,
    };
  }
  if (level === 3) {
    const target = randInt(4, 10);
    let count = 0;
    for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === target) count++;
    const ans = simplifyFrac(count, 36);
    return {
      stem: `주사위 두 개를 동시에 던질 때, 나온 눈의 합이 ${target}일 확률은?`,
      ...buildChoices(
        fracStr(ans),
        [
          { text: fracStr(simplifyFrac(count, 6)), tag: 'CONCEPT' },
          { text: fracStr(simplifyFrac(count + 1, 36)), tag: 'CALCULATION' },
          { text: '1/6', tag: 'GUESSING' },
        ],
        (g) => fracStr(simplifyFrac(count + g, 36)),
      ),
      hints: ['전체 경우의 수부터: 6 × 6 = 36가지.', `합이 ${target}이 되는 (첫째, 둘째) 쌍을 모두 세어요.`, `${count}가지를 찾았다면 36으로 나눠요.`],
      idea: '확률 = 원하는 경우 ÷ 전체 경우. 분모(36)를 먼저 고정하면 실수가 없어요.',
      solve: `합 ${target}인 경우 ${count}가지 → ${count}/36 = ${fracStr(ans)}.`,
      remember: '(1,2)와 (2,1)은 다른 경우! 순서쌍으로 세기.',
      estimatedSec: 80,
    };
  }
  if (level === 4) {
    const n = pick([2, 3]);
    const denom = Math.pow(2, n);
    const ans = simplifyFrac(denom - 1, denom);
    return {
      stem: `동전 ${n}개를 동시에 던질 때, 적어도 한 개는 앞면이 나올 확률은?`,
      ...buildChoices(
        fracStr(ans),
        [
          { text: fracStr(simplifyFrac(1, denom)), tag: 'CONCEPT' },
          { text: n === 2 ? '1' : '1/2', tag: 'GUESSING' },
          { text: fracStr(simplifyFrac(n, denom)), tag: 'FORMULA' },
        ],
        (g) => fracStr(simplifyFrac(g, denom)),
      ),
      hints: [
        '"적어도 하나"의 반대는 무엇일까요?',
        '반대 사건: 모두 뒷면. 그 확률은 1/' + denom + '.',
        '1 − (모두 뒷면일 확률).',
      ],
      idea: '"적어도"가 보이면 여사건 — 반대를 계산해 1에서 빼는 것이 압도적으로 빨라요.',
      solve: `모두 뒷면 = 1/${denom} → 적어도 한 개 앞면 = 1 − 1/${denom} = ${fracStr(ans)}.`,
      remember: '"적어도 하나" = 1 − "하나도 없다".',
      estimatedSec: 80,
    };
  }
  // L5 — 독립 사건 곱
  const p1 = pick([[1, 2], [1, 3], [2, 3]] as const);
  const p2 = pick([[1, 2], [1, 4], [3, 4]] as const);
  const ans = simplifyFrac(p1[0] * p2[0], p1[1] * p2[1]);
  return {
    stem: `자유투 성공률이 ${fracStr([p1[0], p1[1]])}인 선수 A와 ${fracStr([p2[0], p2[1]])}인 선수 B가 각각 한 번씩 자유투를 던질 때, 두 선수 모두 성공할 확률은?`,
    ...buildChoices(
      fracStr(ans),
      [
        { text: fracStr(simplifyFrac(p1[0] * p2[1] + p2[0] * p1[1], p1[1] * p2[1])), tag: 'CONCEPT' },
        { text: fracStr(simplifyFrac(p1[0] + p2[0], p1[1] + p2[1])), tag: 'FORMULA' },
        { text: fracStr(simplifyFrac(p1[0] * p2[0] + 1, p1[1] * p2[1])), tag: 'CALCULATION' },
      ],
      (g) => fracStr(simplifyFrac(p1[0] * p2[0] + g, p1[1] * p2[1] + g)),
    ),
    hints: ['두 사건이 서로 영향을 주지 않아요(독립).', '"A 성공 그리고 B 성공" — 그리고는 곱셈.', `${fracStr([p1[0], p1[1]])} × ${fracStr([p2[0], p2[1]])}.`],
    idea: '독립 사건의 "모두 일어날" 확률 = 각 확률의 곱.',
    solve: `${fracStr([p1[0], p1[1]])} × ${fracStr([p2[0], p2[1]])} = ${fracStr(ans)}.`,
    remember: '확률의 "그리고" = ×, "또는"(배반) = +.',
    estimatedSec: 90,
  };
}

export function transferStaProb(level: Level): Draft {
  const total = pick([12, 16, 20]);
  const win = pick([3, 4, 5].filter((w) => w < total));
  const ans = simplifyFrac(win, total);
  return {
    stem: `문구점 뽑기 기계에 인형 ${total}개가 들어 있고 그중 ${win}개가 한정판입니다. 한 번 뽑을 때 한정판이 나올 확률은?`,
    ...buildChoices(
      fracStr(ans),
      [
        { text: fracStr(simplifyFrac(win, total - win)), tag: 'CONCEPT' },
        { text: fracStr(simplifyFrac(total - win, total)), tag: 'INTERPRETATION' },
        { text: fracStr(simplifyFrac(win + 1, total)), tag: 'CALCULATION' },
      ],
      (g) => fracStr(simplifyFrac(win + g, total)),
    ),
    hints: ['전체 경우의 수 = 인형 전체 개수.', '원하는 경우 = 한정판 개수.', `${win}/${total}을 약분해요.`],
    idea: '뽑기·추첨·복권 — 일상의 "가능성"이 전부 확률 계산이에요.',
    solve: `${win}/${total} = ${fracStr(ans)}.`,
    remember: '확률의 분모는 "전체", 분자는 "원하는 것". 반대로 쓰면 함정!',
    estimatedSec: 60 + level * 5,
  };
}
