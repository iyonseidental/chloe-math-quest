// Step 22 — 학부모 분석 (PART 36). "중2 선행 중"이라는 한 줄보다 훨씬 많은 것을 구별해 보여준다:
// 영역별 진도 / Core Mastery / Advanced 수준 / Elite Thinking 프로필 / 교정된 학습 구멍 /
// 보존(Retention) / 가속 준비도 / 현재 제한 요인. 전부 트윈 파생값 — 하드코딩 0.
import { useMemo } from 'react';
import { ArrowLeft, Brain, ClipboardCheck, Database, ShieldCheck, TrendingUp, Wrench } from 'lucide-react';
import { useEngine2 } from '../context/Engine2Context.tsx';
import { readMastery } from '../engine2/mastery21.ts';
import { eliteDimensionLevel, domainReadiness, ELITE_DIMENSIONS, type EliteDimension } from '../engine2/elite22.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP } from '../engine2/curriculum21.ts';
import { ProgressBar, StatTile } from '../components/ui.tsx';
import { analyzePilot } from '../engine2/pilot23.ts';
import { computeGrowthReport } from '../engine2/growth23.ts';
import type { GoldenForm } from '../engine2/goldenSet23.ts';

const GROWTH_LABEL: Record<string, string> = { CORE: '기본 개념', NEAR_TRANSFER: '가까운 응용', FAR_TRANSFER: '먼 전이', ELITE: 'Elite 사고' };

const DOMAIN_LABEL: Record<string, string> = { NUM: '수와 연산', ALG: '문자와 식', FUN: '함수·그래프', GEO: '도형', STA: '통계' };
const DIM_LABEL: Record<EliteDimension, string> = {
  representation: '문제 표현 전환',
  strategySelection: '전략 선택',
  integration: '개념 연결',
  novelTransfer: '처음 보는 문제',
  flexibility: '전략 전환 유연성',
  explanation: '설명하기',
  generalization: '일반화',
  reverseReasoning: '거꾸로 추론',
  justification: '근거 세우기',
};
const TIER_LABEL = { FOUNDATION: '기초 다지기', ADVANCED: '심화 준비', ELITE: 'Elite 도전 가능' } as const;

