// PHASE 2 STEP 20 — Synthetic Elite Learners L~R (PART 42).
// 각 학습자는 elite 차원별 '은닉 실력' + 행동 특성으로 정의되고, Elite Bank 전 문항 +
// 후속을 실제 submitEliteAttempt 경로로 풀어낸다. 검증: Elite Engine이 각 프로필에
// 올바른 측정(차원 분리)과 올바른 개입(스캐폴드 vs 결손 케이스 vs 비중 조정)을 하는가.
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { submitAttempt, submitEliteAttempt, submitDiagnosticPlacement, buildProblemForAction, nextAction } from '../src/engine2/session21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { eliteDimensionLevel, eliteShareTarget, domainReadiness, ELITE_DIMENSIONS } from '../src/engine2/elite22.ts';
import { ELITE_BANK, ELITE_BANK_MAP } from '../src/engine2/eliteBank22.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP } from '../src/engine2/curriculum21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';
import { makeRng, BASE_TS, dstr } from './lib/simpop.mjs';

let pass = 0;
let fail = 0;
const failures = [];
function check(learner, name, cond, detail = '') {
  const ok = !!cond;
  if (ok) pass++;
  else {
    fail++;
    failures.push(`[${learner}] ${name}${detail ? ' — ' + detail : ''}`);
  }
  console.log(`${ok ? '✅' : '❌'} [${learner}] ${name}${detail ? ' — ' + detail : ''}`);
}

const lvl = (twin, d) => eliteDimensionLevel(twin.elite[d]).level;
const evd = (twin, d) => eliteDimensionLevel(twin.elite[d]).evidence;

