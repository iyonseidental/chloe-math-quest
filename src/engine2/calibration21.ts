// CHLOE MATH 2.1 — E7: Calibration & Evaluation Engine (PART J).
// This engine does not teach Chloe anything — it checks whether CHLOE MATH's own beliefs
// about Chloe are actually correct. Every metric here answers one version of "is the
// system right about itself?" Phase 1 computes these against Synthetic Learners, whose
// true ability is known; later they run against real attempt history.
import { CONFIG21 } from './config21.ts';
import type { DifficultyProfile, PredictionRecord } from './types21.ts';

// ---------------------------------------------------------------------------
// PART I — Empirical Difficulty. Compares what the mastery model EXPECTED (mean
// predictedP for attempts declared at this level) against what actually happened. A
// persistent gap means the problem template is harder/easier than its declared label,
// independent of any one student's mastery.
// ---------------------------------------------------------------------------
export function computeEmpiricalDifficulty(predictions: PredictionRecord[], declaredDifficulty: number): DifficultyProfile {
  const relevant = predictions.filter((p) => p.difficulty === declaredDifficulty);
  const n = relevant.length;
  if (n < CONFIG21.difficulty.minSampleSize) return { declaredDifficulty, sampleSize: n };
  const expected = relevant.reduce((a, p) => a + p.predictedP, 0) / n;
  const observed = relevant.filter((p) => p.correct).length / n;
  const residualLevels = ((expected - observed) / 0.1) * 0.5; // half a level per 10-point gap
  const empiricalDifficulty = Math.max(1, Math.min(5, declaredDifficulty + residualLevels));
  const difficultyConfidence = Math.min(1, n / (CONFIG21.difficulty.minSampleSize * 3));
  return { declaredDifficulty, empiricalDifficulty, difficultyConfidence, sampleSize: n };
}

export interface CalibrationDataset {
  predictions: PredictionRecord[];
  retentionPredictions: PredictionRecord[];
  probes: { correct: boolean }[];
  rootCauseTrials: { trueRootSkillId: string; identifiedRootSkillId: string | null }[];
  masteryMilestones: { skillId: string; state: 'MASTERED' | 'WEAKENED'; subsequentOutcomes: boolean[] }[];
  misconceptionTrials: { trueMisconceptionPresent: boolean; flaggedActive: boolean }[];
  remediationOutcomes: { recurrenceWithin30Days: boolean }[];
  transferFollowUps: { transferPassed: boolean; nextAttemptCorrect: boolean }[];
}

export function emptyDataset(): CalibrationDataset {
  return { predictions: [], retentionPredictions: [], probes: [], rootCauseTrials: [], masteryMilestones: [], misconceptionTrials: [], remediationOutcomes: [], transferFollowUps: [] };
}

// ---------------------------------------------------------------------------
// 1. Calibration Error — mean absolute gap between predicted and actual success rate,
//    across 10%-wide probability bands, weighted by how many predictions fall in each.
// ---------------------------------------------------------------------------
export interface Band {
  band: string;
  meanPredicted: number;
  actualRate: number;
  n: number;
}

export function futureAccuracyByBand(predictions: PredictionRecord[]): Band[] {
  const bands: Band[] = [];
  for (let lo = 0; lo < 1; lo += 0.1) {
    const hi = lo + 0.1;
    const inBand = predictions.filter((p) => p.predictedP >= lo && (hi >= 1 ? p.predictedP <= hi : p.predictedP < hi));
    if (inBand.length === 0) continue;
    bands.push({
      band: `${Math.round(lo * 100)}-${Math.round(hi * 100)}%`,
      meanPredicted: inBand.reduce((a, p) => a + p.predictedP, 0) / inBand.length,
      actualRate: inBand.filter((p) => p.correct).length / inBand.length,
      n: inBand.length,
    });
  }
  return bands;
}

export function calibrationError(predictions: PredictionRecord[]): number {
  const bands = futureAccuracyByBand(predictions);
  const total = predictions.length;
  if (total === 0) return 0;
  return bands.reduce((sum, b) => sum + Math.abs(b.meanPredicted - b.actualRate) * (b.n / total), 0);
}

