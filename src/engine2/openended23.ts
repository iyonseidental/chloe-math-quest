// CHLOE MATH 2.3 — OPEN_ENDED 평가 (Phase 3 STEP 10, PART 15-18).
//
// 원칙 (PART 16):
//   · 자유서술을 불투명한 단일 AI 점수로 Mastery에 반영하지 않는다.
//   · 1층 = 결정적 검증 (본문 판별 + 근거 후속의 선택 구조), 2층 = 문제별 rubric,
//     3층(선택) = AI 해석 계층 — 인터페이스만 정의하고 현재는 미사용. AI가 쓰이는 날에도
//     confidence/reason/rubricDimension 없는 판정은 무효이며, 불확실하면 NEEDS_REVIEW.
//   · PART 18: 정답 여부(Answer Correctness)와 추론 품질(Reasoning Quality)을 분리한다 —
//     본문 정답만으로 explanation/justification은 절대 오르지 않는다 (evidenceMap 배제가 강제).
import type { OpenEndedRubric } from './eliteBank22.ts';

export type OpenEndedGradeStatus = 'GRADED' | 'NEEDS_REVIEW';

export interface OpenEndedGrade {
  status: OpenEndedGradeStatus;
  rubricLevel: number | null; // 0..4, NEEDS_REVIEW면 null
  answerCorrect: boolean; // 정답 여부 — 추론 품질과 분리 보고 (PART 18)
  confidence: number; // 0..1 — 규칙이 얼마나 확신하는가
  rubricDimension: 'reasoning-quality';
  reason: string; // 설명 가능해야 한다 (black-box 금지)
}

export interface OpenEndedSignals {
  mainCorrect: boolean;
  hintsUsed: ('A' | 'B' | 'C' | 'D')[];
  // 근거 후속(justification/explanation 차원 후속)의 결과 — 없으면 null (아직 안 풀었음)
  justificationFollowUpCorrect: boolean | null;
  // 일반화 후속의 결과 — 문제에 없으면 null
  generalizationFollowUpCorrect: boolean | null;
}

// 설명 가능한 규칙 채점 — rubric level의 결정적 근사:
//   0: 본문 오답 + 근거 후속도 오답 (유효한 추론 관찰 안 됨)
//   1: 본문 오답이지만 근거 후속은 정답 (부분 관찰 — 아이디어는 있으나 판정 실패)
//   2: 본문 정답 + 근거 후속 오답 (핵심 아이디어는 맞았으나 추론 연결 불완전)
//   3: 본문 정답 + 근거 후속 정답
//   4: 3 + 일반화 후속까지 정답 (일반 구조/대안 통찰)
// D힌트(START)까지 소모한 정답은 자력 판정으로 보기 어려움 → NEEDS_REVIEW.
export function gradeOpenEnded(rubric: OpenEndedRubric, s: OpenEndedSignals): OpenEndedGrade {
  const base = { answerCorrect: s.mainCorrect, rubricDimension: 'reasoning-quality' as const };

  if (s.mainCorrect && s.hintsUsed.includes('D')) {
    return { ...base, status: 'NEEDS_REVIEW', rubricLevel: null, confidence: 0.3, reason: 'START 힌트까지 사용한 정답 — 자력 추론인지 판단 불가, 사람/후속 관찰 필요' };
  }
  if (s.justificationFollowUpCorrect === null) {
    // 근거 관찰이 아직 없음 — 정답 여부만 보고, 추론 품질 판정은 보류 (PART 18)
    return { ...base, status: 'NEEDS_REVIEW', rubricLevel: null, confidence: 0.4, reason: '근거 후속 미관찰 — 정답 여부만 기록, 추론 품질은 판정 보류' };
  }

  let level;
  if (!s.mainCorrect) level = s.justificationFollowUpCorrect ? 1 : 0;
  else if (!s.justificationFollowUpCorrect) level = 2;
  else level = s.generalizationFollowUpCorrect === true ? 4 : 3;

  const hintPenaltyNote = s.hintsUsed.length > 0 ? ` (힌트 ${s.hintsUsed.join(',')} 사용 — 증거 가중은 힌트 할인으로 반영됨)` : '';
  return {
    ...base,
    status: 'GRADED',
    rubricLevel: level,
    confidence: s.hintsUsed.length >= 2 ? 0.6 : 0.85,
    reason: `${rubric.criteria[level]}${hintPenaltyNote}`,
  };
}

// 3층(선택) — AI 해석 계층의 계약. 현재 파일럿에서는 구현하지 않는다 (PART 16).
// 구현하는 날에도 이 형태를 지키지 못하는 판정(근거 없는 점수)은 시스템이 수용하지 않는다.
export interface AiInterpretation {
  confidence: number;
  reason: string;
  rubricDimension: string;
  suggestedLevel: number;
}
