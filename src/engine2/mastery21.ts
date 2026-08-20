// CHLOE MATH 2.1 — E2: Mastery & Uncertainty Engine (PART D).
// Beta(alpha, beta) pseudo-observation model. p and uncertainty fall out of the same
// statistic, so "how sure are we" is never a separate, inconsistent heuristic.
import { CONFIG21 } from './config21.ts';
import type { ErrorType21, EstimateConfidence } from './types21.ts';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Derived statistics (PART D-1)
// ---------------------------------------------------------------------------
export interface MasteryStats {
  p: number;
  uncertainty: number;
  effectiveEvidence: number;
}

export function computeStats(alpha: number, beta: number): MasteryStats {
  const priorMass = CONFIG21.prior.alpha + CONFIG21.prior.beta;
  const p = alpha / (alpha + beta);
  const uncertainty = Math.sqrt((p * (1 - p)) / (alpha + beta + 1));
  const effectiveEvidence = Math.max(0, alpha + beta - priorMass);
  return { p, uncertainty, effectiveEvidence };
}

export function estimateConfidence(effectiveEvidence: number, uncertainty: number): EstimateConfidence {
  const b = CONFIG21.confidenceBands;
  let rank: number;
  if (effectiveEvidence < b.veryLow) rank = 0;
  else if (effectiveEvidence < b.low) rank = 1;
  else if (effectiveEvidence < b.medium) rank = 2;
  else if (effectiveEvidence < b.high) rank = 3;
  else rank = 4;
  if (uncertainty > CONFIG21.confidenceDowngradeUncertainty) rank = Math.max(0, rank - 1);
  return (['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const)[rank];
}

export function confidenceRank(c: EstimateConfidence): number {
  return CONFIG21.confidenceOrder.indexOf(c);
}

// ---------------------------------------------------------------------------
// PART D-3 q3 — time decay: long inactivity widens uncertainty back out.
// Lazily applied (no background scan): called whenever a skill is read/updated.
// ---------------------------------------------------------------------------
export function applyTimeDecay(alpha: number, beta: number, lastPracticedAt: string | null, today: string): { alpha: number; beta: number } {
  if (!lastPracticedAt) return { alpha, beta };
  const daysSince = Math.floor((Date.parse(today) - Date.parse(lastPracticedAt)) / 86400000);
  const overGrace = daysSince - CONFIG21.decay.graceDays;
  if (overGrace <= 0) return { alpha, beta };
  const decay = Math.pow(CONFIG21.decay.dailyDecayFactor, overGrace);
  // Only the mass ABOVE the prior decays — the prior itself is the permanent floor.
  const excessAlpha = Math.max(0, alpha - CONFIG21.prior.alpha) * decay;
  const excessBeta = Math.max(0, beta - CONFIG21.prior.beta) * decay;
  return { alpha: CONFIG21.prior.alpha + excessAlpha, beta: CONFIG21.prior.beta + excessBeta };
}

// ---------------------------------------------------------------------------
// PART D-2 — evidence weight for one attempt
// ---------------------------------------------------------------------------
export interface CorrectEvidenceInput {
  difficulty: number; // 1..5, the problem's difficulty
  currentDifficulty: number; // skill's tracked difficulty, for overreach damping
  hintsUsed: number;
  selfCorrected: boolean; // used the "think again" retry before the final (correct) answer
  isGuess: boolean; // answered suspiciously fast on a multiple-choice problem
  sameSkillRunLength: number; // consecutive attempts on this same skill, including this one
}

export function correctEvidenceWeight(input: CorrectEvidenceInput): number {
  const cfg = CONFIG21.evidence;
  const d = clamp(Math.round(input.difficulty), 1, 5) - 1;
  let w = cfg.correctBase[d];
  w *= cfg.hintFactor[Math.min(input.hintsUsed, cfg.hintFactor.length - 1)];
  if (input.isGuess) w *= cfg.guessFactor;
  if (input.selfCorrected) w *= cfg.retryFactor;
  if (input.sameSkillRunLength >= cfg.diversityStreakThreshold) w *= cfg.diversityFactor;
  if (input.difficulty > input.currentDifficulty + 2) w *= cfg.overReachDamping;
  return Math.min(w, cfg.singleAttemptCap);
}

export interface WrongEvidenceInput {
  difficulty: number;
  errorType: ErrorType21;
}

export function wrongEvidenceWeight(input: WrongEvidenceInput): number {
  const cfg = CONFIG21.evidence;
  const d = clamp(Math.round(input.difficulty), 1, 5) - 1;
  const base = cfg.wrongBase[d];
  const factor = cfg.errorTypeWrongFactor[input.errorType] ?? 1.0;
  return base * factor;
}

export function isGuessLikely(solveTimeSec: number, estimatedSec: number): boolean {
  return solveTimeSec < CONFIG21.evidence.guessSpeedRatio * estimatedSec;
}

// ---------------------------------------------------------------------------
// Pure alpha/beta transformers — used by attribution21 (per-skill) and by the
// remediation/retention engines for transfer & retention bonuses/penalties.
// ---------------------------------------------------------------------------
export function addCorrectEvidence(alpha: number, beta: number, weight: number): { alpha: number; beta: number } {
  return { alpha: alpha + weight, beta };
}
export function addWrongEvidence(alpha: number, beta: number, weight: number): { alpha: number; beta: number } {
  return { alpha, beta: beta + weight };
}
export function addTransferSuccess(alpha: number, beta: number): { alpha: number; beta: number } {
  return { alpha: alpha + CONFIG21.evidence.transferBonus, beta };
}
export function addTransferFailure(alpha: number, beta: number): { alpha: number; beta: number } {
  return { alpha, beta: beta + CONFIG21.evidence.transferFailPenalty };
}
export function addRetentionPass(alpha: number, beta: number): { alpha: number; beta: number } {
  return { alpha: alpha + CONFIG21.evidence.retentionPassBonus, beta };
}
export function addRetentionFail(alpha: number, beta: number): { alpha: number; beta: number } {
  return { alpha, beta: beta + CONFIG21.evidence.retentionFailPenalty };
}

// ---------------------------------------------------------------------------
// PART J — prediction for Calibration Engine: P(correct) at time of attempt,
// difficulty-adjusted via a fixed logit offset theta(d).
// ---------------------------------------------------------------------------
export function logit(p: number): number {
  const pc = clamp(p, 0.001, 0.999);
  return Math.log(pc / (1 - pc));
}
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
export function predictSuccess(p: number, difficulty: number): number {
  const d = clamp(Math.round(difficulty), 1, 5) - 1;
  const theta = CONFIG21.difficulty.levelOffsets[d];
  return sigmoid(logit(p) - theta);
}

// ---------------------------------------------------------------------------
// Convenience: full derived-state readout for a raw (alpha, beta), decay-aware.
// ---------------------------------------------------------------------------
export function readMastery(alpha: number, beta: number, lastPracticedAt: string | null, today: string) {
  const decayed = applyTimeDecay(alpha, beta, lastPracticedAt, today);
  const stats = computeStats(decayed.alpha, decayed.beta);
  const confidence = estimateConfidence(stats.effectiveEvidence, stats.uncertainty);
  return { alpha: decayed.alpha, beta: decayed.beta, ...stats, confidence };
}
