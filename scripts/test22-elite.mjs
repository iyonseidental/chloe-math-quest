// PHASE 2 STEP 19 — ELITE QA 1~10 (PART 41). Input / Expected / FAIL 조건을 실행 가능한
// assert로 구현. GATE C의 행동 보증:
//   지식 실패 ≠ 추론 실패 / Core ≠ Elite / 비정형 전이 별도 평가 / 복수 풀이 증거 /
//   일반화 평가 / 느린 심사숙고 무불이익 / Elite ≠ difficulty 5.
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { submitAttempt, submitEliteAttempt, submitDiagnosticPlacement, buildProblemForAction, nextAction } from '../src/engine2/session21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { replayFromScratch } from '../src/engine2/replay21.ts';
import { eliteDimensionLevel, eliteShareTarget, domainReadiness, challengeValue, ELITE_DIMENSIONS } from '../src/engine2/elite22.ts';
import { ELITE_BANK, ELITE_BANK_MAP, validateEliteBank } from '../src/engine2/eliteBank22.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP } from '../src/engine2/curriculum21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';
import { BASE_TS, dstr } from './lib/simpop.mjs';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

// ---- PART 38: 은행 구조 검증부터 ----
{
  const v = validateEliteBank();
  check(`Elite Bank 구조 검증 (${ELITE_BANK.length}문항, PART 38)`, v.ok, v.issues.join('; '));
  const modes = new Set(ELITE_BANK.map((p) => p.mode));
  check(`문제 모드 다양성: ${[...modes].join(', ')} (≥ 7종)`, modes.size >= 7);
  check('Elite ≠ Difficulty5: 난이도 3짜리 elite 문항 존재 (모드는 난이도와 직교)', ELITE_BANK.some((p) => p.difficulty === 3));
}

// 시딩 헬퍼: 스킬을 강하게 (placement + 실전 정답으로 게이트 근접)
function seedStrong(state, skillId, n = 12) {
  const r0 = submitDiagnosticPlacement(state.twin, state.log, skillId, 3, 8, 2, (state.ts += 1000));
  state.twin = r0.twin;
  state.log = r0.log;
  for (let i = 0; i < n; i++) {
    if (i % 3 === 2) {
      const f = { kind: 'normal', skillId: 'M1.GEO.ANG.01', difficulty: 2, variant: 'standard', reason: 'f' };
      const fp = buildProblemForAction(f);
      const fr = submitAttempt(state.twin, state.log, f, fp, { chosenIndex: fp.answerIndex, solveTimeSec: 30, hintsUsed: 0, retryCount: 0 }, (state.ts += 30000));
      state.twin = fr.twin;
      state.log = fr.log;
    }
    const a = { kind: 'normal', skillId, difficulty: 3, variant: 'standard', reason: 's' };
    const p = buildProblemForAction(a);
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: p.answerIndex, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
}
function eliteAct(prob, kind = 'elite', fuId) {
  return { kind, skillId: prob.requiredSkills[0], difficulty: prob.difficulty, variant: 'standard', eliteProblemId: prob.id, eliteFollowUpId: fuId, reason: 't' };
}

// =====================================================================
// EQA1 — 전제는 전부 강하지만 비정형 문제 실패 → 전제 치료 금지, 추론 진단
// =====================================================================
{
  resetEventSeq(0);
  const state = { twin: freshTwin21('eqa1'), log: emptyLog(), ts: BASE_TS };
  const prob = ELITE_BANK_MAP['E.NR.002']; // requires EQ.01, EXP.01
  for (const s of prob.requiredSkills) seedStrong(state, s);
  const casesBefore = state.twin.remediationCases.length;
  const r = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: (prob.answerIndex + 1) % 4, solveTimeSec: 150, hintsUsed: [], strategySwitches: 0 }, (state.ts += 60000));
  state.twin = r.twin;
  check('EQA1: 비정형 실패에도 전제 치료 케이스 미개설 (하위 복습 금지)', state.twin.remediationCases.length === casesBefore);
  const rc = Object.keys(state.twin.eliteRootCauseCounts);
  check('EQA1: 추론 진단 발생 (REASONING 계열 root cause 기록)', rc.length === 1 && rc[0] !== 'KNOWLEDGE_GAP', rc.join(','));
  check('EQA1: 추론 스캐폴드 후속이 큐잉됨', state.twin.agenda.some((a) => a.kind === 'elite-followup'));
}

