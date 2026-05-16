import { RotateCcw, Save, Trash2 } from "lucide-react";

type DirtyBarProps = {
  dirty: boolean;
  onReset: () => void;
  onDelete: () => void;
  onSave: () => void;
  pending: boolean;
};

export function DirtyBar({ dirty, onReset, onDelete, onSave, pending }: DirtyBarProps) {
  if (!dirty) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-[var(--line-soft)] bg-[#10141c]/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <strong>저장하지 않은 변경사항이 있습니다.</strong>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-[var(--line)] px-3 py-2" onClick={onReset} type="button">
            <RotateCcw className="mr-2 inline" size={16} />
            되돌리기
          </button>
          <button className="rounded-md border border-[var(--danger)] px-3 py-2 text-[var(--danger)]" onClick={onDelete} type="button">
            <Trash2 className="mr-2 inline" size={16} />
            삭제
          </button>
          <button
            className="rounded-md bg-[var(--accent)] px-4 py-2 font-semibold text-[#07110b] disabled:opacity-60"
            disabled={pending}
            onClick={onSave}
            type="button"
          >
            <Save className="mr-2 inline" size={16} />
            {pending ? "저장 중" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
