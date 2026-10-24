import { getDb, tx, newCode, resetDemo } from "./db";
import type { ItemView, RequestStatus, RequestView, RunStatus, RunView, StateView, User } from "./types";
import { formatPaise } from "./format";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (msg: string, status = 400): never => {
  throw new HttpError(status, msg);
};

type Row = Record<string, any>;

export function getUser(id: string | null): User {
  const u = id ? (getDb().prepare("SELECT id, name, role FROM users WHERE id = ?").get(id) as User | undefined) : undefined;
  if (!u) throw new HttpError(401, "Unknown demo identity");
  return u;
}

// ---------- read model ----------

export function buildState(me: User): StateView {
  const db = getDb();
  const users = db.prepare("SELECT id, name, role FROM users ORDER BY rowid").all() as unknown as User[];
  const names = new Map(users.map((u) => [u.id, u.name]));
  const runRows = db
    .prepare("SELECT r.*, s.name AS shop_name, s.category FROM runs r JOIN shops s ON s.id = r.shop_id ORDER BY r.id DESC")
    .all() as Row[];
  const reqRows = db.prepare("SELECT * FROM requests ORDER BY id").all() as Row[];
  const itemRows = db.prepare("SELECT * FROM items ORDER BY id").all() as Row[];

  const itemsByReq = new Map<number, ItemView[]>();
  for (const i of itemRows) {
    const list = itemsByReq.get(i.request_id) ?? [];
    list.push({ id: i.id, name: i.name, qty: i.qty, maxPaise: i.max_paise, actualPaise: i.actual_paise, skipped: !!i.skipped });
    itemsByReq.set(i.request_id, list);
  }

  const runs: RunView[] = runRows.map((r) => {
    const all = reqRows.filter((q) => q.run_id === r.id);
    const isCollector = r.collector_id === me.id;
    const visible = all.filter((q) => isCollector || q.user_id === me.id);
    const requests: RequestView[] = visible.map((q) => {
      const items = itemsByReq.get(q.id) ?? [];
      const live = items.filter((i) => !i.skipped);
      const billItems = live.reduce((s, i) => s + (i.actualPaise ?? 0), 0);
      const billFee = live.length > 0 ? r.fee_paise : 0;
      const showCode = q.user_id === me.id && (q.status === "READY" || q.status === "COLLECTED");
      return {
        id: q.id,
        runId: q.run_id,
        userId: q.user_id,
        userName: names.get(q.user_id) ?? q.user_id,
        status: q.status,
        paymentStatus: q.payment_status,
        note: q.note,
        createdAt: q.created_at,
        items,
        pickupCode: showCode ? q.pickup_code : undefined,
        maxTotalPaise: items.reduce((s, i) => s + i.maxPaise, 0) + r.fee_paise,
        billItemsPaise: billItems,
        billFeePaise: billFee,
        billTotalPaise: billItems + billFee,
        pricingDone: items.every((i) => i.skipped || i.actualPaise != null),
      };
    });
    return {
      id: r.id,
      shopId: r.shop_id,
      shopName: r.shop_name,
      category: r.category,
      collectorId: r.collector_id,
      collectorName: names.get(r.collector_id) ?? r.collector_id,
      deadlineAt: r.deadline_at,
      returnAt: r.return_at,
      pickupPoint: r.pickup_point,
      capacity: r.capacity,
      feePaise: r.fee_paise,
      note: r.note,
      status: r.status as RunStatus,
      createdAt: r.created_at,
      acceptedCount: all.filter((q) => ["ACCEPTED", "READY", "COLLECTED", "UNFULFILLED"].includes(q.status)).length,
      pendingCount: isCollector ? all.filter((q) => q.status === "PENDING").length : 0,
      requests,
    };
  });
  return { now: Date.now(), me, users, runs };
}

// ---------- mutations ----------

