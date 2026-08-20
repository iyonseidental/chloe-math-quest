// AdaptiveQuestionEngine — 다음 문제를 "랜덤이 아니라 이유를 갖고" 선택한다 (§47~50, §71)
import { CONFIG } from './config.ts';
import { PLAYABLE_SKILLS, SKILL_MAP, TRACK_MAP, dependentCount, prerequisiteClosure, trackSkills } from '../data/curriculum.ts';
import { checkGate } from './mastery.ts';
import { weakestPrerequisite } from './errors.ts';
import { forgettingRisk, todayStr } from './review.ts';
import type { Level, SkillId, StudentModel, TrackId, Variant } from './types.ts';

export interface SkillPriority {
  skillId: SkillId;
  score: number;
  reasons: string[];
}

// 학습 후보: 현재 트랙의 스킬 + 그 트랙이 딛고 서는 아래 학년의 "구멍"(prerequisite 폐포 중 약한 스킬)
export function questCandidates(model: StudentModel, trackId: TrackId): SkillId[] {
  const own = trackSkills(trackId).map((s) => s.id);
  const holes = prerequisiteClosure(trackId).filter((id) => (model.skills[id]?.mastery ?? 0) < 70);
  return [...own, ...holes];
}

// Priority = WeaknessSeverity × PrerequisiteImportance × ForgettingRisk × RecentErrorFrequency
export function priorityScores(model: StudentModel, today = todayStr(), trackId?: TrackId): SkillPriority[] {
  const recent = model.attempts.slice(-30);
  const candidates = trackId ? new Set(questCandidates(model, trackId)) : null;
  const pool = candidates ? PLAYABLE_SKILLS.filter((s) => candidates.has(s.id)) : PLAYABLE_SKILLS;
  return pool.map((def) => {
    const s = model.skills[def.id];
    const weakness = (100 - (s?.mastery ?? 0)) / 100 + 0.1;
    const importance = 1 + dependentCount(def.id) * 0.25;
    const risk = forgettingRisk(model.reviews, def.id, today);
    const recentErrors = recent.filter((a) => a.skillId === def.id && !a.correct).length;
    const errorFreq = 1 + recentErrors * 0.2;
    const score = weakness * importance * risk * errorFreq;
    const reasons: string[] = [];
    if (trackId && def.grade !== trackId) reasons.push(`${TRACK_MAP[def.grade]?.name} 과정의 구멍 — 현재 과정의 기초`);
    if ((s?.mastery ?? 0) < 70) reasons.push(`mastery ${s?.mastery ?? 0}으로 보완 필요`);
    if (dependentCount(def.id) > 0) reasons.push(`뒤에 배울 ${dependentCount(def.id)}개 단원의 기초`);
    if (risk > 1) reasons.push('복습 시점 도래');
    if (recentErrors > 0) reasons.push(`최근 오답 ${recentErrors}회`);
    if (reasons.length === 0) reasons.push('전반적으로 안정적 — 다음 레벨 도전');
    return { skillId: def.id, score, reasons };
  }).sort((a, b) => b.score - a.score);
}

export interface NextProblemPlan {
  skillId: SkillId;
  level: Level;
  variant: Variant;
  reason: string; // "WHY THIS PROBLEM?" — 학생·학부모에게 그대로 보여준다
}

// 메인 미션 중 다음 문제 결정 (세션 내 난이도 적응 §48~50)
export function planNextProblem(model: StudentModel, skillId: SkillId): NextProblemPlan {
  const s = model.skills[skillId];
  const def = SKILL_MAP[skillId];
  const cfg = CONFIG.adapt;

  // ① Frustration Protection: 연속 오답이 쌓이면 한 단계 쉬운 성공 경험을
  if (s.consecutiveWrong >= cfg.frustrationWrongStreak) {
    const level = Math.max(1, s.level - 1) as Level;
    return {
      skillId,
      level,
      variant: 'warmup',
      reason: `연속으로 어려웠으니 잠깐 쉬운 문제로 감각을 회복해요. 성공하면 바로 Lv.${s.level}로 돌아갑니다.`,
    };
  }

  // ② 2연속 오답: 난이도를 내리기 전에 원인 확인 — 개념/선수 문제면 prerequisite로 이동
  if (s.consecutiveWrong >= cfg.dropWrongStreak) {
    const recentWrong = model.attempts
      .slice(-6)
      .filter((a) => a.skillId === skillId && !a.correct)
      .map((a) => a.autoDiagnosis);
    const conceptual = recentWrong.filter((d) => d === 'CONCEPT' || d === 'PREREQUISITE').length;
    const careless = recentWrong.filter((d) => d === 'CARELESS' || d === 'CALCULATION' || d === 'SIGN').length;
    if (conceptual > careless) {
      const weak = weakestPrerequisite(model, skillId);
      if (weak && weak.mastery < CONFIG.prereqWeakThreshold) {
        const ws = model.skills[weak.skillId];
        return {
          skillId: weak.skillId,
          level: ws.level,
          variant: 'standard',
          reason: `${def.name}에서 개념 오류가 반복되는데, 원인은 선수 개념 "${SKILL_MAP[weak.skillId].name}"에 있어 보여요. 그곳부터 메워요.`,
        };
      }
      const level = Math.max(1, s.level - 1) as Level;
      return { skillId, level, variant: 'standard', reason: '개념이 흔들려서 한 단계 아래에서 다시 다져요.' };
    }
    // 단순 실수가 원인이면 난이도 유지
    return { skillId, level: s.level, variant: 'similarA', reason: '실수로 틀렸을 뿐 실력 문제가 아니에요. 같은 난이도로 다시 도전!' };
  }

  // ③ Mastery Gate에 전이 성공만 남았으면 전이 문제 출제
  const openCases = model.clinicQueue.filter((c) => !c.resolved && c.skillId === skillId).length;
  const gate = checkGate(s, openCases);
  if (!gate.pass && gate.missing.length >= 1 && !gate.stats.transferPassed && gate.stats.attempts >= 3) {
    return {
      skillId,
      level: s.level,
      variant: 'transfer',
      reason: `Lv.${s.level} 승급까지 "새로운 상황에 개념 적용하기"만 남았어요. 전이 문제에 도전!`,
    };
  }

  // ④ 상승 신호: 연속 정답이면 Challenge (Flow Zone의 10%)
  if (s.consecutiveCorrect >= cfg.raiseStreak && s.level < 5 && Math.random() < 0.4) {
    return {
      skillId,
      level: Math.min(5, s.level + 1) as Level,
      variant: 'challenge',
      reason: `${s.consecutiveCorrect}연속 정답! 한 단계 위 문제로 실력을 확인해봐요.`,
    };
  }

  // ⑤ 기본: 현재 레벨 표준 문제 (Flow Zone의 70%), 가끔 전이(20%)
  if (Math.random() < 0.2 && gate.stats.attempts >= 2) {
    return { skillId, level: s.level, variant: 'transfer', reason: '같은 개념을 다른 상황에서도 쓸 수 있는지 확인하는 문제예요.' };
  }
  return { skillId, level: s.level, variant: 'standard', reason: `${def.name} Lv.${s.level} — 현재 실력에 맞는 문제예요.` };
}
