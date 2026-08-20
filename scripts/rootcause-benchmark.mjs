// PHASE 2 STEP 5 — Root Cause 벤치마크 (PART 7).
// 목표: 단순 PASS가 아니라 confusion matrix. 9개 케이스 유형 × 그래프 위치 × 반복 시드.
// 각 트라이얼: 유형에 맞게 트윈을 시딩 → 표적 스킬에서 CONCEPT_GAP 2연속 오답으로 조사
// 촉발 → 프로브는 각 스킬의 은닉 실력으로 확률 응답 → 엔진이 확정한 root를 정답과 대조.
// 프로브 난이도 d2(2.1) vs d3(2.2 후보)도 여기서 비교해 확정한다.
import { CONFIG21 } from '../src/engine2/config21.ts';
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitMicroLessonAck, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog } from '../src/engine2/events21.ts';
import { predictSuccess } from '../src/engine2/mastery21.ts';
import { makeRng, BASE_TS, dstr } from './lib/simpop.mjs';

const fmt = (x, d = 3) => (Number.isNaN(x) ? 'n/a' : x.toFixed(d));

// 그래프 위치(표적/직계전제/심층전제) — 파일럿 그래프의 서로 다른 사슬 3곳
const POSITIONS = [
  { target: 'M1.ALG.EQ.02', direct: ['M1.ALG.EQ.01', 'M1.ALG.EXP.02', 'M1.NUM.FRAC.01'], deep: 'M1.NUM.SIGN.01' },
  { target: 'M1.ALG.EQ.01', direct: ['M1.ALG.EXP.01', 'M1.NUM.SIGN.01'], deep: null },
  { target: 'M1.FUN.COORD.02', direct: ['M1.FUN.COORD.01', 'M1.ALG.EXP.01'], deep: 'M1.NUM.SIGN.01' },
];

