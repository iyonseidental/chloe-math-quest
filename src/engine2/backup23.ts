// CHLOE MATH 2.3 — FULL BACKUP + RESTORE (백업 지시 PART 1-15/51-53/64).
//
// 원칙:
//   · RAW EVENTS가 유일한 원본 (PART 6/38/62) — 백업은 이벤트를 삭제·요약·재정렬·재작성하지 않는다.
//   · Export는 완전 read-only — mastery/streak/스케줄/XP 어느 것도 변경하지 않는다 (PART 39).
//   · Export 직전 Replay 검증: 원시 이벤트 재생 트윈 == 라이브 트윈, 불일치면 VALIDATION FAILED (PART 8/9).
//   · Restore는 반드시 Sandbox Replay + 사용자 확인 + PRE_RESTORE 자동 백업 후에만 (PART 11-13/51).
//   · Merge 기본 금지 — REPLACE/RESTORE만 (PART 52). 중복/비단조 seq는 거부 (PART 53).
//   · 이 파일은 인프라 계층이다 — 학습 엔진(mastery/rootcause/remediation/elite) 알고리즘을 건드리지 않는다 (PART 64).
import { CONFIG21_VERSION, MASTERY_MODEL_VERSION, CURRICULUM_VERSION, KNOWLEDGE_GRAPH_VERSION } from './config21.ts';
import { MICRO_SKILLS, MISCONCEPTION_LIBRARY, SKILL_CLUSTERS } from './curriculum21.ts';
import { replayFromScratch } from './replay21.ts';
import type { EventLog, LearningEvent } from './events21.ts';
import type { DigitalTwin21 } from './types21.ts';
import { sha256Hex, zipRead } from './zip23.ts';

export const BACKUP_SCHEMA_VERSION = '1.0';
export const APP_VERSION = '2.3.0';

export type DataSource = 'REAL' | 'SYNTHETIC';

export interface BackupManifest {
  product: 'CHLOE MATH';
  student: string;
  exportType: 'FULL_BACKUP';
  exportedAt: string;
  schemaVersion: string;
  appVersion: string;
  configVersion: string;
  masteryModelVersion: string;
  curriculumVersion: string;
  knowledgeGraphVersion: string;
  totalEvents: number;
  firstEventAt: string | null;
  lastEventAt: string | null;
  firstSeq: number | null;
  lastSeq: number | null;
  dataSource: DataSource;
}

export interface BackupResult {
  ok: boolean;
  replayVerified: boolean;
  mismatches: string[]; // 라이브 vs 재생 불일치 지점 (있으면 ok=false)
  files: Record<string, string>;
  manifest: BackupManifest;
  zipName: string;
}

const iso = (ts: number) => new Date(ts).toISOString();

// PART 9 — 백업 성공 조건: 재생 트윈과 라이브 트윈의 핵심 장부 전수 일치.
export function compareTwins(live: DigitalTwin21, replayed: DigitalTwin21): string[] {
  const mismatches: string[] = [];
  const cmp = (label: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) mismatches.push(label);
  };
  cmp('event seq', live.seq, replayed.seq);
  cmp('skill states (mastery/uncertainty/retention 포함)', live.skills, replayed.skills);
  cmp('misconceptions', live.misconceptions, replayed.misconceptions);
  cmp('remediation cases', live.remediationCases, replayed.remediationCases);
  cmp('elite profile', live.elite, replayed.elite);
  cmp('agenda', live.agenda, replayed.agenda);
  cmp('holdout ledger', live.holdout, replayed.holdout);
  cmp('predictions', live.predictions, replayed.predictions);
  cmp('strategy traces', live.strategyTraces, replayed.strategyTraces);
  return mismatches;
}

export function detectDataSource(studentId: string): DataSource {
  // 실사용 앱의 학생 id는 'chloe' 하나 — 시뮬레이션/테스트 하네스는 다른 id를 쓴다.
  return studentId === 'chloe' ? 'REAL' : 'SYNTHETIC';
}

function eventLogIssues(events: LearningEvent[]): string[] {
  const issues: string[] = [];
  const seen = new Set<number>();
  let prev = -Infinity;
  for (const e of events) {
    if (seen.has(e.seq)) issues.push(`중복 seq: ${e.seq}`);
    seen.add(e.seq);
    if (e.seq <= prev) issues.push(`seq 비단조: ${prev} → ${e.seq}`);
    prev = e.seq;
    if (typeof e.ts !== 'number' || !e.type || e.payload === undefined) issues.push(`이벤트 형식 오류 (seq ${e.seq})`);
    if (issues.length > 20) break;
  }
  return issues;
}

