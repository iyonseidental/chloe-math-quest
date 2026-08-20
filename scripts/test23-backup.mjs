// BACKUP & ANALYSIS EXPORT — TESTS 1~13 (백업 지시 PART 49/50) + 인프라 검증.
import { freshTwin21, replayFromScratch } from '../src/engine2/replay21.ts';
import { submitAttempt, submitEliteAttempt, submitHoldoutAttempt, buildProblemForAction } from '../src/engine2/session21.ts';
import { emptyLog, resetEventSeq } from '../src/engine2/events21.ts';
import { zipStore, zipRead, sha256Hex } from '../src/engine2/zip23.ts';
import { buildFullBackup, validateBackupForRestore, compareTwins, buildPreRestoreBackup, BACKUP_SCHEMA_VERSION } from '../src/engine2/backup23.ts';
import { buildAnalysisPackage, foldWithHistory } from '../src/engine2/analysis23.ts';
import { GOLDEN_SET, goldenForm } from '../src/engine2/goldenSet23.ts';
import { ELITE_BANK_MAP } from '../src/engine2/eliteBank22.ts';
import { domainReadiness } from '../src/engine2/elite22.ts';
import { ALL_SKILL_IDS } from '../src/engine2/curriculum21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const BASE = Date.parse('2026-09-01T09:00:00Z');

// ---- 실전형 로그 구성: 일반 학습 + 오답 + elite + golden (여러 날에 걸쳐) ----
function buildRealisticState() {
  resetEventSeq(0);
  const state = { twin: freshTwin21('chloe'), log: emptyLog(), ts: BASE };
  const answer = (skillId, correct, opts = {}) => {
    const a = { kind: 'normal', skillId, difficulty: opts.d ?? 3, variant: opts.variant ?? 'standard', reason: 't' };
    const p = buildProblemForAction(a);
    const idx = correct ? p.answerIndex : (p.answerIndex + 1) % p.choices.length;
    const r = submitAttempt(state.twin, state.log, a, p, { chosenIndex: idx, solveTimeSec: opts.sec ?? 40, hintsUsed: 0, retryCount: 0 }, (state.ts += opts.gap ?? 90000));
    state.twin = r.twin;
    state.log = r.log;
  };
  // 1주차: SIGN.01 강화 (transfer 포함)
  for (let i = 0; i < 12; i++) answer('M1.NUM.SIGN.01', i !== 4);
  answer('M1.NUM.SIGN.01', true, { variant: 'transfer' });
  state.ts += 2 * 86400000;
  // EXP.01 혼합 성적
  for (let i = 0; i < 10; i++) answer('M1.ALG.EXP.01', i % 3 !== 1);
  // 2주차: 다른 날 + retention 근사 (기존 스킬 재방문)
  state.ts += 6 * 86400000;
  for (let i = 0; i < 6; i++) answer('M1.NUM.SIGN.01', true);
  answer('M1.NUM.SIGN.01', true, { variant: 'transfer' });
  // Golden Form A 시행
  const admin = 'admin-A-1';
  for (const item of goldenForm('A')) {
    const r = submitHoldoutAttempt(state.twin, state.log, item, { chosenIndex: item.answerIndex, solveTimeSec: 35 }, admin, (state.ts += 60000));
    state.twin = r.twin;
    state.log = r.log;
  }
  return state;
}

const state = buildRealisticState();
const EV = state.log.events.length;

// ---- ZIP 왕복 ----
{
  const files = { 'a.txt': '안녕 CHLOE', 'dir/b.json': JSON.stringify({ x: 1 }) };
  const rt = zipRead(zipStore(files));
  check('zip store/read 왕복 무손실 (UTF-8 포함)', rt['a.txt'] === files['a.txt'] && rt['dir/b.json'] === files['dir/b.json']);
}

