// MasteryEngine — Mastery Score(0~100) 계산과 Mastery Gate(레벨 승급) 판정.
// 단순 정답률이 아니라 난이도·최신성·힌트·시간·전이·복습을 종합한다 (DESIGN.md PART D).
import { CONFIG } from './config.ts';
import type { Level, SkillState, StudentModel, TrackId } from './types.ts';
import { PLAYABLE_SKILLS, trackSkills } from '../data/curriculum.ts';

export function computeMastery(skill: SkillState): number {
  const cfg = CONFIG.mastery;
  const floor = cfg.levelFloor[Math.min(skill.masteredLevels.length, cfg.levelFloor.length - 1)];
  if (skill.recentWindow.length === 0) {
    return clamp(floor + skill.reviewAdjust, 0, 100);
  }

  // 최근 시도일수록, 난이도가 높을수록 큰 가중치
  let wSum = 0;
  let wCorrect = 0;
  let hinted = 0;
  let slowCount = 0;
  const win = skill.recentWindow.slice(-cfg.windowSize);
  for (let i = 0; i < win.length; i++) {
    const a = win[win.length - 1 - i]; // i=0이 최신
    const w = Math.pow(cfg.recencyDecay, i) * (a.level / 3);
    wSum += w;
    if (a.correct) wCorrect += w;
    if (a.hintsUsed > 0) hinted++;
    if (a.timeMs > a.estimatedSec * 1000 * 2) slowCount++;
  }
  const base = wSum > 0 ? wCorrect / wSum : 0;
  const hintRate = hinted / win.length;
  const transferBonus = skill.transferPassedAtLevel[skill.level] ? cfg.transferBonus : 0;
  const slowPenalty = slowCount / win.length > 0.5 ? cfg.slowPenalty : 0;

  const score = floor + base * cfg.levelSpan + transferBonus - hintRate * cfg.hintPenaltyScale - slowPenalty + skill.reviewAdjust;
  return Math.round(clamp(score, 0, 100));
}

export interface GateResult {
  pass: boolean;
  skipTest: boolean; // 정식 조건은 아니지만 실력이 확실해 조기 승급 허용
  missing: string[]; // 통과하지 못한 이유 (Explainability)
  stats: { attempts: number; accuracy: number; hintRate: number; transferPassed: boolean };
}

// 현재 도전 레벨에 대한 승급 판정. recentWindow에서 현재 레벨의 시도만 본다.
// openClinicCases > 0 이면 승급 불가 — 틀린 문제를 명확히 이해(클리닉 완치)해야 다음 단계로 간다.
export function checkGate(skill: SkillState, openClinicCases = 0): GateResult {
  const cfg = CONFIG.gate;
  const atLevel = skill.recentWindow.filter((a) => a.level === skill.level && a.variant !== 'diagnostic');
  const win = atLevel.slice(-cfg.windowSize);
  const attempts = win.length;
  const correct = win.filter((a) => a.correct).length;
  const accuracy = attempts > 0 ? correct / attempts : 0;
  const hintRate = attempts > 0 ? win.filter((a) => a.hintsUsed > 0).length / attempts : 0;
  const transferPassed = !!skill.transferPassedAtLevel[skill.level];

  const missing: string[] = [];
  if (openClinicCases > 0) missing.push(`오답 클리닉 ${openClinicCases}건 완치하기 — 틀린 이유를 알아야 진짜 다음 단계!`);
  if (attempts < cfg.minAttempts) missing.push(`이 레벨에서 ${cfg.minAttempts - attempts}문제 더 풀기`);
  if (accuracy < cfg.minAccuracy) missing.push(`최근 정답률 ${Math.round(accuracy * 100)}% → ${Math.round(cfg.minAccuracy * 100)}% 이상`);
  if (hintRate > cfg.maxHintRate) missing.push(`힌트 의존도 낮추기 (현재 ${Math.round(hintRate * 100)}%)`);
  if (cfg.requireTransfer && !transferPassed) missing.push('전이 문제(새로운 상황) 1회 성공');

  // Skip Test: 무힌트·정상시간 연속 정답이 충분하고 전이도 성공했다면 조기 승급 (rigid 방지)
  // 단, 미완치 클리닉이 있으면 Skip Test도 불가 — 필수 복습 원칙이 우선한다
  const skipTest =
    openClinicCases === 0 &&
    skill.consecutiveCorrect >= cfg.skipStreak + 2 &&
    transferPassed &&
    accuracy >= cfg.minAccuracy &&
    missing.length === 1 &&
    attempts < cfg.minAttempts;

  return { pass: missing.length === 0 || skipTest, skipTest, missing, stats: { attempts, accuracy, hintRate, transferPassed } };
}

export function masteredLevelUp(skill: SkillState): SkillState {
  const newMastered = skill.masteredLevels.includes(skill.level) ? skill.masteredLevels : [...skill.masteredLevels, skill.level];
  const nextLevel = Math.min(5, skill.level + 1) as Level;
  return { ...skill, masteredLevels: newMastered, level: nextLevel, consecutiveCorrect: 0, consecutiveWrong: 0 };
}

// trackId를 주면 그 트랙만, 없으면 전체 스킬의 평균 mastery
export function overallMastery(model: StudentModel, trackId?: TrackId): number {
  const list = trackId ? trackSkills(trackId) : PLAYABLE_SKILLS;
  const vals = list.map((s) => model.skills[s.id]?.mastery ?? 0);
  return Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length));
}

// Knowledge Map 색상 단계 (§17). diagnosed=true면 진단으로 추정된 mastery도 색으로 반영한다.
export type MapStatus = 'green' | 'yellow' | 'orange' | 'red' | 'untouched';
export function mapStatus(skill: SkillState | undefined, diagnosed = false): MapStatus {
  if (!skill || (skill.attempts === 0 && !diagnosed)) return 'untouched';
  if (skill.mastery >= 90) return 'green';
  if (skill.mastery >= 75) return 'yellow';
  if (skill.mastery >= 50) return 'orange';
  return 'red';
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
