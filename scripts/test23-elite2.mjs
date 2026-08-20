// Phase 3 STEP 6-8 — Elite Evidence Attribution 2.0 + Cluster Readiness + 차원 판별.
// STEP 6 (PART 19/20): 증거 지도 귀속, 배제 차원 무갱신, 교차오염 차단.
// STEP 7 (PART 22/23): 클러스터 readiness — 영역 평균이 약한 클러스터를 못 가림.
// STEP 8 (PART 21): 9×9 cross-loading matrix — 차원별 합성 학습자의 프로필 분리.
import { freshTwin21 } from '../src/engine2/replay21.ts';
import {
  applyEliteEvidence, freshEliteProfile, eliteDimensionLevel, clusterReadiness, domainReadiness,
  eliteEligibleForSkills, clustersOfSkills, classifyStruggle, classifyEliteFailure, deepValue, pickDeepFollowUp, ELITE_DIMENSIONS,
} from '../src/engine2/elite22.ts';
import { ELITE_BANK, ELITE_BANK_MAP, validateEliteBank } from '../src/engine2/eliteBank22.ts';
import { gradeOpenEnded } from '../src/engine2/openended23.ts';
import { SKILL_CLUSTERS, CLUSTER_OF, ALL_SKILL_IDS } from '../src/engine2/curriculum21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

// ============================ STEP 6 — Attribution 2.0 ============================
{
  const v = validateEliteBank();
  check('bank validation passes (evidenceMap 전수 선언 포함)', v.ok, v.issues.join('; '));
  check('every main problem declares an evidenceMap', ELITE_BANK.every((p) => !!p.evidenceMap));
}
{
  // 배제 차원 무갱신: GENERALIZATION 문제 정답 → exclusion(novelTransfer 등)은 α/β 완전 불변
  const p = ELITE_BANK.find((x) => x.id === 'E.GN.001');
  const payload = { problemId: p.id, eliteMode: p.mode, requiredSkills: p.requiredSkills, correct: true, hintsUsed: [], strategySwitches: 0, solveTimeSec: 100, estimatedSec: p.estimatedSec, followUpDimension: null, followUpOf: null };
  const before = freshEliteProfile();
  const after = applyEliteEvidence(before, payload, p.evidenceMap);
  check('primary dimension received full evidence', after[p.evidenceMap.primaryDimension].alpha > before[p.evidenceMap.primaryDimension].alpha);
  for (const d of p.evidenceMap.exclusionDimensions) {
    check(`exclusion dimension untouched: ${d}`, after[d].alpha === before[d].alpha && after[d].beta === before[d].beta);
  }
  // 부 차원은 선언 비율만 — primary 증가분보다 작아야 함
  const primGain = after[p.evidenceMap.primaryDimension].alpha - before[p.evidenceMap.primaryDimension].alpha;
  for (const sec of p.evidenceMap.secondaryDimensions) {
    const g = after[sec.dimension].alpha - before[sec.dimension].alpha;
    check(`secondary ${sec.dimension} gets fraction (${g.toFixed(2)} < ${primGain.toFixed(2)})`, g > 0 && g < primGain);
  }
  // 미관찰 차원(지도에 없는 차원) 자동 상승 없음 (PART 20)
  const mapped = new Set([p.evidenceMap.primaryDimension, ...p.evidenceMap.secondaryDimensions.map((s) => s.dimension)]);
  for (const d of ELITE_DIMENSIONS) {
    if (!mapped.has(d) && !p.evidenceMap.exclusionDimensions.includes(d) && d !== 'flexibility' && d !== 'representation') {
      check(`unmapped dimension not auto-bumped: ${d}`, after[d].alpha === before[d].alpha);
    }
  }
}
{
  // 관찰 행동 증거는 유지되, 배제 목록이 그것도 차단: 전환 성공 + flexibility 배제 문제
  const p = ELITE_BANK.find((x) => x.evidenceMap.exclusionDimensions.includes('flexibility'));
  const payload = { problemId: p.id, eliteMode: p.mode, requiredSkills: p.requiredSkills, correct: true, hintsUsed: [], strategySwitches: 2, solveTimeSec: 100, estimatedSec: p.estimatedSec, followUpDimension: null, followUpOf: null };
  const before = freshEliteProfile();
  const after = applyEliteEvidence(before, payload, p.evidenceMap);
  check(`exclusion blocks even behavior-observed bonus (flexibility on ${p.id})`, after.flexibility.alpha === before.flexibility.alpha);
}

