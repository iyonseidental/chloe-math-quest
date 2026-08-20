// Today's Quest 실행 화면 — Warm Up → Main → Error Clinic → Challenge → Review
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useStudent } from '../context/StudentContext.tsx';
import { buildTodayQuest, type QuestBlock, type TodayQuest } from '../engine/quest.ts';
import { planNextProblem } from '../engine/adaptive.ts';
import { generateProblem } from '../engine/generators/index.ts';
import { acknowledgeReview, pendingCases, variantForStage } from '../engine/clinic.ts';
import { SKILL_MAP } from '../data/curriculum.ts';
import { BADGES } from '../engine/progression.ts';
import type { Level, Problem } from '../engine/types.ts';
import ProblemCard, { type FinalPayload } from '../components/ProblemCard.tsx';
import { ProgressBar } from '../components/ui.tsx';

interface Current {
  problem: Problem;
  reason: string;
  clinicCaseId: string | null;
}

const BLOCK_EMOJI: Record<string, string> = { warmup: '☀️', main: '🎯', clinic: '🩹', challenge: '🚀', review: '🔄' };

export default function QuestPlayer({ onExit }: { onExit: () => void }) {
  const { model, record, mutateModel } = useStudent();
  const [quest] = useState<TodayQuest>(() => buildTodayQuest(model));
  const [blockIdx, setBlockIdx] = useState(0);
  const [problemNo, setProblemNo] = useState(0); // 블록 내 순번
  const [intro, setIntro] = useState(true);
  const [current, setCurrent] = useState<Current | null>(null);
  const [conceptCard, setConceptCard] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionSolved, setSessionSolved] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [levelUpToast, setLevelUpToast] = useState<{ skill: string; level: Level } | null>(null);
  const [newBadgeToast, setNewBadgeToast] = useState<string[]>([]);

  const block: QuestBlock | undefined = quest.blocks[blockIdx];
  const totalProblems = useMemo(() => quest.blocks.reduce((a, b) => a + b.count, 0), [quest]);
  const solvedBefore = useMemo(() => quest.blocks.slice(0, blockIdx).reduce((a, b) => a + b.count, 0), [quest, blockIdx]);

  const prepare = useCallback(() => {
    if (!block) return setFinished(true);
    if (block.type === 'clinic') {
      const cases = pendingCases(model.clinicQueue).filter((c) => block.clinicCaseIds?.includes(c.id) || c.skillId === block.skillId);
      const c = cases[0];
      if (!c) {
        // 치료할 케이스가 없으면 블록 종료
        setBlockIdx((i) => i + 1);
        setProblemNo(0);
        setIntro(true);
        return;
      }
      if (c.stage === 'review') {
        setConceptCard(SKILL_MAP[c.skillId].conceptCard);
        setCurrent(null);
        return;
      }
      const variant = variantForStage(c.stage);
      const stageLabel = { similarA: '유사 문제 ①', similarB: '유사 문제 ②', transfer: '전이 문제 (새로운 상황)', check: 'Mastery Check' }[
        c.stage as 'similarA' | 'similarB' | 'similarB' | 'transfer' | 'check'
      ];
      setCurrent({
        problem: generateProblem(c.skillId, c.level, variant),
        reason: `Error Clinic ${stageLabel} — 틀렸던 개념을 단계적으로 완치하는 중이에요.`,
        clinicCaseId: c.id,
      });
      return;
    }
    if (block.type === 'main') {
      const plan = planNextProblem(model, block.skillId);
      setCurrent({ problem: generateProblem(plan.skillId, plan.level, plan.variant), reason: plan.reason, clinicCaseId: null });
      return;
    }
    const variant = block.type === 'warmup' ? 'warmup' : block.type === 'review' ? 'review' : 'challenge';
    const level = (block.level ?? model.skills[block.skillId].level) as Level;
    setCurrent({ problem: generateProblem(block.skillId, level, variant), reason: block.reason, clinicCaseId: null });
  }, [block, model]);

  useEffect(() => {
    if (!intro && !finished && current === null && conceptCard === null) prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, blockIdx, problemNo, finished]);

  const handleFinal = (payload: FinalPayload) => {
    if (!current) return null;
    const result = record({
      problem: current.problem,
      chosenIndex: payload.chosenIndex,
      timeMs: payload.timeMs,
      hintsUsed: payload.hintsUsed,
      selfDiagnosis: payload.selfDiagnosis,
      clinicCaseId: current.clinicCaseId,
    });
    setSessionXp((x) => x + result.xpGain);
    setSessionSolved((n) => n + 1);
    if (payload.chosenIndex === current.problem.answerIndex) setSessionCorrect((n) => n + 1);
    if (result.leveledUp) setLevelUpToast({ skill: SKILL_MAP[current.problem.skillId].name, level: result.leveledUp });
    if (result.newBadges.length) setNewBadgeToast((b) => [...b, ...result.newBadges]);
    return result;
  };

  const handleNext = () => {
    setLevelUpToast(null);
    const nextNo = problemNo + 1;
    setCurrent(null);
    if (block && nextNo >= block.count) {
      if (blockIdx + 1 >= quest.blocks.length) return setFinished(true);
      setBlockIdx((i) => i + 1);
      setProblemNo(0);
      setIntro(true);
    } else {
      setProblemNo(nextNo);
    }
  };

  const handleConceptAck = () => {
    const c = pendingCases(model.clinicQueue).find((x) => x.stage === 'review' && (block?.clinicCaseIds?.includes(x.id) || x.skillId === block?.skillId));
    setConceptCard(null);
    if (c) {
      const ack = acknowledgeReview(c);
      mutateModel((m) => ({ ...m, clinicQueue: m.clinicQueue.map((x) => (x.id === c.id ? ack : x)) }));
      setCurrent({
        problem: generateProblem(ack.skillId, ack.level, variantForStage(ack.stage)),
        reason: 'Error Clinic 유사 문제 ① — 개념을 확인했으니 비슷한 문제로 바로 적용해봐요.',
        clinicCaseId: ack.id,
      });
    }
  };

  // ---- 종료 화면 ----
  if (finished) {
    const acc = sessionSolved > 0 ? Math.round((sessionCorrect / sessionSolved) * 100) : 0;
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center px-5 text-center">
        <div className="text-5xl">🏆</div>
        <h2 className="mt-3 text-xl font-bold text-slate-800">오늘의 퀘스트 완료!</h2>
        <div className="mt-5 grid w-full grid-cols-3 gap-3">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
            <div className="text-lg font-bold text-sky-600">+{sessionXp}</div>
            <div className="text-[11px] text-slate-500">XP</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-lg font-bold text-emerald-600">{sessionSolved}문제</div>
            <div className="text-[11px] text-slate-500">정답률 {acc}%</div>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
            <div className="text-lg font-bold text-orange-500">🔥 {model.streakDays}일</div>
            <div className="text-[11px] text-slate-500">연속 학습</div>
          </div>
        </div>
        {newBadgeToast.length > 0 && (
          <div className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-700">🎖️ 새 배지 획득!</p>
            {newBadgeToast.map((id) => {
              const b = BADGES.find((x) => x.id === id);
              return (
                <p key={id} className="mt-1 text-xs text-amber-600">
                  {b?.emoji} {b?.name} — {b?.description}
                </p>
              );
            })}
          </div>
        )}
        <button type="button" onClick={onExit} className="mt-6 w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200">
          대시보드로
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-3 px-4 py-5">
      {/* 상단 진행 */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="나가기">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-[11px] text-slate-500">
            <span>
              {BLOCK_EMOJI[block?.type ?? 'main']} {block?.title}
            </span>
            <span>
              {Math.min(solvedBefore + problemNo + 1, totalProblems)} / {totalProblems}
            </span>
          </div>
          <ProgressBar value={((solvedBefore + problemNo) / totalProblems) * 100} />
        </div>
        <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-bold text-sky-600">+{sessionXp} XP</span>
      </div>

      {/* 레벨업 토스트 */}
      {levelUpToast && (
        <div className="fixed inset-x-0 top-6 z-50 mx-auto w-fit animate-bounce rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-center text-white shadow-2xl">
          <div className="text-sm font-bold">🎉 LEVEL MASTERED!</div>
          <div className="text-xs">
            {levelUpToast.skill} Lv.{levelUpToast.level} 정복 → Lv.{Math.min(5, levelUpToast.level + 1)} 오픈
          </div>
        </div>
      )}

      {/* 블록 인트로 */}
      {intro && block && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl">{BLOCK_EMOJI[block.type]}</div>
          <h2 className="text-lg font-bold text-slate-800">{block.title}</h2>
          <p className="text-sm text-slate-500">
            {SKILL_MAP[block.skillId].icon} {SKILL_MAP[block.skillId].name} · {block.count}문제
          </p>
          <p className="max-w-xs rounded-xl bg-indigo-50 px-4 py-2.5 text-xs leading-relaxed text-indigo-600">{block.reason}</p>
          <button
            type="button"
            onClick={() => setIntro(false)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200"
          >
            <Sparkles size={15} /> 시작!
          </button>
        </div>
      )}

      {/* Error Clinic 개념 카드 */}
      {!intro && conceptCard && block && (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <p className="text-sm font-bold text-violet-700">
              📖 개념 다시 보기 — {SKILL_MAP[block.skillId].icon} {SKILL_MAP[block.skillId].name}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{conceptCard}</p>
          </div>
          <button type="button" onClick={handleConceptAck} className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200">
            이해했어, 문제로 확인해볼게 →
          </button>
        </div>
      )}

      {/* 문제 */}
      {!intro && current && (
        <ProblemCard
          key={current.problem.id}
          problem={current.problem}
          reason={current.reason}
          headerLabel={`${SKILL_MAP[current.problem.skillId].name} · Lv.${current.problem.level}`}
          onFinal={handleFinal}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
