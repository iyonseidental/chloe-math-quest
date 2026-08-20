// Step 8 test: E6 Adaptive Progression Engine
import { priorityScore, selectNextSkill, checkFastTrack, frustrationAction, pickFlowMode, exceedsDiagnosticShare } from '../src/engine2/adaptive21.ts';

let pass = 0;
function check(name, cond, detail = '') {
  if (!cond) throw new Error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  pass++;
  console.log(`OK  ${name}`);
}

const base = { skillId: 'M1.ALG.EQ.01', p: 0.7, knowledgeState: 'PRACTICING', reviewOverdueDays: 0, recentWrongCount: 0, recentSkillHistory: [] };

// --- weakness drives priority ---
{
  const weak = priorityScore({ ...base, p: 0.3 });
  const strong = priorityScore({ ...base, p: 0.9 });
  check('lower mastery -> higher priority score, all else equal', weak.score > strong.score, `${weak.score} vs ${strong.score}`);
}

// --- forgetting risk ---
{
  const fresh = priorityScore({ ...base, reviewOverdueDays: 0 });
  const overdue = priorityScore({ ...base, reviewOverdueDays: 8 });
  check('overdue review raises priority via forgetting risk', overdue.score > fresh.score);
  check('forgetting risk is capped', priorityScore({ ...base, reviewOverdueDays: 500 }).forgettingRisk <= 2.5);
}

// --- opportunity boost by knowledge state ---
{
  const remediation = priorityScore({ ...base, knowledgeState: 'REMEDIATION' });
  const mastered = priorityScore({ ...base, knowledgeState: 'MASTERED' });
  check('a skill under active remediation outranks an already-mastered one', remediation.score > mastered.score);
}

// --- diversity dampening ---
{
  const noRepeat = priorityScore({ ...base, recentSkillHistory: ['M1.NUM.SIGN.01', 'M1.NUM.SIGN.02'] });
  const repeated = priorityScore({ ...base, recentSkillHistory: ['M1.ALG.EQ.01', 'M1.NUM.SIGN.02'] });
  const streak = priorityScore({ ...base, recentSkillHistory: ['M1.ALG.EQ.01', 'M1.ALG.EQ.01', 'M1.ALG.EQ.01', 'M1.ALG.EQ.01'] });
  check('recently-seen skill is dampened', repeated.score < noRepeat.score);
  check('4-in-a-row streak is dampened even further', streak.diversity < repeated.diversity);
}

// --- selectNextSkill: audit trail ---
{
  const choice = selectNextSkill([
    { ...base, skillId: 'A', p: 0.9, knowledgeState: 'MASTERED' },
    { ...base, skillId: 'B', p: 0.3, knowledgeState: 'PRACTICING' },
  ]);
  check('weaker skill B is selected over mastered A', choice.selectedSkillId === 'B');
  check('a human-readable reason is provided', typeof choice.reason === 'string' && choice.reason.length > 0);
  check('all candidates are reported for audit (WHY THIS PROBLEM?)', choice.candidates.length === 2);
}

// --- Fast Track ---
{
  check('3 hint-free correct + high mastery -> fast track eligible', checkFastTrack(3, 0.85));
  check('high mastery but short streak -> not yet', !checkFastTrack(1, 0.9));
  check('long streak but low mastery -> not eligible (streak alone is not enough)', !checkFastTrack(5, 0.5));
}

// --- Frustration Protection ---
{
  check('below the streak threshold -> no action', frustrationAction(2, ['CONCEPT_GAP', 'CONCEPT_GAP']) === null);
  check('3 consecutive wrongs, mostly conceptual -> investigate root cause', frustrationAction(3, ['CONCEPT_GAP', 'CONCEPT_GAP', 'CALCULATION_ERROR']) === 'investigate');
  check('3 consecutive wrongs, mostly careless -> ease (do not over-diagnose a good student having a bad run)', frustrationAction(3, ['CARELESS_ERROR', 'CARELESS_ERROR', 'GUESSING']) === 'ease');
}

// --- Flow ratio ---
{
  check('roll 0.5 -> current level (70% band)', pickFlowMode(0.5) === 'current');
  check('roll 0.85 -> stretch (20% band)', pickFlowMode(0.85) === 'stretch');
  check('roll 0.95 -> challenge (10% band)', pickFlowMode(0.95) === 'challenge');
}

// --- no-over-testing guard ---
{
  check('3 probes out of 4 recent items exceeds the diagnostic share limit', exceedsDiagnosticShare(['probe', 'probe', 'probe', 'normal']));
  check('1 probe out of 10 is comfortably under the limit', !exceedsDiagnosticShare(['probe', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal']));
}

console.log(`\n${pass} checks passed — Step 8 (Adaptive Progression) OK`);
