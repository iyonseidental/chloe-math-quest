// CHLOE MATH 2.2 — ELITE MATHEMATICS LAYER (PART 13-31).
//
// Layer 2는 Layer 1(Mastery)을 대체하지 않는다 — 그 위에 쌓인다. 이 모듈이 지키는 원칙:
//   · Elite 능력은 micro-skill mastery와 절대 섞지 않는다 (PART 15) — 별도 프로필.
//   · KNOWLEDGE FAILURE와 REASONING FAILURE를 구별한다 (PART 29) — 전자는 기존 결손
//     파이프라인으로, 후자는 표현/전략 스캐폴드로. 하위학년 광역 복습 금지.
//   · Elite ≠ Difficulty 5 (PART 17) — problemMode는 난이도와 독립된 인지 유형이다.
//   · 느리게 깊게 푸는 것을 감점하지 않는다 (PART 24) — 시간은 추측 감지에만 쓴다.
//   · 모든 갱신은 이벤트 payload의 순수 함수 (reducer에서 실행 — 리플레이 무손실).
import { CONFIG21 } from './config21.ts';
import { MICRO_SKILL_MAP, ALL_SKILL_IDS, SKILL_CLUSTERS, CLUSTER_OF, type SkillCluster } from './curriculum21.ts';
import type { DigitalTwin21, SkillState21 } from './types21.ts';

// ---------------------------------------------------------------------------
// PART 17 — 인지 유형 (난이도와 직교)
// ---------------------------------------------------------------------------
export type ProblemMode =
  | 'STANDARD'
  | 'APPLICATION'
  | 'MULTI_SKILL'
  | 'NON_ROUTINE'
  | 'REVERSE'
  | 'GENERALIZATION'
  | 'PROOF'
  | 'MULTIPLE_SOLUTION'
  | 'ERROR_ANALYSIS'
  | 'OPEN_ENDED';

// ---------------------------------------------------------------------------
// PART 14/15 — Elite 능력 차원 (9개 수치 추적 + conceptualDepth는 explanation/justification
// followup 증거로 흡수 — 보고서에 명시)
// ---------------------------------------------------------------------------
export const ELITE_DIMENSIONS = [
  'representation',
  'strategySelection',
  'integration',
  'novelTransfer',
  'flexibility',
  'explanation',
  'generalization',
  'reverseReasoning',
  'justification',
] as const;
export type EliteDimension = (typeof ELITE_DIMENSIONS)[number];

// 차원별 Beta 의사관측 — mastery와 같은 수학, 다른 장부 (섞지 않음)
export interface EliteDimensionState {
  alpha: number;
  beta: number;
}
export type EliteProfileState = Record<EliteDimension, EliteDimensionState>;

export function freshEliteProfile(): EliteProfileState {
  const out = {} as EliteProfileState;
  for (const d of ELITE_DIMENSIONS) out[d] = { alpha: CONFIG21.elite.prior.alpha, beta: CONFIG21.elite.prior.beta };
  return out;
}

export function eliteDimensionLevel(s: EliteDimensionState): { level: number; evidence: number } {
  const priorMass = CONFIG21.elite.prior.alpha + CONFIG21.elite.prior.beta;
  return { level: s.alpha / (s.alpha + s.beta), evidence: Math.max(0, s.alpha + s.beta - priorMass) };
}

// ---------------------------------------------------------------------------
// PART 23 — Strategy Trace (가벼운 흔적 — 긴 글쓰기 강요 없음)
// ---------------------------------------------------------------------------
export interface StrategyTrace {
  problemId: string;
  eliteMode: ProblemMode;
  firstStrategy?: string;
  finalStrategy?: string;
  strategySwitches: number;
  hintsUsed: ('A' | 'B' | 'C' | 'D')[];
  solved: boolean;
  ts: number;
  // Phase 3 PART 36 — Productive Struggle 데이터 (Speed Score가 아니다):
  timeToFirstActionSec?: number; // 첫 반응(선택/전환/힌트)까지의 시간
  solvedWithoutSolutionReveal?: boolean;
  returnedAfterPause?: boolean;
  struggleQuality?: StruggleQuality; // PART 37 — 설명 가능한 휴리스틱 분류
}