// ---- FULL BACKUP 생성 + 검증 성공 조건 (PART 8/9/10) ----
const backup = await buildFullBackup(state.log, state.twin, { studentId: 'chloe' });
{
  check('replay 검증 PASS 상태로 백업 생성', backup.ok && backup.replayVerified, backup.mismatches.join(','));
  check('manifest 필수 필드 완비', backup.manifest.totalEvents === EV && backup.manifest.schemaVersion === BACKUP_SCHEMA_VERSION && backup.manifest.masteryModelVersion.length > 0);
  const required = ['manifest.json', 'events.jsonl', 'student-profile.json', 'versions.json', 'curriculum-reference.json', 'misconception-reference.json', 'remediation-cases.json', 'golden-assessments.json', 'elite-events.json', 'current-derived-state.json', 'integrity.json', 'README.md'];
  check('PART 3 명세 파일 12종 전부 생성', required.every((f) => f in backup.files), required.filter((f) => !(f in backup.files)).join(','));
  const lines = backup.files['events.jsonl'].trim().split('\n');
  check(`events.jsonl 한 줄=한 이벤트, 시간순 원본 그대로 (${lines.length}건)`, lines.length === EV && JSON.parse(lines[0]).seq === state.log.events[0].seq);
  const integrity = JSON.parse(backup.files['integrity.json']);
  check('integrity: count/seq범위/replayVerified/체크섬', integrity.eventCount === EV && integrity.replayVerified === true && Object.keys(integrity.checksums).length >= 10);
  const expected = 'sha256:' + (await sha256Hex(backup.files['events.jsonl']));
  check('SHA-256 체크섬이 실제 내용과 일치', integrity.checksums['events.jsonl'] === expected);
}

// ---- 라이브 트윈 변조 → BACKUP VALIDATION FAILED (PART 9) ----
{
  const tampered = { ...state.twin, skills: { ...state.twin.skills, 'M1.NUM.SIGN.01': { ...state.twin.skills['M1.NUM.SIGN.01'], alpha: 999 } } };
  const bad = await buildFullBackup(state.log, tampered, { studentId: 'chloe' });
  check('라이브-재생 불일치 시 ok=false (경고 없는 정상 저장 불가)', !bad.ok && bad.mismatches.length > 0, bad.mismatches.join(','));
}

const zipBytes = zipStore(backup.files);

// ---- TEST 1: Export → Import → Replay identical ----
{
  const v = await validateBackupForRestore(zipBytes, state.log, 'chloe');
  check('TEST 1: 복원 검증 전 단계 통과 (stage=ready)', v.ok && v.stage === 'ready', v.errors.join(','));
  check('TEST 1: 샌드박스 트윈 == 라이브 트윈 (완전 일치)', compareTwins(state.twin, v.sandboxTwin).length === 0);
}

// ---- TEST 2: Export → 초기화 → Import → 전 진행 복원 ----
{
  const v = await validateBackupForRestore(zipBytes, emptyLog(), 'chloe');
  check('TEST 2: 빈 상태에서 복원해도 전 진행 복원', v.ok && v.backupEventCount === EV && compareTwins(state.twin, v.sandboxTwin).length === 0);
  check('TEST 2: 현재/백업 이벤트 수를 사용자에게 제시 (PART 12)', v.currentEventCount === 0 && v.backupEventCount === EV);
}

// ---- TEST 3: 손상된 events 파일 → 거부 ----
{
  const corrupted = { ...backup.files, 'events.jsonl': backup.files['events.jsonl'].replace('"correct":true', '"correct":tru') };
  const v = await validateBackupForRestore(zipStore(corrupted), state.log, 'chloe');
  check('TEST 3: 손상 이벤트 → 복원 거부 (체크섬 단계에서 적발)', !v.ok && v.errors.some((e) => /체크섬|손상|파싱/.test(e)), v.errors.join(','));
}

// ---- TEST 4: manifest 누락 → 거부 ----
{
  const noManifest = { ...backup.files };
  delete noManifest['manifest.json'];
  const v = await validateBackupForRestore(zipStore(noManifest), state.log, 'chloe');
  check('TEST 4: manifest 없음 → 복원 거부', !v.ok && v.errors.some((e) => e.includes('manifest')));
}

// ---- TEST 5/6: 구버전/구모델 백업 → 호환 분석 + 현재 모델 재생 옵션 (PART 14/15) ----
{
  const oldManifest = JSON.parse(backup.files['manifest.json']);
  oldManifest.masteryModelVersion = '2.2.0-ability-beta-OLD';
  oldManifest.configVersion = '2.2.0';
  oldManifest.appVersion = '2.2.0';
  const oldFiles = { ...backup.files, 'manifest.json': JSON.stringify(oldManifest, null, 2) };
  // 체크섬 재계산 (manifest만 바뀜)
  const integ = JSON.parse(oldFiles['integrity.json']);
  integ.checksums['manifest.json'] = 'sha256:' + (await sha256Hex(oldFiles['manifest.json']));
  oldFiles['integrity.json'] = JSON.stringify(integ, null, 2);
  const v = await validateBackupForRestore(zipStore(oldFiles), state.log, 'chloe');
  check('TEST 5: 구버전 백업 → 거부가 아니라 호환 분석 (경고 + 진행 가능)', v.ok && !v.versionCompatibility.sameModel && v.warnings.some((w) => w.includes('모델/버전')));
  check('TEST 6: raw events를 현재 모델로 재생한 결과 제공', v.versionCompatibility.currentModelSummary !== null && v.sandboxTwin !== null);
  check('TEST 6: 원본 모델 결과와 비교 가능 (ORIGINAL vs CURRENT)', v.versionCompatibility.originalModelSummary !== null);
}

