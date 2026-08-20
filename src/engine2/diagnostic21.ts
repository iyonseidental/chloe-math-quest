// CHLOE MATH 2.1 — Step 12: Adaptive Diagnostic (오케스트레이터 위의 정책 계층).
//
// ARCHITECTURE-2.1.md는 이 단계를 PART Q 항목명("Adaptive Diagnostic (오케스트레이터 위)")
// 외에 별도 명세 없이 남겨두었다 (완료 보고서 PART L에서 확인·기록). 본 구현은 문서의
// 기존 원칙들을 재조합해 정의한다 — 신규 엔진이 아니라 기존 부품의 정책 계층이다:
//   · PART D-3: 진단 배치는 p를 '설정'하지 않고 의사관측을 '추가'한다 (통과 시 α+=1.8, β+=0.6)
//     — 진단만으로는 confidence LOW를 넘지 못하고, EXPOSED 상태에 머문다.
//   · PART E (Unknown ≠ Weak): 실패한 스킬의 하류(dependents)는 "약함"으로 기록하지 않고
//     그냥 검사만 생략한다(SKIPPED_LOW) — 부정 증거를 조작해 넣지 않는다.
//   · PART L (정보 효율): 통과한 스킬의 상류(prerequisites)는 재검사하지 않고 약한 긍정
//     의사관측만 추가한다(INFERRED_PASS) — 그래프 구조가 문항을 절약한다.
//   · PART N (Raw Event Ledger): 모든 진단 판단은 트윈(=이벤트 fold 결과)의 순수 함수로만
//     도출되고, 모든 부수효과는 ATTEMPT/DIAGNOSTIC_PLACEMENT 이벤트로만 발생한다.
//     따라서 진단 세션 자체가 별도 상태 없이 리플레이로 완전 재구성된다.
//
// 흐름(이분탐색형): 중간 깊이 프런티어에서 시작 → 스킬당 최대 2문항(d3, 그 결과에 따라
// d4/d2) → 통과 시 상류 전체 추론 처리(상승), 실패 시 직계 상류로 하강 + 하류 생략.
// 종료: 미해결 스킬 소진 또는 문항 예산 소진.
import { CONFIG21 } from './config21.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP, prerequisitesOf } from './curriculum21.ts';
import type { DigitalTwin21 } from './types21.ts';
import type { EventLog } from './events21.ts';
import { submitDiagnosticPlacement, type NextAction } from './session21.ts';

// ---------------------------------------------------------------------------
// 그래프 유틸 — 위상 깊이와 이행적 상·하류
// ---------------------------------------------------------------------------
export function topoDepth(skillId: string, seen: Set<string> = new Set()): number {
  const prereqs = prerequisitesOf(skillId);
  if (prereqs.length === 0) return 0;
  if (seen.has(skillId)) return 0; // 사이클 방어 (파일럿 그래프는 DAG)
  seen.add(skillId);
  return 1 + Math.max(...prereqs.map((p) => topoDepth(p, seen)));
}

export function transitivePrerequisites(skillId: string): string[] {
  const out = new Set<string>();
  const stack = [...prerequisitesOf(skillId)];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...prerequisitesOf(id));
  }
  return [...out];
}

export function transitiveDependents(skillId: string): string[] {
  const out = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of ALL_SKILL_IDS) {
      if (out.has(id)) continue;
      const prereqs = prerequisitesOf(id);
      if (prereqs.includes(skillId) || prereqs.some((p) => out.has(p))) {
        out.add(id);
        changed = true;
      }
    }
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// 분류 및 파생 실행 상태 — 전부 트윈의 순수 함수 (별도 세션 상태 없음)
// ---------------------------------------------------------------------------
export type DiagnosticClass =
  | 'TESTED_PASS' // 2/2 — 배치 d4
  | 'TESTED_PARTIAL' // 1/2 — 배치 d2~3, 상류는 검사 대상으로 남김
  | 'TESTED_FAIL' // 0/2 — 배치 d1, 직계 상류 하강, 하류 생략
  | 'INFERRED_PASS' // 하류 통과로부터 추론 — 약한 의사관측만 (직접 검사 안 함)
  | 'SKIPPED_LOW' // 상류 실패로 검사 생략 — 부정 증거 없음 (Unknown ≠ Weak)
  | 'PENDING' // 검사 대상으로 확정되었으나 아직 미검사
  | 'UNRESOLVED' // 아직 어떤 판단도 닿지 않음
  | 'UNTESTED_BUDGET'; // 예산 소진으로 미검사 종료

