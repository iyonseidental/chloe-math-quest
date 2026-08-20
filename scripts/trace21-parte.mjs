// PHASE 1 COMPLETION REPORT — PART E trace generator.
// Runs the QA2-family scenario end-to-end through the REAL session pipeline and prints the
// full audit trail of every adaptive decision: target failure → evidence attribution →
// probe selection (with priority context) → root cause → minimum-dose remediation stages →
// transfer verification → retention scheduling → (fast-forwarded) retention review.
// Output is embedded verbatim in docs/PHASE1-COMPLETION-REPORT.md PART E.
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitMicroLessonAck, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog } from '../src/engine2/events21.ts';
import { readMastery } from '../src/engine2/mastery21.ts';

const BASE = Date.parse('2026-08-18T09:00:00Z');
const dstr = (ts) => new Date(ts).toISOString().slice(0, 10);
const s = { twin: freshTwin21('parte'), log: emptyLog(), ts: BASE };

function forceAction(kind, skillId, difficulty) {
  return { kind, skillId, difficulty, variant: 'standard', reason: 'trace' };
}
function answer(action, wantCorrect, errorType) {
  let problem = buildProblemForAction(action);
  let idx;
  if (wantCorrect) idx = problem.answerIndex;
  else {
    let found = -1;
    for (let t = 0; t < 12 && found < 0; t++) {
      if (t > 0) problem = buildProblemForAction(action);
      found = problem.choices.findIndex((c, i) => i !== problem.answerIndex && c.errorType === errorType);
    }
    if (found < 0) throw new Error(`no ${errorType} distractor for ${action.skillId}`);
    idx = found;
  }
  const r = submitAttempt(s.twin, s.log, action, problem, { chosenIndex: idx, solveTimeSec: problem.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (s.ts += 60000));
  s.twin = r.twin;
  s.log = r.log;
  return { correct: idx === problem.answerIndex, errorType: idx === problem.answerIndex ? null : problem.choices[idx].errorType };
}
function seed(skillId, correct, n, errorType) {
  for (let i = 0; i < n; i++) {
    if (i > 0 && i % 3 === 0) answer(forceAction('diagnostic', 'M1.FUN.COORD.02', 3), true);
    answer(forceAction('diagnostic', skillId, correct ? 3 : 1), correct, errorType);
  }
}
function skillLine(id) {
  const sk = s.twin.skills[id];
  const m = readMastery(sk.alpha, sk.beta, sk.lastPracticedAt, dstr(s.ts));
  return `${id}: p=${m.p.toFixed(3)} uncertainty=${m.uncertainty.toFixed(3)} E=${m.effectiveEvidence.toFixed(1)} confidence=${m.confidence} state=${sk.knowledgeState}`;
}
function caseLine() {
  const c = s.twin.remediationCases.find((k) => k.targetSkillId === 'M1.ALG.EQ.03');
  if (!c) return '(no case)';
  return `stage=${c.stage} depth=${c.depth} frontier=${c.frontierParentSkillId} queue=[${c.probeQueue.join(', ')}] probesTaken=${JSON.stringify(c.probesTaken.map((p) => `${p.skillId}:${p.correct ? 'PASS' : 'FAIL'}`))} rootCause=${c.rootCauseSkillId ?? 'null'} gapQuality=${c.gapClosureQuality}`;
}

console.log('=== [0] SEEDING: strong evidence on EQ.01/EXP.01/EXP.02/SIGN.01 (30 diag each), 6 CONCEPT_GAP wrongs on FRAC.01 (hidden weakness), EQ.02 left UNSEEN ===');
seed('M1.ALG.EQ.01', true, 30);
seed('M1.ALG.EXP.01', true, 30);
seed('M1.ALG.EXP.02', true, 30);
seed('M1.NUM.SIGN.01', true, 30);
seed('M1.NUM.FRAC.01', false, 6, 'CONCEPT_GAP');
for (const id of ['M1.ALG.EQ.01', 'M1.ALG.EXP.01', 'M1.NUM.SIGN.01', 'M1.NUM.FRAC.01', 'M1.ALG.EQ.02']) console.log('  ' + skillLine(id));

console.log('\n=== [1] TARGET FAILURE: 2 consecutive CONCEPT_GAP wrongs on M1.ALG.EQ.03 (word problems, difficulty 5) ===');
answer(forceAction('normal', 'M1.ALG.EQ.03', 5), false, 'CONCEPT_GAP');
answer(forceAction('normal', 'M1.ALG.EQ.03', 5), false, 'CONCEPT_GAP');
console.log('  ' + skillLine('M1.ALG.EQ.03'));
console.log('  investigation opened → ' + caseLine());
console.log('  (EQ.03 secondary EXP.01 is confident/strong → attribution assigns it 0 penalty; primary takes the diagnostic hit;');
console.log('   needsInvestigation fires on CONCEPT_GAP + consecutiveWrong≥2 → probe queue built from EQ.03 prerequisites,');
console.log('   STABLE ones (EQ.01, EXP.01) skipped without a single wasted question — only UNKNOWN EQ.02 queued, Unknown-first)');

console.log('\n=== [2] PROBE / MULTI-LEVEL DESCENT ===');
let guard = 0;
while (guard++ < 12) {
  const act = nextAction(s.twin, dstr(s.ts));
  if (act.kind !== 'probe' && act.kind !== 'confirm') break;
  const wantWrong = act.kind === 'probe' && (act.skillId === 'M1.NUM.FRAC.01' || act.skillId === 'M1.ALG.EQ.02');
  const wrongTag = act.skillId === 'M1.NUM.FRAC.01' ? 'CONCEPT_GAP' : 'SIGN_ERROR';
  console.log(`  engine serves: ${act.kind} on ${act.skillId} (reason: ${act.reason})`);
  const out = answer(act, !wantWrong, wantWrong ? wrongTag : undefined);
  console.log(`    student ${out.correct ? 'PASSES' : 'FAILS'}${out.errorType ? ' (' + out.errorType + ')' : ''} → ` + caseLine());
}

console.log('\n=== [3] ROOT CAUSE CONFIRMED + MINIMUM-DOSE REMEDIATION (micro-lesson → foundation×2 on ROOT skill → bridge → similarA/B → transfer) ===');
guard = 0;
while (guard++ < 25) {
  const act = nextAction(s.twin, dstr(s.ts));
  if (act.kind === 'micro-lesson') {
    console.log(`  engine serves: micro-lesson on ${act.skillId} (reason: ${act.reason}) → acknowledged`);
    const r = submitMicroLessonAck(s.twin, s.log, act, (s.ts += 60000));
    s.twin = r.twin;
    s.log = r.log;
    continue;
  }
  if (!act.caseId) break;
  console.log(`  engine serves: ${act.kind} on ${act.skillId} @d${act.difficulty}${act.variant === 'transfer' ? ' [TRANSFER VARIANT]' : ''} (reason: ${act.reason})`);
  answer(act, true);
  const c = s.twin.remediationCases.find((k) => k.targetSkillId === 'M1.ALG.EQ.03');
  console.log(`    student PASSES → stage=${c.stage} gapQuality=${c.gapClosureQuality}`);
  if (c.stage === 'resolved') break;
}
const kase = s.twin.remediationCases.find((k) => k.targetSkillId === 'M1.ALG.EQ.03');
console.log(`  case outcome: ${JSON.stringify(kase.outcome)}`);
console.log('  ' + skillLine('M1.NUM.FRAC.01'));

console.log('\n=== [4] RETURN TO TARGET + GATE + RETENTION SCHEDULING (independent practice until PROVISIONAL) ===');
guard = 0;
while (guard++ < 160 && !['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(s.twin.skills['M1.NUM.FRAC.01'].knowledgeState)) {
  const suggested = nextAction(s.twin, dstr(s.ts));
  const act = suggested.skillId === 'M1.NUM.FRAC.01' ? suggested : forceAction('normal', 'M1.NUM.FRAC.01', s.twin.skills['M1.NUM.FRAC.01'].currentDifficulty);
  if (act.kind === 'micro-lesson') {
    const r = submitMicroLessonAck(s.twin, s.log, act, (s.ts += 60000));
    s.twin = r.twin;
    s.log = r.log;
    continue;
  }
  if (act.variant === 'transfer') console.log(`  engine serves TRANSFER problem @d${act.difficulty} (reason: ${act.reason})`);
  answer(act, true);
}
const frac = s.twin.skills['M1.NUM.FRAC.01'];
console.log('  ' + skillLine('M1.NUM.FRAC.01'));
console.log(`  retention scheduled: stage=${frac.retention.stage} nextReviewAt=${frac.retention.nextReviewAt} (interval ladder 1→3→7→14→30 days)`);

console.log('\n=== [5] DELAYED RETENTION REVIEW (fast-forward to the scheduled date) ===');
s.ts = Date.parse(frac.retention.nextReviewAt + 'T09:00:00Z');
const revAct = nextAction(s.twin, dstr(s.ts));
console.log(`  on ${dstr(s.ts)}, engine serves: ${revAct.kind} on ${revAct.skillId} (reason: ${revAct.reason})`);
answer(revAct, true);
const frac2 = s.twin.skills['M1.NUM.FRAC.01'];
const kase2 = s.twin.remediationCases.find((k) => k.targetSkillId === 'M1.ALG.EQ.03');
console.log(`  review PASSED → state=${frac2.knowledgeState}, next review=${frac2.retention.nextReviewAt}, gapQuality=${kase2.gapClosureQuality}`);
console.log('\n=== TRACE COMPLETE ===');
