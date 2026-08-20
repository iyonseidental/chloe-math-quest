// Step 13 — AI 코치 홈. 트윈(Digital Math Twin)의 파생상태를 그대로 시각화한다.
// §3 요건 준수: 이 화면의 모든 숫자·배지·추천은 엔진 파생값이며, 하드코딩 진행률이 없다.
import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Brain, CalendarClock, Play, RotateCcw, Stethoscope } from 'lucide-react';
import { useEngine2 } from '../context/Engine2Context.tsx';
import Engine2Diagnosis from './Engine2Diagnosis.tsx';
import Engine2Player from './Engine2Player.tsx';
import Engine2Parent from './Engine2Parent.tsx';
import Engine2Golden from './Engine2Golden.tsx';
import Engine2Backup from './Engine2Backup.tsx';
import { eliteDimensionLevel, domainReadiness } from '../engine2/elite22.ts';
import type { EliteDimension } from '../engine2/elite22.ts';
import { nextAction } from '../engine2/session21.ts';
import { readMastery } from '../engine2/mastery21.ts';
import { isReviewDue } from '../engine2/retention21.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP } from '../engine2/curriculum21.ts';
import type { KnowledgeState } from '../engine2/types21.ts';
import { ProgressBar, StatTile, WhyChip } from '../components/ui.tsx';

const STATE_META: Record<KnowledgeState, { label: string; cls: string }> = {
  UNSEEN: { label: '미학습', cls: 'bg-slate-100 text-slate-500' },
  EXPOSED: { label: '진단만', cls: 'bg-slate-100 text-slate-500' },
  LEARNING: { label: '배우는 중', cls: 'bg-sky-50 text-sky-600' },
  PRACTICING: { label: '연습 중', cls: 'bg-sky-100 text-sky-700' },
  PROVISIONAL: { label: '잠정 숙달', cls: 'bg-indigo-100 text-indigo-700' },
  EARLY_MASTERY: { label: '초기 숙달', cls: 'bg-violet-100 text-violet-700' },
  MASTERED: { label: '숙달', cls: 'bg-emerald-100 text-emerald-700' },
  STABLE_MASTERY: { label: '안정 숙달', cls: 'bg-emerald-200 text-emerald-800' },
  WEAKENED: { label: '약화됨', cls: 'bg-rose-100 text-rose-700' },
};

const CONFIDENCE_LABEL: Record<string, string> = {
  VERY_LOW: '확신 매우 낮음',
  LOW: '확신 낮음',
  MEDIUM: '확신 보통',
  HIGH: '확신 높음',
  VERY_HIGH: '확신 매우 높음',
};

// PART 35 — 학생 화면용 5개 축약 차원 (복잡한 통계 대신)
const STUDENT_DIMS: { label: string; dims: EliteDimension[] }[] = [
  { label: '문제 구조 보기', dims: ['representation'] },
  { label: '전략 고르기', dims: ['strategySelection', 'flexibility'] },
  { label: '개념 연결', dims: ['integration'] },
  { label: '새로운 문제', dims: ['novelTransfer', 'generalization'] },
  { label: '설명하기', dims: ['explanation', 'justification'] },
];

