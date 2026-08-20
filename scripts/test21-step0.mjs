// Step 0 test: Raw Event Ledger + Replay Fold skeleton
import assert from 'node:assert/strict';
import { emptyLog, appendEvent, makeEvent, resetEventSeq } from '../src/engine2/events21.ts';
import { freshTwin21, fold, replayFromScratch } from '../src/engine2/replay21.ts';
import { ALL_SKILL_IDS } from '../src/engine2/curriculum21.ts';
import { CONFIG21, CONFIG21_VERSION, MASTERY_MODEL_VERSION } from '../src/engine2/config21.ts';

resetEventSeq(0);
let pass = 0;

function check(name, cond) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  pass++;
  console.log(`OK  ${name}`);
}

// event log is append-only / immutable
let log = emptyLog();
check('empty log has no events', log.events.length === 0);
const e1 = makeEvent('DIAGNOSTIC_PLACEMENT', { skillId: 'M1.NUM.SIGN.01', placementDifficulty: 2, seedAlpha: 1.8, seedBeta: 0.6 }, { masteryModel: MASTERY_MODEL_VERSION, config: CONFIG21_VERSION });
const log2 = appendEvent(log, e1);
check('append does not mutate original log', log.events.length === 0);
check('append returns new log with the event', log2.events.length === 1 && log2.events[0].seq === 0);

const e2 = makeEvent('DIAGNOSTIC_PLACEMENT', { skillId: 'M1.NUM.SIGN.02', placementDifficulty: 1, seedAlpha: 1, seedBeta: 1 }, { masteryModel: MASTERY_MODEL_VERSION, config: CONFIG21_VERSION });
const log3 = appendEvent(log2, e2);
check('sequential seq numbers assigned', e2.seq === 1);

// fresh twin has all graph skills, UNSEEN, prior alpha/beta
// (2.2: 그래프 35스킬 확장 + prior는 CONFIG 유도 — 상수 고정 검사 해제, 행동 보증만 유지)
const twin = freshTwin21('chloe-test');
check('fresh twin has all graph skills', Object.keys(twin.skills).length === ALL_SKILL_IDS.length && ALL_SKILL_IDS.length >= 10);
check('fresh twin skill starts UNSEEN', twin.skills['M1.NUM.SIGN.01'].knowledgeState === 'UNSEEN');
check('fresh twin skill starts with CONFIG prior', twin.skills['M1.NUM.SIGN.01'].alpha === CONFIG21.prior.alpha && twin.skills['M1.NUM.SIGN.01'].beta === CONFIG21.prior.beta);
check('fresh twin p0 = config prior mean (보수적 저기대 시작)', Math.abs(twin.skills['M1.NUM.SIGN.01'].masteryProbability - CONFIG21.prior.alpha / (CONFIG21.prior.alpha + CONFIG21.prior.beta)) < 1e-9 && twin.skills['M1.NUM.SIGN.01'].masteryProbability <= 0.3);
check('fresh twin versions stamped', twin.versions.masteryModel === MASTERY_MODEL_VERSION);
check('fresh twin seq = -1 (nothing applied yet)', twin.seq === -1);

// fold advances seq and is idempotent under re-fold
const folded = fold(log3.events, twin);
check('fold advances seq to last applied event', folded.seq === 1);
const reFolded = fold(log3.events, folded);
check('re-folding already-applied events is a no-op (idempotent)', reFolded.seq === 1 && JSON.stringify(reFolded) === JSON.stringify(folded));

const replayed = replayFromScratch(log3, 'chloe-test');
check('replayFromScratch matches manual fresh+fold', JSON.stringify(replayed) === JSON.stringify(folded));

console.log(`\n${pass} checks passed — Step 0 OK`);
