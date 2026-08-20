// CHLOE MATH 2.1 — Phase 1 pilot Knowledge Graph (10 micro-skills, PART C-3).
// Deliberately built with a chain of depth 3-4 (EQ.03 -> EQ.02 -> FRAC.01 -> SIGN.01)
// so multi-level prerequisite tracing (QA 2) has somewhere real to descend to.
import { CURRICULUM_VERSION } from './config21.ts';

export interface MicroLesson {
  idea: string;
  why: string;
  example: string;
  try_: string;
}

// Phase 2 PART 11 — 의미 있는 전제 엣지: 강도 + 근거를 명시한다.
//   REQUIRED             이 전제 없이는 이 스킬을 정상 수행할 수 없음 (진단 하강 대상)
//   STRONGLY_SUPPORTIVE  결손 시 자주 발목을 잡음 (진단 하강 대상)
//   SUPPORTIVE           도움이 되지만 우회 가능 (하강 대상 아님 — 광역 조사 방지)
export type EdgeStrength = 'REQUIRED' | 'STRONGLY_SUPPORTIVE' | 'SUPPORTIVE';
export interface PrerequisiteEdge {
  from: string;
  strength: EdgeStrength;
  rationale: string;
}

export interface MicroSkillDef {
  skillId: string;
  nameKo: string;
  unit: string; // v1 unit id, for UI grouping later
  grade: 'M1';
  domain: 'NUM' | 'ALG' | 'FUN' | 'GEO' | 'STA';
  prerequisites: string[]; // 파일럿 10개의 원형 유지 (Phase 1 동결). 신규 스킬은 edges에서 파생.
  // Phase 2: типed 전제 엣지 — prerequisites보다 우선. 없으면 prerequisites를 REQUIRED로 간주.
  prereqEdges?: PrerequisiteEdge[];
  importance: number; // curriculum importance weight, default 1.0
  microLesson: MicroLesson;
  // problem adapter mapping (PART A: reuse existing generator + validated bank)
  problemSource: { generatorSkillId: string; baseV1Level: number; levelWindow?: [number, number] };
  // secondary skills this skill's problems also lightly exercise (PART F multi-skill tagging)
  secondarySkillIds?: string[];
}

