// CHLOE MATH 2.1 — Session Orchestrator (PART Q step 10).
// `processAttemptEvent` is the ONE place all seven engines meet. It is called both by
// the live path (submitAttempt: append event, then apply it) and by replay21.fold
// (iterate applyEvent over history) — so replay always reproduces exactly what happened
// live, and a changed config/model can recompute the whole twin losslessly (PART N).
import { CONFIG21, MASTERY_MODEL_VERSION, CONFIG21_VERSION } from './config21.ts';
import { ALL_SKILL_IDS, MICRO_SKILL_MAP, MISCONCEPTION_LIBRARY } from './curriculum21.ts';
import { generateProblem21, type Problem21 } from './problemAdapter21.ts';
import { addCorrectEvidence, addWrongEvidence, applyTimeDecay, computeStats, estimateConfidence, isGuessLikely, predictSuccess } from './mastery21.ts';
import { attributeEvidence, likelyRoot, type SkillMeta } from './attribution21.ts';
import { processTriggerAttempt, processConfirmationAttempt, resolveMisconception, activeMisconceptionIds, suspectedMisconceptionIds, capMasteryForActiveMisconceptions } from './misconception21.ts';
import { computeStability, type StabilityInput } from './stability21.ts';
import { needsInvestigation, beginInvestigation, advanceInvestigation, type InvestigationContext, type CandidateInfo } from './rootcause21.ts';
import { acknowledgeMicroLesson, advanceRemediation, buildOutcome, difficultyForStage, initialGapClosureQuality, skillForStage, upgradeGapClosure, reopenGap } from './remediation21.ts';
import { checkProvisionalGate, derivePreGateState, checkSuddenCrash, scheduleFirstReview, applyReviewResult, isReviewDue } from './retention21.ts';
import { selectNextSkill, checkFastTrack, frustrationAction, exceedsDiagnosticShare, type PriorityInput } from './adaptive21.ts';
import type { AttemptMode, AttemptPayload, DiagnosticPlacementPayload, EventLog, LearningEvent } from './events21.ts';
import { appendEvent, makeEvent } from './events21.ts';
import type { AgendaItem, DigitalTwin21, KnowledgeState, PredictionRecord, RemediationCase, SkillState21 } from './types21.ts';
import { applyEliteEvidence, classifyEliteFailure, classifyStruggle, challengeValue, eliteEligibleForSkills, eliteShareTarget, pickDeepFollowUp, type EliteDimension, type EliteEvidencePayload, type EliteRootCause, type ProblemMode, type StrategyTrace } from './elite22.ts';
import { ELITE_BANK, ELITE_BANK_MAP } from './eliteBank22.ts';

