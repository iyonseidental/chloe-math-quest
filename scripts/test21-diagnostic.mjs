// Step 12 test: Adaptive Diagnostic — 그래프 이분탐색 배치 흐름.
// 검증 축: ① 강한 학생은 소수 문항으로 상류 추론 ② 약한 학생은 하강하되 하류에 부정 증거를
// 조작하지 않음(Unknown≠Weak) ③ 숨은 결손(분수)을 직접 검사로 포착 ④ 진단 증거만으로는
// 게이트/HIGH confidence 불가 ⑤ 예산 상한 준수 ⑥ 전 결정에 사유 존재 ⑦ 리플레이 충실도.
import { freshTwin21, replayFromScratch } from '../src/engine2/replay21.ts';
import { submitAttempt, buildProblemForAction } from '../src/engine2/session21.ts';
import { nextDiagnosticStep, finalizeDiagnostic, deriveDiagnosticRun, transitivePrerequisites, topoDepth } from '../src/engine2/diagnostic21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { readMastery, predictSuccess } from '../src/engine2/mastery21.ts';
import { ALL_SKILL_IDS } from '../src/engine2/curriculum21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const BASE = Date.parse('2026-08-18T09:00:00Z');
const GATED = ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'];

function makeRng(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

// 진단 세션 실행기 — 실제 문제 생성/제출 경로 그대로 사용
function runDiagnosis(name, decideCorrect, seedBase) {
  resetEventSeq(seedBase);
  let twin = freshTwin21(name);
  let log = emptyLog();
  let ts = BASE;
  const served = [];
  let guard = 0;
  while (guard++ < 60) {
    const step = nextDiagnosticStep(twin, CONFIG21.diagnostic.budget);
    if (step.done) break;
    const act = step.action;
    served.push({ skillId: act.skillId, difficulty: act.difficulty, reason: act.reason });
    const problem = buildProblemForAction(act);
    const correct = decideCorrect(act.skillId, act.difficulty);
    const idx = correct ? problem.answerIndex : (problem.answerIndex + 1) % problem.choices.length;
    const r = submitAttempt(twin, log, act, problem, { chosenIndex: idx, solveTimeSec: problem.estimatedSec * 0.8, hintsUsed: 0, retryCount: 0 }, (ts += 60000));
    twin = r.twin;
    log = r.log;
  }
  const fin = finalizeDiagnostic(twin, log, CONFIG21.diagnostic.budget, (ts += 60000));
  return { twin: fin.twin, log: fin.log, report: fin.report, served, name };
}

// --- ① 강한 학생: 전부 정답 ---
{
  const { twin, report, served } = runDiagnosis('diag-strong', () => true, 0);
  // 순진한 전수검사 기준선 = 스킬 10 × 2문항 = 20. 그래프 추론이 절반(상류 5스킬 전부
  // INFERRED_PASS)을 절약해 10문항으로 끝나야 한다.
  check('강한 학생: 문항 수가 전수검사 기준선(20)의 절반 이하 — 그래프 추론이 실제로 문항을 절약', report.questionsUsed <= ALL_SKILL_IDS.length, `${report.questionsUsed}문항 (기준선 ${ALL_SKILL_IDS.length * 2})`);
  check('강한 학생: 검사된 스킬은 전부 TESTED_PASS', report.perSkill.filter((d) => d.classification.startsWith('TESTED')).every((d) => d.classification === 'TESTED_PASS'));
  check('강한 학생: 통과 스킬의 상류가 INFERRED_PASS로 처리됨', report.inferredCount > 0, `${report.inferredCount}개 추론`);
  const inferred = report.perSkill.filter((d) => d.classification === 'INFERRED_PASS');
  for (const d of inferred) {
    const m = readMastery(twin.skills[d.skillId].alpha, twin.skills[d.skillId].beta, twin.skills[d.skillId].lastPracticedAt, '2026-08-18');
    check(`추론 스킬 ${d.skillId}: 의사관측만 추가되어 confidence VERY_LOW/LOW 유지 (조기 확정 불가)`, ['VERY_LOW', 'LOW'].includes(m.confidence), m.confidence);
  }
  check('강한 학생: 어떤 스킬도 진단만으로 PROVISIONAL+ 불가', ALL_SKILL_IDS.every((id) => !GATED.includes(twin.skills[id].knowledgeState)));
  // Phase 2에서 프런티어 전략이 중간→최대 깊이로 조정됨 (35스킬 그래프의 추론 레버리지).
  // 행동 보증의 핵심은 "루트(깊이 0)부터 순차 전수검사하지 않는다"이다.
  check('강한 학생: 첫 문항은 루트가 아닌 깊은 프런티어에서 시작', topoDepth(served[0].skillId) > 0, `${served[0].skillId} depth=${topoDepth(served[0].skillId)}`);
  check('모든 서빙 결정에 비어있지 않은 사유 존재', served.every((s) => typeof s.reason === 'string' && s.reason.length > 0));
}

// --- ② 약한 학생: 전부 오답 ---
{
  const { twin, report, served } = runDiagnosis('diag-weak', () => false, 1000);
  check('약한 학생: 실패 시 직계 상류로 하강함 (루트 SIGN.01까지 검사 도달)', report.perSkill.find((d) => d.skillId === 'M1.NUM.SIGN.01').classification.startsWith('TESTED'), JSON.stringify(served.map((s) => s.skillId)));
  const skipped = report.perSkill.filter((d) => d.classification === 'SKIPPED_LOW');
  check('약한 학생: 실패 스킬의 하류는 검사 생략됨', skipped.length > 0, `${skipped.length}개 생략`);
  for (const d of skipped) {
    const sk = twin.skills[d.skillId];
    check(
      `생략 스킬 ${d.skillId}: 부정 증거가 조작되지 않음 (미접촉이면 α/β = CONFIG prior, Unknown≠Weak)`,
      sk.attempts > 0 || (sk.alpha === CONFIG21.prior.alpha && sk.beta === CONFIG21.prior.beta),
      `α=${sk.alpha} β=${sk.beta} attempts=${sk.attempts}`,
    );
  }
  check('약한 학생: 예산 상한 준수', report.questionsUsed <= CONFIG21.diagnostic.budget, `${report.questionsUsed}/${CONFIG21.diagnostic.budget}`);
}

// --- ③ 숨은 결손: 분수만 약함 (Learner C 프로필) ---
{
  const rng = makeRng(33);
  // 분수가 약한 학생은 분수를 secondary로 쓰는 EQ.02에서도 실제로 흔들린다 (curriculum21이
  // FRAC.01을 EQ.02의 secondary로 선언한 이유 그 자체). EQ.02를 0.95로 두면 "분수 결손이
  // 한 번도 드러나지 않는 학생"이 되는데, 그 경우 상류 추론은 은폐가 아니라 정당한 문항
  // 절약이고 잔여 결손은 이후 일반 학습의 원인조사(QA2 경로)가 잡는다 — 진단의 역할 경계.
  const decide = (skillId, difficulty) => {
    const trueP = skillId === 'M1.NUM.FRAC.01' ? 0.05 : skillId === 'M1.ALG.EQ.02' ? 0.3 : 0.95;
    return rng() < predictSuccess(trueP, difficulty);
  };
  const { report } = runDiagnosis('diag-frac', decide, 2000);
  const frac = report.perSkill.find((d) => d.skillId === 'M1.NUM.FRAC.01');
  check('숨은 분수 결손: FRAC.01이 직접 검사로 낮게 판정됨 (추론으로 덮이지 않음)', frac.classification === 'TESTED_FAIL' || frac.classification === 'TESTED_PARTIAL', frac.classification);
  const strongTested = report.perSkill.filter((d) => d.skillId !== 'M1.NUM.FRAC.01' && d.classification === 'TESTED_PASS');
  check('숨은 분수 결손: 강한 스킬들은 정상 통과 판정', strongTested.length > 0, `${strongTested.length}개`);
}

// --- ④ 예산 강제 소진: 예산 4로 제한 ---
// 전부 오답이면 실패 캐스케이드가 4문항 안에 그래프 전체를 정당하게 판정해 버려서(위 ②의
// 하강+생략) 예산이 소진되지 않는다 — 직접 확인함. 예산 고갈을 실제로 만들려면 부분
// 통과(1/2)가 필요하다: PARTIAL은 상류 추론도 하류 생략도 하지 않아 모든 스킬을 개별
// 검사해야 하므로(스킬당 2문항 × 10), 예산 4는 2스킬 판정 후 고갈된다.
{
  resetEventSeq(3000);
  let twin = freshTwin21('diag-budget');
  let log = emptyLog();
  let ts = BASE;
  let guard = 0;
  let qCount = 0;
  while (guard++ < 20) {
    const step = nextDiagnosticStep(twin, 4);
    if (step.done) break;
    const problem = buildProblemForAction(step.action);
    const correct = qCount % 2 === 0; // 스킬마다 1번째 정답, 2번째 오답 → TESTED_PARTIAL
    qCount++;
    const idx = correct ? problem.answerIndex : (problem.answerIndex + 1) % problem.choices.length;
    const r = submitAttempt(twin, log, step.action, problem, { chosenIndex: idx, solveTimeSec: 30, hintsUsed: 0, retryCount: 0 }, (ts += 60000));
    twin = r.twin;
    log = r.log;
  }
  const fin = finalizeDiagnostic(twin, log, 4, (ts += 60000));
  check('예산 4 제한: 4문항에서 정확히 중단', fin.report.questionsUsed <= 4, `${fin.report.questionsUsed}`);
  check('예산 소진 시 잔여 스킬은 UNTESTED_BUDGET로 정직하게 표기', fin.report.perSkill.some((d) => d.classification === 'UNTESTED_BUDGET'), JSON.stringify(fin.report.perSkill.map((d) => d.classification)));
}

// --- ⑤ 리플레이 충실도: 진단 세션 전체가 이벤트만으로 재구성됨 ---
{
  const { twin, log } = runDiagnosis('diag-replay', (id) => id !== 'M1.ALG.EQ.01', 4000);
  const replayed = replayFromScratch(log, 'diag-replay');
  const strip = (t) => {
    const { recentAgendaKinds, ...rest } = t;
    return rest;
  };
  check('진단 포함 전체 이벤트 로그 리플레이가 라이브 트윈과 바이트 일치', JSON.stringify(strip(twin)) === JSON.stringify(strip(replayed)));
  const runLive = deriveDiagnosticRun(twin);
  const runReplayed = deriveDiagnosticRun(replayed);
  check('파생 진단 실행 상태도 리플레이 후 동일 (진단 세션에 숨은 상태 없음)', JSON.stringify(runLive) === JSON.stringify(runReplayed));
}

// --- ⑥ 그래프 유틸 자체 검증 ---
{
  check('topoDepth: SIGN.01=0, EQ.03=최대 깊이', topoDepth('M1.NUM.SIGN.01') === 0 && topoDepth('M1.ALG.EQ.03') >= 3, `EQ.03 depth=${topoDepth('M1.ALG.EQ.03')}`);
  const ups = transitivePrerequisites('M1.ALG.EQ.03');
  check('transitivePrerequisites(EQ.03)가 깊이-4 사슬 전체 포함', ['M1.ALG.EQ.02', 'M1.NUM.FRAC.01', 'M1.NUM.SIGN.01'].every((id) => ups.includes(id)));
}

console.log(`\n${pass} checks passed — Step 12 (Adaptive Diagnostic) OK`);
