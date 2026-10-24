const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function formatPaise(p: number): string {
  const rupees = p / 100;
  return inr.format(rupees).replace(/\.00$/, "");
}

export function rupeesToPaise(input: string): number | null {
  const t = input.trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function formatDayTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = same(d, today) ? "Today" : same(d, tomorrow) ? "Tomorrow" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${day}, ${formatTime(ts)}`;
}

export function countdown(ts: number, now: number): string {
  const ms = ts - now;
  if (ms <= 0) return "Closed";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s left`;
  return `${sec}s left`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function toLocalInput(ts: number): string {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function feeLabel(p: number): string {
  return p === 0 ? "Free" : `${formatPaise(p)} / person`;
}
