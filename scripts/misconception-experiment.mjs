// PHASE 2 STEP 3 / PART 6 — 오개념 확인 전략 비교 실험 (A/B/C/D).
// 목표: Precision ≥ 0.85 를 지키면서 Recall을 Phase 1(two-clean) 대비 크게 개선.
// 방법: 태깅된 오개념 3종 × [보유/미보유] 학습자 × 트리거 스킬 집중 구동.
//   보유자: 오답 시 rate 확률로 해당 오개념의 기계적 distractor 선택
//   미보유자: 오답 시 무작위 distractor (태깅 오답을 우연히 고를 수 있음 — FP 압력)
// 판정: 구동 종료까지 해당 오개념이 한 번이라도 ACTIVE 도달했는가.
// PART 2 준수: 선택은 TRAINING 시드에서만, 승자 1개를 VALIDATION 시드로 재확인.
import { CONFIG21 } from '../src/engine2/config21.ts';
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitMicroLessonAck, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog } from '../src/engine2/events21.ts';
import { predictSuccess } from '../src/engine2/mastery21.ts';
import { makeRng, BASE_TS, dstr } from './lib/simpop.mjs';

const fmt = (x, d = 3) => (Number.isNaN(x) ? 'n/a' : x.toFixed(d));

const CASES = [
  { misId: 'MIS.FRAC.ADDDEN', skillId: 'M1.NUM.FRAC.01', trueP: 0.6 },
  { misId: 'MIS.EQ.MOVE', skillId: 'M1.ALG.EQ.01', trueP: 0.6 },
  { misId: 'MIS.EXP.DISTR', skillId: 'M1.ALG.EXP.02', trueP: 0.6 },
];

