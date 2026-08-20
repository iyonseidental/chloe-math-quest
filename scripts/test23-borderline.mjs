// Phase 3 STEP 3 — 경계선 전제 + 직교 확인 프로브 검증 (PART 6-9).
// 실 세션 파이프라인(nextAction/submitAttempt)으로 구동한다.
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitDiagnosticPlacement, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog } from '../src/engine2/events21.ts';
import { classifyProbeOutcome, isHighRiskCandidate } from '../src/engine2/rootcause21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const BASE = Date.parse('2026-08-18T09:00:00Z');
const dstr = (ts) => new Date(ts).toISOString().slice(0, 10);

// --- 1) 4상태 분류 단위 검증 (PART 6) ---
{
  const mk = (cls, stab, attr = 0.5) => ({ skillId: 'X', stability: { classification: cls, stability: stab }, misconceptionEvidence: 0, recentErrorRecurrence: 0, attributionProbability: attr });
  check('CLEAR_FAIL: wrong probe is always a clear fail', classifyProbeOutcome(mk('STABLE', 0.9), false, false) === 'CLEAR_FAIL');
  check('CLEAR_PASS: low-risk candidate passing is cleanly exonerated', classifyProbeOutcome(mk('STABLE', 0.9, 0.1), true, false) === 'CLEAR_PASS');
  check('BORDERLINE: low-stability candidate passing is NOT exonerated', classifyProbeOutcome(mk('SHAKY', 0.3), true, false) === 'BORDERLINE');
  check('BORDERLINE: UNKNOWN candidate with attribution passing is not exonerated', classifyProbeOutcome(mk('UNKNOWN', undefined, 0.6), true, false) === 'BORDERLINE');
  check('UNKNOWN: UNKNOWN candidate with zero attribution stays UNKNOWN', classifyProbeOutcome(mk('UNKNOWN', undefined, 0), true, false) === 'UNKNOWN');
  check('orthogonal confirmation upgrades to CLEAR_PASS', classifyProbeOutcome(mk('SHAKY', 0.3), true, true) === 'CLEAR_PASS');
  check('high-risk detector fires on low stability', isHighRiskCandidate(mk('SHAKY', 0.3)));
  check('high-risk detector quiet on strong stable candidate', !isHighRiskCandidate(mk('STABLE', 0.92, 0.1)));
}

