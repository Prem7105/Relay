"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Ban, Check, CircleCheck, Inbox, KeyRound, Lock, PackageCheck, ShoppingBasket, X } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Avatar, Badge, Empty, Modal, Skeleton, requestBadge, runBadge } from "@/components/ui";
import { feeLabel, formatDayTime, formatPaise, rupeesToPaise } from "@/lib/format";
import type { ItemView, RequestView, RunView } from "@/lib/types";

type Tab = "requests" | "shopping" | "handover";

function defaultTab(r: RunView): Tab {
  if (r.status === "OPEN" || r.status === "CANCELLED") return "requests";
  if (r.status === "LOCKED" || r.status === "SHOPPING") return "shopping";
  return "handover";
}

export default function Manage() {
  const { id } = useParams<{ id: string }>();
  const { state, now, act } = useApp();
  const [tab, setTab] = useState<Tab | null>(null);
  const [confirm, setConfirm] = useState<null | "lock" | "cancel">(null);
  const seen = useRef<string>("");

  const run = state?.runs.find((r) => r.id === Number(id));
  // jump to the natural tab when the run's phase changes
  useEffect(() => {
    if (!run) return;
    const key = `${run.id}:${run.status}`;
    if (seen.current !== key) {
      seen.current = key;
      setTab(defaultTab(run));
    }
  }, [run]);

  if (!state) return <Skeleton className="h-96" />;
  if (!run)
    return <Empty icon={<Ban />} title="Run not found" body="It may have been removed by a demo reset." action={<Link href="/" className="btn-primary">Back to Discover</Link>} />;
  if (run.collectorId !== state.me.id)
    return (
      <Empty
        icon={<Lock />}
        title="Collector workspace"
        body={`Only ${run.collectorName} can manage this run. Switch identity to see it as the collector.`}
        action={
          <Link href={`/run/${run.id}`} className="btn-primary">
            View run
          </Link>
        }
      />
    );

  const t = tab ?? defaultTab(run);
  const b = runBadge(run, now);
  const accepted = run.requests.filter((q) => ["ACCEPTED", "READY", "COLLECTED", "UNFULFILLED"].includes(q.status));
  const toPrice = run.requests.filter((q) => q.status === "ACCEPTED");
  const allPriced = toPrice.length > 0 && toPrice.every((q) => q.pricingDone);
  const allItems = accepted.flatMap((q) => q.items);
  const totalItems = allItems.length;
  const doneItems = allItems.filter((i) => i.skipped || i.actualPaise != null).length;
  const costsRecorded = run.status !== "OPEN" && run.status !== "LOCKED";
  const canCancel = (run.status === "OPEN" || run.status === "LOCKED") && !costsRecorded;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "requests", label: "Requests", icon: <Inbox size={16} />, badge: run.pendingCount || undefined },
    { id: "shopping", label: "Shopping", icon: <ShoppingBasket size={16} /> },
    { id: "handover", label: "Handover", icon: <PackageCheck size={16} /> },
  ];

  return (
    <div>
      <Link href={`/run/${run.id}`} className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-forest">
        <ArrowLeft size={16} /> Run details
      </Link>
      <section className="relative mb-6 overflow-hidden rounded-[28px] bg-forest p-5 text-white md:p-7">
        <svg aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 opacity-30" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="#D8EF88" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />
          <circle cx="50" cy="50" r="30" stroke="#D8EF88" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />
        </svg>
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-lime">Collector workspace</p>
            <h1 className="mt-1.5 text-[28px] font-extrabold leading-tight tracking-tight md:text-[34px]">{run.shopName} run</h1>
            <p className="mt-1.5 text-sm text-white/75">
              {run.pickupPoint} · back by {formatDayTime(run.returnAt)} · {feeLabel(run.feePaise)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={b.tone}>{b.label}</Badge>
            {canCancel && (
              <button className="btn-danger !min-h-[36px] !px-3.5" onClick={() => setConfirm("cancel")}>
                Cancel run
              </button>
            )}
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 p-3.5">
            <p className="text-xs font-medium text-white/60">Accepted</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">
              {run.acceptedCount}
              <span className="text-base font-semibold text-white/60"> / {run.capacity}</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${(run.acceptedCount / run.capacity) * 100}%` }} />
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5">
            <p className="text-xs font-medium text-white/60">Pending</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{run.pendingCount}</p>
            <p className="mt-2 text-xs text-white/60">{run.pendingCount ? "need a decision" : "all handled"}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5">
            <p className="text-xs font-medium text-white/60">Items priced</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">
              {doneItems}
              <span className="text-base font-semibold text-white/60"> / {totalItems}</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${totalItems ? (doneItems / totalItems) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div role="tablist" aria-label="Workspace sections" className="mb-5 grid grid-cols-3 gap-1.5 rounded-[18px] border border-line bg-white p-1.5 shadow-card">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={t === x.id}
            onClick={() => setTab(x.id)}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-[13px] text-sm font-semibold transition ${t === x.id ? "bg-forest text-white" : "text-ink-soft hover:bg-forest-50"}`}
          >
            {x.icon}
            {x.label}
            {x.badge ? <span className="rounded-full bg-lime px-1.5 text-[11px] font-bold text-forest">{x.badge}</span> : null}
          </button>
        ))}
      </div>

      {run.status === "CANCELLED" && (
        <div className="card mb-5 flex items-center gap-3 border-[#EBC5C5] bg-[#FBF1F1] p-4 text-sm font-medium text-[#8A2222]">
          <Ban size={18} /> This run was cancelled. Participants have been notified in the app.
        </div>
      )}

      {t === "requests" && (
        <section aria-label="Requests" className="space-y-4">
          {run.requests.length === 0 ? (
            <Empty icon={<Inbox />} title="No requests yet" body="Share the run with friends. Requests appear here the moment they’re sent." />
          ) : (
            run.requests.filter((q) => q.status !== "WITHDRAWN").map((q) => <RequestCard key={q.id} q={q} run={run} />)
          )}
          {run.status === "OPEN" && (
            <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-soft">
                Locking ends requests and declines every pending one. You need at least one accepted participant.
              </p>
              <button className="btn-primary sm:shrink-0" disabled={run.acceptedCount < 1} onClick={() => setConfirm("lock")}>
                <Lock size={16} /> Lock run
              </button>
            </div>
          )}
        </section>
      )}

      {t === "shopping" && (
        <section aria-label="Shopping" className="space-y-4">
          {run.status === "OPEN" ? (
            <Empty icon={<ShoppingBasket />} title="Lock the run first" body="Once you lock the run, you can enter what each item actually cost." />
          ) : accepted.length === 0 ? (
            <Empty icon={<ShoppingBasket />} title="Nothing to buy" body="This run has no accepted participants." />
          ) : (
            <>
              <p className="rounded-ctl bg-forest-50 px-4 py-3 text-sm text-forest">
                Enter the actual total for each item row. A price can’t exceed the participant’s budget. If it would, skip the item. Skipped items are never billed.
              </p>
              {accepted.map((q) => (
                <ShoppingCard key={q.id} q={q} run={run} editable={run.status === "LOCKED" || run.status === "SHOPPING"} />
              ))}
              {(run.status === "LOCKED" || run.status === "SHOPPING") && (
                <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-ink-soft">{allPriced ? "Everything is priced or skipped." : "Price or skip every item to continue."}</p>
                  <button className="btn-primary sm:shrink-0" disabled={!allPriced || run.status !== "SHOPPING"} onClick={() => act({ type: "markReady", runId: run.id }, "Marked ready for pickup")}>
                    <PackageCheck size={16} /> Mark ready for pickup
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {t === "handover" && (
        <section aria-label="Handover" className="space-y-4">
          {run.status !== "READY" && run.status !== "COMPLETED" ? (
            <Empty icon={<PackageCheck />} title="Not ready yet" body="Handover opens after you mark the run ready for pickup." />
          ) : (
            <>
              {run.status === "COMPLETED" && (
                <div className="card flex items-center gap-3 border-lime-700/40 bg-lime/40 p-4 text-sm font-semibold text-forest">
                  <CircleCheck size={18} /> Run complete. Every fulfilled request has been collected.
                </div>
              )}
              <p className="rounded-ctl bg-forest-50 px-4 py-3 text-sm text-forest">
                Payment is manual (cash or UPI between you and the participant) and recorded separately from handover. Handover requires the participant’s pickup code.
              </p>
              {accepted.map((q) => (
                <HandoverCard key={q.id} q={q} run={run} />
              ))}
            </>
          )}
        </section>
      )}

      <Modal open={confirm === "lock"} onClose={() => setConfirm(null)} title="Lock this run?">
        <p className="text-sm text-ink-soft">
          {run.acceptedCount} accepted. {run.pendingCount > 0 ? `${run.pendingCount} pending request${run.pendingCount > 1 ? "s" : ""} will be declined.` : "No pending requests."} You can’t accept anyone else after locking.
        </p>
        <div className="mt-5 flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => setConfirm(null)}>
            Not yet
          </button>
          <button
            className="btn-primary flex-1"
            onClick={async () => {
              const r = await act({ type: "lockRun", runId: run.id }, "Run locked. Time to shop.");
              if (r.ok) setConfirm(null);
            }}
          >
            Lock run
          </button>
        </div>
      </Modal>
      <Modal open={confirm === "cancel"} onClose={() => setConfirm(null)} title="Cancel this run?">
        <p className="text-sm text-ink-soft">Participants will see the run as cancelled in the app. This can’t be undone.</p>
        <div className="mt-5 flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => setConfirm(null)}>
            Keep run
          </button>
          <button
            className="btn-danger flex-1"
            onClick={async () => {
              const r = await act({ type: "cancelRun", runId: run.id }, "Run cancelled");
              if (r.ok) setConfirm(null);
            }}
          >
            Cancel run
          </button>
        </div>
      </Modal>
    </div>
  );
}

function accent(q: RequestView): string {
  switch (q.status) {
    case "PENDING":
      return "#E7C262";
    case "ACCEPTED":
    case "READY":
      return "#163C34";
    case "COLLECTED":
      return "#B9D463";
    case "DECLINED":
    case "CANCELLED":
      return "#E3B3B3";
    default:
      return "#E3E7DC";
  }
}

function Who({ q, run }: { q: RequestView; run: RunView }) {
  const rb = requestBadge(q, run);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={q.userName} size={44} />
        <div>
          <p className="text-[17px] font-extrabold leading-tight">{q.userName}</p>
          <p className="text-xs text-ink-soft">Requested {formatDayTime(q.createdAt)}</p>
        </div>
      </div>
      <Badge tone={rb.tone}>{rb.label}</Badge>
    </div>
  );
}

function RequestCard({ q, run }: { q: RequestView; run: RunView }) {
  const { act } = useApp();
  const full = run.acceptedCount >= run.capacity;
  return (
    <article className="card rise border-l-[5px] p-5" style={{ borderLeftColor: accent(q) }}>
      <Who q={q} run={run} />
      <ul className="mt-4 divide-y divide-line rounded-ctl border border-line text-sm">
        {q.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="font-medium">
              {i.qty}× {i.name}
            </span>
            <span className="tabular-nums text-ink-soft">max {formatPaise(i.maxPaise)}</span>
          </li>
        ))}
      </ul>
      {q.note && <p className="mt-3 text-sm text-ink-soft">Note: “{q.note}”</p>}
      <p className="mt-3 text-sm text-ink-soft">
        Max payable <b className="text-ink">{formatPaise(q.maxTotalPaise)}</b> incl. {run.feePaise === 0 ? "free pickup" : formatPaise(run.feePaise) + " fee"}
      </p>
      {q.status === "PENDING" && run.status === "OPEN" && (
        <div className="mt-4">
          <div className="flex gap-3">
            <button className="btn-primary flex-1" disabled={full} onClick={() => act({ type: "decide", requestId: q.id, accept: true }, `${q.userName} accepted`)}>
              <Check size={16} /> Accept
            </button>
            <button className="btn-ghost flex-1" onClick={() => act({ type: "decide", requestId: q.id, accept: false }, `${q.userName} declined`)}>
              <X size={16} /> Decline
            </button>
          </div>
          {full && <p className="hint">Capacity reached. Decline this request or lock the run.</p>}
        </div>
      )}
    </article>
  );
}

function ShoppingCard({ q, run, editable }: { q: RequestView; run: RunView; editable: boolean }) {
  return (
    <article className="card rise border-l-[5px] p-5" style={{ borderLeftColor: accent(q) }}>
      <Who q={q} run={run} />
      <div className="mt-4 space-y-3">
        {q.items.map((i) => (
          <ItemRow key={`${i.id}:${i.actualPaise}:${i.skipped}`} item={i} editable={editable && q.status === "ACCEPTED"} />
        ))}
      </div>
      <Bill q={q} run={run} provisional={!q.pricingDone} />
    </article>
  );
}

function ItemRow({ item, editable }: { item: ItemView; editable: boolean }) {
  const { act } = useApp();
  const [val, setVal] = useState(item.actualPaise != null ? String(item.actualPaise / 100) : "");
  const [err, setErr] = useState("");
  const typed = rupeesToPaise(val);

  function check(): number | null {
    if (typed == null || typed < 100) {
      setErr("Enter an amount in rupees (at least ₹1)");
      return null;
    }
    if (typed > item.maxPaise) {
      setErr(`Above the approved ${formatPaise(item.maxPaise)} budget. Skip this item instead.`);
      return null;
    }
    setErr("");
    return typed;
  }

  return (
    <div className={`rounded-ctl border p-3.5 ${item.skipped ? "border-line bg-[#F3F4EE]" : "border-line bg-ivory/60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-semibold ${item.skipped ? "text-ink-soft line-through" : ""}`}>
            {item.qty}× {item.name}
          </p>
          <p className="text-xs text-ink-soft">Budget {formatPaise(item.maxPaise)}</p>
        </div>
        {item.skipped && <Badge tone="grey">Skipped · not billed</Badge>}
        {!item.skipped && item.actualPaise != null && <Badge tone="lime">{formatPaise(item.actualPaise)}</Badge>}
      </div>
      {editable && (
        <div className="mt-3">
          {item.skipped ? (
            <button className="btn-ghost !min-h-[40px]" onClick={() => act({ type: "setItem", itemId: item.id, skipped: false })}>
              Undo skip
            </button>
          ) : (
            <form
              className="flex flex-wrap items-start gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const p = check();
                if (p != null) act({ type: "setItem", itemId: item.id, actualPaise: p });
              }}
            >
              <div className="min-w-[140px] flex-1">
                <label className="sr-only" htmlFor={`a${item.id}`}>
                  Actual total for {item.name} in rupees
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft">₹</span>
                  <input
                    id={`a${item.id}`}
                    inputMode="decimal"
                    className="field pl-8"
                    placeholder="Actual total"
                    value={val}
                    onChange={(e) => {
                      setVal(e.target.value);
                      setErr("");
                    }}
                    aria-invalid={!!err}
                    aria-describedby={err ? `e${item.id}` : undefined}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary !min-h-[44px] !px-4">
                {item.actualPaise != null ? "Update" : "Save price"}
              </button>
              <button type="button" className="btn-ghost !min-h-[44px] !px-4" onClick={() => act({ type: "setItem", itemId: item.id, skipped: true }, `${item.name} skipped`)}>
                Skip
              </button>
              {err && (
                <p id={`e${item.id}`} role="alert" className="errtext w-full">
                  {err}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function Bill({ q, run, provisional }: { q: RequestView; run: RunView; provisional?: boolean }) {
  const allSkipped = q.items.every((i) => i.skipped);
  return (
    <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Items{provisional ? " so far" : ""}</dt>
        <dd className="tabular-nums">{formatPaise(q.billItemsPaise)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-soft">Pickup fee</dt>
        <dd className="tabular-nums">{allSkipped ? "₹0 (all items skipped)" : run.feePaise === 0 ? "Free" : formatPaise(run.feePaise)}</dd>
      </div>
      <div className="flex justify-between text-base">
        <dt className="font-bold">{provisional ? "Running total" : "Final bill"}</dt>
        <dd className="font-extrabold tabular-nums">{formatPaise(q.billTotalPaise)}</dd>
      </div>
    </dl>
  );
}

function HandoverCard({ q, run }: { q: RequestView; run: RunView }) {
  const { act } = useApp();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const paid = q.paymentStatus === "RECEIVED";
  const unfulfilled = q.status === "UNFULFILLED";

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await act({ type: "collect", requestId: q.id, code }, `${q.userName} collected`);
    setBusy(false);
    if (!r.ok) setErr(r.error ?? "Couldn’t verify");
    else setCode("");
  }

  return (
    <article className="card rise border-l-[5px] p-5" style={{ borderLeftColor: accent(q) }}>
      <Who q={q} run={run} />
      <ul className="mt-4 space-y-1.5 text-sm">
        {q.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span className={i.skipped ? "text-ink-soft line-through" : ""}>
              {i.qty}× {i.name}
            </span>
            <span className="tabular-nums text-ink-soft">{i.skipped ? "Skipped" : i.actualPaise != null ? formatPaise(i.actualPaise) : "—"}</span>
          </li>
        ))}
      </ul>
      <Bill q={q} run={run} />

      {unfulfilled ? (
        <p className="mt-4 rounded-ctl bg-[#F3F4EE] px-4 py-3 text-sm text-ink-soft">Nothing was available. No charge and no handover needed.</p>
      ) : (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold">Payment</p>
              <p className="text-ink-soft">{paid ? "Received" : "Not yet received"}</p>
            </div>
            {paid ? (
              <Badge tone="lime">
                <Check size={12} /> Payment received
              </Badge>
            ) : (
              <button className="btn-ghost" onClick={() => act({ type: "markPaid", requestId: q.id }, `Payment from ${q.userName} recorded`)}>
                Payment received
              </button>
            )}
          </div>
          {q.status === "READY" && (
            <form onSubmit={verify}>
              <label className="label" htmlFor={`c${q.id}`}>
                Participant’s pickup code
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <input
                    id={`c${q.id}`}
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    className="field pl-10 text-lg font-bold tracking-[0.3em]"
                    placeholder="0000"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ""));
                      setErr("");
                    }}
                    aria-invalid={!!err}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={busy || code.length !== 4}>
                  Confirm handover
                </button>
              </div>
              {err && (
                <p role="alert" className="errtext">
                  {err}
                </p>
              )}
            </form>
          )}
          {q.status === "COLLECTED" && (
            <p className="flex items-center gap-2 text-sm font-semibold text-forest">
              <CircleCheck size={16} /> Handed over
            </p>
          )}
        </div>
      )}
    </article>
  );
}
