import type { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// node:sqlite ships with Node >= 22.5 (stable enough on 24). It is loaded via
// getBuiltinModule so the bundler never tries to resolve it.
const sqlite = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shops (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id TEXT NOT NULL REFERENCES shops(id),
  collector_id TEXT NOT NULL REFERENCES users(id),
  deadline_at INTEGER NOT NULL,
  return_at INTEGER NOT NULL,
  pickup_point TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 5),
  fee_paise INTEGER NOT NULL CHECK (fee_paise IN (0, 500, 1000)),
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES runs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  pickup_code TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id),
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  max_paise INTEGER NOT NULL,
  actual_paise INTEGER,
  skipped INTEGER NOT NULL DEFAULT 0
);
`;

const g = globalThis as unknown as { __relayDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (g.__relayDb) return g.__relayDb;
  const file = process.env.RELAY_DB ?? path.join(process.cwd(), "data", "relay.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new sqlite.DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  g.__relayDb = db;
  seedIfEmpty(db);
  return db;
}

/** Run fn inside an immediate transaction; all mutations go through here. */
export function tx<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn(db);
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function newCode(): string {
  const { randomInt } = process.getBuiltinModule("node:crypto") as typeof import("node:crypto");
  return String(randomInt(0, 10000)).padStart(4, "0");
}

const MIN = 60_000;

function seedIfEmpty(db: DatabaseSync) {
  const n = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
  if (n === 0) seedDemo(db);
}

export function seedDemo(db: DatabaseSync) {
  const now = Date.now();
  const users: [string, string, string][] = [
    ["prem", "Prem", "collector"],
    ["aryan", "Aryan", "participant"],
    ["varada", "Varada", "participant"],
    ["sanket", "Sanket", "participant"],
  ];
  for (const u of users) db.prepare("INSERT INTO users VALUES (?,?,?)").run(...u);
  db.prepare("INSERT INTO shops VALUES (?,?,?)").run("cafe", "Campus Café", "cafe");
  db.prepare("INSERT INTO shops VALUES (?,?,?)").run("stationery", "Campus Stationery", "stationery");

  const run = (shop: string, who: string, deadlineMin: number, returnMin: number, point: string, cap: number, fee: number, note: string, ageMin: number) =>
    Number(
      db
        .prepare(
          "INSERT INTO runs (shop_id, collector_id, deadline_at, return_at, pickup_point, capacity, fee_paise, note, status, created_at) VALUES (?,?,?,?,?,?,?,?, 'OPEN', ?)",
        )
        .run(shop, who, now + deadlineMin * MIN, now + returnMin * MIN, point, cap, fee, note, now - ageMin * MIN).lastInsertRowid,
    );
  const req = (runId: number, who: string, status: string, note: string, items: [string, number, number][]) => {
    const id = Number(
      db
        .prepare("INSERT INTO requests (run_id, user_id, status, pickup_code, note, created_at) VALUES (?,?,?,?,?,?)")
        .run(runId, who, status, newCode(), note, now - 5 * MIN).lastInsertRowid,
    );
    for (const [name, qty, max] of items) db.prepare("INSERT INTO items (request_id, name, qty, max_paise) VALUES (?,?,?,?)").run(id, name, qty, max * 100);
  };

  const r1 = run("cafe", "varada", 75, 130, "Library steps", 4, 500, "I can carry up to two cups each.", 10);
  req(r1, "sanket", "PENDING", "", [["Cold coffee", 1, 90]]);
  run("stationery", "sanket", 40, 95, "Block B entrance", 3, 0, "Heading over after my lab.", 20);
  run("cafe", "aryan", 180, 240, "Hostel gate", 2, 1000, "Small bag only — snacks and drinks.", 5);
  const r4 = run("cafe", "prem", 120, 170, "Main canteen lobby", 3, 500, "Cups travel in a tray, no hot soup please.", 8);
  req(r4, "aryan", "PENDING", "Less sugar please", [["Masala chai", 2, 40]]);
}

export function resetDemo() {
  tx((db) => {
    for (const t of ["items", "requests", "runs", "shops", "users"]) db.exec(`DELETE FROM ${t}`);
    db.exec("DELETE FROM sqlite_sequence");
    seedDemo(db);
  });
}
