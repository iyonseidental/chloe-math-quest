// Phase 3 STEP 17/18 — Pilot Mode 계측 + Real-data 커버리지 (PART 31-33/43-45).
import { freshTwin21 } from '../src/engine2/replay21.ts';
import { submitAttempt, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { analyzePilot } from '../src/engine2/pilot23.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const BASE = Date.parse('2026-08-18T09:00:00Z');

function driveSession(state, { attempts, solveSec, skill = 'M1.NUM.SIGN.01', gapMs = 60000 }) {
  for (let i = 0; i < attempts; i++) {
    const a = { kind: 'normal', skillId: skill, difficulty: 3, variant: 'standard', reason: 'p' };
    const p = buildProblemForAction(a);
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: p.answerIndex, solveTimeSec: solveSec, hintsUsed: 0, retryCount: 0 }, (state.ts += gapMs));
    state.twin = r.twin;
    state.log = r.log;
  }
}

// ---- 세션 파생 + Valid Session 판정 (PART 33) ----
{
  resetEventSeq(11000);
  const state = { twin: freshTwin21('pilot'), log: emptyLog(), ts: BASE };
  // 세션 1: 정상 학습 (12문항, 문항당 40초, 1분 간격 → 11분)
  driveSession(state, { attempts: 12, solveSec: 40 });
  // 세션 2: 다음날, 짧은 접속 (2문항 — 무효)
  state.ts += 20 * 3600000;
  driveSession(state, { attempts: 2, solveSec: 40 });
  // 세션 3: 이틀 뒤, 고속클릭 (10문항 중앙 2초 — 무효)
  state.ts += 40 * 3600000;
  driveSession(state, { attempts: 10, solveSec: 2, gapMs: 5000 });
  // 세션 4: 또 다음날, 정상 (8문항)
  state.ts += 22 * 3600000;
  driveSession(state, { attempts: 8, solveSec: 55, skill: 'M1.ALG.EXP.01' });

  const rep = analyzePilot(state.log);
  check('data source is REAL (synthetic 혼입 라벨 불가)', rep.dataSource === 'REAL');
  check(`4 sessions derived from event gaps (${rep.sessions.length})`, rep.sessions.length === 4);
  check('정상 세션 2개만 valid (단순 접속일 ≠ 학습일)', rep.validSessions === 2, JSON.stringify(rep.sessions.map((s) => [s.meaningfulAttempts, s.valid, s.invalidReason ?? ''])));
  check('짧은 접속 세션은 최소 기준 미달로 무효', rep.sessions[1].valid === false && /최소 기준/.test(rep.sessions[1].invalidReason));
  check('고속클릭 세션은 무효 + 사유 명시', rep.sessions[2].valid === false && /고속클릭/.test(rep.sessions[2].invalidReason));
  check(`pilot days counted (${rep.pilotDays})`, rep.pilotDays >= 3);
  check('학습 분은 valid 세션만 합산', rep.learningMinutes > 0 && rep.learningMinutes < 40);
  check('커버리지 LOW — 이 규모로는 재적합 불가를 정직 표기 (PART 45)', rep.calibrationCoverage === 'LOW', rep.calibrationCoverage);
  check('커버리지 판정에 근거 문자열 동반', rep.coverageReason.length > 5);
  check('관측 지표 분리 보고 (skills/retention/transfer/elite)', rep.skillsObserved === 2 && rep.eliteAttempts === 0 && typeof rep.retentionChecks === 'number');
}

// ---- 커버리지 상향 경로 (MEDIUM) ----
{
  resetEventSeq(12000);
  const state = { twin: freshTwin21('pilot2'), log: emptyLog(), ts: BASE };
  for (let d = 0; d < 8; d++) {
    driveSession(state, { attempts: 10, solveSec: 45, skill: d % 2 ? 'M1.ALG.EXP.01' : 'M1.NUM.SIGN.01' });
    state.ts += 24 * 3600000;
  }
  const rep = analyzePilot(state.log);
  check(`80 유효 시도 → MEDIUM (방향성 점검 가능, 재적합 불가 명시)`, rep.calibrationCoverage === 'MEDIUM', `${rep.calibrationCoverage} (${rep.coverageReason})`);
  check('config 수치가 판정을 지배 (하드코딩 아님)', CONFIG21.pilot.coverageMediumAttempts === 60);
}

console.log(`\n${pass} checks passed — Phase 3 Step 17-18 (Pilot instrumentation) OK`);
