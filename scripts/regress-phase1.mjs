// PHASE 2 PART 0/40 — Phase 1 회귀 스위트 러너.
// Phase 2의 어떤 변경도 이 러너가 녹색인 상태에서만 진행한다 ("Phase 1 QA regression
// ALL PASS가 항상 먼저다"). 각 스위트를 자식 프로세스로 실행해 exit code를 수집하고,
// 하나라도 실패하면 비영 종료한다.
import { execFileSync } from 'node:child_process';

const SUITES = [
  'test21-step0',
  'test21-mastery',
  'test21-attribution',
  'test21-misconception',
  'test21-rootcause',
  'test21-remediation',
  'test21-retention',
  'test21-adaptive',
  'test21-calibration',
  'test21-session',
  'test21-replay-config',
  'test21-diagnostic',
  'qa21',
  'simulate21',
];

export function runSuite(name, env = {}) {
  try {
    const out = execFileSync(process.execPath, [`scripts/${name}.mjs`], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: 'utf8',
      timeout: 180000,
    });
    const lastLine = out.trim().split('\n').filter(Boolean).pop() ?? '';
    return { name, ok: true, lastLine };
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    const lastLine = out.trim().split('\n').filter(Boolean).slice(-3).join(' | ');
    return { name, ok: false, lastLine };
  }
}

export function runAll(env = {}) {
  const results = SUITES.map((s) => runSuite(s, env));
  return { results, allPass: results.every((r) => r.ok) };
}

// 직접 실행 시: 표 출력 + exit code
if (process.argv[1] && process.argv[1].endsWith('regress-phase1.mjs')) {
  console.log('=== PHASE 1 REGRESSION SUITE ===');
  const { results, allPass } = runAll();
  for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name.padEnd(22)} ${r.lastLine}`);
  console.log(allPass ? '\nALL PASS — Phase 1 regression green' : '\nREGRESSION FAILURE — Phase 2 진행 중단 대상');
  process.exitCode = allPass ? 0 : 1;
}
