// CHLOE MATH 2.3 — GitHub 클라우드 동기화 (기기 간 자동 이어하기).
//
// 구조: 비공개 저장소(chloe-math-data)의 파일 하나가 "클라우드 원장"이다.
//   · 토큰은 각 기기의 localStorage에만 저장 — 앱 코드/공개 사이트에는 절대 넣지 않는다.
//     (공개 페이지에 심은 토큰은 누구나 추출 가능 — 그래서 기기당 1회 입력 방식)
//   · 원장은 append-only + seq 단조라서 동기화 판정이 결정적이다:
//       같음 → in-sync / 로컬이 상위집합 → push / 원격이 상위집합 → 원격 채택(리로드)
//       갈라짐(두 기기가 각자 진행) → 더 긴 쪽 채택 + 짧은 쪽은 안전 백업으로 다운로드
//   · push는 GitHub의 sha 낙관적 잠금을 그대로 사용 — 충돌 시 재-pull 후 재시도.
//   · 학습 엔진은 건드리지 않는다 — 이 파일은 저장소 계층의 확장일 뿐이다.
import type { EventLog, LearningEvent } from './events21.ts';

const CFG_KEY = 'chloe-sync-config-v1';
const META_KEY = 'chloe-sync-meta-v1';
export const SYNC_LOG_KEY = 'chloe-engine21-eventlog-v1';
export const SYNC_V1_KEY = 'chloe-math-quest-v1'; // 과정(퀘스트) 모드 학습 모델 — 고교 기록 포함

// 클라우드에 올라가는 문서: 두 저장소를 한 몸으로 묶는다 (부분 동기화 금지 — 기록 분열 방지)
export interface CloudDoc {
  schemaVersion: '1.0';
  updatedAt: string;
  engine2: EventLog;
  v1: unknown | null;
}

export function readLocalV1(): unknown | null {
  try {
    const raw = localStorage.getItem(SYNC_V1_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
// v1 모델의 "학습 진행량" — 시도+복습 기록 수 (동수 비교용)
export function v1Progress(m: unknown): number {
  const model = m as { attempts?: unknown[]; reviews?: unknown[] } | null;
  return (model?.attempts?.length ?? 0) + (model?.reviews?.length ?? 0);
}

export interface SyncConfig {
  owner: string;
  repo: string;
  token: string;
  path: string; // 기본 chloe-events.json
  tokenSavedAt?: string; // 토큰 저장 시각 — 만료(최대 1년) 임박 안내용
}

export interface SyncMeta {
  lastSyncAt: string | null;
  lastPushedSeq: number | null;
  lastResult: string | null;
}

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as SyncConfig;
    return c.owner && c.repo && c.token ? { ...c, path: c.path || 'chloe-events.json' } : null;
  } catch {
    return null;
  }
}
export function saveSyncConfig(c: SyncConfig | null): void {
  if (c) localStorage.setItem(CFG_KEY, JSON.stringify({ tokenSavedAt: new Date().toISOString(), ...c }));
  else localStorage.removeItem(CFG_KEY);
}

// 토큰 나이(일) — fine-grained 토큰은 최대 1년이므로 330일부터 갱신을 권한다
export function tokenAgeDays(c: SyncConfig | null): number | null {
  if (!c?.tokenSavedAt) return null;
  return Math.floor((Date.now() - Date.parse(c.tokenSavedAt)) / 86400000);
}
export function tokenRenewalDue(c: SyncConfig | null): boolean {
  const age = tokenAgeDays(c);
  return age !== null && age >= 330;
}

// 기존 설정을 유지한 채 토큰만 교체 (만료 갱신 경로)
export function replaceToken(newToken: string): boolean {
  const c = loadSyncConfig();
  if (!c) return false;
  saveSyncConfig({ ...c, token: newToken.trim(), tokenSavedAt: new Date().toISOString() });
  return true;
}
export function loadSyncMeta(): SyncMeta {
  try {
    return { lastSyncAt: null, lastPushedSeq: null, lastResult: null, ...JSON.parse(localStorage.getItem(META_KEY) ?? '{}') };
  } catch {
    return { lastSyncAt: null, lastPushedSeq: null, lastResult: null };
  }
}
function saveMeta(m: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* 무해 */
  }
}

