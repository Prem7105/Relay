# Relay — Already going? Bring something back.

Campus shared-pickup prototype (hackathon: "Build a smarter campus using technology").
Next.js (App Router) + TypeScript + Tailwind + Lucide + SQLite (Node's built-in `node:sqlite`, no native driver).

## Run

    npm install
    npm run build && npm start     # http://localhost:3000
    # or: npm run dev

Requires Node 22.5+ (built with Node 24). Data lives in `data/relay.db` (override with `RELAY_DB=path`).
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
