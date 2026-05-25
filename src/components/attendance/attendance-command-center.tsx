"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  Download,
  FileClock,
  FileText,
  Filter,
  Fingerprint,
  History,
  LockKeyhole,
  MapPin,
  MonitorSmartphone,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import type { AuthSession, AuthUser } from "@/lib/api/types";
import type {
  AttendanceAdvancedReport,
  AttendanceClockDevice,
  AttendanceContextOptions,
  AttendanceCorrectionRequest,
  AttendanceException,
  AttendanceGeofence,
  AttendanceHoliday,
  AttendanceKioskCredential,
  AttendanceOfflineSyncResult,
  AttendancePageFilters,
  AttendancePayrollExport,
  AttendancePayrollExportResult,
  AttendancePolicy,
  AttendancePremiumRule,
  AttendancePredictiveAlerts,
  AttendanceReconciliationResult,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceSupervisorBoard,
  AttendanceSupervisorBoardRow,
  AttendanceTimesheet,
  MyAttendanceWorkspace,
  PaginatedAttendance,
} from "@/lib/attendance/types";
import { hasAnyPermission } from "@/lib/auth/permissions";
import type { ScheduleEmployee } from "@/lib/scheduling/types";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type AttendanceTab = "overview" | "board" | "clock" | "records" | "corrections" | "exceptions" | "timesheets" | "controls" | "insights" | "policy";

type AttendanceCommandCenterProps = {
  session: AuthSession;
  summary: AttendanceSummary | null;
  myAttendance: MyAttendanceWorkspace | null;
  supervisorBoard: AttendanceSupervisorBoard | null;
  records: PaginatedAttendance<AttendanceRecord> | null;
  exceptions: PaginatedAttendance<AttendanceException> | null;
  correctionRequests: PaginatedAttendance<AttendanceCorrectionRequest> | null;
  timesheets: PaginatedAttendance<AttendanceTimesheet> | null;
  payrollExports: PaginatedAttendance<AttendancePayrollExport> | null;
  policies: AttendancePolicy[];
  geofences: PaginatedAttendance<AttendanceGeofence> | null;
  clockDevices: PaginatedAttendance<AttendanceClockDevice> | null;
  kioskCredentials: PaginatedAttendance<AttendanceKioskCredential> | null;
  holidays: PaginatedAttendance<AttendanceHoliday> | null;
  premiumRules: PaginatedAttendance<AttendancePremiumRule> | null;
  advancedReport: AttendanceAdvancedReport | null;
  predictiveAlerts: AttendancePredictiveAlerts | null;
  contextOptions: AttendanceContextOptions;
  initialTab: AttendanceTab;
  filters: AttendancePageFilters;
};

type ManualRecordSeed = {
  employeeId?: string;
  scheduleAssignmentId?: string | null;
  workDate?: string;
  locationName?: string | null;
};

type AttendanceExceptionDecisionStatus = "APPROVED" | "REJECTED" | "WAIVED" | "RESOLVED";
type AttendanceCorrectionDecisionStatus = "APPROVED" | "REJECTED" | "CANCELLED";
type AttendanceTimesheetDecisionStatus = "APPROVED" | "REJECTED" | "LOCKED" | "REOPENED";

type AttendanceDecisionTarget =
  | {
      kind: "exception";
      row: AttendanceException;
      status: AttendanceExceptionDecisionStatus;
    }
  | {
      kind: "correction";
      row: AttendanceCorrectionRequest;
      status: AttendanceCorrectionDecisionStatus;
    }
  | {
      kind: "timesheet";
      row: AttendanceTimesheet;
      status: AttendanceTimesheetDecisionStatus;
    };

const tabs: Array<{
  key: AttendanceTab;
  label: string;
  description: string;
  icon: LucideIcon;
  permissions: string[];
}> = [
  {
    key: "overview",
    label: "Overview",
    description: "Today, risk, and readiness",
    icon: Clock3,
    permissions: ["attendance.self"],
  },
  {
    key: "board",
    label: "Daily board",
    description: "Supervisor coverage today",
    icon: UsersRound,
    permissions: ["attendance.team.write", "attendance.write"],
  },
  {
    key: "clock",
    label: "Time clock",
    description: "Punches and active work",
    icon: Fingerprint,
    permissions: ["attendance.self"],
  },
  {
    key: "records",
    label: "Records",
    description: "Actual time and adjustments",
    icon: FileClock,
    permissions: ["attendance.self", "attendance.team.write", "attendance.write"],
  },
  {
    key: "corrections",
    label: "Corrections",
    description: "Requests and approvals",
    icon: FileText,
    permissions: ["attendance.self", "attendance.team.write", "attendance.write"],
  },
  {
    key: "exceptions",
    label: "Exceptions",
    description: "Late, missed, overtime",
    icon: AlertTriangle,
    permissions: ["attendance.self", "attendance.exceptions.approve"],
  },
  {
    key: "timesheets",
    label: "Timesheets",
    description: "Pay-period approval",
    icon: ClipboardCheck,
    permissions: ["attendance.self", "attendance.timesheets.approve"],
  },
  {
    key: "controls",
    label: "Controls",
    description: "Geofence, device, kiosk",
    icon: MapPin,
    permissions: ["attendance.controls.write"],
  },
  {
    key: "insights",
    label: "Insights",
    description: "Reports and alerts",
    icon: BarChart3,
    permissions: ["attendance.reports.read"],
  },
  {
    key: "policy",
    label: "Policy",
    description: "Grace, overtime, controls",
    icon: ShieldCheck,
    permissions: ["attendance.write"],
  },
];

