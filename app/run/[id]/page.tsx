"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Clock, Info as InfoIcon, LockKeyhole, MapPin, Minus, Plus, Settings2, Timer, Users, Wallet, Ban } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Avatar, Badge, Empty, Skeleton, requestBadge, runBadge } from "@/components/ui";
import { shopIcon } from "@/components/RunCard";
import { countdown, feeLabel, formatDayTime, formatPaise, rupeesToPaise } from "@/lib/format";

interface Row {
  key: number;
  name: string;
  qty: string;
  max: string;
}
let keySeq = 1;
const blank = (): Row => ({ key: keySeq++, name: "", qty: "1", max: "" });

const STEPS = ["Requests open", "Locked", "Shopping", "Ready for pickup", "Completed"];
const STEP_INDEX = { OPEN: 0, LOCKED: 1, SHOPPING: 2, READY: 3, COMPLETED: 4, CANCELLED: -1 } as const;

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, now, act } = useApp();
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!state)
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  const run = state.runs.find((r) => r.id === Number(id));
  if (!run)
    return (
      <Empty
        icon={<Ban />}
        title="Run not found"
        body="It may have been removed by a demo reset."
        action={
          <Link href="/" className="btn-primary">
            Back to Discover
          </Link>
        }
      />
    );

  const me = state.me.id;
  const isCollector = run.collectorId === me;
  const mine = run.requests.find((q) => q.userId === me && q.status !== "WITHDRAWN") ?? null;
  const expired = run.status === "OPEN" && now >= run.deadlineAt;
  const full = run.acceptedCount >= run.capacity;
  const b = runBadge(run, now);

  let blocker: string | null = null;
  if (isCollector) blocker = "This is your run. Collectors can’t request from themselves.";
  else if (mine) blocker = null;
  else if (run.status === "CANCELLED") blocker = "The collector cancelled this run.";
  else if (run.status !== "OPEN") blocker = "This run is locked. New requests aren’t accepted.";
  else if (expired) blocker = "Requests closed at " + formatDayTime(run.deadlineAt) + ". This run won’t reopen.";
  else if (full) blocker = "All spots are taken.";

  const parsed = rows.map((r) => {
    const qty = /^\d+$/.test(r.qty) ? parseInt(r.qty, 10) : NaN;
    const max = rupeesToPaise(r.max);
    return {
      key: r.key,
      name: r.name.trim(),
      qty,
      maxPaise: max,
      errs: {
        name: r.name.trim() ? "" : "Name the item",
        qty: qty >= 1 && qty <= 20 ? "" : "1–20",
        max: max != null && max >= 100 && max <= 500000 ? "" : "Enter ₹1–₹5,000",
      },
    };
  });
  const valid = parsed.every((p) => !p.errs.name && !p.errs.qty && !p.errs.max);
  const budget = parsed.reduce((s, p) => s + (p.maxPaise && !p.errs.max ? p.maxPaise : 0), 0);

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit() {
    setTried(true);
    if (!valid) return;
    setBusy(true);
    const r = await act(
      { type: "joinRun", runId: run!.id, items: parsed.map((p) => ({ name: p.name, qty: p.qty, maxPaise: p.maxPaise! })), note },
      "Request sent. Waiting for the collector.",
    );
    setBusy(false);
    if (r.ok) {
      setRows([blank()]);
      setNote("");
      setTried(false);
    }
  }

  const stepIdx = STEP_INDEX[run.status];
  const canJoin = !blocker && !mine;

  return (
    <div>
      <Link href="/" className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-forest">
        <ArrowLeft size={16} /> All runs
      </Link>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="rise relative overflow-hidden rounded-[28px] bg-forest p-5 text-white md:p-7">
            <svg aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 opacity-30" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="46" stroke="#D8EF88" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />
              <circle cx="50" cy="50" r="30" stroke="#D8EF88" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />
            </svg>
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-lime text-forest">{shopIcon(run.category, 28)}</span>
                <div>
                  <h1 className="text-[26px] font-extrabold leading-tight tracking-tight md:text-[32px]">{run.shopName}</h1>
                  <p className="mt-1.5 flex items-center gap-2 text-sm text-white/75">
                    <Avatar name={run.collectorName} size={22} />
                    {isCollector ? "Your run" : `Run by ${run.collectorName}`}
                  </p>
                </div>
              </div>
              <Badge tone={b.tone}>{b.label}</Badge>
            </div>

            <dl className="relative mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Tile icon={<MapPin size={15} />} label="Pickup point" value={run.pickupPoint} />
              <Tile icon={<Timer size={15} />} label="Requests close" value={expired || run.status !== "OPEN" ? formatDayTime(run.deadlineAt) : countdown(run.deadlineAt, now)} sub={expired || run.status !== "OPEN" ? undefined : formatDayTime(run.deadlineAt)} />
              <Tile icon={<Clock size={15} />} label="Estimated return" value={formatDayTime(run.returnAt)} />
              <Tile icon={<Wallet size={15} />} label="Pickup fee" value={feeLabel(run.feePaise)} />
              <div className="col-span-2 rounded-2xl bg-white/10 p-3.5">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                  <Users size={15} /> Spots
                </dt>
                <dd className="mt-1.5 flex items-center justify-between gap-4">
                  <span className="font-bold">
                    {run.acceptedCount} of {run.capacity} accepted
                  </span>
                  <span className="flex gap-1.5" aria-hidden>
                    {Array.from({ length: run.capacity }).map((_, i) => (
                      <span key={i} className={`h-2.5 w-7 rounded-full ${i < run.acceptedCount ? "bg-lime" : "bg-white/20"}`} />
                    ))}
                  </span>
                </dd>
              </div>
            </dl>
            {run.note && <p className="relative mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm italic text-white/85">“{run.note}”</p>}
          </section>

          <section className="card p-5 md:p-6" aria-label="Run progress">
            <h2 className="mb-5 text-lg font-extrabold">Timeline</h2>
            {run.status === "CANCELLED" ? (
              <p className="flex items-center gap-2 text-sm font-medium text-[#8A2222]">
                <Ban size={18} /> This run was cancelled by the collector.
              </p>
            ) : (
              <ol className="grid gap-3 sm:grid-cols-5 sm:gap-2">
                {STEPS.map((s, i) => {
                  const done = i < stepIdx || run.status === "COMPLETED";
                  const cur = i === stepIdx && run.status !== "COMPLETED";
                  return (
                    <li key={s} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2" aria-current={cur ? "step" : undefined}>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-forest text-lime" : cur ? "bg-lime text-forest ring-4 ring-lime/40" : "bg-[#EEF0E8] text-ink-soft"}`}>
                        {done ? <Check size={15} strokeWidth={3} /> : i + 1}
                      </span>
                      <span className={`text-sm ${cur ? "font-bold" : done ? "font-semibold" : "text-ink-soft"}`}>{s}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {canJoin && (
            <section className="card p-5 md:p-6" aria-label="Request items">
              <h2 className="text-lg font-extrabold">What do you need?</h2>
              <p className="mt-1 flex gap-2 text-sm text-ink-soft">
                <InfoIcon size={16} className="mt-0.5 shrink-0" /> If an item is unavailable it’s skipped. No substitutions, and you’re not charged for it.
              </p>
              <div className="mt-5 space-y-4">
                {rows.map((r, i) => {
                  const p = parsed[i];
                  return (
                    <div key={r.key} className="rounded-ctl border border-line bg-ivory/60 p-3.5">
                      <div className="grid grid-cols-[1fr_72px] gap-3">
                        <div>
                          <label className="label" htmlFor={`n${r.key}`}>
                            Item {i + 1}
                          </label>
                          <input id={`n${r.key}`} className="field" maxLength={60} placeholder="e.g. A5 notebook" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} aria-invalid={tried && !!p.errs.name} />
                          {tried && p.errs.name && <p className="errtext">{p.errs.name}</p>}
                        </div>
                        <div>
                          <label className="label" htmlFor={`q${r.key}`}>
                            Qty
                          </label>
                          <input id={`q${r.key}`} inputMode="numeric" className="field px-2 text-center" value={r.qty} onChange={(e) => update(r.key, { qty: e.target.value })} aria-invalid={tried && !!p.errs.qty} />
                          {tried && p.errs.qty && <p className="errtext">{p.errs.qty}</p>}
                        </div>
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <div className="flex-1">
                          <label className="label" htmlFor={`m${r.key}`}>
                            Max total for this item (₹)
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft">₹</span>
                            <input id={`m${r.key}`} inputMode="decimal" className="field pl-8" placeholder="60" value={r.max} onChange={(e) => update(r.key, { max: e.target.value })} aria-invalid={tried && !!p.errs.max} />
                          </div>
                          {tried && p.errs.max ? <p className="errtext">{p.errs.max}</p> : <p className="hint">Total for all {p.qty > 0 ? p.qty : ""} units, not per piece.</p>}
                        </div>
                        {rows.length > 1 && (
                          <button onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label={`Remove item ${i + 1}`} className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-ctl border border-line bg-white text-ink-soft hover:bg-[#FBEFEF] hover:text-[#8A2222]">
                            <Minus size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {rows.length < 8 && (
                <button onClick={() => setRows((rs) => [...rs, blank()])} className="btn-ghost mt-3 w-full">
                  <Plus size={16} /> Add another item
                </button>
              )}
              <div className="mt-5">
                <label className="label" htmlFor="req-note">
                  Note <span className="font-normal text-ink-soft">(optional)</span>
                </label>
                <input id="req-note" className="field" maxLength={140} placeholder="e.g. Blue ink, please" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </section>
          )}
        </div>

        {/* sticky summary */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          {isCollector ? (
            <div className="card rise p-5">
              <h2 className="text-lg font-extrabold">Collector workspace</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {run.pendingCount > 0 ? `${run.pendingCount} request${run.pendingCount > 1 ? "s" : ""} waiting for your decision.` : "Review requests, shop, and hand over."}
              </p>
              <Link href={`/run/${run.id}/manage`} className="btn-primary mt-4 w-full">
                <Settings2 size={18} /> Open workspace
              </Link>
            </div>
          ) : mine ? (
            <MyRequest runId={run.id} />
          ) : canJoin ? (
            <div className="card rise overflow-hidden border-t-[5px] border-t-lime-700 p-5">
              <h2 className="text-lg font-extrabold">Your request</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Maximum item budget</dt>
                  <dd className="font-semibold tabular-nums">{formatPaise(budget)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Pickup fee (fixed)</dt>
                  <dd className="font-semibold tabular-nums">{run.feePaise === 0 ? "Free" : formatPaise(run.feePaise)}</dd>
                </div>
                <div className="flex justify-between rounded-ctl bg-lime/50 px-3.5 py-3 text-base">
                  <dt className="font-bold">Most you’ll pay</dt>
                  <dd className="font-extrabold tabular-nums">{formatPaise(budget + run.feePaise)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-soft">Maximum item budget + fixed pickup fee. You pay actual prices, never more. Payment is made manually to the collector after pickup is ready.</p>
              <button onClick={submit} disabled={busy} className="btn-primary mt-4 w-full">
                {busy ? "Sending…" : "Send request"}
              </button>
              <p className="mt-2 text-center text-xs text-ink-soft">Pending until {run.collectorName} accepts.</p>
            </div>
          ) : (
            <div className="card rise p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-ink-soft">
                  <LockKeyhole size={20} />
                </span>
                <div>
                  <h2 className="text-base font-bold">Can’t join this run</h2>
                  <p className="mt-1 text-sm text-ink-soft">{blocker}</p>
                </div>
              </div>
              <Link href="/" className="btn-ghost mt-4 w-full">
                Find another run
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  function MyRequest({ runId }: { runId: number }) {
    const q = mine!;
    const rb = requestBadge(q, run!);
    return (
      <div className="card rise p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Your request</h2>
          <Badge tone={rb.tone}>{rb.label}</Badge>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {q.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                {i.qty}× {i.name}
              </span>
              <span className="text-ink-soft">max {formatPaise(i.maxPaise)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-sm">
          Most you’ll pay: <b>{formatPaise(q.maxTotalPaise)}</b> <span className="text-ink-soft">(items + {run!.feePaise === 0 ? "free pickup" : formatPaise(run!.feePaise) + " fee"})</span>
        </p>
        {q.status === "PENDING" && (
          <>
            <p className="mt-3 text-sm text-ink-soft">Waiting for {run!.collectorName} to accept.</p>
            <button
              className="btn-ghost mt-3 w-full"
              onClick={() => act({ type: "withdraw", requestId: q.id }, "Request withdrawn")}
              disabled={run!.status !== "OPEN"}
            >
              Withdraw request
            </button>
          </>
        )}
        <Link href="/activity" className="btn-primary mt-3 w-full">
          Track in My Activity
        </Link>
        <span className="sr-only">{runId}</span>
      </div>
    );
  }
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3.5">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-white/60">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 font-bold leading-snug">{value}</dd>
      {sub && <dd className="text-xs text-white/60">{sub}</dd>}
    </div>
  );
}
