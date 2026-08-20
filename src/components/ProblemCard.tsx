// Problem Solver UI (§40~43) + 오답 인터랙션 (§9) + Growth Mindset 문구 (§29)
// 흐름: 풀이 → (오답 시) 한 번 더 생각하기 → 해설(IDEA/SOLVE/REMEMBER) → 자가진단 → AI 진단 비교
import { useMemo, useRef, useState } from 'react';
import { Lightbulb, PenLine, ChevronRight } from 'lucide-react';
import type { Problem, RecordResult, SelfTag } from '../engine/types.ts';
import { ERROR_LABELS, SELF_TAG_OPTIONS } from '../engine/errors.ts';
import { SKILL_MAP, TRACK_MAP } from '../data/curriculum.ts';
import { Stars, WhyChip } from './ui.tsx';
import { MathText, MathInline } from './MathText.tsx';

export interface FinalPayload {
  chosenIndex: number;
  timeMs: number;
  hintsUsed: number;
  selfDiagnosis: SelfTag | null;
}

interface Props {
  problem: Problem;
  reason?: string;
  headerLabel: string; // 예: "Equation Quest · 4 / 10"
  mode?: 'normal' | 'diagnostic';
  onFinal: (payload: FinalPayload) => RecordResult | null;
  onNext: () => void;
  nextLabel?: string;
}

const ENCOURAGE_WRONG = [
  'Almost there! 새로운 학습 포인트를 발견했어 🌱',
  '여기가 오늘의 성장 포인트야 ✨',
  '이 개념을 조금만 더 연습하면 돼!',
];