const tabTones = [
  {
    card: "from-emerald-50 to-white border-emerald-100 text-emerald-700",
    icon: "bg-emerald-600 text-white",
  },
  {
    card: "from-sky-50 to-white border-sky-100 text-sky-700",
    icon: "bg-sky-600 text-white",
  },
  {
    card: "from-violet-50 to-white border-violet-100 text-violet-700",
    icon: "bg-violet-600 text-white",
  },
  {
    card: "from-amber-50 to-white border-amber-100 text-amber-700",
    icon: "bg-amber-500 text-white",
  },
  {
    card: "from-rose-50 to-white border-rose-100 text-rose-700",
    icon: "bg-rose-500 text-white",
  },
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

export function AttendanceCommandCenter({
  session,
  summary,
  myAttendance,
  supervisorBoard,
  records,
  exceptions,
  correctionRequests,
  timesheets,
  payrollExports,
  policies,
  geofences,
  clockDevices,
  kioskCredentials,
  holidays,
  premiumRules,
  advancedReport,
  predictiveAlerts,
  contextOptions,
  initialTab,
  filters,
}: AttendanceCommandCenterProps) {
  const router = useRouter();
  const tabRailRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<AttendanceTab>(initialTab);
  const [, startTransition] = useTransition();
  const permissions = summary?.permissions ?? {
    tenantAttendance: hasAnyPermission(session.user, ["attendance.write"]),
    teamAttendance: hasAnyPermission(session.user, ["attendance.team.write"]),
    selfAttendance: hasAnyPermission(session.user, ["attendance.self"]),
    approveExceptions: hasAnyPermission(session.user, ["attendance.exceptions.approve"]),
    approveTimesheets: hasAnyPermission(session.user, ["attendance.timesheets.approve"]),
    approveCorrections: hasAnyPermission(session.user, ["attendance.team.write"]),
    manageControls: hasAnyPermission(session.user, ["attendance.controls.write"]),
    readReports: hasAnyPermission(session.user, ["attendance.reports.read"]),
  };
  const canOperateTeam = permissions.tenantAttendance || permissions.teamAttendance;
  const canManageControls = Boolean(permissions.manageControls);
  const canReadReports = Boolean(permissions.readReports);
  const canApproveExceptions = permissions.approveExceptions;
  const canApproveTimesheets = permissions.approveTimesheets;
  const activePolicy = summary?.policy ?? policies.find((policy) => policy.status === "ACTIVE") ?? null;

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => hasAnyPermission(session.user, tab.permissions)),
    [session.user],
  );
  const currentTab = visibleTabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : visibleTabs[0]?.key ?? "overview";

  const recentRecords = records?.data ?? summary?.recentRecords ?? [];
  const exceptionRows = exceptions?.data ?? myAttendance?.exceptions ?? [];
  const correctionRows = correctionRequests?.data ?? myAttendance?.correctionRequests ?? [];
  const timesheetRows = timesheets?.data ?? myAttendance?.timesheets ?? [];
  const payrollExportRows = payrollExports?.data ?? [];
  const geofenceRows = geofences?.data ?? [];
  const clockDeviceRows = clockDevices?.data ?? [];
  const kioskCredentialRows = kioskCredentials?.data ?? [];
  const holidayRows = holidays?.data ?? [];
  const premiumRuleRows = premiumRules?.data ?? [];
  const [optimisticActiveRecord, setOptimisticActiveRecord] = useState<{
    record: AttendanceRecord | null;
    sourceKey: string;
  } | null>(null);
  const [punchingType, setPunchingType] = useState<"CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [decisionTarget, setDecisionTarget] = useState<AttendanceDecisionTarget | null>(null);
  const serverActiveRecord = myAttendance?.activeRecord ?? null;
  const serverActiveRecordKey = [
    serverActiveRecord?.id ?? "none",
    serverActiveRecord?.actualClockOutAt ?? "open",
    serverActiveRecord?.breaks?.length ?? 0,
    serverActiveRecord?.breaks?.some((breakEntry) => !breakEntry.endedAt) ? "break" : "work",
  ].join(":");
  const activeRecord =
    optimisticActiveRecord?.sourceKey === serverActiveRecordKey
      ? optimisticActiveRecord.record
      : serverActiveRecord;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setOfflineQueueCount(readOfflinePunchQueue().length);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function changeTab(tab: AttendanceTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/attendance?${params.toString()}`, { scroll: false });
  }

  function scrollTabRail(direction: "left" | "right") {
    tabRailRef.current?.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  }

  async function punch(
    type: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END",
    extras: { photoAttestationUrl?: string; attestationNote?: string } = {},
  ) {
    setPunchingType(type);
    let offlinePayload: OfflinePunchQueueItem | null = null;

    try {
      const punchContext = await attendancePunchContext(Boolean(
        activePolicy?.requireLocationCapture ||
        activePolicy?.requireGeofenceForClockIn ||
        activePolicy?.blockOutsideGeofence,
      ));
      offlinePayload = {
        clientMutationId: offlineClientMutationId(type),
        type,
        source: "WEB",
        occurredAt: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...punchContext,
        ...compactObject(extras),
      };
      const response = await apiFetch<{ record: AttendanceRecord | null }>("/attendance/my/punch", {
        method: "POST",
        body: JSON.stringify(offlinePayload),
      });
      setOptimisticActiveRecord({
        record: normalizePunchedRecord(response.record, type),
        sourceKey: serverActiveRecordKey,
      });
      toast.success(punchSuccess(type), { description: "Your attendance record has been updated." });
      refresh();
    } catch (error) {
      if (offlinePayload && shouldQueueOfflinePunch(error)) {
        enqueueOfflinePunch(offlinePayload);
        setOfflineQueueCount(readOfflinePunchQueue().length);
        toast.warning("Punch saved offline.", { description: "Sync it from this time clock when the connection is back." });
      } else {
        toast.error(error instanceof Error ? error.message : "Punch could not be recorded.");
      }
    } finally {
      setPunchingType(null);
    }
  }

  async function syncOfflinePunches() {
    const punches = readOfflinePunchQueue();
    if (punches.length === 0) {
      toast.info("No offline punches to sync.");
      return;
    }

    try {
      const response = await apiFetch<AttendanceOfflineSyncResult>("/attendance/my/offline-punches/sync", {
        method: "POST",
        body: JSON.stringify({ punches }),
      });
      writeOfflinePunchQueue([]);
      setOfflineQueueCount(0);
      toast.success("Offline punches synced.", {
        description: `${response.summary.applied} applied, ${response.summary.duplicate} duplicate, ${response.summary.rejected} rejected.`,
      });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Offline punches could not be synced.");
    }
  }

  async function submitTimesheet(timesheetId: string) {
    try {
      await apiFetch(`/attendance/timesheets/${timesheetId}/submit`, { method: "POST" });
      toast.success("Timesheet submitted.", { description: "The period is now ready for review." });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Timesheet could not be submitted.");
    }
  }

  function decideException(row: AttendanceException, status: AttendanceExceptionDecisionStatus) {
    setDecisionTarget({ kind: "exception", row, status });
  }

  function decideCorrectionRequest(row: AttendanceCorrectionRequest, status: AttendanceCorrectionDecisionStatus) {
    setDecisionTarget({ kind: "correction", row, status });
  }

  function decideTimesheet(row: AttendanceTimesheet, status: AttendanceTimesheetDecisionStatus) {
    setDecisionTarget({ kind: "timesheet", row, status });
  }

  async function activatePolicy(policyId: string) {
    try {
      await apiFetch(`/attendance/policies/${policyId}/activate`, { method: "POST" });
      toast.success("Attendance policy activated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Policy could not be activated.");
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-[0_18px_55px_rgba(18,31,67,0.07)] backdrop-blur-xl">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(75,34,232,0.10),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,251,255,0.78))]" />
          <div className="relative grid gap-4 p-4 xl:grid-cols-[1fr_300px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill icon={Clock3} label="Attendance command center" />
                <Pill
                  icon={activePolicy?.allowOfflinePunchSync ? MonitorSmartphone : LockKeyhole}
                  label={activePolicy?.allowOfflinePunchSync ? "Offline sync enabled" : "Offline sync locked"}
                />
              </div>
              <h1 className="mt-3 max-w-3xl text-2xl font-black leading-tight text-[#11143a] md:text-3xl">
                Govern clocking, exceptions, corrections, and payroll-ready time in one place.
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#65708a]">
                {permissions.tenantAttendance
                  ? "Monitor tenant-wide actual time, enforce controls, review exceptions, and keep payroll periods locked down."
                  : permissions.teamAttendance
                    ? "Run the daily attendance board, correct team records with approval history, and move verified hours to timesheets."
                    : "Clock your work, review punch details, request corrections, and follow every approval tied to your time."}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniMetric label="Scheduled today" value={summary?.metrics.scheduledToday ?? 0} icon={CalendarClock} tone="blue" />
                <MiniMetric label="Clocked in" value={summary?.metrics.clockedInNow ?? 0} icon={PlayCircle} tone="green" />
                <MiniMetric label="Exceptions" value={summary?.metrics.openExceptions ?? 0} icon={AlertTriangle} tone="amber" />
                <MiniMetric label="Corrections" value={summary?.metrics.pendingCorrections ?? 0} icon={FileText} tone="purple" />
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-[#11143a] p-4 text-white shadow-[0_18px_42px_rgba(17,20,58,0.18)]">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/55">Active policy</p>
              <h2 className="mt-2 text-xl font-black leading-tight">{activePolicy?.name ?? "Attendance policy"}</h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/58">
                {activePolicy
                  ? "Controls are applied to web, mobile, kiosk, corrections, and payroll-ready calculations."
                  : "Create and activate a policy to govern attendance behavior."}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <CompactDarkStat label="Grace" value={`${activePolicy?.graceMinutesLate ?? 0} min`} />
                <CompactDarkStat label="Round" value={`${activePolicy?.roundingMinutes ?? 1} min`} />
                <CompactDarkStat label="Entries" value={activePolicy?.autoCreateTimesheetEntries ? "auto" : "manual"} />
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
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] shadow-sm transition hover:border-[#cfd9ea] hover:text-[#11143a]"
            aria-label="Scroll attendance tabs left"
          >
            <ChevronLeft size={17} />
          </button>
          <div
            ref={tabRailRef}
            role="tablist"
            aria-label="Attendance sections"
            className="flex flex-1 gap-2 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
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
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] shadow-sm transition hover:border-[#cfd9ea] hover:text-[#11143a]"
            aria-label="Scroll attendance tabs right"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="p-5">
          {currentTab === "overview" ? (
            <OverviewPanel
              activeRecord={activeRecord}
              myAttendance={myAttendance}
              recentRecords={recentRecords}
              exceptions={exceptionRows}
              timesheets={timesheetRows}
              canOperateTeam={canOperateTeam}
            />
          ) : null}
          {currentTab === "clock" ? (
            <ClockPanel
              myAttendance={myAttendance}
              activeRecord={activeRecord}
              activePolicy={activePolicy}
              onPunch={punch}
              onSyncOffline={syncOfflinePunches}
              offlineQueueCount={offlineQueueCount}
              isPending={Boolean(punchingType)}
              punchingType={punchingType}
            />
          ) : null}
          {currentTab === "board" ? (
            <SupervisorBoardPanel
              board={supervisorBoard}
              employees={contextOptions.employees}
              canAdjust={canOperateTeam}
              filters={filters}
              sessionUser={session.user}
            />
          ) : null}
          {currentTab === "records" ? (
            <RecordsPanel
              rows={recentRecords}
              canOperateTeam={canOperateTeam}
              employees={contextOptions.employees}
              filters={filters}
              sessionUser={session.user}
            />
          ) : null}
          {currentTab === "corrections" ? (
            <CorrectionsPanel
              rows={correctionRows}
              canApprove={canOperateTeam}
              onDecision={decideCorrectionRequest}
              filters={filters}
              sessionUser={session.user}
            />
          ) : null}
          {currentTab === "exceptions" ? (
            <ExceptionsPanel
              rows={exceptionRows}
              canApprove={canApproveExceptions}
              onDecision={decideException}
              filters={filters}
              sessionUser={session.user}
            />
          ) : null}
          {currentTab === "timesheets" ? (
            <TimesheetsPanel
              rows={timesheetRows}
              canGenerate={canOperateTeam}
              canApprove={canApproveTimesheets}
              employees={contextOptions.employees}
              onSubmit={submitTimesheet}
              onDecision={decideTimesheet}
              payrollExports={payrollExportRows}
            />
          ) : null}
          {currentTab === "controls" ? (
            <ControlsPanel
              geofences={geofenceRows}
              devices={clockDeviceRows}
              kioskCredentials={kioskCredentialRows}
              holidays={holidayRows}
              premiumRules={premiumRuleRows}
              employees={contextOptions.employees}
              canManage={canManageControls}
            />
          ) : null}
          {currentTab === "insights" ? (
            <InsightsPanel
              report={advancedReport}
              alerts={predictiveAlerts}
              canRead={canReadReports}
              filters={filters}
            />
          ) : null}
          {currentTab === "policy" ? (
            <PolicyPanel policies={policies} activePolicy={activePolicy} onActivate={activatePolicy} />
          ) : null}
        </div>
      </section>
      {decisionTarget ? (
        <AttendanceDecisionModal
          target={decisionTarget}
          onClose={() => setDecisionTarget(null)}
          onSaved={() => {
            setDecisionTarget(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function AttendanceDecisionModal({
  target,
  onClose,
  onSaved,
}: {
  target: AttendanceDecisionTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, startSaving] = useTransition();
  const copy = attendanceDecisionCopy(target);
  const requiredNote = attendanceDecisionRequiresNote(target);
  const isDanger = ["REJECTED", "CANCELLED", "WAIVED"].includes(target.status);
  const ActionIcon = isDanger ? XCircle : CheckCircle2;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const decisionNote = note.trim();

    if (requiredNote && !decisionNote) {
      toast.error(`${copy.noteLabel} required.`);
      return;
    }

    startSaving(async () => {
      try {
        await apiFetch(copy.endpoint, {
          method: "POST",
          body: JSON.stringify({
            status: target.status,
            decisionNote: decisionNote || undefined,
          }),
        });
        toast.success(copy.successTitle, copy.successBody ? { description: copy.successBody } : undefined);
        onSaved();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.errorTitle);
      }
    });
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#071023]/60 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={submitDecision}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-decision-title"
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(6,13,35,0.34)]"
      >
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="border-b border-[#edf1f7] bg-[linear-gradient(135deg,#ffffff,#f7f9ff)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#63708a]">{copy.eyebrow}</p>
                <h2 id="attendance-decision-title" className="mt-1 text-2xl font-black tracking-[-0.01em] text-[#11143a]">
                  {copy.title}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#52607a]">{copy.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] transition hover:border-[#cfd9ea] hover:text-[#11143a] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close decision modal"
              >
                <XCircle size={17} />
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {copy.metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#74809a]">{metric.label}</p>
                  <p className="mt-1 text-sm font-black text-[#11143a]">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[#dfe8f6] bg-white p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{copy.detailTitle}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#11143a]">{copy.detailBody}</p>
              {copy.detailAside ? <p className="mt-2 text-xs font-bold leading-5 text-[#74809a]">{copy.detailAside}</p> : null}
            </div>

            {target.kind === "correction" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <ChangeSnapshot label="Current record" value={target.row.previousSnapshot ?? null} />
                <ChangeSnapshot label="Requested record" value={target.row.requestedSnapshot ?? null} />
              </div>
            ) : null}

            <Field label={`${copy.noteLabel}${requiredNote ? " *" : ""}`}>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="form-field min-h-28 resize-y"
                placeholder={copy.notePlaceholder}
                autoFocus
              />
            </Field>
          </div>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-[#edf1f7] bg-white/95 p-4 backdrop-blur">
            <button type="button" onClick={onClose} disabled={saving} className="secondary-action w-auto px-4">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isDanger ? "bg-[#c42424] hover:bg-[#aa1f1f]" : "bg-[#4b22e8] hover:bg-[#3e1cc0]"
              }`}
            >
              <ActionIcon size={17} />
              {saving ? "Saving" : copy.primaryLabel}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function attendanceDecisionCopy(target: AttendanceDecisionTarget) {
  const action = attendanceDecisionVerb(target.status);

  if (target.kind === "exception") {
    const row = target.row;
    return {
      eyebrow: "Exception decision",
      title: `${action} attendance exception`,
      subtitle: `${employeeLabel(row.employee) || row.employeeId} · ${humanize(row.title || row.type)} · ${formatDateTime(row.occurredAt)}`,
      detailTitle: "Exception detail",
      detailBody: row.description ?? humanize(row.type),
      detailAside: row.attendanceRecord
        ? `Record: ${formatDate(row.attendanceRecord.workDate)} · ${minutesCell(row.attendanceRecord.payableMinutes)} payable`
        : undefined,
      noteLabel: attendanceDecisionNoteLabel(target),
      notePlaceholder: target.status === "REJECTED" ? "Reason this exception is not accepted" : "Decision note",
      primaryLabel: action,
      endpoint: `/attendance/exceptions/${row.id}/decision`,
      successTitle: "Exception updated.",
      successBody: "The decision is now visible on the attendance record.",
      errorTitle: "Exception decision failed.",
      metrics: [
        { label: "Current status", value: humanize(row.status) },
        { label: "Minutes", value: row.minutes ? minutesCell(row.minutes) : "None" },
        { label: "Type", value: humanize(row.type) },
      ],
    };
  }

  if (target.kind === "correction") {
    const row = target.row;
    return {
      eyebrow: "Correction workflow",
      title: `${action} correction request`,
      subtitle: `${employeeLabel(row.employee) || row.employeeId} · ${formatDate(row.workDate)} · ${formatTime(row.requestedClockInAt)}-${formatTime(row.requestedClockOutAt)}`,
      detailTitle: "Employee reason",
      detailBody: row.reason,
      detailAside: row.supportingDocumentUrl ? `Supporting file: ${row.supportingDocumentUrl}` : undefined,
      noteLabel: attendanceDecisionNoteLabel(target),
      notePlaceholder: target.status === "APPROVED" ? "Approval note" : "Reason for this decision",
      primaryLabel: action,
      endpoint: `/attendance/correction-requests/${row.id}/decision`,
      successTitle: target.status === "APPROVED" ? "Correction approved and applied." : "Correction request updated.",
      successBody: undefined,
      errorTitle: "Correction decision failed.",
      metrics: [
        { label: "Current status", value: humanize(row.status) },
        { label: "Break", value: minutesCell(row.requestedBreakMinutes ?? 0) },
        { label: "Policy blocks", value: row.policyViolations?.violations?.length ?? 0 },
      ],
    };
  }

  const row = target.row;
  return {
    eyebrow: "Timesheet decision",
    title: `${action} timesheet`,
    subtitle: `${employeeLabel(row.employee) || row.employeeId} · ${formatDate(row.periodStart)} to ${formatDate(row.periodEnd)}`,
    detailTitle: "Period summary",
    detailBody: `${minutesCell(row.regularMinutes)} regular · ${minutesCell(row.overtimeMinutes)} overtime · ${minutesCell(row.breakMinutes)} breaks`,
    detailAside: `${row.exceptionCount} exception${row.exceptionCount === 1 ? "" : "s"} attached to this timesheet.`,
    noteLabel: attendanceDecisionNoteLabel(target),
    notePlaceholder: target.status === "REJECTED" ? "Reason this timesheet is being returned" : "Decision note",
    primaryLabel: action,
    endpoint: `/attendance/timesheets/${row.id}/decision`,
    successTitle: "Timesheet updated.",
    successBody: "The period status has been changed.",
    errorTitle: "Timesheet decision failed.",
    metrics: [
      { label: "Current status", value: humanize(row.status) },
      { label: "Payable", value: minutesCell(row.regularMinutes + row.overtimeMinutes) },
      { label: "Exceptions", value: row.exceptionCount },
    ],
  };
}

function attendanceDecisionRequiresNote(target: AttendanceDecisionTarget) {
  if (target.kind === "exception") {
    return target.status === "REJECTED" || target.status === "WAIVED";
  }

  if (target.kind === "correction") {
    return target.status === "REJECTED" || target.status === "CANCELLED";
  }

  return target.status === "REJECTED";
}

function attendanceDecisionNoteLabel(target: AttendanceDecisionTarget) {
  switch (target.status) {
    case "APPROVED":
      return "Approval note";
    case "REJECTED":
      return "Rejection reason";
    case "CANCELLED":
      return "Cancellation reason";
    case "WAIVED":
      return "Waiver reason";
    case "LOCKED":
      return "Lock note";
    case "REOPENED":
      return "Reopen reason";
    default:
      return "Decision note";
  }
}

function attendanceDecisionVerb(status: AttendanceExceptionDecisionStatus | AttendanceCorrectionDecisionStatus | AttendanceTimesheetDecisionStatus) {
  switch (status) {
    case "APPROVED":
      return "Approve";
    case "REJECTED":
      return "Reject";
    case "WAIVED":
      return "Waive";
    case "RESOLVED":
      return "Resolve";
    case "CANCELLED":
      return "Cancel";
    case "LOCKED":
      return "Lock";
    case "REOPENED":
      return "Reopen";
  }
}

function OverviewPanel({
  activeRecord,
  myAttendance,
  recentRecords,
  exceptions,
  timesheets,
  canOperateTeam,
}: {
  activeRecord: AttendanceRecord | null;
  myAttendance: MyAttendanceWorkspace | null;
  recentRecords: AttendanceRecord[];
  exceptions: AttendanceException[];
  timesheets: AttendanceTimesheet[];
  canOperateTeam: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          eyebrow={canOperateTeam ? "Operations" : "My attendance"}
          title={activeRecord ? "Work in progress" : "No active clock-in"}
          body={
            activeRecord
              ? `Clocked in ${formatDateTime(activeRecord.actualClockInAt)} at ${activeRecord.locationName ?? "your work location"}.`
              : "Your next punch will start a governed attendance record."
          }
          icon={activeRecord ? PlayCircle : Clock3}
        />
        <InfoCard
          eyebrow="Schedule connection"
          title={`${myAttendance?.todayAssignments.length ?? 0} planned today`}
          body={
            myAttendance?.todayAssignments.length
              ? "Today has planned work that can be matched to actual time."
              : "No planned work is attached to this account for today."
          }
          icon={CalendarClock}
        />
        <InfoCard
          eyebrow="Exceptions"
          title={`${exceptions.filter((item) => ["OPEN", "SUBMITTED"].includes(item.status)).length} open items`}
          body="Late arrival, missed punch, unscheduled work, and overtime signals are reviewed here."
          icon={AlertTriangle}
        />
        <InfoCard
          eyebrow="Timesheets"
          title={`${timesheets.filter((item) => item.status === "SUBMITTED").length} awaiting approval`}
          body="Verified records flow into approval-ready pay-period summaries."
          icon={ClipboardCheck}
        />
      </div>

      <div className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Recent activity</p>
        <div className="mt-4 space-y-3">
          {recentRecords.slice(0, 5).map((record) => (
            <div key={record.id} className="rounded-xl border border-[#e5ebf5] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#11143a]">{employeeLabel(record.employee)}</p>
                  <p className="mt-1 text-xs font-semibold text-[#74809a]">
                    {formatDate(record.workDate)} · {formatTime(record.actualClockInAt)}-{formatTime(record.actualClockOutAt)}
                  </p>
                </div>
                <StatusBadge status={record.status} />
              </div>
            </div>
          ))}
          {recentRecords.length === 0 ? <EmptyInline text="No attendance activity has been recorded yet." /> : null}
        </div>
      </div>
    </div>
  );
}

