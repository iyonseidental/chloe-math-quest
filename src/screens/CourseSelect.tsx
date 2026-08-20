// 교육과정 선택 — 중1·중2·중3 + 고등(2022 개정: 공통수학1·2 / 대수·미적분Ⅰ·확통 / 미적분Ⅱ·기하)
// 어떤 과정이든 클릭해 진단을 볼 수 있고, 미달이면 아래 학년 구멍 메꾸기로 안내한다.
import { useState } from 'react';
import { Lock, Trophy, Sparkles, ClipboardList } from 'lucide-react';
import { useStudent } from '../context/StudentContext.tsx';
import { TRACKS, TRACK_MAP, trackSkills } from '../data/curriculum.ts';
import { trackStatuses } from '../engine/progression.ts';
import { ProgressBar } from '../components/ui.tsx';
import type { TrackDef, TrackId } from '../engine/types.ts';

interface Props {
  onStartDiagnosis: (trackId: TrackId) => void;
  onEnterTrack: () => void; // activeTrack 변경 후 대시보드로
}

const SECTIONS: { title: string; sub?: string; filter: (t: TrackDef) => boolean }[] = [
  { title: '중학교', filter: (t) => t.category === 'middle' },
  { title: '고등학교 · 공통 과목', sub: '고1 과정', filter: (t) => t.category === 'high-common' },
  { title: '고등학교 · 일반 선택', filter: (t) => t.category === 'high-elective' },
  { title: '고등학교 · 진로 선택', filter: (t) => t.category === 'high-career' },
];

export default function CourseSelect({ onStartDiagnosis, onEnterTrack }: Props) {
  const { model, mutateModel } = useStudent();
  const statuses = Object.fromEntries(trackStatuses(model).map((s) => [s.trackId, s]));
  const [notice, setNotice] = useState<string | null>(null);

  const handleClick = (t: TrackDef) => {
    if (!t.hasContent) {
      setNotice(
        `${t.emoji} ${t.name} 과정은 Phase 3에서 열려요. 먼저 ${t.prereqTracks.map((p) => TRACK_MAP[p].name).join(', ')} 과정을 정복하면 자연스럽게 이어집니다!`,
      );
      return;
    }
    const st = statuses[t.id];
    if (!st.diagnosed) {
      onStartDiagnosis(t.id);
      return;
    }
    mutateModel((m) => ({ ...m, activeTrack: t.id }));
    onEnterTrack();
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-5">
      <h1 className="text-lg font-bold text-slate-800">🎓 교육과정 선택</h1>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        원하는 과정을 골라 진단평가를 볼 수 있어요. 진단 결과 기초가 부족하면 아래 학년의 구멍부터 메꾸도록 퀘스트가 자동으로 안내하고, 과정을 정복(평균 mastery 90+)하면 다음
        과정 도전을 추천해요. 각 과정의 졸업 조건은 <b>전 단원 Lv.5(Elite) 최고수준 문제 정복</b>이에요.
      </p>

      {notice && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

      {SECTIONS.map((sec) => (
        <div key={sec.title} className="mt-5">
          <h2 className="text-sm font-bold text-slate-700">
            {sec.title} {sec.sub && <span className="ml-1 text-[10px] font-medium text-slate-400">{sec.sub}</span>}
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            {TRACKS.filter(sec.filter).map((t) => {
              const st = statuses[t.id];
              const isActive = model.activeTrack === t.id;
              const skillCount = trackSkills(t.id).length;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleClick(t)}
                  className={`rounded-2xl border p-3.5 text-left transition ${
                    isActive
                      ? 'border-indigo-400 bg-indigo-50 shadow-md'
                      : t.hasContent
                        ? 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm'
                        : 'border-dashed border-slate-200 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`text-xl ${t.hasContent ? '' : 'grayscale'}`}>{t.emoji}</span>
                    <span className="flex flex-col items-end gap-1">
                      {isActive && <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[9px] font-bold text-white">학습 중</span>}
                      {st.recommended && !isActive && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                          <Sparkles size={8} className="mr-0.5 inline" />
                          추천
                        </span>
                      )}
                      {st.eliteDone && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-600">
                          <Trophy size={8} className="mr-0.5 inline" />
                          Elite 완료
                        </span>
                      )}
                      {!t.hasContent && <Lock size={12} className="text-slate-300" />}
                    </span>
                  </div>
                  <p className={`mt-1.5 text-sm font-bold ${t.hasContent ? 'text-slate-800' : 'text-slate-400'}`}>{t.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-slate-400">{t.description}</p>
                  {t.hasContent ? (
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-[9px] text-slate-400">
                        <span>{skillCount}개 단원</span>
                        <span>{st.diagnosed ? `mastery ${st.avgMastery}%` : '진단 전'}</span>
                      </div>
                      <ProgressBar value={st.diagnosed ? st.avgMastery : 0} />
                      {!st.diagnosed && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-sky-500">
                          <ClipboardList size={10} /> 눌러서 진단평가 시작
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] font-medium text-slate-300">Phase 3 오픈 예정 · 선행: {t.prereqTracks.map((p) => TRACK_MAP[p].name).join(', ')}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
