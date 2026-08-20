// CHLOE MATH 2.1 — Prerequisite Stability Score (PART E, R4).
// A single number that answers "is it safe to assume this prerequisite is solid, without
// asking?" Crucially distinguishes UNKNOWN (too little evidence to judge) from SHAKY
// (evidence says it's weak) — Unknown != Weak is the core principle here (AC5, QA13).
import { CONFIG21 } from './config21.ts';

export type StabilityClass = 'UNKNOWN' | 'SHAKY' | 'STABLE';

export interface StabilityInput {
  masteryProbability: number; // caller applies the misconception cap first if relevant
  uncertainty: number;
  effectiveEvidence: number;
  retentionReliability: number;
  lastPracticedAt: string | null;
  today: string;
  recentWrongCount: number; // among a recent window (e.g. last 10 attempts on this skill)
  hasActiveOrSuspectedMisconception: boolean;
}

export interface StabilityBreakdown {
  pEff: number;
  fRet: number;
  fConf: number;
  fRecency: number;
  fError: number;
}

export interface StabilityResult {
  classification: StabilityClass;
  stability: number | null; // null when UNKNOWN — deliberately not computed (nothing to compute yet)
  breakdown: StabilityBreakdown | null;
}

export function computeStability(input: StabilityInput): StabilityResult {
  const cfg = CONFIG21.stability;

  if (input.effectiveEvidence < cfg.unknownEvidenceThreshold) {
    return { classification: 'UNKNOWN', stability: null, breakdown: null };
  }

  const fRet = 0.7 + 0.3 * input.retentionReliability;
  const fConf = 1 - Math.min(cfg.confidencePenaltyCap, cfg.confidencePenaltyPerU * input.uncertainty);

  let fRecency = 1;
  if (input.lastPracticedAt) {
    const daysSince = Math.floor((Date.parse(input.today) - Date.parse(input.lastPracticedAt)) / 86400000);
    const overGrace = Math.max(0, daysSince - cfg.recencyGraceDays);
    fRecency = Math.pow(cfg.recencyDailyFactor, overGrace);
  }

  const fError = 1 - Math.min(cfg.errorPenaltyCap, cfg.errorPenaltyPerRecentWrong * input.recentWrongCount);

  const stability = input.masteryProbability * fRet * fConf * fRecency * fError;
  const meetsBar = stability >= cfg.threshold && input.effectiveEvidence >= cfg.minEvidenceForSkip && !input.hasActiveOrSuspectedMisconception;

  return {
    classification: meetsBar ? 'STABLE' : 'SHAKY',
    stability,
    breakdown: { pEff: input.masteryProbability, fRet, fConf, fRecency, fError },
  };
}

export function shouldSkipProbe(result: StabilityResult): boolean {
  return result.classification === 'STABLE';
}

// A skill is "surprising" to fail a probe on if it looked strong going in — used by
// rootcause21 to add a confirmation step before trusting an unexpected probe failure (AC11).
export function isSurprisingCandidate(result: StabilityResult, rawMasteryProbability: number): boolean {
  if (result.classification === 'STABLE') return true;
  if (result.classification === 'UNKNOWN' && rawMasteryProbability >= 0.75) return true;
  return false;
}
