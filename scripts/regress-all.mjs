// Phase 3 상시 회귀 게이트 — Phase 1 (14스위트) + Phase 2 (4스위트) 전부 실행.
// PART 54의 각 STEP/GATE에서 이 러너 ALL PASS가 전제 조건이다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { runAll } from './regress-phase1.mjs';

const { results, allPass } = runAll({});
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name.padEnd(22)} ${r.lastLine}`);

let p2ok = true;
const PHASE2 = ['test22-graph', 'test22-m1full', 'test22-elite', 'simulate22-elite'];
const PHASE3 = ['test23-levelwindow', 'test23-tagging', 'test23-borderline', 'test23-elite2', 'test23-golden', 'test23-pilot', 'test23-backup', 'test23-sync', 'verify-generators'];
for (const name of [...PHASE2, ...PHASE3]) {
  if (!fs.existsSync(`scripts/${name}.mjs`)) continue; // 아직 없는 Phase 3 스위트는 건너뜀
  let ok = true;
  let last = '';
  try {
    const out = execFileSync(process.execPath, [`scripts/${name}.mjs`], { encoding: 'utf8', timeout: 600_000 });
    last = out.trim().split('\n').at(-1);
  } catch (e) {
    ok = false;
    p2ok = false;
    last = (String(e.stdout ?? '') + '\n' + String(e.stderr ?? e.message)).trim().split('\n').filter(Boolean).at(-1);
  }
  console.log(`${ok ? '✅' : '❌'} ${name.padEnd(22)} ${last}`);
}

console.log(allPass && p2ok ? '\nALL PASS — Phase 1+2(+3) regression green' : '\n❌ REGRESSION FAILURE');
process.exit(allPass && p2ok ? 0 : 1);
