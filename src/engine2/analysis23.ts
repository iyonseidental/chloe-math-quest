// CHLOE MATH 2.3 — ANALYSIS PACKAGE 생성기 (백업 지시 PART 16-37/40/47-48/55-62).
//
// 원칙:
//   · 모든 수치는 raw events의 fold(재생)에서 파생 — CSV/summary는 파생 결과일 뿐 (PART 38).
//   · 완전 read-only (PART 39). 필터 범위는 "출력 행"만 거른다 — 상태 계산은 항상 전체
//     이벤트 재생 (중간부터 재생하면 상태가 거짓이 되므로).
//   · 불확실성 은폐 금지 (PART 21): 값에는 가능하면 n(증거)과 confidence를 동반한다.
//   · 실/합성 분리 (PART 19): dataSource 라벨이 모든 최상위 파일에 박힌다.
//   · 학생 서술 원칙 (PART 35): "못한다/약하다" 대신 "보완이 필요/관찰 부족/성장 중".
import { CONFIG21, CONFIG21_VERSION, MASTERY_MODEL_VERSION, CURRICULUM_VERSION, KNOWLEDGE_GRAPH_VERSION } from './config21.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP, MISCONCEPTION_LIBRARY, SKILL_CLUSTERS, CLUSTER_OF } from './curriculum21.ts';
import { freshTwin21, applyEvent } from './replay21.ts';
import { ELITE_DIMENSIONS, eliteDimensionLevel, domainReadiness, clusterReadiness } from './elite22.ts';
import { analyzePilot } from './pilot23.ts';
import { computeGrowthReport } from './growth23.ts';
import { APP_VERSION, BACKUP_SCHEMA_VERSION, detectDataSource, type DataSource } from './backup23.ts';
import type { EventLog, AttemptPayload } from './events21.ts';
import type { DigitalTwin21 } from './types21.ts';

export const ANALYSIS_SCHEMA_VERSION = '1.0';

const iso = (ts: number) => new Date(ts).toISOString();
const day = (ts: number) => new Date(ts).toISOString().slice(0, 10);
const isoWeek = (ts: number) => {
  const d = new Date(ts);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayN = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayN);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
const pOf = (s: { alpha: number; beta: number }) => s.alpha / (s.alpha + s.beta);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