export async function buildFullBackup(log: EventLog, liveTwin: DigitalTwin21, opts: { studentId: string; studentName?: string; now?: number; dataSource?: DataSource }): Promise<BackupResult> {
  const now = opts.now ?? Date.now();
  const events = log.events;
  const dataSource = opts.dataSource ?? detectDataSource(opts.studentId);

  // PART 8 — Export 직전 Replay 검증 (read-only: 어떤 상태도 변경하지 않음)
  const replayed = replayFromScratch(log, opts.studentId, opts.studentName ?? liveTwin.name);
  const mismatches = compareTwins(liveTwin, replayed);
  const replayVerified = mismatches.length === 0 && eventLogIssues(events).length === 0;

  const manifest: BackupManifest = {
    product: 'CHLOE MATH',
    student: opts.studentName ?? liveTwin.name,
    exportType: 'FULL_BACKUP',
    exportedAt: iso(now),
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    configVersion: CONFIG21_VERSION,
    masteryModelVersion: MASTERY_MODEL_VERSION,
    curriculumVersion: CURRICULUM_VERSION,
    knowledgeGraphVersion: KNOWLEDGE_GRAPH_VERSION,
    totalEvents: events.length,
    firstEventAt: events.length ? iso(events[0].ts) : null,
    lastEventAt: events.length ? iso(events[events.length - 1].ts) : null,
    firstSeq: events.length ? events[0].seq : null,
    lastSeq: events.length ? events[events.length - 1].seq : null,
    dataSource,
  };

  // PART 5 — events.jsonl: 한 줄 = 한 이벤트, 시간순 원본 그대로 (불변 — PART 6)
  const eventsJsonl = events.map((e) => JSON.stringify(e)).join('\n') + (events.length ? '\n' : '');

  const files: Record<string, string> = {};
  files['manifest.json'] = JSON.stringify(manifest, null, 2);
  files['events.jsonl'] = eventsJsonl;
  files['student-profile.json'] = JSON.stringify({ studentId: opts.studentId, displayName: manifest.student, dataSource }, null, 2);
  files['versions.json'] = JSON.stringify(
    { schemaVersion: BACKUP_SCHEMA_VERSION, appVersion: APP_VERSION, configVersion: CONFIG21_VERSION, masteryModelVersion: MASTERY_MODEL_VERSION, curriculumVersion: CURRICULUM_VERSION, knowledgeGraphVersion: KNOWLEDGE_GRAPH_VERSION },
    null,
    2,
  );
  // 참조 자료: 미래의 분석기가 skillId/misconceptionId를 해독할 수 있게 (파생 아님 — 사전)
  files['curriculum-reference.json'] = JSON.stringify(
    MICRO_SKILLS.map((s) => ({ skillId: s.skillId, nameKo: s.nameKo, domain: s.domain, cluster: SKILL_CLUSTERS.find((c) => c.skills.includes(s.skillId))?.id ?? null, prerequisites: s.prerequisites })),
    null,
    2,
  );
  files['misconception-reference.json'] = JSON.stringify(
    MISCONCEPTION_LIBRARY.map((m) => ({ id: m.id, descriptionKo: m.descriptionKo, mechanism: m.mechanism, triggerSkillId: m.triggerSkillId })),
    null,
    2,
  );
  // 파생 스냅숏 3종 — SOURCE OF TRUTH 아님 (PART 7); 빠른 확인·복원 검증·분석 편의용
  files['remediation-cases.json'] = JSON.stringify(liveTwin.remediationCases, null, 2);
  files['golden-assessments.json'] = JSON.stringify(liveTwin.holdout, null, 2);
  files['elite-events.json'] = JSON.stringify(
    { profile: liveTwin.elite, strategyTraces: liveTwin.strategyTraces, rootCauseCounts: liveTwin.eliteRootCauseCounts },
    null,
    2,
  );
  files['current-derived-state.json'] = JSON.stringify(replayed, null, 2);

  // PART 10 — integrity: 카운트/범위/검증 결과 + 파일별 SHA-256
  const checksums: Record<string, string> = {};
  for (const [name, content] of Object.entries(files)) checksums[name] = 'sha256:' + (await sha256Hex(content));
  files['integrity.json'] = JSON.stringify(
    {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportTimestamp: iso(now),
      eventCount: events.length,
      firstSeq: manifest.firstSeq,
      lastSeq: manifest.lastSeq,
      replayVerified,
      replayMismatches: mismatches,
      checksums,
    },
    null,
    2,
  );
  files['README.md'] = [
    '# CHLOE MATH FULL BACKUP',
    '',
    `- 학생: ${manifest.student}`,
    `- 데이터 출처: **${dataSource}**${dataSource === 'SYNTHETIC' ? ' (합성 테스트 데이터 — 실학습 분석에 사용 금지)' : ' (실사용 학습 데이터)'}`,
    `- 이벤트: ${events.length}건 (${manifest.firstEventAt ?? '-'} ~ ${manifest.lastEventAt ?? '-'})`,
    `- 스키마 v${BACKUP_SCHEMA_VERSION} / 앱 v${APP_VERSION} / 모델 ${MASTERY_MODEL_VERSION}`,
    '',
    '## 원본은 events.jsonl 하나입니다',
    '나머지 모든 파일(current-derived-state.json 포함)은 파생·참조 자료입니다.',
    '복원과 재분석은 언제나 events.jsonl의 재생(replay)으로 이루어집니다 — 모델이 바뀌어도',
    '원시 이벤트를 새 모델로 재생하면 전체 이력이 무손실 재계산됩니다.',
    '',
    '## 복원 방법',
    'CHLOE MATH 앱 → 학부모 리포트 → DATA & BACKUP → "백업 복원"에서 이 ZIP을 선택하세요.',
    '복원 전에 자동으로 (1) 샌드박스 재생 검증 (2) 현재 상태 안전 백업이 수행됩니다.',
  ].join('\n');

  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  const zipName = `CHLOE_MATH_BACKUP_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.zip`;

  return { ok: replayVerified, replayVerified, mismatches, files, manifest, zipName };
}

