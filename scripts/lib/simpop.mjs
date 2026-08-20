// PHASE 2 PART 2 — 시뮬레이션 모집단 하네스 (Training / Validation / Stress).
//
// simulate21.mjs(동결된 Phase 1 회귀 스위트)와 의도적으로 분리된 병렬 하네스다:
// 회귀 스위트를 건드리지 않고 Phase 2 측정·튜닝을 수행하기 위함이며, 학습자 구동
// 로직은 simulate21의 검증된 attempt/runLearner를 계승하되 모집단 파라미터화와
// 통제된 transfer 후속 측정(PART 8)을 추가했다.
//
// 금지 사항(PART 2): VALIDATION/STRESS 모집단은 절대 튜닝에 사용하지 않는다.
// 시드 공간도 분리한다 (TRAINING 1xxxx / VALIDATION 5xxxx / STRESS 9xxxx).
import { freshTwin21 } from '../../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitMicroLessonAck, buildProblemForAction } from '../../src/engine2/session21.ts';
import { emptyLog } from '../../src/engine2/events21.ts';
import { predictSuccess, readMastery } from '../../src/engine2/mastery21.ts';
import { ALL_SKILL_IDS, prerequisitesOf } from '../../src/engine2/curriculum21.ts';
import { buildCalibrationReport } from '../../src/engine2/calibration21.ts';

export const BASE_TS = Date.parse('2026-08-18T09:00:00Z');
export const dstr = (ts) => new Date(ts).toISOString().slice(0, 10);

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

function chooseWrongIndex(problem, preferredTag, rng, regenerate) {
  let p = problem;
  if (preferredTag) {
    for (let tries = 0; tries < 8; tries++) {
      const idx = p.choices.findIndex((c, i) => i !== p.answerIndex && c.errorType === preferredTag);
      if (idx >= 0) return { idx, problem: p };
      if (!regenerate) break;
      p = regenerate();
    }
  }
  const wrongIndices = p.choices.map((c, i) => i).filter((i) => i !== p.answerIndex);
  return { idx: wrongIndices[Math.floor(rng() * wrongIndices.length)], problem: p };
}

// 한 번의 실제 시도 — simulate21과 동일한 은닉 능력 모델:
// 성공확률 = predictSuccess(trueP, difficulty) (엔진과 같은 θ 난이도 모델 공유)
export function simAttempt(state, learner, action, rng) {
  if (action.kind === 'micro-lesson') {
    const r = submitMicroLessonAck(state.twin, state.log, action, (state.ts += 45000));
    state.twin = r.twin;
    state.log = r.log;
    return { kind: 'micro-lesson' };
  }
  let problem = buildProblemForAction(action);
  const regenerate = () => buildProblemForAction(action);
  const trueP = learner.trueP(action.skillId);
  const successProb = predictSuccess(trueP, action.difficulty);
  const isGuessRoll = rng() < (learner.guessRate ?? 0);
  let idx;
  let solveTimeSec;
  let hintsUsed = 0;
  if (isGuessRoll) {
    solveTimeSec = problem.estimatedSec * 0.08;
    const guessCorrect = rng() < (learner.guessAccuracy ?? 0.28);
    if (guessCorrect) idx = problem.answerIndex;
    else {
      const picked = chooseWrongIndex(problem, 'GUESSING', rng, regenerate);
      idx = picked.idx;
      problem = picked.problem;
    }
  } else {
    solveTimeSec = problem.estimatedSec * (learner.speedMultiplier ?? 0.8);
    let correct = rng() < successProb;
    let forcedSlip = false;
    if (correct && learner.carelessRate && rng() < learner.carelessRate) {
      correct = false;
      forcedSlip = true;
    }
    if (correct) {
      idx = problem.answerIndex;
      if (learner.hintRate && rng() < learner.hintRate) hintsUsed = 1;
    } else {
      let preferredTag = forcedSlip ? 'CARELESS_ERROR' : null;
      const mis = (learner.misconceptions ?? []).find((m) => m.skillId === action.skillId);
      if (!forcedSlip && mis && rng() < mis.rate) preferredTag = mis.errorType;
      const picked = chooseWrongIndex(problem, preferredTag, rng, regenerate);
      idx = picked.idx;
      problem = picked.problem;
    }
  }
  const r = submitAttempt(state.twin, state.log, action, problem, { chosenIndex: idx, solveTimeSec, hintsUsed, retryCount: 0 }, (state.ts += 60000 + Math.floor(rng() * 30000)));
  state.twin = r.twin;
  state.log = r.log;
  return { kind: action.kind, correct: idx === problem.answerIndex, action, problem };
}

