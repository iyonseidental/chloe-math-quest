// PHASE 3 STEP 4 — Root Cause Benchmark 2.0 (PART 10).
// 기존 9유형 유지 + 신규 6유형. KPI: Hit / Wrong Attribution / No-Case / 미확정 /
// Probe Count / Median Probe Cost / Broad Remediation Rate(신설).
// Before/After: 경계선 직교 방어 OFF(=2.2 동작, borderline.maxConfirm=0) vs ON(2.3).
import { CONFIG21 } from '../src/engine2/config21.ts';
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitMicroLessonAck, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog } from '../src/engine2/events21.ts';
import { predictSuccess } from '../src/engine2/mastery21.ts';
import { prerequisitesOf } from '../src/engine2/curriculum21.ts';
import { makeRng, BASE_TS, dstr } from './lib/simpop.mjs';

const fmt = (x, d = 3) => (Number.isNaN(x) || !Number.isFinite(x) ? 'n/a' : x.toFixed(d));

const POSITIONS = [
  { target: 'M1.ALG.EQ.02', direct: ['M1.ALG.EQ.01', 'M1.ALG.EXP.02', 'M1.NUM.FRAC.01'], deep: 'M1.NUM.SIGN.01' },
  { target: 'M1.ALG.EQ.01', direct: ['M1.ALG.EXP.01', 'M1.NUM.SIGN.01'], deep: null },
  { target: 'M1.FUN.COORD.02', direct: ['M1.FUN.COORD.01', 'M1.ALG.EXP.01'], deep: 'M1.NUM.SIGN.01' },
  // Benchmark 2.0: 원거리(깊이 2) 전제에 오개념을 심을 수 있는 위치
  { target: 'M1.ALG.EQ.03', direct: ['M1.ALG.EQ.01', 'M1.ALG.EQ.02', 'M1.ALG.EXP.01'], deep: 'M1.NUM.FRAC.01' },
];

function transitivePrereqs(skillId, seen = new Set()) {
  for (const p of prerequisitesOf(skillId)) {
    if (!seen.has(p)) {
      seen.add(p);
      transitivePrereqs(p, seen);
    }
  }
  return seen;
}

function pickWrongIndex(p, rng, misId) {
  if (misId) {
    const t = p.choices.findIndex((ch, i) => i !== p.answerIndex && ch.misconceptionId === misId);
    if (t >= 0) return t;
  }
  const w = p.choices.map((ch, i) => i).filter((i) => i !== p.answerIndex);
  return w[Math.floor(rng() * w.length)];
}

