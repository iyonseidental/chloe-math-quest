// CHLOE MATH 2.1 — Evidence Attribution Layer (PART F, R3).
// Replaces the old fixed-30%-to-secondary rule. Principle: "no penalty before diagnosis" —
// wrong answers are diagnosed and attributed to the skill(s) actually responsible before
// any mastery evidence is applied; correct answers only credit a secondary skill when we
// genuinely lack information about it (confidence <= LOW), never when we already know.
import { CONFIG21 } from './config21.ts';
import { correctEvidenceWeight, wrongEvidenceWeight, confidenceRank, type CorrectEvidenceInput } from './mastery21.ts';
import type { ErrorType21, EstimateConfidence } from './types21.ts';

export interface SkillEvidence {
  skillId: string;
  role: 'primary' | 'secondary';
  attributionProbability: number;
  kind: 'correct' | 'wrong';
  weight: number;
  reason: string;
}

export interface SkillMeta {
  currentDifficulty: number;
  estimateConfidence: EstimateConfidence;
}

export interface AttributeInput {
  primarySkillId: string;
  secondarySkillIds: string[];
  correct: boolean;
  chosenErrorType: ErrorType21 | null;
  difficulty: number;
  hintsUsed: number;
  selfCorrected: boolean;
  isGuess: boolean;
  sameSkillRunLength: number;
  skillMeta: Record<string, SkillMeta>;
}

// Phase 1 adapter simplification (documented, PART A / curriculum21.ts): the reused v1
// generators tag distractors with a generic ErrorType, not a literal per-distractor
// misconception/skill pointer. So which secondary skill a wrong answer implicates is
// declared per (primarySkill, errorType) here, rather than read off the problem itself.
// Only skills that actually declare secondarySkillIds in curriculum21 need an entry.
interface AttributionRule {
  errorType: ErrorType21;
  secondaryProbability: number;
  primaryProbability: number;
}
const ATTRIBUTION_RULES: Record<string, AttributionRule[]> = {
  'M1.ALG.EQ.02': [
    { errorType: 'CONCEPT_GAP', secondaryProbability: 0.6, primaryProbability: 0.3 },
    { errorType: 'CALCULATION_ERROR', secondaryProbability: 0.6, primaryProbability: 0.3 },
  ],
  'M1.ALG.EQ.03': [
    { errorType: 'CONCEPT_GAP', secondaryProbability: 0.6, primaryProbability: 0.3 },
    { errorType: 'INTERPRETATION_ERROR', secondaryProbability: 0.6, primaryProbability: 0.3 },
  ],
  // ---- Phase 2 PART 43 step 8 — 중1 전체 확장분 ----
  // 반비례 계산 오류: 실체는 분수 나눗셈(secondary FRAC.01)일 확률이 높다
  'M1.FUN.PROP.03': [
    { errorType: 'CALCULATION_ERROR', secondaryProbability: 0.6, primaryProbability: 0.3 },
    { errorType: 'CONCEPT_GAP', secondaryProbability: 0.4, primaryProbability: 0.5 },
  ],
  // 평균 역산의 계산 오류: 이항 처리(secondary EQ.01) 결손 신호
  'M1.STA.AVG.02': [{ errorType: 'CALCULATION_ERROR', secondaryProbability: 0.5, primaryProbability: 0.4 }],
  // 상대도수의 계산 오류: 분수→소수 변환(secondary FRAC.01) 결손 신호
  'M1.STA.REL.01': [{ errorType: 'CALCULATION_ERROR', secondaryProbability: 0.55, primaryProbability: 0.35 }],
  // 내각합 역산의 계산 오류: (n−2)·180=합 방정식 풀이(secondary EQ.AX.01) 결손 신호
  'M1.GEO.POLY.02': [{ errorType: 'CALCULATION_ERROR', secondaryProbability: 0.55, primaryProbability: 0.35 }],
};

const NON_DIAGNOSTIC_ERRORS: ErrorType21[] = ['CARELESS_ERROR', 'GUESSING', 'TIME_PRESSURE'];

