// Curriculum Knowledge Graph — 코드가 아니라 데이터.
// 교육과정 변경 시 이 파일(향후 JSON/DB)만 수정한다. 단원명을 다른 코드에 하드코딩하지 않는다.
// 트랙: 중학교는 학년(중1~3), 고등학교는 2022 개정 교육과정 과목 단위.
import type { SkillDef, SkillId, TrackDef, TrackId } from '../engine/types.ts';

export const TRACKS: TrackDef[] = [
  { id: 'M1', name: '중1', emoji: '🌱', category: 'middle', description: '정수와 유리수 · 문자와 식 · 일차방정식 · 좌표와 그래프 · 기본 도형 · 통계', prereqTracks: [], hasContent: true },
  { id: 'M2', name: '중2', emoji: '🌿', category: 'middle', description: '식의 계산 · 부등식 · 연립방정식 · 일차함수 · 도형의 성질 · 확률', prereqTracks: ['M1'], hasContent: true },
  { id: 'M3', name: '중3', emoji: '🌳', category: 'middle', description: '제곱근과 실수 · 인수분해 · 이차방정식 · 이차함수 · 삼각비 · 통계', prereqTracks: ['M2'], hasContent: true },
  { id: 'H.CM1', name: '공통수학1', emoji: '📘', category: 'high-common', description: '다항식 · 방정식과 부등식 · 경우의 수 · 행렬 (고1)', prereqTracks: ['M3'], hasContent: false },
  { id: 'H.CM2', name: '공통수학2', emoji: '📙', category: 'high-common', description: '도형의 방정식 · 집합과 명제 · 함수와 그래프 (고1)', prereqTracks: ['H.CM1'], hasContent: false },
  { id: 'H.ALG', name: '대수', emoji: '🧮', category: 'high-elective', description: '지수·로그함수 · 삼각함수 · 수열', prereqTracks: ['H.CM2'], hasContent: false },
  { id: 'H.CAL1', name: '미적분Ⅰ', emoji: '📈', category: 'high-elective', description: '함수의 극한 · 미분 · 적분', prereqTracks: ['H.CM2'], hasContent: false },
  { id: 'H.PRB', name: '확률과 통계', emoji: '🎲', category: 'high-elective', description: '순열·조합 · 확률 · 통계적 추정', prereqTracks: ['H.CM2'], hasContent: false },
  { id: 'H.CAL2', name: '미적분Ⅱ', emoji: '🚀', category: 'high-career', description: '수열의 극한 · 여러 함수의 미분·적분', prereqTracks: ['H.CAL1'], hasContent: false },
  { id: 'H.GEO', name: '기하', emoji: '📐', category: 'high-career', description: '이차곡선 · 공간도형 · 벡터', prereqTracks: ['H.CM2'], hasContent: false },
];

export const TRACK_MAP: Record<string, TrackDef> = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

