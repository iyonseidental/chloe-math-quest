// Step 9 test: E7 Calibration & Evaluation Engine
import {
  calibrationError,
  brierScore,
  rootCauseHitRate,
  probeYield,
  falseMasteryRate,
  falseWeaknessRate,
  misconceptionPrecisionRecall,
  gapClosureSuccessRate,
  transferPredictiveValue,
  buildCalibrationReport,
  formatReport,
  emptyDataset,
} from '../src/engine2/calibration21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const P = (predictedP, correct) => ({ attemptId: 'x', skillId: 's', predictedP, difficulty: 3, correct, masteryModelVersion: 'v', configVersion: 'v', ts: 0 });

// --- well-calibrated predictions (predicted rate ~= actual rate in each band) ---
{
  const preds = [];
  // band 0.8-0.9: predict 0.85, actually correct 85% of the time
  for (let i = 0; i < 100; i++) preds.push(P(0.85, i < 85));
  // band 0.4-0.5: predict 0.45, actually correct 45% of the time
  for (let i = 0; i < 100; i++) preds.push(P(0.45, i < 45));
  const err = calibrationError(preds);
  check('well-calibrated predictions -> low calibration error', err < 0.05, `${err}`);
  check('well-calibrated predictions -> low-ish Brier score', brierScore(preds) < 0.26, `${brierScore(preds)}`);
}

// --- badly miscalibrated: system claims 90% but only 50% actually succeed ---
{
  const preds = [];
  for (let i = 0; i < 100; i++) preds.push(P(0.9, i < 50));
  const err = calibrationError(preds);
  check('overconfident predictions -> large calibration error', err > 0.3, `${err}`);
}

// --- root cause hit rate ---
{
  const trials = Array.from({ length: 10 }, (_, i) => ({ trueRootSkillId: 'A', identifiedRootSkillId: i < 8 ? 'A' : 'B' }));
  check('8/10 correct identifications -> hit rate 0.8', Math.abs(rootCauseHitRate(trials) - 0.8) < 1e-9);
}

// --- probe yield ---
{
  const probes = [{ correct: true }, { correct: false }, { correct: false }, { correct: true }];
  check('2 failures out of 4 probes -> yield 0.5', Math.abs(probeYield(probes) - 0.5) < 1e-9);
}

// --- false mastery / false weakness ---
{
  const milestones = [
    { skillId: 'a', state: 'MASTERED', subsequentOutcomes: [true, true, true, true, true] }, // solid
    { skillId: 'b', state: 'MASTERED', subsequentOutcomes: [false, false, true, true, true] }, // 2 misses -> false mastery
    { skillId: 'c', state: 'WEAKENED', subsequentOutcomes: [true, true] }, // immediate recheck passes -> false weakness
    { skillId: 'd', state: 'WEAKENED', subsequentOutcomes: [false, false] }, // genuinely weak
  ];
  check('false mastery rate counts the 2-miss case only (1/2)', Math.abs(falseMasteryRate(milestones) - 0.5) < 1e-9);
  check('false weakness rate counts the immediate-recheck-pass case (1/2)', Math.abs(falseWeaknessRate(milestones) - 0.5) < 1e-9);
}

// --- misconception precision/recall ---
{
  const trials = [
    { trueMisconceptionPresent: true, flaggedActive: true }, // TP
    { trueMisconceptionPresent: true, flaggedActive: true }, // TP
    { trueMisconceptionPresent: false, flaggedActive: true }, // FP
    { trueMisconceptionPresent: true, flaggedActive: false }, // FN
    { trueMisconceptionPresent: false, flaggedActive: false }, // TN
  ];
  const { precision, recall } = misconceptionPrecisionRecall(trials);
  check('precision = TP/(TP+FP) = 2/3', Math.abs(precision - 2 / 3) < 1e-9, `${precision}`);
  check('recall = TP/(TP+FN) = 2/3', Math.abs(recall - 2 / 3) < 1e-9, `${recall}`);
}

// --- gap closure success rate ---
{
  const outcomes = [{ recurrenceWithin30Days: false }, { recurrenceWithin30Days: false }, { recurrenceWithin30Days: true }];
  check('2/3 closed without recurrence', Math.abs(gapClosureSuccessRate(outcomes) - 2 / 3) < 1e-9);
}

// --- transfer predictive value ---
{
  const followUps = [
    { transferPassed: true, nextAttemptCorrect: true },
    { transferPassed: true, nextAttemptCorrect: true },
    { transferPassed: true, nextAttemptCorrect: false },
    { transferPassed: false, nextAttemptCorrect: false },
    { transferPassed: false, nextAttemptCorrect: false },
    { transferPassed: false, nextAttemptCorrect: true },
  ];
  const value = transferPredictiveValue(followUps);
  check('transfer success predicts future success better than transfer failure', value > 0.3, `${value}`);
}

// --- full report smoke test ---
{
  const ds = emptyDataset();
  ds.predictions.push(P(0.8, true), P(0.5, false));
  ds.rootCauseTrials.push({ trueRootSkillId: 'x', identifiedRootSkillId: 'x' });
  const report = buildCalibrationReport(ds);
  check('buildCalibrationReport produces a full report object', typeof report.calibrationError === 'number');
  const text = formatReport(report);
  check('formatReport renders a non-empty printable report', typeof text === 'string' && text.includes('Calibration Report'));
}

console.log(`\n${pass} checks passed — Step 9 (Calibration & Evaluation) OK`);