// ---- TEST 7/8: Synthetic/Real 라벨 ----
{
  const synth = await buildFullBackup(state.log, replayFromScratch(state.log, 'sim-test'), { studentId: 'sim-test' });
  check('TEST 7: 비-chloe 학생 id → SYNTHETIC 라벨', synth.manifest.dataSource === 'SYNTHETIC' && synth.files['README.md'].includes('SYNTHETIC'));
  check('TEST 8: chloe → REAL 라벨', backup.manifest.dataSource === 'REAL' && backup.files['README.md'].includes('REAL'));
}

// ---- 중복 seq 거부 (PART 53) ----
{
  const dup = [...state.log.events, { ...state.log.events[3] }];
  const dupJsonl = dup.map((e) => JSON.stringify(e)).join('\n') + '\n';
  const files = { ...backup.files, 'events.jsonl': dupJsonl };
  const m = JSON.parse(files['manifest.json']);
  m.totalEvents = dup.length;
  files['manifest.json'] = JSON.stringify(m, null, 2);
  const integ = JSON.parse(files['integrity.json']);
  integ.checksums['events.jsonl'] = 'sha256:' + (await sha256Hex(dupJsonl));
  integ.checksums['manifest.json'] = 'sha256:' + (await sha256Hex(files['manifest.json']));
  files['integrity.json'] = JSON.stringify(integ, null, 2);
  const v = await validateBackupForRestore(zipStore(files), state.log, 'chloe');
  check('중복/비단조 seq → 복원 거부 (PART 53)', !v.ok && v.errors.some((e) => /중복|비단조/.test(e)));
}

// ---- PRE_RESTORE 백업 (PART 13/51) ----
{
  const pre = await buildPreRestoreBackup(state.log, state.twin, 'chloe');
  check('복원 전 안전 백업 생성 (PRE_RESTORE 파일명)', pre.ok && pre.zipName.includes('PRE_RESTORE'));
}

// ---- ANALYSIS PACKAGE (PART 16-37) ----
const pkg = buildAnalysisPackage(state.log, { studentId: 'chloe', studentName: 'Chloe' });
{
  const required = ['ANALYSIS_README.md', 'HOW_TO_ANALYZE_WITH_CHATGPT.md', 'analysis-summary.json', 'learning-history.csv', 'skill-status.csv', 'error-history.csv', 'misconception-history.csv', 'remediation-history.csv', 'retention-history.csv', 'transfer-history.csv', 'elite-profile-history.csv', 'strategy-history.csv', 'golden-assessment-history.csv', 'm2-readiness-history.csv', 'weekly-summary.csv', 'latest-parent-report.md', 'raw-events.jsonl'];
  check(`분석 패키지 파일 ${required.length}종 전부 생성`, required.every((f) => f in pkg.files), required.filter((f) => !(f in pkg.files)).join(','));
  check('README 최상단 DATA SOURCE = REAL 명시 (PART 19)', pkg.files['ANALYSIS_README.md'].includes('REAL CHLOE DATA'));
  const summary = JSON.parse(pkg.files['analysis-summary.json']);
  check('summary에 evidence+confidence 동반 (PART 21)', summary.transfer.near.attempts >= 0 && typeof summary.transfer.near.confidence === 'string' && summary.elite.generalization.confidence !== undefined);
  check('traceability: sourceEventSeqs 제공 (PART 37)', Array.isArray(summary.transfer.near.sourceEventSeqs));
  check('raw-events.jsonl 포함 + 원본과 동일', pkg.files['raw-events.jsonl'] === backup.files['events.jsonl']);
}

// ---- TEST 9: skill-status.csv의 mastery가 raw events에서 재현 가능 ----
{
  const replayed = replayFromScratch(state.log, 'chloe');
  const rows = pkg.files['skill-status.csv'].trim().split('\n').slice(1);
  let ok = true;
  for (const row of rows) {
    const cols = row.split(',');
    const skillId = cols[0];
    const p = parseFloat(cols[4]);
    const s = replayed.skills[skillId];
    if (Math.abs(p - s.alpha / (s.alpha + s.beta)) > 0.001) { ok = false; break; }
  }
  check('TEST 9: skill-status.csv mastery 전 행이 raw events 재생값과 일치', ok && rows.length === ALL_SKILL_IDS.length);
}