// =====================================================================
// EQA2 — 필요 개념 하나가 실제로 약함 → 기존 Knowledge Gap 경로 (추론 치료 금지)
// =====================================================================
{
  resetEventSeq(100);
  const state = { twin: freshTwin21('eqa2'), log: emptyLog(), ts: BASE_TS };
  const prob = ELITE_BANK_MAP['E.MS.001']; // requires PROP.01, AREA.01, EQ.AX.01
  seedStrong(state, 'M1.FUN.PROP.01');
  seedStrong(state, 'M1.FUN.AREA.01');
  // EQ.AX.01은 약하게: placement만 낮게
  const r0 = submitDiagnosticPlacement(state.twin, state.log, 'M1.ALG.EQ.AX.01', 1, 0.5, 3, (state.ts += 1000));
  state.twin = r0.twin;
  state.log = r0.log;
  for (let i = 0; i < 3; i++) {
    const a = { kind: 'normal', skillId: 'M1.ALG.EQ.AX.01', difficulty: 2, variant: 'standard', reason: 'w' };
    const p = buildProblemForAction(a);
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: p.answerIndex, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  // p를 낮게 유지하려고 오답 2개 추가 (careless 아님)
  for (let i = 0; i < 4; i++) {
    const a = { kind: 'normal', skillId: 'M1.ALG.EQ.AX.01', difficulty: 3, variant: 'standard', reason: 'w' };
    let p = buildProblemForAction(a);
    let idx = p.choices.findIndex((c, i2) => i2 !== p.answerIndex && c.errorType === 'SIGN_ERROR');
    if (idx < 0) idx = (p.answerIndex + 1) % 4;
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: idx, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  const rr = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: (prob.answerIndex + 1) % 4, solveTimeSec: 150, hintsUsed: ['A'], strategySwitches: 0 }, (state.ts += 60000));
  state.twin = rr.twin;
  check('EQA2: KNOWLEDGE_GAP으로 분류됨', (state.twin.eliteRootCauseCounts['KNOWLEDGE_GAP'] ?? 0) >= 1, JSON.stringify(state.twin.eliteRootCauseCounts));
  check('EQA2: 약한 스킬에 기존 결손 파이프라인 케이스 개설', state.twin.remediationCases.some((c) => c.targetSkillId === 'M1.ALG.EQ.AX.01'), JSON.stringify(state.twin.remediationCases.map((c) => c.targetSkillId)));
  check('EQA2: 추론 스캐폴드는 큐잉되지 않음 (Elite reasoning 치료 금지)', !state.twin.agenda.some((a) => a.kind === 'elite-followup'));
}

// =====================================================================
// EQA3 — 표준형은 성공하지만 새 표현(표상 전환)에서 실패 → REPRESENTATION_GAP
// =====================================================================
{
  resetEventSeq(200);
  const state = { twin: freshTwin21('eqa3'), log: emptyLog(), ts: BASE_TS };
  const prob = ELITE_BANK_MAP['E.AP.001']; // 비례 판단 — 표상 전환이 관문
  for (const s of prob.requiredSkills) seedStrong(state, s);
  // 표현(REPRESENT) 힌트 B까지 쓰고도 실패 → REPRESENTATION_GAP
  const r = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: 1, solveTimeSec: 200, hintsUsed: ['A', 'B'], strategySwitches: 0 }, (state.ts += 60000));
  state.twin = r.twin;
  check('EQA3: REPRESENTATION_GAP으로 진단', (state.twin.eliteRootCauseCounts['REPRESENTATION_GAP'] ?? 0) >= 1, JSON.stringify(state.twin.eliteRootCauseCounts));
}