function attributeCorrect(input: AttributeInput): SkillEvidence[] {
  const meta = input.skillMeta[input.primarySkillId] ?? { currentDifficulty: 3, estimateConfidence: 'VERY_LOW' as const };
  const ceInput: CorrectEvidenceInput = {
    difficulty: input.difficulty,
    currentDifficulty: meta.currentDifficulty,
    hintsUsed: input.hintsUsed,
    selfCorrected: input.selfCorrected,
    isGuess: input.isGuess,
    sameSkillRunLength: input.sameSkillRunLength,
  };
  const results: SkillEvidence[] = [
    {
      skillId: input.primarySkillId,
      role: 'primary',
      attributionProbability: 1.0,
      kind: 'correct',
      weight: correctEvidenceWeight(ceInput),
      reason: '정답 — primary 스킬에 증거 전액 반영',
    },
  ];
  for (const s of input.secondarySkillIds) {
    const sMeta = input.skillMeta[s] ?? { currentDifficulty: 3, estimateConfidence: 'VERY_LOW' as const };
    const lowInfo = confidenceRank(sMeta.estimateConfidence) <= confidenceRank('LOW');
    if (!lowInfo) {
      results.push({ skillId: s, role: 'secondary', attributionProbability: 0, kind: 'correct', weight: 0, reason: '이미 confidence가 충분해 추가 증거 불필요 (0 evidence)' });
      continue;
    }
    const w = correctEvidenceWeight({ ...ceInput, currentDifficulty: sMeta.currentDifficulty, sameSkillRunLength: 1 }) * CONFIG21.attribution.correctSecondaryFactor;
    results.push({ skillId: s, role: 'secondary', attributionProbability: 0.3, kind: 'correct', weight: w, reason: '정보가 부족한(LOW confidence) secondary에 약한 긍정 신호' });
  }
  return results;
}

function attributeWrong(input: AttributeInput): SkillEvidence[] {
  const errorType = input.chosenErrorType ?? 'UNKNOWN';
  const baseWeight = wrongEvidenceWeight({ difficulty: input.difficulty, errorType });

  if (NON_DIAGNOSTIC_ERRORS.includes(errorType) || input.secondarySkillIds.length === 0) {
    const results: SkillEvidence[] = [
      { skillId: input.primarySkillId, role: 'primary', attributionProbability: 1.0, kind: 'wrong', weight: baseWeight, reason: `${errorType} — 원인이 특정 secondary를 지목하지 않아 primary에 전액` },
    ];
    for (const s of input.secondarySkillIds) results.push({ skillId: s, role: 'secondary', attributionProbability: 0, kind: 'wrong', weight: 0, reason: '단순 실수/추측/시간 압박은 무관 skill에 벌점 없음' });
    return results;
  }

  const rule = ATTRIBUTION_RULES[input.primarySkillId]?.find((r) => r.errorType === errorType);
  if (!rule) {
    const results: SkillEvidence[] = [
      { skillId: input.primarySkillId, role: 'primary', attributionProbability: 1.0, kind: 'wrong', weight: baseWeight, reason: `${errorType}는 이 스킬의 secondary 귀속 규칙과 매칭되지 않아 개념 자체 오류로 귀속` },
    ];
    for (const s of input.secondarySkillIds) results.push({ skillId: s, role: 'secondary', attributionProbability: 0, kind: 'wrong', weight: 0, reason: '이 오류 유형은 이 secondary를 지목하지 않음' });
    return results;
  }

  // rule matched: the FIRST declared secondary is the implicated root (Phase 1: one rule -> one skill)
  const [root, ...others] = input.secondarySkillIds;
  const rootWeight = baseWeight * rule.secondaryProbability;
  const primaryWeight = baseWeight * CONFIG21.attribution.wrongPrimaryFactorWhenSecondaryIsRoot;
  const results: SkillEvidence[] = [
    { skillId: root, role: 'secondary', attributionProbability: rule.secondaryProbability, kind: 'wrong', weight: rootWeight, reason: `${errorType} 패턴이 "${root}"의 실수와 일치 — 벌점 집중` },
    { skillId: input.primarySkillId, role: 'primary', attributionProbability: rule.primaryProbability, kind: 'wrong', weight: primaryWeight, reason: '귀속된 원인이 아니므로 문제 맥락상 약한 벌점만' },
  ];
  for (const s of others) results.push({ skillId: s, role: 'secondary', attributionProbability: 0, kind: 'wrong', weight: 0, reason: '이 문제와 무관한 secondary — 벌점 없음' });
  return results;
}

export function attributeEvidence(input: AttributeInput): SkillEvidence[] {
  return input.correct ? attributeCorrect(input) : attributeWrong(input);
}

// Helper for downstream engines (rootcause21): which skill is currently implicated as
// the likely root of a wrong answer (highest attribution probability).
export function likelyRoot(evidence: SkillEvidence[]): string {
  return evidence.reduce((best, e) => (e.attributionProbability > best.attributionProbability ? e : best), evidence[0]).skillId;
}
