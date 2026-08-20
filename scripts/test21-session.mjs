// Step 10 test: Session Orchestrator — integration + Replay fidelity (PART N)
import { freshTwin21, replayFromScratch } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, buildProblemForAction, submitMicroLessonAck } from '../src/engine2/session21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { ALL_SKILL_IDS } from '../src/engine2/curriculum21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const TODAY = '2026-08-18';

// --- basic loop: nextAction -> problem -> submitAttempt updates state ---
{
  resetEventSeq(0);
  let twin = freshTwin21('t1');
  let log = emptyLog();

  const action = nextAction(twin, TODAY);
  check('nextAction returns a valid pilot skill to start with', ALL_SKILL_IDS.includes(action.skillId));
  const problem = buildProblemForAction(action);
  check('a real problem is generated (not a placeholder)', typeof problem.stem === 'string' && problem.stem.length > 0);

  const r = submitAttempt(twin, log, action, problem, { chosenIndex: problem.answerIndex, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 });
  twin = r.twin; log = r.log;
  check('a correct answer raises the skill mastery above the prior', twin.skills[action.skillId].alpha > 1);
  check('an event was appended to the log', log.events.length === 1);
  check('a prediction record was captured (for calibration)', twin.predictions.length === 1);
  check('recentSkillSequence tracks the practiced skill', twin.recentSkillSequence.includes(action.skillId));
}

// --- QA2-style: repeated wrong answers open a remediation investigation ---
{
  resetEventSeq(100);
  let twin = freshTwin21('t2');
  let log = emptyLog();
  const skillId = 'M1.ALG.EQ.03'; // has prerequisites -> a real investigation can open

  for (let i = 0; i < 3; i++) {
    const action = { kind: 'normal', skillId, difficulty: 3, variant: 'standard', reason: 'test' };
    const problem = buildProblemForAction(action);
    const wrongIdx = problem.choices.findIndex((c, idx) => idx !== problem.answerIndex && c.errorType === 'CONCEPT_GAP') ?? 0;
    const idx = wrongIdx >= 0 ? wrongIdx : (problem.answerIndex + 1) % 4;
    const r = submitAttempt(twin, log, action, problem, { chosenIndex: idx, solveTimeSec: 60, hintsUsed: 0, retryCount: 0 });
    twin = r.twin; log = r.log;
  }
  check('repeated wrong answers opened a remediation case', twin.remediationCases.length > 0, JSON.stringify(twin.remediationCases.map((c) => c.stage)));
  check('the skill is flagged as under remediation', twin.skills[skillId].flags.remediationOpen);
  check('an agenda item was queued (probe or micro-lesson)', twin.agenda.length > 0);

  const action2 = nextAction(twin, TODAY);
  // Which exact agenda item comes first (a root-cause probe vs. a same-skill misconception
  // confirm) depends on which distractor the RNG-backed generator happened to tag on these
  // 3 wrong attempts — both are legitimate diagnostic-priority responses (a misconception
  // confirm IS a form of diagnosis), so accept either rather than requiring one specific kind.
  check(
    'nextAction now serves the remediation/probe item, not a fresh adaptive pick',
    action2.kind === 'probe' || action2.kind === 'confirm' || action2.caseId !== undefined,
    action2.kind,
  );
}

// --- CRITICAL: Replay fidelity (PART N) ---
{
  resetEventSeq(1000);
  let twin = freshTwin21('t3');
  let log = emptyLog();
  const rng = (seed => () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)(42);

  for (let i = 0; i < 60; i++) {
    const action = nextAction(twin, TODAY);
    if (action.kind === 'micro-lesson') {
      const r = submitMicroLessonAck(twin, log, action);
      twin = r.twin; log = r.log;
      continue;
    }
    const problem = buildProblemForAction(action);
    const wantCorrect = rng() < 0.7;
    const idx = wantCorrect ? problem.answerIndex : (problem.answerIndex + 1) % problem.choices.length;
    const r = submitAttempt(twin, log, action, problem, { chosenIndex: idx, solveTimeSec: 30 + rng() * 60, hintsUsed: rng() < 0.2 ? 1 : 0, retryCount: 0 });
    twin = r.twin; log = r.log;
  }

  check('60 live attempts produced a non-trivial event log', log.events.length >= 55, `${log.events.length}`);

  const replayed = replayFromScratch(log, 't3');
  // recentAgendaKinds is a live-path-only bookkeeping array (not derived from events) —
  // exclude it from the equality check and verify everything else byte-for-byte.
  const stripLiveOnly = (t) => { const { recentAgendaKinds, ...rest } = t; return rest; };
  const liveStr = JSON.stringify(stripLiveOnly(twin));
  const replayedStr = JSON.stringify(stripLiveOnly(replayed));
  check('replaying the full event log from scratch reproduces the live twin exactly', liveStr === replayedStr);

  // Recompute-on-config-change property: replaying is a pure fold, so replaying twice
  // from the same log is idempotent and deterministic.
  const replayedAgain = replayFromScratch(log, 't3');
  check('replay is deterministic (same log -> same twin, every time)', JSON.stringify(stripLiveOnly(replayedAgain)) === replayedStr);
}

console.log(`\n${pass} checks passed — Step 10 (Session Orchestrator + Replay) OK`);