// ---------------------------------------------------------------------------
// RESTORE (PART 11-15/51-53)
// ---------------------------------------------------------------------------
export interface RestoreValidation {
  ok: boolean;
  stage: string; // 어느 단계까지 통과했는가
  errors: string[];
  warnings: string[];
  manifest: BackupManifest | null;
  backupEventCount: number;
  currentEventCount: number;
  versionCompatibility: {
    sameModel: boolean;
    backupVersions: Record<string, string> | null;
    currentVersions: Record<string, string>;
    // PART 15 — 구모델 백업: 원본 파생상태 vs 현재 모델 재생 결과 비교
    originalModelSummary: { avgMastery: number; gatedSkills: number } | null;
    currentModelSummary: { avgMastery: number; gatedSkills: number } | null;
  };
  sandboxTwin: DigitalTwin21 | null;
  events: LearningEvent[] | null;
}

function twinSummary(t: DigitalTwin21): { avgMastery: number; gatedSkills: number } {
  const skills = Object.values(t.skills);
  const GATED = ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'];
  return {
    avgMastery: skills.reduce((a, s) => a + s.alpha / (s.alpha + s.beta), 0) / Math.max(1, skills.length),
    gatedSkills: skills.filter((s) => GATED.includes(s.knowledgeState)).length,
  };
}

