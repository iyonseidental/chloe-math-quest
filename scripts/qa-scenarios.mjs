// QA Scenario 1~7 — 스펙의 Quality Assurance 요구를 코드 레벨에서 자동 검증한다.
// 엔진은 React 없이 순수 함수이므로 node로 직접 실행한다.
import { freshModel } from '../src/engine/store.ts';
import { recordAnswer } from '../src/engine/recorder.ts';
import { generateProblem } from '../src/engine/generators/index.ts';
import { planNextProblem, priorityScores } from '../src/engine/adaptive.ts';
import { acknowledgeReview, variantForStage, pendingCases } from '../src/engine/clinic.ts';
import { dueReviews } from '../src/engine/review.ts';
import { accelerationReadiness } from '../src/engine/progression.ts';

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
};

// 도우미: 정답 또는 특정 오류 태그의 오답을 고른다
function answer(model, problem, { correct, tag = null, speed = 0.7, hints = 0, clinicCaseId = null, today } = {}) {
  let idx;
  if (correct) idx = problem.answerIndex;
  else {
    idx = problem.choices.findIndex((c) => c.errorType === tag);
    if (idx === -1) idx = problem.choices.findIndex((c) => c.errorType !== null);
  }
  return recordAnswer(model, {
    problem,
    chosenIndex: idx,
    timeMs: problem.estimatedSec * 1000 * speed,
    hintsUsed: hints,
    selfDiagnosis: null,
    clinicCaseId,
    today,
  });
}

// ---------- Scenario 1: 계속 정답 → 난이도 상승 ----------
{
  let model = freshModel();
  const skillId = 'M1.NUM.INT';
  let leveledUp = false;
  for (let i = 0; i < 30 && model.skills[skillId].level < 2; i++) {
    const plan = planNextProblem(model, skillId);
    const p = generateProblem(plan.skillId, plan.level, plan.variant);
    const r = answer(model, p, { correct: true });
    model = r.model;
    if (r.result.leveledUp) leveledUp = true;
  }
  check('S1: 연속 정답 시 레벨 상승', model.skills[skillId].level >= 2 && leveledUp, `현재 Lv.${model.skills[skillId].level}`);
  check(
    'S1: 승급에 전이 문제 성공이 포함됨 (Mastery Gate)',
    model.attempts.some((a) => a.variant === 'transfer' && a.correct),
  );
}

// ---------- Scenario 2: 개념 오답 반복 → prerequisite remediation ----------
{
  let model = freshModel();
  const skillId = 'M1.ALG.EQ'; // prerequisite: M1.ALG.EXP (mastery 0)
  for (let i = 0; i < 2; i++) {
    const p = generateProblem(skillId, 1, 'standard');
    const r = answer(model, p, { correct: false, tag: 'CONCEPT', speed: 1.0 });
    model = r.model;
  }
  const plan = planNextProblem(model, skillId);
  check('S2: 개념 오답 반복 시 선수 개념으로 이동', plan.skillId === 'M1.ALG.EXP', `→ ${plan.skillId} (${plan.reason})`);
  const lastWrong = model.attempts.filter((a) => !a.correct).at(-1);
  check('S2: 자동 진단이 PREREQUISITE로 승격', lastWrong.autoDiagnosis === 'PREREQUISITE', lastWrong.autoDiagnosis);
}

// ---------- Scenario 3: 계산 실수 → 난이도를 불필요하게 내리지 않음 ----------
{
  let model = freshModel();
  const skillId = 'M1.NUM.INT';
  const before = model.skills[skillId].level;
  for (let i = 0; i < 2; i++) {
    const p = generateProblem(skillId, before, 'standard');
    const r = answer(model, p, { correct: false, tag: 'SIGN', speed: 0.9 });
    model = r.model;
  }
  const plan = planNextProblem(model, skillId);
  check(
    'S3: 계산·부호 실수 반복은 난이도 유지 + 재도전',
    plan.skillId === skillId && plan.level === before && plan.variant === 'similarA',
    `Lv.${plan.level} ${plan.variant}`,
  );
}

