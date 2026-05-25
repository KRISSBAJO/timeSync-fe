import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  FileClock,
  Filter,
  History,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { OutboxActionPanel } from "@/components/history/outbox-action-panel";
import type {
  AuditLog,
  OutboxStatus,
  OutboxSummary,
  PaginatedActivityLogs,
  PaginatedAuditLogs,
  PaginatedOutboxMessages,
  PaginatedTimelineEvents,
} from "@/lib/history/types";

type GovernanceFilters = {
  search: string;
  module: string;
  outboxStatus: string;
};

const outboxStatuses: Array<{ label: string; value: "" | OutboxStatus }> = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function GovernanceOperationsCenter({
  auditLogs,
  activityLogs,
  timelineEvents,
  outboxMessages,
  outboxSummary,
  filters,
}: {
  auditLogs: PaginatedAuditLogs | null;
  activityLogs: PaginatedActivityLogs | null;
  timelineEvents: PaginatedTimelineEvents | null;
  outboxMessages: PaginatedOutboxMessages | null;
  outboxSummary: OutboxSummary | null;
  filters: GovernanceFilters;
}) {
  const auditRows = auditLogs?.data ?? [];
  const activityRows = activityLogs?.data ?? [];
  const timelineRows = timelineEvents?.data ?? [];
  const outboxRows = outboxMessages?.data ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Governance trail
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <ShieldCheck size={13} aria-hidden="true" />
                Governance history
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.45rem,2.4vw,2.2rem)] font-extrabold leading-tight tracking-normal text-[#10143f]">
              Immutable auditability, activity intelligence, timeline history, and outbox reliability.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Inspect who changed what, track operational activity, follow workforce events, and monitor event-driven publishing health.
            </p>
          </div>
          <form action="/audit" className="grid gap-2 sm:grid-cols-[1fr_150px_160px_auto] xl:w-[720px]">
            <label className="flex h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[13px] font-semibold text-[#7b8195]">
              <Search size={16} aria-hidden="true" />
              <input
                name="search"
                defaultValue={filters.search}
                placeholder="Search governance history"
                className="min-w-0 flex-1 bg-transparent text-[#151936] outline-none placeholder:text-[#9ba2b5]"
              />
            </label>
            <input
              name="module"
              defaultValue={filters.module}
              placeholder="Module"
              className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none placeholder:text-[#9ba2b5]"
            />
            <select
              name="outboxStatus"
              defaultValue={filters.outboxStatus}
              className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
            >
              {outboxStatuses.map((status) => (
                <option key={status.value || "all"} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white">
              <Filter size={15} aria-hidden="true" />
              Apply
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <GovMetric label="Audit logs" value={auditRows.length} icon={ShieldCheck} tone="blue" />
          <GovMetric label="Activity records" value={activityRows.length} icon={Activity} tone="green" />
          <GovMetric label="Timeline events" value={timelineRows.length} icon={History} tone="violet" />
          <GovMetric label="Overdue outbox" value={outboxSummary?.overdue ?? 0} icon={AlertTriangle} tone="red" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <div className="border-b border-[#e5ebf5] p-5">
              <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Audit explorer</p>
              <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Security and domain changes</h3>
            </div>
            <AuditTable rows={auditRows} />
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Workforce timeline</p>
                <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Event history stream</h3>
              </div>
              <Link href="/audit?stream=timeline" className="text-[12px] font-black text-[#3820d7]">View timeline</Link>
            </div>
            <div className="mt-4 grid gap-3">
              {timelineRows.length > 0 ? (
                timelineRows.slice(0, 6).map((event) => (
                  <div key={event.id} className="flex gap-3 rounded-xl bg-[#f8fbff] p-4">
                    <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
                      <FileClock size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#151936]">{event.title}</p>
                      <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
                        {humanize(event.type)} · {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-[#f8fbff] p-4 text-sm leading-6 text-[#68748c]">No timeline events returned.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
            <p className="text-[11px] font-extrabold uppercase text-white/58">Outbox reliability</p>
            <h3 className="mt-2 text-lg font-extrabold">{outboxRows.length} event messages</h3>
            <div className="mt-4">
              <OutboxActionPanel messages={outboxRows} />
            </div>
            <div className="mt-5 space-y-3">
              {outboxRows.length > 0 ? (
                outboxRows.slice(0, 7).map((message) => (
                  <div key={message.id} className="rounded-lg border border-white/10 bg-white/8 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black">{message.eventType}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${outboxStatusClass(message.status)}`}>
                        {humanize(message.status)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[12px] font-semibold text-white/58">
                      {message.aggregateType} · attempts {message.attempts}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-white/64">No outbox messages returned.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Outbox status mix</p>
            <div className="mt-4 space-y-2">
              {outboxStatuses.slice(1).map((status) => {
                const statusValue = status.value as OutboxStatus;

                return (
                <div key={statusValue} className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                  <span className="text-[12px] font-black text-[#4d566d]">{status.label}</span>
                  <span className="text-sm font-black text-[#121a46]">{outboxSummary?.byStatus[statusValue] ?? 0}</span>
                </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Activity stream</p>
            <div className="mt-4 space-y-2">
              {activityRows.length > 0 ? (
                activityRows.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="rounded-lg bg-[#f8fbff] px-3 py-3">
                    <p className="truncate text-sm font-black text-[#151936]">{activity.message}</p>
                    <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
                      {activity.module} · {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#68748c]">No activity records returned.</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function AuditTable({ rows }: { rows: AuditLog[] }) {
  if (rows.length === 0) {
    return (
      <div className="grid min-h-[320px] place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#eef5ff] text-[#2f6eea]">
            <ShieldCheck size={30} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-extrabold text-[#121a46]">No audit records found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
            Audit records will appear as users change data, process approvals, manage tenants, and operate event systems.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#8a92a6]">
            <th className="border-b border-[#e5ebf5] px-5 py-3">Action</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Entity</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Actor</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Module</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3 text-right">Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((log) => (
            <tr key={log.id}>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[10px] font-black uppercase text-[#2f6eea]">
                  {humanize(log.action)}
                </span>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <p className="truncate text-sm font-black text-[#151936]">{log.entityType}</p>
                <p className="mt-1 truncate text-[12px] font-semibold text-[#7a8297]">{log.entityId ?? "No entity id"}</p>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                <span className="inline-flex items-center gap-2">
                  <UserRound size={15} aria-hidden="true" />
                  {displayUser(log.actor)}
                </span>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">{log.module}</td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-right text-sm font-bold text-[#4d566d]">
                {formatDateTime(log.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GovMetric({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: LucideIcon; tone: "blue" | "green" | "violet" | "red" }) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    green: "bg-[#eaf9f2] text-[#0f9f72]",
    violet: "bg-[#f1ebff] text-[#7c3aed]",
    red: "bg-[#fff5f5] text-[#b42318]",
  }[tone];
  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
          <p className="mt-3 text-2xl font-extrabold text-[#121a46]">{value}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-lg ${toneClass}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function outboxStatusClass(status: OutboxStatus) {
  const classes: Record<OutboxStatus, string> = {
    PENDING: "bg-[#fff4db] text-[#b66b00]",
    PROCESSING: "bg-[#eef5ff] text-[#2f6eea]",
    PUBLISHED: "bg-[#eaf9f2] text-[#0f8f66]",
    FAILED: "bg-[#fff5f5] text-[#b42318]",
    CANCELLED: "bg-[#f3f4f8] text-[#596277]",
  };
  return classes[status];
}

function displayUser(user?: { email: string; username?: string | null } | null) {
  return user?.username ?? user?.email?.split("@")[0] ?? "System";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function humanize(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