export type Action =
  | { type: "createRun"; shopId: string; deadlineAt: number; returnAt: number; pickupPoint: string; capacity: number; feePaise: number; note?: string }
  | { type: "joinRun"; runId: number; items: { name: string; qty: number; maxPaise: number }[]; note?: string }
  | { type: "withdraw"; requestId: number }
  | { type: "decide"; requestId: number; accept: boolean }
  | { type: "lockRun"; runId: number }
  | { type: "cancelRun"; runId: number }
  | { type: "setItem"; itemId: number; actualPaise?: number | null; skipped?: boolean }
  | { type: "markReady"; runId: number }
  | { type: "markPaid"; requestId: number }
  | { type: "collect"; requestId: number; code: string }
  | { type: "reset" }
  | { type: "loadStationeryDemo" };

function loadRun(id: unknown): Row {
  const r = getDb().prepare("SELECT * FROM runs WHERE id = ?").get(Number(id)) as Row | undefined;
  return r ?? fail("Run not found", 404);
}
function loadReq(id: unknown): Row {
  const r = getDb().prepare("SELECT * FROM requests WHERE id = ?").get(Number(id)) as Row | undefined;
  return r ?? fail("Request not found", 404);
}
function ownRun(id: unknown, me: User): Row {
  const r = loadRun(id);
  if (r.collector_id !== me.id) fail("Only the collector can do this", 403);
  return r;
}
const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

