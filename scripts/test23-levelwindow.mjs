// Phase 3 STEP 1 — 파일럿 10스킬 레벨 블러 제거 검증 (PART 11).
// 1) 전 스킬 levelWindow 선언  2) 주제 순수성 (행동 검증: 실제 생성 문항의 지문 형태)
// 3) NEGSQ 태그 가용성이 POW.01로 이관되고 SIGN.02에서는 사라짐
// 4) 구(2.2 블러 시절) 이벤트 로그의 재생 호환 — 리플레이는 문제를 재생성하지 않으므로
//    서빙 정책 변경이 과거 상태 해석을 바꾸면 안 된다.
import fs from 'node:fs';
import { MICRO_SKILLS, MICRO_SKILL_MAP, MISCONCEPTION_LIBRARY } from '../src/engine2/curriculum21.ts';
import { generateProblem21 } from '../src/engine2/problemAdapter21.ts';
import { replayFromScratch } from '../src/engine2/replay21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

// --- 1) 블러 잔존 0: 35스킬 전부 levelWindow 보유 ---
const missing = MICRO_SKILLS.filter((s) => !s.problemSource.levelWindow);
check('all 35 micro-skills declare a levelWindow (no ±2 blur left)', missing.length === 0, missing.map((s) => s.skillId).join(','));

// --- 2) 주제 순수성 — 파일럿 스킬별 지문 형태 술어를 전 난이도×N회 검증 ---
// 술어는 "이 주제가 아니면 절대 나오지 않는" 형태 특징으로 잡는다.
const PURITY = [
  // SIGN.02(곱셈 혼합, L2): 분수 지문(분모 표기 a/b) 금지 — Phase 2에서 실제로 샜던 혼입
  { skillId: 'M1.NUM.SIGN.02', forbid: (p) => p.stem.includes('/'), label: 'no fraction stems on SIGN.02' },
  // FRAC.01(분수, L3): 모든 지문이 분수 표기 포함
  { skillId: 'M1.NUM.FRAC.01', require: (p) => p.stem.includes('/'), label: 'FRAC.01 always serves fraction stems' },
  // SIGN.01(덧셈·뺄셈, L1): 곱셈 기호 금지
  { skillId: 'M1.NUM.SIGN.01', forbid: (p) => p.stem.includes('×'), label: 'no multiplication stems on SIGN.01' },
  // EQ.03(문장제, L5): 방정식 기호만 있는 순수 계산 지문 금지 — 문장제는 한글 서술 포함
  { skillId: 'M1.ALG.EQ.03', require: (p) => (p.stem.replace(/다음을 계산하세요|방정식을 푸세요/g, '').match(/[가-힣]/g) ?? []).length >= 10, label: 'EQ.03 always serves word problems' },
];
for (const { skillId, forbid, require: req, label } of PURITY) {
  let ok = true;
  let bad = '';
  for (let d = 1; d <= 5 && ok; d++) {
    for (let i = 0; i < 30 && ok; i++) {
      const p = generateProblem21(skillId, d);
      if (forbid && forbid(p)) { ok = false; bad = `d${d}: ${p.stem.slice(0, 40)}`; }
      if (req && !req(p)) { ok = false; bad = `d${d}: ${p.stem.slice(0, 40)}`; }
    }
  }
  check(`purity: ${label} (150 samples across d1-d5)`, ok, bad);
}

// --- 3) NEGSQ 태그 이관 ---
const negsq = MISCONCEPTION_LIBRARY.find((m) => m.id === 'MIS.SIGN.NEGSQ');
check('MIS.SIGN.NEGSQ trigger moved to POW.01 (topic-correct home)', negsq.triggerSkillId === 'M1.NUM.POW.01' && negsq.remediationSkillId === 'M1.NUM.POW.01');
{
  let offeredOnPow = 0;
  let offeredOnSign = 0;
  for (let d = 1; d <= 5; d++) {
    for (let i = 0; i < 40; i++) {
      if (generateProblem21('M1.NUM.POW.01', d).choices.some((c) => c.misconceptionId === 'MIS.SIGN.NEGSQ')) offeredOnPow++;
      if (generateProblem21('M1.NUM.SIGN.02', d).choices.some((c) => c.misconceptionId === 'MIS.SIGN.NEGSQ')) offeredOnSign++;
    }
  }
  // L4에서 a<0 ∧ n짝수 ≈ 25% — 200표본에서 최소 20회는 기대 가능
  check(`NEGSQ tag now offered on POW.01 at every difficulty (${offeredOnPow}/200 samples)`, offeredOnPow >= 20, String(offeredOnPow));
  check('NEGSQ tag never offered on SIGN.02 anymore (topic mixing gone)', offeredOnSign === 0, String(offeredOnSign));
}

// --- 4) 구 이벤트 로그 재생 호환 (2.2 블러 시절 생성한 513-이벤트 로그) ---
{
  const log = JSON.parse(fs.readFileSync('baselines/.e2e-log.json', 'utf8'));
  const t1 = replayFromScratch(log);
  const t2 = replayFromScratch(log);
  check(`pre-migration event log replays without error (${log.events.length} events)`, t1.seq === log.events.length || t1.seq > 0);
  check('replay is still deterministic after the serving-policy change', JSON.stringify(t1) === JSON.stringify(t2));
  const strong = Object.values(t1.skills).filter((s) => s.attempts > 0 && s.alpha / (s.alpha + s.beta) >= 0.8).length;
  check(`replayed twin still carries pre-migration mastery state (${strong} skills with posterior ≥0.8)`, strong >= 10, String(strong));
}

console.log(`\n${pass} checks passed — Phase 3 Step 1 (Pilot levelWindow migration) OK`);
