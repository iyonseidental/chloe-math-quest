// CHLOE MATH 2.1 — E3: Misconception Engine (PART G, R7).
// NONE -> SUSPECTED -> CONFIRMING -> ACTIVE -> RESOLVED (or back down to NONE if confirmation
// comes back clean). A single strong-signal trigger (a registered distractor pattern) is
// enough to reach SUSPECTED, but ACTIVE — and the mastery cap that comes with it — requires
// a confirmation probe to actually agree, per QA15/QA16/AC8.
import { CONFIG21 } from './config21.ts';
import { MISCONCEPTIONS_BY_TRIGGER, MISCONCEPTION_LIBRARY } from './curriculum21.ts';
import type { MisconceptionInstance } from './types21.ts';

function freshInstance(misconceptionId: string, skillId: string, ts: number): MisconceptionInstance {
  return {
    misconceptionId,
    skillId,
    status: 'NONE',
    evidenceScore: 0,
    triggeringAttempts: [],
    confirmationAttempts: [],
    confirmPassCount: 0,
    confirmFailCount: 0,
    firstDetectedAt: new Date(ts).toISOString(),
    strongTriggerSeen: false,
  };
}

export function candidatesFor(skillId: string, errorType: string) {
  return MISCONCEPTIONS_BY_TRIGGER[`${skillId}::${errorType}`] ?? [];
}

export interface MisconceptionUpdateResult {
  instances: MisconceptionInstance[];
  newlySuspected: string[];
  newlyActive: string[];
  cleared: string[];
  confirmationNeeded: string[]; // misconceptionIds that should get confirm-mode agenda items queued
}

// Passive decay: a clean answer on a skill weakens any NONE/SUSPECTED suspicion sitting
// on that skill (does not touch CONFIRMING/ACTIVE — those follow their own paths).
function decayCleanAnswer(instances: MisconceptionInstance[], skillId: string): { instances: MisconceptionInstance[]; cleared: string[] } {
  const cleared: string[] = [];
  const next = instances.map((inst) => {
    if (inst.skillId !== skillId || !(inst.status === 'NONE' || inst.status === 'SUSPECTED')) return inst;
    const score = Math.max(0, inst.evidenceScore - CONFIG21.misconception.cleanAnswerDecay);
    if (inst.status === 'SUSPECTED' && score <= 0) {
      cleared.push(inst.misconceptionId);
      return { ...inst, evidenceScore: 0, status: 'NONE' as const };
    }
    return { ...inst, evidenceScore: score };
  });
  return { instances: next, cleared };
}