export interface SkillDiagnosis {
  skillId: string;
  classification: DiagnosticClass;
  questionsUsed: number;
  correctCount: number;
  placementDifficulty: number | null; // 확정 시 currentDifficulty로 반영될 값
  reason: string;
}

export interface DiagnosticRun {
  perSkill: Record<string, SkillDiagnosis>;
  questionsUsed: number;
  testedOrder: string[]; // 첫 문항 ts 기준 — 리플레이 결정론의 근거
}

interface TestedOutcome {
  skillId: string;
  results: boolean[]; // 문항별 정오 (ts 순)
  firstTs: number;
}

function collectTestedOutcomes(twin: DigitalTwin21): TestedOutcome[] {
  const out: TestedOutcome[] = [];
  for (const skillId of ALL_SKILL_IDS) {
    const attempts = twin.skills[skillId].recentWindow.filter((a) => a.mode === 'diagnostic').sort((a, b) => a.ts - b.ts);
    if (attempts.length > 0) out.push({ skillId, results: attempts.map((a) => a.correct), firstTs: attempts[0].ts });
  }
  return out.sort((a, b) => a.firstTs - b.firstTs);
}

function placementFor(correctCount: number, questions: number): { cls: DiagnosticClass; placement: number; reason: string } {
  if (questions >= 2 && correctCount === 2) return { cls: 'TESTED_PASS', placement: 4, reason: '진단 2/2 통과 — d4 배치, 상류는 추론 처리' };
  if (questions >= 2 && correctCount === 1) return { cls: 'TESTED_PARTIAL', placement: 2, reason: '진단 1/2 — d2 배치, 상류는 직접 확인 대상' };
  if (questions >= 2) return { cls: 'TESTED_FAIL', placement: 1, reason: '진단 0/2 — d1 배치, 직계 상류로 하강·하류 생략' };
  return { cls: 'PENDING', placement: null as unknown as number, reason: '검사 진행 중' };
}

// 트윈에서 진단 실행 상태 전체를 재구성한다. 검사된 스킬들의 (ts 순) 결과에 분류 규칙을
// 재적용하는 결정론적 캐스케이드이므로, 라이브 중이든 리플레이 후든 같은 트윈이면 같은
// 실행 상태가 나온다 — 진단 세션에 숨은 상태가 없음을 구조적으로 보장.
export function deriveDiagnosticRun(twin: DigitalTwin21): DiagnosticRun {
  const perSkill: Record<string, SkillDiagnosis> = {};
  for (const id of ALL_SKILL_IDS) {
    perSkill[id] = { skillId: id, classification: 'UNRESOLVED', questionsUsed: 0, correctCount: 0, placementDifficulty: null, reason: '아직 판단 없음' };
  }

  const tested = collectTestedOutcomes(twin);
  let questionsUsed = 0;

  for (const t of tested) {
    const entry = perSkill[t.skillId];
    const correct = t.results.filter(Boolean).length;
    questionsUsed += t.results.length;
    entry.questionsUsed = t.results.length;
    entry.correctCount = correct;

    const verdict = placementFor(correct, t.results.length);
    entry.classification = verdict.cls;
    entry.reason = verdict.reason;
    if (verdict.cls !== 'PENDING') entry.placementDifficulty = verdict.placement;

    if (verdict.cls === 'TESTED_PASS') {
      // 상승: 이행적 상류 전체를 추론 통과 처리 (이미 직접 검사된 스킬은 그대로 둔다)
      for (const up of transitivePrerequisites(t.skillId)) {
        if (perSkill[up].classification === 'UNRESOLVED' || perSkill[up].classification === 'PENDING' || perSkill[up].classification === 'SKIPPED_LOW') {
          perSkill[up] = { ...perSkill[up], classification: 'INFERRED_PASS', placementDifficulty: 3, reason: `하류 "${t.skillId}" 통과로부터 추론 — 약한 긍정 의사관측만 추가` };
        }
      }
    } else if (verdict.cls === 'TESTED_FAIL') {
      // 하강: 직계 상류를 검사 대상으로. 하류는 검사 생략 (부정 증거 조작 없음)
      for (const up of prerequisitesOf(t.skillId)) {
        if (perSkill[up].classification === 'UNRESOLVED') {
          perSkill[up] = { ...perSkill[up], classification: 'PENDING', reason: `"${t.skillId}" 실패로 하강 — 직접 확인 필요` };
        }
      }
      for (const down of transitiveDependents(t.skillId)) {
        if (perSkill[down].classification === 'UNRESOLVED' || perSkill[down].classification === 'PENDING') {
          perSkill[down] = { ...perSkill[down], classification: 'SKIPPED_LOW', reason: `상류 "${t.skillId}" 실패 — 검사 생략 (Unknown≠Weak: 부정 증거는 기록하지 않음)` };
        }
      }
    } else if (verdict.cls === 'TESTED_PARTIAL') {
      for (const up of prerequisitesOf(t.skillId)) {
        if (perSkill[up].classification === 'UNRESOLVED') {
          perSkill[up] = { ...perSkill[up], classification: 'PENDING', reason: `"${t.skillId}" 부분 통과 — 상류 직접 확인` };
        }
      }
    }
  }

  return { perSkill, questionsUsed, testedOrder: tested.map((t) => t.skillId) };
}