// =====================================================================
// EQA4 — 첫 전략 실패 후 다른 전략으로 성공 → flexibility ↑, mastery 무손실
// =====================================================================
{
  resetEventSeq(300);
  const state = { twin: freshTwin21('eqa4'), log: emptyLog(), ts: BASE_TS };
  const prob = ELITE_BANK_MAP['E.NR.003'];
  for (const s of prob.requiredSkills) seedStrong(state, s);
  const masteryBefore = prob.requiredSkills.map((s) => state.twin.skills[s].alpha / (state.twin.skills[s].alpha + state.twin.skills[s].beta));
  const flexBefore = eliteDimensionLevel(state.twin.elite.flexibility);
  const r = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: prob.answerIndex, solveTimeSec: 240, hintsUsed: [], strategySwitches: 1, firstStrategy: '사분면 그림', finalStrategy: '역방향 추적' }, (state.ts += 60000));
  state.twin = r.twin;
  const flexAfter = eliteDimensionLevel(state.twin.elite.flexibility);
  check('EQA4: flexibility 증거 증가', flexAfter.evidence > flexBefore.evidence && flexAfter.level >= flexBefore.level, `${flexBefore.level.toFixed(2)}→${flexAfter.level.toFixed(2)}`);
  const masteryAfter = prob.requiredSkills.map((s) => state.twin.skills[s].alpha / (state.twin.skills[s].alpha + state.twin.skills[s].beta));
  check('EQA4: mastery 무변동 (elite는 별도 장부 — PART 15)', masteryBefore.every((p, i) => Math.abs(p - masteryAfter[i]) < 1e-9));
  check('EQA4: StrategyTrace에 전환 기록', state.twin.strategyTraces.some((t) => t.problemId === prob.id && t.strategySwitches === 1 && t.solved));
}

// =====================================================================
// EQA5 — 답은 맞았지만 설명(정당화) 후속에서 실패 → core 유지, justification만 보완
// =====================================================================
{
  resetEventSeq(400);
  const state = { twin: freshTwin21('eqa5'), log: emptyLog(), ts: BASE_TS };
  const prob = ELITE_BANK_MAP['E.NR.001'];
  for (const s of prob.requiredSkills) seedStrong(state, s);
  // 본문 정답
  let r = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: prob.answerIndex, solveTimeSec: 180, hintsUsed: [], strategySwitches: 0 }, (state.ts += 60000));
  state.twin = r.twin;
  state.log = r.log;
  // Phase 3 OPD 2.0: 후속은 DeepValue 최고 "하나"만 서빙된다 (PART 39) — 체인 없음.
  const act1 = nextAction(state.twin, dstr(state.ts));
  check('EQA5: 본문 정답 후 One Problem Deep 후속 서빙', act1.kind === 'elite-followup', act1.kind);
  const fu1 = ELITE_BANK_MAP[prob.id].followUps.find((f) => f.id === act1.eliteFollowUpId);
  r = submitEliteAttempt(state.twin, state.log, eliteAct(prob, 'elite-followup', fu1.id), { chosenIndex: fu1.answerIndex, solveTimeSec: 60, hintsUsed: [], strategySwitches: 0 }, (state.ts += 60000));
  state.twin = r.twin;
  state.log = r.log;
  const actAfter = nextAction(state.twin, dstr(state.ts));
  check('EQA5(2.0): 후속 하나로 깊이 탐구 종료 — 추가 체인 없음', actAfter.kind !== 'elite-followup', actAfter.kind);
  // 정당화 실패 시나리오: justification 후속을 직접 서빙 (시나리오 강제 — 실서빙과 동일 경로)
  const fu2 = ELITE_BANK_MAP[prob.id].followUps.find((f) => f.dimension === 'justification');
  const justBefore = eliteDimensionLevel(state.twin.elite.justification);
  const coreBefore = prob.requiredSkills.map((s) => state.twin.skills[s].alpha);
  r = submitEliteAttempt(state.twin, state.log, eliteAct(prob, 'elite-followup', fu2.id), { chosenIndex: (fu2.answerIndex + 1) % fu2.choices.length, solveTimeSec: 60, hintsUsed: [], strategySwitches: 0 }, (state.ts += 60000));
  state.twin = r.twin;
  const justAfter = eliteDimensionLevel(state.twin.elite.justification);
  check('EQA5: justification 증거만 하향 조정', justAfter.level < justBefore.level, `${justBefore.level.toFixed(2)}→${justAfter.level.toFixed(2)}`);
  check('EQA5: core mastery 무손실', prob.requiredSkills.every((s, i) => state.twin.skills[s].alpha === coreBefore[i]));
  check('EQA5: JUSTIFICATION_GAP 진단 기록', (state.twin.eliteRootCauseCounts['JUSTIFICATION_GAP'] ?? 0) >= 1);
}

