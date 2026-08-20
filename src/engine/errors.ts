// ErrorDiagnosisEngine (WHY WRONG ENGINE) — 오답 원인 자동 진단.
// 입력: ① distractor의 error 태그 ② 행동 신호(시간·힌트) ③ 이력(prerequisite mastery)
import { CONFIG } from './config.ts';
import { SKILL_MAP } from '../data/curriculum.ts';
import type { ErrorType, Problem, SelfTag, SkillId, StudentModel } from './types.ts';

export const ERROR_LABELS: Record<ErrorType, { label: string; emoji: string; advice: string }> = {
  CONCEPT: { label: '개념 이해 부족', emoji: '🧠', advice: '개념 카드를 다시 읽고 기초 문제부터 확인해요.' },
  CALCULATION: { label: '계산 실수', emoji: '✍️', advice: '풀이를 한 줄씩 적으면서 계산하면 실수가 줄어요.' },
  SIGN: { label: '부호 실수', emoji: '➖', advice: '음수가 나오면 괄호를 씌우는 습관을 들여요.' },
  FORMULA: { label: '공식 혼동', emoji: '📖', advice: '공식이 "왜" 그렇게 되는지 유도 과정을 한 번 따라가봐요.' },
  INTERPRETATION: { label: '문제 해석 오류', emoji: '👀', advice: '문제를 두 번 읽고, 구하는 것에 밑줄을 그어요.' },
  CARELESS: { label: '단순 실수', emoji: '💨', advice: '답을 고르기 전에 3초만 검산해요.' },
  PREREQUISITE: { label: '이전 단계 개념 부족', emoji: '🔗', advice: '이 단원보다 먼저 배우는 개념에 구멍이 있어요. 그것부터 메워요.' },
  TIME: { label: '시간 부족', emoji: '⏱️', advice: '시간을 정해두지 말고 정확하게 푸는 연습부터 해요.' },
  GUESSING: { label: '추측', emoji: '🎲', advice: '모르면 찍지 말고 힌트를 요청하는 것이 실력에 도움돼요.' },
};

export const SELF_TAG_OPTIONS: { id: SelfTag; label: string }[] = [
  { id: 'no-concept', label: '개념을 몰랐어' },
  { id: 'calc-slip', label: '계산 실수였어' },
  { id: 'misread', label: '문제를 잘못 읽었어' },
  { id: 'no-strategy', label: '풀이 방법이 안 떠올랐어' },
  { id: 'forgot-formula', label: '공식을 잊었어' },
  { id: 'time', label: '시간이 부족했어' },
  { id: 'unknown', label: '잘 모르겠어' },
];

export function autoDiagnose(
  model: StudentModel,
  problem: Problem,
  chosenIndex: number,
  timeMs: number,
  hintsUsed: number,
): { diagnosis: ErrorType; reason: string } {
  const cfg = CONFIG.adapt;
  let tag: ErrorType = problem.choices[chosenIndex]?.errorType ?? 'CONCEPT';
  let reason = `선택한 오답은 "${ERROR_LABELS[tag].label}"을(를) 했을 때 나오는 값이에요.`;

  const estMs = problem.estimatedSec * 1000;

  // 힌트를 다 쓰고도 틀림 → 개념 문제로 판단
  if (hintsUsed >= 3 && tag !== 'PREREQUISITE') {
    tag = 'CONCEPT';
    reason = '힌트 3개를 모두 보고도 어려웠다면 개념 자체를 다시 볼 시점이에요.';
  }

  // 너무 빨리 틀림 → 추측 또는 단순 실수
  if (timeMs < estMs * cfg.fastRatio) {
    if (tag === 'CALCULATION' || tag === 'SIGN') {
      tag = 'CARELESS';
      reason = '예상 시간의 1/4도 안 되어 답을 골랐어요. 서두르다 나온 단순 실수로 보여요.';
    } else if (tag === 'CONCEPT') {
      tag = 'GUESSING';
      reason = '아주 빠르게 답을 골랐어요. 근거를 갖고 풀었는지 되돌아봐요.';
    }
  }

  // 너무 오래 걸리고 틀림 → 시간·개념 신호
  if (timeMs > estMs * cfg.slowRatio && tag === 'CALCULATION') {
    tag = 'TIME';
    reason = '오래 고민한 끝에 계산이 어긋났어요. 시간 압박이 영향을 준 것 같아요.';
  }

  // 개념 오류가 반복되고 prerequisite가 약하면 → 학습 구멍은 더 아래에 있다 (Root Cause)
  if (tag === 'CONCEPT') {
    const weak = weakestPrerequisite(model, problem.skillId);
    if (weak && weak.mastery < CONFIG.prereqWeakThreshold) {
      tag = 'PREREQUISITE';
      reason = `이 단원보다 먼저 배우는 "${SKILL_MAP[weak.skillId].name}" (mastery ${weak.mastery})가 약해요. 진짜 원인은 거기에 있을 가능성이 높아요.`;
    }
  }

  return { diagnosis: tag, reason };
}

export function weakestPrerequisite(model: StudentModel, skillId: SkillId): { skillId: SkillId; mastery: number } | null {
  const def = SKILL_MAP[skillId];
  if (!def || def.prerequisites.length === 0) return null;
  let weakest: { skillId: SkillId; mastery: number } | null = null;
  for (const p of def.prerequisites) {
    const m = model.skills[p]?.mastery ?? 0;
    if (!weakest || m < weakest.mastery) weakest = { skillId: p, mastery: m };
  }
  return weakest;
}

// Root Cause Analysis 화면용: prerequisite들을 mastery 오름차순으로
export function rootCauseReport(model: StudentModel, skillId: SkillId): { skillId: SkillId; name: string; mastery: number }[] {
  const def = SKILL_MAP[skillId];
  if (!def) return [];
  return def.prerequisites
    .map((p) => ({ skillId: p, name: SKILL_MAP[p].name, mastery: model.skills[p]?.mastery ?? 0 }))
    .sort((a, b) => a.mastery - b.mastery);
}

// Mistake Pattern 통계 (§60)
export function mistakePattern(model: StudentModel): { type: ErrorType; count: number; ratio: number }[] {
  const counts: Partial<Record<ErrorType, number>> = {};
  let total = 0;
  for (const a of model.attempts) {
    if (a.correct || !a.autoDiagnosis) continue;
    counts[a.autoDiagnosis] = (counts[a.autoDiagnosis] ?? 0) + 1;
    total++;
  }
  return (Object.keys(ERROR_LABELS) as ErrorType[])
    .map((t) => ({ type: t, count: counts[t] ?? 0, ratio: total > 0 ? (counts[t] ?? 0) / total : 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}
