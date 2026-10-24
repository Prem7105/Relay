# Relay — Already going? Bring something back.

Campus shared-pickup prototype (hackathon: "Build a smarter campus using technology").
Next.js (App Router) + TypeScript + Tailwind + Lucide + SQLite (Node's built-in `node:sqlite`, no native driver).

## Run

    npm ci
    npm run build && npm start     # http://localhost:3000
    # or: npm run dev

Requires Node 24.x (`nvm use`; reviewed with Node 24.22.1). Data lives in `data/relay.db` (override with `RELAY_DB=path`).
Clients poll `/api/state` every 3 seconds; all mutations go through `POST /api/action`, each in one SQLite transaction.

## Demo

Use the identity button (top right) to switch between Prem, Aryan, Varada and Sanket. Identity is kept in `sessionStorage`,
so separate tabs/devices can play different roles. "Reset demo data" in the same dialog restores the seed data.

## Limitations (honest)

- **Demo identity is not authentication.** The server trusts an `x-relay-user` header; anyone can act as anyone.
- **Single-process local demo.** SQLite file on local disk; not for serverless or multi-instance deployment.
- **No payments.** Payment is manual (cash/UPI) and only *recorded* by the collector.
- Pickup codes are 4 digits with no attempt rate-limit. Fine for a demo, not for production.
- Polling, not push. Updates can take up to 3 seconds.
- `node:sqlite` is flagged experimental by Node and prints a warning at startup.

## Presentation preset

Select Prem in the identity dialog, then **Load stationery demo**. This adds a new run with three pending requests without deleting existing data. Accept all three, lock, and enter row totals of ₹50, ₹20 and ₹30. After payment and pickup, fees total ₹15. Reset only when you intend to erase all shared demo activity.

Discover hides expired runs; existing requests remain in My Activity. Network failures display a retry banner. Cancellation is allowed while shopping only when no item has a recorded purchase amount.

## Checks

Run `npm run typecheck` and `npm run build`. For the API regression test, start a separate instance with `RELAY_DB=/tmp/relay-smoke.db node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3100`, then run `RELAY_TEST_URL=http://127.0.0.1:3100 node scripts/smoke-test.mjs`. **The test resets that instance’s database; never point it at a shared demo or real data.**
