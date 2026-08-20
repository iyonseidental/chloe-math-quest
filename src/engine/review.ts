// ReviewScheduler — 망각곡선 기반 복습 (1/3/7/14/30일).
import { CONFIG } from './config.ts';
import type { Level, ReviewState, SkillId } from './types.ts';

export const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 레벨을 정복(MASTERED)하면 첫 복습을 예약한다
export function scheduleReview(reviews: ReviewState[], skillId: SkillId, level: Level, today: string): ReviewState[] {
  const existing = reviews.find((r) => r.skillId === skillId);
  const fresh: ReviewState = {
    skillId,
    level,
    stage: 0,
    dueDate: addDays(today, CONFIG.reviewIntervals[0]),
    passes: existing?.passes ?? 0,
    lapses: existing?.lapses ?? 0,
  };
  return [...reviews.filter((r) => r.skillId !== skillId), fresh];
}

export function onReviewResult(reviews: ReviewState[], skillId: SkillId, correct: boolean, today: string): ReviewState[] {
  return reviews.map((r) => {
    if (r.skillId !== skillId) return r;
    if (correct) {
      const nextStage = Math.min(r.stage + 1, CONFIG.reviewIntervals.length - 1);
      return { ...r, stage: nextStage, passes: r.passes + 1, dueDate: addDays(today, CONFIG.reviewIntervals[nextStage]) };
    }
    // 실패: 망각 → 처음 간격으로 되돌린다
    return { ...r, stage: 0, lapses: r.lapses + 1, dueDate: addDays(today, CONFIG.reviewIntervals[0]) };
  });
}

export function dueReviews(reviews: ReviewState[], today: string): ReviewState[] {
  return reviews.filter((r) => r.dueDate <= today);
}

// Forgetting Risk (Priority Score 요소): 예정일이 지났을수록 위험이 커진다
export function forgettingRisk(reviews: ReviewState[], skillId: SkillId, today: string): number {
  const r = reviews.find((v) => v.skillId === skillId);
  if (!r) return 1;
  const overdueDays = Math.floor((Date.parse(today) - Date.parse(r.dueDate)) / 86400000);
  if (overdueDays < 0) return 1; // 아직 예정일 전
  return 1 + Math.min(overdueDays, 10) * 0.15; // 최대 2.5배
}
