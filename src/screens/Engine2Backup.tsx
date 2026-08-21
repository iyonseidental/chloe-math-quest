// DATA & BACKUP (백업 지시 PART 41-46/51-54/66-67).
// 부모가 기술을 몰라도 쓸 수 있는 3버튼 흐름: 완전 백업 / 분석 패키지 / 복원.
// 모든 Export는 read-only. Restore는 샌드박스 검증 → 안전 백업 → 사용자 확인 순.
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Archive, FileHeart, ShieldCheck, Sparkles, Upload, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { useEngine2 } from '../context/Engine2Context.tsx';
import { buildFullBackup, buildPreRestoreBackup, validateBackupForRestore, type RestoreValidation } from '../engine2/backup23.ts';
import { buildAnalysisPackage } from '../engine2/analysis23.ts';
import { zipStore } from '../engine2/zip23.ts';
import { ENGINE2_STUDENT_ID } from '../engine2/store21.ts';
import { loadSyncConfig, saveSyncConfig, loadSyncMeta, syncNow, testConnection, applyAdoptedDoc, replaceToken, tokenAgeDays, tokenRenewalDue } from '../engine2/sync23.ts';
import { Cloud } from 'lucide-react';

const HISTORY_KEY = 'chloe-backup-history-v1'; // 이벤트 원장과 분리된 별도 저장 — 학습 성과에 무영향

interface BackupHistoryEntry {
  at: string;
  kind: string;
  events: number;
  verified: boolean;
}

function loadHistory(): BackupHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function pushHistory(e: BackupHistoryEntry) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([e, ...loadHistory()].slice(0, 10)));
  } catch {
    /* 기록 실패는 무해 */
  }
}

function downloadBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes.slice().buffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

interface ExportReport {
  kind: string;
  events: number;
  range: string;
  replay: 'PASS' | 'FAIL';
  files: number;
  zipName: string;
}

