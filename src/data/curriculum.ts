// Curriculum Knowledge Graph — 코드가 아니라 데이터.
// 교육과정 변경 시 이 파일(향후 JSON/DB)만 수정한다. 단원명을 다른 코드에 하드코딩하지 않는다.
// 트랙: 중학교는 학년(중1~3), 고등학교는 2022 개정 교육과정 과목 단위.
import type { SkillDef, SkillId, TrackDef, TrackId } from '../engine/types.ts';

export const TRACKS: TrackDef[] = [
  { id: 'M1', name: '중1', emoji: '🌱', category: 'middle', description: '정수와 유리수 · 문자와 식 · 일차방정식 · 좌표와 그래프 · 기본 도형 · 통계', prereqTracks: [], hasContent: true },
  { id: 'M2', name: '중2', emoji: '🌿', category: 'middle', description: '식의 계산 · 부등식 · 연립방정식 · 일차함수 · 도형의 성질 · 확률', prereqTracks: ['M1'], hasContent: true },
  { id: 'M3', name: '중3', emoji: '🌳', category: 'middle', description: '제곱근과 실수 · 인수분해 · 이차방정식 · 이차함수 · 삼각비 · 통계', prereqTracks: ['M2'], hasContent: true },
  { id: 'H.CM1', name: '공통수학1', emoji: '📘', category: 'high-common', description: '다항식 · 방정식과 부등식 · 경우의 수 · 행렬 (고1)', prereqTracks: ['M3'], hasContent: true },
  { id: 'H.CM2', name: '공통수학2', emoji: '📙', category: 'high-common', description: '도형의 방정식 · 집합과 명제 · 함수와 그래프 (고1)', prereqTracks: ['H.CM1'], hasContent: true },
  { id: 'H.ALG', name: '대수', emoji: '🧮', category: 'high-elective', description: '지수·로그함수 · 삼각함수 · 수열', prereqTracks: ['H.CM2'], hasContent: true },
  { id: 'H.CAL1', name: '미적분Ⅰ', emoji: '📈', category: 'high-elective', description: '함수의 극한 · 미분 · 적분', prereqTracks: ['H.CM2'], hasContent: true },
  { id: 'H.PRB', name: '확률과 통계', emoji: '🎲', category: 'high-elective', description: '순열·조합 · 확률 · 통계적 추정', prereqTracks: ['H.CM2'], hasContent: true },
  { id: 'H.CAL2', name: '미적분Ⅱ', emoji: '🚀', category: 'high-career', description: '수열의 극한 · 여러 함수의 미분·적분', prereqTracks: ['H.CAL1'], hasContent: true },
  { id: 'H.GEO', name: '기하', emoji: '📐', category: 'high-career', description: '이차곡선 · 공간도형 · 벡터', prereqTracks: ['H.CM2'], hasContent: true },
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

  // ================= 고등 · 공통수학1 =================
  { id: 'H1.POLY', grade: 'H.CM1', domain: 'ALG', name: '다항식', icon: '🧩', color: '#4f46e5', description: '곱셈공식과 전개 · 인수분해 · 나머지정리 · 조립제법', prerequisites: ['M3.ALG.FACT'], conceptCard: '(a+b)²=a²+2ab+b², (a+b)³=a³+3a²b+3ab²+b³. 나머지정리: f(x)를 (x−a)로 나눈 나머지는 f(a). 조립제법은 나눗셈을 계수만으로 빠르게!', playable: true },
  { id: 'H1.EQIN', grade: 'H.CM1', domain: 'ALG', name: '방정식과 부등식', icon: '⚖️', color: '#4f46e5', description: '복소수 · 판별식 · 근과 계수의 관계 · 이차함수 최대최소 · 이차부등식', prerequisites: ['M3.ALG.QUAD', 'H1.POLY'], conceptCard: 'i²=−1. 판별식 D=b²−4ac로 근의 개수 판정. 근과 계수: α+β=−b/a, αβ=c/a. 이차부등식은 그래프(아래로 볼록)로 해석!', playable: true },
  { id: 'H1.COMB', grade: 'H.CM1', domain: 'STA', name: '경우의 수', icon: '🎰', color: '#4f46e5', description: '합·곱의 법칙 · 순열 · 조합 · 제한 조건', prerequisites: ['M2.STA.PROB'], conceptCard: '동시에 일어나면 곱하고, 둘 중 하나면 더해요. 순열 nPr = 순서 있음, 조합 nCr = 순서 없음. 이웃 조건은 묶어서 하나로!', playable: true },
  { id: 'H1.MAT', grade: 'H.CM1', domain: 'ALG', name: '행렬', icon: '🔲', color: '#4f46e5', description: '행렬의 뜻과 연산 · 행렬의 곱셈', prerequisites: ['H1.POLY'], conceptCard: '같은 위치 성분끼리 더해요. 곱셈 AB는 A의 행 × B의 열 — 순서가 중요해서 AB≠BA일 수 있어요!', playable: true },
  // ================= 고등 · 공통수학2 =================
  { id: 'H2.GEOM', grade: 'H.CM2', domain: 'GEO', name: '도형의 방정식', icon: '📉', color: '#7c3aed', description: '두 점 사이 거리 · 내분점 · 직선 · 점과 직선 사이 거리 · 원', prerequisites: ['M3.ALG.QUAD', 'M1.FUN.COORD'], conceptCard: '거리 √((x₂−x₁)²+(y₂−y₁)²). m:n 내분점 ((mx₂+nx₁)/(m+n), …). 점과 직선 거리 |ax₀+by₀+c|/√(a²+b²). 원 (x−a)²+(y−b)²=r².', playable: true },
  { id: 'H2.SET', grade: 'H.CM2', domain: 'ALG', name: '집합과 명제', icon: '🎯', color: '#7c3aed', description: '부분집합 · 포함 배제 · 명제와 대우 · 필요충분조건', prerequisites: [], conceptCard: '원소 n개면 부분집합 2^n개. n(A∪B)=n(A)+n(B)−n(A∩B). 명제와 대우는 참·거짓이 항상 같아요. p→q가 참이면 p는 충분, q는 필요!', playable: true },
  { id: 'H2.FUNC', grade: 'H.CM2', domain: 'FUN', name: '함수와 그래프', icon: '🔗', color: '#7c3aed', description: '합성함수 · 역함수 · 유리함수·무리함수', prerequisites: ['M2.FUN.LINEAR'], conceptCard: '(g∘f)(x)=g(f(x)) — 안쪽 먼저! 역함수는 x↔y를 바꿔 다시 y=로 정리. y=k/(x−p)+q의 점근선은 x=p, y=q.', playable: true },
  // ================= 고등 · 대수 =================
  { id: 'HA.EXP', grade: 'H.ALG', domain: 'FUN', name: '지수와 로그', icon: '🚀', color: '#0ea5e9', description: '지수법칙 · 거듭제곱근 · 로그의 뜻과 성질 · 지수·로그 방정식', prerequisites: ['H1.POLY'], conceptCard: '지수법칙: 곱은 지수의 합, 거듭제곱은 지수의 곱. log_a b = "a를 몇 제곱하면 b?"  log ab = log a + log b. 지수방정식은 밑을 통일!', playable: true },
  { id: 'HA.TRIG', grade: 'H.ALG', domain: 'FUN', name: '삼각함수', icon: '🌊', color: '#0ea5e9', description: '호도법 · 삼각함수 정의와 성질 · 그래프 · 사인/코사인법칙', prerequisites: ['M3.GEO.TRIG'], conceptCard: '180°=π rad. sin²θ+cos²θ=1. y=a sin bx의 최댓값 |a|, 주기 2π/|b|. 사인법칙 a/sinA=2R, 코사인법칙 a²=b²+c²−2bc cosA.', playable: true },
  { id: 'HA.SEQ', grade: 'H.ALG', domain: 'ALG', name: '수열', icon: '🪜', color: '#0ea5e9', description: '등차·등비수열 · 합 공식 · Σ의 계산', prerequisites: ['M1.ALG.EXP'], conceptCard: '등차 aₙ=a+(n−1)d, 합 n(첫항+끝항)/2. 등비 aₙ=ar^(n−1), 합 a(r^n−1)/(r−1). Σk=n(n+1)/2, Σk²=n(n+1)(2n+1)/6.', playable: true },
  // ================= 고등 · 미적분Ⅰ =================
  { id: 'HC1.LIM', grade: 'H.CAL1', domain: 'FUN', name: '함수의 극한과 연속', icon: '🎢', color: '#f59e0b', description: '극한값 계산 · 0/0꼴 · 무한대 극한 · 연속 조건', prerequisites: ['H2.FUNC'], conceptCard: '0/0꼴은 인수분해로 약분! ∞/∞꼴은 최고차항 비교. 연속 = 극한값과 함숫값이 일치.', playable: true },
  { id: 'HC1.DIFF', grade: 'H.CAL1', domain: 'FUN', name: '다항함수의 미분', icon: '📐', color: '#f59e0b', description: '도함수 · 접선 · 증감과 극값 · 최대최소', prerequisites: ['HC1.LIM'], conceptCard: 'x^n의 도함수는 nx^(n−1). 접선 기울기 = 그 점의 미분계수. 도함수가 양수면 증가. 극값은 도함수가 0이고 부호가 바뀔 때!', playable: true },
  { id: 'HC1.INT', grade: 'H.CAL1', domain: 'FUN', name: '다항함수의 적분', icon: '🧺', color: '#f59e0b', description: '부정적분 · 정적분 · 넓이', prerequisites: ['HC1.DIFF'], conceptCard: '적분은 미분의 반대: x^n → x^(n+1)/(n+1)+C. 정적분은 위끝 대입 − 아래끝 대입. 넓이는 (위 곡선 − 아래 곡선)의 적분.', playable: true },
  // ================= 고등 · 확률과 통계 =================
  { id: 'HP.PERM', grade: 'H.PRB', domain: 'STA', name: '순열과 조합 심화', icon: '🧮', color: '#ec4899', description: '중복순열 · 같은 것이 있는 순열 · 원순열 · 중복조합 · 이항정리', prerequisites: ['H1.COMB'], conceptCard: '중복순열 n^r. 같은 것이 있으면 n!/(p!q!). 원순열 (n−1)!. 중복조합 H(n,r)=C(n+r−1, r). 이항정리 일반항 nCr a^(n−r) b^r.', playable: true },
  { id: 'HP.PROB', grade: 'H.PRB', domain: 'STA', name: '확률', icon: '🎲', color: '#ec4899', description: '수학적 확률 · 여사건 · 조건부확률 · 독립시행', prerequisites: ['HP.PERM'], conceptCard: '확률 = (해당 경우)/(전체 경우). "적어도"는 여사건 1−P. 조건부 P(B|A)=P(A∩B)/P(A). 독립시행 nCr p^r (1−p)^(n−r).', playable: true },
  { id: 'HP.STAT', grade: 'H.PRB', domain: 'STA', name: '통계', icon: '📊', color: '#ec4899', description: '확률분포 · 기댓값과 분산 · 이항분포 · 정규분포 · 모평균 추정', prerequisites: ['HP.PROB'], conceptCard: 'E(X)=Σx·p. V(X)=E(X²)−{E(X)}². 이항분포 B(n,p): E=np, V=np(1−p). 정규분포는 Z=(X−m)/σ로 표준화!', playable: true },
  // ================= 고등 · 미적분Ⅱ =================
  { id: 'HC2.SER', grade: 'H.CAL2', domain: 'FUN', name: '수열의 극한과 급수', icon: '♾️', color: '#ef4444', description: '수열의 극한 · 등비급수 · 급수의 활용', prerequisites: ['HA.SEQ', 'HC1.LIM'], conceptCard: '수열 극한은 최고차항 비교. |r|<1일 때 등비급수 합 = 첫항/(1−공비). 순환소수도 등비급수!', playable: true },
  { id: 'HC2.DIF2', grade: 'H.CAL2', domain: 'FUN', name: '여러 가지 미분법', icon: '🌀', color: '#ef4444', description: '지수·로그·삼각함수의 미분 · 곱과 몫 · 합성함수', prerequisites: ['HC1.DIFF', 'HA.EXP', 'HA.TRIG'], conceptCard: 'e^x의 도함수는 자기 자신, ln x는 1/x, sin x는 cos x. 곱의 미분 (fg)′=f′g+fg′. 합성은 겉미분×속미분!', playable: true },
  { id: 'HC2.INT2', grade: 'H.CAL2', domain: 'FUN', name: '여러 가지 적분법', icon: '🎻', color: '#ef4444', description: '지수·삼각함수의 적분 · 치환적분 · 부분적분', prerequisites: ['HC2.DIF2', 'HC1.INT'], conceptCard: 'e^x는 적분해도 e^x. sin x의 적분은 −cos x. 치환은 속식을 t로! 부분적분 ∫f′g = fg − ∫fg′.', playable: true },
  // ================= 고등 · 기하 =================
  { id: 'HG.CONIC', grade: 'H.GEO', domain: 'GEO', name: '이차곡선', icon: '🛰️', color: '#10b981', description: '포물선 · 타원 · 쌍곡선', prerequisites: ['H2.GEOM'], conceptCard: '포물선 y²=4px의 초점 (p,0). 타원 x²/a²+y²/b²=1(a>b)의 초점 c²=a²−b². 쌍곡선의 점근선 y=±(b/a)x.', playable: true },
  { id: 'HG.SPACE', grade: 'H.GEO', domain: 'GEO', name: '공간도형과 좌표', icon: '🧊', color: '#10b981', description: '공간에서의 거리 · 정사영 · 구의 방정식', prerequisites: ['H2.GEOM'], conceptCard: '공간 거리 √(Δx²+Δy²+Δz²). 정사영 길이 = 원래 길이 × cosθ. 구 (x−a)²+(y−b)²+(z−c)²=r².', playable: true },
  { id: 'HG.VEC', grade: 'H.GEO', domain: 'GEO', name: '벡터', icon: '🏹', color: '#10b981', description: '벡터의 연산 · 크기 · 내적 · 수직과 평행', prerequisites: ['HG.SPACE'], conceptCard: '성분끼리 더해요. 크기 |a|=√(x²+y²). 내적 a·b=x₁x₂+y₁y₂=|a||b|cosθ. 수직 ⇔ 내적=0!', playable: true },
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
