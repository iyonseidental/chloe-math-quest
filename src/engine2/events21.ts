// CHLOE MATH 2.1 — Raw Event Ledger (PART N). Append-only. Derived state (mastery,
// uncertainty, stability, readiness, knowledge state) is NEVER stored as fact here —
// only the raw facts of what happened. The Digital Twin is reconstructed by folding
// these events through replay21.applyEvent.
import type { ErrorType21 } from './types21.ts';

// A single attempt covers every kind of "problem answered" in the system — normal
// practice, diagnostic, prerequisite probe, misconception confirmation, remediation
// stages, retention review, and challenge/fast-track tests. They are distinguished by
// `mode`, not by separate event types, because they share the identical raw shape
// (§PART N groups Attempt/Review/Probe/Confirmation as "learning events" — this is the
// single concrete representation of that family).
export type AttemptMode =
  | 'elite' // Phase 2: Elite 본문 도전 (PART 17-18)
  | 'elite-followup' // Phase 2: One Problem Deep 후속 / reasoning 스캐폴드 (PART 19/29)
  | 'normal'
  | 'diagnostic'
  | 'probe'
  | 'confirm'
  | 'micro-lesson' // trivial ack event (PART N: still recorded, so Replay can reproduce the case's stage advance)
  | 'remediation-foundation'
  | 'remediation-bridge'
  | 'remediation-similarA'
  | 'remediation-similarB'
  | 'remediation-transfer'
  | 'remediation-return'
  | 'retention'
  | 'challenge'
  | 'ease';

export interface AttemptPayload {
  attemptId: string;
  skillId: string;
  secondarySkillIds: string[];
  difficulty: number;
  mode: AttemptMode;
  variant: 'standard' | 'transfer';
  correct: boolean;
  chosenErrorType: ErrorType21 | null; // null when correct
  // Phase 2 PART 5-1: 선택한 distractor의 오개념 태그 (태깅된 문항에서만; 구 이벤트는 undefined —
  // 리플레이 호환: reducer는 부재를 "태그 없음"으로 처리한다)
  chosenMisconceptionId?: string | null;
  chosenDiagnosticStrength?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  // 이 문항이 "제시했던" 오개념 distractor 목록 — 비율 검정의 분모(진단 기회) 판정용.
  // 선택 여부와 무관하게 문항 속성이므로 정답이어도 기록된다.
  offeredMisconceptions?: { id: string; strength: 'HIGH' | 'MEDIUM' | 'LOW' }[];
  solveTimeSec: number;
  estimatedSec: number;
  hintsUsed: number;
  retryCount: number; // >0 means self-corrected before final answer
  confidenceBefore?: number; // 1..5, optional (§36)
  caseId?: string; // links to RemediationCase when mode is remediation-* / probe / confirm
  misconceptionId?: string; // set when this attempt is a confirmation for a specific misconception
  // Phase 2 ELITE: mode가 'elite'/'elite-followup'일 때만 존재. 리듀서의 elite 프로필 갱신·
  // 실패 분류가 전부 이 payload의 순수 함수가 되도록 필요한 사실을 전부 담는다 (리플레이 무손실).
  elite?: {
    problemId: string;
    eliteMode: string; // ProblemMode
    requiredSkills: string[];
    hintsUsed: ('A' | 'B' | 'C' | 'D')[];
    strategySwitches: number;
    firstStrategy?: string;
    finalStrategy?: string;
    followUpDimension?: string | null; // EliteDimension (followup일 때)
    followUpOf?: string | null;
    // Phase 3 PART 36 — Productive Struggle 데이터 (Speed Score 아님)
    timeToFirstActionSec?: number;
    solutionRevealed?: boolean;
    returnedAfterPause?: boolean;
  };
}

export interface RemediationOutcomePayload {
  caseId: string;
  rootSkill: string;
  preMastery: number;
  postMastery: number;
  similarSuccess: number;
  transferSuccess: boolean;
}

export interface DiagnosticPlacementPayload {
  skillId: string;
  placementDifficulty: number; // 1..4 (matches v1-style adaptive 2-question placement)
  seedAlpha: number;
  seedBeta: number;
}

// Phase 3 PART 28 — Golden Set 시행 이벤트. mode = HOLDOUT_ASSESSMENT:
// mastery α/β 갱신 0, adaptive 영향 0, remediation 스케줄 0 — 오직 성장 측정 데이터.
// (reducer는 twin.holdout 장부에만 기록한다 — replay21에서 격리가 구조적으로 보장됨.)
export interface HoldoutAssessmentPayload {
  attemptId: string;
  itemId: string;
  form: 'A' | 'B' | 'C';
  parallelGroup: string;
  area: 'CORE' | 'NEAR_TRANSFER' | 'FAR_TRANSFER' | 'ELITE';
  eliteDimension?: string | null;
  skillIds: string[];
  difficulty: number;
  correct: boolean;
  chosenIndex: number;
  solveTimeSec: number;
  administrationId: string; // 한 번의 시행(Form 전체 응시)을 묶는 id — 성장 비교의 단위
}

export type LearningEventPayload = AttemptPayload | RemediationOutcomePayload | DiagnosticPlacementPayload | HoldoutAssessmentPayload;

export type LearningEventType = 'ATTEMPT' | 'REMEDIATION_OUTCOME' | 'DIAGNOSTIC_PLACEMENT' | 'HOLDOUT_ASSESSMENT';

export interface LearningEvent {
  seq: number;
  ts: number;
  type: LearningEventType;
  payload: LearningEventPayload;
  versions: { masteryModel: string; config: string };
}

export interface EventLog {
  events: LearningEvent[];
}

let seqCounter = 0;
export function resetEventSeq(start = 0) {
  seqCounter = start;
}

export function makeEvent(type: LearningEventType, payload: LearningEventPayload, versions: LearningEvent['versions'], ts = Date.now()): LearningEvent {
  return { seq: seqCounter++, ts, type, payload, versions };
}

export function appendEvent(log: EventLog, event: LearningEvent): EventLog {
  return { events: [...log.events, event] };
}

export function emptyLog(): EventLog {
  return { events: [] };
}