export default function Engine2Parent({ onBack, onStartGolden, onOpenBackup }: { onBack: () => void; onStartGolden: (form: GoldenForm) => void; onOpenBackup: () => void }) {
  const { twin, log } = useEngine2();
  const today = new Date().toISOString().slice(0, 10);
  const pilot = useMemo(() => analyzePilot(log), [log]);
  const growth = useMemo(() => computeGrowthReport(twin, log), [twin, log]);

  const rows = useMemo(() => {
    const GATED = ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'];
    return ['NUM', 'ALG', 'FUN', 'GEO', 'STA'].map((dom) => {
      const ids = ALL_SKILL_IDS.filter((id) => MICRO_SKILL_MAP[id].domain === dom);
      const ms = ids.map((id) => readMastery(twin.skills[id].alpha, twin.skills[id].beta, twin.skills[id].lastPracticedAt, today));
      const core = ms.reduce((a, m) => a + m.p, 0) / ids.length;
      const gated = ids.filter((id) => GATED.includes(twin.skills[id].knowledgeState)).length;
      const rel = ids.reduce((a, id) => a + twin.skills[id].retention.reliability, 0) / ids.length;
      return { dom, core, gated, total: ids.length, tier: domainReadiness(twin, dom), reliability: rel };
    });
  }, [twin, today]);

  const dims = ELITE_DIMENSIONS.map((d) => ({ d, ...eliteDimensionLevel(twin.elite[d]) }));
  const measured = dims.filter((x) => x.evidence >= 2);
  const limiting = measured.length ? measured.reduce((a, b) => (a.level < b.level ? a : b)) : null;
  const gapsFixed = twin.remediationCases.filter((c) => c.stage === 'resolved').length;
  const gapsReopened = twin.remediationCases.filter((c) => c.gapClosureQuality === 'REOPENED').length;
  const accel = rows.filter((r) => r.tier === 'ELITE').length;

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onBack} className="mt-0.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="뒤로">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">학부모 리포트</h1>
          <p className="text-xs text-slate-500">진도·숙달·사고력을 분리해서 보여드려요 — 진도만으로는 알 수 없는 것들</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="교정된 학습 구멍" value={gapsFixed} sub={gapsReopened ? `재발 ${gapsReopened}건 재치료` : '재발 0'} accent />
        <StatTile label="Elite 도전 개방 영역" value={`${accel}/5`} />
        <StatTile label="심화 도전 기록" value={twin.strategyTraces.length} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <TrendingUp className="h-4 w-4 text-sky-500" /> 영역별 진도 × 깊이 (Double Helix)
        </h2>
        {rows.map((r) => (
          <div key={r.dom} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{DOMAIN_LABEL[r.dom]}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.tier === 'ELITE' ? 'bg-violet-100 text-violet-700' : r.tier === 'ADVANCED' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>{TIER_LABEL[r.tier]}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <ProgressBar value={r.core * 100} className="flex-1" />
              <span className="w-20 text-right text-[11px] text-slate-500">Core {(r.core * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>숙달 게이트 {r.gated}/{r.total}</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> 보존 신뢰도 {(r.reliability * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <Brain className="h-4 w-4 text-violet-500" /> Elite Thinking 프로필
        </h2>
        {dims.map(({ d, level, evidence }) => (
          <div key={d} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">{DIM_LABEL[d]}</span>
              <span className="text-slate-400">{evidence < 2 ? '아직 관찰 부족' : `Lv ${(level * 100).toFixed(0)}`}</span>
            </div>
            <ProgressBar value={evidence < 2 ? 0 : level * 100} className="mt-1" color="bg-gradient-to-r from-violet-400 to-indigo-500" />
          </div>
        ))}
      </div>

      {limiting && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed text-amber-700">
            <span className="font-bold">현재 제한 요인: {DIM_LABEL[limiting.d]}</span>
            <br />
            문제를 푸는 힘보다 이 능력이 지금 성장의 병목이에요. Elite 도전에서 이 부분의 후속 질문이 자동으로 더 배정됩니다.
          </div>
        </div>
      )}

      {/* Phase 3 PART 44/45 — REAL DATA (실사용 계측; synthetic과 절대 혼합 표기하지 않음) */}
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <Database className="h-4 w-4 text-emerald-500" /> REAL DATA — 실사용 계측
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="유효 학습 세션" value={pilot.validSessions} sub={`총 ${pilot.sessions.length}회 접속`} />
          <StatTile label="학습 시간" value={`${pilot.learningMinutes}분`} sub={`${pilot.pilotDays}일`} />
          <StatTile label="총 시도" value={pilot.totalAttempts} sub={`${pilot.skillsObserved}개 스킬 관찰`} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="복습 검증" value={pilot.retentionChecks} />
          <StatTile label="전이 검증" value={pilot.transferChecks} />
          <StatTile label="Elite 시도" value={pilot.eliteAttempts} />
        </div>
        <div className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${pilot.calibrationCoverage === 'SUFFICIENT' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : pilot.calibrationCoverage === 'MEDIUM' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
          <span className="font-bold">캘리브레이션 데이터 커버리지: {pilot.calibrationCoverage}</span>
          <br />
          {pilot.coverageReason}
        </div>
      </div>

      {/* Phase 3 PART 24-30/46 — Golden Set 성장 측정 (훈련과 완전 분리) */}
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <ClipboardCheck className="h-4 w-4 text-violet-500" /> 성장 측정 (Golden Set)
        </h2>
        <p className="text-[11px] leading-relaxed text-slate-400">
          훈련에 절대 쓰이지 않는 독립 평가예요. 시작·중간·종료 시점에 서로 다른 폼(A/B/C)으로 실력 변화를 측정합니다. 결과는 학습 추천에 영향을 주지 않아요.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(['A', 'B', 'C'] as const).map((f) => (
            <button key={f} type="button" onClick={() => onStartGolden(f)} className="rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-xs font-bold text-violet-600 hover:bg-violet-100">
              Form {f} 시행
            </button>
          ))}
        </div>
        {growth.status === 'INSUFFICIENT_REAL_WORLD_DATA' ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <span className="font-bold">INSUFFICIENT REAL-WORLD DATA</span> — {growth.reason}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {growth.comparisons.filter((c) => !c.area.startsWith('ELITE:')).map((c) => (
              <div key={c.area} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">{GROWTH_LABEL[c.area] ?? c.area}</span>
                  <span className={`font-bold ${c.deltaRate > 0 ? 'text-emerald-600' : c.deltaRate < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                    {(c.baseline.rate * 100).toFixed(0)}% → {(c.post.rate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  Form {c.baseline.form} {c.baseline.n}문항 → Form {c.post.form} {c.post.n}문항 · {c.confident ? '표본상 유의미한 변화' : '표본이 작아 확정적이지 않음'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 백업 지시 PART 66 — DATA & BACKUP 메뉴 */}
      <button type="button" onClick={onOpenBackup} className="flex items-center justify-between rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 text-left transition hover:border-indigo-400">
        <span>
          <span className="block text-sm font-extrabold text-slate-800">DATA &amp; BACKUP</span>
          <span className="block text-[11px] text-slate-500">학습 기록 백업 · 복원 · ChatGPT 분석 패키지</span>
        </span>
        <span className="text-lg">🗄️</span>
      </button>
    </div>
  );
}
