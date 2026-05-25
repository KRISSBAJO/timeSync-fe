import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BellRing,
  CirclePlus,
  Clock3,
  Filter,
  Mail,
  MessageSquareText,
  RadioTower,
  Search,
  ShieldAlert,
} from "lucide-react";

import type {
  NotificationChannel,
  NotificationRecipient,
  NotificationStatus,
  NotificationSummary,
  PaginatedNotificationRecipients,
  PaginatedNotifications,
  PaginatedNotificationTemplates,
} from "@/lib/notifications/types";

type NotificationFilters = {
  search: string;
  channel: string;
  status: string;
  unreadOnly: string;
};

const channels: Array<{ label: string; value: "" | NotificationChannel }> = [
  { label: "All channels", value: "" },
  { label: "In app", value: "IN_APP" },
  { label: "Email", value: "EMAIL" },
  { label: "SMS", value: "SMS" },
  { label: "Push", value: "PUSH" },
];

const statuses: Array<{ label: string; value: "" | NotificationStatus }> = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Sent", value: "SENT" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Read", value: "READ" },
  { label: "Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function NotificationOperationsCenter({
  inbox,
  outbound,
  summary,
  templates,
  preferences,
  filters,
}: {
  inbox: PaginatedNotificationRecipients | null;
  outbound: PaginatedNotifications | null;
  summary: NotificationSummary | null;
  templates: PaginatedNotificationTemplates | null;
  preferences: unknown[] | null;
  filters: NotificationFilters;
}) {
  const inboxRows = inbox?.data ?? [];
  const outboundRows = outbound?.data ?? [];
  const templateRows = templates?.data ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Messaging hub
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <RadioTower size={13} aria-hidden="true" />
                Notification operations
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.45rem,2.4vw,2.2rem)] font-extrabold leading-tight tracking-normal text-[#10143f]">
              Inbox, delivery, templates, preferences, and event-driven alerts.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Govern tenant notification delivery across in-app, email, SMS, and push channels while keeping user preferences and retry risk visible.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <TopAction href="/notifications?panel=create" icon={CirclePlus} label="New Notice" primary />
            <TopAction href="/notifications?unreadOnly=true" icon={BellRing} label="Unread Inbox" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NoticeMetric label="Unread inbox" value={summary?.unreadInbox ?? inboxRows.filter((row) => !row.readAt).length} icon={Bell} tone="blue" />
          <NoticeMetric label="Pending delivery" value={summary?.pendingDelivery ?? 0} icon={Clock3} tone="amber" />
          <NoticeMetric label="Failed delivery" value={summary?.failedDelivery ?? 0} icon={ShieldAlert} tone="red" />
          <NoticeMetric label="Templates" value={templateRows.length} icon={MessageSquareText} tone="violet" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
          <div className="border-b border-[#e5ebf5] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Notification inbox</p>
                <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Current user messages</h3>
              </div>
              <form action="/notifications" className="grid gap-2 sm:grid-cols-[1fr_150px_150px_auto] xl:w-[720px]">
                <label className="flex h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[13px] font-semibold text-[#7b8195]">
                  <Search size={16} aria-hidden="true" />
                  <input
                    name="search"
                    defaultValue={filters.search}
                    placeholder="Search title, body, template"
                    className="min-w-0 flex-1 bg-transparent text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  />
                </label>
                <select name="channel" defaultValue={filters.channel} className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none">
                  {channels.map((channel) => (
                    <option key={channel.value || "all"} value={channel.value}>{channel.label}</option>
                  ))}
                </select>
                <select name="status" defaultValue={filters.status} className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none">
                  {statuses.map((status) => (
                    <option key={status.value || "all"} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white">
                  <Filter size={15} aria-hidden="true" />
                  Apply
                </button>
              </form>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <Link href="/notifications?unreadOnly=true" className="shrink-0 rounded-full border border-[#dfe6f1] bg-white px-3 py-2 text-[11px] font-black text-[#596277] hover:bg-[#f7f9fd]">
                Unread only
              </Link>
              <Link href="/notifications?status=FAILED" className="shrink-0 rounded-full border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-[11px] font-black text-[#b42318]">
                Failed delivery
              </Link>
            </div>
          </div>

          <InboxList rows={inboxRows} />
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
            <p className="text-[11px] font-extrabold uppercase text-white/58">Outbound delivery</p>
            <h3 className="mt-2 text-lg font-extrabold">{outboundRows.length} recent notifications</h3>
            <div className="mt-5 space-y-3">
              {outboundRows.length > 0 ? (
                outboundRows.slice(0, 6).map((notification) => (
                  <div key={notification.id} className="rounded-lg border border-white/10 bg-white/8 p-4">
                    <p className="truncate text-sm font-black">{notification.title}</p>
                    <p className="mt-1 truncate text-[12px] font-semibold text-white/58">
                      {humanize(notification.channel)} · {humanize(notification.status)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-white/64">No outbound notifications returned yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Channel mix</p>
            <div className="mt-4 space-y-2">
              {channels.slice(1).map((channel) => {
                const channelValue = channel.value as NotificationChannel;

                return (
                <div key={channelValue} className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                  <span className="text-[12px] font-black text-[#4d566d]">{channel.label}</span>
                  <span className="text-sm font-black text-[#121a46]">{summary?.byChannel[channelValue] ?? 0}</span>
                </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Template and preference control</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniFact label="Templates" value={templateRows.length} />
              <MiniFact label="Preferences" value={preferences?.length ?? 0} />
              <MiniFact label="Sent" value={summary?.byStatus.SENT ?? 0} />
              <MiniFact label="Delivered" value={summary?.byStatus.DELIVERED ?? 0} />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function InboxList({ rows }: { rows: NotificationRecipient[] }) {
  if (rows.length === 0) {
    return (
      <div className="grid min-h-[340px] place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#eef5ff] text-[#2f6eea]">
            <Bell size={30} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-extrabold text-[#121a46]">No notifications found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
            Event-driven workforce alerts, approvals, and compliance messages will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#edf1f7]">
      {rows.map((recipient) => (
        <div key={recipient.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${recipient.readAt ? "bg-[#f3f4f8] text-[#596277]" : "bg-[#eef5ff] text-[#2f6eea]"}`}>
                {recipient.notification?.channel === "EMAIL" ? <Mail size={17} aria-hidden="true" /> : <Bell size={17} aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#151936]">{recipient.notification?.title ?? "Notification"}</p>
                <p className="mt-0.5 truncate text-[12px] font-semibold text-[#7a8297]">{recipient.notification?.body ?? recipient.destination ?? "No body"}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(recipient.status)}`}>{humanize(recipient.status)}</span>
            <span className="text-[12px] font-bold text-[#8a92a6]">{formatDate(recipient.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NoticeMetric({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: LucideIcon; tone: "blue" | "amber" | "red" | "violet" }) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    amber: "bg-[#fff4db] text-[#d97706]",
    red: "bg-[#fff5f5] text-[#b42318]",
    violet: "bg-[#f1ebff] text-[#7c3aed]",
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

function TopAction({ href, icon: Icon, label, primary = false }: { href: string; icon: LucideIcon; label: string; primary?: boolean }) {
  return (
    <Link href={href} className={primary ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white! shadow-[0_12px_26px_rgba(56,32,215,0.18)]" : "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d]"}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </Link>
  );
}

function MiniFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[#f8fbff] p-3">
      <p className="text-[10px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#121a46]">{value}</p>
    </div>
  );
}

function statusClass(status: NotificationStatus) {
  const classes: Record<NotificationStatus, string> = {
    PENDING: "bg-[#fff4db] text-[#b66b00]",
    SENT: "bg-[#eef5ff] text-[#2f6eea]",
    DELIVERED: "bg-[#eaf9f2] text-[#0f8f66]",
    READ: "bg-[#f3f4f8] text-[#596277]",
    FAILED: "bg-[#fff5f5] text-[#b42318]",
    CANCELLED: "bg-[#f3f4f8] text-[#596277]",
  };
  return classes[status];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function humanize(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