// =====================================================================
// EQA6 — MULTIPLE_SOLUTION 본문+두 풀이 비교 후속 성공 → strategy flexibility ↑
// =====================================================================
{
  resetEventSeq(500);
  const state = { twin: freshTwin21('eqa6'), log: emptyLog(), ts: BASE_TS };
  const prob = ELITE_BANK_MAP['E.MU.001'];
  for (const s of prob.requiredSkills) seedStrong(state, s);
  const flexBefore = eliteDimensionLevel(state.twin.elite.flexibility);
  const stratBefore = eliteDimensionLevel(state.twin.elite.strategySelection);
  let r = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: prob.answerIndex, solveTimeSec: 180, hintsUsed: [], strategySwitches: 0 }, (state.ts += 60000));
  state.twin = r.twin;
  state.log = r.log;
  for (let i = 0; i < 2; i++) {
    const act = nextAction(state.twin, dstr(state.ts));
    if (act.kind !== 'elite-followup') break;
    const fu = ELITE_BANK_MAP[prob.id].followUps.find((f) => f.id === act.eliteFollowUpId);
    r = submitEliteAttempt(state.twin, state.log, eliteAct(prob, 'elite-followup', fu.id), { chosenIndex: fu.answerIndex, solveTimeSec: 50, hintsUsed: [], strategySwitches: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  const flexAfter = eliteDimensionLevel(state.twin.elite.flexibility);
  const stratAfter = eliteDimensionLevel(state.twin.elite.strategySelection);
  check('EQA6: 복수 풀이 성공 → flexibility 증거 ↑', flexAfter.evidence > flexBefore.evidence, `${flexBefore.evidence}→${flexAfter.evidence}`);
  check('EQA6: strategySelection 증거 ↑', stratAfter.evidence > stratBefore.evidence);
}

// =====================================================================
// EQA7 — 익숙한 표준 20문항 성공 + 비정형(far) 실패 → Core high / novelTransfer lower 분리
// =====================================================================
{
  resetEventSeq(600);
  const state = { twin: freshTwin21('eqa7'), log: emptyLog(), ts: BASE_TS };
  const skill = 'M1.NUM.SIGN.01';
  seedStrong(state, skill, 20);
  const coreP = state.twin.skills[skill].alpha / (state.twin.skills[skill].alpha + state.twin.skills[skill].beta);
  const prob = ELITE_BANK_MAP['E.NR.001']; // SIGN 기반 비정형
  seedStrong(state, 'M1.NUM.SIGN.02', 8);
  const betaBefore = state.twin.skills[skill].beta;
  const r = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: (prob.answerIndex + 1) % 4, solveTimeSec: 200, hintsUsed: ['A'], strategySwitches: 0 }, (state.ts += 60000));
  state.twin = r.twin;
  const novel = eliteDimensionLevel(state.twin.elite.novelTransfer);
  check(`EQA7: Core p=${coreP.toFixed(2)} (high) 유지`, coreP >= 0.75);
  check(`EQA7: novelTransfer=${novel.level.toFixed(2)} 는 Core보다 낮게 별도 기록 (섞이면 FAIL)`, novel.level < coreP - 0.15);
  check('EQA7: elite 실패가 mastery 장부(β)를 변화시키지 않음', state.twin.skills[skill].beta === betaBefore, `β ${betaBefore}→${state.twin.skills[skill].beta}`);
}

// =====================================================================
// EQA8 — 어려운 문제를 오래(추정의 2배+) 고민해 독립 해결 → 무감점 + 강한 추론 증거
// =====================================================================
{
  resetEventSeq(700);
  const state = { twin: freshTwin21('eqa8'), log: emptyLog(), ts: BASE_TS };
  const prob = ELITE_BANK_MAP['E.GN.002'];
  for (const s of prob.requiredSkills) seedStrong(state, s);
  const before = ELITE_DIMENSIONS.map((d) => eliteDimensionLevel(state.twin.elite[d]).level);
  const r = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: prob.answerIndex, solveTimeSec: prob.estimatedSec * 3, hintsUsed: [], strategySwitches: 0 }, (state.ts += 700000));
  state.twin = r.twin;
  const after = ELITE_DIMENSIONS.map((d) => eliteDimensionLevel(state.twin.elite[d]).level);
  check('EQA8: 느린 해결에 어떤 차원도 하락 없음 (시간 무불이익 — PART 24)', after.every((v, i) => v >= before[i] - 1e-9));
  check('EQA8: generalization 증거 상승 (강한 추론 증거)', eliteDimensionLevel(state.twin.elite.generalization).evidence > 0);
  check('EQA8: 추측 오분류 없음', !state.twin.skills[prob.requiredSkills[0]].recentWindow.some((a) => a.isGuess));
}

