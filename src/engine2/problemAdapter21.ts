// CHLOE MATH 2.1 — Problem adapter. Reuses the existing, validated 38,000-problem
// generator bank (src/engine/generators) instead of writing new content (PART A).
// Each micro-skill anchors to one existing (v1 skillId, base level); engine2's own
// 1-5 difficulty knob shifts the fetched v1 level around that anchor, so difficulty
// still changes actual content while staying inside the validated bank.
import { generateProblem } from '../engine/generators/index.ts';
import type { Level } from '../engine/types.ts';
import type { ErrorType21 } from './types21.ts';
import { MICRO_SKILL_MAP } from './curriculum21.ts';

const V1_TO_21: Record<string, ErrorType21> = {
  CONCEPT: 'CONCEPT_GAP',
  CALCULATION: 'CALCULATION_ERROR',
  SIGN: 'SIGN_ERROR',
  FORMULA: 'FORMULA_ERROR',
  INTERPRETATION: 'INTERPRETATION_ERROR',
  CARELESS: 'CARELESS_ERROR',
  PREREQUISITE: 'PREREQUISITE_GAP',
  TIME: 'TIME_PRESSURE',
  GUESSING: 'GUESSING',
};

export function mapErrorType(v1Tag: string | null): ErrorType21 | null {
  if (!v1Tag) return null;
  return V1_TO_21[v1Tag] ?? 'UNKNOWN';
}

export interface Choice21 {
  text: string;
  errorType: ErrorType21 | null;
  // Phase 2 PART 5-1: distractor 단위 오개념 태그 (태깅된 생성기부터 점진 공급)
  misconceptionId?: string;
  diagnosticStrength?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Problem21 {
  id: string;
  skillId: string; // micro-skill id
  secondarySkillIds: string[];
  difficulty: number; // 1..5, engine2 scale
  variant: 'standard' | 'transfer';
  stem: string;
  choices: Choice21[];
  answerIndex: number;
  hints: [string, string, string];
  idea: string;
  solve: string;
  remember: string;
  estimatedSec: number;
}

function toV1Level(baseV1Level: number, difficulty: number, levelWindow?: [number, number]): Level {
  // Phase 2 PART 9/10: v1 생성기는 레벨마다 주제가 달라서, 전 범위(±2)를 쓰면 저난이도가
  // 전제 주제 문항으로 새어 진단 순수성이 깨진다. 신규 스킬은 levelWindow로 주제가 유지되는
  // 레벨 대역만 선언하고, 난이도 1..5를 그 대역 위에 선형 사상한다. (파일럿 10개는 Phase 1
  // 동결 행동 보존을 위해 window 미선언 = 종전 ±2 방식 그대로.)
  if (levelWindow) {
    const [lo, hi] = levelWindow;
    const mapped = lo + Math.round(((difficulty - 1) / 4) * (hi - lo));
    return Math.min(5, Math.max(1, mapped)) as Level;
  }
  const shifted = baseV1Level + (difficulty - 3);
  return Math.min(5, Math.max(1, Math.round(shifted))) as Level;
}

export function generateProblem21(skillId: string, difficulty: number, variant: 'standard' | 'transfer' = 'standard'): Problem21 {
  const def = MICRO_SKILL_MAP[skillId];
  if (!def) throw new Error(`unknown micro-skill: ${skillId}`);
  const v1Level = toV1Level(def.problemSource.baseV1Level, difficulty, def.problemSource.levelWindow);
  // Phase 3 STEP 2: micro-skill 서빙은 은행을 우회한다 — 은행은 레벨 단위 큐레이션이라
  // micro-skill 주제 순수성(그리고 distractor 태깅)을 보장하지 못한다.
  const p = generateProblem(def.problemSource.generatorSkillId, v1Level, variant, false);
  return {
    id: p.id,
    skillId,
    secondarySkillIds: def.secondarySkillIds ?? [],
    difficulty: Math.min(5, Math.max(1, Math.round(difficulty))),
    variant,
    stem: p.stem,
    choices: p.choices.map((c) => ({ text: c.text, errorType: mapErrorType(c.errorType), misconceptionId: c.misconceptionId, diagnosticStrength: c.diagnosticStrength })),
    answerIndex: p.answerIndex,
    hints: p.hints,
    idea: p.idea,
    solve: p.solve,
    remember: p.remember,
    estimatedSec: p.estimatedSec,
  };
}
