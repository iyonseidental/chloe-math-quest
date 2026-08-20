// CHLOE MATH 2.2 — all tunable coefficients, versioned. Never hardcode a threshold
// outside this file (docs/ARCHITECTURE-2.1.md PART B "config-driven", instruction §80/§10).
// 2.2.0 캘리브레이션 하드닝(Phase 2 Step 1-2): baselines/phase1-baseline.json이 2.1.0 값 보존.
export const CONFIG21_VERSION = '2.3.0';
export const MASTERY_MODEL_VERSION = '2.2.0-ability-beta';
export const CURRICULUM_VERSION = '2.3.0-m1full-pure';
export const KNOWLEDGE_GRAPH_VERSION = '2.2.0-m1full35';

export const CONFIG21 = {
  // ---- PART D: Beta model ----
  // 2.2.0: prior (1,4)→(1,3). Step 1 분석(H3)에서 prior 단독 효과는 작지만, 비율 정합과
  // 결합 시 TRAINING/VALIDATION 모두에서 최선이었다 (calib-tune.mjs R3).
  prior: { alpha: 1, beta: 3 }, // p0 = 0.25

  evidence: {
    // E_BASE[d] / E_WRONG[d], index 0..4 = difficulty 1..5
    // 2.2.0 구조 수정(H4): p가 '능력'으로 수렴하려면 correctBase[d]/wrongBase[d] = exp(θd)
    // 이어야 한다 (정지점: p* = s·c/(s·c+(1-s)·w), s=σ(logit(trueP)−θd) → p*=trueP ⇔ c/w=exp(θd)).
    // 2.1.0 값은 전 난이도에서 이 비율에 미달해 p*가 참능력 아래 정지했고, 예측 σ(logit(p)−θd)가
    // 난이도를 재차 빼 전 밴드 과소예측(actual>predicted)을 만들었다 — calib-rootcause.mjs 실증.
    // 채택값 = exp(±θd/2): 비율은 정확히 exp(θd), 총 증거 질량 스케일은 2.1.0과 유사하게 유지.
    correctBase: [0.67, 0.861, 1.105, 1.492, 2.117],
    wrongBase: [1.492, 1.161, 0.905, 0.67, 0.472],
    hintFactor: [1.0, 0.55, 0.3, 0.12], // index = hintsUsed, clamped to 3+
    retryFactor: 0.5, // self-corrected (used the extra try) correct
    guessFactor: 0.35, // answered in < guessSpeedRatio * estimatedSec on MCQ
    guessSpeedRatio: 0.2,
    diversityFactor: 0.5, // 4th+ consecutive attempt on same skill
    diversityStreakThreshold: 4,
    transferBonus: 1.5,
    retentionPassBonus: 1.2,
    transferFailPenalty: 1.2,
    retentionFailPenalty: 2.0,
    singleAttemptCap: 2.22, // AC9 defense — 2.2.0: d5 correctBase 2.117이 잘리지 않도록 상향 (2.117×1.05)
    overReachDamping: 0.7, // problem difficulty > currentDifficulty+2 -> correct evidence x this
    errorTypeWrongFactor: {
      CARELESS_ERROR: 0.35,
      GUESSING: 0.6,
      TIME_PRESSURE: 0.5,
      CONCEPT_GAP: 1.0,
      PREREQUISITE_GAP: 1.0,
      SIGN_ERROR: 1.0,
      CALCULATION_ERROR: 1.0,
      FORMULA_ERROR: 1.0,
      READING_ERROR: 1.0,
      INTERPRETATION_ERROR: 1.0,
      STRATEGY_ERROR: 1.0,
      LOGIC_ERROR: 1.0,
      DIAGRAM_ERROR: 1.0,
      UNKNOWN: 1.0,
    } as Record<string, number>,
  },

  // secondary-skill attribution weights (PART F)
  attribution: {
    correctSecondaryFactor: 0.15, // only applied when secondary confidence <= LOW
    wrongPrimaryFactorWhenSecondaryIsRoot: 0.2,
    carelessSecondaryFactor: 0, // careless/guessing/time -> secondary gets 0
  },

  // ---- time decay (PART D-3 q3) ----
  decay: {
    graceDays: 14,
    dailyDecayFactor: 0.995, // applied to (alpha+beta) mass beyond prior, per day past grace
  },

  // ---- estimateConfidence bands (by effectiveEvidence E; U can downgrade one step) ----
  confidenceBands: { veryLow: 3, low: 8, medium: 20, high: 45 },
  confidenceDowngradeUncertainty: 0.12,

  // ---- PART E: Prerequisite Stability ----
  stability: {
    threshold: 0.75,
    unknownEvidenceThreshold: 3, // E < this -> UNKNOWN, not "weak"
    minEvidenceForSkip: 8,
    retReliabilityDefault: 0.85, // no retention data yet -> assume reasonably reliable
    recencyGraceDays: 14,
    recencyDailyFactor: 0.99,
    errorPenaltyPerRecentWrong: 0.15,
    errorPenaltyCap: 0.4,
    confidencePenaltyPerU: 1.5,
    confidencePenaltyCap: 0.4,
  },

  // ---- PART H: gate + long-term ladder ----
  gate: {
    masteryThreshold: 0.85,
    independentRateThreshold: 0.8,
    independentWindow: 8,
    minEffectiveEvidence: 10,
    minConfidenceRank: 2, // index into confidenceOrder, MEDIUM=2
  },
  confidenceOrder: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
  retentionIntervalsDays: [1, 3, 7, 14, 30], // PROVISIONAL->EARLY->MASTERED(x2 stages)->STABLE
  // stage index -> resulting knowledge state after a PASS at that stage
  retentionStageResultState: ['EARLY_MASTERY', 'MASTERED', 'MASTERED', 'STABLE_MASTERY', 'STABLE_MASTERY'] as const,

  // ---- PART G: misconception FSM ----
  misconception: {
    strongTriggerScore: 1.0,
    weakTriggerScore: 0.5,
    cleanAnswerDecay: 0.3,
    suspectThreshold: 1.0,
    confirmProblemCount: 2,
    confirmPassToClear: true, // both confirm problems clean -> cleared
    activeMasteryCap: 0.6,
    clearedRelapseScore: 0.3, // suspicion score after clearing (fast re-suspect on relapse)
    // ---- Phase 2 PART 5-1/6 ----
    // distractor 직접 태그 트리거 가중 (없으면 (skillId,errorType) 근사에 strongTriggerScore)
    taggedTriggerScore: { HIGH: 1.4, MEDIUM: 1.0, LOW: 0.6 } as Record<'HIGH' | 'MEDIUM' | 'LOW', number>,
    // 확인 정책 (PART 6 실험 대상): 'two-clean'(A, 2.1 현행) | 'three-clean'(B)
    //   | 'strong-fast'(C: HIGH 태그 트리거면 확인 1문항) | 'rolling'(D: 점수 누적)
    // 2.2.0 기본 정책 = 'rolling' (PART 6 실험 승자, VALIDATION P=0.867/R=0.867 vs A P=0.618/R=0.700)
    policy: 'rolling' as 'two-clean' | 'three-clean' | 'strong-fast' | 'rolling',
    // 'rolling' = 비율 순차검정 (PART 6-D 재설계):
    // 진단 기회(해당 오개념의 태깅 distractor가 제시된 문항의 오답) 대비 실제 그 오규칙
    // 산물을 고른 가중 비율로 판정한다. "언젠가 한 번 재현"의 생존분석형 FP 누적을 차단 —
    // 무작위 오답자의 비율은 대수법칙으로 1/3 근처에 수렴해 activeRate를 영구히 못 넘는다.
    // 카운터는 클리어 후에도 유지(sticky) — 재무장으로 인한 반복 FP 라운드 없음.
    rolling: {
      minOpportunities: 5, // 이 기회 수 이상부터 비율 판정 유효
      activeRate: 0.6, // 가중 매치율 ≥ 이 값 → ACTIVE
      clearRate: 0.35, // 기회 충분 + 매치율 ≤ 이 값 → NONE (카운터 유지)
      fastPathWindow: 5, // 초기 조기판정 창: 첫 이 기회 수 안에서
      fastPathMatches: 4, // 가중 매치 합이 이 값 이상이면 즉시 ACTIVE (무작위 통과확률 ≈5%)
      // MEDIUM 태그 매치 가중: 한 문항에 같은 오개념 태그가 2개(HIGH+MEDIUM)인 형태(FRAC/EXP)에서
      // 무작위 오답자의 기대 매치율이 (1+w)/3이 되므로, w를 낮게 두어야 우연 수렴선(≈0.42)이
      // activeRate(0.6) 아래에 안전하게 머문다 — 실험으로 확인 (misconception-experiment.mjs)
      mediumWeight: 0.25,
    },
  },

  // ---- PART I: Minimum-Dose Remediation ----
  remediation: {
    maxStageFailures: 2, // non-transfer stages regress (or, for foundation, trigger a deeper probe) after this many misses
    foundationTarget: 2, // foundation check requires 2 correct
    // 2.2 GATE B: transfer 전면 재시작 상한 — 초과 시 케이스 유예(abandoned, 이력 보존).
    // 중간 실력대의 치료 독점(무한 재시작 루프)을 차단한다 (test22-m1full 2465 실측 근거).
    maxTransferRestarts: 2,
    // 2.2 GATE B: 케이스당 총 치료 시도 최후 상한 — 초과 시 유예 (핑퐁 조합 최후 방어)
    maxTreatmentAttempts: 22,
  },

  // ---- PART K/L: root cause + probe ----
  rootCause: {
    maxDepth: 4,
    maxProbePerCase: 5,
    maxConsecutiveProbes: 3,
    // 2.2: 프로브 서빙 난이도 (2.1은 d2 하드코딩 — 약한 전제도 쉬운 문항은 자주 통과해
    // Probe Yield가 구조적으로 낮았다. Step 5 벤치마크에서 d2 vs d3 비교 후 확정.
    probeDifficulty: 3,
    surprisingFailureConfirmExtra: 1, // stable prereq fails probe -> +1 confirm question
    // Phase 3 PART 6-9: 경계선 요행 통과 방어 — 고위험 후보의 첫 프로브 PASS는 면죄가 아니라
    // BORDERLINE. 같은 스킬을 다른 표현(transfer 변형)으로 정확히 1회 재확인한다.
    borderline: {
      maxConfirm: 1, // 후보당 추가 직교 프로브 상한 (PART 9: 과잉 진단 방지)
      stabilityBelow: 0.55, // 이 미만의 stability는 고위험
      rootCauseProbAbove: 0.5, // rootCauseProbability가 이 이상이면 고위험
    },
  },
  probePriority: {
    specificityConfirm: 1.0,
    specificityNarrow: 0.7,
    specificityShared: 0.5,
    uncertaintyBaseline: 0.5,
  },

  // ---- PART I: empirical difficulty ----
  difficulty: {
    minSampleSize: 50,
    levelOffsets: [-0.8, -0.3, 0.2, 0.8, 1.5], // theta(d), d=1..5
    empiricalBlendConfidenceThreshold: 0.7,
    residualToLevel: 5, // (expected - observed)/0.10 * 0.5 scaling divisor->half-levels
  },

  // ---- Phase 3 PART 31/33/44: Real-World Pilot 계측 ----
  pilot: {
    sessionGapMinutes: 30, // 이벤트 간격이 이보다 크면 새 세션
    minMeaningfulAttempts: 5, // Valid Session 최소 유의 시도 (또는 최소 시간 충족)
    minLearningMinutes: 10,
    rapidClickMedianSec: 4, // 중앙 풀이시간이 이보다 짧으면 고속클릭 세션
    coverageMediumAttempts: 60, // 실데이터 캘리브레이션 커버리지 문턱
    coverageSufficientAttempts: 200,
    coverageSufficientSkills: 12,
  },

  // ---- PART L: session diagnostic burden ----
  session: {
    maxDiagnosticShare: 0.3,
  },

  // ---- Step 12: Adaptive Diagnostic (diagnostic21) ----
  diagnostic: {
    budget: 32, // 진단 세션 총 문항 상한 — 2.2: 그래프 35스킬 확장에 맞춰 재산정 (test22-m1full로 검증)
    // PART D-3 그대로: 추론 통과(INFERRED_PASS)에 추가되는 약한 의사관측 — 직접 검사 없이
    // confidence를 LOW 위로 끌어올릴 수 없는 크기여야 한다 (E = 1.8+0.6 = 2.4 < veryLow 밴드 3)
    inferredSeedAlpha: 1.8,
    inferredSeedBeta: 0.6,
  },

  // ---- PART M/N: adaptive priority + flow ----
  adaptive: {
    forgettingRiskPerOverdueDay: 0.15,
    forgettingRiskCap: 2.5,
    curriculumImportanceDefault: 1.0,
    errorFrequencyWeight: 0.25,
    prereqImportanceWeight: 0.2,
    opportunityBoost: {
      REMEDIATION: 2.0,
      WEAKENED: 1.6,
      REVIEW_DUE: 1.5,
      PRACTICING: 1.2,
      LEARNING: 1.1,
      PROVISIONAL: 0.8,
      EARLY_MASTERY: 0.6,
      MASTERED: 0.35,
      STABLE_MASTERY: 0.2,
      EXPOSED: 1.3,
      UNSEEN: 1.4,
    } as Record<string, number>,
    diversityRepeatPenalty: 0.5, // any of last 3 problems used this skill
    diversityStreakPenalty: 0.3, // 4th+ consecutive
    fastTrackStreak: 3, // hint-free correct streak
    fastTrackMinP: 0.8,
    frustrationStreak: 3,
    // 2.2 GATE B: 유예(abandoned) 케이스 스킬의 우선순위 쿨다운
    abandonedCooldownFactor: 0.15,
    abandonedCooldownDays: 1,
  },

  // ---- Phase 2 PART 13-31: ELITE MATHEMATICS LAYER ----
  elite: {
    prior: { alpha: 1, beta: 3 }, // 차원별 Beta prior — mastery와 같은 수학, 별도 장부
    // 증거 가중 (본문/후속, 정답/오답) — 시간은 여기 없음 (PART 24)
    mainCorrect: 1.0,
    mainWrong: 0.8,
    followUpCorrect: 1.2,
    followUpWrong: 0.9,
    hintEvidenceDiscount: 0.75, // 힌트 1개당 정답 증거 가중 (불이익 아님 — 약한 신호일 뿐)
    // PART 29/16
    knowledgeAdequateP: 0.6, // 필요 스킬이 이 아래면 KNOWLEDGE_FAILURE 우선
    overloadTimeRatio: 2.5, // MULTI_SKILL에서 추정시간 대비 이 배수 초과 + 오답 → 부하 신호
    eliteReadyAvgP: 0.72,
    eliteReadyGated: 2,
    advancedReadyAvgP: 0.55,
    // PART 27/28
    integrationWeight: 0.25,
    eliteDifficultyDrag: 0.85, // 난이도 1단계 초과당 기대 성공률 감쇠 (flow 계산용, θ와 별개 간이형)
    flowZone: [0.4, 0.7] as [number, number], // Elite 분투 대역 (하드코딩 아님 — 시뮬 조정 대상)
    // PART 31/EQA10 — 세션 내 elite 도전 비중
    baseShare: 0.15,
    maxShare: 0.35,
    gapBoost: 0.6, // (진도 − elite수준) 격차당 비중 가산
    // PART 25 — productive struggle: 첫 힌트 제공 전 최소 탐색 시간(초, UI 게이트)
    struggleWindowSec: 90,
    strategyTraceCap: 200,
  },

  // ---- XP (kept from v1 spirit; not core to learning correctness) ----
  xp: { correct: 10, advancedCorrect: 20, remediationRetry: 30, transferSuccess: 40, retentionSuccess: 40, skillMastered: 100, gapPermanentlyFixed: 120 },
} as const;
