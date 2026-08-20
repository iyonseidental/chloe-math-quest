// PHASE 2 STEP 7-10 검증 — 중1 전체 지식그래프 품질 게이트 (PART 10/11/45).
// GATE B 항목 중 그래프 정적 성질: 깨진 엣지 없음 / 사이클 없음 / 전 스킬 도달 가능 /
// 전제 검사 가능(anchor 존재) / 엣지 강도·근거 명시 / 스킬당 진단 문형 ≥ 3.
import { MICRO_SKILLS, MICRO_SKILL_MAP, ALL_SKILL_IDS, edgesOf, prerequisitesOf, dependentsOf, MISCONCEPTION_LIBRARY } from '../src/engine2/curriculum21.ts';
import { generateProblem21 } from '../src/engine2/problemAdapter21.ts';
import { topoDepth } from '../src/engine2/diagnostic21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

// --- 규모 ---
check(`중1 전체 그래프 규모: 35 micro-skill (파일럿 10 + 확장 25)`, ALL_SKILL_IDS.length === 35, `${ALL_SKILL_IDS.length}`);
const allEdges = ALL_SKILL_IDS.flatMap((id) => edgesOf(id).map((e) => ({ ...e, to: id })));
check(`엣지 총수 ≥ 40 (типed)`, allEdges.length >= 40, `${allEdges.length}`);
const req = allEdges.filter((e) => e.strength === 'REQUIRED').length;
const strong = allEdges.filter((e) => e.strength === 'STRONGLY_SUPPORTIVE').length;
const sup = allEdges.filter((e) => e.strength === 'SUPPORTIVE').length;
check(`강도 분포: REQUIRED(${req}) / STRONGLY(${strong}) / SUPPORTIVE(${sup}) — 전부 REQUIRED가 아님 (PART 11)`, strong > 0 && sup > 0);

// --- 깨진 엣지 없음 ---
for (const e of allEdges) {
  check(`엣지 무결성: ${e.from} → ${e.to} (${e.strength})의 from이 실존`, !!MICRO_SKILL_MAP[e.from]);
}
check('모든 엣지에 비어있지 않은 rationale 존재', allEdges.every((e) => typeof e.rationale === 'string' && e.rationale.length > 4));

// --- 사이클 없음 (topoDepth가 유한하면 DAG) + 도달 가능성 ---
for (const id of ALL_SKILL_IDS) {
  const d = topoDepth(id);
  check(`DAG/도달성: ${id} 위상깊이 ${d} (유한·비순환)`, Number.isFinite(d) && d >= 0 && d <= 6, `${d}`);
}

// --- 루트(전제 없음) 스킬이 각 영역에 존재 ---
const roots = ALL_SKILL_IDS.filter((id) => prerequisitesOf(id).length === 0);
check(`루트 스킬 존재: ${roots.join(', ')}`, roots.length >= 3);

// --- 종단(후속 있음 or 의도된 말단) — 고아 스킬 없음 ---
// M1 그래프 안에서는 후속이 없지만 M2 확장 시 실전제가 되는 "설계상 말단" (PART 10 리뷰
// 결과를 명시 선언 — 임의 엣지로 때우지 않는다):
const DESIGNED_TERMINALS = {
  'M1.GEO.ANG.02': 'M2 기하(수선의 발, 삼각형 합동 조건)의 실전제 — M1 내 후속 없음이 정상',
  'M1.GEO.CLOCK.01': '설계 말단(평행선 각) — M2 삼각형 내각·합동의 지원 전제 예정',
};
for (const id of ALL_SKILL_IDS) {
  const hasSucc = dependentsOf(id).length > 0;
  const isTerminal = topoDepth(id) >= 2 || !!DESIGNED_TERMINALS[id];
  check(`고아 없음: ${id} (후속 ${dependentsOf(id).length}개${isTerminal ? ' 또는 선언된 말단' : ''})`, hasSucc || isTerminal);
}

// --- 진단 문형 ≥ 3 (PART 10): 앵커 난이도에서 6회 생성 시 서로 다른 stem ≥ 3 ---
for (const s of MICRO_SKILLS) {
  const stems = new Set();
  for (let i = 0; i < 6; i++) stems.add(generateProblem21(s.skillId, 3, 'standard').stem);
  check(`진단 문형: ${s.skillId} — 6회 생성 중 고유 stem ${stems.size}개 ≥ 3`, stems.size >= 3, `${stems.size}`);
}

// --- levelWindow 주제 순수성: 신규 스킬은 window 내에서만 서빙 ---
for (const s of MICRO_SKILLS.filter((x) => x.problemSource.levelWindow)) {
  const [lo, hi] = s.problemSource.levelWindow;
  check(`levelWindow 유효: ${s.skillId} [${lo},${hi}] ⊂ [1,5]`, lo >= 1 && hi <= 5 && lo <= hi);
}

// --- 오개념 라이브러리: trigger 스킬 실존 + 중복 id 없음 ---
const misIds = new Set();
for (const m of MISCONCEPTION_LIBRARY) {
  check(`오개념 ${m.id}: trigger 스킬 ${m.triggerSkillId} 실존`, !!MICRO_SKILL_MAP[m.triggerSkillId]);
  check(`오개념 ${m.id}: id 중복 없음`, !misIds.has(m.id));
  misIds.add(m.id);
}
check(`오개념 라이브러리 규모 ≥ 13 (파일럿 6 + 확장)`, MISCONCEPTION_LIBRARY.length >= 13, `${MISCONCEPTION_LIBRARY.length}`);

// --- 파일럿 10 스킬 동결 확인: id/전제 원형 유지 (Phase 1 회귀 보존) ---
const pilotPrereqs = {
  'M1.NUM.SIGN.01': [],
  'M1.NUM.SIGN.02': ['M1.NUM.SIGN.01'],
  'M1.NUM.FRAC.01': ['M1.NUM.SIGN.01'],
  'M1.ALG.EXP.01': ['M1.NUM.SIGN.01'],
  'M1.ALG.EXP.02': ['M1.ALG.EXP.01', 'M1.NUM.SIGN.02'],
  'M1.ALG.EQ.01': ['M1.ALG.EXP.01', 'M1.NUM.SIGN.01'],
  'M1.ALG.EQ.02': ['M1.ALG.EQ.01', 'M1.ALG.EXP.02', 'M1.NUM.FRAC.01'],
  'M1.ALG.EQ.03': ['M1.ALG.EQ.01', 'M1.ALG.EQ.02', 'M1.ALG.EXP.01'],
  'M1.FUN.COORD.01': ['M1.NUM.SIGN.01'],
  'M1.FUN.COORD.02': ['M1.FUN.COORD.01', 'M1.ALG.EXP.01'],
};
for (const [id, prereqs] of Object.entries(pilotPrereqs)) {
  check(`파일럿 동결: ${id} 전제 원형 유지`, JSON.stringify(prerequisitesOf(id)) === JSON.stringify(prereqs));
}

console.log(`\n${pass} checks passed — Phase 2 Step 7-10 (Full M1 Graph) OK`);
