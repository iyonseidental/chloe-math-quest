// PHASE 2 STEP 2 — Calibration parameter review + holdout validation (PART 2/3/4).
// 규칙:
//   · 후보 선택은 TRAINING 3-replicate 평균으로만 한다.
//   · 선택된 승자 1개만 VALIDATION/STRESS에서 평가한다 (holdout에 그리드 노출 금지).
//   · 지표 정의는 절대 바꾸지 않는다 (PART 44).
// 후보는 Step 1 분석이 지목한 원인에 대응하는 것만 — 무차별 탐색 금지:
//   구조 수정: correctBase/wrongBase 비율 = exp(θd)  (능력공간 정합, H4)
//   속도 계수 k: 전체 증거 속도 (H1의 수렴 지연)
//   prior: (1,4) 유지 vs 소폭 완화 (H3 — 큰 효과 없음이 확인됐으므로 후보 최소화)
import { CONFIG21 } from '../src/engine2/config21.ts';
import { runPopulation } from './lib/simpop.mjs';

const fmt = (x, d = 3) => (Number.isNaN(x) || x === undefined ? 'n/a' : (+x).toFixed(d));
const theta = CONFIG21.difficulty.levelOffsets;

const snapshot = {
  prior: { ...CONFIG21.prior },
  correctBase: [...CONFIG21.evidence.correctBase],
  wrongBase: [...CONFIG21.evidence.wrongBase],
  cap: CONFIG21.evidence.singleAttemptCap,
};
function restore() {
  CONFIG21.prior.alpha = snapshot.prior.alpha;
  CONFIG21.prior.beta = snapshot.prior.beta;
  CONFIG21.evidence.correctBase.splice(0, 5, ...snapshot.correctBase);
  CONFIG21.evidence.wrongBase.splice(0, 5, ...snapshot.wrongBase);
  CONFIG21.evidence.singleAttemptCap = snapshot.cap;
}
function applyRatioFix(k) {
  for (let d = 0; d < 5; d++) {
    const half = Math.exp(theta[d] / 2);
    CONFIG21.evidence.correctBase[d] = +(k * half).toFixed(3);
    CONFIG21.evidence.wrongBase[d] = +(k / half).toFixed(3);
  }
  CONFIG21.evidence.singleAttemptCap = Math.max(2.0, +(k * Math.exp(theta[4] / 2) * 1.05).toFixed(2));
}

const CANDIDATES = [
  { label: 'BASELINE (현행 2.1.0)', apply: () => {} },
  { label: 'R1: ratio=exp(θd), k=1.0, prior(1,4)', apply: () => applyRatioFix(1.0) },
  { label: 'R2: ratio=exp(θd), k=1.2, prior(1,4)', apply: () => applyRatioFix(1.2) },
  {
    label: 'R3: ratio=exp(θd), k=1.0, prior(1,3)',
    apply: () => {
      applyRatioFix(1.0);
      CONFIG21.prior.beta = 3;
    },
  },
  {
    label: 'R4: ratio=exp(θd), k=1.2, prior(1,3)',
    apply: () => {
      applyRatioFix(1.2);
      CONFIG21.prior.beta = 3;
    },
  },
  {
    label: 'R5: ratio=exp(θd), k=1.0, prior(0.75,2.25)',
    apply: () => {
      applyRatioFix(1.0);
      CONFIG21.prior.alpha = 0.75;
      CONFIG21.prior.beta = 2.25;
    },
  },
];

function bandInversions(bands) {
  let inv = 0;
  for (let i = 1; i < bands.length; i++) if (bands[i].actualRate < bands[i - 1].actualRate - 1e-9) inv++;
  return inv;
}
function irreducibleBrier(bands, total) {
  // 완벽 캘리브레이션 하한: E[actual(1-actual)] — 목표 0.20의 달성 가능성 판단용 (정의 변경 아님)
  return bands.reduce((s, b) => s + b.actualRate * (1 - b.actualRate) * b.n, 0) / total;
}

