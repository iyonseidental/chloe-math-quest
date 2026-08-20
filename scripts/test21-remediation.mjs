// Step 6 test: E5 Minimum-Dose Remediation + Outcome + Gap Closure Quality
import { beginInvestigation } from '../src/engine2/rootcause21.ts';
import {
  hasBridgeStage,
  acknowledgeMicroLesson,
  advanceRemediation,
  skillForStage,
  difficultyForStage,
  buildOutcome,
  initialGapClosureQuality,
  upgradeGapClosure,
  reopenGap,
} from '../src/engine2/remediation21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const STABLE = { classification: 'STABLE', stability: 0.9, breakdown: null };
const ctx = {
  stabilityOf: () => STABLE, rawPOf: () => 0.9,
  candidateInfoOf: (id) => ({ skillId: id, stability: STABLE, misconceptionEvidence: 0, recentErrorRecurrence: 0, attributionProbability: 0.5 }),
  estimatedSecOf: () => 60,
};

function freshCaseSameRoot() {
  // M1.NUM.SIGN.01 has no prerequisites -> investigation resolves immediately, root === target
  return beginInvestigation({ id: 'r1', targetSkillId: 'M1.NUM.SIGN.01', targetDifficulty: 3, originalAttemptId: 'att', errorType: 'CONCEPT_GAP', likelyRootSkillId: 'M1.NUM.SIGN.01', ts: Date.now(), ctx });
}
function freshCaseDifferentRoot() {
  const kase = beginInvestigation({ id: 'r2', targetSkillId: 'M1.ALG.EQ.02', targetDifficulty: 4, originalAttemptId: 'att', errorType: 'CONCEPT_GAP', likelyRootSkillId: 'M1.ALG.EQ.02', ts: Date.now(), ctx });
  // force a different confirmed root cause for the test (bypassing full investigation)
  return { ...kase, rootCauseSkillId: 'M1.NUM.FRAC.01', stage: 'micro-lesson' };
}

// --- hasBridgeStage ---
{
  check('same root/target -> no bridge stage', !hasBridgeStage(freshCaseSameRoot()));
  check('different root/target -> bridge stage included', hasBridgeStage(freshCaseDifferentRoot()));
}

// --- micro-lesson only transitions on acknowledgement, not on attempts ---
{
  let k = freshCaseSameRoot();
  check('investigation resolves straight into micro-lesson', k.stage === 'micro-lesson');
  k = acknowledgeMicroLesson(k);
  check('acknowledging moves to foundation', k.stage === 'foundation');
}

// --- foundation: needs 2 correct; 2 failures -> deeper probe signal, not stage regression ---
{
  let k = acknowledgeMicroLesson(freshCaseSameRoot());
  let r = advanceRemediation(k, false, 'f1');
  check('one foundation miss: stays in foundation, no deeper probe yet', r.case.stage === 'foundation' && !r.needsDeeperProbe);
  r = advanceRemediation(r.case, false, 'f2');
  check('two foundation misses: signals a DEEPER PROBE (not endless easy repeats)', r.needsDeeperProbe === true && r.case.stage === 'foundation');
}

// --- full happy path, same root (no bridge) ---
{
  let k = acknowledgeMicroLesson(freshCaseSameRoot());
  let r = advanceRemediation(k, true, 'f1'); k = r.case;
  r = advanceRemediation(k, true, 'f2'); k = r.case;
  check('foundation passes with 2/2 correct -> similarA (bridge skipped, same root)', k.stage === 'similarA');
  r = advanceRemediation(k, true, 's1'); k = r.case;
  check('similarA pass -> similarB', k.stage === 'similarB');
  r = advanceRemediation(k, true, 's2'); k = r.case;
  check('similarB pass -> transfer', k.stage === 'transfer');
  r = advanceRemediation(k, true, 't1'); k = r.case;
  check('transfer pass -> resolved', k.stage === 'resolved');

  const outcome = buildOutcome(k, 0.4, 0.7);
  check('outcome: similarSuccess = 1.0 (2/2)', outcome.similarSuccess === 1);
  check('outcome: transferSuccess = true', outcome.transferSuccess === true);
  check('outcome: root skill recorded', outcome.rootSkill === 'M1.NUM.SIGN.01');
}

// --- full happy path WITH bridge (different root) ---
{
  let k = acknowledgeMicroLesson(freshCaseDifferentRoot());
  check('difficulty/skill for foundation targets the ROOT, not the original problem', skillForStage(k) === 'M1.NUM.FRAC.01' && difficultyForStage(k) === 1);
  let r = advanceRemediation(k, true, 'f1'); k = r.case;
  r = advanceRemediation(k, true, 'f2'); k = r.case;
  check('foundation passes -> bridge stage (root != target)', k.stage === 'bridge');
  check('bridge targets the ORIGINAL skill one level down', skillForStage(k) === 'M1.ALG.EQ.02' && difficultyForStage(k) === 3);
  r = advanceRemediation(k, true, 'b1'); k = r.case;
  check('bridge pass -> similarA', k.stage === 'similarA');
  check('similarA/B/transfer target the original skill at its original difficulty', skillForStage(k) === 'M1.ALG.EQ.02' && difficultyForStage(k) === 4);
}

// --- QA20 spirit / PART I: transfer failure restarts at concept, not one stage back ---
{
  let k = { ...acknowledgeMicroLesson(freshCaseSameRoot()) };
  // fast-forward to transfer by driving successes
  k = advanceRemediation(k, true, 'f1').case;
  k = advanceRemediation(k, true, 'f2').case;
  k = advanceRemediation(k, true, 's1').case;
  k = advanceRemediation(k, true, 's2').case;
  check('now at transfer stage', k.stage === 'transfer');
  const r = advanceRemediation(k, false, 't1');
  check('a SINGLE transfer failure sends all the way back to micro-lesson (not similarB)', r.case.stage === 'micro-lesson', r.case.stage);
}

// --- generic stage regression: 2 failures on similarB regress to similarA ---
{
  let k = acknowledgeMicroLesson(freshCaseSameRoot());
  k = advanceRemediation(k, true, 'f1').case;
  k = advanceRemediation(k, true, 'f2').case;
  k = advanceRemediation(k, true, 's1').case; // similarA pass -> similarB
  check('now at similarB', k.stage === 'similarB');
  let r = advanceRemediation(k, false, 'x1'); k = r.case;
  check('1 similarB miss: stays at similarB', k.stage === 'similarB');
  r = advanceRemediation(k, false, 'x2'); k = r.case;
  check('2 similarB misses: regress to similarA (generic rule, not full restart)', k.stage === 'similarA');
}

// --- Gap Closure Quality ladder ---
{
  check('resolution starts at TRANSFER_VERIFIED (transfer already required to get here)', initialGapClosureQuality() === 'TRANSFER_VERIFIED');
  const afterRetention = upgradeGapClosure('TRANSFER_VERIFIED', 'retention');
  check('first retention pass -> RETENTION_VERIFIED', afterRetention === 'RETENTION_VERIFIED');
  const afterStable = upgradeGapClosure(afterRetention, 'stable');
  check('long-term stability -> STABLY_CLOSED', afterStable === 'STABLY_CLOSED');

  const kase = freshCaseSameRoot();
  const reopened = reopenGap(kase);
  check('QA20: recurrence marks the case REOPENED (history preserved, not deleted)', reopened.gapClosureQuality === 'REOPENED' && reopened.id === kase.id);
}

console.log(`\n${pass} checks passed — Step 6 (Minimum-Dose Remediation) OK`);