// ============================ STEP 7 — Cluster Readiness ============================
{
  // 전 스킬이 정확히 하나의 클러스터에 속한다
  const counts = {};
  for (const c of SKILL_CLUSTERS) for (const s of c.skills) counts[s] = (counts[s] ?? 0) + 1;
  check('every skill belongs to exactly one cluster', ALL_SKILL_IDS.every((id) => counts[id] === 1), JSON.stringify(Object.entries(counts).filter(([, v]) => v !== 1)));
  check(`cluster count sane (${SKILL_CLUSTERS.length})`, SKILL_CLUSTERS.length >= 10);
}
{
  // 핵심 시나리오 (PART 23): ALG 영역 평균은 높지만 방정식 클러스터만 약함 →
  // 방정식 스킬을 요구하는 elite는 부적격, 문자식만 요구하는 elite는 적격.
  const twin = freshTwin21('cl-1');
  const boost = (t, ids, opts) => {
    const skills = { ...t.skills };
    for (const id of ids) {
      skills[id] = { ...skills[id], alpha: 40, beta: 5, attempts: 30, knowledgeState: opts.gated ? 'MASTERED' : 'UNSEEN', transfer: opts.transfer ? { ...skills[id].transfer, passedAt: { 3: true }, attempts: 2, passes: 2 } : skills[id].transfer };
    }
    return { ...t, skills };
  };
  const exprIds = SKILL_CLUSTERS.find((c) => c.id === 'ALG.EXPR').skills;
  const eqIds = SKILL_CLUSTERS.find((c) => c.id === 'ALG.EQUATION').skills;
  let t = boost(twin, exprIds, { gated: true, transfer: true });
  t = boost(t, ['M1.ALG.PAT.01'], { gated: true, transfer: true });
  // 방정식 클러스터는 약한 채로 둔다 (prior 상태)

  check('EXPR cluster is ELITE', clusterReadiness(t, 'ALG.EXPR') === 'ELITE', clusterReadiness(t, 'ALG.EXPR'));
  check('EQUATION cluster stays FOUNDATION (untouched)', clusterReadiness(t, 'ALG.EQUATION') === 'FOUNDATION');
  check('expression-only elite IS eligible', eliteEligibleForSkills(t, ['M1.ALG.EXP.01', 'M1.ALG.EXP.02']));
  check('equation-requiring elite is NOT eligible despite strong domain average', !eliteEligibleForSkills(t, ['M1.ALG.EQ.01', 'M1.ALG.EXP.01']));
  check('clustersOfSkills maps correctly', clustersOfSkills(['M1.ALG.EQ.01', 'M1.ALG.EXP.01']).map((c) => c.id).sort().join(',') === 'ALG.EQUATION,ALG.EXPR');
}
{
  // 활성 오개념이 있는 클러스터는 자격 박탈 (전제 안정 요건 계승)
  const twin = freshTwin21('cl-2');
  const ids = SKILL_CLUSTERS.find((c) => c.id === 'NUM.INTOPS').skills;
  let t = { ...twin, skills: { ...twin.skills } };
  for (const id of ids) t.skills[id] = { ...t.skills[id], alpha: 40, beta: 5, attempts: 30, knowledgeState: 'MASTERED', transfer: { ...t.skills[id].transfer, passedAt: { 3: true }, attempts: 1, passes: 1 } };
  check('cluster ELITE when clean', clusterReadiness(t, 'NUM.INTOPS') === 'ELITE');
  t = { ...t, misconceptions: [{ misconceptionId: 'MIS.SIGN.NEGSQ', skillId: 'M1.NUM.POW.01', status: 'ACTIVE', evidenceScore: 2, ratioOpportunities: 6, ratioMatches: 5 }] };
  check('active misconception blocks the cluster', clusterReadiness(t, 'NUM.INTOPS') === 'FOUNDATION');
}

