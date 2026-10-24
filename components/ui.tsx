"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { initials } from "@/lib/format";
import type { RequestView, RunView } from "@/lib/types";

const AVATAR_TONES = ["bg-[#D8EF88] text-[#163C34]", "bg-[#CFE3DA] text-[#163C34]", "bg-[#EBE5C8] text-[#4A4220]", "bg-[#DDE6D0] text-[#1F3A2A]"];

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const tone = AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

type Tone = "green" | "lime" | "amber" | "grey" | "red" | "ink";
const TONES: Record<Tone, string> = {
  green: "bg-forest-50 text-forest border-[#CFE0D6]",
  lime: "bg-lime text-forest border-lime-700/40",
  amber: "bg-[#FBF1D6] text-[#6B4E0A] border-[#EFD99B]",
  grey: "bg-[#EEF0E8] text-ink-soft border-line",
  red: "bg-[#FBEAEA] text-[#8A2222] border-[#EBC5C5]",
  ink: "bg-forest text-white border-forest",
};

export function Badge({ tone = "grey", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function runBadge(run: RunView, now: number): { label: string; tone: Tone } {
  switch (run.status) {
    case "OPEN":
      return now >= run.deadlineAt ? { label: "Requests closed", tone: "amber" } : run.acceptedCount >= run.capacity ? { label: "Full", tone: "amber" } : { label: "Open", tone: "lime" };
    case "LOCKED":
      return { label: "Locked", tone: "green" };
    case "SHOPPING":
      return { label: "Shopping", tone: "green" };
    case "READY":
      return { label: "Ready for pickup", tone: "ink" };
    case "COMPLETED":
      return { label: "Completed", tone: "grey" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "red" };
  }
}

export function requestBadge(q: RequestView, run: RunView): { label: string; tone: Tone } {
  switch (q.status) {
    case "PENDING":
      return { label: "Pending", tone: "amber" };
    case "ACCEPTED":
      return run.status === "SHOPPING" ? { label: "Shopping", tone: "green" } : { label: "Accepted", tone: "green" };
    case "DECLINED":
      return { label: "Declined", tone: "red" };
    case "WITHDRAWN":
      return { label: "Withdrawn", tone: "grey" };
    case "READY":
      return { label: "Ready for pickup", tone: "ink" };
    case "COLLECTED":
      return { label: "Collected", tone: "lime" };
    case "UNFULFILLED":
      return { label: "Nothing available", tone: "grey" };
    case "CANCELLED":
      return { label: "Run cancelled", tone: "red" };
  }
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest">{icon}</div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Native <dialog>: gives focus trapping, Esc to close and inert background for free. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className="m-0 max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-[#0f1f1a]/50 md:m-auto md:w-auto"
    >
      {open && (
        <div className={`sheet-in fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[24px] bg-white shadow-2xl md:static md:max-h-[88vh] md:rounded-[24px] ${wide ? "md:w-[560px]" : "md:w-[440px]"}`}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="modal-title" className="text-lg font-bold">
              {title}
            </h2>
            <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-forest-50">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
