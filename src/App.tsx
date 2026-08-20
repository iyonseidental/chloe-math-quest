import { useState, type ReactNode } from 'react';
import { LayoutDashboard, Map, NotebookPen, TrendingUp, GraduationCap, Brain } from 'lucide-react';
import { StudentProvider, useStudent } from './context/StudentContext.tsx';
import { Engine2Provider } from './context/Engine2Context.tsx';
import Engine2Coach from './screens/Engine2Coach.tsx';
import Dashboard from './screens/Dashboard.tsx';
import QuestPlayer from './screens/QuestPlayer.tsx';
import Diagnosis from './screens/Diagnosis.tsx';
import KnowledgeMap from './screens/KnowledgeMap.tsx';
import Notebook from './screens/Notebook.tsx';
import Progress from './screens/Progress.tsx';
import CourseSelect from './screens/CourseSelect.tsx';
import ParentDashboard from './screens/ParentDashboard.tsx';
import type { TrackId } from './engine/types.ts';
import AppHeader from './components/AppHeader.tsx';

type Screen = 'dashboard' | 'courses' | 'coach' | 'map' | 'notebook' | 'progress';

const TABS: { id: Screen; label: string; icon: typeof Map }[] = [
  { id: 'dashboard', label: '홈', icon: LayoutDashboard },
  { id: 'courses', label: '과정', icon: GraduationCap },
  { id: 'coach', label: 'AI코치', icon: Brain },
  { id: 'map', label: 'Math Map', icon: Map },
  { id: 'notebook', label: '오답노트', icon: NotebookPen },
  { id: 'progress', label: '성장', icon: TrendingUp },
];

function Shell() {
  const { model } = useStudent();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [inQuest, setInQuest] = useState(false);
  const [inParent, setInParent] = useState(false);
  const [diagnosingTrack, setDiagnosingTrack] = useState<TrackId | null>(null);

  // 첫 방문: 아직 어떤 과정도 진단 전이면 과정 선택부터
  const firstVisit = model.diagnosedTracks.length === 0;

  let full: ReactNode = null;
  if (diagnosingTrack) {
    full = (
      <Diagnosis
        trackId={diagnosingTrack}
        onDone={() => {
          setDiagnosingTrack(null);
          setScreen('dashboard');
        }}
        onCancel={firstVisit ? undefined : () => setDiagnosingTrack(null)}
      />
    );
  } else if (firstVisit) {
    full = <CourseSelect onStartDiagnosis={setDiagnosingTrack} onEnterTrack={() => setScreen('dashboard')} />;
  } else if (inQuest) {
    full = <QuestPlayer onExit={() => setInQuest(false)} />;
  } else if (inParent) {
    full = <ParentDashboard onBack={() => setInParent(false)} />;
  }

  if (full) {
    return (
      <div className="flex min-h-svh flex-col">
        <AppHeader />
        <div className="flex-1">{full}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <div className="flex-1 pb-20">
        {screen === 'dashboard' && <Dashboard onStartQuest={() => setInQuest(true)} onStartDiagnosis={setDiagnosingTrack} onOpenParent={() => setInParent(true)} />}
        {screen === 'courses' && <CourseSelect onStartDiagnosis={setDiagnosingTrack} onEnterTrack={() => setScreen('dashboard')} />}
        {screen === 'coach' && (
          <div className="mx-auto max-w-md px-4 py-6 md:max-w-2xl">
            <Engine2Coach />
          </div>
        )}
        {screen === 'map' && <KnowledgeMap />}
        {screen === 'notebook' && <Notebook />}
        {screen === 'progress' && <Progress />}
      </div>
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = screen === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setScreen(t.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${active ? 'text-indigo-500' : 'text-slate-400'}`}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StudentProvider>
      <Engine2Provider>
        <div className="min-h-svh bg-gradient-to-b from-sky-50 via-[#f4f7fd] to-violet-50/60 text-slate-800">
          <Shell />
        </div>
      </Engine2Provider>
    </StudentProvider>
  );
}