// ---------------------------------------------------------------------------
// Phase 3 PART 37 — 분투의 질. black-box 금지: 각 판정은 규칙과 근거를 갖는다.
// ---------------------------------------------------------------------------
export type StruggleQuality = 'PRODUCTIVE_STRUGGLE' | 'STUCK_NO_PROGRESS' | 'RANDOM_TRIAL' | 'KNOWLEDGE_BLOCK';

export function classifyStruggle(input: {
  solved: boolean;
  solveTimeSec: number;
  estimatedSec: number;
  strategySwitches: number;
  hintsUsed: ('A' | 'B' | 'C' | 'D')[];
  knowledgeWeak: boolean; // 필요 스킬 부적정 (classifyEliteFailure의 KNOWLEDGE 판정과 동일 근거)
}): { quality: StruggleQuality; reason: string } {
  const timeRatio = input.solveTimeSec / Math.max(1, input.estimatedSec);
  if (input.knowledgeWeak) {
    return { quality: 'KNOWLEDGE_BLOCK', reason: '필요 개념 자체가 부적정 — 분투가 아니라 지식 차단 (기존 결손 경로 대상)' };
  }
  // 무작위 시도: 고민 없이 빠르게 틀림 — 탐색의 흔적(전환·힌트) 없이 예상 시간의 30% 미만
  if (!input.solved && timeRatio < 0.3 && input.strategySwitches === 0 && input.hintsUsed.length === 0) {
    return { quality: 'RANDOM_TRIAL', reason: `예상의 ${(timeRatio * 100).toFixed(0)}% 시간에 탐색 흔적 없이 오답 — 추측성 시도` };
  }
  // 생산적 분투: 충분히 머무르며 "움직임"(전환, 단계적 힌트, 또는 해결)이 있었음
  if (timeRatio >= 0.8 && (input.solved || input.strategySwitches > 0 || input.hintsUsed.length > 0)) {
    return { quality: 'PRODUCTIVE_STRUGGLE', reason: '오래 머물며 전략 탐색/단계적 힌트/해결의 움직임이 관찰됨 — 실패여도 훈련 가치 있음' };
  }
  if (input.solved) {
    return { quality: 'PRODUCTIVE_STRUGGLE', reason: '자력 해결 — 시간과 무관하게 생산적' };
  }
  return { quality: 'STUCK_NO_PROGRESS', reason: '움직임(전환·힌트·부분 진전) 없이 정체 — 개입(힌트 유도/모드 하향) 후보' };
}

// ---------------------------------------------------------------------------
// PART 29/30 — 실패 이원 분류 + Elite root cause 분류체계
// ---------------------------------------------------------------------------
export type EliteFailureKind = 'KNOWLEDGE_FAILURE' | 'REASONING_FAILURE';
export type EliteRootCause =
  | 'KNOWLEDGE_GAP'
  | 'REPRESENTATION_GAP'
  | 'STRATEGY_GAP'
  | 'INTEGRATION_GAP'
  | 'FLEXIBILITY_GAP'
  | 'GENERALIZATION_GAP'
  | 'JUSTIFICATION_GAP'
  | 'COGNITIVE_OVERLOAD';

export interface EliteFailureDiagnosis {
  kind: EliteFailureKind;
  rootCause: EliteRootCause;
  weakSkillId: string | null; // KNOWLEDGE_FAILURE일 때 기존 파이프라인 진입점
  reason: string;
}

// 필요 스킬의 지식 적정성: 게이트 수준까진 아니어도 "풀이에 동원 가능한" 수준(p, 증거)인가
function skillAdequate(s: SkillState21): boolean {
  const p = s.alpha / (s.alpha + s.beta);
  return p >= CONFIG21.elite.knowledgeAdequateP && s.attempts >= 2;
}

