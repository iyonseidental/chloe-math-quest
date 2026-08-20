// MATH KNOWLEDGE MAP (§17, §32) — 전 교육과정 학습 구멍 지도 + Root Cause
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useStudent } from '../context/StudentContext.tsx';
import { SKILL_MAP, TRACKS, TRACK_MAP, trackSkills } from '../data/curriculum.ts';
import { mapStatus, overallMastery, type MapStatus } from '../engine/mastery.ts';
import { rootCauseReport } from '../engine/errors.ts';
import { accelerationReadiness } from '../engine/progression.ts';
import { LevelPips, ProgressBar } from '../components/ui.tsx';
import type { SkillId, TrackId } from '../engine/types.ts';

const STATUS_STYLE: Record<MapStatus, { dot: string; label: string }> = {
  green: { dot: '🟢', label: '완전 정복' },
  yellow: { dot: '🟡', label: '거의 정복' },
  orange: { dot: '🟠', label: '보완 필요' },
  red: { dot: '🔴', label: '학습 구멍' },
  untouched: { dot: '⚪', label: '미학습' },
};

export default function KnowledgeMap() {
  const { model } = useStudent();
  const [selected, setSelected] = useState<SkillId | null>(null);
  const middleTracks = TRACKS.filter((t) => t.category === 'middle');
  const highTracks = TRACKS.filter((t) => t.category !== 'middle');

  const sel = selected ? SKILL_MAP[selected] : null;
  const selState = selected ? model.skills[selected] : null;
  const rootCauses = selected ? rootCauseReport(model, selected) : [];

  const isDiagnosed = (trackId: TrackId) => model.diagnosedTracks.includes(trackId);

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-5">
      <h1 className="text-lg font-bold text-slate-800">🗺️ My Math Map</h1>
      <p className="mt-1 text-xs text-slate-500">중1부터 고3까지 — 빨간 구멍을 메우면 지도가 초록으로 변해요.</p>

      {/* 학년 진행 요약 */}
      <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        {middleTracks.map((t) => {
          const avg = isDiagnosed(t.id) || model.attempts.some((a) => SKILL_MAP[a.skillId]?.grade === t.id) ? overallMastery(model, t.id) : 0;
          const accel = accelerationReadiness(model, t.id);
          return (
            <div key={t.id} className="flex items-center gap-3">
              <span className={`w-8 text-xs font-bold ${model.activeTrack === t.id ? 'text-indigo-600' : 'text-slate-600'}`}>{t.name}</span>
              <ProgressBar value={avg} className="flex-1" />
              <span className="w-16 text-right text-[10px] text-slate-400">
                {isDiagnosed(t.id) ? `${avg}%${accel.ready ? ' 🚀' : ''}` : '진단 전'}
              </span>
            </div>
          );
        })}
        {(['H.CM1', 'H.ALG', 'H.CAL1'] as const).map((g) => (
          <div key={g} className="flex items-center gap-3 opacity-50">
            <span className="w-8 truncate text-[10px] font-bold text-slate-400">{TRACK_MAP[g].name}</span>
            <ProgressBar value={0} className="flex-1" />
            <Lock size={12} className="text-slate-300" />
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {Object.values(STATUS_STYLE).map((s) => (
          <span key={s.label}>
            {s.dot} {s.label}
          </span>
        ))}
      </div>

      {/* 트랙별 스킬 그리드 */}
      {middleTracks.map((t) => (
        <div key={t.id} className="mt-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
            {t.emoji} {t.name}
            {model.activeTrack === t.id && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-600">학습 중</span>}
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            {trackSkills(t.id).map((def) => {
              const st = model.skills[def.id];
              const status = mapStatus(st, isDiagnosed(t.id));
              const isSel = selected === def.id;
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => setSelected(isSel ? null : def.id)}
                  className={`rounded-2xl border p-3 text-left transition ${isSel ? 'border-indigo-400 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-lg">{def.icon}</span>
                    <span className="text-sm">{STATUS_STYLE[status].dot}</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-700">{def.name}</p>
                  <p className="text-[10px] text-slate-400">
                    Lv.{st?.level ?? 1} · mastery {st?.mastery ?? 0}
                  </p>
                  <div className="mt-2">
                    <LevelPips mastered={st?.masteredLevels ?? []} current={st?.level ?? 1} color={def.color} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* 고등 과정 */}
      <h2 className="mt-6 text-sm font-bold text-slate-700">🎓 고등학교 (2022 개정 교육과정)</h2>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        {highTracks.map((t) => (
          <div key={t.id} className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-3 opacity-80">
            <div className="flex items-start justify-between">
              <span className="text-lg grayscale">{t.emoji}</span>
              <Lock size={13} className="text-slate-300" />
            </div>
            <p className="mt-1 text-xs font-bold text-slate-400">{t.name}</p>
            <p className="mt-0.5 line-clamp-2 text-[9px] text-slate-300">{t.description}</p>
            <p className="mt-1 text-[9px] text-slate-300">선행: {t.prereqTracks.map((p) => TRACK_MAP[p].name).join(', ')}</p>
          </div>
        ))}
      </div>

      {/* 선택한 스킬 상세 + Root Cause (§18) */}
      {sel && selState && (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4">
          <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <p className="text-sm font-bold text-slate-700">
                {sel.icon} {sel.name} <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-500">{TRACK_MAP[sel.grade].name}</span>
              </p>
              <button type="button" className="text-xs text-slate-400" onClick={() => setSelected(null)}>
                닫기 ✕
              </button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="font-bold text-slate-700">{selState.mastery}</div>
                <div className="text-slate-400">Mastery</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="font-bold text-slate-700">{selState.attempts > 0 ? Math.round((selState.correct / selState.attempts) * 100) : 0}%</div>
                <div className="text-slate-400">정답률</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="font-bold text-slate-700">{selState.attempts}</div>
                <div className="text-slate-400">푼 문제</div>
              </div>
            </div>
            {rootCauses.length > 0 && (
              <div className="mt-3 rounded-xl bg-rose-50/70 p-3">
                <p className="text-[11px] font-bold text-rose-600">WHY AM I MISSING THESE? — 선수 개념 점검</p>
                <ul className="mt-1.5 space-y-1 text-[11px] text-slate-600">
                  {rootCauses.map((rc) => (
                    <li key={rc.skillId} className="flex justify-between">
                      <span>
                        {rc.name} <span className="text-[9px] text-slate-400">({TRACK_MAP[SKILL_MAP[rc.skillId].grade].name})</span>
                      </span>
                      <span>
                        {STATUS_STYLE[mapStatus(model.skills[rc.skillId], isDiagnosed(SKILL_MAP[rc.skillId].grade))].dot} {rc.mastery}
                      </span>
                    </li>
                  ))}
                </ul>
                {rootCauses[0] && rootCauses[0].mastery < 60 && (
                  <p className="mt-1.5 text-[11px] font-medium text-rose-500">→ "{rootCauses[0].name}"부터 메우는 것이 지름길이에요. 오늘의 퀘스트가 자동으로 안내해요.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
