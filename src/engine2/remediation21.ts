// CHLOE MATH 2.1 — E5: Minimum-Dose Remediation Engine (PART I).
// Treats only the confirmed root skill (never the whole grade), then bridges back and
// proves the fix transfers before declaring the case closed. A transfer failure is not
// "one more miss" — it means understanding was never really there, so it sends the
// student all the way back to the concept, not just one stage down (PART I failure rule).
import { CONFIG21 } from './config21.ts';
import type { RemediationCase, RemediationOutcome, RemediationStage, GapClosureQuality } from './types21.ts';

function stageSequence(hasBridge: boolean): RemediationStage[] {
  return hasBridge ? ['micro-lesson', 'foundation', 'bridge', 'similarA', 'similarB', 'transfer', 'resolved'] : ['micro-lesson', 'foundation', 'similarA', 'similarB', 'transfer', 'resolved'];
}
function nextStage(stage: RemediationStage, hasBridge: boolean): RemediationStage {
  const seq = stageSequence(hasBridge);
  const i = seq.indexOf(stage);
  return seq[Math.min(seq.length - 1, i + 1)];
}
function prevStage(stage: RemediationStage, hasBridge: boolean): RemediationStage {
  const seq = stageSequence(hasBridge);
  const i = seq.indexOf(stage);
  return seq[Math.max(0, i - 1)];
}
function stageTarget(stage: RemediationStage): number {
  return stage === 'foundation' ? CONFIG21.remediation.foundationTarget : 1;
}

export function hasBridgeStage(kase: RemediationCase): boolean {
  return kase.rootCauseSkillId !== null && kase.rootCauseSkillId !== kase.targetSkillId;
}

// Investigation just finished (stage === 'micro-lesson') — the student reads the concept
// card for the root skill, no attempt involved, then moves into the foundation check.
export function acknowledgeMicroLesson(kase: RemediationCase): RemediationCase {
  if (kase.stage !== 'micro-lesson') return kase;
  return { ...kase, stage: 'foundation', stageProgress: 0, stageFailures: 0 };
}

export function skillForStage(kase: RemediationCase): string {
  return kase.stage === 'foundation' ? (kase.rootCauseSkillId ?? kase.targetSkillId) : kase.targetSkillId;
}

export function difficultyForStage(kase: RemediationCase): number {
  // 2.2 GATE B: similar/transfer 단계는 후퇴가 반복될수록 난이도를 한 단계씩 내린다
  // (deEscalations). 케이스 targetDifficulty는 '실패 당시' 난이도라 학생의 실제 수준보다
  // 높게 래칫되어 있을 수 있고, 그대로 고집하면 foundation↔similar 핑퐁이 세션을 독점한다
  // (실측: 한 케이스 treatmentLog 92개). 치료는 학생 눈높이에서 — 회복 후 난이도 상승은
  // 케이스 밖의 일반 진행이 담당한다.
  const deEsc = kase.deEscalations ?? 0;
  const effTarget = Math.max(2, kase.targetDifficulty - deEsc);
  switch (kase.stage) {
    case 'foundation':
      return 1;
    case 'bridge':
      return Math.max(1, effTarget - 1);
    default:
      return effTarget;
  }
}

export interface RemediationAdvanceResult {
  case: RemediationCase;
  needsDeeperProbe: boolean; // caller must re-open investigation on kase.rootCauseSkillId
}

