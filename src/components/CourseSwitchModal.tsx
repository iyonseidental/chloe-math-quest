// 과정 변경 바텀시트 — 대시보드에서 한 번의 탭으로 학년/과목 전환·진단 시작
import { useState } from 'react';
import { ChevronRight, Lock, Sparkles, Trophy, ClipboardList, CheckCircle2 } from 'lucide-react';
import { useStudent } from '../context/StudentContext.tsx';
import { TRACKS, TRACK_MAP } from '../data/curriculum.ts';
import { trackStatuses } from '../engine/progression.ts';
import Modal from './Modal.tsx';
import { ProgressBar } from './ui.tsx';
import type { TrackDef, TrackId } from '../engine/types.ts';

interface Props {
  open: boolean;
  onClose: () => void;
  onStartDiagnosis: (trackId: TrackId) => void;
}

const GROUPS: { label: string; filter: (t: TrackDef) => boolean }[] = [
  { label: '중학교', filter: (t) => t.category === 'middle' },
  { label: '고등학교 · 공통', filter: (t) => t.category === 'high-common' },
  { label: '고등학교 · 일반 선택', filter: (t) => t.category === 'high-elective' },
  { label: '고등학교 · 진로 선택', filter: (t) => t.category === 'high-career' },
];

export default function CourseSwitchModal({ open, onClose, onStartDiagnosis }: Props) {
  const { model, mutateModel } = useStudent();
  const statuses = Object.fromEntries(trackStatuses(model).map((s) => [s.trackId, s]));
  const [notice, setNotice] = useState<string | null>(null);

  const handlePick = (t: TrackDef) => {
    if (!t.hasContent) {
      setNotice(`${t.emoji} ${t.name}은(는) Phase 3에서 열려요. 선행 과정(${t.prereqTracks.map((p) => TRACK_MAP[p].name).join(', ')})을 먼저 정복해요!`);
      return;
    }
    if (!statuses[t.id].diagnosed) {
      onClose();
      onStartDiagnosis(t.id);
      return;
    }
    mutateModel((m) => ({ ...m, activeTrack: t.id }));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="🎓 학습 과정 변경">
      <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
        여러 과정을 동시에 진행해도 좋아요 — 결과와 분석은 과정별로 따로 보여드려요. 처음 여는 과정은 진단평가부터 시작해요.
      </p>

      {notice && (
        <button type="button" onClick={() => setNotice(null)} className="mb-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-left text-[11px] leading-relaxed text-amber-700">
          {notice} <span className="text-amber-400">(눌러서 닫기)</span>
        </button>
      )}

      <div className="space-y-4">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{g.label}</p>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              {TRACKS.filter(g.filter).map((t, i, arr) => {
                const st = statuses[t.id];
                const isActive = model.activeTrack === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePick(t)}
                    className={`flex w-full items-center gap-3 px-3.5 py-3 text-left transition ${i < arr.length - 1 ? 'border-b border-slate-100' : ''} ${
                      isActive ? 'bg-indigo-50/70' : t.hasContent ? 'bg-white hover:bg-sky-50/60' : 'bg-slate-50/50'
                    }`}
                  >
                    <span className={`text-xl ${t.hasContent ? '' : 'grayscale opacity-60'}`}>{t.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${t.hasContent ? 'text-slate-800' : 'text-slate-400'}`}>{t.name}</span>
                        {isActive && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
                            <CheckCircle2 size={8} /> 학습 중
                          </span>
                        )}
                        {st.recommended && !isActive && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600">
                            <Sparkles size={8} /> 추천
                          </span>
                        )}
                        {st.eliteDone && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-600">
                            <Trophy size={8} /> Elite
                          </span>
                        )}
                      </span>
                      {t.hasContent ? (
                        st.diagnosed ? (
                          <span className="mt-1 flex items-center gap-2">
                            <ProgressBar value={st.avgMastery} className="max-w-28 flex-1" />
                            <span className="text-[10px] text-slate-400">{st.avgMastery}%</span>
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-sky-500">
                            <ClipboardList size={10} /> 진단평가로 시작하기
                          </span>
                        )
                      ) : (
                        <span className="mt-0.5 block text-[10px] text-slate-300">Phase 3 오픈 예정</span>
                      )}
                    </span>
                    {t.hasContent ? <ChevronRight size={16} className="shrink-0 text-slate-300" /> : <Lock size={14} className="shrink-0 text-slate-300" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