// ============================ STEP 8 — 9×9 차원 판별 ============================
// 차원별 합성 학습자: "그 차원이 주 부하인 항목만 성공, 나머지는 실패".
// 본문(evidenceMap.primary)과 후속(dimension)을 전부 흘려보내고 프로필을 측정한다.
{
  const items = [];
  for (const p of ELITE_BANK) {
    items.push({ kind: 'main', primary: p.evidenceMap.primaryDimension, payload: { problemId: p.id, eliteMode: p.mode, requiredSkills: p.requiredSkills, hintsUsed: [], strategySwitches: 0, solveTimeSec: 100, estimatedSec: p.estimatedSec, followUpDimension: null, followUpOf: null }, map: p.evidenceMap });
    for (const f of p.followUps) {
      items.push({ kind: 'fu', primary: f.dimension, payload: { problemId: f.id, eliteMode: p.mode, requiredSkills: p.requiredSkills, hintsUsed: [], strategySwitches: 0, solveTimeSec: 60, estimatedSec: 60, followUpDimension: f.dimension, followUpOf: p.id }, map: null });
    }
  }
  const primaryCoverage = {};
  for (const it of items) primaryCoverage[it.primary] = (primaryCoverage[it.primary] ?? 0) + 1;
  console.log('  [coverage] primary loadings per dimension:', JSON.stringify(primaryCoverage));

  const matrix = {};
  for (const d of ELITE_DIMENSIONS) {
    let prof = freshEliteProfile();
    for (const it of items) {
      const correct = it.primary === d;
      prof = applyEliteEvidence(prof, { ...it.payload, correct }, it.map);
    }
    matrix[d] = Object.fromEntries(ELITE_DIMENSIONS.map((d2) => [d2, eliteDimensionLevel(prof[d2]).level]));
  }

  // 매트릭스 출력 (리포트 PART F 소재)
  const short = (d) => d.slice(0, 6).padEnd(6);
  console.log('  [9x9] row=학습자 강점 차원, col=측정 차원 (level)');
  console.log('         ' + ELITE_DIMENSIONS.map(short).join(' '));
  for (const d of ELITE_DIMENSIONS) {
    console.log(`  ${short(d)} ` + ELITE_DIMENSIONS.map((d2) => matrix[d][d2].toFixed(2).padEnd(6)).join(' '));
  }

  // 판별 기준 (STEP 9 이후): 9/9 전 차원이 주 부하 ≥2 — 각 학습자의 해당 차원 레벨이
  // (a) 그 행에서 최고이고 (b) 타 차원 대비 ≥0.10 분리.
  const testable = ELITE_DIMENSIONS.filter((d) => (primaryCoverage[d] ?? 0) >= 2);
  check(`ALL 9 dimensions have >=2 primary loadings (bank 2.0)`, testable.length === 9, JSON.stringify(primaryCoverage));
  for (const d of testable) {
    const own = matrix[d][d];
    const others = ELITE_DIMENSIONS.filter((x) => x !== d).map((x) => matrix[d][x]);
    const maxOther = Math.max(...others);
    check(`discrimination: ${d} learner peaks on own dimension (${own.toFixed(2)} vs max-other ${maxOther.toFixed(2)})`, own > maxOther && own - maxOther >= 0.1);
  }
}

// ============================ STEP 9 — Bank 2.0 규모/커버리지 ============================
{
  check(`bank has >= 50 main problems (${ELITE_BANK.length})`, ELITE_BANK.length >= 50);
  const byMode = {};
  for (const p of ELITE_BANK) byMode[p.mode] = (byMode[p.mode] ?? 0) + 1;
  check('all 10 modes present with >= 5 each', Object.keys(byMode).length === 10 && Object.values(byMode).every((n) => n >= 5), JSON.stringify(byMode));
  check('every problem has a novelty signature', ELITE_BANK.every((p) => !!p.noveltySignature));
  const fuCount = ELITE_BANK.reduce((a, p) => a + p.followUps.length, 0);
  check(`follow-up pool present (${fuCount})`, fuCount >= 20);
}

