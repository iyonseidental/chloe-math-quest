// 학생 Dashboard (§30) — 인사, 오늘의 미션, 스트릭, Mastery, Radar, 강점/약점, 배지
import { useMemo, useState } from 'react';
import { Play, RotateCcw, FlaskConical, GraduationCap, Users } from 'lucide-react';
import CourseSwitchModal from '../components/CourseSwitchModal.tsx';
import type { TrackId } from '../engine/types.ts';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useStudent } from '../context/StudentContext.tsx';
import { buildTodayQuest } from '../engine/quest.ts';
import { overallMastery } from '../engine/mastery.ts';
import { levelFromXp, BADGES, accelerationReadiness } from '../engine/progression.ts';
import { DOMAIN_NAMES, TRACKS, TRACK_MAP, trackSkills } from '../data/curriculum.ts';
import { addDays, todayStr } from '../engine/review.ts';
import { ProgressBar, StatTile } from '../components/ui.tsx';

export default function Dashboard({
  onStartQuest,
  onStartDiagnosis,
  onOpenParent,
}: {
  onStartQuest: () => void;
  onStartDiagnosis: (trackId: TrackId) => void;
  onOpenParent: () => void;
}) {
  const { model, resetAll, loadDemo } = useStudent();
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const quest = useMemo(() => buildTodayQuest(model), [model]);
  const track = TRACK_MAP[model.activeTrack];
  const trackSkillList = useMemo(() => trackSkills(model.activeTrack), [model.activeTrack]);
  const overall = overallMastery(model, model.activeTrack);
  const lv = levelFromXp(model.xp);
  const accel = accelerationReadiness(model, model.activeTrack);
  const nextTrack = TRACKS.find((t) => t.prereqTracks.includes(model.activeTrack));

  const weekAgo = addDays(todayStr(), -7);
  const oldSnap = [...model.snapshots].reverse().find((s) => s.date <= weekAgo) ?? model.snapshots[0];
  const weekDelta = oldSnap ? overallMastery(model) - oldSnap.overallMastery : 0;

  const radarData = useMemo(() => {
    const byDomain: Record<string, { sum: number; n: number }> = {};
    for (const s of trackSkillList) {
      const d = byDomain[s.domain] ?? { sum: 0, n: 0 };
      d.sum += model.skills[s.id]?.mastery ?? 0;
      d.n++;
      byDomain[s.domain] = d;
    }
    return Object.entries(byDomain).map(([domain, v]) => ({ domain: DOMAIN_NAMES[domain], value: Math.round(v.sum / v.n) }));
  }, [model, trackSkillList]);

  const ranked = [...trackSkillList].sort((a, b) => (model.skills[b.id]?.mastery ?? 0) - (model.skills[a.id]?.mastery ?? 0));
  const strengths = ranked.slice(0, 3).filter((s) => (model.skills[s.id]?.mastery ?? 0) >= 60);
  const toImprove = [...ranked].reverse().slice(0, 3).filter((s) => (model.skills[s.id]?.mastery ?? 0) < 85);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-5">
      {/* 인사 + 레벨 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-sky-500">{greeting},</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">{model.name} ✨</h1>
          <button
            type="button"
            onClick={() => setCourseModalOpen(true)}
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-200 active:scale-95"
          >
            <GraduationCap size={11} /> {track.emoji} {track.name} 과정 · 변경
          </button>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-indigo-500">
            LV {lv.level} · {lv.title}
          </div>
          <div className="mt-1 w-28">
            <ProgressBar value={lv.progress * 100} />
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">{model.xp} XP</div>
        </div>
      </div>

      {/* 오늘의 미션 */}
      <div className="mt-5 rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 p-5 text-white shadow-xl shadow-indigo-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-100">Chloe's Mission Today</p>
            <p className="mt-1 text-lg font-bold">약 {quest.totalEstimatedMin}분 · {quest.blocks.reduce((a, b) => a + b.count, 0)}문제</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur">
            <div className="text-lg font-bold">🔥 {model.streakDays}</div>
            <div className="text-[10px] text-sky-100">연속 학습</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quest.blocks.map((b, i) => (
            <span key={i} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur">
              {b.title} {b.count}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onStartQuest}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-extrabold text-indigo-600 shadow-lg transition hover:brightness-95"
        >
          <Play size={16} fill="currentColor" /> START TODAY'S QUEST
        </button>
      </div>

      {/* 핵심 지표 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label={`${track.name} Mastery`} value={`${overall}%`} sub={weekDelta !== 0 ? `이번 주 ${weekDelta > 0 ? '+' : ''}${weekDelta}%` : '이번 주 시작!'} accent />
        <StatTile
          label={nextTrack ? `${nextTrack.name} 도전 준비도` : '최고 과정 학습 중'}
          value={`${accel.percent}%`}
          sub={accel.ready ? (nextTrack?.hasContent ? `${nextTrack.name} 시작 가능! 🚀` : `${nextTrack?.name ?? ''} Phase 3 오픈 예정`) : `${track.name} 정복(90+) 후 오픈`}
        />
      </div>

      {/* Radar */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-700">영역별 실력</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: '#64748b' }} />
              <Radar dataKey="value" stroke="#6366f1" fill="#818cf8" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 강점 / 다음 목표 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-xs font-bold text-emerald-600">MY STRENGTHS</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
            {strengths.length ? (
              strengths.map((s) => (
                <li key={s.id}>
                  ✓ {s.name} <span className="text-emerald-500">{model.skills[s.id].mastery}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-400">학습을 시작하면 나타나요</li>
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-bold text-amber-600">NEXT TO IMPROVE</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
            {toImprove.length ? (
              toImprove.map((s) => (
                <li key={s.id}>
                  △ {s.name} <span className="text-amber-500">{model.skills[s.id].mastery}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-400">모든 영역이 탄탄해요!</li>
            )}
          </ul>
        </div>
      </div>

      {/* 배지 */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-700">배지 {model.badges.length} / {BADGES.length}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {BADGES.map((b) => {
            const earned = model.badges.includes(b.id);
            return (
              <span
                key={b.id}
                title={`${b.name} — ${b.description}`}
                className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium ${earned ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-300'}`}
              >
                {b.emoji} {b.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* 학부모 리포트 */}
      <button
        type="button"
        onClick={onOpenParent}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-500"
      >
        <Users size={14} /> 학부모 주간 리포트 보기
      </button>

      {/* 과정 변경 모달 */}
      <CourseSwitchModal open={courseModalOpen} onClose={() => setCourseModalOpen(false)} onStartDiagnosis={onStartDiagnosis} />

      {/* 개발용 도구 */}
      <div className="mt-6 flex justify-center gap-3 text-[11px] text-slate-400">
        <button type="button" onClick={loadDemo} className="inline-flex items-center gap-1 hover:text-slate-600">
          <FlaskConical size={12} /> 데모 데이터 보기
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('모든 학습 기록을 삭제하고 처음부터 시작할까요?')) resetAll();
          }}
          className="inline-flex items-center gap-1 hover:text-slate-600"
        >
          <RotateCcw size={12} /> 처음부터
        </button>
      </div>
    </div>
  );
}
