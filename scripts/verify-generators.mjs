// 문제은행 신뢰도 검증: 모든 (스킬 × 레벨 × 변형)에서 대량 생성해 구조를 검사한다.
// node 24의 type stripping으로 TS 엔진을 직접 import한다.
import { generateProblem } from '../src/engine/generators/index.ts';
import { PLAYABLE_SKILLS } from '../src/data/curriculum.ts';

let total = 0;
const errors = [];

for (const skill of PLAYABLE_SKILLS) {
  for (let level = 1; level <= 5; level++) {
    for (const variant of ['standard', 'transfer']) {
      for (let i = 0; i < 200; i++) {
        total++;
        let p;
        try {
          p = generateProblem(skill.id, level, variant);
        } catch (e) {
          errors.push(`${skill.id} L${level} ${variant}: threw ${e.message}`);
          continue;
        }
        const label = `${skill.id} L${level} ${variant}`;
        if (!p.stem || typeof p.stem !== 'string') errors.push(`${label}: stem 없음`);
        if (!Array.isArray(p.choices) || p.choices.length !== 4) {
          errors.push(`${label}: 보기 4개 아님`);
          continue;
        }
        const texts = new Set(p.choices.map((c) => c.text));
        if (texts.size !== 4) errors.push(`${label}: 보기 중복 ${JSON.stringify(p.choices.map((c) => c.text))}`);
        const correctCount = p.choices.filter((c) => c.errorType === null).length;
        if (correctCount !== 1) errors.push(`${label}: 정답 유일성 위반 (${correctCount}개)`);
        if (p.choices[p.answerIndex]?.errorType !== null) errors.push(`${label}: answerIndex 불일치`);
        for (const c of p.choices) {
          if (c.errorType !== null && typeof c.errorType !== 'string') errors.push(`${label}: 오답 태그 누락`);
        }
        if (!p.hints || p.hints.length !== 3 || p.hints.some((h) => !h)) errors.push(`${label}: 힌트 3단계 아님`);
        if (!p.idea || !p.solve || !p.remember) errors.push(`${label}: 해설(IDEA/SOLVE/REMEMBER) 누락`);
        if (!(p.estimatedSec > 0)) errors.push(`${label}: 예상시간 없음`);
      }
    }
  }
}

console.log(`생성 ${total}문제, 오류 ${errors.length}건`);
if (errors.length) {
  const counts = {};
  for (const e of errors) counts[e.split(':')[0] + ':' + e.split(':')[1]] = (counts[e.split(':')[0] + ':' + e.split(':')[1]] || 0) + 1;
  for (const [k, v] of Object.entries(counts).slice(0, 30)) console.log(`${v}x ${k}`);
  process.exit(1);
}
console.log('ALL OK — 정답 유일성·오답 태깅·힌트·해설 검증 통과');
