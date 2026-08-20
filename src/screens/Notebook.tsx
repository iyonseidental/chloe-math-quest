// Mistake Notebook (§59) — 자동 오답노트 + Mistake Pattern (§60)
import { useMemo, useState } from 'react';
import { useStudent } from '../context/StudentContext.tsx';
import { SKILL_MAP, PLAYABLE_SKILLS } from '../data/curriculum.ts';
import { ERROR_LABELS, SELF_TAG_OPTIONS, mistakePattern } from '../engine/errors.ts';
import { MathText, MathInline } from '../components/MathText.tsx';
import type { SkillId } from '../engine/types.ts';

export default function Notebook() {
  const { model } = useStudent();
  const [trackFilter, setTrackFilter] = useState<'all' | 'M1' | 'M2' | 'M3'>('all');
  const [filter, setFilter] = useState<SkillId | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const skillChips = useMemo(() => PLAYABLE_SKILLS.filter((s) => trackFilter === 'all' || s.grade === trackFilter), [trackFilter]);

  const wrongs = useMemo(
    () =>
      model.attempts
        .filter((a) => !a.correct && a.variant !== 'diagnostic')
        .filter((a) => trackFilter === 'all' || SKILL_MAP[a.skillId]?.grade === trackFilter)
        .filter((a) => filter === 'all' || a.skillId === filter)
        .slice()
        .reverse(),
    [model.attempts, filter, trackFilter],
  );

  const pattern = useMemo(() => mistakePattern(model), [model]);
  const maxCount = Math.max(1, ...pattern.map((p) => p.count));

  // 이 스킬에서 오답 이후 정답(클리닉 재도전 성공 등)이 있으면 "교정됨"으로 본다
  const isHealed = (attemptId: string, skillId: SkillId, ts: number) => {
    const clinicResolved = model.clinicQueue.some((c) => c.originalAttemptId === attemptId && c.resolved);
    if (clinicResolved) return true;
    return model.attempts.some((a) => a.skillId === skillId && a.correct && a.ts > ts && (a.variant === 'similarA' || a.variant === 'similarB' || a.variant === 'transfer'));
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-5">
      <h1 className="text-lg font-bold text-slate-800">📝 Mistake Notebook</h1>
      <p className="mt-1 text-xs text-slate-500">오답은 실패가 아니라 발견이에요. 시스템이 자동으로 기록하고 치료 상태까지 챙겨요.</p>

      {/* Mistake Pattern */}
      {pattern.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-700">MY MISTAKE PATTERN</p>
          <div className="mt-2.5 space-y-1.5">
            {pattern.map((p) => (
              <div key={p.type} className="flex items-center gap-2 text-[11px]">
                <span className="w-28 shrink-0 text-slate-500">
                  {ERROR_LABELS[p.type].emoji} {ERROR_LABELS[p.type].label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-400" style={{ width: `${(p.count / maxCount) * 100}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-slate-400">{Math.round(p.ratio * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 과정(학년) 필터 → 단원 필터 */}
      <div className="mt-4 flex gap-1.5">
        {(['all', 'M1', 'M2', 'M3'] as const).map((t) => (
          <Chip
            key={t}
            active={trackFilter === t}
            onClick={() => {
              setTrackFilter(t);
              setFilter('all');
            }}
          >
            {t === 'all' ? '전 과정' : t === 'M1' ? '🌱 중1' : t === 'M2' ? '🌿 중2' : '🌳 중3'}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>전체 단원</Chip>
        {skillChips.map((s) => (
          <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
            {s.icon} {s.name}
          </Chip>
        ))}
      </div>

      {/* 오답 카드 */}
      {wrongs.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">아직 기록된 오답이 없어요 ✨</div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {wrongs.map((a) => {
            const skill = SKILL_MAP[a.skillId];
            const open = openId === a.id;
            const healed = isHealed(a.id, a.skillId, a.ts);
            const selfLabel = SELF_TAG_OPTIONS.find((o) => o.id === a.selfDiagnosis)?.label;
            return (
              <div key={a.id} className={`rounded-2xl border p-3.5 ${healed ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
                <button type="button" className="w-full text-left" onClick={() => setOpenId(open ? null : a.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400">
                      {skill?.icon} {skill?.name} · Lv.{a.level} · {new Date(a.ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${healed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                      {healed ? '✓ 교정 완료' : '치료 중'}
                    </span>
                  </div>
                  <MathText text={a.problem.stem} className="mt-1.5 max-h-24 overflow-hidden text-[13px] text-slate-700" />
                  {a.autoDiagnosis && (
                    <p className="mt-1 text-[11px] text-violet-500">
                      {ERROR_LABELS[a.autoDiagnosis].emoji} {ERROR_LABELS[a.autoDiagnosis].label}
                      {selfLabel && <span className="text-slate-400"> · 내 생각: {selfLabel}</span>}
                    </p>
                  )}
                </button>
                {open && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <div className="space-y-1">
                      {a.problem.choices.map((c, i) => (
                        <div
                          key={i}
                          className={`rounded-lg px-3 py-1.5 text-xs ${
                            i === a.problem.answerIndex ? 'bg-emerald-50 font-semibold text-emerald-600' : i === a.chosenIndex ? 'bg-rose-50 text-rose-500' : 'text-slate-400'
                          }`}
                        >
                          <MathInline text={c} />
                          {i === a.problem.answerIndex && ' ✓ 정답'}
                          {i === a.chosenIndex && i !== a.problem.answerIndex && ' — 내가 고른 답'}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600">
                      <p><b className="text-sky-600">IDEA</b> {a.problem.idea}</p>
                      <p><b className="text-indigo-600">SOLVE</b> {a.problem.solve}</p>
                      <p><b className="text-amber-600">REMEMBER</b> {a.problem.remember}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
        active ? 'border-indigo-300 bg-indigo-50 text-indigo-600' : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      {children}
    </button>
  );
}