// --- 헬퍼: 실 파이프라인 구동 ---
function answer(state, action, wantCorrect, opts = {}) {
  let problem = buildProblemForAction(action);
  let idx;
  if (wantCorrect) idx = problem.answerIndex;
  else if (opts.errorType) {
    let found = -1;
    for (let tries = 0; tries < 15 && found < 0; tries++) {
      if (tries > 0) problem = buildProblemForAction(action);
      found = problem.choices.findIndex((c, i) => i !== problem.answerIndex && c.errorType === opts.errorType);
    }
    if (found < 0) throw new Error(`no ${opts.errorType} distractor for ${action.skillId}`);
    idx = found;
  } else idx = (problem.answerIndex + 1) % problem.choices.length;
  const r = submitAttempt(state.twin, state.log, action, problem, { chosenIndex: idx, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
  state.twin = r.twin;
  state.log = r.log;
  return r;
}
function force(kind, skillId, difficulty, variant = 'standard', extra = {}) {
  return { kind, skillId, difficulty, variant, reason: 'forced (test)', ...extra };
}
function seed(state, skillId, correctRate, n, placement = 3) {
  const r0 = submitDiagnosticPlacement(state.twin, state.log, skillId, placement, 4, 1, (state.ts += 1000));
  state.twin = r0.twin;
  state.log = r0.log;
  for (let i = 0; i < n; i++) answer(state, force('normal', skillId, 3), i / n < correctRate);
}

// 시나리오 공통 준비: EQ.01(전제: EXP.01, SIGN.01)에서 조사를 연다.
// EXP.01은 "경계선" 프로필(혼합 성적 → stability 낮음), SIGN.01은 강함.
function openInvestigation(seedName) {
  const state = { twin: freshTwin21(seedName), log: emptyLog(), ts: BASE };
  seed(state, 'M1.NUM.SIGN.01', 1.0, 10); // 강한 전제
  seed(state, 'M1.ALG.EXP.01', 0.5, 10); // 경계선 전제 (5/10)
  seed(state, 'M1.ALG.EQ.01', 1.0, 4);
  // EQ.01에서 CONCEPT_GAP 연속 오답 → 조사 개시
  for (let i = 0; i < 2; i++) answer(state, force('normal', 'M1.ALG.EQ.01', 3), false, { errorType: 'CONCEPT_GAP' });
  return state;
}

// 프로브 에이전다가 나올 때까지 nextAction을 따라간다 (진단 부담 가드가 사이에 일반 문항을 끼울 수 있음)
function driveToProbe(state, targetSkillId, maxSteps = 12) {
  for (let g = 0; g < maxSteps; g++) {
    const act = nextAction(state.twin, dstr(state.ts));
    if (act.kind === 'probe' && act.skillId === targetSkillId) return act;
    if (act.kind === 'micro-lesson') return null; // 조사가 이미 끝남
    // 타 후보 프로브(강한 전제 등)는 정직하게 정답으로 응답해 면죄시키고 계속 간다
    answer(state, act.kind === 'confirm' ? act : act.kind === 'probe' || act.kind === 'normal' || act.kind.startsWith('remediation') ? act : force('normal', 'M1.FUN.COORD.01', 2), true);
  }
  return null;
}

// --- 2) 경계선 첫 통과 → 직교 확인 프로브 (transfer 표현) ---
{
  const state = openInvestigation('bl-1');
  const kase0 = state.twin.remediationCases.find((c) => c.targetSkillId === 'M1.ALG.EQ.01');
  check('investigation opened on EQ.01', !!kase0 && kase0.stage === 'investigating');
  const probe = driveToProbe(state, 'M1.ALG.EXP.01');
  check('borderline prerequisite EXP.01 is probed', !!probe, JSON.stringify(state.twin.agenda.map((a) => a.kind + ':' + a.skillId)));
  answer(state, probe, true); // 첫 프로브 요행 통과
  const kase1 = state.twin.remediationCases.find((c) => c.targetSkillId === 'M1.ALG.EQ.01');
  check('first pass does NOT exonerate — pendingOrthogonal set', kase1.pendingOrthogonal === 'M1.ALG.EXP.01', JSON.stringify({ po: kase1.pendingOrthogonal, stage: kase1.stage }));
  const ortho = state.twin.agenda.find((a) => a.kind === 'probe' && a.skillId === 'M1.ALG.EXP.01');
  check('orthogonal probe queued with transfer representation', ortho?.variant === 'transfer', JSON.stringify(ortho));
  const orthoAct = driveToProbe(state, 'M1.ALG.EXP.01');
  check('orthogonal probe is served', orthoAct?.variant === 'transfer');

  // --- 2a) 직교 프로브 실패 → 요행이 벗겨지고 EXP.01이 원인으로 확정 ---
  answer(state, orthoAct, false, { errorType: 'CONCEPT_GAP' });
  const kase2 = state.twin.remediationCases.find((c) => c.targetSkillId === 'M1.ALG.EQ.01');
  check('orthogonal FAIL unmasks the lucky pass — EXP.01 confirmed in the chain', kase2.pendingOrthogonal === null && (kase2.rootCauseSkillId === 'M1.ALG.EXP.01' || kase2.frontierParentSkillId === 'M1.ALG.EXP.01'), JSON.stringify({ root: kase2.rootCauseSkillId, fp: kase2.frontierParentSkillId, stage: kase2.stage }));
}

// --- 3) 직교 프로브 통과 → CLEAR_PASS로 면죄, 재확인 반복 없음 (PART 9) ---
{
  const state = openInvestigation('bl-2');
  const probe = driveToProbe(state, 'M1.ALG.EXP.01');
  check('probe served (scenario 2)', !!probe);
  answer(state, probe, true);
  const orthoAct = driveToProbe(state, 'M1.ALG.EXP.01');
  check('orthogonal probe served (scenario 2)', orthoAct?.variant === 'transfer');
  answer(state, orthoAct, true); // 다른 표현에서도 통과
  const kase = state.twin.remediationCases.find((c) => c.targetSkillId === 'M1.ALG.EQ.01');
  check('both representations passed — candidate exonerated (no third probe on EXP.01)', kase.pendingOrthogonal === null && !state.twin.agenda.some((a) => a.kind === 'probe' && a.skillId === 'M1.ALG.EXP.01'), JSON.stringify({ stage: kase.stage }));
  check('orthogonal budget consumed exactly once for EXP.01 (maxBorderlineConfirm=1)', kase.orthogonalTaken.filter((s) => s === 'M1.ALG.EXP.01').length === 1);
  // 케이스는 정상적으로 계속 진행 (다른 후보 프로브 또는 원인 확정)
  check('investigation continues normally after exoneration', kase.stage === 'investigating' || kase.stage === 'micro-lesson' || kase.rootCauseSkillId !== null);
}

// --- 4) 프로브 예산 상한 유지 (PART 9: maxProbePerCase 불변) ---
{
  const state = openInvestigation('bl-3');
  let guard = 0;
  while (guard++ < 40) {
    const act = nextAction(state.twin, dstr(state.ts));
    if (act.kind === 'probe') answer(state, act, Math.random() < 0.5);
    else if (act.kind === 'micro-lesson') break;
    else answer(state, act, true);
  }
  const kase = state.twin.remediationCases.find((c) => c.targetSkillId === 'M1.ALG.EQ.01');
  check(`total probes never exceed maxProbePerCase (${kase.probesTaken.length} ≤ ${CONFIG21.rootCause.maxProbePerCase})`, kase.probesTaken.length <= CONFIG21.rootCause.maxProbePerCase);
}

console.log(`\n${pass} checks passed — Phase 3 Step 3 (Borderline orthogonal probe) OK`);
