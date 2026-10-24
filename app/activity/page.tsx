"use client";
import Link from "next/link";
import { useState } from "react";
import { Ban, Check, ClipboardList, Eye, EyeOff, Info, MapPin, Clock, Plus, Route, ArrowRight } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Badge, Empty, PageHead, Skeleton, requestBadge, runBadge } from "@/components/ui";
import { shopIcon } from "@/components/RunCard";
import { feeLabel, formatDayTime, formatPaise } from "@/lib/format";
import type { RequestView, RunView } from "@/lib/types";

const STEPS = ["Requested", "Accepted", "Shopping", "Ready", "Collected"];
function stepOf(q: RequestView, run: RunView): number {
  if (q.status === "PENDING") return 0;
  if (q.status === "ACCEPTED") return run.status === "SHOPPING" ? 2 : 1;
  if (q.status === "READY") return 3;
  if (q.status === "COLLECTED") return 4;
  return -1;
}

export default function Activity() {
  const { state, now, setCreateOpen } = useApp();
  const [tab, setTab] = useState<"requests" | "runs">("requests");
  if (!state)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );

  const me = state.me.id;
  const myRequests = state.runs
    .flatMap((r) => r.requests.filter((q) => q.userId === me).map((q) => ({ q, run: r })))
    .sort((a, b) => b.q.createdAt - a.q.createdAt);
  const myRuns = state.runs.filter((r) => r.collectorId === me);
  const active = myRuns.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED");
  const done = myRuns.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED");

  const mineCollected = myRuns.flatMap((r) => r.requests).filter((q) => q.status === "COLLECTED");
  const completedRuns = myRuns.filter((r) => r.status === "COMPLETED").length;
  const earnings = mineCollected.filter((q) => q.paymentStatus === "RECEIVED").reduce((s, q) => s + q.billFeePaise, 0);

  return (
    <div>
      <PageHead title="My Activity" sub={`Showing ${state.me.name}’s requests and runs`} />

      <section aria-label="Collector summary" className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Completed runs" value={String(completedRuns)} />
        <Stat label="Collected requests" value={String(mineCollected.length)} />
        <Stat label="Pickup-fee earnings" value={formatPaise(earnings)} sub="paid + collected" accent />
      </section>

      <div role="tablist" aria-label="Activity" className="mb-5 grid grid-cols-2 gap-1.5 rounded-[18px] border border-line bg-white p-1.5 md:max-w-md">
        {(["requests", "runs"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-[44px] rounded-[13px] text-sm font-semibold transition ${tab === t ? "bg-forest text-white" : "text-ink-soft hover:bg-forest-50"}`}>
            {t === "requests" ? `My requests (${myRequests.length})` : `My runs (${myRuns.length})`}
          </button>
        ))}
      </div>

      {tab === "requests" ? (
        myRequests.length === 0 ? (
          <Empty
            icon={<ClipboardList />}
            title="No requests yet"
            body="Find a run that’s already heading to the shop and add what you need."
            action={
              <Link href="/" className="btn-primary">
                Discover runs
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {myRequests.map(({ q, run }) => (
              <RequestActivity key={q.id} q={q} run={run} />
            ))}
          </div>
        )
      ) : myRuns.length === 0 ? (
        <Empty
          icon={<Route />}
          title="You haven’t posted a run"
          body="Going to the café or stationery shop anyway? Offer to bring things back."
          action={
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={18} /> Create a run
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && <RunGroup title="Active" runs={active} now={now} />}
          {done.length > 0 && <RunGroup title="Completed & cancelled" runs={done} now={now} />}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-card border p-4 ${accent ? "border-lime-700/40 bg-lime/50" : "border-line bg-white"} shadow-card`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft sm:text-xs">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-soft">{sub}</p>}
    </div>
  );
}

function RunGroup({ title, runs, now }: { title: string; runs: RunView[]; now: number }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-ink-soft">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {runs.map((r) => {
          const b = runBadge(r, now);
          const parts = r.requests.filter((q) => ["ACCEPTED", "READY", "COLLECTED", "UNFULFILLED"].includes(q.status)).length;
          return (
            <article key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-lime">{shopIcon(r.category)}</span>
                  <div>
                    <h3 className="font-bold">{r.shopName}</h3>
                    <p className="text-xs text-ink-soft">{r.pickupPoint} · {feeLabel(r.feePaise)}</p>
                  </div>
                </div>
                <Badge tone={b.tone}>{b.label}</Badge>
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                {parts} participant{parts === 1 ? "" : "s"}
                {r.pendingCount > 0 && <> · <b className="text-[#6B4E0A]">{r.pendingCount} pending</b></>} · back by {formatDayTime(r.returnAt)}
              </p>
              <div className="mt-4 flex gap-3">
                <Link href={`/run/${r.id}/manage`} className="btn-primary flex-1">
                  {r.status === "COMPLETED" || r.status === "CANCELLED" ? "View workspace" : "Open workspace"} <ArrowRight size={16} />
                </Link>
                <Link href={`/run/${r.id}`} className="btn-ghost">
                  Details
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function RequestActivity({ q, run }: { q: RequestView; run: RunView }) {
  const [show, setShow] = useState(false);
  const rb = requestBadge(q, run);
  const step = stepOf(q, run);
  const final = ["READY", "COLLECTED", "UNFULFILLED"].includes(q.status);
  const paid = q.paymentStatus === "RECEIVED";
  const allSkipped = q.items.every((i) => i.skipped);

  return (
    <article className="card rise p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-lime">{shopIcon(run.category)}</span>
          <div>
            <h3 className="font-bold leading-tight">{run.shopName}</h3>
            <p className="text-xs text-ink-soft">Collector: {run.collectorName}</p>
          </div>
        </div>
        <Badge tone={rb.tone}>{rb.label}</Badge>
      </div>

      {step >= 0 ? (
        <ol className="mt-4 grid grid-cols-5 gap-1" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className="text-center">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-forest" : "bg-[#E3E7DC]"}`} />
              <span className={`mt-1.5 block text-[10px] sm:text-[11px] ${i === step ? "font-bold text-ink" : "text-ink-soft"}`}>{s}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 flex items-center gap-2 rounded-ctl bg-[#F3F4EE] px-3.5 py-2.5 text-sm text-ink-soft">
          <Ban size={16} />
          {q.status === "DECLINED" && "The collector didn’t accept this request."}
          {q.status === "CANCELLED" && "The collector cancelled this run."}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line rounded-ctl border border-line text-sm">
        {q.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className={i.skipped ? "text-ink-soft line-through" : "font-medium"}>
              {i.qty}× {i.name}
            </span>
            <span className="tabular-nums text-ink-soft">
              {i.skipped ? "Skipped" : i.actualPaise != null ? formatPaise(i.actualPaise) : `max ${formatPaise(i.maxPaise)}`}
            </span>
          </li>
        ))}
      </ul>

      {final ? (
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Items</dt>
            <dd className="tabular-nums">{formatPaise(q.billItemsPaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Pickup fee</dt>
            <dd className="tabular-nums">{allSkipped ? "₹0" : run.feePaise === 0 ? "Free" : formatPaise(run.feePaise)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <dt className="font-bold">Final bill</dt>
            <dd className="font-extrabold tabular-nums">{formatPaise(q.billTotalPaise)}</dd>
          </div>
        </dl>
      ) : (
        step >= 0 && (
          <p className="mt-4 text-sm text-ink-soft">
            Most you’ll pay: <b className="text-ink">{formatPaise(q.maxTotalPaise)}</b> (budget + fixed {run.feePaise === 0 ? "free pickup" : formatPaise(run.feePaise) + " fee"}). Your actual bill appears when shopping is done.
          </p>
        )
      )}

      {step >= 0 && (
        <div className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <MapPin size={15} /> {run.pickupPoint}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={15} /> Back by {formatDayTime(run.returnAt)}
          </span>
        </div>
      )}

      {q.status === "UNFULFILLED" && <p className="mt-4 rounded-ctl bg-[#F3F4EE] px-4 py-3 text-sm text-ink-soft">Nothing on your list was available, so there’s no charge and nothing to collect.</p>}

      {(q.status === "READY" || q.status === "COLLECTED") && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Payment</p>
              <p className="text-xs text-ink-soft">{paid ? "The collector confirmed your payment." : `Pay ${run.collectorName} directly (cash or UPI). Relay doesn’t process payments.`}</p>
            </div>
            <Badge tone={paid ? "lime" : "amber"}>{paid ? <><Check size={12} /> Received</> : "Not yet received"}</Badge>
          </div>
          {q.pickupCode && (
            <div className="rounded-ctl bg-forest p-4 text-white">
              <p className="text-xs font-semibold text-lime">{q.status === "COLLECTED" ? "Collected" : `Show this code to ${run.collectorName}`}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span aria-live="polite" className="font-mono text-4xl font-extrabold tracking-[0.25em]">
                  {show || q.status === "COLLECTED" ? q.pickupCode : "••••"}
                </span>
                {q.status === "READY" && (
                  <button onClick={() => setShow((s) => !s)} className="btn-lime !min-h-[40px] !px-3.5">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />} {show ? "Hide" : "Reveal code"}
                  </button>
                )}
              </div>
            </div>
          )}
          {q.status === "READY" && (
            <p className="flex gap-2 text-xs text-ink-soft">
              <Info size={14} className="mt-0.5 shrink-0" /> Payment and pickup are separate: giving the code collects your items, and paying is confirmed on its own.
            </p>
          )}
        </div>
      )}

      <Link href={`/run/${run.id}`} className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-forest">
        View run <ArrowRight size={15} />
      </Link>
    </article>
  );
}
