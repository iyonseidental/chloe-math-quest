// Step 13 — engine2 학습 플레이어. 다음에 무엇을 할지는 전적으로 nextAction이 결정하고
// (probe/confirm/micro-lesson/치료 단계/복습/도전/ease/일반), 이 화면은 그 행동을 서빙하고
// 결과를 submitAttempt로 되돌려줄 뿐이다. 모든 표시는 트윈 파생상태 — 하드코딩 진행률 없음.
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Lightbulb } from 'lucide-react';
import { useEngine2 } from '../context/Engine2Context.tsx';
import Engine2Elite from './Engine2Elite.tsx';
import { nextAction, buildProblemForAction, type NextAction } from '../engine2/session21.ts';
import { MICRO_SKILL_MAP } from '../engine2/curriculum21.ts';
import { readMastery } from '../engine2/mastery21.ts';
import { MathText, MathInline } from '../components/MathText.tsx';
import { ProgressBar, Stars, WhyChip } from '../components/ui.tsx';

const MODE_LABEL: Record<string, string> = {
  normal: '연습',
  diagnostic: '진단',
  probe: '원인 확인',
  confirm: '오개념 확인',
  'micro-lesson': '개념 카드',
  'remediation-foundation': '기초 다지기',
  'remediation-bridge': '연결 문제',
  'remediation-similarA': '유사 문제 A',
  'remediation-similarB': '유사 문제 B',
  'remediation-transfer': '전이 확인',
  'remediation-return': '복귀 확인',
  retention: '복습',
  challenge: '도전 (Fast Track)',
  ease: '가볍게 한 문제',
};

