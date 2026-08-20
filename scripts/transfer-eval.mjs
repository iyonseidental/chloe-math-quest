// PHASE 2 STEP 4 — 난이도 통제 Transfer 평가 (PART 8).
// Phase 1의 Transfer Predictive Value가 음수였던 원인: transfer 성공 직후 난이도가 상승해
// 후속 문항이 더 어려워지는 교란(confound). 재측정 설계:
//   NEAR    — transfer 직후 [같은 스킬 · 같은 난이도] 강제 후속 1문항
//   FAR     — [해당 스킬을 전제로 쓰는 하류 스킬 · 같은 난이도] 후속
//   DELAYED — [1일 후 · 같은 스킬 · 같은 난이도] 후속
// 각각에서 (transfer 통과군 후속 정답률) − (실패군 후속 정답률)을 비교한다.
// 지표 정의 자체는 유지하고(구 지표도 병기), 통제된 3종을 새 1차 지표로 보고한다.
import { runPopulation, controlledTransferValue } from './lib/simpop.mjs';

const fmt = (x, d = 3) => (Number.isNaN(x) ? 'n/a' : x.toFixed(d));

console.log('=== PHASE 2 STEP 4 — 난이도 통제 Transfer 평가 ===\n');

for (const kind of ['training', 'validation']) {
  const agg = { near: [], far: [], delayed: [] };
  let oldMetricSum = 0;
  let reps = 0;
  for (let rep = 0; rep < 3; rep++) {
    const pop = runPopulation(kind, rep, { iterations: 450 });
    for (const k of Object.keys(agg)) agg[k].push(...pop.controlled[k]);
    if (!Number.isNaN(pop.report.transferPredictiveValue)) {
      oldMetricSum += pop.report.transferPredictiveValue;
      reps++;
    }
  }
  console.log(`[${kind.toUpperCase()}] (3 replicates 합산)`);
  console.log(`  구 지표(난이도 비통제): ${reps ? fmt(oldMetricSum / reps) : 'n/a'}`);
  for (const k of ['near', 'far', 'delayed']) {
    const r = controlledTransferValue(agg[k]);
    console.log(`  ${k.toUpperCase().padEnd(7)} 통제: Δ=${fmt(r.value)}  (통과군 ${fmt(r.passRate ?? NaN, 2)} vs 실패군 ${fmt(r.failRate ?? NaN, 2)}, n=${r.nPass}/${r.nFail})`);
  }
  console.log('');
}

console.log('판정 기준: 통제된 NEAR/DELAYED Δ가 양수로 전환되면 transfer 통과가 실제 예측력을');
console.log('가진다는 뜻이고, 구 지표의 음수는 난이도 교란의 산물이었음이 입증된다.');
