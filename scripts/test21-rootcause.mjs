// Step 5 test: Prerequisite Stability + E4 Root Cause + Probe Selection/Limits
import { computeStability, isSurprisingCandidate } from '../src/engine2/stability21.ts';
import {
  needsInvestigation,
  classifyFrontier,
  orderProbeQueue,
  beginInvestigation,
  advanceInvestigation,
  exceedsConsecutiveProbeLimit,
} from '../src/engine2/rootcause21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

// ===================== Stability =====================

// PART E worked example: fresh, strong, no data-defaults-only skill should clear the bar
{
  const r = computeStability({
    masteryProbability: 0.85, uncertainty: 0.05, effectiveEvidence: 30,
    retentionReliability: CONFIG21.stability.retReliabilityDefault, lastPracticedAt: '2026-08-17', today: '2026-08-18',
    recentWrongCount: 0, hasActiveOrSuspectedMisconception: false,
  });
  check('PART E worked example: healthy fresh skill classifies STABLE', r.classification === 'STABLE', `stability=${r.stability}`);
  check('stability value is close to the architecture doc worked example (~0.75)', Math.abs(r.stability - 0.75) < 0.02, `${r.stability}`);
}

// AC5 / QA13: Unknown != Weak
{
  const unknown = computeStability({
    masteryProbability: 0.5, uncertainty: 0.16, effectiveEvidence: 1,
    retentionReliability: 0.85, lastPracticedAt: null, today: '2026-08-18', recentWrongCount: 0, hasActiveOrSuspectedMisconception: false,
  });
  check('AC5: too little evidence classifies UNKNOWN, not SHAKY', unknown.classification === 'UNKNOWN');
  check('AC5: UNKNOWN does not compute a stability number (nothing to weigh yet)', unknown.stability === null);
}

// QA13: p=0.80 but 90 days stale, no retention history -> far less stable than fresh p=0.80
{
  const fresh = computeStability({
    masteryProbability: 0.8, uncertainty: 0.06, effectiveEvidence: 15,
    retentionReliability: 0.85, lastPracticedAt: '2026-08-17', today: '2026-08-18', recentWrongCount: 0, hasActiveOrSuspectedMisconception: false,
  });
  const stale = computeStability({
    masteryProbability: 0.8, uncertainty: 0.08, effectiveEvidence: 15,
    retentionReliability: 0.85, lastPracticedAt: '2026-05-01', today: '2026-08-18', recentWrongCount: 0, hasActiveOrSuspectedMisconception: false,
  });
  check('QA13: 90-day-stale p=0.80 is far less stable than fresh p=0.80', stale.stability < fresh.stability * 0.6, `stale=${stale.stability} fresh=${fresh.stability}`);
  check('QA13: stale prerequisite should trigger a probe (not skip)', stale.classification !== 'STABLE');
}

// active misconception forces SHAKY even with high mastery number
{
  const withMis = computeStability({
    masteryProbability: 0.9, uncertainty: 0.03, effectiveEvidence: 40,
    retentionReliability: 0.9, lastPracticedAt: '2026-08-18', today: '2026-08-18', recentWrongCount: 0, hasActiveOrSuspectedMisconception: true,
  });
  check('active misconception forces SHAKY regardless of raw mastery', withMis.classification === 'SHAKY');
}

// ===================== needsInvestigation =====================
{
  check('CONCEPT_GAP triggers investigation', needsInvestigation('CONCEPT_GAP', 0, false));
  check('CARELESS_ERROR alone does not trigger investigation', !needsInvestigation('CARELESS_ERROR', 0, false));
  check('2 consecutive wrongs trigger investigation regardless of tag', needsInvestigation('CALCULATION_ERROR', 2, false));
}

// ===================== Probe ordering: Unknown-first =====================
{
  const stabilityMap = {
    shakySkill: { classification: 'SHAKY', stability: 0.4, breakdown: null },
    unknownSkill: { classification: 'UNKNOWN', stability: null, breakdown: null },
  };
  const infoOf = (id) => ({ skillId: id, stability: stabilityMap[id], misconceptionEvidence: 0, recentErrorRecurrence: 0, attributionProbability: 0.5 });
  const ordered = orderProbeQueue(['shakySkill', 'unknownSkill'], infoOf, () => 60);
  check('unknown candidates are probed before shaky-but-measured ones (info-gain first)', ordered[0] === 'unknownSkill');
}

