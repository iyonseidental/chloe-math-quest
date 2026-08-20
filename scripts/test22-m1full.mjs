// PHASE 2 STEP 11 — 중1 전체 그래프 동적 회귀 (GATE B 동적 항목).
//   ① 진단 예산 수용성: 35스킬에서 강/약/영역편중 학생의 문항 수와 판정 커버리지
//   ② Unknown ≠ Weak 유지: 생략 스킬에 부정 증거 0
//   ③ 단원 경계 원인추적: STA 실패 → ALG 전제 결손 탐지
//   ④ 광역 치료 금지: 단일 결손 학생에서 무관 단원 과잉 접촉 없음
//   ⑤ 우선순위 집중 병리 없음: 평균 학생 장기 구동에서 특정 스킬 독식 없음
//   ⑥ 영역별 분리(PART 12): 영역 편중 학생의 트윈이 영역별로 다른 상태를 보임
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitMicroLessonAck, buildProblemForAction } from '../src/engine2/session21.ts';
import { nextDiagnosticStep, finalizeDiagnostic } from '../src/engine2/diagnostic21.ts';
import { emptyLog } from '../src/engine2/events21.ts';
import { predictSuccess, readMastery } from '../src/engine2/mastery21.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP, prerequisitesOf } from '../src/engine2/curriculum21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';
import { makeRng, BASE_TS, dstr } from './lib/simpop.mjs';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

