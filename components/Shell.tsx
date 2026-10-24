"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Compass, ListChecks, Plus, RotateCcw, Check, FlaskConical } from "lucide-react";
import { useApp } from "./AppProvider";
import { Avatar, Modal } from "./ui";
import CreateRunDialog from "./CreateRunDialog";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="10" fill="#163C34" />
      <path d="M9 21c0-5 3-8 8-8h6" stroke="#D8EF88" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M19.5 9.5 23 13l-3.5 3.5" stroke="#D8EF88" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="9" cy="22" r="2.4" fill="#D8EF88" />
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/activity", label: "My Activity", icon: ListChecks },
];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { state, userId, setUserId, setCreateOpen, act } = useApp();
  const [idOpen, setIdOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/run") : path.startsWith(href));
  const me = state?.me;

  return (
    <div className="min-h-dvh md:pl-[84px]">
      {/* desktop rail */}
      <nav aria-label="Main" className="fixed inset-y-0 left-0 z-30 hidden w-[84px] flex-col items-center gap-2 border-r border-line bg-white py-5 md:flex">
        <Link href="/" aria-label="Relay home" className="mb-4">
          <Logo size={40} />
        </Link>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`flex w-[68px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-semibold transition ${
              isActive(href) ? "bg-forest text-white" : "text-ink-soft hover:bg-forest-50"
            }`}
          >
            <Icon size={21} />
            {label.replace("My ", "")}
          </Link>
        ))}
        <button onClick={() => setCreateOpen(true)} aria-label="Create a run" className="mt-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime text-forest transition hover:bg-lime-700 active:scale-95">
          <Plus size={24} strokeWidth={2.6} />
        </button>
      </nav>

      <header className="sticky top-0 z-20 border-b border-line bg-ivory/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[76px] max-w-[1120px] items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="md:hidden">
              <Logo size={38} />
            </span>
            <span className="text-[34px] font-black leading-none tracking-[-0.04em] text-forest md:text-[42px]">Relay</span>
            <span className="hidden h-7 w-px bg-line sm:block" />
            <span className="hidden text-sm font-medium text-ink-soft sm:block">Demo Campus</span>
          </Link>
          <button
            onClick={() => setIdOpen(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white py-1 pl-1.5 pr-3.5 text-sm font-semibold transition hover:bg-forest-50"
            aria-label={`Demo identity: ${me?.name ?? "loading"}. Switch identity`}
          >
            {me ? <Avatar name={me.name} size={30} /> : <span className="skeleton h-[30px] w-[30px] !rounded-full" />}
            <span>{me?.name ?? "…"}</span>
            <span className="hidden items-center gap-1 rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-forest sm:inline-flex">
              <FlaskConical size={11} /> Demo
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 pb-32 pt-6 md:px-8 md:pb-16 md:pt-8">{children}</main>

      {/* mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <Link href="/" aria-current={isActive("/") ? "page" : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive("/") ? "text-forest" : "text-ink-soft"}`}>
          <Compass size={22} />
          Discover
        </Link>
        <button onClick={() => setCreateOpen(true)} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-forest" aria-label="Create a run">
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-lime shadow-card ring-4 ring-white">
            <Plus size={24} strokeWidth={2.6} />
          </span>
          Create
        </button>
        <Link href="/activity" aria-current={isActive("/activity") ? "page" : undefined} className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive("/activity") ? "text-forest" : "text-ink-soft"}`}>
          <ListChecks size={22} />
          Activity
        </Link>
      </nav>

      <CreateRunDialog
        onCreated={(id) => {
          setCreateOpen(false);
          router.push(`/run/${id}`);
        }}
      />

      <Modal open={idOpen} onClose={() => setIdOpen(false)} title="Demo identity">
        <p className="rounded-ctl bg-lime/50 px-3.5 py-3 text-sm font-medium text-forest">Demo mode: switch identities to experience both sides.</p>
        <p className="hint">Identity is stored per browser tab session. It isn’t real authentication.</p>
        <ul className="mt-4 space-y-2">
          {(state?.users ?? []).map((u) => (
            <li key={u.id}>
              <button
                onClick={() => {
                  setUserId(u.id);
                  setIdOpen(false);
                }}
                aria-pressed={u.id === userId}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-ctl border px-3 text-left transition ${u.id === userId ? "border-forest bg-forest-50" : "border-line hover:bg-forest-50"}`}
              >
                <Avatar name={u.name} />
                <span className="flex-1">
                  <span className="block text-sm font-bold">{u.name}</span>
                  <span className="block text-xs capitalize text-ink-soft">{u.role}</span>
                </span>
                {u.id === userId && <Check size={18} className="text-forest" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 border-t border-line pt-4">
          <button onClick={() => setConfirmReset(true)} className="btn-ghost w-full">
            <RotateCcw size={16} /> Reset demo data
          </button>
        </div>
      </Modal>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo?">
        <p className="text-sm text-ink-soft">This deletes every run and request, including ones you created, and restores the starting demo data for everyone on this server.</p>
        <div className="mt-5 flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => setConfirmReset(false)}>
            Keep data
          </button>
          <button
            className="btn-danger flex-1"
            onClick={async () => {
              const r = await act({ type: "reset" }, "Demo data reset");
              if (r.ok) {
                setConfirmReset(false);
                setIdOpen(false);
                router.push("/");
              }
            }}
          >
            Reset demo
          </button>
        </div>
      </Modal>
    </div>
  );
}