export function classifyEliteFailure(input: {
  twin: DigitalTwin21;
  requiredSkills: string[];
  eliteMode: ProblemMode;
  hintsUsed: ('A' | 'B' | 'C' | 'D')[];
  strategySwitches: number;
  solveTimeSec: number;
  estimatedSec: number;
  failedFollowUpDimension?: EliteDimension | null;
}): EliteFailureDiagnosis {
  // 1) KNOWLEDGE FAILURE: 필요한 개념 자체가 부적정 → 기존 결손 파이프라인 (PART 29/EQA2)
  const weak = input.requiredSkills.filter((id) => input.twin.skills[id] && !skillAdequate(input.twin.skills[id]));
  if (weak.length > 0) {
    // 가장 약한 스킬을 진입점으로
    weak.sort((a, b) => {
      const pa = input.twin.skills[a].alpha / (input.twin.skills[a].alpha + input.twin.skills[a].beta);
      const pb = input.twin.skills[b].alpha / (input.twin.skills[b].alpha + input.twin.skills[b].beta);
      return pa - pb;
    });
    return { kind: 'KNOWLEDGE_FAILURE', rootCause: 'KNOWLEDGE_GAP', weakSkillId: weak[0], reason: `필요 개념 부적정: ${weak.join(', ')} → 기존 Knowledge Gap 경로` };
  }

  // 2) REASONING FAILURE: 개념은 전부 적정 — 하위학년 복습 금지 (PART 29/EQA1).
  //    유형은 문제 모드 + 힌트 사다리 사용 패턴 + 전환 흔적으로 판정.
  if (input.failedFollowUpDimension === 'generalization') {
    return { kind: 'REASONING_FAILURE', rootCause: 'GENERALIZATION_GAP', weakSkillId: null, reason: '본문은 해결, 일반화 후속에서 실패' };
  }
  if (input.failedFollowUpDimension === 'justification' || input.failedFollowUpDimension === 'explanation') {
    return { kind: 'REASONING_FAILURE', rootCause: 'JUSTIFICATION_GAP', weakSkillId: null, reason: '답은 맞으나 근거 제시 불완전' };
  }
  // Phase 3 PART 38: COGNITIVE_OVERLOAD는 "오래 풀었다"만으로 판정 금지 — 시간 신호에
  // 더해 다음 후보 증거 중 2개 이상이 겹쳐야 한다:
  //   (a) 여러 전략을 세웠다 버림 (switches ≥ 2)  (b) 힌트 사다리 반복 상승 (≥ 3단)
  //   (c) 작업기억 부하가 큰 구조 (필요 스킬 ≥ 3 또는 MULTI_SKILL/OPEN_ENDED)
  // (전제 적정성은 이미 위에서 확인됨 — KNOWLEDGE 분기가 먼저 걸러졌다.)
  {
    const longStall = input.solveTimeSec > input.estimatedSec * CONFIG21.elite.overloadTimeRatio;
    const overloadSignals = [
      input.strategySwitches >= 2,
      input.hintsUsed.length >= 3,
      input.requiredSkills.length >= 3 || input.eliteMode === 'MULTI_SKILL' || input.eliteMode === 'OPEN_ENDED',
    ].filter(Boolean).length;
    if (longStall && overloadSignals >= 2) {
      return { kind: 'REASONING_FAILURE', rootCause: 'COGNITIVE_OVERLOAD', weakSkillId: null, reason: `장시간 정체 + 과부하 신호 ${overloadSignals}개(전략 폐기/힌트 반복/다중 구조) — 부하 분해 필요` };
    }
  }
  if (input.eliteMode === 'MULTI_SKILL') {
    return { kind: 'REASONING_FAILURE', rootCause: 'INTEGRATION_GAP', weakSkillId: null, reason: '개별 개념은 적정하나 결합 실패' };
  }
  if (input.hintsUsed.includes('B')) {
    return { kind: 'REASONING_FAILURE', rootCause: 'REPRESENTATION_GAP', weakSkillId: null, reason: '표현(REPRESENT) 힌트까지 필요 — 문제 표상 전환이 관문' };
  }
  if (input.strategySwitches === 0 && input.hintsUsed.length >= 2) {
    return { kind: 'REASONING_FAILURE', rootCause: 'FLEXIBILITY_GAP', weakSkillId: null, reason: '첫 전략 고수 + 힌트 다수 — 전환 훈련 필요' };
  }
  return { kind: 'REASONING_FAILURE', rootCause: 'STRATEGY_GAP', weakSkillId: null, reason: '전략 선택/설계가 관문' };
}

