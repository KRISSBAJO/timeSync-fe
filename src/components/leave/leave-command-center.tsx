"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Filter,
  GitPullRequestArrow,
  Hourglass,
  Layers3,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import type { AuthSession } from "@/lib/api/types";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type {
  LeaveApprovalRule,
  LeaveBalance,
  LeaveBlackoutWindow,
  LeaveCalendar,
  LeaveCalendarDay,
  LeaveCalendarView,
  LeavePageFilters,
  LeavePolicy,
  LeaveReports,
  LeaveRequest,
  LeaveSummary,
  LeaveType,
  MyLeaveWorkspace,
  PaginatedLeave,
} from "@/lib/leave/types";
import type { ScheduleEmployee } from "@/lib/scheduling/types";

type LeaveTab = "overview" | "request" | "balances" | "approvals" | "calendar" | "reports" | "policies";

type LeaveCommandCenterProps = {
  session: AuthSession;
  summary: LeaveSummary | null;
  myLeave: MyLeaveWorkspace | null;
  requests: PaginatedLeave<LeaveRequest> | null;
  balances: PaginatedLeave<LeaveBalance> | null;
  types: LeaveType[];
  policies: LeavePolicy[];
  approvalRules: LeaveApprovalRule[];
  calendars: LeaveCalendar[];
  calendarView: LeaveCalendarView | null;
  reports: LeaveReports | null;
  employees: ScheduleEmployee[];
  filters: LeavePageFilters;
  initialTab: LeaveTab;
};

const tabs: Array<{
  key: LeaveTab;
  label: string;
  description: string;
  icon: LucideIcon;
  permissions: string[];
}> = [
  { key: "overview", label: "Overview", description: "Balances and request state", icon: CalendarCheck2, permissions: ["leave.self"] },
  { key: "request", label: "Request leave", description: "Submit time off", icon: GitPullRequestArrow, permissions: ["leave.self"] },
  { key: "balances", label: "Balances", description: "Ledger-backed balances", icon: Banknote, permissions: ["leave.self"] },
  { key: "approvals", label: "Approvals", description: "Manager and HR queue", icon: ClipboardCheck, permissions: ["leave.approve", "leave.team.write", "leave.team.read"] },
  { key: "calendar", label: "Calendar", description: "Holidays and blackout windows", icon: CalendarDays, permissions: ["leave.self"] },
  { key: "reports", label: "Reports", description: "Liability and coverage risk", icon: BarChart3, permissions: ["leave.reports.read"] },
  { key: "policies", label: "Policies", description: "Types, rules, templates", icon: ShieldCheck, permissions: ["leave.policy.write"] },
];

const tabTones = [
  { card: "from-emerald-50 to-white border-emerald-100 text-emerald-700", icon: "bg-emerald-600 text-white" },
  { card: "from-sky-50 to-white border-sky-100 text-sky-700", icon: "bg-sky-600 text-white" },
  { card: "from-violet-50 to-white border-violet-100 text-violet-700", icon: "bg-violet-600 text-white" },
  { card: "from-amber-50 to-white border-amber-100 text-amber-700", icon: "bg-amber-500 text-white" },
  { card: "from-rose-50 to-white border-rose-100 text-rose-700", icon: "bg-rose-500 text-white" },
];

function tabTone(index: number, active: boolean) {
  const tone = tabTones[index % tabTones.length];
  if (active) {
    return {
      card: `border-[#4b22e8] bg-gradient-to-br ${tone.card} shadow-[0_16px_34px_rgba(75,34,232,0.14)]`,
      icon: tone.icon,
    };
  }
  return {
    card: "border-transparent bg-[#f7f9fd] hover:border-[#dfe8f6] hover:bg-white",
    icon: "bg-white text-[#68748c]",
  };
}

