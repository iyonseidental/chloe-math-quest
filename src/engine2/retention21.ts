// CHLOE MATH 2.1 — Long-Term Mastery State Machine + Retention Engine (PART H, R1).
// A single 1-day success is NOT long-term mastery. The ladder only advances one rung per
// review actually passed, over real elapsed time, and a review failure drops the student
// back to WEAKENED with the interval reset — MASTERED is never a permanent label.
import { CONFIG21 } from './config21.ts';
import type { EstimateConfidence, KnowledgeState, RetentionState } from './types21.ts';
import { addTransferSuccess, addTransferFailure, addRetentionPass, addRetentionFail, confidenceRank } from './mastery21.ts';

// ---------------------------------------------------------------------------
// PART H — PROVISIONAL gate (TRUE MASTERY's 5 components)
// ---------------------------------------------------------------------------
export interface GateInput {
  p: number;
  independentHintFreeCorrect: number; // among the recent window
  independentWindowTotal: number;
  transferPassedAtCurrentDifficulty: boolean;
  effectiveEvidence: number;
  estimateConfidence: EstimateConfidence;
  hasActiveMisconception: boolean;
  hasOpenRemediation: boolean;
}

export interface GateResult {
  pass: boolean;
  missing: string[];
}

export function checkProvisionalGate(input: GateInput): GateResult {
  const cfg = CONFIG21.gate;
  const missing: string[] = [];

  if (input.p < cfg.masteryThreshold) missing.push(`accuracy: p=${input.p.toFixed(2)} < ${cfg.masteryThreshold}`);

  const independentRate = input.independentWindowTotal > 0 ? input.independentHintFreeCorrect / input.independentWindowTotal : 0;
  if (independentRate < cfg.independentRateThreshold) missing.push(`independence: ${(independentRate * 100).toFixed(0)}% < ${cfg.independentRateThreshold * 100}%`);

  if (!input.transferPassedAtCurrentDifficulty) missing.push('transfer: not yet passed at current difficulty');

  if (input.effectiveEvidence < cfg.minEffectiveEvidence || confidenceRank(input.estimateConfidence) < cfg.minConfidenceRank) {
    missing.push(`evidence confidence: E=${input.effectiveEvidence.toFixed(1)}, confidence=${input.estimateConfidence} (need E>=${cfg.minEffectiveEvidence} and confidence>=MEDIUM)`);
  }

  if (input.hasActiveMisconception) missing.push('active misconception present');
  if (input.hasOpenRemediation) missing.push('remediation case still open');

  return { pass: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Pre-gate knowledge states (before a skill has ever reached PROVISIONAL)
// ---------------------------------------------------------------------------
export function derivePreGateState(input: { attempts: number; onlyDiagnosticSoFar: boolean; effectiveEvidence: number; p: number }): KnowledgeState {
  if (input.attempts === 0) return 'UNSEEN';
  if (input.onlyDiagnosticSoFar) return 'EXPOSED';
  if (input.effectiveEvidence < 6 || input.p < 0.4) return 'LEARNING';
  return 'PRACTICING';
}

// A crash from previously-strong to weak is treated as WEAKENED immediately, not just a
// slow drift through PRACTICING (PART H "p가 0.85 이상에서 0.50 미만으로 급락").
export function checkSuddenCrash(prevP: number, newP: number): boolean {
  return prevP >= 0.85 && newP < 0.5;
}

// ---------------------------------------------------------------------------
// Transfer bookkeeping (feeds both mastery evidence and the gate's transfer flag)
// ---------------------------------------------------------------------------
export function recordTransferResult(alpha: number, beta: number, passed: boolean) {
  return passed ? addTransferSuccess(alpha, beta) : addTransferFailure(alpha, beta);
}

// ---------------------------------------------------------------------------
// PART H — retention ladder
// ---------------------------------------------------------------------------
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeReliability(passes: number, lapses: number): number {
  if (passes + lapses === 0) return CONFIG21.stability.retReliabilityDefault;
  return passes / (passes + 2 * lapses);
}

export function scheduleFirstReview(today: string): RetentionState {
  return { stage: 0, nextReviewAt: addDays(today, CONFIG21.retentionIntervalsDays[0]), passes: 0, lapses: 0, reliability: computeReliability(0, 0) };
}

export interface ReviewOutcome {
  alpha: number;
  beta: number;
  retention: RetentionState;
  knowledgeState: KnowledgeState;
}

// Called when a scheduled retention review is answered. `alpha/beta` are the skill's raw
// pseudo-observations (caller applies decay first, as with any other attempt).
export function applyReviewResult(alpha: number, beta: number, retention: RetentionState, today: string, correct: boolean): ReviewOutcome {
  const cfg = CONFIG21;
  if (correct) {
    const evidence = addRetentionPass(alpha, beta);
    const nextStage = Math.min(retention.stage + 1, cfg.retentionIntervalsDays.length - 1);
    const passes = retention.passes + 1;
    const knowledgeState = cfg.retentionStageResultState[retention.stage] as KnowledgeState;
    return {
      alpha: evidence.alpha,
      beta: evidence.beta,
      retention: { stage: nextStage, nextReviewAt: addDays(today, cfg.retentionIntervalsDays[nextStage]), passes, lapses: retention.lapses, reliability: computeReliability(passes, retention.lapses) },
      knowledgeState,
    };
  }
  const evidence = addRetentionFail(alpha, beta);
  const lapses = retention.lapses + 1;
  return {
    alpha: evidence.alpha,
    beta: evidence.beta,
    retention: { stage: 0, nextReviewAt: addDays(today, cfg.retentionIntervalsDays[0]), passes: retention.passes, lapses, reliability: computeReliability(retention.passes, lapses) },
    knowledgeState: 'WEAKENED',
  };
}

export function isReviewDue(retention: RetentionState, today: string): boolean {
  return retention.nextReviewAt !== null && retention.nextReviewAt <= today;
}

// STABLE_MASTERY keeps being checked at the top cadence indefinitely (PART H "이후 유지 점검").
export function isAtStableCadence(retention: RetentionState): boolean {
  return retention.stage === CONFIG21.retentionIntervalsDays.length - 1;
}