// ---------------------------------------------------------------------------
// Elite 증거 갱신 — 이벤트 payload의 순수 함수 (reducer에서 호출)
// PART 24: 시간은 감점 사유가 아니다. 힌트는 증거 가중만 낮춘다(불이익이 아니라 약한 신호).
// ---------------------------------------------------------------------------
export interface EliteEvidencePayload {
  problemId: string;
  eliteMode: ProblemMode;
  requiredSkills: string[];
  correct: boolean;
  hintsUsed: ('A' | 'B' | 'C' | 'D')[];
  strategySwitches: number;
  solveTimeSec: number;
  estimatedSec: number;
  // followup이면: 어느 차원을 검증하는 후속인가
  followUpDimension?: EliteDimension | null;
  followUpOf?: string | null;
}

// ---------------------------------------------------------------------------
// Phase 3 PART 19/20 — Elite Evidence Attribution 2.0.
// 문제마다 저작 시 선언하는 증거 지도: 주 차원(전량) + 부 차원(선언된 비율만) +
// 배제 차원(이 문제로는 절대 갱신 금지 — 자동 교차오염 차단).
// ---------------------------------------------------------------------------
export interface EliteEvidenceMap {
  primaryDimension: EliteDimension;
  secondaryDimensions: { dimension: EliteDimension; evidenceFraction: number }[];
  exclusionDimensions: EliteDimension[];
}

// 모드 기본 지도 — evidenceMap을 선언하지 않은 문제의 fallback (저작 감사 전 과도기용).
const MODE_DIMENSIONS: Partial<Record<ProblemMode, EliteDimension[]>> = {
  NON_ROUTINE: ['novelTransfer', 'strategySelection'],
  MULTI_SKILL: ['integration', 'strategySelection'],
  REVERSE: ['reverseReasoning'],
  GENERALIZATION: ['generalization'],
  ERROR_ANALYSIS: ['justification', 'explanation'],
  MULTIPLE_SOLUTION: ['flexibility', 'strategySelection'],
  PROOF: ['justification'],
  OPEN_ENDED: ['strategySelection', 'flexibility'],
  APPLICATION: ['representation'],
};

