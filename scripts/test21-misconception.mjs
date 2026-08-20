// Step 4 test: E3 Misconception FSM
// Phase 2 주의: 아래 본문은 'two-clean'(A) 정책의 기계 동작을 검증한다 — 2.2.0 기본 정책은
// 'rolling'이지만 A 기계는 config 전환형으로 유지되므로 회귀 대상이다. rolling 자체의
// 비율 검정 동작은 파일 하단의 Phase 2 블록 + misconception-experiment.mjs가 검증한다.
import {
  processTriggerAttempt,
  processConfirmationAttempt,
  resolveMisconception,
  capMasteryForActiveMisconceptions,
  activeMisconceptionIds,
  suspectedMisconceptionIds,
} from '../src/engine2/misconception21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

const DEFAULT_POLICY = CONFIG21.misconception.policy;
CONFIG21.misconception.policy = 'two-clean';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

// Phase 3 STEP 1: NEGSQ의 trigger 스킬이 주제 정위치 POW.01로 이관됨 (블러 제거)
const SKILL = 'M1.NUM.POW.01';
const TAG = 'SIGN_ERROR';
const MIS_ID = 'MIS.SIGN.NEGSQ';

// --- QA15: strong signal 1x -> SUSPECTED, confirmation queued, NOT immediately ACTIVE ---
{
  let instances = [];
  const r = processTriggerAttempt(instances, { skillId: SKILL, correct: false, errorType: TAG, attemptId: 'a1', ts: Date.now() });
  instances = r.instances;
  const inst = instances.find((i) => i.misconceptionId === MIS_ID);
  check('QA15: one strong distractor -> SUSPECTED (not yet active)', inst.status === 'SUSPECTED');
  check('QA15: confirmation is queued', r.confirmationNeeded.includes(MIS_ID));
  check('QA15: does not wait for 3 occurrences (old rule replaced)', r.newlySuspected.includes(MIS_ID));
}

// --- QA16: confirmation probes both clean -> suspicion cleared, no cap ---
{
  let instances = [];
  let r = processTriggerAttempt(instances, { skillId: SKILL, correct: false, errorType: TAG, attemptId: 'a1', ts: Date.now() });
  instances = r.instances;
  let c1 = processConfirmationAttempt(instances, { misconceptionId: MIS_ID, correct: true, errorType: null, attemptId: 'c1' });
  instances = c1.instances;
  check('QA16: first clean confirm -> now CONFIRMING (not yet cleared, need 2)', instances.find((i) => i.misconceptionId === MIS_ID).status === 'CONFIRMING');
  let c2 = processConfirmationAttempt(instances, { misconceptionId: MIS_ID, correct: true, errorType: null, attemptId: 'c2' });
  instances = c2.instances;
  const inst = instances.find((i) => i.misconceptionId === MIS_ID);
  check('QA16: two clean confirms -> cleared (status NONE, not deleted)', inst.status === 'NONE' && inst.evidenceScore === 0.3);
  check('QA16: no active misconception after clearing', activeMisconceptionIds(instances, SKILL).length === 0);
  check('QA16: mastery cap does not apply after clearing', capMasteryForActiveMisconceptions(0.95, instances, SKILL) === 0.95);
}

// --- QA4/AC8 companion: confirmation FAILS with same pattern -> ACTIVE, cap applies ---
{
  let instances = [];
  let r = processTriggerAttempt(instances, { skillId: SKILL, correct: false, errorType: TAG, attemptId: 'a1', ts: Date.now() });
  instances = r.instances;
  let c1 = processConfirmationAttempt(instances, { misconceptionId: MIS_ID, correct: false, errorType: TAG, attemptId: 'c1' });
  instances = c1.instances;
  check('one matching confirmation failure -> ACTIVE immediately (>=1 rule)', c1.becameActive && instances.find((i) => i.misconceptionId === MIS_ID).status === 'ACTIVE');
  check('active misconception is reported', activeMisconceptionIds(instances, SKILL).includes(MIS_ID));
  check('mastery cap (0.60) applies while ACTIVE', capMasteryForActiveMisconceptions(0.95, instances, SKILL) === 0.6);
  check('mastery below cap is left untouched', capMasteryForActiveMisconceptions(0.4, instances, SKILL) === 0.4);

  // remediation completes -> ACTIVE -> RESOLVED, cap lifts
  instances = resolveMisconception(instances, MIS_ID, Date.now());
  check('RESOLVED after remediation completes', instances.find((i) => i.misconceptionId === MIS_ID).status === 'RESOLVED');
  check('cap lifts once resolved', capMasteryForActiveMisconceptions(0.95, instances, SKILL) === 0.95);
}

