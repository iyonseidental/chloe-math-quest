// 중1 — 수와 연산 / 문자와 식 / 일차방정식 생성기
// 모든 오답 선택지는 "특정 실수를 하면 나오는 값"으로 만들어 error type을 태깅한다.
import type { Level } from '../types.ts';
import { buildChoices, fmtSigned, formatLinear, fracStr, nonZero, pick, randInt, simplifyFrac } from './util.ts';
import type { Draft } from './index.ts';

// =====================================================================
// M1.NUM.INT — 정수와 유리수
// =====================================================================
export function genNumInt(level: Level): Draft {
  if (level === 1) {
    const a = nonZero(-12, 12);
    const b = nonZero(-12, 12);
    const answer = a + b;
    return {
      stem: `다음을 계산하세요.\n(${a}) + (${b})`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${-answer}`, tag: 'SIGN' },
          { text: `${Math.abs(a) + Math.abs(b) === Math.abs(answer) ? answer + 2 : Math.abs(a) + Math.abs(b)}`, tag: 'CONCEPT' },
          { text: `${a - b}`, tag: 'SIGN' },
        ],
        (g) => `${answer + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '두 수의 부호가 같은지 다른지 먼저 확인해보세요.',
        '부호가 다르면 절댓값의 차를 구하고, 절댓값이 큰 쪽의 부호를 붙여요.',
        `|${a}| = ${Math.abs(a)}, |${b}| = ${Math.abs(b)} — 어느 쪽이 더 큰가요?`,
      ],
      idea: '음수 덧셈은 수직선에서 왼쪽으로 이동하는 것으로 생각하면 쉬워요.',
      solve: `(${a}) + (${b}) = ${answer}. ${a < 0 !== b < 0 ? `부호가 다르므로 절댓값의 차 ${Math.abs(Math.abs(a) - Math.abs(b))}에 절댓값이 큰 수의 부호를 붙입니다.` : `부호가 같으므로 절댓값의 합에 공통 부호를 붙입니다.`}`,
      remember: '부호가 다른 두 수의 합: 절댓값의 차 + 큰 쪽의 부호.',
      estimatedSec: 30,
    };
  }
  if (level === 2) {
    const a = nonZero(-10, 10);
    const b = randInt(2, 9);
    const c = nonZero(-6, 6);
    const answer = a - b * c;
    return {
      stem: `다음을 계산하세요.\n${a} − ${b} × (${c})`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${(a - b) * c}`, tag: 'CALCULATION' },
          { text: `${a + b * c}`, tag: 'SIGN' },
          { text: `${a - b - c}`, tag: 'CONCEPT' },
        ],
        (g) => `${answer + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '덧셈·뺄셈보다 먼저 해야 하는 연산이 있어요.',
        '곱셈을 먼저 계산해요. 음수가 곱해지면 부호에 주의!',
        `${b} × (${c}) = ${b * c} 부터 계산해보세요.`,
      ],
      idea: '혼합 계산의 순서: 곱셈·나눗셈 먼저, 덧셈·뺄셈은 나중에.',
      solve: `${b} × (${c}) = ${b * c} 이므로 ${a} − (${b * c}) = ${answer}.`,
      remember: '빼는 수가 음수이면 결국 더하는 것과 같아요: a − (−b) = a + b.',
      estimatedSec: 45,
    };
  }
  if (level === 3) {
    const b = randInt(2, 6);
    const d = randInt(2, 6);
    const a = nonZero(-(b + 2), b + 2);
    const c = nonZero(-(d + 2), d + 2);
    const ans = simplifyFrac(a * d + c * b, b * d);
    return {
      stem: `다음을 계산하세요.\n${a}/${b} + (${c}/${d})`,
      ...buildChoices(
        fracStr(ans),
        [
          // 분자·분모를 각각 그대로 더함 — MIS.FRAC.ADDDEN의 기계적 산물 그 자체
          { text: fracStr(simplifyFrac(a + c, b + d)), tag: 'CONCEPT', misconceptionId: 'MIS.FRAC.ADDDEN', diagnosticStrength: 'HIGH' },
          { text: fracStr(simplifyFrac(a * d - c * b, b * d)), tag: 'SIGN' },
          // 분자는 통분했지만 분모는 더함 — 같은 오규칙의 부분 적용
          { text: fracStr(simplifyFrac(a * d + c * b, b + d)), tag: 'CALCULATION', misconceptionId: 'MIS.FRAC.ADDDEN', diagnosticStrength: 'MEDIUM' },
        ],
        (g) => fracStr(simplifyFrac(ans[0] + g, ans[1])),
      ),
      hints: [
        '분모가 다른 분수는 바로 더할 수 없어요.',
        `두 분모의 공통 배수로 통분해요. ${b} × ${d} = ${b * d}를 쓸 수 있어요.`,
        `${a}/${b} = ${a * d}/${b * d} 로 바꾸면 다음 단계는?`,
      ],
      idea: '분수의 덧셈은 "같은 단위로 만들기(통분)"가 핵심이에요.',
      solve: `통분: ${a}/${b} = ${a * d}/${b * d}, ${c}/${d} = ${c * b}/${b * d}. 합: ${a * d + c * b}/${b * d} = ${fracStr(ans)}.`,
      remember: '분자끼리만 더해요. 분모는 더하지 않아요!',
      estimatedSec: 60,
    };
  }
  if (level === 4) {
    const a = pick([-2, -3, 2, 3]);
    const n = pick([2, 3]);
    const b = randInt(2, 5);
    const c = nonZero(-4, 4);
    const powVal = Math.pow(a, n);
    const answer = powVal - b * c;
    const wrongPow = a < 0 && n % 2 === 0 ? -powVal : a < 0 && n % 2 === 1 ? -powVal : powVal + a;
    return {
      stem: `다음을 계산하세요.\n(${a})${n === 2 ? '²' : '³'} − ${b} × (${c})`,
      ...buildChoices(
        `${answer}`,
        [
          // a<0·짝수 지수에서 wrongPow=−powVal은 (−a)²을 −a²로 계산한 결과 — NEGSQ 범위 혼동의 지문
          { text: `${wrongPow - b * c}`, tag: 'SIGN', ...(a < 0 && n % 2 === 0 ? { misconceptionId: 'MIS.SIGN.NEGSQ', diagnosticStrength: 'HIGH' as const } : {}) },
          { text: `${powVal + b * c}`, tag: 'SIGN' },
          { text: `${(powVal - b) * c}`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '거듭제곱을 가장 먼저 계산해요.',
        `음수의 거듭제곱: 지수가 ${n % 2 === 0 ? '짝수면 결과는 양수' : '홀수면 결과는 음수'}예요.`,
        `(${a})${n === 2 ? '²' : '³'} = ${powVal} 을 구했다면, 이제 곱셈 부분을 계산해요.`,
      ],
      idea: '계산 순서: 거듭제곱 → 곱셈·나눗셈 → 덧셈·뺄셈.',
      solve: `(${a})${n === 2 ? '²' : '³'} = ${powVal}, ${b} × (${c}) = ${b * c}. 따라서 ${powVal} − (${b * c}) = ${answer}.`,
      remember: '(−a)² 은 양수, (−a)³ 은 음수. 지수의 짝·홀이 부호를 결정해요.',
      estimatedSec: 75,
    };
  }
  // Level 5 — Elite: 절댓값 복합
  const a = nonZero(-9, 9);
  const b = nonZero(-9, 9);
  const c = pick([-3, -2, 2, 3]);
  const d = nonZero(-8, 8);
  const answer = Math.abs(a - b) * c - d;
  return {
    stem: `다음을 계산하세요.\n|${a} − (${b})| × (${c}) − (${d})`,
    ...buildChoices(
      `${answer}`,
      [
        // 절댓값을 벗기며 내부 부호를 유지한 결과 — a−b<0일 때만 MIS.ABS.DROP의 진단형
        { text: `${(a - b) * c - d}`, tag: 'CONCEPT', ...(a - b < 0 ? { misconceptionId: 'MIS.ABS.DROP', diagnosticStrength: 'HIGH' as const } : {}) },
        { text: `${Math.abs(a - b) * c + d}`, tag: 'SIGN' },
        { text: `${Math.abs(a) - Math.abs(b) * c - d}`, tag: 'CALCULATION' },
      ],
      (g) => `${answer + (g % 2 ? g : -g)}`,
    ),
    hints: [
      '절댓값 기호 안을 먼저 계산해요.',
      '절댓값은 결과를 항상 0 이상으로 만들어요. |−5| = 5.',
      `${a} − (${b}) = ${a - b} 이므로 절댓값은 ${Math.abs(a - b)}. 다음은 곱셈이에요.`,
    ],
    idea: '절댓값 기호는 괄호처럼 "안쪽 먼저" 계산한 뒤 부호를 벗겨요.',
    solve: `|${a - b}| = ${Math.abs(a - b)}, ${Math.abs(a - b)} × (${c}) = ${Math.abs(a - b) * c}, 마지막으로 − (${d}) 를 적용하면 ${answer}.`,
    remember: '절댓값을 벗기는 순간이 부호 실수가 가장 많이 나오는 지점이에요.',
    estimatedSec: 90,
  };
}

// 전이 문제: 동일 개념(정수 연산)을 새로운 상황(온도/해발/포인트)에서
export function transferNumInt(level: Level): Draft {
  const ctx = pick(['temp', 'elevator', 'point'] as const);
  const a = randInt(2, 9);
  const b = randInt(3, 12);
  const c = randInt(2, 8);
  const answer = a - b + c;
  const stems = {
    temp: `아침 기온이 ${a}°C였는데 낮 동안 ${b}°C 내려갔다가 저녁에 다시 ${c}°C 올랐습니다. 지금 기온은 몇 °C일까요?`,
    elevator: `채림이는 지상 ${a}층에서 엘리베이터를 타고 ${b}층을 내려간 뒤 다시 ${c}층을 올라갔습니다. 지금 있는 층을 정수로 나타내면? (지하 1층 = −1)`,
    point: `게임에서 ${a}점을 가지고 시작해 ${b}점을 잃고, 다시 ${c}점을 얻었습니다. 지금 점수는?`,
  };
  return {
    stem: stems[ctx],
    ...buildChoices(
      `${answer}`,
      [
        { text: `${a + b + c}`, tag: 'INTERPRETATION' },
        { text: `${a - b - c}`, tag: 'SIGN' },
        { text: `${-(a - b + c) === answer ? answer + 1 : -(a - b + c)}`, tag: 'SIGN' },
      ],
      (g) => `${answer + (g % 2 ? g : -g)}`,
    ),
    hints: [
      '"내려간다/잃는다"는 어떤 부호일까요?',
      '상황을 식으로 옮겨보세요: 시작값 − 감소량 + 증가량.',
      `${a} − ${b} + ${c} 를 계산하면 돼요.`,
    ],
    idea: '실생활의 증가/감소를 양수/음수로 번역하는 것이 정수 개념의 진짜 쓸모예요.',
    solve: `${a} − ${b} + ${c} = ${answer}.`,
    remember: '문장 → 부호 번역: 내려감·잃음 = −, 올라감·얻음 = +.',
    estimatedSec: 60 + level * 5,
  };
}

// =====================================================================
// M1.ALG.EXP — 문자와 식
// =====================================================================
export function genAlgExp(level: Level): Draft {
  if (level === 1) {
    const k = nonZero(-6, 6);
    const a = randInt(2, 6);
    const b = nonZero(-9, 9);
    const answer = a * k + b;
    return {
      stem: `x = ${k} 일 때, 다음 식의 값을 구하세요.\n${formatLinear(a, b)}`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${a * -k + b}`, tag: 'SIGN' },
          { text: `${a * (k + b)}`, tag: 'INTERPRETATION' },
          { text: `${a + k + b}`, tag: 'CONCEPT' },
        ],
        (g) => `${answer + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '식의 x 자리에 주어진 수를 넣어요.',
        '음수를 대입할 때는 괄호를 꼭 씌워요: x = −2라면 3x = 3 × (−2).',
        `${a} × (${k}) 를 먼저 계산해보세요.`,
      ],
      idea: '"식의 값"은 문자에 수를 넣어 계산한 결과예요. 괄호가 실수를 막아줘요.',
      solve: `${a} × (${k}) ${fmtSigned(b)} = ${a * k} ${fmtSigned(b)} = ${answer}.`,
      remember: '대입할 때는 부호까지 통째로 괄호에 넣기.',
      estimatedSec: 40,
    };
  }
  if (level === 2) {
    const a = nonZero(-8, 8);
    const b = nonZero(-10, 10);
    const c = nonZero(-8, 8);
    const d = nonZero(-10, 10);
    const m = a + c;
    const k = b + d;
    return {
      stem: `다음 식을 간단히 하세요.\n${formatLinear(a, b)} ${c >= 0 ? '+' : '−'} ${Math.abs(c)}x ${fmtSigned(d)}`,
      ...buildChoices(
        formatLinear(m, k),
        [
          { text: formatLinear(a - c, k), tag: 'SIGN' },
          { text: formatLinear(m, b - d), tag: 'SIGN' },
          { text: `${m + k}x`, tag: 'CONCEPT' },
        ],
        (g) => formatLinear(m, k + g),
      ),
      hints: [
        '동류항끼리만 더하고 뺄 수 있어요.',
        'x가 있는 항끼리, 상수항끼리 따로 모아요.',
        `x항: ${a}x ${fmtSigned(c)}x = ${m}x. 상수항은요?`,
      ],
      idea: '식 정리는 "같은 종류끼리 모으기"예요. 사과는 사과끼리, 배는 배끼리.',
      solve: `x항: ${a}x ${fmtSigned(c)}x = ${m}x. 상수항: ${b} ${fmtSigned(d)} = ${k}. 답: ${formatLinear(m, k)}.`,
      remember: 'x항과 상수항은 절대 합칠 수 없어요.',
      estimatedSec: 50,
    };
  }
  if (level === 3) {
    const a = pick([-4, -3, -2, 2, 3, 4]);
    const b = nonZero(-5, 5);
    const c = nonZero(-6, 6);
    const d = pick([-3, -2, 2, 3]);
    const e = nonZero(-5, 5);
    const f = nonZero(-6, 6);
    const m = a * b - d * e;
    const k = a * c - d * f;
    return {
      stem: `다음 식을 간단히 하세요.\n${a}(${formatLinear(b, c)}) − ${d < 0 ? `(${d})` : d}(${formatLinear(e, f)})`,
      ...buildChoices(
        formatLinear(m, k),
        [
          // − 부호를 둘째 괄호의 둘째 항까지 분배하지 않음 — MIS.EXP.DISTR의 대표 지문
          { text: formatLinear(a * b - d * e, a * c + d * f), tag: 'SIGN', misconceptionId: 'MIS.EXP.DISTR', diagnosticStrength: 'HIGH' },
          { text: formatLinear(a * b + d * e, a * c + d * f), tag: 'SIGN' },
          // 둘째 괄호에 계수 d를 아예 곱하지 않음 — 같은 오규칙의 변형 (부주의와도 겹쳐 MEDIUM)
          { text: formatLinear(a * b - e, a * c - f), tag: 'CALCULATION', misconceptionId: 'MIS.EXP.DISTR', diagnosticStrength: 'MEDIUM' },
        ],
        (g) => formatLinear(m, k + g),
      ),
      hints: [
        '괄호를 먼저 풀어요(분배법칙).',
        '두 번째 괄호 앞의 −(빼기)는 괄호 안 모든 항의 부호를 바꿔요.',
        `${a}(${formatLinear(b, c)}) = ${formatLinear(a * b, a * c)}. 두 번째 괄호도 풀어보세요.`,
      ],
      idea: '분배법칙: 괄호 앞 수를 안의 "모든" 항에 곱해요. 하나만 곱하면 오답 함정!',
      solve: `${a}(${formatLinear(b, c)}) = ${formatLinear(a * b, a * c)}, −${d}(${formatLinear(e, f)}) = ${formatLinear(-d * e, -d * f)}. 동류항 정리: ${formatLinear(m, k)}.`,
      remember: '빼기 뒤 괄호 풀기 = 부호 전원 반전.',
      estimatedSec: 70,
    };
  }
  if (level === 4) {
    const x = nonZero(-4, 4);
    const y = nonZero(-4, 4);
    const a = randInt(2, 4);
    const b = randInt(2, 5);
    const answer = a * x * x - b * y;
    return {
      stem: `x = ${x}, y = ${y} 일 때, 다음 식의 값을 구하세요.\n${a}x² − ${b}y`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${a * x * x + b * y}`, tag: 'SIGN' },
          // x<0 대입에서 x²을 음수로 계산한 결과 — MIS.VAL.NEGSQ의 기계적 산물 (비충돌 시)
          { text: `${-(a * x * x) - b * y === answer ? answer + 2 : -(a * x * x) - b * y}`, tag: 'SIGN', ...(x < 0 && -(a * x * x) - b * y !== answer ? { misconceptionId: 'MIS.VAL.NEGSQ', diagnosticStrength: 'HIGH' as const } : {}) },
          { text: `${a * x * 2 - b * y}`, tag: 'CONCEPT' },
        ],
        (g) => `${answer + (g % 2 ? g : -g)}`,
      ),
      hints: [
        'x², 즉 x를 두 번 곱한 값을 먼저 구해요.',
        `(${x})² 은 ${x < 0 ? '음수 × 음수라서 양수' : '그대로 양수'}예요.`,
        `${a} × ${x * x} 를 계산한 뒤 ${b} × (${y}) 를 빼요.`,
      ],
      idea: '두 문자 대입은 하나씩 차분히. 거듭제곱 자리의 음수가 최대 함정이에요.',
      solve: `(${x})² = ${x * x}, ${a} × ${x * x} = ${a * x * x}. ${b} × (${y}) = ${b * y}. 따라서 ${a * x * x} − (${b * y}) = ${answer}.`,
      remember: 'x²에 음수를 대입하면 결과는 항상 0 이상.',
      estimatedSec: 80,
    };
  }
  // Level 5 — 규칙성의 일반화
  const step = randInt(2, 5);
  const first = randInt(3, 7);
  const base = first - step;
  const n = randInt(10, 30);
  const answer = step * n + base;
  return {
    stem: `성냥개비로 도형을 이어 붙입니다. 1번째 모양에는 ${first}개, 이후 한 단계마다 ${step}개씩 더 필요합니다.\nn번째 모양에 필요한 성냥개비 수를 식으로 나타내고, ${n}번째 모양의 개수를 구하세요.`,
    ...buildChoices(
      `${step}n ${fmtSigned(base)} → ${answer}개`,
      [
        { text: `${step}n → ${step * n}개`, tag: 'FORMULA' },
        { text: `${first}n → ${first * n}개`, tag: 'CONCEPT' },
        { text: `${step}n ${fmtSigned(first)} → ${step * n + first}개`, tag: 'CALCULATION' },
      ],
      (g) => `${step}n ${fmtSigned(base + g)} → ${answer + g}개`,
    ),
    hints: [
      '단계가 1 늘 때마다 몇 개씩 늘어나는지가 n의 계수예요.',
      `1번째가 ${first}개이므로, 식에 n=1을 넣었을 때 ${first}이 나와야 해요.`,
      `${step}n + □ 에서 n=1일 때 ${first} → □ = ${base}.`,
    ],
    idea: '규칙 찾기: "증가량"이 계수, "시작 보정"이 상수항이 되는 것이 일반화의 핵심.',
    solve: `한 단계마다 ${step}개 증가 → ${step}n + □. n=1일 때 ${first}개이므로 □ = ${first} − ${step} = ${base}. 식: ${step}n ${fmtSigned(base)}. n=${n}: ${step}×${n} ${fmtSigned(base)} = ${answer}개.`,
    remember: '일반항 검산은 n=1 대입으로! 첫 항이 맞으면 식이 맞아요.',
    estimatedSec: 110,
  };
}

export function transferAlgExp(level: Level): Draft {
  const ctx = pick(['age', 'price'] as const);
  const a = randInt(2, 5);
  const b = randInt(3, 15);
  const k = randInt(3, 9);
  const answer = a * k + b;
  const stems = {
    age: `채림이의 나이를 x살이라고 하면, 이모의 나이는 채림이 나이의 ${a}배보다 ${b}살 많습니다. 이모의 나이를 식으로 나타내고, x = ${k}일 때 이모의 나이를 구하세요.`,
    price: `한 자루에 x원인 연필 ${a}자루와 ${b}원짜리 지우개 1개를 샀습니다. 전체 가격을 식으로 나타내고, x = ${k}00일 때 가격을 구하세요.`,
  };
  const answerText = ctx === 'age' ? `${a}x + ${b} → ${answer}살` : `${a}x + ${b} → ${a * k * 100 + b}원`;
  const priceAns = a * k * 100 + b;
  return {
    stem: stems[ctx],
    ...buildChoices(
      answerText,
      ctx === 'age'
        ? [
            // "~보다 b 많다"를 −b로 번역 — 증감 방향 반전 (MIS.EQ.WORDDIR)
            { text: `${a}x − ${b} → ${a * k - b}살`, tag: 'INTERPRETATION', misconceptionId: 'MIS.EQ.WORDDIR', diagnosticStrength: 'HIGH' },
            { text: `${a}(x + ${b}) → ${a * (k + b)}살`, tag: 'INTERPRETATION' },
            { text: `${a}x + ${b} → ${a * k + b + a}살`, tag: 'CALCULATION' },
          ]
        : [
            { text: `${a}x − ${b} → ${a * k * 100 - b}원`, tag: 'INTERPRETATION', misconceptionId: 'MIS.EQ.WORDDIR', diagnosticStrength: 'MEDIUM' },
            { text: `x + ${a} + ${b} → ${k * 100 + a + b}원`, tag: 'CONCEPT' },
            { text: `${a}x + ${b} → ${priceAns + 100}원`, tag: 'CALCULATION' },
          ],
      (g) => (ctx === 'age' ? `${a}x + ${b} → ${answer + g}살` : `${a}x + ${b} → ${priceAns + g * 10}원`),
    ),
    hints: [
      '문장을 그대로 식으로 번역해요: "~배" 는 곱셈, "~보다 많다"는 덧셈.',
      `"${a}배보다 ${b} 많다" → ${a}x + ${b}.`,
      '식을 세운 뒤 x에 값을 대입해요.',
    ],
    idea: '문자식의 힘 = 아직 모르는 값을 두고도 관계를 정확히 적을 수 있다는 것.',
    solve: `식: ${a}x + ${b}. 대입하면 답을 얻습니다.`,
    remember: '"~보다 c 많다" = +c, "~의 a배" = ×a. 번역 규칙을 외워두면 문장제가 쉬워져요.',
    estimatedSec: 70 + level * 5,
  };
}

// =====================================================================
// M1.ALG.EQ — 일차방정식
// =====================================================================
export function genAlgEq(level: Level): Draft {
  if (level === 1) {
    const sol = nonZero(-9, 9);
    const a = nonZero(-9, 9);
    const b = sol + a;
    return {
      stem: `방정식을 푸세요.\nx ${fmtSigned(a)} = ${b}`,
      ...buildChoices(
        `x = ${sol}`,
        [
          // x + a = b에서 x = b + a — 이항하며 부호를 안 바꾼 결과 그 자체 (MIS.EQ.MOVE)
          { text: `x = ${b + a}`, tag: 'SIGN', misconceptionId: 'MIS.EQ.MOVE', diagnosticStrength: 'HIGH' },
          { text: `x = ${-sol === sol ? sol + 1 : -sol}`, tag: 'SIGN' },
          { text: `x = ${b}`, tag: 'CONCEPT' },
        ],
        (g) => `x = ${sol + (g % 2 ? g : -g)}`,
      ),
      hints: [
        'x만 남기려면 양변에서 무엇을 없애야 할까요?',
        `양변에 ${a >= 0 ? `−${a}` : `+${Math.abs(a)}`} 를 해요(이항하면 부호가 바뀌어요).`,
        `x = ${b} ${a >= 0 ? `− ${a}` : `+ ${Math.abs(a)}`} 를 계산해요.`,
      ],
      idea: '방정식은 양팔저울 — 양쪽에 같은 일을 하면 균형이 유지돼요.',
      solve: `${a >= 0 ? `양변에서 ${a}을 빼면` : `양변에 ${Math.abs(a)}을 더하면`} x = ${b} ${a >= 0 ? `− ${a}` : `+ ${Math.abs(a)}`} = ${sol}.`,
      remember: '이항 = 등호를 건너면 부호가 반대로.',
      estimatedSec: 40,
    };
  }
  if (level === 2) {
    const sol = nonZero(-9, 9);
    const a = pick([-6, -4, -3, -2, 2, 3, 4, 6]);
    const b = nonZero(-12, 12);
    const c = a * sol + b;
    return {
      stem: `방정식을 푸세요.\n${formatLinear(a, b)} = ${c}`,
      ...buildChoices(
        `x = ${sol}`,
        [
          { text: `x = ${-sol === sol ? sol + 2 : -sol}`, tag: 'SIGN' },
          // ax + b = c에서 (c+b)/a — b를 이항하며 부호를 안 바꾼 결과 (MIS.EQ.MOVE)
          { text: `x = ${(c + b) % a === 0 && (c + b) / a !== sol ? (c + b) / a : sol + 1}`, tag: 'SIGN', ...((c + b) % a === 0 && (c + b) / a !== sol ? { misconceptionId: 'MIS.EQ.MOVE', diagnosticStrength: 'HIGH' as const } : {}) },
          { text: `x = ${sol + (sol > 0 ? -2 : 2)}`, tag: 'CALCULATION' },
        ],
        (g) => `x = ${sol + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '상수항을 먼저 우변으로 이항해요.',
        `${a}x = ${c} ${fmtSigned(-b)} 가 됐다면, 다음은 계수로 나누기.`,
        `${a}x = ${c - b} → x = ${c - b} ÷ (${a}).`,
      ],
      idea: '풀이 순서: ① 상수항 이항 ② 계수로 양변 나누기.',
      solve: `${a}x = ${c} ${fmtSigned(-b)} = ${c - b}, x = ${c - b} ÷ (${a}) = ${sol}.`,
      remember: '음수 계수로 나눌 때 부호 실수가 가장 잦아요. 검산: x를 원래 식에 대입!',
      estimatedSec: 55,
    };
  }
  if (level === 3) {
    const sol = nonZero(-8, 8);
    let a = nonZero(-7, 7);
    let c = nonZero(-7, 7);
    while (a === c) c = nonZero(-7, 7);
    const b = nonZero(-10, 10);
    const d = (a - c) * sol + b;
    return {
      stem: `방정식을 푸세요.\n${formatLinear(a, b)} = ${formatLinear(c, d)}`,
      ...buildChoices(
        `x = ${sol}`,
        [
          { text: `x = ${-sol === sol ? sol + 1 : -sol}`, tag: 'SIGN' },
          { text: `x = ${(d - b) % (a + c) === 0 && a + c !== 0 && (d - b) / (a + c) !== sol ? (d - b) / (a + c) : sol + 2}`, tag: 'SIGN' },
          { text: `x = ${sol - 1}`, tag: 'CALCULATION' },
        ],
        (g) => `x = ${sol + (g % 2 ? g : -g)}`,
      ),
      hints: [
        'x항은 좌변으로, 상수항은 우변으로 모아요.',
        `${c}x를 좌변으로 이항하면 부호가 바뀌어 ${formatLinear(a - c, 0)}이 남아요.`,
        `${a - c}x = ${d - b} → 양변을 ${a - c}(으)로 나눠요.`,
      ],
      idea: '양변에 x가 있으면 "x는 왼쪽, 숫자는 오른쪽"으로 이사시키기.',
      solve: `${a}x − (${c}x) = ${d} − (${b}) → ${a - c}x = ${d - b} → x = ${sol}.`,
      remember: '이항할 때마다 부호 반전. 두 번 이항하면 두 번 반전.',
      estimatedSec: 70,
    };
  }
  if (level === 4) {
    const sol = nonZero(-6, 6);
    const a = pick([2, 3, 4]);
    const b = nonZero(-5, 5);
    const c = pick([2, 3, 5]);
    // a(x + b) = c x + d 꼴에서 d를 역산 (a ≠ c 보장)
    const aa = a === c ? a + 1 : a;
    const d = aa * sol + aa * b - c * sol;
    return {
      stem: `방정식을 푸세요.\n${aa}(x ${fmtSigned(b)}) = ${formatLinear(c, d)}`,
      ...buildChoices(
        `x = ${sol}`,
        [
          { text: `x = ${-sol === sol ? sol + 1 : -sol}`, tag: 'SIGN' },
          { text: `x = ${sol + b}`, tag: 'CALCULATION' },
          { text: `x = ${sol * 2 === sol ? sol + 3 : sol * 2}`, tag: 'CONCEPT' },
        ],
        (g) => `x = ${sol + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '괄호부터 분배법칙으로 풀어요.',
        `${aa}(x ${fmtSigned(b)}) = ${formatLinear(aa, aa * b)}. 이제 x항을 모아요.`,
        `${aa - c}x = ${d - aa * b} → x = ?`,
      ],
      idea: '괄호 방정식: ① 분배 ② 이항 ③ 나누기 — 순서를 지키면 실수가 없어요.',
      solve: `${formatLinear(aa, aa * b)} = ${formatLinear(c, d)} → ${aa - c}x = ${d - aa * b} → x = ${sol}.`,
      remember: '분배할 때 괄호 안 "모든" 항에 곱하기. 상수항을 빼먹으면 함정 선택지에 걸려요.',
      estimatedSec: 90,
    };
  }
  // Level 5 — 활용 (문장제)
  const kind = pick(['consecutive', 'age', 'distance', 'translate'] as const);
  if (kind === 'translate') {
    // "a배보다 b 큰/작은 수" 직역형 — MIS.EQ.WORDDIR(증감 방향 반전)의 진단형.
    // b = a·k 로 잡아 방향 반전 산물 (c+b)/a 도 항상 정수가 되게 한다.
    const a = pick([2, 3]);
    const b = a * randInt(1, 4);
    const x0 = randInt(3, 12);
    const c = a * x0 + b;
    const flipped = x0 + (2 * b) / a; // ax − b = c 로 세운 결과
    return {
      stem: `어떤 수의 ${a}배보다 ${b}만큼 큰 수가 ${c}입니다. 어떤 수를 구하세요.`,
      ...buildChoices(
        `${x0}`,
        [
          // "~보다 b 크다"를 −b로 번역해 ax − b = c 를 푼 결과 그 자체
          { text: `${flipped}`, tag: 'INTERPRETATION', misconceptionId: 'MIS.EQ.WORDDIR', diagnosticStrength: 'HIGH' },
          { text: `${c - b}`, tag: 'CONCEPT' },
          { text: `${x0 + 1}`, tag: 'CALCULATION' },
        ],
        (g) => `${x0 + g + 1}`,
      ),
      hints: [
        '"~보다 ○만큼 크다"는 + ○ 예요.',
        `식: ${a}x + ${b} = ${c}.`,
        `${a}x = ${c - b} → x = ?`,
      ],
      idea: '문장 → 식 번역: "○배" = ×○, "보다 △ 크다" = +△. 방향이 핵심이에요.',
      solve: `${a}x + ${b} = ${c} → ${a}x = ${c - b} → x = ${x0}.`,
      remember: '"보다 크다/많다" = 더하기, "보다 작다/적다" = 빼기. 번역 방향을 바꾸면 답이 달라져요!',
      estimatedSec: 90,
    };
  }
  if (kind === 'consecutive') {
    const mid = randInt(10, 40) * 2;
    const sum = mid * 3;
    return {
      stem: `연속하는 세 짝수의 합이 ${sum}일 때, 세 수 중 가장 큰 수를 구하세요.`,
      ...buildChoices(
        `${mid + 2}`,
        [
          { text: `${mid}`, tag: 'INTERPRETATION' },
          { text: `${mid - 2}`, tag: 'INTERPRETATION' },
          { text: `${mid + 4}`, tag: 'CALCULATION' },
        ],
        (g) => `${mid + 2 + g * 2}`,
      ),
      hints: [
        '가운데 짝수를 x로 놓으면 세 수는 x−2, x, x+2.',
        '세 수의 합을 x로 나타내면 3x가 돼요.',
        `3x = ${sum} → x = ${mid}. 문제가 묻는 것은 "가장 큰 수"!`,
      ],
      idea: '연속 짝수는 가운데를 x로 놓으면 식이 가장 깔끔해져요.',
      solve: `x−2, x, x+2의 합 = 3x = ${sum} → x = ${mid}. 가장 큰 수는 x+2 = ${mid + 2}.`,
      remember: '방정식을 푼 뒤 "문제가 진짜 묻는 것"을 다시 확인! (x 자체가 아닐 수 있어요)',
      estimatedSec: 120,
    };
  }
  if (kind === 'age') {
    const diff = randInt(24, 32);
    const years = randInt(3, 10);
    // 엄마+y = 2(채림+y) 가 성립하려면 현재 채림 나이 = diff − years
    const childAdj = diff - years;
    return {
      stem: `현재 엄마는 채림이보다 ${diff}살 많습니다. ${years}년 후에 엄마의 나이가 채림이 나이의 2배가 된다면, 현재 채림이는 몇 살일까요?`,
      ...buildChoices(
        `${childAdj}살`,
        [
          { text: `${diff - 2 * years}살`, tag: 'CALCULATION' },
          { text: `${childAdj + years}살`, tag: 'INTERPRETATION' },
          { text: `${diff}살`, tag: 'CONCEPT' },
        ],
        (g) => `${childAdj + g}살`,
      ),
      hints: [
        '현재 채림이 나이를 x로 놓으면 엄마는 x + ' + diff + '.',
        `${years}년 후: 채림이는 x+${years}, 엄마는 x+${diff + years}.`,
        `"엄마 = 채림이의 2배" → x + ${diff + years} = 2(x + ${years}).`,
      ],
      idea: '나이 문제의 열쇠: 몇 년이 지나도 "나이 차"는 변하지 않아요.',
      solve: `x + ${diff + years} = 2(x + ${years}) → x + ${diff + years} = 2x + ${2 * years} → x = ${childAdj}.`,
      remember: '나이 문제 = 나이 차 불변 + 미래 시점의 등식.',
      estimatedSec: 130,
    };
  }
  const speed1 = pick([3, 4]);
  const speed2 = speed1 + pick([1, 2]);
  const totalH = randInt(2, 4);
  // 갈 때 speed1, 올 때 speed2, 총 totalH시간 → 거리 d: d/s1 + d/s2 = totalH → d = totalH*s1*s2/(s1+s2)
  const d = (totalH * speed1 * speed2) / (speed1 + speed2);
  const dNice = Number.isInteger(d) ? d : Math.round(d * 10) / 10;
  return {
    stem: `채림이는 집에서 도서관까지 시속 ${speed1}km로 걸어가고, 같은 길을 시속 ${speed2}km로 걸어 돌아왔습니다. 왕복에 총 ${totalH}시간이 걸렸다면 집에서 도서관까지의 거리는 몇 km일까요?`,
    ...buildChoices(
      `${dNice}km`,
      [
        { text: `${(totalH * (speed1 + speed2)) / 2}km`, tag: 'CONCEPT' },
        { text: `${totalH * speed1}km`, tag: 'INTERPRETATION' },
        { text: `${Math.round(dNice * 2 * 10) / 10}km`, tag: 'CALCULATION' },
      ],
      (g) => `${Math.round((dNice + g) * 10) / 10}km`,
    ),
    hints: [
      '시간 = 거리 ÷ 속력. 거리를 x로 놓아보세요.',
      `갈 때 시간: x/${speed1}, 올 때 시간: x/${speed2}.`,
      `x/${speed1} + x/${speed2} = ${totalH} — 분모를 통분해서 풀어요.`,
    ],
    idea: '거리·속력·시간 문제는 "시간의 합"으로 방정식을 세우는 경우가 대부분이에요.',
    solve: `x/${speed1} + x/${speed2} = ${totalH} → x(${speed2} + ${speed1}) = ${totalH} × ${speed1 * speed2} → x = ${dNice}.`,
    remember: '같은 거리 왕복 = 시간을 각각 구해 더한다. 평균 속력을 쓰면 함정!',
    estimatedSec: 150,
  };
}

export function transferAlgEq(level: Level): Draft {
  const kind = pick(['price', 'chair'] as const);
  if (kind === 'price') {
    const per = randInt(3, 9) * 100;
    const fee = randInt(2, 6) * 100;
    const n = randInt(3, 8);
    const total = per * n + fee;
    return {
      stem: `문구점에서 한 권에 ${per}원인 공책 몇 권과 ${fee}원짜리 봉투 1장을 사고 ${total}원을 냈습니다(거스름돈 없음). 공책은 몇 권 샀을까요?`,
      ...buildChoices(
        `${n}권`,
        [
          { text: `${n + 1}권`, tag: 'CALCULATION' },
          { text: `${Math.round(total / per)}권`, tag: 'INTERPRETATION' },
          { text: `${n - 1 > 0 ? n - 1 : n + 2}권`, tag: 'CALCULATION' },
        ],
        (g) => `${n + g + 1}권`,
      ),
      hints: [
        '공책 수를 x권으로 놓아요.',
        `전체 금액: ${per}x + ${fee} = ${total}.`,
        `${per}x = ${total - fee} → x = ?`,
      ],
      idea: '방정식 활용의 기본 틀: (단가 × 개수) + 고정비 = 전체.',
      solve: `${per}x + ${fee} = ${total} → ${per}x = ${total - fee} → x = ${n}.`,
      remember: '고정 금액(봉투값)을 먼저 빼는 것이 핵심 — 전체를 단가로 바로 나누면 함정.',
      estimatedSec: 80 + level * 5,
    };
  }
  const perChair = randInt(4, 7);
  const short = randInt(2, perChair - 1);
  const extra = randInt(2, 8);
  // x개 의자: perChair명씩 앉으면 short명 못 앉음 / (perChair+1)명씩 앉으면 의자 extra개 남음... 단순화:
  // 학생 수 = perChair*x + short = (perChair+1)*(x - extra) → x = short + (perChair+1)*extra
  const chairs = short + (perChair + 1) * extra;
  const students = perChair * chairs + short;
  return {
    stem: `긴 의자 여러 개에 학생들이 앉습니다. 한 의자에 ${perChair}명씩 앉으면 ${short}명이 앉지 못하고, ${perChair + 1}명씩 앉으면 빈 의자가 ${extra}개 생깁니다(나머지 의자는 꽉 참). 의자는 몇 개일까요?`,
    ...buildChoices(
      `${chairs}개`,
      [
        { text: `${chairs - extra}개`, tag: 'INTERPRETATION' },
        { text: `${chairs + short}개`, tag: 'CALCULATION' },
        { text: `${students}개`, tag: 'INTERPRETATION' },
      ],
      (g) => `${chairs + g}개`,
    ),
    hints: [
      '의자 수를 x로 놓고, "학생 수"를 두 가지 방법으로 표현해요.',
      `첫 상황: 학생 수 = ${perChair}x + ${short}. 둘째 상황은?`,
      `${perChair}x + ${short} = ${perChair + 1}(x − ${extra}) 를 풀어요.`,
    ],
    idea: '"같은 양(학생 수)을 두 가지로 표현해 등식 만들기" — 활용 문제의 만능 열쇠.',
    solve: `${perChair}x + ${short} = ${perChair + 1}(x − ${extra}) → ${perChair}x + ${short} = ${perChair + 1}x − ${(perChair + 1) * extra} → x = ${chairs}.`,
    remember: '문장제에서 등식의 양변은 "같은 것"이어야 해요. 여기서는 학생 수!',
    estimatedSec: 140,
  };
}