// ---------------------------------------------------------------------------
// 2. Brier Score
// ---------------------------------------------------------------------------
export function brierScore(predictions: PredictionRecord[]): number {
  if (predictions.length === 0) return 0;
  return predictions.reduce((sum, p) => sum + (p.predictedP - (p.correct ? 1 : 0)) ** 2, 0) / predictions.length;
}

// ---------------------------------------------------------------------------
// 3. Retention prediction accuracy — same math, scoped to retention-review predictions.
// ---------------------------------------------------------------------------
export function retentionPredictionAccuracy(retentionPredictions: PredictionRecord[]): number {
  return 1 - calibrationError(retentionPredictions);
}

// ---------------------------------------------------------------------------
// 4. Root Cause Hit Rate — did the engine find the seeded true weakness?
// ---------------------------------------------------------------------------
export function rootCauseHitRate(trials: CalibrationDataset['rootCauseTrials']): number {
  if (trials.length === 0) return NaN;
  return trials.filter((t) => t.identifiedRootSkillId === t.trueRootSkillId).length / trials.length;
}

// ---------------------------------------------------------------------------
// 5. Probe Yield — fraction of probes that actually found a failure (informative).
//    Healthy range per PART J: 0.2-0.6. Too low = over-probing; too high = under-skipping.
// ---------------------------------------------------------------------------
export function probeYield(probes: { correct: boolean }[]): number {
  if (probes.length === 0) return NaN;
  return probes.filter((p) => !p.correct).length / probes.length;
}

// ---------------------------------------------------------------------------
// 6/7. False Mastery / False Weakness rates
// ---------------------------------------------------------------------------
export function falseMasteryRate(milestones: CalibrationDataset['masteryMilestones']): number {
  const mastered = milestones.filter((m) => m.state === 'MASTERED');
  if (mastered.length === 0) return NaN;
  const falsePositives = mastered.filter((m) => m.subsequentOutcomes.slice(0, 5).filter((o) => !o).length >= 2).length;
  return falsePositives / mastered.length;
}

export function falseWeaknessRate(milestones: CalibrationDataset['masteryMilestones']): number {
  const weakened = milestones.filter((m) => m.state === 'WEAKENED');
  if (weakened.length === 0) return NaN;
  const falsePositives = weakened.filter((m) => m.subsequentOutcomes[0] === true).length;
  return falsePositives / weakened.length;
}

// ---------------------------------------------------------------------------
// 8. Misconception Precision / Recall
// ---------------------------------------------------------------------------
export function misconceptionPrecisionRecall(trials: CalibrationDataset['misconceptionTrials']): { precision: number; recall: number } {
  const tp = trials.filter((t) => t.flaggedActive && t.trueMisconceptionPresent).length;
  const fp = trials.filter((t) => t.flaggedActive && !t.trueMisconceptionPresent).length;
  const fn = trials.filter((t) => !t.flaggedActive && t.trueMisconceptionPresent).length;
  return {
    precision: tp + fp === 0 ? NaN : tp / (tp + fp),
    recall: tp + fn === 0 ? NaN : tp / (tp + fn),
  };
}

// ---------------------------------------------------------------------------
// 9. Gap Closure Success Rate
// ---------------------------------------------------------------------------
export function gapClosureSuccessRate(outcomes: CalibrationDataset['remediationOutcomes']): number {
  if (outcomes.length === 0) return NaN;
  return outcomes.filter((o) => !o.recurrenceWithin30Days).length / outcomes.length;
}

// ---------------------------------------------------------------------------
// 10. Transfer Predictive Value — does passing transfer actually predict future success
//     on novel problems better than failing it?
// ---------------------------------------------------------------------------
export function transferPredictiveValue(followUps: CalibrationDataset['transferFollowUps']): number {
  const afterPass = followUps.filter((f) => f.transferPassed);
  const afterFail = followUps.filter((f) => !f.transferPassed);
  if (afterPass.length === 0 || afterFail.length === 0) return NaN;
  const rate = (arr: typeof followUps) => arr.filter((f) => f.nextAttemptCorrect).length / arr.length;
  return rate(afterPass) - rate(afterFail);
}