// --- AC8: an isolated wrong answer with a DIFFERENT error tag never suspects ---
{
  let instances = [];
  const r = processTriggerAttempt(instances, { skillId: SKILL, correct: false, errorType: 'CALCULATION_ERROR', attemptId: 'x1', ts: Date.now() });
  check('unrelated error tag never creates a misconception instance', r.instances.length === 0);
}

// --- suspicion clears via passive decay if no confirmation ever gets scheduled/served ---
{
  let instances = [];
  let r = processTriggerAttempt(instances, { skillId: SKILL, correct: false, errorType: TAG, attemptId: 'a1', ts: Date.now() });
  instances = r.instances;
  check('after trigger, suspected list is non-empty', suspectedMisconceptionIds(instances, SKILL).includes(MIS_ID));
  // clean answers on the same skill decay the score without a confirmation attempt ever running
  r = processTriggerAttempt(instances, { skillId: SKILL, correct: true, errorType: null, attemptId: 'a2', ts: Date.now() });
  instances = r.instances;
  const mid = instances.find((i) => i.misconceptionId === MIS_ID);
  check('a clean answer decays evidenceScore', mid.evidenceScore < 1.0, `${mid.evidenceScore}`);
}

// =====================================================================
// Phase 2 — 'rolling' 비율 순차검정 정책 단위검증 (2.2.0 기본 정책)
// =====================================================================
{
  CONFIG21.misconception.policy = 'rolling';
  const offered = [{ id: MIS_ID, strength: 'HIGH' }];
  let instances = [];
  // 1) 태깅 오답 1회 → SUSPECTED (즉시 ACTIVE 금지 유지 — QA15 정신)
  let r = processTriggerAttempt(instances, { skillId: SKILL, correct: false, errorType: TAG, attemptId: 'r1', ts: Date.now(), misconceptionId: MIS_ID, diagnosticStrength: 'HIGH', offeredMisconceptions: offered });
  instances = r.instances;
  check('rolling: 태깅 매치 1회 → SUSPECTED (즉시 ACTIVE 아님)', instances[0].status === 'SUSPECTED' && r.newlyActive.length === 0);
  // 2) fastPath: 첫 5기회 중 가중 매치 4 → ACTIVE
  for (let i = 2; i <= 4; i++) {
    r = processTriggerAttempt(instances, { skillId: SKILL, correct: false, errorType: TAG, attemptId: `r${i}`, ts: Date.now(), misconceptionId: MIS_ID, diagnosticStrength: 'HIGH', offeredMisconceptions: offered });
    instances = r.instances;
  }
  check('rolling: 연속 4매치(fastPath) → ACTIVE', instances[0].status === 'ACTIVE' && r.newlyActive.includes(MIS_ID), instances[0].status);

  // 3) 무작위 오답자(매치율 1/3)는 기회가 쌓여도 ACTIVE 불가 + 비율 클리어
  let inst2 = [];
  const seq = [true, false, false, true, false, false, false, false, false]; // 매치 2/9 ≈ 0.22
  for (let i = 0; i < seq.length; i++) {
    const m = seq[i];
    const rr = processTriggerAttempt(inst2, { skillId: SKILL, correct: false, errorType: TAG, attemptId: `n${i}`, ts: Date.now(), misconceptionId: m ? MIS_ID : null, diagnosticStrength: m ? 'HIGH' : null, offeredMisconceptions: offered });
    inst2 = rr.instances;
    check(`rolling: 무작위 패턴 ${i + 1}번째 기회에서 ACTIVE 미발생`, inst2[0].status !== 'ACTIVE', inst2[0].status);
  }
  check('rolling: 기회 충분 + 낮은 매치율 → NONE 클리어 (카운터는 sticky 유지)', inst2[0].status === 'NONE' && inst2[0].ratioOpportunities === 9, `${inst2[0].status} opp=${inst2[0].ratioOpportunities}`);

  // 4) confirm 경로도 같은 비율 표본: 오답+매치가 쌓이면 ACTIVE
  let inst3 = [];
  let rr = processTriggerAttempt(inst3, { skillId: SKILL, correct: false, errorType: TAG, attemptId: 'c0', ts: Date.now(), misconceptionId: MIS_ID, diagnosticStrength: 'HIGH', offeredMisconceptions: offered });
  inst3 = rr.instances;
  for (let i = 1; i <= 3; i++) {
    const cr = processConfirmationAttempt(inst3, { misconceptionId: MIS_ID, correct: false, errorType: TAG, attemptId: `c${i}`, chosenMisconceptionId: MIS_ID, diagnosticStrength: 'HIGH', offeredMisconceptions: offered });
    inst3 = cr.instances;
  }
  check('rolling: confirm 오답 매치 누적으로 ACTIVE 도달', inst3[0].status === 'ACTIVE', inst3[0].status);
}
CONFIG21.misconception.policy = DEFAULT_POLICY;

console.log(`\n${pass} checks passed — Step 4 (Misconception FSM) OK`);
