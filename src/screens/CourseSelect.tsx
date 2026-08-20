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

  const unlocked = new Set(model.unlockedTracks ?? []);

  const handleClick = (t: TrackDef) => {
    if (!t.hasContent) {
      // 정직한 안내: 잠금의 실제 이유는 "순서"가 아니라 이 과정의 문제은행이 아직 준비 중이라서다.
      setNotice(
        unlocked.has(t.id)
          ? `${t.emoji} ${t.name} 과정은 미리 열어 두었어요! 이 과정의 문제은행은 다음 업데이트에서 제공됩니다. 준비되는 즉시 진단부터 바로 시작할 수 있어요. 그때까지는 ${t.prereqTracks.map((p) => TRACK_MAP[p].name).join(', ')} 과정으로 기초를 다져 두면 좋아요.`
          : `${t.emoji} ${t.name} 과정은 문제은행 준비 중이에요 (다음 업데이트 예정). 순서와 상관없이 미리 열어 두고 싶다면 카드의 "미리 열기" 버튼을 눌러 주세요. 참고로 중1·중2·중3은 지금도 순서 제한 없이 아무 과정이나 진단을 시작할 수 있어요!`,
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

  // 순서 무시 "미리 열기" — 선택은 즉시 저장되고, 해당 과정 콘텐츠가 배포되는 순간부터
  // 선행 정복 여부와 무관하게 바로 학습 가능 상태가 된다.
  const preUnlock = (t: TrackDef) => {
    mutateModel((m) => ({ ...m, unlockedTracks: [...new Set([...(m.unlockedTracks ?? []), t.id])] }));
    setNotice(`🔓 ${t.emoji} ${t.name} 과정을 미리 열어 두었어요! 문제은행이 배포되면 선행 정복 없이 바로 도전할 수 있어요.`);
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
                      {!t.hasContent && (unlocked.has(t.id) ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-bold text-sky-600">🔓 미리 열림</span> : <Lock size={12} className="text-slate-300" />)}
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
                    <div className="mt-2">
                      <p className="text-[10px] font-medium text-slate-300">문제은행 준비 중 · 권장 선행: {t.prereqTracks.map((p) => TRACK_MAP[p].name).join(', ')}</p>
                      {!unlocked.has(t.id) && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            preUnlock(t);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              preUnlock(t);
                            }
                          }}
                          className="mt-1.5 inline-block rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-600 hover:bg-sky-100"
                        >
                          🔓 순서 상관없이 미리 열기
                        </span>
                      )}
                    </div>
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
