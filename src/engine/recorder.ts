// recorder — 답안 1개를 기록하면 모든 엔진 상태가 갱신되는 단일 진입점 (순수 함수)
import { CONFIG } from './config.ts';
import { autoDiagnose } from './errors.ts';
import { computeMastery, checkGate, masteredLevelUp, overallMastery } from './mastery.ts';
import { createCase, advance as clinicAdvance, pendingCases } from './clinic.ts';
import { scheduleReview, onReviewResult, todayStr, addDays } from './review.ts';
import { newBadges } from './progression.ts';
import type { Attempt, AttemptSummary, Level, Problem, RecordResult, SelfTag, SkillState, StudentModel, TrackId } from './types.ts';

export interface RecordInput {
  problem: Problem;
  chosenIndex: number;
  timeMs: number;
  hintsUsed: number;
  selfDiagnosis: SelfTag | null;
  clinicCaseId?: string | null;
  today?: string; // 테스트에서 날짜를 주입할 수 있게
}

let attemptSeq = 0;

export function recordAnswer(model: StudentModel, input: RecordInput): { model: StudentModel; result: RecordResult } {
  const { problem, chosenIndex, timeMs, hintsUsed, selfDiagnosis } = input;
  const today = input.today ?? todayStr();
  const correct = chosenIndex === problem.answerIndex;

  const diag = correct ? null : autoDiagnose(model, problem, chosenIndex, timeMs, hintsUsed);

  const attempt: Attempt = {
    id: `att-${Date.now().toString(36)}-${attemptSeq++}`,
    // 데모/테스트에서 날짜를 주입하면 기록 시각도 그 날짜로 맞춘다
    ts: input.today ? Date.parse(input.today + 'T09:00:00') + attemptSeq * 60000 : Date.now(),
    skillId: problem.skillId,
    level: problem.level,
    variant: problem.variant,
    correct,
    chosenIndex,
    timeMs,
    hintsUsed,
    autoDiagnosis: diag?.diagnosis ?? null,
    selfDiagnosis,
    problem: {
      stem: problem.stem,
      choices: problem.choices.map((c) => c.text),
      answerIndex: problem.answerIndex,
      idea: problem.idea,
      solve: problem.solve,
      remember: problem.remember,
    },
    clinicCaseId: input.clinicCaseId ?? null,
  };

  // ---- 스킬 상태 갱신 ----
  const prevSkill = model.skills[problem.skillId];
  const summary: AttemptSummary = {
    correct,
    level: problem.level,
    variant: problem.variant,
    hintsUsed,
    timeMs,
    estimatedSec: problem.estimatedSec,
    autoDiagnosis: attempt.autoDiagnosis,
    ts: attempt.ts,
  };
  let skill: SkillState = {
    ...prevSkill,
    attempts: prevSkill.attempts + 1,
    correct: prevSkill.correct + (correct ? 1 : 0),
    recentWindow: [...prevSkill.recentWindow, summary].slice(-CONFIG.mastery.windowSize),
    consecutiveCorrect: correct && hintsUsed === 0 ? prevSkill.consecutiveCorrect + 1 : correct ? prevSkill.consecutiveCorrect : 0,
    consecutiveWrong: correct ? 0 : prevSkill.consecutiveWrong + 1,
    errorCounts: attempt.autoDiagnosis
      ? { ...prevSkill.errorCounts, [attempt.autoDiagnosis]: (prevSkill.errorCounts[attempt.autoDiagnosis] ?? 0) + 1 }
      : prevSkill.errorCounts,
    transferPassedAtLevel:
      problem.variant === 'transfer' && correct
        ? { ...prevSkill.transferPassedAtLevel, [problem.level]: true }
        : prevSkill.transferPassedAtLevel,
  };

  let xpGain = 0;
  const xpReasons: string[] = [];
  let clinicCaseCreated = false;
  let clinicCaseResolved = false;
  let clinicQueue = model.clinicQueue;
  let reviews = model.reviews;

  // ---- 복습 문제 처리 (§16) ----
  if (problem.variant === 'review') {
    reviews = onReviewResult(reviews, problem.skillId, correct, today);
    if (correct) {
      skill = { ...skill, reviewAdjust: skill.reviewAdjust + CONFIG.mastery.reviewPassBonus };
      xpGain += CONFIG.xp.reviewSuccess;
      xpReasons.push(`복습 성공 +${CONFIG.xp.reviewSuccess}`);
    } else {
      skill = { ...skill, reviewAdjust: skill.reviewAdjust - CONFIG.mastery.reviewLapsePenalty };
    }
  }

  // ---- Error Clinic 진행 (§10) ----
  if (input.clinicCaseId) {
    const c = clinicQueue.find((x) => x.id === input.clinicCaseId);
    if (c) {
      const adv = clinicAdvance(c, correct);
      clinicQueue = clinicQueue.map((x) => (x.id === c.id ? adv.case_ : x));
      if (adv.resolved) {
        clinicCaseResolved = true;
        // 완치된 스킬은 망각곡선 복습 대상으로 등록
        reviews = scheduleReview(reviews, problem.skillId, problem.level, today);
      }
      if (correct && (c.stage === 'similarA' || c.stage === 'similarB')) {
        xpGain += CONFIG.xp.clinicRetrySuccess;
        xpReasons.push(`오답 재도전 성공 +${CONFIG.xp.clinicRetrySuccess}`);
      }
    }
  }

  // ---- 오답이면 클리닉 케이스 생성 (진단·복습·클리닉 내부 문제는 제외) ----
  if (!correct && !input.clinicCaseId && problem.variant !== 'diagnostic' && attempt.autoDiagnosis) {
    // 같은 스킬의 미해결 케이스가 이미 있으면 중복 생성하지 않는다
    const hasOpen = pendingCases(clinicQueue).some((c) => c.skillId === problem.skillId);
    if (!hasOpen) {
      clinicQueue = [...clinicQueue, createCase(attempt, attempt.autoDiagnosis)];
      clinicCaseCreated = true;
    }
  }

  // ---- 정답 XP ----
  if (correct && problem.variant !== 'review') {
    if (problem.variant === 'transfer') {
      xpGain += CONFIG.xp.transferSuccess;
      xpReasons.push(`전이 문제 성공 +${CONFIG.xp.transferSuccess}`);
    } else if (!input.clinicCaseId) {
      const base = problem.level >= 4 ? CONFIG.xp.advancedCorrect : CONFIG.xp.correct;
      xpGain += base;
      xpReasons.push(`정답 +${base}`);
    }
  }

  // ---- Mastery Gate 판정 (현재 도전 레벨에서의 시도만) ----
  // 필수 복습 원칙: 이 스킬에 미완치 클리닉 케이스가 있으면 승급 불가 (§"틀린 문제를 명확히 알고 다음 단계로")
  let leveledUp: Level | null = null;
  if (problem.variant !== 'diagnostic' && problem.variant !== 'review' && problem.level === skill.level) {
    const openCases = pendingCases(clinicQueue).filter((c) => c.skillId === problem.skillId).length;
    const gate = checkGate(skill, openCases);
    if (gate.pass) {
      const masteredAt = skill.level;
      skill = masteredLevelUp(skill);
      leveledUp = masteredAt;
      xpGain += CONFIG.xp.skillLevelMastered;
      xpReasons.push(`Lv.${masteredAt} MASTERED +${CONFIG.xp.skillLevelMastered}`);
      reviews = scheduleReview(reviews, problem.skillId, masteredAt, today);
    }
  }

  const prevMastery = prevSkill.mastery;
  skill = { ...skill, mastery: computeMastery(skill) };

  // ---- 스트릭 ----
  let streakDays = model.streakDays;
  let lastActiveDate = model.lastActiveDate;
  if (lastActiveDate !== today) {
    streakDays = lastActiveDate === addDays(today, -1) ? streakDays + 1 : 1;
    lastActiveDate = today;
  }

  let next: StudentModel = {
    ...model,
    skills: { ...model.skills, [problem.skillId]: skill },
    attempts: [...model.attempts, attempt].slice(-CONFIG.attemptsCap),
    clinicQueue,
    reviews,
    xp: model.xp + xpGain,
    streakDays,
    lastActiveDate,
  };

  // ---- 스냅샷 (성장 그래프) ----
  const overall = overallMastery(next);
  const bySkill = Object.fromEntries(Object.entries(next.skills).map(([id, s]) => [id, s.mastery]));
  const snapIdx = next.snapshots.findIndex((s) => s.date === today);
  const snapshots =
    snapIdx >= 0
      ? next.snapshots.map((s, i) => (i === snapIdx ? { date: today, overallMastery: overall, bySkill } : s))
      : [...next.snapshots, { date: today, overallMastery: overall, bySkill }];
  next = { ...next, snapshots };

  // ---- 배지 ----
  const earned = newBadges(next);
  if (earned.length) next = { ...next, badges: [...next.badges, ...earned] };

  return {
    model: next,
    result: {
      xpGain,
      xpReasons,
      leveledUp,
      masteryDelta: skill.mastery - prevMastery,
      newBadges: earned,
      autoDiagnosis: attempt.autoDiagnosis,
      clinicCaseCreated,
      clinicCaseResolved,
    },
  };
}

// 진단평가 결과 반영: 시작 레벨 배치 + 아래 레벨은 정복 처리(추정) — 이후 실전에서 자동 보정된다
export function applyDiagnosis(model: StudentModel, placements: Record<string, Level>, trackId: TrackId): StudentModel {
  const skills = { ...model.skills };
  for (const [skillId, level] of Object.entries(placements)) {
    const s = skills[skillId];
    if (!s) continue;
    const mastered = Array.from({ length: level - 1 }, (_, i) => (i + 1) as Level);
    const seeded: SkillState = { ...s, level, masteredLevels: mastered };
    skills[skillId] = { ...seeded, mastery: computeMastery(seeded) };
  }
  return {
    ...model,
    skills,
    activeTrack: trackId,
    diagnosedTracks: model.diagnosedTracks.includes(trackId) ? model.diagnosedTracks : [...model.diagnosedTracks, trackId],
  };
}