// ---- TEST 10: weekly summary 합계 == 원천 이벤트 집계 ----
{
  const weekly = pkg.files['weekly-summary.csv'].trim().split('\n').slice(1);
  const totalMeaningful = weekly.reduce((a, r) => a + parseInt(r.split(',')[1], 10), 0);
  const sourceCount = state.log.events.filter((e) => e.type === 'ATTEMPT' && e.payload.mode !== 'micro-lesson').length;
  check(`TEST 10: 주간 유의 시도 합계(${totalMeaningful}) == 원천 집계(${sourceCount})`, totalMeaningful === sourceCount);
}

// ---- TEST 11: Golden 이벤트가 mastery를 바꾸지 않음 ----
{
  const noGolden = { events: state.log.events.filter((e) => e.type !== 'HOLDOUT_ASSESSMENT') };
  const a = replayFromScratch(state.log, 'chloe');
  const b = replayFromScratch(noGolden, 'chloe');
  check('TEST 11: holdout 유무와 무관하게 skills 동일', JSON.stringify(a.skills) === JSON.stringify(b.skills));
}

// ---- TEST 12: Elite 이벤트가 Core α/β를 오염시키지 않음 ----
{
  resetEventSeq(50000);
  let s2 = { twin: freshTwin21('chloe'), log: emptyLog(), ts: BASE };
  const prob = ELITE_BANK_MAP['E.NR.001'];
  const before = JSON.stringify(Object.fromEntries(prob.requiredSkills.map((id) => [id, [s2.twin.skills[id].alpha, s2.twin.skills[id].beta]])));
  const r = submitEliteAttempt(s2.twin, s2.log, { kind: 'elite', skillId: prob.requiredSkills[0], difficulty: prob.difficulty, variant: 'standard', eliteProblemId: prob.id, reason: 't' }, { chosenIndex: prob.answerIndex, solveTimeSec: 120, hintsUsed: [], strategySwitches: 0 }, (s2.ts += 60000));
  const after = JSON.stringify(Object.fromEntries(prob.requiredSkills.map((id) => [id, [r.twin.skills[id].alpha, r.twin.skills[id].beta]])));
  check('TEST 12: elite 시도 후 Core α/β 완전 무변동', before === after);
}

// ---- TEST 13: m2-readiness export == 라이브 엔진 출력 ----
{
  const h = foldWithHistory(state.log, 'chloe');
  const lastWeek = h.weekly[h.weekly.length - 1];
  let ok = true;
  for (const dom of ['NUM', 'ALG', 'FUN', 'GEO', 'STA']) {
    if (lastWeek.twinSnapshot.domainTiers[dom] !== domainReadiness(state.twin, dom)) ok = false;
  }
  check('TEST 13: m2-readiness 마지막 스냅숏 == 라이브 domainReadiness', ok);
}

// ---- 익명화 (PART 48) + 필터 (PART 40) + read-only (PART 39) ----
{
  const anon = buildAnalysisPackage(state.log, { studentId: 'chloe', studentName: 'Chloe', anonymize: true });
  check('익명화: 학생 이름이 Student A로 대체', JSON.parse(anon.files['analysis-summary.json']).student === 'Student A' && !anon.files['latest-parent-report.md'].includes('Chloe'));
  const filtered = buildAnalysisPackage(state.log, { studentId: 'chloe', range: { fromTs: BASE + 7 * 86400000 } });
  const allRows = pkg.files['learning-history.csv'].trim().split('\n').length;
  const fRows = filtered.files['learning-history.csv'].trim().split('\n').length;
  check('기간 필터: 이력 행이 줄어들되 상태 계산은 전체 재생 기반', fRows < allRows && filtered.files['skill-status.csv'] === pkg.files['skill-status.csv']);
  const logBefore = JSON.stringify(state.log);
  const twinBefore = JSON.stringify(state.twin);
  await buildFullBackup(state.log, state.twin, { studentId: 'chloe' });
  buildAnalysisPackage(state.log, { studentId: 'chloe' });
  check('Export는 read-only: 로그·트윈 무변동 (PART 39)', JSON.stringify(state.log) === logBefore && JSON.stringify(state.twin) === twinBefore);
}

console.log(`\n${pass} checks passed — Backup & Analysis Export (TESTS 1~13) OK`);