export async function validateBackupForRestore(zipBytes: Uint8Array, currentLog: EventLog, studentId: string): Promise<RestoreValidation> {
  const currentVersions = { schemaVersion: BACKUP_SCHEMA_VERSION, appVersion: APP_VERSION, configVersion: CONFIG21_VERSION, masteryModelVersion: MASTERY_MODEL_VERSION, curriculumVersion: CURRICULUM_VERSION, knowledgeGraphVersion: KNOWLEDGE_GRAPH_VERSION };
  const base: RestoreValidation = {
    ok: false, stage: 'read', errors: [], warnings: [], manifest: null,
    backupEventCount: 0, currentEventCount: currentLog.events.length,
    versionCompatibility: { sameModel: true, backupVersions: null, currentVersions, originalModelSummary: null, currentModelSummary: null },
    sandboxTwin: null, events: null,
  };

  // 1) ZIP 해석 (CRC 검증 포함)
  let files: Record<string, string>;
  try {
    files = zipRead(zipBytes);
  } catch (e) {
    base.errors.push(`ZIP 해석 실패: ${(e as Error).message}`);
    return base;
  }

  // 2) manifest 검증 (PART 11: Validate Manifest / TEST 4)
  base.stage = 'manifest';
  if (!files['manifest.json']) {
    base.errors.push('manifest.json이 없습니다 — 복원 거부 (유효한 CHLOE MATH 백업이 아님)');
    return base;
  }
  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(files['manifest.json']);
  } catch {
    base.errors.push('manifest.json 파싱 실패');
    return base;
  }
  base.manifest = manifest;
  if (manifest.product !== 'CHLOE MATH' || manifest.exportType !== 'FULL_BACKUP') {
    base.errors.push(`지원하지 않는 패키지: ${manifest.product}/${manifest.exportType} (ANALYSIS PACKAGE는 복원용이 아닙니다)`);
    return base;
  }

  // 3) 스키마 버전
  base.stage = 'schema';
  const majorOf = (v: string) => String(v ?? '').split('.')[0];
  if (majorOf(manifest.schemaVersion) !== majorOf(BACKUP_SCHEMA_VERSION)) {
    base.errors.push(`스키마 major 버전 불일치: 백업 ${manifest.schemaVersion} vs 앱 ${BACKUP_SCHEMA_VERSION}`);
    return base;
  }

  // 4) 체크섬 (PART 11: Validate Checksums / TEST 3)
  base.stage = 'checksum';
  if (files['integrity.json']) {
    try {
      const integrity = JSON.parse(files['integrity.json']);
      for (const [name, expected] of Object.entries(integrity.checksums ?? {}) as [string, string][]) {
        if (name === 'integrity.json') continue;
        if (!(name in files)) {
          base.errors.push(`백업에 명시된 파일 누락: ${name}`);
          continue;
        }
        const actual = 'sha256:' + (await sha256Hex(files[name]));
        if (actual !== expected) base.errors.push(`체크섬 불일치 — 손상: ${name}`);
      }
      if (integrity.replayVerified === false) base.warnings.push('이 백업은 생성 시점에 BACKUP VALIDATION FAILED 상태였습니다');
    } catch {
      base.warnings.push('integrity.json 파싱 실패 — 체크섬 검증 생략');
    }
  } else {
    base.warnings.push('integrity.json 없음 — 체크섬 검증 불가');
  }
  if (base.errors.length) return base;

  // 5) 이벤트 파싱 + 순서/중복 검증 (PART 53)
  base.stage = 'events';
  if (!files['events.jsonl']) {
    base.errors.push('events.jsonl이 없습니다 — 원본 데이터 부재, 복원 거부');
    return base;
  }
  let events: LearningEvent[];
  try {
    events = files['events.jsonl'].split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
  } catch (e) {
    base.errors.push(`events.jsonl 파싱 실패 (손상): ${(e as Error).message}`);
    return base;
  }
  const seqIssues = eventLogIssues(events);
  if (seqIssues.length) {
    base.errors.push(...seqIssues.slice(0, 5));
    return base;
  }
  if (events.length !== manifest.totalEvents) {
    base.errors.push(`이벤트 수 불일치: manifest ${manifest.totalEvents} vs 실제 ${events.length}`);
    return base;
  }
  base.backupEventCount = events.length;
  base.events = events;

  // 6) 버전 호환 (PART 14/15 / TEST 5-6)
  base.stage = 'version';
  const bv = { schemaVersion: manifest.schemaVersion, appVersion: manifest.appVersion, configVersion: manifest.configVersion, masteryModelVersion: manifest.masteryModelVersion, curriculumVersion: manifest.curriculumVersion, knowledgeGraphVersion: manifest.knowledgeGraphVersion };
  base.versionCompatibility.backupVersions = bv;
  const sameModel = bv.masteryModelVersion === MASTERY_MODEL_VERSION && bv.configVersion === CONFIG21_VERSION && bv.curriculumVersion === CURRICULUM_VERSION;
  base.versionCompatibility.sameModel = sameModel;

  // 7) 샌드박스 재생 (PART 11/12) — 현재 모델로 raw events 재생 (구모델 백업도 버리지 않음, PART 15)
  base.stage = 'sandbox';
  let sandboxTwin: DigitalTwin21;
  try {
    sandboxTwin = replayFromScratch({ events }, studentId, manifest.student);
  } catch (e) {
    base.errors.push(`샌드박스 재생 실패: ${(e as Error).message}`);
    return base;
  }
  base.sandboxTwin = sandboxTwin;
  base.versionCompatibility.currentModelSummary = twinSummary(sandboxTwin);
  if (files['current-derived-state.json']) {
    try {
      base.versionCompatibility.originalModelSummary = twinSummary(JSON.parse(files['current-derived-state.json']));
    } catch {
      base.warnings.push('current-derived-state.json 파싱 실패 — 원본 모델 비교 생략');
    }
  }
  if (!sameModel) {
    base.warnings.push(`모델/버전이 다른 백업입니다 (백업: ${bv.masteryModelVersion}/${bv.configVersion} → 현재: ${MASTERY_MODEL_VERSION}/${CONFIG21_VERSION}). 원시 이벤트를 현재 모델로 재생한 결과가 적용됩니다 — 아래에서 원본 모델 결과와 비교하세요.`);
  }
  if (manifest.dataSource === 'SYNTHETIC') {
    base.warnings.push('SYNTHETIC 백업입니다 — 실학습 데이터가 아닙니다.');
  }

  base.stage = 'ready';
  base.ok = true;
  return base;
}

// PART 13/51 — 복원 직전 현재 상태 안전 백업 파일 생성 (호출자가 저장/다운로드)
export async function buildPreRestoreBackup(currentLog: EventLog, liveTwin: DigitalTwin21, studentId: string): Promise<BackupResult> {
  const r = await buildFullBackup(currentLog, liveTwin, { studentId });
  return { ...r, zipName: r.zipName.replace('CHLOE_MATH_BACKUP_', 'CHLOE_MATH_PRE_RESTORE_BACKUP_') };
}