export function LeaveCommandCenter({
  session,
  summary,
  myLeave,
  requests,
  balances,
  types,
  policies,
  approvalRules,
  calendars,
  calendarView,
  reports,
  employees,
  filters,
  initialTab,
}: LeaveCommandCenterProps) {
  const router = useRouter();
  const tabRailRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<LeaveTab>(initialTab);
  const [, startTransition] = useTransition();
  const permissions = summary?.permissions ?? {
    selfLeave: hasAnyPermission(session.user, ["leave.self"]),
    teamLeave: hasAnyPermission(session.user, ["leave.team.read", "leave.team.write"]),
    manageLeave: hasAnyPermission(session.user, ["leave.team.write"]),
    approveLeave: hasAnyPermission(session.user, ["leave.approve"]),
    managePolicies: hasAnyPermission(session.user, ["leave.policy.write"]),
    readReports: hasAnyPermission(session.user, ["leave.reports.read"]),
  };
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => hasAnyPermission(session.user, tab.permissions)),
    [session.user],
  );
  const currentTab = visibleTabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : visibleTabs[0]?.key ?? "overview";
  const requestRows = requests?.data ?? myLeave?.requests ?? [];
  const balanceRows = balances?.data ?? myLeave?.balances ?? [];
  const pendingRows = requestRows.filter((request) => request.status === "PENDING_APPROVAL");
  const primaryPolicy = policies.find((policy) => policy.status === "ACTIVE") ?? policies[0] ?? null;

  function refresh() {
    startTransition(() => router.refresh());
  }

  function changeTab(tab: LeaveTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/leave?${params.toString()}`, { scroll: false });
  }

  function scrollTabRail(direction: "left" | "right") {
    tabRailRef.current?.scrollBy({ left: direction === "left" ? -360 : 360, behavior: "smooth" });
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-[0_18px_55px_rgba(18,31,67,0.07)] backdrop-blur-xl">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(20,184,166,0.10),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(124,58,237,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,251,255,0.78))]" />
          <div className="relative grid gap-4 p-4 xl:grid-cols-[1fr_300px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill icon={CalendarClock} label="Leave command center" />
                <Pill icon={Sparkles} label="Workflow-backed approvals" />
              </div>
              <h1 className="mt-3 max-w-3xl text-2xl font-black leading-tight text-[#11143a] md:text-3xl">
                Govern leave balances, policy rules, and multi-step approvals in one place.
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#65708a]">
                {permissions.managePolicies
                  ? "Configure leave types, ledger-backed balances, policy rules, and organization-adopted workflow templates."
                  : permissions.teamLeave
                    ? "Review team requests, watch coverage-sensitive approvals, and keep leave decisions attached to workflow history."
                    : "Submit leave, track your approval timeline, and see exactly how balances move."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniMetric label="Pending" value={summary?.metrics.pendingRequests ?? pendingRows.length} icon={Hourglass} tone="amber" />
                <MiniMetric label="Upcoming" value={summary?.metrics.approvedUpcoming ?? 0} icon={CalendarCheck2} tone="green" />
                <MiniMetric label="Active types" value={summary?.metrics.activeTypes ?? types.length} icon={Layers3} tone="blue" />
                <MiniMetric label="Balances" value={summary?.metrics.balanceRows ?? balanceRows.length} icon={Banknote} tone="purple" />
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-[#11143a] p-4 text-white shadow-[0_18px_42px_rgba(17,20,58,0.18)]">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/55">Active policy</p>
              <h2 className="mt-2 text-xl font-black leading-tight">{primaryPolicy?.name ?? "Leave policy setup"}</h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/58">
                {primaryPolicy
                  ? "Requests use policy limits, balance checks, and workflow adoption rules before they enter approval."
                  : "Create leave types and policies before employees submit governed requests."}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <CompactDarkStat label="Annual" value={formatHours(primaryPolicy?.annualAllowanceMinutes ?? 0)} />
                <CompactDarkStat label="Min" value={formatHours(primaryPolicy?.minimumRequestMinutes ?? 0)} />
                <CompactDarkStat label="Approval" value={primaryPolicy?.requiresApproval === false ? "auto" : "workflow"} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-[0_18px_45px_rgba(18,31,67,0.05)] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-[#edf1f7]/90 bg-white/55 p-2">
          <button
            type="button"
            onClick={() => scrollTabRail("left")}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] transition hover:border-[#4b22e8] hover:text-[#4b22e8]"
            aria-label="Scroll leave tabs left"
          >
            <ChevronLeft size={17} />
          </button>
          <div ref={tabRailRef} role="tablist" aria-label="Leave sections" className="flex flex-1 gap-2 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleTabs.map((tab, index) => {
              const Icon = tab.icon;
              const active = currentTab === tab.key;
              const tone = tabTone(index, active);
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeTab(tab.key)}
                  className={`flex min-w-[178px] max-w-[205px] shrink-0 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${tone.card}`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm ${tone.icon}`}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#11143a]">{tab.label}</span>
                    <span className="block truncate text-xs font-semibold text-[#74809a]">{tab.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => scrollTabRail("right")}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] transition hover:border-[#4b22e8] hover:text-[#4b22e8]"
            aria-label="Scroll leave tabs right"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        <LeaveFilterBar
          filters={filters}
          types={types}
          calendars={calendars}
          employees={employees}
          canFilterTeam={permissions.teamLeave || permissions.manageLeave || permissions.approveLeave}
        />

        <div className="p-5">
          {currentTab === "overview" ? (
            <OverviewPanel balances={balanceRows} requests={requestRows} />
          ) : null}
          {currentTab === "request" ? (
            <RequestPanel
              types={types}
              calendars={calendars}
              employees={employees}
              canRequestForTeam={permissions.manageLeave}
              onSubmitted={refresh}
            />
          ) : null}
          {currentTab === "balances" ? (
            <BalancesPanel
              balances={balanceRows}
              requests={requestRows}
              types={types}
              employees={employees}
              canAdjust={permissions.manageLeave}
              onAdjusted={refresh}
            />
          ) : null}
          {currentTab === "approvals" ? (
            <ApprovalsPanel requests={pendingRows} canApprove={permissions.approveLeave || permissions.manageLeave} onDecision={refresh} />
          ) : null}
          {currentTab === "calendar" ? (
            <CalendarPanel
              calendars={calendars}
              calendarView={calendarView}
              types={types}
              canManage={permissions.managePolicies}
              onSaved={refresh}
            />
          ) : null}
          {currentTab === "reports" ? (
            <ReportsPanel reports={reports} />
          ) : null}
          {currentTab === "policies" ? (
            <PoliciesPanel types={types} policies={policies} approvalRules={approvalRules} canManage={permissions.managePolicies} onSaved={refresh} />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function LeaveFilterBar({
  filters,
  types,
  calendars,
  employees,
  canFilterTeam,
}: {
  filters: LeavePageFilters;
  types: LeaveType[];
  calendars: LeaveCalendar[];
  employees: ScheduleEmployee[];
  canFilterTeam: boolean;
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    if (filters.tab) params.set("tab", filters.tab);

    for (const key of ["from", "to", "employeeId", "employeeSearch", "leaveTypeId", "status", "calendarId"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }

    router.replace(`/leave?${params.toString()}`, { scroll: false });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 border-b border-[#edf1f7] bg-[#fbfcff]/80 p-4 md:grid-cols-2 xl:grid-cols-8">
      {canFilterTeam ? (
        <Field label="Employee">
          <select name="employeeId" defaultValue={filters.employeeId ?? ""} className="form-field">
            <option value="">All visible</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>
            ))}
          </select>
        </Field>
      ) : null}
      {canFilterTeam ? (
        <Field label="Search">
          <input name="employeeSearch" defaultValue={filters.employeeSearch ?? ""} className="form-field" placeholder="Name or number" />
        </Field>
      ) : null}
      <Field label="From">
        <input name="from" type="date" defaultValue={dateInput(filters.from)} className="form-field" />
      </Field>
      <Field label="To">
        <input name="to" type="date" defaultValue={dateInput(filters.to)} className="form-field" />
      </Field>
      <Field label="Leave type">
        <select name="leaveTypeId" defaultValue={filters.leaveTypeId ?? ""} className="form-field">
          <option value="">All types</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={filters.status ?? ""} className="form-field">
          <option value="">All statuses</option>
          {["PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED", "WITHDRAWN", "TAKEN"].map((status) => (
            <option key={status} value={status}>{humanize(status)}</option>
          ))}
        </select>
      </Field>
      <Field label="Calendar">
        <select name="calendarId" defaultValue={filters.calendarId ?? ""} className="form-field">
          <option value="">All calendars</option>
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>{calendar.name}</option>
          ))}
        </select>
      </Field>
      <button type="submit" className="primary-action self-end">
        <Filter size={17} />
        Apply
      </button>
    </form>
  );
}