function evalOn(kind, reps, iterations = 400) {
  const out = [];
  for (const rep of reps) out.push(runPopulation(kind, rep, { iterations }));
  const mean = (f) => out.reduce((a, p) => a + f(p.report), 0) / out.length;
  const total = out.reduce((a, p) => a + p.predictions.length, 0);
  const inv = out.reduce((a, p) => a + bandInversions(p.report.accuracyByBand), 0);
  const irr = out.reduce((a, p) => a + irreducibleBrier(p.report.accuracyByBand, p.predictions.length) * p.predictions.length, 0) / total;
  return {
    calibErr: mean((r) => r.calibrationError),
    brier: mean((r) => r.brierScore),
    fmr: mean((r) => (Number.isNaN(r.falseMasteryRate) ? 0 : r.falseMasteryRate)),
    fwr: mean((r) => (Number.isNaN(r.falseWeaknessRate) ? 0 : r.falseWeaknessRate)),
    inversions: inv,
    irreducibleBrier: irr,
    n: total,
    pops: out,
  };
}

console.log('=== PHASE 2 STEP 2 — TRAINING 그리드 (3 replicates 평균) ===');
console.log('후보                                        | calibErr | brier | 밴드역전 | 하한brier | FMR | FWR');
const results = [];
for (const c of CANDIDATES) {
  restore();
  c.apply();
  const r = evalOn('training', [0, 1, 2]);
  results.push({ c, r });
  console.log(`${c.label.padEnd(42)} | ${fmt(r.calibErr)}   | ${fmt(r.brier)} | ${r.inversions}       | ${fmt(r.irreducibleBrier)}    | ${fmt(r.fmr)} | ${fmt(r.fwr)}`);
}
restore();

// 승자 규칙: BASELINE 대비 calibErr 의미 있게 감소 + 밴드 역전 비악화 + FWR 폭증 없음.
const base = results[0].r;
const eligible = results.slice(1).filter(({ r }) => r.calibErr < base.calibErr - 0.005 && r.inversions <= base.inversions + 1 && r.fwr <= base.fwr + 0.05);
eligible.sort((a, b) => a.r.calibErr - b.r.calibErr);
if (eligible.length === 0) {
  console.log('\n적격 후보 없음 — 튜닝 중단 (게이트 실패를 정직하게 보고)');
  process.exit(1);
}
const winner = eligible[0];
console.log(`\n승자(TRAINING): ${winner.c.label}`);

console.log('\n=== HOLDOUT 검증 — 승자 1개만, VALIDATION/STRESS 각 3 replicates ===');
for (const kind of ['validation', 'stress']) {
  restore();
  const before = evalOn(kind, [0, 1, 2]);
  restore();
  winner.c.apply();
  const after = evalOn(kind, [0, 1, 2]);
  console.log(`[${kind.toUpperCase()}]  Before: calibErr=${fmt(before.calibErr)} brier=${fmt(before.brier)} 역전=${before.inversions} 하한=${fmt(before.irreducibleBrier)}`);
  console.log(`${' '.repeat(kind.length + 2)}  After : calibErr=${fmt(after.calibErr)} brier=${fmt(after.brier)} 역전=${after.inversions} 하한=${fmt(after.irreducibleBrier)}`);
}

// STRESS 안전 확인: 전부 추측 학습자가 여전히 게이트 근처에도 못 가는가
restore();
winner.c.apply();
{
  const pop = runPopulation('stress', 0, { iterations: 300 });
  const guess = pop.perLearner.find((l) => l.name.includes('guess'));
  let maxP = 0;
  for (const id of Object.keys(guess.twin.skills)) {
    const s = guess.twin.skills[id];
    maxP = Math.max(maxP, s.alpha / (s.alpha + s.beta));
  }
  const gated = Object.values(guess.twin.skills).some((s) => ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(s.knowledgeState));
  console.log(`\n[STRESS 안전] 전부-추측 학습자: 최대 p=${fmt(maxP)} (게이트 0.85 미만이어야), 게이트 도달=${gated}`);
  if (maxP >= 0.85 || gated) {
    console.log('  ❌ 추측 방어 붕괴 — 승자 기각');
    process.exit(1);
  }
  console.log('  ✅ 추측 방어 유지');
}
restore();

console.log('\n승자 확정 — config21.ts에 수동 반영 + 버전 범프 + Phase 1 회귀 재실행 순서로 진행');