function seedSkill(state, skillId, correctRate, n, rng, misId = null) {
  for (let i = 0; i < n; i++) {
    if (i > 0 && i % 3 === 0) {
      const filler = { kind: 'diagnostic', skillId: 'M1.NUM.SIGN.02', difficulty: 3, variant: 'standard', reason: 'fill' };
      const fp = buildProblemForAction(filler);
      const fr = submitAttempt(state.twin, state.log, filler, fp, { chosenIndex: fp.answerIndex, solveTimeSec: fp.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 1000));
      state.twin = fr.twin;
      state.log = fr.log;
    }
    const a = { kind: 'diagnostic', skillId, difficulty: 3, variant: 'standard', reason: 'seed' };
    const p = buildProblemForAction(a);
    const correct = rng() < correctRate;
    const idx = correct ? p.answerIndex : pickWrongIndex(p, rng, misId);
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: idx, solveTimeSec: p.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
}

const ALL10 = ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02', 'M1.NUM.FRAC.01', 'M1.ALG.EXP.01', 'M1.ALG.EXP.02', 'M1.ALG.EQ.01', 'M1.ALG.EQ.02', 'M1.ALG.EQ.03', 'M1.FUN.COORD.01', 'M1.FUN.COORD.02'];

// ---- 유형 정의 -------------------------------------------------------------
// c: ability(은닉 실력) / seedPlan {skillId, rate, n, misId} / wrongTag / expected /
//    expectNoCase / ninetyDaysStale / probeCareless(강한 후보의 프로브 부주의율) / misHolder
function buildCase(type, pos, rng) {
  const strong = 0.92;
  const weak = 0.12;
  const border = 0.55;
  const ability = {};
  for (const id of ALL10) ability[id] = strong;
  const c = { type, pos, ability, seedPlan: [], wrongTag: 'CONCEPT_GAP', expected: null, expectNoCase: false, ninetyDaysStale: null, probeCareless: 0, misHolder: null };
  const direct0 = pos.direct[0];
  const seedStrongOthers = (except) => pos.direct.filter((d) => !except.includes(d)).map((d) => ({ skillId: d, rate: 1, n: 30 }));

  switch (type) {
    // ===== 기존 9유형 (2.2 벤치마크 유지) =====
    case 'single-gap':
      c.ability[direct0] = weak;
      c.seedPlan = seedStrongOthers([direct0]);
      c.expected = [direct0];
      break;
    case 'two-competing': {
      const d2 = pos.direct[1];
      c.ability[direct0] = weak;
      c.ability[d2] = weak;
      c.seedPlan = seedStrongOthers([direct0, d2]);
      c.expected = [direct0, d2];
      break;
    }
    case 'old-forgotten':
      c.ability[direct0] = 0.3;
      c.seedPlan = [{ skillId: direct0, rate: 1, n: 30 }, ...seedStrongOthers([direct0])];
      c.ninetyDaysStale = direct0;
      c.expected = [direct0];
      break;
    case 'current-concept':
      c.seedPlan = seedStrongOthers([]);
      c.expected = [pos.target];
      break;
    case 'careless-masquerade':
      c.seedPlan = seedStrongOthers([]);
      c.wrongTag = 'CARELESS_ERROR';
      c.expectNoCase = true;
      c.expected = [pos.target];
      break;
    case 'mis-in-prereq':
      c.ability[direct0] = 0.35;
      c.seedPlan = seedStrongOthers([direct0]);
      c.expected = [direct0];
      break;
    case 'unknown-skill':
      c.ability[direct0] = weak;
      c.seedPlan = seedStrongOthers([direct0]);
      c.expected = [direct0];
      break;
    case 'accidental-probe-fail':
      c.seedPlan = pos.direct.map((d) => ({ skillId: d, rate: 1, n: 10 }));
      c.expected = [pos.target];
      break;
    case 'cross-unit': {
      if (!pos.deep || pos.target === 'M1.ALG.EQ.03') return null;
      c.ability[pos.deep] = weak;
      if (pos.target === 'M1.ALG.EQ.02') c.ability['M1.NUM.FRAC.01'] = 0.4;
      c.seedPlan = pos.direct.map((d) => ({ skillId: d, rate: 1, n: d === 'M1.NUM.FRAC.01' || pos.direct.indexOf(d) === 0 ? 0 : 30 }));
      c.expected = [pos.deep, ...(pos.target === 'M1.ALG.EQ.02' ? ['M1.NUM.FRAC.01'] : [pos.direct[0]])];
      break;
    }

    // ===== Benchmark 2.0 신규 6유형 (PART 10) =====
    case 'borderline-lucky': {
      // 경계선 실력(0.55) 전제 — 단일 d3 프로브를 ~60% 확률로 요행 통과. 혼합 시딩으로
      // stability를 낮게 만들어 고위험 판정이 가능하게 한다. 직교 방어의 표적 유형.
      c.ability[direct0] = border;
      c.seedPlan = [{ skillId: direct0, rate: 0.55, n: 14 }, ...seedStrongOthers([direct0])];
      c.expected = [direct0];
      break;
    }
    case 'two-borderline': {
      // 두 전제가 모두 경계선 — 어느 쪽이든 root로 잡으면 hit
      const d2 = pos.direct[1];
      c.ability[direct0] = border;
      c.ability[d2] = border;
      c.seedPlan = [{ skillId: direct0, rate: 0.55, n: 14 }, { skillId: d2, rate: 0.55, n: 14 }, ...seedStrongOthers([direct0, d2])];
      c.expected = [direct0, d2];
      break;
    }
    case 'cross-unit-micro': {
      // 단원 너머 심층 전제의 '미시적' 결손(0.45 — 파국적 0.12가 아님)
      if (!pos.deep || pos.target === 'M1.ALG.EQ.03') return null;
      c.ability[pos.deep] = 0.45;
      if (pos.target === 'M1.ALG.EQ.02') c.ability['M1.NUM.FRAC.01'] = 0.45;
      c.seedPlan = pos.direct.map((d) => ({ skillId: d, rate: 1, n: d === 'M1.NUM.FRAC.01' || pos.direct.indexOf(d) === 0 ? 0 : 30 }));
      c.expected = [pos.deep, ...(pos.target === 'M1.ALG.EQ.02' ? ['M1.NUM.FRAC.01'] : [pos.direct[0]])];
      break;
    }
    case 'mis-in-distant-prereq': {
      // 깊이 2 전제(FRAC.01)에 오개념 보유 + 실력 저하 — EQ.03 표적에서만 구성
      if (pos.target !== 'M1.ALG.EQ.03') return null;
      c.ability['M1.NUM.FRAC.01'] = 0.35;
      c.ability['M1.ALG.EQ.02'] = 0.5; // 경로가 실제로 흔들려야 하강 가능
      c.misHolder = { skillId: 'M1.NUM.FRAC.01', misId: 'MIS.FRAC.ADDDEN' };
      c.seedPlan = [
        { skillId: 'M1.NUM.FRAC.01', rate: 0.4, n: 10, misId: 'MIS.FRAC.ADDDEN' },
        { skillId: 'M1.ALG.EQ.01', rate: 1, n: 30 },
        { skillId: 'M1.ALG.EXP.01', rate: 1, n: 30 },
      ];
      c.expected = ['M1.NUM.FRAC.01', 'M1.ALG.EQ.02'];
      break;
    }
    case 'strong-careless-probe': {
      // 전제 전부 실제로 강함 — 그러나 프로브에서 30% 부주의 오답. AC11 재확인이 걸러내야 한다.
      c.seedPlan = pos.direct.map((d) => ({ skillId: d, rate: 1, n: 10 }));
      c.probeCareless = 0.3;
      c.expected = [pos.target];
      break;
    }
    case 'unknown-lucky': {
      // 완전 미접촉(UNSEEN) + 실제로는 중간 이하(0.4) — 첫 프로브 요행 통과를 직교가 벗겨야 한다
      c.ability[direct0] = 0.4;
      c.seedPlan = seedStrongOthers([direct0]);
      c.expected = [direct0];
      break;
    }
  }
  return c;
}

const TYPES_LEGACY = ['single-gap', 'two-competing', 'old-forgotten', 'current-concept', 'careless-masquerade', 'mis-in-prereq', 'unknown-skill', 'accidental-probe-fail', 'cross-unit'];
const TYPES_NEW = ['borderline-lucky', 'two-borderline', 'cross-unit-micro', 'mis-in-distant-prereq', 'strong-careless-probe', 'unknown-lucky'];

function runTrial(c, seed) {
  const rng = makeRng(seed);
  const state = { twin: freshTwin21(`rb2-${seed}`), log: emptyLog(), ts: BASE_TS };
  for (const s of c.seedPlan) if (s.n > 0) seedSkill(state, s.skillId, s.rate, s.n, rng, s.misId ?? null);
  if (c.ninetyDaysStale) state.ts += 90 * 86400000;

  for (let i = 0; i < 2; i++) {
    const a = { kind: 'normal', skillId: c.pos.target, difficulty: 4, variant: 'standard', reason: 'rb2' };
    let p = buildProblemForAction(a);
    let idx = -1;
    for (let t2 = 0; t2 < 12 && idx < 0; t2++) {
      if (t2 > 0) p = buildProblemForAction(a);
      idx = p.choices.findIndex((ch, i2) => i2 !== p.answerIndex && ch.errorType === c.wrongTag);
    }
    if (idx < 0) idx = pickWrongIndex(p, rng, null);
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: idx, solveTimeSec: p.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }

  let probes = 0;
  let probeFails = 0;
  let guard = 0;
  while (guard++ < 50) {
    const kase0 = state.twin.remediationCases.find((k) => k.targetSkillId === c.pos.target);
    if (kase0 && kase0.stage !== 'investigating') break;
    if (!kase0 && guard > 3) break;
    const act = nextAction(state.twin, dstr(state.ts));
    if (act.kind === 'micro-lesson') {
      const rr = submitMicroLessonAck(state.twin, state.log, act, (state.ts += 45000));
      state.twin = rr.twin;
      state.log = rr.log;
      continue;
    }
    const p = buildProblemForAction(act);
    const sp = predictSuccess(c.ability[act.skillId] ?? 0.9, act.difficulty);
    let correct = rng() < sp;
    let misPick = null;
    let carelessPick = false;
    if (act.kind === 'probe') {
      probes++;
      // strong-careless-probe: 실력과 무관한 부주의 오답 주입 — 부주의 학생은 정답 근처의
      // CARELESS 오답(근사값)을 고른다
      if (correct && c.probeCareless > 0 && rng() < c.probeCareless) {
        correct = false;
        carelessPick = true;
      }
      if (!correct) probeFails++;
    }
    if (!correct && c.misHolder && act.skillId === c.misHolder.skillId) misPick = c.misHolder.misId;
    let idx;
    if (correct) idx = p.answerIndex;
    else if (carelessPick) {
      const ci = p.choices.findIndex((ch, i2) => i2 !== p.answerIndex && ch.errorType === 'CARELESS_ERROR');
      idx = ci >= 0 ? ci : pickWrongIndex(p, rng, null);
    } else idx = pickWrongIndex(p, rng, misPick);
    const r = submitAttempt(state.twin, state.log, act, p, { chosenIndex: idx, solveTimeSec: p.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }

  const kase = state.twin.remediationCases.find((k) => k.targetSkillId === c.pos.target);
  return { root: kase?.rootCauseSkillId ?? null, hadCase: !!kase, probes, probeFails };
}

function classify(c, r) {
  if (c.expectNoCase) {
    if (!r.hadCase) return 'no-case(정답)';
    return c.expected.includes(r.root) ? 'target귀결(차선)' : '오귀속';
  }
  if (!r.hadCase || r.root === null) return '미확정';
  if (c.expected.includes(r.root)) return 'HIT';
  if (r.root === c.pos.target) return 'target귀결';
  return '오귀속';
}

// Broad Remediation: 진단된 root가 참결손보다 "더 아래"(참결손의 전제 사슬 내부) —
// 학생이 이미 아는 하부 기초까지 불필요하게 복습시키는 방향의 오귀속.
function isBroad(c, r) {
  if (!r.hadCase || r.root === null || c.expected.includes(r.root)) return false;
  const below = new Set();
  for (const e of c.expected) for (const p of transitivePrereqs(e)) below.add(p);
  return below.has(r.root);
}

function runBench(label, types) {
  console.log(`\n=== ${label} ===`);
  const matrix = {};
  const probeCounts = [];
  let totalProbes = 0;
  let totalFails = 0;
  let broad = 0;
  let broadDen = 0;
  const N = 12;
  for (const type of types) {
    matrix[type] = {};
    for (const pos of POSITIONS) {
      for (let i = 0; i < N; i++) {
        const c = buildCase(type, pos, makeRng(7000 + i));
        if (!c) continue;
        const r = runTrial(c, 40000 + types.indexOf(type) * 5000 + POSITIONS.indexOf(pos) * 700 + i * 17);
        totalProbes += r.probes;
        totalFails += r.probeFails;
        probeCounts.push(r.probes);
        if (r.hadCase && r.root !== null) {
          broadDen++;
          if (isBroad(c, r)) broad++;
        }
        const cls = classify(c, r);
        matrix[type][cls] = (matrix[type][cls] ?? 0) + 1;
      }
    }
  }
  let hitSum = 0;
  let hitDen = 0;
  let wrongSum = 0;
  let noCaseOk = 0;
  let trials = 0;
  for (const type of types) {
    const row = matrix[type];
    const total = Object.values(row).reduce((a, b) => a + b, 0);
    trials += total;
    wrongSum += row['오귀속'] ?? 0;
    noCaseOk += row['no-case(정답)'] ?? 0;
    if (type !== 'careless-masquerade') {
      hitSum += row['HIT'] ?? 0;
      hitDen += total - (row['no-case(정답)'] ?? 0);
    }
    console.log(`  ${type.padEnd(24)} | ${Object.entries(row).map(([k, v]) => `${k}:${v}`).join('  ')}  (n=${total})`);
  }
  probeCounts.sort((a, b) => a - b);
  const medianProbes = probeCounts.length ? probeCounts[Math.floor(probeCounts.length / 2)] : NaN;
  const kpi = {
    hit: hitSum / hitDen,
    wrongAttribution: wrongSum / trials,
    noCaseRate: noCaseOk / trials,
    avgProbes: totalProbes / trials,
    medianProbes,
    probeYield: totalProbes ? totalFails / totalProbes : NaN,
    broadRemediationRate: broadDen ? broad / broadDen : 0,
    trials,
  };
  console.log(`  KPI: Hit=${fmt(kpi.hit)}  WrongAttr=${fmt(kpi.wrongAttribution)}  BroadRemediation=${fmt(kpi.broadRemediationRate)} (${broad}/${broadDen})`);
  console.log(`       Probes avg=${fmt(kpi.avgProbes, 2)} median=${medianProbes}  Yield=${fmt(kpi.probeYield)}  (trials=${trials})`);
  return kpi;
}

// ---- Before(2.2: 직교 방어 OFF) vs After(2.3: ON) — 신규 6유형에서 비교 ----
const savedMax = CONFIG21.rootCause.borderline.maxConfirm;
CONFIG21.rootCause.borderline.maxConfirm = 0;
const beforeNew = runBench('신규 6유형 — BEFORE (2.2 동작, 직교 방어 OFF)', TYPES_NEW);
CONFIG21.rootCause.borderline.maxConfirm = savedMax;
const afterNew = runBench('신규 6유형 — AFTER (2.3, 직교 방어 ON)', TYPES_NEW);
const legacy = runBench('기존 9유형 — 2.3 전체 구성', TYPES_LEGACY);

console.log('\n=== 결론 ===');
console.log(`신규 유형 Hit: ${fmt(beforeNew.hit)} → ${fmt(afterNew.hit)} (직교 방어 효과)`);
console.log(`신규 유형 WrongAttr: ${fmt(beforeNew.wrongAttribution)} → ${fmt(afterNew.wrongAttribution)}`);
console.log(`신규 유형 BroadRemediation: ${fmt(beforeNew.broadRemediationRate)} → ${fmt(afterNew.broadRemediationRate)}`);
console.log(`프로브 비용(중앙값): ${beforeNew.medianProbes} → ${afterNew.medianProbes} (부담 상한 유지 확인)`);
console.log(`기존 9유형 Hit(2.3): ${fmt(legacy.hit)} (2.2 baseline: 0.736)`);

export const RESULT = { beforeNew, afterNew, legacy };