export const MICRO_SKILLS: MicroSkillDef[] = [
  {
    skillId: 'M1.NUM.SIGN.01',
    nameKo: '부호 있는 수의 덧셈·뺄셈',
    unit: 'M1.NUM.INT',
    grade: 'M1',
    domain: 'NUM',
    prerequisites: [],
    importance: 1.2,
    microLesson: {
      idea: '음수는 수직선에서 0보다 왼쪽에 있는 수예요.',
      why: '더하기는 오른쪽 이동, 빼기는 왼쪽 이동으로 생각하면 부호가 헷갈리지 않아요.',
      example: '(-3) + 5 = 2 → -3에서 오른쪽으로 5칸',
      try_: '(-4) + 7 = ?',
    },
    problemSource: { generatorSkillId: 'M1.NUM.INT', baseV1Level: 1, levelWindow: [1, 1] },
  },
  {
    skillId: 'M1.NUM.SIGN.02',
    nameKo: '곱셈·나눗셈·거듭제곱의 부호',
    unit: 'M1.NUM.INT',
    grade: 'M1',
    domain: 'NUM',
    prerequisites: ['M1.NUM.SIGN.01'],
    importance: 1.2,
    microLesson: {
      idea: '음수가 짝수 번 곱해지면 +, 홀수 번 곱해지면 −예요.',
      why: '−3×(−3)=9 이지만 −3²=−(3×3)=−9 — 부호와 거듭제곱 표기의 순서가 다르기 때문이에요.',
      example: '(-2)³ = -8, (-2)² = 4, -2² = -4',
      try_: '(-3) × (-2) = ?',
    },
    problemSource: { generatorSkillId: 'M1.NUM.INT', baseV1Level: 2, levelWindow: [2, 2] },
  },
  {
    skillId: 'M1.NUM.FRAC.01',
    nameKo: '분수의 사칙연산',
    unit: 'M1.NUM.INT',
    grade: 'M1',
    domain: 'NUM',
    prerequisites: ['M1.NUM.SIGN.01'],
    importance: 1.0,
    microLesson: {
      idea: '분수의 덧셈·뺄셈은 분모를 같게(통분) 만든 뒤 분자끼리만 계산해요.',
      why: '분모가 다르면 "단위"가 달라서 바로 더할 수 없어요.',
      example: '1/2 + 1/3 = 3/6 + 2/6 = 5/6',
      try_: '1/4 + 1/2 = ?',
    },
    problemSource: { generatorSkillId: 'M1.NUM.INT', baseV1Level: 3, levelWindow: [3, 3] },
  },
  {
    skillId: 'M1.ALG.EXP.01',
    nameKo: '문자식과 동류항',
    unit: 'M1.ALG.EXP',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.NUM.SIGN.01'],
    importance: 1.1,
    microLesson: {
      idea: '동류항은 문자 부분이 완전히 같은 항이에요.',
      why: '사과와 배를 더할 수 없듯, x항과 상수항은 따로 계산해요.',
      example: '3x + 5 - x + 2 = 2x + 7',
      try_: '4x - 2x + 3 = ?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EXP', baseV1Level: 2, levelWindow: [2, 2] },
  },
  {
    skillId: 'M1.ALG.EXP.02',
    nameKo: '분배법칙과 전개',
    unit: 'M1.ALG.EXP',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.ALG.EXP.01', 'M1.NUM.SIGN.02'],
    importance: 1.1,
    microLesson: {
      idea: '괄호 앞의 수는 괄호 안 "모든" 항에 곱해요.',
      why: '하나만 곱하고 멈추면 항이 사라져요 — 이것이 최다 오답 원인이에요.',
      example: '2(x - 3) = 2x - 6',
      try_: '3(x + 4) = ?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EXP', baseV1Level: 3, levelWindow: [3, 3] },
  },
  {
    skillId: 'M1.ALG.EQ.01',
    nameKo: '일차방정식 기본 풀이',
    unit: 'M1.ALG.EQ',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.ALG.EXP.01', 'M1.NUM.SIGN.01'],
    importance: 1.2,
    microLesson: {
      idea: '방정식은 양팔저울이에요 — 양쪽에 같은 일을 하면 균형이 유지돼요.',
      why: '이항하면 부호가 바뀌는 이유는 사실 "양변에 같은 수를 더하거나 뺐기" 때문이에요.',
      example: 'x + 3 = 7 → x = 4',
      try_: 'x - 2 = 5 → x = ?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EQ', baseV1Level: 1, levelWindow: [1, 1] },
  },
  {
    skillId: 'M1.ALG.EQ.02',
    nameKo: '괄호가 있는 방정식',
    unit: 'M1.ALG.EQ',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.ALG.EQ.01', 'M1.ALG.EXP.02', 'M1.NUM.FRAC.01'],
    importance: 1.0,
    microLesson: {
      idea: '괄호가 있으면 먼저 분배법칙으로 풀고 나서 이항해요.',
      why: '순서를 지키지 않으면 분배가 덜 된 채로 계산해 오답이 나와요.',
      example: '2(x+1) = 8 → 2x+2=8 → x=3',
      try_: '3(x-1) = 12 → x = ?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EQ', baseV1Level: 4, levelWindow: [4, 4] },
    secondarySkillIds: ['M1.NUM.FRAC.01'],
  },
  {
    skillId: 'M1.ALG.EQ.03',
    nameKo: '일차방정식 활용(문장제)',
    unit: 'M1.ALG.EQ',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.ALG.EQ.01', 'M1.ALG.EQ.02', 'M1.ALG.EXP.01'],
    importance: 1.3,
    microLesson: {
      idea: '문장을 그대로 식으로 옮기는 것이 핵심이에요 — 모르는 것을 x로 놓기.',
      why: '"~보다 3 많다"=+3, "~의 2배"=×2 처럼 번역 규칙이 있어요.',
      example: '어떤 수의 2배보다 3이 크면 11이다 → 2x+3=11 → x=4',
      try_: '어떤 수에 5를 더하면 12일 때 그 수는?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EQ', baseV1Level: 5, levelWindow: [5, 5] },
    secondarySkillIds: ['M1.ALG.EXP.01'],
  },
  {
    skillId: 'M1.FUN.COORD.01',
    nameKo: '좌표평면',
    unit: 'M1.FUN.COORD',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.NUM.SIGN.01'],
    importance: 0.9,
    microLesson: {
      idea: '순서쌍 (x, y)는 가로 x, 세로 y 순서예요.',
      why: '사분면은 x, y의 부호 조합으로 결정돼요.',
      example: '(2, -3)은 x>0, y<0 → 제4사분면',
      try_: '(-1, 4)는 몇 사분면일까?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.COORD', baseV1Level: 1, levelWindow: [1, 1] },
  },
  {
    skillId: 'M1.FUN.COORD.02',
    nameKo: '그래프 위의 점과 규칙',
    unit: 'M1.FUN.COORD',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.FUN.COORD.01', 'M1.ALG.EXP.01'],
    importance: 0.9,
    microLesson: {
      idea: '점이 규칙(그래프) 위에 있다 = 그 x를 규칙에 넣으면 y가 나온다.',
      why: '규칙을 식으로 세우고 좌표를 대입해 확인하는 것이 그래프 읽기의 본질이에요.',
      example: 'y=2x+1 규칙에서 x=3 → y=7. 점(3,7)은 규칙 위에 있음',
      try_: 'y=x+2 규칙에서 점(2,5)는 규칙 위에 있을까?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.COORD', baseV1Level: 4, levelWindow: [4, 4] },
  },

  // ==========================================================================
  // Phase 2 PART 9 — 중1 전체 확장 (신규 25 micro-skill).
  // 파일럿 10개는 위에서 무변경 보존(Phase 1 회귀 동결). 신규 스킬은 levelWindow로
  // v1 레벨 대역을 주제 순수하게 고정하고, prereqEdges로 강도·근거를 명시한다.
  // ==========================================================================

  // ---- NUM 확장 ----
  {
    skillId: 'M1.NUM.POW.01',
    nameKo: '거듭제곱과 혼합계산',
    unit: 'M1.NUM.INT',
    grade: 'M1',
    domain: 'NUM',
    prerequisites: ['M1.NUM.SIGN.02'],
    prereqEdges: [{ from: 'M1.NUM.SIGN.02', strength: 'REQUIRED', rationale: '(−a)ⁿ의 부호 판정은 곱셈 부호 규칙의 반복 적용이다' }],
    importance: 1.1,
    microLesson: {
      idea: '거듭제곱을 가장 먼저, 그다음 곱·나눗셈, 마지막에 덧·뺄셈이에요.',
      why: '연산 순서를 지키지 않으면 같은 식에서 다른 답이 나와요.',
      example: '(−2)² − 2×4 = 4 − 8 = −4',
      try_: '(−3)² − 2 × (−1) = ?',
    },
    problemSource: { generatorSkillId: 'M1.NUM.INT', baseV1Level: 4, levelWindow: [4, 4] },
  },
  {
    skillId: 'M1.NUM.ABS.01',
    nameKo: '절댓값과 종합 계산',
    unit: 'M1.NUM.INT',
    grade: 'M1',
    domain: 'NUM',
    prerequisites: ['M1.NUM.SIGN.01', 'M1.NUM.POW.01'],
    prereqEdges: [
      { from: 'M1.NUM.SIGN.01', strength: 'REQUIRED', rationale: '절댓값을 벗긴 뒤의 계산은 전부 부호 덧뺄셈이다' },
      { from: 'M1.NUM.POW.01', strength: 'STRONGLY_SUPPORTIVE', rationale: '종합 계산엔 연산 순서 감각이 함께 쓰인다' },
    ],
    importance: 0.9,
    microLesson: {
      idea: '절댓값은 "0에서의 거리" — 벗기는 순간 부호를 다시 판단해요.',
      why: '|a−b|는 a−b의 결과 부호에 따라 값이 달라져요.',
      example: '|−8−(−5)| = |−3| = 3',
      try_: '|−4+1| × (−2) = ?',
    },
    problemSource: { generatorSkillId: 'M1.NUM.INT', baseV1Level: 5, levelWindow: [5, 5] },
  },

  // ---- ALG 확장 ----
  {
    skillId: 'M1.ALG.VAL.01',
    nameKo: '식의 값 (일차 대입)',
    unit: 'M1.ALG.EXP',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.NUM.SIGN.01'],
    prereqEdges: [{ from: 'M1.NUM.SIGN.01', strength: 'REQUIRED', rationale: '음수 대입 계산은 부호 덧뺄셈 그 자체다' }],
    importance: 1.0,
    microLesson: {
      idea: '문자에 수를 "넣고" 계산해요 — 음수는 꼭 괄호에 넣어서.',
      why: '3x에 x=−1을 넣으면 3×(−1) — 괄호를 안 치면 부호 실수가 나요.',
      example: 'x=−1일 때 3x+3 = 3×(−1)+3 = 0',
      try_: 'x=−2일 때 2x+5 = ?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EXP', baseV1Level: 1, levelWindow: [1, 1] },
  },
  {
    skillId: 'M1.ALG.VAL.02',
    nameKo: '식의 값 (제곱 대입)',
    unit: 'M1.ALG.EXP',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.ALG.VAL.01', 'M1.NUM.POW.01'],
    prereqEdges: [
      { from: 'M1.ALG.VAL.01', strength: 'REQUIRED', rationale: '대입 절차 자체가 선행되어야 한다' },
      { from: 'M1.NUM.POW.01', strength: 'STRONGLY_SUPPORTIVE', rationale: 'x²에 음수를 넣을 때 거듭제곱 부호 규칙이 그대로 쓰인다' },
    ],
    importance: 1.0,
    microLesson: {
      idea: '−a²과 (−a)²은 다른 식이에요 — 제곱이 먼저, 그다음 앞의 −.',
      why: '괄호가 없으면 −는 제곱 결과에 붙는 부호예요.',
      example: 'a=−2일 때 −a² = −(−2)² = −4',
      try_: 'x=−3일 때 −x² = ?',
    },
    // Phase 3 STEP 2: [2,4]는 동류항(L2)·분배(L3)가 혼입되던 창 — 제곱 대입의 실주제는 L4뿐.
    problemSource: { generatorSkillId: 'M1.ALG.EXP', baseV1Level: 4, levelWindow: [4, 4] },
  },
  {
    skillId: 'M1.ALG.PAT.01',
    nameKo: '규칙을 식으로 (패턴 일반화)',
    unit: 'M1.ALG.EXP',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.ALG.VAL.01', 'M1.ALG.EXP.01'],
    prereqEdges: [
      { from: 'M1.ALG.VAL.01', strength: 'REQUIRED', rationale: '세운 식에 n을 대입해 검산하는 과정이 필수다' },
      { from: 'M1.ALG.EXP.01', strength: 'STRONGLY_SUPPORTIVE', rationale: '첫 항+증가량 구조를 식으로 정리할 때 동류항 감각이 쓰인다' },
    ],
    importance: 1.1,
    microLesson: {
      idea: '패턴은 "처음 값 + 늘어나는 양 × 횟수"로 식이 돼요.',
      why: 'n번째를 직접 세지 않고도 식 하나로 모든 단계를 알 수 있어요.',
      example: '5개로 시작, 매번 4개 추가 → n번째 = 4n + 1',
      try_: '3으로 시작해 매번 2씩 커지면 n번째는?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EXP', baseV1Level: 5, levelWindow: [5, 5] },
  },
  {
    skillId: 'M1.ALG.EQ.AX.01',
    nameKo: 'ax + b = c 형 방정식',
    unit: 'M1.ALG.EQ',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.ALG.EQ.01', 'M1.NUM.SIGN.02'],
    prereqEdges: [
      { from: 'M1.ALG.EQ.01', strength: 'REQUIRED', rationale: '이항 원리가 선행되어야 계수 나누기가 의미를 가진다' },
      { from: 'M1.NUM.SIGN.02', strength: 'STRONGLY_SUPPORTIVE', rationale: '음수 계수로 나눌 때 부호 규칙이 그대로 쓰인다' },
    ],
    importance: 1.2,
    microLesson: {
      idea: '상수를 먼저 이항하고, 마지막에 계수로 나눠요.',
      why: '순서를 바꾸면(먼저 나누면) 모든 항을 나눠야 해서 실수가 늘어요.',
      example: '6x − 12 = −60 → 6x = −48 → x = −8',
      try_: '3x + 5 = −7 → x = ?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EQ', baseV1Level: 2, levelWindow: [2, 2] },
  },
  {
    skillId: 'M1.ALG.EQ.BOTH.01',
    nameKo: '양변에 x가 있는 방정식',
    unit: 'M1.ALG.EQ',
    grade: 'M1',
    domain: 'ALG',
    prerequisites: ['M1.ALG.EQ.AX.01', 'M1.ALG.EXP.01'],
    prereqEdges: [
      { from: 'M1.ALG.EQ.AX.01', strength: 'REQUIRED', rationale: 'x항을 모은 후의 마무리가 ax=b 풀이다' },
      { from: 'M1.ALG.EXP.01', strength: 'SUPPORTIVE', rationale: '동류항 정리가 빠르면 이항 정리가 수월하다' },
    ],
    importance: 1.1,
    microLesson: {
      idea: 'x항은 왼쪽으로, 상수항은 오른쪽으로 — 건널 때마다 부호 반전.',
      why: '양쪽에 흩어진 x를 한곳에 모아야 한 번에 풀 수 있어요.',
      example: '−5x+5 = 5x−75 → −10x = −80 → x = 8',
      try_: '2x + 3 = 5x − 6 → x = ?',
    },
    problemSource: { generatorSkillId: 'M1.ALG.EQ', baseV1Level: 3, levelWindow: [3, 3] },
  },

  // ---- FUN.COORD 확장 ----
  {
    skillId: 'M1.FUN.SYM.01',
    nameKo: '점의 대칭이동',
    unit: 'M1.FUN.COORD',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.FUN.COORD.01'],
    prereqEdges: [{ from: 'M1.FUN.COORD.01', strength: 'REQUIRED', rationale: '좌표 읽기가 되어야 부호 반전 규칙을 적용할 수 있다' }],
    importance: 0.9,
    microLesson: {
      idea: 'x축 대칭은 y부호만, y축 대칭은 x부호만, 원점 대칭은 둘 다 반전.',
      why: '축을 거울로 생각하면 어느 좌표가 뒤집히는지 보여요.',
      example: '(1, 2)의 원점 대칭 → (−1, −2)',
      try_: '(3, −4)의 x축 대칭점은?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.COORD', baseV1Level: 2, levelWindow: [2, 2] },
  },
  {
    skillId: 'M1.FUN.AREA.01',
    nameKo: '좌표평면 위 도형의 넓이',
    unit: 'M1.FUN.COORD',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.FUN.COORD.01', 'M1.NUM.SIGN.01'],
    prereqEdges: [
      { from: 'M1.FUN.COORD.01', strength: 'REQUIRED', rationale: '꼭짓점 좌표를 읽어야 변 길이를 구한다' },
      { from: 'M1.NUM.SIGN.01', strength: 'STRONGLY_SUPPORTIVE', rationale: '변 길이 = 좌표 차 — 음수 좌표의 뺄셈이 핵심 계산이다' },
    ],
    importance: 0.9,
    microLesson: {
      idea: '변의 길이는 "좌표의 차" — 큰 좌표에서 작은 좌표를 빼요.',
      why: '음수 좌표가 섞여도 차를 구하면 길이는 항상 양수가 돼요.',
      example: 'A(2,−2), B(8,−2) → 가로 8−2=6',
      try_: '(−7,3)과 (2,3) 사이 거리는?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.COORD', baseV1Level: 3, levelWindow: [3, 4] },
  },
  {
    skillId: 'M1.FUN.QSGN.01',
    nameKo: '문자 부호로 사분면 판정',
    unit: 'M1.FUN.COORD',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.FUN.COORD.01', 'M1.NUM.SIGN.02'],
    prereqEdges: [
      { from: 'M1.FUN.COORD.01', strength: 'REQUIRED', rationale: '사분면 부호표가 판정의 틀이다' },
      { from: 'M1.NUM.SIGN.02', strength: 'REQUIRED', rationale: 'a−b, a×b의 부호 추론이 문제의 실제 내용이다' },
    ],
    importance: 1.0,
    microLesson: {
      idea: '수 대신 부호만으로 추론해요: (양)−(음)=양, (양)×(음)=음.',
      why: '구체적 수가 없어도 부호 조합이 사분면을 결정해요.',
      example: 'a>0, b<0 → (a−b, ab) = (양, 음) → 제4사분면',
      try_: 'a<0, b>0일 때 (ab, b−a)는 몇 사분면?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.COORD', baseV1Level: 5, levelWindow: [5, 5] },
  },

  // ---- FUN.PROP (정비례·반비례) ----
  {
    skillId: 'M1.FUN.PROP.01',
    nameKo: '정비례 관계식 세우기',
    unit: 'M1.FUN.PROP',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.ALG.VAL.01'],
    prereqEdges: [
      { from: 'M1.ALG.VAL.01', strength: 'REQUIRED', rationale: 'y=ax에 주어진 (x,y)를 대입해 a를 구하는 절차다' },
      { from: 'M1.ALG.EQ.01', strength: 'SUPPORTIVE', rationale: 'a를 구하는 마지막 한 걸음이 간단한 방정식이다' },
    ],
    importance: 1.2,
    microLesson: {
      idea: '정비례는 y = ax — 한 쌍의 (x, y)만 있으면 a가 정해져요.',
      why: 'x가 2배, 3배 되면 y도 2배, 3배 — 그 비율이 a예요.',
      example: 'x=2일 때 y=6 → a = 6/2 = 3 → y = 3x',
      try_: 'x=4일 때 y=−8이면 a는?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.PROP', baseV1Level: 1, levelWindow: [1, 1] },
  },
  {
    skillId: 'M1.FUN.PROP.02',
    nameKo: '정비례 값 구하기',
    unit: 'M1.FUN.PROP',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.FUN.PROP.01'],
    prereqEdges: [{ from: 'M1.FUN.PROP.01', strength: 'REQUIRED', rationale: '관계식을 먼저 세워야 다른 x의 y를 구한다' }],
    importance: 1.1,
    microLesson: {
      idea: '두 단계: ① a 구하기 ② 새 x 대입.',
      why: '관계식은 한 번 세우면 어떤 x에도 재사용돼요.',
      example: 'x=−2, y=8 → y=−4x → x=5면 y=−20',
      try_: 'x=3일 때 y=12, x=−2일 때 y는?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.PROP', baseV1Level: 2, levelWindow: [2, 2] },
  },
  {
    skillId: 'M1.FUN.PROP.03',
    nameKo: '반비례 관계',
    unit: 'M1.FUN.PROP',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.FUN.PROP.01', 'M1.NUM.FRAC.01'],
    prereqEdges: [
      { from: 'M1.FUN.PROP.01', strength: 'REQUIRED', rationale: '"비례 관계식을 세운다"는 절차 자체를 공유한다' },
      { from: 'M1.NUM.FRAC.01', strength: 'STRONGLY_SUPPORTIVE', rationale: 'y=a/x 계산은 분수 나눗셈이 실체다' },
    ],
    importance: 1.2,
    microLesson: {
      idea: '반비례는 y = a/x — 곱 xy가 항상 a로 일정해요.',
      why: 'x가 2배가 되면 y는 절반 — 곱이 보존되기 때문이에요.',
      example: 'x=4, y=−3 → a = −12 → x=−2면 y=6',
      try_: 'x=6일 때 y=2, x=3일 때 y는?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.PROP', baseV1Level: 3, levelWindow: [3, 3] },
    secondarySkillIds: ['M1.NUM.FRAC.01'],
  },
  {
    skillId: 'M1.FUN.PROP.04',
    nameKo: '비례 실생활 활용',
    unit: 'M1.FUN.PROP',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.FUN.PROP.02', 'M1.FUN.PROP.03'],
    prereqEdges: [
      { from: 'M1.FUN.PROP.02', strength: 'REQUIRED', rationale: '정비례 값 계산이 톱니·속력형의 골격이다' },
      { from: 'M1.FUN.PROP.03', strength: 'STRONGLY_SUPPORTIVE', rationale: '톱니 문제는 "곱 일정"의 반비례 구조다' },
    ],
    importance: 1.1,
    microLesson: {
      idea: '문장에서 "무엇이 일정한가"를 먼저 찾아요 — 비율이면 정비례, 곱이면 반비례.',
      why: '톱니×회전수는 일정(반비례), 거리와 시간은 속력 고정 시 정비례.',
      example: '톱니 48×6바퀴 = 288 = 8×x → x=36바퀴',
      try_: '톱니 20개가 3바퀴 돌면, 맞물린 톱니 12개는 몇 바퀴?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.PROP', baseV1Level: 4, levelWindow: [4, 4] },
  },
  {
    skillId: 'M1.FUN.PROP.05',
    nameKo: '비례 그래프 위의 점',
    unit: 'M1.FUN.PROP',
    grade: 'M1',
    domain: 'FUN',
    prerequisites: ['M1.FUN.PROP.01', 'M1.FUN.COORD.02'],
    prereqEdges: [
      { from: 'M1.FUN.PROP.01', strength: 'REQUIRED', rationale: '그래프의 식 y=ax를 세우는 것이 첫 단계다' },
      { from: 'M1.FUN.COORD.02', strength: 'STRONGLY_SUPPORTIVE', rationale: '"점이 그래프 위에 있다 = 대입하면 성립"의 감각을 공유한다' },
    ],
    importance: 1.1,
    microLesson: {
      idea: '그래프가 점을 지난다 = 그 좌표를 식에 넣으면 등식이 성립한다.',
      why: '한 점으로 a를 정하고, 다른 점으로 미지수를 구할 수 있어요.',
      example: 'y=ax가 (2,3) 지남 → a=3/2 → (k,−9)면 k=−6',
      try_: 'y=2x가 (k, 10)을 지나면 k는?',
    },
    problemSource: { generatorSkillId: 'M1.FUN.PROP', baseV1Level: 5, levelWindow: [5, 5] },
  },

  // ---- GEO.BASIC ----
  {
    skillId: 'M1.GEO.ANG.01',
    nameKo: '평각과 맞꼭지각',
    unit: 'M1.GEO.BASIC',
    grade: 'M1',
    domain: 'GEO',
    prerequisites: [],
    prereqEdges: [{ from: 'M1.ALG.EQ.01', strength: 'SUPPORTIVE', rationale: 'x를 구하는 마지막 계산이 한 줄 방정식이다' }],
    importance: 1.0,
    microLesson: {
      idea: '한 직선 위의 이웃한 각의 합은 180°예요.',
      why: '직선은 평각(180°) — 나뉜 두 각은 합쳐서 그 전체예요.',
      example: '68° + x° = 180° → x = 112',
      try_: '한 직선 위에서 이웃 각이 45°면 다른 각은?',
    },
    problemSource: { generatorSkillId: 'M1.GEO.BASIC', baseV1Level: 1, levelWindow: [1, 1] },
  },
  {
    skillId: 'M1.GEO.ANG.02',
    nameKo: '수직과 직각 계산',
    unit: 'M1.GEO.BASIC',
    grade: 'M1',
    domain: 'GEO',
    prerequisites: ['M1.GEO.ANG.01'],
    prereqEdges: [{ from: 'M1.GEO.ANG.01', strength: 'REQUIRED', rationale: '각의 합 분해라는 같은 원리를 90°에 적용한다' }],
    importance: 0.9,
    microLesson: {
      idea: '수직이면 90° — 나뉜 각들의 합이 직각이 돼요.',
      why: '평각(180°) 원리의 절반 버전이에요.',
      example: 'x + 35° = 90° → x = 55°',
      try_: '수직인 두 직선 사이 한 각이 62°면 나머지는?',
    },
    problemSource: { generatorSkillId: 'M1.GEO.BASIC', baseV1Level: 2, levelWindow: [2, 2] },
  },
  {
    // Phase 3 STEP 2 감사: 이 스킬이 실제로 서빙·진단해 온 내용은 GEO.BASIC L3 = 평행선
    // 각(동위각·엇각·동측내각)이다. '시계 바늘의 각도'라는 라벨은 transfer 분기의 시계
    // 응용 문항에서 온 오명명 — 축적된 이벤트·숙달 데이터는 전부 평행선 각 데이터이므로
    // skillId는 이벤트 호환을 위해 유지하고 라벨·레슨만 실체에 맞게 교정한다.
    skillId: 'M1.GEO.CLOCK.01',
    nameKo: '평행선에서의 각 (동위각·엇각)',
    unit: 'M1.GEO.BASIC',
    grade: 'M1',
    domain: 'GEO',
    prerequisites: ['M1.GEO.ANG.01', 'M1.NUM.FRAC.01'],
    prereqEdges: [
      { from: 'M1.GEO.ANG.01', strength: 'REQUIRED', rationale: '평각·맞꼭지각의 각 감각 위에서 동위각·엇각 관계가 정의된다' },
      { from: 'M1.NUM.FRAC.01', strength: 'SUPPORTIVE', rationale: '180−a 류 보각 계산에 산술 기본기가 끼어든다' },
    ],
    importance: 0.8,
    microLesson: {
      idea: '평행선을 한 직선이 가로지르면: 동위각·엇각은 같고, 동측내각은 합이 180°예요.',
      why: '세 관계 중 어떤 것이 "같다"이고 어떤 것이 "합 180°"인지를 바꿔 쓰는 것이 최다 오답 원인이에요.',
      example: 'Z자 모양(엇각)은 같다, C자 모양(동측내각)은 합 180°',
      try_: '평행선에서 한 각이 70°일 때 그 엇각은?',
    },
    problemSource: { generatorSkillId: 'M1.GEO.BASIC', baseV1Level: 3, levelWindow: [3, 3] },
  },
  {
    skillId: 'M1.GEO.POLY.01',
    nameKo: '다각형 내각의 합',
    unit: 'M1.GEO.BASIC',
    grade: 'M1',
    domain: 'GEO',
    prerequisites: [],
    prereqEdges: [{ from: 'M1.ALG.VAL.01', strength: 'SUPPORTIVE', rationale: '(n−2)×180°에 n을 대입하는 계산이다' }],
    importance: 1.0,
    microLesson: {
      idea: 'n각형 내각의 합 = (n−2) × 180°.',
      why: 'n각형은 (n−2)개의 삼각형으로 쪼갤 수 있기 때문이에요.',
      example: '10각형: (10−2)×180° = 1440°',
      try_: '6각형 내각의 합은?',
    },
    problemSource: { generatorSkillId: 'M1.GEO.BASIC', baseV1Level: 4, levelWindow: [4, 4] },
  },
  {
    skillId: 'M1.GEO.POLY.02',
    nameKo: '내각합 역산과 대각선',
    unit: 'M1.GEO.BASIC',
    grade: 'M1',
    domain: 'GEO',
    prerequisites: ['M1.GEO.POLY.01', 'M1.ALG.EQ.AX.01'],
    prereqEdges: [
      { from: 'M1.GEO.POLY.01', strength: 'REQUIRED', rationale: '공식을 알아야 거꾸로 n을 구할 수 있다' },
      { from: 'M1.ALG.EQ.AX.01', strength: 'STRONGLY_SUPPORTIVE', rationale: '(n−2)×180=합 을 n에 대해 푸는 것이 ax+b=c다' },
    ],
    importance: 1.0,
    microLesson: {
      idea: '내각합에서 n을 역산: n = 합÷180 + 2. 대각선은 n(n−3)/2.',
      why: '공식을 "거꾸로" 쓰는 것이 상위 문제의 전형이에요.',
      example: '1440° → n=10 → 대각선 10×7/2 = 35',
      try_: '내각합 900°인 다각형의 변의 수는?',
    },
    problemSource: { generatorSkillId: 'M1.GEO.BASIC', baseV1Level: 5, levelWindow: [5, 5] },
    secondarySkillIds: ['M1.ALG.EQ.AX.01'],
  },

  // ---- STA.DATA ----
  {
    skillId: 'M1.STA.AVG.01',
    nameKo: '평균 구하기',
    unit: 'M1.STA.DATA',
    grade: 'M1',
    domain: 'STA',
    prerequisites: [],
    prereqEdges: [{ from: 'M1.NUM.FRAC.01', strength: 'SUPPORTIVE', rationale: '합÷개수의 나눗셈 처리에 분수 감각이 쓰인다' }],
    importance: 1.0,
    microLesson: {
      idea: '평균 = 전체 합 ÷ 개수.',
      why: '모두 같게 나눠 가진다면 한 명이 갖는 양이 평균이에요.',
      example: '(26+21+33+22+33)÷5 = 27',
      try_: '4, 8, 9의 평균은?',
    },
    problemSource: { generatorSkillId: 'M1.STA.DATA', baseV1Level: 1, levelWindow: [1, 1] },
  },
  {
    skillId: 'M1.STA.AVG.02',
    nameKo: '평균에서 미지값 역산',
    unit: 'M1.STA.DATA',
    grade: 'M1',
    domain: 'STA',
    prerequisites: ['M1.STA.AVG.01', 'M1.ALG.EQ.01'],
    prereqEdges: [
      { from: 'M1.STA.AVG.01', strength: 'REQUIRED', rationale: '평균의 정의를 거꾸로 쓰는 문제다' },
      { from: 'M1.ALG.EQ.01', strength: 'STRONGLY_SUPPORTIVE', rationale: '합=평균×개수로 놓고 x를 이항해 구한다' },
    ],
    importance: 1.1,
    microLesson: {
      idea: '합 = 평균 × 개수 — 이걸로 빠진 수를 찾아요.',
      why: '평균을 알면 전체 합이 고정되기 때문이에요.',
      example: '평균 33×4=132, 39+32+38=109 → x=23',
      try_: '세 수 5, 9, x의 평균이 7이면 x는?',
    },
    problemSource: { generatorSkillId: 'M1.STA.DATA', baseV1Level: 2, levelWindow: [2, 2] },
    secondarySkillIds: ['M1.ALG.EQ.01'],
  },
  {
    skillId: 'M1.STA.REL.01',
    nameKo: '상대도수',
    unit: 'M1.STA.DATA',
    grade: 'M1',
    domain: 'STA',
    prerequisites: ['M1.NUM.FRAC.01'],
    prereqEdges: [{ from: 'M1.NUM.FRAC.01', strength: 'REQUIRED', rationale: '상대도수 = 도수/전체 — 분수·소수 변환이 계산의 전부다' }],
    importance: 1.1,
    microLesson: {
      idea: '상대도수 = 그 계급의 도수 ÷ 전체 도수.',
      why: '전체가 달라도 비율로 비교할 수 있게 해줘요.',
      example: '40명 중 4명 → 4/40 = 0.1',
      try_: '25명 중 5명인 계급의 상대도수는?',
    },
    problemSource: { generatorSkillId: 'M1.STA.DATA', baseV1Level: 3, levelWindow: [3, 3] },
    secondarySkillIds: ['M1.NUM.FRAC.01'],
  },
  {
    skillId: 'M1.STA.REL.02',
    nameKo: '상대도수 역산',
    unit: 'M1.STA.DATA',
    grade: 'M1',
    domain: 'STA',
    prerequisites: ['M1.STA.REL.01'],
    prereqEdges: [
      { from: 'M1.STA.REL.01', strength: 'REQUIRED', rationale: '정의를 거꾸로 적용: 도수 = 상대도수 × 전체' },
      { from: 'M1.ALG.EQ.AX.01', strength: 'SUPPORTIVE', rationale: '미지 전체 인원을 구할 땐 일차방정식 형태가 된다' },
    ],
    importance: 1.0,
    microLesson: {
      idea: '도수 = 상대도수 × 전체 — 곱으로 되돌려요.',
      why: '비율에서 실제 인원수로 돌아가는 방향이에요.',
      example: '0.35 × 40명 = 14명',
      try_: '상대도수 0.2, 전체 30명이면 도수는?',
    },
    problemSource: { generatorSkillId: 'M1.STA.DATA', baseV1Level: 4, levelWindow: [4, 4] },
  },
  {
    skillId: 'M1.STA.AVG.03',
    nameKo: '평균의 변화 추론',
    unit: 'M1.STA.DATA',
    grade: 'M1',
    domain: 'STA',
    prerequisites: ['M1.STA.AVG.02'],
    prereqEdges: [{ from: 'M1.STA.AVG.02', strength: 'REQUIRED', rationale: '합의 재구성(전/후)을 두 번 수행하는 확장형이다' }],
    importance: 1.0,
    microLesson: {
      idea: '전·후의 "합"을 각각 구해 차이를 보면 새 값이 나와요.',
      why: '평균이 바뀌면 합이 바뀐 것 — 그 차가 새로 들어온 수예요.',
      example: '4명 평균 73(합 292) → 5명 평균 76(합 380) → 새 점수 88',
      try_: '3명 평균 10 → 4명 평균 12면 새 사람 값은?',
    },
    problemSource: { generatorSkillId: 'M1.STA.DATA', baseV1Level: 5, levelWindow: [5, 5] },
  },
];

