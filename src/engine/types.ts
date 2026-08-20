// 엔진 전역에서 공유하는 타입. React에 의존하지 않는다.

// 트랙 = 대한민국 교육과정의 학습 단위. 중학교는 학년(중1~3),
// 고등학교는 2022 개정 교육과정 과목(공통수학1·2, 대수, 미적분Ⅰ·Ⅱ, 확률과 통계, 기하)
export type TrackId = 'M1' | 'M2' | 'M3' | 'H.CM1' | 'H.CM2' | 'H.ALG' | 'H.CAL1' | 'H.PRB' | 'H.CAL2' | 'H.GEO';
export type Grade = TrackId; // 스킬의 소속 트랙
export type Domain = 'NUM' | 'ALG' | 'FUN' | 'GEO' | 'STA';
export type SkillId = string; // 예: "M1.ALG.EQ"

export interface TrackDef {
  id: TrackId;
  name: string;
  emoji: string;
  category: 'middle' | 'high-common' | 'high-elective' | 'high-career';
  description: string;
  prereqTracks: TrackId[];
  hasContent: boolean; // false면 콘텐츠 준비 중 (Phase 3)
}

export type Level = 1 | 2 | 3 | 4 | 5;

export const LEVEL_NAMES: Record<Level, string> = {
  1: 'Foundation',
  2: 'Practice',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Elite',
};

export interface SkillDef {
  id: SkillId;
  grade: Grade;
  domain: Domain;
  name: string;
  icon: string;
  color: string;
  description: string;
  prerequisites: SkillId[];
  conceptCard: string; // Error Clinic의 Concept Review에서 보여주는 핵심 개념 요약
  playable: boolean; // false면 그래프에만 존재하는 선행 예고 노드
}

// ---- WHY WRONG ENGINE taxonomy ----
export type ErrorType =
  | 'CONCEPT'
  | 'CALCULATION'
  | 'SIGN'
  | 'FORMULA'
  | 'INTERPRETATION'
  | 'CARELESS'
  | 'PREREQUISITE'
  | 'TIME'
  | 'GUESSING';

export type SelfTag =
  | 'no-concept' // 개념을 몰랐다
  | 'calc-slip' // 계산 실수
  | 'misread' // 문제를 잘못 읽었다
  | 'no-strategy' // 풀이 방법이 떠오르지 않았다
  | 'forgot-formula' // 공식을 잊었다
  | 'time' // 시간이 부족했다
  | 'unknown'; // 잘 모르겠다

export type Variant = 'standard' | 'similarA' | 'similarB' | 'transfer' | 'review' | 'diagnostic' | 'challenge' | 'warmup';

export interface Choice {
  text: string;
  errorType: ErrorType | null; // 정답이면 null, 오답이면 이 선택지를 고르게 만든 실수 유형
  // Phase 2 PART 5-1: distractor 단위 오개념 태깅 (선택 — 태깅된 생성기부터 점진 적용).
  // errorType은 "실수의 겉모습", misconceptionId는 "그 실수를 만들어내는 구체적 오규칙".
  misconceptionId?: string; // 예: 'MIS.SIGN.NEGSQ' (−a²을 (−a)²으로 계산)
  diagnosticStrength?: 'HIGH' | 'MEDIUM' | 'LOW'; // 이 오답 선택이 해당 오개념을 얼마나 강하게 지목하는가
}

export interface Problem {
  id: string;
  skillId: SkillId;
  level: Level;
  variant: Variant;
  stem: string;
  choices: Choice[];
  answerIndex: number;
  hints: [string, string, string]; // Step Hint: 방향 → 개념 → 첫 단계
  idea: string; // 해설 3단: 어떤 관점으로 볼 것인가
  solve: string; // 풀이 과정
  remember: string; // 다음에 기억할 핵심
  estimatedSec: number;
}

export interface ProblemSnapshot {
  stem: string;
  choices: string[];
  answerIndex: number;
  idea: string;
  solve: string;
  remember: string;
}

export interface Attempt {
  id: string;
  ts: number;
  skillId: SkillId;
  level: Level;
  variant: Variant;
  correct: boolean;
  chosenIndex: number;
  timeMs: number;
  hintsUsed: number;
  autoDiagnosis: ErrorType | null;
  selfDiagnosis: SelfTag | null;
  problem: ProblemSnapshot;
  clinicCaseId: string | null;
}

export interface AttemptSummary {
  correct: boolean;
  level: Level;
  variant: Variant;
  hintsUsed: number;
  timeMs: number;
  estimatedSec: number;
  autoDiagnosis: ErrorType | null;
  ts: number;
}

export interface SkillState {
  mastery: number; // 0~100
  level: Level; // 현재 도전 중인 난이도
  masteredLevels: Level[];
  attempts: number;
  correct: number;
  recentWindow: AttemptSummary[]; // 최근 12개 (게이트/mastery 판정)
  errorCounts: Partial<Record<ErrorType, number>>;
  transferPassedAtLevel: Partial<Record<Level, boolean>>;
  consecutiveCorrect: number; // 무힌트 연속 정답 (skip test 판단)
  consecutiveWrong: number; // frustration protection 판단
  reviewAdjust: number; // 복습 성공/실패 누적 보정 (mastery에 합산)
}

// ---- Error Clinic ----
export type ClinicStage = 'review' | 'similarA' | 'similarB' | 'transfer' | 'check' | 'done';

export interface ClinicCase {
  id: string;
  skillId: SkillId;
  level: Level;
  createdTs: number;
  stage: ClinicStage;
  originalAttemptId: string;
  diagnosis: ErrorType;
  failuresInStage: number;
  resolved: boolean;
  resolvedTs?: number; // 완치 시각 (주간 리포트의 "교정된 약점" 집계용)
}

// ---- Spaced Repetition ----
export interface ReviewState {
  skillId: SkillId;
  level: Level;
  stage: number; // REVIEW_INTERVALS의 인덱스
  dueDate: string; // YYYY-MM-DD
  passes: number;
  lapses: number;
}

export interface Snapshot {
  date: string;
  overallMastery: number;
  bySkill: Record<SkillId, number>;
}

export interface StudentModel {
  version: number;
  name: string;
  activeTrack: TrackId; // 현재 학습 중인 과정
  diagnosedTracks: TrackId[]; // 진단평가를 마친 과정들
  unlockedTracks?: TrackId[]; // 선행 순서와 무관하게 사용자가 "미리 열기"로 개방한 과정들
  createdAt: number;
  lastActiveDate: string | null;
  streakDays: number;
  xp: number;
  badges: string[];
  skills: Record<SkillId, SkillState>;
  attempts: Attempt[];
  clinicQueue: ClinicCase[];
  reviews: ReviewState[];
  snapshots: Snapshot[];
}

// recordAnswer가 UI에 돌려주는 이벤트 (애니메이션/토스트용)
export interface RecordResult {
  xpGain: number;
  xpReasons: string[];
  leveledUp: Level | null;
  masteryDelta: number;
  newBadges: string[];
  autoDiagnosis: ErrorType | null;
  clinicCaseCreated: boolean;
  clinicCaseResolved: boolean;
}