// =====================================================================
// EQA9 — 고난도 3회 실패, 원인별 상이 처방 (knowledge / strategy / representation)
// =====================================================================
{
  resetEventSeq(800);
  // (a) knowledge형: 필요 스킬 약함 → 결손 케이스
  const sA = { twin: freshTwin21('eqa9a'), log: emptyLog(), ts: BASE_TS };
  const probA = ELITE_BANK_MAP['E.RV.002'];
  const rA = submitEliteAttempt(sA.twin, sA.log, eliteAct(probA), { chosenIndex: (probA.answerIndex + 1) % 4, solveTimeSec: 100, hintsUsed: [], strategySwitches: 0 }, (sA.ts += 60000));
  check('EQA9a: 미학습 전제 → KNOWLEDGE_GAP + 결손 케이스', (rA.twin.eliteRootCauseCounts['KNOWLEDGE_GAP'] ?? 0) === 1 && rA.twin.remediationCases.length >= 1);
  // (b) representation형: 강한 학생, B힌트까지 쓰고 실패 → 표상 스캐폴드
  const sB = { twin: freshTwin21('eqa9b'), log: emptyLog(), ts: BASE_TS };
  const probB = ELITE_BANK_MAP['E.NR.001'];
  for (const s of probB.requiredSkills) seedStrong(sB, s);
  const rB = submitEliteAttempt(sB.twin, sB.log, eliteAct(probB), { chosenIndex: 0, solveTimeSec: 200, hintsUsed: ['A', 'B'], strategySwitches: 0 }, (sB.ts += 60000));
  check('EQA9b: REPRESENTATION_GAP + 스캐폴드 후속 (케이스 아님)', (rB.twin.eliteRootCauseCounts['REPRESENTATION_GAP'] ?? 0) === 1 && rB.twin.remediationCases.length === 0 && rB.twin.agenda.some((a) => a.kind === 'elite-followup'));
  // (c) strategy형: 강한 학생, 힌트 없이 실패 → 전략 진단
  const sC = { twin: freshTwin21('eqa9c'), log: emptyLog(), ts: BASE_TS };
  for (const s of probB.requiredSkills) seedStrong(sC, s);
  const rC = submitEliteAttempt(sC.twin, sC.log, eliteAct(probB), { chosenIndex: 0, solveTimeSec: 120, hintsUsed: [], strategySwitches: 0 }, (sC.ts += 60000));
  check('EQA9c: STRATEGY_GAP 진단 (동일 실패, 다른 흔적 → 다른 처방)', (rC.twin.eliteRootCauseCounts['STRATEGY_GAP'] ?? 0) === 1, JSON.stringify(rC.twin.eliteRootCauseCounts));
}

