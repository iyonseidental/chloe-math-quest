// Today's Quest 빌더 (§19) — Warm Up / Main Mission / Error Clinic / Challenge / Review
// 현재 트랙(학년/과목)의 스킬 + 아래 학년의 구멍을 후보로 구성한다.
import { SKILL_MAP } from '../data/curriculum.ts';
import { priorityScores, questCandidates } from './adaptive.ts';
import { pendingCases } from './clinic.ts';
import { dueReviews, todayStr } from './review.ts';
import type { Level, SkillId, StudentModel } from './types.ts';

export type QuestBlockType = 'warmup' | 'main' | 'clinic' | 'challenge' | 'review';

export interface QuestBlock {
  type: QuestBlockType;
  title: string;
  skillId: SkillId;
  count: number;
  level: Level | null; // null이면 실행 시 adaptive가 결정
  reason: string; // Explainability
  clinicCaseIds?: string[];
  estimatedSec: number;
}

export interface TodayQuest {
  date: string;
  blocks: QuestBlock[];
  totalEstimatedMin: number;
}

export function buildTodayQuest(model: StudentModel, today = todayStr()): TodayQuest {
  const blocks: QuestBlock[] = [];
  const priorities = priorityScores(model, today, model.activeTrack);
  const main = priorities[0];
  const mainSkill = model.skills[main.skillId];

  // Warm Up: 후보 중 가장 강한 스킬에서 가볍게 (자신감으로 시작)
  const candidateDefs = questCandidates(model, model.activeTrack).map((id) => SKILL_MAP[id]);
  const strongest = [...candidateDefs].sort((a, b) => (model.skills[b.id]?.mastery ?? 0) - (model.skills[a.id]?.mastery ?? 0))[0];
  const warmSkill = model.skills[strongest.id];
  blocks.push({
    type: 'warmup',
    title: 'Warm Up',
    skillId: strongest.id,
    count: 2,
    level: Math.max(1, warmSkill.level - 1) as Level,
    reason: `가장 자신 있는 "${strongest.name}"으로 가볍게 시동을 걸어요.`,
    estimatedSec: 2 * 40,
  });

  // Error Clinic 먼저: 틀린 문제를 명확히 이해해야 다음 단계로 갈 수 있다 (필수 복습 원칙).
  // 미완치 케이스가 있는 동안 해당 스킬의 레벨 승급은 잠긴다.
  const clinics = pendingCases(model.clinicQueue).slice(0, 3);
  for (const c of clinics.slice(0, 1)) {
    blocks.push({
      type: 'clinic',
      title: 'Error Clinic',
      skillId: c.skillId,
      count: 4,
      level: c.level,
      reason: `"${SKILL_MAP[c.skillId].name}"의 오답을 완치해야 승급이 열려요 (유사 2 → 전이 1 → 확인 1). 틀린 이유를 아는 것이 진짜 공부!`,
      clinicCaseIds: clinics.map((x) => x.id),
      estimatedSec: 4 * 80,
    });
  }

  // Main Mission: 우선순위 1위 스킬
  blocks.push({
    type: 'main',
    title: 'Main Mission',
    skillId: main.skillId,
    count: 6,
    level: null,
    reason: main.reasons.join(' · '),
    estimatedSec: 6 * 70,
  });

  // Challenge: 메인 스킬이 안정적이면 한 단계 위 1문제
  if (mainSkill.mastery >= 60 && mainSkill.level < 5) {
    blocks.push({
      type: 'challenge',
      title: 'Challenge',
      skillId: main.skillId,
      count: 1,
      level: Math.min(5, mainSkill.level + 1) as Level,
      reason: '오늘의 도전 — 한 단계 위 문제로 사고력을 자극해요.',
      estimatedSec: 100,
    });
  }

  // Review: 망각곡선상 복습 시점이 된 스킬
  const due = dueReviews(model.reviews, today).slice(0, 3);
  for (const r of due.slice(0, 1)) {
    blocks.push({
      type: 'review',
      title: 'Review',
      skillId: r.skillId,
      count: Math.min(3, due.length),
      level: r.level,
      reason: `${SKILL_MAP[r.skillId].name} — 복습 시점(${r.dueDate})이 되어 기억을 점검해요.`,
      estimatedSec: due.length * 50,
    });
  }

  const totalSec = blocks.reduce((a, b) => a + b.estimatedSec, 0);
  return { date: today, blocks, totalEstimatedMin: Math.round(totalSec / 60) };
}