function csv(rows: (string | number | boolean | null | undefined)[][]): string {
  const esc = (v: string | number | boolean | null | undefined) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// 단일 패스 fold + 계측: 전이 시점(오개념/케이스), 시도 행, 주간 스냅숏을 수집
// ---------------------------------------------------------------------------
interface FoldHistory {
  finalTwin: DigitalTwin21;
  attemptRows: {
    seq: number; ts: number; sessionId: number; skillId: string; problemId: string; difficulty: number;
    mode: string; variant: string; correct: boolean; hintsUsed: number; retryCount: number; solveTimeSec: number;
    confidenceBefore: number | null; errorType: string | null; misconceptionId: string | null; eliteMode: string | null;
  }[];
  retentionRows: { seq: number; ts: number; skillId: string; intervalDays: number | null; correct: boolean; difficulty: number; independent: boolean; masteryBefore: number; masteryAfter: number }[];
  transferRows: { seq: number; ts: number; skillId: string; transferType: 'NEAR' | 'DELAYED'; difficulty: number; correct: boolean; independent: boolean; trainingExposure: number }[];
  misTransitions: Record<string, { firstSuspectedAt: number | null; activatedAt: number | null; resolvedAt: number | null; reopenedCount: number }>;
  caseTransitions: Record<string, { openedAt: number | null; closedAt: number | null; abandonedAt: number | null }>;
  weekly: { week: string; endTs: number; twinSnapshot: WeeklySnapshot }[];
}

interface WeeklySnapshot {
  avgMastery: number;
  gatedSkills: number;
  stableSkills: number;
  eliteDims: Record<string, { level: number; evidence: number }>;
  domainTiers: Record<string, string>;
  clusterTiers: Record<string, string>;
  gapsOpen: number;
  gapsResolved: number;
  gapsReopened: number;
}

function snapshot(twin: DigitalTwin21): WeeklySnapshot {
  const GATED = ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'];
  const skills = Object.values(twin.skills);
  const dims: WeeklySnapshot['eliteDims'] = {};
  for (const d of ELITE_DIMENSIONS) dims[d] = { level: r3(eliteDimensionLevel(twin.elite[d]).level), evidence: r3(eliteDimensionLevel(twin.elite[d]).evidence) };
  const domainTiers: Record<string, string> = {};
  for (const dom of ['NUM', 'ALG', 'FUN', 'GEO', 'STA']) domainTiers[dom] = domainReadiness(twin, dom);
  const clusterTiers: Record<string, string> = {};
  for (const c of SKILL_CLUSTERS) clusterTiers[c.id] = clusterReadiness(twin, c.id);
  return {
    avgMastery: r3(skills.reduce((a, s) => a + pOf(s), 0) / Math.max(1, skills.length)),
    gatedSkills: skills.filter((s) => GATED.includes(s.knowledgeState)).length,
    stableSkills: skills.filter((s) => s.knowledgeState === 'STABLE_MASTERY').length,
    eliteDims: dims,
    domainTiers,
    clusterTiers,
    gapsOpen: twin.remediationCases.filter((c) => c.stage !== 'resolved' && c.stage !== 'abandoned').length,
    gapsResolved: twin.remediationCases.filter((c) => c.stage === 'resolved').length,
    gapsReopened: twin.remediationCases.filter((c) => c.reopenedFromCaseId != null || c.gapClosureQuality === 'REOPENED').length,
  };
}

export function foldWithHistory(log: EventLog, studentId: string): FoldHistory {
  let twin = freshTwin21(studentId);
  const h: FoldHistory = { finalTwin: twin, attemptRows: [], retentionRows: [], transferRows: [], misTransitions: {}, caseTransitions: {}, weekly: [] };
  const gapMs = CONFIG21.pilot.sessionGapMinutes * 60000;
  let sessionId = 0;
  let lastTs = -Infinity;
  let curWeek: string | null = null;

  for (const e of log.events) {
    if (e.ts - lastTs > gapMs) sessionId++;
    lastTs = e.ts;
    const w = isoWeek(e.ts);
    if (curWeek !== null && w !== curWeek) h.weekly.push({ week: curWeek, endTs: e.ts, twinSnapshot: snapshot(twin) });
    curWeek = w;

    const before = twin;
    twin = applyEvent(twin, e);

    if (e.type === 'ATTEMPT') {
      const p = e.payload as AttemptPayload;
      h.attemptRows.push({
        seq: e.seq, ts: e.ts, sessionId, skillId: p.skillId, problemId: p.elite?.problemId ?? p.attemptId, difficulty: p.difficulty,
        mode: p.mode, variant: p.variant, correct: p.correct, hintsUsed: p.hintsUsed, retryCount: p.retryCount, solveTimeSec: p.solveTimeSec,
        confidenceBefore: (p as { confidenceBefore?: number }).confidenceBefore ?? null,
        errorType: p.chosenErrorType ?? null, misconceptionId: p.chosenMisconceptionId ?? null, eliteMode: p.elite?.eliteMode ?? null,
      });
      const lastPractice = before.skills[p.skillId]?.lastPracticedAt;
      const intervalDays = lastPractice ? Math.round((e.ts - Date.parse(lastPractice)) / 86400000) : null;
      if (p.mode === 'retention') {
        h.retentionRows.push({
          seq: e.seq, ts: e.ts, skillId: p.skillId, intervalDays, correct: p.correct, difficulty: p.difficulty,
          independent: p.hintsUsed === 0 && p.retryCount === 0,
          masteryBefore: r3(pOf(before.skills[p.skillId])), masteryAfter: r3(pOf(twin.skills[p.skillId])),
        });
      }
      if (p.variant === 'transfer') {
        h.transferRows.push({
          seq: e.seq, ts: e.ts, skillId: p.skillId,
          transferType: intervalDays !== null && intervalDays >= 1 ? 'DELAYED' : 'NEAR',
          difficulty: p.difficulty, correct: p.correct, independent: p.hintsUsed === 0 && p.retryCount === 0,
          trainingExposure: before.skills[p.skillId]?.attempts ?? 0,
        });
      }
      // 오개념 상태 전이 시점 포착
      const beforeStatus = new Map(before.misconceptions.map((m) => [m.misconceptionId, m.status]));
      for (const m of twin.misconceptions) {
        const prev = beforeStatus.get(m.misconceptionId) ?? 'NONE';
        if (prev === m.status) continue;
        const t = (h.misTransitions[m.misconceptionId] ??= { firstSuspectedAt: null, activatedAt: null, resolvedAt: null, reopenedCount: 0 });
        if (m.status === 'SUSPECTED' && t.firstSuspectedAt === null) t.firstSuspectedAt = e.ts;
        if (m.status === 'ACTIVE') {
          if (t.activatedAt !== null) t.reopenedCount++;
          t.activatedAt = e.ts;
        }
        if (m.status === 'RESOLVED' || m.status === 'NONE') t.resolvedAt = e.ts;
      }
      // 케이스 전이 시점 포착
      const beforeStage = new Map(before.remediationCases.map((c) => [c.id, c.stage]));
      for (const c of twin.remediationCases) {
        const prev = beforeStage.get(c.id);
        const t = (h.caseTransitions[c.id] ??= { openedAt: null, closedAt: null, abandonedAt: null });
        if (prev === undefined) t.openedAt = e.ts;
        else if (prev !== c.stage && c.stage === 'resolved') t.closedAt = e.ts;
        else if (prev !== c.stage && c.stage === 'abandoned') t.abandonedAt = e.ts;
      }
    }
  }
  if (curWeek !== null) h.weekly.push({ week: curWeek, endTs: lastTs, twinSnapshot: snapshot(twin) });
  h.finalTwin = twin;
  return h;
}

// ---------------------------------------------------------------------------
// 패키지 생성
// ---------------------------------------------------------------------------
export interface AnalysisOptions {
  studentId: string;
  studentName?: string;
  anonymize?: boolean; // PART 48
  range?: { fromTs?: number; toTs?: number } | null; // PART 40 — 출력 행 필터 (상태 계산은 항상 전체)
  now?: number;
  dataSource?: DataSource;
}

export function buildAnalysisPackage(log: EventLog, opts: AnalysisOptions): { files: Record<string, string>; zipName: string; dataSource: DataSource; fileCount: number } {
  const now = opts.now ?? Date.now();
  const dataSource = opts.dataSource ?? detectDataSource(opts.studentId);
  const student = opts.anonymize ? 'Student A' : (opts.studentName ?? 'Chloe');
  const h = foldWithHistory(log, opts.studentId);
  const twin = h.finalTwin;
  const from = opts.range?.fromTs ?? -Infinity;
  const to = opts.range?.toTs ?? Infinity;
  const inRange = (ts: number) => ts >= from && ts <= to;
  const pilot = analyzePilot(log);
  const growth = computeGrowthReport(twin, log);

  const events = log.events;
  const periodStart = events.length ? iso(Math.max(events[0].ts, from === -Infinity ? events[0].ts : from)) : null;
  const periodEnd = events.length ? iso(Math.min(events[events.length - 1].ts, to === Infinity ? events[events.length - 1].ts : to)) : null;

  const conf = (n: number) => (n >= 20 ? 'HIGH' : n >= 8 ? 'MEDIUM' : n >= 3 ? 'LOW' : 'VERY_LOW');
  const rate = (rows: { correct: boolean }[]) => (rows.length ? r3(rows.filter((r) => r.correct).length / rows.length) : null);
  const withEvidence = (rows: { correct: boolean; seq: number }[]) => ({
    score: rate(rows),
    attempts: rows.length,
    confidence: conf(rows.length),
    sourceEventSeqs: rows.slice(0, 500).map((r) => r.seq), // PART 37 traceability (상한 500)
  });

  // ---- 파일들 ----
  const files: Record<string, string> = {};

  // skill-status.csv (PART 22)
  files['skill-status.csv'] = csv([
    ['skillId', 'nameKo', 'domain', 'cluster', 'masteryProbability', 'uncertainty', 'effectiveEvidence', 'estimateConfidence', 'knowledgeState', 'retentionStage', 'retentionReliability', 'nearTransfer', 'delayedTransfer', 'lastPracticedAt', 'activeMisconception', 'openRemediation', 'prerequisiteStability'],
    ...ALL_SKILL_IDS.map((id) => {
      const s = twin.skills[id];
      const near = h.transferRows.filter((t) => t.skillId === id && t.transferType === 'NEAR');
      const delayed = h.transferRows.filter((t) => t.skillId === id && t.transferType === 'DELAYED');
      return [
        id, MICRO_SKILL_MAP[id].nameKo, MICRO_SKILL_MAP[id].domain, CLUSTER_OF[id]?.id ?? '',
        r3(pOf(s)), r3(s.uncertainty), r3(s.effectiveEvidence), s.estimateConfidence, s.knowledgeState,
        s.retention.stage, r3(s.retention.reliability),
        near.length ? `${rate(near)} (n=${near.length})` : '',
        delayed.length ? `${rate(delayed)} (n=${delayed.length})` : '',
        s.lastPracticedAt ?? '', s.activeMisconceptions.join('|'),
        twin.remediationCases.some((c) => c.targetSkillId === id && c.stage !== 'resolved' && c.stage !== 'abandoned'),
        s.prerequisiteStability ?? '',
      ];
    }),
  ]);

  // learning-history.csv (PART 23)
  const lh = h.attemptRows.filter((r) => inRange(r.ts));
  files['learning-history.csv'] = csv([
    ['date', 'seq', 'sessionId', 'skillId', 'problemId', 'difficulty', 'problemMode', 'correct', 'hintsUsed', 'retryCount', 'solveTimeSec', 'confidenceBefore', 'errorType', 'misconceptionId', 'mode'],
    ...lh.map((r) => [iso(r.ts), r.seq, r.sessionId, r.skillId, r.problemId, r.difficulty, r.eliteMode ?? r.mode, r.correct, r.hintsUsed, r.retryCount, r.solveTimeSec, r.confidenceBefore, r.errorType, r.misconceptionId, r.mode]),
  ]);

  // error-history.csv (PART 24)
  files['error-history.csv'] = csv([
    ['date', 'seq', 'skillId', 'domain', 'cluster', 'difficulty', 'mode', 'errorType', 'errorClass', 'misconceptionId'],
    ...lh.filter((r) => !r.correct).map((r) => {
      const cls = ['CARELESS_ERROR', 'GUESSING', 'TIME_PRESSURE'].includes(r.errorType ?? '') ? 'CARELESS' : ['CONCEPT_GAP', 'PREREQUISITE_GAP', 'FORMULA_ERROR'].includes(r.errorType ?? '') ? 'CONCEPTUAL' : r.eliteMode ? 'REASONING' : 'PROCEDURAL';
      return [iso(r.ts), r.seq, r.skillId, MICRO_SKILL_MAP[r.skillId]?.domain ?? '', CLUSTER_OF[r.skillId]?.id ?? '', r.difficulty, r.eliteMode ?? r.mode, r.errorType ?? 'UNKNOWN', cls, r.misconceptionId ?? ''];
    }),
  ]);

  // misconception-history.csv (PART 25)
  files['misconception-history.csv'] = csv([
    ['misconceptionId', 'description', 'triggerSkill', 'firstSuspectedAt', 'activatedAt', 'resolvedAt', 'reopenedCount', 'totalDiagnosticOpportunities', 'totalMatches', 'currentStatus'],
    ...twin.misconceptions.map((m) => {
      const def = MISCONCEPTION_LIBRARY.find((d) => d.id === m.misconceptionId);
      const t = h.misTransitions[m.misconceptionId] ?? { firstSuspectedAt: null, activatedAt: null, resolvedAt: null, reopenedCount: 0 };
      return [m.misconceptionId, def?.descriptionKo ?? '', m.skillId, t.firstSuspectedAt ? iso(t.firstSuspectedAt) : '', t.activatedAt ? iso(t.activatedAt) : '', t.resolvedAt ? iso(t.resolvedAt) : '', t.reopenedCount, (m as { ratioOpportunities?: number }).ratioOpportunities ?? '', (m as { ratioMatches?: number }).ratioMatches ?? '', m.status];
    }),
  ]);

  // remediation-history.csv (PART 26)
  files['remediation-history.csv'] = csv([
    ['caseId', 'targetSkill', 'rootCauseSkill', 'openedAt', 'closedAt', 'abandonedAt', 'stage', 'treatmentAttempts', 'probeCount', 'transferRestarts', 'linkedMisconception', 'finalGapQuality'],
    ...twin.remediationCases.map((c) => {
      const t = h.caseTransitions[c.id] ?? { openedAt: c.createdTs, closedAt: null, abandonedAt: null };
      return [c.id, c.targetSkillId, c.rootCauseSkillId ?? '', iso(t.openedAt ?? c.createdTs), t.closedAt ? iso(t.closedAt) : '', t.abandonedAt ? iso(t.abandonedAt) : '', c.stage, c.treatmentLog.length, c.probesTaken.length, (c as { transferRestarts?: number }).transferRestarts ?? '', c.linkedMisconceptionId ?? '', c.gapClosureQuality];
    }),
  ]);

  // retention-history.csv (PART 27)
  const rr = h.retentionRows.filter((r) => inRange(r.ts));
  files['retention-history.csv'] = csv([
    ['date', 'seq', 'skillId', 'intervalDays', 'correct', 'difficulty', 'independent', 'masteryBefore', 'masteryAfter'],
    ...rr.map((r) => [iso(r.ts), r.seq, r.skillId, r.intervalDays, r.correct, r.difficulty, r.independent, r.masteryBefore, r.masteryAfter]),
  ]);

  // transfer-history.csv (PART 28) — FAR는 Golden Set의 FAR_TRANSFER 영역에서만 측정됨을 README에 정의
  const tr = h.transferRows.filter((r) => inRange(r.ts));
  const goldenFar = twin.holdout.filter((g) => g.area === 'FAR_TRANSFER' && inRange(g.ts));
  files['transfer-history.csv'] = csv([
    ['date', 'seq/itemId', 'skillId', 'transferType', 'difficulty', 'correct', 'independent', 'relatedTrainingExposure'],
    ...tr.map((r) => [iso(r.ts), r.seq, r.skillId, r.transferType, r.difficulty, r.correct, r.independent, r.trainingExposure]),
    ...goldenFar.map((g) => [iso(g.ts), g.itemId, g.skillIds.join('|'), 'FAR(GOLDEN)', g.difficulty, g.correct, true, '']),
  ]);

  // elite-profile-history.csv (PART 29) — 주간 스냅숏
  files['elite-profile-history.csv'] = csv([
    ['week', 'endDate', ...ELITE_DIMENSIONS.flatMap((d) => [d, `${d}_evidence`])],
    ...h.weekly.map((w) => [w.week, day(w.endTs), ...ELITE_DIMENSIONS.flatMap((d) => [w.twinSnapshot.eliteDims[d].level, w.twinSnapshot.eliteDims[d].evidence])]),
  ]);

  // strategy-history.csv (PART 30)
  files['strategy-history.csv'] = csv([
    ['date', 'problemId', 'eliteMode', 'firstStrategy', 'finalStrategy', 'strategySwitches', 'hintStageReached', 'solved', 'struggleQuality', 'timeToFirstActionSec'],
    ...twin.strategyTraces.filter((t) => inRange(t.ts)).map((t) => [iso(t.ts), t.problemId, t.eliteMode, t.firstStrategy ?? '', t.finalStrategy ?? '', t.strategySwitches, t.hintsUsed.length ? t.hintsUsed[t.hintsUsed.length - 1] : '', t.solved, t.struggleQuality ?? '', t.timeToFirstActionSec ?? '']),
  ]);

  // golden-assessment-history.csv (PART 31) — Mastery 학습 데이터와 완전 구별된 원장
  files['golden-assessment-history.csv'] = csv([
    ['assessmentDate', 'administrationId', 'form', 'area', 'dimension', 'itemId', 'parallelGroup', 'correct', 'rubricScore', 'difficulty', 'solveTimeSec'],
    ...twin.holdout.filter((g) => inRange(g.ts)).map((g) => [iso(g.ts), g.administrationId, g.form, g.area, g.eliteDimension ?? '', g.itemId, g.parallelGroup, g.correct, '', g.difficulty, g.solveTimeSec]),
  ]);

  // m2-readiness-history.csv (PART 32) — 주간 스냅숏의 도메인/클러스터 tier
  files['m2-readiness-history.csv'] = csv([
    ['week', 'endDate', 'level', 'id', 'decision', 'reason'],
    ...h.weekly.flatMap((w) => [
      ...Object.entries(w.twinSnapshot.domainTiers).map(([dom, tier]) => [w.week, day(w.endTs), 'DOMAIN', dom, tier, tier === 'ELITE' ? '심화 도전 가능 (Core+게이트+전이 충족)' : tier === 'ADVANCED' ? '심화 준비 중' : '기초 증거 축적 단계']),
      ...Object.entries(w.twinSnapshot.clusterTiers).map(([cl, tier]) => [w.week, day(w.endTs), 'CLUSTER', cl, tier, '']),
    ]),
  ]);

  // weekly-summary.csv (PART 33)
  const attemptsByWeek = new Map<string, typeof h.attemptRows>();
  for (const r of h.attemptRows) {
    const w = isoWeek(r.ts);
    (attemptsByWeek.get(w) ?? attemptsByWeek.set(w, []).get(w)!).push(r);
  }
  let prevSnap: WeeklySnapshot | null = null;
  files['weekly-summary.csv'] = csv([
    ['week', 'meaningfulAttempts', 'learningMinutes(approx)', 'newSkillsGated', 'stableSkills', 'gapsOpen', 'gapsClosedTotal', 'gapsReopenedTotal', 'nearTransferRate', 'retentionRate', 'eliteChallenges', 'eliteAvgLevel', 'eliteAvgDelta'],
    ...h.weekly.map((w) => {
      const rows = attemptsByWeek.get(w.week) ?? [];
      const meaningful = rows.filter((r) => r.mode !== 'micro-lesson');
      const minutes = Math.round(meaningful.reduce((a, r) => a + r.solveTimeSec, 0) / 60);
      const wTr = h.transferRows.filter((t) => isoWeek(t.ts) === w.week);
      const wRet = h.retentionRows.filter((t) => isoWeek(t.ts) === w.week);
      const eliteN = rows.filter((r) => r.mode === 'elite').length;
      const dims = Object.values(w.twinSnapshot.eliteDims).map((d) => d.level);
      const avg = r3(dims.reduce((a, b) => a + b, 0) / dims.length);
      const prevAvg = prevSnap ? r3(Object.values(prevSnap.eliteDims).map((d) => d.level).reduce((a, b) => a + b, 0) / dims.length) : null;
      const newGated = prevSnap ? w.twinSnapshot.gatedSkills - prevSnap.gatedSkills : w.twinSnapshot.gatedSkills;
      prevSnap = w.twinSnapshot;
      return [w.week, meaningful.length, minutes, newGated, w.twinSnapshot.stableSkills, w.twinSnapshot.gapsOpen, w.twinSnapshot.gapsResolved, w.twinSnapshot.gapsReopened, rate(wTr) ?? '', rate(wRet) ?? '', eliteN, avg, prevAvg !== null ? r3(avg - prevAvg) : ''];
    }),
  ]);

  // analysis-summary.json (PART 20/21)
  const near = tr.filter((t) => t.transferType === 'NEAR');
  const delayed = tr.filter((t) => t.transferType === 'DELAYED');
  const retBucket = (lo: number, hi: number) => {
    const rows = rr.filter((r) => r.intervalDays !== null && r.intervalDays >= lo && r.intervalDays <= hi);
    return rows.length ? { passRate: rate(rows), attempts: rows.length, confidence: conf(rows.length) } : null;
  };
  const weakButHonest = ALL_SKILL_IDS.filter((id) => {
    const s = twin.skills[id];
    return s.attempts >= 5 && pOf(s) < 0.5;
  });
  const notYetObserved = ALL_SKILL_IDS.filter((id) => twin.skills[id].attempts < 3);
  const summary = {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    student, dataSource,
    period: { start: periodStart, end: periodEnd },
    versions: { app: APP_VERSION, config: CONFIG21_VERSION, masteryModel: MASTERY_MODEL_VERSION, curriculum: CURRICULUM_VERSION, knowledgeGraph: KNOWLEDGE_GRAPH_VERSION },
    learning: { validSessions: pilot.validSessions, totalSessions: pilot.sessions.length, meaningfulAttempts: pilot.totalAttempts, learningMinutes: pilot.learningMinutes, pilotDays: pilot.pilotDays, calibrationCoverage: pilot.calibrationCoverage, coverageReason: pilot.coverageReason },
    core: {
      overallMastery: r3(ALL_SKILL_IDS.reduce((a, id) => a + pOf(twin.skills[id]), 0) / ALL_SKILL_IDS.length),
      gatedSkills: Object.values(twin.skills).filter((s) => ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(s.knowledgeState)).length,
      stableMasterySkills: Object.values(twin.skills).filter((s) => s.knowledgeState === 'STABLE_MASTERY').length,
      needsReinforcement: weakButHonest, // "약하다"가 아니라 "현재 증거상 보완 필요" (PART 35)
      notYetObserved,
    },
    gaps: {
      discovered: twin.remediationCases.length,
      closed: twin.remediationCases.filter((c) => c.stage === 'resolved').length,
      reopened: twin.remediationCases.filter((c) => c.reopenedFromCaseId != null || c.gapClosureQuality === 'REOPENED').length,
      abandoned: twin.remediationCases.filter((c) => c.stage === 'abandoned').length,
      recurrenceRate: twin.remediationCases.length ? r3(twin.remediationCases.filter((c) => c.gapClosureQuality === 'REOPENED').length / twin.remediationCases.length) : null,
    },
    retention: { oneDay: retBucket(0, 2), sevenDay: retBucket(3, 9), fourteenDay: retBucket(10, 20), thirtyDay: retBucket(21, 3650) },
    transfer: {
      near: withEvidence(near),
      delayed: withEvidence(delayed),
      farGolden: goldenFar.length ? { score: r3(goldenFar.filter((g) => g.correct).length / goldenFar.length), attempts: goldenFar.length, confidence: conf(goldenFar.length), note: 'Golden Set FAR_TRANSFER 영역에서만 측정' } : null,
    },
    elite: Object.fromEntries(ELITE_DIMENSIONS.map((d) => {
      const { level, evidence } = eliteDimensionLevel(twin.elite[d]);
      return [d, { level: r3(level), evidence: r3(evidence), confidence: evidence < 2 ? 'INSUFFICIENT_OBSERVATION' : conf(evidence) }];
    })),
    misconceptions: {
      active: twin.misconceptions.filter((m) => m.status === 'ACTIVE').map((m) => m.misconceptionId),
      suspected: twin.misconceptions.filter((m) => m.status === 'SUSPECTED' || m.status === 'CONFIRMING').map((m) => m.misconceptionId),
      resolved: twin.misconceptions.filter((m) => m.status === 'RESOLVED' || m.status === 'NONE').map((m) => m.misconceptionId),
    },
    m2Readiness: {
      byDomain: Object.fromEntries(['NUM', 'ALG', 'FUN', 'GEO', 'STA'].map((d) => [d, domainReadiness(twin, d)])),
      byCluster: Object.fromEntries(SKILL_CLUSTERS.map((c) => [c.id, clusterReadiness(twin, c.id)])),
      note: 'M2 진입 판단은 실사용 데이터 기반 GATE E 이후에만 확정한다 — 이 tier는 현재 증거의 요약이다',
    },
    goldenGrowth: growth.status === 'OK'
      ? growth.comparisons.filter((c) => !c.area.startsWith('ELITE:')).map((c) => ({ area: c.area, baselineRate: r3(c.baseline.rate), postRate: r3(c.post.rate), nBaseline: c.baseline.n, nPost: c.post.n, confident: c.confident }))
      : { status: 'INSUFFICIENT_REAL_WORLD_DATA', reason: (growth as { reason: string }).reason },
    dataCoverage: { totalEvents: events.length, holdoutAdministrations: pilot.holdoutAdministrations, retentionChecks: rr.length, transferChecks: tr.length, eliteAttempts: pilot.eliteAttempts },
  };
  files['analysis-summary.json'] = JSON.stringify(summary, null, 2);

  // latest-parent-report.md (PART 34/35 — 성취의 언어)
  const strongDomains = Object.entries(summary.m2Readiness.byDomain).filter(([, t]) => t === 'ELITE').map(([d]) => d);
  const dimLabel: Record<string, string> = { representation: '문제 표현 전환', strategySelection: '전략 선택', integration: '개념 연결', novelTransfer: '처음 보는 문제', flexibility: '전략 전환 유연성', explanation: '설명하기', generalization: '일반화', reverseReasoning: '거꾸로 추론', justification: '근거 세우기' };
  const measuredDims = ELITE_DIMENSIONS.filter((d) => eliteDimensionLevel(twin.elite[d]).evidence >= 2);
  files['latest-parent-report.md'] = [
    `# CHLOE MATH 학습 요약 — ${student}`,
    '',
    `- 기간: ${periodStart ?? '-'} ~ ${periodEnd ?? '-'}`,
    `- 실제 학습일: ${pilot.pilotDays}일 · 유효 세션 ${pilot.validSessions}회 · 학습 ${pilot.learningMinutes}분`,
    `- 데이터 출처: **${dataSource}**`,
    '',
    '## 현재 강점',
    strongDomains.length ? strongDomains.map((d) => `- ${d} 영역: 심화 도전이 열려 있어요 (Core+전이 검증 완료)`).join('\n') : '- 아직 심화 도전 개방 영역이 없어요 — 기초 증거를 쌓는 단계예요.',
    '',
    '## 현재 성장 포인트 (보완이 필요한 영역)',
    weakButHonest.length ? weakButHonest.slice(0, 8).map((id) => `- ${MICRO_SKILL_MAP[id].nameKo} — 현재 증거상 보완이 필요해요`).join('\n') : '- 현재 증거상 두드러진 보완 대상이 없어요.',
    notYetObserved.length ? `- (아직 충분히 관찰되지 않은 스킬 ${notYetObserved.length}개 — 판단 보류)` : '',
    '',
    '## 학습 구멍',
    `- 발견 ${summary.gaps.discovered} · 해결 ${summary.gaps.closed} · 다시 확인 필요 ${summary.gaps.reopened}`,
    '',
    '## 장기 기억 (복습 통과율)',
    ...(['oneDay', 'sevenDay', 'fourteenDay', 'thirtyDay'] as const).map((k) => {
      const b = summary.retention[k];
      return b ? `- ${{ oneDay: '1일', sevenDay: '7일', fourteenDay: '14일', thirtyDay: '30일' }[k]}: ${(b.passRate! * 100).toFixed(0)}% (n=${b.attempts}, ${b.confidence})` : `- ${{ oneDay: '1일', sevenDay: '7일', fourteenDay: '14일', thirtyDay: '30일' }[k]}: 아직 관찰 부족`;
    }),
    '',
    '## Transfer (새 상황 적용)',
    `- 즉시 전이: ${summary.transfer.near.score !== null ? `${(summary.transfer.near.score * 100).toFixed(0)}% (n=${summary.transfer.near.attempts}, ${summary.transfer.near.confidence})` : '아직 관찰 부족'}`,
    `- 지연 전이: ${summary.transfer.delayed.score !== null ? `${(summary.transfer.delayed.score * 100).toFixed(0)}% (n=${summary.transfer.delayed.attempts}, ${summary.transfer.delayed.confidence})` : '아직 관찰 부족'}`,
    `- 먼 전이(Golden): ${summary.transfer.farGolden ? `${(summary.transfer.farGolden.score * 100).toFixed(0)}% (n=${summary.transfer.farGolden.attempts})` : '아직 관찰 부족'}`,
    '',
    '## Elite Thinking',
    measuredDims.length
      ? measuredDims.map((d) => `- ${dimLabel[d]}: Lv ${(eliteDimensionLevel(twin.elite[d]).level * 100).toFixed(0)} (증거 ${eliteDimensionLevel(twin.elite[d]).evidence.toFixed(0)})`).join('\n')
      : '- 아직 충분히 관찰되지 않았어요 — Elite 도전이 쌓이면 차원별로 보여드려요.',
    '',
    '## 선행(M2) 준비도',
    ...Object.entries(summary.m2Readiness.byDomain).map(([d, t]) => `- ${d}: ${t === 'ELITE' ? '심화 도전 가능' : t === 'ADVANCED' ? '심화 준비 중' : '기초 다지기'}`),
    '- M2 진입 확정 판단은 실사용 데이터가 충분해진 뒤(GATE E)에만 합니다.',
    '',
    '## 다음 추천 학습',
    weakButHonest.length ? `- ${MICRO_SKILL_MAP[weakButHonest[0]].nameKo}부터 다시 확인해 보는 것을 추천해요.` : '- 현재 흐름 유지 + 심화 도전 비중을 조금씩 늘려요.',
  ].filter((l) => l !== '').join('\n');

  // ANALYSIS_README.md (PART 18/19/56)
  files['ANALYSIS_README.md'] = buildAnalysisReadme(student, dataSource, periodStart, periodEnd, events.length);
  files['HOW_TO_ANALYZE_WITH_CHATGPT.md'] = buildHowTo(dataSource);

  // raw-events.jsonl (PART 17/36/37 — 추적 가능성의 뿌리)
  files['raw-events.jsonl'] = events.map((e) => JSON.stringify(e)).join('\n') + (events.length ? '\n' : '');

  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  const zipName = `CHLOE_MATH_ANALYSIS_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.zip`;
  return { files, zipName, dataSource, fileCount: Object.keys(files).length };
}

function buildAnalysisReadme(student: string, dataSource: DataSource, start: string | null, end: string | null, totalEvents: number): string {
  return [
    '# CHLOE MATH ANALYSIS PACKAGE',
    '',
    '## DATA SOURCE',
    dataSource === 'REAL' ? '**REAL CHLOE DATA** — 실제 학습 데이터입니다.' : '**SYNTHETIC TEST DATA** — 합성 테스트 데이터입니다. 실학습 분석에 사용하지 마세요.',
    '',
    `- 학생: ${student}`,
    `- 기간: ${start ?? '-'} ~ ${end ?? '-'} (이벤트 ${totalEvents}건)`,
    `- 스키마: analysis v${ANALYSIS_SCHEMA_VERSION} / backup v${BACKUP_SCHEMA_VERSION} / 앱 v${APP_VERSION}`,
    `- 버전: config ${CONFIG21_VERSION} · masteryModel ${MASTERY_MODEL_VERSION} · curriculum ${CURRICULUM_VERSION} · graph ${KNOWLEDGE_GRAPH_VERSION}`,
    '',
    '## 파일 안내 (읽는 순서)',
    '| 파일 | 내용 |',
    '|---|---|',
    '| analysis-summary.json | 최상위 요약 — 가장 먼저 읽을 것 |',
    '| skill-status.csv | 35개 micro-skill별 현재 상태 (한 스킬 = 한 행) |',
    '| weekly-summary.csv | 주 단위 학습·성장 집계 |',
    '| latest-parent-report.md | 사람이 읽는 요약 |',
    '| learning-history.csv | 시도(attempt) 단위 전체 이력 |',
    '| error-history.csv | 오답 이력 (오류 유형·오개념 태그 포함) |',
    '| misconception-history.csv | 오개념별 의심→확정→해결 타임라인 |',
    '| remediation-history.csv | 학습 구멍 치료 케이스별 이력 |',
    '| retention-history.csv | 장기 기억 복습 이력 (간격·전후 mastery) |',
    '| transfer-history.csv | 전이 문제 이력 (NEAR/DELAYED/FAR(GOLDEN)) |',
    '| elite-profile-history.csv | 9개 사고 차원의 주간 추이 |',
    '| strategy-history.csv | Elite 문제의 전략 흔적 |',
    '| golden-assessment-history.csv | Golden Set 시행 이력 (훈련과 분리된 평가) |',
    '| m2-readiness-history.csv | 도메인/클러스터 선행 준비도 주간 추이 |',
    '| raw-events.jsonl | **원본** — 모든 파생값의 근거. 한 줄 = 한 이벤트 |',
    '',
    '## Metric 정의',
    '- **masteryProbability**: Beta(α,β) 사후 평균 α/(α+β). 0~1. "정답률"이 아니라 난이도-가중 증거의 추정 숙달도.',
    '- **uncertainty**: 사후 표준편차. 높을수록 추정이 불확실.',
    '- **effectiveEvidence**: prior를 제외한 실효 증거 질량 (시간 감쇠 반영).',
    '- **knowledgeState**: UNSEEN→LEARNING→PRACTICING→PROVISIONAL→EARLY_MASTERY→MASTERED→STABLE_MASTERY (+WEAKENED). PROVISIONAL 이상 = "숙달 게이트 통과".',
    '- **retention stage**: 1/3/7/14/30일 간격 복습 사다리의 현재 단계 (-1 = 미진입).',
    '- **transferType**: NEAR = 같은 날 같은 스킬의 새 상황 문제, DELAYED = 1일+ 지난 뒤의 전이 문제, FAR(GOLDEN) = Golden Set의 원거리 전이 문항 (훈련 밖 측정).',
    '- **Elite dimension**: 9개 사고 차원(표현/전략/통합/신규전이/유연성/설명/일반화/역추론/근거)의 별도 Beta 추정 — Core mastery와 절대 섞이지 않는 독립 장부. evidence < 2 = 관찰 부족(수치 해석 금지).',
    '- **M2 readiness tier**: FOUNDATION/ADVANCED/ELITE — Core 안정 + 게이트 수 + 전이 실증 + 활성 오개념 부재의 요약. "확정 판단"이 아니라 현재 증거의 등급.',
    '- **Golden Set**: 훈련(추천/치료/복습)에 절대 쓰이지 않는 독립 평가. mastery에 영향 0. 성장 판단의 기준자.',
    '',
    '## 불확실성 규칙',
    '표본이 작은 값은 confidence(VERY_LOW/LOW/MEDIUM/HIGH)와 n이 함께 표기됩니다.',
    'evidence/confidence 없이 단독 수치를 인용하지 마세요.',
    '',
    '## Synthetic 데이터 포함 여부',
    dataSource === 'REAL' ? '이 패키지에는 synthetic 데이터가 포함되어 있지 않습니다.' : '이 패키지 전체가 synthetic입니다.',
    'Real과 Synthetic은 절대 혼합 분석하지 마세요.',
    '',
    '## Suggested Analysis Questions',
    '1. 현재 가장 강한 수학 영역은? 2. 현재 가장 작은 학습 구멍은? 3. 어떤 오류가 반복되는가?',
    '4. 해결된 gap이 다시 열리고 있는가? 5. 어떤 remediation이 가장 효과적이었는가?',
    '6. 7/14/30일 retention 추이는? 7. Near/Far transfer는 성장 중인가?',
    '8. Elite Thinking 최강 차원은? 9. 최약(또는 관찰 부족) 차원은? 10. 전략 유연성이 개선되는가?',
    '11. 일반화가 개선되는가? 12. Golden Set에 실제 성장 증거가 있는가?',
    '13. M2 진입 준비가 된 domain은? 14. M2를 막는 최소 prerequisite는? 15. 진도와 사고 깊이의 균형은?',
  ].join('\n');
}

function buildHowTo(dataSource: DataSource): string {
  return [
    '# HOW TO ANALYZE WITH CHATGPT',
    '',
    '이 ZIP 파일은 CHLOE MATH ' + (dataSource === 'REAL' ? '실제 학습 데이터' : '합성 테스트 데이터') + ' 분석용입니다.',
    '',
    '우선 다음 파일을 순서대로 읽으세요:',
    '1. ANALYSIS_README.md (metric 정의)',
    '2. analysis-summary.json',
    '3. skill-status.csv',
    '4. weekly-summary.csv',
    '5. golden-assessment-history.csv',
    '6. elite-profile-history.csv',
    '',
    '세부 원인 추적이 필요하면 raw-events.jsonl을 이용하세요 — summary의 sourceEventSeqs가',
    '어떤 원시 이벤트에서 그 수치가 나왔는지 가리킵니다.',
    '',
    '주의:',
    '- Synthetic과 Real 데이터를 절대 혼합하지 마세요 (README 최상단 DATA SOURCE 확인).',
    '- Golden Set 결과는 학습(훈련) 데이터와 별개의 평가 데이터입니다.',
    '- evidence(n)와 confidence 없이 수치를 단정하지 마세요.',
    '- "몇 문제 풀었나"가 아니라: 무엇이 변했고, 왜 변했고, 고친 것이 유지되고, 전이되고, 사고가 깊어졌는가를 중심으로 분석하세요.',
  ].join('\n');
}