// One attempt on the trigger skill, NOT a confirmation-mode attempt.
// Phase 2 PART 5-1: 오답 선택지에 distractor 단위 misconceptionId가 태깅돼 있으면 그것이
// 1차 신호원이다 — (skillId, errorType) 근사는 미태깅 문항의 폴백으로만 쓴다.
// PART 6-D 'rolling' = 비율 순차검정: 태깅 문항의 오답(진단 기회) 중 해당 오규칙 산물을
// 고른 가중 비율이 activeRate를 넘어야 ACTIVE. "언젠가 한 번"이 아니라 "일관되게"가 기준
// — 무작위 오답자의 우연 착지(≈1/3)는 대수법칙으로 걸러진다.
export function processTriggerAttempt(
  instances: MisconceptionInstance[],
  input: {
    skillId: string;
    correct: boolean;
    errorType: string | null;
    attemptId: string;
    ts: number;
    misconceptionId?: string | null;
    diagnosticStrength?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    offeredMisconceptions?: { id: string; strength: 'HIGH' | 'MEDIUM' | 'LOW' }[];
  },
): MisconceptionUpdateResult {
  const cfg = CONFIG21.misconception;
  const decay = decayCleanAnswer(instances, input.skillId);
  let next = decay.instances;
  const newlySuspected: string[] = [];
  const newlyActive: string[] = [];
  const confirmationNeeded: string[] = [];

  // --- rolling 비율 검정: 오답이고 이 문항이 태깅 distractor를 제시했다면, 제시된 오개념
  //     각각에 기회 1 + (선택했다면) 가중 매치를 기록하고 비율로 상태를 갱신한다 ---
  if (cfg.policy === 'rolling' && !input.correct && (input.offeredMisconceptions?.length ?? 0) > 0) {
    for (const offered of input.offeredMisconceptions!) {
      const def = MISCONCEPTION_LIBRARY.find((m) => m.id === offered.id);
      if (!def) continue;
      let inst = next.find((i) => i.misconceptionId === offered.id);
      if (!inst) {
        // 인스턴스 skillId는 라이브러리의 '정식' trigger 스킬 — 레벨 창 겹침으로 다른 스킬
        // 연습 중 태그가 제시돼도(예: SIGN.02 d4가 L3 분수 문항 서빙) 캡/치료가 엉뚱한
        // 스킬에 걸리지 않게 한다 (실버그 수정: ADDDEN이 SIGN.02를 캡하던 경로)
        inst = freshInstance(offered.id, def.triggerSkillId, input.ts);
        next = [...next, inst];
      }
      if (inst.status === 'ACTIVE' || inst.status === 'RESOLVED') continue;
      const matched = input.misconceptionId === offered.id;
      const w = matched ? (input.diagnosticStrength === 'MEDIUM' ? cfg.rolling.mediumWeight : input.diagnosticStrength === 'LOW' ? cfg.rolling.mediumWeight * 0.6 : 1) : 0;
      const opportunities = (inst.ratioOpportunities ?? 0) + 1;
      const matches = (inst.ratioMatches ?? 0) + w;
      const rate = matches / opportunities;
      const fastPath = opportunities <= cfg.rolling.fastPathWindow && matches >= cfg.rolling.fastPathMatches; // 초기 창 조기판정
      const becomesActive = (opportunities >= cfg.rolling.minOpportunities && rate >= cfg.rolling.activeRate) || fastPath;
      const ratioSaysClear = opportunities >= cfg.rolling.minOpportunities && rate <= cfg.rolling.clearRate;
      const clearsNow = ratioSaysClear && (inst.status === 'SUSPECTED' || inst.status === 'CONFIRMING');
      const wasSuspected = inst.status === 'SUSPECTED' || inst.status === 'CONFIRMING';
      // 비율이 "무작위 수준"이라고 말하는 동안에는 재의심하지 않는다 (의심 churn 방지)
      const nowSuspected = matches >= cfg.suspectThreshold && !becomesActive && !ratioSaysClear;
      const updated: MisconceptionInstance = {
        ...inst,
        ratioOpportunities: opportunities,
        ratioMatches: matches,
        evidenceScore: rate, // rolling에서는 evidenceScore = 현재 매치율 (감사 표시용)
        status: becomesActive ? 'ACTIVE' : clearsNow ? 'NONE' : nowSuspected ? (inst.status === 'CONFIRMING' ? 'CONFIRMING' : 'SUSPECTED') : inst.status,
        triggeringAttempts: matched ? [...inst.triggeringAttempts, input.attemptId] : inst.triggeringAttempts,
        strongTriggerSeen: inst.strongTriggerSeen || (matched && input.diagnosticStrength === 'HIGH'),
      };
      next = next.map((i) => (i.misconceptionId === offered.id ? updated : i));
      if (becomesActive) newlyActive.push(offered.id);
      else if (nowSuspected && !wasSuspected) {
        newlySuspected.push(offered.id);
        confirmationNeeded.push(offered.id);
      }
      if (clearsNow) decay.cleared.push(offered.id);
    }
    return { instances: next, newlySuspected, newlyActive, cleared: decay.cleared, confirmationNeeded };
  }

  if (input.correct || !input.errorType) {
    return { instances: next, newlySuspected, newlyActive, cleared: decay.cleared, confirmationNeeded };
  }

  // --- 비-rolling(또는 미태깅 문항 폴백): 기존 점수 경로 ---
  const direct = input.misconceptionId ? MISCONCEPTION_LIBRARY.find((m) => m.id === input.misconceptionId) : undefined;
  const targets: { def: (typeof MISCONCEPTION_LIBRARY)[number]; score: number; strong: boolean }[] = direct
    ? [{ def: direct, score: cfg.taggedTriggerScore[input.diagnosticStrength ?? 'MEDIUM'], strong: input.diagnosticStrength === 'HIGH' }]
    : candidatesFor(input.skillId, input.errorType).map((def) => ({ def, score: cfg.strongTriggerScore, strong: false }));

  for (const t of targets) {
    let inst = next.find((i) => i.misconceptionId === t.def.id);
    if (!inst) {
      inst = freshInstance(t.def.id, t.def.triggerSkillId, input.ts);
      next = [...next, inst];
    }
    if (inst.status === 'ACTIVE') continue;
    if (inst.status === 'CONFIRMING') continue; // 확인 경로가 처리

    const score = inst.evidenceScore + t.score;
    const crossedThreshold = score >= cfg.suspectThreshold;
    const wasSuspected = inst.status === 'SUSPECTED';
    const updated: MisconceptionInstance = {
      ...inst,
      evidenceScore: score,
      status: crossedThreshold ? 'SUSPECTED' : inst.status,
      triggeringAttempts: [...inst.triggeringAttempts, input.attemptId],
      strongTriggerSeen: inst.strongTriggerSeen || t.strong,
    };
    next = next.map((i) => (i.misconceptionId === t.def.id ? updated : i));
    if (crossedThreshold && !wasSuspected) {
      newlySuspected.push(t.def.id);
      confirmationNeeded.push(t.def.id);
    }
  }

  return { instances: next, newlySuspected, newlyActive, cleared: decay.cleared, confirmationNeeded };
}