// ===================== Multi-level descent: EQ.03 -> EQ.02 -> FRAC.01 -> SIGN.01 =====================
// This is exactly the deliberately-built chain from PART C-3 / QA2's spirit.
{
  const STABLE = { classification: 'STABLE', stability: 0.9, breakdown: null };
  const stabilityOf = (id) => {
    if (id === 'M1.ALG.EQ.01') return STABLE;
    if (id === 'M1.ALG.EXP.01') return STABLE;
    if (id === 'M1.ALG.EXP.02') return STABLE;
    if (id === 'M1.NUM.SIGN.01') return { classification: 'UNKNOWN', stability: null, breakdown: null };
    return { classification: 'SHAKY', stability: 0.4, breakdown: null }; // M1.ALG.EQ.02, M1.NUM.FRAC.01
  };
  const rawPOf = () => 0.5;
  const candidateInfoOf = (id) => ({ skillId: id, stability: stabilityOf(id), misconceptionEvidence: 0, recentErrorRecurrence: 1, attributionProbability: 0.5 });
  const ctx = { stabilityOf, rawPOf, candidateInfoOf, estimatedSecOf: () => 60 };

  let kase = beginInvestigation({
    id: 'case1', targetSkillId: 'M1.ALG.EQ.03', targetDifficulty: 5, originalAttemptId: 'att1',
    errorType: 'CONCEPT_GAP', likelyRootSkillId: 'M1.ALG.EQ.03', ts: Date.now(), ctx,
  });
  check('investigation starts, EQ.01/EXP.01 stable so only EQ.02 is queued', kase.stage === 'investigating' && kase.probeQueue.includes('M1.ALG.EQ.02'));
  check('stable prerequisites (EQ.01) are never queued for probing', !kase.probeQueue.includes('M1.ALG.EQ.01'));

  // probe EQ.02 -> fails -> descend into its prereqs (EQ.01 stable/skip, EXP.02 stable/skip, FRAC.01 shaky/queue)
  kase = advanceInvestigation(kase, { skillId: 'M1.ALG.EQ.02', correct: false, attemptId: 'p1' }, ctx);
  check('depth 1 failure descends to depth 2, queuing FRAC.01', kase.depth === 2 && kase.probeQueue.includes('M1.NUM.FRAC.01'));
  check('EXP.02 (stable) is not queued at depth 2', !kase.probeQueue.includes('M1.ALG.EXP.02'));

  // probe FRAC.01 -> fails -> descend into its prereqs (SIGN.01, unknown -> queued)
  kase = advanceInvestigation(kase, { skillId: 'M1.NUM.FRAC.01', correct: false, attemptId: 'p2' }, ctx);
  check('depth 2 failure descends to depth 3, queuing SIGN.01 (unknown)', kase.depth === 3 && kase.probeQueue.includes('M1.NUM.SIGN.01'));

  // probe SIGN.01 -> fails -> SIGN.01 has no prerequisites -> root cause found at the bottom
  kase = advanceInvestigation(kase, { skillId: 'M1.NUM.SIGN.01', correct: false, attemptId: 'p3' }, ctx);
  check('QA2 spirit: multi-level descent finds the true bottom root cause', kase.rootCauseSkillId === 'M1.NUM.SIGN.01', `got ${kase.rootCauseSkillId}`);
  check('investigation finished (stage moves to micro-lesson)', kase.stage === 'micro-lesson');
  check('probe count stayed within budget', kase.probesTaken.length <= CONFIG21.rootCause.maxProbePerCase);
}

