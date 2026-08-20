// Phase 3 STEP 19 — Golden Set 시행 화면 (PART 24-28/46/57).
// 규칙: 시행 중 adaptive feedback 없음 — 힌트 없음, 정오답 표시 없음, 문항 간 난이도 조정
// 없음. 완료 후에도 학습 추천에 쓰이지 않는다 (엔진이 구조적으로 격리). 일정은 하드코딩하지
// 않는다 — 학부모/개발자 영역에서 수동으로 Form을 선택해 시작한다 (PART 46).
import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { useEngine2 } from '../context/Engine2Context.tsx';
import { goldenForm, type GoldenForm } from '../engine2/goldenSet23.ts';

export default function Engine2Golden({ form, onDone }: { form: GoldenForm; onDone: () => void }) {
  const { submitHoldout } = useEngine2();
  const items = useMemo(() => goldenForm(form), [form]);
  const [idx, setIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const adminId = useRef(`admin-${form}-${Date.now().toString(36)}`);
  const startedAt = useRef(Date.now());
  const item = items[Math.min(idx, items.length - 1)];
  // 표시 순서 셔플 — 저작 순서(정답이 항상 첫 보기)가 그대로 노출되면 평가 타당도가 죽는다.
  // 제출은 원 인덱스로 역매핑 (item id 기반 결정적 셔플). 훅이므로 early return보다 앞에 둔다.
  const order = useMemo(() => {
    let h = 0;
    for (const ch of item.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const o = [0, 1, 2, 3];
    for (let i = o.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) >>> 0;
      const j = h % (i + 1);
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  }, [item.id]);

  if (finished) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <ClipboardCheck className="h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-bold text-slate-800">평가 완료! 수고했어요 🎉</h2>
        <p className="text-sm text-slate-500">
          {items.length}문항을 모두 풀었어요. 결과는 성장 기록에 저장되었고,
          <br />
          오늘의 학습 추천에는 영향을 주지 않아요.
        </p>
        <button type="button" onClick={onDone} className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-bold text-white">
          돌아가기
        </button>
      </div>
    );
  }

  const answer = (choiceIdx: number) => {
    const solveTimeSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    submitHoldout(item, { chosenIndex: choiceIdx, solveTimeSec }, adminId.current);
    startedAt.current = Date.now();
    if (idx + 1 >= items.length) setFinished(true);
    else setIdx(idx + 1);
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onDone} className="flex items-center gap-1 text-xs text-slate-400">
          <ArrowLeft className="h-4 w-4" /> 중단
        </button>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-600">
          실력 확인 {idx + 1} / {items.length}
        </span>
      </div>
      {/* 진행 중 정오답·힌트·설명 일절 없음 — 평가의 독립성 (PART 57) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="whitespace-pre-line text-base font-semibold leading-relaxed text-slate-800">{item.stem}</p>
        <div className="mt-5 flex flex-col gap-2">
          {order.map((orig) => (
            <button key={item.choices[orig]} type="button" onClick={() => answer(orig)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50">
              {item.choices[orig]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-400">이 평가에는 힌트가 없어요 — 지금 아는 만큼만 편하게 답하면 돼요.</p>
    </div>
  );
}
