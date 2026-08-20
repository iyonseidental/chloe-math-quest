// CHLOE MATH 2.2 — Elite Problem Bank (PART 37-39).
// 38,000 생성 문항은 Core/Practice 공급원이다 — 그것이 많다는 이유로 Elite Bank로 간주하지
// 않는다 (PART 37). 여기의 문제는 전부 본 프로젝트의 '원저작 신규 창작'이며 (PART 39:
// 외부 교재·학원·시험 문제 무단 복제 금지), multi-step / multi-skill / non-routine /
// representation change / strategy choice / generalization / reasoning 특성을 갖도록
// 손으로 설계했다. 노출 전 validateEliteBank()가 PART 38 항목을 기계 검증한다.
import type { EliteDimension, EliteProblemMeta } from './elite22.ts';
import { MICRO_SKILL_MAP } from './curriculum21.ts';
import { ELITE_BANK_EXT } from './eliteBank23.ts';

export interface EliteChoice {
  text: string;
  // 오답이 드러내는 elite 결손 신호 (선택)
  eliteTag?: 'REPRESENTATION' | 'STRATEGY' | 'INTEGRATION' | 'GENERALIZATION' | 'JUSTIFICATION' | 'CARELESS';
}

export interface EliteFollowUp {
  id: string;
  dimension: EliteDimension; // 이 후속이 검증하는 차원 (One Problem Deep, PART 19)
  prompt: string;
  choices: EliteChoice[];
  answerIndex: number;
  note: string; // 해설 (왜 그 답인가)
}

// Phase 3 PART 17 — OPEN_ENDED 전용: 문제별 루브릭 (0~4 기준 + 결정적 검증 목록)
export interface OpenEndedRubric {
  criteria: string[]; // index = level 0..4
  deterministicChecks: string[];
}

export interface EliteProblem extends EliteProblemMeta {
  stem: string;
  choices: EliteChoice[];
  answerIndex: number;
  // PART 26 — Elite 힌트 사다리: NOTICE → REPRESENT → CONNECT → START
  hints: { A: string; B: string; C: string; D: string };
  solution: string;
  altSolution?: string; // MULTIPLE_SOLUTION용 두 번째 풀이
  followUps: EliteFollowUp[];
  estimatedSec: number;
  rubric?: OpenEndedRubric; // OPEN_ENDED 필수 (validateEliteBank 강제)
}