export function applyAction(me: User, a: Action): { ok: true; runId?: number } {
  if (a.type === "reset") {
    resetDemo();
    return { ok: true };
  }
  return tx((db) => {
    switch (a.type) {
      case "loadStationeryDemo": {
        const now = Date.now();
        const id = Number(db.prepare("INSERT INTO runs (shop_id, collector_id, deadline_at, return_at, pickup_point, capacity, fee_paise, note, status, created_at) VALUES ('stationery', ?, ?, ?, 'Hostel B lobby', 3, 500, 'Fictional presentation preset — small items only', 'OPEN', ?)").run(me.id, now + 45 * 60000, now + 90 * 60000, now).lastInsertRowid);
        const people = ["aryan", "varada", "sanket", "prem"].filter(id => id !== me.id).slice(0, 3);
        const items: [string, number, number][] = [["A4 notebook", 1, 6000], ["Blue pens", 2, 3000], ["Folder", 1, 4000]];
        people.forEach((person, index) => {
          const requestId = Number(db.prepare("INSERT INTO requests (run_id,user_id,status,pickup_code,note,created_at) VALUES (?,?,'PENDING',?,'Demo request',?)").run(id, person, newCode(), now).lastInsertRowid);
          db.prepare("INSERT INTO items (request_id,name,qty,max_paise) VALUES (?,?,?,?)").run(requestId, ...items[index]);
        });
        return { ok: true, runId: id };
      }
      case "createRun": {
        const now = Date.now();
        const shop = db.prepare("SELECT id FROM shops WHERE id = ?").get(String(a.shopId));
        if (!shop) fail("Choose Campus Café or Campus Stationery");
        if (!isInt(a.deadlineAt) || a.deadlineAt <= now) fail("Request deadline must be in the future");
        if (a.deadlineAt > now + 7 * 86400000) fail("Deadline must be within 7 days");
        if (!isInt(a.returnAt) || a.returnAt <= a.deadlineAt) fail("Return time must be after the request deadline");
        const point = String(a.pickupPoint ?? "").trim();
        if (point.length < 2 || point.length > 60) fail("Pickup point is required (2–60 characters)");
        if (!isInt(a.capacity) || a.capacity < 1 || a.capacity > 5) fail("Capacity must be 1–5 participants");
        if (![0, 500, 1000].includes(a.feePaise)) fail("Fee must be Free, ₹5 or ₹10");
        const note = String(a.note ?? "").trim().slice(0, 140);
        const id = Number(
          db
            .prepare(
              "INSERT INTO runs (shop_id, collector_id, deadline_at, return_at, pickup_point, capacity, fee_paise, note, status, created_at) VALUES (?,?,?,?,?,?,?,?, 'OPEN', ?)",
            )
            .run(a.shopId, me.id, a.deadlineAt, a.returnAt, point, a.capacity, a.feePaise, note, now).lastInsertRowid,
        );
        return { ok: true, runId: id };
      }

      case "joinRun": {
        const run = loadRun(a.runId);
        if (run.collector_id === me.id) fail("You can’t join your own run", 403);
        if (run.status !== "OPEN") fail("This run is no longer accepting requests");
        if (Date.now() >= run.deadline_at) fail("Requests for this run have closed");
        const accepted = (db.prepare("SELECT COUNT(*) AS n FROM requests WHERE run_id = ? AND status = 'ACCEPTED'").get(run.id) as Row).n;
        if (accepted >= run.capacity) fail("This run is full");
        const existing = db.prepare("SELECT id, status FROM requests WHERE run_id = ? AND user_id = ?").get(run.id, me.id) as Row | undefined;
        if (existing && existing.status !== "WITHDRAWN") fail("You already have a request on this run");
        const items = Array.isArray(a.items) ? a.items : [];
        if (items.length < 1 || items.length > 8) fail("Add between 1 and 8 items");
        for (const it of items) {
          if (!it || typeof it.name !== "string" || it.name.trim().length < 1 || it.name.length > 60) fail("Every item needs a name");
          if (!isInt(it.qty) || it.qty < 1 || it.qty > 20) fail("Quantity must be 1–20");
          if (!isInt(it.maxPaise) || it.maxPaise < 100 || it.maxPaise > 500000) fail("Budget per item must be ₹1–₹5,000");
        }
        if (existing) {
          db.prepare("DELETE FROM items WHERE request_id = ?").run(existing.id);
          db.prepare("DELETE FROM requests WHERE id = ?").run(existing.id);
        }
        const reqId = Number(
          db
            .prepare("INSERT INTO requests (run_id, user_id, status, pickup_code, note, created_at) VALUES (?,?, 'PENDING', ?,?,?)")
            .run(run.id, me.id, newCode(), String(a.note ?? "").trim().slice(0, 140), Date.now()).lastInsertRowid,
        );
        for (const it of items)
          db.prepare("INSERT INTO items (request_id, name, qty, max_paise) VALUES (?,?,?,?)").run(reqId, it.name.trim(), it.qty, it.maxPaise);
        return { ok: true, runId: run.id };
      }

      case "withdraw": {
        const q = loadReq(a.requestId);
        if (q.user_id !== me.id) fail("Not your request", 403);
        if (q.status !== "PENDING") fail("Only pending requests can be withdrawn");
        if (loadRun(q.run_id).status !== "OPEN") fail("The run is locked");
        db.prepare("UPDATE requests SET status = 'WITHDRAWN' WHERE id = ?").run(q.id);
        return { ok: true };
      }

      case "decide": {
        const q = loadReq(a.requestId);
        const run = ownRun(q.run_id, me);
        if (run.status !== "OPEN") fail("The run is locked");
        if (q.status !== "PENDING") fail("This request was already handled");
        if (typeof a.accept !== "boolean") fail("Accept must be true or false");
        if (a.accept) {
          const accepted = (db.prepare("SELECT COUNT(*) AS n FROM requests WHERE run_id = ? AND status = 'ACCEPTED'").get(run.id) as Row).n;
          if (accepted >= run.capacity) fail(`Capacity reached (${run.capacity}). Decline or lock the run.`);
        }
        db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(a.accept ? "ACCEPTED" : "DECLINED", q.id);
        return { ok: true };
      }

      case "lockRun": {
        const run = ownRun(a.runId, me);
        if (run.status !== "OPEN") fail("Run is already locked");
        const accepted = (db.prepare("SELECT COUNT(*) AS n FROM requests WHERE run_id = ? AND status = 'ACCEPTED'").get(run.id) as Row).n;
        if (accepted < 1) fail("Accept at least one request before locking, or cancel the run");
        db.prepare("UPDATE requests SET status = 'DECLINED' WHERE run_id = ? AND status = 'PENDING'").run(run.id);
        db.prepare("UPDATE runs SET status = 'LOCKED' WHERE id = ?").run(run.id);
        return { ok: true };
      }

      case "cancelRun": {
        const run = ownRun(a.runId, me);
        if (!["OPEN", "LOCKED", "SHOPPING"].includes(run.status)) fail("This run can no longer be cancelled");
        const purchased = db.prepare("SELECT COUNT(*) AS n FROM items i JOIN requests q ON q.id = i.request_id WHERE q.run_id = ? AND i.actual_paise IS NOT NULL").get(run.id) as Row;
        if (purchased.n > 0) fail("Runs can’t be cancelled after a purchase is recorded");
        db.prepare("UPDATE requests SET status = 'CANCELLED' WHERE run_id = ? AND status IN ('PENDING','ACCEPTED')").run(run.id);
        db.prepare("UPDATE runs SET status = 'CANCELLED' WHERE id = ?").run(run.id);
        return { ok: true };
      }

      case "setItem": {
        const item = db.prepare("SELECT * FROM items WHERE id = ?").get(Number(a.itemId)) as Row | undefined;
        if (!item) return fail("Item not found", 404);
        const q = loadReq(item.request_id);
        const run = ownRun(q.run_id, me);
        if (run.status !== "LOCKED" && run.status !== "SHOPPING") fail("Shopping isn’t open for this run");
        if (q.status !== "ACCEPTED") fail("Only accepted requests can be priced");
        if (a.skipped) {
          db.prepare("UPDATE items SET skipped = 1, actual_paise = NULL WHERE id = ?").run(item.id);
        } else if (a.actualPaise == null) {
          db.prepare("UPDATE items SET skipped = 0, actual_paise = NULL WHERE id = ?").run(item.id);
        } else {
          if (!isInt(a.actualPaise) || a.actualPaise < 100) fail("Enter a valid amount of at least ₹1");
          if (a.actualPaise > item.max_paise)
            fail(`${formatPaise(a.actualPaise)} is above the approved budget of ${formatPaise(item.max_paise)}. Skip this item instead.`);
          db.prepare("UPDATE items SET skipped = 0, actual_paise = ? WHERE id = ?").run(a.actualPaise, item.id);
        }
        db.prepare("UPDATE runs SET status = 'SHOPPING' WHERE id = ? AND status = 'LOCKED'").run(run.id);
        return { ok: true };
      }

      case "markReady": {
        const run = ownRun(a.runId, me);
        if (run.status !== "SHOPPING") fail("Price or skip items first");
        const accepted = db.prepare("SELECT * FROM requests WHERE run_id = ? AND status = 'ACCEPTED'").all(run.id) as Row[];
        for (const q of accepted) {
          const pending = (db.prepare("SELECT COUNT(*) AS n FROM items WHERE request_id = ? AND skipped = 0 AND actual_paise IS NULL").get(q.id) as Row).n;
          if (pending > 0) fail("Every item must be priced or skipped first");
        }
        let toCollect = 0;
        for (const q of accepted) {
          const live = (db.prepare("SELECT COUNT(*) AS n FROM items WHERE request_id = ? AND skipped = 0").get(q.id) as Row).n;
          const next: RequestStatus = live > 0 ? "READY" : "UNFULFILLED";
          if (live > 0) toCollect++;
          db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(next, q.id);
        }
        db.prepare("UPDATE runs SET status = ? WHERE id = ?").run(toCollect > 0 ? "READY" : "COMPLETED", run.id);
        return { ok: true };
      }

      case "markPaid": {
        const q = loadReq(a.requestId);
        ownRun(q.run_id, me);
        if (q.status !== "READY" && q.status !== "COLLECTED") fail("Payment can be recorded once the bill is final");
        db.prepare("UPDATE requests SET payment_status = 'RECEIVED' WHERE id = ?").run(q.id);
        return { ok: true };
      }

      case "collect": {
        const q = loadReq(a.requestId);
        const run = ownRun(q.run_id, me);
        if (q.status === "COLLECTED") fail("Already collected");
        if (q.status !== "READY" || run.status !== "READY") fail("This request isn’t ready for handover");
        if (String(a.code ?? "").trim() !== q.pickup_code) fail("Wrong pickup code. Ask the participant to check their code.");
        db.prepare("UPDATE requests SET status = 'COLLECTED' WHERE id = ?").run(q.id);
        const left = (db.prepare("SELECT COUNT(*) AS n FROM requests WHERE run_id = ? AND status = 'READY'").get(run.id) as Row).n;
        if (left === 0) db.prepare("UPDATE runs SET status = 'COMPLETED' WHERE id = ?").run(run.id);
        return { ok: true };
      }
      default:
        return fail("Unsupported action", 400);
    }
  });
}