// ---------- Scenario 4 & 5: 오답 → similar 성공 → transfer 출제 → mastery 상승 ----------
{
  let model = freshModel();
  const skillId = 'M1.GEO.BASIC';
  const p0 = generateProblem(skillId, 1, 'standard');
  let r = answer(model, p0, { correct: false, tag: 'CONCEPT', speed: 1.0 });
  model = r.model;
  check('S4: 오답 시 클리닉 케이스 생성', r.result.clinicCaseCreated);

  let c = pendingCases(model.clinicQueue)[0];
  c = acknowledgeReview(c); // 개념 카드 확인 → similarA
  model = { ...model, clinicQueue: model.clinicQueue.map((x) => (x.id === c.id ? c : x)) };

  // Similar A 성공
  let p = generateProblem(skillId, c.level, variantForStage(c.stage));
  r = answer(model, p, { correct: true, clinicCaseId: c.id });
  model = r.model;
  c = model.clinicQueue.find((x) => x.id === c.id);
  check('S4: Similar A 성공 → Similar B 단계', c.stage === 'similarB');

  // Similar B 성공
  p = generateProblem(skillId, c.level, variantForStage(c.stage));
  r = answer(model, p, { correct: true, clinicCaseId: c.id });
  model = r.model;
  c = model.clinicQueue.find((x) => x.id === c.id);
  check('S4: Similar B 성공 → Transfer 문제 출제', c.stage === 'transfer' && variantForStage(c.stage) === 'transfer');

  // Transfer 성공 → mastery 상승 (S5)
  const masteryBefore = model.skills[skillId].mastery;
  p = generateProblem(skillId, c.level, variantForStage(c.stage));
  r = answer(model, p, { correct: true, clinicCaseId: c.id });
  model = r.model;
  c = model.clinicQueue.find((x) => x.id === c.id);
  check('S5: Transfer 성공 → mastery 상승', r.result.masteryDelta > 0, `${masteryBefore} → ${model.skills[skillId].mastery}`);
  check('S5: Transfer XP 가산 (+40)', r.result.xpReasons.some((x) => x.includes('전이')));

  // Mastery Check 성공 → 완치 + 복습 예약
  p = generateProblem(skillId, c.level, variantForStage(c.stage));
  r = answer(model, p, { correct: true, clinicCaseId: c.id });
  model = r.model;
  check('S4: Mastery Check 성공 → 클리닉 완치', r.result.clinicCaseResolved);
  check('S4: 완치 스킬이 복습 스케줄에 등록', model.reviews.some((v) => v.skillId === skillId));
}

// ---------- Scenario 6: 며칠 후 review → spaced repetition ----------
{
  let model = freshModel();
  const skillId = 'M1.STA.DATA';
  const D0 = '2026-08-18';
  // 레벨 정복까지 정답 반복 (복습 스케줄 등록 유도)
  for (let i = 0; i < 30 && model.skills[skillId].level < 2; i++) {
    const plan = planNextProblem(model, skillId);
    const p = generateProblem(plan.skillId, plan.level, plan.variant);
    model = answer(model, p, { correct: true, today: D0 }).model;
  }
  check('S6: 레벨 정복 시 복습 예약 (내일)', model.reviews.some((v) => v.skillId === skillId && v.dueDate === '2026-08-19'));

  // 1일 후 복습 등장 & 성공 → 다음 간격(3일)
  const due1 = dueReviews(model.reviews, '2026-08-19');
  check('S6: 예정일에 복습 문제 도래', due1.some((v) => v.skillId === skillId));
  let p = generateProblem(skillId, 1, 'review');
  let r = answer(model, p, { correct: true, today: '2026-08-19' });
  model = r.model;
  const rv = model.reviews.find((v) => v.skillId === skillId);
  check('S6: 복습 성공 → 다음 간격 3일 뒤', rv.dueDate === '2026-08-22', rv.dueDate);
  check('S6: 복습 성공 XP (+50)', r.result.xpReasons.some((x) => x.includes('복습')));

  // 다음 복습에서 실패 → 간격 리셋 + mastery 하향
  const masteryBefore = model.skills[skillId].mastery;
  p = generateProblem(skillId, 1, 'review');
  r = answer(model, p, { correct: false, tag: 'CONCEPT', today: '2026-08-22' });
  model = r.model;
  const rv2 = model.reviews.find((v) => v.skillId === skillId);
  check('S6: 복습 실패 → 간격 리셋(다음날)', rv2.stage === 0 && rv2.dueDate === '2026-08-23', rv2.dueDate);
  check('S6: 복습 실패 → mastery 조정(하향)', model.skills[skillId].mastery < masteryBefore, `${masteryBefore} → ${model.skills[skillId].mastery}`);
}

