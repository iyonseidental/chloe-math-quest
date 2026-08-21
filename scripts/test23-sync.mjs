// GitHub 클라우드 동기화 — 판정 로직·왕복 인코딩·API 흐름(mock fetch) 검증.
import { reconcile, b64encode, b64decode, v1Progress } from '../src/engine2/sync23.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const ev = (seq) => ({ seq, ts: 1000 + seq, type: 'ATTEMPT', payload: {}, versions: {} });
const L = (n) => Array.from({ length: n }, (_, i) => ev(i));

// ---- reconcile 판정 ----
check('같은 로그 → in-sync', reconcile(L(5), L(5)).action === 'in-sync');
check('빈 양쪽 → in-sync', reconcile([], []).action === 'in-sync');
check('로컬이 상위집합 → push', reconcile(L(8), L(5)).action === 'push');
check('원격이 상위집합 → adopt-remote', reconcile(L(3), L(9)).action === 'adopt-remote');
check('빈 원격 + 로컬 존재 → push', reconcile(L(4), []).action === 'push');
check('빈 로컬 + 원격 존재 → adopt-remote', reconcile([], L(4)).action === 'adopt-remote');
{
  // 갈라짐: 공통 prefix 3 + 각자 진행
  const local = [...L(3), { ...ev(3), ts: 9999 }];
  const remote = [...L(3), ev(3), ev(4)];
  const d = reconcile(local, remote);
  check('갈라짐 감지 (같은 seq, 다른 ts)', d.action === 'diverged');
  check('갈라짐 → 더 긴 쪽(remote) 유지', d.keep === 'remote');
  const d2 = reconcile([...L(3), { ...ev(3), ts: 9999 }, { ...ev(4), ts: 9999 }, { ...ev(5), ts: 9999 }], remote);
  check('갈라짐 → 로컬이 길면 local 유지', d2.action === 'diverged' && d2.keep === 'local');
}

// ---- base64 (한글 포함 왕복) ----
{
  const s = JSON.stringify({ events: [{ seq: 0, note: '채림이의 학습 기록 ✓ (−6)/2' }] });
  check('UTF-8 base64 왕복 무손실', b64decode(b64encode(s)) === s);
  const big = 'x'.repeat(300000) + '끝';
  check('대용량(300KB) 왕복', b64decode(b64encode(big)) === big);
}

// ---- v1 진행량 ----
check('v1Progress: attempts+reviews 합', v1Progress({ attempts: [1, 2, 3], reviews: [1] }) === 4);
check('v1Progress: null 안전', v1Progress(null) === 0);

// ---- syncNow 흐름 (mock fetch + mock localStorage) ----
{
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  const { syncNow, saveSyncConfig } = await import('../src/engine2/sync23.ts');
  saveSyncConfig({ owner: 'o', repo: 'r', token: 't', path: 'chloe-events.json' });

  // 원격 상태를 흉내내는 mock GitHub
  let remoteContent = null; // base64
  let remoteSha = null;
  let putCount = 0;
  const mockFetch = async (url, opts = {}) => {
    if (!opts.method) {
      if (url.includes('/contents/')) {
        if (remoteContent === null) return { status: 404, ok: false };
        return { status: 200, ok: true, json: async () => ({ sha: remoteSha, content: remoteContent }) };
      }
      return { status: 200, ok: true, json: async () => ({ private: true }) };
    }
    if (opts.method === 'PUT') {
      const body = JSON.parse(opts.body);
      if (remoteSha && body.sha !== remoteSha) return { status: 409, ok: false };
      remoteContent = body.content;
      remoteSha = 'sha-' + ++putCount;
      return { status: 200, ok: true, json: async () => ({}) };
    }
    return { status: 500, ok: false };
  };

  const log5 = { events: L(5) };
  const r1 = await syncNow(log5, mockFetch);
  check('첫 동기화 → pushed', r1.status === 'pushed', r1.message);
  const r2 = await syncNow(log5, mockFetch);
  check('변경 없음 → in-sync', r2.status === 'in-sync');
  const r3 = await syncNow({ events: L(8) }, mockFetch);
  check('로컬 추가 학습 → pushed', r3.status === 'pushed');
  const r4 = await syncNow(log5, mockFetch);
  check('다른 기기(원격이 최신) → adopted-remote + reload 요구', r4.status === 'adopted-remote' && r4.needsReload && r4.adoptedDoc.engine2.events.length === 8);
  // v1만 진행된 경우
  store.set('chloe-math-quest-v1', JSON.stringify({ attempts: [1, 2, 3], reviews: [] }));
  const r5 = await syncNow({ events: L(8) }, mockFetch);
  check('engine2 동일 + v1 진행 → pushed (과정 기록 저장)', r5.status === 'pushed', r5.message);
  store.delete('chloe-math-quest-v1');
  const r6 = await syncNow({ events: L(8) }, mockFetch);
  check('원격 v1이 더 최신 → adopted-remote', r6.status === 'adopted-remote' && v1Progress(r6.adoptedDoc.v1) === 3);
  // 갈라짐: 원격 총진행량(8+v1 3=11) vs 로컬 — 열세(10)면 원격 채택, 우세(12)면 로컬 유지
  const div10 = { events: [...L(6), { ...ev(6), ts: 42 }, { ...ev(7), ts: 42 }, { ...ev(8), ts: 42 }, { ...ev(9), ts: 42 }] };
  const r7 = await syncNow(div10, mockFetch);
  check('갈라짐 + 원격 우세(11>10) → adopted-remote + 안전백업', r7.status === 'diverged-adopted-remote' && r7.safetyBackup !== undefined);
  const div12 = { events: [...L(6), ...[6, 7, 8, 9, 10, 11].map((i) => ({ ...ev(i), ts: 42 }))] };
  const r8 = await syncNow(div12, mockFetch);
  check('갈라짐 + 로컬 우세(12>11) → kept-local + 안전백업', r8.status === 'diverged-kept-local' && r8.safetyBackup !== undefined);
}

console.log(`\n${pass} checks passed — GitHub Cloud Sync OK`);