// 스킬 시딩: 실전 정답 n회 + 전이 1회 통과 (elite readiness의 transfer 요건)
function seedCore(state, skillId, n, passTransfer = true) {
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
  if (passTransfer) {
    const a = { kind: 'normal', skillId, difficulty: 3, variant: 'transfer', reason: 't' };
    const p = buildProblemForAction(a);
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: p.answerIndex, solveTimeSec: 50, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
}

// 학습자 정의: 차원별 은닉 성공률 + 행동 (전환 성향, 힌트 성향)
// solveMain: 본문 해결 확률 = 관련 차원들의 은닉 실력 평균 (모드→차원 매핑은 엔진과 동일 발상)
const MODE_DIMS = {
  NON_ROUTINE: ['novelTransfer', 'strategySelection'],
  MULTI_SKILL: ['integration', 'strategySelection'],
  REVERSE: ['reverseReasoning'],
  GENERALIZATION: ['generalization'],
  ERROR_ANALYSIS: ['justification', 'explanation'],
  MULTIPLE_SOLUTION: ['flexibility', 'strategySelection'],
  PROOF: ['justification'],
  APPLICATION: ['representation'],
};

function runEliteLearner(name, hidden, behavior, seed) {
  resetEventSeq(seed);
  const rng = makeRng(seed);
  const state = { twin: freshTwin21(name), log: emptyLog(), ts: BASE_TS };
  // 코어 시딩: hidden.corePBySkill(기본 0.9) 수준을 반영해 전 필요 스킬 강 시딩
  const needed = new Set();
  for (const p of ELITE_BANK) for (const s of p.requiredSkills) needed.add(s);
  for (const s of needed) seedCore(state, s, behavior.coreSeedN ?? 10);

  // 은행 2회전: 각 본문 + 후속 전부 실제 경로로
  for (let round = 0; round < 2; round++) {
    for (const prob of ELITE_BANK) {
      const dims = MODE_DIMS[prob.mode] ?? ['strategySelection'];
      const ability = dims.reduce((a, d) => a + (hidden[d] ?? 0.5), 0) / dims.length;
      const solveP = Math.min(0.95, ability * (behavior.slow ? 1.05 : 1)); // 느림은 불이익 아님(오히려 정확)
      const correct = rng() < solveP;
      const switches = correct && behavior.switchOnStuck && rng() < 0.5 ? 1 : 0;
      const hints = correct ? (behavior.hintProne && rng() < 0.4 ? ['A'] : []) : behavior.hintProne ? ['A', 'B'] : [];
      const solveTime = prob.estimatedSec * (behavior.slow ? 2.6 : 0.9);
      const act = { kind: 'elite', skillId: prob.requiredSkills[0], difficulty: prob.difficulty, variant: 'standard', eliteProblemId: prob.id, reason: 'sim' };
      let r = submitEliteAttempt(state.twin, state.log, act, { chosenIndex: correct ? prob.answerIndex : (prob.answerIndex + 1) % 4, solveTimeSec: solveTime, hintsUsed: hints, strategySwitches: switches }, (state.ts += 90000));
      state.twin = r.twin;
      state.log = r.log;
      // 후속 체인 소화 (엔진이 큐잉한 것만)
      let guard = 0;
      while (guard++ < 4) {
        const next = nextAction(state.twin, dstr(state.ts));
        if (next.kind !== 'elite-followup') break;
        const fu = ELITE_BANK_MAP[next.eliteProblemId].followUps.find((f) => f.id === next.eliteFollowUpId);
        const fuOk = rng() < (hidden[fu.dimension] ?? 0.5);
        r = submitEliteAttempt(state.twin, state.log, { ...next, kind: 'elite-followup' }, { chosenIndex: fuOk ? fu.answerIndex : (fu.answerIndex + 1) % fu.choices.length, solveTimeSec: 60, hintsUsed: [], strategySwitches: 0 }, (state.ts += 60000));
        state.twin = r.twin;
        state.log = r.log;
      }
    }
  }
  return state;
}

const HI = 0.9;
const LO = 0.25;
const MID = 0.55;

// =====================================================================
// Learner L — Core high, novel problem solving weak
// =====================================================================
{
  const hidden = { novelTransfer: LO, strategySelection: MID, integration: MID, flexibility: MID, generalization: MID, reverseReasoning: MID, justification: MID, explanation: MID, representation: MID };
  const st = runEliteLearner('L', hidden, {}, 11000);
  const corePs = [...new Set(ELITE_BANK.flatMap((p) => p.requiredSkills))].map((s) => st.twin.skills[s].alpha / (st.twin.skills[s].alpha + st.twin.skills[s].beta));
  const coreAvg = corePs.reduce((a, b) => a + b, 0) / corePs.length;
  check('L', `Core 평균 p=${coreAvg.toFixed(2)} 높게 유지`, coreAvg >= 0.75);
  check('L', `novelTransfer(${lvl(st.twin, 'novelTransfer').toFixed(2)})가 Core와 분리되어 낮게 측정`, lvl(st.twin, 'novelTransfer') < coreAvg - 0.2);
  check('L', '비정형 실패에 지식 결손 케이스가 아닌 추론 진단 기록', (st.twin.eliteRootCauseCounts['KNOWLEDGE_GAP'] ?? 0) === 0 && Object.keys(st.twin.eliteRootCauseCounts).length >= 1, JSON.stringify(st.twin.eliteRootCauseCounts));
}

// =====================================================================
// Learner M — Core average, unusually strong reasoning
// =====================================================================
{
  const hidden = { novelTransfer: HI, strategySelection: HI, integration: HI, flexibility: HI, generalization: HI, reverseReasoning: HI, justification: HI, explanation: HI, representation: HI };
  const st = runEliteLearner('M', hidden, { coreSeedN: 5 }, 12000);
  const dims = ELITE_DIMENSIONS.map((d) => lvl(st.twin, d));
  const dimAvg = dims.reduce((a, b) => a + b, 0) / dims.length;
  check('M', `elite 차원 평균 ${dimAvg.toFixed(2)} 높게 측정 (강한 추론 포착)`, dimAvg >= 0.6);
  check('M', 'KNOWLEDGE_GAP 오귀속 없음 (개념은 적정 — 추론이 강점)', (st.twin.eliteRootCauseCounts['KNOWLEDGE_GAP'] ?? 0) === 0);
}

// =====================================================================
// Learner N — Strong representation, weak strategy selection (차원 분리)
// =====================================================================
{
  const hidden = { representation: HI, strategySelection: LO, novelTransfer: MID, integration: MID, flexibility: MID, generalization: MID, reverseReasoning: MID, justification: MID, explanation: MID };
  const st = runEliteLearner('N', hidden, {}, 13000);
  check('N', `representation(${lvl(st.twin, 'representation').toFixed(2)}) > strategySelection(${lvl(st.twin, 'strategySelection').toFixed(2)}) + 0.15 — 차원 분리`, lvl(st.twin, 'representation') > lvl(st.twin, 'strategySelection') + 0.15);
}

// =====================================================================
// Learner O — Strong first strategy, low flexibility
// =====================================================================
{
  const hidden = { strategySelection: HI, flexibility: LO, novelTransfer: MID, integration: MID, generalization: MID, reverseReasoning: MID, justification: MID, explanation: MID, representation: MID };
  const st = runEliteLearner('O', hidden, { switchOnStuck: false }, 14000);
  check('O', `flexibility(${lvl(st.twin, 'flexibility').toFixed(2)}) < strategySelection(${lvl(st.twin, 'strategySelection').toFixed(2)}) − 0.15`, lvl(st.twin, 'flexibility') < lvl(st.twin, 'strategySelection') - 0.15);
  check('O', '전환-부재 실패에 FLEXIBILITY/STRATEGY 계열 진단 존재', (st.twin.eliteRootCauseCounts['FLEXIBILITY_GAP'] ?? 0) + (st.twin.eliteRootCauseCounts['STRATEGY_GAP'] ?? 0) >= 1, JSON.stringify(st.twin.eliteRootCauseCounts));
}

// =====================================================================
// Learner P — Strong answer accuracy, weak explanation
// =====================================================================
{
  const hidden = { novelTransfer: HI, strategySelection: HI, integration: HI, flexibility: HI, generalization: HI, reverseReasoning: HI, justification: LO, explanation: LO, representation: HI };
  const st = runEliteLearner('P', hidden, {}, 15000);
  const strong = ['novelTransfer', 'strategySelection', 'integration'].map((d) => lvl(st.twin, d));
  const strongAvg = strong.reduce((a, b) => a + b, 0) / strong.length;
  check('P', `justification(${lvl(st.twin, 'justification').toFixed(2)}) < 해결력 평균(${strongAvg.toFixed(2)}) − 0.2 — 정답력과 설명력 분리`, lvl(st.twin, 'justification') < strongAvg - 0.2);
  check('P', 'JUSTIFICATION_GAP 진단 기록 (설명 보완 개입)', (st.twin.eliteRootCauseCounts['JUSTIFICATION_GAP'] ?? 0) >= 1);
}

// =====================================================================
// Learner Q — Very advanced curriculum, shallow mastery (진도만 빠름)
// =====================================================================
{
  resetEventSeq(16000);
  const state = { twin: freshTwin21('Q'), log: emptyLog(), ts: BASE_TS };
  // 전 스킬 placement만 (얕음: 실전·transfer 없음) + 게이트 상태 가정
  for (const id of ALL_SKILL_IDS) {
    const r0 = submitDiagnosticPlacement(state.twin, state.log, id, 4, 20, 3, (state.ts += 1000));
    state.twin = r0.twin;
    state.log = r0.log;
  }
  const t2 = { ...state.twin, skills: { ...state.twin.skills } };
  for (const id of ALL_SKILL_IDS) t2.skills[id] = { ...t2.skills[id], knowledgeState: 'MASTERED' };
  check('Q', `진도↑·사고력↓ → elite 비중 상향 (${eliteShareTarget(state.twin).toFixed(2)}→${eliteShareTarget(t2).toFixed(2)})`, eliteShareTarget(t2) > eliteShareTarget(state.twin) + 0.05);
  check('Q', '얕은 숙달(transfer 미검증)엔 elite 도전 미개방 — 깊이 요건 유지', ['NUM', 'ALG', 'FUN'].every((d) => domainReadiness(state.twin, d) !== 'ELITE'));
  const act = nextAction(state.twin, dstr(state.ts));
  check('Q', '일반 학습은 계속 서빙 (진도 차단 없음)', ['normal', 'challenge', 'ease'].includes(act.kind), act.kind);
}

// =====================================================================
// Learner R — Slow but exceptional deep reasoning
// =====================================================================
{
  const hidden = { novelTransfer: HI, strategySelection: HI, integration: HI, flexibility: HI, generalization: HI, reverseReasoning: HI, justification: HI, explanation: HI, representation: HI };
  const st = runEliteLearner('R', hidden, { slow: true }, 17000);
  const dims = ELITE_DIMENSIONS.map((d) => lvl(st.twin, d));
  const dimAvg = dims.reduce((a, b) => a + b, 0) / dims.length;
  check('R', `느린 심층 추론 무불이익 — elite 차원 평균 ${dimAvg.toFixed(2)} 높게`, dimAvg >= 0.6);
  check('R', '느림이 추측으로 오분류되지 않음', !st.twin.strategyTraces.some((t) => t.solved === false && t.hintsUsed.length === 0 && (st.twin.eliteRootCauseCounts['COGNITIVE_OVERLOAD'] ?? 0) > 3));
  const anyGuess = [...new Set(ELITE_BANK.flatMap((p) => p.requiredSkills))].some((s) => st.twin.skills[s].recentWindow.some((a) => a.isGuess));
  check('R', 'mastery 장부에도 추측 플래그 없음', !anyGuess);
}

console.log(`\n${pass} passed, ${fail} failed out of ${pass + fail} Elite Learner checks`);
if (fail > 0) {
  console.log('\nFailed checks:');
  for (const f of failures) console.log('  ' + f);
  process.exitCode = 1;
} else {
  console.log('\n🎉 Synthetic Elite Learners L~R — ALL PASS');
}
