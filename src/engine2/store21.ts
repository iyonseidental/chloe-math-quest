// CHLOE MATH 2.1 — Step 13: 브라우저 영속화 계층.
// PART N을 문자 그대로 구현한다: 저장되는 것은 **Raw Event Log 하나뿐**이고, Digital Twin은
// 로드할 때마다 replayFromScratch로 재구성한다. mastery/knowledge state 등 파생값은 디스크
// 어디에도 "사실"로 저장되지 않으므로, config/모델 버전이 바뀌어도 같은 저장본에서 무손실
// 재계산된다 (test21-replay-config.mjs가 검증한 성질이 곧 저장 포맷의 성질이 된다).
import { replayFromScratch } from './replay21.ts';
import { resetEventSeq, emptyLog, type EventLog } from './events21.ts';
import type { DigitalTwin21 } from './types21.ts';

const KEY = 'chloe-engine21-eventlog-v1';
export const ENGINE2_STUDENT_ID = 'chloe';

export function loadEventLog(): EventLog {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyLog();
    const parsed = JSON.parse(raw) as EventLog;
    if (!Array.isArray(parsed.events)) return emptyLog();
    return parsed;
  } catch {
    return emptyLog();
  }
}

export function saveEventLog(log: EventLog): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // 저장 실패(용량 등)는 학습 진행을 막지 않는다 — 다음 저장에서 재시도됨
  }
}

export function clearEventLog(): void {
  localStorage.removeItem(KEY);
}

// 로드 = 이벤트 재생. seq 카운터를 이어붙여 새 이벤트가 기존 뒤에 단조 증가로 연결되게 한다.
export function loadTwin(): { twin: DigitalTwin21; log: EventLog } {
  const log = loadEventLog();
  const maxSeq = log.events.reduce((m, e) => Math.max(m, e.seq), -1);
  resetEventSeq(maxSeq + 1);
  const twin = replayFromScratch(log, ENGINE2_STUDENT_ID);
  return { twin, log };
}
