// 트랙(학년/과목)별 적응형 진단평가 (§6) — 스킬당 2문제로 시작 레벨을 추정한다
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useStudent } from '../context/StudentContext.tsx';
import { startDiagnostic, answerDiagnostic } from '../engine/diagnostic.ts';
import { SKILL_MAP, TRACK_MAP } from '../data/curriculum.ts';
import ProblemCard, { type FinalPayload } from '../components/ProblemCard.tsx';
import { ProgressBar } from '../components/ui.tsx';
import type { TrackId } from '../engine/types.ts';

export default function Diagnosis({ trackId, onDone, onCancel }: { trackId: TrackId; onDone: () => void; onCancel?: () => void }) {
  const { finishDiagnosis } = useStudent();
  const [session, setSession] = useState(() => startDiagnostic(trackId));
  const [pendingCorrect, setPendingCorrect] = useState<boolean | null>(null);

  const skill = SKILL_MAP[session.order[session.index]];
  const track = TRACK_MAP[trackId];

  const handleFinal = (payload: FinalPayload) => {
    setPendingCorrect(payload.chosenIndex === session.current.answerIndex);
    return null; // 진단은 XP/기록 없이 배치만 한다
  };

  const handleNext = () => {
    if (pendingCorrect === null) return;
    const { session: next, done } = answerDiagnostic(session, pendingCorrect);
    setPendingCorrect(null);
    if (done) {
      finishDiagnosis(next.placements, trackId);
      onDone();
    } else {
      setSession(next);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-start gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="취소">
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            {track.emoji} {track.name} 실력 진단
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {track.name} 과정의 단원별 시작 레벨을 찾는 중이에요. 몰라도 괜찮아요 — 기초가 부족한 단원은 아래 학년 내용부터 자동으로 메꿔드려요!
          </p>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[11px] text-slate-500">
          <span>
            {skill.icon} {skill.name}
          </span>
          <span>
            {session.answered + 1} / {session.totalQuestions}
          </span>
        </div>
        <ProgressBar value={(session.answered / session.totalQuestions) * 100} />
      </div>

      <ProblemCard
        key={session.current.id}
        problem={session.current}
        headerLabel={`진단 · ${skill.name}`}
        mode="diagnostic"
        onFinal={handleFinal}
        onNext={handleNext}
        nextLabel={session.answered + 1 >= session.totalQuestions ? '진단 완료!' : '다음'}
      />
    </div>
  );
}