export const MICRO_SKILL_MAP: Record<string, MicroSkillDef> = Object.fromEntries(MICRO_SKILLS.map((s) => [s.skillId, s]));
export const ALL_SKILL_IDS: string[] = MICRO_SKILLS.map((s) => s.skillId);

// PART 11: 진단 하강(prerequisitesOf)은 REQUIRED + STRONGLY_SUPPORTIVE 엣지만 따른다.
// SUPPORTIVE는 "도움이 되지만 우회 가능" — 하강 대상에 넣으면 광역 조사가 된다.
// (엣지 미선언 스킬 = 파일럿 10개는 prerequisites 배열을 REQUIRED로 간주 — Phase 1 동결.)
export function edgesOf(skillId: string): PrerequisiteEdge[] {
  const def = MICRO_SKILL_MAP[skillId];
  if (!def) return [];
  if (def.prereqEdges) return def.prereqEdges;
  return def.prerequisites.map((from) => ({ from, strength: 'REQUIRED' as EdgeStrength, rationale: '(파일럿 원형 — Phase 1 동결)' }));
}

export function prerequisitesOf(skillId: string): string[] {
  return edgesOf(skillId)
    .filter((e) => e.strength !== 'SUPPORTIVE')
    .map((e) => e.from);
}

export function supportivePrerequisitesOf(skillId: string): string[] {
  return edgesOf(skillId)
    .filter((e) => e.strength === 'SUPPORTIVE')
    .map((e) => e.from);
}