function OverviewPanel({ balances, requests }: { balances: LeaveBalance[]; requests: LeaveRequest[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {balances.slice(0, 4).map((balance) => (
          <InfoCard
            key={balance.id}
            eyebrow={balance.leaveType?.code ?? "Leave"}
            title={`${formatHours(balance.balanceMinutes - balance.pendingMinutes)} available`}
            body={`${formatHours(balance.balanceMinutes)} current, ${formatHours(balance.pendingMinutes)} pending, ${formatHours(balance.usedMinutes)} used.`}
            icon={Banknote}
          />
        ))}
        {balances.length === 0 ? (
          <InfoCard eyebrow="Balances" title="No balances yet" body="HR can seed opening balances from the Balances tab." icon={Banknote} />
        ) : null}
      </div>
      <LeaveRequestsTable
        title="My leave requests"
        eyebrow="Leave history"
        description="Every request is listed with dates, status, business time, workflow route, and coverage risk."
        requests={requests}
        emptyTitle="No leave requests visible"
        emptyBody="Submitted leave requests will appear here for employees, managers, and HR."
      />
    </div>
  );
}

function RequestPanel({
  types,
  calendars,
  employees,
  canRequestForTeam,
  onSubmitted,
}: {
  types: LeaveType[];
  calendars: LeaveCalendar[];
  employees: ScheduleEmployee[];
  canRequestForTeam: boolean;
  onSubmitted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const startAt = String(formData.get("startAt") ?? "");
    const endAt = String(formData.get("endAt") ?? startAt);
    const requestedMinutes = numberValue(formData.get("requestedMinutes")) ?? 480;
    setSubmitting(true);
    try {
      await apiFetch("/leave/requests", {
        method: "POST",
        body: JSON.stringify({
          employeeId: valueOrUndefined(formData.get("employeeId")),
          leaveTypeId: String(formData.get("leaveTypeId") ?? ""),
          calendarId: valueOrUndefined(formData.get("calendarId")),
          startAt: toIsoFromLocal(startAt),
          endAt: toIsoFromLocal(endAt),
          requestedMinutes,
          reason: String(formData.get("reason") ?? ""),
          notes: valueOrUndefined(formData.get("notes")),
          supportingDocumentUrl: valueOrUndefined(formData.get("supportingDocumentUrl")),
        }),
      });
      toast.success("Leave request submitted.", { description: "The workflow engine has picked the matching approval route." });
      event.currentTarget.reset();
      onSubmitted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Leave request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-[#dfe8f6] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Request leave</p>
          <h2 className="mt-1 text-xl font-black text-[#11143a]">Submit into adopted workflow template</h2>
        </div>
        <button type="submit" disabled={submitting || types.length === 0} className="primary-action w-auto px-5">
          <GitPullRequestArrow size={17} />
          {submitting ? "Submitting" : "Submit request"}
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {canRequestForTeam ? (
          <Field label="Employee">
            <select name="employeeId" className="form-field">
              <option value="">My employee record</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Leave type">
          <select name="leaveTypeId" className="form-field" required>
            <option value="">Select type</option>
            {types.filter((type) => type.status === "ACTIVE").map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Calendar">
          <select name="calendarId" className="form-field">
            <option value="">Auto match</option>
            {calendars.filter((calendar) => calendar.status === "ACTIVE").map((calendar) => (
              <option key={calendar.id} value={calendar.id}>{calendar.name}{calendar.isDefault ? " (default)" : ""}</option>
            ))}
          </select>
        </Field>
        <Field label="Start"><input name="startAt" type="datetime-local" className="form-field" required /></Field>
        <Field label="End"><input name="endAt" type="datetime-local" className="form-field" required /></Field>
        <Field label="Minutes"><input name="requestedMinutes" type="number" min="1" className="form-field" defaultValue="480" required /></Field>
        <Field label="Evidence URL"><input name="supportingDocumentUrl" className="form-field" placeholder="https://..." /></Field>
        <div className="md:col-span-2">
          <Field label="Reason"><input name="reason" className="form-field" placeholder="Brief reason" required /></Field>
        </div>
        <div className="md:col-span-2 xl:col-span-4">
          <Field label="Notes"><textarea name="notes" className="form-field min-h-24 py-3" placeholder="Optional handover or context" /></Field>
        </div>
      </div>
    </form>
  );
}

function BalancesPanel({
  balances,
  requests,
  types,
  employees,
  canAdjust,
  onAdjusted,
}: {
  balances: LeaveBalance[];
  requests: LeaveRequest[];
  types: LeaveType[];
  employees: ScheduleEmployee[];
  canAdjust: boolean;
  onAdjusted: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await apiFetch("/leave/balances/adjust", {
        method: "POST",
        body: JSON.stringify({
          employeeId: String(formData.get("employeeId") ?? ""),
          leaveTypeId: String(formData.get("leaveTypeId") ?? ""),
          minutes: numberValue(formData.get("minutes")) ?? 0,
          reason: String(formData.get("reason") ?? ""),
        }),
      });
      toast.success("Leave balance adjusted.", { description: "A ledger entry was created for the adjustment." });
      event.currentTarget.reset();
      onAdjusted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Leave balance could not be adjusted.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {canAdjust ? (
        <form onSubmit={onSubmit} className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <Field label="Employee">
              <select name="employeeId" className="form-field" required>
                <option value="">Select employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
              </select>
            </Field>
            <Field label="Leave type">
              <select name="leaveTypeId" className="form-field" required>
                <option value="">Select type</option>
                {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
            </Field>
            <Field label="Minutes"><input name="minutes" type="number" className="form-field" defaultValue="480" required /></Field>
            <Field label="Reason"><input name="reason" className="form-field" placeholder="Opening balance" required /></Field>
            <button type="submit" disabled={saving} className="primary-action mt-5 h-10">
              <Banknote size={16} />
              {saving ? "Saving" : "Adjust"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {balances.map((balance) => (
          <section key={balance.id} className="rounded-2xl border border-[#dfe8f6] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#11143a]">{employeeLabel(balance.employee)}</p>
                <p className="mt-1 text-xs font-bold text-[#74809a]">{balance.leaveType?.name ?? "Leave"}</p>
              </div>
              <StatusBadge status={`${formatHours(balance.balanceMinutes - balance.pendingMinutes)} available`} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricPill label="Current" value={formatHours(balance.balanceMinutes)} />
              <MetricPill label="Pending" value={formatHours(balance.pendingMinutes)} />
              <MetricPill label="Used" value={formatHours(balance.usedMinutes)} />
            </div>
          </section>
        ))}
        {balances.length === 0 ? <EmptyInline text="No leave balances match this view." /> : null}
      </div>
      {requests.length > 0 ? null : null}
    </div>
  );
}

function ApprovalsPanel({
  requests,
  canApprove,
  onDecision,
}: {
  requests: LeaveRequest[];
  canApprove: boolean;
  onDecision: () => void;
}) {
  const [decisionState, setDecisionState] = useState<{ request: LeaveRequest; decision: "approve" | "reject" } | null>(null);

  return (
    <div className="space-y-3">
      <LeaveRequestsTable
        title="Pending approvals"
        eyebrow="Workflow queue"
        description="Review pending leave requests with workflow steps, balance impact, and coverage risk before deciding."
        requests={requests}
        emptyTitle="No pending leave approvals"
        emptyBody="Requests waiting on manager or HR action will appear here."
        actions={canApprove ? (request) => (
          <div className="flex flex-wrap gap-2">
            <SmallButton onClick={() => setDecisionState({ request, decision: "approve" })} tone="success"><CheckCircle2 size={15} />Approve</SmallButton>
            <SmallButton onClick={() => setDecisionState({ request, decision: "reject" })} tone="danger"><XCircle size={15} />Reject</SmallButton>
          </div>
        ) : undefined}
      />
      {decisionState ? (
        <LeaveDecisionModal
          request={decisionState.request}
          decision={decisionState.decision}
          onClose={() => setDecisionState(null)}
          onSaved={() => {
            setDecisionState(null);
            onDecision();
          }}
        />
      ) : null}
    </div>
  );
}

function CalendarPanel({
  calendars,
  calendarView,
  types,
  canManage,
  onSaved,
}: {
  calendars: LeaveCalendar[];
  calendarView: LeaveCalendarView | null;
  types: LeaveType[];
  canManage: boolean;
  onSaved: () => void;
}) {
  const days = calendarView?.days ?? [];
  const blackoutWindows = calendarView?.blackoutWindows ?? [];
  const requests = calendarView?.requests ?? [];
  const defaultCalendar = calendars.find((calendar) => calendar.isDefault) ?? calendars[0] ?? null;

  async function submit(path: string, payload: Record<string, unknown>, form: HTMLFormElement) {
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify(payload) });
      toast.success("Leave calendar saved.");
      form.reset();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Leave calendar update failed.");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_410px]">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoCard eyebrow="Calendars" title={`${calendars.length} configured`} body={`${defaultCalendar?.name ?? "No default calendar"} controls auto-matched requests.`} icon={CalendarDays} />
          <InfoCard eyebrow="Blackouts" title={`${blackoutWindows.length} windows`} body="Blocking and warning windows are evaluated before requests enter approval." icon={ShieldAlert} />
          <InfoCard eyebrow="Coverage" title={`${requests.filter((request) => coverageRisk(request) !== "LOW").length} risks`} body="Requests carry a coverage snapshot for managers and HR." icon={AlertTriangle} />
        </div>

        <CalendarDaysTable days={days} />

        <BlackoutWindowsTable blackoutWindows={blackoutWindows} />

        <LeaveRequestsTable
          title="Calendar events"
          eyebrow="Approved and pending leave"
          description="Active requests in this date range, including coverage risk and business minutes."
          requests={requests}
          emptyTitle="No active leave requests"
          emptyBody="Approved, pending, and submitted requests in the selected range will appear here."
        />
      </div>

      <aside className="space-y-4">
        {canManage ? (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submit("/leave/calendars", {
                  code: String(formData.get("code") ?? ""),
                  name: String(formData.get("name") ?? ""),
                  timezone: valueOrUndefined(formData.get("timezone")),
                  isDefault: formData.get("isDefault") === "on",
                  workWeekdays: parseWeekdays(String(formData.get("workWeekdays") ?? "1,2,3,4,5")),
                  defaultWorkdayMinutes: numberValue(formData.get("defaultWorkdayMinutes")) ?? 480,
                }, event.currentTarget);
              }}
              className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            >
              <PanelHeading eyebrow="Setup" title="Create calendar" />
              <div className="mt-4 grid gap-3">
                <Field label="Code"><input name="code" className="form-field" placeholder="US_STANDARD" required /></Field>
                <Field label="Name"><input name="name" className="form-field" placeholder="US standard leave calendar" required /></Field>
                <Field label="Timezone"><input name="timezone" className="form-field" defaultValue="America/Chicago" /></Field>
                <Field label="Weekdays"><input name="workWeekdays" className="form-field" defaultValue="1,2,3,4,5" /></Field>
                <Field label="Workday minutes"><input name="defaultWorkdayMinutes" type="number" className="form-field" defaultValue="480" /></Field>
                <label className="form-check"><input type="checkbox" name="isDefault" /> Default calendar</label>
                <button type="submit" className="primary-action"><CalendarDays size={16} />Create calendar</button>
              </div>
            </form>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submit("/leave/calendar-days", {
                  calendarId: String(formData.get("calendarId") ?? ""),
                  date: toIsoFromDateInput(String(formData.get("date") ?? "")),
                  name: String(formData.get("name") ?? ""),
                  type: String(formData.get("type") ?? "HOLIDAY"),
                  paid: formData.get("paid") === "on",
                  workdayMinutes: numberValue(formData.get("workdayMinutes")),
                }, event.currentTarget);
              }}
              className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            >
              <PanelHeading eyebrow="Calendar day" title="Add holiday or exception" />
              <div className="mt-4 grid gap-3">
                <Field label="Calendar"><CalendarSelect calendars={calendars} /></Field>
                <Field label="Date"><input name="date" type="date" className="form-field" required /></Field>
                <Field label="Name"><input name="name" className="form-field" placeholder="Memorial Day" required /></Field>
                <Field label="Type">
                  <select name="type" className="form-field">
                    <option value="HOLIDAY">Holiday</option>
                    <option value="NON_WORKING_DAY">Non-working day</option>
                    <option value="SPECIAL_WORKDAY">Special workday</option>
                  </select>
                </Field>
                <Field label="Minutes"><input name="workdayMinutes" type="number" className="form-field" placeholder="Optional" /></Field>
                <label className="form-check"><input type="checkbox" name="paid" defaultChecked /> Paid day</label>
                <button type="submit" disabled={calendars.length === 0} className="primary-action"><CalendarCheck2 size={16} />Save day</button>
              </div>
            </form>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void submit("/leave/blackout-windows", {
                  code: String(formData.get("code") ?? ""),
                  name: String(formData.get("name") ?? ""),
                  calendarId: valueOrUndefined(formData.get("calendarId")),
                  leaveTypeId: valueOrUndefined(formData.get("leaveTypeId")),
                  startsAt: toIsoFromLocal(String(formData.get("startsAt") ?? "")),
                  endsAt: toIsoFromLocal(String(formData.get("endsAt") ?? "")),
                  severity: String(formData.get("severity") ?? "BLOCK"),
                }, event.currentTarget);
              }}
              className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            >
              <PanelHeading eyebrow="Blackout" title="Create request window" />
              <div className="mt-4 grid gap-3">
                <Field label="Code"><input name="code" className="form-field" placeholder="PAYROLL_CLOSE" required /></Field>
                <Field label="Name"><input name="name" className="form-field" placeholder="Payroll close blackout" required /></Field>
                <Field label="Calendar"><CalendarSelect calendars={calendars} optional /></Field>
                <Field label="Leave type">
                  <select name="leaveTypeId" className="form-field">
                    <option value="">Any type</option>
                    {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                </Field>
                <Field label="Start"><input name="startsAt" type="datetime-local" className="form-field" required /></Field>
                <Field label="End"><input name="endsAt" type="datetime-local" className="form-field" required /></Field>
                <Field label="Severity"><select name="severity" className="form-field"><option value="BLOCK">Block</option><option value="WARN">Warn</option></select></Field>
                <button type="submit" className="primary-action"><ShieldAlert size={16} />Create blackout</button>
              </div>
            </form>
          </>
        ) : (
          <EmptyInline text="Policy permission is required to manage calendars and blackout windows." />
        )}
      </aside>
    </div>
  );
}

function ReportsPanel({ reports }: { reports: LeaveReports | null }) {
  const metrics = reports?.metrics;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniMetric label="Requests" value={metrics?.requestCount ?? 0} icon={GitPullRequestArrow} tone="blue" />
        <MiniMetric label="Approved" value={formatHours(metrics?.approvedMinutes ?? 0)} icon={CheckCircle2} tone="green" />
        <MiniMetric label="Pending" value={metrics?.pendingRequests ?? 0} icon={Hourglass} tone="amber" />
        <MiniMetric label="Overdue" value={metrics?.pendingOverdue ?? 0} icon={AlertTriangle} tone="amber" />
        <MiniMetric label="Liability" value={formatHours(metrics?.balanceLiabilityMinutes ?? 0)} icon={Banknote} tone="purple" />
        <MiniMetric label="Coverage" value={metrics?.coverageRisks ?? 0} icon={ShieldAlert} tone="amber" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <UsageByTypeTable rows={reports?.usageByType ?? []} />
        <div className="xl:col-span-2">
          <LeaveRequestsTable
            title="Approved leave"
            eyebrow="Upcoming"
            description="Approved future leave visible in this report range."
            requests={reports?.upcoming ?? []}
            emptyTitle="No upcoming approved leave"
            emptyBody="Approved future leave in this range will appear here."
          />
        </div>
        <div className="xl:col-span-3">
          <LeaveRequestsTable
            title="Coverage risk requests"
            eyebrow="Coverage"
            description="Requests carrying medium or high coverage risk from the coverage engine."
            requests={reports?.coverageRiskRequests ?? []}
            emptyTitle="No coverage-risk leave"
            emptyBody="Requests that affect minimum coverage will appear here."
          />
        </div>
      </div>
    </div>
  );
}

function PoliciesPanel({
  types,
  policies,
  approvalRules,
  canManage,
  onSaved,
}: {
  types: LeaveType[];
  policies: LeavePolicy[];
  approvalRules: LeaveApprovalRule[];
  canManage: boolean;
  onSaved: () => void;
}) {
  async function submit(path: string, payload: Record<string, unknown>, form: HTMLFormElement) {
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify(payload) });
      toast.success("Leave configuration saved.");
      form.reset();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Leave configuration could not be saved.");
    }
  }

  if (!canManage) {
    return <EmptyInline text="Leave policy management permission is required." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void submit("/leave/types", {
            code: String(formData.get("code") ?? ""),
            name: String(formData.get("name") ?? ""),
            category: String(formData.get("category") ?? "PTO"),
            unit: String(formData.get("unit") ?? "DAYS"),
            paid: formData.get("paid") === "on",
            requiresDocumentation: formData.get("requiresDocumentation") === "on",
          }, event.currentTarget);
        }}
        className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
      >
        <PanelHeading title="Leave types" eyebrow="Foundation" />
        <div className="mt-4 grid gap-3">
          <Field label="Code"><input name="code" className="form-field" placeholder="PTO" required /></Field>
          <Field label="Name"><input name="name" className="form-field" placeholder="Paid Time Off" required /></Field>
          <Field label="Category"><input name="category" className="form-field" defaultValue="PTO" /></Field>
          <Field label="Unit">
            <select name="unit" className="form-field"><option value="DAYS">Days</option><option value="HOURS">Hours</option></select>
          </Field>
          <label className="form-check"><input type="checkbox" name="paid" defaultChecked /> Paid leave</label>
          <label className="form-check"><input type="checkbox" name="requiresDocumentation" /> Requires documents</label>
          <button type="submit" className="primary-action"><Layers3 size={16} />Create type</button>
        </div>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void submit("/leave/policies", {
            leaveTypeId: String(formData.get("leaveTypeId") ?? ""),
            code: String(formData.get("code") ?? ""),
            name: String(formData.get("name") ?? ""),
            status: String(formData.get("status") ?? "DRAFT"),
            annualAllowanceMinutes: numberValue(formData.get("annualAllowanceMinutes")) ?? 0,
            minimumRequestMinutes: numberValue(formData.get("minimumRequestMinutes")) ?? 60,
            maximumRequestMinutes: numberValue(formData.get("maximumRequestMinutes")),
            allowNegativeBalance: formData.get("allowNegativeBalance") === "on",
            requiresApproval: formData.get("requiresApproval") === "on",
            workflowCode: valueOrUndefined(formData.get("workflowCode")),
          }, event.currentTarget);
        }}
        className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
      >
        <PanelHeading title="Leave policies" eyebrow="Balance rules" />
        <div className="mt-4 grid gap-3">
          <Field label="Leave type">
            <select name="leaveTypeId" className="form-field" required>
              <option value="">Select type</option>
              {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </Field>
          <Field label="Code"><input name="code" className="form-field" placeholder="PTO_STANDARD" required /></Field>
          <Field label="Name"><input name="name" className="form-field" placeholder="Standard PTO" required /></Field>
          <Field label="Status">
            <select name="status" className="form-field"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option></select>
          </Field>
          <Field label="Annual minutes"><input name="annualAllowanceMinutes" type="number" className="form-field" defaultValue="9600" /></Field>
          <Field label="Minimum minutes"><input name="minimumRequestMinutes" type="number" className="form-field" defaultValue="60" /></Field>
          <Field label="Maximum minutes"><input name="maximumRequestMinutes" type="number" className="form-field" placeholder="Optional" /></Field>
          <Field label="Workflow code"><input name="workflowCode" className="form-field" defaultValue="LEAVE_STANDARD" /></Field>
          <label className="form-check"><input type="checkbox" name="allowNegativeBalance" /> Allow negative balance</label>
          <label className="form-check"><input type="checkbox" name="requiresApproval" defaultChecked /> Requires approval</label>
          <button type="submit" className="primary-action"><ShieldCheck size={16} />Create policy</button>
        </div>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void submit("/leave/approval-rules", {
            code: String(formData.get("code") ?? ""),
            name: String(formData.get("name") ?? ""),
            leaveTypeId: valueOrUndefined(formData.get("leaveTypeId")),
            workflowCode: valueOrUndefined(formData.get("workflowCode")),
            triggerKey: String(formData.get("triggerKey") ?? "leave.request.submitted"),
            priority: numberValue(formData.get("priority")) ?? 100,
            minMinutes: numberValue(formData.get("minMinutes")),
            maxMinutes: numberValue(formData.get("maxMinutes")),
          }, event.currentTarget);
        }}
        className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
      >
        <PanelHeading title="Workflow adoption" eyebrow="Template routing" />
        <div className="mt-4 grid gap-3">
          <Field label="Code"><input name="code" className="form-field" placeholder="STANDARD_LEAVE_APPROVAL" required /></Field>
          <Field label="Name"><input name="name" className="form-field" placeholder="Manager then HR" required /></Field>
          <Field label="Leave type">
            <select name="leaveTypeId" className="form-field">
              <option value="">Any type</option>
              {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </Field>
          <Field label="Workflow code"><input name="workflowCode" className="form-field" defaultValue="LEAVE_STANDARD" /></Field>
          <Field label="Trigger"><input name="triggerKey" className="form-field" defaultValue="leave.request.submitted" /></Field>
          <Field label="Priority"><input name="priority" type="number" className="form-field" defaultValue="100" /></Field>
          <Field label="Min minutes"><input name="minMinutes" type="number" className="form-field" placeholder="Optional" /></Field>
          <Field label="Max minutes"><input name="maxMinutes" type="number" className="form-field" placeholder="Optional" /></Field>
          <button type="submit" className="primary-action"><GitPullRequestArrow size={16} />Create rule</button>
        </div>
      </form>

      <section className="xl:col-span-3 rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
        <PanelHeading title="Current setup" eyebrow="Configured controls" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ConfigList title="Types" rows={types.map((type) => `${type.name} · ${type.status}`)} />
          <ConfigList title="Policies" rows={policies.map((policy) => `${policy.name} · ${policy.status}`)} />
          <ConfigList title="Workflow rules" rows={approvalRules.map((rule) => `${rule.name} · ${rule.workflowCode ?? rule.workflow?.code ?? "trigger"}`)} />
        </div>
      </section>
    </div>
  );
}

