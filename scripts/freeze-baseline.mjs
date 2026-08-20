// PHASE 2 PART 0 — Phase 1 baseline freeze.
// 버전 4종 + 전 스위트 결과 + 캘리브레이션 지표를 baselines/phase1-baseline.json에 고정한다.
// 이미 존재하면 덮어쓰지 않는다(--force 필요) — "freeze"의 의미 그대로.
// Phase 2의 모든 Before/After 비교는 이 파일을 Before로 삼는다.
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG21, CONFIG21_VERSION, MASTERY_MODEL_VERSION, CURRICULUM_VERSION, KNOWLEDGE_GRAPH_VERSION } from '../src/engine2/config21.ts';
import { ALL_SKILL_IDS } from '../src/engine2/curriculum21.ts';
import { runAll } from './regress-phase1.mjs';

const OUT = path.resolve('baselines/phase1-baseline.json');
const force = process.argv.includes('--force');

if (fs.existsSync(OUT) && !force) {
  console.log(`baseline already frozen at ${OUT} — 변경하려면 --force (원칙적으로 금지)`);
  process.exit(0);
}

console.log('Phase 1 전 스위트 실행 중 (baseline 채집)...');
const calibJson = path.resolve('baselines/.calib-tmp.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const { results, allPass } = runAll({ CALIB_JSON: calibJson });
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name.padEnd(22)} ${r.lastLine}`);
if (!allPass) {
  console.error('\nbaseline은 ALL PASS 상태에서만 동결한다 — 중단');
  process.exit(1);
}

const calib = JSON.parse(fs.readFileSync(calibJson, 'utf8'));
fs.rmSync(calibJson);

const baseline = {
  frozenAt: new Date().toISOString(),
  phase: 'phase1',
  versions: {
    config: CONFIG21_VERSION,
    masteryModel: MASTERY_MODEL_VERSION,
    curriculum: CURRICULUM_VERSION,
    knowledgeGraph: KNOWLEDGE_GRAPH_VERSION,
  },
  knowledgeGraph: { skillCount: ALL_SKILL_IDS.length, skills: ALL_SKILL_IDS },
  // 재계산 감사용: 당시 계수 전체 스냅숏 (config21이 바뀌어도 baseline은 그대로 남는다)
  configSnapshot: CONFIG21,
  suites: Object.fromEntries(results.map((r) => [r.name, { pass: r.ok, summary: r.lastLine }])),
  calibration: calib.report,
};

fs.writeFileSync(OUT, JSON.stringify(baseline, null, 2));
console.log(`\n✅ Phase 1 baseline frozen → ${OUT}`);
console.log(`   versions: config=${CONFIG21_VERSION} mastery=${MASTERY_MODEL_VERSION} graph=${KNOWLEDGE_GRAPH_VERSION}`);
console.log(`   calibration(Before): error=${calib.report.calibrationError.toFixed(3)} brier=${calib.report.brierScore.toFixed(3)} misRecall=${calib.report.misconceptionRecall.toFixed(3)} probeYield=${calib.report.probeYield.toFixed(3)} FMR=${calib.report.falseMasteryRate} TPV=${calib.report.transferPredictiveValue.toFixed(3)}`);
