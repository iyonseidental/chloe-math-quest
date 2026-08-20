// Progress (§34~36) — 성장 그래프, Growth Metrics. 과정(학년)별 필터로 동시 진행을 분리 분석한다.
import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStudent } from '../context/StudentContext.tsx';
import { PLAYABLE_SKILLS, TRACKS, trackSkills } from '../data/curriculum.ts';
import { overallMastery } from '../engine/mastery.ts';
import { addDays, todayStr } from '../engine/review.ts';
import { LevelPips, ProgressBar, StatTile } from '../components/ui.tsx';
import type { TrackId } from '../engine/types.ts';

type Filter = 'all' | TrackId;

export default function Progress() {
  const { model } = useStudent();
  const [filter, setFilter] = useState<Filter>('all');

  const skillList = useMemo(() => (filter === 'all' ? PLAYABLE_SKILLS : trackSkills(filter)), [filter]);
  const skillIdSet = useMemo(() => new Set(skillList.map((s) => s.id)), [skillList]);
  const overall = filter === 'all' ? overallMastery(model) : overallMastery(model, filter);

  // 스냅샷의 bySkill로 필터별 추이를 재구성 — 과정별 성장 그래프
  const chartData = useMemo(
    () =>
      model.snapshots.map((s) => {
        if (filter === 'all') return { date: s.date.slice(5), mastery: s.overallMastery };
        const vals = skillList.map((sk) => s.bySkill[sk.id] ?? 0);
        return { date: s.date.slice(5), mastery: Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)) };
      }),
    [model.snapshots, filter, skillList],
  );

  const stats = useMemo(() => {
    const today = todayStr();
    const inScope = (a: (typeof model.attempts)[number]) => skillIdSet.has(a.skillId) && a.variant !== 'diagnostic';
    const recent7 = model.attempts.filter((a) => inScope(a) && a.ts >= Date.parse(addDays(today, -7)));
    const prev7 = model.attempts.filter((a) => inScope(a) && a.ts >= Date.parse(addDays(today, -14)) && a.ts < Date.parse(addDays(today, -7)));
    const acc = (list: typeof model.attempts) => (list.length ? list.filter((a) => a.correct).length / list.length : 0);
    const careless = (list: typeof model.attempts) => {
      const w = list.filter((a) => !a.correct);
      return w.length ? w.filter((a) => a.autoDiagnosis === 'CARELESS').length / w.length : 0;
    };
    const avgTime = recent7.length ? Math.round(recent7.reduce((s, a) => s + a.timeMs, 0) / recent7.length / 1000) : 0;
    const grow7 = chartData.length >= 2 ? overall - (chartData.find((c) => c.date <= addDays(today, -7).slice(5))?.mastery ?? chartData[0].mastery) : overall;
    const masteredCount = skillList.reduce((n, s) => n + (model.skills[s.id]?.masteredLevels.length ?? 0), 0);
    return {
      grow7,
      acc7: Math.round(acc(recent7) * 100),
      accDelta: Math.round((acc(recent7) - acc(prev7)) * 100),
      avgTime,
      careless7: Math.round(careless(recent7) * 100),
      masteredCount,
      solved7: recent7.length,
    };
  }, [model, skillIdSet, skillList, overall, chartData]);

  const filterLabel = filter === 'all' ? '전체' : TRACKS.find((t) => t.id === filter)?.name;

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-5">
      <h1 className="text-lg font-bold text-slate-800">📈 Growth Report</h1>
      <p className="mt-1 text-xs text-slate-500">"내가 진짜 늘고 있을까?" — 과정별로 따로 확인할 수 있어요.</p>

      {/* 과정 필터 */}
      <div className="mt-3 flex gap-1.5">
        {(['all', 'M1', 'M2', 'M3'] as Filter[]).map((f) => {
          const t = TRACKS.find((x) => x.id === f);
          const label = f === 'all' ? '전체' : t?.name ?? f;
          const disabled = f !== 'all' && !model.diagnosedTracks.includes(f as TrackId) && !model.attempts.some((a) => skillIdSet.size && a.skillId.startsWith(f));
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                filter === f ? 'border-indigo-400 bg-indigo-500 text-white shadow-md shadow-indigo-200' : disabled ? 'border-slate-100 bg-slate-50 text-slate-300' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'
              }`}
            >
              {f === 'all' ? '전체' : `${t?.emoji} ${label}`}
            </button>
          );
        })}
      </div>

      {/* Mastery 추이 */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold text-slate-700">{filterLabel} Mastery</p>
          <p className="text-xl font-extrabold text-indigo-500">{overall}%</p>
        </div>
        {chartData.length >= 2 ? (
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                <Line type="monotone" dataKey="mastery" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">이틀 이상 학습하면 성장 그래프가 그려져요.</p>
        )}
      </div>

      {/* Growth Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label={`최근 7일 성장 (${filterLabel})`} value={`${stats.grow7 > 0 ? '+' : ''}${stats.grow7}%`} accent />
        <StatTile label="7일 정답률" value={`${stats.acc7}%`} sub={stats.accDelta !== 0 ? `지난주 대비 ${stats.accDelta > 0 ? '+' : ''}${stats.accDelta}%` : undefined} />
        <StatTile label="정복한 레벨" value={`${stats.masteredCount}개`} sub="Skill × Level MASTERED" />
        <StatTile label="평균 풀이 시간" value={`${stats.avgTime}초`} sub={`최근 7일 ${stats.solved7}문제`} />
        <StatTile label="단순 실수 비율" value={`${stats.careless7}%`} sub="오답 중 CARELESS 비율" />
        <StatTile label="연속 학습" value={`🔥 ${model.streakDays}일`} />
      </div>

      {/* 스킬별 상세 */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-700">단원별 Mastery ({filterLabel})</p>
        <div className="mt-3 space-y-3">
          {[...skillList]
            .sort((a, b) => (model.skills[a.id]?.mastery ?? 0) - (model.skills[b.id]?.mastery ?? 0))
            .map((def) => {
              const st = model.skills[def.id];
              return (
                <div key={def.id}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="font-medium text-slate-600">
                      {def.icon} {def.name}
                    </span>
                    <span className="text-slate-400">
                      Lv.{st.level} · {st.mastery}
                    </span>
                  </div>
                  <ProgressBar value={st.mastery} color="bg-gradient-to-r from-amber-300 via-lime-300 to-emerald-400" />
                  <div className="mt-1">
                    <LevelPips mastered={st.masteredLevels} current={st.level} color={def.color} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
