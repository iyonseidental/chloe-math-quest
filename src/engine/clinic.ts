// Error Clinic — 오답 치료 상태기계 (§10)
// Wrong → Concept Review → Similar A → Similar B → Transfer → Mastery Check → 완치
import { CONFIG } from './config.ts';
import type { Attempt, ClinicCase, ClinicStage, ErrorType, Variant } from './types.ts';

let caseSeq = 0;

export function createCase(attempt: Attempt, diagnosis: ErrorType): ClinicCase {
  return {
    id: `clinic-${Date.now().toString(36)}-${caseSeq++}`,
    skillId: attempt.skillId,
    level: attempt.level,
    createdTs: attempt.ts,
    stage: 'review', // UI가 개념 카드를 보여준 뒤 similarA로 넘긴다
    originalAttemptId: attempt.id,
    diagnosis,
    failuresInStage: 0,
    resolved: false,
  };
}

// 각 단계에서 출제할 문제 변형
export function variantForStage(stage: ClinicStage): Variant {
  switch (stage) {
    case 'similarA':
      return 'similarA';
    case 'similarB':
      return 'similarB';
    case 'transfer':
      return 'transfer';
    case 'check':
      return 'standard';
    default:
      return 'standard';
  }
}

const FORWARD: Record<ClinicStage, ClinicStage> = {
  review: 'similarA',
  similarA: 'similarB',
  similarB: 'transfer',
  transfer: 'check',
  check: 'done',
  done: 'done',
};

const BACKWARD: Record<ClinicStage, ClinicStage> = {
  review: 'review',
  similarA: 'review',
  similarB: 'similarA',
  transfer: 'similarA',
  check: 'similarB',
  done: 'done',
};

export interface ClinicAdvance {
  case_: ClinicCase;
  resolved: boolean;
  regressed: boolean; // 반복 실패로 단계 후퇴 (CONCEPT/PREREQUISITE면 개념 카드부터 다시)
}

// 개념 카드를 읽고 나면 호출: review → similarA
export function acknowledgeReview(c: ClinicCase): ClinicCase {
  return c.stage === 'review' ? { ...c, stage: 'similarA' } : c;
}

export function advance(c: ClinicCase, correct: boolean): ClinicAdvance {
  if (correct) {
    const next = FORWARD[c.stage];
    const resolved = next === 'done';
    return {
      case_: { ...c, stage: next, failuresInStage: 0, resolved, ...(resolved ? { resolvedTs: Date.now() } : {}) },
      resolved,
      regressed: false,
    };
  }
  const failures = c.failuresInStage + 1;
  if (failures >= CONFIG.clinic.maxStageFailures) {
    return { case_: { ...c, stage: BACKWARD[c.stage], failuresInStage: 0 }, resolved: false, regressed: true };
  }
  return { case_: { ...c, failuresInStage: failures }, resolved: false, regressed: false };
}

export function pendingCases(queue: ClinicCase[]): ClinicCase[] {
  return queue.filter((c) => !c.resolved);
}