const ELITE_BANK_BASE: EliteProblem[] = [
  // ───────────────────────────── NON_ROUTINE ─────────────────────────────
  {
    id: 'E.NR.001',
    mode: 'NON_ROUTINE',
    difficulty: 3,
    domain: 'NUM',
    requiredSkills: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'],
    noveltyScore: 0.8,
    reasoningValue: 0.8,
    evidenceMap: { primaryDimension: 'novelTransfer', secondaryDimensions: [{ dimension: 'strategySelection', evidenceFraction: 0.5 }, { dimension: 'representation', evidenceFraction: 0.3 }], exclusionDimensions: ['explanation', 'reverseReasoning'] },
    noveltySignature: { representationType: '카드 퍼즐', requiredSkillCombination: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'], dominantReasoningMove: 'invariant-analysis', structuralPattern: '부호 배정 합 0의 가능성 판정', solutionFamily: ['parity-argument', 'equation-setup'] },
    stem: '1부터 9까지의 수가 하나씩 적힌 카드가 있습니다. 채림이는 이 중 몇 장의 카드 앞에 −부호를 붙여, 아홉 수의 합이 정확히 0이 되게 하려고 합니다. −부호를 붙인 카드들의 수의 합(부호 붙이기 전 원래 수의 합)은 얼마여야 할까요?',
    choices: [
      { text: '22.5', eliteTag: 'REPRESENTATION' },
      { text: '45' },
      { text: '0', eliteTag: 'STRATEGY' },
      { text: '만들 수 없다' },
    ],
    answerIndex: 3,
    hints: {
      A: '1~9의 전체 합이 얼마인지부터 관찰해요.',
      B: '−를 붙인 묶음의 합을 S라 하면, 전체 합 45에서 무엇이 변할까요? 식으로 표현해 보세요.',
      C: '합이 0이 되려면 45 − 2S = 0 — 부호 있는 수의 덧셈과 방정식이 연결돼요.',
      D: 'S = 22.5가 되어야 하는데, S는 자연수들의 합이에요.',
    },
    solution: '전체 합 45에서 −를 붙인 묶음(합 S)은 +S였다가 −S가 되므로 총합은 45−2S. 0이 되려면 S=22.5인데 자연수 합은 소수가 될 수 없다 → 불가능. "만들 수 없다"가 정답.',
    followUps: [
      {
        id: 'E.NR.001.f1',
        dimension: 'generalization',
        prompt: '같은 방식으로 1부터 n까지의 카드로 합 0을 만들 수 있으려면, 전체 합 1+2+⋯+n에 대해 어떤 조건이 필요할까요?',
        choices: [{ text: '전체 합이 짝수여야 한다' }, { text: '전체 합이 홀수여야 한다' }, { text: 'n이 짝수이기만 하면 된다' }, { text: '항상 가능하다' }],
        answerIndex: 0,
        note: '45−2S=0 ⇔ 전체합=2S — 전체 합이 짝수일 때만 가능. (n=9는 45로 홀수라 불가.)',
      },
      {
        id: 'E.NR.001.f2',
        dimension: 'justification',
        prompt: '"만들 수 없다"의 근거로 가장 완전한 것은?',
        choices: [
          { text: '여러 가지로 시도해 봤는데 안 됐기 때문', eliteTag: 'JUSTIFICATION' },
          { text: '45−2S=0의 해 S=22.5가 자연수 합이 될 수 없기 때문' },
          { text: '음수가 홀수 개면 합이 0이 될 수 없기 때문', eliteTag: 'JUSTIFICATION' },
          { text: '9장의 카드로는 항상 합이 홀수이기 때문' },
        ],
        answerIndex: 1,
        note: '시도 실패는 증명이 아니다. 구조식(45−2S)에서 모순을 끌어내는 것이 완전한 근거.',
      },
    ],
    estimatedSec: 180,
  },
  {
    id: 'E.NR.002',
    mode: 'NON_ROUTINE',
    difficulty: 4,
    domain: 'ALG',
    requiredSkills: ['M1.ALG.EQ.01', 'M1.ALG.EXP.01'],
    noveltyScore: 0.85,
    reasoningValue: 0.9,
    evidenceMap: { primaryDimension: 'novelTransfer', secondaryDimensions: [{ dimension: 'representation', evidenceFraction: 0.5 }], exclusionDimensions: ['explanation', 'reverseReasoning', 'generalization'] },
    noveltySignature: { representationType: '연산 문장', requiredSkillCombination: ['M1.ALG.EQ.01', 'M1.ALG.EXP.01'], dominantReasoningMove: 'claim-evaluation', structuralPattern: '두 연산 순서의 동치 조건 판정', solutionFamily: ['equation-setup', 'contradiction'] },
    stem: '어떤 수 x에 대해 "3을 더한 뒤 2배 하기"를 A연산, "2배 한 뒤 3을 더하기"를 B연산이라고 합니다. 어떤 수에 A연산을 한 결과와 B연산을 한 결과가 같았다면, 그 수는?',
    choices: [{ text: '0' }, { text: '−3', eliteTag: 'STRATEGY' }, { text: '3', eliteTag: 'CARELESS' }, { text: '그런 수는 없다' }],
    answerIndex: 3,
    hints: {
      A: '두 연산의 결과를 각각 식으로 적어 보세요.',
      B: 'A: 2(x+3), B: 2x+3 — 두 식을 나란히 놓으면?',
      C: '2(x+3) = 2x+3을 풀면 어떤 일이 벌어지나요?',
      D: '전개하면 2x+6 = 2x+3 → 6=3. 모순.',
    },
    solution: '2(x+3)=2x+3 → 2x+6=2x+3 → 6=3 (모순). 어떤 x도 만족 불가 → "그런 수는 없다". 방정식이 항상 해를 갖진 않는다는 구조 인식이 핵심.',
    followUps: [
      {
        id: 'E.NR.002.f1',
        dimension: 'generalization',
        prompt: '"c를 더한 뒤 k배"와 "k배 한 뒤 c를 더하기"가 같아지는 x가 존재하려면?',
        choices: [{ text: 'k=1이거나 c=0이면 모든 x에서 같다' }, { text: '항상 정확히 하나의 x가 있다' }, { text: 'k>1이면 항상 존재한다' }, { text: 'c<0일 때만 존재한다' }],
        answerIndex: 0,
        note: 'k(x+c)=kx+c ⇔ kc=c ⇔ c(k−1)=0. 특수한 경우에만 (그리고 그땐 모든 x에서) 성립.',
      },
    ],
    estimatedSec: 200,
  },
  {
    id: 'E.NR.003',
    mode: 'NON_ROUTINE',
    difficulty: 4,
    domain: 'FUN',
    requiredSkills: ['M1.FUN.COORD.01', 'M1.FUN.SYM.01'],
    noveltyScore: 0.9,
    reasoningValue: 0.85,
    evidenceMap: { primaryDimension: 'novelTransfer', secondaryDimensions: [{ dimension: 'strategySelection', evidenceFraction: 0.5 }], exclusionDimensions: ['explanation', 'justification', 'reverseReasoning'] },
    noveltySignature: { representationType: '수 퍼즐', requiredSkillCombination: [], dominantReasoningMove: 'invariant-analysis', structuralPattern: '연속 조작 후 불변량 추적', solutionFamily: ['invariant-tracking'] },
    stem: '좌표평면 위의 점 P(a, b)를 x축 대칭 → y축 대칭 → 다시 x축 대칭을 차례로 했더니 점 (5, −2)가 되었습니다. 원래 점 P는?',
    choices: [{ text: '(−5, −2)' }, { text: '(5, 2)', eliteTag: 'STRATEGY' }, { text: '(−5, 2)', eliteTag: 'CARELESS' }, { text: '(2, −5)' }],
    answerIndex: 0,
    hints: {
      A: '세 번의 대칭이 각각 어느 좌표의 부호를 바꾸는지 관찰해요.',
      B: '표를 만들어 부호 변화를 추적해 보세요: (a,b) → ? → ? → ?',
      C: 'x축→y축→x축 대칭의 합성은 결국 어떤 한 번의 대칭과 같을까요?',
      D: '(a,b)→(a,−b)→(−a,−b)→(−a,b). 결과가 (5,−2)이니 거꾸로 풀어요.',
    },
    solution: '합성 결과는 (−a, b) = (5, −2) → a=−5, b=−2 → P(−5, −2). 여러 단계를 "하나의 변환"으로 압축하고 역으로 추적하는 것이 관건.',
    followUps: [
      {
        id: 'E.NR.003.f1',
        dimension: 'flexibility',
        prompt: '이 문제를 다른 방법으로 푼다면 가장 효율적인 것은?',
        choices: [
          { text: '(5,−2)에서 시작해 대칭을 역순으로 되돌린다' },
          { text: '네 사분면 그림을 모두 그려 비교한다', eliteTag: 'STRATEGY' },
          { text: '보기의 점 4개를 전부 정방향으로 시험한다' },
          { text: 'a, b에 임의 수를 넣어 본다' },
        ],
        answerIndex: 0,
        note: '역방향 추적은 합성 규칙 없이도 한 단계씩 확실하게 되돌릴 수 있다 — 보기 대입(3안)보다 일반적이고, 그림(2안)보다 빠르다.',
      },
    ],
    estimatedSec: 190,
  },

  // ───────────────────────────── MULTI_SKILL ─────────────────────────────
  {
    id: 'E.MS.001',
    mode: 'MULTI_SKILL',
    difficulty: 4,
    domain: 'FUN',
    requiredSkills: ['M1.FUN.PROP.01', 'M1.FUN.AREA.01', 'M1.ALG.EQ.AX.01'],
    noveltyScore: 0.7,
    reasoningValue: 0.85,
    evidenceMap: { primaryDimension: 'integration', secondaryDimensions: [{ dimension: 'strategySelection', evidenceFraction: 0.5 }], exclusionDimensions: ['generalization', 'reverseReasoning', 'explanation'] },
    noveltySignature: { representationType: '문장', requiredSkillCombination: [], dominantReasoningMove: 'concept-combination', structuralPattern: '두 단원 개념의 순차 결합', solutionFamily: ['chain-computation'] },
    stem: '정비례 그래프 y = 2x 위의 한 점 P(k, 2k) (k>0)와 원점 O, 그리고 점 A(6, 0)으로 삼각형 OAP를 만들었습니다. 이 삼각형의 넓이가 18일 때, k의 값은?',
    choices: [{ text: '3' }, { text: '6', eliteTag: 'INTEGRATION' }, { text: '9', eliteTag: 'CARELESS' }, { text: '1.5' }],
    answerIndex: 0,
    hints: {
      A: '삼각형의 밑변과 높이가 좌표에서 무엇에 해당하는지 관찰해요.',
      B: '밑변 OA는 x축 위 — 그러면 높이는 P의 어느 좌표일까요?',
      C: '넓이 공식과 P가 그래프 위 점이라는 조건(y=2x)을 연결해요.',
      D: '½ × 6 × (2k) = 18부터 시작하세요.',
    },
    solution: '밑변 OA=6, 높이=P의 y좌표=2k. ½·6·2k=18 → 6k=18 → k=3. 정비례(그래프 위 점) + 좌표 넓이 + 일차방정식 세 개념의 결합.',
    followUps: [
      {
        id: 'E.MS.001.f1',
        dimension: 'integration',
        prompt: '이 문제에서 서로 연결된 개념이 아닌 것은?',
        choices: [{ text: '정비례 관계식' }, { text: '좌표평면 도형 넓이' }, { text: '일차방정식 풀이' }, { text: '반비례의 곱 일정 성질' }],
        answerIndex: 3,
        note: '풀이 사슬: y=2x(정비례) → 높이=2k(좌표·넓이) → 6k=18(방정식). 반비례는 쓰이지 않았다 — 무엇을 썼는지 자각하는 것이 통합 능력.',
      },
      {
        id: 'E.MS.001.f2',
        dimension: 'reverseReasoning',
        prompt: '거꾸로, k=5로 고정할 때 넓이가 18이 되려면 점 A(a, 0)의 a는?',
        choices: [{ text: '3.6' }, { text: '18/5' }, { text: '3.6 (= 18/5)' }, { text: '조건과 결과를 바꾸면 ½·a·10=18 → a=3.6' }],
        answerIndex: 3,
        note: '조건↔결과를 뒤집어도 같은 구조식이 작동한다 — 식이 "관계"임을 이해하는 역추론.',
      },
    ],
    estimatedSec: 210,
  },
  {
    id: 'E.MS.002',
    mode: 'MULTI_SKILL',
    difficulty: 5,
    domain: 'STA',
    requiredSkills: ['M1.STA.AVG.02', 'M1.ALG.EQ.BOTH.01'],
    noveltyScore: 0.75,
    reasoningValue: 0.85,
    evidenceMap: { primaryDimension: 'integration', secondaryDimensions: [{ dimension: 'representation', evidenceFraction: 0.4 }], exclusionDimensions: ['generalization', 'reverseReasoning', 'flexibility'] },
    noveltySignature: { representationType: '문장', requiredSkillCombination: [], dominantReasoningMove: 'concept-combination', structuralPattern: '평균 조건과 방정식의 결합', solutionFamily: ['equation-setup'] },
    stem: '채림이네 모둠 5명의 수학 점수 평균은 반 전체(20명) 평균보다 6점 높습니다. 채림이네 모둠을 뺀 나머지 15명의 평균이 71점이라면, 반 전체의 평균은?',
    choices: [{ text: '73점' }, { text: '74점', eliteTag: 'INTEGRATION' }, { text: '71점', eliteTag: 'CARELESS' }, { text: '77점' }],
    answerIndex: 0,
    hints: {
      A: '전체 평균을 문자로 놓으면 두 집단의 "합"을 각각 표현할 수 있어요.',
      B: '전체 평균을 m으로: 모둠 합 = 5(m+6), 나머지 합 = 15×71. 전체 합과의 관계는?',
      C: '(모둠 합) + (나머지 합) = 20m — 평균의 정의를 방정식으로.',
      D: '5(m+6) + 1065 = 20m → 15m = 1095.',
    },
    solution: '5(m+6)+15·71 = 20m → 5m+30+1065 = 20m → 15m = 1095 → m = 73점. 미지의 전체 평균을 문자로 놓고 "합의 보존"으로 방정식화하는 통합 — (77+71)/2=74로 단순 평균하면 함정(가중 무시)에 빠진다.',
    followUps: [
      {
        id: 'E.MS.002.f1',
        dimension: 'integration',
        prompt: '이 문제를 방정식 없이도 풀 수 있는 관점은?',
        choices: [
          { text: '모둠이 전체보다 +6×5=30점을 "초과 보유" → 나머지 15명이 그만큼 미달 → 전체는 71 + 30/15 = 73' },
          { text: '(모둠평균+나머지평균)÷2', eliteTag: 'INTEGRATION' },
          { text: '나머지 평균 71이 곧 전체 평균이다', eliteTag: 'CARELESS' },
          { text: '방정식 없이는 불가능하다' },
        ],
        answerIndex: 0,
        note: '초과분 보존 관점(편차 합=0)은 방정식과 같은 구조의 다른 표상 — 표상을 갈아끼우는 것이 통합 능력이다.',
      },
    ],
    estimatedSec: 220,
  },

  // ───────────────────────────── REVERSE ─────────────────────────────
  {
    id: 'E.RV.001',
    mode: 'REVERSE',
    difficulty: 3,
    domain: 'ALG',
    requiredSkills: ['M1.ALG.EQ.01', 'M1.ALG.EQ.AX.01'],
    noveltyScore: 0.7,
    reasoningValue: 0.8,
    evidenceMap: { primaryDimension: 'reverseReasoning', secondaryDimensions: [{ dimension: 'strategySelection', evidenceFraction: 0.3 }], exclusionDimensions: ['generalization', 'explanation', 'novelTransfer'] },
    noveltySignature: { representationType: '조건 문장', requiredSkillCombination: [], dominantReasoningMove: 'reverse-construction', structuralPattern: '결과에서 원상황 재구성', solutionFamily: ['backward-chaining'] },
    stem: '방정식 3x + a = 2x + 7의 해가 x = −2라고 합니다. 상수 a의 값은?',
    choices: [{ text: '9' }, { text: '5', eliteTag: 'CARELESS' }, { text: '−9', eliteTag: 'STRATEGY' }, { text: '−5' }],
    answerIndex: 0,
    hints: {
      A: '"해"란 대입했을 때 등식이 성립하는 수예요 — 방향을 뒤집어 보세요.',
      B: 'x 자리에 −2를 넣어 a에 대한 식으로 바꿔요.',
      C: '3(−2)+a = 2(−2)+7 — 이제 a의 방정식이에요.',
      D: '−6+a = 3 → a = 9.',
    },
    solution: '해를 대입하면 미지수가 a로 바뀐다: −6+a=−4+7=3 → a=9. "x를 구하라"의 역방향 — 답에서 조건을 복원하는 사고.',
    followUps: [
      {
        id: 'E.RV.001.f1',
        dimension: 'reverseReasoning',
        prompt: '해가 x=−2인 "또 다른" 방정식을 만들려면 다음 중 옳은 전략은?',
        choices: [
          { text: 'x=−2를 넣었을 때 양변이 같아지도록 아무 식이나 세운다' },
          { text: '반드시 3x+9=2x+7 꼴이어야 한다', eliteTag: 'GENERALIZATION' },
          { text: '해가 −2인 방정식은 하나뿐이다', eliteTag: 'GENERALIZATION' },
          { text: '우변이 7인 방정식만 가능하다' },
        ],
        answerIndex: 0,
        note: '같은 해를 갖는 방정식은 무한히 많다 — "해"는 방정식의 성질이지 방정식 그 자체가 아니다.',
      },
    ],
    estimatedSec: 150,
  },
  {
    id: 'E.RV.002',
    mode: 'REVERSE',
    difficulty: 4,
    domain: 'GEO',
    requiredSkills: ['M1.GEO.POLY.01', 'M1.GEO.POLY.02'],
    noveltyScore: 0.65,
    reasoningValue: 0.75,
    evidenceMap: { primaryDimension: 'reverseReasoning', secondaryDimensions: [], exclusionDimensions: ['generalization', 'explanation', 'novelTransfer', 'flexibility'] },
    noveltySignature: { representationType: '조건 문장', requiredSkillCombination: [], dominantReasoningMove: 'reverse-construction', structuralPattern: '조건 집합에서 대상 결정', solutionFamily: ['constraint-elimination'] },
    stem: '어떤 다각형의 대각선의 개수가 20개입니다. 이 다각형의 내각의 크기의 합은?',
    choices: [{ text: '1080°' }, { text: '900°', eliteTag: 'CARELESS' }, { text: '1260°', eliteTag: 'STRATEGY' }, { text: '1440°' }],
    answerIndex: 0,
    hints: {
      A: '대각선 개수에서 변의 수 n을 먼저 복원해야 해요.',
      B: 'n(n−3)/2 = 20 — n에 대한 식으로 표현.',
      C: 'n(n−3)=40이 되는 자연수 n을 찾은 뒤, 내각합 공식으로.',
      D: 'n=8 → (8−2)×180°.',
    },
    solution: 'n(n−3)/2=20 → n(n−3)=40 → n=8. 내각합 = 6×180° = 1080°. 공식 두 개를 역방향·정방향으로 연달아 쓰는 이중 단계.',
    followUps: [],
    estimatedSec: 190,
  },

  // ───────────────────────────── GENERALIZATION ─────────────────────────────
  {
    id: 'E.GN.001',
    mode: 'GENERALIZATION',
    difficulty: 4,
    domain: 'ALG',
    requiredSkills: ['M1.ALG.PAT.01', 'M1.ALG.VAL.01'],
    noveltyScore: 0.75,
    reasoningValue: 0.9,
    evidenceMap: { primaryDimension: 'generalization', secondaryDimensions: [{ dimension: 'representation', evidenceFraction: 0.3 }], exclusionDimensions: ['reverseReasoning', 'novelTransfer', 'flexibility'] },
    noveltySignature: { representationType: '패턴', requiredSkillCombination: [], dominantReasoningMove: 'generalize-pattern', structuralPattern: '수 배열 규칙의 일반항', solutionFamily: ['first-term-anchoring'] },
    stem: '정사각형 탁자를 한 줄로 이어 붙입니다. 탁자 1개에는 4명이 앉을 수 있고, 2개를 붙이면 6명, 3개를 붙이면 8명이 앉을 수 있습니다. 탁자 n개를 붙였을 때 앉을 수 있는 사람 수를 나타내는 식은?',
    choices: [{ text: '2n + 2' }, { text: '4n − 2', eliteTag: 'GENERALIZATION' }, { text: '3n + 1', eliteTag: 'CARELESS' }, { text: '4n' }],
    answerIndex: 0,
    hints: {
      A: '탁자가 1개 늘 때마다 몇 명이 늘어나는지 관찰해요.',
      B: '"처음 값 + 증가량×(개수)" 구조로 표현해 보세요.',
      C: '증가량 2, 그리고 양 끝 2자리 — 4, 6, 8, …의 규칙.',
      D: '2n + 2에 n=1,2,3을 대입해 검산하세요.',
    },
    solution: '탁자당 위·아래 2자리(2n) + 양 끝 2자리 = 2n+2. n=1→4 ✓, n=2→6 ✓. 낱개 세기가 아니라 구조(줄의 양끝)를 보는 일반화.',
    followUps: [
      {
        id: 'E.GN.001.f1',
        dimension: 'generalization',
        prompt: '탁자를 한 줄이 아니라 "ㄱ자"로 꺾어 붙이면, 위 식은 어떻게 될까요?',
        choices: [
          { text: '꺾인 안쪽 모서리에서 자리가 줄어들므로 2n+2보다 작아질 수 있다' },
          { text: '항상 2n+2 그대로다', eliteTag: 'GENERALIZATION' },
          { text: '항상 2n+4가 된다' },
          { text: '규칙이 사라진다' },
        ],
        answerIndex: 0,
        note: '일반화의 다음 단계는 "조건이 바뀌면 어떤 가정이 무너지는가"를 보는 것 — 양끝 2자리 가정이 꺾임에서 수정된다.',
      },
      {
        id: 'E.GN.001.f2',
        dimension: 'explanation',
        prompt: '2n+2가 옳은 이유를 가장 구조적으로 설명한 것은?',
        choices: [
          { text: '4, 6, 8이 2씩 커지니까 2n+2다', eliteTag: 'JUSTIFICATION' },
          { text: '각 탁자의 위·아래 2자리가 n개(2n), 줄의 양 끝이 2자리 — 합쳐서 2n+2' },
          { text: 'n=3일 때 8이 나오는 식을 찾으면 된다', eliteTag: 'JUSTIFICATION' },
          { text: '탁자 4자리에서 겹침을 빼면 된다고 외운다' },
        ],
        answerIndex: 1,
        note: '수열 관찰(1안)은 추측이고, 구조 분해(2안)가 설명이다 — "왜"에 답하는 것.',
      },
    ],
    estimatedSec: 200,
  },
  {
    id: 'E.GN.002',
    mode: 'GENERALIZATION',
    difficulty: 5,
    domain: 'NUM',
    requiredSkills: ['M1.NUM.SIGN.02', 'M1.NUM.POW.01'],
    noveltyScore: 0.8,
    reasoningValue: 0.9,
    evidenceMap: { primaryDimension: 'generalization', secondaryDimensions: [{ dimension: 'strategySelection', evidenceFraction: 0.3 }], exclusionDimensions: ['reverseReasoning', 'novelTransfer', 'flexibility'] },
    noveltySignature: { representationType: '수열', requiredSkillCombination: [], dominantReasoningMove: 'generalize-pattern', structuralPattern: '거듭제곱 수열의 구조 일반화', solutionFamily: ['structure-extraction'] },
    stem: '(−1) + (−1)² + (−1)³ + ⋯ + (−1)ⁿ 의 값을 n에 따라 나타내면?',
    choices: [
      { text: 'n이 짝수면 0, 홀수면 −1' },
      { text: '항상 0', eliteTag: 'GENERALIZATION' },
      { text: 'n이 짝수면 1, 홀수면 0', eliteTag: 'CARELESS' },
      { text: '항상 −1' },
    ],
    answerIndex: 0,
    hints: {
      A: '처음 몇 항을 직접 계산해 패턴을 관찰해요: n=1, 2, 3, 4…',
      B: '이웃한 두 항 (−1)+(+1)을 묶으면 무엇이 보이나요?',
      C: '쌍으로 소거되는 구조 — n의 짝·홀이 남는 항을 결정해요.',
      D: 'n=2k면 k쌍이 전부 소거 → 0. n=2k+1이면 −1 하나가 남아요.',
    },
    solution: '(−1)+1 쌍이 소거. 짝수 n → 0, 홀수 n → 마지막 −1이 남아 −1. 유한 계산을 "모든 n"으로 끌어올리는 일반화 + 거듭제곱 부호 구조.',
    followUps: [
      {
        id: 'E.GN.002.f1',
        dimension: 'generalization',
        prompt: '같은 아이디어로 (−2)+(−2)²+(−2)³+(−2)⁴의 값을 빠르게 구하는 전략은?',
        choices: [
          { text: '이웃 항을 묶어 공통 구조를 찾는다: (−2)(1+(−2)) + (−2)³(1+(−2))' },
          { text: '전부 따로 계산하는 수밖에 없다', eliteTag: 'STRATEGY' },
          { text: '짝수 개면 무조건 0이다', eliteTag: 'GENERALIZATION' },
          { text: '(−2)⁴이 제일 크니 부호는 +다 — 그걸로 끝' },
        ],
        answerIndex: 0,
        note: '−1에서 얻은 "쌍 묶기" 구조가 다른 밑에도 이식된다 — 단, 소거가 아니라 공통인수 (1+밑)이 남는다는 차이까지 보는 것이 전이.',
      },
    ],
    estimatedSec: 210,
  },

  // ───────────────────────────── ERROR_ANALYSIS (PART 21) ─────────────────────────────
  {
    id: 'E.EA.001',
    mode: 'ERROR_ANALYSIS',
    difficulty: 3,
    domain: 'ALG',
    requiredSkills: ['M1.ALG.EXP.02', 'M1.ALG.EQ.02'],
    noveltyScore: 0.6,
    reasoningValue: 0.85,
    evidenceMap: { primaryDimension: 'justification', secondaryDimensions: [{ dimension: 'explanation', evidenceFraction: 0.5 }], exclusionDimensions: ['novelTransfer', 'reverseReasoning', 'flexibility'] },
    noveltySignature: { representationType: '오답 풀이', requiredSkillCombination: [], dominantReasoningMove: 'error-detection', structuralPattern: '단계별 풀이 감사(대수)', solutionFamily: ['step-audit'] },
    stem: '다음은 학생 A가 방정식 2(x−3) = 4x + 2를 푼 과정입니다.\n① 2x − 3 = 4x + 2\n② 2x − 4x = 2 + 3\n③ −2x = 5\n④ x = −5/2\n처음으로 잘못된 단계는?',
    choices: [{ text: '① — 분배에서 −3에 2를 곱하지 않았다' }, { text: '② — 이항 부호가 틀렸다', eliteTag: 'JUSTIFICATION' }, { text: '③ — 동류항 정리가 틀렸다' }, { text: '④ — 나눗셈 부호가 틀렸다' }],
    answerIndex: 0,
    hints: {
      A: '각 단계에서 "무엇이 바뀌었는지"만 따로 관찰해요.',
      B: '①에서 좌변 2(x−3)이 어떻게 전개됐는지 원식과 비교해요.',
      C: '분배법칙은 괄호 안 모든 항에 — 2(x−3) = 2x−6이어야 해요.',
      D: '①이 2x−6이었어야 하므로 이후는 모두 오염된 계산이에요.',
    },
    solution: '①에서 2(x−3)을 2x−3으로 전개 — 분배 누락(MIS.EXP.DISTR의 전형). 이후 단계는 그 오류를 물려받았을 뿐 절차는 옳다. "처음 잘못된 곳"을 찾는 것이 메타인지 훈련의 핵심.',
    followUps: [
      {
        id: 'E.EA.001.f1',
        dimension: 'justification',
        prompt: '학생 A에게 해 줄 가장 정확한 교정 설명은?',
        choices: [
          { text: '"계산 실수니까 더 조심해"', eliteTag: 'JUSTIFICATION' },
          { text: '"괄호 앞 수는 괄호 안 모든 항에 곱해야 해 — −3에도 2를 곱해 −6"' },
          { text: '"이항할 때 부호를 바꿔야 해"' },
          { text: '"양변을 2로 먼저 나눴어야 해"' },
        ],
        answerIndex: 1,
        note: '교정은 오류의 기제를 짚어야 한다 — "조심해"는 기제가 없고, 3·4안은 다른 단계 이야기다.',
      },
    ],
    estimatedSec: 170,
  },
  {
    id: 'E.EA.002',
    mode: 'ERROR_ANALYSIS',
    difficulty: 4,
    domain: 'STA',
    requiredSkills: ['M1.STA.AVG.01', 'M1.STA.AVG.02'],
    noveltyScore: 0.7,
    reasoningValue: 0.8,
    evidenceMap: { primaryDimension: 'justification', secondaryDimensions: [{ dimension: 'explanation', evidenceFraction: 0.5 }], exclusionDimensions: ['novelTransfer', 'reverseReasoning', 'flexibility'] },
    noveltySignature: { representationType: '오답 풀이', requiredSkillCombination: [], dominantReasoningMove: 'error-detection', structuralPattern: '그럴듯한 논증의 결함 식별', solutionFamily: ['argument-audit'] },
    stem: '학생 B의 주장: "우리 반 남학생 10명의 평균 키는 160cm, 여학생 20명의 평균 키는 154cm다. 따라서 반 전체 평균은 (160+154)÷2 = 157cm다."\n이 주장에서 잘못된 점은?',
    choices: [
      { text: '인원수가 다르므로 단순 평균이 아니라 가중 평균(전체 합÷전체 인원)을 써야 한다' },
      { text: '평균끼리는 더할 수 없으므로 애초에 계산 불가다', eliteTag: 'JUSTIFICATION' },
      { text: '반올림을 안 해서 틀렸다', eliteTag: 'CARELESS' },
      { text: '잘못 없다 — 157cm가 맞다' },
    ],
    answerIndex: 0,
    hints: {
      A: '두 집단의 인원수가 같은지 관찰해요.',
      B: '전체 평균의 정의로 돌아가요: (모든 키의 합) ÷ (전체 인원).',
      C: '남학생 합 = 1600, 여학생 합 = 3080 — 전체 합과 인원으로.',
      D: '4680 ÷ 30 = 156cm ≠ 157cm.',
    },
    solution: '평균의 평균은 인원이 같을 때만 전체 평균과 일치한다. 옳은 계산: (10·160+20·154)/30 = 156cm. 그럴듯한 오류의 기제를 식별하는 훈련.',
    followUps: [],
    estimatedSec: 180,
  },

  // ───────────────────────────── MULTIPLE_SOLUTION (PART 20) ─────────────────────────────
  {
    id: 'E.MU.001',
    mode: 'MULTIPLE_SOLUTION',
    difficulty: 4,
    domain: 'ALG',
    requiredSkills: ['M1.ALG.EQ.03', 'M1.ALG.EQ.AX.01'],
    noveltyScore: 0.65,
    reasoningValue: 0.9,
    evidenceMap: { primaryDimension: 'flexibility', secondaryDimensions: [{ dimension: 'strategySelection', evidenceFraction: 0.6 }], exclusionDimensions: ['generalization', 'reverseReasoning', 'novelTransfer'] },
    noveltySignature: { representationType: '문장', requiredSkillCombination: [], dominantReasoningMove: 'method-comparison', structuralPattern: '동일 답 복수 경로(대수)', solutionFamily: ['algebraic', 'arithmetic-shortcut'] },
    stem: '연속하는 세 홀수의 합이 51입니다. 세 수 중 가장 작은 수는? (두 가지 방법을 모두 생각해 보세요: ① 가운데 수를 x로 ② 가장 작은 수를 x로)',
    choices: [{ text: '15' }, { text: '17', eliteTag: 'CARELESS' }, { text: '13' }, { text: '19' }],
    answerIndex: 0,
    hints: {
      A: '연속 홀수는 2씩 차이 나요.',
      B: '① 가운데를 x로: (x−2)+x+(x+2). ② 최소를 x로: x+(x+2)+(x+4).',
      C: '①에서는 소거가 일어나 3x=51 — 대칭을 이용한 표현이 계산을 줄여요.',
      D: '① x=17 → 최소 15. ②로도 3x+6=51 → x=15로 같은 답.',
    },
    solution: '① 대칭 표현: 3x=51, x=17, 최소 15. ② 직접 표현: 3x+6=51, x=15. 같은 답, 다른 구조 — ①은 소거로 계산이 가볍다.',
    altSolution: '가장 작은 수를 x로: x+(x+2)+(x+4)=51 → 3x+6=51 → x=15.',
    followUps: [
      {
        id: 'E.MU.001.f1',
        dimension: 'flexibility',
        prompt: '두 방법 중 ①(가운데를 x)이 더 효율적인 이유는?',
        choices: [
          { text: '대칭으로 ±2가 소거되어 상수항 없이 3x=합 이 된다' },
          { text: '홀수는 항상 가운데부터 놓아야 하기 때문', eliteTag: 'STRATEGY' },
          { text: '②는 답이 다르게 나오기 때문', eliteTag: 'JUSTIFICATION' },
          { text: '①이 더 어려워 보이기 때문' },
        ],
        answerIndex: 0,
        note: '효율의 근거는 "대칭 소거"라는 구조 — 방법 선택이 계산량을 바꾼다는 자각이 전략 유연성의 시작.',
      },
      {
        id: 'E.MU.001.f2',
        dimension: 'strategySelection',
        prompt: '"연속한 다섯 홀수의 합이 105"라면 어떤 표현이 가장 유리할까요?',
        choices: [{ text: '한가운데 수를 x로 — 5x=105가 된다' }, { text: '최소를 x로 — 5x+20=105' }, { text: '최대를 x로 — 5x−20=105' }, { text: '아무거나 같다 — 차이가 전혀 없다' }],
        answerIndex: 0,
        note: '홀수 개수의 연속수는 가운데 대칭 표현이 항상 상수항을 소거한다 — 방법이 이식되는 것을 확인.',
      },
    ],
    estimatedSec: 210,
  },
  {
    id: 'E.MU.002',
    mode: 'MULTIPLE_SOLUTION',
    difficulty: 4,
    domain: 'FUN',
    requiredSkills: ['M1.FUN.AREA.01', 'M1.FUN.COORD.01'],
    noveltyScore: 0.7,
    reasoningValue: 0.8,
    evidenceMap: { primaryDimension: 'flexibility', secondaryDimensions: [{ dimension: 'strategySelection', evidenceFraction: 0.6 }], exclusionDimensions: ['generalization', 'reverseReasoning', 'novelTransfer'] },
    noveltySignature: { representationType: '문장', requiredSkillCombination: [], dominantReasoningMove: 'method-comparison', structuralPattern: '동일 답 복수 경로(비례)', solutionFamily: ['unit-rate', 'ratio-table'] },
    stem: '네 점 A(1,1), B(5,1), C(5,4), D(1,4)로 만든 직사각형을 대각선 AC로 자르면 삼각형 두 개가 됩니다. 삼각형 ABC의 넓이는? (① 직사각형 절반 ② 밑변×높이 두 방법으로)',
    choices: [{ text: '6' }, { text: '12', eliteTag: 'CARELESS' }, { text: '7.5' }, { text: '3' }],
    answerIndex: 0,
    hints: {
      A: '직사각형의 가로·세로부터 좌표로 구해요.',
      B: '① 직사각형 넓이의 절반, ② AB를 밑변으로 한 삼각형 공식 — 둘 다 세워 보세요.',
      C: '가로 4, 세로 3 — ①: 12÷2, ②: ½×4×3.',
      D: '두 방법 모두 6 — 서로 검산이 돼요.',
    },
    solution: '① 4×3=12의 절반=6. ② ½·AB(4)·높이(3)=6. 두 풀이가 서로를 검산한다 — 복수 풀이의 실용 가치.',
    altSolution: '½ × 밑변 AB(4) × 높이 BC(3) = 6.',
    followUps: [
      {
        id: 'E.MU.002.f1',
        dimension: 'explanation',
        prompt: '"대각선이 직사각형을 정확히 절반으로 나눈다"의 가장 좋은 근거는?',
        choices: [
          { text: '그림에서 그렇게 보이기 때문', eliteTag: 'JUSTIFICATION' },
          { text: '두 삼각형이 세 변이 서로 같아 합동이기 때문' },
          { text: '넓이를 계산해 보니 우연히 같았기 때문', eliteTag: 'JUSTIFICATION' },
          { text: '모든 사각형에서 대각선은 넓이를 절반으로 나누기 때문' },
        ],
        answerIndex: 1,
        note: '"보인다"와 "우연히 같다"는 근거가 아니다. 합동(변-변-변)이 절반의 이유이고, 4안은 일반 사각형에선 거짓이다.',
      },
    ],
    estimatedSec: 190,
  },

  // ───────────────────────────── APPLICATION / PROOF-lite ─────────────────────────────
  {
    id: 'E.AP.001',
    mode: 'APPLICATION',
    difficulty: 3,
    domain: 'FUN',
    requiredSkills: ['M1.FUN.PROP.03', 'M1.FUN.PROP.04'],
    noveltyScore: 0.6,
    reasoningValue: 0.7,
    evidenceMap: { primaryDimension: 'representation', secondaryDimensions: [{ dimension: 'strategySelection', evidenceFraction: 0.3 }], exclusionDimensions: ['generalization', 'reverseReasoning', 'justification'] },
    noveltySignature: { representationType: '실생활 문장', requiredSkillCombination: [], dominantReasoningMove: 'multi-rep-translation', structuralPattern: '실상황의 수학 모델링', solutionFamily: ['equation-setup'] },
    stem: '물탱크를 채우는 데 수도꼭지 4개로 45분이 걸립니다. 같은 굵기의 수도꼭지 6개로 채우면 몇 분이 걸릴까요? (수도꼭지 수와 시간의 관계를 먼저 판단하세요)',
    choices: [{ text: '30분' }, { text: '67.5분', eliteTag: 'REPRESENTATION' }, { text: '20분', eliteTag: 'CARELESS' }, { text: '40분' }],
    answerIndex: 0,
    hints: {
      A: '꼭지가 늘면 시간이 줄어요 — 정비례일까요, 반비례일까요?',
      B: '(꼭지 수)×(시간)이 일정한 "일의 양"이라는 표로 바꿔 보세요.',
      C: '4×45 = 6×t — 곱 일정.',
      D: 't = 180/6 = 30분.',
    },
    solution: '일의 총량 = 꼭지수×시간 = 180 (일정) → 반비례. 6개면 30분. "어느 비례인가"의 판단(표상 전환)이 관문이고, 정비례로 세우면 67.5분이라는 함정에 빠진다.',
    followUps: [],
    estimatedSec: 160,
  },
  {
    id: 'E.PR.001',
    mode: 'PROOF',
    difficulty: 4,
    domain: 'NUM',
    requiredSkills: ['M1.NUM.SIGN.01', 'M1.ALG.EXP.01'],
    noveltyScore: 0.75,
    reasoningValue: 0.95,
    evidenceMap: { primaryDimension: 'justification', secondaryDimensions: [{ dimension: 'explanation', evidenceFraction: 0.5 }, { dimension: 'generalization', evidenceFraction: 0.3 }], exclusionDimensions: ['novelTransfer', 'flexibility'] },
    noveltySignature: { representationType: '논증 선택', requiredSkillCombination: [], dominantReasoningMove: 'deductive-argument', structuralPattern: '성질의 연역적 근거 선별', solutionFamily: ['symbolic-representation'] },
    stem: '"연속하는 두 홀수의 합은 항상 4의 배수이다." 이 주장을 판정하고, 옳다면 그 이유로 가장 완전한 것을 고르세요.',
    choices: [
      { text: '옳다 — 홀수를 2k+1로 놓으면 (2k+1)+(2k+3) = 4k+4 = 4(k+1)' },
      { text: '옳다 — 3+5=8, 7+9=16처럼 다 4의 배수다', eliteTag: 'JUSTIFICATION' },
      { text: '틀리다 — 1+3=4지만 5+7=12는 4의 배수가 아니다', eliteTag: 'CARELESS' },
      { text: '틀리다 — 홀수의 합은 짝수일 뿐 4의 배수라는 보장은 없다' },
    ],
    answerIndex: 0,
    hints: {
      A: '몇 가지 예로 참·거짓을 먼저 짐작해요 (3+5, 7+9, 11+13…).',
      B: '"모든" 홀수를 다루려면 홀수를 문자로 표현해야 해요: 2k+1.',
      C: '연속 홀수는 2k+1과 2k+3 — 합을 문자식으로 정리해요.',
      D: '4k+4 = 4(k+1) — 4로 묶이면 4의 배수라는 뜻이에요.',
    },
    solution: '예시(2안)는 확인이지 증명이 아니다. 문자 표현으로 모든 경우를 덮는 1안이 완전한 근거 — 중1 수준의 대수적 정당화 훈련.',
    followUps: [
      {
        id: 'E.PR.001.f1',
        dimension: 'generalization',
        prompt: '같은 방법으로 "연속하는 두 짝수의 합"에 대해 말할 수 있는 것은?',
        choices: [{ text: '2k+(2k+2)=4k+2 — 4의 배수가 아니라 "4로 나눈 나머지 2"인 짝수다' }, { text: '역시 항상 4의 배수다', eliteTag: 'GENERALIZATION' }, { text: '홀수가 된다' }, { text: '규칙이 없다' }],
        answerIndex: 0,
        note: '같은 도구(문자 표현)가 다른 결론을 정확히 가려낸다 — 도구의 이식과 결론의 구별을 동시에.',
      },
    ],
    estimatedSec: 220,
  },
];

// ---------------------------------------------------------------------------
// PART 38 — 노출 전 기계 검증 (수학적 정합은 저작 시 수기 + 여기서 구조 검증)
// ---------------------------------------------------------------------------
// Phase 3 STEP 9: Bank 2.0 — 파일럿 15문항 + 확장 35문항 = 50문항 (모드별 ≥5)
export const ELITE_BANK: EliteProblem[] = [...ELITE_BANK_BASE, ...ELITE_BANK_EXT];

export function validateEliteBank(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const p of ELITE_BANK) {
    if (ids.has(p.id)) issues.push(`${p.id}: 중복 id`);
    ids.add(p.id);
    if (p.choices.length !== 4) issues.push(`${p.id}: 보기 4개 아님`);
    if (p.answerIndex < 0 || p.answerIndex >= p.choices.length) issues.push(`${p.id}: answerIndex 범위 밖`);
    const texts = new Set(p.choices.map((c) => c.text));
    if (texts.size !== p.choices.length) issues.push(`${p.id}: 보기 중복`);
    for (const s of p.requiredSkills) if (!MICRO_SKILL_MAP[s]) issues.push(`${p.id}: 필요 스킬 ${s} 미존재`);
    if (!p.hints.A || !p.hints.B || !p.hints.C || !p.hints.D) issues.push(`${p.id}: 힌트 사다리 A-D 불완전`);
    if (p.mode === 'MULTIPLE_SOLUTION' && !p.altSolution) issues.push(`${p.id}: MULTIPLE_SOLUTION인데 altSolution 없음`);
    if (p.mode === 'MULTI_SKILL' && p.requiredSkills.length < 2) issues.push(`${p.id}: MULTI_SKILL인데 필요 스킬 1개`);
    if (p.noveltyScore < 0 || p.noveltyScore > 1 || p.reasoningValue < 0 || p.reasoningValue > 1) issues.push(`${p.id}: novelty/reasoning 범위 밖`);
    for (const f of p.followUps) {
      if (f.answerIndex < 0 || f.answerIndex >= f.choices.length) issues.push(`${f.id}: followUp answerIndex 범위 밖`);
      if (!f.note) issues.push(`${f.id}: followUp 해설 없음`);
    }
    // Phase 3 PART 13 — novelty 서명 전수 + OPEN_ENDED 루브릭 필수
    if (!p.noveltySignature) issues.push(`${p.id}: noveltySignature 미선언`);
    if (p.mode === 'OPEN_ENDED' && (!p.rubric || p.rubric.criteria.length !== 5)) issues.push(`${p.id}: OPEN_ENDED인데 5단계 rubric 없음`);
    // Phase 3 PART 19/20 — 증거 지도 전수 선언 + 정합성
    if (!p.evidenceMap) issues.push(`${p.id}: evidenceMap 미선언`);
    else {
      const m = p.evidenceMap;
      if (m.exclusionDimensions.includes(m.primaryDimension)) issues.push(`${p.id}: primary가 배제 목록에 있음`);
      for (const sec of m.secondaryDimensions) {
        if (sec.evidenceFraction <= 0 || sec.evidenceFraction > 1) issues.push(`${p.id}: evidenceFraction 범위 밖 (${sec.dimension})`);
        if (sec.dimension === m.primaryDimension) issues.push(`${p.id}: secondary가 primary와 중복`);
        if (m.exclusionDimensions.includes(sec.dimension)) issues.push(`${p.id}: secondary가 배제 목록에 있음 (${sec.dimension})`);
      }
    }
  }
  // Phase 3 PART 13 — 유사 복제 거부: 같은 모드에서 reasoning move × 구조 패턴이 겹치면 reject
  const sigSeen = new Map();
  for (const p of ELITE_BANK) {
    if (!p.noveltySignature) continue;
    const key = `${p.mode}::${p.noveltySignature.dominantReasoningMove}::${p.noveltySignature.structuralPattern}`;
    if (sigSeen.has(key)) issues.push(`${p.id}: ${sigSeen.get(key)}와 novelty 서명 중복 (${key})`);
    sigSeen.set(key, p.id);
  }
  // Phase 3 PART 12 — 모드별 본문 ≥5
  const byMode = new Map();
  for (const p of ELITE_BANK) byMode.set(p.mode, (byMode.get(p.mode) ?? 0) + 1);
  for (const [mode, n] of byMode) if (n < 5) issues.push(`mode ${mode}: 본문 ${n}개 (<5)`);
  return { ok: issues.length === 0, issues };
}

export const ELITE_BANK_MAP: Record<string, EliteProblem> = Object.fromEntries(ELITE_BANK.map((p) => [p.id, p]));
