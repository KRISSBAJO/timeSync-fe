"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock3, Loader2, LogIn, LogOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import type { AttendanceRecord } from "@/lib/attendance/types";

type PunchType = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

type DashboardTimeClockProps = {
  activeRecord: AttendanceRecord | null;
  scheduledToday: number;
  variant?: "card" | "inline";
};

export function DashboardTimeClock({ activeRecord, scheduledToday, variant = "card" }: DashboardTimeClockProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticRecord, setOptimisticRecord] = useState<{
    record: AttendanceRecord | null;
    sourceKey: string;
  } | null>(null);
  const sourceKey = [
    activeRecord?.id ?? "none",
    activeRecord?.actualClockOutAt ?? "open",
    activeRecord?.breaks?.length ?? 0,
    activeRecord?.breaks?.some((breakEntry) => !breakEntry.endedAt) ? "break" : "work",
  ].join(":");
  const currentRecord = optimisticRecord?.sourceKey === sourceKey ? optimisticRecord.record : activeRecord;
  const activeBreak = currentRecord?.breaks?.find((breakEntry) => !breakEntry.endedAt) ?? null;
  const isClockedIn = Boolean(currentRecord && !currentRecord.actualClockOutAt);
  const isOnBreak = Boolean(activeBreak);
  const nextPunchType: PunchType = !isClockedIn ? "CLOCK_IN" : isOnBreak ? "BREAK_END" : "CLOCK_OUT";
  const actionLabel = nextPunchType === "CLOCK_IN" ? "Clock in" : nextPunchType === "BREAK_END" ? "End break" : "Clock out";
  const statusLabel = !isClockedIn
    ? scheduledToday > 0
      ? `${scheduledToday} shift today`
      : "Ready when you are"
    : isOnBreak
      ? "Break is active"
      : "You are clocked in";
  const toneClass = !isClockedIn ? "bg-[#241ed4]" : isOnBreak ? "bg-[#b76b00]" : "bg-[#10143f]";
  const cardToneClass = !isClockedIn ? "bg-[#3820d7]" : isOnBreak ? "bg-[#b76b00]" : "bg-[#10143f]";
  const ActionIcon = isSubmitting ? Loader2 : nextPunchType === "CLOCK_IN" ? LogIn : nextPunchType === "BREAK_END" ? RotateCcw : LogOut;

  async function submitPunch() {
    setIsSubmitting(true);

    try {
      const response = await apiFetch<{ record: AttendanceRecord | null }>("/attendance/my/punch", {
        method: "POST",
        body: JSON.stringify({
          type: nextPunchType,
          source: "WEB",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      setOptimisticRecord({
        record: normalizePunchedRecord(response.record, nextPunchType),
        sourceKey,
      });
      toast.success(punchSuccess(nextPunchType), {
        description: punchDescription(nextPunchType),
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your punch could not be recorded.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (variant === "inline") {
    return (
      <div className="flex w-full flex-col items-start gap-1.5 sm:items-end">
        <button
          type="button"
          onClick={submitPunch}
          disabled={isSubmitting}
          className={`inline-flex h-11 min-w-[136px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(18,31,67,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${
            toneClass
          }`}
        >
          <ActionIcon size={16} className={isSubmitting ? "animate-spin" : undefined} aria-hidden="true" />
          {isSubmitting ? "Saving" : actionLabel}
        </button>
        <p className="text-[11px] font-black leading-none text-[#10143f]">
          {statusLabel}
        </p>
      </div>
    );
  }

  const wrapperClass = "flex flex-col gap-3 rounded-xl border border-[#dfe8f6] bg-white p-3 shadow-[0_14px_35px_rgba(18,31,67,0.06)] sm:flex-row sm:items-center sm:justify-between";

  return (
    <div className={wrapperClass}>
      <div className="flex items-center gap-3">
        <span className={`grid size-10 place-items-center rounded-xl ${isClockedIn ? "bg-[#e8fbf2] text-[#0f9f72]" : "bg-[#eef3ff] text-[#3820d7]"}`}>
          <Clock3 size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-[#7b849b]">
            Time clock
          </p>
          <p className="mt-0.5 text-sm font-black text-[#10143f]">
            {statusLabel}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={submitPunch}
        disabled={isSubmitting}
        className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(18,31,67,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${
          cardToneClass
        }`}
      >
        <ActionIcon size={16} className={isSubmitting ? "animate-spin" : undefined} aria-hidden="true" />
        {isSubmitting ? "Saving" : actionLabel}
      </button>
    </div>
  );
}

function punchSuccess(type: PunchType) {
  if (type === "CLOCK_IN") return "Clocked in.";
  if (type === "CLOCK_OUT") return "Clocked out.";
  if (type === "BREAK_START") return "Break started.";
  return "Break ended.";
}

function punchDescription(type: PunchType) {
  if (type === "CLOCK_IN") return "Your active work time is now being tracked.";
  if (type === "CLOCK_OUT") return "Your attendance record has been closed.";
  if (type === "BREAK_START") return "Clock-out is locked until the break is ended.";
  return "You can continue work or clock out when the shift is complete.";
}

function normalizePunchedRecord(record: AttendanceRecord | null, type: PunchType) {
  if (type === "CLOCK_OUT" || !record || record.status !== "OPEN") return null;

  if (type === "BREAK_END") {
    return {
      ...record,
      breaks: record.breaks?.map((breakEntry) =>
        breakEntry.endedAt ? breakEntry : { ...breakEntry, endedAt: new Date().toISOString() },
      ),
    };
  }

  return record;
}
