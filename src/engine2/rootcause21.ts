// CHLOE MATH 2.1 — E4: Root Cause Engine + Information-Efficient Probe Selection
// (PART K, L, R4). Descends through the prerequisite graph (max depth 4), probing only
// candidates that are SHAKY or UNKNOWN (never re-probes something already STABLE), and
// treats an unexpected failure from a previously-strong prerequisite as needing one extra
// confirmation before it's trusted (AC11).
import { CONFIG21 } from './config21.ts';
import { prerequisitesOf } from './curriculum21.ts';
import { isSurprisingCandidate, type StabilityResult } from './stability21.ts';
import type { AgendaKind, RemediationCase } from './types21.ts';

export interface CandidateInfo {
  skillId: string;
  stability: StabilityResult;
  misconceptionEvidence: number; // 0..1-ish, higher = stronger active/suspected signal
  recentErrorRecurrence: number; // count of recent wrongs on this skill
  attributionProbability: number; // from attribution21, 0 if not directly implicated
}

export interface InvestigationContext {
  stabilityOf: (skillId: string) => StabilityResult;
  rawPOf: (skillId: string) => number;
  candidateInfoOf: (skillId: string) => CandidateInfo;
  estimatedSecOf: (skillId: string) => number;
}

// ---------------------------------------------------------------------------
// PART K — should we investigate at all?
// ---------------------------------------------------------------------------
export function needsInvestigation(errorType: string, consecutiveWrong: number, misconceptionImplicatesOtherSkill: boolean): boolean {
  return errorType === 'CONCEPT_GAP' || errorType === 'PREREQUISITE_GAP' || consecutiveWrong >= 2 || misconceptionImplicatesOtherSkill;
}

// ---------------------------------------------------------------------------
// PART K — root cause probability for one candidate
// ---------------------------------------------------------------------------
export function rootCauseProbability(c: CandidateInfo): number {
  const instabilityFactor = c.stability.classification === 'UNKNOWN' ? 1.0 : Math.max(0, 1 - (c.stability.stability ?? 0));
  return Math.max(0.0001, instabilityFactor) * (1 + c.misconceptionEvidence) * (1 + 0.3 * c.recentErrorRecurrence) * Math.max(0.05, c.attributionProbability || 0.3);
}

// ---------------------------------------------------------------------------
// PART L — information-efficient probe priority
// ---------------------------------------------------------------------------
export type Specificity = 'confirm' | 'narrow' | 'shared';
export function diagnosticSpecificity(kind: Specificity): number {
  const cfg = CONFIG21.probePriority;
  return kind === 'confirm' ? cfg.specificityConfirm : kind === 'narrow' ? cfg.specificityNarrow : cfg.specificityShared;
}

export function probePriority(c: CandidateInfo, specificity: Specificity, estimatedSec: number): number {
  const cfg = CONFIG21.probePriority;
  const u = c.stability.classification === 'UNKNOWN' ? cfg.uncertaintyBaseline + 0.3 : cfg.uncertaintyBaseline;
  const cost = Math.max(0.3, estimatedSec / 60);
  return (rootCauseProbability(c) * diagnosticSpecificity(specificity) * (0.5 + u)) / cost;
}

// ---------------------------------------------------------------------------
// Phase 3 PART 6-8 — 프로브 결과의 4상태 분류 + 경계선 요행 통과 방어
// ---------------------------------------------------------------------------
export type ProbeOutcome = 'CLEAR_PASS' | 'CLEAR_FAIL' | 'BORDERLINE' | 'UNKNOWN';

// 고위험 후보: 첫 프로브 1회 통과로 면죄하기엔 사전 증거가 너무 수상한 후보 (PART 7).
export function isHighRiskCandidate(c: CandidateInfo): boolean {
  const cfg = CONFIG21.rootCause.borderline;
  if (c.stability.classification === 'UNKNOWN') return true;
  if ((c.stability.stability ?? 0) < cfg.stabilityBelow) return true;
  return rootCauseProbability(c) >= cfg.rootCauseProbAbove;
}

export function classifyProbeOutcome(c: CandidateInfo, correct: boolean, orthogonalConfirmed: boolean): ProbeOutcome {
  if (!correct) return 'CLEAR_FAIL';
  if (orthogonalConfirmed) return 'CLEAR_PASS';
  if (c.stability.classification === 'UNKNOWN' && c.attributionProbability === 0) return 'UNKNOWN';
  return isHighRiskCandidate(c) ? 'BORDERLINE' : 'CLEAR_PASS';
}

export function classifyFrontier(prereqIds: string[], stabilityOf: (id: string) => StabilityResult) {
  const unknown: string[] = [];
  const shaky: string[] = [];
  const stable: string[] = [];
  for (const id of prereqIds) {
    const s = stabilityOf(id);
    (s.classification === 'UNKNOWN' ? unknown : s.classification === 'STABLE' ? stable : shaky).push(id);
  }
  return { unknown, shaky, stable };
}