export function advanceRemediation(kase: RemediationCase, correct: boolean, attemptId: string): RemediationAdvanceResult {
  const hasBridge = hasBridgeStage(kase);
  const logged: RemediationCase = { ...kase, treatmentLog: [...kase.treatmentLog, { stage: kase.stage, correct, attemptId }] };

  // 2.2 GATE B 안전 상한: 어떤 경로든 한 케이스의 총 치료 시도가 이 값을 넘으면 유예 종결.
  // (난이도 하향이 1차 방어이고, 이것은 미처 못 잡은 조합에 대한 최후 방어선이다.)
  if (logged.treatmentLog.length >= CONFIG21.remediation.maxTreatmentAttempts) {
    return { case: { ...logged, stage: 'abandoned', stageProgress: 0, stageFailures: 0 }, needsDeeperProbe: false };
  }

  if (correct) {
    const progress = logged.stageProgress + 1;
    if (progress >= stageTarget(logged.stage)) {
      const next = nextStage(logged.stage, hasBridge);
      return { case: { ...logged, stage: next, stageProgress: 0, stageFailures: 0 }, needsDeeperProbe: false };
    }
    return { case: { ...logged, stageProgress: progress }, needsDeeperProbe: false };
  }

  // wrong:
  if (logged.stage === 'transfer') {
    // PART I: transfer failure means understanding was never really there — restart at
    // the concept, not just one stage back. Also see PART H: this attempt's own mastery
    // evidence (applied by the caller via attribution21/mastery21) already prevents a
    // premature PROVISIONAL state; this only controls the remediation *flow*.
    //
    // Phase 2 GATE B 수정: 전면 재시작이 '무한'이면 중간 실력대 학생이 한 스킬의 치료
    // 루프에 세션을 독점당한다 (test22-m1full ⑥에서 실측: 600회 중 68%가 한 스킬).
    // maxTransferRestarts회 재시작 후에도 transfer가 안 되면 케이스를 '유예(abandoned)'로
    // 닫는다 — 삭제가 아니라 이력 보존 종결이며, 스킬은 게이트 미통과 상태로 남아
    // 적응 우선순위(다양성 페널티 포함)가 자연 간격을 두고 재방문한다.
    const transferFails = logged.treatmentLog.filter((t) => t.stage === 'transfer' && !t.correct).length;
    if (transferFails > CONFIG21.remediation.maxTransferRestarts) {
      return { case: { ...logged, stage: 'abandoned', stageProgress: 0, stageFailures: 0 }, needsDeeperProbe: false };
    }
    return { case: { ...logged, stage: 'micro-lesson', stageProgress: 0, stageFailures: 0 }, needsDeeperProbe: false };
  }

  const failures = logged.stageFailures + 1;
  if (logged.stage === 'foundation' && failures >= CONFIG21.remediation.maxStageFailures) {
    // the "root cause" we treated wasn't actually solid — go probe deeper instead of
    // just repeating easy problems on a skill that itself needs investigating.
    return { case: { ...logged, stageFailures: 0, stageProgress: 0 }, needsDeeperProbe: true };
  }
  if (failures >= CONFIG21.remediation.maxStageFailures) {
    const prev = prevStage(logged.stage, hasBridge);
    // 후퇴는 "이 난이도가 아직 무리"라는 신호 — 다음 similar/transfer 서빙 난이도를 한 단계
    // 낮춘다 (difficultyForStage의 deEscalations 반영, 핑퐁 독점 방지의 1차 방어)
    return { case: { ...logged, stage: prev, stageFailures: 0, stageProgress: 0, deEscalations: (logged.deEscalations ?? 0) + 1 }, needsDeeperProbe: false };
  }
  return { case: { ...logged, stageFailures: failures }, needsDeeperProbe: false };
}

// ---------------------------------------------------------------------------
// PART I ADD — RemediationOutcome + Gap Closure Quality ladder
// ---------------------------------------------------------------------------
export function buildOutcome(kase: RemediationCase, preMastery: number, postMastery: number): RemediationOutcome {
  const similar = kase.treatmentLog.filter((t) => t.stage === 'similarA' || t.stage === 'similarB');
  const similarSuccess = similar.length ? similar.filter((t) => t.correct).length / similar.length : 0;
  const transferAttempts = kase.treatmentLog.filter((t) => t.stage === 'transfer');
  const transferSuccess = transferAttempts.some((t) => t.correct);
  return { rootSkill: kase.rootCauseSkillId ?? kase.targetSkillId, preMastery, postMastery, similarSuccess, transferSuccess };
}

// A case only reaches 'resolved' after a transfer success (the flow above guarantees
// this), so it starts life on the ladder already past the "similar-only" rung.
export function initialGapClosureQuality(): GapClosureQuality {
  return 'TRANSFER_VERIFIED';
}
export function upgradeGapClosure(current: GapClosureQuality, milestone: 'retention' | 'stable'): GapClosureQuality {
  if (milestone === 'retention' && current === 'TRANSFER_VERIFIED') return 'RETENTION_VERIFIED';
  if (milestone === 'stable' && (current === 'RETENTION_VERIFIED' || current === 'TRANSFER_VERIFIED')) return 'STABLY_CLOSED';
  return current;
}

// QA20 — recurrence: mark the old case REOPENED and hand back a fresh investigation seed.
export function reopenGap(oldCase: RemediationCase): RemediationCase {
  return { ...oldCase, gapClosureQuality: 'REOPENED' };
}
export function linkReopenedCase(newCase: RemediationCase, oldCaseId: string): RemediationCase {
  return { ...newCase, reopenedFromCaseId: oldCaseId };
}
