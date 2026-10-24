"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, SearchX, FlaskConical, X } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import RunCard from "@/components/RunCard";
import { Empty, Skeleton } from "@/components/ui";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "cafe", label: "Café" },
  { id: "stationery", label: "Stationery" },
  { id: "free", label: "Free pickup" },
] as const;

export default function Discover() {
  const { state, now, setCreateOpen, loadError } = useApp();
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [hideTip, setHideTip] = useState(true);
  useEffect(() => setHideTip(localStorage.getItem("relay-tip") === "1"), []);

  const runs = useMemo(() => {
    if (!state) return [];
    const term = q.trim().toLowerCase();
    return state.runs
      .filter((r) => r.status === "OPEN")
      .filter((r) => (f === "all" ? true : f === "free" ? r.feePaise === 0 : r.category === f))
      .filter((r) => !term || r.shopName.toLowerCase().includes(term) || r.pickupPoint.toLowerCase().includes(term))
      .sort((a, b) => {
        const ac = a.deadlineAt <= now ? 1 : 0;
        const bc = b.deadlineAt <= now ? 1 : 0;
        return ac - bc || a.deadlineAt - b.deadlineAt;
      });
  }, [state, q, f, now]);

  const openRuns = state ? state.runs.filter((r) => r.status === "OPEN" && r.deadlineAt > now).length : 0;
  const openSpots = state ? state.runs.filter((r) => r.status === "OPEN" && r.deadlineAt > now).reduce((n, r) => n + Math.max(0, r.capacity - r.acceptedCount), 0) : 0;

  return (
    <div>
      {!hideTip && (
        <div className="mb-6 flex items-start gap-3 rounded-ctl border border-lime-700/40 bg-lime/40 px-4 py-3 text-sm text-forest">
          <FlaskConical size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1 font-medium">
            Demo mode: switch identities to experience both sides. <span className="font-normal">Tap your name at the top right.</span>
          </p>
          <button
            aria-label="Dismiss"
            className="-m-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-lime"
            onClick={() => {
              localStorage.setItem("relay-tip", "1");
              setHideTip(true);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-[28px] bg-forest px-6 py-8 text-white md:px-10 md:py-11">
        <svg aria-hidden className="pointer-events-none absolute -right-6 top-0 h-full w-[60%] opacity-90" viewBox="0 0 400 220" fill="none" preserveAspectRatio="xMaxYMid slice">
          <path d="M10 190 C 90 190, 110 70, 190 90 S 300 170, 390 40" stroke="#D8EF88" strokeOpacity=".35" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" />
          <circle cx="10" cy="190" r="7" fill="#D8EF88" />
          <circle cx="390" cy="40" r="11" fill="#D8EF88" fillOpacity=".25" />
          <circle cx="390" cy="40" r="5" fill="#D8EF88" />
          <circle cx="190" cy="90" r="4" fill="#D8EF88" fillOpacity=".6" />
        </svg>
        <div className="relative max-w-xl">
          <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-lime">Already going? Bring something back.</p>
          <h1 className="text-balance text-[36px] font-extrabold leading-[1.04] tracking-tight md:text-[52px]">
            Someone’s <span className="text-lime">already</span> on their way.
          </h1>
          <p className="mt-4 max-w-md text-[15px] text-white/80 md:text-[17px]">Join a campus run. Get what you need without making another trip.</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
            <button onClick={() => setCreateOpen(true)} className="btn-lime h-12 px-6 text-[15px]">
              <Plus size={18} strokeWidth={2.8} /> Create a run
            </button>
            {state && (
              <p className="text-sm text-white/75">
                <b className="text-lg text-white">{openRuns}</b> open run{openRuns === 1 ? "" : "s"} · <b className="text-lg text-white">{openSpots}</b> spot{openSpots === 1 ? "" : "s"} free
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-7 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <label htmlFor="search" className="sr-only">
            Search by shop or pickup location
          </label>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input id="search" type="search" className="field pl-10" placeholder="Search shop or pickup point" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div role="group" aria-label="Filter runs" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 md:pb-0">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              onClick={() => setF(x.id)}
              aria-pressed={f === x.id}
              className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-semibold transition ${f === x.id ? "border-forest bg-forest text-white" : "border-line bg-white hover:bg-forest-50"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-live="polite">
        {loadError && !state ? (
          <Empty icon={<SearchX />} title="Can’t reach Relay" body="The local server isn’t responding. Check that it’s still running; this page will retry." />
        ) : !state ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[260px]" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <Empty
            icon={<SearchX />}
            title={q || f !== "all" ? "No runs match" : "No open runs right now"}
            body={q || f !== "all" ? "Try a different search or filter." : "Heading to the café or stationery shop? Post a run and let others add to it."}
            action={
              <button className="btn-primary" onClick={() => setCreateOpen(true)}>
                <Plus size={18} /> Create a run
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {runs.map((r) => (
              <RunCard key={r.id} run={r} now={now} mine={r.collectorId === state.me.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
