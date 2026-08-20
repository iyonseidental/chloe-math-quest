// 학습 알고리즘의 튜닝 가능한 상수. 하드코딩 금지 원칙에 따라 한곳에 모은다.

export const CONFIG = {
  // Mastery Gate (레벨 승급 조건)
  gate: {
    windowSize: 8, // 판정에 사용하는 최근 시도 수
    minAttempts: 6, // 이 레벨에서 최소 시도 수
    minAccuracy: 0.75, // 최근 window 정답률
    maxHintRate: 0.35, // 힌트 사용 문제 비율
    requireTransfer: true, // 해당 레벨 transfer 성공 필수
    skipStreak: 3, // 무힌트·정상시간 연속 정답 시 Skip Test 제안
  },

  // Mastery Score 가중치
  mastery: {
    recencyDecay: 0.85, // 최근 시도일수록 큰 가중치
    windowSize: 12,
    transferBonus: 8,
    hintPenaltyScale: 12,
    slowPenalty: 5, // 평균 시간이 예상의 2배 초과
    reviewPassBonus: 5,
    reviewLapsePenalty: 12,
    // masteredLevels 수 → mastery 하한선: 레벨을 정복할수록 바닥이 올라간다
    levelFloor: [0, 20, 40, 60, 78, 92] as number[],
    levelSpan: 38, // floor 위에 최근 수행으로 얹을 수 있는 폭
  },

  // 난이도 적응
  adapt: {
    raiseStreak: 3, // n연속 (무힌트) 정답 → 상향 신호
    dropWrongStreak: 2, // n연속 오답 → 원인 분석
    frustrationWrongStreak: 3, // n연속 오답 → 쉬운 성공 경험 문제
    fastRatio: 0.25, // 예상시간 대비 이보다 빠르면 '너무 빠름' (GUESSING/CARELESS 신호)
    slowRatio: 2.5, // 이보다 느리면 TIME/CONCEPT 신호
  },

  // Error Clinic
  clinic: {
    maxStageFailures: 2, // 같은 단계 n회 실패 시 한 단계 후퇴
  },

  // Spaced Repetition (일 단위)
  reviewIntervals: [1, 3, 7, 14, 30],

  // XP (§22: 문제 수가 아니라 학습 행동의 질)
  xp: {
    correct: 10,
    advancedCorrect: 25, // Level 4+ 정답
    clinicRetrySuccess: 30, // 오답 재도전(similar) 성공
    transferSuccess: 40,
    skillLevelMastered: 100,
    reviewSuccess: 50,
  },

  // 학생 전체 레벨 (누적 XP 경계)
  studentLevels: [
    { xp: 0, title: 'Math Starter' },
    { xp: 150, title: 'Explorer' },
    { xp: 400, title: 'Problem Solver' },
    { xp: 800, title: 'Math Adventurer' },
    { xp: 1400, title: 'Advanced Thinker' },
    { xp: 2200, title: 'Math Strategist' },
    { xp: 3200, title: 'Math Master' },
  ],

  // 선행 판단 (AccelerationEngine 기초)
  acceleration: {
    avgMasteryThreshold: 90, // 학년 평균 mastery
    minSkillMastery: 80, // 모든 스킬 최소 mastery
  },

  // Flow Zone 퀘스트 구성 비율
  flow: { current: 0.7, stretch: 0.2, challenge: 0.1 },

  attemptsCap: 800,
  prereqWeakThreshold: 60, // 이 미만이면 PREREQUISITE 진단 후보
} as const;