export function applyEliteEvidence(profile: EliteProfileState, p: EliteEvidencePayload, evidenceMap?: EliteEvidenceMap | null): EliteProfileState {
  const cfg = CONFIG21.elite;
  const next: EliteProfileState = { ...profile };
  const excluded = new Set(evidenceMap?.exclusionDimensions ?? []);
  const bump = (dim: EliteDimension, correctW: number, wrongW: number) => {
    if (excluded.has(dim)) return; // PART 20: 배제 차원은 어떤 경로로도 갱신 금지
    const cur = next[dim];
    next[dim] = p.correct ? { alpha: cur.alpha + correctW, beta: cur.beta } : { alpha: cur.alpha, beta: cur.beta + wrongW };
  };

  const hintDiscount = Math.pow(cfg.hintEvidenceDiscount, p.hintsUsed.length);

  if (p.followUpDimension) {
    // 후속 문항은 지정 차원에 집중 증거 (후속의 차원 선언이 곧 그 문항의 지도)
    bump(p.followUpDimension, cfg.followUpCorrect * hintDiscount, cfg.followUpWrong);
    return next;
  }

  if (evidenceMap) {
    // 2.0: 저작 선언 지도 — 주 차원 전량 + 부 차원은 선언된 비율만 (PART 19)
    bump(evidenceMap.primaryDimension, cfg.mainCorrect * hintDiscount, cfg.mainWrong);
    for (const sec of evidenceMap.secondaryDimensions) {
      bump(sec.dimension, cfg.mainCorrect * hintDiscount * sec.evidenceFraction, cfg.mainWrong * sec.evidenceFraction);
    }
  } else {
    const dims = MODE_DIMENSIONS[p.eliteMode] ?? [];
    for (const d of dims) bump(d, cfg.mainCorrect * hintDiscount, cfg.mainWrong);
  }

  // 아래 두 가점은 "실제로 관찰된 행동"에 대한 증거다 (PART 20의 예외가 아니라 취지 그 자체):
  // 표현 힌트(B) 없이 비정형을 뚫으면 representation 가점; B가 결정타였다면 표현 증거는 약세
  if (p.eliteMode === 'NON_ROUTINE' || p.eliteMode === 'APPLICATION') {
    if (p.correct && !p.hintsUsed.includes('B')) bump('representation', cfg.mainCorrect * 0.5, 0);
    else if (!p.correct && p.hintsUsed.includes('B')) bump('representation', 0, cfg.mainWrong * 0.5);
  }
  // 전환 후 성공 = flexibility의 실증 (첫 전략 실패 → 다른 전략 성공, PART 14-6/EQA4)
  if (p.correct && p.strategySwitches > 0) bump('flexibility', cfg.mainCorrect, 0);

  return next;
}

// ---------------------------------------------------------------------------
// PART 16 — Elite Readiness (스킬 클러스터 = 영역 단위)
// ---------------------------------------------------------------------------
export type ReadinessTier = 'FOUNDATION' | 'ADVANCED' | 'ELITE';

// 공통 코어: 임의의 스킬 집합에 대한 readiness — Core 안정 + 게이트 + transfer 실증 +
// 활성 오개념 차단. 요구 게이트 수는 집합 크기에 맞게 조정 (1-스킬 클러스터도 판정 가능).
function readinessForSkills(twin: DigitalTwin21, ids: string[]): ReadinessTier {
  const cfg = CONFIG21.elite;
  if (ids.length === 0) return 'FOUNDATION';
  const states = ids.map((id) => twin.skills[id]).filter(Boolean);
  const avgP = states.reduce((a, s) => a + s.alpha / (s.alpha + s.beta), 0) / states.length;
  const gated = states.filter((s) => ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(s.knowledgeState)).length;
  const transferVerified = states.filter((s) => Object.values(s.transfer.passedAt).some(Boolean)).length;
  const activeMis = twin.misconceptions.some((m) => m.status === 'ACTIVE' && ids.includes(m.skillId));
  const evidenced = states.filter((s) => s.attempts >= 3).length;
  const needGated = Math.min(cfg.eliteReadyGated, ids.length);

  if (activeMis) return 'FOUNDATION'; // 활성 오개념 있는 집합엔 elite 도전 금지 (전제 안정 요건)
  if (avgP >= cfg.eliteReadyAvgP && gated >= needGated && transferVerified >= 1) return 'ELITE';
  if (avgP >= cfg.advancedReadyAvgP && evidenced >= Math.min(3, ids.length)) return 'ADVANCED';
  return 'FOUNDATION';
}

export function domainReadiness(twin: DigitalTwin21, domain: string): ReadinessTier {
  return readinessForSkills(twin, ALL_SKILL_IDS.filter((id) => MICRO_SKILL_MAP[id].domain === domain));
}

// Phase 3 PART 22/23 — 클러스터 단위 readiness. Elite 도전 자격은 이제 이것으로 판정한다:
// 관련 클러스터 전부가 ELITE여야 함 — "대수 전체 평균"이 약한 함수 클러스터를 가려주지 못한다.
export function clusterReadiness(twin: DigitalTwin21, clusterId: string): ReadinessTier {
  const cluster = SKILL_CLUSTERS.find((c) => c.id === clusterId);
  return cluster ? readinessForSkills(twin, cluster.skills) : 'FOUNDATION';
}