// ---------------------------------------------------------------------------
// 다음 진단 문항 결정 — nextAction과 동일한 "행동 + 사유" 계약 (§6 감사 출력)
// ---------------------------------------------------------------------------
export interface DiagnosticStep {
  done: boolean;
  action: NextAction | null;
  run: DiagnosticRun;
  reason: string;
}

export const DIAGNOSTIC_BUDGET_DEFAULT = 16;

function selectableSkills(run: DiagnosticRun): string[] {
  return ALL_SKILL_IDS.filter((id) => {
    const c = run.perSkill[id].classification;
    return c === 'UNRESOLVED' || c === 'PENDING';
  });
}

export function nextDiagnosticStep(twin: DigitalTwin21, budget: number = DIAGNOSTIC_BUDGET_DEFAULT): DiagnosticStep {
  const run = deriveDiagnosticRun(twin);

  // 진행 중인 스킬(1문항만 검사됨)이 있으면 그 두 번째 문항이 최우선 — 스킬 판정을 반쯤
  // 열어둔 채 다른 스킬로 건너뛰지 않는다.
  const inProgress = ALL_SKILL_IDS.find((id) => run.perSkill[id].classification === 'PENDING' && run.perSkill[id].questionsUsed === 1);
  if (inProgress && run.questionsUsed < budget) {
    const firstCorrect = twin.skills[inProgress].recentWindow.filter((a) => a.mode === 'diagnostic').sort((a, b) => a.ts - b.ts)[0].correct;
    const difficulty = firstCorrect ? 4 : 2;
    return {
      done: false,
      run,
      action: { kind: 'diagnostic', skillId: inProgress, difficulty, variant: 'standard', reason: firstCorrect ? '1문항 정답 — 한 단계 위(d4)로 확인' : '1문항 오답 — 한 단계 아래(d2)로 확인' },
      reason: '진행 중 스킬의 2번째 확인 문항',
    };
  }

  const candidates = selectableSkills(run);
  if (candidates.length === 0) {
    return { done: true, action: null, run, reason: '모든 스킬이 판정(직접 검사/추론/생략)됨 — 진단 종료' };
  }
  if (run.questionsUsed >= budget) {
    return { done: true, action: null, run, reason: `문항 예산(${budget}) 소진 — 잔여 스킬은 UNTESTED_BUDGET로 종료` };
  }

  // PENDING(하강/확인 지시가 걸린 스킬)이 있으면 그것부터; 없으면 미해결 중 중간 깊이
  // 프런티어부터 (이분탐색 시작점). 동순위는 커리큘럼 중요도 → skillId로 결정론 고정.
  const pending = candidates.filter((id) => run.perSkill[id].classification === 'PENDING');
  let pool = pending;
  let poolReason = '하강/확인 지시가 걸린 스킬 우선';
  if (pool.length === 0) {
    // Phase 2 (35스킬 그래프): 깊이 최대 우선 — 사슬 꼭대기를 통과하면 이행적 상류 전체가
    // 추론 처리되어 문항 레버리지가 최대다. 실패 시에는 어차피 직계 전제로 하강(PENDING)
    // 하므로 약한 학생의 비용은 중간-시작과 대등하고, 강한 학생의 커버리지가 크게 는다.
    // (파일럿 10스킬 시절의 중간-깊이 이분탐색을 대체 — 35스킬 5영역 병렬 구조에 맞춘 조정.)
    const maxDepth = Math.max(...candidates.map((id) => topoDepth(id)));
    pool = candidates.filter((id) => topoDepth(id) === maxDepth);
    poolReason = `미해결 스킬 최대 깊이(${maxDepth}) 프런티어에서 시작 (통과 시 상류 전체 추론)`;
  }
  // Phase 2 (그래프 35스킬·5영역): 영역 균형 — 판정이 가장 적게 진행된 영역을 우선한다.
  // 병렬 영역 구조에서는 한 영역의 추론이 다른 영역을 못 덮으므로, 예산을 영역에 고르게
  // 배분해야 배치 결과가 PART 12의 영역별 프로필로 쓸 수 있다.
  const resolvedByDomain: Record<string, number> = {};
  for (const id of ALL_SKILL_IDS) {
    const cls = run.perSkill[id].classification;
    if (cls !== 'UNRESOLVED' && cls !== 'PENDING') {
      const dom = MICRO_SKILL_MAP[id].domain;
      resolvedByDomain[dom] = (resolvedByDomain[dom] ?? 0) + 1;
    }
  }
  pool.sort((a, b) => {
    const da = resolvedByDomain[MICRO_SKILL_MAP[a].domain] ?? 0;
    const db = resolvedByDomain[MICRO_SKILL_MAP[b].domain] ?? 0;
    return da - db || (MICRO_SKILL_MAP[b].importance ?? 1) - (MICRO_SKILL_MAP[a].importance ?? 1) || a.localeCompare(b);
  });
  const skillId = pool[0];

  return {
    done: false,
    run,
    action: { kind: 'diagnostic', skillId, difficulty: 3, variant: 'standard', reason: `${poolReason} — "${MICRO_SKILL_MAP[skillId].nameKo}" 1번째 확인 문항(d3)` },
    reason: poolReason,
  };
}