function ClockPanel({
  myAttendance,
  activeRecord,
  activePolicy,
  onPunch,
  onSyncOffline,
  offlineQueueCount,
  isPending,
  punchingType,
}: {
  myAttendance: MyAttendanceWorkspace | null;
  activeRecord: AttendanceRecord | null;
  activePolicy: AttendancePolicy | null;
  onPunch: (
    type: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END",
    extras?: { photoAttestationUrl?: string; attestationNote?: string },
  ) => void;
  onSyncOffline: () => void;
  offlineQueueCount: number;
  isPending: boolean;
  punchingType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | null;
}) {
  const [photoAttestationUrl, setPhotoAttestationUrl] = useState("");
  const [attestationNote, setAttestationNote] = useState("");
  const activeBreak = activeRecord?.breaks?.find((breakEntry) => !breakEntry.endedAt) ?? null;
  const isOnBreak = Boolean(activeBreak);
  const attestationRequired = Boolean(activePolicy?.requirePhotoAttestation || activePolicy?.requireAttestationNote);
  const attestationExtras = {
    photoAttestationUrl: photoAttestationUrl.trim() || undefined,
    attestationNote: attestationNote.trim() || undefined,
  };
  const canClockOut = Boolean(activeRecord) && !isOnBreak && !isPending;
  const canStartBreak = Boolean(activeRecord) && !isOnBreak && !isPending;
  const canEndBreak = Boolean(activeRecord) && isOnBreak && !isPending;
  const heading = !activeRecord ? "Start your attendance record." : isOnBreak ? "You are on break." : "You are clocked in.";
  const body = !activeRecord
    ? "Punches are attached to your employee record and matched against scheduled work when available."
    : isOnBreak
      ? `Break started ${formatDateTime(activeBreak?.startedAt ?? new Date().toISOString())}. End break to resume clock-out controls.`
      : `Started ${formatDateTime(activeRecord.actualClockInAt)}. You can start a break or clock out when work is complete.`;

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <section className="rounded-2xl border border-[#dfe8f6] bg-[linear-gradient(145deg,#ffffff,#f8fbff)] p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Time clock</p>
        <h2 className="mt-2 text-2xl font-black text-[#11143a]">
          {heading}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#65708a]">
          {body}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {!activeRecord ? (
            <button type="button" className="primary-action" disabled={isPending} onClick={() => onPunch("CLOCK_IN", attestationExtras)}>
              <PlayCircle size={18} />
              {punchingType === "CLOCK_IN" ? "Saving" : "Clock in"}
            </button>
          ) : isOnBreak ? (
            <button
              type="button"
              className="primary-action break-action"
              disabled={!canEndBreak}
              onClick={() => onPunch("BREAK_END", attestationExtras)}
            >
              <RotateCcw size={17} />
              {punchingType === "BREAK_END" ? "Saving" : "End break"}
            </button>
          ) : (
            <>
              <button type="button" className="primary-action" disabled={!canClockOut} onClick={() => onPunch("CLOCK_OUT", attestationExtras)}>
                <CheckCircle2 size={18} />
                {punchingType === "CLOCK_OUT" ? "Saving" : "Clock out"}
              </button>
              <button type="button" className="secondary-action" disabled={!canStartBreak} onClick={() => onPunch("BREAK_START", attestationExtras)}>
                <PauseCircle size={17} />
                {punchingType === "BREAK_START" ? "Saving" : "Start break"}
              </button>
            </>
          )}
        </div>
        {isOnBreak ? (
          <p className="mt-3 rounded-xl bg-[#fff8e7] px-3 py-2 text-[12px] font-bold leading-5 text-[#865b08]">
            Break is active. End the break before clocking out.
          </p>
        ) : null}
        {attestationRequired ? (
          <div className="mt-4 grid gap-3">
            {activePolicy?.requirePhotoAttestation ? (
              <Field label="Photo attestation URL">
                <input
                  className="form-field"
                  value={photoAttestationUrl}
                  onChange={(event) => setPhotoAttestationUrl(event.target.value)}
                  placeholder="https://..."
                />
              </Field>
            ) : null}
            {activePolicy?.requireAttestationNote ? (
              <Field label="Attestation note">
                <input
                  className="form-field"
                  value={attestationNote}
                  onChange={(event) => setAttestationNote(event.target.value)}
                  placeholder="Location or identity confirmation"
                />
              </Field>
            ) : null}
          </div>
        ) : null}
        {offlineQueueCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c9d8ff] bg-[#f5f8ff] px-3 py-2">
            <p className="text-xs font-black text-[#30457f]">{offlineQueueCount} offline punch{offlineQueueCount === 1 ? "" : "es"} waiting</p>
            <SmallButton onClick={onSyncOffline}>Sync</SmallButton>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#dfe8f6] bg-white p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Today</p>
        <h3 className="mt-2 text-xl font-black text-[#11143a]">Scheduled work and punch history</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(myAttendance?.todayAssignments ?? []).map((assignment) => (
            <div key={assignment.id} className="rounded-xl border border-[#e5ebf5] bg-[#fbfcff] p-4">
              <p className="text-sm font-black text-[#11143a]">{assignment.shift?.name ?? "Scheduled assignment"}</p>
              <p className="mt-1 text-xs font-semibold text-[#74809a]">
                {formatTime(assignment.startsAt)}-{formatTime(assignment.endsAt)} · {assignment.locationName ?? "Location pending"}
              </p>
            </div>
          ))}
          {(myAttendance?.todayAssignments.length ?? 0) === 0 ? <EmptyInline text="No scheduled assignment is visible for today." /> : null}
        </div>
      </section>
    </div>
  );
}

