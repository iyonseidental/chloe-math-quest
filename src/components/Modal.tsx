// 바텀시트형 모달 — 백드롭 클릭/ESC로 닫기, 슬라이드업 등장
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      {/* 백드롭 */}
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-[2px] animate-[fadeIn_.18s_ease-out]" />
      {/* 시트 */}
      <div className="relative z-10 w-full max-w-md animate-[sheetUp_.24s_cubic-bezier(.32,.72,.24,1)] rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* 그랩 핸들 (모바일 감성) */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 pb-1 pt-3">
          <div className="text-base font-bold text-slate-800">{title}</div>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[72svh] overflow-y-auto overscroll-contain px-5 pb-6 pt-1">{children}</div>
      </div>
    </div>
  );
}