// Unknown-first, then by probe priority (leaf/most-informative first).
export function orderProbeQueue(candidates: string[], infoOf: (id: string) => CandidateInfo, estSecOf: (id: string) => number): string[] {
  return [...candidates].sort((a, b) => {
    const infoA = infoOf(a);
    const infoB = infoOf(b);
    if (infoA.stability.classification === 'UNKNOWN' && infoB.stability.classification !== 'UNKNOWN') return -1;
    if (infoB.stability.classification === 'UNKNOWN' && infoA.stability.classification !== 'UNKNOWN') return 1;
    return probePriority(infoB, 'narrow', estSecOf(b)) - probePriority(infoA, 'narrow', estSecOf(a));
  });
}

// ---------------------------------------------------------------------------
// Investigation lifecycle
// ---------------------------------------------------------------------------
function buildQueue(parentSkillId: string, probesTakenCount: number, ctx: InvestigationContext): string[] {
  const cfg = CONFIG21.rootCause;
  const prereqs = prerequisitesOf(parentSkillId);
  const frontier = classifyFrontier(prereqs, ctx.stabilityOf);
  const candidates = [...frontier.unknown, ...frontier.shaky];
  const remainingBudget = cfg.maxProbePerCase - probesTakenCount;
  return orderProbeQueue(candidates, ctx.candidateInfoOf, ctx.estimatedSecOf).slice(0, Math.max(0, remainingBudget));
}

function descendOrFinalize(kase: RemediationCase, failedSkillId: string, ctx: InvestigationContext): RemediationCase {
  const cfg = CONFIG21.rootCause;
  if (kase.depth >= cfg.maxDepth || kase.probesTaken.length >= cfg.maxProbePerCase) {
    return { ...kase, rootCauseSkillId: failedSkillId, stage: 'micro-lesson', probeQueue: [] };
  }
  const queue = buildQueue(failedSkillId, kase.probesTaken.length, ctx);
  if (queue.length === 0) {
    return { ...kase, rootCauseSkillId: failedSkillId, stage: 'micro-lesson', probeQueue: [] };
  }
  return { ...kase, depth: kase.depth + 1, frontierParentSkillId: failedSkillId, probeQueue: queue, rootCauseSkillId: null };
}

function finalizeOrContinue(kase: RemediationCase): RemediationCase {
  if (kase.probeQueue.length > 0) return kase;
  // no candidate at this depth failed -> the frontier parent itself is the root cause
  return { ...kase, rootCauseSkillId: kase.frontierParentSkillId, stage: 'micro-lesson' };
}

export function beginInvestigation(input: {
  id: string;
  targetSkillId: string;
  targetDifficulty: number;
  originalAttemptId: string;
  errorType: string;
  likelyRootSkillId: string;
  ts: number;
  ctx: InvestigationContext;
}): RemediationCase {
  const base: RemediationCase = {
    id: input.id,
    targetSkillId: input.targetSkillId,
    targetDifficulty: input.targetDifficulty,
    originalAttemptId: input.originalAttemptId,
    createdTs: input.ts,
    errorType: input.errorType as RemediationCase['errorType'],
    probeQueue: [],
    probesTaken: [],
    depth: 0,
    frontierParentSkillId: input.likelyRootSkillId,
    pendingReconfirm: null,
    pendingOrthogonal: null,
    orthogonalTaken: [],
    rootCauseSkillId: null,
    stage: 'investigating',
    stageFailures: 0,
    stageProgress: 0,
    treatmentLog: [],
    outcome: null,
    gapClosureQuality: 'TEMPORARILY_FIXED',
    reopenedFromCaseId: null,
    linkedMisconceptionId: null,
  };
  return descendOrFinalize(base, input.likelyRootSkillId, input.ctx);
}

// 비진단성 오류: 실수·추측·시간압박의 프로브 오답은 개념 결손의 증거가 아니다 —
// careless-masquerade 가드(needsInvestigation)와 같은 원칙을 프로브 단계에도 적용.
const NON_DIAGNOSTIC_PROBE_ERRORS = new Set(['CARELESS_ERROR', 'GUESSING', 'TIME_PRESSURE']);