export default function ProblemCard({ problem, reason, headerLabel, mode = 'normal', onFinal, onNext, nextLabel = '다음 문제' }: Props) {
  const [phase, setPhase] = useState<'answering' | 'correct' | 'wrong'>('answering');
  const [retryChoice, setRetryChoice] = useState<number | null>(null);
  const [finalChoice, setFinalChoice] = useState<number | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showPad, setShowPad] = useState(false);
  const [selfTag, setSelfTag] = useState<SelfTag | null>(null);
  const [result, setResult] = useState<RecordResult | null>(null);
  const startTs = useRef(Date.now());
  const encourage = useMemo(() => ENCOURAGE_WRONG[Math.floor(Math.random() * ENCOURAGE_WRONG.length)], []);

  const finalize = (idx: number, correct: boolean) => {
    setFinalChoice(idx);
    if (correct) {
      const r = onFinal({ chosenIndex: idx, timeMs: Date.now() - startTs.current, hintsUsed: hintsShown, selfDiagnosis: null });
      setResult(r);
      setPhase('correct');
    } else {
      setPhase('wrong'); // 기록은 자가진단 선택 후에
    }
  };

  const handleChoice = (idx: number) => {
    if (phase !== 'answering') return;
    const correct = idx === problem.answerIndex;
    if (mode === 'diagnostic') {
      const r = onFinal({ chosenIndex: idx, timeMs: Date.now() - startTs.current, hintsUsed: 0, selfDiagnosis: null });
      setResult(r);
      setFinalChoice(idx);
      setPhase(correct ? 'correct' : 'wrong');
      return;
    }
    if (correct) return finalize(idx, true);
    // 자기 교정 기회 1회 (§9-1단계)
    if (retryChoice === null) return setRetryChoice(idx);
    finalize(idx, false);
  };

  const handleSelfTag = (tag: SelfTag) => {
    if (selfTag !== null || finalChoice === null) return;
    setSelfTag(tag);
    const r = onFinal({ chosenIndex: finalChoice, timeMs: Date.now() - startTs.current, hintsUsed: hintsShown, selfDiagnosis: tag });
    setResult(r);
  };

  const answered = phase !== 'answering';
  const readyForNext = phase === 'correct' || (phase === 'wrong' && (mode === 'diagnostic' || result !== null));

  return (
    <div className="flex flex-col gap-3">
      {/* 상단: 학년(과정) + 스킬 + 난이도 명시 */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-semibold text-slate-600">
          <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
            {TRACK_MAP[SKILL_MAP[problem.skillId]?.grade]?.name ?? SKILL_MAP[problem.skillId]?.grade}
          </span>
          {headerLabel}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">난이도</span>
          <Stars level={problem.level} />
        </span>
      </div>
      {reason && <WhyChip reason={reason} />}

      {/* 문제 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <MathText text={problem.stem} className="text-[15px] font-medium leading-relaxed text-slate-800" />

        <div className="mt-4 flex flex-col gap-2">
          {problem.choices.map((c, idx) => {
            const isRetry = retryChoice === idx;
            const revealCorrect = answered && idx === problem.answerIndex;
            const revealWrong = answered && idx === finalChoice && idx !== problem.answerIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleChoice(idx)}
                disabled={answered || isRetry}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  revealCorrect
                    ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-700'
                    : revealWrong
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : isRetry
                        ? 'border-amber-300 bg-amber-50 text-amber-600 line-through'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                }`}
              >
                <MathInline text={c.text} />
              </button>
            );
          })}
        </div>

        {/* 자기 교정 안내 */}
        {retryChoice !== null && phase === 'answering' && (
          <div className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">🤔 한 번 더 생각해볼까? 그 답이 나온 계산을 거꾸로 확인해봐.</div>
        )}

        {/* 힌트 & 스크래치패드 (풀이 중에만) */}
        {phase === 'answering' && mode === 'normal' && (
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              {hintsShown < 3 && (
                <button
                  type="button"
                  onClick={() => setHintsShown((h) => h + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-100"
                >
                  <Lightbulb size={13} /> 힌트 {hintsShown}/3
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPad((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                <PenLine size={13} /> 풀이 메모
              </button>
            </div>
            {hintsShown > 0 && (
              <div className="space-y-1.5">
                {problem.hints.slice(0, hintsShown).map((h, i) => (
                  <div key={i} className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-700">
                    💡 Hint {i + 1}. {h}
                  </div>
                ))}
              </div>
            )}
            {showPad && (
              <textarea
                className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-700 focus:border-sky-300 focus:outline-none"
                placeholder="여기에 계산을 적어보세요…"
              />
            )}
          </div>
        )}

        {/* 정답 피드백 */}
        {phase === 'correct' && (
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            🎉 정답! {result && result.xpGain > 0 && <b>+{result.xpGain} XP</b>}
            {result && result.xpReasons.length > 1 && <span className="ml-1 text-xs text-emerald-600">({result.xpReasons.join(', ')})</span>}
          </div>
        )}

        {/* 오답 플로우: 격려 → 해설 → 자가진단 → AI 진단 */}
        {phase === 'wrong' && mode === 'normal' && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">{encourage}</div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed">
              <p>
                <span className="mr-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-600">IDEA</span>
                <span className="text-slate-700">{problem.idea}</span>
              </p>
              <p>
                <span className="mr-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">SOLVE</span>
                <span className="text-slate-700">{problem.solve}</span>
              </p>
              <p>
                <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">REMEMBER</span>
                <span className="text-slate-700">{problem.remember}</span>
              </p>
            </div>

            {selfTag === null ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">🔍 왜 틀렸다고 생각해?</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {SELF_TAG_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelfTag(opt.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              result?.autoDiagnosis && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3.5 text-xs leading-relaxed">
                  <p className="font-semibold text-violet-700">
                    🤖 AI 진단: {ERROR_LABELS[result.autoDiagnosis].emoji} {ERROR_LABELS[result.autoDiagnosis].label}
                  </p>
                  <p className="mt-1 text-violet-600">{ERROR_LABELS[result.autoDiagnosis].advice}</p>
                  {result.clinicCaseCreated && <p className="mt-1.5 font-medium text-violet-700">📋 이 문제는 Error Clinic에 등록됐어 — 유사 문제로 함께 정복하자!</p>}
                </div>
              )
            )}
          </div>
        )}

        {phase === 'wrong' && mode === 'diagnostic' && (
          <div className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">괜찮아요 — 지금은 실력을 파악하는 중이에요. 다음으로!</div>
        )}
      </div>

      {readyForNext && (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:brightness-105"
        >
          {nextLabel} <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
