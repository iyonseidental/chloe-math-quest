// 중1 — 좌표평면 / 정비례·반비례 / 기본 도형 / 자료의 정리 생성기
import type { Level } from '../types.ts';
import { buildChoices, nonZero, pick, randInt, simplifyFrac, fracStr } from './util.ts';
import type { Draft } from './index.ts';

const QUADRANTS = ['제1사분면', '제2사분면', '제3사분면', '제4사분면'];
const quadrantOf = (x: number, y: number) => (x > 0 && y > 0 ? 0 : x < 0 && y > 0 ? 1 : x < 0 && y < 0 ? 2 : 3);

// =====================================================================
// M1.FUN.COORD — 좌표평면과 그래프
// =====================================================================
export function genFunCoord(level: Level): Draft {
  if (level === 1) {
    // Phase 3 STEP 2 감사: 사분면 템플릿에서 순서쌍 스왑의 산물은 부호가 다른 점에서 항상
    // 대칭점(−x,−y)의 사분면과 일치한다 — (y,x)와 (−x,−y)는 부호 조합이 같기 때문.
    // 즉 사분면 답으로는 MIS.COORD.ORDER를 원리적으로 판별할 수 없다(SIGN 오답과 비구별).
    // 순서 혼동이 유일하게 그 답을 만드는 '좌표 읽기' 서브템플릿을 신설해 진단형을 공급한다.
    if (Math.random() < 0.5) {
      let x = nonZero(-9, 9);
      let y = nonZero(-9, 9);
      while (Math.abs(x) === Math.abs(y)) y = nonZero(-9, 9); // 네 보기(±x, ±y) 전부 구별 보장
      const axis = pick(['x', 'y'] as const);
      const ans = axis === 'x' ? x : y;
      const swapped = axis === 'x' ? y : x;
      return {
        stem: `점 (${x}, ${y}) 의 ${axis}좌표는 무엇일까요?`,
        ...buildChoices(
          `${ans}`,
          [
            // (x,y)의 순서를 (y,x)로 읽은 결과 그 자체 — MIS.COORD.ORDER의 유일 산물
            { text: `${swapped}`, tag: 'INTERPRETATION', misconceptionId: 'MIS.COORD.ORDER', diagnosticStrength: 'HIGH' },
            { text: `${-ans}`, tag: 'SIGN' },
            { text: `${-swapped}`, tag: 'CARELESS' },
          ],
          (g) => `${ans + g}`,
        ),
        hints: [
          '순서쌍은 (x좌표, y좌표) 순서로 적혀 있어요.',
          '괄호 안 첫 번째 수가 x, 두 번째 수가 y예요.',
          `첫 번째 수는 ${x}, 두 번째 수는 ${y}. ${axis}좌표는?`,
        ],
        idea: '순서쌍의 "순서"가 곧 정보예요 — (2,5)와 (5,2)는 완전히 다른 점.',
        solve: `(${x}, ${y})에서 x좌표 = ${x}, y좌표 = ${y}. 따라서 ${axis}좌표는 ${ans}.`,
        remember: '가로 먼저, 세로 나중 — (가로 x, 세로 y).',
        estimatedSec: 25,
      };
    }
    const x = nonZero(-9, 9);
    const y = nonZero(-9, 9);
    const q = quadrantOf(x, y);
    const mirrorQ = quadrantOf(-x, -y);
    return {
      stem: `점 (${x}, ${y}) 는 몇 사분면 위의 점일까요?`,
      ...buildChoices(
        QUADRANTS[q],
        [
          { text: QUADRANTS[mirrorQ], tag: 'SIGN' },
          // 스왑 산물은 위 주석대로 SIGN과 비구별 — 태깅하지 않는다 (PART 5: 거짓 확신 금지)
          { text: QUADRANTS[quadrantOf(y, x)] === QUADRANTS[q] ? QUADRANTS[(q + 1) % 4] : QUADRANTS[quadrantOf(y, x)], tag: 'INTERPRETATION' },
          { text: QUADRANTS[(q + 2) % 4], tag: 'CONCEPT' },
        ],
        (g) => QUADRANTS[(q + g) % 4],
      ),
      hints: [
        '괄호 안 첫 번째가 x(가로), 두 번째가 y(세로)예요.',
        '사분면은 오른쪽 위부터 반시계 방향으로 1→2→3→4.',
        `x가 ${x > 0 ? '양수' : '음수'}, y가 ${y > 0 ? '양수' : '음수'}인 곳은 어디일까요?`,
      ],
      idea: '사분면 부호표: 1(+,+) 2(−,+) 3(−,−) 4(+,−).',
      solve: `x = ${x} (${x > 0 ? '+' : '−'}), y = ${y} (${y > 0 ? '+' : '−'}) → ${QUADRANTS[q]}.`,
      remember: '순서쌍은 (가로, 세로). 순서를 바꾸면 다른 점이 돼요!',
      estimatedSec: 30,
    };
  }
  if (level === 2) {
    const x = nonZero(-8, 8);
    const y = nonZero(-8, 8);
    const axis = pick(['x', 'y', 'origin'] as const);
    const ans = axis === 'x' ? [x, -y] : axis === 'y' ? [-x, y] : [-x, -y];
    const label = axis === 'x' ? 'x축' : axis === 'y' ? 'y축' : '원점';
    const wrong1 = axis === 'x' ? [-x, y] : [x, -y];
    return {
      stem: `점 (${x}, ${y}) 를 ${label}에 대하여 대칭이동한 점의 좌표는?`,
      ...buildChoices(
        `(${ans[0]}, ${ans[1]})`,
        [
          { text: `(${wrong1[0]}, ${wrong1[1]})`, tag: 'CONCEPT' },
          { text: `(${axis === 'origin' ? `${x}, ${y}` : `${-x}, ${-y}`})`, tag: 'CONCEPT' },
          { text: `(${y}, ${x})`, tag: 'INTERPRETATION' },
        ],
        (g) => `(${ans[0] + g}, ${ans[1]})`,
      ),
      hints: [
        '어떤 축에 대칭이면, 그 축 위의 좌표는 변하지 않아요.',
        'x축 대칭: y 부호만 반대. y축 대칭: x 부호만 반대. 원점 대칭: 둘 다 반대.',
        `${label} 대칭이니까 ${axis === 'x' ? 'x는 그대로, y만 부호 반전' : axis === 'y' ? 'y는 그대로, x만 부호 반전' : 'x, y 모두 부호 반전'}.`,
      ],
      idea: '대칭이동은 "거울". 거울(축)에 붙어 있는 좌표는 그대로예요.',
      solve: `(${x}, ${y}) → ${label} 대칭 → (${ans[0]}, ${ans[1]}).`,
      remember: 'x축 대칭 = y만 반전 / y축 대칭 = x만 반전 / 원점 = 둘 다.',
      estimatedSec: 45,
    };
  }
  if (level === 3) {
    const x1 = nonZero(-7, 3);
    const w = randInt(3, 9);
    const y1 = nonZero(-6, 2);
    const h = randInt(3, 8);
    const area = w * h;
    return {
      stem: `네 점 A(${x1}, ${y1}), B(${x1 + w}, ${y1}), C(${x1 + w}, ${y1 + h}), D(${x1}, ${y1 + h}) 를 꼭짓점으로 하는 직사각형의 넓이는?`,
      ...buildChoices(
        `${area}`,
        [
          { text: `${2 * (w + h)}`, tag: 'FORMULA' },
          { text: `${Math.abs(x1 + w) * Math.abs(y1 + h)}` === `${area}` ? `${area + w}` : `${Math.abs(x1 + w) * Math.abs(y1 + h)}`, tag: 'CONCEPT' },
          { text: `${w + h}`, tag: 'CALCULATION' },
        ],
        (g) => `${area + g}`,
      ),
      hints: [
        '가로 길이는 x좌표의 차, 세로 길이는 y좌표의 차예요.',
        `가로: ${x1 + w} − (${x1}) = ${w}.`,
        `세로: ${y1 + h} − (${y1}) = ${h}. 넓이 = 가로 × 세로.`,
      ],
      idea: '좌표 도형의 길이 = 좌표의 차. 음수 좌표라도 "차"는 항상 양수 거리예요.',
      solve: `가로 ${w}, 세로 ${h} → 넓이 = ${w} × ${h} = ${area}.`,
      remember: '길이 = (큰 좌표) − (작은 좌표). 좌표 자체를 곱하면 함정!',
      estimatedSec: 75,
    };
  }
  if (level === 4) {
    const m = randInt(2, 5);
    const b = nonZero(-6, 6);
    const px = randInt(2, 8);
    const onCurve = Math.random() < 0.5;
    const py = onCurve ? m * px + b : m * px + b + nonZero(-4, 4);
    const candidates = [0, 1, 2, 3].map((i) => {
      const cx = px + i - 1;
      return `(${cx}, ${m * cx + b})`;
    });
    const answerText = onCurve ? `점 (${px}, ${py}) 는 규칙 위에 있다` : `점 (${px}, ${py}) 는 규칙 위에 없다`;
    return {
      stem: `어떤 규칙에 따라 점들이 찍힙니다: x좌표가 1씩 커질 때 y좌표는 ${m}씩 커지고, 점 (0, ${b}) 를 지납니다.\n점 (${px}, ${py}) 는 이 규칙 위의 점일까요?\n(참고: 규칙 위의 점들 예시 — ${candidates[0]}, ${candidates[1]})`,
      ...buildChoices(
        answerText,
        [
          { text: onCurve ? `점 (${px}, ${py}) 는 규칙 위에 없다` : `점 (${px}, ${py}) 는 규칙 위에 있다`, tag: 'CONCEPT' },
          { text: `x좌표만으로는 알 수 없다`, tag: 'CONCEPT' },
          { text: `y좌표가 짝수일 때만 규칙 위에 있다`, tag: 'GUESSING' },
        ],
        () => `점 (${px + 9}, ${py}) 는 규칙 위에 있다`,
      ),
      hints: [
        'x가 0에서 시작해 1씩 커질 때 y가 어떻게 변하는지 따라가 보세요.',
        `x = ${px} 일 때 규칙이 예상하는 y = ${b} + ${m} × ${px}.`,
        `예상 y = ${m * px + b}. 주어진 점의 y와 비교하면?`,
      ],
      idea: '규칙(그래프)에 점이 있는지 = 그 x에서 규칙이 주는 y와 점의 y가 일치하는지.',
      solve: `x = ${px} → 규칙의 y = ${b} + ${m}×${px} = ${m * px + b}. 주어진 y = ${py} → ${onCurve ? '일치하므로 규칙 위의 점' : '다르므로 규칙 위의 점이 아님'}.`,
      remember: '"점이 그래프 위에 있다" = 좌표를 대입하면 식이 성립한다.',
      estimatedSec: 90,
    };
  }
  // Level 5 — 부호 추론
  // Phase 2 PART 10: 진단 문형 다양화 — 반대 부호 조건에서 부호가 '확정'되는 표현식만 사용
  const aPos = pick([true, false]);
  const a = aPos ? randInt(1, 5) : -randInt(1, 5);
  const b = aPos ? -randInt(1, 5) : randInt(1, 5); // a와 b는 반대 부호
  const expr = pick([
    { label: '(a − b, a × b)', px: a - b, py: a * b },
    { label: '(b − a, a × b)', px: b - a, py: a * b },
    { label: '(a × b, a − b)', px: a * b, py: a - b },
    { label: '(a², a × b)', px: a * a, py: a * b },
  ] as const);
  const px = expr.px;
  const py = expr.py;
  const q = quadrantOf(px, py);
  return {
    stem: `a ${aPos ? '> 0' : '< 0'}, b ${aPos ? '< 0' : '> 0'} 일 때, 점 ${expr.label} 는 몇 사분면 위의 점일까요?`,
    ...buildChoices(
      QUADRANTS[q],
      [
        { text: QUADRANTS[(q + 2) % 4], tag: 'SIGN' },
        { text: QUADRANTS[(q + 1) % 4], tag: 'CONCEPT' },
        { text: '알 수 없다', tag: 'CONCEPT' },
      ],
      (g) => QUADRANTS[(q + g) % 4],
    ),
    hints: [
      '구체적인 수를 넣어 실험해보세요. 예: a = 2, b = −3.',
      `a − b: ${aPos ? '양수 − 음수 = 양수 + 양수 → 양수' : '음수 − 양수 → 음수'}.`,
      'a × b: 부호가 다른 두 수의 곱은 항상 음수예요.',
    ],
    idea: '문자만 있어도 부호는 확정할 수 있어요. 부호가 좌표평면의 위치를 결정!',
    solve: `x좌표는 ${px > 0 ? '양수' : '음수'}, y좌표는 ${py > 0 ? '양수' : '음수'} → (${px > 0 ? '+' : '−'}, ${py > 0 ? '+' : '−'}) → ${QUADRANTS[q]}.`,
    remember: '(양)−(음)=양, (음)−(양)=음, 다른 부호의 곱 = 음. 부호 규칙만으로 사분면 판정 가능.',
    estimatedSec: 100,
  };
}

