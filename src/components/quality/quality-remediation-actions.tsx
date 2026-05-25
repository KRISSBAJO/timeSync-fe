"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { DataQualityIssue } from "@/lib/quality/types";

export function QualityRemediationActions({ issue }: { issue: DataQualityIssue }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"MARK_REVIEWED" | "NOTIFY_STEWARDS" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(action: "MARK_REVIEWED" | "NOTIFY_STEWARDS") {
    setPendingAction(action);
    setMessage(null);

    try {
      const result = await apiFetch<{ status: string; recipientCount?: number }>("/dashboard/data-quality/actions", {
        method: "POST",
        body: JSON.stringify({
          action,
          issueId: issue.id,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          entityType: issue.entityType,
          entityId: issue.entityId,
          href: issue.href,
        }),
      });

      setMessage(
        action === "NOTIFY_STEWARDS"
          ? `Stewards notified${typeof result.recipientCount === "number" ? ` (${result.recipientCount})` : ""}.`
          : "Review logged.",
      );
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not record remediation action.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="mt-3 border-t border-[#edf1f7] pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => submit("MARK_REVIEWED")}
          disabled={pendingAction !== null}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dfe8f6] bg-white px-3 text-[10px] font-black text-[#4d566d] transition hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingAction === "MARK_REVIEWED" ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={13} aria-hidden="true" />}
          Log review
        </button>
        <button
          type="button"
          onClick={() => submit("NOTIFY_STEWARDS")}
          disabled={pendingAction !== null}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#3820d7] px-3 text-[10px] font-black text-white shadow-[0_10px_22px_rgba(56,32,215,0.18)] transition hover:bg-[#2e1bb8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingAction === "NOTIFY_STEWARDS" ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <BellRing size={13} aria-hidden="true" />}
          Notify stewards
        </button>
      </div>
      {message ? <p className="mt-2 text-[11px] font-bold leading-5 text-[#68748c]">{message}</p> : null}
    </div>
  );
}
