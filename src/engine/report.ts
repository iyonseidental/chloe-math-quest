// Weekly Report Engine (§37~39) — 학부모용 주간 분석.
// "몇 문제 풀었는가"가 아니라 "구멍을 몇 개 발견하고 몇 개를 영구히 메꿨는가"를 중심에 둔다.
import { SKILL_MAP, TRACKS, trackSkills } from '../data/curriculum.ts';
import { ERROR_LABELS } from './errors.ts';
import { priorityScores } from './adaptive.ts';
import { accelerationReadiness } from './progression.ts';
import { overallMastery } from './mastery.ts';
import { addDays, todayStr } from './review.ts';
import type { StudentModel, TrackId } from './types.ts';

export interface WeekStats {
  solved: number;
  accuracy: number; // 0~1
  studyDays: number;
  studyMinutes: number;
  carelessRate: number; // 오답 중 CARELESS 비율
}

export interface WeeklyReport {
  periodLabel: string;
  week: WeekStats;
  prev: WeekStats;
  weaknessesFound: number; // 이번 주 생성된 클리닉 케이스
  weaknessesFixed: number; // 이번 주 완치된 케이스
  levelsMastered: number; // 이번 주 정복한 (스킬×레벨) 수 — 스냅샷 기반 추정
  overallDelta: number;
  biggestImprovement: { skillId: string; name: string; from: number; to: number } | null;
  fixedWeaknessLabels: string[]; // 예: "부호 실수 (정수와 유리수)"
  currentWeakness: { skillId: string; name: string; mastery: number } | null;
  nextGoals: string[];
  trackProgress: { trackId: TrackId; name: string; mastery: number; diagnosed: boolean }[];
  // 여러 학년을 동시에 진행해도 학년별로 분리해 보여준다
  perTrackWeek: { trackId: TrackId; name: string; solved: number; accuracy: number; wrongFixed: number }[];
}

function statsBetween(model: StudentModel, fromTs: number, toTs: number): WeekStats {
  const list = model.attempts.filter((a) => a.ts >= fromTs && a.ts < toTs && a.variant !== 'diagnostic');
  const wrong = list.filter((a) => !a.correct);
  const days = new Set(list.map((a) => new Date(a.ts).toISOString().slice(0, 10)));
  return {
    solved: list.length,
    accuracy: list.length ? list.filter((a) => a.correct).length / list.length : 0,
    studyDays: days.size,
    studyMinutes: Math.round(list.reduce((s, a) => s + a.timeMs, 0) / 60000),
    carelessRate: wrong.length ? wrong.filter((a) => a.autoDiagnosis === 'CARELESS').length / wrong.length : 0,
  };
}

