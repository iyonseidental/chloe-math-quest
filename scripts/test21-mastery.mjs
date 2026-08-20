// Step 2 test: E2 Mastery & Uncertainty Engine
import {
  computeStats,
  estimateConfidence,
  applyTimeDecay,
  correctEvidenceWeight,
  wrongEvidenceWeight,
  isGuessLikely,
  addCorrectEvidence,
  addWrongEvidence,
  predictSuccess,
  logit,
  sigmoid,
  readMastery,
} from '../src/engine2/mastery21.ts';
import { CONFIG21 } from '../src/engine2/config21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

// --- prior-only stats ---
{
  const { p, uncertainty, effectiveEvidence } = computeStats(CONFIG21.prior.alpha, CONFIG21.prior.beta);
  // 2.2.0: prior (1,4)→(1,3) 캘리브레이션 하드닝 (calib-tune.mjs R3, holdout 검증).
  // 행동 보증은 "낮은 보수적 prior"이지 특정 상수가 아니므로 config 유도값으로 검사.
  check('prior p = α0/(α0+β0) (보수적 저기대 시작)', Math.abs(p - CONFIG21.prior.alpha / (CONFIG21.prior.alpha + CONFIG21.prior.beta)) < 1e-9 && p <= 0.3);
  check('prior effectiveEvidence = 0', effectiveEvidence === 0);
  check('prior uncertainty is near its maximum', uncertainty > 0.15, `${uncertainty}`);
  check('prior confidence is VERY_LOW', estimateConfidence(effectiveEvidence, uncertainty) === 'VERY_LOW');
}

// --- evidence accumulation raises p, evidence, and lowers uncertainty ---
{
  let alpha = CONFIG21.prior.alpha;
  let beta = CONFIG21.prior.beta;
  const before = computeStats(alpha, beta);
  for (let i = 0; i < 20; i++) {
    const w = correctEvidenceWeight({ difficulty: 3, currentDifficulty: 3, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1 });
    ({ alpha, beta } = addCorrectEvidence(alpha, beta, w));
  }
  const after = computeStats(alpha, beta);
  check('20 clean correct answers raise p', after.p > before.p, `${before.p} -> ${after.p}`);
  check('20 clean correct answers raise effectiveEvidence', after.effectiveEvidence > before.effectiveEvidence);
  check('20 clean correct answers lower uncertainty', after.uncertainty < before.uncertainty);
  check('after 20 clean correct, p is high', after.p > 0.8, `${after.p}`);
}

// --- QA11 / AC1: a handful of lucky correct answers must NOT reach high confidence ---
{
  let alpha = CONFIG21.prior.alpha;
  let beta = CONFIG21.prior.beta;
  for (let i = 0; i < 5; i++) {
    const w = correctEvidenceWeight({ difficulty: 2, currentDifficulty: 2, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1 });
    ({ alpha, beta } = addCorrectEvidence(alpha, beta, w));
  }
  const stats = computeStats(alpha, beta);
  const conf = estimateConfidence(stats.effectiveEvidence, stats.uncertainty);
  check('5 correct answers: p rises but confidence stays low', stats.p > 0.5 && (conf === 'VERY_LOW' || conf === 'LOW'), `p=${stats.p} E=${stats.effectiveEvidence} conf=${conf}`);
}

// --- hints / guessing / retry reduce evidence weight (Independence) ---
{
  const clean = correctEvidenceWeight({ difficulty: 3, currentDifficulty: 3, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1 });
  const hinted = correctEvidenceWeight({ difficulty: 3, currentDifficulty: 3, hintsUsed: 3, selfCorrected: false, isGuess: false, sameSkillRunLength: 1 });
  const guessed = correctEvidenceWeight({ difficulty: 3, currentDifficulty: 3, hintsUsed: 0, selfCorrected: false, isGuess: true, sameSkillRunLength: 1 });
  const retried = correctEvidenceWeight({ difficulty: 3, currentDifficulty: 3, hintsUsed: 0, selfCorrected: true, isGuess: false, sameSkillRunLength: 1 });
  check('hints reduce correct evidence weight', hinted < clean, `${hinted} < ${clean}`);
  check('guessing sharply reduces correct evidence weight', guessed < clean * 0.5, `${guessed} < ${clean * 0.5}`);
  check('self-correction halves correct evidence weight', Math.abs(retried - clean * 0.5) < 1e-9);
}

