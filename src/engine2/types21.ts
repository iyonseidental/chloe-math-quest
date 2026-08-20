// CHLOE MATH 2.1 — Core types. See docs/ARCHITECTURE-2.1.md PART C, D, F, G, H, M.
// Nothing here is derived data; this file only defines shapes.

// ---------------------------------------------------------------------------
// PART F — Error taxonomy (full 2.1 set; existing v1 generators use a subset,
// mapped in problemAdapter21.ts)
// ---------------------------------------------------------------------------
export type ErrorType21 =
  | 'CONCEPT_GAP'
  | 'PREREQUISITE_GAP'
  | 'CALCULATION_ERROR'
  | 'SIGN_ERROR'
  | 'FORMULA_ERROR'
  | 'READING_ERROR'
  | 'INTERPRETATION_ERROR'
  | 'STRATEGY_ERROR'
  | 'LOGIC_ERROR'
  | 'DIAGRAM_ERROR'
  | 'CARELESS_ERROR'
  | 'TIME_PRESSURE'
  | 'GUESSING'
  | 'UNKNOWN';

// ---------------------------------------------------------------------------
// PART C — Knowledge State vs Workflow State (R2)
// ---------------------------------------------------------------------------
export type KnowledgeState =
  | 'UNSEEN'
  | 'EXPOSED'
  | 'LEARNING'
  | 'PRACTICING'
  | 'PROVISIONAL'
  | 'EARLY_MASTERY'
  | 'MASTERED'
  | 'STABLE_MASTERY'
  | 'WEAKENED';

export interface LearningFlags {
  reviewDue: boolean;
  remediationOpen: boolean;
  prerequisiteProbeOpen: boolean;
  transferRequired: boolean;
  misconceptionSuspected: boolean;
  misconceptionActive: boolean;
}

export function freshFlags(): LearningFlags {
  return {
    reviewDue: false,
    remediationOpen: false,
    prerequisiteProbeOpen: false,
    transferRequired: false,
    misconceptionSuspected: false,
    misconceptionActive: false,
  };
}

// ---------------------------------------------------------------------------
// estimateConfidence (PART D)
// ---------------------------------------------------------------------------
export type EstimateConfidence = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

// ---------------------------------------------------------------------------
// PART M — SkillState21
// ---------------------------------------------------------------------------
export interface TransferState {
  passedAt: Partial<Record<number, boolean>>; // by difficulty 1..5
  attempts: number;
  passes: number;
}

export interface RetentionState {
  stage: number; // index into retentionIntervals; -1 = not scheduled
  nextReviewAt: string | null; // YYYY-MM-DD
  passes: number;
  lapses: number;
  reliability: number; // passes / (passes + 2*lapses), 0.5 default w/ no data (see stability21)
}

export interface AttemptSummary21 {
  correct: boolean;
  hintsUsed: number;
  isGuess: boolean;
  errorType: ErrorType21 | null;
  ts: number;
  mode: string;
}

