import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadModel, saveModel, clearModel, freshModel } from '../engine/store.ts';
import { recordAnswer, applyDiagnosis, type RecordInput } from '../engine/recorder.ts';
import { buildDemoModel } from '../engine/demo.ts';
import type { Level, RecordResult, StudentModel, TrackId } from '../engine/types.ts';

interface StudentCtx {
  model: StudentModel;
  record: (input: RecordInput) => RecordResult;
  finishDiagnosis: (placements: Record<string, Level>, trackId: TrackId) => void;
  resetAll: () => void;
  loadDemo: () => void;
  mutateModel: (mutate: (m: StudentModel) => StudentModel) => void;
}

const Ctx = createContext<StudentCtx | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<StudentModel>(() => loadModel());
  const modelRef = useRef(model);
  modelRef.current = model;

  useEffect(() => {
    saveModel(model);
  }, [model]);

  const value = useMemo<StudentCtx>(
    () => ({
      model,
      // ref 기반: 항상 최신 모델 위에서 기록하고, 결과를 동기적으로 돌려준다
      record: (input) => {
        const out = recordAnswer(modelRef.current, input);
        modelRef.current = out.model;
        setModel(out.model);
        return out.result;
      },
      finishDiagnosis: (placements, trackId) => {
        const next = applyDiagnosis(modelRef.current, placements, trackId);
        modelRef.current = next;
        setModel(next);
      },
      resetAll: () => {
        clearModel();
        const next = freshModel();
        modelRef.current = next;
        setModel(next);
      },
      loadDemo: () => {
        const next = buildDemoModel();
        modelRef.current = next;
        setModel(next);
      },
      mutateModel: (mutate) => {
        const next = mutate(modelRef.current);
        modelRef.current = next;
        setModel(next);
      },
    }),
    [model],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudent(): StudentCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudent must be used within StudentProvider');
  return ctx;
}