function SupervisorBoardPanel({
  board,
  employees,
  canAdjust,
  filters,
  sessionUser,
}: {
  board: AttendanceSupervisorBoard | null;
  employees: ScheduleEmployee[];
  canAdjust: boolean;
  filters: AttendancePageFilters;
  sessionUser: AuthUser;
}) {
  const router = useRouter();
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [recordSeed, setRecordSeed] = useState<ManualRecordSeed | null>(null);
  const rows = board?.rows ?? [];
  const metrics = board?.metrics;

  function openRecord(record: AttendanceRecord) {
    setSelectedRecord(record);
    setEditingRecord(null);
    setRecordSeed(null);
    window.requestAnimationFrame(() => {
      document.getElementById("attendance-record-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openSeededEditor(row: AttendanceSupervisorBoardRow) {
    setSelectedRecord(row.record ?? null);
    setEditingRecord(row.record ?? null);
    setRecordSeed({
      employeeId: row.employeeId,
      scheduleAssignmentId: row.assignments[0]?.id ?? row.record?.scheduleAssignmentId ?? null,
      workDate: row.workDate,
      locationName: row.assignments[0]?.locationName ?? row.record?.locationName ?? null,
    });
    window.requestAnimationFrame(() => {
      document.getElementById("attendance-record-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const columns: Array<DataTableColumn<AttendanceSupervisorBoardRow>> = [
    { key: "employee", header: "Employee", render: (row) => <EmployeeCell employee={row.employee} fallback={row.employeeId} /> },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div>
          <StatusBadge status={row.status} />
          <p className="mt-1 text-xs font-semibold text-[#74809a]">
            {row.assignmentCount} shift{row.assignmentCount === 1 ? "" : "s"} · {row.recordCount} record{row.recordCount === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      key: "scheduled",
      header: "Scheduled",
      render: (row) => (
        <div>
          <p className="font-black">{formatTime(row.scheduledStartAt)}-{formatTime(row.scheduledEndAt)}</p>
          <p className="text-xs font-semibold text-[#74809a]">{minutesCell(row.scheduledMinutes)}</p>
        </div>
      ),
    },
    {
      key: "actual",
      header: "Actual",
      render: (row) => (
        <div>
          <p className="font-black">{formatTime(row.actualClockInAt)}-{formatTime(row.actualClockOutAt)}</p>
          <p className="text-xs font-semibold text-[#74809a]">{minutesCell(row.payableMinutes)} payable</p>
        </div>
      ),
    },
    { key: "late", header: "Late", render: (row) => minutesCell(row.lateMinutes) },
    {
      key: "signals",
      header: "Signals",
      render: (row) => (
        <span className="text-xs font-black text-[#63708a]">
          {row.exceptionCount} exceptions · {row.pendingCorrectionCount} corrections · {row.leaveCount ?? 0} leave
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.record ? <SmallButton onClick={() => openRecord(row.record!)}>Details</SmallButton> : null}
          {canAdjust ? <SmallButton onClick={() => openSeededEditor(row)}>{row.record ? "Correct" : "Create"}</SmallButton> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <AttendanceFilters
        filters={{ ...filters, from: filters.from || dateInput(board?.date ?? "") }}
        employees={employees}
        sessionUser={sessionUser}
        onApply={(params) => {
          params.set("tab", "board");
          router.push(`/attendance?${params.toString()}`);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="Scheduled" value={metrics?.scheduled ?? 0} icon={CalendarClock} tone="blue" />
        <MetricCard label="Present" value={metrics?.present ?? 0} icon={PlayCircle} tone="green" />
        <MetricCard label="On break" value={metrics?.onBreak ?? 0} icon={PauseCircle} tone="orange" />
        <MetricCard label="On leave" value={metrics?.onLeave ?? 0} icon={CalendarCheck2} tone="green" />
        <MetricCard label="Absent" value={metrics?.absent ?? 0} icon={AlertTriangle} tone="orange" />
        <MetricCard label="Late" value={metrics?.late ?? 0} icon={Clock3} tone="purple" />
        <MetricCard label="Corrections" value={metrics?.pendingCorrections ?? 0} icon={FileText} tone="blue" />
      </div>

      {selectedRecord ? (
        <RecordDetailPanel
          record={selectedRecord}
          canAdjust={canAdjust}
          canRequest={false}
          onAdjust={() => {
            setEditingRecord(selectedRecord);
            setRecordSeed(null);
          }}
          onRequest={() => undefined}
          onClose={() => setSelectedRecord(null)}
        />
      ) : null}

      {canAdjust && (editingRecord || recordSeed) ? (
        <ManualRecordForm
          key={editingRecord?.id ?? `${recordSeed?.employeeId ?? "new"}-${recordSeed?.workDate ?? "today"}`}
          employees={employees}
          record={editingRecord}
          seed={recordSeed}
          onClear={() => {
            setEditingRecord(null);
            setRecordSeed(null);
          }}
        />
      ) : null}

      <DataTable
        eyebrow="Supervisor board"
        title={`Daily attendance for ${formatDate(board?.date)}`}
        description="One row per employee in scope, combining scheduled work, live punch state, exceptions, and pending corrections."
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.employeeId}
        onRowClick={(row) => {
          if (row.record) openRecord(row.record);
        }}
        getRowActionLabel={(row) => row.record ? `View punch details for ${employeeLabel(row.employee)}` : `Open daily attendance row for ${employeeLabel(row.employee) || row.employeeId}`}
        emptyTitle="No daily attendance rows found"
        emptyBody="Adjust the date or employee filters to review scheduled and actual time."
      />
    </div>
  );
}

function RecordsPanel({
  rows,
  canOperateTeam,
  employees,
  filters,
  sessionUser,
}: {
  rows: AttendanceRecord[];
  canOperateTeam: boolean;
  employees: ScheduleEmployee[];
  filters: AttendancePageFilters;
  sessionUser: AuthUser;
}) {
  const router = useRouter();
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [showRecordEditor, setShowRecordEditor] = useState(false);
  const [requestingRecord, setRequestingRecord] = useState<AttendanceRecord | null>(null);

  function openRecordDetails(record: AttendanceRecord) {
    setSelectedRecord(record);
    setShowRecordEditor(false);
    setRequestingRecord(null);
    window.requestAnimationFrame(() => {
      document.getElementById("attendance-record-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openRecordEditor(record: AttendanceRecord | null) {
    setEditingRecord(record);
    setShowRecordEditor(true);
    if (record) {
      setSelectedRecord(record);
    }
    window.requestAnimationFrame(() => {
      document.getElementById("attendance-record-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openCorrectionRequest(record: AttendanceRecord) {
    setRequestingRecord(record);
    setSelectedRecord(record);
    setShowRecordEditor(false);
    window.requestAnimationFrame(() => {
      document.getElementById("attendance-correction-request")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closeRecordEditor() {
    setEditingRecord(null);
    setShowRecordEditor(false);
  }

  const columns: Array<DataTableColumn<AttendanceRecord>> = [
    {
      key: "employee",
      header: "Employee",
      render: (row) => <EmployeeCell employee={row.employee} fallback={row.employeeId} />,
    },
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <div>
          <p className="font-black">{formatDate(row.workDate)}</p>
          <p className="text-xs font-semibold text-[#74809a]">
            {formatTime(row.actualClockInAt)}-{formatTime(row.actualClockOutAt)}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "planned", header: "Planned", render: (row) => minutesCell(row.scheduledMinutes) },
    { key: "actual", header: "Actual", render: (row) => minutesCell(row.actualMinutes) },
    { key: "payable", header: "Payable", render: (row) => minutesCell(row.payableMinutes) },
    { key: "overtime", header: "Overtime", render: (row) => minutesCell(row.overtimeMinutes) },
    {
      key: "exceptions",
      header: "Signals",
      render: (row) => <span className="font-black text-[#4b22e8]">{row.exceptions?.length ?? 0}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <SmallButton onClick={() => openRecordDetails(row)}>
            Details
          </SmallButton>
          {canOperateTeam ? (
            <SmallButton onClick={() => openRecordEditor(row)}>
              Adjust
            </SmallButton>
          ) : (
            <SmallButton onClick={() => openCorrectionRequest(row)}>
              Request
            </SmallButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <AttendanceFilters
        filters={filters}
        employees={employees}
        sessionUser={sessionUser}
        onApply={(params) => router.push(`/attendance?${params.toString()}`)}
      />
      {canOperateTeam ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] px-4 py-3">
          <p className="text-sm font-bold leading-5 text-[#63708a]">
            Click any attendance row to see punches, breaks, exceptions, and correction history.
          </p>
          <button type="button" className="secondary-action" onClick={() => openRecordEditor(null)}>
            <FileClock size={15} />
            New record
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] px-4 py-3">
          <p className="text-sm font-bold leading-5 text-[#63708a]">
            Click any attendance row to see your punch details, breaks, exceptions, and correction history.
          </p>
        </div>
      )}
      {selectedRecord ? (
        <RecordDetailPanel
          record={selectedRecord}
          canAdjust={canOperateTeam}
          canRequest={!canOperateTeam}
          onAdjust={() => openRecordEditor(selectedRecord)}
          onRequest={() => openCorrectionRequest(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
        />
      ) : null}
      {requestingRecord ? (
        <CorrectionRequestForm
          record={requestingRecord}
          onClear={() => setRequestingRecord(null)}
        />
      ) : null}
      {canOperateTeam && showRecordEditor ? (
        <ManualRecordForm
          key={editingRecord?.id ?? "new-manual-record"}
          employees={employees}
          record={editingRecord}
          onClear={closeRecordEditor}
        />
      ) : null}
      <DataTable
        eyebrow="Attendance records"
        title={canOperateTeam ? "Actual time across your scope" : "My actual time"}
        description="Records compare planned work with clock-in, clock-out, breaks, payable minutes, and exception signals."
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={openRecordDetails}
        getRowActionLabel={(row) => `View attendance details for ${employeeLabel(row.employee)} on ${formatDate(row.workDate)}`}
        emptyTitle="No attendance records found"
        emptyBody="Adjust the date range or clock in to start recording attendance."
      />
    </div>
  );
}

function RecordDetailPanel({
  record,
  canAdjust,
  canRequest,
  onAdjust,
  onRequest,
  onClose,
}: {
  record: AttendanceRecord;
  canAdjust: boolean;
  canRequest: boolean;
  onAdjust: () => void;
  onRequest: () => void;
  onClose: () => void;
}) {
  const activities = recordActivities(record);
  const adjustments = adjustmentHistory(record);
  const shiftName = record.scheduleAssignment?.shift?.name ?? "No linked shift";

  return (
    <section id="attendance-record-detail" className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_10px_24px_rgba(18,31,67,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Punch details</p>
          <h3 className="mt-1 text-lg font-black text-[#11143a]">
            {employeeLabel(record.employee) || record.employeeId} · {formatDate(record.workDate)}
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#74809a]">
            {shiftName} · {record.locationName ?? "No location recorded"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAdjust ? (
            <button type="button" className="primary-action" onClick={onAdjust}>
              <FileClock size={15} />
              Correct record
            </button>
          ) : null}
          {canRequest ? (
            <button type="button" className="primary-action" onClick={onRequest}>
              <FileText size={15} />
              Request correction
            </button>
          ) : null}
          <button type="button" className="secondary-action" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DetailMetric label="Status" value={humanize(record.status)} />
        <DetailMetric label="Clock in" value={formatDateTime(record.actualClockInAt)} />
        <DetailMetric label="Clock out" value={formatDateTime(record.actualClockOutAt)} />
        <DetailMetric label="Breaks" value={minutesCell(record.breakMinutes)} />
        <DetailMetric label="Payable" value={minutesCell(record.payableMinutes)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[#e5ebf5] bg-[#fbfcff] p-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#4b22e8]" />
            <p className="text-sm font-black text-[#11143a]">Clock activity</p>
          </div>
          <div className="mt-3 space-y-3">
            {activities.map((activity) => (
              <div key={activity.key} className="rounded-lg border border-[#e5ebf5] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#11143a]">{activity.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[#74809a]">{activity.detail}</p>
                  </div>
                  <p className="text-xs font-black text-[#4b22e8]">{formatDateTime(activity.at)}</p>
                </div>
                {activity.note ? <p className="mt-2 text-xs font-semibold leading-5 text-[#65708a]">{activity.note}</p> : null}
              </div>
            ))}
            {activities.length === 0 ? <EmptyInline text="No punch activity is attached to this record yet." /> : null}
          </div>
        </div>

        <div className="grid gap-4">
          <DetailList
            icon={PauseCircle}
            title="Breaks"
            empty="No break activity is attached to this record."
            items={(record.breaks ?? []).map((breakEntry) => ({
              key: breakEntry.id,
              title: breakEntry.endedAt ? `${minutesCell(breakEntry.minutes)} break` : "Active break",
              detail: `${formatDateTime(breakEntry.startedAt)} - ${formatDateTime(breakEntry.endedAt)}`,
            }))}
          />
          <DetailList
            icon={AlertTriangle}
            title="Exceptions"
            empty="No exception signals are attached to this record."
            items={(record.exceptions ?? []).map((exception) => ({
              key: exception.id,
              title: humanize(exception.title || exception.type),
              detail: `${humanize(exception.status)} · ${exception.minutes ? minutesCell(exception.minutes) : "No minutes"} · ${formatDateTime(exception.occurredAt)}`,
              note: exception.description,
            }))}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#e5ebf5] bg-[#fbfcff] p-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#4b22e8]" />
          <p className="text-sm font-black text-[#11143a]">Correction history</p>
        </div>
        <div className="mt-3 space-y-3">
          {adjustments.map((adjustment, index) => (
            <div key={`${adjustment.adjustedAt ?? "adjustment"}-${index}`} className="rounded-lg border border-[#e5ebf5] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#11143a]">{adjustment.reason || "Manual correction"}</p>
                  <p className="mt-1 text-xs font-semibold text-[#74809a]">
                    By {adjustment.adjustedById || "unknown"} · {formatDateTime(adjustment.adjustedAt)}
                  </p>
                </div>
                {adjustment.supportingDocumentUrl ? (
                  <a className="text-xs font-black text-[#4b22e8] underline-offset-4 hover:underline" href={adjustment.supportingDocumentUrl} target="_blank" rel="noreferrer">
                    Supporting file
                  </a>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <ChangeSnapshot label="Before" value={adjustment.previous} />
                <ChangeSnapshot label="After" value={adjustment.next} />
              </div>
            </div>
          ))}
          {adjustments.length === 0 ? <EmptyInline text="No manual corrections have been recorded for this attendance record." /> : null}
        </div>
      </div>
    </section>
  );
}

function CorrectionsPanel({
  rows,
  canApprove,
  onDecision,
  filters,
  sessionUser,
}: {
  rows: AttendanceCorrectionRequest[];
  canApprove: boolean;
  onDecision: (row: AttendanceCorrectionRequest, status: AttendanceCorrectionDecisionStatus) => void;
  filters: AttendancePageFilters;
  sessionUser: AuthUser;
}) {
  const router = useRouter();
  const columns: Array<DataTableColumn<AttendanceCorrectionRequest>> = [
    { key: "employee", header: "Employee", render: (row) => <EmployeeCell employee={row.employee} fallback={row.employeeId} /> },
    {
      key: "requested",
      header: "Requested change",
      render: (row) => (
        <div>
          <p className="font-black">{formatDate(row.workDate)}</p>
          <p className="text-xs font-semibold text-[#74809a]">
            {formatTime(row.requestedClockInAt)}-{formatTime(row.requestedClockOutAt)} · {minutesCell(row.requestedBreakMinutes ?? 0)} break
          </p>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => (
        <div>
          <p className="max-w-md text-sm font-bold leading-5 text-[#11143a]">{row.reason}</p>
          {row.supportingDocumentUrl ? (
            <a className="mt-1 inline-block text-xs font-black text-[#4b22e8] underline-offset-4 hover:underline" href={row.supportingDocumentUrl} target="_blank" rel="noreferrer">
              Supporting file
            </a>
          ) : null}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "policy",
      header: "Policy",
      render: (row) => {
        const warnings = row.policyViolations?.warnings?.length ?? 0;
        const blocks = row.policyViolations?.violations?.length ?? 0;
        return <span className="text-xs font-black text-[#63708a]">{blocks} blocks · {warnings} warnings</span>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) =>
        canApprove && row.status === "REQUESTED" ? (
          <div className="flex flex-wrap gap-2">
            <SmallButton onClick={() => onDecision(row, "APPROVED")}>Approve</SmallButton>
            <SmallButton tone="danger" onClick={() => onDecision(row, "REJECTED")}>Reject</SmallButton>
          </div>
        ) : (
          <span className="text-xs font-black uppercase text-[#74809a]">No action</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <CorrectionFilters
        filters={filters}
        sessionUser={sessionUser}
        onApply={(params) => router.push(`/attendance?${params.toString()}`)}
      />
      <DataTable
        eyebrow="Correction workflow"
        title="Punch correction requests"
        description="Employees can request time corrections; supervisors and HR approve them before the record changes."
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="No correction requests in this view"
        emptyBody="Correction requests appear here when someone submits a punch or break adjustment for approval."
      />
    </div>
  );
}

function ExceptionsPanel({
  rows,
  canApprove,
  onDecision,
  filters,
  sessionUser,
}: {
  rows: AttendanceException[];
  canApprove: boolean;
  onDecision: (row: AttendanceException, status: AttendanceExceptionDecisionStatus) => void;
  filters: AttendancePageFilters;
  sessionUser: AuthUser;
}) {
  const router = useRouter();
  const columns: Array<DataTableColumn<AttendanceException>> = [
    { key: "employee", header: "Employee", render: (row) => <EmployeeCell employee={row.employee} fallback={row.employeeId} /> },
    {
      key: "type",
      header: "Exception",
      render: (row) => (
        <div>
          <p className="font-black">{humanize(row.title || row.type)}</p>
          <p className="mt-1 max-w-md text-xs font-semibold text-[#74809a]">{row.description ?? humanize(row.type)}</p>
        </div>
      ),
    },
    { key: "occurred", header: "Occurred", render: (row) => formatDateTime(row.occurredAt) },
    { key: "minutes", header: "Minutes", render: (row) => (row.minutes ? minutesCell(row.minutes) : "None") },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) =>
        canApprove && ["OPEN", "SUBMITTED"].includes(row.status) ? (
          <div className="flex flex-wrap gap-2">
            <SmallButton onClick={() => onDecision(row, "RESOLVED")}>Resolve</SmallButton>
            <SmallButton tone="danger" onClick={() => onDecision(row, "REJECTED")}>Reject</SmallButton>
          </div>
        ) : (
          <span className="text-xs font-black uppercase text-[#74809a]">No action</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <ExceptionFilters
        filters={filters}
        sessionUser={sessionUser}
        onApply={(params) => router.push(`/attendance?${params.toString()}`)}
      />
      <DataTable
        eyebrow="Exception queue"
        title="Late, missed, unscheduled, and overtime signals"
        description="Managers and HR can resolve exceptions with notes; employees can see why a record needs attention."
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="No exceptions in this view"
        emptyBody="Attendance exceptions appear here when planned and actual work do not line up."
      />
    </div>
  );
}

function TimesheetsPanel({
  rows,
  canGenerate,
  canApprove,
  employees,
  onSubmit,
  onDecision,
  payrollExports,
}: {
  rows: AttendanceTimesheet[];
  canGenerate: boolean;
  canApprove: boolean;
  employees: ScheduleEmployee[];
  onSubmit: (timesheetId: string) => void;
  onDecision: (row: AttendanceTimesheet, status: AttendanceTimesheetDecisionStatus) => void;
  payrollExports: AttendancePayrollExport[];
}) {
  const columns: Array<DataTableColumn<AttendanceTimesheet>> = [
    { key: "employee", header: "Employee", render: (row) => <EmployeeCell employee={row.employee} fallback={row.employeeId} /> },
    {
      key: "period",
      header: "Period",
      render: (row) => (
        <div>
          <p className="font-black">{formatDate(row.periodStart)}</p>
          <p className="text-xs font-semibold text-[#74809a]">to {formatDate(row.periodEnd)}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "regular", header: "Regular", render: (row) => minutesCell(row.regularMinutes) },
    { key: "overtime", header: "Overtime", render: (row) => minutesCell(row.overtimeMinutes) },
    { key: "exceptions", header: "Exceptions", render: (row) => <span className="font-black text-[#c76a00]">{row.exceptionCount}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "DRAFT" ? <SmallButton onClick={() => onSubmit(row.id)}>Submit</SmallButton> : null}
          {canApprove && row.status === "SUBMITTED" ? (
            <>
              <SmallButton onClick={() => onDecision(row, "APPROVED")}>Approve</SmallButton>
              <SmallButton tone="danger" onClick={() => onDecision(row, "REJECTED")}>Reject</SmallButton>
            </>
          ) : null}
          {canApprove && row.status === "APPROVED" ? <SmallButton onClick={() => onDecision(row, "LOCKED")}>Lock</SmallButton> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {canGenerate ? <GenerateTimesheetForm employees={employees} /> : null}
      {canApprove ? <PayrollPeriodTools employees={employees} exports={payrollExports} /> : null}
      <DataTable
        eyebrow="Timesheets"
        title="Pay-period attendance approval"
        description="Generate timesheets from schedules and attendance records, then approve or return them with clear decision notes."
        rows={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="No timesheets found"
        emptyBody="Generate a pay-period timesheet after attendance records exist."
      />
    </div>
  );
}

function ControlsPanel({
  geofences,
  devices,
  kioskCredentials,
  holidays,
  premiumRules,
  employees,
  canManage,
}: {
  geofences: AttendanceGeofence[];
  devices: AttendanceClockDevice[];
  kioskCredentials: AttendanceKioskCredential[];
  holidays: AttendanceHoliday[];
  premiumRules: AttendancePremiumRule[];
  employees: ScheduleEmployee[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  function refresh() {
    router.refresh();
  }

  async function patchGeofenceStatus(id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    try {
      await apiFetch(`/attendance/geofences/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Geofence updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Geofence could not be updated.");
    }
  }

  async function patchDeviceStatus(id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    try {
      await apiFetch(`/attendance/devices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Clock device updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Clock device could not be updated.");
    }
  }

  async function patchCredentialStatus(id: string, status: "ACTIVE" | "INACTIVE" | "REVOKED") {
    try {
      await apiFetch(`/attendance/kiosk-credentials/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Kiosk credential updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kiosk credential could not be updated.");
    }
  }

  async function patchHolidayStatus(id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    try {
      await apiFetch(`/attendance/holidays/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Holiday updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Holiday could not be updated.");
    }
  }

  async function patchPremiumRuleStatus(id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    try {
      await apiFetch(`/attendance/premium-rules/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Premium rule updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Premium rule could not be updated.");
    }
  }

  const geofenceColumns: Array<DataTableColumn<AttendanceGeofence>> = [
    {
      key: "name",
      header: "Geofence",
      render: (row) => (
        <div>
          <p className="font-black">{row.name}</p>
          <p className="text-xs font-semibold text-[#74809a]">{row.code}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "radius", header: "Radius", render: (row) => `${row.radiusMeters}m` },
    { key: "location", header: "Location", render: (row) => row.locationName || `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}` },
    { key: "devices", header: "Devices", render: (row) => row.devices?.length ?? 0 },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "ACTIVE" ? (
            <SmallButton tone="danger" onClick={() => void patchGeofenceStatus(row.id, "INACTIVE")}>Disable</SmallButton>
          ) : (
            <SmallButton onClick={() => void patchGeofenceStatus(row.id, "ACTIVE")}>Activate</SmallButton>
          )}
          {row.status !== "ARCHIVED" ? <SmallButton tone="danger" onClick={() => void patchGeofenceStatus(row.id, "ARCHIVED")}>Archive</SmallButton> : null}
        </div>
      ),
    },
  ];

  const deviceColumns: Array<DataTableColumn<AttendanceClockDevice>> = [
    {
      key: "name",
      header: "Device",
      render: (row) => (
        <div>
          <p className="font-black">{row.name}</p>
          <p className="text-xs font-semibold text-[#74809a]">{row.deviceId}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", render: (row) => humanize(row.type) },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "geofence", header: "Geofence", render: (row) => row.geofence?.name ?? "None" },
    { key: "lastSeen", header: "Last seen", render: (row) => formatDateTime(row.lastSeenAt) },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "ACTIVE" ? (
            <SmallButton tone="danger" onClick={() => void patchDeviceStatus(row.id, "INACTIVE")}>Disable</SmallButton>
          ) : (
            <SmallButton onClick={() => void patchDeviceStatus(row.id, "ACTIVE")}>Activate</SmallButton>
          )}
          {row.status !== "ARCHIVED" ? <SmallButton tone="danger" onClick={() => void patchDeviceStatus(row.id, "ARCHIVED")}>Archive</SmallButton> : null}
        </div>
      ),
    },
  ];

  const credentialColumns: Array<DataTableColumn<AttendanceKioskCredential>> = [
    {
      key: "badge",
      header: "Badge",
      render: (row) => (
        <div>
          <p className="font-black">{row.badgeNumber}</p>
          <p className="text-xs font-semibold text-[#74809a]">{employeeLabel(row.employee)}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "expires", header: "Expires", render: (row) => formatDate(row.expiresAt) },
    { key: "lastUsed", header: "Last used", render: (row) => formatDateTime(row.lastUsedAt) },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "ACTIVE" ? (
            <SmallButton tone="danger" onClick={() => void patchCredentialStatus(row.id, "INACTIVE")}>Disable</SmallButton>
          ) : (
            <SmallButton onClick={() => void patchCredentialStatus(row.id, "ACTIVE")}>Activate</SmallButton>
          )}
          {row.status !== "REVOKED" ? <SmallButton tone="danger" onClick={() => void patchCredentialStatus(row.id, "REVOKED")}>Revoke</SmallButton> : null}
        </div>
      ),
    },
  ];

  const holidayColumns: Array<DataTableColumn<AttendanceHoliday>> = [
    {
      key: "holiday",
      header: "Holiday",
      render: (row) => (
        <div>
          <p className="font-black">{row.name}</p>
          <p className="text-xs font-semibold text-[#74809a]">{row.code}</p>
        </div>
      ),
    },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "premium", header: "Premium", render: (row) => `${row.multiplier}x ${row.paid ? "paid" : "unpaid"}` },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "ACTIVE" ? (
            <SmallButton tone="danger" onClick={() => void patchHolidayStatus(row.id, "INACTIVE")}>Disable</SmallButton>
          ) : (
            <SmallButton onClick={() => void patchHolidayStatus(row.id, "ACTIVE")}>Activate</SmallButton>
          )}
          {row.status !== "ARCHIVED" ? <SmallButton tone="danger" onClick={() => void patchHolidayStatus(row.id, "ARCHIVED")}>Archive</SmallButton> : null}
        </div>
      ),
    },
  ];

  const premiumRuleColumns: Array<DataTableColumn<AttendancePremiumRule>> = [
    {
      key: "rule",
      header: "Rule",
      render: (row) => (
        <div>
          <p className="font-black">{row.name}</p>
          <p className="text-xs font-semibold text-[#74809a]">{row.code}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", render: (row) => humanize(row.type) },
    { key: "multiplier", header: "Multiplier", render: (row) => `${row.multiplier}x` },
    { key: "window", header: "Window", render: (row) => minuteWindow(row.startsAtMinute, row.endsAtMinute) },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.status === "ACTIVE" ? (
            <SmallButton tone="danger" onClick={() => void patchPremiumRuleStatus(row.id, "INACTIVE")}>Disable</SmallButton>
          ) : (
            <SmallButton onClick={() => void patchPremiumRuleStatus(row.id, "ACTIVE")}>Activate</SmallButton>
          )}
          {row.status !== "ARCHIVED" ? <SmallButton tone="danger" onClick={() => void patchPremiumRuleStatus(row.id, "ARCHIVED")}>Archive</SmallButton> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {canManage ? (
        <>
        <div className="grid gap-4 xl:grid-cols-2">
          <form
            className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const name = stringValue(formData.get("name"));
              const code = stringValue(formData.get("code"));
              const latitude = numberValue(formData.get("latitude"));
              const longitude = numberValue(formData.get("longitude"));

              if (!name || !code || latitude === undefined || longitude === undefined) {
                toast.error("Geofence code, name, latitude, and longitude are required.");
                return;
              }

              startSaving(async () => {
                try {
                  await apiFetch("/attendance/geofences", {
                    method: "POST",
                    body: JSON.stringify({
                      code: code.toUpperCase(),
                      name,
                      latitude,
                      longitude,
                      radiusMeters: numberValue(formData.get("radiusMeters")) ?? 150,
                      locationName: stringValue(formData.get("locationName")),
                    }),
                  });
                  toast.success("Geofence created.");
                  event.currentTarget.reset();
                  refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Geofence could not be created.");
                }
              });
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Geofence</p>
                <h3 className="mt-1 text-lg font-black text-[#11143a]">Approved work location</h3>
              </div>
              <button type="submit" disabled={saving} className="primary-action w-auto px-5"><MapPin size={17} /> Save</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Code"><input name="code" className="form-field" placeholder="MAIN_CLINIC" required /></Field>
              <Field label="Name"><input name="name" className="form-field" placeholder="Main clinic" required /></Field>
              <Field label="Latitude"><input name="latitude" type="number" step="0.000001" className="form-field" required /></Field>
              <Field label="Longitude"><input name="longitude" type="number" step="0.000001" className="form-field" required /></Field>
              <Field label="Radius meters"><input name="radiusMeters" type="number" min="5" className="form-field" defaultValue={150} /></Field>
              <Field label="Location name"><input name="locationName" className="form-field" placeholder="Lobby, Ward A, Branch 2" /></Field>
            </div>
          </form>

          <form
            className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const deviceId = stringValue(formData.get("deviceId"));
              const name = stringValue(formData.get("name"));

              if (!deviceId || !name) {
                toast.error("Device ID and name are required.");
                return;
              }

              startSaving(async () => {
                try {
                  await apiFetch("/attendance/devices", {
                    method: "POST",
                    body: JSON.stringify({
                      deviceId,
                      name,
                      type: stringValue(formData.get("type")) ?? "KIOSK",
                      geofenceId: stringValue(formData.get("geofenceId")),
                      employeeId: stringValue(formData.get("employeeId")),
                      locationName: stringValue(formData.get("locationName")),
                    }),
                  });
                  toast.success("Clock device registered.");
                  event.currentTarget.reset();
                  refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Clock device could not be registered.");
                }
              });
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Device</p>
                <h3 className="mt-1 text-lg font-black text-[#11143a]">Kiosk or trusted clock device</h3>
              </div>
              <button type="submit" disabled={saving} className="primary-action w-auto px-5"><MonitorSmartphone size={17} /> Save</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Device ID"><input name="deviceId" className="form-field" placeholder="KIOSK-LOBBY-01" required /></Field>
              <Field label="Name"><input name="name" className="form-field" placeholder="Lobby kiosk" required /></Field>
              <Field label="Type">
                <select name="type" className="form-field" defaultValue="KIOSK">
                  {["KIOSK", "TRUSTED_DEVICE", "MOBILE_DEVICE", "WEB_TERMINAL"].map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
                </select>
              </Field>
              <Field label="Geofence">
                <select name="geofenceId" className="form-field">
                  <option value="">None</option>
                  {geofences.map((geofence) => <option key={geofence.id} value={geofence.id}>{geofence.name}</option>)}
                </select>
              </Field>
              <Field label="Employee">
                <select name="employeeId" className="form-field">
                  <option value="">Shared device</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
                </select>
              </Field>
              <Field label="Location name"><input name="locationName" className="form-field" placeholder="Front desk" /></Field>
            </div>
          </form>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <form
            className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const employeeId = stringValue(formData.get("employeeId"));
              const badgeNumber = stringValue(formData.get("badgeNumber"));
              const pin = stringValue(formData.get("pin"));

              if (!employeeId || !badgeNumber || !pin) {
                toast.error("Employee, badge number, and PIN are required.");
                return;
              }

              startSaving(async () => {
                try {
                  await apiFetch("/attendance/kiosk-credentials", {
                    method: "POST",
                    body: JSON.stringify({
                      employeeId,
                      badgeNumber,
                      pin,
                      expiresAt: dateInputToIso(formData.get("expiresAt")),
                    }),
                  });
                  toast.success("Kiosk credential created.");
                  event.currentTarget.reset();
                  refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Kiosk credential could not be created.");
                }
              });
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Badge PIN</p>
                <h3 className="mt-1 text-lg font-black text-[#11143a]">Kiosk credential</h3>
              </div>
              <button type="submit" disabled={saving} className="primary-action w-auto px-5"><Fingerprint size={17} /> Save</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Employee">
                <select name="employeeId" className="form-field" required>
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
                </select>
              </Field>
              <Field label="Badge number"><input name="badgeNumber" className="form-field" placeholder="ACME-0004" required /></Field>
              <Field label="PIN"><input name="pin" type="password" minLength={4} className="form-field" required /></Field>
              <Field label="Expires"><input name="expiresAt" type="date" className="form-field" /></Field>
            </div>
          </form>

          <form
            className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const badgeNumber = stringValue(formData.get("badgeNumber"));
              const pin = stringValue(formData.get("pin"));
              const deviceId = stringValue(formData.get("deviceId"));

              if (!badgeNumber || !pin || !deviceId) {
                toast.error("Badge, PIN, and kiosk device are required.");
                return;
              }

              startSaving(async () => {
                try {
                  const punchContext = await attendancePunchContext(true);
                  await apiFetch("/attendance/kiosk/punch", {
                    method: "POST",
                    body: JSON.stringify({
	                      badgeNumber,
	                      pin,
	                      type: stringValue(formData.get("type")) ?? "CLOCK_IN",
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      note: stringValue(formData.get("note")),
                      photoAttestationUrl: stringValue(formData.get("photoAttestationUrl")),
                      ...punchContext,
                      deviceId,
                    }),
                  });
                  toast.success("Kiosk punch recorded.");
                  event.currentTarget.reset();
                  refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Kiosk punch could not be recorded.");
                }
              });
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Kiosk punch</p>
                <h3 className="mt-1 text-lg font-black text-[#11143a]">Badge/PIN clock</h3>
              </div>
              <button type="submit" disabled={saving} className="primary-action w-auto px-5"><MonitorSmartphone size={17} /> Punch</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Badge number"><input name="badgeNumber" className="form-field" required /></Field>
              <Field label="PIN"><input name="pin" type="password" minLength={4} className="form-field" required /></Field>
              <Field label="Device ID"><input name="deviceId" className="form-field" placeholder="KIOSK-LOBBY-01" required /></Field>
              <Field label="Punch">
                <select name="type" className="form-field" defaultValue="CLOCK_IN">
                  {["CLOCK_IN", "CLOCK_OUT", "BREAK_START", "BREAK_END"].map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
                </select>
              </Field>
              <Field label="Photo URL"><input name="photoAttestationUrl" className="form-field" placeholder="https://..." /></Field>
              <Field label="Note"><input name="note" className="form-field" /></Field>
            </div>
          </form>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <form
            className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const code = stringValue(formData.get("code"));
              const name = stringValue(formData.get("name"));
              const date = dateInputToIso(formData.get("date"));

              if (!code || !name || !date) {
                toast.error("Holiday code, name, and date are required.");
                return;
              }

              startSaving(async () => {
                try {
                  await apiFetch("/attendance/holidays", {
                    method: "POST",
                    body: JSON.stringify({
                      code: code.toUpperCase(),
                      name,
                      date,
                      paid: formData.get("paid") === "on",
                      multiplier: numberValue(formData.get("multiplier")) ?? 1,
                    }),
                  });
                  toast.success("Holiday created.");
                  event.currentTarget.reset();
                  refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Holiday could not be created.");
                }
              });
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Holiday</p>
                <h3 className="mt-1 text-lg font-black text-[#11143a]">Payroll holiday</h3>
              </div>
              <button type="submit" disabled={saving} className="primary-action w-auto px-5"><CalendarClock size={17} /> Save</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Code"><input name="code" className="form-field" placeholder="MEMORIAL_DAY" required /></Field>
              <Field label="Name"><input name="name" className="form-field" placeholder="Memorial Day" required /></Field>
              <Field label="Date"><input name="date" type="date" className="form-field" required /></Field>
              <Field label="Multiplier"><input name="multiplier" type="number" step="0.01" min="0" className="form-field" defaultValue={1.5} /></Field>
              <label className="form-check md:col-span-2"><input type="checkbox" name="paid" defaultChecked /> Paid holiday</label>
            </div>
          </form>

          <form
            className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const code = stringValue(formData.get("code"));
              const name = stringValue(formData.get("name"));

              if (!code || !name) {
                toast.error("Premium rule code and name are required.");
                return;
              }

              startSaving(async () => {
                try {
                  await apiFetch("/attendance/premium-rules", {
                    method: "POST",
                    body: JSON.stringify({
                      code: code.toUpperCase(),
                      name,
                      type: stringValue(formData.get("type")) ?? "NIGHT",
                      multiplier: numberValue(formData.get("multiplier")) ?? 1.25,
                      startsAtMinute: timeInputToMinute(formData.get("startsAt")),
                      endsAtMinute: timeInputToMinute(formData.get("endsAt")),
                      weekdays: weekdayValues(formData),
                      locationName: stringValue(formData.get("locationName")),
                    }),
                  });
                  toast.success("Premium rule created.");
                  event.currentTarget.reset();
                  refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Premium rule could not be created.");
                }
              });
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Premium</p>
                <h3 className="mt-1 text-lg font-black text-[#11143a]">Differential rule</h3>
              </div>
              <button type="submit" disabled={saving} className="primary-action w-auto px-5"><BriefcaseBusiness size={17} /> Save</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Code"><input name="code" className="form-field" placeholder="NIGHT_DIFF" required /></Field>
              <Field label="Name"><input name="name" className="form-field" placeholder="Night differential" required /></Field>
              <Field label="Type">
                <select name="type" className="form-field" defaultValue="NIGHT">
                  {["HOLIDAY", "WEEKEND", "NIGHT", "SHIFT_DIFFERENTIAL", "CUSTOM"].map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
                </select>
              </Field>
              <Field label="Multiplier"><input name="multiplier" type="number" step="0.01" min="0" className="form-field" defaultValue={1.25} /></Field>
              <Field label="Starts"><input name="startsAt" type="time" className="form-field" /></Field>
              <Field label="Ends"><input name="endsAt" type="time" className="form-field" /></Field>
              <Field label="Location"><input name="locationName" className="form-field" placeholder="Optional exact location" /></Field>
              <div className="grid grid-cols-4 gap-2 text-xs font-black text-[#52607a]">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => <label key={day} className="form-check"><input type="checkbox" name="weekdays" value={day} /> {shortWeekday(day)}</label>)}
              </div>
            </div>
          </form>
        </div>
        </>
      ) : (
        <EmptyInline text="Attendance control management is not available for this role." />
      )}

      <DataTable
        eyebrow="Geofence controls"
        title="Approved attendance locations"
        description="Geofences define where mobile and location-aware punches are accepted or flagged."
        rows={geofences}
        columns={geofenceColumns}
        getRowKey={(row) => row.id}
        emptyTitle="No geofences configured"
        emptyBody="Create a geofence before enforcing location-based attendance policy."
      />

      <DataTable
        eyebrow="Device controls"
        title="Kiosks and trusted clock devices"
        description="Registered devices can be tied to geofences and monitored by status and last-seen activity."
        rows={devices}
        columns={deviceColumns}
        getRowKey={(row) => row.id}
        emptyTitle="No clock devices configured"
        emptyBody="Register kiosks or trusted devices before requiring known-device punches."
      />

      <DataTable
        eyebrow="Kiosk credentials"
        title="Badge/PIN access"
        description="Credentials are hashed and can be disabled or revoked without changing employee profiles."
        rows={kioskCredentials}
        columns={credentialColumns}
        getRowKey={(row) => row.id}
        emptyTitle="No kiosk credentials"
        emptyBody="Create a badge/PIN credential before using kiosk punch mode."
      />

      <DataTable
        eyebrow="Payroll controls"
        title="Holidays"
        description="Holidays feed premium calculations in payroll exports and lock snapshots."
        rows={holidays}
        columns={holidayColumns}
        getRowKey={(row) => row.id}
        emptyTitle="No holidays configured"
        emptyBody="Create holidays before applying holiday premium calculations."
      />

      <DataTable
        eyebrow="Payroll controls"
        title="Premium and differential rules"
        description="Rules add weekend, night, location, or custom premium units to payroll exports."
        rows={premiumRules}
        columns={premiumRuleColumns}
        getRowKey={(row) => row.id}
        emptyTitle="No premium rules configured"
        emptyBody="Create premium rules before exporting differential payroll columns."
      />
    </div>
  );
}

function InsightsPanel({
  report,
  alerts,
  canRead,
  filters,
}: {
  report: AttendanceAdvancedReport | null;
  alerts: AttendancePredictiveAlerts | null;
  canRead: boolean;
  filters: AttendancePageFilters;
}) {
  const router = useRouter();
  const [running, startRunning] = useTransition();
  const [reconciliation, setReconciliation] = useState<AttendanceReconciliationResult | null>(null);

  function refresh() {
    router.refresh();
  }

  function notifyAlerts() {
    startRunning(async () => {
      try {
        const response = await apiFetch<{ notificationCount: number }>("/attendance/alerts/predictive/notify", {
          method: "POST",
          body: JSON.stringify(attendanceScopePayload(filters)),
        });
        toast.success("Alert notifications queued.", { description: `${response.notificationCount} notification${response.notificationCount === 1 ? "" : "s"} created.` });
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Alert notifications could not be queued.");
      }
    });
  }

  function runReconciliation(dryRun: boolean) {
    startRunning(async () => {
      try {
        const response = await apiFetch<AttendanceReconciliationResult>("/attendance/reconciliation/run", {
          method: "POST",
          body: JSON.stringify({
            ...attendanceScopePayload(filters),
            dryRun,
          }),
        });
        setReconciliation(response);
        toast.success(dryRun ? "Reconciliation preview ready." : "Reconciliation applied.", {
          description: `${response.summary.matched} matched, ${response.summary.unmatched} unmatched.`,
        });
        if (!dryRun) {
          refresh();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Reconciliation could not run.");
      }
    });
  }

  if (!canRead) {
    return <EmptyInline text="Attendance reports are not available for this role." />;
  }

  if (!report && !alerts) {
    return <EmptyInline text="Attendance insights are still loading or unavailable for this scope." />;
  }

  const alertRows = alerts?.alerts ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Payable hours" value={minutesCell(report?.totals.payableMinutes ?? 0)} icon={Clock3} tone="green" />
        <MetricCard label="Overtime" value={minutesCell(report?.totals.overtimeMinutes ?? 0)} icon={BriefcaseBusiness} tone="orange" />
        <MetricCard label="Payroll blockers" value={report?.payrollReadiness.blockerCount ?? 0} icon={LockKeyhole} tone="purple" />
        <MetricCard label="Known devices" value={report?.metrics.knownDevicePunches ?? 0} icon={MonitorSmartphone} tone="blue" />
        <MetricCard label="Predictive alerts" value={alerts?.summary.alertCount ?? 0} icon={BellRing} tone="orange" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={17} className="text-[#4b22e8]" />
            <h3 className="text-lg font-black text-[#11143a]">Daily trend</h3>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] font-black uppercase text-[#74809a]">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Scheduled</th>
                  <th className="px-3 py-2">Records</th>
                  <th className="px-3 py-2">Payable</th>
                  <th className="px-3 py-2">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                {(report?.trends.byDay ?? []).slice(-10).map((day) => (
                  <tr key={day.date} className="border-t border-[#edf1f7]">
                    <td className="px-3 py-2 font-black text-[#11143a]">{day.date}</td>
                    <td className="px-3 py-2 font-semibold text-[#63708a]">{day.scheduledAssignments}</td>
                    <td className="px-3 py-2 font-semibold text-[#63708a]">{day.records}</td>
                    <td className="px-3 py-2 font-semibold text-[#63708a]">{minutesCell(day.payableMinutes)}</td>
                    <td className="px-3 py-2 font-black text-[#c76a00]">{day.exceptions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4">
          <BreakdownPanel title="Exception types" rows={report?.breakdowns.exceptionType ?? []} />
          <BreakdownPanel title="Timesheet status" rows={report?.breakdowns.timesheetStatus ?? []} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Operations</p>
          <h3 className="mt-1 text-lg font-black text-[#11143a]">Alerts and reconciliation</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <SmallButton onClick={notifyAlerts} disabled={running}>Notify alerts</SmallButton>
            <SmallButton onClick={() => runReconciliation(true)} disabled={running}>Preview match</SmallButton>
            <SmallButton onClick={() => runReconciliation(false)} disabled={running}>Apply match</SmallButton>
          </div>
        </div>
        <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Reconciliation</p>
          <h3 className="mt-1 text-lg font-black text-[#11143a]">
            {reconciliation ? `${reconciliation.summary.applied} applied · ${reconciliation.summary.matched} matched` : "No run selected"}
          </h3>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <MetricPill label="Evaluated" value={reconciliation?.summary.evaluated ?? 0} />
            <MetricPill label="Low confidence" value={reconciliation?.summary.lowConfidence ?? 0} />
            <MetricPill label="Already matched" value={reconciliation?.summary.alreadyMatched ?? 0} />
            <MetricPill label="Unmatched" value={reconciliation?.summary.unmatched ?? 0} />
          </div>
        </div>
      </div>

      <DataTable
        eyebrow="Predictive alerts"
        title="Attendance risks needing attention"
        description="Alerts are scored from late trends, exceptions, pending corrections, overtime, and control signals."
        rows={alertRows}
        columns={[
          { key: "employee", header: "Employee", render: (row) => <EmployeeCell employee={row.employee} fallback={row.employeeId} /> },
          {
            key: "alert",
            header: "Alert",
            render: (row) => (
              <div>
                <p className="font-black">{row.title}</p>
                <p className="mt-1 max-w-lg text-xs font-semibold text-[#74809a]">{row.body}</p>
              </div>
            ),
          },
          { key: "severity", header: "Severity", render: (row) => <StatusBadge status={row.severity} /> },
          { key: "score", header: "Score", render: (row) => <span className="font-black text-[#11143a]">{row.score}</span> },
          { key: "action", header: "Next action", render: (row) => <span className="text-xs font-semibold leading-5 text-[#63708a]">{row.recommendedAction}</span> },
        ]}
        getRowKey={(row) => row.id}
        emptyTitle="No predictive alerts"
        emptyBody="No high-risk attendance trend is visible in the selected period."
      />
    </div>
  );
}

function BreakdownPanel({ title, rows }: { title: string; rows: Array<{ key: string; count: number }> }) {
  return (
    <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4">
      <h3 className="text-sm font-black text-[#11143a]">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.slice(0, 6).map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 rounded-lg bg-[#fbfcff] px-3 py-2">
            <span className="text-xs font-black text-[#63708a]">{humanize(row.key)}</span>
            <span className="text-sm font-black text-[#11143a]">{row.count}</span>
          </div>
        ))}
        {rows.length === 0 ? <EmptyInline text="No rows for this period." /> : null}
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[#f8faff] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#74809a]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function PolicyPanel({
  policies,
  activePolicy,
  onActivate,
}: {
  policies: AttendancePolicy[];
  activePolicy: AttendancePolicy | null;
  onActivate: (policyId: string) => void;
}) {
  const columns: Array<DataTableColumn<AttendancePolicy>> = [
    {
      key: "name",
      header: "Policy",
      render: (row) => (
        <div>
          <p className="font-black">{row.name}</p>
          <p className="text-xs font-semibold text-[#74809a]">{row.code}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "grace", header: "Grace", render: (row) => `${row.graceMinutesLate} min late / ${row.graceMinutesEarlyLeave} min early` },
    { key: "rounding", header: "Rounding", render: (row) => `${row.roundingMinutes} min` },
    { key: "overtime", header: "Overtime", render: (row) => `${row.dailyOvertimeMinutes ?? "Daily off"} / ${row.weeklyOvertimeMinutes ?? "Weekly off"}` },
    {
      key: "actions",
      header: "Actions",
      render: (row) =>
        row.status === "ACTIVE" ? (
          <span className="text-xs font-black uppercase text-[#0a8f61]">Active</span>
        ) : (
          <SmallButton onClick={() => onActivate(row.id)}>Activate</SmallButton>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <CreatePolicyForm activePolicy={activePolicy} />
      <DataTable
        eyebrow="Attendance policy"
        title="Clocking, rounding, overtime, and timesheet controls"
        description="The active policy governs how punches become records and how records become approval-ready timesheets."
        rows={policies}
        columns={columns}
        getRowKey={(row) => row.id}
        emptyTitle="No attendance policies found"
        emptyBody="Create a policy to control web clocking, grace windows, overtime thresholds, and timesheet behavior."
      />
    </div>
  );
}

function AttendanceFilters({
  filters,
  employees,
  sessionUser,
  onApply,
}: {
  filters: AttendancePageFilters;
  employees: ScheduleEmployee[];
  sessionUser: AuthUser;
  onApply: (params: URLSearchParams) => void;
}) {
  const canScopeEmployees = hasAnyPermission(sessionUser, ["attendance.team.write", "attendance.write"]);
  return (
    <form
      className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(formParams(event.currentTarget, "records"));
      }}
    >
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-[#4b22e8]" />
        <p className="text-sm font-black text-[#11143a]">Record filters</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {canScopeEmployees ? (
          <Field label="Employee">
            <select name="employeeId" defaultValue={filters.employeeId} className="form-field">
              <option value="">All visible employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="From"><input name="from" defaultValue={dateInput(filters.from)} type="date" className="form-field" /></Field>
        <Field label="To"><input name="to" defaultValue={dateInput(filters.to)} type="date" className="form-field" /></Field>
        <Field label="Status">
          <select name="status" defaultValue={filters.status} className="form-field">
            <option value="">All statuses</option>
            {["OPEN", "COMPLETED", "FLAGGED", "VOIDED"].map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <button type="submit" className="primary-action self-end"><Filter size={17} /> Apply</button>
      </div>
    </form>
  );
}

function ExceptionFilters({
  filters,
  sessionUser,
  onApply,
}: {
  filters: AttendancePageFilters;
  sessionUser: AuthUser;
  onApply: (params: URLSearchParams) => void;
}) {
  const canScopeEmployees = hasAnyPermission(sessionUser, ["attendance.team.write", "attendance.write"]);
  return (
    <form
      className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(formParams(event.currentTarget, "exceptions"));
      }}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {canScopeEmployees ? (
          <Field label="Employee search"><input name="employeeSearch" defaultValue={filters.employeeSearch} className="form-field" placeholder="Name or employee number" /></Field>
        ) : null}
        <Field label="From"><input name="from" defaultValue={dateInput(filters.from)} type="date" className="form-field" /></Field>
        <Field label="To"><input name="to" defaultValue={dateInput(filters.to)} type="date" className="form-field" /></Field>
        <Field label="Status">
          <select name="exceptionStatus" defaultValue={filters.exceptionStatus} className="form-field">
            <option value="">All statuses</option>
            {["OPEN", "SUBMITTED", "APPROVED", "REJECTED", "WAIVED", "RESOLVED"].map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select name="exceptionType" defaultValue={filters.exceptionType} className="form-field">
            <option value="">All types</option>
            {["LATE_ARRIVAL", "EARLY_DEPARTURE", "MISSED_CLOCK_IN", "MISSED_CLOCK_OUT", "UNSCHEDULED_WORK", "OVERTIME"].map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
        <button type="submit" className="primary-action self-end"><Filter size={17} /> Apply</button>
      </div>
    </form>
  );
}

function CorrectionFilters({
  filters,
  sessionUser,
  onApply,
}: {
  filters: AttendancePageFilters;
  sessionUser: AuthUser;
  onApply: (params: URLSearchParams) => void;
}) {
  const canScopeEmployees = hasAnyPermission(sessionUser, ["attendance.team.write", "attendance.write"]);
  return (
    <form
      className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(formParams(event.currentTarget, "corrections"));
      }}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {canScopeEmployees ? (
          <Field label="Employee search"><input name="employeeSearch" defaultValue={filters.employeeSearch} className="form-field" placeholder="Name or employee number" /></Field>
        ) : null}
        <Field label="From"><input name="from" defaultValue={dateInput(filters.from)} type="date" className="form-field" /></Field>
        <Field label="To"><input name="to" defaultValue={dateInput(filters.to)} type="date" className="form-field" /></Field>
        <Field label="Status">
          <select name="correctionStatus" defaultValue={filters.correctionStatus} className="form-field">
            <option value="">All statuses</option>
            {["REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "APPLIED"].map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <button type="submit" className="primary-action self-end"><Filter size={17} /> Apply</button>
      </div>
    </form>
  );
}

function ManualRecordForm({
  employees,
  record,
  seed,
  onClear,
}: {
  employees: ScheduleEmployee[];
  record: AttendanceRecord | null;
  seed?: ManualRecordSeed | null;
  onClear: () => void;
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const editing = Boolean(record);
  const selectedEmployeeId = record?.employeeId ?? seed?.employeeId ?? "";
  const defaultWorkDate = dateInput(record?.workDate ?? seed?.workDate ?? "");
  const defaultClockIn = timeInput(record?.actualClockInAt);
  const defaultClockOut = timeInput(record?.actualClockOutAt);
  const defaultBreakMinutes = record?.breakMinutes ? String(record.breakMinutes) : "";
  const defaultLocationName = record?.locationName ?? seed?.locationName ?? "";
  const defaultNotes = record?.notes ?? "";

  return (
    <form
      id="attendance-record-editor"
      className="rounded-xl border border-[#dfe8f6] bg-[linear-gradient(135deg,#ffffff,#fbfcff)] p-4 shadow-[0_10px_24px_rgba(18,31,67,0.04)]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const employeeId = String(formData.get("employeeId") ?? "");
        const workDate = String(formData.get("workDate") ?? "");
        const adjustmentReason = String(formData.get("adjustmentReason") ?? "").trim();

        if (!employeeId || !workDate) {
          toast.error("Employee and work date are required.");
          return;
        }

        if (editing && !adjustmentReason) {
          toast.error("A correction reason is required when adjusting an existing record.");
          return;
        }

        startSaving(async () => {
          try {
            await apiFetch("/attendance/records/manual", {
              method: "POST",
              body: JSON.stringify({
                recordId: stringValue(formData.get("recordId")),
                employeeId,
                scheduleAssignmentId: stringValue(formData.get("scheduleAssignmentId")),
                workDate: toIsoDay(workDate),
                actualClockInAt: combineDateTime(workDate, String(formData.get("clockIn") ?? "")),
                actualClockOutAt: combineDateTime(workDate, String(formData.get("clockOut") ?? "")),
                breakMinutes: numberValue(formData.get("breakMinutes")),
                locationName: stringValue(formData.get("locationName")),
                notes: stringValue(formData.get("notes")),
                adjustmentReason: stringValue(formData.get("adjustmentReason")),
                supportingDocumentUrl: stringValue(formData.get("supportingDocumentUrl")),
              }),
            });
            toast.success(editing ? "Attendance correction saved." : "Attendance record saved.");
            onClear();
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Record could not be saved.");
          }
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Manual record</p>
          <h3 className="mt-1 text-lg font-black text-[#11143a]">
            {editing ? `Correct ${employeeLabel(record?.employee)}` : "Create actual time"}
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#74809a]">
            {editing ? "Open and completed records can be corrected here. A reason is required for the audit trail." : "Use this when a record was missed or needs to be entered manually."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onClear} className="secondary-action">
            Clear
          </button>
          <button type="submit" disabled={saving} className="primary-action">
            <FileClock size={15} />
            {saving ? "Saving" : editing ? "Save correction" : "Save record"}
          </button>
        </div>
      </div>
      <input type="hidden" name="recordId" value={record?.id ?? ""} />
      <input type="hidden" name="scheduleAssignmentId" value={record?.scheduleAssignmentId ?? seed?.scheduleAssignmentId ?? ""} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Field label="Employee">
          <select name="employeeId" className="form-field" required defaultValue={selectedEmployeeId}>
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
          </select>
        </Field>
        <Field label="Work date"><input name="workDate" type="date" className="form-field" required defaultValue={defaultWorkDate} /></Field>
        <Field label="Clock in"><input name="clockIn" type="time" className="form-field" defaultValue={defaultClockIn} /></Field>
        <Field label="Clock out"><input name="clockOut" type="time" className="form-field" defaultValue={defaultClockOut} /></Field>
        <Field label="Break minutes"><input name="breakMinutes" type="number" min="0" className="form-field" placeholder="0" defaultValue={defaultBreakMinutes} /></Field>
        <Field label="Location"><input name="locationName" className="form-field" placeholder="Ward, branch, site" defaultValue={defaultLocationName} /></Field>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <Field label="Correction reason">
          <input
            name="adjustmentReason"
            className="form-field"
            placeholder={editing ? "Required, for example: employee forgot to clock in" : "Reason or context"}
            required={editing}
          />
        </Field>
        <Field label="Supporting file link">
          <input name="supportingDocumentUrl" className="form-field" placeholder="Optional secure file or case link" />
        </Field>
      </div>
      <textarea name="notes" className="form-field mt-3 min-h-16" placeholder="Additional notes for payroll, HR, or audit review" defaultValue={defaultNotes} />
    </form>
  );
}

function CorrectionRequestForm({
  record,
  onClear,
}: {
  record: AttendanceRecord;
  onClear: () => void;
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const defaultWorkDate = dateInput(record.workDate);
  const defaultClockIn = timeInput(record.actualClockInAt);
  const defaultClockOut = timeInput(record.actualClockOutAt);
  const defaultBreakMinutes = record.breakMinutes ? String(record.breakMinutes) : "";
  const defaultLocationName = record.locationName ?? "";
  const defaultNotes = record.notes ?? "";

  return (
    <form
      id="attendance-correction-request"
      className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4 shadow-[0_10px_24px_rgba(18,31,67,0.04)]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const workDate = String(formData.get("workDate") ?? "");
        const reason = String(formData.get("reason") ?? "").trim();

        if (!workDate || !reason) {
          toast.error("Work date and correction reason are required.");
          return;
        }

        startSaving(async () => {
          try {
            await apiFetch("/attendance/correction-requests", {
              method: "POST",
              body: JSON.stringify({
                recordId: record.id,
                employeeId: record.employeeId,
                scheduleAssignmentId: stringValue(formData.get("scheduleAssignmentId")),
                workDate: toIsoDay(workDate),
                actualClockInAt: combineDateTime(workDate, String(formData.get("clockIn") ?? "")),
                actualClockOutAt: combineDateTime(workDate, String(formData.get("clockOut") ?? "")),
                breakMinutes: numberValue(formData.get("breakMinutes")),
                locationName: stringValue(formData.get("locationName")),
                notes: stringValue(formData.get("notes")),
                reason,
                supportingDocumentUrl: stringValue(formData.get("supportingDocumentUrl")),
              }),
            });
            toast.success("Correction request submitted.", { description: "A supervisor or HR reviewer can approve it." });
            onClear();
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Correction request could not be submitted.");
          }
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Correction request</p>
          <h3 className="mt-1 text-lg font-black text-[#11143a]">
            {employeeLabel(record.employee) || record.employeeId} · {formatDate(record.workDate)}
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#74809a]">
            Submit the corrected times with a reason. Approval applies the change and records the audit trail.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onClear} className="secondary-action">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="primary-action">
            <FileText size={15} />
            {saving ? "Submitting" : "Submit request"}
          </button>
        </div>
      </div>
      <input type="hidden" name="scheduleAssignmentId" value={record.scheduleAssignmentId ?? ""} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Field label="Work date"><input name="workDate" type="date" className="form-field" required defaultValue={defaultWorkDate} /></Field>
        <Field label="Clock in"><input name="clockIn" type="time" className="form-field" defaultValue={defaultClockIn} /></Field>
        <Field label="Clock out"><input name="clockOut" type="time" className="form-field" defaultValue={defaultClockOut} /></Field>
        <Field label="Break minutes"><input name="breakMinutes" type="number" min="0" className="form-field" placeholder="0" defaultValue={defaultBreakMinutes} /></Field>
        <Field label="Location"><input name="locationName" className="form-field" placeholder="Ward, branch, site" defaultValue={defaultLocationName} /></Field>
        <Field label="Supporting file"><input name="supportingDocumentUrl" className="form-field" placeholder="Optional link" /></Field>
      </div>
      <Field label="Reason">
        <input name="reason" className="form-field mt-3" placeholder="Example: I resumed at 8:00 AM but clocked in at 10:00 AM" required />
      </Field>
      <textarea name="notes" className="form-field mt-3 min-h-16" placeholder="Additional details for the reviewer" defaultValue={defaultNotes} />
    </form>
  );
}

function GenerateTimesheetForm({ employees }: { employees: ScheduleEmployee[] }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  return (
    <form
      className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const periodStart = String(formData.get("periodStart") ?? "");
        const periodEnd = String(formData.get("periodEnd") ?? "");

        if (!periodStart || !periodEnd) {
          toast.error("Select a period start and end.");
          return;
        }

        startSaving(async () => {
          try {
            const result = await apiFetch<{ generatedCount: number }>("/attendance/timesheets/generate", {
              method: "POST",
              body: JSON.stringify({
                periodStart: toIsoDay(periodStart),
                periodEnd: endIsoDay(periodEnd),
                employeeId: stringValue(formData.get("employeeId")),
              }),
            });
            toast.success(`${result.generatedCount} timesheet${result.generatedCount === 1 ? "" : "s"} generated.`);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Timesheets could not be generated.");
          }
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_auto]">
        <Field label="Period start"><input name="periodStart" type="date" className="form-field" required /></Field>
        <Field label="Period end"><input name="periodEnd" type="date" className="form-field" required /></Field>
        <Field label="Employee">
          <select name="employeeId" className="form-field">
            <option value="">All visible employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
          </select>
        </Field>
        <button type="submit" disabled={saving} className="primary-action self-end"><ClipboardCheck size={17} /> Generate</button>
      </div>
    </form>
  );
}

function PayrollPeriodTools({ employees, exports: exportRows }: { employees: ScheduleEmployee[]; exports: AttendancePayrollExport[] }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [pendingAction, setPendingAction] = useState<"lock" | "export" | null>(null);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <form
        className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const periodStart = String(formData.get("periodStart") ?? "");
          const periodEnd = String(formData.get("periodEnd") ?? "");
          const payrollAction = formData.get("payrollAction") === "lock" ? "lock" : "export";

          if (!periodStart || !periodEnd) {
            toast.error("Select a payroll period start and end.");
            return;
          }

          setPendingAction(payrollAction);
          startSaving(async () => {
            try {
              const payload = {
                periodStart: toIsoDay(periodStart),
                periodEnd: endIsoDay(periodEnd),
                employeeId: stringValue(formData.get("employeeId")),
                reason: stringValue(formData.get("reason")),
              };

              if (payrollAction === "lock") {
                const result = await apiFetch<{ lockedCount: number; alreadyLockedCount: number }>("/attendance/payroll/lock", {
                  method: "POST",
                  body: JSON.stringify(payload),
                });
                toast.success("Payroll period locked.", {
                  description: `${result.lockedCount} newly locked, ${result.alreadyLockedCount} already locked.`,
                });
              } else {
                const result = await apiFetch<AttendancePayrollExportResult>("/attendance/payroll/export", {
                  method: "POST",
                  body: JSON.stringify({ ...payload, format: "CSV" }),
                });
                downloadTextFile(result.fileName, result.csv, result.contentType);
                toast.success("Payroll CSV generated.", {
                  description: `${result.rowCount} row${result.rowCount === 1 ? "" : "s"} exported.`,
                });
              }

              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Payroll action could not be completed.");
            } finally {
              setPendingAction(null);
            }
          });
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Payroll controls</p>
            <h3 className="mt-1 text-lg font-black text-[#11143a]">Lock period and export CSV</h3>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-[#eef4ff] text-[#4269ff]">
            <BriefcaseBusiness size={18} />
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Period start"><input name="periodStart" type="date" className="form-field" required /></Field>
          <Field label="Period end"><input name="periodEnd" type="date" className="form-field" required /></Field>
          <Field label="Employee">
            <select name="employeeId" className="form-field">
              <option value="">All visible employees</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
            </select>
          </Field>
          <Field label="Reason">
            <input name="reason" className="form-field" placeholder="Optional payroll note" />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" name="payrollAction" value="lock" disabled={saving} className="primary-action">
            <LockKeyhole size={16} />
            {pendingAction === "lock" ? "Locking" : "Lock period"}
          </button>
          <button type="submit" name="payrollAction" value="export" disabled={saving} className="secondary-action">
            <Download size={16} />
            {pendingAction === "export" ? "Exporting" : "Export CSV"}
          </button>
        </div>
      </form>

      <PayrollExportsList rows={exportRows} />
    </div>
  );
}

function PayrollExportsList({ rows }: { rows: AttendancePayrollExport[] }) {
  const columns: Array<DataTableColumn<AttendancePayrollExport>> = [
    {
      key: "period",
      header: "Period",
      render: (row) => (
        <div>
          <p className="font-black">{formatDate(row.periodStart)}</p>
          <p className="text-xs font-semibold text-[#74809a]">to {formatDate(row.periodEnd)}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "rows", header: "Rows", render: (row) => <span className="font-black">{row.rowCount}</span> },
    { key: "payable", header: "Payable", render: (row) => minutesCell(row.grossPayableMinutes) },
    { key: "file", header: "File", render: (row) => <span className="text-xs font-bold text-[#63708a]">{row.fileName}</span> },
  ];

  return (
    <DataTable
      eyebrow="Payroll audit"
      title="Recent lock and export runs"
      description="Payroll runs keep period lock, export totals, file name, and actor trail in the attendance audit log."
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      minWidth="720px"
      emptyTitle="No payroll runs yet"
      emptyBody="Lock an approved period or export a locked period to create the payroll audit trail."
    />
  );
}

function CreatePolicyForm({ activePolicy }: { activePolicy: AttendancePolicy | null }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  return (
    <form
      className="rounded-2xl border border-[#dfe8f6] bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") ?? "").trim();

        if (!name) {
          toast.error("Policy name is required.");
          return;
        }

        startSaving(async () => {
          try {
            await apiFetch("/attendance/policies", {
              method: "POST",
              body: JSON.stringify({
                code: String(formData.get("code") ?? "").trim().toUpperCase(),
                name,
                status: "DRAFT",
                timezone: stringValue(formData.get("timezone")) ?? activePolicy?.timezone,
                graceMinutesLate: numberValue(formData.get("graceMinutesLate")) ?? activePolicy?.graceMinutesLate ?? 5,
                graceMinutesEarlyLeave: numberValue(formData.get("graceMinutesEarlyLeave")) ?? activePolicy?.graceMinutesEarlyLeave ?? 5,
                roundingMinutes: numberValue(formData.get("roundingMinutes")) ?? activePolicy?.roundingMinutes ?? 1,
                dailyOvertimeMinutes: numberValue(formData.get("dailyOvertimeMinutes")),
                weeklyOvertimeMinutes: numberValue(formData.get("weeklyOvertimeMinutes")),
                requireScheduleForClockIn: formData.get("requireScheduleForClockIn") === "on",
                requireLocationCapture: formData.get("requireLocationCapture") === "on",
                requireKnownDevice: formData.get("requireKnownDevice") === "on",
                requireGeofenceForClockIn: formData.get("requireGeofenceForClockIn") === "on",
                blockOutsideGeofence: formData.get("blockOutsideGeofence") === "on",
                geofenceGraceMeters: numberValue(formData.get("geofenceGraceMeters")) ?? activePolicy?.geofenceGraceMeters ?? 0,
                requirePhotoAttestation: formData.get("requirePhotoAttestation") === "on",
                requireAttestationNote: formData.get("requireAttestationNote") === "on",
                allowOfflinePunchSync: formData.get("allowOfflinePunchSync") === "on",
                offlinePunchGraceMinutes: numberValue(formData.get("offlinePunchGraceMinutes")) ?? activePolicy?.offlinePunchGraceMinutes ?? 1440,
              }),
            });
            toast.success("Attendance policy created.");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Policy could not be created.");
          }
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Create policy</p>
          <h3 className="mt-1 text-lg font-black text-[#11143a]">Attendance controls for clocking and timesheets</h3>
        </div>
        <button type="submit" disabled={saving} className="primary-action w-auto px-5"><ShieldCheck size={17} /> Save policy</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Code"><input name="code" className="form-field" placeholder="STANDARD_ATTENDANCE" required /></Field>
        <Field label="Name"><input name="name" className="form-field" placeholder="Standard attendance policy" required /></Field>
        <Field label="Timezone"><input name="timezone" className="form-field" defaultValue={activePolicy?.timezone ?? ""} placeholder="America/Chicago" /></Field>
        <Field label="Rounding"><input name="roundingMinutes" type="number" min="1" className="form-field" defaultValue={activePolicy?.roundingMinutes ?? 1} /></Field>
        <Field label="Late grace"><input name="graceMinutesLate" type="number" min="0" className="form-field" defaultValue={activePolicy?.graceMinutesLate ?? 5} /></Field>
        <Field label="Early leave grace"><input name="graceMinutesEarlyLeave" type="number" min="0" className="form-field" defaultValue={activePolicy?.graceMinutesEarlyLeave ?? 5} /></Field>
        <Field label="Daily overtime"><input name="dailyOvertimeMinutes" type="number" min="1" className="form-field" placeholder="480" /></Field>
        <Field label="Weekly overtime"><input name="weeklyOvertimeMinutes" type="number" min="1" className="form-field" placeholder="2400" /></Field>
        <Field label="Geofence grace"><input name="geofenceGraceMeters" type="number" min="0" className="form-field" defaultValue={activePolicy?.geofenceGraceMeters ?? 0} /></Field>
        <Field label="Offline grace"><input name="offlinePunchGraceMinutes" type="number" min="15" className="form-field" defaultValue={activePolicy?.offlinePunchGraceMinutes ?? 1440} /></Field>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="form-check"><input type="checkbox" name="requireScheduleForClockIn" /> Require a planned shift before clock-in</label>
        <label className="form-check"><input type="checkbox" name="requireLocationCapture" /> Require location capture</label>
        <label className="form-check"><input type="checkbox" name="requireKnownDevice" /> Require known clock device</label>
        <label className="form-check"><input type="checkbox" name="requireGeofenceForClockIn" /> Require geofence validation</label>
        <label className="form-check"><input type="checkbox" name="blockOutsideGeofence" /> Block outside-geofence punches</label>
        <label className="form-check"><input type="checkbox" name="requirePhotoAttestation" /> Require photo attestation</label>
        <label className="form-check"><input type="checkbox" name="requireAttestationNote" /> Require attestation note</label>
        <label className="form-check"><input type="checkbox" name="allowOfflinePunchSync" defaultChecked /> Allow offline punch sync</label>
      </div>
    </form>
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

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: LucideIcon; tone: "blue" | "green" | "orange" | "purple" }) {
  const colors = {
    blue: "bg-[#eff4ff] text-[#4269ff]",
    green: "bg-[#eafbf3] text-[#0a8f61]",
    orange: "bg-[#fff4df] text-[#c76a00]",
    purple: "bg-[#f2edff] text-[#4b22e8]",
  };
  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-white/85 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.04em] text-[#63708a]">{label}</p>
        <span className={`grid size-9 place-items-center rounded-lg ${colors[tone]}`}><Icon size={16} /></span>
      </div>
      <p className="mt-2 text-2xl font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "purple";
}) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase text-[#68748c]">{label}</span>
      {children}
    </label>
  );
}

function EmployeeCell({ employee, fallback }: { employee?: ScheduleEmployee | null; fallback: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-[#eef4ff] text-sm font-black text-[#4269ff]">
        {initials(employee)}
      </span>
      <span>
        <span className="block font-black text-[#11143a]">{employeeLabel(employee) || fallback}</span>
        <span className="block text-xs font-semibold text-[#74809a]">{employee?.employeeNumber ?? fallback}</span>
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone = ["ACTIVE", "OPEN", "COMPLETED", "READY", "APPROVED", "RESOLVED"].includes(normalized)
    ? "bg-[#eafbf3] text-[#0a8f61]"
    : ["SUBMITTED", "DRAFT", "REOPENED"].includes(normalized)
      ? "bg-[#eff4ff] text-[#4269ff]"
      : ["REJECTED", "VOIDED", "FLAGGED"].includes(normalized)
        ? "bg-[#fff0f0] text-[#c42424]"
        : "bg-[#f2edff] text-[#4b22e8]";

  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${tone}`}>{humanize(status)}</span>;
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#e5ebf5] bg-[#fbfcff] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#74809a]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function DetailList({
  icon: Icon,
  title,
  items,
  empty,
}: {
  icon: typeof Clock3;
  title: string;
  items: Array<{ key: string; title: string; detail: string; note?: string | null }>;
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-[#e5ebf5] bg-[#fbfcff] p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[#4b22e8]" />
        <p className="text-sm font-black text-[#11143a]">{title}</p>
      </div>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.key} className="rounded-lg border border-[#e5ebf5] bg-white p-3">
            <p className="text-sm font-black text-[#11143a]">{item.title}</p>
            <p className="mt-1 text-xs font-semibold text-[#74809a]">{item.detail}</p>
            {item.note ? <p className="mt-2 text-xs font-semibold leading-5 text-[#65708a]">{item.note}</p> : null}
          </div>
        ))}
        {items.length === 0 ? <EmptyInline text={empty} /> : null}
      </div>
    </div>
  );
}

function ChangeSnapshot({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value) {
    return (
      <div className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#74809a]">{label}</p>
        <p className="mt-2 text-xs font-semibold text-[#65708a]">No prior values</p>
      </div>
    );
  }

  const breakMinutes = numberMeta(value.breakMinutes);

  return (
    <div className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#74809a]">{label}</p>
      <dl className="mt-2 grid gap-1.5 text-xs">
        <SnapshotRow label="Clock in" value={formatDateTime(stringMeta(value.actualClockInAt))} />
        <SnapshotRow label="Clock out" value={formatDateTime(stringMeta(value.actualClockOutAt))} />
        <SnapshotRow label="Breaks" value={breakMinutes === null ? "Not set" : minutesCell(breakMinutes)} />
        <SnapshotRow label="Location" value={stringMeta(value.locationName) ?? "Not set"} />
        <SnapshotRow label="Notes" value={stringMeta(value.notes) ?? "None"} />
      </dl>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[76px_1fr] gap-2">
      <dt className="font-black text-[#74809a]">{label}</dt>
      <dd className="font-semibold text-[#11143a]">{value}</dd>
    </div>
  );
}

function SmallButton({
  children,
  tone = "default",
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) {
          return;
        }
        onClick();
      }}
      className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
        tone === "danger" ? "bg-[#fff0f0] text-[#c42424] hover:bg-[#ffe3e3]" : "bg-[#f1edff] text-[#4b22e8] hover:bg-[#e6ddff]"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-semibold text-[#74809a]">{text}</div>;
}

function minutesCell(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours <= 0) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function employeeLabel(employee?: ScheduleEmployee | null) {
  if (!employee) return "";
  const first = employee.person?.preferredName || employee.person?.firstName;
  const last = employee.person?.lastName;
  return [first, last].filter(Boolean).join(" ") || employee.employeeNumber;
}

function initials(employee?: ScheduleEmployee | null) {
  const label = employeeLabel(employee);
  if (!label) return "TS";
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "Open";
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateInput(value: string) {
  return value ? value.slice(0, 10) : "";
}

function timeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formParams(form: HTMLFormElement, tab: AttendanceTab) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  new FormData(form).forEach((value, key) => {
    const text = String(value);
    if (text) params.set(key, text);
  });
  return params;
}

function toIsoDay(value: string) {
  return `${value}T00:00:00.000Z`;
}

function endIsoDay(value: string) {
  return `${value}T23:59:59.999Z`;
}

function combineDateTime(date: string, time: string) {
  if (!date || !time) return undefined;
  return new Date(`${date}T${time}:00`).toISOString();
}

function stringValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function numberValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type OfflinePunchQueueItem = {
  clientMutationId: string;
  type: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
  source: "WEB";
  occurredAt: string;
  timezone: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  photoAttestationUrl?: string;
  attestationNote?: string;
};

const OFFLINE_PUNCH_QUEUE_KEY = "timesync.attendance.offlinePunches";

function offlineClientMutationId(type: OfflinePunchQueueItem["type"]) {
  const random = typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `offline-${type.toLowerCase()}-${random}`;
}

function readOfflinePunchQueue(): OfflinePunchQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_PUNCH_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOfflinePunchQueue(items: OfflinePunchQueueItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OFFLINE_PUNCH_QUEUE_KEY, JSON.stringify(items));
}

function enqueueOfflinePunch(item: OfflinePunchQueueItem) {
  const queue = readOfflinePunchQueue();
  writeOfflinePunchQueue([...queue, item].slice(-50));
}

function shouldQueueOfflinePunch(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  return error instanceof TypeError || (error instanceof Error && /fetch|network/i.test(error.message));
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== ""),
  ) as Partial<T>;
}

function dateInputToIso(value: FormDataEntryValue | null) {
  const text = stringValue(value);
  return text ? toIsoDay(text) : undefined;
}

function timeInputToMinute(value: FormDataEntryValue | null) {
  const text = stringValue(value);
  if (!text) return undefined;
  const [hour, minute] = text.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;
  return hour * 60 + minute;
}

function weekdayValues(formData: FormData) {
  return formData.getAll("weekdays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

function minuteWindow(startsAtMinute?: number | null, endsAtMinute?: number | null) {
  if (startsAtMinute === null || startsAtMinute === undefined || endsAtMinute === null || endsAtMinute === undefined) {
    return "All day";
  }
  return `${minuteLabel(startsAtMinute)}-${minuteLabel(endsAtMinute)}`;
}

function minuteLabel(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function shortWeekday(value: number) {
  return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][value] ?? String(value);
}

function attendanceScopePayload(filters: AttendancePageFilters) {
  return compactObject({
    limit: 50,
    from: filters.from ? toIsoDay(filters.from) : undefined,
    to: filters.to ? endIsoDay(filters.to) : undefined,
    employeeId: filters.employeeId || undefined,
    employeeSearch: filters.employeeSearch || undefined,
    organizationNodeId: filters.organizationNodeId || undefined,
    costCenterId: filters.costCenterId || undefined,
    positionId: filters.positionId || undefined,
    locationName: filters.locationName || undefined,
  });
}

function downloadTextFile(fileName: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function attendancePunchContext(captureLocation: boolean) {
  const deviceId = attendanceDeviceId();
  const location = captureLocation ? await browserCoordinates() : {};
  return {
    deviceId,
    ...location,
  };
}

function attendanceDeviceId() {
  const key = "timesync.attendance.deviceId";
  if (typeof window === "undefined") {
    return undefined;
  }
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const generated =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

function browserCoordinates(): Promise<{ latitude?: number; longitude?: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({});
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => resolve({}),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 5000 },
    );
  });
}

function coordinateLabel(latitude?: number | null, longitude?: number | null) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function recordActivities(record: AttendanceRecord) {
  const punchActivities = (record.punches ?? []).map((punch) => ({
    key: punch.id,
    title: humanize(punch.type),
    at: punch.occurredAt,
    detail: [
      humanize(punch.source),
      punch.locationName,
      punch.deviceId ? `Device ${punch.deviceId}` : null,
      coordinateLabel(punch.latitude, punch.longitude),
    ].filter(Boolean).join(" · ") || "Punch recorded",
    note: punch.note,
  }));

  if (punchActivities.length > 0) {
    return punchActivities.sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
  }

  const fallback = [];
  if (record.actualClockInAt) {
    fallback.push({
      key: `${record.id}-clock-in`,
      title: "Clock in",
      at: record.actualClockInAt,
      detail: [humanize(record.source), record.locationName, record.deviceId ? `Device ${record.deviceId}` : null].filter(Boolean).join(" · ") || "Record start",
      note: record.notes,
    });
  }
  if (record.actualClockOutAt) {
    fallback.push({
      key: `${record.id}-clock-out`,
      title: "Clock out",
      at: record.actualClockOutAt,
      detail: [humanize(record.source), record.locationName, record.deviceId ? `Device ${record.deviceId}` : null].filter(Boolean).join(" · ") || "Record end",
      note: null,
    });
  }
  return fallback;
}

function adjustmentHistory(record: AttendanceRecord) {
  const adjustments = record.metadata?.adjustments;
  if (!Array.isArray(adjustments)) return [];

  return adjustments
    .map((item) => objectMeta(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      adjustedAt: stringMeta(item.adjustedAt),
      adjustedById: stringMeta(item.adjustedById),
      reason: stringMeta(item.reason),
      supportingDocumentUrl: stringMeta(item.supportingDocumentUrl),
      previous: objectMeta(item.previous),
      next: objectMeta(item.next),
    }))
    .reverse();
}

function objectMeta(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringMeta(value: unknown) {
  if (typeof value === "string") {
    const text = value.trim();
    return text || undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function numberMeta(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function punchSuccess(type: string) {
  switch (type) {
    case "CLOCK_IN":
      return "Clocked in.";
    case "CLOCK_OUT":
      return "Clocked out.";
    case "BREAK_START":
      return "Break started.";
    case "BREAK_END":
      return "Break ended.";
    default:
      return "Punch recorded.";
  }
}

function normalizePunchedRecord(record: AttendanceRecord | null, type: string) {
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
