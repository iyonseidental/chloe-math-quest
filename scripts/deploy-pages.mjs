// CHLOE MATH — GitHub Pages 배포 (Ver 1.0).
// `npm run deploy` 하나로: 빌드(버전·빌드시각·version.json 자동 갱신) → dist를 gh-pages
// 브랜치로 강제 푸시. 배포되면 https://iyonseidental.github.io/chloe-math-quest/ 가 즉시
// 새 버전이 되고, 이미 열려 있던 탭은 version.json 감지로 "새 자료 업데이트" 배너를 띄운다.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', ...opts }).trim();

const remote = out('git remote get-url origin');
console.log(`[1/3] 빌드 (버전 스탬프 자동 갱신)...`);
run('npm run build');

const dist = path.resolve('dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/index.html 없음 — 빌드 실패');
  process.exit(1);
}
// SPA 404 fallback (Pages에서 새로고침 대응)
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));

console.log('[2/3] gh-pages 브랜치로 푸시...');
run('git init -b gh-pages', { cwd: dist });
run('git config user.name "Dr. Min"', { cwd: dist });
run('git config user.email "iyonseidental@gmail.com"', { cwd: dist });
run('git add -A', { cwd: dist });
const stamp = new Date().toISOString();
run(`git commit -m "deploy ${stamp}"`, { cwd: dist });
run(`git push -f "${remote}" gh-pages:gh-pages`, { cwd: dist });
fs.rmSync(path.join(dist, '.git'), { recursive: true, force: true });

console.log('[3/3] 완료!');
console.log('   웹 주소: https://iyonseidental.github.io/chloe-math-quest/');
console.log(`   배포 시각: ${stamp} (앱 상단에 업데이트 시각으로 표시됩니다)`);