export function dependentsOf(skillId: string): string[] {
  return MICRO_SKILLS.filter((s) => prerequisitesOf(s.skillId).includes(skillId)).map((s) => s.skillId);
}

// ---------------------------------------------------------------------------
// PART G — Misconception library (Phase 1: 6 entries).
// Adapter note (documented limitation, PART A): the reused v1 generators tag
// distractors with a generic ErrorType, not a specific misconception id. A
// "strong trigger" in Phase 1 is therefore approximated as (skillId, errorType)
// co-occurrence rather than matching one exact distractor pattern. This is a
// pragmatic Phase-1 simplification — see PHASE 1 COMPLETION REPORT PART K.
// ---------------------------------------------------------------------------
export interface MisconceptionDef {
  id: string;
  triggerSkillId: string;
  triggerErrorType: string; // ErrorType21, kept as string to avoid circular import
  descriptionKo: string;
  remediationSkillId: string;
  // Phase 2 PART 5-1: 이 오개념의 태깅 distractor가 실제 생성되는 엔진 난이도.
  // confirm 문항을 이 난이도로 서빙해야 매 확인이 비율 검정의 유효 표본이 된다.
  diagnosticDifficulty?: number;
  // Phase 3 PART 4 — 13/13 감사 필드.
  // mechanism: 학생이 실제로 적용하는 "오규칙" 그 자체 (태깅 distractor는 이 규칙의 기계적 산물이어야 함)
  mechanism: string;
  // diagnosticStrength: 이 오개념에 대해 은행이 제공하는 최고 신뢰도의 태깅 distractor 강도
  diagnosticStrength: 'HIGH' | 'MEDIUM' | 'LOW';
  // confirmProblemTemplates: 태깅 distractor가 생성되는 생성기 템플릿 (generatorSkillId:L레벨[:조건])
  confirmProblemTemplates: string[];
}