// A confirm-mode attempt targeting a specific SUSPECTED/CONFIRMING misconception.
// PART 6 정책 4종:
//   two-clean (A, 2.1 현행): 패턴 재현 1회 → ACTIVE / 클린 confirmProblemCount개 → NONE
//   three-clean (B): 클린 3개 필요 (요구 확인량 증가 — Recall↑ 기대, 비용↑)
//   strong-fast (C): HIGH 태그 트리거였던 인스턴스는 확인 1문항으로 즉시 판정
//   rolling (D): 점수 누적/감쇠 — 패턴 재현 +점수(ACTIVE 문턱), 클린 −점수(NONE 바닥)
export function processConfirmationAttempt(
  instances: MisconceptionInstance[],
  input: {
    misconceptionId: string;
    correct: boolean;
    errorType: string | null;
    attemptId: string;
    chosenMisconceptionId?: string | null;
    diagnosticStrength?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    offeredMisconceptions?: { id: string; strength: 'HIGH' | 'MEDIUM' | 'LOW' }[];
  },
): { instances: MisconceptionInstance[]; becameActive: boolean; cleared: boolean } {
  const cfg = CONFIG21.misconception;
  const inst = instances.find((i) => i.misconceptionId === input.misconceptionId);
  if (!inst) return { instances, becameActive: false, cleared: false };
  const def = MISCONCEPTION_LIBRARY.find((m) => m.id === input.misconceptionId);
  const startedConfirming: MisconceptionInstance = inst.status === 'SUSPECTED' ? { ...inst, status: 'CONFIRMING' } : inst;

  // 패턴 재현 판정: distractor 직접 태그가 같은 오개념을 지목하면 그것이 최우선 근거;
  // 태그가 없으면 (errorType 일치) 근사 유지
  const samePattern = !input.correct && (input.chosenMisconceptionId === input.misconceptionId || (!input.chosenMisconceptionId && def && input.errorType === def.triggerErrorType));
  let updated: MisconceptionInstance;
  let becameActive = false;
  let cleared = false;

  // 하이브리드: rolling 비율 검정은 distractor 태그가 존재하는 라이브러리 항목
  // (diagnosticDifficulty 선언)에만 적용. 미태깅 항목은 종전 two-clean 기계로 판정한다 —
  // 안 그러면 기회 표본이 영원히 0이라 CONFIRMING에 갇힌다. (태깅 확대는 PART L 과제.)
  const defIsTagged = !!def?.diagnosticDifficulty;
  if (cfg.policy === 'rolling' && defIsTagged) {
    // 확인 문항도 동일한 비율 검정의 표본이다: 오답이면 기회+1(+선택 시 가중 매치),
    // 정답이면 표본에 넣지 않는다 (기회 = "틀렸을 때 어떤 오답을 골랐나").
    const offeredThis = (input.offeredMisconceptions ?? []).some((o) => o.id === input.misconceptionId);
    if (!input.correct && offeredThis) {
      const matched = input.chosenMisconceptionId === input.misconceptionId;
      const w = matched ? (input.diagnosticStrength === 'MEDIUM' ? cfg.rolling.mediumWeight : input.diagnosticStrength === 'LOW' ? cfg.rolling.mediumWeight * 0.6 : 1) : 0;
      const opportunities = (startedConfirming.ratioOpportunities ?? 0) + 1;
      const matches = (startedConfirming.ratioMatches ?? 0) + w;
      const rate = matches / opportunities;
      const fastPath = opportunities <= cfg.rolling.fastPathWindow && matches >= cfg.rolling.fastPathMatches;
      becameActive = (opportunities >= cfg.rolling.minOpportunities && rate >= cfg.rolling.activeRate) || fastPath;
      const ratioSaysClear = opportunities >= cfg.rolling.minOpportunities && rate <= cfg.rolling.clearRate;
      cleared = ratioSaysClear && !becameActive;
      updated = {
        ...startedConfirming,
        ratioOpportunities: opportunities,
        ratioMatches: matches,
        evidenceScore: rate,
        confirmFailCount: startedConfirming.confirmFailCount + (matched ? 1 : 0),
        confirmPassCount: startedConfirming.confirmPassCount + (matched ? 0 : 1),
        confirmationAttempts: [...startedConfirming.confirmationAttempts, input.attemptId],
        triggeringAttempts: matched ? [...startedConfirming.triggeringAttempts, input.attemptId] : startedConfirming.triggeringAttempts,
        status: becameActive ? 'ACTIVE' : cleared ? 'NONE' : 'CONFIRMING',
      };
    } else {
      // 정답(또는 태깅 무관 문항): 비율 표본 아님 — 상태만 CONFIRMING 유지하고 통과 기록
      updated = {
        ...startedConfirming,
        confirmPassCount: startedConfirming.confirmPassCount + 1,
        confirmationAttempts: [...startedConfirming.confirmationAttempts, input.attemptId],
      };
    }
    return { instances: instances.map((i) => (i.misconceptionId === input.misconceptionId ? updated : i)), becameActive, cleared };
  }

  if (samePattern) {
    updated = {
      ...startedConfirming,
      confirmFailCount: startedConfirming.confirmFailCount + 1,
      confirmationAttempts: [...startedConfirming.confirmationAttempts, input.attemptId],
      triggeringAttempts: [...startedConfirming.triggeringAttempts, input.attemptId],
      status: 'ACTIVE',
      evidenceScore: 1.0,
    };
    becameActive = true;
  } else {
    const passCount = startedConfirming.confirmPassCount + 1;
    const needed = cfg.policy === 'three-clean' ? 3 : cfg.policy === 'strong-fast' && startedConfirming.strongTriggerSeen ? 1 : cfg.confirmProblemCount;
    const clearNow = passCount >= needed && startedConfirming.confirmFailCount === 0;
    updated = {
      ...startedConfirming,
      confirmPassCount: passCount,
      confirmationAttempts: [...startedConfirming.confirmationAttempts, input.attemptId],
      status: clearNow ? 'NONE' : 'CONFIRMING',
      evidenceScore: clearNow ? cfg.clearedRelapseScore : startedConfirming.evidenceScore,
    };
    cleared = clearNow;
  }

  return { instances: instances.map((i) => (i.misconceptionId === input.misconceptionId ? updated : i)), becameActive, cleared };
}