export function transferFunCoord(level: Level): Draft {
  const x = randInt(2, 7);
  const y = randInt(2, 7);
  const moves = pick([
    { dx: randInt(1, 4), dy: -randInt(1, 4) },
    { dx: -randInt(1, 4), dy: randInt(1, 4) },
  ]);
  const nx = x + moves.dx;
  const ny = y + moves.dy;
  return {
    stem: `보물찾기 지도에서 출발점은 (${x}, ${y}) 입니다. 동쪽(+x)으로 ${Math.abs(moves.dx)}칸 ${moves.dx > 0 ? '이동' : '… 이 아니라 서쪽으로 ' + Math.abs(moves.dx) + '칸 이동'}하고, ${moves.dy > 0 ? '북쪽으로 ' + moves.dy + '칸' : '남쪽으로 ' + Math.abs(moves.dy) + '칸'} 이동했습니다. 보물의 좌표는?`,
    ...buildChoices(
      `(${nx}, ${ny})`,
      [
        { text: `(${x - moves.dx}, ${y - moves.dy})`, tag: 'SIGN' },
        { text: `(${ny}, ${nx})` === `(${nx}, ${ny})` ? `(${nx + 1}, ${ny})` : `(${ny}, ${nx})`, tag: 'INTERPRETATION' },
        { text: `(${nx}, ${y})`, tag: 'CALCULATION' },
      ],
      (g) => `(${nx + g}, ${ny})`,
    ),
    hints: [
      '동서 이동은 x좌표, 남북 이동은 y좌표를 바꿔요.',
      '서쪽·남쪽은 음의 방향이에요.',
      `x: ${x} ${moves.dx >= 0 ? '+' : '−'} ${Math.abs(moves.dx)}, y: ${y} ${moves.dy >= 0 ? '+' : '−'} ${Math.abs(moves.dy)}.`,
    ],
    idea: '좌표는 "위치를 숫자로 번역하는 언어" — 지도, 게임, 내비게이션의 원리예요.',
    solve: `(${x} ${moves.dx >= 0 ? '+' : '−'} ${Math.abs(moves.dx)}, ${y} ${moves.dy >= 0 ? '+' : '−'} ${Math.abs(moves.dy)}) = (${nx}, ${ny}).`,
    remember: '이동 = 좌표에 더하기. 방향이 음수인지 양수인지만 조심!',
    estimatedSec: 60 + level * 5,
  };
}

