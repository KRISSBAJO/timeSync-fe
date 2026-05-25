"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Bell, CheckCircle2, Loader2, Radio, X } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { RealtimeFeed, RealtimeFeedItem } from "@/lib/realtime/types";

export function RealtimePulse({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<RealtimeFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = feed?.summary;
  const items = feed?.items ?? [];
  const riskCount = (summary?.failedOutbox ?? 0) + (summary?.pendingApprovals ?? 0);
  const latestTime = feed?.serverTime
    ? new Date(feed.serverTime).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Waiting";

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let streamOpened = false;

    async function loadFeed(silent = false) {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const nextFeed = normalizeRealtimeFeed(await apiFetch<RealtimeFeed>("/realtime/feed?limit=8"));
        if (!cancelled) {
          setFeed(nextFeed);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Live feed unavailable.");
        }
      } finally {
        if (!cancelled && !silent) {
          setLoading(false);
        }
      }
    }

    loadFeed();
    const source = new EventSource("/api/backend/realtime/events?limit=8", {
      withCredentials: true,
    });
    const onFeed = (event: MessageEvent<string>) => {
      if (cancelled) {
        return;
      }

      streamOpened = true;
      const nextFeed = parseRealtimeFeed(event.data);

      if (nextFeed) {
        setFeed(nextFeed);
        setError(null);
      } else {
        setError(readStreamError(event.data));
      }

      setLoading(false);
    };
    const onStreamError = () => {
      if (!cancelled) {
        setError(streamOpened ? null : "Live stream reconnecting. Polling fallback is active.");
        loadFeed(true);
      }
    };
    source.addEventListener("feed", onFeed as EventListener);
    source.onmessage = onFeed;
    source.onerror = onStreamError;
    const interval = window.setInterval(() => loadFeed(true), 45000);

    return () => {
      cancelled = true;
      source.removeEventListener("feed", onFeed as EventListener);
      source.close();
      window.clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open live operations feed"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="hidden h-12 items-center gap-3 rounded-lg border border-[#dfe4ef] bg-white px-3 text-left shadow-[0_12px_30px_rgba(23,34,66,0.06)] transition hover:border-[#cbd5e8] hover:bg-[#fbfcff] xl:flex"
      >
        <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-[#eaf9f2] text-[#0f9f72]">
          <Radio size={17} aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#36d399] shadow-[0_0_0_4px_rgba(54,211,153,0.18)]" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-[#8a92a6]">
            Live
          </span>
          <span className="block text-[12px] font-black text-[#151936]">
            {riskCount > 0 ? `${riskCount} control points` : `Synced ${latestTime}`}
          </span>
        </span>
      </button>

      <button
        type="button"
        aria-label="Open live operations feed"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative grid h-11 w-11 place-items-center rounded-full border border-[#dfe4ef] bg-white text-[#0f9f72] transition hover:bg-[#f6f8fc] xl:hidden"
      >
        <Radio size={17} aria-hidden="true" />
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-white bg-[#36d399]" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-[#dde4ef] bg-white shadow-[0_26px_70px_rgba(23,34,66,0.18)]">
          <div className="border-b border-[#edf1f7] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a92a6]">Realtime operations</p>
                <h3 className="mt-1 text-lg font-black text-[#10143f]">Live tenant pulse</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close live feed"
                className="grid h-9 w-9 place-items-center rounded-xl text-[#68748c] transition hover:bg-[#f6f8fd] hover:text-[#10143f]"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <PulseMetric label="Unread" value={summary?.unreadNotifications ?? 0} />
              <PulseMetric label="Approvals" value={summary?.pendingApprovals ?? 0} />
              <PulseMetric label="Outbox" value={summary?.failedOutbox ?? 0} danger />
            </div>
          </div>

          <div className="max-h-[430px] overflow-y-auto p-3">
            {loading ? (
              <div className="grid place-items-center rounded-xl bg-[#fbfcff] p-10 text-[#68748c]">
                <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold">Loading live feed</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-[#ffd5d5] bg-[#fff5f5] p-4">
                <p className="text-sm font-black text-[#b42318]">Live feed unavailable</p>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-[#9b4c4c]">{error}</p>
              </div>
            ) : items.length ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <PulseItem key={item.id} item={item} onOpen={() => setOpen(false)} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-8 text-center">
                <CheckCircle2 className="mx-auto text-[#0f9f72]" size={26} aria-hidden="true" />
                <p className="mt-3 text-sm font-black text-[#10143f]">No new operational activity</p>
                <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
                  The tenant feed is synced and waiting for the next workflow, document, or audit event.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizeRealtimeFeed(value: unknown): RealtimeFeed | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RealtimeFeed>;
  const summary = candidate.summary;

  if (!summary || typeof summary !== "object") {
    return null;
  }

  return {
    serverTime:
      typeof candidate.serverTime === "string"
        ? candidate.serverTime
        : new Date().toISOString(),
    tenantId: typeof candidate.tenantId === "string" ? candidate.tenantId : "",
    summary: {
      unreadNotifications: numberValue(summary.unreadNotifications),
      pendingApprovals: numberValue(summary.pendingApprovals),
      failedOutbox: numberValue(summary.failedOutbox),
      liveItems: numberValue(summary.liveItems),
    },
    items: Array.isArray(candidate.items) ? candidate.items : [],
  };
}

function parseRealtimeFeed(rawData: string) {
  try {
    return normalizeRealtimeFeed(JSON.parse(rawData));
  } catch {
    return null;
  }
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readStreamError(rawData: string) {
  try {
    const parsed = JSON.parse(rawData) as { message?: unknown };
    return typeof parsed.message === "string" ? parsed.message : "Live feed payload was not available.";
  } catch {
    return "Live feed payload was not available.";
  }
}

function PulseMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-2.5">
      <p className="text-[9px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className={`mt-1 text-lg font-black ${danger && value > 0 ? "text-[#b42318]" : "text-[#10143f]"}`}>
        {value}
      </p>
    </div>
  );
}

function PulseItem({ item, onOpen }: { item: RealtimeFeedItem; onOpen: () => void }) {
  const Icon = item.type === "NOTIFICATION" ? Bell : item.type === "ACTIVITY" ? Activity : AlertTriangle;

  return (
    <Link
      href={item.href}
      onClick={onOpen}
      className="group flex gap-3 rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3 transition hover:border-[#cbd5e8] hover:bg-white"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#3820d7]">
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-[#10143f]">{item.title}</span>
        <span className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-[#68748c]">
          {item.description ?? item.type}
        </span>
        <span className="mt-2 block text-[10px] font-bold uppercase text-[#9aa2b3]">
          {item.type} · {new Date(item.createdAt).toLocaleString()}
        </span>
      </span>
      <ArrowRight size={15} className="mt-1 text-[#9aa2b3] transition group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
