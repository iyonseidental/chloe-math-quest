// 파일 기반 문제은행 로더 — UCAT 문제은행처럼 트랙별 JSON 파일로 관리한다.
// 새 문제 추가: 해당 트랙 JSON의 questions 배열에 항목을 넣고 `npm run verify:bank`로 검증.
import m1 from './m1.json' with { type: 'json' };
import m2 from './m2.json' with { type: 'json' };
import m3 from './m3.json' with { type: 'json' };
import type { Choice, ErrorType, Level, Problem, SkillId, Variant } from '../../engine/types.ts';

export interface BankQuestion {
  id: string;
  skill: SkillId;
  level: number;
  variant: string;
  stem: string;
  choices: { text: string; error: string | null }[];
  answerIndex: number;
  hints: string[];
  idea: string;
  solve: string;
  remember: string;
  estimatedSec: number;
  tags?: string[];
}

export interface BankFile {
  track: string;
  name: string;
  schemaVersion: number;
  updated: string;
  note?: string;
  questions: BankQuestion[];
}

export const BANK_FILES: BankFile[] = [m1, m2, m3] as BankFile[];

// (skill, level, variant) → 문제 목록 인덱스
const index = new Map<string, BankQuestion[]>();
for (const file of BANK_FILES) {
  for (const q of file.questions) {
    const key = `${q.skill}|${q.level}|${q.variant}`;
    const list = index.get(key) ?? [];
    list.push(q);
    index.set(key, list);
  }
}

export const bankSize = BANK_FILES.reduce((n, f) => n + f.questions.length, 0);

// 같은 문제의 연속 출제를 피하기 위한 최근 출제 기록
const recentlyServed = new Set<string>();

export function bankLookup(skillId: SkillId, level: Level, variant: Variant): BankQuestion | null {
  // warmup/challenge/review/diagnostic은 standard 풀에서 가져온다
  const effective = variant === 'transfer' ? 'transfer' : 'standard';
  const pool = index.get(`${skillId}|${level}|${effective}`) ?? [];
  const fresh = pool.filter((q) => !recentlyServed.has(q.id));
  const candidates = fresh.length > 0 ? fresh : pool;
  if (candidates.length === 0) return null;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  recentlyServed.add(chosen.id);
  if (recentlyServed.size > 24) {
    const first = recentlyServed.values().next().value;
    if (first) recentlyServed.delete(first);
  }
  return chosen;
}

let bankSeq = 0;

export function toProblem(q: BankQuestion, variant: Variant): Problem {
  return {
    id: `${q.id}.${Date.now().toString(36)}${(bankSeq++ % 1000).toString(36)}`,
    skillId: q.skill,
    level: Math.min(5, Math.max(1, q.level)) as Level,
    variant,
    stem: q.stem,
    choices: q.choices.map((c): Choice => ({ text: c.text, errorType: (c.error as ErrorType) ?? null })),
    answerIndex: q.answerIndex,
    hints: [q.hints[0] ?? '', q.hints[1] ?? '', q.hints[2] ?? ''],
    idea: q.idea,
    solve: q.solve,
    remember: q.remember,
    estimatedSec: q.estimatedSec,
  };
}