export function clustersOfSkills(skillIds: string[]): SkillCluster[] {
  const seen = new Map<string, SkillCluster>();
  for (const id of skillIds) {
    const c = CLUSTER_OF[id];
    if (c) seen.set(c.id, c);
  }
  return [...seen.values()];
}

// PART 23: 문제의 필요 스킬이 걸친 모든 클러스터가 ELITE여야 도전 자격
export function eliteEligibleForSkills(twin: DigitalTwin21, requiredSkills: string[]): boolean {
  const clusters = clustersOfSkills(requiredSkills);
  if (clusters.length === 0) return false;
  return clusters.every((c) => clusterReadiness(twin, c.id) === 'ELITE');
}

// ---------------------------------------------------------------------------
// PART 27 — Challenge Value: "가장 어려운 문제"가 아니라 "지금 가장 성장시키는 문제"
// ---------------------------------------------------------------------------
export interface EliteProblemMeta {
  id: string;
  mode: ProblemMode;
  difficulty: number; // 1..5 (모드와 직교)
  domain: string;
  requiredSkills: string[];
  noveltyScore: number; // 0..1 저작 시 부여 (형태의 낯섦)
  reasoningValue: number; // 0..1 저작 시 부여 (추론 훈련 가치)
  // Phase 3 PART 19: 저작 선언 증거 지도 (은행 문제는 전수 선언 — validateEliteBank 강제)
  evidenceMap?: EliteEvidenceMap;
  // Phase 3 PART 13: novelty 서명 — "문항 수 채우기용 복제"를 기계적으로 거부하기 위한 구조 지문
  noveltySignature?: NoveltySignature;
}

// Phase 3 PART 13 — Novelty Signature: 지나치게 유사한 문제는 validation에서 reject.
export interface NoveltySignature {
  representationType: string; // 문장/식/표/그래프/수직선/도형/퍼즐 ...
  requiredSkillCombination: string[];
  dominantReasoningMove: string; // invariant-analysis / case-split / reverse-construction / ...
  structuralPattern: string; // 문제 구조의 고유 라벨
  solutionFamily: string[];
}

export interface ChallengeScore {
  problemId: string;
  value: number;
  breakdown: Record<string, number>;
  expectedSuccess: number;
  reason: string;
}

export function challengeValue(twin: DigitalTwin21, meta: EliteProblemMeta, recentEliteIds: string[]): ChallengeScore {
  const cfg = CONFIG21.elite;
  const skills = meta.requiredSkills.map((id) => twin.skills[id]).filter(Boolean);
  const ps = skills.map((s) => s.alpha / (s.alpha + s.beta));
  const relevantMastery = ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0;
  const integrationOpportunity = 1 + cfg.integrationWeight * Math.max(0, meta.requiredSkills.length - 1);
  const novelty = 0.5 + meta.noveltyScore * (recentEliteIds.includes(meta.id) ? 0.1 : 1); // 최근 낸 문제는 novelty 소멸
  const reasoningValue = 0.5 + meta.reasoningValue;
  // Advanced Flow Zone (PART 28): elite 목표 성공률 대역의 중심에 가까울수록 "적정 분투"
  const expectedSuccess = relevantMastery * Math.pow(cfg.eliteDifficultyDrag, Math.max(0, meta.difficulty - 3));
  const zoneCenter = (cfg.flowZone[0] + cfg.flowZone[1]) / 2;
  const appropriateStruggle = Math.max(0.1, 1 - Math.abs(expectedSuccess - zoneCenter) * 2);
  const curriculumRelevance = meta.requiredSkills.some((id) => (MICRO_SKILL_MAP[id]?.importance ?? 1) >= 1.1) ? 1.1 : 1.0;

  const value = relevantMastery * integrationOpportunity * novelty * reasoningValue * appropriateStruggle * curriculumRelevance;
  return {
    problemId: meta.id,
    value,
    expectedSuccess,
    breakdown: { relevantMastery, integrationOpportunity, novelty, reasoningValue, appropriateStruggle, curriculumRelevance },
    reason: `성장 기대값 ${value.toFixed(2)} (예상 성공률 ${(expectedSuccess * 100).toFixed(0)}% — Elite 분투 대역 ${cfg.flowZone[0] * 100}~${cfg.flowZone[1] * 100}%)`,
  };
}