// PART G / PART I: ACTIVE -> RESOLVED once minimum-dose remediation completes AND the
// trigger skill shows 2 consecutive clean (untagged) answers.
export function resolveMisconception(instances: MisconceptionInstance[], misconceptionId: string, ts: number): MisconceptionInstance[] {
  return instances.map((i) => (i.misconceptionId === misconceptionId && i.status === 'ACTIVE' ? { ...i, status: 'RESOLVED', resolvedAt: new Date(ts).toISOString() } : i));
}

// PART G cap: applied at the READ layer only — never mutates alpha/beta (keeps Replay lossless).
export function capMasteryForActiveMisconceptions(p: number, instances: MisconceptionInstance[], skillId: string): number {
  const active = instances.some((i) => i.skillId === skillId && i.status === 'ACTIVE');
  return active ? Math.min(p, CONFIG21.misconception.activeMasteryCap) : p;
}

export function activeMisconceptionIds(instances: MisconceptionInstance[], skillId: string): string[] {
  return instances.filter((i) => i.skillId === skillId && i.status === 'ACTIVE').map((i) => i.misconceptionId);
}
export function suspectedMisconceptionIds(instances: MisconceptionInstance[], skillId: string): string[] {
  return instances.filter((i) => i.skillId === skillId && (i.status === 'SUSPECTED' || i.status === 'CONFIRMING')).map((i) => i.misconceptionId);
}