// --- AC2: correct evidence weight has NO time-based penalty (slow-but-accurate defense) ---
{
  // correctEvidenceWeight does not accept solveTimeSec at all -- accurate by construction.
  // isGuessLikely is the ONLY place solve time matters, and it correctly does not flag slow solves.
  check('slow, deliberate solve is not classified as a guess', !isGuessLikely(180, 60));
  check('suspiciously fast solve IS classified as a guess', isGuessLikely(5, 60));
}

// --- diversity dampening (repeat-skill farming defense) ---
{
  const fresh = correctEvidenceWeight({ difficulty: 3, currentDifficulty: 3, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1 });
  const repeated = correctEvidenceWeight({ difficulty: 3, currentDifficulty: 3, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 4 });
  check('4th+ consecutive same-skill attempt yields less evidence', repeated < fresh, `${repeated} < ${fresh}`);
}

// --- AC9: overreach damping + single-attempt cap ---
{
  const overreach = correctEvidenceWeight({ difficulty: 5, currentDifficulty: 1, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1 });
  const normal = correctEvidenceWeight({ difficulty: 3, currentDifficulty: 3, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1 });
  check('one lucky hit far above current level is damped', overreach < CONFIG21.evidence.correctBase[4]);
  check('no single attempt can exceed the cap', normal <= CONFIG21.evidence.singleAttemptCap && overreach <= CONFIG21.evidence.singleAttemptCap);
}

// --- wrong evidence: easy-problem wrong is a strong signal; careless is muted ---
{
  const easyWrongConcept = wrongEvidenceWeight({ difficulty: 1, errorType: 'CONCEPT_GAP' });
  const hardWrongConcept = wrongEvidenceWeight({ difficulty: 5, errorType: 'CONCEPT_GAP' });
  check('missing an easy problem is stronger negative evidence than missing a hard one', easyWrongConcept > hardWrongConcept);
  const careless = wrongEvidenceWeight({ difficulty: 3, errorType: 'CARELESS_ERROR' });
  const concept = wrongEvidenceWeight({ difficulty: 3, errorType: 'CONCEPT_GAP' });
  check('careless mistakes are penalized much less than concept gaps (QA3 defense)', careless < concept * 0.5, `${careless} vs ${concept}`);
}

// --- QA3: one careless mistake on a hard problem barely moves p ---
{
  const { alpha: a0, beta: b0 } = { alpha: 20, beta: 3 }; // strong prior mastery, p=0.87
  const before = computeStats(a0, b0);
  const w = wrongEvidenceWeight({ difficulty: 5, errorType: 'CARELESS_ERROR' });
  const { alpha, beta } = addWrongEvidence(a0, b0, w);
  const after = computeStats(alpha, beta);
  check('one careless slip on a hard problem does not crash mastery', before.p - after.p < 0.05, `${before.p} -> ${after.p}`);
}

// --- time decay: within grace period unchanged, beyond grace shrinks toward prior ---
{
  const a = 30, b = 5;
  const fresh = applyTimeDecay(a, b, '2026-08-01', '2026-08-10'); // 9 days, within 14-day grace
  check('within grace period, no decay', fresh.alpha === a && fresh.beta === b);
  const stale = applyTimeDecay(a, b, '2026-05-01', '2026-08-18'); // ~109 days
  check('beyond grace period, excess mass decays', stale.alpha < a && stale.beta < b, `${stale.alpha}, ${stale.beta}`);
  check('decay never goes below the prior floor', stale.alpha >= CONFIG21.prior.alpha && stale.beta >= CONFIG21.prior.beta);
  const statsBefore = computeStats(a, b);
  const statsAfter = computeStats(stale.alpha, stale.beta);
  check('AC7: long inactivity widens uncertainty back out', statsAfter.uncertainty > statsBefore.uncertainty);
}

// --- prediction / calibration hook ---
{
  const p85d3 = predictSuccess(0.85, 3);
  check('predictSuccess(0.85, mid difficulty) is a reasonable probability', p85d3 > 0.75 && p85d3 < 0.9, `${p85d3}`);
  check('sigmoid(logit(x)) round-trips', Math.abs(sigmoid(logit(0.63)) - 0.63) < 1e-6);
  const easy = predictSuccess(0.6, 1);
  const hard = predictSuccess(0.6, 5);
  check('same mastery predicts lower success on harder problems', hard < easy, `${hard} < ${easy}`);
}

// --- readMastery integration ---
{
  const r = readMastery(20, 5, '2026-05-01', '2026-08-18');
  check('readMastery returns a coherent bundle', r.p > 0 && r.p < 1 && ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].includes(r.confidence));
}

console.log(`\n${pass} checks passed — Step 2 (Mastery & Uncertainty) OK`);
