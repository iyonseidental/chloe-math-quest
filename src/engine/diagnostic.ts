// DiagnosticEngine — 적응형 초기 진단 (§6). 트랙(학년/과목) 단위로 실시한다.
// 각 스킬당 2문제: L2에서 시작 → 정답이면 L4, 오답이면 L1.
// 배치: ✓✓→Lv4 / ✓✗→Lv3 / ✗✓→Lv2 / ✗✗→Lv1 (이후 실전 데이터로 자동 보정)
import { trackSkills } from '../data/curriculum.ts';
import { generateProblem } from './generators/index.ts';
import type { Level, Problem, SkillId, TrackId } from './types.ts';

export interface DiagnosticSession {
  trackId: TrackId;
  order: SkillId[];
  index: number; // 현재 스킬 인덱스
  phase: 1 | 2;
  firstCorrect: boolean | null;
  placements: Record<SkillId, Level>;
  current: Problem;
  totalQuestions: number;
  answered: number;
}

export function startDiagnostic(trackId: TrackId): DiagnosticSession {
  const order = trackSkills(trackId).map((s) => s.id);
  return {
    trackId,
    order,
    index: 0,
    phase: 1,
    firstCorrect: null,
    placements: {},
    current: generateProblem(order[0], 2, 'diagnostic'),
    totalQuestions: order.length * 2,
    answered: 0,
  };
}

export function answerDiagnostic(s: DiagnosticSession, correct: boolean): { session: DiagnosticSession; done: boolean } {
  const skillId = s.order[s.index];
  if (s.phase === 1) {
    const nextLevel = (correct ? 4 : 1) as Level;
    return {
      session: {
        ...s,
        phase: 2,
        firstCorrect: correct,
        current: generateProblem(skillId, nextLevel, 'diagnostic'),
        answered: s.answered + 1,
      },
      done: false,
    };
  }
  const placement = (s.firstCorrect ? (correct ? 4 : 3) : correct ? 2 : 1) as Level;
  const placements = { ...s.placements, [skillId]: placement };
  const nextIndex = s.index + 1;
  if (nextIndex >= s.order.length) {
    return { session: { ...s, placements, answered: s.answered + 1 }, done: true };
  }
  return {
    session: {
      ...s,
      index: nextIndex,
      phase: 1,
      firstCorrect: null,
      placements,
      current: generateProblem(s.order[nextIndex], 2, 'diagnostic'),
      answered: s.answered + 1,
    },
    done: false,
  };
}