function LeaveDecisionModal({
  request,
  decision,
  onClose,
  onSaved,
}: {
  request: LeaveRequest;
  decision: "approve" | "reject";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const title = decision === "approve" ? "Approve leave request" : "Reject leave request";
  const noteLabel = decision === "approve" ? "Approval note" : "Rejection reason";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const comment = String(formData.get("comment") ?? "").trim();
    if (decision === "reject" && !comment) {
      toast.error("Rejection reason required.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/leave/requests/${request.id}/${decision}`, {
        method: "POST",
        body: JSON.stringify({ comment: comment || undefined }),
      });
      toast.success(decision === "approve" ? "Leave approval processed." : "Leave request rejected.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Leave decision failed.");
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] grid min-h-dvh place-items-center bg-[#11143a]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="leave-decision-title">
      <form onSubmit={onSubmit} className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/80 bg-white shadow-[0_28px_90px_rgba(17,20,58,0.24)]">
        <div className="border-b border-[#edf1f7] bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Workflow decision</p>
              <h3 id="leave-decision-title" className="mt-1 text-xl font-black text-[#11143a]">{title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#63708a]">
                {employeeLabel(request.employee)} · {request.leaveType?.name ?? "Leave"} · {formatDate(request.startAt)} to {formatDate(request.endAt)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] transition hover:border-[#4b22e8] hover:text-[#4b22e8]" aria-label="Close decision modal">
              <XCircle size={17} />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricPill label="Status" value={humanize(request.status)} />
            <MetricPill label="Requested" value={formatHours(request.requestedMinutes)} />
            <MetricPill label="Coverage" value={coverageRisk(request)} />
          </div>
          <Field label={noteLabel}>
            <textarea
              name="comment"
              className="form-field min-h-32 py-3"
              placeholder={decision === "approve" ? "Optional approval note for audit history" : "Required reason for rejecting this request"}
              required={decision === "reject"}
              autoFocus
            />
          </Field>
          <div className="rounded-xl border border-[#e5ebf5] bg-[#fbfcff] p-3">
            <p className="text-xs font-black uppercase text-[#63708a]">Employee reason</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#11143a]">{request.reason}</p>
          </div>
          <WorkflowSteps request={request} />
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#edf1f7] bg-[#fbfcff] p-4">
          <button type="button" onClick={onClose} className="secondary-action w-auto px-5">Cancel</button>
          <button type="submit" disabled={saving} className={decision === "approve" ? "primary-action w-auto px-5" : "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#b42318] px-5 text-sm font-black text-white transition hover:bg-[#961f15] disabled:cursor-not-allowed disabled:opacity-60"}>
            {decision === "approve" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            {saving ? "Saving" : decision === "approve" ? "Approve" : "Reject"}
          </button>
        </div>
      </form>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(modal, document.body);
}

function LeaveRequestsTable({
  title,
  eyebrow,
  description,
  requests,
  actions,
  emptyTitle,
  emptyBody,
}: {
  title: string;
  eyebrow: string;
  description: string;
  requests: LeaveRequest[];
  actions?: (request: LeaveRequest) => ReactNode;
  emptyTitle: string;
  emptyBody: string;
}) {
  const columns: Array<DataTableColumn<LeaveRequest>> = [
    {
      key: "employee",
      header: "Employee",
      render: (request) => (
        <div className="min-w-0">
          <p className="truncate font-black">{employeeLabel(request.employee)}</p>
          <p className="mt-1 truncate text-xs font-bold text-[#74809a]">{request.leaveType?.name ?? "Leave"}</p>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Dates",
      render: (request) => (
        <div>
          <p className="font-black">{formatDate(request.startAt)}</p>
          <p className="mt-1 text-xs font-semibold text-[#74809a]">to {formatDate(request.endAt)}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (request) => <StatusBadge status={request.status} /> },
    {
      key: "time",
      header: "Time",
      render: (request) => (
        <div>
          <p className="font-black">{formatHours(request.requestedMinutes)}</p>
          <p className="mt-1 text-xs font-semibold text-[#74809a]">{formatHours(request.businessMinutes ?? request.requestedMinutes)} business</p>
        </div>
      ),
    },
    { key: "coverage", header: "Coverage", render: (request) => <StatusBadge status={coverageRisk(request)} /> },
    {
      key: "reason",
      header: "Reason",
      className: "max-w-[280px]",
      render: (request) => (
        <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#63708a]">{request.reason}</p>
      ),
    },
    {
      key: "workflow",
      header: "Workflow",
      render: (request) => <WorkflowStepSummary request={request} />,
    },
    ...(actions
      ? [{
          key: "actions",
          header: "Actions",
          render: (request: LeaveRequest) => actions(request),
        } satisfies DataTableColumn<LeaveRequest>]
      : []),
  ];

  return (
    <DataTable
      title={title}
      eyebrow={eyebrow}
      description={description}
      rows={requests}
      columns={columns}
      getRowKey={(request) => request.id}
      minWidth={actions ? "1120px" : "1040px"}
      emptyTitle={emptyTitle}
      emptyBody={emptyBody}
    />
  );
}

function CalendarDaysTable({ days }: { days: LeaveCalendarDay[] }) {
  const columns: Array<DataTableColumn<LeaveCalendarDay>> = [
    { key: "name", header: "Name", render: (day) => <span className="font-black">{day.name}</span> },
    { key: "date", header: "Date", render: (day) => formatDate(day.date) },
    { key: "type", header: "Type", render: (day) => <StatusBadge status={humanize(day.type)} /> },
    { key: "paid", header: "Paid", render: (day) => <StatusBadge status={day.paid ? "Paid" : "Unpaid"} /> },
    { key: "minutes", header: "Minutes", render: (day) => formatHours(day.workdayMinutes ?? 0) },
  ];

  return (
    <DataTable
      title="Holidays and non-working days"
      eyebrow="Calendar days"
      description="Calendar exceptions determine business minutes for leave requests."
      rows={days}
      columns={columns}
      getRowKey={(day) => day.id}
      minWidth="720px"
      emptyTitle="No calendar days"
      emptyBody="Configured holidays and special workdays will appear here."
    />
  );
}

function BlackoutWindowsTable({ blackoutWindows }: { blackoutWindows: LeaveBlackoutWindow[] }) {
  const columns: Array<DataTableColumn<LeaveBlackoutWindow>> = [
    { key: "name", header: "Name", render: (blackout) => <span className="font-black">{blackout.name}</span> },
    { key: "dates", header: "Dates", render: (blackout) => `${formatDate(blackout.startsAt)} to ${formatDate(blackout.endsAt)}` },
    { key: "severity", header: "Severity", render: (blackout) => <StatusBadge status={blackout.severity} /> },
    { key: "type", header: "Leave type", render: (blackout) => blackout.leaveType?.name ?? "Any type" },
    { key: "calendar", header: "Calendar", render: (blackout) => blackout.calendar?.name ?? "Any calendar" },
  ];

  return (
    <DataTable
      title="Request controls"
      eyebrow="Blackout windows"
      description="Blocking and warning windows are evaluated before requests enter approval."
      rows={blackoutWindows}
      columns={columns}
      getRowKey={(blackout) => blackout.id}
      minWidth="860px"
      emptyTitle="No blackout windows"
      emptyBody="Blocking and warning windows will appear here."
    />
  );
}

function UsageByTypeTable({ rows }: { rows: LeaveReports["usageByType"] }) {
  const columns: Array<DataTableColumn<LeaveReports["usageByType"][number]>> = [
    { key: "type", header: "Leave type", render: (row) => <span className="font-black">{row.leaveTypeName}</span> },
    { key: "approved", header: "Approved", render: (row) => formatHours(row.approvedMinutes) },
    { key: "pending", header: "Pending", render: (row) => formatHours(row.pendingMinutes) },
    { key: "count", header: "Requests", render: (row) => row.requestCount },
  ];

  return (
    <DataTable
      title="By leave type"
      eyebrow="Usage"
      description="Approved and pending leave grouped by type."
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.leaveTypeId}
      minWidth="640px"
      emptyTitle="No usage data"
      emptyBody="Leave usage in the selected range will appear here."
    />
  );
}

function WorkflowSteps({ request }: { request: LeaveRequest }) {
  const steps = request.approvalRequest?.steps ?? [];
  if (steps.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {steps.map((step) => (
        <span key={step.id} className="rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[11px] font-black text-[#63708a]">
          {step.stepOrder}. {step.name} · {step.status}
        </span>
      ))}
    </div>
  );
}

function WorkflowStepSummary({ request }: { request: LeaveRequest }) {
  const steps = request.approvalRequest?.steps ?? [];
  if (steps.length === 0) {
    return <span className="text-xs font-black text-[#74809a]">No workflow</span>;
  }
  return (
    <div className="flex max-w-[260px] flex-wrap gap-1.5">
      {steps.slice(0, 2).map((step) => (
        <span key={step.id} className="rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-2 py-1 text-[10px] font-black text-[#63708a]">
          {step.stepOrder}. {step.status}
        </span>
      ))}
      {steps.length > 2 ? <span className="rounded-full border border-[#dfe8f6] bg-white px-2 py-1 text-[10px] font-black text-[#63708a]">+{steps.length - 2}</span> : null}
    </div>
  );
}

function CalendarSelect({ calendars, optional = false }: { calendars: LeaveCalendar[]; optional?: boolean }) {
  return (
    <select name="calendarId" className="form-field" required={!optional}>
      {optional ? <option value="">Any calendar</option> : <option value="">Select calendar</option>}
      {calendars.map((calendar) => (
        <option key={calendar.id} value={calendar.id}>{calendar.name}{calendar.isDefault ? " (default)" : ""}</option>
      ))}
    </select>
  );
}

function InfoCard({ eyebrow, title, body, icon: Icon }: { eyebrow: string; title: string; body: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{eyebrow}</p>
          <h3 className="mt-2 text-xl font-black text-[#11143a]">{title}</h3>
        </div>
        <span className="grid size-11 place-items-center rounded-xl bg-[#eff4ff] text-[#4269ff]"><Icon size={19} /></span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#65708a]">{body}</p>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon, tone = "blue" }: { label: string; value: number | string; icon: LucideIcon; tone?: "blue" | "green" | "amber" | "purple" }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50/80 text-blue-700",
    green: "border-emerald-100 bg-emerald-50/80 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/80 text-amber-700",
    purple: "border-violet-100 bg-violet-50/80 text-violet-700",
  };
  return (
    <div className={`rounded-2xl border px-3 py-2.5 shadow-[0_10px_24px_rgba(18,31,67,0.04)] ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-black uppercase tracking-[0.06em] opacity-75">{label}</p>
        <Icon size={14} aria-hidden="true" />
      </div>
      <p className="mt-1 text-xl font-black leading-none text-[#11143a]">{value}</p>
    </div>
  );
}

function Pill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe8f6] bg-white/80 px-3 py-1 text-[11px] font-black uppercase text-[#3820d7]">
      <Icon size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

function CompactDarkStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-1 truncate text-xs font-black capitalize text-white">{value.toLowerCase()}</p>
    </div>
  );
}

function PanelHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-black text-[#11143a]">{title}</h3>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase text-[#68748c]">{label}</span>
      {children}
    </label>
  );
}

function SmallButton({
  children,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[#eafbf3] text-[#0a8f61] hover:bg-[#dcf8ec]"
      : tone === "danger"
        ? "bg-[#fff0f0] text-[#c42424] hover:bg-[#ffe3e3]"
        : "bg-[#f1edff] text-[#4b22e8] hover:bg-[#e6ddff]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition ${toneClass}`}
    >
      {children}
    </button>
  );
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#e5ebf5] bg-[#fbfcff] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[#74809a]">{label}</p>
      <p className="mt-1 text-xs font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function ConfigList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="rounded-xl border border-[#e5ebf5] bg-white p-3">
      <p className="text-xs font-black uppercase text-[#63708a]">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 6).map((row) => <p key={row} className="truncate text-xs font-bold text-[#11143a]">{row}</p>)}
        {rows.length === 0 ? <p className="text-xs font-bold text-[#8b95aa]">None configured</p> : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone = normalized.includes("APPROVED") || normalized.includes("AVAILABLE")
    ? "bg-[#eafbf3] text-[#0a8f61]"
    : normalized.includes("REJECTED") || normalized.includes("CANCELLED")
      ? "bg-[#fff1f1] text-[#b42318]"
      : normalized.includes("PENDING")
        ? "bg-[#fff4df] text-[#c76a00]"
        : "bg-[#eef4ff] text-[#4269ff]";
  return <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${tone}`}>{status.replaceAll("_", " ")}</span>;
}

function EmptyInline({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-bold text-[#74809a]">
      {text}
    </div>
  );
}

function employeeLabel(employee?: ScheduleEmployee | null) {
  if (!employee) return "Employee";
  const name = [employee.person?.firstName, employee.person?.lastName].filter(Boolean).join(" ").trim();
  return name || employee.employeeNumber || employee.id;
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function dateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function toIsoFromLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid leave date and time.");
  }
  return date.toISOString();
}

function toIsoFromDateInput(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Enter a valid calendar date.");
  }
  return date.toISOString();
}

function formatHours(minutes: number) {
  if (!Number.isFinite(minutes)) return "0h";
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function parseWeekdays(value: string) {
  const days = value.split(",").map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
  return days.length > 0 ? [...new Set(days)] : [1, 2, 3, 4, 5];
}

function coverageRisk(request: LeaveRequest) {
  const snapshot = request.coverageSnapshot;
  const risk = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot.riskLevel : null;
  return risk === "HIGH" || risk === "MEDIUM" ? risk : "LOW";
}

function numberValue(value: FormDataEntryValue | null) {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function valueOrUndefined(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function humanize(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