export interface SkillState21 {
  skillId: string;
  // bounded rolling window of raw outcomes — feeds independentRate, recentWrongCount,
  // and "diagnostic-only so far" checks. Capped (not a full attempt log) so this stays
  // cheap at scale (PART Q "avoid unnecessary full scans").
  recentWindow: AttemptSummary21[];
  // raw pseudo-observations (Beta model) — PART D
  alpha: number;
  beta: number;
  // derived (recomputed on every read, never trusted as source of truth)
  masteryProbability: number;
  uncertainty: number;
  effectiveEvidence: number;
  estimateConfidence: EstimateConfidence;
  // knowledge / workflow (PART C)
  knowledgeState: KnowledgeState;
  flags: LearningFlags;
  // difficulty progression
  highestDifficultyPassed: number; // 1..5
  currentDifficulty: number; // 1..5
  // raw counters (display only — decisions use effectiveEvidence, not these)
  attempts: number;
  correctAttempts: number;
  independentRate: number; // EWMA of hint-free correct rate over recent window
  consecutiveCorrect: number; // hint-free, non-guess streak (fast track signal)
  consecutiveWrong: number; // frustration signal
  // transfer / retention
  transfer: TransferState;
  retention: RetentionState;
  // errors / misconceptions
  errorCounts: Partial<Record<ErrorType21, number>>;
  suspectedMisconceptions: string[];
  activeMisconceptions: string[];
  // prerequisite stability cache (recomputed lazily; stored for audit trace only)
  prerequisiteStability: number | null;
  lastPracticedAt: string | null; // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// PART G — Misconception instance
// ---------------------------------------------------------------------------
// 'NONE' is the implementation-visible form of the FSM's initial/cleared state
// (kept as a real record rather than deleted, so relapse suspicion starts faster —
// PART G explicitly says "완전 삭제 아님"). See PHASE 1 COMPLETION REPORT for this
// small structural clarification over the literal 4-status list in the spec text.
export type MisconceptionStatus = 'NONE' | 'SUSPECTED' | 'CONFIRMING' | 'ACTIVE' | 'RESOLVED';

export interface MisconceptionInstance {
  misconceptionId: string;
  skillId: string; // triggering skill
  status: MisconceptionStatus;
  evidenceScore: number;
  triggeringAttempts: string[];
  confirmationAttempts: string[];
  confirmPassCount: number;
  confirmFailCount: number;
  firstDetectedAt: string; // ISO ts
  resolvedAt?: string;
  // Phase 2 PART 5-1/6: HIGH 강도 distractor 태그로 트리거된 적 있는가 ('strong-fast' 정책 근거)
  strongTriggerSeen?: boolean;
  // 'rolling' 비율 순차검정 카운터 (평생 누적 — 클리어 후에도 유지되는 sticky 이력):
  //   opportunities: 이 오개념의 태깅 distractor가 제시된 문항에서의 오답 수 (진단 기회)
  //   matches: 그 기회에서 실제 해당 오규칙 산물을 고른 가중 수 (HIGH=1, MEDIUM=0.5)
  ratioOpportunities?: number;
  ratioMatches?: number;
}

// ---------------------------------------------------------------------------
// PART H / PART K — Remediation case (root-cause investigation + treatment)
// ---------------------------------------------------------------------------
export type RemediationStage =
  | 'investigating' // prerequisite probing in progress
  | 'micro-lesson'
  | 'foundation'
  | 'bridge'
  | 'similarA'
  | 'similarB'
  | 'transfer'
  | 'return-check'
  | 'resolved'
  | 'abandoned';

export type GapClosureQuality = 'TEMPORARILY_FIXED' | 'TRANSFER_VERIFIED' | 'RETENTION_VERIFIED' | 'STABLY_CLOSED' | 'REOPENED';

export interface ProbeRecord {
  skillId: string;
  correct: boolean;
  attemptId: string;
}

export interface RemediationCase {
  id: string;
  targetSkillId: string; // the skill the student was originally practicing (returnTo)
  targetDifficulty: number;
  originalAttemptId: string;
  createdTs: number;
  errorType: ErrorType21;
  // root cause investigation
  probeQueue: string[]; // skillIds still to probe
  probesTaken: ProbeRecord[];
  depth: number; // recursion depth (0 = probing targetSkillId's direct prerequisites)
  frontierParentSkillId: string; // the skill whose prerequisites are currently being probed
  pendingReconfirm: string | null; // AC11: a "surprising" failure awaiting one extra confirm probe
  // Phase 3 PART 6-9: 경계선(고위험) 후보가 첫 프로브를 통과했을 때 — 즉시 면죄하지 않고
  // 같은 스킬을 "다른 표현"(transfer 변형)으로 1회 재확인한다. 케이스당 후보별 1회 한도.
  pendingOrthogonal: string | null;
  orthogonalTaken: string[]; // 이 케이스에서 이미 직교 확인을 소진한 스킬들
  rootCauseSkillId: string | null; // resolved once investigation completes
  // treatment
  stage: RemediationStage;
  stageFailures: number;
  stageProgress: number; // successes accumulated within the current stage
  treatmentLog: { stage: RemediationStage; correct: boolean; attemptId: string }[];
  // outcome
  outcome: RemediationOutcome | null;
  gapClosureQuality: GapClosureQuality;
  reopenedFromCaseId: string | null;
  // 2.2 GATE B: transfer 재시작 상한 초과로 유예 종결된 시각 (우선순위 쿨다운 근거)
  abandonedTs?: number;
  // 2.2 GATE B: 단계 후퇴 횟수 — similar/transfer 서빙 난이도를 이만큼 하향 (핑퐁 방지)
  deEscalations?: number;
  linkedMisconceptionId: string | null; // set if the triggering error matched a registered misconception
}

export interface RemediationOutcome {
  rootSkill: string;
  preMastery: number;
  postMastery: number;
  similarSuccess: number; // 0..1 (fraction of similarA/B passed)
  transferSuccess: boolean;
  retentionSuccess?: boolean;
  recurrenceWithin30Days?: boolean;
}

// ---------------------------------------------------------------------------
// Agenda (workflow queue — session orchestrator consumes this)
// ---------------------------------------------------------------------------
export type AgendaKind =
  | 'elite-followup' // Phase 2: One Problem Deep 후속 / reasoning 스캐폴드 (PART 19/29)
  | 'probe'
  | 'confirm'
  | 'micro-lesson'
  | 'foundation'
  | 'bridge'
  | 'similarA'
  | 'similarB'
  | 'transfer'
  | 'return-check'
  | 'retention'
  | 'challenge'
  | 'ease';

// Phase 3 PART 24-28 — Golden Set 시행 기록 (평가 전용; 훈련 파이프라인이 읽지 않음)
export interface HoldoutRecord {
  itemId: string;
  form: 'A' | 'B' | 'C';
  parallelGroup: string;
  area: 'CORE' | 'NEAR_TRANSFER' | 'FAR_TRANSFER' | 'ELITE';
  eliteDimension?: string | null;
  skillIds: string[];
  difficulty: number;
  correct: boolean;
  solveTimeSec: number;
  administrationId: string;
  ts: number;
}

export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  skillId: string;
  difficulty: number;
  variant?: 'standard' | 'transfer';
  caseId?: string; // links to RemediationCase
  misconceptionId?: string; // for kind === 'confirm'
  // Phase 2 ELITE: kind === 'elite-followup'일 때 대상 문제/후속 식별자
  eliteProblemId?: string;
  eliteFollowUpId?: string;
  reason: string;
  createdTs: number;
}