// =====================================================================
// EQA10 — 선행 진도 빠름 + elite 낮음 → 학습 차단 없이 elite 비중 자동 증가
// =====================================================================
{
  resetEventSeq(900);
  const state = { twin: freshTwin21('eqa10'), log: emptyLog(), ts: BASE_TS };
  const baseShare = eliteShareTarget(state.twin);
  // 진도 시딩: 여러 스킬을 게이트 상태로 (placement 강 + knowledgeState 직접 확인은 불가하므로
  // 게이트 도달을 시뮬레이션하는 대신 spot: eliteShareTarget이 게이트 수에 단조 증가하는지 함수 검증)
  for (const id of ALL_SKILL_IDS.slice(0, 12)) {
    const r0 = submitDiagnosticPlacement(state.twin, state.log, id, 4, 25, 3, (state.ts += 1000));
    state.twin = r0.twin;
    state.log = r0.log;
  }
  // knowledgeState는 게이트 로직 소관 — 함수 수준 검증: 게이트 스킬 가정 트윈
  const t2 = { ...state.twin, skills: { ...state.twin.skills } };
  for (const id of ALL_SKILL_IDS.slice(0, 12)) t2.skills[id] = { ...t2.skills[id], knowledgeState: 'MASTERED' };
  const boosted = eliteShareTarget(t2);
  check(`EQA10: 진도↑+elite낮음 → 비중 ${(-baseShare + boosted).toFixed(2)} 증가 (${baseShare.toFixed(2)}→${boosted.toFixed(2)})`, boosted > baseShare + 0.05);
  check(`EQA10: 상한 준수 (${CONFIG21.elite.maxShare})`, boosted <= CONFIG21.elite.maxShare + 1e-9);
  // '진도 비차단'의 참뜻: elite 프로필이 낮아도 일반 학습 서빙은 계속된다.
  // (참고: placement-만의 얕은 숙달은 transfer 미검증이라 readiness가 FOUNDATION에 머무는데,
  //  이는 PART 16이 옳게 작동하는 것 — Learner Q의 '진도만 빠른 상태'에 elite를 안 여는 설계.)
  const act10 = nextAction(state.twin, dstr(state.ts));
  check('EQA10: 진도 자체는 차단되지 않음 — 일반 학습 서빙 계속', ['normal', 'challenge', 'ease'].includes(act10.kind), act10.kind);
  check('EQA10: 얕은 placement-만 숙달은 elite 도전 미개방 (transfer 미검증 — PART 16)', domainReadiness(state.twin, 'NUM') !== 'ELITE');
}

// =====================================================================
// 리플레이: elite 이벤트 포함 로그의 무손실 재구성 (PART 0 호환성)
// =====================================================================
{
  resetEventSeq(1000);
  const state = { twin: freshTwin21('erep'), log: emptyLog(), ts: BASE_TS };
  const prob = ELITE_BANK_MAP['E.MU.001'];
  for (const s of prob.requiredSkills) seedStrong(state, s, 6);
  let r = submitEliteAttempt(state.twin, state.log, eliteAct(prob), { chosenIndex: prob.answerIndex, solveTimeSec: 150, hintsUsed: ['A'], strategySwitches: 1, firstStrategy: 'x=최소', finalStrategy: 'x=가운데' }, (state.ts += 60000));
  state.twin = r.twin;
  state.log = r.log;
  const act = nextAction(state.twin, dstr(state.ts));
  if (act.kind === 'elite-followup') {
    const fu = prob.followUps.find((f) => f.id === act.eliteFollowUpId);
    r = submitEliteAttempt(state.twin, state.log, eliteAct(prob, 'elite-followup', fu.id), { chosenIndex: (fu.answerIndex + 1) % fu.choices.length, solveTimeSec: 60, hintsUsed: [], strategySwitches: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  const replayed = replayFromScratch(state.log, 'erep');
  const strip = (t) => {
    const { recentAgendaKinds, ...rest } = t;
    return rest;
  };
  check('Elite 이벤트 포함 리플레이가 라이브 트윈과 바이트 일치', JSON.stringify(strip(state.twin)) === JSON.stringify(strip(replayed)));
}

// =====================================================================
// PART 27: ChallengeValue — "가장 어려운 문제"가 아닌 "가장 성장시키는 문제" 선택 검증
// =====================================================================
{
  const state = { twin: freshTwin21('cv'), log: emptyLog(), ts: BASE_TS };
  for (const s of ['M1.ALG.EQ.01', 'M1.ALG.EQ.AX.01', 'M1.ALG.EXP.01']) seedStrong(state, s, 10);
  const scores = ELITE_BANK.map((p) => challengeValue(state.twin, p, []));
  const best = scores.slice().sort((a, b) => b.value - a.value)[0];
  const hardest = ELITE_BANK.slice().sort((a, b) => b.difficulty - a.difficulty)[0];
  check('PART 27: 모든 후보에 breakdown 있는 점수 산출', scores.every((s) => s.value > 0 && s.breakdown.appropriateStruggle > 0));
  check(`PART 27: 최고점(${best.problemId})이 최고 난이도(${hardest.id})와 무관하게 성장 기대값으로 선정될 수 있음`, best.problemId !== hardest.id || ELITE_BANK_MAP[best.problemId].difficulty < 5, `${best.problemId}`);
}

console.log(`\n${pass} checks passed — Phase 2 Step 19 (ELITE QA 1~10) OK`);
