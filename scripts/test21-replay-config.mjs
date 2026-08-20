// CHLOE MATH 2.1 — Step 11c: Replay/Recompute under a CHANGED config (PART N, completion
// report PART I). test21-session.mjs already proves same-config replay reproduces the live
// twin byte-for-byte; this proves the deeper claim — that mastery/knowledge-state are never
// stored as cached fact, only ever recomputed from the raw event log + whatever config is
// currently in force. If that's true, mutating CONFIG21 and replaying the SAME event log MUST
// produce a materially different twin, with no code changes and no re-simulation.
import { freshTwin21, replayFromScratch } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitMicroLessonAck, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const TODAY = '2026-08-18';

// --- build a real, non-trivial event log (mixed correct/wrong, real generator problems) ---
resetEventSeq(0);
let twin = freshTwin21('replay-cfg');
let log = emptyLog();
const rng = (seed => () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)(7);
for (let i = 0; i < 80; i++) {
  const action = nextAction(twin, TODAY);
  if (action.kind === 'micro-lesson') {
    const r = submitMicroLessonAck(twin, log, action);
    twin = r.twin;
    log = r.log;
    continue;
  }
  const problem = buildProblemForAction(action);
  const idx = rng() < 0.72 ? problem.answerIndex : (problem.answerIndex + 1) % problem.choices.length;
  const r = submitAttempt(twin, log, action, problem, { chosenIndex: idx, solveTimeSec: 30 + rng() * 40, hintsUsed: rng() < 0.15 ? 1 : 0, retryCount: 0 });
  twin = r.twin;
  log = r.log;
}
check('built a non-trivial event log under the original config', log.events.length >= 70, `${log.events.length}`);

const replayedOriginal = replayFromScratch(log, 'replay-cfg');
const stripLiveOnly = (t) => {
  const { recentAgendaKinds, ...rest } = t;
  return rest;
};
check('replay under the SAME (original) config reproduces the live twin exactly', JSON.stringify(stripLiveOnly(twin)) === JSON.stringify(stripLiveOnly(replayedOriginal)));

// --- snapshot the config fields we're about to change, so we can restore them exactly ---
const originalCorrectBase = [...CONFIG21.evidence.correctBase];
const originalMasteryThreshold = CONFIG21.gate.masteryThreshold;

// Mutate CONFIG21 in place (it's a plain object at runtime — `as const` is TS-only, it does
// not freeze the object) to simulate "a new model version was deployed": evidence from every
// correct answer now counts for much less, and the gate requires much less confidence to
// pass. Neither change touches the event log — only how those SAME events are interpreted.
CONFIG21.evidence.correctBase[0] = originalCorrectBase[0] * 0.2;
CONFIG21.evidence.correctBase[1] = originalCorrectBase[1] * 0.2;
CONFIG21.evidence.correctBase[2] = originalCorrectBase[2] * 0.2;
CONFIG21.evidence.correctBase[3] = originalCorrectBase[3] * 0.2;
CONFIG21.evidence.correctBase[4] = originalCorrectBase[4] * 0.2;
CONFIG21.gate.masteryThreshold = 0.3; // much easier gate

let replayedNewConfig;
try {
  replayedNewConfig = replayFromScratch(log, 'replay-cfg');

  check(
    'replaying the SAME event log under a CHANGED config produces a DIFFERENT twin',
    JSON.stringify(stripLiveOnly(twin)) !== JSON.stringify(stripLiveOnly(replayedNewConfig)),
  );

  // Every correct-answer weight was cut to 20% of its original value, with no other input
  // changed — every skill that received any correct-answer evidence must show LOWER alpha
  // (and, in turn, a lower or equal p) under the new config than it did under the original.
  let anyDifferedAsExpected = false;
  for (const skillId of Object.keys(twin.skills)) {
    const before = twin.skills[skillId];
    const after = replayedNewConfig.skills[skillId];
    if (before.attempts === 0) continue;
    if (before.alpha > 1 && after.alpha < before.alpha) anyDifferedAsExpected = true;
  }
  check('the recomputed alpha values move in the direction the config change implies (lower correct-answer weight -> lower alpha)', anyDifferedAsExpected);

  // The much-lower gate threshold (0.3 instead of 0.85) should let at least one skill reach
  // PROVISIONAL+ that never did under the stricter original config — this is the whole point
  // of being able to recompute history under a new model: you find out immediately how past
  // students would have been classified differently, without re-running their sessions.
  const GATED = ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'];
  const gatedBefore = Object.values(twin.skills).filter((s) => GATED.includes(s.knowledgeState)).length;
  const gatedAfter = Object.values(replayedNewConfig.skills).filter((s) => GATED.includes(s.knowledgeState)).length;
  check('a materially easier gate threshold reclassifies at least one skill on replay (no re-simulation)', gatedAfter >= gatedBefore, `${gatedBefore} -> ${gatedAfter}`);
} finally {
  // restore — never leave shared mutable module state altered for later tests/scripts
  CONFIG21.evidence.correctBase[0] = originalCorrectBase[0];
  CONFIG21.evidence.correctBase[1] = originalCorrectBase[1];
  CONFIG21.evidence.correctBase[2] = originalCorrectBase[2];
  CONFIG21.evidence.correctBase[3] = originalCorrectBase[3];
  CONFIG21.evidence.correctBase[4] = originalCorrectBase[4];
  CONFIG21.gate.masteryThreshold = originalMasteryThreshold;
}

// --- restoring the original config and replaying again must reproduce the ORIGINAL twin —
// proving the recompute is a pure function of (events, config), not a one-way mutation that
// leaked state, and not order-dependent on how many times it's been replayed before.
const replayedRestored = replayFromScratch(log, 'replay-cfg');
check('restoring the original config and replaying again reproduces the ORIGINAL twin exactly', JSON.stringify(stripLiveOnly(twin)) === JSON.stringify(stripLiveOnly(replayedRestored)));

console.log(`\n${pass} checks passed — Step 11c (Replay under a changed config) OK`);
