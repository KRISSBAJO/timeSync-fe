"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, Loader2, RadioTower, RotateCcw } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { OutboxMessage } from "@/lib/history/types";

export function OutboxActionPanel({ messages }: { messages: OutboxMessage[] }) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const actionableMessages = messages.filter((item) => item.status === "PENDING" || item.status === "FAILED").slice(0, 4);

  async function processDueOutbox() {
    setProcessing(true);
    setMessage(null);

    try {
      const result = await apiFetch<{ processed: number; published: number; failed: number }>("/outbox/messages/process", {
        method: "POST",
        body: JSON.stringify({
          limit: 25,
          maxAttempts: 8,
          headers: {
            source: "governance_operations_center",
          },
        }),
      });
      setMessage(`Processed ${result.processed}; published ${result.published}; failed ${result.failed}.`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not process the outbox.");
    } finally {
      setProcessing(false);
    }
  }

  async function broadcast(messageId: string) {
    setBroadcastingId(messageId);
    setMessage(null);

    try {
      const result = await apiFetch<{ recipientCount: number }>(`/outbox/messages/${messageId}/broadcast`, {
        method: "POST",
      });
      setMessage(`Broadcast sent to ${result.recipientCount} steward${result.recipientCount === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not broadcast this event.");
    } finally {
      setBroadcastingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/8 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/50">Operator controls</p>
          <h4 className="mt-1 text-sm font-black text-white">Process and broadcast events</h4>
        </div>
        <button
          type="button"
          onClick={processDueOutbox}
          disabled={processing}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-[#11143a] transition hover:bg-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RadioTower size={14} aria-hidden="true" />}
          Process
        </button>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-bold leading-5 text-white/72">{message}</p>
      ) : null}

      <div className="mt-3 space-y-2">
        {actionableMessages.length > 0 ? (
          actionableMessages.map((item) => (
            <div key={item.id} className="rounded-lg bg-[#252846] p-3">
              <p className="truncate text-[12px] font-black text-white">{item.eventType}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase text-white/42">{item.status}</span>
                <button
                  type="button"
                  onClick={() => broadcast(item.id)}
                  disabled={broadcastingId === item.id}
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/12 bg-white/8 px-3 text-[10px] font-black text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {broadcastingId === item.id ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : item.status === "FAILED" ? <RotateCcw size={13} aria-hidden="true" /> : <BellRing size={13} aria-hidden="true" />}
                  Broadcast
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-white/8 p-3 text-[12px] font-semibold leading-5 text-white/58">
            No pending or failed outbox events need broadcast right now.
          </p>
        )}
      </div>
    </section>
  );
}
