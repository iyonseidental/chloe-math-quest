// XP · 학생 레벨 · 배지 · 스트릭 (§21~27) + 트랙(학년/과목) 진급 판정
import { CONFIG } from './config.ts';
import { PLAYABLE_SKILLS, TRACKS, TRACK_MAP, trackSkills } from '../data/curriculum.ts';
import { overallMastery } from './mastery.ts';
import type { StudentModel, TrackId } from './types.ts';

export function levelFromXp(xp: number): { level: number; title: string; nextAt: number | null; progress: number } {
  const tiers = CONFIG.studentLevels;
  let idx = 0;
  for (let i = 0; i < tiers.length; i++) if (xp >= tiers[i].xp) idx = i;
  const current = tiers[idx];
  const next = tiers[idx + 1] ?? null;
  const progress = next ? (xp - current.xp) / (next.xp - current.xp) : 1;
  // 표시용 레벨 번호: 티어 인덱스 기반 + 티어 내 진행도
  const level = idx * 8 + Math.floor(progress * 8) + 1;
  return { level, title: current.title, nextAt: next?.xp ?? null, progress };
}

export interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: (m: StudentModel) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-correct', name: 'First Step', emoji: '🌱', description: '첫 문제 정답', earned: (m) => m.attempts.some((a) => a.correct) },
  {
    id: 'integer-explorer',
    name: 'Integer Explorer',
    emoji: '🧭',
    description: '정수와 유리수 Lv.2 정복',
    earned: (m) => (m.skills['M1.NUM.INT']?.masteredLevels.length ?? 0) >= 2,
  },
  {
    id: 'equation-solver',
    name: 'Equation Solver',
    emoji: '⚖️',
    description: '일차방정식 Lv.2 정복',
    earned: (m) => (m.skills['M1.ALG.EQ']?.masteredLevels.length ?? 0) >= 2,
  },
  {
    id: 'geometry-architect',
    name: 'Geometry Architect',
    emoji: '📐',
    description: '기본 도형 Lv.3 정복',
    earned: (m) => (m.skills['M1.GEO.BASIC']?.masteredLevels.length ?? 0) >= 3,
  },
  {
    id: 'function-master',
    name: 'Function Master',
    emoji: '📈',
    description: '정비례·반비례 Lv.3 정복',
    earned: (m) => (m.skills['M1.FUN.PROP']?.masteredLevels.length ?? 0) >= 3,
  },
  {
    id: 'clinic-healer',
    name: 'Mistake Healer',
    emoji: '🩹',
    description: '오답 클리닉 5건 완치',
    earned: (m) => m.clinicQueue.filter((c) => c.resolved).length >= 5,
  },
  {
    id: 'transfer-ace',
    name: 'Transfer Ace',
    emoji: '🚀',
    description: '전이 문제 10회 성공',
    earned: (m) => m.attempts.filter((a) => a.variant === 'transfer' && a.correct).length >= 10,
  },
  { id: 'streak-3', name: '3-Day Streak', emoji: '🔥', description: '3일 연속 학습', earned: (m) => m.streakDays >= 3 },
  { id: 'streak-7', name: 'Week Warrior', emoji: '⚡', description: '7일 연속 학습', earned: (m) => m.streakDays >= 7 },
  { id: 'mastery-50', name: 'Halfway Hero', emoji: '🌗', description: '전체 Mastery 50 달성', earned: (m) => overallMastery(m) >= 50 },
  { id: 'mastery-80', name: 'Summit Runner', emoji: '🏔️', description: '전체 Mastery 80 달성', earned: (m) => overallMastery(m) >= 80 },
  {
    id: 'all-l2',
    name: 'Solid Foundation',
    emoji: '🧱',
    description: '모든 단원 Lv.2 이상 정복',
    earned: (m) => PLAYABLE_SKILLS.every((s) => (m.skills[s.id]?.masteredLevels.length ?? 0) >= 2),
  },
];

export function newBadges(model: StudentModel): string[] {
  return BADGES.filter((b) => !model.badges.includes(b.id) && b.earned(model)).map((b) => b.id);
}

// Acceleration Readiness (§15) — 트랙 단위 선행 준비도(0~100)와 근거
export function accelerationReadiness(model: StudentModel, trackId: TrackId = model.activeTrack): { percent: number; ready: boolean; reasons: string[] } {
  const cfg = CONFIG.acceleration;
  const skills = trackSkills(trackId);
  const masteries = skills.length ? skills.map((s) => model.skills[s.id]?.mastery ?? 0) : [0];
  const avg = masteries.reduce((a, b) => a + b, 0) / masteries.length;
  const min = Math.min(...masteries);
  const recent = model.attempts.slice(-30);
  const acc = recent.length > 0 ? recent.filter((a) => a.correct).length / recent.length : 0;
  const careless = recent.filter((a) => a.autoDiagnosis === 'CARELESS').length / Math.max(1, recent.length);

  const percent = Math.round(
    Math.min(100, avg * 0.5 + min * 0.2 + acc * 100 * 0.2 + (1 - careless) * 100 * 0.1),
  );
  const ready = avg >= cfg.avgMasteryThreshold && min >= cfg.minSkillMastery;
  const reasons: string[] = [
    `${TRACK_MAP[trackId]?.name} 평균 mastery ${Math.round(avg)} (기준 ${cfg.avgMasteryThreshold})`,
    `가장 약한 단원 mastery ${Math.round(min)} (기준 ${cfg.minSkillMastery})`,
    `최근 30문제 정답률 ${Math.round(acc * 100)}%`,
  ];
  return { percent, ready, reasons };
}

// 트랙 최종 완성 = 전 스킬 Lv.5(Elite)까지 정복 (§"각 학년의 최종은 최고수준 문제로 마무리")
export function trackEliteDone(model: StudentModel, trackId: TrackId): boolean {
  const skills = trackSkills(trackId);
  return skills.length > 0 && skills.every((s) => (model.skills[s.id]?.masteredLevels.length ?? 0) >= 5);
}

export interface TrackStatus {
  trackId: TrackId;
  avgMastery: number;
  diagnosed: boolean;
  eliteDone: boolean;
  ready: boolean; // 다음 트랙으로 갈 준비 (avg ≥ 90 등)
  recommended: boolean; // 지금 학습을 추천하는 트랙
}

export function trackStatuses(model: StudentModel): TrackStatus[] {
  const statuses = TRACKS.map((t) => {
    const avg = t.hasContent ? overallMastery(model, t.id) : 0;
    const diagnosed = model.diagnosedTracks.includes(t.id);
    const accel = t.hasContent ? accelerationReadiness(model, t.id) : { ready: false };
    return {
      trackId: t.id,
      avgMastery: avg,
      diagnosed,
      eliteDone: t.hasContent ? trackEliteDone(model, t.id) : false,
      ready: accel.ready,
      recommended: false,
    };
  });
  // 추천: 현재 activeTrack이 아직 ready가 아니면 그 트랙, ready면 다음 트랙
  const activeIdx = statuses.findIndex((s) => s.trackId === model.activeTrack);
  if (activeIdx >= 0) {
    const active = statuses[activeIdx];
    if (active.ready) {
      const next = TRACKS.find((t) => t.prereqTracks.includes(model.activeTrack) && t.hasContent);
      const idx = next ? statuses.findIndex((s) => s.trackId === next.id) : -1;
      statuses[idx >= 0 ? idx : activeIdx].recommended = true;
    } else {
      statuses[activeIdx].recommended = true;
    }
  }
  return statuses;
}