// IDs generated OUTSIDE the reducer (e.g. a new attemptId at submit time) may use wall
// clock time freely — they get stored in the event and never regenerated. IDs generated
// INSIDE processAttemptEvent (new case/agenda ids) must be deterministic functions of the
// event itself, or replay would fabricate different ids than the live run did and the
// twin would diverge (PART N). `detId` is for the latter: attemptId + a fixed semantic
// tag, never a clock or a mutable counter.
let liveIdSeq = 0;
const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${liveIdSeq++}`;
const detId = (attemptId: string, tag: string) => `${attemptId}::${tag}`;
export const dateStr = (ts: number) => new Date(ts).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Pure read helpers (decay-aware, never mutate)
// ---------------------------------------------------------------------------
function decayedStats(skill: SkillState21, today: string) {
  const d = applyTimeDecay(skill.alpha, skill.beta, skill.lastPracticedAt, today);
  const stats = computeStats(d.alpha, d.beta);
  return { alpha: d.alpha, beta: d.beta, ...stats, confidence: estimateConfidence(stats.effectiveEvidence, stats.uncertainty) };
}

function skillMetaFor(twin: DigitalTwin21, skillId: string, today: string): SkillMeta {
  const s = twin.skills[skillId];
  const stats = decayedStats(s, today);
  return { currentDifficulty: s.currentDifficulty, estimateConfidence: stats.confidence };
}

function recentWrongCount(skill: SkillState21, window = 10): number {
  return skill.recentWindow.slice(-window).filter((a) => !a.correct).length;
}
// Independence counts any genuine attempt at solving the skill — including remediation
// stages (foundation/similarA/similarB/transfer are real solves, not diagnostics). Only
// modes that aren't "the student solving this skill" are excluded: diagnostic placement,
// prerequisite probes/confirmations (diagnostic purpose), and retention (its own signal).
const NON_INDEPENDENT_MODES = new Set(['diagnostic', 'probe', 'confirm', 'retention', 'micro-lesson']);
function independentWindow(skill: SkillState21): { correct: number; total: number } {
  const tail = skill.recentWindow.filter((a) => !NON_INDEPENDENT_MODES.has(a.mode)).slice(-CONFIG21.gate.independentWindow);
  return { correct: tail.filter((a) => a.correct && a.hintsUsed === 0 && !a.isGuess).length, total: tail.length };
}
function trailingRunLength(seq: string[], skillId: string): number {
  let n = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (seq[i] === skillId) n++;
    else break;
  }
  return n;
}

function buildStabilityInput(twin: DigitalTwin21, skillId: string, today: string): StabilityInput {
  const s = twin.skills[skillId];
  const stats = decayedStats(s, today);
  return {
    masteryProbability: capMasteryForActiveMisconceptions(stats.p, twin.misconceptions, skillId),
    uncertainty: stats.uncertainty,
    effectiveEvidence: stats.effectiveEvidence,
    retentionReliability: s.retention.reliability,
    lastPracticedAt: s.lastPracticedAt,
    today,
    recentWrongCount: recentWrongCount(s),
    hasActiveOrSuspectedMisconception: activeMisconceptionIds(twin.misconceptions, skillId).length > 0 || suspectedMisconceptionIds(twin.misconceptions, skillId).length > 0,
  };
}

function buildInvestigationContext(twin: DigitalTwin21, today: string, attributionByskill: Record<string, number>): InvestigationContext {
  return {
    stabilityOf: (id) => computeStability(buildStabilityInput(twin, id, today)),
    rawPOf: (id) => decayedStats(twin.skills[id], today).p,
    candidateInfoOf: (id): CandidateInfo => ({
      skillId: id,
      stability: computeStability(buildStabilityInput(twin, id, today)),
      misconceptionEvidence: activeMisconceptionIds(twin.misconceptions, id).length > 0 ? 1 : suspectedMisconceptionIds(twin.misconceptions, id).length > 0 ? 0.5 : 0,
      recentErrorRecurrence: recentWrongCount(twin.skills[id]),
      attributionProbability: attributionByskill[id] ?? 0.3,
    }),
    estimatedSecOf: () => 60,
  };
}

// Phase 2 PART 5-1/6: confirm 문항은 해당 오개념의 태깅 distractor가 실제로 생성되는
// 진단 난이도로 서빙한다 — 그래야 매 확인이 비율 검정의 유효 표본(기회)이 된다.
// 미태깅 오개념은 종전대로 촉발 시점 난이도 유지.
function confirmDifficultyFor(misId: string, fallbackDifficulty: number): number {
  const def = MISCONCEPTION_LIBRARY.find((m) => m.id === misId);
  return def?.diagnosticDifficulty ?? fallbackDifficulty;
}

function openRemediationCase(twin: DigitalTwin21, skillId: string): RemediationCase | undefined {
  return twin.remediationCases.find((c) => c.targetSkillId === skillId && c.stage !== 'resolved' && c.stage !== 'abandoned');
}

function pushAgenda(twin: DigitalTwin21, item: AgendaItem): DigitalTwin21 {
  return { ...twin, agenda: [...twin.agenda, item] };
}
function popAgendaById(twin: DigitalTwin21, id: string): DigitalTwin21 {
  return { ...twin, agenda: twin.agenda.filter((a) => a.id !== id) };
}

// ---------------------------------------------------------------------------
// Gate re-check (PART H) — call after any evidence update to a skill.
// ---------------------------------------------------------------------------
function maybeUpdateKnowledgeState(twin: DigitalTwin21, skillId: string, today: string, prevP: number): DigitalTwin21 {
  const s = twin.skills[skillId];
  const stats = decayedStats(s, today);
  const laddered: KnowledgeState[] = ['PROVISIONAL', 'EARLY_MASTERY', 'MASTERED', 'STABLE_MASTERY'];

  if (checkSuddenCrash(prevP, stats.p)) {
    return { ...twin, skills: { ...twin.skills, [skillId]: { ...s, knowledgeState: 'WEAKENED' } } };
  }

  if (laddered.includes(s.knowledgeState)) return twin; // driven by retention reviews, not this gate

  const iw = independentWindow(s);
  const gate = checkProvisionalGate({
    p: capMasteryForActiveMisconceptions(stats.p, twin.misconceptions, skillId),
    independentHintFreeCorrect: iw.correct,
    independentWindowTotal: iw.total,
    transferPassedAtCurrentDifficulty: !!s.transfer.passedAt[s.currentDifficulty],
    effectiveEvidence: stats.effectiveEvidence,
    estimateConfidence: stats.confidence,
    hasActiveMisconception: activeMisconceptionIds(twin.misconceptions, skillId).length > 0,
    hasOpenRemediation: !!openRemediationCase(twin, skillId),
  });

  if (gate.pass) {
    return { ...twin, skills: { ...twin.skills, [skillId]: { ...s, knowledgeState: 'PROVISIONAL', retention: scheduleFirstReview(today) } } };
  }
  if (s.knowledgeState === 'WEAKENED') return twin; // stay weakened until it actually re-qualifies
  const nextState = derivePreGateState({
    attempts: s.attempts,
    onlyDiagnosticSoFar: s.attempts > 0 && s.recentWindow.every((a) => a.mode === 'diagnostic'),
    effectiveEvidence: stats.effectiveEvidence,
    p: stats.p,
  });
  return { ...twin, skills: { ...twin.skills, [skillId]: { ...s, knowledgeState: nextState } } };
}

// ---------------------------------------------------------------------------
// Evidence application (shared by practice / probe / remediation-stage attempts)
// ---------------------------------------------------------------------------
function applyEvidence(twin: DigitalTwin21, payload: AttemptPayload, today: string, ts: number): { twin: DigitalTwin21; evidence: ReturnType<typeof attributeEvidence> } {
  const def = MICRO_SKILL_MAP[payload.skillId];
  const secondaryIds = payload.mode === 'normal' || payload.mode === 'challenge' ? def?.secondarySkillIds ?? [] : [];
  const isGuess = isGuessLikely(payload.solveTimeSec, payload.estimatedSec);
  // NOTE: processAttemptEvent already pushed payload.skillId onto recentSkillSequence
  // before calling into here, so this attempt is already counted — no "+1" needed.
  const sameSkillRunLength = trailingRunLength(twin.recentSkillSequence, payload.skillId);

  const skillMeta: Record<string, SkillMeta> = { [payload.skillId]: skillMetaFor(twin, payload.skillId, today) };
  for (const s of secondaryIds) skillMeta[s] = skillMetaFor(twin, s, today);

  const evidence = attributeEvidence({
    primarySkillId: payload.skillId,
    secondarySkillIds: secondaryIds,
    correct: payload.correct,
    chosenErrorType: payload.chosenErrorType,
    difficulty: payload.difficulty,
    hintsUsed: payload.hintsUsed,
    selfCorrected: payload.retryCount > 0,
    isGuess,
    sameSkillRunLength,
    skillMeta,
  });

  let skills = { ...twin.skills };
  const prevPBySkill: Record<string, number> = {};
  for (const ev of evidence) {
    const s = skills[ev.skillId];
    if (!s) continue;
    prevPBySkill[ev.skillId] = decayedStats(s, today).p;
    const dec = applyTimeDecay(s.alpha, s.beta, s.lastPracticedAt, today);
    const { alpha, beta } = ev.kind === 'correct' ? addCorrectEvidence(dec.alpha, dec.beta, ev.weight) : addWrongEvidence(dec.alpha, dec.beta, ev.weight);
    skills[ev.skillId] = { ...s, alpha, beta, lastPracticedAt: today };
  }

  // primary skill: window, counters, streaks, difficulty tracking, transfer bookkeeping
  {
    const s = skills[payload.skillId];
    const recentWindow = [...s.recentWindow, { correct: payload.correct, hintsUsed: payload.hintsUsed, isGuess, errorType: payload.chosenErrorType, ts, mode: payload.mode }].slice(-15);
    const transfer =
      payload.variant === 'transfer'
        ? { passedAt: { ...s.transfer.passedAt, [payload.difficulty]: s.transfer.passedAt[payload.difficulty] || payload.correct }, attempts: s.transfer.attempts + 1, passes: s.transfer.passes + (payload.correct ? 1 : 0) }
        : s.transfer;
    const consecutiveCorrect = payload.correct && payload.hintsUsed === 0 && !isGuess ? s.consecutiveCorrect + 1 : 0;

    // Difficulty progression (QA1/QA8, §29-31): never on a single lucky hit — only after
    // a clean streak at the CURRENT level, or by explicitly passing a Fast Track challenge
    // (advanced21.checkFastTrack decides WHEN to offer one; this is what happens if it's won).
    let currentDifficulty = s.currentDifficulty;
    if (payload.correct) {
      if (payload.mode === 'challenge' && payload.difficulty > currentDifficulty) {
        currentDifficulty = Math.min(5, payload.difficulty); // skip test passed -> jump straight up
      } else if (consecutiveCorrect >= CONFIG21.adaptive.fastTrackStreak && payload.difficulty >= currentDifficulty && currentDifficulty < 5) {
        currentDifficulty = currentDifficulty + 1;
      }
    }

    skills[payload.skillId] = {
      ...s,
      recentWindow,
      transfer,
      currentDifficulty,
      attempts: s.attempts + 1,
      correctAttempts: s.correctAttempts + (payload.correct ? 1 : 0),
      consecutiveCorrect,
      consecutiveWrong: payload.correct ? 0 : s.consecutiveWrong + 1,
      highestDifficultyPassed: payload.correct ? Math.max(s.highestDifficultyPassed, payload.difficulty) : s.highestDifficultyPassed,
    };
  }

  let nextTwin = { ...twin, skills };
  for (const skillId of Object.keys(prevPBySkill)) {
    nextTwin = maybeUpdateKnowledgeState(nextTwin, skillId, today, prevPBySkill[skillId]);
  }
  return { twin: nextTwin, evidence };
}

function recordPrediction(twin: DigitalTwin21, payload: AttemptPayload, today: string, ts: number): DigitalTwin21 {
  const s = twin.skills[payload.skillId];
  const prevStats = decayedStats(s, today); // NOTE: caller must call this BEFORE applyEvidence for a true pre-update prediction
  const predicted: PredictionRecord = {
    attemptId: payload.attemptId,
    skillId: payload.skillId,
    predictedP: predictSuccess(prevStats.p, payload.difficulty),
    difficulty: payload.difficulty,
    correct: payload.correct,
    masteryModelVersion: MASTERY_MODEL_VERSION,
    configVersion: CONFIG21_VERSION,
    ts,
  };
  return { ...twin, predictions: [...twin.predictions, predicted].slice(-2000) };
}

// ---------------------------------------------------------------------------
// Mode handlers
// ---------------------------------------------------------------------------
function handlePractice(twin: DigitalTwin21, payload: AttemptPayload, today: string, ts: number): DigitalTwin21 {
  let t = recordPrediction(twin, payload, today, ts);
  const applied = applyEvidence(t, payload, today, ts);
  t = applied.twin;

  // misconceptions triggered directly by this attempt's own error tag
  const mres = processTriggerAttempt(t.misconceptions, { skillId: payload.skillId, correct: payload.correct, errorType: payload.chosenErrorType, attemptId: payload.attemptId, ts, misconceptionId: payload.chosenMisconceptionId, diagnosticStrength: payload.chosenDiagnosticStrength, offeredMisconceptions: payload.offeredMisconceptions });
  t = { ...t, misconceptions: mres.instances };
  for (const misId of mres.confirmationNeeded) {
    t = pushAgenda(t, { id: detId(payload.attemptId, `confirm:${misId}`), kind: 'confirm', skillId: payload.skillId, difficulty: confirmDifficultyFor(misId, payload.difficulty), misconceptionId: misId, reason: `오개념 확인: ${misId}`, createdTs: ts });
  }
  // rolling 정책(PART 6-D): 트리거 누적만으로 ACTIVE 확정 가능 — confirm 경유와 동일하게
  // 즉시 표적 치료 케이스를 연다 (Phase 1에서 배운 "ACTIVE인데 케이스 없음" 결함 방지)
  for (const misId of mres.newlyActive) {
    t = openMisconceptionCase(t, payload, misId, ts);
  }
  t = { ...t, skills: { ...t.skills, [payload.skillId]: { ...t.skills[payload.skillId], flags: { ...t.skills[payload.skillId].flags, misconceptionSuspected: suspectedMisconceptionIds(t.misconceptions, payload.skillId).length > 0, misconceptionActive: activeMisconceptionIds(t.misconceptions, payload.skillId).length > 0 } } } };

  if (payload.correct || payload.mode === 'diagnostic') return t;

  const alreadyOpen = openRemediationCase(t, payload.skillId);
  if (alreadyOpen) return t;

  const attributionByskill: Record<string, number> = {};
  for (const e of applied.evidence) attributionByskill[e.skillId] = e.attributionProbability;
  const rootHint = likelyRoot(applied.evidence);
  const misElsewhere = rootHint !== payload.skillId;
  const consecutiveWrong = t.skills[payload.skillId].consecutiveWrong;

  // Phase 2 PART 7 벤치마크가 드러낸 결함 수정 ('careless masquerading as prerequisite gap'):
  // 최근 오답이 전부 비진단성(실수/추측/시간)이면 연속오답 수와 무관하게 원인조사를 열지
  // 않는다 — 이 상황의 처방은 좌절 보호(ease)이지 전제 하강이 아니다. 벤치마크에서 이
  // 유형 36/36이 target 귀속 케이스로 오개설되던 것을 차단.
  const NON_DIAG_ERRORS = ['CARELESS_ERROR', 'GUESSING', 'TIME_PRESSURE'];
  const recentWrongTypes = t.skills[payload.skillId].recentWindow.filter((a) => !a.correct).slice(-3).map((a) => a.errorType);
  const nonDiagOnly = NON_DIAG_ERRORS.includes(payload.chosenErrorType ?? '') && recentWrongTypes.every((e) => e && NON_DIAG_ERRORS.includes(e));
  if (nonDiagOnly) return t;

  if (!needsInvestigation(payload.chosenErrorType ?? 'UNKNOWN', consecutiveWrong, misElsewhere)) return t;

  const ctx = buildInvestigationContext(t, today, attributionByskill);
  let kase = beginInvestigation({ id: detId(payload.attemptId, 'case'), targetSkillId: payload.skillId, targetDifficulty: payload.difficulty, originalAttemptId: payload.attemptId, errorType: payload.chosenErrorType ?? 'UNKNOWN', likelyRootSkillId: payload.skillId, ts, ctx });
  // link a misconception if this attempt's error matched one on the root skill
  const linked = t.misconceptions.find((m) => m.skillId === rootHint && (m.status === 'SUSPECTED' || m.status === 'CONFIRMING' || m.status === 'ACTIVE'));
  if (linked) kase = { ...kase, linkedMisconceptionId: linked.misconceptionId };

  t = { ...t, remediationCases: [...t.remediationCases, kase] };
  t = { ...t, skills: { ...t.skills, [payload.skillId]: { ...t.skills[payload.skillId], flags: { ...t.skills[payload.skillId].flags, remediationOpen: true, prerequisiteProbeOpen: kase.stage === 'investigating' } } } };

  if (kase.stage === 'investigating') {
    t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-probe'), kind: 'probe', skillId: kase.probeQueue[0], difficulty: CONFIG21.rootCause.probeDifficulty, caseId: kase.id, reason: `"${payload.skillId}" 원인 분석 중`, createdTs: ts });
  } else {
    t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-lesson'), kind: 'micro-lesson', skillId: kase.rootCauseSkillId!, difficulty: 1, caseId: kase.id, reason: '개념 다시 보기', createdTs: ts });
  }
  return t;
}

function handleProbe(twin: DigitalTwin21, payload: AttemptPayload, agendaItem: AgendaItem, today: string, ts: number): DigitalTwin21 {
  let t = recordPrediction(twin, payload, today, ts);
  t = applyEvidence(t, payload, today, ts).twin;
  t = popAgendaById(t, agendaItem.id);

  const caseId = agendaItem.caseId!;
  const kase0 = t.remediationCases.find((c) => c.id === caseId)!;
  const ctx = buildInvestigationContext(t, today, {});
  const kase = advanceInvestigation(kase0, { skillId: payload.skillId, correct: payload.correct, attemptId: payload.attemptId, errorType: payload.chosenErrorType }, ctx);
  t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === caseId ? kase : c)) };

  if (kase.stage === 'micro-lesson') {
    t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-lesson'), kind: 'micro-lesson', skillId: kase.rootCauseSkillId!, difficulty: 1, caseId, reason: '원인 확인 완료 — 개념부터 다시', createdTs: ts });
  } else if (kase.pendingOrthogonal) {
    // Phase 3 PART 8: 직교 확인 — 같은 micro-skill을 "다른 표현"(transfer 변형)으로.
    // 숫자만 바꾼 재출제가 아니라 새로운 상황·표현에서 같은 개념을 확인한다.
    t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-probe'), kind: 'probe', skillId: kase.pendingOrthogonal, difficulty: CONFIG21.rootCause.probeDifficulty, variant: 'transfer', caseId, reason: '경계선 통과 — 다른 표현으로 한 번 더 확인', createdTs: ts });
  } else if (kase.pendingReconfirm) {
    t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-probe'), kind: 'probe', skillId: kase.pendingReconfirm, difficulty: CONFIG21.rootCause.probeDifficulty, caseId, reason: '예상 밖 오답 — 한 번 더 확인', createdTs: ts });
  } else if (kase.probeQueue.length > 0) {
    t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-probe'), kind: 'probe', skillId: kase.probeQueue[0], difficulty: CONFIG21.rootCause.probeDifficulty, caseId, reason: '원인 후보 추가 확인', createdTs: ts });
  }
  return t;
}

function handleConfirm(twin: DigitalTwin21, payload: AttemptPayload, agendaItem: AgendaItem, today: string, ts: number): DigitalTwin21 {
  let t = recordPrediction(twin, payload, today, ts);
  t = applyEvidence(t, payload, today, ts).twin;
  t = popAgendaById(t, agendaItem.id);

  const misId = agendaItem.misconceptionId!;
  const cres = processConfirmationAttempt(t.misconceptions, { misconceptionId: misId, correct: payload.correct, errorType: payload.chosenErrorType, attemptId: payload.attemptId, chosenMisconceptionId: payload.chosenMisconceptionId, diagnosticStrength: payload.chosenDiagnosticStrength, offeredMisconceptions: payload.offeredMisconceptions });
  t = { ...t, misconceptions: cres.instances };
  const flags = t.skills[payload.skillId].flags;
  t = {
    ...t,
    skills: {
      ...t.skills,
      [payload.skillId]: { ...t.skills[payload.skillId], flags: { ...flags, misconceptionActive: activeMisconceptionIds(t.misconceptions, payload.skillId).length > 0, misconceptionSuspected: suspectedMisconceptionIds(t.misconceptions, payload.skillId).length > 0 } },
    },
  };
  // confirmProblemCount is 2 (PART G) — a single clean confirm attempt is not enough to clear
  // the suspicion, and a single failing one already resolved to ACTIVE above. If neither
  // happened, the instance is still CONFIRMING and needs its second confirmation question
  // queued, or the process silently stalls forever (it did: this was a real bug, found via
  // Synthetic Learner E getting stuck at CONFIRMING no matter how long it kept practicing).
  const instAfter = t.misconceptions.find((m) => m.misconceptionId === misId);
  // rolling: 확인은 비율 검정 표본 수집이므로 판정(ACTIVE/NONE)까지 계속하되, 폭주 방지 상한
  const stillConfirming = instAfter?.status === 'CONFIRMING' && instAfter.confirmationAttempts.length < 12;
  if (stillConfirming) {
    t = pushAgenda(t, { id: detId(payload.attemptId, `confirm:${misId}`), kind: 'confirm', skillId: payload.skillId, difficulty: confirmDifficultyFor(misId, payload.difficulty), misconceptionId: misId, reason: `오개념 확인 (추가)`, createdTs: ts });
  }
  // becameActive: the pattern is now CONFIRMED, not just suspected — PART G calls for
  // targeted treatment at this exact point (cap + micro-lesson), not a wait for some later
  // unrelated wrong answer to happen to open a case. The root cause is already known (this
  // IS the misconception), so this skips straight to the micro-lesson stage rather than
  // running a root-cause investigation into prerequisites. Without this, a misconception that
  // resolves ACTIVE via a confirm attempt (as opposed to via a normal-practice wrong answer)
  // could sit capped indefinitely with no treatment ever offered — another real gap found via
  // Synthetic Learner E reaching ACTIVE with no case ever opening.
  if (cres.becameActive) t = openMisconceptionCase(t, payload, misId, ts);
  return t;
}

// ACTIVE 확정된 오개념의 표적 치료 케이스 개설 — confirm 경유(2.1)와 rolling 트리거 경유(2.2)
// 양쪽에서 공유. 이미 열린 케이스가 있으면 링크만 연결한다 (중복 케이스 금지).
function openMisconceptionCase(twin: DigitalTwin21, payload: AttemptPayload, misId: string, ts: number): DigitalTwin21 {
  let t = twin;
  const existingCase = openRemediationCase(t, payload.skillId);
  // 기존 케이스의 링크가 (a) 없거나 (b) 아직 ACTIVE가 아닌 의심 단계 링크라면, 방금 확정된
  // ACTIVE가 링크를 가져간다 — 안 그러면 ACTIVE가 케이스도 링크도 없이 캡만 걸린 채 방치되는
  // 누수가 생긴다 (레벨 창 겹침으로 타 오개념이 먼저 의심-링크된 시나리오에서 실측).
  const existingLinkActive = existingCase?.linkedMisconceptionId ? t.misconceptions.find((m) => m.misconceptionId === existingCase.linkedMisconceptionId)?.status === 'ACTIVE' : false;
  if (existingCase && (!existingCase.linkedMisconceptionId || !existingLinkActive)) {
    t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === existingCase.id ? { ...c, linkedMisconceptionId: misId } : c)) };
  } else if (!existingCase) {
    const kase: RemediationCase = {
      id: detId(payload.attemptId, `case-mis:${misId}`),
      targetSkillId: payload.skillId,
      targetDifficulty: payload.difficulty,
      originalAttemptId: payload.attemptId,
      createdTs: ts,
      errorType: (payload.chosenErrorType ?? 'UNKNOWN') as RemediationCase['errorType'],
      probeQueue: [],
      probesTaken: [],
      depth: 0,
      frontierParentSkillId: payload.skillId,
      pendingReconfirm: null,
      pendingOrthogonal: null,
      orthogonalTaken: [],
      rootCauseSkillId: payload.skillId,
      stage: 'micro-lesson',
      stageFailures: 0,
      stageProgress: 0,
      treatmentLog: [],
      outcome: null,
      gapClosureQuality: initialGapClosureQuality(),
      reopenedFromCaseId: null,
      linkedMisconceptionId: misId,
    };
    t = { ...t, remediationCases: [...t.remediationCases, kase] };
    t = { ...t, skills: { ...t.skills, [payload.skillId]: { ...t.skills[payload.skillId], flags: { ...t.skills[payload.skillId].flags, remediationOpen: true } } } };
    t = pushAgenda(t, { id: detId(payload.attemptId, `ag-lesson-mis:${misId}`), kind: 'micro-lesson', skillId: payload.skillId, difficulty: 1, caseId: kase.id, reason: '오개념 확인됨 — 개념 다시 보기', createdTs: ts });
  }
  return t;
}

function handleRemediationStage(twin: DigitalTwin21, payload: AttemptPayload, agendaItem: AgendaItem, today: string, ts: number): DigitalTwin21 {
  let t = recordPrediction(twin, payload, today, ts);
  t = applyEvidence(t, payload, today, ts).twin;
  t = popAgendaById(t, agendaItem.id);

  const caseId = agendaItem.caseId!;
  const kase0 = t.remediationCases.find((c) => c.id === caseId)!;
  const preMastery = decayedStats(twin.skills[kase0.targetSkillId], today).p; // pre-this-attempt reference, coarse but adequate for the outcome summary
  const adv = advanceRemediation(kase0, payload.correct, payload.attemptId);
  let kase = adv.case;

  if (adv.needsDeeperProbe) {
    const ctx = buildInvestigationContext(t, today, {});
    const deeper = beginInvestigation({ id: detId(payload.attemptId, 'case-deeper'), targetSkillId: kase.targetSkillId, targetDifficulty: kase.targetDifficulty, originalAttemptId: kase.originalAttemptId, errorType: kase.errorType, likelyRootSkillId: kase.rootCauseSkillId ?? kase.frontierParentSkillId, ts, ctx });
    // linkedMisconceptionId must survive the reconstruction — beginInvestigation() always
    // starts a fresh case with it null, which would otherwise silently sever a confirmed
    // misconception from its case the moment treatment needed to probe deeper (found via
    // Synthetic Learner E: a case correctly linked at open time came back unlinked later).
    kase = { ...deeper, depth: kase.depth, treatmentLog: kase.treatmentLog, id: kase.id, linkedMisconceptionId: kase.linkedMisconceptionId };
    t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === caseId ? kase : c)) };
    if (kase.stage === 'investigating') t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-probe'), kind: 'probe', skillId: kase.probeQueue[0], difficulty: CONFIG21.rootCause.probeDifficulty, caseId, reason: '치료가 안 통해요 — 더 아래 원인을 확인해요', createdTs: ts });
    else t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-lesson'), kind: 'micro-lesson', skillId: kase.rootCauseSkillId!, difficulty: 1, caseId, reason: '더 근본적인 개념부터', createdTs: ts });
    return t;
  }

  t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === caseId ? kase : c)) };

  if (kase.stage === 'resolved') {
    const postMastery = decayedStats(t.skills[kase.targetSkillId], today).p;
    const outcome = buildOutcome(kase, preMastery, postMastery);
    kase = { ...kase, outcome, gapClosureQuality: initialGapClosureQuality() };
    t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === caseId ? kase : c)) };
    t = {
      ...t,
      skills: { ...t.skills, [kase.targetSkillId]: { ...t.skills[kase.targetSkillId], flags: { ...t.skills[kase.targetSkillId].flags, remediationOpen: false, prerequisiteProbeOpen: false } } },
    };
    if (kase.linkedMisconceptionId) {
      // resolution also requires 2 clean answers on the trigger skill; approximate via consecutiveCorrect on that skill
      const triggerSkill = t.misconceptions.find((m) => m.misconceptionId === kase.linkedMisconceptionId)?.skillId;
      const cleanEnough = triggerSkill ? t.skills[triggerSkill].consecutiveCorrect >= 2 : true;
      if (cleanEnough) t = { ...t, misconceptions: resolveMisconception(t.misconceptions, kase.linkedMisconceptionId, ts) };
    }
    return t;
  }

  if (kase.stage === 'abandoned') {
    // 2.2 GATE B: transfer 재시작 상한 초과 — 케이스 유예 종결 (이력 보존). 플래그를 풀어
    // 이 스킬이 세션을 더 독점하지 않게 하고, 재방문은 적응 우선순위(쿨다운 감쇠 포함)에 맡긴다.
    kase = { ...kase, abandonedTs: ts };
    t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === caseId ? kase : c)) };
    t = {
      ...t,
      skills: { ...t.skills, [kase.targetSkillId]: { ...t.skills[kase.targetSkillId], flags: { ...t.skills[kase.targetSkillId].flags, remediationOpen: false, prerequisiteProbeOpen: false } } },
    };
    return t;
  }

  if (kase.stage === 'micro-lesson') {
    t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-lesson'), kind: 'micro-lesson', skillId: skillForStage(kase), difficulty: 1, caseId, reason: '개념 다시 확인', createdTs: ts });
  } else {
    const kindMap: Record<string, AgendaItem['kind']> = { foundation: 'foundation', bridge: 'bridge', similarA: 'similarA', similarB: 'similarB', transfer: 'transfer' };
    const kind = kindMap[kase.stage] ?? 'foundation';
    t = pushAgenda(t, { id: detId(payload.attemptId, `ag-${kind}`), kind, skillId: skillForStage(kase), difficulty: difficultyForStage(kase), variant: kase.stage === 'transfer' ? 'transfer' : 'standard', caseId, reason: `치료 단계: ${kase.stage}`, createdTs: ts });
  }
  return t;
}

function handleMicroLessonAck(twin: DigitalTwin21, payload: AttemptPayload, agendaItem: AgendaItem, ts: number): DigitalTwin21 {
  const caseId = agendaItem.caseId ?? payload.caseId;
  const kase0 = twin.remediationCases.find((c) => c.id === caseId);
  if (!kase0) return popAgendaById(twin, agendaItem.id);
  const acked = acknowledgeMicroLesson(kase0);
  let t = { ...twin, remediationCases: twin.remediationCases.map((c) => (c.id === caseId ? acked : c)) };
  t = popAgendaById(t, agendaItem.id);
  const kind = acked.stage === 'foundation' ? 'foundation' : (acked.stage as AgendaItem['kind']);
  t = pushAgenda(t, { id: detId(payload.attemptId, `ag-${kind}`), kind, skillId: skillForStage(acked), difficulty: difficultyForStage(acked), caseId: caseId!, reason: '기초 확인 문제', createdTs: ts });
  return t;
}

function handleRetention(twin: DigitalTwin21, payload: AttemptPayload, today: string, ts: number): DigitalTwin21 {
  let t = recordPrediction(twin, payload, today, ts);
  const s = t.skills[payload.skillId];
  const decayed = applyTimeDecay(s.alpha, s.beta, s.lastPracticedAt, today);
  const out = applyReviewResult(decayed.alpha, decayed.beta, s.retention, today, payload.correct);
  t = {
    ...t,
    skills: {
      ...t.skills,
      [payload.skillId]: {
        ...s,
        alpha: out.alpha,
        beta: out.beta,
        lastPracticedAt: today,
        retention: out.retention,
        knowledgeState: out.knowledgeState,
        recentWindow: [...s.recentWindow, { correct: payload.correct, hintsUsed: payload.hintsUsed, isGuess: false, errorType: payload.chosenErrorType, ts, mode: 'retention' }].slice(-15),
      },
    },
  };
  // QA20: recurrence — a retention failure on a skill with a STABLY_CLOSED/RETENTION_VERIFIED
  // gap should reopen that gap, not just quietly weaken the skill.
  if (!payload.correct) {
    const relevantCase = [...t.remediationCases].reverse().find((c) => c.targetSkillId === payload.skillId && c.stage === 'resolved' && c.gapClosureQuality !== 'REOPENED');
    if (relevantCase) {
      const reopened = reopenGap(relevantCase);
      t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === reopened.id ? reopened : c)) };
    }
  } else {
    const relevantCase = [...t.remediationCases].reverse().find((c) => c.targetSkillId === payload.skillId && c.stage === 'resolved' && c.gapClosureQuality === 'TRANSFER_VERIFIED');
    if (relevantCase) {
      const upgraded = { ...relevantCase, gapClosureQuality: upgradeGapClosure(relevantCase.gapClosureQuality, 'retention') };
      t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === upgraded.id ? upgraded : c)) };
    } else {
      const stableCandidate = [...t.remediationCases].reverse().find((c) => c.targetSkillId === payload.skillId && c.gapClosureQuality === 'RETENTION_VERIFIED');
      if (stableCandidate && out.knowledgeState === 'STABLE_MASTERY') {
        const upgraded = { ...stableCandidate, gapClosureQuality: upgradeGapClosure(stableCandidate.gapClosureQuality, 'stable') };
        t = { ...t, remediationCases: t.remediationCases.map((c) => (c.id === upgraded.id ? upgraded : c)) };
      }
    }
  }
  return t;
}

// ---------------------------------------------------------------------------
// Single dispatcher — called by replay21.applyEvent for every ATTEMPT event.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Phase 2 ELITE LAYER — 리듀서 (PART 15/19/29/30).
// mastery 장부는 건드리지 않는다: elite 시도는 micro-skill α/β에 증거를 넣지 않는다
// (PART 15 "섞지 않는다"). 오답 시 이원 분류: KNOWLEDGE → 기존 결손 파이프라인(조사 케이스),
// REASONING → 하위학년 복습 금지, 해당 차원 스캐폴드 후속만 큐잉.
// ---------------------------------------------------------------------------
function handleElite(twin: DigitalTwin21, payload: AttemptPayload, today: string, ts: number): DigitalTwin21 {
  const e = payload.elite;
  if (!e) return twin;
  let t = twin;

  // 진행 중이던 elite agenda 항목 제거 (followup이면 해당 항목)
  if (payload.mode === 'elite-followup') {
    const agendaItem = t.agenda.find((a) => a.kind === 'elite-followup' && a.eliteFollowUpId === e.problemId);
    if (agendaItem) t = popAgendaById(t, agendaItem.id);
  }

  // 1) 프로필 증거 갱신 — payload의 순수 함수 (시간 무불이익, 힌트는 가중만)
  const evidence: EliteEvidencePayload = {
    problemId: e.problemId,
    eliteMode: e.eliteMode as ProblemMode,
    requiredSkills: e.requiredSkills,
    correct: payload.correct,
    hintsUsed: e.hintsUsed,
    strategySwitches: e.strategySwitches,
    solveTimeSec: payload.solveTimeSec,
    estimatedSec: payload.estimatedSec,
    followUpDimension: (e.followUpDimension as EliteDimension | null) ?? null,
    followUpOf: e.followUpOf ?? null,
  };
  // Phase 3 PART 19/20: 저작 선언 증거 지도로 귀속 (은행은 코드 자산 — 결정론적 조회라 리플레이 안전)
  const evidenceMap = payload.mode === 'elite' ? (ELITE_BANK_MAP[e.problemId]?.evidenceMap ?? null) : null;
  t = { ...t, elite: applyEliteEvidence(t.elite, evidence, evidenceMap) };

  // 2) Strategy Trace 기록 (본문만 — PART 23, 가볍게) + Phase 3 PART 36/37: 분투 데이터와
  // 분투의 질(설명 가능한 휴리스틱). Speed Score가 아니다 — 어떤 증거 가중에도 쓰지 않는다.
  if (payload.mode === 'elite') {
    const knowledgeWeak = e.requiredSkills.some((id) => {
      const sk = t.skills[id];
      return sk && !(sk.alpha / (sk.alpha + sk.beta) >= CONFIG21.elite.knowledgeAdequateP && sk.attempts >= 2);
    });
    const struggle = classifyStruggle({
      solved: payload.correct,
      solveTimeSec: payload.solveTimeSec,
      estimatedSec: payload.estimatedSec,
      strategySwitches: e.strategySwitches,
      hintsUsed: e.hintsUsed,
      knowledgeWeak,
    });
    const trace: StrategyTrace = {
      problemId: e.problemId,
      eliteMode: e.eliteMode as ProblemMode,
      firstStrategy: e.firstStrategy,
      finalStrategy: e.finalStrategy,
      strategySwitches: e.strategySwitches,
      hintsUsed: e.hintsUsed,
      solved: payload.correct,
      ts,
      timeToFirstActionSec: e.timeToFirstActionSec,
      solvedWithoutSolutionReveal: payload.correct && !e.solutionRevealed,
      returnedAfterPause: e.returnedAfterPause,
      struggleQuality: struggle.quality,
    };
    t = { ...t, strategyTraces: [...t.strategyTraces, trace].slice(-CONFIG21.elite.strategyTraceCap), recentEliteIds: [...t.recentEliteIds, e.problemId].slice(-20) };
  }

  // followup 시도의 problemId는 후속 id이므로, 은행 조회는 본문 id(followUpOf) 우선
  const bankProblem = ELITE_BANK_MAP[e.followUpOf ?? e.problemId];

  if (payload.correct) {
    // 3a) 본문 정답 → One Problem Deep 2.0 (PART 39/40): 후속을 전부 묻지 않는다 —
    // DeepValue(약한 차원 × 관련 숙달 × novelty × 노출 격차 × 인지부하 적합)가 가장 높은
    // "하나"만 잇는다. 후속 정답 후 추가 체인 없음 (한 문제, 한 깊이).
    if (payload.mode === 'elite' && bankProblem && bankProblem.followUps.length > 0) {
      const picked = pickDeepFollowUp(t, bankProblem.requiredSkills, bankProblem.followUps, e.hintsUsed.length);
      if (picked) {
        t = pushAgenda(t, { id: detId(payload.attemptId, `efu:${picked.fu.id}`), kind: 'elite-followup', skillId: payload.skillId, difficulty: payload.difficulty, eliteProblemId: bankProblem.id, eliteFollowUpId: picked.fu.id, reason: `한 문제 깊이 탐구 — ${picked.score.reason}`, createdTs: ts });
      }
    } else if (payload.mode === 'elite-followup') {
      // 2.0: 후속 완료로 이 문제의 깊이 탐구는 종료 — 재탕 방지를 위해 후속 id도 노출 기록
      t = { ...t, recentEliteIds: [...t.recentEliteIds, e.problemId].slice(-20) };
    }
    return t;
  }

  // 3b) 오답 → 이원 분류 (PART 29/30)
  const diagnosis = classifyEliteFailure({
    twin: t,
    requiredSkills: e.requiredSkills,
    eliteMode: e.eliteMode as ProblemMode,
    hintsUsed: e.hintsUsed,
    strategySwitches: e.strategySwitches,
    solveTimeSec: payload.solveTimeSec,
    estimatedSec: payload.estimatedSec,
    failedFollowUpDimension: (e.followUpDimension as EliteDimension | null) ?? null,
  });
  t = { ...t, eliteRootCauseCounts: { ...t.eliteRootCauseCounts, [diagnosis.rootCause]: (t.eliteRootCauseCounts[diagnosis.rootCause] ?? 0) + 1 } };

  if (diagnosis.kind === 'KNOWLEDGE_FAILURE' && diagnosis.weakSkillId) {
    // 기존 Knowledge Gap 파이프라인 진입 (EQA2): 약한 스킬에 표준 조사 케이스 개설
    if (!openRemediationCase(t, diagnosis.weakSkillId)) {
      const ctx = buildInvestigationContext(t, today, {});
      let kase = beginInvestigation({ id: detId(payload.attemptId, 'case-elite-k'), targetSkillId: diagnosis.weakSkillId, targetDifficulty: t.skills[diagnosis.weakSkillId].currentDifficulty, originalAttemptId: payload.attemptId, errorType: 'PREREQUISITE_GAP', likelyRootSkillId: diagnosis.weakSkillId, ts, ctx });
      t = { ...t, remediationCases: [...t.remediationCases, kase] };
      t = { ...t, skills: { ...t.skills, [diagnosis.weakSkillId]: { ...t.skills[diagnosis.weakSkillId], flags: { ...t.skills[diagnosis.weakSkillId].flags, remediationOpen: true, prerequisiteProbeOpen: kase.stage === 'investigating' } } } };
      if (kase.stage === 'investigating') t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-probe-ek'), kind: 'probe', skillId: kase.probeQueue[0], difficulty: CONFIG21.rootCause.probeDifficulty, caseId: kase.id, reason: `Elite 도전이 드러낸 지식 결손 조사 (${diagnosis.weakSkillId})`, createdTs: ts });
      else t = pushAgenda(t, { id: detId(payload.attemptId, 'ag-lesson-ek'), kind: 'micro-lesson', skillId: kase.rootCauseSkillId!, difficulty: 1, caseId: kase.id, reason: 'Elite 도전이 드러낸 개념 재학습', createdTs: ts });
    }
    return t;
  }

  // REASONING_FAILURE (EQA1): 전제 하강 금지 — 해당 차원 스캐폴드 후속만 (있으면)
  if (payload.mode === 'elite' && bankProblem) {
    const dimMap: Partial<Record<EliteRootCause, EliteDimension>> = {
      REPRESENTATION_GAP: 'representation',
      STRATEGY_GAP: 'strategySelection',
      INTEGRATION_GAP: 'integration',
      FLEXIBILITY_GAP: 'flexibility',
      GENERALIZATION_GAP: 'generalization',
      JUSTIFICATION_GAP: 'justification',
    };
    const dim = dimMap[diagnosis.rootCause];
    const scaffold = dim ? bankProblem.followUps.find((f) => f.dimension === dim) ?? bankProblem.followUps[0] : bankProblem.followUps[0];
    if (scaffold) {
      t = pushAgenda(t, { id: detId(payload.attemptId, `efu:${scaffold.id}`), kind: 'elite-followup', skillId: payload.skillId, difficulty: payload.difficulty, eliteProblemId: bankProblem.id, eliteFollowUpId: scaffold.id, reason: `추론 스캐폴드 (${diagnosis.rootCause})`, createdTs: ts });
    }
  }
  return t;
}

export function processAttemptEvent(twin: DigitalTwin21, payload: AttemptPayload, ts: number): DigitalTwin21 {
  const today = dateStr(ts);
  const isElite = payload.mode === 'elite' || payload.mode === 'elite-followup';
  let t = {
    ...twin,
    lastActiveDate: today,
    recentSkillSequence: [...twin.recentSkillSequence, payload.skillId].slice(-10),
    // 리플레이 안전한 elite 서빙 주기: elite 시도에서 0으로, 그 외 시도마다 +1
    attemptsSinceElite: isElite ? 0 : twin.attemptsSinceElite + 1,
    // Phase 3 결함 수정: recentAgendaKinds(과잉검사 가드의 근거)가 live 래퍼에서만 추가되고
    // 리듀서엔 없었다 — 재구성(리플레이) 후 가드 상태가 유실되는 잠복 발산. payload.mode의
    // 순수 함수로 리듀서에서 갱신한다 (elite 모드는 종전과 동일하게 미기록).
    recentAgendaKinds: isElite
      ? twin.recentAgendaKinds
      : ([...twin.recentAgendaKinds, payload.mode === 'probe' ? 'probe' : payload.mode === 'confirm' ? 'confirm' : payload.mode === 'micro-lesson' ? 'micro-lesson' : 'normal'].slice(-10) as never),
  };

  switch (payload.mode) {
    case 'elite':
    case 'elite-followup':
      return handleElite(t, payload, today, ts);
    case 'normal':
    case 'diagnostic':
    case 'challenge':
    case 'ease':
      return handlePractice(t, payload, today, ts);
    case 'probe': {
      const item = t.agenda.find((a) => a.kind === 'probe' && a.skillId === payload.skillId);
      return item ? handleProbe(t, payload, item, today, ts) : handlePractice(t, payload, today, ts);
    }
    case 'confirm': {
      const item = t.agenda.find((a) => a.kind === 'confirm' && a.skillId === payload.skillId);
      return item ? handleConfirm(t, payload, item, today, ts) : t;
    }
    case 'micro-lesson': {
      const item = t.agenda.find((a) => a.kind === 'micro-lesson' && a.skillId === payload.skillId);
      return item ? handleMicroLessonAck(t, payload, item, ts) : t;
    }
    case 'remediation-foundation':
    case 'remediation-bridge':
    case 'remediation-similarA':
    case 'remediation-similarB':
    case 'remediation-transfer':
    case 'remediation-return': {
      const item = t.agenda.find((a) => a.caseId && a.skillId === payload.skillId);
      return item ? handleRemediationStage(t, payload, item, today, ts) : t;
    }
    case 'retention':
      return handleRetention(t, payload, today, ts);
    default:
      return t;
  }
}

// Seeds a skill's evidence from the initial adaptive diagnostic (§6/§42). Also goes
// through the event log so Replay reproduces the placement exactly (PART N).
export function processDiagnosticPlacement(twin: DigitalTwin21, payload: DiagnosticPlacementPayload, ts: number): DigitalTwin21 {
  const today = dateStr(ts);
  const s = twin.skills[payload.skillId];
  if (!s) return twin;
  const alpha = s.alpha + payload.seedAlpha;
  const beta = s.beta + payload.seedBeta;
  const knowledgeState: KnowledgeState = s.knowledgeState === 'UNSEEN' || s.knowledgeState === 'EXPOSED' ? 'EXPOSED' : s.knowledgeState;
  return { ...twin, skills: { ...twin.skills, [payload.skillId]: { ...s, alpha, beta, currentDifficulty: payload.placementDifficulty, lastPracticedAt: today, knowledgeState } } };
}

export function submitDiagnosticPlacement(
  twin: DigitalTwin21,
  log: EventLog,
  skillId: string,
  placementDifficulty: number,
  seedAlpha: number,
  seedBeta: number,
  tsOverride?: number,
): { twin: DigitalTwin21; log: EventLog; event: LearningEvent } {
  const payload: DiagnosticPlacementPayload = { skillId, placementDifficulty, seedAlpha, seedBeta };
  const event = makeEvent('DIAGNOSTIC_PLACEMENT', payload, { masteryModel: MASTERY_MODEL_VERSION, config: CONFIG21_VERSION }, tsOverride ?? Date.now());
  const nextLog = appendEvent(log, event);
  const nextTwin = { ...processDiagnosticPlacement(twin, payload, event.ts), seq: event.seq };
  return { twin: nextTwin, log: nextLog, event };
}

// ---------------------------------------------------------------------------
// nextAction — decides what to serve next (agenda first, then adaptive priority)
// ---------------------------------------------------------------------------
export interface NextAction {
  kind: AttemptMode;
  skillId: string;
  difficulty: number;
  variant: 'standard' | 'transfer';
  caseId?: string;
  misconceptionId?: string;
  // Phase 2 ELITE: kind가 'elite'/'elite-followup'일 때 대상 문제/후속 식별자
  eliteProblemId?: string;
  eliteFollowUpId?: string;
  reason: string;
  agendaItemId?: string;
}

export function nextAction(twin: DigitalTwin21, today: string): NextAction {
  // 1. Misconception confirmation and root-cause probes take priority over everything
  //    else, but never more than the no-over-testing guard allows.
  const diagnosticBlocked = exceedsDiagnosticShare(twin.recentAgendaKinds);
  const nextDiagnostic = twin.agenda.find((a) => a.kind === 'probe' || a.kind === 'confirm');
  if (nextDiagnostic && !diagnosticBlocked) {
    return {
      kind: nextDiagnostic.kind === 'probe' ? 'probe' : 'confirm',
      skillId: nextDiagnostic.skillId,
      difficulty: nextDiagnostic.difficulty,
      variant: nextDiagnostic.variant ?? 'standard', // Phase 3: 직교 프로브는 transfer 표현
      caseId: nextDiagnostic.caseId,
      misconceptionId: nextDiagnostic.misconceptionId,
      reason: nextDiagnostic.reason,
      agendaItemId: nextDiagnostic.id,
    };
  }

  // 2. Micro-lesson acknowledgment (no problem — a concept card the student reads)
  const nextLesson = twin.agenda.find((a) => a.kind === 'micro-lesson');
  if (nextLesson) {
    return { kind: 'micro-lesson', skillId: nextLesson.skillId, difficulty: nextLesson.difficulty, variant: 'standard', caseId: nextLesson.caseId, reason: nextLesson.reason, agendaItemId: nextLesson.id };
  }

  // 2.5. Elite 후속 (One Problem Deep / reasoning 스캐폴드) — 방금 탐구하던 문제의 맥락이
  // 살아있을 때 바로 잇는다 (PART 19). 치료 단계보다 앞: 후속은 1-2문항으로 짧고,
  // REASONING_FAILURE 스캐폴드가 뒤로 밀리면 맥락이 식는다.
  const nextEliteFu = twin.agenda.find((a) => a.kind === 'elite-followup');
  if (nextEliteFu) {
    return {
      kind: 'elite-followup',
      skillId: nextEliteFu.skillId,
      difficulty: nextEliteFu.difficulty,
      variant: 'standard',
      eliteProblemId: nextEliteFu.eliteProblemId,
      eliteFollowUpId: nextEliteFu.eliteFollowUpId,
      reason: nextEliteFu.reason,
      agendaItemId: nextEliteFu.id,
    };
  }

  // 3. Remediation stages
  const nextRemediation = twin.agenda.find((a) => a.caseId && a.kind !== 'probe' && a.kind !== 'confirm');
  if (nextRemediation) {
    return {
      kind: ('remediation-' + nextRemediation.kind) as AttemptMode,
      skillId: nextRemediation.skillId,
      difficulty: nextRemediation.difficulty,
      variant: nextRemediation.variant ?? 'standard',
      caseId: nextRemediation.caseId,
      reason: nextRemediation.reason,
      agendaItemId: nextRemediation.id,
    };
  }

  // 3. Retention reviews due today
  const due = ALL_SKILL_IDS.filter((id) => isReviewDue(twin.skills[id].retention, today));
  if (due.length > 0) {
    const skillId = due[0];
    return { kind: 'retention', skillId, difficulty: twin.skills[skillId].currentDifficulty, variant: 'standard', reason: `복습 시점 도래 (${skillId})` };
  }

  // 4. Any skill sitting at the gate's door with ONLY transfer missing gets first refusal,
  // scanned across the whole graph rather than just whatever the fresh priority pick below
  // would land on — a skill whose p/evidence/independence already cleared the bar must not
  // be starved of its one remaining transfer check just because some other still-weak skill
  // scores higher raw "need" priority (this was the QA6/7/20 bug: a skill camped at
  // p=0.95+ never got re-offered a transfer problem because global priority kept sending
  // practice elsewhere instead). This also has to outrank Fast Track below: once a skill
  // qualifies here, its consecutiveCorrect streak is usually ALSO long enough to keep
  // re-triggering Fast Track forever, which serves more (unneeded) challenge problems and
  // never the one transfer problem that would actually close the gate.
  const gateCooldownMs = CONFIG21.adaptive.abandonedCooldownDays * 86400000;
  for (const skillId of ALL_SKILL_IDS) {
    const s = twin.skills[skillId];
    if (s.attempts < 3) continue;
    // 2.2 GATE B 누수 수정: 방금 치료가 유예(abandoned)된 스킬에 이 스캔이 무조건 transfer를
    // 재서빙하면 [transfer 실패 → 새 케이스 → 유예 → 재서빙] 무한 순환이 된다 (3시드 실측
    // 최다점유 70%의 원인). 유예 쿨다운 중에는 이 우선권도 쉰다 — 재도전은 쿨다운 후에.
    const recentlyAbandonedGate = twin.remediationCases.some((c) => c.targetSkillId === skillId && c.stage === 'abandoned' && c.abandonedTs !== undefined && Date.parse(today) - c.abandonedTs < gateCooldownMs);
    if (recentlyAbandonedGate) continue;
    const iw0 = independentWindow(s);
    const gate0 = checkProvisionalGate({
      p: decayedStats(s, today).p,
      independentHintFreeCorrect: iw0.correct,
      independentWindowTotal: iw0.total,
      transferPassedAtCurrentDifficulty: !!s.transfer.passedAt[s.currentDifficulty],
      effectiveEvidence: decayedStats(s, today).effectiveEvidence,
      estimateConfidence: decayedStats(s, today).confidence,
      hasActiveMisconception: activeMisconceptionIds(twin.misconceptions, skillId).length > 0,
      hasOpenRemediation: !!openRemediationCase(twin, skillId),
    });
    if (!gate0.pass && gate0.missing.length === 1 && gate0.missing[0].startsWith('transfer')) {
      return { kind: 'normal', skillId, difficulty: s.currentDifficulty, variant: 'transfer', reason: '게이트 통과까지 전이 문제만 남았어요' };
    }
  }

  // 5. Reactive continuation on whatever skill the student was JUST practicing (§29-35):
  // Fast Track and Frustration Protection are responses to the ongoing streak on THAT
  // skill, not a fresh global priority scan — a strong run here must not be pre-empted
  // by some other skill scoring higher raw priority (that was the QA8 bug: a 3-in-a-row
  // streak on a strong skill was silently dropped in favor of an untouched weak one).
  const lastSkillId = twin.recentSkillSequence[twin.recentSkillSequence.length - 1];
  if (lastSkillId) {
    const last = twin.skills[lastSkillId];
    const frustration = frustrationAction(last.consecutiveWrong, last.recentWindow.slice(-3).map((a) => a.errorType));
    if (frustration === 'ease') {
      return { kind: 'ease', skillId: lastSkillId, difficulty: Math.max(1, last.currentDifficulty - 1), variant: 'standard', reason: '연속 오답 — 쉬운 문제로 성공 경험 회복' };
    }
    // Phase 3 결함 수정: d5에서는 건너뛸 레벨이 없다 — 여기서 Fast Track이 계속 발화하면
    // 도전 통과→잔류→재발화의 무한 루프로 elite(5.5)와 하위 단계 전부가 기아 상태가 된다
    // (E2E 실측: 21연속 정답의 d5 스킬이 세션을 영구 독점).
    if (last.currentDifficulty < 5 && checkFastTrack(last.consecutiveCorrect, decayedStats(last, today).p)) {
      return { kind: 'challenge', skillId: lastSkillId, difficulty: Math.min(5, last.currentDifficulty + 2), variant: 'standard', reason: `Fast Track — ${last.consecutiveCorrect}연속 정답, 도전 문제로 스킵 테스트` };
    }
  }
  // 'investigate' is handled naturally: the next wrong 'normal' attempt will trigger
  // needsInvestigation via consecutiveWrong >= 2 inside handlePractice.

  // 5.5. ELITE CHALLENGE (PART 16/27/28/31) — "가장 어려운 문제"가 아니라 "지금 가장
  // 성장시키는 문제"를, ELITE-ready 영역에서, 목표 비중 주기에 맞춰 제공한다.
  // 비중은 진도-사고력 격차로 자동 조정(EQA10): 선행이 빠른데 elite 프로필이 낮으면 상향.
  {
    const share = eliteShareTarget(twin);
    const cadence = Math.max(2, Math.round(1 / Math.max(0.05, share)));
    if (twin.attemptsSinceElite >= cadence) {
      const candidates = ELITE_BANK.filter((p) => {
        // Phase 3 PART 23: 자격은 클러스터 단위 — 필요 스킬이 걸친 모든 클러스터가 ELITE여야
        // 한다. 영역 평균이 높아도 약한 클러스터를 건드리는 문제는 제외된다.
        if (!eliteEligibleForSkills(twin, p.requiredSkills)) return false;
        if (twin.recentEliteIds.includes(p.id)) return false; // novelty 소멸 문제 재탕 방지
        return true;
      });
      if (candidates.length > 0) {
        const scored = candidates.map((p) => challengeValue(twin, p, twin.recentEliteIds));
        scored.sort((a, b) => b.value - a.value);
        const top = scored[0];
        const prob = ELITE_BANK_MAP[top.problemId];
        return {
          kind: 'elite',
          skillId: prob.requiredSkills[0],
          difficulty: prob.difficulty,
          variant: 'standard',
          eliteProblemId: prob.id,
          reason: `Elite 도전 [${prob.mode}] — ${top.reason}`,
        };
      }
    }
  }

  // 6. Adaptive priority pick among all skills
  const inputs: PriorityInput[] = ALL_SKILL_IDS.map((skillId) => {
    const s = twin.skills[skillId];
    const overdueDays = s.retention.nextReviewAt ? Math.max(0, Math.floor((Date.parse(today) - Date.parse(s.retention.nextReviewAt)) / 86400000)) : 0;
    const cooldownMs = CONFIG21.adaptive.abandonedCooldownDays * 86400000;
    const recentlyAbandoned = twin.remediationCases.some((c) => c.targetSkillId === skillId && c.stage === 'abandoned' && c.abandonedTs !== undefined && Date.parse(today) - c.abandonedTs < cooldownMs);
    return { skillId, p: decayedStats(s, today).p, knowledgeState: s.knowledgeState, reviewOverdueDays: overdueDays, recentWrongCount: recentWrongCount(s, 30), recentSkillHistory: twin.recentSkillSequence, recentlyAbandoned };
  });
  const choice = selectNextSkill(inputs);
  const skill = twin.skills[choice.selectedSkillId];

  return { kind: 'normal', skillId: choice.selectedSkillId, difficulty: skill.currentDifficulty, variant: 'standard', reason: choice.reason };
}

// ---------------------------------------------------------------------------
// Live entry point: build the event, append it, apply it. This is the ONLY place
// besides replay21.fold that mutates twin state, and it goes through the identical
// applyEvent path either way.
// ---------------------------------------------------------------------------
export interface AttemptResponse {
  chosenIndex: number;
  solveTimeSec: number;
  hintsUsed: number;
  retryCount: number;
  confidenceBefore?: number;
}

export function buildProblemForAction(action: NextAction): Problem21 {
  // Phase 2 PART 5-1/6: confirm의 존재 이유는 "판별 distractor를 제시하는 것"이다.
  // 생성기 파라미터 조합에 따라 태깅 distractor가 안 실리는 인스턴스가 나올 수 있으므로
  // (예: NUM L4의 NEGSQ 지문은 a<0·짝수지수 조합에서만 생성), 대상 오개념 태그가 실제로
  // 제시되는 문항형이 나올 때까지 유한 재생성한다 — 매 확인이 비율 검정의 유효 표본이 되게.
  if (action.kind === 'confirm' && action.misconceptionId) {
    for (let tries = 0; tries < 12; tries++) {
      const p = generateProblem21(action.skillId, action.difficulty, action.variant);
      if (p.choices.some((c) => c.misconceptionId === action.misconceptionId)) return p;
    }
  }
  return generateProblem21(action.skillId, action.difficulty, action.variant);
}

export function submitAttempt(
  twin: DigitalTwin21,
  log: EventLog,
  action: NextAction,
  problem: Problem21,
  response: AttemptResponse,
  tsOverride?: number,
): { twin: DigitalTwin21; log: EventLog; event: LearningEvent } {
  const correct = response.chosenIndex === problem.answerIndex;
  const chosenErrorType = correct ? null : problem.choices[response.chosenIndex]?.errorType ?? null;
  const chosenChoice = correct ? undefined : problem.choices[response.chosenIndex];
  const offeredMap = new Map<string, 'HIGH' | 'MEDIUM' | 'LOW'>();
  for (const c of problem.choices) {
    if (!c.misconceptionId || !c.diagnosticStrength) continue;
    const prev = offeredMap.get(c.misconceptionId);
    const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
    if (!prev || rank[c.diagnosticStrength] > rank[prev]) offeredMap.set(c.misconceptionId, c.diagnosticStrength);
  }
  const payload: AttemptPayload = {
    attemptId: genId('att'),
    skillId: action.skillId,
    chosenMisconceptionId: chosenChoice?.misconceptionId ?? null,
    chosenDiagnosticStrength: chosenChoice?.diagnosticStrength ?? null,
    offeredMisconceptions: [...offeredMap.entries()].map(([id, strength]) => ({ id, strength })),
    secondarySkillIds: problem.secondarySkillIds,
    difficulty: action.difficulty,
    mode: action.kind,
    variant: action.variant,
    correct,
    chosenErrorType,
    solveTimeSec: response.solveTimeSec,
    estimatedSec: problem.estimatedSec,
    hintsUsed: response.hintsUsed,
    retryCount: response.retryCount,
    confidenceBefore: response.confidenceBefore,
    caseId: action.caseId,
    misconceptionId: action.misconceptionId,
  };
  const event = makeEvent('ATTEMPT', payload, { masteryModel: MASTERY_MODEL_VERSION, config: CONFIG21_VERSION }, tsOverride ?? Date.now());
  const nextLog = appendEvent(log, event);
  const nextTwin = { ...processAttemptEvent(twin, payload, event.ts), seq: event.seq };
  return { twin: nextTwin, log: nextLog, event };
}

// Micro-lesson acknowledgment has no problem/answer — but it still mutates the twin
// (advances the case to 'foundation' and queues the next agenda item), so it MUST go
// through the same event-log path as everything else, or Replay would silently lose it
// (PART N). It is recorded as a trivial always-correct ATTEMPT event with mode
// 'micro-lesson'; processAttemptEvent's 'micro-lesson' case does the real work.
// ---------------------------------------------------------------------------
// Phase 2 ELITE — 라이브 진입점. 본문(elite)과 후속(elite-followup)을 이벤트로 기록하고
// 동일한 applyEvent 경로로 리듀서에 태운다 (리플레이 무손실).
// ---------------------------------------------------------------------------
export interface EliteAttemptResponse {
  chosenIndex: number;
  solveTimeSec: number;
  hintsUsed: ('A' | 'B' | 'C' | 'D')[];
  strategySwitches: number;
  firstStrategy?: string;
  finalStrategy?: string;
  // Phase 3 PART 36 — Productive Struggle 데이터 (UI가 줄 수 있는 만큼; 전부 선택)
  timeToFirstActionSec?: number;
  solutionRevealed?: boolean;
  returnedAfterPause?: boolean;
}

export function submitEliteAttempt(
  twin: DigitalTwin21,
  log: EventLog,
  action: NextAction,
  response: EliteAttemptResponse,
  tsOverride?: number,
): { twin: DigitalTwin21; log: EventLog; event: LearningEvent; correct: boolean } {
  const prob = ELITE_BANK_MAP[action.eliteProblemId!];
  if (!prob) throw new Error(`unknown elite problem: ${action.eliteProblemId}`);
  const isFollowUp = action.kind === 'elite-followup';
  const fu = isFollowUp ? prob.followUps.find((f) => f.id === action.eliteFollowUpId) : undefined;
  if (isFollowUp && !fu) throw new Error(`unknown elite followup: ${action.eliteFollowUpId}`);
  const answerIndex = isFollowUp ? fu!.answerIndex : prob.answerIndex;
  const correct = response.chosenIndex === answerIndex;
  const choices = isFollowUp ? fu!.choices : prob.choices;

  const payload: AttemptPayload = {
    attemptId: genId('eatt'),
    skillId: prob.requiredSkills[0],
    secondarySkillIds: prob.requiredSkills.slice(1),
    difficulty: prob.difficulty,
    mode: isFollowUp ? 'elite-followup' : 'elite',
    variant: 'standard',
    correct,
    chosenErrorType: null, // elite 오답은 elite 분류체계(PART 30)가 담당 — mastery 오류분류 미적용
    chosenMisconceptionId: null,
    chosenDiagnosticStrength: null,
    offeredMisconceptions: [],
    solveTimeSec: response.solveTimeSec,
    estimatedSec: prob.estimatedSec,
    hintsUsed: response.hintsUsed.length,
    retryCount: 0,
    elite: {
      problemId: isFollowUp ? fu!.id : prob.id,
      eliteMode: prob.mode,
      requiredSkills: prob.requiredSkills,
      hintsUsed: response.hintsUsed,
      strategySwitches: response.strategySwitches,
      firstStrategy: response.firstStrategy,
      finalStrategy: response.finalStrategy,
      followUpDimension: isFollowUp ? fu!.dimension : null,
      followUpOf: isFollowUp ? prob.id : null,
      timeToFirstActionSec: response.timeToFirstActionSec,
      solutionRevealed: response.solutionRevealed,
      returnedAfterPause: response.returnedAfterPause,
    },
  };
  void choices;
  const event = makeEvent('ATTEMPT', payload, { masteryModel: MASTERY_MODEL_VERSION, config: CONFIG21_VERSION }, tsOverride ?? Date.now());
  const nextLog = appendEvent(log, event);
  const nextTwin = { ...processAttemptEvent(twin, payload, event.ts), seq: event.seq };
  return { twin: nextTwin, log: nextLog, event, correct };
}

// ---------------------------------------------------------------------------
// Phase 3 PART 28 — Golden Set 시행 제출. 훈련 파이프라인과의 격리가 이 함수의 존재 이유:
// agenda/난이도/오개념/케이스 그 무엇도 만지지 않고, HOLDOUT_ASSESSMENT 이벤트만 남긴다.
// (reducer도 holdout 장부에만 기록 — replay21 참조.)
// ---------------------------------------------------------------------------
export function submitHoldoutAttempt(
  twin: DigitalTwin21,
  log: EventLog,
  item: { id: string; form: 'A' | 'B' | 'C'; parallelGroup: string; area: 'CORE' | 'NEAR_TRANSFER' | 'FAR_TRANSFER' | 'ELITE'; eliteDimension?: string; skillIds: string[]; difficulty: number; answerIndex: number },
  response: { chosenIndex: number; solveTimeSec: number },
  administrationId: string,
  tsOverride?: number,
): { twin: DigitalTwin21; log: EventLog; event: LearningEvent; correct: boolean } {
  const correct = response.chosenIndex === item.answerIndex;
  const payload = {
    attemptId: genId('hatt'),
    itemId: item.id,
    form: item.form,
    parallelGroup: item.parallelGroup,
    area: item.area,
    eliteDimension: item.eliteDimension ?? null,
    skillIds: item.skillIds,
    difficulty: item.difficulty,
    correct,
    chosenIndex: response.chosenIndex,
    solveTimeSec: response.solveTimeSec,
    administrationId,
  };
  const event = makeEvent('HOLDOUT_ASSESSMENT', payload, { masteryModel: MASTERY_MODEL_VERSION, config: CONFIG21_VERSION }, tsOverride ?? Date.now());
  const nextLog = appendEvent(log, event);
  const nextTwin = { ...processHoldoutEvent(twin, payload, event.ts), seq: event.seq };
  return { twin: nextTwin, log: nextLog, event, correct };
}

// live와 replay가 공유하는 단일 리듀서 (replay21.applyEvent가 호출)
export function processHoldoutEvent(twin: DigitalTwin21, p: import('./events21.ts').HoldoutAssessmentPayload, ts: number): DigitalTwin21 {
  return {
    ...twin,
    holdout: [...twin.holdout, { itemId: p.itemId, form: p.form, parallelGroup: p.parallelGroup, area: p.area, eliteDimension: p.eliteDimension ?? null, skillIds: p.skillIds, difficulty: p.difficulty, correct: p.correct, solveTimeSec: p.solveTimeSec, administrationId: p.administrationId, ts }],
  };
}

export function submitMicroLessonAck(twin: DigitalTwin21, log: EventLog, action: NextAction, tsOverride?: number): { twin: DigitalTwin21; log: EventLog; event: LearningEvent } {
  const payload: AttemptPayload = {
    attemptId: genId('att'),
    skillId: action.skillId,
    secondarySkillIds: [],
    difficulty: action.difficulty,
    mode: 'micro-lesson',
    variant: 'standard',
    correct: true,
    chosenErrorType: null,
    solveTimeSec: 0,
    estimatedSec: 1,
    hintsUsed: 0,
    retryCount: 0,
    caseId: action.caseId,
  };
  const event = makeEvent('ATTEMPT', payload, { masteryModel: MASTERY_MODEL_VERSION, config: CONFIG21_VERSION }, tsOverride ?? Date.now());
  const nextLog = appendEvent(log, event);
  const nextTwin = { ...processAttemptEvent(twin, payload, event.ts), seq: event.seq };
  return { twin: nextTwin, log: nextLog, event };
}