export const MISCONCEPTION_LIBRARY: MisconceptionDef[] = [
  // Phase 3 STEP 2 — 13/13 태깅 감사 완료 (PART 4/5).
  // 원칙: 태깅 distractor는 mechanism(오규칙)의 "기계적 산물"인 경우에만 붙인다.
  // 조건부 산물(예: x<0일 때만 구별 가능)은 confirmProblemTemplates에 조건을 명시하고,
  // confirm 서빙은 태그가 실리는 형태가 나올 때까지 재생성한다(session21).
  // diagnosticDifficulty: 주제 순수 창([k,k]) 도입 후 전 난이도가 같은 주제를 서빙하므로
  // "confirm을 서빙할 엔진 난이도"의 의미만 남는다 — 전부 3(중간 부담)으로 통일.

  // ---- 파일럿 6종 (Phase 2 태깅 유지) ----
  // Phase 3 STEP 1: NEGSQ의 태깅 distractor는 NUM.INT L4(거듭제곱 혼합)에만 생성된다.
  // Phase 2에서 trigger가 SIGN.02였던 것은 ±2 블러로 SIGN.02 d5가 L4를 서빙하던 시절의
  // 산물 — 주제 순수 창 도입으로 정위치인 POW.01(창 [4,4])로 이관.
  { id: 'MIS.SIGN.NEGSQ', triggerSkillId: 'M1.NUM.POW.01', triggerErrorType: 'SIGN_ERROR', descriptionKo: '−a²을 (−a)²으로 처리 (부호와 거듭제곱 순서 혼동)', remediationSkillId: 'M1.NUM.POW.01', diagnosticDifficulty: 3, mechanism: '(−a)ⁿ 계산에서 지수의 짝·홀과 무관하게 결과에 − 부호를 붙인다(또는 그 역)', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.NUM.INT:L4:a<0∧n짝수'] },
  { id: 'MIS.EQ.MOVE', triggerSkillId: 'M1.ALG.EQ.01', triggerErrorType: 'SIGN_ERROR', descriptionKo: '이항 시 부호를 그대로 유지', remediationSkillId: 'M1.ALG.EQ.01', diagnosticDifficulty: 3, mechanism: 'x + a = b 를 x = b + a 로 옮긴다 (이항=부호반전을 모름)', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.ALG.EQ:L1', 'M1.ALG.EQ:L2:(c+b)%a=0'] },
  { id: 'MIS.FRAC.ADDDEN', triggerSkillId: 'M1.NUM.FRAC.01', triggerErrorType: 'CONCEPT_GAP', descriptionKo: '분수 덧셈에서 분모끼리도 더함', remediationSkillId: 'M1.NUM.FRAC.01', diagnosticDifficulty: 3, mechanism: 'a/b + c/d = (a+c)/(b+d) 로 계산한다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.NUM.INT:L3'] },
  { id: 'MIS.EXP.DISTR', triggerSkillId: 'M1.ALG.EXP.02', triggerErrorType: 'CALCULATION_ERROR', descriptionKo: '분배법칙에서 둘째 항 곱셈 누락', remediationSkillId: 'M1.ALG.EXP.02', diagnosticDifficulty: 3, mechanism: 'a(x+b) 전개에서 첫 항에만 a를 곱하고 둘째 항은 그대로 둔다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.ALG.EXP:L3'] },
  { id: 'MIS.EQ.WORDDIR', triggerSkillId: 'M1.ALG.EQ.03', triggerErrorType: 'INTERPRETATION_ERROR', descriptionKo: '"~보다 많다/적다"의 증감 방향을 반대로 해석', remediationSkillId: 'M1.ALG.EQ.03', diagnosticDifficulty: 3, mechanism: '"~보다 b 많다"를 −b로 번역한다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.ALG.EQ:L5:translate형', 'M1.ALG.EXP:transfer'] },
  { id: 'MIS.COORD.ORDER', triggerSkillId: 'M1.FUN.COORD.01', triggerErrorType: 'INTERPRETATION_ERROR', descriptionKo: '순서쌍 (x,y)의 순서를 혼동', remediationSkillId: 'M1.FUN.COORD.01', diagnosticDifficulty: 3, mechanism: '(x,y)를 (y,x)로 읽어 사분면·위치를 판정한다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.FUN.COORD:L1:좌표읽기형'] },

  // ---- Phase 3 STEP 2 — 확장분 7종 태깅 (기계적 산물이 실재하는 distractor에만) ----
  { id: 'MIS.VAL.NEGSQ', triggerSkillId: 'M1.ALG.VAL.02', triggerErrorType: 'SIGN_ERROR', descriptionKo: '대입에서 −x²과 (−x)²을 혼동', remediationSkillId: 'M1.ALG.VAL.02', diagnosticDifficulty: 3, mechanism: 'x<0 대입 시 x²을 음수로 계산한다 ((−k)² = −k²)', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.ALG.EXP:L4:x<0'] },
  { id: 'MIS.ABS.DROP', triggerSkillId: 'M1.NUM.ABS.01', triggerErrorType: 'SIGN_ERROR', descriptionKo: '절댓값을 벗기며 내부 계산 결과의 부호를 그대로 둠', remediationSkillId: 'M1.NUM.ABS.01', diagnosticDifficulty: 3, mechanism: '|expr|를 괄호처럼 취급해 내부 결과가 음수여도 부호를 바꾸지 않는다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.NUM.INT:L5:a−b<0'] },
  { id: 'MIS.PROP.INV', triggerSkillId: 'M1.FUN.PROP.03', triggerErrorType: 'CONCEPT_GAP', descriptionKo: '반비례를 정비례(y=ax)로 처리', remediationSkillId: 'M1.FUN.PROP.03', diagnosticDifficulty: 3, mechanism: '반비례 상황에서 y/x를 일정하게 유지해 y = (y₀/x₀)·x₁로 계산한다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.FUN.PROP:L3:비충돌'] },
  { id: 'MIS.REL.FLIP', triggerSkillId: 'M1.STA.REL.01', triggerErrorType: 'CONCEPT_GAP', descriptionKo: '상대도수를 전체÷도수로 뒤집어 계산', remediationSkillId: 'M1.STA.REL.01', diagnosticDifficulty: 3, mechanism: '상대도수 = 전체 ÷ 그 계급 도수로 계산한다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.STA.DATA:L3'] },
  { id: 'MIS.AVG.COUNT', triggerSkillId: 'M1.STA.AVG.02', triggerErrorType: 'CALCULATION_ERROR', descriptionKo: '평균 역산에서 개수를 잘못 적용(빠진 수 제외한 개수로 총합 계산)', remediationSkillId: 'M1.STA.AVG.02', diagnosticDifficulty: 3, mechanism: '총합 = 평균 × (아는 수의 개수)로 계산해 x = 3m − Σ(known)을 얻는다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.STA.DATA:L2:비충돌'] },
  { id: 'MIS.GEO.POLYN', triggerSkillId: 'M1.GEO.POLY.01', triggerErrorType: 'FORMULA_ERROR', descriptionKo: '내각합을 (n−2)가 아닌 n×180°로 계산', remediationSkillId: 'M1.GEO.POLY.01', diagnosticDifficulty: 3, mechanism: '내각의 합 = n × 180°로 계산한다 (삼각형 분할 수를 n으로 착각)', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.GEO.BASIC:L4:sum변형'] },
  // Phase 3 STEP 2: 구 MIS.CLOCK.HOUR 대체. CLOCK.01은 실제로 평행선 각(L3)을 서빙·진단해 왔고
  // 시계 문항은 transfer 분기에만 존재해 "시침 정시 가정"의 기계적 산물을 제공하는 문항이
  // 은행에 없다 — PART 5(거짓 태깅 금지)에 따라 실제 진단 가능한 오개념으로 교체.
  { id: 'MIS.GEO.PARCON', triggerSkillId: 'M1.GEO.CLOCK.01', triggerErrorType: 'CONCEPT_GAP', descriptionKo: '평행선 각 관계 혼동 (동위각·엇각=같다 ↔ 동측내각=합180°를 서로 바꿔 적용)', remediationSkillId: 'M1.GEO.CLOCK.01', diagnosticDifficulty: 3, mechanism: '동측내각에 "같다" 규칙을, 동위각·엇각에 "합 180°" 규칙을 적용한다', diagnosticStrength: 'HIGH', confirmProblemTemplates: ['M1.GEO.BASIC:L3'] },
];