export function advanceInvestigation(kase: RemediationCase, result: { skillId: string; correct: boolean; attemptId: string; errorType?: string | null }, ctx: InvestigationContext): RemediationCase {
  const probesTaken = [...kase.probesTaken, { skillId: result.skillId, correct: result.correct, attemptId: result.attemptId }];

  // Phase 3 PART 8: 직교 확인 프로브의 결과 — 두 표현 모두 통과해야 CLEAR_PASS
  if (kase.pendingOrthogonal === result.skillId) {
    const queue = kase.probeQueue.filter((s) => s !== result.skillId);
    if (result.correct) {
      // 다른 표현에서도 통과 — 이제서야 진짜 면죄 (CLEAR_PASS)
      return finalizeOrContinue({ ...kase, probesTaken, probeQueue: queue, pendingOrthogonal: null });
    }
    // 직교 실패도 단일 실패다 — '놀라운 실패'(강해 보였던 후보)와 비진단성 오류는
    // AC11 재확인을 한 번 거친다. 우회시키면 실제-강한 UNKNOWN 후보의 요행-실패 노출이
    // 두 배가 되어 오귀속이 늘어난다 (Benchmark 2.0에서 실측).
    const stab = ctx.stabilityOf(result.skillId);
    const surprising = isSurprisingCandidate(stab, ctx.rawPOf(result.skillId)) || NON_DIAGNOSTIC_PROBE_ERRORS.has(result.errorType ?? '');
    if (surprising && probesTaken.length < CONFIG21.rootCause.maxProbePerCase) {
      return { ...kase, probesTaken, probeQueue: queue, pendingOrthogonal: null, pendingReconfirm: result.skillId };
    }
    // 요행 통과가 벗겨짐 — 이 스킬이 확정 frontier
    return descendOrFinalize({ ...kase, probesTaken, probeQueue: queue, pendingOrthogonal: null }, result.skillId, ctx);
  }

  // Case: this was the extra confirmation probe for a "surprising" failure (AC11)
  if (kase.pendingReconfirm === result.skillId) {
    const queue = kase.probeQueue.filter((s) => s !== result.skillId);
    if (result.correct) {
      // noise — discount the original failure, move on with the rest of the queue
      return finalizeOrContinue({ ...kase, probesTaken, probeQueue: queue, pendingReconfirm: null });
    }
    // confirmed real failure — this skill becomes the confirmed frontier; descend or finalize
    return descendOrFinalize({ ...kase, probesTaken, probeQueue: queue, pendingReconfirm: null }, result.skillId, ctx);
  }

  const queue = kase.probeQueue.filter((s) => s !== result.skillId);
  if (result.correct) {
    // Phase 3 PART 6/7/9: 고위험(경계선) 후보의 첫 통과는 면죄가 아니다 — 같은 스킬을
    // 다른 표현(transfer 변형)으로 1회 재확인. 상한은 "케이스당 1회"로 엄격 적용:
    // 후보마다 직교를 주면 한 조사에서 여러 후보가 연쇄 노출되어 프로브 예산이 소진되고,
    // 실제-강한 심층 후보의 요행-실패가 과잉 하강(BRR 악화)을 만든다 (Benchmark 2.0 실측).
    // 케이스당 1회면 가장 수상한 첫 경계선 후보(우선순위 정렬상 진짜 결손일 확률 최대)에
    // 방어가 집중된다.
    const cand = ctx.candidateInfoOf(result.skillId);
    const orthogonalBudgetLeft = (kase.orthogonalTaken ?? []).length < CONFIG21.rootCause.borderline.maxConfirm;
    if (
      classifyProbeOutcome(cand, true, false) === 'BORDERLINE' &&
      orthogonalBudgetLeft &&
      probesTaken.length < CONFIG21.rootCause.maxProbePerCase
    ) {
      return { ...kase, probesTaken, probeQueue: queue, pendingOrthogonal: result.skillId, orthogonalTaken: [...(kase.orthogonalTaken ?? []), result.skillId] };
    }
    return finalizeOrContinue({ ...kase, probesTaken, probeQueue: queue });
  }

  const stability = ctx.stabilityOf(result.skillId);
  const rawP = ctx.rawPOf(result.skillId);
  // Phase 3: 비진단성 오류(실수/추측/시간압박)의 프로브 오답도 재확인 대상 — 개념 결손
  // 증거가 아닌 실패로 즉시 하강하면 멀쩡한 전제가 오귀속된다 (strong-careless-probe 유형).
  const nonDiagnostic = NON_DIAGNOSTIC_PROBE_ERRORS.has(result.errorType ?? '');
  if ((isSurprisingCandidate(stability, rawP) || nonDiagnostic) && probesTaken.length < CONFIG21.rootCause.maxProbePerCase) {
    return { ...kase, probesTaken, probeQueue: queue, pendingReconfirm: result.skillId };
  }

  return descendOrFinalize({ ...kase, probesTaken, probeQueue: queue }, result.skillId, ctx);
}

// PART L "no over-testing rule": session/adaptive layer calls this to decide whether to
// interleave a non-diagnostic problem before continuing to probe.
export function exceedsConsecutiveProbeLimit(recentAgendaKinds: AgendaKind[]): boolean {
  const n = CONFIG21.rootCause.maxConsecutiveProbes;
  const tail = recentAgendaKinds.slice(-n);
  return tail.length >= n && tail.every((k) => k === 'probe' || k === 'confirm');
}
