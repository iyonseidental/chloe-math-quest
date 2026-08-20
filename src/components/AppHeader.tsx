// Ver 1.0 — 앱 상단 크레딧 바 + 자동 업데이트 감지 (요청 사양).
//   · 제작자 Dr. Min · 프로그램 Ver. 1.0 · 마지막 업데이트 시각(빌드 시각)
//   · 열린 탭이 30분마다(그리고 탭 복귀 시) version.json을 확인해, 새 배포가 올라오면
//     "새 자료로 업데이트되었어요" 배너로 새로고침을 안내한다 — 자료가 곧 앱에 내장되므로
//     새 배포 = 새 자료이며, 새로 열는 탭은 언제나 최신 버전을 받는다.
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

function fmt(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppHeader() {
  const [newBuild, setNewBuild] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const check = async () => {
      try {
        const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const v = (await res.json()) as { buildTime?: string };
        if (!stop && v.buildTime && v.buildTime !== __BUILD_TIME__) setNewBuild(v.buildTime);
      } catch {
        /* 오프라인 등은 조용히 무시 — 다음 확인에서 재시도 */
      }
    };
    const id = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white/80 px-4 py-1.5 text-[10px] text-slate-400 backdrop-blur">
        <span className="font-semibold tracking-wide">
          CHLOE MATH <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-500">Ver. {__APP_VERSION__}</span>
        </span>
        <span className="flex items-center gap-2">
          <span>
            제작 <b className="font-bold text-slate-500">Dr. Min</b>
          </span>
          <span aria-hidden>·</span>
          <span>업데이트 {fmt(__BUILD_TIME__)}</span>
        </span>
      </div>
      {newBuild && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 새 자료로 업데이트되었어요 ({fmt(newBuild)}) — 눌러서 새로고침
        </button>
      )}
    </>
  );
}