// 학습자 1명 구동 — 캘리브레이션 원료(예측/프로브/이정표) + 통제된 transfer 후속(PART 8) 수집.
// controlledTransfer: transfer 시도 직후 [같은 스킬·같은 난이도] 문제를 1개 강제 삽입해
// 난이도 교란 없이 pass/fail 그룹을 비교 가능하게 한다. far/delayed 후속도 기록.
export function runLearner(learner, opts = {}) {
  const iterations = opts.iterations ?? 500;
  const state = { twin: freshTwin21(learner.name ?? 'sim'), log: emptyLog(), ts: BASE_TS };
  const rng = makeRng(learner.seed);
  const ds = { probes: [], retentionPredictions: [], rootCauseTrials: [], masteryMilestones: [], misconceptionTrials: [], remediationOutcomes: [], transferFollowUps: [] };
  const controlled = { near: [], far: [], delayed: [] }; // {transferPassed, followCorrect, difficulty}
  const pendingMilestones = [];
  const pendingDelayed = []; // {skillId, difficulty, transferPassed, dueTs}
  let pendingFar = null; // {depSkillId, transferPassed, difficulty}

  for (let i = 0; i < iterations; i++) {
    const action = nextAction(state.twin, dstr(state.ts));
    const prevKS = state.twin.skills[action.skillId]?.knowledgeState;

    if (action.kind === 'retention' && action.skillId) {
      const s = state.twin.skills[action.skillId];
      const m = readMastery(s.alpha, s.beta, s.lastPracticedAt, dstr(state.ts));
      ds.retentionPredictions.push({ attemptId: `sim-${i}`, skillId: action.skillId, predictedP: predictSuccess(m.p, action.difficulty), difficulty: action.difficulty, correct: false, masteryModelVersion: '', configVersion: '', ts: state.ts });
    }

    const out = simAttempt(state, learner, action, rng);
    if (out.kind === 'micro-lesson') continue;
    if (action.kind === 'retention') ds.retentionPredictions[ds.retentionPredictions.length - 1].correct = out.correct;
    if (action.kind === 'probe') ds.probes.push({ correct: out.correct });

    // --- PART 8: 통제된 transfer 후속 ---
    if (out.action.variant === 'transfer' && opts.controlledTransfer !== false) {
      const passed = out.correct;
      const d = out.action.difficulty;
      // NEAR: 같은 스킬, 같은 난이도, 즉시 — 강제 삽입 (통제 변인 고정)
      const near = simAttempt(state, learner, { kind: 'normal', skillId: out.action.skillId, difficulty: d, variant: 'standard', reason: 'controlled-near' }, rng);
      controlled.near.push({ transferPassed: passed, followCorrect: near.correct, difficulty: d });
      // FAR: 이 스킬을 전제로 쓰는 하류 스킬 — 다음 기회에 같은 난이도로
      const deps = ALL_SKILL_IDS.filter((id) => prerequisitesOf(id).includes(out.action.skillId));
      if (deps.length > 0) pendingFar = { depSkillId: deps[Math.floor(rng() * deps.length)], transferPassed: passed, difficulty: d };
      // DELAYED: 1일 후 같은 스킬·같은 난이도
      pendingDelayed.push({ skillId: out.action.skillId, difficulty: d, transferPassed: passed, dueTs: state.ts + 86400000 });
    }
    if (pendingFar && rng() < 0.5) {
      const far = simAttempt(state, learner, { kind: 'normal', skillId: pendingFar.depSkillId, difficulty: pendingFar.difficulty, variant: 'standard', reason: 'controlled-far' }, rng);
      controlled.far.push({ transferPassed: pendingFar.transferPassed, followCorrect: far.correct, difficulty: pendingFar.difficulty });
      pendingFar = null;
    }
    while (pendingDelayed.length && pendingDelayed[0].dueTs <= state.ts) {
      const item = pendingDelayed.shift();
      const del = simAttempt(state, learner, { kind: 'normal', skillId: item.skillId, difficulty: item.difficulty, variant: 'standard', reason: 'controlled-delayed' }, rng);
      controlled.delayed.push({ transferPassed: item.transferPassed, followCorrect: del.correct, difficulty: item.difficulty });
    }

    const newKS = state.twin.skills[action.skillId]?.knowledgeState;
    if (newKS && newKS !== prevKS && (newKS === 'MASTERED' || newKS === 'WEAKENED')) {
      pendingMilestones.push({ skillId: action.skillId, state: newKS, remaining: 5, outcomes: [] });
    }
    for (const m of pendingMilestones) {
      if (m.skillId === action.skillId && m.remaining > 0) {
        m.outcomes.push(out.correct);
        m.remaining--;
      }
    }
  }

  // DELAYED transfer 후속 드레인: 시뮬 시계(시도당 ~90초)로는 1일이 오지 않으므로,
  // 본 루프 종료 후 남은 지연 후속을 예정 시각으로 fast-forward해 서빙한다 (상한 20)
  let drained = 0;
  while (pendingDelayed.length && drained++ < 20) {
    const item = pendingDelayed.shift();
    if (state.ts < item.dueTs) state.ts = item.dueTs;
    const del = simAttempt(state, learner, { kind: 'normal', skillId: item.skillId, difficulty: item.difficulty, variant: 'standard', reason: 'controlled-delayed' }, rng);
    controlled.delayed.push({ transferPassed: item.transferPassed, followCorrect: del.correct, difficulty: item.difficulty });
  }

  // 복습 사다리 fast-forward (simulate21의 driveRetention과 동일 기법)
  if (opts.driveRetention) {
    let rounds = 0;
    while (rounds++ < opts.driveRetention) {
      let earliest = null;
      for (const id of ALL_SKILL_IDS) {
        const rt = state.twin.skills[id].retention.nextReviewAt;
        if (rt && (!earliest || rt < earliest)) earliest = rt;
      }
      if (!earliest) break;
      state.ts = Date.parse(earliest + 'T09:00:00Z');
      const action = nextAction(state.twin, dstr(state.ts));
      // 복습 아닌 제안(잔여 confirm/transfer-게이트 등)도 수행하고 계속 — 조기 break 금지
      if (action.kind !== 'retention') {
        simAttempt(state, learner, action, rng);
        continue;
      }
      const s = state.twin.skills[action.skillId];
      const m = readMastery(s.alpha, s.beta, s.lastPracticedAt, dstr(state.ts));
      ds.retentionPredictions.push({ attemptId: `ret-${rounds}`, skillId: action.skillId, predictedP: predictSuccess(m.p, action.difficulty), difficulty: action.difficulty, correct: false, masteryModelVersion: '', configVersion: '', ts: state.ts });
      const out = simAttempt(state, learner, action, rng);
      ds.retentionPredictions[ds.retentionPredictions.length - 1].correct = out.correct;
    }
  }

  for (const m of pendingMilestones) if (m.outcomes.length > 0) ds.masteryMilestones.push({ skillId: m.skillId, state: m.state, subsequentOutcomes: m.outcomes });

  return { twin: state.twin, log: state.log, ds, controlled };
}