// ---------------------------------------------------------------------------
// Phase 3 PART 22 — Skill Cluster: 영역(domain)보다 세밀한 readiness 단위.
// "대수 평균이 높다고 약한 함수 클러스터에 고난도 함수 Elite를 주는" 오류를 막는다 (PART 23).
// 모든 스킬은 정확히 하나의 클러스터에 속한다 (test23-elite2에서 기계 검증).
// ---------------------------------------------------------------------------
export interface SkillCluster {
  id: string;
  nameKo: string;
  domain: 'NUM' | 'ALG' | 'FUN' | 'GEO' | 'STA';
  skills: string[];
}

export const SKILL_CLUSTERS: SkillCluster[] = [
  { id: 'NUM.INTOPS', nameKo: '정수 연산', domain: 'NUM', skills: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02', 'M1.NUM.POW.01'] },
  { id: 'NUM.FRACABS', nameKo: '분수와 절댓값', domain: 'NUM', skills: ['M1.NUM.FRAC.01', 'M1.NUM.ABS.01'] },
  { id: 'ALG.EXPR', nameKo: '문자식', domain: 'ALG', skills: ['M1.ALG.EXP.01', 'M1.ALG.EXP.02', 'M1.ALG.VAL.01', 'M1.ALG.VAL.02'] },
  { id: 'ALG.EQUATION', nameKo: '일차방정식', domain: 'ALG', skills: ['M1.ALG.EQ.01', 'M1.ALG.EQ.AX.01', 'M1.ALG.EQ.BOTH.01', 'M1.ALG.EQ.02', 'M1.ALG.EQ.03'] },
  { id: 'ALG.PATTERN', nameKo: '패턴 일반화', domain: 'ALG', skills: ['M1.ALG.PAT.01'] },
  { id: 'FUN.COORD', nameKo: '좌표평면', domain: 'FUN', skills: ['M1.FUN.COORD.01', 'M1.FUN.COORD.02', 'M1.FUN.SYM.01', 'M1.FUN.AREA.01', 'M1.FUN.QSGN.01'] },
  { id: 'FUN.PROP', nameKo: '정비례·반비례', domain: 'FUN', skills: ['M1.FUN.PROP.01', 'M1.FUN.PROP.02', 'M1.FUN.PROP.03', 'M1.FUN.PROP.04', 'M1.FUN.PROP.05'] },
  { id: 'GEO.ANGLE', nameKo: '각과 평행선', domain: 'GEO', skills: ['M1.GEO.ANG.01', 'M1.GEO.ANG.02', 'M1.GEO.CLOCK.01'] },
  { id: 'GEO.POLY', nameKo: '다각형', domain: 'GEO', skills: ['M1.GEO.POLY.01', 'M1.GEO.POLY.02'] },
  { id: 'STA.AVG', nameKo: '평균', domain: 'STA', skills: ['M1.STA.AVG.01', 'M1.STA.AVG.02', 'M1.STA.AVG.03'] },
  { id: 'STA.REL', nameKo: '상대도수', domain: 'STA', skills: ['M1.STA.REL.01', 'M1.STA.REL.02'] },
];

export const CLUSTER_OF: Record<string, SkillCluster> = {};
for (const c of SKILL_CLUSTERS) for (const s of c.skills) CLUSTER_OF[s] = c;

export const MISCONCEPTIONS_BY_TRIGGER: Record<string, MisconceptionDef[]> = {};
for (const m of MISCONCEPTION_LIBRARY) {
  const key = `${m.triggerSkillId}::${m.triggerErrorType}`;
  (MISCONCEPTIONS_BY_TRIGGER[key] ??= []).push(m);
}

export { CURRICULUM_VERSION };
