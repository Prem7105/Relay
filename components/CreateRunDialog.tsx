"use client";
import { useEffect, useState } from "react";
import { Coffee, PenLine } from "lucide-react";
import { useApp } from "./AppProvider";
import { Modal } from "./ui";
import { toLocalInput } from "@/lib/format";

const FEES = [
  { v: 0, label: "Free" },
  { v: 500, label: "₹5" },
  { v: 1000, label: "₹10" },
];

export default function CreateRunDialog({ onCreated }: { onCreated: (id: number) => void }) {
  const { createOpen, setCreateOpen, act } = useApp();
  const [shop, setShop] = useState("stationery");
  const [deadline, setDeadline] = useState("");
  const [ret, setRet] = useState("");
  const [point, setPoint] = useState("");
  const [cap, setCap] = useState(3);
  const [fee, setFee] = useState(500);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!createOpen) return;
    const t = Date.now();
    setDeadline(toLocalInput(t + 45 * 60000));
    setRet(toLocalInput(t + 105 * 60000));
    setShop("stationery");
    setPoint("");
    setCap(3);
    setFee(500);
    setNote("");
    setTouched(false);
  }, [createOpen]);

  const dl = deadline ? new Date(deadline).getTime() : NaN;
  const rt = ret ? new Date(ret).getTime() : NaN;
  const errs: Record<string, string> = {};
  if (!deadline || isNaN(dl)) errs.deadline = "Choose when requests close";
  else if (dl <= Date.now()) errs.deadline = "Deadline must be in the future";
  if (!ret || isNaN(rt)) errs.ret = "Choose an estimated return time";
  else if (!isNaN(dl) && rt <= dl) errs.ret = "Return time must be after the deadline";
  if (point.trim().length < 2) errs.point = "Add a pickup point, e.g. Library steps";
  if (!Number.isInteger(cap) || cap < 1 || cap > 5) errs.cap = "Capacity must be 1–5";
  const show = (k: string) => touched && errs[k];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const r = await act({ type: "createRun", shopId: shop, deadlineAt: dl, returnAt: rt, pickupPoint: point, capacity: cap, feePaise: fee, note }, "Run published");
    setBusy(false);
    if (r.ok && r.runId) onCreated(r.runId);
  }

  return (
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a run" wide>
      <form onSubmit={submit} noValidate className="space-y-5">
        <fieldset>
          <legend className="label">Shop</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "cafe", name: "Campus Café", Icon: Coffee },
              { id: "stationery", name: "Campus Stationery", Icon: PenLine },
            ].map(({ id, name, Icon }) => (
              <label key={id} className={`flex min-h-[56px] cursor-pointer items-center gap-2.5 rounded-ctl border px-3.5 text-sm font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-forest ${shop === id ? "border-forest bg-forest-50" : "border-[#CDD4C6] hover:bg-forest-50"}`}>
                <input type="radio" name="shop" className="sr-only" checked={shop === id} onChange={() => setShop(id)} />
                <Icon size={18} className="text-forest" />
                {name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cr-deadline">
              Requests close at
            </label>
            <input id="cr-deadline" type="datetime-local" className="field" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-invalid={!!show("deadline")} />
            {show("deadline") && <p className="errtext">{errs.deadline}</p>}
          </div>
          <div>
            <label className="label" htmlFor="cr-return">
              Estimated return
            </label>
            <input id="cr-return" type="datetime-local" className="field" value={ret} onChange={(e) => setRet(e.target.value)} aria-invalid={!!show("ret")} />
            {show("ret") && <p className="errtext">{errs.ret}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="cr-point">
            Pickup point
          </label>
          <input id="cr-point" className="field" maxLength={60} placeholder="e.g. Block B entrance" value={point} onChange={(e) => setPoint(e.target.value)} aria-invalid={!!show("point")} />
          {show("point") && <p className="errtext">{errs.point}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cr-cap">
              Capacity (participants)
            </label>
            <input id="cr-cap" type="number" min={1} max={5} className="field" value={cap} onChange={(e) => setCap(parseInt(e.target.value, 10))} aria-invalid={!!show("cap")} />
            {show("cap") ? <p className="errtext">{errs.cap}</p> : <p className="hint">1 to 5 accepted participants</p>}
          </div>
          <fieldset>
            <legend className="label">Pickup fee per participant</legend>
            <div className="grid grid-cols-3 gap-2">
              {FEES.map((f) => (
                <label key={f.v} className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-ctl border text-sm font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-forest ${fee === f.v ? "border-forest bg-forest text-white" : "border-[#CDD4C6] hover:bg-forest-50"}`}>
                  <input type="radio" name="fee" className="sr-only" checked={fee === f.v} onChange={() => setFee(f.v)} />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div>
          <label className="label" htmlFor="cr-note">
            Carrying note <span className="font-normal text-ink-soft">(optional)</span>
          </label>
          <input id="cr-note" className="field" maxLength={140} placeholder="e.g. Small items only, I’m on a bike" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <p className="text-xs text-ink-soft">Terms can’t be edited after publishing. You can cancel the run before any item costs are recorded.</p>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Publishing…" : "Publish run"}
        </button>
      </form>
    </Modal>
  );
}