// ---------- Scenario 7: mastery 충분 → 다음 단원/학년 추천 ----------
{
  let model = freshModel();
  // 모든 스킬을 고성취 상태로 설정 (엔진 입력 조건 구성)
  for (const id of Object.keys(model.skills)) {
    model.skills[id] = { ...model.skills[id], mastery: 93, level: 5, masteredLevels: [1, 2, 3, 4] };
  }
  // 최근 30문제 정답률을 높게
  for (let i = 0; i < 10; i++) {
    const p = generateProblem('M1.NUM.INT', 5, 'standard');
    model = answer(model, p, { correct: true }).model;
  }
  const acc = accelerationReadiness(model);
  check('S7: 학년 정복 시 선행(중2) 준비 판정', acc.ready, `readiness ${acc.percent}%`);
  check('S7: 판정 근거 제공 (Explainability)', acc.reasons.length >= 3);

  // 약한 스킬이 있으면 우선순위가 그 스킬로
  model.skills['M1.ALG.EQ'] = { ...model.skills['M1.ALG.EQ'], mastery: 40 };
  const pri = priorityScores(model);
  check('S7: 약한 단원이 학습 우선순위 1위', pri[0].skillId === 'M1.ALG.EQ', pri[0].reasons.join(', '));
}

// ---------- Scenario 8 (Phase 2): 트랙 이동 — 위 학년 도전 & 아래 학년 구멍 메꾸기 ----------
{
  const { applyDiagnosis } = await import('../src/engine/recorder.ts');
  const { questCandidates } = await import('../src/engine/adaptive.ts');
  const { trackStatuses } = await import('../src/engine/progression.ts');
  const { buildTodayQuest } = await import('../src/engine/quest.ts');

  // 8a: 중1을 정복한 학생 → 중2 추천
  let model = freshModel();
  model = applyDiagnosis(model, {}, 'M1');
  for (const id of Object.keys(model.skills)) {
    if (id.startsWith('M1')) model.skills[id] = { ...model.skills[id], mastery: 93, level: 5, masteredLevels: [1, 2, 3, 4] };
  }
  for (let i = 0; i < 10; i++) {
    const p = generateProblem('M1.NUM.INT', 5, 'standard');
    model = answer(model, p, { correct: true }).model;
  }
  const st = trackStatuses(model);
  const m2 = st.find((s) => s.trackId === 'M2');
  check('S8a: 중1 정복(90+) 시 중2 과정 추천', m2?.recommended === true);

  // 8b: 중2 과정을 진단으로 시작했는데 중1 기초(일차방정식)가 약함 → 퀘스트 후보에 중1 구멍 포함
  let m = freshModel();
  m = applyDiagnosis(
    m,
    { 'M2.ALG.MONO': 2, 'M2.ALG.INEQ': 1, 'M2.ALG.SYS': 1, 'M2.FUN.LINEAR': 1, 'M2.GEO.TRI': 2, 'M2.STA.PROB': 2 },
    'M2',
  );
  // 중1 일차방정식 mastery는 0 (미학습) — 중2의 prerequisite 구멍
  const cands = questCandidates(m, 'M2');
  check('S8b: 중2 학습 후보에 아래 학년 구멍(중1 일차방정식) 포함', cands.includes('M1.ALG.EQ'));
  const quest = buildTodayQuest(m);
  check('S8b: 중2 퀘스트가 정상 구성됨', quest.blocks.length >= 2 && quest.blocks.some((b) => b.type === 'main'));

  // 8c: 중2 연립방정식에서 개념 오답 반복 → 중1 일차방정식으로 remediation
  let m2model = m;
  for (let i = 0; i < 2; i++) {
    const p = generateProblem('M2.ALG.SYS', 1, 'standard');
    m2model = answer(m2model, p, { correct: false, tag: 'CONCEPT', speed: 1.0 }).model;
  }
  const plan = planNextProblem(m2model, 'M2.ALG.SYS');
  check('S8c: 중2 개념 오답 반복 → 중1 선수 스킬로 이동', plan.skillId === 'M1.ALG.EQ', `→ ${plan.skillId}`);
}

