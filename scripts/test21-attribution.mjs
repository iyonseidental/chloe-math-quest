// Step 3 test: Evidence Attribution Layer
import { attributeEvidence, likelyRoot } from '../src/engine2/attribution21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const metaFresh = { estimateConfidence: 'VERY_LOW', currentDifficulty: 3 };
const metaKnown = { estimateConfidence: 'HIGH', currentDifficulty: 3 };

// --- single-skill problem: no fixed 30% split exists to test against; correct = 100% primary ---
{
  const ev = attributeEvidence({
    primarySkillId: 'M1.NUM.SIGN.01', secondarySkillIds: [], correct: true, chosenErrorType: null,
    difficulty: 2, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1,
    skillMeta: { 'M1.NUM.SIGN.01': metaFresh },
  });
  check('single-skill correct -> exactly one evidence entry (primary)', ev.length === 1 && ev[0].skillId === 'M1.NUM.SIGN.01');
  check('single-skill correct -> full attribution probability', ev[0].attributionProbability === 1.0);
}

// --- QA 14: multi-skill wrong answer, real cause is the secondary fraction skill ---
{
  const ev = attributeEvidence({
    primarySkillId: 'M1.ALG.EQ.02', secondarySkillIds: ['M1.NUM.FRAC.01'], correct: false, chosenErrorType: 'CONCEPT_GAP',
    difficulty: 4, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1,
    skillMeta: { 'M1.ALG.EQ.02': metaKnown, 'M1.NUM.FRAC.01': metaFresh },
  });
  const frac = ev.find((e) => e.skillId === 'M1.NUM.FRAC.01');
  const primary = ev.find((e) => e.skillId === 'M1.ALG.EQ.02');
  check('QA14: negative evidence concentrates on the true-cause secondary (fraction)', frac.weight > primary.weight, `frac=${frac.weight} primary=${primary.weight}`);
  check('QA14: root is correctly identified as the fraction skill', likelyRoot(ev) === 'M1.NUM.FRAC.01');
  check('QA14: primary still gets some weak penalty (it was the problem context)', primary.weight > 0);
}

// --- QA14 companion: unrelated secondary skills are not penalized ---
{
  const ev = attributeEvidence({
    primarySkillId: 'M1.ALG.EQ.03', secondarySkillIds: ['M1.ALG.EXP.01'], correct: false, chosenErrorType: 'CALCULATION_ERROR', // not a rule-matched errorType for EQ.03
    difficulty: 5, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1,
    skillMeta: { 'M1.ALG.EQ.03': metaKnown, 'M1.ALG.EXP.01': metaFresh },
  });
  const secondary = ev.find((e) => e.skillId === 'M1.ALG.EXP.01');
  check('unmatched error type -> unrelated secondary gets zero penalty', secondary.weight === 0 && secondary.attributionProbability === 0);
}

// --- careless/guessing/time: fixed-30%-rule replacement — secondaries always 0, primary muted ---
{
  const ev = attributeEvidence({
    primarySkillId: 'M1.ALG.EQ.02', secondarySkillIds: ['M1.NUM.FRAC.01'], correct: false, chosenErrorType: 'CARELESS_ERROR',
    difficulty: 4, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1,
    skillMeta: { 'M1.ALG.EQ.02': metaKnown, 'M1.NUM.FRAC.01': metaFresh },
  });
  const frac = ev.find((e) => e.skillId === 'M1.NUM.FRAC.01');
  check('careless error never penalizes secondary skills', frac.weight === 0);
}

// --- correct answer: secondary gets weak credit only when confidence is low ---
{
  const evLowInfo = attributeEvidence({
    primarySkillId: 'M1.ALG.EQ.02', secondarySkillIds: ['M1.NUM.FRAC.01'], correct: true, chosenErrorType: null,
    difficulty: 4, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1,
    skillMeta: { 'M1.ALG.EQ.02': metaKnown, 'M1.NUM.FRAC.01': metaFresh },
  });
  const fracLow = evLowInfo.find((e) => e.skillId === 'M1.NUM.FRAC.01');
  check('correct answer credits a low-confidence secondary weakly', fracLow.weight > 0 && fracLow.weight < evLowInfo[0].weight);

  const evKnownAlready = attributeEvidence({
    primarySkillId: 'M1.ALG.EQ.02', secondarySkillIds: ['M1.NUM.FRAC.01'], correct: true, chosenErrorType: null,
    difficulty: 4, hintsUsed: 0, selfCorrected: false, isGuess: false, sameSkillRunLength: 1,
    skillMeta: { 'M1.ALG.EQ.02': metaKnown, 'M1.NUM.FRAC.01': metaKnown },
  });
  const fracKnown = evKnownAlready.find((e) => e.skillId === 'M1.NUM.FRAC.01');
  check('correct answer does NOT pad an already-confident secondary (no fixed 30% rule)', fracKnown.weight === 0);
}

console.log(`\n${pass} checks passed — Step 3 (Evidence Attribution) OK`);