export const SKILLS: SkillDef[] = [
  // ================= 중1 =================
  {
    id: 'M1.NUM.INT',
    grade: 'M1',
    domain: 'NUM',
    name: '정수와 유리수',
    icon: '🔢',
    color: '#3b82f6',
    description: '음수를 포함한 사칙연산과 유리수 계산',
    prerequisites: [],
    conceptCard:
      '정수는 음수·0·양수를 포함해요. 덧셈·뺄셈에서는 부호를 먼저 정리하고, 곱셈·나눗셈에서는 (음수 개수가 짝수면 +, 홀수면 −)를 기억해요. 혼합 계산은 괄호 → 거듭제곱 → 곱셈·나눗셈 → 덧셈·뺄셈 순서!',
    playable: true,
  },
  {
    id: 'M1.ALG.EXP',
    grade: 'M1',
    domain: 'ALG',
    name: '문자와 식',
    icon: '✏️',
    color: '#8b5cf6',
    description: '문자를 사용한 식, 동류항 정리, 식의 값',
    prerequisites: ['M1.NUM.INT'],
    conceptCard:
      '문자는 아직 모르는 수를 대신하는 기호예요. 동류항(문자와 차수가 같은 항)끼리만 더하고 뺄 수 있어요. 식의 값을 구할 때는 문자에 수를 "부호까지 괄호에 넣어" 대입해요.',
    playable: true,
  },
  {
    id: 'M1.ALG.EQ',
    grade: 'M1',
    domain: 'ALG',
    name: '일차방정식',
    icon: '⚖️',
    color: '#ec4899',
    description: '등식의 성질, 이항, 일차방정식의 풀이와 활용',
    prerequisites: ['M1.ALG.EXP'],
    conceptCard:
      '방정식은 양팔저울이에요. 양쪽에 같은 일을 하면 균형이 유지돼요. 이항할 때는 부호가 바뀌어요. 문장제는 "모르는 것을 x로 → 같은 양을 두 가지로 표현 → 등식 세우기" 순서로!',
    playable: true,
  },
  {
    id: 'M1.FUN.COORD',
    grade: 'M1',
    domain: 'FUN',
    name: '좌표평면과 그래프',
    icon: '📍',
    color: '#10b981',
    description: '순서쌍, 사분면, 그래프 읽기',
    prerequisites: ['M1.NUM.INT'],
    conceptCard:
      '좌표는 (가로 x, 세로 y) 순서예요. 사분면은 오른쪽 위부터 반시계 방향으로 1→2→3→4. 각 사분면의 부호: 1(+,+), 2(−,+), 3(−,−), 4(+,−)를 기억해요.',
    playable: true,
  },
  {
    id: 'M1.FUN.PROP',
    grade: 'M1',
    domain: 'FUN',
    name: '정비례와 반비례',
    icon: '📈',
    color: '#22c55e',
    description: 'y=ax와 y=a/x 관계, 그래프와 활용',
    prerequisites: ['M1.FUN.COORD', 'M1.ALG.EXP'],
    conceptCard:
      '정비례 y=ax: x가 2배 되면 y도 2배. 반비례 y=a/x: x가 2배 되면 y는 절반. 어느 쪽이든 한 쌍의 (x,y)만 알면 a를 구할 수 있어요. a = y÷x (정비례) 또는 a = x×y (반비례).',
    playable: true,
  },
  {
    id: 'M1.GEO.BASIC',
    grade: 'M1',
    domain: 'GEO',
    name: '기본 도형과 각',
    icon: '📐',
    color: '#f59e0b',
    description: '각의 성질, 평행선과 동위각·엇각, 다각형의 각',
    prerequisites: [],
    conceptCard:
      '평각은 180°, 맞꼭지각은 서로 같아요. 평행선에서 동위각·엇각도 같아요. n각형의 내각의 합은 180°×(n−2) — 삼각형 180°에서 출발해 삼각형 개수를 세는 원리예요.',
    playable: true,
  },
  {
    id: 'M1.STA.DATA',
    grade: 'M1',
    domain: 'STA',
    name: '자료의 정리와 해석',
    icon: '📊',
    color: '#06b6d4',
    description: '평균, 도수분포, 상대도수',
    prerequisites: ['M1.NUM.INT'],
    conceptCard:
      '평균 = (전체 합) ÷ (개수). 거꾸로 (평균 × 개수 = 전체 합)도 자주 써요. 상대도수 = (그 계급의 도수) ÷ (전체 도수)이고, 상대도수의 합은 항상 1이에요.',
    playable: true,
  },

  // ================= 중2 =================
  {
    id: 'M2.ALG.MONO',
    grade: 'M2',
    domain: 'ALG',
    name: '식의 계산',
    icon: '🧩',
    color: '#a855f7',
    description: '지수법칙, 단항식과 다항식의 계산',
    prerequisites: ['M1.ALG.EXP'],
    conceptCard:
      '지수법칙 3형제: 곱하면 지수를 더하고(aᵐ×aⁿ=aᵐ⁺ⁿ), 거듭제곱은 지수를 곱하고((aᵐ)ⁿ=aᵐⁿ), 나누면 지수를 빼요. 단항식 곱셈은 "계수는 계수끼리, 문자는 문자끼리"!',
    playable: true,
  },
  {
    id: 'M2.ALG.INEQ',
    grade: 'M2',
    domain: 'ALG',
    name: '일차부등식',
    icon: '🚦',
    color: '#f43f5e',
    description: '부등식의 성질과 풀이, 활용',
    prerequisites: ['M1.ALG.EQ'],
    conceptCard:
      '부등식은 방정식과 거의 같게 풀지만 단 하나의 결정적 차이 — 음수를 곱하거나 나누면 부등호 방향이 뒤집혀요! 이 한 가지가 부등식 오답의 대부분이에요.',
    playable: true,
  },
  {
    id: 'M2.ALG.SYS',
    grade: 'M2',
    domain: 'ALG',
    name: '연립방정식',
    icon: '🔗',
    color: '#6366f1',
    description: '미지수가 2개인 일차방정식, 대입법과 가감법',
    prerequisites: ['M1.ALG.EQ'],
    conceptCard:
      '미지수 2개는 식도 2개 필요해요. 전략은 하나 — "문자 하나를 없애기". 한 식을 다른 식에 넣는 대입법, 두 식을 더하거나 빼는 가감법 중 편한 쪽을 골라요.',
    playable: true,
  },
  {
    id: 'M2.FUN.LINEAR',
    grade: 'M2',
    domain: 'FUN',
    name: '일차함수',
    icon: '📉',
    color: '#14b8a6',
    description: 'y=ax+b의 그래프, 기울기와 절편, 활용',
    prerequisites: ['M1.FUN.PROP', 'M1.ALG.EQ'],
    conceptCard:
      'y = ax + b에서 a(기울기)는 "x가 1 커질 때 y의 변화", b(y절편)는 "출발점(x=0일 때의 y)"이에요. 기울기 = (y의 증가량) ÷ (x의 증가량) — 이 공식 하나로 대부분 풀려요.',
    playable: true,
  },
  {
    id: 'M2.GEO.TRI',
    grade: 'M2',
    domain: 'GEO',
    name: '도형의 성질',
    icon: '🔺',
    color: '#f97316',
    description: '이등변삼각형, 삼각형의 외각, 평행사변형',
    prerequisites: ['M1.GEO.BASIC'],
    conceptCard:
      '이등변삼각형: 두 밑각이 같다. 삼각형 외각 = 이웃하지 않는 두 내각의 합. 평행사변형: 대변·대각이 각각 같고, 이웃한 두 각의 합은 180°, 두 대각선은 서로를 이등분해요.',
    playable: true,
  },
  {
    id: 'M2.STA.PROB',
    grade: 'M2',
    domain: 'STA',
    name: '확률',
    icon: '🎲',
    color: '#0ea5e9',
    description: '경우의 수, 확률의 계산',
    prerequisites: ['M1.STA.DATA'],
    conceptCard:
      '확률 = (원하는 경우의 수) ÷ (전체 경우의 수). "그리고"는 곱하고, "또는"은 더해요. "적어도 하나"가 나오면 여사건(1 − 반대 확률)이 지름길!',
    playable: true,
  },

  // ================= 중3 =================
  {
    id: 'M3.NUM.SQRT',
    grade: 'M3',
    domain: 'NUM',
    name: '제곱근과 실수',
    icon: '🌿',
    color: '#2563eb',
    description: '제곱근의 뜻과 계산, 근호의 성질',
    prerequisites: ['M1.NUM.INT', 'M2.ALG.MONO'],
    conceptCard:
      '√a는 "제곱해서 a가 되는 양수". √a×√b=√(ab), √(a²b)=a√b로 근호 밖으로 꺼낼 수 있어요. 근호가 같은 항끼리만 더하고 빼요 — 마치 동류항처럼!',
    playable: true,
  },
  {
    id: 'M3.ALG.FACT',
    grade: 'M3',
    domain: 'ALG',
    name: '곱셈공식과 인수분해',
    icon: '🧱',
    color: '#9333ea',
    description: '곱셈공식, 다항식의 인수분해',
    prerequisites: ['M2.ALG.MONO'],
    conceptCard:
      '핵심 공식: (x+a)(x+b) = x²+(a+b)x+ab, (a±b)² = a²±2ab+b², (a+b)(a−b) = a²−b². 인수분해는 전개의 역주행 — "합이 b, 곱이 c인 두 수 찾기"가 기본기예요.',
    playable: true,
  },
  {
    id: 'M3.ALG.QUAD',
    grade: 'M3',
    domain: 'ALG',
    name: '이차방정식',
    icon: '🎯',
    color: '#db2777',
    description: '인수분해와 근의 공식을 이용한 풀이, 활용',
    prerequisites: ['M3.ALG.FACT', 'M3.NUM.SQRT'],
    conceptCard:
      '이차방정식 풀이 3단 전략: ① x²=k꼴이면 바로 ±√k ② 인수분해가 되면 (x−p)(x−q)=0 ③ 안 되면 근의 공식. AB=0이면 A=0 또는 B=0 — 이것이 핵심 원리예요.',
    playable: true,
  },
  {
    id: 'M3.FUN.QUAD',
    grade: 'M3',
    domain: 'FUN',
    name: '이차함수',
    icon: '🌈',
    color: '#059669',
    description: 'y=a(x−p)²+q의 그래프, 꼭짓점, 최대·최소',
    prerequisites: ['M3.ALG.QUAD', 'M2.FUN.LINEAR'],
    conceptCard:
      'y = a(x−p)²+q의 꼭짓점은 (p, q) — 괄호 안 부호가 반대라는 것에 주의! a>0이면 아래로 볼록(최솟값), a<0이면 위로 볼록(최댓값). 일반형은 완전제곱식으로 바꿔 꼭짓점을 찾아요.',
    playable: true,
  },
  {
    id: 'M3.GEO.TRIG',
    grade: 'M3',
    domain: 'GEO',
    name: '삼각비',
    icon: '📡',
    color: '#d97706',
    description: 'sin·cos·tan, 특수각, 길이와 높이 구하기',
    prerequisites: ['M2.GEO.TRI'],
    conceptCard:
      'sin = 대변/빗변, cos = 밑변/빗변, tan = 대변/밑변. 특수각은 표로 외워요: sin30°=1/2, sin45°=√2/2, sin60°=√3/2 (cos는 역순). "높이 = 거리 × tan(올려본 각)"이 실전 공식!',
    playable: true,
  },
  {
    id: 'M3.STA.STAT',
    grade: 'M3',
    domain: 'STA',
    name: '대푯값과 산포도',
    icon: '📶',
    color: '#0891b2',
    description: '중앙값·최빈값, 편차, 분산과 표준편차',
    prerequisites: ['M1.STA.DATA'],
    conceptCard:
      '편차 = (자료값) − (평균), 편차의 합은 항상 0. 분산 = (편차²)의 평균, 표준편차 = √분산. 표준편차가 작을수록 자료가 평균 주위에 고르게 모여 있다는 뜻이에요.',
    playable: true,
  },
];

