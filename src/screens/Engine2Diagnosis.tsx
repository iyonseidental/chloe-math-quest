// Step 13 — 적응 진단 화면 (Step 12 diagnostic21의 UI 래퍼).
// 판단은 전부 nextDiagnosticStep/finalizeDiagnostic가 내리고, 이 화면은 서빙과 표시만 한다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, HelpCircle, MinusCircle, XCircle } from 'lucide-react';
import { useEngine2 } from '../context/Engine2Context.tsx';
import { nextDiagnosticStep, type DiagnosticReport, type DiagnosticClass } from '../engine2/diagnostic21.ts';
import { buildProblemForAction } from '../engine2/session21.ts';
import { MICRO_SKILL_MAP } from '../engine2/curriculum21.ts';
import { CONFIG21 } from '../engine2/config21.ts';
import { MathText } from '../components/MathText.tsx';
import { ProgressBar, Stars, WhyChip } from '../components/ui.tsx';

const CLASS_META: Record<DiagnosticClass, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  TESTED_PASS: { label: '통과 (직접 확인)', cls: 'text-emerald-600', icon: CheckCircle2 },
  TESTED_PARTIAL: { label: '부분 통과', cls: 'text-amber-600', icon: MinusCircle },
  TESTED_FAIL: { label: '보강 필요 (직접 확인)', cls: 'text-rose-600', icon: XCircle },
  INFERRED_PASS: { label: '통과로 추정 (상위 스킬 통과)', cls: 'text-emerald-500', icon: CheckCircle2 },
  SKIPPED_LOW: { label: '이번엔 생략 (기초부터)', cls: 'text-slate-500', icon: HelpCircle },
  UNTESTED_BUDGET: { label: '미확인 (학습 중 자연 관측)', cls: 'text-slate-400', icon: HelpCircle },
  PENDING: { label: '확인 중', cls: 'text-slate-400', icon: HelpCircle },
  UNRESOLVED: { label: '미확인', cls: 'text-slate-400', icon: HelpCircle },
};

export default function Engine2Diagnosis({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { twin, submit, finishDiagnosis } = useEngine2();
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);
  const startTs = useRef(Date.now());

  const step = useMemo(() => nextDiagnosticStep(twin, CONFIG21.diagnostic.budget), [twin]);
  // 문항은 현재 step에 대해 1회만 생성 (재렌더마다 새 문제가 나오면 안 됨)
  const problem = useMemo(
    () => (step.done || !step.action ? null : buildProblemForAction(step.action)),
    // step.run.questionsUsed가 바뀔 때만 새 문항 — 같은 step에서는 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step.done, step.run.questionsUsed],
  );

  // 종료 확정(추론 배치 이벤트 발행)은 렌더 밖에서 정확히 1회
  useEffect(() => {
    if (step.done && !report) setReport(finishDiagnosis());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.done, report]);

  if (report || step.done) {
    const r = report;
    if (!r) return null; // finalize 이펙트 1틱 대기
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 py-6">
        <h1 className="text-lg font-bold text-slate-800">진단 결과</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          문항 {r.questionsUsed}개로 스킬 {r.testedCount}개를 직접 확인하고, {r.inferredCount}개는 그래프 추론으로, {r.skippedCount}개는 기초 우선을 위해 생략했어요.
        </div>
        <div className="flex flex-col gap-2">
          {r.perSkill.map((d) => {
            const meta = CLASS_META[d.classification];
            const Icon = meta.icon;
            return (
              <div key={d.skillId} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.cls}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-700">{MICRO_SKILL_MAP[d.skillId]?.nameKo ?? d.skillId}</div>
                  <div className={`text-xs ${meta.cls}`}>{meta.label}</div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{d.reason}</div>
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={onDone} className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 py-3 font-bold text-white">
          학습 시작하기
        </button>
      </div>
    );
  }

  const act = step.action!;
  const def = MICRO_SKILL_MAP[act.skillId];

  const choose = (idx: number) => {
    if (answered !== null || !problem) return;
    setAnswered(idx);
  };
  const next = () => {
    if (answered === null || !problem) return;
    submit(act, problem, { chosenIndex: answered, solveTimeSec: (Date.now() - startTs.current) / 1000, hintsUsed: 0, retryCount: 0 });
    setAnswered(null);
    startTs.current = Date.now();
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-start gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="취소">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">AI 적응 진단</h1>
          <p className="text-xs text-slate-500">필요한 스킬만 골라 확인해요 — 문항 {step.run.questionsUsed + 1} / 최대 {CONFIG21.diagnostic.budget}</p>
        </div>
      </div>
      <ProgressBar value={(step.run.questionsUsed / CONFIG21.diagnostic.budget) * 100} />
      <WhyChip reason={act.reason} />

      {problem && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-600">{def?.nameKo ?? act.skillId}</span>
            <Stars level={act.difficulty} />
          </div>
          <MathText text={problem.stem} className="text-[15px] leading-relaxed text-slate-800" />
          <div className="mt-4 flex flex-col gap-2">
            {problem.choices.map((c, i) => {
              const isPicked = answered === i;
              const isAnswer = answered !== null && i === problem.answerIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(i)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    isAnswer ? 'border-emerald-300 bg-emerald-50' : isPicked ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:border-sky-300'
                  }`}
                >
                  <MathText text={c.text} />
                </button>
              );
            })}
          </div>
          {answered !== null && (
            <button type="button" onClick={next} className="mt-4 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white">
              다음
            </button>
          )}
        </div>
      )}
    </div>
  );
}