// =====================================================================
// M1.FUN.PROP — 정비례와 반비례
// =====================================================================
export function genFunProp(level: Level): Draft {
  if (level === 1) {
    const k = nonZero(-6, 6);
    const x0 = nonZero(-5, 5);
    const y0 = k * x0;
    return {
      stem: `y가 x에 정비례하고, x = ${x0} 일 때 y = ${y0} 입니다. 관계식 y = ax 의 a 값은?`,
      ...buildChoices(
        `a = ${k}`,
        [
          { text: `a = ${fracStr(simplifyFrac(x0, y0))}`, tag: 'FORMULA' },
          { text: `a = ${y0 - x0}`, tag: 'CONCEPT' },
          { text: `a = ${-k === k ? k + 1 : -k}`, tag: 'SIGN' },
        ],
        (g) => `a = ${k + (g % 2 ? g : -g)}`,
      ),
      hints: [
        'y = ax 에 주어진 x, y 값을 그대로 대입해보세요.',
        `${y0} = a × (${x0}) 이 돼요.`,
        `a = ${y0} ÷ (${x0}).`,
      ],
      idea: '정비례 상수 a는 "한 쌍의 (x, y)"만 알면 구할 수 있어요: a = y ÷ x.',
      solve: `${y0} = a × (${x0}) → a = ${y0} ÷ (${x0}) = ${k}.`,
      remember: 'a = y/x (x로 나누기). 거꾸로 나누면 함정 선택지!',
      estimatedSec: 45,
    };
  }
  if (level === 2) {
    const k = nonZero(-6, 6);
    const x0 = nonZero(-5, 5);
    const y0 = k * x0;
    const x1 = nonZero(-6, 6);
    const answer = k * x1;
    return {
      stem: `y가 x에 정비례하고, x = ${x0} 일 때 y = ${y0} 입니다. x = ${x1} 일 때 y 값은?`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${-answer === answer ? answer + 2 : -answer}`, tag: 'SIGN' },
          { text: `${y0 + (x1 - x0)}`, tag: 'CONCEPT' },
          { text: `${k}`, tag: 'INTERPRETATION' },
        ],
        (g) => `${answer + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '먼저 비례상수 a를 구해요: a = y ÷ x.',
        `a = ${y0} ÷ (${x0}) = ${k}. 이제 관계식은 y = ${k}x.`,
        `y = ${k} × (${x1}).`,
      ],
      idea: '정비례 문제 2단계: ① a 구하기 ② 새로운 x 대입.',
      solve: `a = ${k} → y = ${k}x → y = ${k} × (${x1}) = ${answer}.`,
      remember: '정비례에서 "x가 몇 배면 y도 같은 배수" — 검산에 활용하세요.',
      estimatedSec: 55,
    };
  }
  if (level === 3) {
    const k = pick([12, 18, 24, 36, 48, 60]);
    const x0 = pick([2, 3, 4, 6]);
    const y0 = k / x0;
    const x1 = pick([2, 3, 4, 6, 12].filter((v) => v !== x0 && Number.isInteger(k / v)));
    const answer = k / x1;
    return {
      stem: `y가 x에 반비례하고, x = ${x0} 일 때 y = ${y0} 입니다. x = ${x1} 일 때 y 값은?`,
      ...buildChoices(
        `${answer}`,
        [
          // 반비례를 y=ax(정비례)로 처리한 결과 — MIS.PROP.INV의 기계적 산물 (비충돌 시)
          { text: `${(y0 / x0) * x1}` === `${answer}` ? `${answer + 2}` : `${(y0 / x0) * x1}`, tag: 'CONCEPT', ...(`${(y0 / x0) * x1}` !== `${answer}` ? { misconceptionId: 'MIS.PROP.INV', diagnosticStrength: 'HIGH' as const } : {}) },
          { text: `${k}`, tag: 'INTERPRETATION' },
          { text: `${answer + x1}`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g}`,
      ),
      hints: [
        '반비례는 y = a/x 꼴이에요. 먼저 a를 구해요.',
        `a = x × y = ${x0} × ${y0} = ${k}.`,
        `y = ${k} ÷ ${x1}.`,
      ],
      idea: '반비례의 불변량은 "곱": x × y 가 항상 a로 일정해요.',
      solve: `a = ${x0} × ${y0} = ${k} → y = ${k}/x → y = ${k} ÷ ${x1} = ${answer}.`,
      remember: '정비례는 나눗셈(y/x)이 일정, 반비례는 곱(xy)이 일정.',
      estimatedSec: 65,
    };
  }
  if (level === 4) {
    const teethA = pick([24, 36, 48, 60]);
    const rotA = randInt(2, 6);
    const teethB = pick([8, 12].filter((t) => Number.isInteger((teethA * rotA) / t)));
    const answer = (teethA * rotA) / teethB;
    return {
      stem: `톱니가 ${teethA}개인 톱니바퀴 A가 ${rotA}바퀴 도는 동안, 맞물린 톱니가 ${teethB}개인 톱니바퀴 B는 몇 바퀴 돌까요?`,
      ...buildChoices(
        `${answer}바퀴`,
        [
          { text: `${(teethB * rotA) / teethA % 1 === 0 ? (teethB * rotA) / teethA : Math.round((teethB * rotA * 10) / teethA) / 10}바퀴`, tag: 'CONCEPT' },
          { text: `${rotA}바퀴`, tag: 'INTERPRETATION' },
          { text: `${answer + rotA}바퀴`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g}바퀴`,
      ),
      hints: [
        '맞물린 두 톱니바퀴가 "지나가는 톱니 수"는 서로 같아요.',
        `A가 지나간 톱니 수: ${teethA} × ${rotA} = ${teethA * rotA}개.`,
        `B의 회전수 = ${teethA * rotA} ÷ ${teethB}.`,
      ],
      idea: '톱니바퀴 = 반비례의 대표 상황. (톱니 수) × (회전수) = 일정.',
      solve: `${teethA} × ${rotA} = ${teethB} × (B의 회전수) → B = ${answer}바퀴.`,
      remember: '톱니가 적을수록 많이 돈다 — 반비례 감각으로 검산!',
      estimatedSec: 90,
    };
  }
  // Level 5 — 그래프 교점 복합
  const k = pick([2, 3, 4]);
  const px = randInt(2, 5);
  const py = k * px;
  const invA = px * py;
  return {
    stem: `정비례 그래프 y = ${k}x 와 반비례 그래프 y = a/x 가 점 P(${px}, ?) 에서 만납니다. a 값은?`,
    ...buildChoices(
      `a = ${invA}`,
      [
        { text: `a = ${py}`, tag: 'CONCEPT' },
        { text: `a = ${fracStr(simplifyFrac(py, px))}`, tag: 'FORMULA' },
        { text: `a = ${px + py}`, tag: 'CALCULATION' },
      ],
      (g) => `a = ${invA + g}`,
    ),
    hints: [
      '먼저 점 P의 y좌표를 정비례 식으로 구해요.',
      `y = ${k} × ${px} = ${py} → P(${px}, ${py}).`,
      `P가 반비례 그래프에도 있으므로 a = x × y.`,
    ],
    idea: '"두 그래프가 만난다" = 그 점이 두 식을 동시에 만족한다.',
    solve: `P의 y = ${k}×${px} = ${py}. 반비례: a = ${px} × ${py} = ${invA}.`,
    remember: '교점 문제는 "한 식으로 좌표 완성 → 다른 식에 대입" 2단계.',
    estimatedSec: 100,
  };
}

export function transferFunProp(level: Level): Draft {
  const kind = pick(['recipe', 'faucet'] as const);
  if (kind === 'recipe') {
    const per = randInt(2, 5) * 50; // 1인분당 밀가루(g)
    const servings = pick([2, 4]);
    const target = servings * pick([2, 3]);
    const answer = per * target;
    return {
      stem: `쿠키 ${servings}인분을 만드는 데 밀가루 ${per * servings}g이 필요합니다. 같은 조리법으로 ${target}인분을 만들려면 밀가루가 몇 g 필요할까요?`,
      ...buildChoices(
        `${answer}g`,
        [
          { text: `${per * servings + target}g`, tag: 'CONCEPT' },
          { text: `${per * servings}g`, tag: 'INTERPRETATION' },
          { text: `${answer + 50}g`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g * 10}g`,
      ),
      hints: [
        '인분 수와 밀가루 양은 정비례해요.',
        `1인분에 필요한 밀가루: ${per * servings} ÷ ${servings} = ${per}g.`,
        `${per}g × ${target}인분 = ?`,
      ],
      idea: '요리 배율 = 정비례의 일상 버전. "1단위당 양"을 먼저 구하면 만능이에요.',
      solve: `1인분 = ${per * servings} ÷ ${servings} = ${per}g → ${target}인분 = ${per} × ${target} = ${answer}g.`,
      remember: '비례 문제의 만능키: 단위량(1인분·1개당)을 먼저 구한다.',
      estimatedSec: 70 + level * 5,
    };
  }
  const total = pick([24, 36, 48, 60]);
  const f1 = pick([2, 3, 4]);
  const t1 = total / f1;
  const f2 = pick([2, 3, 4, 6].filter((f) => f !== f1 && Number.isInteger(total / f)));
  const answer = total / f2;
  return {
    stem: `수조에 물을 가득 채우는 데 수도꼭지 ${f1}개로는 ${t1}분이 걸립니다. 같은 수도꼭지 ${f2}개를 틀면 몇 분 만에 가득 찰까요?`,
    ...buildChoices(
      `${answer}분`,
      [
        { text: `${(t1 * f2) / f1 % 1 === 0 ? (t1 * f2) / f1 : t1 + f2}분`, tag: 'CONCEPT' },
        { text: `${t1}분`, tag: 'INTERPRETATION' },
        { text: `${answer + 2}분`, tag: 'CALCULATION' },
      ],
      (g) => `${answer + g}분`,
    ),
    hints: [
      '수도꼭지가 많을수록 시간이 줄어드는 관계 — 정비례일까요, 반비례일까요?',
      `(꼭지 수) × (시간) = 일정. ${f1} × ${t1} = ${total}.`,
      `${f2} × (시간) = ${total} → 시간 = ?`,
    ],
    idea: '일을 나눠 하면 시간이 반비례로 줄어요. 불변량은 "전체 일의 양".',
    solve: `${f1} × ${t1} = ${total} = ${f2} × t → t = ${answer}분.`,
    remember: '"~개가 많아지면 시간이 줄어든다" → 반비례. 곱이 일정!',
    estimatedSec: 90,
  };
}

// =====================================================================
// M1.GEO.BASIC — 기본 도형과 각
// =====================================================================
export function genGeoBasic(level: Level): Draft {
  if (level === 1) {
    const a = randInt(25, 155);
    const answer = 180 - a;
    return {
      stem: `한 직선 위에서 이웃한 두 각의 크기가 ${a}°와 x°일 때, x 값은?`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${a}`, tag: 'CONCEPT' },
          { text: `${90 - a > 0 ? 90 - a : 360 - a}`, tag: 'FORMULA' },
          { text: `${answer + 10}`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g}`,
      ),
      hints: [
        '일직선이 만드는 각(평각)의 크기를 떠올려보세요.',
        '평각은 180°예요.',
        `x = 180 − ${a}.`,
      ],
      idea: '직선 = 평각 180°. 이웃한 각들의 합으로 미지의 각을 찾아요.',
      solve: `x = 180 − ${a} = ${answer}.`,
      remember: '평각 180°, 직각 90°, 한 바퀴 360° — 각의 3대 기준값.',
      estimatedSec: 30,
    };
  }
  if (level === 2) {
    const a = randInt(20, 70);
    const answer = 90 - a;
    return {
      stem: `그림에서 두 직선이 수직으로 만나고, 한 각이 ${a}°일 때 나머지 각 x°는? (x + ${a}° = 직각)`,
      ...buildChoices(
        `${answer}`,
        [
          { text: `${180 - a}`, tag: 'CONCEPT' },
          { text: `${a}`, tag: 'CONCEPT' },
          { text: `${answer + 5}`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g}`,
      ),
      hints: [
        '수직으로 만나면 이루는 각은 90°예요.',
        `x + ${a} = 90.`,
        `x = 90 − ${a}.`,
      ],
      idea: '직각(90°)을 쪼개는 문제 — 평각(180°)과 헷갈리지 않기.',
      solve: `x = 90 − ${a} = ${answer}.`,
      remember: '수직 = 90°. "직선 위" = 180°. 조건을 정확히 읽는 것이 반!',
      estimatedSec: 40,
    };
  }
  if (level === 3) {
    const a = randInt(35, 145);
    const rel = pick(['동위각', '엇각', '동측내각'] as const);
    const answer = rel === '동측내각' ? 180 - a : a;
    return {
      stem: `평행한 두 직선이 한 직선과 만납니다. 한 각이 ${a}°일 때, 그 각의 ${rel}의 크기는?`,
      ...buildChoices(
        `${answer}°`,
        [
          // 동측내각에 '같다'를, 동위각·엇각에 '합180°'를 적용한 결과 — MIS.GEO.PARCON (a=90° 충돌 제외)
          { text: `${rel === '동측내각' ? a : 180 - a}°`, tag: 'CONCEPT', ...(a !== 90 ? { misconceptionId: 'MIS.GEO.PARCON', diagnosticStrength: 'HIGH' as const } : {}) },
          { text: `${90 - a > 0 ? 90 - a : a - 90}°`, tag: 'FORMULA' },
          { text: `${answer + 15}°`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g}°`,
      ),
      hints: [
        '평행선에서 동위각·엇각은 크기가 같아요.',
        '동측내각은 합이 180°예요.',
        rel === '동측내각' ? `180 − ${a} = ?` : `${rel}은 주어진 각과 같아요.`,
      ],
      idea: '평행선 각 관계 3종: 동위각 = , 엇각 = , 동측내각 합 180°.',
      solve: rel === '동측내각' ? `동측내각의 합 = 180° → 180 − ${a} = ${answer}°.` : `평행선에서 ${rel}은 서로 같으므로 ${answer}°.`,
      remember: 'Z자(엇각), F자(동위각), C자(동측내각) 모양으로 기억해요.',
      estimatedSec: 60,
    };
  }
  if (level === 4) {
    const n = randInt(5, 12);
    const which = pick(['sum', 'regular'] as const);
    if (which === 'sum') {
      const answer = 180 * (n - 2);
      return {
        stem: `${n}각형의 내각의 크기의 합은?`,
        ...buildChoices(
          `${answer}°`,
          [
            // 내각합 = n×180°로 계산한 결과 그 자체 — MIS.GEO.POLYN
            { text: `${180 * n}°`, tag: 'FORMULA', misconceptionId: 'MIS.GEO.POLYN', diagnosticStrength: 'HIGH' },
            { text: `${180 * (n - 1)}°`, tag: 'CALCULATION' },
            { text: `${360}°`, tag: 'CONCEPT' },
          ],
          (g) => `${answer + g * 180}°`,
        ),
        hints: [
          '다각형을 한 꼭짓점에서 대각선으로 나누면 삼각형 몇 개가 생길까요?',
          `${n}각형은 삼각형 ${n - 2}개로 나뉘어요.`,
          `180° × ${n - 2} = ?`,
        ],
        idea: '내각의 합 공식은 암기가 아니라 "삼각형으로 쪼개기"에서 나와요.',
        solve: `180° × (${n} − 2) = 180 × ${n - 2} = ${answer}°.`,
        remember: 'n각형 내각의 합 = 180°×(n−2). 외각의 합은 항상 360°!',
        estimatedSec: 60,
      };
    }
    const answer = (180 * (n - 2)) / n;
    const answerText = Number.isInteger(answer) ? `${answer}°` : `${Math.round(answer * 10) / 10}°`;
    return {
      stem: `정${n}각형의 한 내각의 크기는?`,
      ...buildChoices(
        answerText,
        [
          { text: `${Math.round((360 / n) * 10) / 10}°`, tag: 'FORMULA' },
          { text: `${180 * (n - 2)}°`, tag: 'INTERPRETATION' },
          { text: `${Number.isInteger(answer) ? answer + 5 : Math.round((answer + 5) * 10) / 10}°`, tag: 'CALCULATION' },
        ],
        (g) => `${Number.isInteger(answer) ? answer + g : Math.round((answer + g) * 10) / 10}°`,
      ),
      hints: [
        '먼저 내각의 "합"을 구한 뒤, 꼭짓점 수로 나눠요.',
        `내각의 합 = 180 × (${n} − 2) = ${180 * (n - 2)}°.`,
        `정다각형이므로 모든 내각이 같아요: ${180 * (n - 2)} ÷ ${n}.`,
      ],
      idea: '정다각형: 내각의 합 ÷ n. "한 외각 = 360/n"과 헷갈리지 않기.',
      solve: `180 × (${n} − 2) ÷ ${n} = ${180 * (n - 2)} ÷ ${n} = ${answerText}.`,
      remember: '한 내각 = 180(n−2)/n, 한 외각 = 360/n. 둘의 합은 180°.',
      estimatedSec: 75,
    };
  }
  // Level 5 — 외각 정리 복합
  const a = randInt(30, 70);
  const b = randInt(30, 70);
  const answer = a + b;
  return {
    stem: `삼각형 ABC에서 ∠A = ${a}°, ∠B = ${b}° 입니다. 꼭짓점 C에서 변 BC의 연장선이 만드는 외각 ∠ACD의 크기는?`,
    ...buildChoices(
      `${answer}°`,
      [
        { text: `${180 - a - b}°`, tag: 'CONCEPT' },
        { text: `${180 - a}°`, tag: 'CALCULATION' },
        { text: `${answer + 10}°`, tag: 'CALCULATION' },
      ],
      (g) => `${answer + g}°`,
    ),
    hints: [
      '삼각형의 외각은 "이웃하지 않는 두 내각"과 관계가 있어요.',
      '외각 = 나머지 두 내각의 합 (외각 정리).',
      `∠ACD = ∠A + ∠B = ${a} + ${b}.`,
    ],
    idea: '외각 정리: 한 외각 = 이웃하지 않는 두 내각의 합. (180 빼기 두 번을 한 번에!)',
    solve: `∠C = 180 − ${a} − ${b} = ${180 - a - b}°, 외각 = 180 − ${180 - a - b} = ${answer}°. 또는 바로 ${a} + ${b} = ${answer}°.`,
    remember: '외각 정리를 쓰면 계산이 한 단계로 줄어요. 상위권의 무기!',
    estimatedSec: 90,
  };
}

export function transferGeoBasic(level: Level): Draft {
  const kind = pick(['clock', 'ladder'] as const);
  if (kind === 'clock') {
    const h = pick([1, 2, 3, 4, 5]);
    const answer = h * 30;
    return {
      stem: `시계가 정확히 ${h}시를 가리킬 때, 시침과 분침이 이루는 작은 쪽 각의 크기는?`,
      ...buildChoices(
        `${answer}°`,
        [
          { text: `${h * 15}°`, tag: 'CONCEPT' },
          { text: `${h * 6}°`, tag: 'FORMULA' },
          { text: `${answer + 15}°`, tag: 'CALCULATION' },
        ],
        (g) => `${answer + g * 5}°`,
      ),
      hints: [
        '시계 한 바퀴는 360°이고 숫자는 12개예요.',
        '숫자 한 칸 사이의 각 = 360 ÷ 12 = 30°.',
        `${h}시 정각이면 시침과 분침 사이는 ${h}칸.`,
      ],
      idea: '시계는 "360°를 12등분한 각도 문제" — 도형 감각의 일상 응용이에요.',
      solve: `한 칸 = 30° → ${h}칸 = 30 × ${h} = ${answer}°.`,
      remember: '시계 숫자 한 칸 = 30°. (분침은 1분에 6°)',
      estimatedSec: 60 + level * 5,
    };
  }
  const roadA = randInt(35, 75);
  return {
    stem: `평행한 두 도로 사이를 가로지르는 길이 있습니다. 길이 아래쪽 도로와 이루는 각이 ${roadA}°일 때, 위쪽 도로와 이루는 엇각 위치의 각은?`,
    ...buildChoices(
      `${roadA}°`,
      [
        { text: `${180 - roadA}°`, tag: 'CONCEPT' },
        { text: `${90 - roadA > 0 ? 90 - roadA : roadA - 30}°`, tag: 'FORMULA' },
        { text: `${roadA + 10}°`, tag: 'CALCULATION' },
      ],
      (g) => `${roadA + g * 5}°`,
    ),
    hints: [
      '평행한 두 도로 = 평행선, 가로지르는 길 = 한 직선.',
      '엇각의 위치는 Z자 모양이에요.',
      '평행선에서 엇각은 서로 같아요.',
    ],
    idea: '교실 밖 평행선: 도로, 철길, 책꽂이 — 어디서든 엇각·동위각을 찾을 수 있어요.',
    solve: `평행선에서 엇각은 같으므로 ${roadA}°.`,
    remember: '실생활 도형 문제 = 먼저 "어디가 평행선이고 어디가 가로지르는 직선인지" 찾기.',
    estimatedSec: 70 + level * 5,
  };
}

// =====================================================================
// M1.STA.DATA — 자료의 정리와 해석
// =====================================================================
export function genStaData(level: Level): Draft {
  if (level === 1) {
    const m = randInt(10, 40);
    const d1 = nonZero(-6, 6);
    const d2 = nonZero(-6, 6);
    const d3 = nonZero(-6, 6);
    const d4 = nonZero(-6, 6);
    const d5 = -(d1 + d2 + d3 + d4);
    const values = [m + d1, m + d2, m + d3, m + d4, m + d5];
    return {
      stem: `다음 자료의 평균을 구하세요.\n${values.join(', ')}`,
      ...buildChoices(
        `${m}`,
        [
          { text: `${values[0]}`, tag: 'CONCEPT' },
          { text: `${Math.max(...values)}`, tag: 'CONCEPT' },
          { text: `${m + 1}`, tag: 'CALCULATION' },
        ],
        (g) => `${m + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '평균 = (모든 자료의 합) ÷ (자료의 개수).',
        `자료가 ${values.length}개이니 합을 ${values.length}로 나눠요.`,
        `합 = ${values.reduce((a, b) => a + b, 0)}.`,
      ],
      idea: '평균은 "고르게 나눠 갖기" — 전체를 모아 똑같이 나누는 값이에요.',
      solve: `(${values.join(' + ')}) ÷ ${values.length} = ${values.reduce((a, b) => a + b, 0)} ÷ ${values.length} = ${m}.`,
      remember: '평균 공식과 함께 "평균 × 개수 = 총합"도 기억하세요.',
      estimatedSec: 50,
    };
  }
  if (level === 2) {
    const m = randInt(10, 40);
    const known = [1, 2, 3].map(() => m + nonZero(-6, 6));
    const x = m * 4 - known.reduce((a, b) => a + b, 0);
    return {
      stem: `네 수 ${known[0]}, ${known[1]}, ${known[2]}, x 의 평균이 ${m}일 때, x 값은?`,
      ...buildChoices(
        `${x}`,
        [
          { text: `${m}`, tag: 'CONCEPT' },
          // 총합을 평균×(아는 수 개수 3)으로 계산한 결과 — MIS.AVG.COUNT의 기계적 산물 (비충돌 시)
          { text: `${m * 3 - known.reduce((s, v) => s + v, 0) !== x ? m * 3 - known.reduce((s, v) => s + v, 0) : x + 4}`, tag: 'CALCULATION', ...(m * 3 - known.reduce((s, v) => s + v, 0) !== x ? { misconceptionId: 'MIS.AVG.COUNT', diagnosticStrength: 'HIGH' as const } : {}) },
          { text: `${m * 4}`, tag: 'INTERPRETATION' },
        ],
        (g) => `${x + (g % 2 ? g : -g)}`,
      ),
      hints: [
        '평균에서 거꾸로 총합을 구할 수 있어요.',
        `총합 = 평균 × 개수 = ${m} × 4 = ${m * 4}.`,
        `x = ${m * 4} − (${known.join(' + ')}).`,
      ],
      idea: '평균의 역산: "평균 × 개수 = 총합"을 이용해 빠진 값을 찾아요.',
      solve: `총합 = ${m * 4}, 아는 수의 합 = ${known.reduce((a, b) => a + b, 0)} → x = ${x}.`,
      remember: '평균 문제의 절반은 "총합으로 되돌리기"에서 풀려요.',
      estimatedSec: 60,
    };
  }
  if (level === 3) {
    const total = pick([20, 25, 40, 50]);
    const f = pick([4, 5, 8, 10].filter((v) => v < total));
    const answer = f / total;
    return {
      stem: `채림이네 반 학생 ${total}명의 통학 시간을 조사했더니, 20분 이상 30분 미만인 학생이 ${f}명이었습니다. 이 계급의 상대도수는?`,
      ...buildChoices(
        `${answer}`,
        [
          // 전체÷도수로 뒤집어 계산한 결과 그 자체 — MIS.REL.FLIP
          { text: `${fracStr(simplifyFrac(total, f))}`, tag: 'FORMULA', misconceptionId: 'MIS.REL.FLIP', diagnosticStrength: 'HIGH' },
          { text: `${f}`, tag: 'CONCEPT' },
          { text: `${Math.round((answer + 0.1) * 100) / 100}`, tag: 'CALCULATION' },
        ],
        (g) => `${Math.round((answer + g * 0.05) * 100) / 100}`,
      ),
      hints: [
        '상대도수 = (그 계급의 도수) ÷ (전체 도수).',
        `${f} ÷ ${total} 을 계산해요.`,
        '소수로 나타내보세요.',
      ],
      idea: '상대도수는 "전체에서 차지하는 비율" — 반 인원이 달라도 비교할 수 있게 해줘요.',
      solve: `${f} ÷ ${total} = ${answer}.`,
      remember: '상대도수의 총합은 항상 1. 계산 후 합이 1인지로 검산!',
      estimatedSec: 60,
    };
  }
  if (level === 4) {
    const mids = [5, 15, 25, 35];
    const f1 = randInt(2, 6);
    const f2 = randInt(3, 8);
    const f3 = randInt(3, 8);
    const f4 = randInt(1, 5);
    const total = f1 + f2 + f3 + f4;
    const sum = mids[0] * f1 + mids[1] * f2 + mids[2] * f3 + mids[3] * f4;
    const answer = Math.round((sum / total) * 10) / 10;
    return {
      stem: `도수분포표에서 평균을 구하세요.\n계급(분): 0~10 / 10~20 / 20~30 / 30~40\n도수(명):  ${f1} / ${f2} / ${f3} / ${f4}\n(각 계급은 계급값 — 5, 15, 25, 35 — 로 대표합니다)`,
      ...buildChoices(
        `${answer}분`,
        [
          { text: `${Math.round((sum / 4) * 10) / 10}분`, tag: 'CONCEPT' },
          { text: `${Math.round(((f1 + f2 + f3 + f4) / 4) * 10) / 10}분`, tag: 'CONCEPT' },
          { text: `${Math.round((answer + 2) * 10) / 10}분`, tag: 'CALCULATION' },
        ],
        (g) => `${Math.round((answer + g) * 10) / 10}분`,
      ),
      hints: [
        '도수분포표의 평균 = (계급값 × 도수)의 총합 ÷ 전체 도수.',
        `(5×${f1}) + (15×${f2}) + (25×${f3}) + (35×${f4}) 를 계산해요.`,
        `총합 ${sum}을 전체 도수 ${total}으로 나눠요.`,
      ],
      idea: '표로 묶인 자료는 "계급값이 그 계급을 대표한다"고 보고 평균을 내요.',
      solve: `(5×${f1} + 15×${f2} + 25×${f3} + 35×${f4}) ÷ ${total} = ${sum} ÷ ${total} ≈ ${answer}분.`,
      remember: '나누는 수는 계급의 수(4)가 아니라 전체 도수(학생 수)!',
      estimatedSec: 110,
    };
  }
  // Level 5 — 평균 변화 추론
  const n = pick([4, 5]);
  const avg = randInt(70, 85);
  const delta = pick([2, 3]);
  const newAvg = avg + delta;
  const newcomer = newAvg * (n + 1) - avg * n; // = avg + delta*(n+1)
  return {
    stem: `${n}명의 시험 점수 평균이 ${avg}점이었습니다. 학생 1명이 더 들어와 ${n + 1}명의 평균이 ${newAvg}점이 되었다면, 새로 들어온 학생의 점수는?`,
    ...buildChoices(
      `${newcomer}점`,
      [
        { text: `${newAvg}점`, tag: 'CONCEPT' },
        { text: `${avg + delta * n}점`, tag: 'CALCULATION' },
        { text: `${newAvg + delta}점`, tag: 'GUESSING' },
      ],
      (g) => `${newcomer + g}점`,
    ),
    hints: [
      '두 시점의 "총합"을 각각 구해 비교해요.',
      `처음 총합 = ${avg} × ${n} = ${avg * n}. 나중 총합 = ${newAvg} × ${n + 1} = ${newAvg * (n + 1)}.`,
      '새 학생 점수 = 나중 총합 − 처음 총합.',
    ],
    idea: '평균이 오르려면 새 값이 평균보다 "충분히 높아야" 해요 — 총합으로 확인!',
    solve: `${newAvg * (n + 1)} − ${avg * n} = ${newcomer}점.`,
    remember: '평균 변화 문제 = 무조건 총합으로 변환해서 비교.',
    estimatedSec: 120,
  };
}

export function transferStaData(level: Level): Draft {
  const n = pick([4, 5]);
  const target = randInt(80, 90);
  const scores = Array.from({ length: n - 1 }, () => target + nonZero(-8, 5));
  const needed = target * n - scores.reduce((a, b) => a + b, 0);
  return {
    stem: `채림이는 이번 학기 수행평가 ${n}회의 평균을 ${target}점 이상으로 만들고 싶습니다. 지금까지 ${n - 1}회 점수가 ${scores.join('점, ')}점이라면, 마지막 시험에서 최소 몇 점을 받아야 할까요?`,
    ...buildChoices(
      `${needed}점`,
      [
        { text: `${target}점`, tag: 'CONCEPT' },
        { text: `${needed - 5}점`, tag: 'CALCULATION' },
        { text: `${target + 5}점`, tag: 'GUESSING' },
      ],
      (g) => `${needed + g}점`,
    ),
    hints: [
      '목표 평균을 총합으로 바꿔보세요.',
      `필요한 총합 = ${target} × ${n} = ${target * n}점.`,
      `지금까지의 합 ${scores.reduce((a, b) => a + b, 0)}점을 빼면?`,
    ],
    idea: '"평균 목표" 문제는 내 성적 관리에 바로 쓰는 수학이에요.',
    solve: `${target * n} − ${scores.reduce((a, b) => a + b, 0)} = ${needed}점.`,
    remember: '목표 평균 × 횟수 − 지금까지 합 = 필요한 점수.',
    estimatedSec: 80 + level * 5,
  };
}