export default function Engine2Player({ onExit }: { onExit: () => void }) {
  const { twin, submit, ackMicroLesson } = useEngine2();
  const today = new Date().toISOString().slice(0, 10);
  const [solved, setSolved] = useState(0);

  const action: NextAction = useMemo(() => nextAction(twin, today), [twin, today]);
  // 같은 action 인스턴스에 대해 문항 1회 생성 (재렌더 시 문제가 바뀌면 안 됨)
  const problem = useMemo(
    () => (action.kind === 'micro-lesson' || action.kind === 'elite' || action.kind === 'elite-followup' ? null : buildProblemForAction(action)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [twin.seq],
  );

  const skill = twin.skills[action.skillId];
  const mastery = readMastery(skill.alpha, skill.beta, skill.lastPracticedAt, today);
  const def = MICRO_SKILL_MAP[action.skillId];

  if (action.kind === 'elite' || action.kind === 'elite-followup') {
    // Elite 도전/후속 — 전용 카드 (힌트 사다리 A-D, 분투 창, 전략 흔적). key로 문항별 리셋.
    return <Engine2Elite key={twin.seq} action={action} onDone={() => setSolved((n) => n + 1)} />;
  }

  if (action.kind === 'micro-lesson') {
    const lesson = def?.microLesson;
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 py-6">
        <Header onExit={onExit} solved={solved} title={def?.nameKo ?? action.skillId} modeLabel={MODE_LABEL['micro-lesson']} />
        <WhyChip reason={action.reason} />
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-5">
          <div className="mb-3 flex items-center gap-2 text-indigo-600">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-bold">개념 다시 보기 — {def?.nameKo}</span>
          </div>
          {lesson && (
            <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-700">
              <p><span className="font-bold text-indigo-500">IDEA</span> <MathInline text={lesson.idea} /></p>
              <p><span className="font-bold text-indigo-500">WHY</span> <MathInline text={lesson.why} /></p>
              <p><span className="font-bold text-indigo-500">예시</span> <MathInline text={lesson.example} /></p>
              <p><span className="font-bold text-indigo-500">해보기</span> <MathInline text={lesson.try_} /></p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => ackMicroLesson(action)}
          className="rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 py-3 font-bold text-white"
        >
          이해했어요 — 문제로 확인하기
        </button>
      </div>
    );
  }

  return (
    <ProblemView
      key={twin.seq /* 새 action마다 카드 상태 리셋 */}
      action={action}
      problem={problem!}
      masteryP={mastery.p}
      onExit={onExit}
      solved={solved}
      onSubmit={(chosenIndex, solveTimeSec, hintsUsed, retryCount) => {
        submit(action, problem!, { chosenIndex, solveTimeSec, hintsUsed, retryCount });
        setSolved((n) => n + 1);
      }}
    />
  );
}

function Header({ onExit, solved, title, modeLabel }: { onExit: () => void; solved: number; title: string; modeLabel: string }) {
  return (
    <div className="flex items-start gap-2">
      <button type="button" onClick={onExit} className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="나가기">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <h1 className="text-base font-bold text-slate-800">{title}</h1>
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-indigo-500">{modeLabel}</span> · 이번 세션 {solved}문제
        </p>
      </div>
    </div>
  );
}

function ProblemView({
  action,
  problem,
  masteryP,
  solved,
  onExit,
  onSubmit,
}: {
  action: NextAction;
  problem: NonNullable<ReturnType<typeof buildProblemForAction>>;
  masteryP: number;
  solved: number;
  onExit: () => void;
  onSubmit: (chosenIndex: number, solveTimeSec: number, hintsUsed: number, retryCount: number) => void;
}) {
  const def = MICRO_SKILL_MAP[action.skillId];
  const [phase, setPhase] = useState<'answering' | 'retry' | 'done'>('answering');
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [finalPick, setFinalPick] = useState<number | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const startTs = useRef(Date.now());
  const pending = useRef<{ idx: number; solveTimeSec: number; hintsUsed: number; retryCount: number } | null>(null);

  // 제출은 "다음 문제" 클릭 시점으로 미룬다 — 즉시 제출하면 트윈이 갱신되어 이 카드가
  // 다음 문항으로 리마운트되고, 학생이 정오/해설을 볼 틈이 사라진다. 정오 판정 자체는
  // problem.answerIndex로 로컬에서 알 수 있으므로 표시에는 엔진 호출이 필요 없다.
  const finish = (idx: number, retryCount: number) => {
    setFinalPick(idx);
    setPhase('done');
    pending.current = { idx, solveTimeSec: (Date.now() - startTs.current) / 1000, hintsUsed: hintsShown, retryCount };
  };

  const pick = (idx: number) => {
    if (phase === 'done') return;
    const correct = idx === problem.answerIndex;
    if (phase === 'answering') {
      if (correct) finish(idx, 0);
      else {
        // 한 번 더 생각하기 (retryCount>0 = 자기수정 — 엔진이 증거 가중을 낮춘다)
        setFirstPick(idx);
        setPhase('retry');
      }
    } else if (phase === 'retry') {
      if (idx === firstPick) return;
      finish(idx, 1);
    }
  };

  const correct = finalPick !== null && finalPick === problem.answerIndex;

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 py-6">
      <Header onExit={onExit} solved={solved} title={def?.nameKo ?? action.skillId} modeLabel={MODE_LABEL[action.kind] ?? action.kind} />
      <div className="flex items-center gap-3">
        <ProgressBar value={masteryP * 100} className="flex-1" />
        <span className="text-[11px] font-semibold text-slate-500">숙달 {(masteryP * 100).toFixed(0)}%</span>
      </div>
      <WhyChip reason={action.reason} />
      {action.variant === 'transfer' && (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-600">전이 문제 — 새로운 상황에 적용해 보기</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>{phase === 'retry' ? '한 번 더 생각해 보기 🌱' : ' '}</span>
          <Stars level={action.difficulty} />
        </div>
        <MathText text={problem.stem} className="text-[15px] leading-relaxed text-slate-800" />
        <div className="mt-4 flex flex-col gap-2">
          {problem.choices.map((c, i) => {
            const isFinal = finalPick === i;
            const isAnswer = phase === 'done' && i === problem.answerIndex;
            const isFirstWrong = firstPick === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                disabled={phase === 'done' || (phase === 'retry' && isFirstWrong)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  isAnswer
                    ? 'border-emerald-300 bg-emerald-50'
                    : isFinal
                      ? 'border-rose-300 bg-rose-50'
                      : isFirstWrong
                        ? 'border-slate-200 bg-slate-50 opacity-50'
                        : 'border-slate-200 bg-white hover:border-sky-300'
                }`}
              >
                <MathText text={c.text} />
              </button>
            );
          })}
        </div>

        {phase !== 'done' && hintsShown < 3 && (
          <button
            type="button"
            onClick={() => setHintsShown((n) => n + 1)}
            className="mt-3 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50"
          >
            <Lightbulb className="h-3.5 w-3.5" /> 힌트 보기 ({hintsShown}/3)
          </button>
        )}
        {hintsShown > 0 && phase !== 'done' && (
          <div className="mt-2 flex flex-col gap-1.5">
            {problem.hints.slice(0, hintsShown).map((h, i) => (
              <div key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <MathInline text={h} />
              </div>
            ))}
          </div>
        )}

        {phase === 'done' && (
          <div className="mt-4 flex flex-col gap-3">
            <div className={`rounded-xl px-3 py-2 text-sm font-bold ${correct ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {correct ? '정답! 🎉' : '여기가 오늘의 성장 포인트 🌱'}
            </div>
            {!correct && (
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <p><span className="font-bold text-indigo-500">IDEA</span> <MathInline text={problem.idea} /></p>
                <p><span className="font-bold text-indigo-500">SOLVE</span> <MathInline text={problem.solve} /></p>
                <p><span className="font-bold text-indigo-500">REMEMBER</span> <MathInline text={problem.remember} /></p>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const p = pending.current;
                if (p) onSubmit(p.idx, p.solveTimeSec, p.hintsUsed, p.retryCount);
              }}
              className="rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white"
            >
              다음 문제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