// ---------------------------------------------------------------------------
// PART J — Calibration prediction record
// ---------------------------------------------------------------------------
// PART I — Empirical Difficulty Model. Phase 1 only ever SETS declaredDifficulty (problem
// authoring); empiricalDifficulty is computed read-only from observed vs predicted success
// once enough attempts exist, as a future blend input — it never overwrites declared.
export interface DifficultyProfile {
  declaredDifficulty: number;
  empiricalDifficulty?: number;
  difficultyConfidence?: number;
  sampleSize?: number;
}

export interface PredictionRecord {
  attemptId: string;
  skillId: string;
  predictedP: number; // P(correct) computed BEFORE the update, at time of attempt
  difficulty: number;
  correct: boolean;
  masteryModelVersion: string;
  configVersion: string;
  ts: number;
}

// ---------------------------------------------------------------------------
// PART M — Digital Twin
// ---------------------------------------------------------------------------
export interface BehaviorProfile {
  hintDependency: number; // EWMA fraction of recent attempts using hints
  carelessRate: number; // EWMA fraction of wrong attempts classified CARELESS
  confidenceBias: number; // mean(confidence - actualCorrect), when confidence collected
  learningVelocity: number; // # of skills newly reaching EARLY_MASTERY+ in last 14 days
}

export interface DailySnapshot21 {
  date: string;
  overallMastery: number;
  bySkill: Record<string, number>;
}

export interface DigitalTwin21 {
  studentId: string;
  name: string;
  versions: { curriculum: string; knowledgeGraph: string; masteryModel: string; config: string };
  skills: Record<string, SkillState21>;
  misconceptions: MisconceptionInstance[];
  agenda: AgendaItem[];
  remediationCases: RemediationCase[];
  predictions: PredictionRecord[]; // capped ring buffer for calibration
  // ---- Phase 2 ELITE LAYER (PART 15/23/30) — mastery와 절대 섞지 않는 별도 장부 ----
  elite: import('./elite22.ts').EliteProfileState;
  strategyTraces: import('./elite22.ts').StrategyTrace[]; // capped (PART 23)
  recentEliteIds: string[]; // novelty 소멸 추적 (PART 27)
  eliteRootCauseCounts: Partial<Record<import('./elite22.ts').EliteRootCause, number>>;
  attemptsSinceElite: number; // 리플레이 안전한 elite 서빙 주기 카운터 (PART 31 비율 정책)
  // ---- Phase 3 GOLDEN SET (PART 24-28) — 훈련과 완전 격리된 평가 전용 장부 ----
  // 이 배열은 성장 측정에만 쓰인다: mastery/adaptive/remediation 어느 코드도 읽지 않는다.
  holdout: HoldoutRecord[];
  recentSkillSequence: string[]; // capped, most-recent-last — diversity & same-skill-run tracking
  recentAgendaKinds: AgendaKind[]; // capped — no-over-testing guards
  behavior: BehaviorProfile;
  snapshots: DailySnapshot21[];
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  seq: number; // last applied event sequence number (replay bookkeeping)
}