// ---------------------------------------------------------------------------
// 모집단 정의 — 프로필 다양성 + 시드 분리
// ---------------------------------------------------------------------------
function randomProfileLearner(name, seed) {
  const rng = makeRng(seed);
  const pBySkill = {};
  for (const id of ALL_SKILL_IDS) pBySkill[id] = 0.15 + rng() * 0.8; // [0.15, 0.95]
  return {
    name,
    seed: seed + 1,
    trueP: (id) => pBySkill[id],
    guessRate: rng() < 0.25 ? rng() * 0.15 : 0,
    carelessRate: rng() < 0.4 ? rng() * 0.12 : 0,
    hintRate: rng() < 0.3 ? rng() * 0.2 : 0,
    speedMultiplier: 0.5 + rng() * 1.2,
    misconceptions: [],
  };
}

export function buildPopulation(kind, replicate = 0) {
  const specs = [];
  if (kind === 'training') {
    const base = 10000 + replicate * 997;
    for (let i = 0; i < 14; i++) specs.push(randomProfileLearner(`T${replicate}-${i}`, base + i * 131));
  } else if (kind === 'validation') {
    const base = 50000 + replicate * 1009;
    // 프로필 구성도 다르게: 균일 랜덤 + 영역 편중형(강한 대수/약한 기하 등) 혼합
    for (let i = 0; i < 8; i++) specs.push(randomProfileLearner(`V${replicate}-u${i}`, base + i * 173));
    for (let i = 0; i < 6; i++) {
      const rng = makeRng(base + 7000 + i * 211);
      const strongDomain = ['NUM', 'ALG', 'FUN'][i % 3];
      specs.push({
        name: `V${replicate}-d${i}`,
        seed: base + 7001 + i * 211,
        trueP: (id) => (id.includes(`.${strongDomain}.`) ? 0.75 + rng() * 0.2 : 0.25 + rng() * 0.3),
        guessRate: 0,
        carelessRate: rng() < 0.5 ? 0.08 : 0,
        hintRate: 0,
        speedMultiplier: 0.9,
        misconceptions: [],
      });
    }
  } else if (kind === 'stress') {
    const base = 90000 + replicate * 1013;
    specs.push({ name: `S${replicate}-guess`, seed: base + 1, trueP: () => 0.25, guessRate: 1.0, guessAccuracy: 0.28 });
    specs.push({ name: `S${replicate}-careless`, seed: base + 2, trueP: () => 0.9, carelessRate: 0.3, speedMultiplier: 0.5 });
    specs.push({ name: `S${replicate}-floor`, seed: base + 3, trueP: () => 0.05, speedMultiplier: 1.2 });
    specs.push({ name: `S${replicate}-ceil`, seed: base + 4, trueP: () => 0.98, speedMultiplier: 0.4 });
    specs.push({ name: `S${replicate}-mis`, seed: base + 5, trueP: (id) => (id === 'M1.NUM.POW.01' ? 0.5 : 0.85), misconceptions: [{ id: 'MIS.SIGN.NEGSQ', skillId: 'M1.NUM.POW.01', errorType: 'SIGN_ERROR', rate: 0.9 }] });
    specs.push({ name: `S${replicate}-split`, seed: base + 6, trueP: (id) => (id.startsWith('M1.NUM') ? 0.95 : 0.1) });
    specs.push({ name: `S${replicate}-hint`, seed: base + 7, trueP: () => 0.7, hintRate: 0.6 });
  }
  return specs;
}

