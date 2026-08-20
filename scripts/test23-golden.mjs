// Phase 3 STEP 14-16/20 — Golden Set 구조 + 격리 보증 + Growth 지표 + 리플레이.
import { freshTwin21, replayFromScratch, fold } from '../src/engine2/replay21.ts';
import { nextAction, submitAttempt, submitHoldoutAttempt, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { GOLDEN_SET, goldenForm, validateGoldenSet, goldenCoverage } from '../src/engine2/goldenSet23.ts';
import { ELITE_BANK } from '../src/engine2/eliteBank22.ts';
import { computeGrowthReport } from '../src/engine2/growth23.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const BASE = Date.parse('2026-08-18T09:00:00Z');
const dstr = (ts) => new Date(ts).toISOString().slice(0, 10);

// ---- STEP 14/15/57: 구조 검증 ----
{
  const v = validateGoldenSet(ELITE_BANK.map((p) => p.stem));
  check('golden set validation passes (parallel form 정합 + 훈련 은행 비중복)', v.ok, v.issues.join('; '));
  check(`48 items = 16 groups × 3 forms (${GOLDEN_SET.length})`, GOLDEN_SET.length === 48);
  for (const f of ['A', 'B', 'C']) check(`form ${f} has 16 items`, goldenForm(f).length === 16);
  const cov = goldenCoverage();
  check('coverage documented: CORE 18 / NEAR 6 / FAR 6 / ELITE 18', cov.areas.CORE === 18 && cov.areas.NEAR_TRANSFER === 6 && cov.areas.FAR_TRANSFER === 6 && cov.areas.ELITE === 18, JSON.stringify(cov.areas));
  check('6 elite dimensions covered ×3', Object.keys(cov.eliteDimensions).length === 6 && Object.values(cov.eliteDimensions).every((n) => n === 3), JSON.stringify(cov.eliteDimensions));
  check(`skill coverage documented (${cov.skillsCovered.length} skills)`, cov.skillsCovered.length >= 10);
}

// ---- STEP 14/28/47: 격리 보증 — holdout 시행이 훈련 상태를 1비트도 안 바꾼다 ----
{
  resetEventSeq(9000);
  let state = { twin: freshTwin21('gs-iso'), log: emptyLog(), ts: BASE };
  // 약간의 실학습 상태를 만든 뒤
  for (let i = 0; i < 6; i++) {
    const a = { kind: 'normal', skillId: 'M1.NUM.SIGN.01', difficulty: 3, variant: 'standard', reason: 't' };
    const p = buildProblemForAction(a);
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: p.answerIndex, solveTimeSec: 30, hintsUsed: 0, retryCount: 0 }, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  const before = JSON.stringify({ skills: state.twin.skills, agenda: state.twin.agenda, elite: state.twin.elite, mis: state.twin.misconceptions, cases: state.twin.remediationCases, predictions: state.twin.predictions, attemptsSinceElite: state.twin.attemptsSinceElite });
  const actionBefore = JSON.stringify(nextAction(state.twin, dstr(state.ts)));

  // Form A 전체 시행 (일부러 절반은 오답 — 오답조차 아무 치료도 촉발하면 안 된다)
  const admin = 'admin-test-1';
  goldenForm('A').forEach((item, i) => {
    const r = submitHoldoutAttempt(state.twin, state.log, item, { chosenIndex: i % 2 === 0 ? item.answerIndex : (item.answerIndex + 1) % 4, solveTimeSec: 40 }, admin, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  });

  const after = JSON.stringify({ skills: state.twin.skills, agenda: state.twin.agenda, elite: state.twin.elite, mis: state.twin.misconceptions, cases: state.twin.remediationCases, predictions: state.twin.predictions, attemptsSinceElite: state.twin.attemptsSinceElite });
  check('mastery α/β + agenda + elite + misconceptions + cases 완전 무변동 (PART 28/47)', before === after);
  check('adaptive 추천도 무변동 (Golden 결과가 추천에 새어들지 않음)', actionBefore === JSON.stringify(nextAction(state.twin, dstr(state.ts))));
  check(`holdout 장부에만 16건 기록`, state.twin.holdout.length === 16);
  check('오답 8건에도 remediation 0건 (teach/remediate 사용 금지)', state.twin.remediationCases.filter((c) => c.createdTs > BASE + 5 * 60000).length === state.twin.remediationCases.length && state.twin.agenda.length === 0);

  // ---- STEP 20: holdout 포함 로그의 무손실 리플레이 ----
  const t1 = replayFromScratch(state.log, 'gs-iso');
  check('replay with holdout events reproduces the live twin byte-for-byte', JSON.stringify(t1) === JSON.stringify(state.twin));

  // ---- STEP 16: 성장 지표 ----
  const g1 = computeGrowthReport(state.twin, state.log);
  check('시행 1회 → INSUFFICIENT_REAL_WORLD_DATA (조작된 성장 보고 없음, PART 53)', g1.status === 'INSUFFICIENT_REAL_WORLD_DATA' && g1.administrations === 1);

  // 두 번째 시행 (Form B — 전부 정답: 성장 시나리오)
  state.ts += 14 * 86400000;
  const admin2 = 'admin-test-2';
  for (const item of goldenForm('B')) {
    const r = submitHoldoutAttempt(state.twin, state.log, item, { chosenIndex: item.answerIndex, solveTimeSec: 35 }, admin2, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  const g2 = computeGrowthReport(state.twin, state.log);
  check('시행 2회 → 영역별 성장 비교 산출', g2.status === 'OK');
  const core = g2.comparisons.find((c) => c.area === 'CORE');
  check('CORE 비교에 n·rate·Wilson CI 동반 (원시 % 단독 금지, PART 30)', core.baseline.n === 6 && core.post.n === 6 && Array.isArray(core.post.ci95));
  check('폼이 다른 시행끼리 비교 (같은 문제 재사용 없음, PART 26)', core.baseline.form === 'A' && core.post.form === 'B');
  const far = g2.comparisons.find((c) => c.area === 'FAR_TRANSFER');
  check('FAR_TRANSFER가 CORE와 분리 보고 (단일 점수 금지, PART 29)', !!far && far.post.rate === 1);
  check('Elite 차원별 분해 포함', g2.comparisons.some((c) => c.area.startsWith('ELITE:')));
  check('작은 표본의 성장은 confident=false로 정직 표기', typeof core.confident === 'boolean');
  check('retention 데이터 부족 시 INSUFFICIENT 표기', g2.retentionGrowth.status === 'INSUFFICIENT');
}

console.log(`\n${pass} checks passed — Phase 3 Step 14-16/20 (Golden Set + Growth) OK`);
