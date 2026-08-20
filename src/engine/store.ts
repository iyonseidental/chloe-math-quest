// 영속화 계층 — localStorage. 이후 Supabase/Firebase 교체 시 이 파일만 바꾼다.
import { PLAYABLE_SKILLS } from '../data/curriculum.ts';
import type { SkillState, StudentModel } from './types.ts';

const KEY = 'chloe-math-quest-v1';

export function freshSkillState(): SkillState {
  return {
    mastery: 0,
    level: 1,
    masteredLevels: [],
    attempts: 0,
    correct: 0,
    recentWindow: [],
    errorCounts: {},
    transferPassedAtLevel: {},
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    reviewAdjust: 0,
  };
}

export function freshModel(name = 'Chloe'): StudentModel {
  const skills: Record<string, SkillState> = {};
  for (const s of PLAYABLE_SKILLS) skills[s.id] = freshSkillState();
  return {
    version: 2,
    name,
    activeTrack: 'M1',
    diagnosedTracks: [],
    createdAt: Date.now(),
    lastActiveDate: null,
    streakDays: 0,
    xp: 0,
    badges: [],
    skills,
    attempts: [],
    clinicQueue: [],
    reviews: [],
    snapshots: [],
  };
}

export function loadModel(): StudentModel {
  if (typeof localStorage === 'undefined') return freshModel();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshModel();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;
    if (parsed.version === 1) {
      // v1 → v2: diagnosisDone → diagnosedTracks, gradeCursor → activeTrack
      parsed.version = 2;
      parsed.activeTrack = 'M1';
      parsed.diagnosedTracks = parsed.diagnosisDone ? ['M1'] : [];
      delete parsed.diagnosisDone;
      delete parsed.gradeCursor;
    }
    if (parsed.version !== 2) return freshModel();
    // 커리큘럼에 새 스킬이 추가됐다면 상태를 보충한다
    const base = freshModel(parsed.name);
    return { ...base, ...(parsed as StudentModel), skills: { ...base.skills, ...parsed.skills } };
  } catch {
    return freshModel();
  }
}

export function saveModel(model: StudentModel): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(model));
  } catch {
    // 저장 실패(용량 등)는 조용히 무시 — 다음 저장에서 재시도된다
  }
}

export function clearModel(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(KEY);
}