export default function Engine2Backup({ onBack }: { onBack: () => void }) {
  const { twin, log } = useEngine2();
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<ExportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anonymize, setAnonymize] = useState(false);
  const [restore, setRestore] = useState<{ validation: RestoreValidation; bytes: Uint8Array } | null>(null);
  const [restored, setRestored] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [syncCfg, setSyncCfg] = useState(() => loadSyncConfig());
  const [syncOwner, setSyncOwner] = useState(syncCfg?.owner ?? 'iyonseidental');
  const [syncRepo, setSyncRepo] = useState(syncCfg?.repo ?? 'chloe-math-data');
  const [syncToken, setSyncToken] = useState(syncCfg?.token ?? '');
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [renewToken, setRenewToken] = useState('');
  const [showRenew, setShowRenew] = useState(false);

  const doRenew = async () => {
    if (!renewToken.trim()) return;
    setSyncBusy(true);
    const cfg = loadSyncConfig();
    if (cfg) {
      const t = await testConnection({ ...cfg, token: renewToken.trim() });
      if (!t.ok) {
        setSyncMsg('✗ 새 토큰 확인 실패: ' + t.message);
        setSyncBusy(false);
        return;
      }
      replaceToken(renewToken);
      setSyncCfg(loadSyncConfig());
      setRenewToken('');
      setShowRenew(false);
      const r = await syncNow(log);
      setSyncMsg('✓ 토큰 갱신 완료! ' + r.message);
    }
    setSyncBusy(false);
  };
  const syncMeta = loadSyncMeta();

  const connectSync = async () => {
    setSyncBusy(true);
    setSyncMsg(null);
    const cfg = { owner: syncOwner.trim(), repo: syncRepo.trim(), token: syncToken.trim(), path: 'chloe-events.json' };
    const t = await testConnection(cfg);
    if (!t.ok) {
      setSyncMsg('✗ ' + t.message);
      setSyncBusy(false);
      return;
    }
    saveSyncConfig(cfg);
    setSyncCfg(cfg);
    const r = await syncNow(log);
    setSyncMsg('✓ ' + t.message + ' · ' + r.message);
    if (r.needsReload && r.adoptedDoc) {
      applyAdoptedDoc(r.adoptedDoc);
      setTimeout(() => window.location.reload(), 800);
    }
    setSyncBusy(false);
  };
  const runSync = async () => {
    setSyncBusy(true);
    const r = await syncNow(log);
    setSyncMsg((r.status === 'error' ? '✗ ' : '✓ ') + r.message);
    if (r.needsReload && r.adoptedDoc) {
      applyAdoptedDoc(r.adoptedDoc);
      setTimeout(() => window.location.reload(), 800);
    }
    setSyncBusy(false);
  };
  const history = useMemo(() => loadHistory(), [report, restored]); // eslint-disable-line react-hooks/exhaustive-deps

  const eventCount = log.events.length;
  const firstTs = log.events[0]?.ts;
  const lastTs = log.events[log.events.length - 1]?.ts;
  const range = firstTs ? `${new Date(firstTs).toLocaleDateString()} ~ ${new Date(lastTs).toLocaleDateString()}` : '아직 기록 없음';
  const lastBackup = history[0];
  const eventsSinceBackup = lastBackup ? eventCount - lastBackup.events : eventCount;
  const needsBackupNudge = eventCount > 0 && (!lastBackup || eventsSinceBackup >= 100); // PART 46 — 가벼운 안내

  const runExport = async (kind: 'FULL' | 'ANALYSIS' | 'COMPLETE') => {
    setBusy(kind);
    setError(null);
    setReport(null);
    try {
      let files: Record<string, string>;
      let zipName: string;
      let replayPass = true;
      if (kind === 'ANALYSIS') {
        const pkg = buildAnalysisPackage(log, { studentId: ENGINE2_STUDENT_ID, studentName: twin.name, anonymize });
        files = pkg.files;
        zipName = pkg.zipName;
      } else {
        const full = await buildFullBackup(log, twin, { studentId: ENGINE2_STUDENT_ID });
        replayPass = full.ok;
        if (!full.ok && !window.confirm(`⚠️ BACKUP VALIDATION FAILED\n재생 검증 불일치: ${full.mismatches.join(', ')}\n그래도 저장할까요? (권장하지 않음)`)) {
          setBusy(null);
          return;
        }
        if (kind === 'FULL') {
          files = full.files;
          zipName = full.zipName;
        } else {
          // PART 43 — COMPLETE ARCHIVE: 두 폴더 동시 포함
          const pkg = buildAnalysisPackage(log, { studentId: ENGINE2_STUDENT_ID, studentName: twin.name, anonymize });
          files = {};
          for (const [n, c] of Object.entries(full.files)) files[`full-backup/${n}`] = c;
          for (const [n, c] of Object.entries(pkg.files)) files[`analysis-package/${n}`] = c;
          zipName = full.zipName.replace('CHLOE_MATH_BACKUP_', 'CHLOE_MATH_COMPLETE_');
        }
      }
      downloadBytes(zipStore(files), zipName);
      pushHistory({ at: new Date().toISOString(), kind, events: eventCount, verified: replayPass });
      setReport({ kind: kind === 'FULL' ? '완전 백업' : kind === 'ANALYSIS' ? '분석 패키지' : '통합 아카이브', events: eventCount, range, replay: replayPass ? 'PASS' : 'FAIL', files: Object.keys(files).length, zipName });
    } catch (e) {
      setError(`내보내기 실패: ${(e as Error).message}`);
    }
    setBusy(null);
  };

  const onPickRestore = async (f: File) => {
    setBusy('RESTORE');
    setError(null);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const validation = await validateBackupForRestore(bytes, log, ENGINE2_STUDENT_ID);
      setRestore({ validation, bytes });
    } catch (e) {
      setError(`백업 파일을 읽지 못했어요: ${(e as Error).message}`);
    }
    setBusy(null);
  };

  const confirmRestore = async () => {
    if (!restore?.validation.ok || !restore.validation.events) return;
    setBusy('RESTORE');
    try {
      // PART 13/51 — 복원 전 현재 상태 안전 백업 자동 다운로드
      if (log.events.length > 0) {
        const pre = await buildPreRestoreBackup(log, twin, ENGINE2_STUDENT_ID);
        downloadBytes(zipStore(pre.files), pre.zipName);
      }
      // REPLACE 복원 (PART 52 — merge 금지): 원장 교체 후 재생을 위해 전체 리로드
      localStorage.setItem('chloe-engine21-eventlog-v1', JSON.stringify({ events: restore.validation.events }));
      pushHistory({ at: new Date().toISOString(), kind: 'RESTORE', events: restore.validation.events.length, verified: true });
      setRestored(true);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setError(`복원 실패: ${(e as Error).message}`);
      setBusy(null);
    }
  };

  const v = restore?.validation;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onBack} className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="뒤로">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-800">DATA &amp; BACKUP</h1>
          <p className="text-xs text-slate-500">채림이의 모든 배움이 이 기록 안에 있어요 — 안전하게 보관하고, 언제든 다시 분석해요.</p>
        </div>
      </div>

      {/* 성장 자산 히어로 */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-[1.5px] shadow-lg shadow-indigo-200/50">
        <div className="rounded-3xl bg-white/95 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-500">Learning Asset</div>
              <div className="mt-0.5 text-3xl font-extrabold text-slate-800">{eventCount.toLocaleString()}<span className="ml-1 text-sm font-semibold text-slate-400">개의 학습 순간</span></div>
              <div className="text-xs text-slate-500">{range}</div>
            </div>
            <div className="text-right text-xs text-slate-500">
              {lastBackup ? (
                <>
                  <div className="flex items-center justify-end gap-1 font-semibold text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" /> 마지막 백업 {new Date(lastBackup.at).toLocaleDateString()}</div>
                  <div>{lastBackup.events.toLocaleString()}건 · {lastBackup.verified ? 'Verified' : 'UNVERIFIED'}</div>
                </>
              ) : (
                <div className="font-semibold text-slate-400">아직 백업 없음</div>
              )}
            </div>
          </div>
          {needsBackupNudge && (
            <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-[11px] text-indigo-600">
              💡 최근 백업 이후 새로운 학습 기록이 많이 쌓였어요. 오늘의 성장을 안전하게 보관해 두면 좋아요.
            </div>
          )}
        </div>
      </div>

      {/* Export 버튼 3종 — 반응형 그리드 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" disabled={busy !== null || eventCount === 0} onClick={() => runExport('COMPLETE')} className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-4 text-left transition hover:border-indigo-400 hover:shadow-md disabled:opacity-40">
          <Archive className="h-6 w-6 text-indigo-500 transition group-hover:scale-110" />
          <div className="text-sm font-extrabold text-slate-800">통합 아카이브</div>
          <p className="text-[11px] leading-relaxed text-slate-500">완전 백업 + 분석 패키지를 한 파일에. 정기 보관용으로 가장 추천해요.</p>
          <span className="mt-auto text-[10px] font-bold text-indigo-500">{busy === 'COMPLETE' ? '만드는 중…' : 'ZIP 다운로드 →'}</span>
        </button>
        <button type="button" disabled={busy !== null || eventCount === 0} onClick={() => runExport('FULL')} className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 hover:shadow-md disabled:opacity-40">
          <ShieldCheck className="h-6 w-6 text-emerald-500 transition group-hover:scale-110" />
          <div className="text-sm font-extrabold text-slate-800">완전 백업</div>
          <p className="text-[11px] leading-relaxed text-slate-500">모든 학습 원본 데이터를 보관하며, 나중에 완전 복원할 수 있어요.</p>
          <span className="mt-auto text-[10px] font-bold text-emerald-600">{busy === 'FULL' ? '만드는 중…' : 'ZIP 다운로드 →'}</span>
        </button>
        <button type="button" disabled={busy !== null || eventCount === 0} onClick={() => runExport('ANALYSIS')} className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-violet-400 hover:shadow-md disabled:opacity-40">
          <FileHeart className="h-6 w-6 text-violet-500 transition group-hover:scale-110" />
          <div className="text-sm font-extrabold text-slate-800">분석 패키지</div>
          <p className="text-[11px] leading-relaxed text-slate-500">성장과 보완점 분석에 최적화된 형식. ChatGPT에 업로드해 심층 분석할 수 있어요.</p>
          <span className="mt-auto text-[10px] font-bold text-violet-500">{busy === 'ANALYSIS' ? '만드는 중…' : 'ZIP 다운로드 →'}</span>
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-500">
        <input type="checkbox" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
        분석 패키지에서 이름을 &quot;Student A&quot;로 익명화 (학습 내용은 유지)
      </label>

      {/* Export 완료 리포트 (PART 54) */}
      {report && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <div className="flex items-center gap-1.5 text-sm font-extrabold"><CheckCircle2 className="h-4 w-4" /> {report.kind} 완료!</div>
          <div>이벤트 {report.events.toLocaleString()}건 · 기간 {report.range}</div>
          <div>Replay 검증: <b>{report.replay}</b> · 파일 {report.files}개 · 무결성 체크섬 포함</div>
          <div className="font-mono text-[10px] text-emerald-600">{report.zipName}</div>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* 클라우드 동기화 (GitHub) — 어디서든 이어하기 */}
      <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-b from-sky-50 to-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <Cloud className="h-4 w-4 text-sky-500" /> 클라우드 동기화
          </div>
          {syncCfg ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">연결됨 · {syncCfg.owner}/{syncCfg.repo}</span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-400">미설정</span>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          설정하면 <b>어떤 기기에서 접속해도 학습 기록이 자동으로 이어져요</b> — 앱을 열 때 최신 기록을 가져오고, 학습 후 자동 저장돼요. 기록은 회원님의 <b>비공개</b> GitHub 저장소에만 보관되고, 토큰은 이 기기에만 저장됩니다.
        </p>
        {syncCfg ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={syncBusy} onClick={runSync} className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40">
              {syncBusy ? '동기화 중…' : '지금 동기화'}
            </button>
            <button type="button" onClick={() => setShowRenew((v) => !v)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-100">
              토큰 갱신
            </button>
            <button type="button" onClick={() => { saveSyncConfig(null); setSyncCfg(null); setSyncMsg('동기화가 해제되었어요 (기록은 이 기기에 그대로 남아요)'); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">
              해제
            </button>
            {syncMeta.lastSyncAt && <span className="text-[10px] text-slate-400">마지막 동기화 {new Date(syncMeta.lastSyncAt).toLocaleString()}</span>}
            {tokenRenewalDue(syncCfg) && (
              <span className="w-full rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                ⏰ 토큰을 저장한 지 {tokenAgeDays(syncCfg)}일이 지났어요 — GitHub 토큰은 최대 1년이라 곧 만료될 수 있어요. 미리 새 토큰을 만들어 &quot;토큰 갱신&quot;으로 바꿔 두면 끊김이 없어요.
              </span>
            )}
            {showRenew && (
              <div className="flex w-full flex-wrap gap-2">
                <input value={renewToken} onChange={(e) => setRenewToken(e.target.value)} type="password" placeholder="새 GitHub 토큰 붙여넣기" className="min-w-0 flex-1 rounded-xl border border-amber-200 px-3 py-2 text-xs" />
                <button type="button" disabled={syncBusy || !renewToken.trim()} onClick={doRenew} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40">
                  {syncBusy ? '확인 중…' : '교체'}
                </button>
                <p className="w-full text-[10px] text-slate-400">새 토큰 만들기는 처음과 동일: GitHub → Settings → Developer settings → Fine-grained tokens (chloe-math-data · Contents RW). 기록은 그대로 유지돼요.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={syncOwner} onChange={(e) => setSyncOwner(e.target.value)} placeholder="GitHub 아이디" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
              <input value={syncRepo} onChange={(e) => setSyncRepo(e.target.value)} placeholder="비공개 저장소 이름" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
            </div>
            <input value={syncToken} onChange={(e) => setSyncToken(e.target.value)} type="password" placeholder="GitHub 토큰 (이 기기에만 저장됨)" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
            <button type="button" disabled={syncBusy || !syncToken.trim()} onClick={connectSync} className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 py-2.5 text-xs font-extrabold text-white disabled:opacity-40">
              {syncBusy ? '연결 확인 중…' : '연결하고 동기화 시작'}
            </button>
            <p className="text-[10px] leading-relaxed text-slate-400">
              토큰 만들기: github.com → Settings → Developer settings → <b>Fine-grained tokens</b> → Generate new token → Repository access에서 <b>chloe-math-data 저장소 하나만</b> 선택 → Permissions에서 <b>Contents: Read and write</b>만 켜기 → 생성된 토큰을 위에 붙여넣기. (이 저장소 외에는 아무 권한도 없는 열쇠예요)
            </p>
          </div>
        )}
        {syncMsg && <div className={`mt-2 rounded-xl px-3 py-2 text-[11px] ${syncMsg.startsWith('✗') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>{syncMsg}</div>}
      </div>

      {/* Restore */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800"><Upload className="h-4 w-4 text-sky-500" /> 백업 복원</div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          완전 백업 ZIP을 선택하면 먼저 <b>샌드박스에서 검증</b>하고, 복원 직전에 현재 상태를 자동으로 안전 백업해요. 기존 데이터를 바로 덮어쓰지 않아요.
        </p>
        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={(e) => e.target.files?.[0] && onPickRestore(e.target.files[0])} />
        <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()} className="mt-3 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-600 hover:bg-sky-100 disabled:opacity-40">
          {busy === 'RESTORE' ? '검증 중…' : '백업 파일 선택'}
        </button>

        {v && (
          <div className={`mt-3 flex flex-col gap-1.5 rounded-xl border p-3 text-xs ${v.ok ? 'border-sky-200 bg-sky-50 text-slate-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            <div className="font-extrabold">{v.ok ? '검증 결과: VALID ✓' : '검증 실패 — 복원 불가'}</div>
            {v.manifest && (
              <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                <span>현재 데이터: <b>{v.currentEventCount.toLocaleString()}건</b></span>
                <span>백업 데이터: <b>{v.backupEventCount.toLocaleString()}건</b></span>
                <span>백업 날짜: {v.manifest.exportedAt.slice(0, 10)}</span>
                <span>출처: <b>{v.manifest.dataSource}</b></span>
              </div>
            )}
            {v.errors.map((e) => (
              <div key={e} className="text-rose-600">✗ {e}</div>
            ))}
            {v.warnings.map((w) => (
              <div key={w} className="text-amber-600">⚠ {w}</div>
            ))}
            {!v.versionCompatibility.sameModel && v.versionCompatibility.originalModelSummary && v.versionCompatibility.currentModelSummary && (
              <div className="rounded-lg bg-white/70 p-2">
                <b>모델 비교</b> — 원본 모델: 평균 숙달 {(v.versionCompatibility.originalModelSummary.avgMastery * 100).toFixed(0)}% · 게이트 {v.versionCompatibility.originalModelSummary.gatedSkills} → 현재 모델 재생: {(v.versionCompatibility.currentModelSummary.avgMastery * 100).toFixed(0)}% · 게이트 {v.versionCompatibility.currentModelSummary.gatedSkills}
              </div>
            )}
            {v.ok && !restored && (
              <button type="button" onClick={confirmRestore} disabled={busy !== null} className="mt-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40">
                안전 백업 다운로드 후 복원 실행 (현재 데이터 교체)
              </button>
            )}
            {restored && <div className="font-bold text-emerald-600">복원 완료! 새 데이터로 다시 시작하는 중…</div>}
          </div>
        )}
      </div>

      {/* 백업 히스토리 (PART 45) */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-slate-800"><Download className="h-4 w-4 text-slate-400" /> 최근 기록</div>
          <div className="flex flex-col gap-1">
            {history.slice(0, 5).map((h2, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                <span>{new Date(h2.at).toLocaleString()}</span>
                <span className="font-semibold">{h2.kind}</span>
                <span>{h2.events.toLocaleString()} events</span>
                <span className={h2.verified ? 'font-bold text-emerald-600' : 'font-bold text-amber-600'}>{h2.verified ? 'Verified' : 'Unverified'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
        <span>
          <b>ChatGPT 분석 방법</b>: 분석 패키지 ZIP을 ChatGPT에 업로드하고 &quot;이 자료는 채림이가 CHLOE MATH를 실제로 사용한 학습 데이터입니다. 현재 실력·성장·남은 학습 구멍·반복 오답·retention·transfer·Elite Thinking·선행 준비도·앞으로 4주의 학습 방향을 분석해 주세요&quot;라고 요청하면 돼요. ZIP 안의 HOW_TO_ANALYZE_WITH_CHATGPT.md에 자세한 안내가 있어요.
        </span>
      </div>
    </div>
  );
}