function runOne(kase, hasMis, seed, iterations = 60) {
  const rng = makeRng(seed);
  const state = { twin: freshTwin21(`mx-${seed}`), log: emptyLog(), ts: BASE_TS };
  const skill = kase.skillId;
  let guard = 0;
  while (guard++ < iterations) {
    const suggested = nextAction(state.twin, dstr(state.ts));
    const mustHonor = ['probe', 'confirm', 'micro-lesson'].includes(suggested.kind) || !!suggested.caseId;
    const action = suggested.skillId === skill || mustHonor ? suggested : { kind: 'normal', skillId: skill, difficulty: state.twin.skills[skill].currentDifficulty, variant: 'standard', reason: 'mx' };
    if (action.kind === 'micro-lesson') {
      const r = submitMicroLessonAck(state.twin, state.log, action, (state.ts += 45000));
      state.twin = r.twin;
      state.log = r.log;
      continue;
    }
    let problem = buildProblemForAction(action);
    const sp = predictSuccess(action.skillId === skill ? kase.trueP : 0.8, action.difficulty);
    const correct = rng() < sp;
    let idx;
    if (correct) idx = problem.answerIndex;
    else if (hasMis && action.skillId === skill && rng() < 0.7) {
      // 보유자는 자기 오규칙을 '적용해서' 답을 만들므로 그 규칙의 완전한 산물(HIGH)이 우선이고,
      // 부분 산물(MEDIUM)은 차선이다 — MEDIUM을 먼저 집게 하면 보유자 매치 가중이 비현실적으로
      // 희석된다 (초기 실험의 Recall 붕괴 원인 중 하나).
      let found = -1;
      for (let t2 = 0; t2 < 8 && found < 0; t2++) {
        if (t2 > 0) problem = buildProblemForAction(action);
        found = problem.choices.findIndex((c, i) => i !== problem.answerIndex && c.misconceptionId === kase.misId && c.diagnosticStrength === 'HIGH');
        if (found < 0) found = problem.choices.findIndex((c, i) => i !== problem.answerIndex && c.misconceptionId === kase.misId);
      }
      if (found < 0) {
        const wrongs = problem.choices.map((c, i) => i).filter((i) => i !== problem.answerIndex);
        found = wrongs[Math.floor(rng() * wrongs.length)];
      }
      idx = found;
    } else {
      const wrongs = problem.choices.map((c, i) => i).filter((i) => i !== problem.answerIndex);
      idx = wrongs[Math.floor(rng() * wrongs.length)];
    }
    const r = submitAttempt(state.twin, state.log, action, problem, { chosenIndex: idx, solveTimeSec: problem.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  // "확정" 판정 = ACTIVE 도달 (치료로 RESOLVED 됐어도 탐지 성공).
  // linkedMisconceptionId는 SUSPECTED 단계에서도 케이스에 연결되는 의미론(치료 병합용)이라
  // 확정 판정 기준으로 쓰면 의심을 확정으로 오집계한다 — 초기 실험의 측정 오류였음.
  const inst = state.twin.misconceptions.find((m) => m.misconceptionId === kase.misId);
  const everActive = !!inst && (inst.status === 'ACTIVE' || inst.status === 'RESOLVED');
  return everActive;
}

function evaluate(policy, seedBase, nPerCell = 10) {
  const orig = CONFIG21.misconception.policy;
  CONFIG21.misconception.policy = policy;
  let tp = 0, fp = 0, fn = 0, tn = 0;
  let confirmCost = 0;
  for (const kase of CASES) {
    for (let i = 0; i < nPerCell; i++) {
      const withMis = runOne(kase, true, seedBase + i * 37 + CASES.indexOf(kase) * 1000);
      if (withMis) tp++;
      else fn++;
      const withoutMis = runOne(kase, false, seedBase + 500 + i * 41 + CASES.indexOf(kase) * 1000);
      if (withoutMis) fp++;
      else tn++;
    }
  }
  CONFIG21.misconception.policy = orig;
  const precision = tp + fp === 0 ? NaN : tp / (tp + fp);
  const recall = tp + fn === 0 ? NaN : tp / (tp + fn);
  return { policy, precision, recall, tp, fp, fn, tn, confirmCost };
}

console.log('=== PART 6 — 확인 전략 비교 (TRAINING 시드 20000) ===');
console.log('정책          | Precision | Recall | TP/FP/FN/TN');
const POLICIES = ['two-clean', 'three-clean', 'strong-fast', 'rolling'];
const results = [];
for (const p of POLICIES) {
  const r = evaluate(p, 20000);
  results.push(r);
  console.log(`${p.padEnd(12)} | ${fmt(r.precision)}    | ${fmt(r.recall)} | ${r.tp}/${r.fp}/${r.fn}/${r.tn}`);
}

// rolling 파라미터 그리드 (TRAINING 한정 — PART 2 준수)
console.log('\n--- rolling 파라미터 그리드 (TRAINING) ---');
const grid = [];
for (const minOpp of [5, 6, 7]) {
  for (const activeRate of [0.55, 0.6, 0.65]) {
    CONFIG21.misconception.rolling.minOpportunities = minOpp;
    CONFIG21.misconception.rolling.activeRate = activeRate;
    const r = evaluate('rolling', 20000);
    grid.push({ minOpp, activeRate, ...r, policy: `rolling(m${minOpp},a${activeRate})` });
    console.log(`  minOpp=${minOpp} rate=${activeRate}: P=${fmt(r.precision)} R=${fmt(r.recall)} (TP${r.tp}/FP${r.fp}/FN${r.fn}/TN${r.tn})`);
  }
}
CONFIG21.misconception.rolling.minOpportunities = 5;
CONFIG21.misconception.rolling.activeRate = 0.6;
results.push(...grid);

// 승자 규칙: Precision ≥ 0.85 중 Recall 최대. 동률이면 Precision 높은 쪽.
const eligible = results.filter((r) => r.precision >= 0.85);
eligible.sort((a, b) => b.recall - a.recall || b.precision - a.precision);
if (eligible.length === 0) {
  console.log('\nPrecision ≥ 0.85 후보 없음 — 계수 재검토 필요');
  process.exit(1);
}
const winner = eligible[0];
console.log(`\n승자(TRAINING): ${winner.policy}  (P=${fmt(winner.precision)}, R=${fmt(winner.recall)})`);
if (winner.minOpp) {
  CONFIG21.misconception.rolling.minOpportunities = winner.minOpp;
  CONFIG21.misconception.rolling.activeRate = winner.activeRate;
}
const winnerPolicyName = winner.minOpp ? 'rolling' : winner.policy;

console.log('\n=== VALIDATION 시드 60000 — 승자만 재확인 (baseline two-clean 대비) ===');
const valBase = evaluate('two-clean', 60000);
const valWin = evaluate(winnerPolicyName, 60000);
console.log(`two-clean(A) | P=${fmt(valBase.precision)} R=${fmt(valBase.recall)}`);
console.log(`${(winner.policy ?? '').padEnd(20)} | P=${fmt(valWin.precision)} R=${fmt(valWin.recall)}`);

const pass = valWin.precision >= 0.85 && valWin.recall > valBase.recall + 0.1;
console.log(pass ? '\n✅ VALIDATION 통과 — config 기본 정책으로 채택 진행' : '\n❌ VALIDATION 미달 — 채택 보류');
process.exitCode = pass ? 0 : 1;