// ---------------------------------------------------------------------------
// Full report
// ---------------------------------------------------------------------------
export interface CalibrationReport {
  calibrationError: number;
  brierScore: number;
  accuracyByBand: Band[];
  retentionPredictionAccuracy: number;
  rootCauseHitRate: number;
  probeYield: number;
  falseMasteryRate: number;
  falseWeaknessRate: number;
  misconceptionPrecision: number;
  misconceptionRecall: number;
  gapClosureSuccessRate: number;
  transferPredictiveValue: number;
  n: { predictions: number; probes: number; rootCauseTrials: number; misconceptionTrials: number; remediationOutcomes: number };
}

export function buildCalibrationReport(ds: CalibrationDataset): CalibrationReport {
  const mis = misconceptionPrecisionRecall(ds.misconceptionTrials);
  return {
    calibrationError: calibrationError(ds.predictions),
    brierScore: brierScore(ds.predictions),
    accuracyByBand: futureAccuracyByBand(ds.predictions),
    retentionPredictionAccuracy: retentionPredictionAccuracy(ds.retentionPredictions),
    rootCauseHitRate: rootCauseHitRate(ds.rootCauseTrials),
    probeYield: probeYield(ds.probes),
    falseMasteryRate: falseMasteryRate(ds.masteryMilestones),
    falseWeaknessRate: falseWeaknessRate(ds.masteryMilestones),
    misconceptionPrecision: mis.precision,
    misconceptionRecall: mis.recall,
    gapClosureSuccessRate: gapClosureSuccessRate(ds.remediationOutcomes),
    transferPredictiveValue: transferPredictiveValue(ds.transferFollowUps),
    n: { predictions: ds.predictions.length, probes: ds.probes.length, rootCauseTrials: ds.rootCauseTrials.length, misconceptionTrials: ds.misconceptionTrials.length, remediationOutcomes: ds.remediationOutcomes.length },
  };
}

const fmt = (x: number, digits = 3) => (Number.isNaN(x) ? 'n/a' : x.toFixed(digits));

export function formatReport(r: CalibrationReport): string {
  const lines: string[] = [];
  lines.push('=== CHLOE MATH 2.1 — Calibration Report ===');
  lines.push(`Calibration Error:            ${fmt(r.calibrationError)}  (target < 0.07)`);
  lines.push(`Brier Score:                  ${fmt(r.brierScore)}  (target < 0.20)`);
  lines.push('Predicted mastery band -> future success:');
  for (const b of r.accuracyByBand) lines.push(`  ${b.band.padEnd(10)} predicted=${fmt(b.meanPredicted, 2)}  actual=${fmt(b.actualRate, 2)}  n=${b.n}`);
  lines.push(`Retention Prediction Accuracy: ${fmt(r.retentionPredictionAccuracy)}`);
  lines.push(`Root Cause Hit Rate:          ${fmt(r.rootCauseHitRate)}  (target >= 0.8, n=${r.n.rootCauseTrials})`);
  lines.push(`Probe Yield:                  ${fmt(r.probeYield)}  (healthy band 0.2-0.6, n=${r.n.probes})`);
  lines.push(`False Mastery Rate:           ${fmt(r.falseMasteryRate)}  (target < 0.1)`);
  lines.push(`False Weakness Rate:          ${fmt(r.falseWeaknessRate)}`);
  lines.push(`Misconception Precision:      ${fmt(r.misconceptionPrecision)}  (target >= 0.8, n=${r.n.misconceptionTrials})`);
  lines.push(`Misconception Recall:         ${fmt(r.misconceptionRecall)}  (target >= 0.7)`);
  lines.push(`Gap Closure Success Rate:     ${fmt(r.gapClosureSuccessRate)}  (n=${r.n.remediationOutcomes})`);
  lines.push(`Transfer Predictive Value:    ${fmt(r.transferPredictiveValue)}  (higher = transfer meaningfully predicts future success)`);
  return lines.join('\n');
}