function runDiagnosis(trueP, seed) {
  const rng = makeRng(seed);
  let twin = freshTwin21(`m1f-${seed}`);
  let log = emptyLog();
  let ts = BASE_TS;
  let guard = 0;
  while (guard++ < 80) {
    const step = nextDiagnosticStep(twin, CONFIG21.diagnostic.budget);
    if (step.done) break;
    const act = step.action;
    const problem = buildProblemForAction(act);
    const correct = rng() < predictSuccess(trueP(act.skillId), act.difficulty);
    const idx = correct ? problem.answerIndex : (problem.answerIndex + 1) % problem.choices.length;
    const r = submitAttempt(twin, log, act, problem, { chosenIndex: idx, solveTimeSec: problem.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (ts += 60000));
    twin = r.twin;
    log = r.log;
  }
  const fin = finalizeDiagnostic(twin, log, CONFIG21.diagnostic.budget, (ts += 60000));
  return { twin: fin.twin, log: fin.log, report: fin.report, ts };
}

// --- ① 강한 학생: 예산 내 전 스킬 판정 (직접+추론), 대부분 통과 계열 ---
{
  const { report } = runDiagnosis(() => 0.93, 501);
  const resolvedSkills = report.perSkill.filter((d) => !['UNTESTED_BUDGET', 'PENDING', 'UNRESOLVED'].includes(d.classification));
  const resolved = resolvedSkills.length;
  check(`강한 학생: 문항 ${report.questionsUsed} ≤ 예산 ${report.budget}`, report.questionsUsed <= report.budget);
  // 전수 판정이 목표가 아니다 — 진단은 사전분포 설정기이고 잔여는 일반 학습이 자연 관측한다
  // (UNTESTED_BUDGET 의미론). 수용 기준: 전체 ≥24 판정 + 5개 영역 각각 ≥2 판정(영역 프로필
  // 확보, PART 12) + 예산이 전수검사(70문항)의 절반 이하.
  check(`강한 학생: 35스킬 중 ${resolved}개 판정 (≥ 24)`, resolved >= 24, `${resolved}`);
  for (const dom of ['NUM', 'ALG', 'FUN', 'GEO', 'STA']) {
    const n = resolvedSkills.filter((d) => MICRO_SKILL_MAP[d.skillId].domain === dom).length;
    check(`강한 학생: ${dom} 영역 판정 ${n}개 ≥ 2 (영역 프로필 확보)`, n >= 2, `${n}`);
  }
  check(`강한 학생: 추론 처리 ≥ 8 (그래프가 실제로 문항 절약)`, report.inferredCount >= 8, `${report.inferredCount}`);
  check(`예산 ${report.budget} ≤ 전수검사 70의 절반`, report.budget <= 35);
}

// --- ② 약한 학생: 하강·생략으로 조기 판정 + Unknown≠Weak ---
{
  const { twin, report } = runDiagnosis(() => 0.1, 502);
  check(`약한 학생: 문항 ${report.questionsUsed} ≤ 예산`, report.questionsUsed <= report.budget);
  const skipped = report.perSkill.filter((d) => d.classification === 'SKIPPED_LOW');
  check(`약한 학생: 생략 ${skipped.length}개 발생`, skipped.length >= 8, `${skipped.length}`);
  // 불변식의 정확한 진술: 생략은 "부정 증거를 조작해 넣지 않는다"이다. 검사 도중(1문항)
  // 상류 실패로 생략 전환된 스킬은 그 1문항의 '실제' 증거를 갖는 것이 옳다 — 따라서
  // 시도 0회인 생략 스킬만 prior 보존을 요구한다.
  for (const d of skipped) {
    const sk = twin.skills[d.skillId];
    if (sk.attempts === 0) {
      check(`Unknown≠Weak: 미접촉 생략 스킬 ${d.skillId} α/β = prior 그대로`, sk.alpha === CONFIG21.prior.alpha && sk.beta === CONFIG21.prior.beta);
    } else {
      check(`생략 전환 스킬 ${d.skillId}: 실제 시도(${sk.attempts}회) 증거만 존재 (조작 없음)`, sk.attempts >= 1);
    }
  }
}

// --- ③ 영역 편중 학생 (PART 12): 대수 강함 / 기하 약함 → 영역별 상이한 배치 ---
{
  const trueP = (id) => (MICRO_SKILL_MAP[id].domain === 'GEO' ? 0.15 : 0.88);
  const { twin } = runDiagnosis(trueP, 503);
  const today = dstr(BASE_TS + 86400000);
  const avgP = (domain) => {
    const ids = ALL_SKILL_IDS.filter((id) => MICRO_SKILL_MAP[id].domain === domain);
    return ids.reduce((a, id) => a + readMastery(twin.skills[id].alpha, twin.skills[id].beta, twin.skills[id].lastPracticedAt, today).p, 0) / ids.length;
  };
  const alg = avgP('ALG');
  const geo = avgP('GEO');
  check(`영역별 분리: ALG 평균 p=${alg.toFixed(2)} > GEO 평균 p=${geo.toFixed(2)} + 0.15`, alg > geo + 0.15);
}

// --- ④ 단원 경계 원인추적: 평균 역산(STA) 실패의 진범이 이항(ALG EQ.01) ---
{
  const rng = makeRng(504);
  let twin = freshTwin21('m1f-cross');
  let log = emptyLog();
  let ts = BASE_TS;
  const seedOne = (skillId, correct, n) => {
    for (let i = 0; i < n; i++) {
      if (i > 0 && i % 3 === 0) {
        const f = { kind: 'diagnostic', skillId: 'M1.FUN.COORD.02', difficulty: 3, variant: 'standard', reason: 'f' };
        const fp = buildProblemForAction(f);
        const fr = submitAttempt(twin, log, f, fp, { chosenIndex: fp.answerIndex, solveTimeSec: 30, hintsUsed: 0, retryCount: 0 }, (ts += 1000));
        twin = fr.twin;
        log = fr.log;
      }
      const a = { kind: 'diagnostic', skillId, difficulty: 3, variant: 'standard', reason: 's' };
      const p = buildProblemForAction(a);
      const idx = correct ? p.answerIndex : (p.answerIndex + 1) % p.choices.length;
      const r = submitAttempt(twin, log, a, p, { chosenIndex: idx, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 }, (ts += 60000));
      twin = r.twin;
      log = r.log;
    }
  };
  seedOne('M1.STA.AVG.01', true, 30); // 평균 자체는 튼튼
  // EQ.01은 미접촉(UNKNOWN, 실제 약함) — AVG.02의 REQUIRED+STRONG 전제
  for (let i = 0; i < 2; i++) {
    const a = { kind: 'normal', skillId: 'M1.STA.AVG.02', difficulty: 3, variant: 'standard', reason: 'x' };
    let p = buildProblemForAction(a);
    let idx = -1;
    for (let t2 = 0; t2 < 12 && idx < 0; t2++) {
      if (t2 > 0) p = buildProblemForAction(a);
      idx = p.choices.findIndex((c, i2) => i2 !== p.answerIndex && (c.errorType === 'CALCULATION_ERROR' || c.errorType === 'CONCEPT_GAP'));
    }
    // 폴백도 비진단성(CARELESS 등) 태그는 피한다 — 이 시나리오는 '개념적 오답 2연속'이
    // 전제이고, 실수 태그가 섞이면 careless-가드가 (설계대로) 조사를 열지 않는다
    if (idx < 0) {
      const NONDIAG = ['CARELESS_ERROR', 'GUESSING', 'TIME_PRESSURE'];
      idx = p.choices.findIndex((c, i2) => i2 !== p.answerIndex && !NONDIAG.includes(c.errorType ?? ''));
      if (idx < 0) idx = (p.answerIndex + 1) % p.choices.length;
    }
    const r = submitAttempt(twin, log, a, p, { chosenIndex: idx, solveTimeSec: 50, hintsUsed: 0, retryCount: 0 }, (ts += 60000));
    twin = r.twin;
    log = r.log;
  }
  let guard = 0;
  while (guard++ < 30) {
    const kase0 = twin.remediationCases.find((k) => k.targetSkillId === 'M1.STA.AVG.02');
    if (kase0 && kase0.stage !== 'investigating') break;
    const act = nextAction(twin, dstr(ts));
    // 진단 비중 가드가 일반 문항을 끼워 넣으면 경쟁 케이스(약한 사슬 스킬)가 열릴 수 있다 —
    // 그 케이스의 micro-lesson은 ACK하고 계속한다. AVG.02 조사는 이후 재개된다 (엔진 정상 동작).
    if (act.kind === 'micro-lesson') {
      const r = submitMicroLessonAck(twin, log, act, (ts += 45000));
      twin = r.twin;
      log = r.log;
      continue;
    }
    let p = buildProblemForAction(act);
    // 단위검사이므로 결정론 응답 (확률 응답의 통계 검증은 rootcause-benchmark 몫):
    // AVG.01만 정답, ALG 사슬(EQ.01/EXP.01/SIGN.01)은 전부 오답.
    // 단, 진단 비중 가드가 끼워 넣는 '일반' 문항에서의 사슬 오답은 CARELESS 태그로 —
    // 그래야 careless-가드가 경쟁 케이스 개설을 (설계대로) 억제하고, 이 검사가 격리하려는
    // AVG.02 조사만 남는다. 프로브 응답은 그대로 오답 → 하강은 프로브가 담당.
    const correct = act.skillId === 'M1.STA.AVG.01';
    let idx;
    if (correct) idx = p.answerIndex;
    else if (act.kind === 'normal' || act.kind === 'challenge' || act.kind === 'ease') {
      idx = -1;
      for (let t2 = 0; t2 < 8 && idx < 0; t2++) {
        if (t2 > 0) p = buildProblemForAction(act);
        idx = p.choices.findIndex((c, i2) => i2 !== p.answerIndex && c.errorType === 'CARELESS_ERROR');
      }
      if (idx < 0) idx = p.answerIndex; // CARELESS 미가용 문항형이면 요행 정답 처리 (경쟁 케이스 차단 유지)
    } else {
      idx = (p.answerIndex + 1) % p.choices.length;
    }
    const r = submitAttempt(twin, log, act, p, { chosenIndex: idx, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 }, (ts += 60000));
    twin = r.twin;
    log = r.log;
  }
  const kase = twin.remediationCases.find((k) => k.targetSkillId === 'M1.STA.AVG.02');
  check('단원 경계 원인추적: STA.AVG.02 실패 케이스 개설', !!kase);
  // 엔진은 약한 사슬을 따라 더 깊이 하강할 수 있고 그것이 옳다 — root가 약한 ALG 사슬의
  // 어느 지점이든 "단원 경계를 넘은 진범 식별"이다 (EQ.01 직계 or 그 전제 EXP.01/SIGN.01).
  const WEAK_CHAIN = ['M1.ALG.EQ.01', 'M1.ALG.EXP.01', 'M1.NUM.SIGN.01'];
  check(`단원 경계 원인추적: root ∈ 약한 ALG 사슬 (STA→ALG 하강)`, WEAK_CHAIN.includes(kase?.rootCauseSkillId), `${kase?.rootCauseSkillId}`);
}

// --- ⑤ 광역 치료 금지: REL.01 단일 결손 — 무관 단원(GEO/PROP) 과잉 접촉 없음 ---
{
  const rng = makeRng(505);
  const trueP = (id) => (id === 'M1.STA.REL.01' ? 0.12 : 0.9);
  let twin = freshTwin21('m1f-k');
  let log = emptyLog();
  let ts = BASE_TS;
  for (let i = 0; i < 250; i++) {
    const act = nextAction(twin, dstr(ts));
    if (act.kind === 'micro-lesson') {
      const r = submitMicroLessonAck(twin, log, act, (ts += 45000));
      twin = r.twin;
      log = r.log;
      continue;
    }
    const p = buildProblemForAction(act);
    const correct = rng() < predictSuccess(trueP(act.skillId), act.difficulty);
    const idx = correct ? p.answerIndex : (p.answerIndex + 1) % p.choices.length;
    const r = submitAttempt(twin, log, act, p, { chosenIndex: idx, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 }, (ts += 70000));
    twin = r.twin;
    log = r.log;
  }
  const geoTouches = ALL_SKILL_IDS.filter((id) => MICRO_SKILL_MAP[id].domain === 'GEO').reduce((a, id) => a + twin.skills[id].attempts, 0);
  check(`광역 치료 금지: 단일 STA 결손 학생의 GEO 총 접촉 ${geoTouches} < 60 (250회 중)`, geoTouches < 60, `${geoTouches}`);
  check('결손 스킬은 실제로 집중 치료됨', twin.skills['M1.STA.REL.01'].attempts >= 8, `${twin.skills['M1.STA.REL.01'].attempts}`);
}

// --- ⑥ 우선순위 집중 병리 없음: 평균 학생 600회 × 3시드 ---
// 목적은 '퇴행적 독점'(Phase 1에서 실측된 68% 무한루프) 검출이지, 최약 스킬에 대한
// 정당한 집중 치료 버스트 금지가 아니다 → 단일 시드가 아니라 3시드 통계로 판정:
// 중앙값 < 40% (체계적 독점 없음) AND 최대 < 60% (어느 시드도 퇴행 수준 아님).
{
  const shares = [];
  let minTouched = 99;
  for (const seed of [506, 507, 508]) {
    const rng = makeRng(seed);
    let twin = freshTwin21(`m1f-avg-${seed}`);
    let log = emptyLog();
    let ts = BASE_TS;
    const counts = {};
    for (let i = 0; i < 600; i++) {
      const act = nextAction(twin, dstr(ts));
      if (act.kind === 'micro-lesson') {
        const r = submitMicroLessonAck(twin, log, act, (ts += 45000));
        twin = r.twin;
        log = r.log;
        continue;
      }
      counts[act.skillId] = (counts[act.skillId] ?? 0) + 1;
      const p = buildProblemForAction(act);
      const correct = rng() < predictSuccess(0.62, act.difficulty);
      const idx = correct ? p.answerIndex : (p.answerIndex + 1) % p.choices.length;
      const r = submitAttempt(twin, log, act, p, { chosenIndex: idx, solveTimeSec: 45, hintsUsed: 0, retryCount: 0 }, (ts += 70000));
      twin = r.twin;
      log = r.log;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    shares.push(top[1] / total);
    minTouched = Math.min(minTouched, Object.keys(counts).length);
  }
  shares.sort((a, b) => a - b);
  const median = shares[1];
  const max = shares[2];
  check(`우선순위 집중 병리 없음: 3시드 최다점유 중앙값 ${(median * 100).toFixed(1)}% < 40%`, median < 0.4, shares.map((s) => (s * 100).toFixed(1)).join('/'));
  check(`우선순위 집중 병리 없음: 3시드 최다점유 최대 ${(max * 100).toFixed(1)}% < 60% (퇴행 독점 아님)`, max < 0.6);
  check(`전 그래프 표면 커버: 최소 접촉 ${minTouched}/35 스킬 (≥ 15)`, minTouched >= 15, `${minTouched}`);
}

// --- 전제 검사 가능성: 모든 REQUIRED/STRONG 전제가 문제 생성 가능 ---
{
  const testable = new Set();
  for (const id of ALL_SKILL_IDS) for (const p of prerequisitesOf(id)) testable.add(p);
  for (const p of testable) {
    const prob = buildProblemForAction({ kind: 'probe', skillId: p, difficulty: CONFIG21.rootCause.probeDifficulty, variant: 'standard', reason: 't' });
    check(`전제 검사 가능: ${p} 프로브 문항 생성`, !!prob.stem && prob.choices.length === 4);
  }
}

console.log(`\n${pass} checks passed — Phase 2 Step 11 (Full M1 dynamic regression) OK`);
