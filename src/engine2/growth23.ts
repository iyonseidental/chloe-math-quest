// CHLOE MATH 2.3 — Real-World Growth Score (Phase 3 STEP 16, PART 29/30/52/53).
//
// 원칙:
//   · 단일 점수 하나로 뭉개지 않는다 — Core/Transfer/Elite/Retention/GapClosure 분리 (PART 29).
//   · 원시 % 변화만 보여주지 않는다 — n, 난이도, 불확실성(Wilson 구간) 동반 (PART 30).
//   · 실데이터가 없으면 INSUFFICIENT_REAL_WORLD_DATA — synthetic으로 절대 대체 금지 (PART 53).
import type { DigitalTwin21, HoldoutRecord } from './types21.ts';
import type { EventLog, AttemptPayload } from './events21.ts';

export interface AreaScore {
  n: number;
  correct: number;
  rate: number;
  ci95: [number, number]; // Wilson score interval
  avgDifficulty: number;
}

export interface GrowthComparison {
  area: string;
  baseline: AreaScore & { form: string; administrationId: string };
  post: AreaScore & { form: string; administrationId: string };
  deltaRate: number;
  // 구간이 겹치면 표본 크기상 성장 단정 불가 — 정직하게 표기 (PART 30)
  confident: boolean;
}

export type GrowthReport =
  | { status: 'INSUFFICIENT_REAL_WORLD_DATA'; reason: string; administrations: number }
  | {
      status: 'OK';
      comparisons: GrowthComparison[]; // Core / Near / Far / Elite(차원 통합) + Elite 차원별
      retentionGrowth: { status: 'OK'; earlyPassRate: number; latePassRate: number; nEarly: number; nLate: number } | { status: 'INSUFFICIENT'; reason: string };
      gapClosure: { casesResolved: number; reopened: number; durable: number; abandoned: number };
    };

function wilson(correct: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96;
  const p = correct / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

function scoreArea(records: HoldoutRecord[]): AreaScore {
  const n = records.length;
  const correct = records.filter((r) => r.correct).length;
  return {
    n,
    correct,
    rate: n ? correct / n : 0,
    ci95: wilson(correct, n),
    avgDifficulty: n ? records.reduce((a, r) => a + r.difficulty, 0) / n : 0,
  };
}

// 시행(administration) 단위로 묶고, 최초 vs 최신 시행을 영역별 비교한다.
export function computeGrowthReport(twin: DigitalTwin21, log: EventLog): GrowthReport {
  const byAdmin = new Map<string, HoldoutRecord[]>();
  for (const r of twin.holdout) (byAdmin.get(r.administrationId) ?? byAdmin.set(r.administrationId, []).get(r.administrationId)!).push(r);
  const admins = [...byAdmin.entries()].sort((a, b) => a[1][0].ts - b[1][0].ts);

  if (admins.length < 2) {
    return {
      status: 'INSUFFICIENT_REAL_WORLD_DATA',
      reason: admins.length === 0 ? 'Golden Set 시행 기록 없음 — 성장 비교 불가' : 'Golden Set 시행 1회뿐 — 비교할 기준(pre) 또는 사후(post)가 없음',
      administrations: admins.length,
    };
  }

  const [baseId, baseRecs] = admins[0];
  const [postId, postRecs] = admins[admins.length - 1];
  const areas: { key: string; filter: (r: HoldoutRecord) => boolean }[] = [
    { key: 'CORE', filter: (r) => r.area === 'CORE' },
    { key: 'NEAR_TRANSFER', filter: (r) => r.area === 'NEAR_TRANSFER' },
    { key: 'FAR_TRANSFER', filter: (r) => r.area === 'FAR_TRANSFER' },
    { key: 'ELITE', filter: (r) => r.area === 'ELITE' },
  ];
  // Elite 차원별 분해 (표본이 작으므로 참고 지표 — confident 판정이 이를 정직하게 반영)
  const dims = [...new Set(twin.holdout.filter((r) => r.eliteDimension).map((r) => r.eliteDimension!))];
  for (const d of dims) areas.push({ key: `ELITE:${d}`, filter: (r) => r.eliteDimension === d });

  const comparisons: GrowthComparison[] = areas.map(({ key, filter }) => {
    const b = scoreArea(baseRecs.filter(filter));
    const p = scoreArea(postRecs.filter(filter));
    return {
      area: key,
      baseline: { ...b, form: baseRecs[0].form, administrationId: baseId },
      post: { ...p, form: postRecs[0].form, administrationId: postId },
      deltaRate: p.rate - b.rate,
      confident: b.n > 0 && p.n > 0 && (p.ci95[0] > b.ci95[1] || p.ci95[1] < b.ci95[0]),
    };
  });

  // Retention Growth: 실 로그의 retention 시도 성공률 — 전반부 vs 후반부
  const retAtt = log.events.filter((e) => e.type === 'ATTEMPT' && (e.payload as AttemptPayload).mode === 'retention') as { payload: AttemptPayload }[];
  let retentionGrowth: (GrowthReport & { status: 'OK' })['retentionGrowth'];
  if (retAtt.length < 8) {
    retentionGrowth = { status: 'INSUFFICIENT', reason: `retention 시도 ${retAtt.length}회 (<8) — 전/후 비교 불가` };
  } else {
    const half = Math.floor(retAtt.length / 2);
    const early = retAtt.slice(0, half);
    const late = retAtt.slice(half);
    retentionGrowth = {
      status: 'OK',
      earlyPassRate: early.filter((e) => e.payload.correct).length / early.length,
      latePassRate: late.filter((e) => e.payload.correct).length / late.length,
      nEarly: early.length,
      nLate: late.length,
    };
  }

  // Gap Closure Quality: 케이스 종결 품질 (재발 포함)
  const cases = twin.remediationCases;
  const gapClosure = {
    casesResolved: cases.filter((c) => c.stage === 'resolved').length,
    reopened: cases.filter((c) => c.reopenedFromCaseId != null || c.gapClosureQuality === 'REOPENED').length,
    durable: cases.filter((c) => c.stage === 'resolved' && (c.gapClosureQuality === 'RETENTION_VERIFIED' || c.gapClosureQuality === 'STABLY_CLOSED')).length,
    abandoned: cases.filter((c) => c.stage === 'abandoned').length,
  };

  return { status: 'OK', comparisons, retentionGrowth, gapClosure };
}
