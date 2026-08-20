// PHASE 2 STEP 1 — Calibration root-cause analysis (PART 1/3).
// "전 mastery band에서 actual > predicted"의 원인을 가설별로 분리 실증한다.
//   H1  증거 지연(lag): 예측 오차가 예측 시점의 effectiveEvidence에 따라 어떻게 줄어드는가
//   H2  난이도 이중계상(구조 결함): p 추정치가 '능력'이 아니라 '관측 정답률(난이도 반영됨)'로
//       수렴하는데, 예측 시 θ(d)를 다시 빼서 난이도를 두 번 반영 → 체계적 과소예측
//   H3  prior 보수성: (α0,β0)=(1,4) 질량 5가 수렴을 얼마나 끌어내리는가
//   H4  correctBase/wrongBase 비율: 능력공간 일관성 조건 ratio = exp(θd)와의 괴리(해석적+실측)
// TRAINING 모집단만 사용한다 (PART 2 — validation/stress는 튜닝·분석에 사용 금지).
import { CONFIG21 } from '../src/engine2/config21.ts';
import { predictSuccess, logit, sigmoid } from '../src/engine2/mastery21.ts';
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { submitAttempt, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog } from '../src/engine2/events21.ts';
import { readMastery } from '../src/engine2/mastery21.ts';
import { runPopulation, makeRng, BASE_TS } from './lib/simpop.mjs';

const fmt = (x, d = 3) => (Number.isNaN(x) ? 'n/a' : x.toFixed(d));

console.log('=== PHASE 2 STEP 1 — CALIBRATION ROOT-CAUSE ANALYSIS ===\n');

// ---------------------------------------------------------------------------
// H4 (해석적): 정지점 수학 — 난이도 d에서 무한 연습 시 p*가 어디에 머무는가
// p* = s·c / (s·c + (1-s)·w),  s = σ(logit(trueP) − θd)
// 능력공간 일관성(p* = trueP)의 필요충분조건: c/w = exp(θd)
// ---------------------------------------------------------------------------
console.log('[H4] 해석적 정지점 (trueP=0.7 고정, 난이도별):');
console.log('  d | θ(d)  | 실제정답률 s | 현재 c/w | 필요 exp(θd) | 정지점 p* | 그 지점 예측 | 예측-실제 편차');
const theta = CONFIG21.difficulty.levelOffsets;
const cb = CONFIG21.evidence.correctBase;
const wb = CONFIG21.evidence.wrongBase;
for (let d = 1; d <= 5; d++) {
  const s = sigmoid(logit(0.7) - theta[d - 1]);
  const ratio = cb[d - 1] / wb[d - 1];
  const needed = Math.exp(theta[d - 1]);
  const pStar = (s * cb[d - 1]) / (s * cb[d - 1] + (1 - s) * wb[d - 1]);
  const predAtStar = sigmoid(logit(pStar) - theta[d - 1]);
  console.log(`  ${d} | ${theta[d - 1].toFixed(2).padStart(5)} | ${fmt(s, 3)}        | ${fmt(ratio, 3)}   | ${fmt(needed, 3)}       | ${fmt(pStar, 3)}    | ${fmt(predAtStar, 3)}      | ${fmt(predAtStar - s, 3)}`);
}
console.log('  → 전 난이도에서 c/w < exp(θd): p*가 trueP 아래 정지, 예측은 θ를 재차 빼 이중으로 낮아짐.\n');