// UTF-8 안전 base64 (btoa는 latin1 전용)
export function b64encode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function b64decode(b: string): string {
  const bin = atob(b.replace(/\n/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// 동기화 판정 — 순수 함수 (테스트 대상)
// ---------------------------------------------------------------------------
export type ReconcileDecision =
  | { action: 'in-sync' }
  | { action: 'push' } // 로컬이 원격을 포함 (원격은 로컬의 prefix)
  | { action: 'adopt-remote' } // 원격이 로컬을 포함
  | { action: 'diverged'; keep: 'local' | 'remote' }; // 양쪽 각자 진행 — 더 긴 쪽 유지

export function reconcile(local: LearningEvent[], remote: LearningEvent[]): ReconcileDecision {
  const isPrefix = (short: LearningEvent[], long: LearningEvent[]) =>
    short.every((e, i) => long[i] && long[i].seq === e.seq && long[i].ts === e.ts && long[i].type === e.type);
  if (local.length === remote.length && isPrefix(local, remote)) return { action: 'in-sync' };
  if (remote.length < local.length && isPrefix(remote, local)) return { action: 'push' };
  if (local.length < remote.length && isPrefix(local, remote)) return { action: 'adopt-remote' };
  // 갈라짐: 이벤트 수가 많은 쪽(더 많은 학습)을 유지 — 동수면 로컬 유지
  return { action: 'diverged', keep: local.length >= remote.length ? 'local' : 'remote' };
}

// ---------------------------------------------------------------------------
// GitHub Contents API (fetch 주입 가능 — 테스트용)
// ---------------------------------------------------------------------------
type FetchLike = typeof fetch;

async function ghGet(cfg: SyncConfig, f: FetchLike): Promise<{ found: boolean; sha: string | null; doc: CloudDoc | null; error?: string }> {
  const res = await f(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`, {
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });
  if (res.status === 404) return { found: false, sha: null, doc: null };
  if (res.status === 401) return { found: false, sha: null, doc: null, error: 'TOKEN_EXPIRED' };
  if (!res.ok) return { found: false, sha: null, doc: null, error: `GitHub 응답 ${res.status} — 토큰/저장소 이름을 확인하세요` };
  const j = (await res.json()) as { sha: string; content: string };
  try {
    const parsed = JSON.parse(b64decode(j.content)) as CloudDoc | EventLog;
    // 하위 호환: 초기 포맷(EventLog 단독)도 읽는다
    const doc: CloudDoc = 'events' in parsed
      ? { schemaVersion: '1.0', updatedAt: new Date(0).toISOString(), engine2: parsed as EventLog, v1: null }
      : (parsed as CloudDoc);
    if (!Array.isArray(doc.engine2?.events)) throw new Error('bad shape');
    return { found: true, sha: j.sha, doc };
  } catch {
    return { found: true, sha: j.sha, doc: null, error: '원격 파일이 손상되었습니다' };
  }
}

async function ghPut(cfg: SyncConfig, f: FetchLike, doc: CloudDoc, sha: string | null): Promise<{ ok: boolean; error?: string; conflict?: boolean }> {
  const body: Record<string, string> = {
    message: `sync ${new Date().toISOString()} (${doc.engine2.events.length} events, v1 ${v1Progress(doc.v1)})`,
    content: b64encode(JSON.stringify(doc)),
  };
  if (sha) body.sha = sha;
  const res = await f(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 409 || res.status === 422) return { ok: false, conflict: true };
  if (!res.ok) return { ok: false, error: `업로드 실패 ${res.status}` };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 동기화 실행
// ---------------------------------------------------------------------------
export interface SyncOutcome {
  status: 'no-config' | 'in-sync' | 'pushed' | 'adopted-remote' | 'diverged-kept-local' | 'diverged-adopted-remote' | 'error';
  message: string;
  needsReload: boolean; // 원격 채택 시 — 호출자가 저장소 교체 후 리로드
  adoptedDoc?: CloudDoc;
  safetyBackup?: CloudDoc; // 갈라짐에서 밀려나는 쪽 — 호출자가 파일로 저장
}

export function applyAdoptedDoc(doc: CloudDoc): void {
  localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(doc.engine2));
  if (doc.v1 != null) localStorage.setItem(SYNC_V1_KEY, JSON.stringify(doc.v1));
}

export async function syncNow(localLog: EventLog, fetchImpl: FetchLike = fetch): Promise<SyncOutcome> {
  const cfg = loadSyncConfig();
  if (!cfg) return { status: 'no-config', message: '동기화가 설정되지 않았어요', needsReload: false };
  const localDoc: CloudDoc = { schemaVersion: '1.0', updatedAt: new Date().toISOString(), engine2: localLog, v1: readLocalV1() };
  const done = (o: SyncOutcome): SyncOutcome => {
    saveMeta({ lastSyncAt: new Date().toISOString(), lastPushedSeq: localLog.events.at(-1)?.seq ?? null, lastResult: o.status });
    return o;
  };

  let remote;
  try {
    remote = await ghGet(cfg, fetchImpl);
  } catch {
    return { status: 'error', message: '네트워크 오류 — 오프라인이면 나중에 자동 재시도돼요', needsReload: false };
  }
  if (remote.error === 'TOKEN_EXPIRED') {
    return { status: 'error', message: '🔑 토큰이 만료되었거나 무효예요 — 학습 기록은 안전하며, DATA & BACKUP에서 새 토큰만 붙여넣으면 동기화가 재개돼요', needsReload: false };
  }
  if (remote.error) return { status: 'error', message: remote.error, needsReload: false };

  // 첫 업로드
  if (!remote.found || !remote.doc) {
    const put = await ghPut(cfg, fetchImpl, localDoc, remote.sha);
    if (!put.ok) return { status: 'error', message: put.error ?? '업로드 충돌 — 다시 시도해 주세요', needsReload: false };
    return done({ status: 'pushed', message: `첫 동기화 완료 (기록 ${localLog.events.length + v1Progress(localDoc.v1)}건 업로드)`, needsReload: false });
  }

  const rd = remote.doc;
  const d = reconcile(localLog.events, rd.engine2.events);

  if (d.action === 'in-sync') {
    // engine2는 같아도 과정(v1) 학습은 다를 수 있다 — 진행량으로 비교
    const lv = v1Progress(localDoc.v1);
    const rv = v1Progress(rd.v1);
    if (lv > rv) {
      const put = await ghPut(cfg, fetchImpl, localDoc, remote.sha);
      if (put.conflict) return syncNow(localLog, fetchImpl);
      if (!put.ok) return { status: 'error', message: put.error ?? '업로드 실패', needsReload: false };
      return done({ status: 'pushed', message: `과정 학습 기록 저장 완료 (+${lv - rv}건)`, needsReload: false });
    }
    if (rv > lv) {
      return done({ status: 'adopted-remote', message: `다른 기기의 과정 학습 기록을 가져왔어요 (+${rv - lv}건)`, needsReload: true, adoptedDoc: rd });
    }
    return done({ status: 'in-sync', message: '이미 최신 상태예요', needsReload: false });
  }
  if (d.action === 'push') {
    // 로컬이 더 최신 — v1도 로컬 것으로 함께 올린다 (문서는 한 몸)
    const put = await ghPut(cfg, fetchImpl, localDoc, remote.sha);
    if (put.conflict) return syncNow(localLog, fetchImpl); // 다른 기기가 방금 씀 — 재조정
    if (!put.ok) return { status: 'error', message: put.error ?? '업로드 실패', needsReload: false };
    return done({ status: 'pushed', message: `클라우드에 저장 완료 (${localLog.events.length}개 기록)`, needsReload: false });
  }
  if (d.action === 'adopt-remote') {
    return done({ status: 'adopted-remote', message: `다른 기기의 기록 ${rd.engine2.events.length}개를 가져왔어요`, needsReload: true, adoptedDoc: rd });
  }
  // diverged — 총 진행량(engine2 + v1)이 많은 쪽 유지
  const totalLocal = localLog.events.length + v1Progress(localDoc.v1);
  const totalRemote = rd.engine2.events.length + v1Progress(rd.v1);
  if (totalLocal >= totalRemote) {
    const put = await ghPut(cfg, fetchImpl, localDoc, remote.sha);
    if (!put.ok && !put.conflict) return { status: 'error', message: put.error ?? '업로드 실패', needsReload: false };
    return done({ status: 'diverged-kept-local', message: '두 기기의 기록이 갈라져 있었어요 — 더 많이 학습한 이 기기 기록을 유지하고, 다른 쪽은 안전 백업으로 저장했어요', needsReload: false, safetyBackup: rd });
  }
  return done({ status: 'diverged-adopted-remote', message: '두 기기의 기록이 갈라져 있었어요 — 더 많이 학습한 다른 기기 기록을 가져오고, 이 기기 기록은 안전 백업으로 저장했어요', needsReload: true, adoptedDoc: rd, safetyBackup: localDoc });
}

// 연결 테스트 (설정 저장 전 확인용)
export async function testConnection(cfg: SyncConfig, fetchImpl: FetchLike = fetch): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetchImpl(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' },
    });
    if (res.status === 404) return { ok: false, message: '저장소를 찾을 수 없어요 — 이름을 확인하거나 토큰에 이 저장소 권한이 있는지 확인하세요' };
    if (res.status === 401) return { ok: false, message: '토큰이 올바르지 않아요' };
    if (!res.ok) return { ok: false, message: `연결 실패 (${res.status})` };
    const j = (await res.json()) as { private: boolean };
    if (!j.private) return { ok: false, message: '⚠️ 이 저장소는 공개(public)예요 — 학습 기록 보호를 위해 반드시 비공개(private) 저장소를 사용하세요' };
    return { ok: true, message: '연결 성공! 비공개 저장소 확인 완료' };
  } catch {
    return { ok: false, message: '네트워크 오류' };
  }
}
