// AdaptiveQuestionEngine의 문제 공급원.
// variant에 따라 표준/유사(similarA·B)/전이(transfer) 문제를 생성한다.
// - similarA: 같은 템플릿, 새로운 숫자 (거의 동일 구조)
// - similarB: 같은 템플릿, 새로운 숫자 (표현이 달라지는 것은 템플릿 내 랜덤 분기로 커버)
// - transfer: 같은 개념, 완전히 새로운 상황(문장제 맥락)
import type { Choice, Level, Problem, SkillId, Variant } from '../types.ts';
import { problemId } from './util.ts';
import { bankLookup, toProblem } from '../../data/bank/index.ts';
import { genNumInt, transferNumInt, genAlgExp, transferAlgExp, genAlgEq, transferAlgEq } from './m1-num-alg.ts';
import {
  genFunCoord,
  transferFunCoord,
  genFunProp,
  transferFunProp,
  genGeoBasic,
  transferGeoBasic,
  genStaData,
  transferStaData,
} from './m1-fun-geo-sta.ts';
import {
  genAlgMono,
  transferAlgMono,
  genAlgIneq,
  transferAlgIneq,
  genAlgSys,
  transferAlgSys,
  genFunLinear,
  transferFunLinear,
  genGeoTri,
  transferGeoTri,
  genStaProb,
  transferStaProb,
} from './m2.ts';
import {
  genNumSqrt,
  transferNumSqrt,
  genAlgFact,
  transferAlgFact,
  genAlgQuad,
  transferAlgQuad,
  genFunQuad,
  transferFunQuad,
  genGeoTrig,
  transferGeoTrig,
  genStaStat,
  transferStaStat,
} from './m3.ts';

export interface Draft {
  stem: string;
  choices: Choice[];
  answerIndex: number;
  hints: [string, string, string];
  idea: string;
  solve: string;
  remember: string;
  estimatedSec: number;
}

type Gen = (level: Level) => Draft;

const STANDARD: Record<SkillId, Gen> = {
  'M1.NUM.INT': genNumInt,
  'M1.ALG.EXP': genAlgExp,
  'M1.ALG.EQ': genAlgEq,
  'M1.FUN.COORD': genFunCoord,
  'M1.FUN.PROP': genFunProp,
  'M1.GEO.BASIC': genGeoBasic,
  'M1.STA.DATA': genStaData,
  'M2.ALG.MONO': genAlgMono,
  'M2.ALG.INEQ': genAlgIneq,
  'M2.ALG.SYS': genAlgSys,
  'M2.FUN.LINEAR': genFunLinear,
  'M2.GEO.TRI': genGeoTri,
  'M2.STA.PROB': genStaProb,
  'M3.NUM.SQRT': genNumSqrt,
  'M3.ALG.FACT': genAlgFact,
  'M3.ALG.QUAD': genAlgQuad,
  'M3.FUN.QUAD': genFunQuad,
  'M3.GEO.TRIG': genGeoTrig,
  'M3.STA.STAT': genStaStat,
};

const TRANSFER: Record<SkillId, Gen> = {
  'M1.NUM.INT': transferNumInt,
  'M1.ALG.EXP': transferAlgExp,
  'M1.ALG.EQ': transferAlgEq,
  'M1.FUN.COORD': transferFunCoord,
  'M1.FUN.PROP': transferFunProp,
  'M1.GEO.BASIC': transferGeoBasic,
  'M1.STA.DATA': transferStaData,
  'M2.ALG.MONO': transferAlgMono,
  'M2.ALG.INEQ': transferAlgIneq,
  'M2.ALG.SYS': transferAlgSys,
  'M2.FUN.LINEAR': transferFunLinear,
  'M2.GEO.TRI': transferGeoTri,
  'M2.STA.PROB': transferStaProb,
  'M3.NUM.SQRT': transferNumSqrt,
  'M3.ALG.FACT': transferAlgFact,
  'M3.ALG.QUAD': transferAlgQuad,
  'M3.FUN.QUAD': transferFunQuad,
  'M3.GEO.TRIG': transferGeoTrig,
  'M3.STA.STAT': transferStaStat,
};

// 문제 공급 우선순위: ① 큐레이션 문제은행(파일) 일부 확률 ② 절차적 생성기(무한 공급)
const BANK_RATIO = 0.35; // (skill, level)에 은행 문제가 있으면 이 확률로 은행에서 출제

export function generateProblem(skillId: SkillId, level: Level, variant: Variant = 'standard', useBank = true): Problem {
  const lv = Math.min(5, Math.max(1, level)) as Level;

  // useBank=false: engine2 micro-skill 서빙 경로 — 은행은 (unit, level) 단위 큐레이션이라
  // 한 레벨 안에서도 micro-skill 주제를 벗어나는 문항이 있어 주제 순수성을 깨뜨린다.
  if (useBank && Math.random() < BANK_RATIO) {
    const banked = bankLookup(skillId, lv, variant);
    if (banked) return toProblem(banked, variant);
  }

  const table = variant === 'transfer' ? TRANSFER : STANDARD;
  const gen = table[skillId];
  if (!gen) throw new Error(`generator 없음: ${skillId}`);
  // 동일 문제 반복 방지: 같은 stem이 직전과 겹치면 재생성 (최대 5회)
  let draft = gen(lv);
  for (let i = 0; i < 5 && draft.stem === lastStem[skillId]; i++) draft = gen(lv);
  lastStem[skillId] = draft.stem;
  return { id: problemId(skillId, lv), skillId, level: lv, variant, ...draft };
}

const lastStem: Record<string, string> = {};
