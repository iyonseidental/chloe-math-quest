// Phase 3 STEP 2 — 오개념 distractor 태깅 13/13 감사 검증 (PART 4/5).
// 각 항목: (1) 감사 필드 완비 (2) trigger 스킬의 실제 생성 문항이 태그를 실제로 제공
// (3) 태그가 정답 선택지에 붙는 일이 없음 (4) 라이브러리-생성기 태그 id 정합.
import { MISCONCEPTION_LIBRARY, MICRO_SKILL_MAP } from '../src/engine2/curriculum21.ts';
import { generateProblem21 } from '../src/engine2/problemAdapter21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

// --- 1) 13/13 감사 필드 완비 + 전부 진단형(diagnosticDifficulty) 보유 ---
check('library has exactly 13 entries', MISCONCEPTION_LIBRARY.length === 13, String(MISCONCEPTION_LIBRARY.length));
for (const m of MISCONCEPTION_LIBRARY) {
  check(
    `${m.id}: audited (mechanism + strength + templates + diagnosticDifficulty)`,
    typeof m.mechanism === 'string' && m.mechanism.length > 8 &&
      ['HIGH', 'MEDIUM', 'LOW'].includes(m.diagnosticStrength) &&
      Array.isArray(m.confirmProblemTemplates) && m.confirmProblemTemplates.length >= 1 &&
      m.diagnosticDifficulty != null &&
      MICRO_SKILL_MAP[m.triggerSkillId] != null && MICRO_SKILL_MAP[m.remediationSkillId] != null,
  );
}

// --- 2) 실제 태그 제공률 — trigger 스킬 × diagnosticDifficulty에서 N회 생성 ---
// 조건부 산물(x<0 등)은 100%가 아닐 수 있으므로 최소 제공 횟수만 요구한다.
const N = 300;
for (const m of MISCONCEPTION_LIBRARY) {
  let offered = 0;
  let onAnswer = 0;
  for (let i = 0; i < N; i++) {
    const p = generateProblem21(m.triggerSkillId, m.diagnosticDifficulty);
    p.choices.forEach((c, idx) => {
      if (c.misconceptionId === m.id) {
        offered++;
        if (idx === p.answerIndex) onAnswer++;
      }
    });
  }
  check(`${m.id}: tag actually offered on ${m.triggerSkillId} (${offered}/${N})`, offered >= N * 0.1, String(offered));
  check(`${m.id}: tag never lands on the correct answer`, onAnswer === 0, String(onAnswer));
}

// --- 3) 거짓 태깅 없음의 역방향: 생성기가 내보내는 모든 태그 id가 라이브러리에 실존 ---
{
  const known = new Set(MISCONCEPTION_LIBRARY.map((m) => m.id));
  const seen = new Set();
  for (const skillId of Object.keys(MICRO_SKILL_MAP)) {
    for (let d = 1; d <= 5; d += 2) {
      for (let i = 0; i < 25; i++) {
        for (const c of generateProblem21(skillId, d).choices) if (c.misconceptionId) seen.add(c.misconceptionId);
      }
    }
  }
  const orphans = [...seen].filter((id) => !known.has(id));
  check(`every generator-emitted tag exists in the library (${seen.size} distinct ids seen)`, orphans.length === 0, orphans.join(','));
  check('no stale MIS.CLOCK.HOUR tag anywhere', !seen.has('MIS.CLOCK.HOUR'));
}

// --- 4) VAL.02 주제 순수성 (창 [2,4]→[4,4] 교정 확인) ---
{
  let ok = true;
  for (let d = 1; d <= 5 && ok; d++) {
    for (let i = 0; i < 20 && ok; i++) {
      const p = generateProblem21('M1.ALG.VAL.02', d);
      if (!/일 때.*식의 값|식의 값을 구하세요/.test(p.stem.replace(/\n/g, ' '))) ok = false;
    }
  }
  check('VAL.02 now serves substitution stems at every difficulty (window purified)', ok);
}

console.log(`\n${pass} checks passed — Phase 3 Step 2 (Misconception tagging 13/13) OK`);
