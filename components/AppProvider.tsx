"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { StateView } from "@/lib/types";
import type { Action } from "@/lib/logic";

interface Ctx {
  state: StateView | null;
  now: number;
  userId: string;
  setUserId: (id: string) => void;
  act: (a: Action, okMsg?: string) => Promise<{ ok: boolean; runId?: number; error?: string }>;
  toast: (msg: string, kind?: "ok" | "err") => void;
  createOpen: boolean;
  setCreateOpen: (v: boolean) => void;
  loadError: boolean;
  retry: () => void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const v = useContext(C);
  if (!v) throw new Error("AppProvider missing");
  return v;
};

const KEY = "relay-user";

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUid] = useState<string>("");
  const [state, setState] = useState<StateView | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: "ok" | "err"; n: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const skew = useRef(0);
  const activeUser = useRef("");
  const requestVersion = useRef(0);

  useEffect(() => {
    const initial = sessionStorage.getItem(KEY) || "prem";
    activeUser.current = initial;
    setUid(initial);
  }, []);

  const refresh = useCallback(async (uid: string) => {
    if (uid !== activeUser.current) return;
    const version = ++requestVersion.current;
    try {
      const r = await fetch("/api/state", { headers: { "x-relay-user": uid }, cache: "no-store" });
      if (!r.ok) throw new Error();
      const s = (await r.json()) as StateView;
      if (uid !== activeUser.current || version !== requestVersion.current) return;
      skew.current = s.now - Date.now();
      setState(s);
      setLoadError(false);
    } catch {
      if (uid === activeUser.current && version === requestVersion.current) setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    setState((s) => (s && s.me.id === userId ? s : null));
    refresh(userId);
    const t = setInterval(() => {
      if (!document.hidden) refresh(userId);
    }, 3000);
    return () => clearInterval(t);
  }, [userId, refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + skew.current), 1000);
    return () => clearInterval(t);
  }, []);

  const setUserId = (id: string) => {
    if (id === activeUser.current) return;
    activeUser.current = id;
    requestVersion.current++;
    setState(null);
    setLoadError(false);
    sessionStorage.setItem(KEY, id);
    setUid(id);
  };

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToastMsg({ msg, kind, n: Date.now() });
  }, []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 4500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const act: Ctx["act"] = async (a, okMsg) => {
    const actor = userId;
    try {
      const r = await fetch("/api/action", {
        method: "POST",
        headers: { "content-type": "application/json", "x-relay-user": userId },
        body: JSON.stringify(a),
      });
      const j = await r.json();
      if (actor !== activeUser.current) return { ok: false, error: "Identity changed; check My Activity for the action result." };
      if (!r.ok) {
        toast(j.error ?? "Something went wrong", "err");
        refresh(userId);
        return { ok: false, error: j.error };
      }
      if (okMsg) toast(okMsg);
      await refresh(userId);
      return { ok: true, runId: j.runId };
    } catch {
      toast("Can’t reach the server. Is Relay still running?", "err");
      return { ok: false, error: "network" };
    }
  };

  return (
    <C.Provider value={{ state, now, userId, setUserId, act, toast, createOpen, setCreateOpen, loadError, retry: () => { void refresh(userId); } }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 md:bottom-6">
        {toastMsg && (
          <div
            key={toastMsg.n}
            role="status"
            className={`toast-in pointer-events-auto max-w-md rounded-ctl px-4 py-3 text-sm font-medium shadow-card ${
              toastMsg.kind === "err" ? "bg-[#7A1F1F] text-white" : "bg-forest text-white"
            }`}
          >
            {toastMsg.msg}
          </div>
        )}
      </div>
    </C.Provider>
  );
}