// ============================ STEP 10 — OPEN_ENDED 채점 (PART 16-18) ============================
{
  const oe = ELITE_BANK.filter((p) => p.mode === 'OPEN_ENDED');
  check('every OPEN_ENDED problem carries a 5-level rubric', oe.every((p) => p.rubric && p.rubric.criteria.length === 5));
  const rubric = oe[0].rubric;
  const g3 = gradeOpenEnded(rubric, { mainCorrect: true, hintsUsed: [], justificationFollowUpCorrect: true, generalizationFollowUpCorrect: null });
  check('correct + justified → level 3 with reason', g3.status === 'GRADED' && g3.rubricLevel === 3 && g3.reason.length > 5);
  const g4 = gradeOpenEnded(rubric, { mainCorrect: true, hintsUsed: [], justificationFollowUpCorrect: true, generalizationFollowUpCorrect: true });
  check('… + generalization → level 4', g4.rubricLevel === 4);
  const g2 = gradeOpenEnded(rubric, { mainCorrect: true, hintsUsed: [], justificationFollowUpCorrect: false, generalizationFollowUpCorrect: null });
  check('correct answer + failed justification → level 2 (정답≠추론 품질, PART 18)', g2.rubricLevel === 2 && g2.answerCorrect === true);
  const g1 = gradeOpenEnded(rubric, { mainCorrect: false, hintsUsed: [], justificationFollowUpCorrect: true, generalizationFollowUpCorrect: null });
  check('wrong answer + valid reasoning → level 1 (부분 관찰)', g1.rubricLevel === 1 && g1.answerCorrect === false);
  const gNR = gradeOpenEnded(rubric, { mainCorrect: true, hintsUsed: ['A', 'B', 'C', 'D'], justificationFollowUpCorrect: true, generalizationFollowUpCorrect: null });
  check('D힌트까지 쓴 정답 → NEEDS_REVIEW (불투명 확신 금지, PART 16)', gNR.status === 'NEEDS_REVIEW' && gNR.rubricLevel === null);
  const gNoObs = gradeOpenEnded(rubric, { mainCorrect: true, hintsUsed: [], justificationFollowUpCorrect: null, generalizationFollowUpCorrect: null });
  check('근거 미관찰 → 추론 품질 판정 보류', gNoObs.status === 'NEEDS_REVIEW');
  // PART 18: OE 본문 정답이 justification/explanation을 올리지 않음 (evidenceMap 배제 강제)
  for (const p of oe) {
    check(`${p.id}: main excludes justification+explanation (정답만으로 근거 점수 금지)`, p.evidenceMap.exclusionDimensions.includes('justification') && p.evidenceMap.exclusionDimensions.includes('explanation'));
  }
}

