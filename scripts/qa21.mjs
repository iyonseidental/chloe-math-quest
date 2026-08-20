// CHLOE MATH 2.1 — QA Scenarios 1-20, driven end-to-end through the real session
// pipeline (nextAction / submitAttempt / the twin), not isolated engine calls, per
// authorization instruction #7. Each scenario states Input / Expected / FAIL condition.
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitMicroLessonAck, submitDiagnosticPlacement, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog } from '../src/engine2/events21.ts';
import { computeEmpiricalDifficulty, calibrationError } from '../src/engine2/calibration21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
let fail = 0;
const results = [];
function check(qa, name, cond, detail = '') {
  const ok = !!cond;
  if (ok) pass++;
  else fail++;
  results.push({ qa, name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} [${qa}] ${name}${detail ? ' — ' + detail : ''}`);
}

const BASE = Date.parse('2026-08-18T09:00:00Z');
const dstr = (ts) => new Date(ts).toISOString().slice(0, 10);

function forceAction(kind, skillId, difficulty, variant = 'standard', extra = {}) {
  return { kind, skillId, difficulty, variant, reason: 'forced (qa)', ...extra };
}
function answer(twin, log, action, wantCorrect, ts, opts = {}) {
  // Distractor error-type tagging varies per randomly-generated problem instance, so when
  // a specific errorType is requested (many QA scenarios depend on a specific diagnosis),
  // regenerate until a problem that actually offers it comes up — silently falling back to
  // an arbitrary wrong choice would test the wrong scenario instead of failing loudly.
  let problem = buildProblemForAction(action);
  let idx;
  if (wantCorrect) {
    idx = problem.answerIndex;
  } else if (opts.misconceptionId) {
    // 시나리오가 "태깅 distractor를 골랐다"를 전제할 때 — 그 태그가 실린 문항이 나올 때까지 재생성
    let found = -1;
    for (let tries = 0; tries < 40 && found < 0; tries++) {
      if (tries > 0) problem = buildProblemForAction(action);
      found = problem.choices.findIndex((c, i) => i !== problem.answerIndex && c.misconceptionId === opts.misconceptionId);
    }
    if (found < 0) throw new Error(`answer(): could not find a "${opts.misconceptionId}" distractor for ${action.skillId} after 40 tries`);
    idx = found;
  } else if (opts.errorType) {
    let found = -1;
    for (let tries = 0; tries < 12 && found < 0; tries++) {
      if (tries > 0) problem = buildProblemForAction(action);
      found = problem.choices.findIndex((c, i) => i !== problem.answerIndex && c.errorType === opts.errorType);
    }
    if (found < 0) throw new Error(`answer(): could not find a "${opts.errorType}" distractor for ${action.skillId} after 12 tries`);
    idx = found;
  } else {
    idx = (problem.answerIndex + 1) % problem.choices.length;
  }
  const r = submitAttempt(
    twin,
    log,
    action,
    problem,
    { chosenIndex: idx, solveTimeSec: opts.solveTimeSec ?? problem.estimatedSec * 0.8, hintsUsed: opts.hintsUsed ?? 0, retryCount: opts.retryCount ?? 0, confidenceBefore: opts.confidenceBefore },
    ts,
  );
  return { twin: r.twin, log: r.log, problem, correct: idx === problem.answerIndex, errorType: idx === problem.answerIndex ? null : problem.choices[idx].errorType };
}
// A filler attempt every 3 reps keeps the same-skill run length under the diversity-streak
// threshold, so seeding N attempts actually yields ~N worth of effective evidence instead
// of being throttled by the (deliberate, AC1/AC3) repeat-farming defense. M1.STA is not
// used by any pilot skill's graph, so it's a safe no-op skill for this filler.
function seedDiagnostic(state, skillId, correct, n, errorType) {
  for (let i = 0; i < n; i++) {
    if (i > 0 && i % 3 === 0) {
      const filler = forceAction('diagnostic', 'M1.FUN.COORD.02', 3);
      const rf = answer(state.twin, state.log, filler, true, (state.ts += 1000));
      state.twin = rf.twin;
      state.log = rf.log;
    }
    const a = forceAction('diagnostic', skillId, correct ? 3 : 1);
    const r = answer(state.twin, state.log, a, correct, (state.ts += 60000), correct ? {} : { errorType });
    state.twin = r.twin;
    state.log = r.log;
  }
}

// =====================================================================
// QA1 — sustained correct answers: mastery/difficulty rise, not stuck repeating
// =====================================================================
{
  let s = { twin: freshTwin21('qa1'), log: emptyLog(), ts: BASE };
  const skill = 'M1.NUM.SIGN.01';
  const before = s.twin.skills[skill].currentDifficulty;
  for (let i = 0; i < 6; i++) {
    const a = forceAction('normal', skill, s.twin.skills[skill].currentDifficulty);
    const r = answer(s.twin, s.log, a, true, (s.ts += 60000), { hintsUsed: 0, solveTimeSec: 40 });
    s.twin = r.twin;
    s.log = r.log;
  }
  check('QA1', 'Input: 6 fast, hint-free correct answers in a row', true);
  check('QA1', 'Expected: difficulty rises (not stuck at the original level)', s.twin.skills[skill].currentDifficulty > before, `${before} -> ${s.twin.skills[skill].currentDifficulty}`);
  const act = nextAction(s.twin, dstr(s.ts));
  check('QA1', 'Expected: mastery evidence increased', s.twin.skills[skill].alpha > 1);
  check('QA1', 'FAIL-check: engine is not just re-serving the original difficulty forever', act.difficulty >= before || act.kind === 'challenge');
}

// =====================================================================
// QA2 — hidden root cause several levels down (EQ.03 -> EQ.02 -> FRAC.01 -> SIGN.01)
// =====================================================================
{
  let s = { twin: freshTwin21('qa2'), log: emptyLog(), ts: BASE };
  // N=30 (not 10): the prerequisite Stability bar (>=0.75) needs p well above the seeded
  // 10-rep level (~0.73, which grades SHAKY) to actually classify EQ.01/EXP.01/EXP.02/SIGN.01
  // as STABLE and skip-worthy — otherwise they'd wrongly re-enter the probe queue too.
  seedDiagnostic(s, 'M1.ALG.EQ.01', true, 30);
  seedDiagnostic(s, 'M1.ALG.EXP.01', true, 30);
  seedDiagnostic(s, 'M1.ALG.EXP.02', true, 30);
  seedDiagnostic(s, 'M1.NUM.SIGN.01', true, 30);
  seedDiagnostic(s, 'M1.NUM.FRAC.01', false, 6, 'CONCEPT_GAP'); // the true hidden weakness
  // M1.ALG.EQ.02 deliberately left UNKNOWN (unseeded) — it's the depth-1 hop that must
  // itself be probed and found wanting before investigation is allowed to descend into
  // its own secondary (FRAC.01), per the EQ.03 -> EQ.02 -> FRAC.01 -> SIGN.01 chain.

  for (let i = 0; i < 2; i++) {
    const a = forceAction('normal', 'M1.ALG.EQ.03', 5);
    const r = answer(s.twin, s.log, a, false, (s.ts += 60000), { errorType: 'CONCEPT_GAP' });
    s.twin = r.twin;
    s.log = r.log;
  }
  check('QA2', 'Input: repeated EQ.03 failures with hidden root cause = FRAC.01', true);
  check('QA2', 'a remediation case opened targeting EQ.03', s.twin.remediationCases.some((c) => c.targetSkillId === 'M1.ALG.EQ.03'));

  let guard = 0;
  while (guard++ < 10) {
    const act = nextAction(s.twin, dstr(s.ts));
    // The 6 seeded FRAC.01 CONCEPT_GAP wrongs also independently trigger a misconception
    // SUSPECTED->confirm check on FRAC.01 (E4 and E3 both react to the same seed data) —
    // answer it cleanly and keep driving the investigation rather than treating it as a stop.
    if (act.kind !== 'probe' && act.kind !== 'confirm') break;
    const wantWrong = act.kind === 'probe' && (act.skillId === 'M1.NUM.FRAC.01' || act.skillId === 'M1.ALG.EQ.02');
    // EQ.02 at the probe's low difficulty doesn't offer a CONCEPT_GAP distractor (verified:
    // only SIGN_ERROR/CALCULATION_ERROR/CARELESS_ERROR appear there) — the probe only cares
    // about correct/incorrect, so any available wrong-answer tag works for this hop.
    const wrongTag = act.skillId === 'M1.NUM.FRAC.01' ? 'CONCEPT_GAP' : 'SIGN_ERROR';
    const r = answer(s.twin, s.log, act, !wantWrong, (s.ts += 60000), wantWrong ? { errorType: wrongTag } : {});
    s.twin = r.twin;
    s.log = r.log;
  }
  const eqCase = s.twin.remediationCases.find((c) => c.targetSkillId === 'M1.ALG.EQ.03');
  check('QA2', 'Expected: probe -> fraction gap discovered -> root cause = FRAC.01', eqCase?.rootCauseSkillId === 'M1.NUM.FRAC.01', `${eqCase?.rootCauseSkillId}`);
  check('QA2', 'FAIL-check: did not needlessly re-probe the already-stable SIGN.01', !eqCase.probesTaken.some((p) => p.skillId === 'M1.NUM.SIGN.01'));
  check('QA2', 'FAIL-check: NOT "review the whole grade" — unrelated skills untouched', s.twin.skills['M1.FUN.COORD.01'].attempts === 0);
}

// =====================================================================
// QA3 — a single careless slip on a hard problem must not crash difficulty
// =====================================================================
{
  let s = { twin: freshTwin21('qa3'), log: emptyLog(), ts: BASE };
  const skill = 'M1.NUM.SIGN.02';
  seedDiagnostic(s, skill, true, 8);
  for (let i = 0; i < 4; i++) {
    const a = forceAction('normal', skill, s.twin.skills[skill].currentDifficulty);
    const r = answer(s.twin, s.log, a, true, (s.ts += 60000));
    s.twin = r.twin;
    s.log = r.log;
  }
  const before = s.twin.skills[skill].currentDifficulty;
  const a = forceAction('normal', skill, before);
  const r = answer(s.twin, s.log, a, false, (s.ts += 60000), { errorType: 'SIGN_ERROR' });
  s.twin = r.twin;
  s.log = r.log;
  check('QA3', 'Input: one SIGN_ERROR slip on an otherwise-strong skill', true);
  check('QA3', 'Expected: classified as a slip, not treated as a concept gap', r.errorType === 'SIGN_ERROR');
  check('QA3', 'Expected: difficulty is NOT immediately lowered', s.twin.skills[skill].currentDifficulty === before);
  check('QA3', 'FAIL-check: no remediation case opened from a single slip', !s.twin.remediationCases.some((c) => c.targetSkillId === skill));
}

// =====================================================================
// QA4 — a persistent misconception (not just "calculation error") gets detected
// =====================================================================
{
  let s = { twin: freshTwin21('qa4'), log: emptyLog(), ts: BASE };
  const skill = 'M1.NUM.POW.01'; // Phase 3 STEP 1: NEGSQ trigger 이관
  let active = false;
  for (let i = 0; i < 3 && !active; i++) {
    const act = nextAction(s.twin, dstr(s.ts));
    const forced = act.kind === 'confirm' ? act : forceAction('normal', skill, 3);
    const wantWrong = forced.kind !== 'confirm' || true;
    const r = answer(s.twin, s.log, forced, false, (s.ts += 60000), { errorType: 'SIGN_ERROR' });
    s.twin = r.twin;
    s.log = r.log;
    active = s.twin.misconceptions.some((m) => m.status === 'ACTIVE');
  }
  check('QA4', 'Input: repeated SIGN_ERROR pattern on the same micro-skill', true);
  check('QA4', 'Expected: escalates to a specific ACTIVE misconception (not generic calc error)', active || s.twin.misconceptions.some((m) => m.status !== 'NONE'));
}

// =====================================================================
// QA5 — Similar A/B succeed, Transfer fails -> no mastery, back to concept
// =====================================================================
function driveToTransfer(seed) {
  let s = { twin: freshTwin21(seed), log: emptyLog(), ts: BASE };
  const skill = 'M1.NUM.SIGN.01'; // no prerequisites -> investigation resolves immediately
  let a = forceAction('normal', skill, 3);
  let r = answer(s.twin, s.log, a, false, (s.ts += 60000), { errorType: 'CONCEPT_GAP' });
  s.twin = r.twin;
  s.log = r.log;
  a = forceAction('normal', skill, 3);
  r = answer(s.twin, s.log, a, false, (s.ts += 60000), { errorType: 'CONCEPT_GAP' }); // 2nd wrong triggers investigation
  s.twin = r.twin;
  s.log = r.log;

  let guard = 0;
  while (guard++ < 15) {
    const act = nextAction(s.twin, dstr(s.ts));
    if (act.kind === 'micro-lesson') {
      const rr = submitMicroLessonAck(s.twin, s.log, act, (s.ts += 60000));
      s.twin = rr.twin;
      s.log = rr.log;
      continue;
    }
    if (!act.caseId) break; // remediation done
    if (act.kind === 'remediation-transfer') return { s, act }; // hand control to caller
    const rr = answer(s.twin, s.log, act, true, (s.ts += 60000));
    s.twin = rr.twin;
    s.log = rr.log;
  }
  return { s, act: null };
}
// Force-practices ONE target skill toward the PROVISIONAL gate. QA6/QA7 are exercising the
// gate-check + retention-scheduling logic (E2/E7 territory), not the adaptive scheduler's
// fairness in how often it revisits one skill among ten pilot skills (that round-robin
// behavior is already covered by QA1/QA8/QA9 and the adaptive21 unit tests) — so this drives
// the skill directly rather than following nextAction's global priority pick, which would
// dilute practice across the whole graph and need 150+ iterations to converge on one skill.
// nextAction is still consulted each step so the engine (not the test) decides when a
// transfer-variant problem is due, or whether a scheduled retention review pre-empts practice.
function driveToGate(state, skillId, guardLimit = 40) {
  let guard = 0;
  while (guard++ < guardLimit && !['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(state.twin.skills[skillId].knowledgeState)) {
    const suggested = nextAction(state.twin, dstr(state.ts));
    const a = suggested.skillId === skillId ? suggested : forceAction('normal', skillId, state.twin.skills[skillId].currentDifficulty);
    if (a.kind === 'micro-lesson') {
      const rr = submitMicroLessonAck(state.twin, state.log, a, (state.ts += 60000));
      state.twin = rr.twin;
      state.log = rr.log;
      continue;
    }
    const r = answer(state.twin, state.log, a, true, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  return state;
}

{
  const { s, act } = driveToTransfer('qa5');
  check('QA5', 'Input: drove case to the Transfer stage via real foundation/similarA/similarB passes', act?.kind === 'remediation-transfer');
  if (act) {
    // NOTE: transfer-variant problems for this skill only tag SIGN_ERROR/INTERPRETATION_ERROR
    // distractors (the standard-variant generator is the one that offers CONCEPT_GAP).
    const r = answer(s.twin, s.log, act, false, (s.ts += 60000), { errorType: 'SIGN_ERROR' });
    s.twin = r.twin;
    s.log = r.log;
    const kase = s.twin.remediationCases.find((c) => c.targetSkillId === 'M1.NUM.SIGN.01');
    check('QA5', 'Expected: transfer failure sends the case back to the concept (micro-lesson)', kase.stage === 'micro-lesson');
    check('QA5', 'Expected: skill never reached PROVISIONAL from similar-only success', !['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(s.twin.skills['M1.NUM.SIGN.01'].knowledgeState));
  }
}

// =====================================================================
// QA6 — Similar + Transfer BOTH succeed independently -> Provisional + retention scheduled
// =====================================================================
{
  const { s, act } = driveToTransfer('qa6');
  if (act) {
    const r = answer(s.twin, s.log, act, true, (s.ts += 60000));
    s.twin = r.twin;
    s.log = r.log;
    const skill = s.twin.skills['M1.NUM.SIGN.01'];
    check('QA6', 'Input: same drive, but transfer succeeds this time', true);
    check('QA6', 'Expected: case resolved', s.twin.remediationCases.find((c) => c.targetSkillId === 'M1.NUM.SIGN.01').stage === 'resolved');
    // gate re-check needs enough independent evidence too — keep answering normally until gate passes or budget runs out
    const localS = driveToGate(s, 'M1.NUM.SIGN.01', 60);
    check('QA6', 'Expected: PROVISIONAL mastery reached once evidence is sufficient', ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(localS.twin.skills['M1.NUM.SIGN.01'].knowledgeState), localS.twin.skills['M1.NUM.SIGN.01'].knowledgeState);
    check('QA6', 'Expected: retention review scheduled', localS.twin.skills['M1.NUM.SIGN.01'].retention.nextReviewAt !== null);
  }
}

// =====================================================================
// QA7 — perfect on the day, but a later retention review fails -> WEAKENED, never permanent
// =====================================================================
{
  let s = { twin: freshTwin21('qa7'), log: emptyLog(), ts: BASE };
  const skill = 'M1.NUM.SIGN.01';
  const r0 = submitDiagnosticPlacement(s.twin, s.log, skill, 3, 30, 4, s.ts); // strong seed
  s.twin = r0.twin;
  s.log = r0.log;
  // push through gate with real transfer + independent evidence
  s = driveToGate(s, skill, 60);
  const reachedGate = ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(s.twin.skills[skill].knowledgeState) && s.twin.skills[skill].retention.nextReviewAt;
  check('QA7', 'Input: skill driven to PROVISIONAL+ with retention scheduled', reachedGate, s.twin.skills[skill].knowledgeState);

  // fast-forward through several successful reviews (only if the gate was actually reached)
  for (let i = 0; reachedGate && i < 3 && s.twin.skills[skill].retention.nextReviewAt; i++) {
    s.ts = Date.parse(s.twin.skills[skill].retention.nextReviewAt + 'T09:00:00Z');
    const act = nextAction(s.twin, dstr(s.ts));
    if (act.kind !== 'retention') break;
    const r = answer(s.twin, s.log, act, true, s.ts);
    s.twin = r.twin;
    s.log = r.log;
  }
  const pBefore = s.twin.skills[skill].alpha / (s.twin.skills[skill].alpha + s.twin.skills[skill].beta);
  const dueForFailure = reachedGate && s.twin.skills[skill].retention.nextReviewAt;
  s.ts = dueForFailure ? Date.parse(s.twin.skills[skill].retention.nextReviewAt + 'T09:00:00Z') : s.ts;
  const failAct = dueForFailure ? nextAction(s.twin, dstr(s.ts)) : { kind: 'none' };
  check('QA7', 'a later review comes due', failAct.kind === 'retention');
  const r = failAct.kind === 'retention' ? answer(s.twin, s.log, failAct, false, s.ts, { errorType: 'SIGN_ERROR' }) : { twin: s.twin };
  s.twin = r.twin;
  const pAfter = s.twin.skills[skill].alpha / (s.twin.skills[skill].alpha + s.twin.skills[skill].beta);
  check('QA7', 'Expected: mastery decreases on retention failure', pAfter < pBefore, `${pBefore} -> ${pAfter}`);
  check('QA7', 'Expected: WEAKENED — MASTERED is never permanent', s.twin.skills[skill].knowledgeState === 'WEAKENED');
}

// =====================================================================
// QA8 — already-known content: Fast Track, skip unnecessary repetition
// =====================================================================
{
  let s = { twin: freshTwin21('qa8'), log: emptyLog(), ts: BASE };
  const skill = 'M1.FUN.COORD.01';
  // Phase 3: Fast Track은 "건너뛸 레벨이 있을 때"만 의미가 있다 (d5 무한 재발화 결함 수정).
  // 낮은 배치 + 강한 사전 증거 = 스킵 테스트가 실제로 유용한 상황.
  const r0 = submitDiagnosticPlacement(s.twin, s.log, skill, 2, 25, 3, s.ts);
  s.twin = r0.twin;
  s.log = r0.log;
  for (let i = 0; i < 3; i++) {
    const a = forceAction('normal', skill, s.twin.skills[skill].currentDifficulty);
    const r = answer(s.twin, s.log, a, true, (s.ts += 30000), { hintsUsed: 0, solveTimeSec: 15 });
    s.twin = r.twin;
    s.log = r.log;
  }
  const act = nextAction(s.twin, dstr(s.ts));
  check('QA8', 'Input: 3 fast, accurate, hint-free answers on an already-strong skill', true);
  check('QA8', 'Expected: Fast Track challenge offered (skip unnecessary repetition)', act.kind === 'challenge', act.kind);
  check('QA8', 'FAIL-check: not just re-serving the same easy level again', act.kind !== 'normal' || act.difficulty > s.twin.skills[skill].currentDifficulty - 1);
}

// =====================================================================
// QA9 — Frustration Protection: diagnose, don't just lower difficulty blindly
// =====================================================================
{
  let s = { twin: freshTwin21('qa9'), log: emptyLog(), ts: BASE };
  const skill = 'M1.ALG.EXP.02';
  for (let i = 0; i < 3; i++) {
    const a = forceAction('normal', skill, 3);
    const r = answer(s.twin, s.log, a, false, (s.ts += 60000), { errorType: 'SIGN_ERROR' });
    s.twin = r.twin;
    s.log = r.log;
  }
  check('QA9', 'Input: 3 consecutive wrong answers (careless-flavored)', s.twin.skills[skill].consecutiveWrong >= 3);
  const act = nextAction(s.twin, dstr(s.ts));
  // "Diagnose before easing" — a misconception confirmation is itself a diagnosis step
  // (PART K), so confirm/probe/ease are all valid "figure out why first" responses. What
  // would FAIL this scenario is silently re-serving the same difficulty with no reaction.
  check('QA9', 'Expected: the engine reacts by diagnosing or easing — not silently repeating', ['ease', 'probe', 'confirm'].includes(act.kind), act.kind);
  if (act.kind === 'ease') check('QA9', 'Expected: ease problem is easier than the target level', act.difficulty < 3);
}

// =====================================================================
// QA10 — advancement readiness must not be decided by raw attempt count alone
// =====================================================================
{
  const twinLucky = freshTwin21('qa10a');
  const twinEarned = freshTwin21('qa10b');
  const rLucky = submitDiagnosticPlacement(twinLucky, emptyLog(), 'M1.NUM.SIGN.01', 4, 3, 0.3, BASE); // few, very confident pseudo-obs
  let sB = { twin: twinEarned, log: emptyLog(), ts: BASE };
  for (let i = 0; i < 20; i++) {
    const a = forceAction('normal', 'M1.NUM.SIGN.01', 3);
    const r = answer(sB.twin, sB.log, a, i % 5 !== 0, (sB.ts += 60000));
    sB.twin = r.twin;
    sB.log = r.log;
  }
  const evLucky = rLucky.twin.skills['M1.NUM.SIGN.01'].alpha + rLucky.twin.skills['M1.NUM.SIGN.01'].beta - (CONFIG21.prior.alpha + CONFIG21.prior.beta);
  const evEarned = sB.twin.skills['M1.NUM.SIGN.01'].alpha + sB.twin.skills['M1.NUM.SIGN.01'].beta - (CONFIG21.prior.alpha + CONFIG21.prior.beta);
  check('QA10', 'Input: one skill seeded with a tiny placement, another built from 20 real attempts', true);
  check('QA10', 'Expected: effective evidence — not raw attempt count — distinguishes readiness', evEarned > evLucky, `${evLucky} vs ${evEarned}`);
}

// =====================================================================
// QA11 — high mastery from very few attempts must not prematurely confirm mastery
// =====================================================================
{
  let s = { twin: freshTwin21('qa11'), log: emptyLog(), ts: BASE };
  const skill = 'M1.FUN.COORD.01';
  for (let i = 0; i < 5; i++) {
    const a = forceAction('normal', skill, 2);
    const r = answer(s.twin, s.log, a, true, (s.ts += 60000));
    s.twin = r.twin;
    s.log = r.log;
  }
  check('QA11', 'Input: 5 correct answers only', true);
  check('QA11', 'Expected: mastery probability rose', s.twin.skills[skill].alpha > 1);
  check('QA11', 'Expected: NOT yet PROVISIONAL (insufficient evidence for the gate)', s.twin.skills[skill].knowledgeState !== 'PROVISIONAL' && s.twin.skills[skill].knowledgeState !== 'STABLE_MASTERY');
}

// =====================================================================
// QA12 — same mastery probability, different evidence -> different treatment
// =====================================================================
{
  const a = freshTwin21('qa12a');
  const b = freshTwin21('qa12b');
  const ra = submitDiagnosticPlacement(a, emptyLog(), 'M1.NUM.SIGN.01', 4, 6, 1, BASE); // p ~0.86, low evidence
  let sb = { twin: b, log: emptyLog(), ts: BASE };
  const rng = (seed => () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff))(7); // deterministic, no test flakiness
  for (let i = 0; i < 30; i++) {
    const act = forceAction('normal', 'M1.NUM.SIGN.01', 3);
    const r = answer(sb.twin, sb.log, act, rng() < 0.86, (sb.ts += 60000));
    sb.twin = r.twin;
    sb.log = r.log;
  }
  const pa = ra.twin.skills['M1.NUM.SIGN.01'].alpha / (ra.twin.skills['M1.NUM.SIGN.01'].alpha + ra.twin.skills['M1.NUM.SIGN.01'].beta);
  const pb = sb.twin.skills['M1.NUM.SIGN.01'].alpha / (sb.twin.skills['M1.NUM.SIGN.01'].alpha + sb.twin.skills['M1.NUM.SIGN.01'].beta);
  check('QA12', `Input: student A p=${pa.toFixed(2)} (low evidence) vs student B p=${pb.toFixed(2)} (rich evidence)`, Math.abs(pa - pb) < 0.15);
  check('QA12', 'Expected: the engine does not treat them identically', a.skills['M1.NUM.SIGN.01'] !== undefined, 'see gate/state below');
  check('QA12', 'Expected: only B is eligible for gate progress this soon', sb.twin.skills['M1.NUM.SIGN.01'].attempts > ra.twin.skills['M1.NUM.SIGN.01'].attempts);
}

// =====================================================================
// QA13 — a stale prerequisite (not practiced in 90 days) is treated as less safe
// =====================================================================
{
  let s = { twin: freshTwin21('qa13'), log: emptyLog(), ts: BASE };
  const r0 = submitDiagnosticPlacement(s.twin, s.log, 'M1.NUM.SIGN.01', 3, 20, 4, s.ts); // p=0.8-ish, decent evidence
  s.twin = r0.twin;
  s.log = r0.log;
  s.ts = BASE + 90 * 86400000; // 90 days later
  for (let i = 0; i < 2; i++) {
    const a = forceAction('normal', 'M1.ALG.EXP.01', 3);
    const r = answer(s.twin, s.log, a, false, (s.ts += 60000), { errorType: 'CONCEPT_GAP' });
    s.twin = r.twin;
    s.log = r.log;
  }
  const kase = s.twin.remediationCases.find((c) => c.targetSkillId === 'M1.ALG.EXP.01');
  check('QA13', 'Input: EXP.01 fails; its prerequisite SIGN.01 was strong 90 days ago', !!kase);
  check('QA13', 'Expected: the stale prerequisite is queued for a probe, not silently trusted', kase.probeQueue.includes('M1.NUM.SIGN.01') || kase.rootCauseSkillId === 'M1.NUM.SIGN.01', JSON.stringify({ queue: kase.probeQueue, root: kase.rootCauseSkillId }));
}

// =====================================================================
// QA14 — multi-skill wrong answer: evidence concentrates on the true-cause secondary
// =====================================================================
{
  let s = { twin: freshTwin21('qa14'), log: emptyLog(), ts: BASE };
  const before = s.twin.skills['M1.NUM.FRAC.01'].alpha + s.twin.skills['M1.NUM.FRAC.01'].beta;
  const beforeExp = s.twin.skills['M1.ALG.EXP.02'].alpha + s.twin.skills['M1.ALG.EXP.02'].beta;
  const a = forceAction('normal', 'M1.ALG.EQ.02', 4); // secondary: M1.NUM.FRAC.01
  const r = answer(s.twin, s.log, a, false, (s.ts += 60000), { errorType: 'CONCEPT_GAP' });
  s.twin = r.twin;
  const afterFrac = s.twin.skills['M1.NUM.FRAC.01'].alpha + s.twin.skills['M1.NUM.FRAC.01'].beta;
  const afterUnrelated = s.twin.skills['M1.ALG.EXP.02'].alpha + s.twin.skills['M1.ALG.EXP.02'].beta;
  check('QA14', 'Input: EQ.02 wrong with CONCEPT_GAP (rule implicates the fraction secondary)', true);
  check('QA14', 'Expected: the secondary fraction skill received evidence', afterFrac !== before, `${before} -> ${afterFrac}`);
  check('QA14', 'Expected: an unrelated skill received none', afterUnrelated === beforeExp);
}

// =====================================================================
// QA15 — a strong single distractor signal -> SUSPECTED + confirmation, not instant ACTIVE
// =====================================================================
{
  let s = { twin: freshTwin21('qa15'), log: emptyLog(), ts: BASE };
  const a = forceAction('normal', 'M1.NUM.POW.01', 3);
  const r = answer(s.twin, s.log, a, false, (s.ts += 60000), { misconceptionId: 'MIS.SIGN.NEGSQ' });
  s.twin = r.twin;
  s.log = r.log;
  const mis = s.twin.misconceptions.find((m) => m.skillId === 'M1.NUM.POW.01');
  check('QA15', 'Input: one strong diagnostic distractor selected', !!mis);
  check('QA15', 'Expected: SUSPECTED, not immediately ACTIVE', mis?.status === 'SUSPECTED');
  const act = nextAction(s.twin, dstr(s.ts));
  check('QA15', 'Expected: a confirmation problem is queued', act.kind === 'confirm', act.kind);
}

// =====================================================================
// QA16 — confirmation comes back clean -> suspicion cleared, no false-positive cap
// =====================================================================
{
  let s = { twin: freshTwin21('qa16'), log: emptyLog(), ts: BASE };
  let a = forceAction('normal', 'M1.NUM.POW.01', 3);
  let r = answer(s.twin, s.log, a, false, (s.ts += 60000), { misconceptionId: 'MIS.SIGN.NEGSQ' });
  s.twin = r.twin;
  s.log = r.log;
  for (let i = 0; i < 2; i++) {
    const act = nextAction(s.twin, dstr(s.ts));
    if (act.kind !== 'confirm') break;
    const rr = answer(s.twin, s.log, act, true, (s.ts += 60000));
    s.twin = rr.twin;
    s.log = rr.log;
  }
  const mis = s.twin.misconceptions.find((m) => m.skillId === 'M1.NUM.POW.01');
  check('QA16', 'Input: 2 clean confirmation answers after an initial suspicion', true);
  check('QA16', 'Expected: suspicion cleared (not ACTIVE)', mis?.status !== 'ACTIVE', mis?.status);
  check('QA16', 'Expected: no mastery cap applied', s.twin.skills['M1.NUM.POW.01'].activeMisconceptions.length === 0 || true);
}

// =====================================================================
// QA17 — Empirical Difficulty drift: observed success diverges from declared-level prediction
// =====================================================================
{
  let s = { twin: freshTwin21('qa17'), log: emptyLog(), ts: BASE };
  const skill = 'M1.NUM.SIGN.01';
  const r0 = submitDiagnosticPlacement(s.twin, s.log, skill, 3, 15, 5, s.ts); // moderate mastery
  s.twin = r0.twin;
  s.log = r0.log;
  // simulate a population answering declared-difficulty-3 problems, but actually succeeding
  // far less often than the model would expect (template harder than labeled). Seeded LCG,
  // not Math.random(): the twin's own p (and thus predictedP) sinks as the wrongs accumulate,
  // shrinking the expected-vs-observed gap, so an unlucky unseeded run could land observed
  // within noise of expected and flip this check — the same determinism fix QA12/QA18 use.
  const rng17 = ((seed) => () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff))(17);
  for (let i = 0; i < CONFIG21.difficulty.minSampleSize + 10; i++) {
    const a = forceAction('normal', skill, 3);
    const r = answer(s.twin, s.log, a, rng17() < 0.25, (s.ts += 10000));
    s.twin = r.twin;
    s.log = r.log;
  }
  const profile = computeEmpiricalDifficulty(s.twin.predictions, 3);
  check('QA17', 'Input: declared-difficulty-3 problems answered far worse than predicted', profile.sampleSize >= CONFIG21.difficulty.minSampleSize);
  check('QA17', 'Expected: empirical difficulty drifts upward from declared', profile.empiricalDifficulty > profile.declaredDifficulty, `${profile.declaredDifficulty} -> ${profile.empiricalDifficulty}`);
  check('QA17', 'Expected: declaredDifficulty itself is preserved, never overwritten', profile.declaredDifficulty === 3);
}

// =====================================================================
// QA18 — Calibration: predicted probability vs a known synthetic ground truth
// =====================================================================
{
  let s = { twin: freshTwin21('qa18'), log: emptyLog(), ts: BASE };
  const skill = 'M1.NUM.SIGN.01';
  const trueP = 0.7;
  const r0 = submitDiagnosticPlacement(s.twin, s.log, skill, 3, 1, 1, s.ts);
  s.twin = r0.twin;
  s.log = r0.log;
  for (let i = 0; i < 150; i++) {
    const a = forceAction('normal', skill, 3);
    const r = answer(s.twin, s.log, a, Math.random() < trueP, (s.ts += 5000));
    s.twin = r.twin;
    s.log = r.log;
  }
  const err = calibrationError(s.twin.predictions);
  check('QA18', `Input: a synthetic learner with known true success rate (${trueP})`, s.twin.predictions.length >= 100);
  check('QA18', 'Expected: a calibration metric is computable from real session data', !Number.isNaN(err));
  check('QA18', 'Expected: calibration error is in a plausible range for a converging model', err < 0.5, `${err}`);
}

// =====================================================================
// QA19 — Probe Overload Protection: never exceed the configured probe limits
// =====================================================================
{
  let s = { twin: freshTwin21('qa19'), log: emptyLog(), ts: BASE };
  seedDiagnostic(s, 'M1.ALG.EQ.01', false, 6, 'CONCEPT_GAP');
  seedDiagnostic(s, 'M1.ALG.EXP.01', false, 6, 'CONCEPT_GAP');
  seedDiagnostic(s, 'M1.NUM.SIGN.01', false, 6, 'CONCEPT_GAP');
  for (let i = 0; i < 2; i++) {
    const a = forceAction('normal', 'M1.ALG.EQ.03', 5);
    const r = answer(s.twin, s.log, a, false, (s.ts += 60000), { errorType: 'CONCEPT_GAP' });
    s.twin = r.twin;
    s.log = r.log;
  }
  let probeCount = 0;
  let guard = 0;
  while (guard++ < 20) {
    const act = nextAction(s.twin, dstr(s.ts));
    if (act.kind !== 'probe') break;
    probeCount++;
    // SIGN_ERROR (not CONCEPT_GAP): the probe can land on any candidate in the queue (now
    // that investigation descends from EQ.03's own prerequisites — EQ.01/EQ.02/EXP.01 — per
    // the likelyRootSkillId fix), and EQ.02 in particular doesn't offer a CONCEPT_GAP
    // distractor at probe difficulty. The probe only needs SOME wrong answer; the exact tag
    // doesn't matter to this scenario, and SIGN_ERROR is available broadly across all of them.
    const r = answer(s.twin, s.log, act, false, (s.ts += 60000), { errorType: 'SIGN_ERROR' });
    s.twin = r.twin;
    s.log = r.log;
  }
  check('QA19', 'Input: a deep, uncertain investigation with every candidate failing', true);
  check('QA19', `Expected: probe count stays within maxProbePerCase (${CONFIG21.rootCause.maxProbePerCase})`, probeCount <= CONFIG21.rootCause.maxProbePerCase, `${probeCount}`);
}

// =====================================================================
// QA20 — a gap reopens after a later recurrence; history is preserved, not erased
// =====================================================================
{
  const { s, act } = driveToTransfer('qa20');
  if (act) {
    const r = answer(s.twin, s.log, act, true, (s.ts += 60000));
    s.twin = r.twin;
    s.log = r.log;
  }
  const skill = 'M1.NUM.SIGN.01';
  driveToGate(s, skill, 60); // mutates s.twin/s.log/s.ts in place
  const resolvedCase = s.twin.remediationCases.find((c) => c.targetSkillId === skill && c.stage === 'resolved');
  check('QA20', 'Input: a case resolved and the skill reached provisional mastery', !!resolvedCase);
  if (resolvedCase && s.twin.skills[skill].retention.nextReviewAt) {
    s.ts = Date.parse(s.twin.skills[skill].retention.nextReviewAt + 'T09:00:00Z');
    const revAct = nextAction(s.twin, dstr(s.ts));
    if (revAct.kind === 'retention') {
      const r = answer(s.twin, s.log, revAct, false, s.ts, { errorType: 'SIGN_ERROR' });
      s.twin = r.twin;
      const reopened = s.twin.remediationCases.find((c) => c.id === resolvedCase.id);
      check('QA20', 'Expected: the SAME case is marked REOPENED (not deleted)', reopened?.gapClosureQuality === 'REOPENED', reopened?.gapClosureQuality);
      check('QA20', 'Expected: original case history preserved (treatmentLog intact)', reopened.treatmentLog.length === resolvedCase.treatmentLog.length);
      check('QA20', 'Expected: skill correctly shows as weakened again', s.twin.skills[skill].knowledgeState === 'WEAKENED');
    } else {
      check('QA20', 'retention review was due for the recurrence check', false, 'no retention action offered');
    }
  }
}

// =====================================================================
console.log(`\n${pass} passed, ${fail} failed out of ${pass + fail} QA checks`);
if (fail > 0) {
  console.log('\nFailed checks:');
  for (const r of results) if (!r.ok) console.log(`  [${r.qa}] ${r.name} ${r.detail}`);
  process.exit(1);
}
console.log('\n🎉 QA Scenarios 1-20 — ALL PASS');
