// Phase 2 Step 21 E2E 준비 — ELITE-ready 상태의 '실제' 이벤트 로그 생성.
// UI 클릭만으로 transfer 검증까지 도달하려면 수백 번의 클릭이 필요하므로, 동일한 엔진
// 경로(submitAttempt/placement)로 정직하게 만든 로그를 store21의 영속화 포맷 그대로
// 저장해 localStorage 주입에 쓴다 — 가짜 상태 주입이 아니라 '실이벤트의 리플레이'다.
import fs from 'node:fs';
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { submitAttempt, submitDiagnosticPlacement, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { domainReadiness } from '../src/engine2/elite22.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP } from '../src/engine2/curriculum21.ts';

resetEventSeq(0);
const state = { twin: freshTwin21('chloe'), log: emptyLog(), ts: Date.now() - 3600_000 };

function seed(skillId, n) {
  const r0 = submitDiagnosticPlacement(state.twin, state.log, skillId, 3, 8, 2, (state.ts += 1000));
  state.twin = r0.twin;
  state.log = r0.log;
  for (let i = 0; i < n; i++) {
    if (i % 3 === 2) {
      // 필러는 정오답을 교대: 전부 정답이면 필러 스킬에 초장기 연속정답이 쌓여
      // E2E 주행에서 gate-transfer/Fast Track이 그 스킬을 영구 독점한다 (하네스 산물)
      const f = { kind: 'normal', skillId: 'M1.GEO.ANG.01', difficulty: 2, variant: 'standard', reason: 'f' };
      const fp = buildProblemForAction(f);
      // 오답 필러는 CONCEPT/PREREQ 태그를 피한다 — 단발 오답이 조사를 열지 않게 (교대라 2연속 없음)
      const safeWrong = fp.choices.findIndex((c, ix) => ix !== fp.answerIndex && c.errorType && c.errorType !== 'CONCEPT_GAP' && c.errorType !== 'PREREQUISITE_GAP');
      const fIdx = i % 6 === 2 || safeWrong < 0 ? fp.answerIndex : safeWrong;
      const fr = submitAttempt(state.twin, state.log, f, fp, { chosenIndex: fIdx, solveTimeSec: 30, hintsUsed: 0, retryCount: 0 }, (state.ts += 20000));
      state.twin = fr.twin;
      state.log = fr.log;
    }
    const a = { kind: 'normal', skillId, difficulty: 3, variant: 'standard', reason: 's' };
    const p = buildProblemForAction(a);
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: p.answerIndex, solveTimeSec: 40, hintsUsed: 0, retryCount: 0 }, (state.ts += 30000));
    state.twin = r.twin;
    state.log = r.log;
  }
  // 연속 정답으로 currentDifficulty가 래칫되므로 transfer를 2회: 1회차 통과가 스스로 또
  // 래칫을 일으켜도 2회차가 '갱신된 현재 난이도'에서 통과를 남긴다 (moving-target 해소)
  for (let k = 0; k < 2; k++) {
    const t = { kind: 'normal', skillId, difficulty: state.twin.skills[skillId].currentDifficulty, variant: 'transfer', reason: 't' };
    const tp = buildProblemForAction(t);
    const tr = submitAttempt(state.twin, state.log, t, tp, { chosenIndex: tp.answerIndex, solveTimeSec: 50, hintsUsed: 0, retryCount: 0 }, (state.ts += 30000));
    state.twin = tr.twin;
    state.log = tr.log;
  }
}

// NUM/ALG 영역을 ELITE-ready로 (elite bank의 주요 requiredSkills 포함)
for (const id of ALL_SKILL_IDS.filter((s) => ['NUM', 'ALG'].includes(MICRO_SKILL_MAP[s].domain))) seed(id, 18);
for (const id of ['M1.FUN.PROP.01', 'M1.FUN.AREA.01', 'M1.FUN.COORD.01', 'M1.FUN.SYM.01']) seed(id, 18);

console.log('readiness:', ['NUM', 'ALG', 'FUN', 'GEO', 'STA'].map((d) => `${d}=${domainReadiness(state.twin, d)}`).join(' '));
console.log('attemptsSinceElite:', state.twin.attemptsSinceElite, '| events:', state.log.events.length);
fs.writeFileSync('baselines/.e2e-log.json', JSON.stringify(state.log));
console.log('→ baselines/.e2e-log.json');
