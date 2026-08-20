// PHASE 3 STEP 0 — v2.2 baseline freeze (PART 2).
// Phase 1 회귀 + Phase 2 스위트(그래프/전체M1/ELITE QA/L~R) 결과 + 버전 4종 +
// config 전체 스냅숏 + Phase 2 확정 지표를 baselines/phase2-baseline.json에 고정한다.
// 이미 존재하면 덮어쓰지 않는다(--force 필요). Phase 3의 모든 비교는 이 파일이 Before다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CONFIG21, CONFIG21_VERSION, MASTERY_MODEL_VERSION, CURRICULUM_VERSION, KNOWLEDGE_GRAPH_VERSION } from '../src/engine2/config21.ts';
import { ALL_SKILL_IDS, MISCONCEPTION_LIBRARY, edgesOf } from '../src/engine2/curriculum21.ts';
import { ELITE_BANK } from '../src/engine2/eliteBank22.ts';
import { runAll } from './regress-phase1.mjs';

const OUT = path.resolve('baselines/phase2-baseline.json');
const force = process.argv.includes('--force');

if (fs.existsSync(OUT) && !force) {
  console.log(`baseline already frozen at ${OUT} — 변경하려면 --force (원칙적으로 금지)`);
  process.exit(0);
}

console.log('[1/2] Phase 1 회귀 14스위트 실행...');
const calibJson = path.resolve('baselines/.calib22-tmp.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const { results, allPass } = runAll({ CALIB_JSON: calibJson });
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name.padEnd(22)} ${r.lastLine}`);
if (!allPass) {
  console.error('\nbaseline은 ALL PASS 상태에서만 동결한다 — 중단');
  process.exit(1);
}
const calib = JSON.parse(fs.readFileSync(calibJson, 'utf8'));
fs.rmSync(calibJson);

console.log('[2/2] Phase 2 스위트 4종 실행...');
const phase2Suites = {};
for (const name of ['test22-graph', 'test22-m1full', 'test22-elite', 'simulate22-elite']) {
  let ok = true;
  let last = '';
  try {
    const out = execFileSync(process.execPath, [`scripts/${name}.mjs`], { encoding: 'utf8', timeout: 600_000 });
    last = out.trim().split('\n').at(-1);
  } catch (e) {
    ok = false;
    last = String(e.stdout ?? e.message).trim().split('\n').at(-1);
  }
  phase2Suites[name] = { pass: ok, summary: last };
  console.log(`${ok ? '✅' : '❌'} ${name.padEnd(22)} ${last}`);
  if (!ok) {
    console.error('\nbaseline은 ALL PASS 상태에서만 동결한다 — 중단');
    process.exit(1);
  }
}

const edges = ALL_SKILL_IDS.flatMap((id) => edgesOf(id).map((e) => ({ ...e, to: id })));
const baseline = {
  frozenAt: new Date().toISOString(),
  phase: 'phase2',
  versions: {
    config: CONFIG21_VERSION,
    masteryModel: MASTERY_MODEL_VERSION,
    curriculum: CURRICULUM_VERSION,
    knowledgeGraph: KNOWLEDGE_GRAPH_VERSION,
  },
  knowledgeGraph: {
    skillCount: ALL_SKILL_IDS.length,
    edgeCount: edges.length,
    edgeStrengths: {
      REQUIRED: edges.filter((e) => e.strength === 'REQUIRED').length,
      STRONGLY_SUPPORTIVE: edges.filter((e) => e.strength === 'STRONGLY_SUPPORTIVE').length,
      SUPPORTIVE: edges.filter((e) => e.strength === 'SUPPORTIVE').length,
    },
    skills: ALL_SKILL_IDS,
  },
  misconceptionLibrary: {
    total: MISCONCEPTION_LIBRARY.length,
    tagged: MISCONCEPTION_LIBRARY.filter((m) => m.diagnosticDifficulty != null).length,
    ids: MISCONCEPTION_LIBRARY.map((m) => m.id),
  },
  eliteBank: {
    mainProblems: ELITE_BANK.length,
    followUps: ELITE_BANK.reduce((a, p) => a + p.followUps.length, 0),
    modes: Object.fromEntries(ELITE_BANK.reduce((m, p) => m.set(p.mode, (m.get(p.mode) ?? 0) + 1), new Map())),
  },
  configSnapshot: CONFIG21,
  suites: Object.fromEntries(results.map((r) => [r.name, { pass: r.ok, summary: r.lastLine }])),
  phase2Suites,
  calibration: calib.report,
  // Phase 2 리포트에서 확정된 지표 (해당 스크립트 재실행으로 재현 가능; 여기 고정해 비교 기준으로 삼음)
  phase2Metrics: {
    calibrationErrorValidation: { before21: 0.123, after22: 0.087 },
    brierAtoK: { before21: 0.219, after22: 0.195 },
    falseMasteryAtoK: { before21: 0.125, after22: 0.045 },
    misconceptionPR_validation: { before21: { p: 0.618, r: 0.7 }, after22: { p: 0.867, r: 0.867 } },
    rootCauseBenchmark: { hit: 0.736, probeYield: 0.434, probeDifficulty: 3, trialsPerConfig: 276 },
    transferDelta_validation: { near: 0.099, far: 0.079, delayed: 0.094 },
    totalAssertions: 740,
  },
};

fs.writeFileSync(OUT, JSON.stringify(baseline, null, 2));
console.log(`\n✅ Phase 2 (v2.2) baseline frozen → ${OUT}`);
console.log(`   versions: config=${CONFIG21_VERSION} mastery=${MASTERY_MODEL_VERSION} curriculum=${CURRICULUM_VERSION} graph=${KNOWLEDGE_GRAPH_VERSION}`);