// 모집단 실행 → 통합 캘리브레이션 리포트 + 통제 transfer 지표 + 학습자별 ground truth
export function runPopulation(kind, replicate = 0, opts = {}) {
  const specs = buildPopulation(kind, replicate);
  const allPredictions = [];
  const combined = { probes: [], retentionPredictions: [], rootCauseTrials: [], masteryMilestones: [], misconceptionTrials: [], remediationOutcomes: [], transferFollowUps: [] };
  const controlledAll = { near: [], far: [], delayed: [] };
  const perLearner = [];
  for (const spec of specs) {
    const r = runLearner(spec, { iterations: opts.iterations ?? 450, driveRetention: opts.driveRetention ?? 20 });
    allPredictions.push(...r.twin.predictions);
    for (const k of Object.keys(combined)) combined[k].push(...r.ds[k]);
    for (const k of Object.keys(controlledAll)) controlledAll[k].push(...r.controlled[k]);
    perLearner.push({ name: spec.name, spec, twin: r.twin });
  }
  const report = buildCalibrationReport({ predictions: allPredictions, ...combined });
  return { report, predictions: allPredictions, controlled: controlledAll, perLearner };
}

// 통제된 transfer 예측력: 같은 난이도 후속만으로 pass/fail 그룹 비교 (PART 8)
export function controlledTransferValue(entries) {
  const pass = entries.filter((e) => e.transferPassed);
  const fail = entries.filter((e) => !e.transferPassed);
  if (pass.length === 0 || fail.length === 0) return { value: NaN, nPass: pass.length, nFail: fail.length };
  const rate = (arr) => arr.filter((e) => e.followCorrect).length / arr.length;
  return { value: rate(pass) - rate(fail), passRate: rate(pass), failRate: rate(fail), nPass: pass.length, nFail: fail.length };
}
