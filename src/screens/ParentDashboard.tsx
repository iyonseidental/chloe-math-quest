// Parent Dashboard (§37~39) — "몇 문제"보다 "구멍 몇 개를 발견하고 메꿨는가"를 보여준다
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStudent } from '../context/StudentContext.tsx';
import { buildWeeklyReport } from '../engine/report.ts';
import { ProgressBar, StatTile } from '../components/ui.tsx';

export default function ParentDashboard({ onBack }: { onBack: () => void }) {
  const { model } = useStudent();
  const report = useMemo(() => buildWeeklyReport(model), [model]);
  const chartData = useMemo(() => model.snapshots.map((s) => ({ date: s.date.slice(5), mastery: s.overallMastery })), [model.snapshots]);

  const accDelta = Math.round((report.week.accuracy - report.prev.accuracy) * 100);

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="뒤로">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">👨‍👩‍👧 학부모 리포트</h1>
          <p className="text-[11px] text-slate-400">
            {model.name} · {report.periodLabel} 자동 생성
          </p>
        </div>
      </div>

      {/* 핵심 메시지: 발견 → 교정 */}
      <div className="mt-4 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 p-5 text-white shadow-xl shadow-indigo-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">This Week</p>
        <p className="mt-2 text-sm leading-relaxed">
          이번 주 <b>{report.week.solved}문제</b>를 풀었습니다. 더 중요한 것은 —
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/15 py-2.5 backdrop-blur">
            <div className="text-xl font-extrabold">{report.weaknessesFound}</div>
            <div className="text-[10px] text-indigo-100">발견된 학습 구멍</div>
          </div>
          <div className="rounded-2xl bg-white/15 py-2.5 backdrop-blur">
            <div className="text-xl font-extrabold">{report.weaknessesFixed}</div>
            <div className="text-[10px] text-indigo-100">완치된 구멍</div>
          </div>
          <div className="rounded-2xl bg-white/15 py-2.5 backdrop-blur">
            <div className="text-xl font-extrabold">{report.overallDelta > 0 ? `+${report.overallDelta}` : report.overallDelta}</div>
            <div className="text-[10px] text-indigo-100">Mastery 변화</div>
          </div>
        </div>
      </div>

      {/* 주간 학습 통계 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile label="학습일" value={`${report.week.studyDays}일`} sub={`총 ${report.week.studyMinutes}분 집중`} />
        <StatTile label="정답률" value={`${Math.round(report.week.accuracy * 100)}%`} sub={accDelta !== 0 ? `지난주 대비 ${accDelta > 0 ? '+' : ''}${accDelta}%` : '지난주와 동일'} />
        <StatTile
          label="단순 실수 비율"
          value={`${Math.round(report.week.carelessRate * 100)}%`}
          sub={report.prev.carelessRate > 0 ? `지난주 ${Math.round(report.prev.carelessRate * 100)}% → 이번주` : '오답 중 부주의 비율'}
        />
        <StatTile label="새로 안정된 단원" value={`${report.levelsMastered}개`} sub="mastery 78+ 진입" />
      </div>

      {/* 과정(학년)별 분석 — 동시 진행 지원 */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-700">과정별 진행 현황</p>
        <div className="mt-2.5 space-y-2.5">
          {report.trackProgress.map((t) => {
            const wk = report.perTrackWeek.find((w) => w.trackId === t.trackId);
            return (
              <div key={t.trackId}>
                <div className="mb-1 flex items-baseline justify-between text-[11px]">
                  <span className="font-semibold text-slate-600">
                    {t.name}
                    {model.activeTrack === t.trackId && <span className="ml-1 text-[9px] font-bold text-indigo-500">현재 학습 중</span>}
                  </span>
                  <span className="text-slate-400">
                    {t.diagnosed ? `mastery ${t.mastery}%` : '진단 전'}
                    {wk && wk.solved > 0 && ` · 이번주 ${wk.solved}문제 (${Math.round(wk.accuracy * 100)}%)${wk.wrongFixed > 0 ? ` · 오답 ${wk.wrongFixed}건 완치` : ''}`}
                  </span>
                </div>
                <ProgressBar value={t.diagnosed ? t.mastery : 0} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Report 서사 */}
      <div className="mt-4 space-y-2.5">
        {report.biggestImprovement && (
          <ReportRow emoji="📈" title="Biggest Improvement" body={`${report.biggestImprovement.name} — mastery ${report.biggestImprovement.from} → ${report.biggestImprovement.to}`} tone="emerald" />
        )}
        {report.fixedWeaknessLabels.length > 0 && <ReportRow emoji="🩹" title="Fixed Weakness" body={report.fixedWeaknessLabels.join(' · ')} tone="sky" />}
        {report.currentWeakness && (
          <ReportRow emoji="🎯" title="Current Weakness" body={`${report.currentWeakness.name} (mastery ${report.currentWeakness.mastery}) — 퀘스트가 집중 보강 중이며, 오답 완치 전에는 승급이 잠깁니다.`} tone="amber" />
        )}
        {report.nextGoals.length > 0 && <ReportRow emoji="🗓️" title="Next Week Goal" body={report.nextGoals.join(' · ')} tone="violet" />}
      </div>

      {/* 성장 그래프 */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-bold text-slate-700">전체 Mastery 추이</p>
        {chartData.length >= 2 ? (
          <div className="mt-2 h-36">
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
          <p className="mt-2 text-xs text-slate-400">이틀 이상 학습하면 추이가 그려집니다.</p>
        )}
      </div>

      <p className="mt-4 rounded-xl bg-slate-100/70 px-4 py-3 text-[10px] leading-relaxed text-slate-400">
        ℹ️ 이 리포트의 모든 수치는 실제 학습 기록에서 계산됩니다. 문제 선택 이유와 승급 조건은 학생 화면의 "WHY THIS?"에서 동일하게 확인할 수 있어요 (Explainability 원칙).
      </p>
    </div>
  );
}

function ReportRow({ emoji, title, body, tone }: { emoji: string; title: string; body: string; tone: 'emerald' | 'sky' | 'amber' | 'violet' }) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    sky: 'border-sky-200 bg-sky-50/70 text-sky-700',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-700',
    violet: 'border-violet-200 bg-violet-50/70 text-violet-700',
  } as const;
  return (
    <div className={`rounded-2xl border p-3.5 ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {emoji} {title}
      </p>
      <p className="mt-1 text-xs font-medium leading-relaxed">{body}</p>
    </div>
  );
}