// ---------------------------------------------------------------------------
// 종료 처리 — 추론/배치를 이벤트로 확정 (전부 DIAGNOSTIC_PLACEMENT, 리플레이 무손실)
// ---------------------------------------------------------------------------
export interface DiagnosticReport {
  perSkill: SkillDiagnosis[];
  questionsUsed: number;
  budget: number;
  testedCount: number;
  inferredCount: number;
  skippedCount: number;
}

export function finalizeDiagnostic(
  twin: DigitalTwin21,
  log: EventLog,
  budget: number = DIAGNOSTIC_BUDGET_DEFAULT,
  tsOverride?: number,
): { twin: DigitalTwin21; log: EventLog; report: DiagnosticReport } {
  const run = deriveDiagnosticRun(twin);
  let t = twin;
  let l = log;
  const cfg = CONFIG21.diagnostic;

  for (const id of ALL_SKILL_IDS) {
    const d = run.perSkill[id];
    if (d.classification === 'INFERRED_PASS') {
      // PART D-3 그대로: 추론 통과 = 약한 긍정 의사관측 추가. 직접 검사 증거보다 훨씬
      // 작아서 confidence는 VERY_LOW/LOW에 머문다 (조기 확정 구조적으로 불가).
      const r = submitDiagnosticPlacement(t, l, id, d.placementDifficulty ?? 3, cfg.inferredSeedAlpha, cfg.inferredSeedBeta, tsOverride);
      t = r.twin;
      l = r.log;
    } else if ((d.classification === 'TESTED_PASS' || d.classification === 'TESTED_PARTIAL' || d.classification === 'TESTED_FAIL') && d.placementDifficulty !== null) {
      // 직접 검사 스킬: 증거는 이미 실제 ATTEMPT 이벤트로 반영되어 있으므로 여기서는
      // 시작 난이도만 확정한다 (seed 0/0 — 가짜 증거 추가 없음).
      const r = submitDiagnosticPlacement(t, l, id, d.placementDifficulty, 0, 0, tsOverride);
      t = r.twin;
      l = r.log;
    }
  }

  const finalRun = deriveDiagnosticRun(t);
  const perSkill = ALL_SKILL_IDS.map((id) => {
    const d = finalRun.perSkill[id];
    if (d.classification === 'UNRESOLVED' || d.classification === 'PENDING') {
      return { ...d, classification: 'UNTESTED_BUDGET' as DiagnosticClass, reason: '예산 내 미도달 — 이후 일반 학습에서 자연 관측' };
    }
    return d;
  });

  return {
    twin: t,
    log: l,
    report: {
      perSkill,
      questionsUsed: finalRun.questionsUsed,
      budget,
      testedCount: perSkill.filter((d) => d.classification.startsWith('TESTED')).length,
      inferredCount: perSkill.filter((d) => d.classification === 'INFERRED_PASS').length,
      skippedCount: perSkill.filter((d) => d.classification === 'SKIPPED_LOW').length,
    },
  };
}