function seedSkill(state, skillId, correct, n, ts) {
  for (let i = 0; i < n; i++) {
    if (i > 0 && i % 3 === 0) {
      // 다양성 방어 회피 필러 (그래프 판정과 무관한 스킬)
      const filler = { kind: 'diagnostic', skillId: 'M1.NUM.SIGN.02', difficulty: 3, variant: 'standard', reason: 'fill' };
      const fp = buildProblemForAction(filler);
      const fr = submitAttempt(state.twin, state.log, filler, fp, { chosenIndex: fp.answerIndex, solveTimeSec: fp.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 1000));
      state.twin = fr.twin;
      state.log = fr.log;
    }
    const a = { kind: 'diagnostic', skillId, difficulty: 3, variant: 'standard', reason: 'seed' };
    const p = buildProblemForAction(a);
    const idx = correct ? p.answerIndex : (p.answerIndex + 1) % p.choices.length;
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: idx, solveTimeSec: p.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
}

// 케이스 유형 정의: setup(트윈 시딩) + trueAbility(프로브 응답용 은닉 실력) + expected(정답 판정)
function buildCase(type, pos, rng) {
  const strong = 0.92;
  const weak = 0.12;
  const ability = {};
  for (const id of ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02', 'M1.NUM.FRAC.01', 'M1.ALG.EXP.01', 'M1.ALG.EXP.02', 'M1.ALG.EQ.01', 'M1.ALG.EQ.02', 'M1.ALG.EQ.03', 'M1.FUN.COORD.01', 'M1.FUN.COORD.02']) ability[id] = strong;

  const c = { type, pos, ability, seedPlan: [], wrongTag: 'CONCEPT_GAP', expected: null, expectNoCase: false, ninetyDaysStale: null };
  const direct0 = pos.direct[0];

  switch (type) {
    case 'single-gap': // 직계 전제 1개만 미시적 결손
      c.ability[direct0] = weak;
      c.seedPlan = pos.direct.filter((d) => d !== direct0).map((d) => ({ skillId: d, correct: true, n: 30 }));
      c.expected = [direct0];
      break;
    case 'two-competing': { // 직계 전제 2개가 경쟁적으로 약함 — 어느 쪽이든 root면 hit
      const d2 = pos.direct[1];
      c.ability[direct0] = weak;
      c.ability[d2] = weak;
      c.seedPlan = pos.direct.filter((d) => d !== direct0 && d !== d2).map((d) => ({ skillId: d, correct: true, n: 30 }));
      c.expected = [direct0, d2];
      break;
    }
    case 'old-forgotten': // 오래전 강했지만 90일 방치 — 지금은 실제로 잊음
      c.ability[direct0] = 0.3;
      c.seedPlan = [{ skillId: direct0, correct: true, n: 30 }, ...pos.direct.filter((d) => d !== direct0).map((d) => ({ skillId: d, correct: true, n: 30 }))];
      c.ninetyDaysStale = direct0;
      c.expected = [direct0];
      break;
    case 'current-concept': // 전제 전부 튼튼 — 원인은 표적 개념 자체
      c.seedPlan = pos.direct.map((d) => ({ skillId: d, correct: true, n: 30 }));
      c.expected = [pos.target];
      break;
    case 'careless-masquerade': // 표적도 실력 있음 — CARELESS 연발 (조사 자체가 안 열려야 최선)
      c.seedPlan = pos.direct.map((d) => ({ skillId: d, correct: true, n: 30 }));
      c.wrongTag = 'CARELESS_ERROR';
      c.expectNoCase = true;
      c.expected = [pos.target]; // 케이스가 열렸다면 표적 귀결이 차선
      break;
    case 'mis-in-prereq': // 전제에 오개념 (실력도 낮음)
      c.ability[direct0] = 0.35;
      c.seedPlan = pos.direct.filter((d) => d !== direct0).map((d) => ({ skillId: d, correct: true, n: 30 }));
      c.expected = [direct0];
      break;
    case 'unknown-skill': // 전제 하나가 완전 미접촉(UNSEEN)이고 실제로 약함
      c.ability[direct0] = weak;
      c.seedPlan = pos.direct.filter((d) => d !== direct0).map((d) => ({ skillId: d, correct: true, n: 30 }));
      c.expected = [direct0];
      break;
    case 'accidental-probe-fail': // 전제 전부 실제로 강함 — 프로브 요행 실패는 AC11 재확인으로 걸러져야
      c.seedPlan = pos.direct.map((d) => ({ skillId: d, correct: true, n: 10 })); // 약한 시딩 → UNKNOWN/SHAKY로 프로브 대상
      c.expected = [pos.target];
      break;
    case 'cross-unit': { // 단원 경계 너머 심층 전제 (NUM ← ALG/FUN)
      if (!pos.deep) return null;
      c.ability[pos.deep] = weak;
      if (pos.target === 'M1.ALG.EQ.02') c.ability['M1.NUM.FRAC.01'] = 0.4; // 경로가 실제로 흔들려야 하강 가능
      c.seedPlan = pos.direct.map((d) => ({ skillId: d, correct: true, n: d === 'M1.NUM.FRAC.01' || pos.direct.indexOf(d) === 0 ? 0 : 30 }));
      c.expected = [pos.deep, ...(pos.target === 'M1.ALG.EQ.02' ? ['M1.NUM.FRAC.01'] : [pos.direct[0]])];
      break;
    }
  }
  return c;
}

const TYPES = ['single-gap', 'two-competing', 'old-forgotten', 'current-concept', 'careless-masquerade', 'mis-in-prereq', 'unknown-skill', 'accidental-probe-fail', 'cross-unit'];

function runTrial(c, seed) {
  const rng = makeRng(seed);
  const state = { twin: freshTwin21(`rb-${seed}`), log: emptyLog(), ts: BASE_TS };
  for (const s of c.seedPlan) if (s.n > 0) seedSkill(state, s.skillId, s.correct, s.n);
  // 90일 방치 시뮬: 시딩 후 시계를 90일 미래로 (감쇠는 읽기 시점에 lazily 적용됨)
  if (c.ninetyDaysStale) state.ts += 90 * 86400000;

  // 표적 실패 2연속 (careless 유형은 CARELESS 태그로)
  for (let i = 0; i < 2; i++) {
    const a = { kind: 'normal', skillId: c.pos.target, difficulty: 4, variant: 'standard', reason: 'rb' };
    let p = buildProblemForAction(a);
    let idx = -1;
    for (let t2 = 0; t2 < 12 && idx < 0; t2++) {
      if (t2 > 0) p = buildProblemForAction(a);
      idx = p.choices.findIndex((ch, i2) => i2 !== p.answerIndex && ch.errorType === c.wrongTag);
    }
    if (idx < 0) {
      const w = p.choices.map((ch, i2) => i2).filter((i2) => i2 !== p.answerIndex);
      idx = w[Math.floor(rng() * w.length)];
    }
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: idx, solveTimeSec: p.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }

  // 프로브/확인 구동 — 각 스킬의 은닉 실력으로 확률 응답.
  // 연속 프로브 가드가 사이에 일반 문항을 끼워 넣으면 그것도 수행하고 계속한다 —
  // 실엔진은 조사를 이후 재개하므로, 여기서 끊으면 '미확정'을 하네스가 만들어낸다.
  let probes = 0;
  let probeFails = 0;
  let guard = 0;
  while (guard++ < 40) {
    const kase0 = state.twin.remediationCases.find((k) => k.targetSkillId === c.pos.target);
    if (kase0 && kase0.stage !== 'investigating') break; // 조사 종결(치료 진입)
    if (!kase0 && guard > 3) break;
    const act = nextAction(state.twin, dstr(state.ts));
    if (act.kind === 'micro-lesson') {
      const rr = submitMicroLessonAck(state.twin, state.log, act, (state.ts += 45000));
      state.twin = rr.twin;
      state.log = rr.log;
      continue;
    }
    let p = buildProblemForAction(act);
    const sp = predictSuccess(c.ability[act.skillId] ?? 0.9, act.difficulty);
    const correct = rng() < sp;
    if (act.kind === 'probe') {
      probes++;
      if (!correct) probeFails++;
    }
    let idx;
    if (correct) idx = p.answerIndex;
    else {
      const w = p.choices.map((ch, i2) => i2).filter((i2) => i2 !== p.answerIndex);
      idx = w[Math.floor(rng() * w.length)];
    }
    const r = submitAttempt(state.twin, state.log, act, p, { chosenIndex: idx, solveTimeSec: p.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }

  const kase = state.twin.remediationCases.find((k) => k.targetSkillId === c.pos.target);
  const root = kase?.rootCauseSkillId ?? null;
  return { root, hadCase: !!kase, probes, probeFails };
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

function runBench(label) {
  console.log(`\n=== ${label} (probeDifficulty=${CONFIG21.rootCause.probeDifficulty}) ===`);
  const matrix = {};
  let totalProbes = 0;
  let totalFails = 0;
  const N = 12; // 유형×위치당 시드 수
  for (const type of TYPES) {
    matrix[type] = {};
    for (const pos of POSITIONS) {
      for (let i = 0; i < N; i++) {
        const c = buildCase(type, pos, makeRng(7000 + i));
        if (!c) continue;
        const r = runTrial(c, 30000 + TYPES.indexOf(type) * 5000 + POSITIONS.indexOf(pos) * 500 + i * 17);
        totalProbes += r.probes;
        totalFails += r.probeFails;
        const cls = classify(c, r);
        matrix[type][cls] = (matrix[type][cls] ?? 0) + 1;
      }
    }
  }
  let hitSum = 0;
  let hitDen = 0;
  console.log('유형                    | 결과 분포');
  for (const type of TYPES) {
    const row = matrix[type];
    const total = Object.values(row).reduce((a, b) => a + b, 0);
    const good = (row['HIT'] ?? 0) + (row['no-case(정답)'] ?? 0) + (type === 'current-concept' || type === 'accidental-probe-fail' ? 0 : 0);
    if (type !== 'careless-masquerade') {
      hitSum += row['HIT'] ?? 0;
      hitDen += total - (row['no-case(정답)'] ?? 0);
    }
    console.log(`  ${type.padEnd(22)} | ${Object.entries(row).map(([k, v]) => `${k}:${v}`).join('  ')}  (n=${total}, 정답률 ${fmt(good / total, 2)})`);
  }
  const yieldRate = totalProbes ? totalFails / totalProbes : NaN;
  console.log(`  종합 Hit Rate(careless 제외): ${fmt(hitSum / hitDen)}  (n=${hitDen})`);
  console.log(`  Probe Yield: ${fmt(yieldRate)}  (프로브 ${totalProbes}회 중 실패 ${totalFails})`);
  return { hit: hitSum / hitDen, yieldRate, matrix };
}

// d2 (2.1 방식) vs d3 (2.2 후보) 비교
CONFIG21.rootCause.probeDifficulty = 2;
const r2 = runBench('프로브 d2 (2.1 방식)');
CONFIG21.rootCause.probeDifficulty = 3;
const r3 = runBench('프로브 d3 (2.2 후보)');

console.log('\n=== 결론 ===');
console.log(`Hit Rate: d2=${fmt(r2.hit)} → d3=${fmt(r3.hit)}`);
console.log(`Probe Yield: d2=${fmt(r2.yieldRate)} → d3=${fmt(r3.yieldRate)} (건강 밴드 0.2~0.6)`);
const adopt = r3.hit >= r2.hit - 0.02 && Math.abs(r3.yieldRate - 0.4) < Math.abs(r2.yieldRate - 0.4);
console.log(adopt ? 'd3 채택 (config 기본값 유지)' : 'd2 유지 필요 — config 되돌릴 것');
process.exitCode = 0;