// ---------------------------------------------------------------------------
// Phase 3 PART 39/40 — One Problem Deep 2.0: 후속을 "전부" 묻지 않는다.
// DeepValue = 약한 차원 × 관련 숙달 × novelty × 노출 격차 × 인지부하 적합 — 최고 하나만.
// ---------------------------------------------------------------------------
export interface DeepValueScore {
  followUpId: string;
  dimension: EliteDimension;
  value: number;
  breakdown: Record<string, number>;
  reason: string;
}

export function deepValue(
  twin: DigitalTwin21,
  requiredSkills: string[],
  fu: { id: string; dimension: EliteDimension },
  mainHintsUsed: number,
): DeepValueScore {
  const dimState = twin.elite[fu.dimension];
  const { level, evidence } = eliteDimensionLevel(dimState);
  const weakDimension = 1 - level; // 부족한 사고 능력일수록 후속 가치 ↑ (PART 40)
  const skills = requiredSkills.map((id) => twin.skills[id]).filter(Boolean);
  const relevantMastery = skills.length ? skills.reduce((a, s) => a + s.alpha / (s.alpha + s.beta), 0) / skills.length : 0.5;
  const novelty = twin.recentEliteIds.includes(fu.id) ? 0.2 : 1; // 같은 후속 재탕 방지
  const exposureGap = 1 / (1 + evidence); // 관찰이 적은 차원일수록 정보 가치 ↑
  // 본문을 힌트로 겨우 뚫었으면 지금 더 깊이 파는 것은 부하 초과 — 적합도 하향 (PART 25/38)
  const cognitiveLoadFit = mainHintsUsed <= 1 ? 1 : mainHintsUsed === 2 ? 0.6 : 0.3;

  const value = weakDimension * relevantMastery * novelty * (0.5 + exposureGap) * cognitiveLoadFit;
  return {
    followUpId: fu.id,
    dimension: fu.dimension,
    value,
    breakdown: { weakDimension, relevantMastery, novelty, exposureGap, cognitiveLoadFit },
    reason: `가장 부족한 사고(${fu.dimension}, 수준 ${(level * 100).toFixed(0)})를 지금 맥락에서 강화`,
  };
}

export function pickDeepFollowUp<T extends { id: string; dimension: EliteDimension }>(
  twin: DigitalTwin21,
  requiredSkills: string[],
  followUps: T[],
  mainHintsUsed: number,
): { fu: T; score: DeepValueScore } | null {
  if (followUps.length === 0) return null;
  let best: { fu: T; score: DeepValueScore } | null = null;
  for (const fu of followUps) {
    const score = deepValue(twin, requiredSkills, fu, mainHintsUsed);
    if (!best || score.value > best.score.value) best = { fu, score };
  }
  return best;
}

// PART 31/EQA10 — 모드 비율: 선행은 빠른데 elite profile이 낮으면 elite 도전 비중 자동 증가
export function eliteShareTarget(twin: DigitalTwin21): number {
  const cfg = CONFIG21.elite;
  const gatedCount = ALL_SKILL_IDS.filter((id) => ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(twin.skills[id].knowledgeState)).length;
  const curriculumPace = gatedCount / ALL_SKILL_IDS.length;
  const dims = ELITE_DIMENSIONS.map((d) => eliteDimensionLevel(twin.elite[d]).level);
  const eliteAvg = dims.reduce((a, b) => a + b, 0) / dims.length;
  // 진도(pace)가 사고력(eliteAvg)을 앞설수록 비중 상향 — 단 학습 자체를 막지 않는 상한
  const gap = Math.max(0, curriculumPace - eliteAvg);
  return Math.min(cfg.maxShare, cfg.baseShare + gap * cfg.gapBoost);
}
