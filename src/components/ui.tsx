// 작은 공용 UI 조각들
import type { ReactNode } from 'react';

export function ProgressBar({ value, className = '', color = 'bg-gradient-to-r from-sky-400 to-indigo-500' }: { value: number; className?: string; color?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200/70 ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function LevelPips({ mastered, current, color }: { mastered: number[]; current: number; color: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((lv) => (
        <div
          key={lv}
          className={`h-1.5 flex-1 rounded-full ${current === lv ? 'ring-2 ring-offset-1' : ''}`}
          style={{
            background: mastered.includes(lv) ? color : current === lv ? `${color}66` : '#e2e8f0',
            ['--tw-ring-color' as string]: `${color}55`,
          }}
        />
      ))}
    </div>
  );
}

export function Stars({ level }: { level: number }) {
  return (
    <span className="text-amber-400" aria-label={`난이도 ${level}/5`}>
      {'★'.repeat(level)}
      <span className="text-slate-300">{'★'.repeat(5 - level)}</span>
    </span>
  );
}

export function StatTile({ label, value, sub, accent = false }: { label: string; value: ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50' : 'border-slate-200 bg-white'}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function WhyChip({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-[11px] leading-relaxed text-indigo-600">
      <span className="mt-px shrink-0 font-semibold">WHY THIS?</span>
      <span>{reason}</span>
    </div>
  );
}