// ============================ STEP 11 — One Problem Deep 2.0 (PART 39/40) ============================
{
  const twin = freshTwin21('opd');
  const prob = ELITE_BANK_MAP['E.NR.001']; // followUps: generalization + justification
  // justification이 이미 강한 학생 → generalization 후속이 선택되어야 한다
  const t1 = { ...twin, elite: { ...twin.elite, justification: { alpha: 20, beta: 2 } } };
  const pick1 = pickDeepFollowUp(t1, prob.requiredSkills, prob.followUps, 0);
  check('DeepValue picks the WEAK dimension follow-up (justification 강함 → generalization)', pick1.fu.dimension === 'generalization', pick1.fu.dimension);
  // 반대: generalization이 강하면 justification 후속
  const t2 = { ...twin, elite: { ...twin.elite, generalization: { alpha: 20, beta: 2 } } };
  const pick2 = pickDeepFollowUp(t2, prob.requiredSkills, prob.followUps, 0);
  check('… and vice versa (generalization 강함 → justification)', pick2.fu.dimension === 'justification', pick2.fu.dimension);
  // 최근 낸 후속은 novelty 소멸로 순위 하락 — 중립 프로필(약점 격차 없음)에서 검증.
  // (약점 격차가 큰 극단 프로필에서는 약점 강화가 novelty 패널티를 이기는 것이 옳다.)
  const pickNeutral = pickDeepFollowUp(twin, prob.requiredSkills, prob.followUps, 0);
  const t3 = { ...twin, recentEliteIds: [pickNeutral.fu.id] };
  const pick3 = pickDeepFollowUp(t3, prob.requiredSkills, prob.followUps, 0);
  check('recently-served follow-up loses novelty (재탕 방지)', pick3.fu.id !== pickNeutral.fu.id, `${pickNeutral.fu.id} → ${pick3.fu.id}`);
  // breakdown 전 요소 존재 (PART 40 명세)
  const dv = deepValue(twin, prob.requiredSkills, prob.followUps[0], 1);
  check('DeepValue breakdown carries all 5 declared factors', ['weakDimension', 'relevantMastery', 'novelty', 'exposureGap', 'cognitiveLoadFit'].every((k) => typeof dv.breakdown[k] === 'number'));
}

// ============================ STEP 12 — Struggle / Overload (PART 36-38) ============================
{
  const base = { solved: false, solveTimeSec: 300, estimatedSec: 200, strategySwitches: 0, hintsUsed: [], knowledgeWeak: false };
  check('KNOWLEDGE_BLOCK: 개념 부적정이면 분투가 아니라 차단', classifyStruggle({ ...base, knowledgeWeak: true }).quality === 'KNOWLEDGE_BLOCK');
  check('RANDOM_TRIAL: 초고속 무탐색 오답', classifyStruggle({ ...base, solveTimeSec: 30 }).quality === 'RANDOM_TRIAL');
  check('PRODUCTIVE_STRUGGLE: 오래 + 전환 흔적 (실패여도)', classifyStruggle({ ...base, strategySwitches: 2 }).quality === 'PRODUCTIVE_STRUGGLE');
  check('PRODUCTIVE_STRUGGLE: 자력 해결', classifyStruggle({ ...base, solved: true, solveTimeSec: 500 }).quality === 'PRODUCTIVE_STRUGGLE');
  check('STUCK_NO_PROGRESS: 정체 (움직임 없음)', classifyStruggle({ ...base, solveTimeSec: 150 }).quality === 'STUCK_NO_PROGRESS');
  check('분류는 근거 문자열을 동반 (black-box 금지)', classifyStruggle(base).reason.length > 10);

  // PART 38: 시간 단독으로는 COGNITIVE_OVERLOAD 판정 금지
  const twin = freshTwin21('ovl');
  const strongSkills = { ...twin.skills };
  for (const id of ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02']) strongSkills[id] = { ...strongSkills[id], alpha: 30, beta: 3, attempts: 20 };
  const t = { ...twin, skills: strongSkills };
  const slowOnly = classifyEliteFailure({ twin: t, requiredSkills: ['M1.NUM.SIGN.01'], eliteMode: 'NON_ROUTINE', hintsUsed: [], strategySwitches: 0, solveTimeSec: 900, estimatedSec: 200, failedFollowUpDimension: null });
  check('오래 풀었다는 이유만으로는 OVERLOAD 아님', slowOnly.rootCause !== 'COGNITIVE_OVERLOAD', slowOnly.rootCause);
  const multiSignal = classifyEliteFailure({ twin: t, requiredSkills: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'], eliteMode: 'MULTI_SKILL', hintsUsed: ['A', 'B', 'C'], strategySwitches: 2, solveTimeSec: 900, estimatedSec: 200, failedFollowUpDimension: null });
  check('장시간 + 복수 신호(전략 폐기+힌트 반복+다중 구조) → OVERLOAD', multiSignal.rootCause === 'COGNITIVE_OVERLOAD', multiSignal.rootCause);
}

console.log(`\n${pass} checks passed — Phase 3 Step 6-12 (Elite Depth Hardening) OK`);
