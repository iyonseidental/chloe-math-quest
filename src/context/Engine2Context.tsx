// CHLOE MATH 2.1 — Step 13: engine2 트윈/이벤트 로그를 React에 노출하는 컨텍스트.
// §3 요건: 화면의 모든 값은 실제 엔진 출력(트윈 파생상태)만 사용한다. 이 컨텍스트는
// 엔진 API의 얇은 래퍼일 뿐 어떤 학습 판단도 하지 않는다.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DigitalTwin21 } from '../engine2/types21.ts';
import type { EventLog } from '../engine2/events21.ts';
import type { Problem21 } from '../engine2/problemAdapter21.ts';
import { submitAttempt, submitMicroLessonAck, submitEliteAttempt, submitHoldoutAttempt, type AttemptResponse, type EliteAttemptResponse, type NextAction } from '../engine2/session21.ts';
import type { GoldenItem } from '../engine2/goldenSet23.ts';
import { finalizeDiagnostic, type DiagnosticReport } from '../engine2/diagnostic21.ts';
import { loadTwin, saveEventLog, clearEventLog, ENGINE2_STUDENT_ID } from '../engine2/store21.ts';
import { replayFromScratch, freshTwin21 } from '../engine2/replay21.ts';
import { emptyLog, resetEventSeq } from '../engine2/events21.ts';
import { syncNow, loadSyncConfig, applyAdoptedDoc } from '../engine2/sync23.ts';

interface Engine2Ctx {
  twin: DigitalTwin21;
  log: EventLog;
  submit: (action: NextAction, problem: Problem21, response: AttemptResponse) => { correct: boolean };
  submitElite: (action: NextAction, response: EliteAttemptResponse) => { correct: boolean };
  ackMicroLesson: (action: NextAction) => void;
  finishDiagnosis: () => DiagnosticReport;
  /** Phase 3 Golden Set 시행 — 훈련 상태를 건드리지 않는 평가 전용 제출 */
  submitHoldout: (item: GoldenItem, response: { chosenIndex: number; solveTimeSec: number }, administrationId: string) => { correct: boolean };
  resetAll: () => void;
  /** 디버그/감사용: 현재 로그를 처음부터 재생한 트윈 (라이브와 항상 일치해야 함) */
  replayCheck: () => boolean;
}

const Ctx = createContext<Engine2Ctx | null>(null);

export function Engine2Provider({ children }: { children: ReactNode }) {
  const [{ twin, log }, setState] = useState(() => loadTwin());
  const ref = useRef({ twin, log });
  ref.current = { twin, log };

  useEffect(() => {
    saveEventLog(log);
  }, [log]);

  // ---- GitHub 클라우드 동기화 (설정된 경우에만) ----
  // 시작 시: 원격이 더 최신이면 가져와서 이어하기. 이후: 학습이 멈춘 지 15초 뒤 자동 저장.
  useEffect(() => {
    if (!loadSyncConfig()) return;
    let cancelled = false;
    syncNow(ref.current.log).then((r) => {
      if (cancelled) return;
      if (r.needsReload && r.adoptedDoc) {
        if (r.safetyBackup) {
          const blob = new Blob([JSON.stringify(r.safetyBackup)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'CHLOE_MATH_SAFETY_' + new Date().toISOString().slice(0, 10) + '.json';
          a.click();
        }
        applyAdoptedDoc(r.adoptedDoc);
        window.location.reload();
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadSyncConfig() || log.events.length === 0) return;
    const id = setTimeout(() => {
      // 백그라운드 저장: 원격 채택은 시작 시에만 — 학습 중 화면 교체 방지
      syncNow(ref.current.log).then((r) => {
        if (r.status === 'error') console.warn('[sync]', r.message);
      });
    }, 15000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') syncNow(ref.current.log);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  const value = useMemo<Engine2Ctx>(
    () => ({
      twin,
      log,
      submit: (action, problem, response) => {
        const r = submitAttempt(ref.current.twin, ref.current.log, action, problem, response);
        ref.current = { twin: r.twin, log: r.log };
        setState(ref.current);
        return { correct: response.chosenIndex === problem.answerIndex };
      },
      submitElite: (action, response) => {
        const r = submitEliteAttempt(ref.current.twin, ref.current.log, action, response);
        ref.current = { twin: r.twin, log: r.log };
        setState(ref.current);
        return { correct: r.correct };
      },
      ackMicroLesson: (action) => {
        const r = submitMicroLessonAck(ref.current.twin, ref.current.log, action);
        ref.current = { twin: r.twin, log: r.log };
        setState(ref.current);
      },
      finishDiagnosis: () => {
        const r = finalizeDiagnostic(ref.current.twin, ref.current.log);
        ref.current = { twin: r.twin, log: r.log };
        setState(ref.current);
        return r.report;
      },
      resetAll: () => {
        clearEventLog();
        resetEventSeq(0);
        ref.current = { twin: freshTwin21(ENGINE2_STUDENT_ID), log: emptyLog() };
        setState(ref.current);
      },
      submitHoldout: (item, response, administrationId) => {
        const r = submitHoldoutAttempt(ref.current.twin, ref.current.log, item, response, administrationId);
        ref.current = { twin: r.twin, log: r.log };
        setState(ref.current);
        return { correct: r.correct };
      },
      replayCheck: () => {
        // Phase 3: recentAgendaKinds가 리듀서로 이동해 이제 strip 없이 전체 일치를 요구한다
        const replayed = replayFromScratch(ref.current.log, ENGINE2_STUDENT_ID);
        return JSON.stringify(replayed) === JSON.stringify(ref.current.twin);
      },
    }),
    [twin, log],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEngine2(): Engine2Ctx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEngine2 must be used within Engine2Provider');
  return ctx;
}
