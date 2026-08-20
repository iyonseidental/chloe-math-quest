// CHLOE MATH 2.3 — Real-World Pilot 계측 (Phase 3 STEP 17/18, PART 31-33/43-45).
//
//   · 학생에게는 평소 앱 그대로 — 계측은 개발자/부모 영역에서만 보인다 (PART 32).
//   · Valid Session은 로그인 날짜가 아니다 (PART 33): 의미 있는 시도 수 + 학습 시간 +
//     비정상 고속클릭 세션 배제. 수치는 전부 config (하드코딩 금지).
//   · 세션은 이벤트 타임스탬프에서 파생한다 — 새 이벤트 타입 없이 리플레이 호환 유지.
//   · REAL 데이터 전용: 이 모듈은 앱의 실제 이벤트 로그만 읽는다. synthetic 결과와
//     절대 합산·혼합하지 않는다 (PART 43/53 — 별도 라벨 강제).
import { CONFIG21 } from './config21.ts';
import type { EventLog, AttemptPayload } from './events21.ts';

export interface PilotSession {
  startTs: number;
  endTs: number;
  attempts: number;
  meaningfulAttempts: number; // micro-lesson ack 제외
  minutes: number;
  medianSolveSec: number;
  valid: boolean;
  invalidReason?: string;
}

export type CalibrationCoverage = 'LOW' | 'MEDIUM' | 'SUFFICIENT';

export interface PilotReport {
  dataSource: 'REAL'; // 이 리포트는 실사용 로그에서만 생성된다 — synthetic 혼입 시 무효
  pilotDays: number;
  sessions: PilotSession[];
  validSessions: number;
  learningMinutes: number; // valid 세션 합계
  totalEvents: number;
  totalAttempts: number;
  skillsObserved: number;
  retentionChecks: number;
  transferChecks: number;
  eliteAttempts: number;
  holdoutAdministrations: number;
  calibrationCoverage: CalibrationCoverage;
  coverageReason: string;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export function analyzePilot(log: EventLog, now = Date.now()): PilotReport {
  const cfg = CONFIG21.pilot;
  const events = log.events;
  const attempts = events.filter((e) => e.type === 'ATTEMPT');

  // 세션 파생: 이벤트 간격이 sessionGapMinutes를 넘으면 새 세션
  const sessions: PilotSession[] = [];
  let cur: typeof events = [];
  const flush = () => {
    if (cur.length === 0) return;
    const att = cur.filter((e) => e.type === 'ATTEMPT');
    const meaningful = att.filter((e) => (e.payload as AttemptPayload).mode !== 'micro-lesson');
    const minutes = (cur[cur.length - 1].ts - cur[0].ts) / 60000;
    const solveTimes = meaningful.map((e) => (e.payload as AttemptPayload).solveTimeSec ?? 0);
    const med = median(solveTimes);
    let valid = true;
    let invalidReason;
    if (meaningful.length < cfg.minMeaningfulAttempts && minutes < cfg.minLearningMinutes) {
      valid = false;
      invalidReason = `시도 ${meaningful.length}회·${minutes.toFixed(0)}분 — 최소 기준 미달`;
    } else if (med > 0 && med < cfg.rapidClickMedianSec && meaningful.length >= 5) {
      valid = false;
      invalidReason = `중앙 풀이시간 ${med.toFixed(1)}초 — 비정상 고속클릭 세션`;
    }
    sessions.push({ startTs: cur[0].ts, endTs: cur[cur.length - 1].ts, attempts: att.length, meaningfulAttempts: meaningful.length, minutes, medianSolveSec: med, valid, invalidReason });
    cur = [];
  };
  for (const e of events) {
    if (cur.length > 0 && e.ts - cur[cur.length - 1].ts > cfg.sessionGapMinutes * 60000) flush();
    cur.push(e);
  }
  flush();

  const valid = sessions.filter((s) => s.valid);
  const days = new Set(sessions.map((s) => new Date(s.startTs).toISOString().slice(0, 10)));
  const ap = (e: (typeof events)[number]) => e.payload as AttemptPayload;
  const skillsObserved = new Set(attempts.map((e) => ap(e).skillId)).size;
  const retentionChecks = attempts.filter((e) => ap(e).mode === 'retention').length;
  const transferChecks = attempts.filter((e) => ap(e).variant === 'transfer').length;
  const eliteAttempts = attempts.filter((e) => ap(e).mode === 'elite' || ap(e).mode === 'elite-followup').length;
  const holdoutAdministrations = new Set(events.filter((e) => e.type === 'HOLDOUT_ASSESSMENT').map((e) => (e.payload as { administrationId: string }).administrationId)).size;

  // 캘리브레이션 커버리지 (PART 44): 실데이터로 calibration을 재산출할 수 있는 규모인가
  const meaningfulTotal = valid.reduce((a, s) => a + s.meaningfulAttempts, 0);
  let calibrationCoverage: CalibrationCoverage;
  let coverageReason: string;
  if (meaningfulTotal >= cfg.coverageSufficientAttempts && skillsObserved >= cfg.coverageSufficientSkills && retentionChecks >= 5) {
    calibrationCoverage = 'SUFFICIENT';
    coverageReason = `유효 시도 ${meaningfulTotal}회 · ${skillsObserved}스킬 관찰 · 복습 검증 ${retentionChecks}회`;
  } else if (meaningfulTotal >= cfg.coverageMediumAttempts) {
    calibrationCoverage = 'MEDIUM';
    coverageReason = `유효 시도 ${meaningfulTotal}회 — 방향성 점검 가능, 재적합엔 부족`;
  } else {
    calibrationCoverage = 'LOW';
    coverageReason = `유효 시도 ${meaningfulTotal}회 — 실데이터 판단 불가 (synthetic으로 대체하지 않는다)`;
  }
  void now;

  return {
    dataSource: 'REAL',
    pilotDays: days.size,
    sessions,
    validSessions: valid.length,
    learningMinutes: Math.round(valid.reduce((a, s) => a + s.minutes, 0)),
    totalEvents: events.length,
    totalAttempts: attempts.length,
    skillsObserved,
    retentionChecks,
    transferChecks,
    eliteAttempts,
    holdoutAdministrations,
    calibrationCoverage,
    coverageReason,
  };
}
