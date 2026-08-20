// 파일 문제은행 검증 — UCAT 은행 관리 방식처럼, 문제 추가/수정 후 반드시 실행한다.
// 검사: 스키마, 보기 4개·중복 없음, 정답 유일성(error null 1개), answerIndex 일치,
//       힌트 3단계, 해설 3요소, 스킬 ID 유효성, 난이도 범위, ID 중복
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILL_MAP } from '../src/data/curriculum.ts';

const bankDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'bank');
const files = readdirSync(bankDir).filter((f) => f.endsWith('.json'));

const VALID_ERRORS = ['CONCEPT', 'CALCULATION', 'SIGN', 'FORMULA', 'INTERPRETATION', 'CARELESS', 'PREREQUISITE', 'TIME', 'GUESSING'];
const errors = [];
const seenIds = new Set();
let total = 0;

for (const file of files) {
  const data = JSON.parse(readFileSync(join(bankDir, file), 'utf-8'));
  if (!data.track || !data.schemaVersion || !Array.isArray(data.questions)) {
    errors.push(`${file}: 헤더(track/schemaVersion/questions) 불완전`);
    continue;
  }
  for (const q of data.questions) {
    total++;
    const label = `${file} ${q.id ?? '(id없음)'}`;
    if (!q.id) errors.push(`${label}: id 없음`);
    else if (seenIds.has(q.id)) errors.push(`${label}: id 중복`);
    else seenIds.add(q.id);
    if (!SKILL_MAP[q.skill]) errors.push(`${label}: 알 수 없는 skill "${q.skill}"`);
    else if (!q.id.startsWith(q.skill)) errors.push(`${label}: id가 skill로 시작하지 않음`);
    if (!(q.level >= 1 && q.level <= 5)) errors.push(`${label}: level 범위(1~5) 위반`);
    if (!['standard', 'transfer'].includes(q.variant)) errors.push(`${label}: variant는 standard|transfer`);
    if (!q.stem) errors.push(`${label}: stem 없음`);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      errors.push(`${label}: 보기 4개 아님`);
      continue;
    }
    const texts = new Set(q.choices.map((c) => c.text));
    if (texts.size !== 4) errors.push(`${label}: 보기 중복`);
    const correctIdxs = q.choices.map((c, i) => (c.error === null ? i : -1)).filter((i) => i >= 0);
    if (correctIdxs.length !== 1) errors.push(`${label}: 정답(error:null) 유일성 위반 (${correctIdxs.length}개)`);
    else if (correctIdxs[0] !== q.answerIndex) errors.push(`${label}: answerIndex(${q.answerIndex})와 정답 위치(${correctIdxs[0]}) 불일치`);
    for (const c of q.choices) {
      if (c.error !== null && !VALID_ERRORS.includes(c.error)) errors.push(`${label}: 오답 태그 "${c.error}" 무효`);
    }
    if (!Array.isArray(q.hints) || q.hints.length !== 3 || q.hints.some((h) => !h)) errors.push(`${label}: 힌트 3단계 아님`);
    if (!q.idea || !q.solve || !q.remember) errors.push(`${label}: 해설(idea/solve/remember) 누락`);
    if (!(q.estimatedSec > 0)) errors.push(`${label}: estimatedSec 없음`);
  }
}

console.log(`문제은행 파일 ${files.length}개, 문제 ${total}개 검사`);
if (errors.length) {
  for (const e of errors.slice(0, 30)) console.log('❌ ' + e);
  process.exit(1);
}
console.log('ALL OK — 파일 문제은행 무결성 통과');
