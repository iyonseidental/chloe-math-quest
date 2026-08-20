// Step 7 test: Long-Term Mastery State Machine + Retention Engine
import {
  checkProvisionalGate,
  derivePreGateState,
  checkSuddenCrash,
  scheduleFirstReview,
  applyReviewResult,
  computeReliability,
  isReviewDue,
  isAtStableCadence,
} from '../src/engine2/retention21.ts';
import { computeStats } from '../src/engine2/mastery21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const goodBase = {
  p: 0.9, independentHintFreeCorrect: 7, independentWindowTotal: 8, transferPassedAtCurrentDifficulty: true,
  effectiveEvidence: 20, estimateConfidence: 'HIGH', hasActiveMisconception: false, hasOpenRemediation: false,
};

// --- happy path gate ---
{
  const r = checkProvisionalGate(goodBase);
  check('all 5 conditions met -> gate passes', r.pass && r.missing.length === 0);
}

// --- QA11: high p but low evidence -> gate blocked on evidence confidence specifically ---
{
  const r = checkProvisionalGate({ ...goodBase, effectiveEvidence: 2, estimateConfidence: 'VERY_LOW' });
  check('QA11: high p + low evidence still fails the gate', !r.pass);
  check('QA11: failure reason names evidence confidence', r.missing.some((m) => m.includes('evidence confidence')));
}

// --- QA12: same p, different effectiveEvidence -> different gate outcome ---
{
  const highEvidence = checkProvisionalGate({ ...goodBase, p: 0.85, effectiveEvidence: 40, estimateConfidence: 'VERY_HIGH' });
  const lowEvidence = checkProvisionalGate({ ...goodBase, p: 0.85, effectiveEvidence: 3, estimateConfidence: 'VERY_LOW' });
  check('QA12: identical mastery probability, different evidence -> different gate decisions', highEvidence.pass !== lowEvidence.pass);
}

// --- transfer / misconception / remediation gates ---
{
  check('no transfer -> gate blocked', !checkProvisionalGate({ ...goodBase, transferPassedAtCurrentDifficulty: false }).pass);
  check('active misconception -> gate blocked (even with great numbers)', !checkProvisionalGate({ ...goodBase, hasActiveMisconception: true }).pass);
  check('open remediation case -> gate blocked', !checkProvisionalGate({ ...goodBase, hasOpenRemediation: true }).pass);
  check('low independent (hint-heavy) rate -> gate blocked', !checkProvisionalGate({ ...goodBase, independentHintFreeCorrect: 2, independentWindowTotal: 8 }).pass);
}

// --- pre-gate states ---
{
  check('no attempts -> UNSEEN', derivePreGateState({ attempts: 0, onlyDiagnosticSoFar: false, effectiveEvidence: 0, p: 0.2 }) === 'UNSEEN');
  check('diagnostic-only -> EXPOSED', derivePreGateState({ attempts: 2, onlyDiagnosticSoFar: true, effectiveEvidence: 1, p: 0.3 }) === 'EXPOSED');
  check('low evidence/p -> LEARNING', derivePreGateState({ attempts: 3, onlyDiagnosticSoFar: false, effectiveEvidence: 2, p: 0.3 }) === 'LEARNING');
  check('past the early hump -> PRACTICING', derivePreGateState({ attempts: 10, onlyDiagnosticSoFar: false, effectiveEvidence: 8, p: 0.6 }) === 'PRACTICING');
}

// --- sudden crash ---
{
  check('0.9 -> 0.4 is a sudden crash', checkSuddenCrash(0.9, 0.4));
  check('0.6 -> 0.4 is a normal drift, not a crash', !checkSuddenCrash(0.6, 0.4));
}

// --- QA6/QA7: the retention ladder itself ---
{
  const today0 = '2026-08-18';
  let retention = scheduleFirstReview(today0);
  check('QA6: first review scheduled 1 day out at stage 0', retention.stage === 0 && retention.nextReviewAt === '2026-08-19');

  let alpha = 30, beta = 5; // strong provisional mastery going in

  // day 1: pass -> EARLY_MASTERY, next review in 3 days
  let out = applyReviewResult(alpha, beta, retention, '2026-08-19', true);
  alpha = out.alpha; beta = out.beta; retention = out.retention;
  check('1-day review pass -> EARLY_MASTERY', out.knowledgeState === 'EARLY_MASTERY');
  check('next review is 3 days later', retention.nextReviewAt === '2026-08-22');

  // day 4 (3-day mark): pass -> MASTERED, next in 7 days
  out = applyReviewResult(alpha, beta, retention, '2026-08-22', true);
  alpha = out.alpha; beta = out.beta; retention = out.retention;
  check('3-day review pass -> MASTERED', out.knowledgeState === 'MASTERED');
  check('next review is 7 days later', retention.nextReviewAt === '2026-08-29');

  // 7-day mark: pass -> still MASTERED, next in 14 days
  out = applyReviewResult(alpha, beta, retention, '2026-08-29', true);
  alpha = out.alpha; beta = out.beta; retention = out.retention;
  check('7-day review pass -> MASTERED still (not yet STABLE)', out.knowledgeState === 'MASTERED');
  check('next review is 14 days later', retention.nextReviewAt === '2026-09-12');

  // 14-day mark: pass -> STABLE_MASTERY, next in 30 days
  out = applyReviewResult(alpha, beta, retention, '2026-09-12', true);
  alpha = out.alpha; beta = out.beta; retention = out.retention;
  check('14-day review pass -> STABLE_MASTERY (long-term ladder complete)', out.knowledgeState === 'STABLE_MASTERY');
  check('next review is 30 days later (ongoing maintenance)', retention.nextReviewAt === '2026-10-12');
  check('now at the stable cadence', isAtStableCadence(retention));

  // QA7: even after all that, a LATER review failure knocks it down to WEAKENED
  const pBefore = computeStats(alpha, beta).p;
  out = applyReviewResult(alpha, beta, retention, '2026-10-12', false);
  const pAfter = computeStats(out.alpha, out.beta).p;
  check('QA7: retention failure after long-term success -> WEAKENED (MASTERED is never permanent)', out.knowledgeState === 'WEAKENED');
  check('QA7: retention failure measurably lowers mastery', pAfter < pBefore, `${pBefore} -> ${pAfter}`);
  check('QA7: interval resets to 1 day after a lapse', out.retention.nextReviewAt === '2026-10-13' && out.retention.stage === 0);
  check('QA7: lapse is recorded', out.retention.lapses === 1);
}

// --- reliability ---
{
  check('no data -> default reliability', computeReliability(0, 0) === CONFIG21.stability.retReliabilityDefault);
  check('3 passes / 1 lapse -> 3/(3+2)=0.6', Math.abs(computeReliability(3, 1) - 0.6) < 1e-9);
}

// --- isReviewDue ---
{
  check('due date in the past counts as due', isReviewDue({ stage: 0, nextReviewAt: '2026-08-10', passes: 0, lapses: 0, reliability: 0.85 }, '2026-08-18'));
  check('due date in the future is not due yet', !isReviewDue({ stage: 0, nextReviewAt: '2026-08-25', passes: 0, lapses: 0, reliability: 0.85 }, '2026-08-18'));
}

console.log(`\n${pass} checks passed — Step 7 (Long-Term State Machine + Retention) OK`);
