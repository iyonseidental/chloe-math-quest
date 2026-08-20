// Demo Data (§82) — 가짜 숫자를 채워 넣는 것이 아니라, 실제 recorder 엔진으로
// 지난 2주의 학습을 시뮬레이션해 일관성 있는 데모 학생을 만든다.
import { freshModel } from './store.ts';
import { recordAnswer, applyDiagnosis } from './recorder.ts';
import { generateProblem } from './generators/index.ts';
import { planNextProblem } from './adaptive.ts';
import { addDays, todayStr } from './review.ts';
import type { ErrorType, Level, StudentModel } from './types.ts';

// 스킬별 데모 정답률 — §82의 예시 분포(좌표 강함, 방정식·기하 약함)를 재현
const ACCURACY: Record<string, number> = {
  'M1.NUM.INT': 0.78,
  'M1.ALG.EXP': 0.68,
  'M1.ALG.EQ': 0.5,
  'M1.FUN.COORD': 0.85,
  'M1.FUN.PROP': 0.62,
  'M1.GEO.BASIC': 0.55,
  'M1.STA.DATA': 0.72,
};

const WRONG_TAGS: ErrorType[] = ['CONCEPT', 'CALCULATION', 'SIGN', 'INTERPRETATION', 'CARELESS'];

export function buildDemoModel(): StudentModel {
  let model = freshModel('Chloe');
  model = applyDiagnosis(
    model,
    {
      'M1.NUM.INT': 2 as Level,
      'M1.ALG.EXP': 2 as Level,
      'M1.ALG.EQ': 1 as Level,
      'M1.FUN.COORD': 3 as Level,
      'M1.FUN.PROP': 2 as Level,
      'M1.GEO.BASIC': 1 as Level,
      'M1.STA.DATA': 2 as Level,
    },
    'M1',
  );

  const today = todayStr();
  const skillIds = Object.keys(ACCURACY);
  for (let day = 9; day >= 0; day--) {
    const date = addDays(today, -day);
    // 하루 7~10문제, 2~3개 스킬 순환
    const perDay = 7 + Math.floor(Math.random() * 4);
    for (let i = 0; i < perDay; i++) {
      const skillId = skillIds[(day + i) % skillIds.length];
      const plan = planNextProblem(model, skillId);
      const p = generateProblem(plan.skillId, plan.level, plan.variant);
      const acc = ACCURACY[plan.skillId] ?? 0.75;
      const correct = Math.random() < acc;
      let chosenIndex = p.answerIndex;
      if (!correct) {
        const tag = WRONG_TAGS[Math.floor(Math.random() * WRONG_TAGS.length)];
        const idx = p.choices.findIndex((c) => c.errorType === tag);
        chosenIndex = idx >= 0 ? idx : p.choices.findIndex((c) => c.errorType !== null);
      }
      const r = recordAnswer(model, {
        problem: p,
        chosenIndex,
        timeMs: p.estimatedSec * 1000 * (0.5 + Math.random()),
        hintsUsed: !correct && Math.random() < 0.3 ? 1 : 0,
        selfDiagnosis: correct ? null : 'calc-slip',
        today: date,
      });
      model = r.model;

      // 생긴 클리닉 케이스 일부는 그날 치료 (완치율 ~45%)
      if (r.result.clinicCaseCreated && Math.random() < 0.45) {
        model = resolveOneClinicCase(model, date);
      }
    }
  }
  return model;
}

function resolveOneClinicCase(model: StudentModel, date: string): StudentModel {
  const c0 = model.clinicQueue.find((c) => !c.resolved);
  if (!c0) return model;
  // review 단계 → similarA로
  let m: StudentModel = {
    ...model,
    clinicQueue: model.clinicQueue.map((c) => (c.id === c0.id && c.stage === 'review' ? { ...c, stage: 'similarA' as const } : c)),
  };
  for (let guard = 0; guard < 6; guard++) {
    const c = m.clinicQueue.find((x) => x.id === c0.id);
    if (!c || c.resolved) break;
    const variant = c.stage === 'transfer' ? 'transfer' : c.stage === 'check' ? 'standard' : c.stage === 'similarB' ? 'similarB' : 'similarA';
    const p = generateProblem(c.skillId, c.level, variant);
    m = recordAnswer(m, {
      problem: p,
      chosenIndex: p.answerIndex,
      timeMs: p.estimatedSec * 900,
      hintsUsed: 0,
      selfDiagnosis: null,
      clinicCaseId: c.id,
      today: date,
    }).model;
  }
  return m;
}
