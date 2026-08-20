// Step 21 — Elite 도전 카드 (PART 25/26 힌트 사다리 + PART 23 전략 흔적 + PART 19 후속).
// 판단은 전부 엔진: 이 화면은 서빙·수집만 한다. 시간 압박 UI 없음 (PART 24).
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Compass, Eye, Link2, Play, Sparkles } from 'lucide-react';
import { useEngine2 } from '../context/Engine2Context.tsx';
import type { NextAction } from '../engine2/session21.ts';
import { ELITE_BANK_MAP, type EliteProblem, type EliteFollowUp } from '../engine2/eliteBank22.ts';
import { CONFIG21 } from '../engine2/config21.ts';
import { MathText, MathInline } from '../components/MathText.tsx';
import { WhyChip } from '../components/ui.tsx';

const MODE_LABEL: Record<string, string> = {
  STANDARD: '표준',
  APPLICATION: '적용',
  MULTI_SKILL: '개념 결합',
  NON_ROUTINE: '비정형',
  REVERSE: '거꾸로 추론',
  GENERALIZATION: '일반화',
  PROOF: '근거 세우기',
  MULTIPLE_SOLUTION: '복수 풀이',
  ERROR_ANALYSIS: '오류 찾기',
  OPEN_ENDED: '열린 문제',
};

const HINT_META = [
  { key: 'A' as const, label: 'NOTICE — 무엇을 관찰할까', icon: Eye },
  { key: 'B' as const, label: 'REPRESENT — 어떻게 표현할까', icon: Compass },
  { key: 'C' as const, label: 'CONNECT — 어떤 개념을 연결할까', icon: Link2 },
  { key: 'D' as const, label: 'START — 첫 걸음', icon: Play },
];

export default function Engine2Elite({ action, onDone }: { action: NextAction; onDone: () => void }) {
  const { submitElite } = useEngine2();
  const prob: EliteProblem = ELITE_BANK_MAP[action.eliteProblemId!];
  const isFollowUp = action.kind === 'elite-followup';
  const fu: EliteFollowUp | undefined = isFollowUp ? prob.followUps.find((f) => f.id === action.eliteFollowUpId) : undefined;
  const choices = isFollowUp ? fu!.choices : prob.choices;
  const answerIndex = isFollowUp ? fu!.answerIndex : prob.answerIndex;

  const [picked, setPicked] = useState<number | null>(null);
  const [hintsOpen, setHintsOpen] = useState<('A' | 'B' | 'C' | 'D')[]>([]);
  const [switched, setSwitched] = useState(false);
  const [struggleOk, setStruggleOk] = useState(isFollowUp); // 후속은 분투 창 없음
  const startTs = useRef(Date.now());
  const pending = useRef<{ idx: number } | null>(null);
  // Phase 3 PART 36 — 첫 반응(선택/전환/힌트)까지의 시간과 이탈-복귀를 조용히 기록 (표시 안 함)
  const firstActionTs = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const markAction = () => {
    if (firstActionTs.current === null) firstActionTs.current = Date.now();
  };
  useMemo(() => {
    const onVis = () => {
      if (document.hidden) pausedRef.current = true;
    };
    document.addEventListener('visibilitychange', onVis);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // productive struggle (PART 25): 첫 힌트는 struggleWindowSec 이후에만 — 타이머 위젯 없이
  // 조용히 게이트 (남은 시간 숫자를 보여주면 그게 곧 시간 압박이 된다)
  useMemo(() => {
    if (!struggleOk) setTimeout(() => setStruggleOk(true), CONFIG21.elite.struggleWindowSec * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = picked !== null;
  const correct = done && picked === answerIndex;

  const finish = (idx: number) => {
    setPicked(idx);
    pending.current = { idx };
  };
  const next = () => {
    if (!pending.current) return;
    submitElite(action, {
      chosenIndex: pending.current.idx,
      solveTimeSec: (Date.now() - startTs.current) / 1000,
      hintsUsed: hintsOpen,
      strategySwitches: switched ? 1 : 0,
      timeToFirstActionSec: firstActionTs.current ? (firstActionTs.current - startTs.current) / 1000 : undefined,
      returnedAfterPause: pausedRef.current || undefined,
    });
    onDone();
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onDone} className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="나가기">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Sparkles className="h-4 w-4 text-violet-500" /> {isFollowUp ? '한 문제 깊이 탐구' : 'Elite 도전'}
          </h1>
          <p className="text-xs text-slate-500">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600">{MODE_LABEL[prob.mode]}</span>
            <span className="ml-2 text-slate-400">서두르지 않아도 괜찮아요 — 깊게 생각하는 시간이에요</span>
          </p>
        </div>
      </div>
      <WhyChip reason={action.reason} />

      <div className="rounded-2xl border border-violet-200 bg-white p-4">
        <MathText text={isFollowUp ? fu!.prompt : prob.stem} className="text-[15px] leading-relaxed text-slate-800" />
        <div className="mt-4 flex flex-col gap-2">
          {choices.map((c, i) => {
            const isAnswer = done && i === answerIndex;
            const isPicked = picked === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { markAction(); if (!done) finish(i); }}
                disabled={done}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  isAnswer ? 'border-emerald-300 bg-emerald-50' : isPicked ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:border-violet-300'
                }`}
              >
                <MathText text={c.text} />
              </button>
            );
          })}
        </div>

        {!isFollowUp && !done && (
          <label className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
            <input type="checkbox" checked={switched} onChange={(e) => setSwitched(e.target.checked)} className="accent-violet-500" />
            처음 방법이 막혀서 다른 방법으로 바꿨어요
          </label>
        )}

        {!isFollowUp && !done && (
          <div className="mt-3 flex flex-col gap-1.5">
            {HINT_META.map((h, hi) => {
              const opened = hintsOpen.includes(h.key);
              const unlockable = struggleOk && hintsOpen.length >= hi; // 사다리는 순서대로
              const Icon = h.icon;
              if (opened) {
                return (
                  <div key={h.key} className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">
                    <span className="font-bold">{h.key}</span> <MathInline text={prob.hints[h.key]} />
                  </div>
                );
              }
              return (
                <button
                  key={h.key}
                  type="button"
                  disabled={!unlockable}
                  onClick={() => { markAction(); setHintsOpen((prev) => [...prev, h.key]); }}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-xs font-semibold ${unlockable ? 'text-violet-600 hover:bg-violet-50' : 'text-slate-300'}`}
                >
                  <Icon className="h-3.5 w-3.5" /> 힌트 {h.key} · {h.label}
                  {!struggleOk && hi === 0 && <span className="font-normal text-slate-300">— 먼저 혼자 탐색해 보세요</span>}
                </button>
              );
            })}
          </div>
        )}

        {done && (
          <div className="mt-4 flex flex-col gap-3">
            <div className={`rounded-xl px-3 py-2 text-sm font-bold ${correct ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {correct ? '해냈어요! 🎉' : '좋은 도전이었어요 — 여기서 배우는 게 진짜예요 🌱'}
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <p>
                <span className="font-bold text-violet-500">풀이</span> <MathInline text={isFollowUp ? fu!.note : prob.solution} />
              </p>
              {!isFollowUp && prob.altSolution && (
                <p>
                  <span className="font-bold text-violet-500">다른 풀이</span> <MathInline text={prob.altSolution} />
                </p>
              )}
            </div>
            <button type="button" onClick={next} className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 py-2.5 text-sm font-bold text-white">
              계속
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