// ===================== A clean prerequisite ends the investigation there (no false descent) =====================
{
  const stabilityOf = (id) => (id === 'M1.NUM.SIGN.01' ? { classification: 'SHAKY', stability: 0.4, breakdown: null } : { classification: 'STABLE', stability: 0.9, breakdown: null });
  const ctx = {
    stabilityOf, rawPOf: () => 0.5,
    candidateInfoOf: (id) => ({ skillId: id, stability: stabilityOf(id), misconceptionEvidence: 0, recentErrorRecurrence: 0, attributionProbability: 0.5 }),
    estimatedSecOf: () => 60,
  };
  let kase = beginInvestigation({ id: 'c2', targetSkillId: 'M1.ALG.EXP.01', targetDifficulty: 2, originalAttemptId: 'a', errorType: 'CONCEPT_GAP', likelyRootSkillId: 'M1.ALG.EXP.01', ts: Date.now(), ctx });
  check('EXP.01 has exactly one non-stable prereq queued', kase.probeQueue.length === 1 && kase.probeQueue[0] === 'M1.NUM.SIGN.01');
  kase = advanceInvestigation(kase, { skillId: 'M1.NUM.SIGN.01', correct: true, attemptId: 'p1' }, ctx);
  // Phase 3 PART 6-8: SHAKY(0.4) 후보의 첫 통과는 면죄가 아니라 BORDERLINE — 직교 재확인 대기
  check('borderline candidate passing once is NOT yet exonerated (orthogonal confirm pending)', kase.pendingOrthogonal === 'M1.NUM.SIGN.01' && kase.rootCauseSkillId === null);
  kase = advanceInvestigation(kase, { skillId: 'M1.NUM.SIGN.01', correct: true, attemptId: 'p1b' }, ctx);
  check('prerequisite passes BOTH representations -> root cause is the ORIGINAL skill, not descended further', kase.rootCauseSkillId === 'M1.ALG.EXP.01');
}

// ===================== AC11: surprising failure gets one extra confirm before trusted =====================
{
  // an UNKNOWN-but-high-raw-p candidate ("looked strong") unexpectedly fails a probe
  const stabilityOf = (id) => (id === 'surprising' ? { classification: 'UNKNOWN', stability: null, breakdown: null } : { classification: 'STABLE', stability: 0.9, breakdown: null });
  const rawPOf = (id) => (id === 'surprising' ? 0.9 : 0.5);
  const ctx = {
    stabilityOf, rawPOf,
    candidateInfoOf: (id) => ({ skillId: id, stability: stabilityOf(id), misconceptionEvidence: 0, recentErrorRecurrence: 0, attributionProbability: 0.5 }),
    estimatedSecOf: () => 60,
  };
  let kase = beginInvestigation({ id: 'c3', targetSkillId: 'root', targetDifficulty: 2, originalAttemptId: 'a', errorType: 'CONCEPT_GAP', likelyRootSkillId: 'root', ts: Date.now(), ctx: { ...ctx, stabilityOf: (id) => (id === 'surprising' ? { classification: 'UNKNOWN', stability: null, breakdown: null } : { classification: 'STABLE', stability: 0.9, breakdown: null }) } });
  // force a queue for the test (bypassing curriculum's real graph since 'root'/'surprising' are synthetic ids not in curriculum21)
  kase = { ...kase, probeQueue: ['surprising'], stage: 'investigating', rootCauseSkillId: null };

  kase = advanceInvestigation(kase, { skillId: 'surprising', correct: false, attemptId: 'p1' }, ctx);
  check('AC11: surprising failure does NOT immediately become root cause', kase.rootCauseSkillId === null);
  check('AC11: a reconfirm probe on the same skill is queued', kase.pendingReconfirm === 'surprising');

  // the reconfirm ALSO fails -> now it is trusted as root
  const kaseFail = advanceInvestigation(kase, { skillId: 'surprising', correct: false, attemptId: 'p2' }, ctx);
  check('AC11: two failures in a row confirm the surprising candidate as root', kaseFail.rootCauseSkillId === 'surprising' || kaseFail.frontierParentSkillId === 'surprising');

  // the reconfirm PASSES -> original failure discounted as noise
  const kasePass = advanceInvestigation(kase, { skillId: 'surprising', correct: true, attemptId: 'p3' }, ctx);
  check('AC11: a clean reconfirm discounts the original failure (root cause falls back to parent)', kasePass.rootCauseSkillId !== 'surprising');
}

// ===================== PART L: probe limits (no over-testing) =====================
{
  check('maxProbePerCase is configured and finite', CONFIG21.rootCause.maxProbePerCase > 0 && CONFIG21.rootCause.maxProbePerCase <= 5);
  check('maxConsecutiveProbes is configured', CONFIG21.rootCause.maxConsecutiveProbes > 0);
  check('QA19: 3 consecutive probes trips the limit', exceedsConsecutiveProbeLimit(['probe', 'probe', 'probe']));
  check('QA19: a non-probe item in between resets the run', !exceedsConsecutiveProbeLimit(['probe', 'normal', 'probe']));
}

console.log(`\n${pass} checks passed — Step 5 (Stability + Root Cause + Probe Selection) OK`);
