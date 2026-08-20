// CHLOE MATH 2.1 — Digital Twin construction + Replay/Recompute (PART N).
// `applyEvent` is the SINGLE reducer used both for live updates (session21.submitAttempt
// appends an event then calls applyEvent) and for full replay (fold iterates applyEvent
// over the whole event log). This guarantees replay always reproduces the live twin
// exactly, and lets a changed masteryModel/config recompute history losslessly.
//
// This file starts as a skeleton (Step 0) and is extended in place as each engine lands
// (Steps 2-9), per the Phase 1 implementation order. Each extension is marked with the
// step that added it so the incremental-build trail stays visible.
import { CONFIG21, CONFIG21_VERSION, CURRICULUM_VERSION, KNOWLEDGE_GRAPH_VERSION, MASTERY_MODEL_VERSION } from './config21.ts';
import { ALL_SKILL_IDS } from './curriculum21.ts';
import { freshFlags, type DigitalTwin21, type SkillState21 } from './types21.ts';
import { freshEliteProfile } from './elite22.ts';
import type { AttemptPayload, DiagnosticPlacementPayload, EventLog, HoldoutAssessmentPayload, LearningEvent } from './events21.ts';
import { processAttemptEvent, processDiagnosticPlacement, processHoldoutEvent } from './session21.ts';

export function freshSkillState21(skillId: string, alpha: number, beta: number): SkillState21 {
  return {
    skillId,
    recentWindow: [],
    alpha,
    beta,
    masteryProbability: alpha / (alpha + beta),
    uncertainty: 0,
    effectiveEvidence: 0,
    estimateConfidence: 'VERY_LOW',
    knowledgeState: 'UNSEEN',
    flags: freshFlags(),
    highestDifficultyPassed: 0,
    currentDifficulty: 2,
    attempts: 0,
    correctAttempts: 0,
    independentRate: 0,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    transfer: { passedAt: {}, attempts: 0, passes: 0 },
    retention: { stage: -1, nextReviewAt: null, passes: 0, lapses: 0, reliability: 0.85 },
    errorCounts: {},
    suspectedMisconceptions: [],
    activeMisconceptions: [],
    prerequisiteStability: null,
    lastPracticedAt: null,
  };
}

// 2.2 결함 수정: prior 기본값이 (1,4)로 하드코딩되어 있어 CONFIG21.prior 변경(2.2에서 (1,3))
// 이후 트윈 초기값과 모델 prior가 어긋났다 — 미접촉 스킬이 유령 실효증거를 갖는 원인.
// 기본값은 항상 현재 config에서 읽는다 (재계산 감사 원칙과도 일치).
export function freshTwin21(studentId: string, name = 'Chloe', priorAlpha = CONFIG21.prior.alpha, priorBeta = CONFIG21.prior.beta): DigitalTwin21 {
  const skills: Record<string, SkillState21> = {};
  for (const id of ALL_SKILL_IDS) skills[id] = freshSkillState21(id, priorAlpha, priorBeta);
  return {
    studentId,
    name,
    versions: { curriculum: CURRICULUM_VERSION, knowledgeGraph: KNOWLEDGE_GRAPH_VERSION, masteryModel: MASTERY_MODEL_VERSION, config: CONFIG21_VERSION },
    skills,
    misconceptions: [],
    agenda: [],
    remediationCases: [],
    predictions: [],
    elite: freshEliteProfile(),
    strategyTraces: [],
    recentEliteIds: [],
    eliteRootCauseCounts: {},
    attemptsSinceElite: 0,
    holdout: [],
    recentSkillSequence: [],
    recentAgendaKinds: [],
    behavior: { hintDependency: 0, carelessRate: 0, confidenceBias: 0, learningVelocity: 0 },
    snapshots: [],
    xp: 0,
    streak: 0,
    lastActiveDate: null,
    seq: -1,
  };
}

// The single reducer (Step 10): both submitAttempt (live) and fold (replay) go through
// this, so replaying the full event log always reproduces exactly the live twin.
export function applyEvent(twin: DigitalTwin21, event: LearningEvent): DigitalTwin21 {
  let next = twin;
  if (event.type === 'ATTEMPT') {
    next = processAttemptEvent(twin, event.payload as AttemptPayload, event.ts);
  } else if (event.type === 'DIAGNOSTIC_PLACEMENT') {
    next = processDiagnosticPlacement(twin, event.payload as DiagnosticPlacementPayload, event.ts);
  } else if (event.type === 'HOLDOUT_ASSESSMENT') {
    // Phase 3 PART 28 — 격리의 구조적 보장: holdout 이벤트는 holdout 장부에만 기록된다.
    // skills/agenda/elite/misconceptions/remediationCases 그 무엇도 여기서 갱신하지 않는다.
    next = processHoldoutEvent(twin, event.payload as HoldoutAssessmentPayload, event.ts);
  }
  // REMEDIATION_OUTCOME is intentionally not separately applied: it is fully derived from
  // the resolving ATTEMPT event + prior state (see session21.handleRemediationStage), so
  // recording it as its own mutation would be redundant. It still advances seq below.
  return { ...next, seq: event.seq };
}

export function fold(events: LearningEvent[], seed: DigitalTwin21): DigitalTwin21 {
  let twin = seed;
  for (const event of events) {
    if (event.seq <= twin.seq) continue; // idempotent replay safety
    twin = applyEvent(twin, event);
  }
  return twin;
}

export function replayFromScratch(log: EventLog, studentId: string, name = 'Chloe'): DigitalTwin21 {
  return fold(log.events, freshTwin21(studentId, name));
}