// ---------------------------------------------------------------------------
// H2 (실증): trueP=0.7 학습자를 d4 고정으로만 300회 연습 → p 수렴점과 예측편차 실측
// ---------------------------------------------------------------------------
{
  const rng = makeRng(777);
  let twin = freshTwin21('h2');
  let log = emptyLog();
  let ts = BASE_TS;
  const skill = 'M1.NUM.SIGN.01';
  const d = 4;
  const sTrue = predictSuccess(0.7, d);
  let obsCorrect = 0;
  let n = 0;
  for (let i = 0; i < 300; i++) {
    // 다양성 페널티 회피용 필러 (측정 목적: 순수 수렴점)
    if (i % 3 === 2) {
      const fa = { kind: 'normal', skillId: 'M1.FUN.COORD.02', difficulty: 2, variant: 'standard', reason: 'filler' };
      const fp = buildProblemForAction(fa);
      const fr = submitAttempt(twin, log, fa, fp, { chosenIndex: fp.answerIndex, solveTimeSec: fp.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (ts += 60000));
      twin = fr.twin;
      log = fr.log;
    }
    const a = { kind: 'normal', skillId: skill, difficulty: d, variant: 'standard', reason: 'h2' };
    const p = buildProblemForAction(a);
    const correct = rng() < sTrue;
    if (correct) obsCorrect++;
    n++;
    const idx = correct ? p.answerIndex : (p.answerIndex + 1) % p.choices.length;
    const r = submitAttempt(twin, log, a, p, { chosenIndex: idx, solveTimeSec: p.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (ts += 60000));
    twin = r.twin;
    log = r.log;
  }
  const sk = twin.skills[skill];
  const m = readMastery(sk.alpha, sk.beta, sk.lastPracticedAt, '2026-08-20');
  const predicted = predictSuccess(m.p, d);
  console.log(`[H2] d4 고정 300회 실측 (trueP=0.7 → 실제정답률 ${fmt(sTrue)}):`);
  console.log(`  관측 정답률 = ${fmt(obsCorrect / n)}  |  p 추정 수렴 = ${fmt(m.p)} (trueP 0.7과의 괴리 ${fmt(0.7 - m.p)})`);
  console.log(`  그 p로의 d4 예측 = ${fmt(predicted)}  vs  실제 ${fmt(sTrue)}  →  과소예측 ${fmt(sTrue - predicted)}`);
  console.log('  → p는 능력(0.7)이 아니라 난이도 반영 정답률 근처로 수렴하고, 예측이 θ를 재차 빼는 이중계상 실증.\n');
}

// ---------------------------------------------------------------------------
// H1/H3 (모집단): 예측 오차를 [예측 시점 E 구간]별로 분해 + prior 변형 비교
// ---------------------------------------------------------------------------
function errorByEvidence(predictions) {
  // predictions에는 E가 없으므로 근사: 학습자·스킬별 시간순 예측 순번을 E 프록시로 사용
  // (엄밀 E는 트윈 재생 필요 — 방향성 분석에는 순번 버킷이 충분)
  const bySkill = new Map();
  const buckets = [
    { label: '  1-5', lo: 0, hi: 5, err: 0, n: 0, pred: 0, act: 0 },
    { label: ' 6-15', lo: 5, hi: 15, err: 0, n: 0, pred: 0, act: 0 },
    { label: '16-40', lo: 15, hi: 40, err: 0, n: 0, pred: 0, act: 0 },
    { label: ' 41+ ', lo: 40, hi: 1e9, err: 0, n: 0, pred: 0, act: 0 },
  ];
  for (const p of predictions) {
    const key = p.skillId; // 모집단 통합이지만 attemptId에 학습자 정보가 없어 스킬 단위 순번 — 학습자별 실행이라 twin.predictions 순서 유지됨
    const k = `${key}`;
    const cnt = (bySkill.get(k) ?? 0) + 1;
    bySkill.set(k, cnt);
    const b = buckets.find((b) => cnt > b.lo && cnt <= b.hi);
    if (b) {
      b.pred += p.predictedP;
      b.act += p.correct ? 1 : 0;
      b.n++;
    }
  }
  return buckets.map((b) => ({ label: b.label, n: b.n, meanPred: b.pred / b.n, actual: b.act / b.n, gap: b.act / b.n - b.pred / b.n }));
}

console.log('[H1] TRAINING 모집단(3 replicate) — 스킬별 예측 순번(≈증거량 프록시) 구간별 과소예측 폭:');
const trainReports = [];
for (let rep = 0; rep < 3; rep++) {
  const pop = runPopulation('training', rep, { iterations: 400 });
  trainReports.push(pop);
  const rows = errorByEvidence(pop.predictions);
  console.log(`  replicate ${rep}: calibErr=${fmt(pop.report.calibrationError)} brier=${fmt(pop.report.brierScore)}`);
  for (const r of rows) console.log(`    예측순번 ${r.label}: n=${String(r.n).padStart(5)}  평균예측 ${fmt(r.meanPred, 2)}  실제 ${fmt(r.actual, 2)}  gap +${fmt(r.gap, 3)}`);
}
const meanCalib = trainReports.reduce((a, p) => a + p.report.calibrationError, 0) / 3;
const meanBrier = trainReports.reduce((a, p) => a + p.report.brierScore, 0) / 3;
console.log(`  → TRAINING 평균: calibErr=${fmt(meanCalib)} brier=${fmt(meanBrier)}`);
console.log('  → gap이 초기 구간에서 최대(=prior 지배 구간)이고 증거 축적 후에도 0으로 닫히지 않음(=H2/H4 구조 편향 잔존).\n');

// ---------------------------------------------------------------------------
// H3 (통제): prior 질량 변형 — 같은 TRAINING replicate 0, prior만 변경해 재실행
// (test21-replay-config와 동일하게 CONFIG21 런타임 변형 후 복원)
// ---------------------------------------------------------------------------
console.log('[H3] prior 변형 비교 (TRAINING replicate 0, 나머지 계수 동일):');
const priorVariants = [
  { label: '현행 (1, 4)  p0=0.20 질량5', a: 1, b: 4 },
  { label: '후보 (1, 3)  p0=0.25 질량4', a: 1, b: 3 },
  { label: '후보 (0.75, 2.25) p0=0.25 질량3', a: 0.75, b: 2.25 },
  { label: '후보 (1, 1)  p0=0.50 질량2', a: 1, b: 1 },
];
const origPrior = { ...CONFIG21.prior };
for (const v of priorVariants) {
  CONFIG21.prior.alpha = v.a;
  CONFIG21.prior.beta = v.b;
  const pop = runPopulation('training', 0, { iterations: 400 });
  console.log(`  ${v.label}: calibErr=${fmt(pop.report.calibrationError)} brier=${fmt(pop.report.brierScore)} FMR=${fmt(pop.report.falseMasteryRate)} FWR=${fmt(pop.report.falseWeaknessRate)}`);
}
CONFIG21.prior.alpha = origPrior.alpha;
CONFIG21.prior.beta = origPrior.beta;

// ---------------------------------------------------------------------------
// H4 (통제): 증거비율 능력공간 정합 — correctBase/wrongBase = exp(θd)로 재구성해 재실행
// ---------------------------------------------------------------------------
console.log('\n[H4-실증] 증거비율 exp(θd) 정합 변형 (prior 현행 유지):');
const origCb = [...CONFIG21.evidence.correctBase];
const origWb = [...CONFIG21.evidence.wrongBase];
const origCap = CONFIG21.evidence.singleAttemptCap;
for (let d = 0; d < 5; d++) {
  const half = Math.exp(theta[d] / 2);
  CONFIG21.evidence.correctBase[d] = +(half).toFixed(3);
  CONFIG21.evidence.wrongBase[d] = +(1 / half).toFixed(3);
}
CONFIG21.evidence.singleAttemptCap = 2.3;
{
  const pop = runPopulation('training', 0, { iterations: 400 });
  console.log(`  ratio=exp(θd): calibErr=${fmt(pop.report.calibrationError)} brier=${fmt(pop.report.brierScore)} FMR=${fmt(pop.report.falseMasteryRate)} FWR=${fmt(pop.report.falseWeaknessRate)}`);
}
// 결합: 비율 정합 + prior (1,3)
CONFIG21.prior.alpha = 1;
CONFIG21.prior.beta = 3;
{
  const pop = runPopulation('training', 0, { iterations: 400 });
  console.log(`  ratio=exp(θd) + prior(1,3): calibErr=${fmt(pop.report.calibrationError)} brier=${fmt(pop.report.brierScore)} FMR=${fmt(pop.report.falseMasteryRate)} FWR=${fmt(pop.report.falseWeaknessRate)}`);
}
// 복원
CONFIG21.prior.alpha = origPrior.alpha;
CONFIG21.prior.beta = origPrior.beta;
CONFIG21.evidence.correctBase.splice(0, 5, ...origCb);
CONFIG21.evidence.wrongBase.splice(0, 5, ...origWb);
CONFIG21.evidence.singleAttemptCap = origCap;

// ---------------------------------------------------------------------------
// 부가: Probe Yield 원인 — 프로브가 d2 고정 서빙되는 구조 확인 (세션 코드 상수)
// ---------------------------------------------------------------------------
console.log('\n[부가] Probe Yield 저조 원인: session21이 모든 프로브를 난이도 2로 서빙 (하드코딩).');
console.log('  d2에서 예측 통과율: trueP 0.5 학생 → ' + fmt(predictSuccess(0.5, 2)) + ', trueP 0.7 → ' + fmt(predictSuccess(0.7, 2)));
console.log('  → 약한 전제조차 d2에서는 자주 통과 → 프로브 실패율(=yield)이 구조적으로 낮음.');
console.log('  → 후보 개선: 프로브를 기준 난이도 3으로 (진단 1문항과 동일) — Step 5 벤치마크에서 검증.\n');

console.log('=== 분석 종료 — 결론은 docs/PHASE2-CALIBRATION.md에 기록 ===');