export const SKILL_MAP: Record<SkillId, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const PLAYABLE_SKILLS = SKILLS.filter((s) => s.playable);

export function trackSkills(trackId: TrackId): SkillDef[] {
  return PLAYABLE_SKILLS.filter((s) => s.grade === trackId);
}

// 이 스킬을 prerequisite로 요구하는 후속 스킬 수 (Priority Score의 PrerequisiteImportance)
export function dependentCount(skillId: SkillId): number {
  return SKILLS.filter((s) => s.prerequisites.includes(skillId)).length;
}

// 트랙 스킬들의 prerequisite 폐포(closure) — 아래 학년 구멍 메꾸기 후보
export function prerequisiteClosure(trackId: TrackId): SkillId[] {
  const out = new Set<SkillId>();
  const visit = (id: SkillId) => {
    for (const p of SKILL_MAP[id]?.prerequisites ?? []) {
      if (!out.has(p)) {
        out.add(p);
        visit(p);
      }
    }
  };
  for (const s of trackSkills(trackId)) visit(s.id);
  return [...out].filter((id) => SKILL_MAP[id]?.grade !== trackId);
}

export const DOMAIN_NAMES: Record<string, string> = {
  NUM: '수와 연산',
  ALG: '문자와 식',
  FUN: '함수',
  GEO: '기하',
  STA: '확률과 통계',
};