// ---------- Scenario 9: 필수 복습 게이트 — 오답 미완치 시 승급 차단 ----------
{
  let model = freshModel();
  const skillId = 'M1.FUN.COORD';
  // 오답 1회 → 클리닉 케이스 생성
  const p0 = generateProblem(skillId, 1, 'standard');
  model = answer(model, p0, { correct: false, tag: 'CONCEPT', speed: 1.0 }).model;
  check('S9: 오답으로 클리닉 케이스 생성됨', model.clinicQueue.some((c) => !c.resolved && c.skillId === skillId));

  // 이후 계속 정답 (평소라면 승급 조건 충족) — 클리닉 미완치라 승급이 잠겨야 한다
  for (let i = 0; i < 12; i++) {
    const plan = planNextProblem(model, skillId);
    const p = generateProblem(plan.skillId, plan.level, plan.variant);
    model = answer(model, p, { correct: true }).model;
  }
  check('S9: 클리닉 미완치 동안 레벨 승급 차단', model.skills[skillId].level === 1, `현재 Lv.${model.skills[skillId].level}`);

  // 클리닉 완치 (similarA→similarB→transfer→check)
  const { acknowledgeReview: ack, variantForStage: vfs, pendingCases: pend } = await import('../src/engine/clinic.ts');
  let c = pend(model.clinicQueue)[0];
  c = ack(c);
  model = { ...model, clinicQueue: model.clinicQueue.map((x) => (x.id === c.id ? c : x)) };
  for (let guard = 0; guard < 6; guard++) {
    const cur = model.clinicQueue.find((x) => x.id === c.id);
    if (!cur || cur.resolved) break;
    const p = generateProblem(cur.skillId, cur.level, vfs(cur.stage));
    model = answer(model, p, { correct: true, clinicCaseId: cur.id }).model;
  }
  check('S9: 클리닉 완치됨', model.clinicQueue.find((x) => x.id === c.id)?.resolved === true);

  // 완치 후에는 승급 가능
  for (let i = 0; i < 10 && model.skills[skillId].level < 2; i++) {
    const plan = planNextProblem(model, skillId);
    const p = generateProblem(plan.skillId, plan.level, plan.variant);
    model = answer(model, p, { correct: true }).model;
  }
  check('S9: 완치 후 승급 재개', model.skills[skillId].level >= 2, `현재 Lv.${model.skills[skillId].level}`);
}

console.log(failures === 0 ? '\n🎉 QA 시나리오 전체 통과 (1~7 + 트랙 8 + 필수복습 9)' : `\n💥 ${failures}건 실패`);
process.exit(failures === 0 ? 0 : 1);