export function buildWeeklyReport(model: StudentModel, today = todayStr()): WeeklyReport {
  const now = Date.parse(today + 'T23:59:59');
  const weekAgo = Date.parse(addDays(today, -7));
  const twoWeeksAgo = Date.parse(addDays(today, -14));

  const week = statsBetween(model, weekAgo, now);
  const prev = statsBetween(model, twoWeeksAgo, weekAgo);

  const weaknessesFound = model.clinicQueue.filter((c) => c.createdTs >= weekAgo).length;
  const fixedCases = model.clinicQueue.filter((c) => c.resolved && (c.resolvedTs ?? c.createdTs) >= weekAgo);

  // 스냅샷으로 mastery 변화 추적
  const weekAgoSnap = [...model.snapshots].reverse().find((s) => s.date <= addDays(today, -7)) ?? model.snapshots[0] ?? null;
  const overallNow = overallMastery(model);
  const overallDelta = weekAgoSnap ? overallNow - weekAgoSnap.overallMastery : overallNow;

  let biggestImprovement: WeeklyReport['biggestImprovement'] = null;
  if (weekAgoSnap) {
    let best: { skillId: string; delta: number; from: number; to: number } | null = null;
    for (const [skillId, s] of Object.entries(model.skills)) {
      const from = weekAgoSnap.bySkill[skillId] ?? 0;
      const delta = s.mastery - from;
      if (delta > 0 && (!best || delta > best.delta)) best = { skillId, delta, from, to: s.mastery };
    }
    if (best && best.delta >= 3) {
      biggestImprovement = { skillId: best.skillId, name: SKILL_MAP[best.skillId]?.name ?? best.skillId, from: best.from, to: best.to };
    }
  }

  const fixedWeaknessLabels = [...new Set(fixedCases.map((c) => `${ERROR_LABELS[c.diagnosis].label} (${SKILL_MAP[c.skillId]?.name ?? c.skillId})`))].slice(0, 4);

  // 현재 약점: 진단/학습된 스킬 중 mastery 최저
  const touched = Object.entries(model.skills).filter(([id, s]) => s.attempts > 0 || model.diagnosedTracks.includes(SKILL_MAP[id]?.grade));
  const weakest = touched.sort((a, b) => a[1].mastery - b[1].mastery)[0];
  const currentWeakness = weakest ? { skillId: weakest[0], name: SKILL_MAP[weakest[0]]?.name ?? weakest[0], mastery: weakest[1].mastery } : null;

  // 다음 주 목표: 우선순위 상위 2개 스킬 + 선행 준비되면 다음 과정
  const goals: string[] = [];
  for (const p of priorityScores(model, today, model.activeTrack).slice(0, 2)) {
    const s = model.skills[p.skillId];
    goals.push(`${SKILL_MAP[p.skillId]?.name} Lv.${s.level} ${s.level >= 5 ? '완성(Elite)' : '정복'}`);
  }
  const accel = accelerationReadiness(model, model.activeTrack);
  const nextTrack = TRACKS.find((t) => t.prereqTracks.includes(model.activeTrack));
  if (accel.ready && nextTrack) goals.push(`${nextTrack.name} ${nextTrack.hasContent ? '진단 도전 🚀' : '준비 (Phase 3 오픈 대기)'}`);

  // 이번 주 정복 레벨 수: masteredLevels 총합 변화 근사 — 스냅샷에는 없으므로 클리닉·정답 기반 대신 attempts에서 gate 통과 시점 추적 불가.
  // 근사: 이번 주 attempts 중 "그 시점의 스킬 레벨 상승"은 기록에 없으니, 주간 mastery 상승 스킬 수로 대체
  const levelsMastered = weekAgoSnap
    ? Object.entries(model.skills).filter(([id, s]) => (weekAgoSnap.bySkill[id] ?? 0) < 78 && s.mastery >= 78).length
    : 0;

  const trackProgress = TRACKS.filter((t) => t.hasContent).map((t) => ({
    trackId: t.id,
    name: t.name,
    mastery: overallMastery(model, t.id),
    diagnosed: model.diagnosedTracks.includes(t.id),
  }));

  const weekAttempts = model.attempts.filter((a) => a.ts >= weekAgo && a.ts < now && a.variant !== 'diagnostic');
  const perTrackWeek = TRACKS.filter((t) => t.hasContent)
    .map((t) => {
      const skillIds = new Set(trackSkills(t.id).map((s) => s.id));
      const list = weekAttempts.filter((a) => skillIds.has(a.skillId));
      const fixed = fixedCases.filter((c) => skillIds.has(c.skillId)).length;
      return {
        trackId: t.id,
        name: t.name,
        solved: list.length,
        accuracy: list.length ? list.filter((a) => a.correct).length / list.length : 0,
        wrongFixed: fixed,
      };
    })
    .filter((t) => t.solved > 0 || model.diagnosedTracks.includes(t.trackId));

  return {
    periodLabel: `${addDays(today, -6).slice(5).replace('-', '.')} ~ ${today.slice(5).replace('-', '.')}`,
    week,
    prev,
    weaknessesFound,
    weaknessesFixed: fixedCases.length,
    levelsMastered,
    overallDelta,
    biggestImprovement,
    fixedWeaknessLabels,
    currentWeakness,
    nextGoals: goals,
    trackProgress,
    perTrackWeek,
  };
}
