"use client";
import Link from "next/link";
import { ArrowRight, Clock, Coffee, MapPin, PenLine, Timer, Users, Wallet } from "lucide-react";
import type { RunView } from "@/lib/types";
import { Avatar, Badge, runBadge } from "./ui";
import { countdown, feeLabel, formatTime } from "@/lib/format";

export const shopIcon = (c: RunView["category"], size = 20) => (c === "cafe" ? <Coffee size={size} /> : <PenLine size={size} />);

export default function RunCard({ run, now, mine }: { run: RunView; now: number; mine: boolean }) {
  const b = runBadge(run, now);
  const left = Math.max(0, run.capacity - run.acceptedCount);
  const closed = run.status === "OPEN" && now >= run.deadlineAt;
  return (
    <Link href={`/run/${run.id}`} className="card rise group flex flex-col p-5 transition duration-200 hover:-translate-y-1 hover:border-forest/30 hover:shadow-[0_14px_30px_-12px_rgba(22,60,52,.28)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-lime">{shopIcon(run.category)}</span>
          <div>
            <h3 className="text-[18px] font-extrabold leading-tight">{run.shopName}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-soft">
              <Avatar name={run.collectorName} size={20} />
              {mine ? "You" : run.collectorName}
            </div>
          </div>
        </div>
        <Badge tone={b.tone}>{b.label}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-[13px]">
        <Fact icon={<MapPin size={15} />} label="Pickup" value={run.pickupPoint} />
        <Fact icon={<Timer size={15} />} label="Requests" value={closed ? "Closed" : countdown(run.deadlineAt, now)} strong={!closed && run.deadlineAt - now < 10 * 60000} />
        <Fact icon={<Clock size={15} />} label="Back by" value={formatTime(run.returnAt)} />
        <Fact icon={<Users size={15} />} label="Spots" value={left === 0 ? "Full" : `${left} of ${run.capacity} left`} />
        <Fact icon={<Wallet size={15} />} label="Pickup fee" value={feeLabel(run.feePaise)} />
      </dl>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm font-semibold text-forest">
        <span>{mine ? "Your run" : "View run"}</span>
        <ArrowRight size={18} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function Fact({ icon, label, value, strong }: { icon: React.ReactNode; label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-ink-soft">
        {icon}
        {label}
      </dt>
      <dd className={`mt-0.5 truncate font-semibold ${strong ? "text-[#A04A0A]" : ""}`}>{value}</dd>
    </div>
  );
}
