// CHLOE MATH 2.1 — E6: Adaptive Progression Engine.
// Chooses what Chloe practices next by an explainable Priority Score (never Math.random()
// picking the skill), plus Fast Track and Frustration Protection. Every decision returns
// its full breakdown so "why did the engine do this?" always has an answer (authorization
// instruction #6).
import { CONFIG21 } from './config21.ts';
import { MICRO_SKILL_MAP, dependentsOf } from './curriculum21.ts';
import type { AgendaKind, ErrorType21, KnowledgeState } from './types21.ts';

export interface PriorityBreakdown {
  need: number;
  prerequisiteImportance: number;
  forgettingRisk: number;
  curriculumImportance: number;
  errorFrequency: number;
  opportunity: number;
  diversity: number;
  score: number;
}

export interface PriorityInput {
  skillId: string;
  p: number;
  knowledgeState: KnowledgeState;
  reviewOverdueDays: number; // 0 if not due
  recentWrongCount: number; // last ~30 attempts on this skill
  recentSkillHistory: string[]; // skillIds of the last few attempts, most recent last
  // 2.2 GATE B: 최근 치료 유예(abandoned)된 스킬 — 쿨다운 감쇠 대상 (치료 독점 방지)
  recentlyAbandoned?: boolean;
}

export function priorityScore(input: PriorityInput): PriorityBreakdown {
  const cfg = CONFIG21.adaptive;
  const def = MICRO_SKILL_MAP[input.skillId];

  const need = Math.max(0.1, 1 - input.p);
  const prerequisiteImportance = 1 + cfg.prereqImportanceWeight * dependentsOf(input.skillId).length;
  const forgettingRisk = input.reviewOverdueDays > 0 ? Math.min(cfg.forgettingRiskCap, 1 + cfg.forgettingRiskPerOverdueDay * input.reviewOverdueDays) : 1;
  const curriculumImportance = def?.importance ?? cfg.curriculumImportanceDefault;
  const errorFrequency = 1 + cfg.errorFrequencyWeight * input.recentWrongCount;
  const opportunity = cfg.opportunityBoost[input.knowledgeState] ?? 1;

  const tail = input.recentSkillHistory.slice(-3);
  const streakTail = input.recentSkillHistory.slice(-4);
  let diversity = 1;
  if (streakTail.length === 4 && streakTail.every((s) => s === input.skillId)) diversity = cfg.diversityStreakPenalty;
  else if (tail.includes(input.skillId)) diversity = cfg.diversityRepeatPenalty;

  // 2.2 GATE B: 유예 직후 쿨다운 — errorFrequency(최근 오답 다수)가 유예 스킬을 곧바로
  // 재선택해 치료 루프가 재점화되는 것을 막는다. 감쇠는 일시적(케이스 abandonedTs 기준)이며
  // 학습 자체를 막지 않는다 (test22-m1full ⑥의 68%→48% 잔여 집중이 이 경로였음).
  const abandonedCooldown = input.recentlyAbandoned ? cfg.abandonedCooldownFactor : 1;

  const score = need * prerequisiteImportance * forgettingRisk * curriculumImportance * errorFrequency * opportunity * diversity * abandonedCooldown;
  return { need, prerequisiteImportance, forgettingRisk, curriculumImportance, errorFrequency, opportunity, diversity, score };
}

export interface SkillChoice {
  selectedSkillId: string;
  reason: string;
  breakdown: PriorityBreakdown;
  candidates: { skillId: string; score: number }[];
}

export function selectNextSkill(inputs: PriorityInput[]): SkillChoice {
  const scored = inputs.map((i) => ({ skillId: i.skillId, breakdown: priorityScore(i) }));
  scored.sort((a, b) => b.breakdown.score - a.breakdown.score);
  const top = scored[0];
  const reasons: string[] = [];
  if (top.breakdown.need > 0.3) reasons.push(`mastery gap (need=${top.breakdown.need.toFixed(2)})`);
  if (top.breakdown.forgettingRisk > 1) reasons.push('review overdue');
  if (top.breakdown.errorFrequency > 1) reasons.push('recent errors on this skill');
  if (top.breakdown.opportunity >= 1.5) reasons.push('actively being remediated/reviewed');
  return {
    selectedSkillId: top.skillId,
    reason: reasons.length ? reasons.join(', ') : 'highest overall priority',
    breakdown: top.breakdown,
    candidates: scored.map((s) => ({ skillId: s.skillId, score: s.breakdown.score })),
  };
}

// ---------------------------------------------------------------------------
// Fast Track (§31) — skip unnecessary repetition when mastery is already strong.
// ---------------------------------------------------------------------------
export function checkFastTrack(consecutiveCorrect: number, p: number): boolean {
  const cfg = CONFIG21.adaptive;
  return consecutiveCorrect >= cfg.fastTrackStreak && p >= cfg.fastTrackMinP;
}

// ---------------------------------------------------------------------------
// Frustration Protection (§35) — diagnose before reflexively lowering difficulty.
// ---------------------------------------------------------------------------
export type FrustrationAction = 'investigate' | 'ease' | null;

const CONCEPTUAL: ErrorType21[] = ['CONCEPT_GAP', 'PREREQUISITE_GAP', 'FORMULA_ERROR', 'STRATEGY_ERROR', 'LOGIC_ERROR'];

export function frustrationAction(consecutiveWrong: number, recentErrorTypes: (ErrorType21 | null)[]): FrustrationAction {
  const cfg = CONFIG21.adaptive;
  if (consecutiveWrong < cfg.frustrationStreak) return null;
  const conceptual = recentErrorTypes.filter((e) => e && CONCEPTUAL.includes(e)).length;
  const careless = recentErrorTypes.filter((e) => e === 'CARELESS_ERROR' || e === 'GUESSING' || e === 'TIME_PRESSURE').length;
  return conceptual >= careless ? 'investigate' : 'ease';
}

// ---------------------------------------------------------------------------
// Flow ratio (§34) — 70% current level / 20% stretch / 10% challenge, deterministic
// given an input roll so it stays testable and auditable.
// ---------------------------------------------------------------------------
export type FlowMode = 'current' | 'stretch' | 'challenge';
export function pickFlowMode(roll: number): FlowMode {
  if (roll < 0.7) return 'current';
  if (roll < 0.9) return 'stretch';
  return 'challenge';
}

// ---------------------------------------------------------------------------
// No-over-testing guard shares config with rootcause21's session-diagnostic-share limit.
// ---------------------------------------------------------------------------
export function exceedsDiagnosticShare(recentAgendaKinds: AgendaKind[]): boolean {
  const diagnostic: AgendaKind[] = ['probe', 'confirm'];
  const count = recentAgendaKinds.filter((k) => diagnostic.includes(k)).length;
  return recentAgendaKinds.length > 0 && count / recentAgendaKinds.length > CONFIG21.session.maxDiagnosticShare;
}