export default function Engine2Coach() {
  const { twin, resetAll, replayCheck } = useEngine2();
  const [view, setView] = useState<'home' | 'diagnosis' | 'play' | 'parent' | 'backup'>('home');
  const [goldenFormId, setGoldenFormId] = useState<'A' | 'B' | 'C' | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const hasAnyEvidence = ALL_SKILL_IDS.some((id) => twin.skills[id].attempts > 0 || twin.skills[id].knowledgeState !== 'UNSEEN');
  const rows = useMemo(
    () =>
      ALL_SKILL_IDS.map((id) => {
        const s = twin.skills[id];
        const m = readMastery(s.alpha, s.beta, s.lastPracticedAt, today);
        return { id, s, m, due: isReviewDue(s.retention, today) };
      }),
    [twin, today],
  );

  const preview = useMemo(() => (hasAnyEvidence ? nextAction(twin, today) : null), [twin, today, hasAnyEvidence]);
  const openCases = twin.remediationCases.filter((c) => c.stage !== 'resolved' && c.stage !== 'abandoned');
  const activeMis = twin.misconceptions.filter((m) => m.status === 'ACTIVE' || m.status === 'SUSPECTED' || m.status === 'CONFIRMING');
  const gated = rows.filter((r) => ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'].includes(r.s.knowledgeState)).length;
  const dueCount = rows.filter((r) => r.due).length;
  const avgP = rows.reduce((a, r) => a + r.m.p, 0) / rows.length;
  const replayOk = useMemo(() => replayCheck(), [twin]); // eslint-disable-line react-hooks/exhaustive-deps
  // PART 48 — 성취 프레임: 생산적 분투와 전환-성공 횟수 (Speed Score 아님)
  const deepThinks = twin.strategyTraces.filter((t) => t.struggleQuality === 'PRODUCTIVE_STRUGGLE').length;
  const newSolutions = twin.strategyTraces.filter((t) => t.solved && t.strategySwitches > 0).length;

  if (view === 'diagnosis') return <Engine2Diagnosis onDone={() => setView('home')} onCancel={hasAnyEvidence ? () => setView('home') : undefined} />;
  if (view === 'play') return <Engine2Player onExit={() => setView('home')} />;
  if (goldenFormId) return <Engine2Golden form={goldenFormId} onDone={() => setGoldenFormId(null)} />;
  if (view === 'backup') return <Engine2Backup onBack={() => setView('parent')} />;
  if (view === 'parent') return <Engine2Parent onBack={() => setView('home')} onStartGolden={(f) => setGoldenFormId(f)} onOpenBackup={() => setView('backup')} />;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-5 text-white shadow-lg shadow-indigo-200/60">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-14 -left-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
              <Brain className="h-5 w-5" /> AI 코치 <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">엔진 2.3</span>
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-indigo-100">
              오늘의 한 문제가 내일의 실력이 돼요 🚀
              <br />
              중1 전체 35개 스킬 + Elite Thinking — 모든 판단은 학습 기록의 재생으로 계산돼요
            </p>
          </div>
          <button type="button" onClick={resetAll} className="rounded-lg p-1.5 text-indigo-200 hover:bg-white/10" aria-label="초기화">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!hasAnyEvidence ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-5">
          <p className="text-sm font-semibold text-slate-700">먼저 적응 진단으로 시작 지점을 찾아요</p>
          <p className="text-xs leading-relaxed text-slate-500">
            그래프를 따라 필요한 스킬만 확인해요 — 잘하면 위로 건너뛰고, 막히면 기초로 내려가요. 최대 16문항.
          </p>
          <button type="button" onClick={() => setView('diagnosis')} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 py-3 text-sm font-bold text-white">
            <Stethoscope className="h-4 w-4" /> 진단 시작
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="평균 숙달" value={`${(avgP * 100).toFixed(0)}%`} accent />
            <StatTile label="숙달 게이트 통과" value={`${gated}/${rows.length}`} />
            <StatTile label="오늘 복습" value={dueCount} sub={openCases.length > 0 ? `치료 중 ${openCases.length}건` : undefined} />
          </div>

          {/* Phase 3 PART 48 — 학생 화면은 성취의 언어로: 정복/도전/깊은 생각/새 풀이 */}
          {(deepThinks > 0 || newSolutions > 0) && (
            <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-700">
              <span>🌱</span>
              <div>
                {deepThinks > 0 && <div>깊게 생각한 문제 <b>{deepThinks}개</b> — 오래 고민한 만큼 실력이 자라요</div>}
                {newSolutions > 0 && <div>새로운 풀이 발견 <b>{newSolutions}번</b> — 다른 길을 찾아냈어요!</div>}
              </div>
            </div>
          )}

          {preview && (
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Activity className="h-4 w-4 text-sky-500" /> 다음 추천 — {MICRO_SKILL_MAP[preview.skillId]?.nameKo ?? preview.skillId}
              </div>
              <WhyChip reason={preview.reason} />
              <button type="button" onClick={() => setView('play')} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-200 transition hover:scale-[1.015] hover:shadow-lg active:scale-100">
                <Play className="h-4 w-4" /> 오늘의 도전 시작!
              </button>
            </div>
          )}

          {activeMis.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" /> 확인 중인 오개념
              </div>
              {activeMis.map((m) => (
                <div key={m.misconceptionId} className="text-[11px] text-amber-700">
                  {MICRO_SKILL_MAP[m.skillId]?.nameKo} — {m.status === 'ACTIVE' ? '확정: 표적 치료 중' : '의심: 확인 문항 진행'}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-slate-700">스킬별 디지털 트윈</h2>
            <div className="grid gap-2 md:grid-cols-2">
            {rows.map(({ id, s, m, due }) => {
              const meta = STATE_META[s.knowledgeState];
              return (
                <div key={id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-700">{MICRO_SKILL_MAP[id]?.nameKo ?? id}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar value={m.p * 100} className="flex-1" />
                    <span className="w-9 text-right text-[11px] font-semibold text-slate-500">{(m.p * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {CONFIDENCE_LABEL[m.confidence]} · 증거 {m.effectiveEvidence.toFixed(0)}
                    </span>
                    {s.retention.nextReviewAt && (
                      <span className={`flex items-center gap-1 ${due ? 'font-bold text-rose-500' : ''}`}>
                        <CalendarClock className="h-3 w-3" /> 복습 {s.retention.nextReviewAt}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-slate-700">Elite Thinking</h2>
            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {['NUM', 'ALG', 'FUN', 'GEO', 'STA'].map((dom) => {
                  const tier = domainReadiness(twin, dom);
                  return (
                    <span key={dom} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tier === 'ELITE' ? 'bg-violet-500 text-white' : tier === 'ADVANCED' ? 'bg-sky-200 text-sky-800' : 'bg-slate-200 text-slate-500'}`}>
                      {dom} {tier === 'ELITE' ? '도전!' : tier === 'ADVANCED' ? '준비 중' : '기초'}
                    </span>
                  );
                })}
              </div>
              {STUDENT_DIMS.map(({ label, dims }) => {
                const stats = dims.map((d) => eliteDimensionLevel(twin.elite[d]));
                const ev = stats.reduce((a, s) => a + s.evidence, 0);
                const level = stats.reduce((a, s) => a + s.level, 0) / stats.length;
                return (
                  <div key={label} className="mt-1 flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[11px] font-semibold text-slate-600">{label}</span>
                    <ProgressBar value={ev < 2 ? 0 : level * 100} className="flex-1" color="bg-gradient-to-r from-violet-400 to-indigo-500" />
                    <span className="w-14 text-right text-[10px] text-slate-400">{ev < 2 ? '탐험 전' : `Lv ${(level * 100).toFixed(0)}`}</span>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setView('parent')} className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-500 hover:border-slate-300">
              학부모 리포트 보기
            </button>
          </div>

          <div className={`rounded-xl px-3 py-2 text-[10px] ${replayOk ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {replayOk
              ? `이벤트 재생 검증 통과 — 기록 ${twin.seq + 1 > 0 ? twin.seq + 1 : 0}개 이벤트에서 상태 무손실 재구성됨`
              : '경고: 이벤트 재생 불일치 — 저장 데이터 점검 필요'}
          </div>
        </>
      )}
    </div>
  );
}
