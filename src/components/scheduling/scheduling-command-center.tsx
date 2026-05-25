"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gauge,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  Repeat2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TimerReset,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { apiFetch } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import type { CostCenter, OrganizationNode } from "@/lib/organization/types";
import type { Position } from "@/lib/positions/types";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type {
  EmployeeAvailability,
  MyScheduleWorkspace,
  OpenShift,
  OpenShiftClaim,
  OvertimeRequest,
  ScheduleCoverageRule,
  SchedulePlannerSummary,
  ScheduleAssignment,
  ScheduleEmployee,
  SchedulePeriod,
  SchedulePolicy,
  ScheduleSwapRequest,
  SchedulingSummary,
  WorkShift,
} from "@/lib/scheduling/types";

type SchedulingCommandCenterProps = {
  user: AuthUser;
  summary: SchedulingSummary | null;
  plannerSummary: SchedulePlannerSummary | null;
  mySchedule: MyScheduleWorkspace | null;
  shifts: WorkShift[];
  policies: SchedulePolicy[];
  periods: SchedulePeriod[];
  assignments: ScheduleAssignment[];
  teamAssignments: ScheduleAssignment[];
  openShifts: OpenShift[];
  openShiftClaims: OpenShiftClaim[];
  overtime: OvertimeRequest[];
  availability: EmployeeAvailability[];
  coverageRules: ScheduleCoverageRule[];
  swapRequests: ScheduleSwapRequest[];
  employeeOptions: ScheduleEmployee[];
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  positions: Position[];
  initialTab: ScheduleTab;
  planningFilters: {
    view: string;
    from: string;
    to: string;
    status: string;
    employeeId: string;
    employeeSearch: string;
    organizationNodeId: string;
    costCenterId: string;
    positionId: string;
    locationName: string;
  };
  permissions: {
    canTenantSchedule: boolean;
    canTeamSchedule: boolean;
    canApproveOvertime: boolean;
  };
};

type ScheduleTab = "overview" | "board" | "coverage" | "open" | "swaps" | "overtime" | "availability" | "policy" | "shifts";
type PlannerView = "DAY" | "WEEK" | "MONTH";

const tabs: Array<{
  id: ScheduleTab;
  label: string;
  description: string;
  icon: LucideIcon;
  tenantOnly?: boolean;
}> = [
  { id: "overview", label: "Overview", description: "Coverage and readiness", icon: Gauge },
  { id: "board", label: "Schedule board", description: "Assignments and periods", icon: CalendarClock },
  { id: "coverage", label: "Coverage", description: "Demand rules and gaps", icon: Target, tenantOnly: true },
  { id: "open", label: "Open shifts", description: "Pickup and claims", icon: UsersRound },
  { id: "swaps", label: "Swaps", description: "Exchange and handoff requests", icon: Repeat2 },
  { id: "overtime", label: "Overtime", description: "Requests and approvals", icon: TimerReset },
  { id: "availability", label: "Availability", description: "Preferred and unavailable time", icon: Clock3 },
  { id: "policy", label: "Policy", description: "Company rules", icon: ShieldCheck, tenantOnly: true },
  { id: "shifts", label: "Shift library", description: "Reusable templates", icon: BriefcaseBusiness, tenantOnly: true },
];

const tabTones = [
  {
    idle: "border-emerald-100/80 bg-emerald-50/50 text-emerald-950 hover:border-emerald-200 hover:bg-emerald-50",
    active: "border-emerald-300 bg-emerald-100/80 text-emerald-950 shadow-[0_16px_34px_rgba(16,185,129,0.16)]",
    iconIdle: "bg-white/80 text-emerald-600",
    iconActive: "bg-emerald-600 text-white",
  },
  {
    idle: "border-sky-100/80 bg-sky-50/50 text-sky-950 hover:border-sky-200 hover:bg-sky-50",
    active: "border-sky-300 bg-sky-100/80 text-sky-950 shadow-[0_16px_34px_rgba(14,165,233,0.16)]",
    iconIdle: "bg-white/80 text-sky-600",
    iconActive: "bg-sky-600 text-white",
  },
  {
    idle: "border-violet-100/80 bg-violet-50/50 text-violet-950 hover:border-violet-200 hover:bg-violet-50",
    active: "border-violet-300 bg-violet-100/80 text-violet-950 shadow-[0_16px_34px_rgba(109,40,217,0.16)]",
    iconIdle: "bg-white/80 text-violet-600",
    iconActive: "bg-violet-700 text-white",
  },
  {
    idle: "border-amber-100/80 bg-amber-50/50 text-amber-950 hover:border-amber-200 hover:bg-amber-50",
    active: "border-amber-300 bg-amber-100/80 text-amber-950 shadow-[0_16px_34px_rgba(245,158,11,0.16)]",
    iconIdle: "bg-white/80 text-amber-600",
    iconActive: "bg-amber-500 text-white",
  },
  {
    idle: "border-rose-100/80 bg-rose-50/50 text-rose-950 hover:border-rose-200 hover:bg-rose-50",
    active: "border-rose-300 bg-rose-100/80 text-rose-950 shadow-[0_16px_34px_rgba(244,63,94,0.14)]",
    iconIdle: "bg-white/80 text-rose-600",
    iconActive: "bg-rose-600 text-white",
  },
] as const;

function tabTone(index: number, active: boolean) {
  const tone = tabTones[index % tabTones.length];

  return {
    card: active ? tone.active : tone.idle,
    icon: active ? tone.iconActive : tone.iconIdle,
  };
}

const overtimeModes = [
  ["DISABLED", "No overtime"],
  ["DAILY", "Daily threshold"],
  ["WEEKLY", "Weekly threshold"],
  ["DAILY_AND_WEEKLY", "Daily and weekly"],
  ["CUSTOM", "Custom"],
] as const;

const approvalModes = [
  ["NONE", "Auto approve"],
  ["MANAGER", "Manager approval"],
  ["HR", "HR approval"],
  ["WORKFLOW", "Workflow approval"],
] as const;

const availabilityStatuses = [
  ["AVAILABLE", "Available"],
  ["PREFERRED", "Preferred"],
  ["UNAVAILABLE", "Unavailable"],
] as const;

const assignmentStatuses = [
  ["", "All statuses"],
  ["DRAFT", "Draft"],
  ["ASSIGNED", "Assigned"],
  ["CONFIRMED", "Confirmed"],
  ["COMPLETED", "Completed"],
  ["NO_SHOW", "No show"],
  ["CANCELLED", "Cancelled"],
] as const;

const availabilityFilterStatuses = [
  ["", "All statuses"],
  ...availabilityStatuses,
] as const;

const openShiftFilterStatuses = [
  ["", "All statuses"],
  ["OPEN", "Open"],
  ["CLAIMED", "Claimed"],
  ["CANCELLED", "Cancelled"],
  ["EXPIRED", "Expired"],
] as const;

const coverageRuleStatuses = [
  ["", "All statuses"],
  ["DRAFT", "Draft"],
  ["ACTIVE", "Active"],
  ["INACTIVE", "Inactive"],
  ["ARCHIVED", "Archived"],
] as const;

const swapRequestStatuses = [
  ["", "All statuses"],
  ["REQUESTED", "Requested"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
  ["CANCELLED", "Cancelled"],
  ["COMPLETED", "Completed"],
] as const;

type AvailabilityApplyMode = "SINGLE_DAY" | "ALL_WEEK" | "SELECTED_DAYS";

const availabilityApplyModes: Array<[AvailabilityApplyMode, string]> = [
  ["SINGLE_DAY", "One day"],
  ["ALL_WEEK", "All seven days"],
  ["SELECTED_DAYS", "Selected days"],
];

const weekDays = [
  { value: 0, label: "Sun", longLabel: "Sunday" },
  { value: 1, label: "Mon", longLabel: "Monday" },
  { value: 2, label: "Tue", longLabel: "Tuesday" },
  { value: 3, label: "Wed", longLabel: "Wednesday" },
  { value: 4, label: "Thu", longLabel: "Thursday" },
  { value: 5, label: "Fri", longLabel: "Friday" },
  { value: 6, label: "Sat", longLabel: "Saturday" },
];

export function SchedulingCommandCenter({
  user,
  summary,
  plannerSummary,
  mySchedule,
  shifts,
  policies,
  periods,
  assignments,
  teamAssignments,
  openShifts,
  openShiftClaims,
  overtime,
  availability,
  coverageRules,
  swapRequests,
  employeeOptions,
  organizationNodes,
  costCenters,
  positions,
  initialTab,
  planningFilters,
  permissions,
}: SchedulingCommandCenterProps) {
  const router = useRouter();
  const tabRailRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<ScheduleTab>(initialTab);
  const [availabilityApplyMode, setAvailabilityApplyMode] = useState<AvailabilityApplyMode>("SINGLE_DAY");
  const [isPending, startTransition] = useTransition();
  const canPlan = permissions.canTenantSchedule || permissions.canTeamSchedule;
  const visibleTabs = tabs.filter((tab) => !tab.tenantOnly || permissions.canTenantSchedule);
  const currentTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? "overview";
  const boardRows = permissions.canTenantSchedule ? assignments : permissions.canTeamSchedule ? teamAssignments : mySchedule?.assignments.data ?? [];
  const policy = summary?.activePolicy ?? policies.find((item) => item.status === "ACTIVE");
  const upcomingRows = summary?.upcomingAssignments ?? mySchedule?.assignments.data ?? [];
  const employeeName = mySchedule?.employee ? formatEmployee(mySchedule.employee) : user.username ?? user.email;
  const currentEmployeeId = mySchedule?.employee?.id;
  const visibleBoardRows = boardRows.slice(0, 12);
  const hiddenBoardRows = Math.max(0, boardRows.length - visibleBoardRows.length);
  const visibleAvailability = availability.slice(0, 10);
  const hiddenAvailability = Math.max(0, availability.length - visibleAvailability.length);
  const pendingOpenShiftClaims = useMemo(
    () => openShiftClaims.filter((claim) => claim.status === "REQUESTED"),
    [openShiftClaims],
  );
  const requestedSwapRequests = useMemo(
    () => swapRequests.filter((request) => request.status === "REQUESTED"),
    [swapRequests],
  );

  function scrollTabRail(direction: "left" | "right") {
    const rail = tabRailRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      left: direction === "left" ? -360 : 360,
      behavior: "smooth",
    });
  }

  const claimByOpenShiftForCurrentEmployee = useMemo(() => {
    const claims = new Map<string, OpenShiftClaim>();

    if (!currentEmployeeId) {
      return claims;
    }

    for (const claim of openShiftClaims) {
      if (claim.employeeId === currentEmployeeId) {
        claims.set(claim.openShiftId, claim);
      }
    }

    for (const shift of openShifts) {
      const ownClaim = shift.claims?.find((claim) => claim.employeeId === currentEmployeeId);

      if (ownClaim) {
        claims.set(shift.id, ownClaim);
      }
    }

    return claims;
  }, [currentEmployeeId, openShiftClaims, openShifts]);
  const orderedWeekDays = useMemo(
    () => orderWeekDays(policy?.weekStartsOn ?? "MONDAY"),
    [policy?.weekStartsOn],
  );
  const fallbackPlanningDays = useMemo(
    () => buildPlanningDays(planningFilters.from, planningFilters.to, policy?.weekStartsOn ?? "MONDAY"),
    [planningFilters.from, planningFilters.to, policy?.weekStartsOn],
  );

  const defaultEmployeeId = employeeOptions[0]?.id ?? mySchedule?.employee?.id ?? "";
  const defaultShiftId = shifts[0]?.id ?? "";
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const plannerView = normalizePlannerView(planningFilters.view);
  const scheduleReturnHref = planningHref(planningFilters, "open");
  const assignShiftHref = schedulingActionHref("/scheduling/assign", scheduleReturnHref, planningFilters);
  const bulkAssignmentHref = schedulingActionHref("/scheduling/bulk", scheduleReturnHref, planningFilters);
  const createPeriodHref = schedulingActionHref("/scheduling/periods/new", scheduleReturnHref, planningFilters);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage, {
        description: "The scheduling workspace has been updated.",
      });
      startTransition(() => router.refresh());
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Scheduling action failed.", {
        description: "Please review the request and try again.",
      });
    }
  }

  async function createPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch("/scheduling/policies", {
          method: "POST",
          body: JSON.stringify(
            prune({
              code: stringValue(formData, "code"),
              name: stringValue(formData, "name"),
              status: stringValue(formData, "status"),
              timezone: stringValue(formData, "timezone") || undefined,
              weekStartsOn: stringValue(formData, "weekStartsOn"),
              standardHoursPerDay: numberValue(formData, "standardHoursPerDay"),
              standardHoursPerWeek: numberValue(formData, "standardHoursPerWeek"),
              overtimeMode: stringValue(formData, "overtimeMode"),
              overtimeApprovalMode: stringValue(formData, "overtimeApprovalMode"),
              overtimeMultiplier: numberValue(formData, "overtimeMultiplier"),
              allowSelfScheduling: formData.get("allowSelfScheduling") === "on",
              allowOpenShiftPickup: formData.get("allowOpenShiftPickup") === "on",
              allowManagerAssignment: formData.get("allowManagerAssignment") === "on",
              allowHrAssignment: formData.get("allowHrAssignment") === "on",
            }),
          ),
        }),
      "Scheduling policy saved.",
    );
  }

  async function createShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch("/scheduling/shifts", {
          method: "POST",
          body: JSON.stringify(
            prune({
              code: stringValue(formData, "code"),
              name: stringValue(formData, "name"),
              description: stringValue(formData, "description") || undefined,
              status: stringValue(formData, "status"),
              startTime: stringValue(formData, "startTime"),
              endTime: stringValue(formData, "endTime"),
              breakMinutes: numberValue(formData, "breakMinutes"),
              paidBreak: formData.get("paidBreak") === "on",
              timezone: stringValue(formData, "timezone") || undefined,
              color: stringValue(formData, "color") || undefined,
              isOvertimeEligible: formData.get("isOvertimeEligible") === "on",
              requiresApproval: formData.get("requiresApproval") === "on",
              minHeadcount: numberValue(formData, "minHeadcount"),
              maxHeadcount: numberValue(formData, "maxHeadcount"),
            }),
          ),
        }),
      "Shift template saved.",
    );
  }

  async function publishPeriod(period: SchedulePeriod) {
    await runAction(
      () => apiFetch(`/scheduling/periods/${period.id}/publish`, { method: "POST" }),
      `${period.name} published.`,
    );
  }

  async function lockPeriod(period: SchedulePeriod) {
    await runAction(
      () =>
        apiFetch(`/scheduling/periods/${period.id}/lock`, {
          method: "POST",
          body: JSON.stringify({
            note: "Locked from schedule planner after coverage review.",
          }),
        }),
      `${period.name} locked.`,
    );
  }

  async function createOpenShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch("/scheduling/open-shifts", {
          method: "POST",
          body: JSON.stringify(
            prune({
              scheduleId: stringValue(formData, "scheduleId") || undefined,
              shiftId: stringValue(formData, "shiftId") || undefined,
              workDate: dateTimeValue(formData, "workDate", "00:00"),
              startsAt: dateTimeValue(formData, "workDate", stringValue(formData, "startsAt")),
              endsAt: dateTimeValue(formData, "workDate", stringValue(formData, "endsAt")),
              breakMinutes: numberValue(formData, "breakMinutes"),
              requiredHeadcount: numberValue(formData, "requiredHeadcount"),
              pickupRequiresApproval: formData.get("pickupRequiresApproval") === "on",
              organizationNodeId: stringValue(formData, "organizationNodeId") || undefined,
              costCenterId: stringValue(formData, "costCenterId") || undefined,
              positionId: stringValue(formData, "positionId") || undefined,
              locationName: stringValue(formData, "locationName") || undefined,
              notes: stringValue(formData, "notes") || undefined,
            }),
          ),
        }),
      "Open shift published.",
    );
  }

  async function claimOpenShift(openShift: OpenShift) {
    await runAction(
      () => apiFetch(`/scheduling/my/open-shifts/${openShift.id}/claim`, { method: "POST" }),
      openShift.pickupRequiresApproval ? "Open shift request sent." : "Open shift added to your schedule.",
    );
  }

  async function decideOpenShiftClaim(claim: OpenShiftClaim, status: "APPROVED" | "REJECTED" | "CANCELLED", note?: string) {
    await runAction(
      () =>
        apiFetch(`/scheduling/open-shift-claims/${claim.id}/decision`, {
          method: "POST",
          body: JSON.stringify({ status, note }),
        }),
      status === "APPROVED"
        ? "Open shift request approved."
        : status === "REJECTED"
          ? "Open shift request rejected."
          : "Open shift request cancelled.",
    );
  }

  async function requestOvertime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const endpoint = permissions.canTenantSchedule ? "/scheduling/overtime" : "/scheduling/my/overtime";

    await runAction(
      () =>
        apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(
            prune({
              employeeId: permissions.canTenantSchedule ? stringValue(formData, "employeeId") : undefined,
              requestDate: dateTimeValue(formData, "requestDate", "00:00"),
              startsAt: dateTimeValue(formData, "requestDate", stringValue(formData, "startsAt")),
              endsAt: dateTimeValue(formData, "requestDate", stringValue(formData, "endsAt")),
              reason: stringValue(formData, "reason") || undefined,
            }),
          ),
        }),
      "Overtime request submitted.",
    );
  }

  async function decideOvertime(request: OvertimeRequest, status: "APPROVED" | "REJECTED") {
    await runAction(
      () =>
        apiFetch(`/scheduling/overtime/${request.id}/decision`, {
          method: "POST",
          body: JSON.stringify({ status }),
        }),
      status === "APPROVED" ? "Overtime approved." : "Overtime rejected.",
    );
  }

  async function createAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const endpoint = permissions.canTenantSchedule ? "/scheduling/availability" : "/scheduling/my/availability";
    const applyMode = (stringValue(formData, "applyMode") || "SINGLE_DAY") as AvailabilityApplyMode;
    const weekdays = formData
      .getAll("weekdays")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

    if (applyMode === "SELECTED_DAYS" && weekdays.length === 0) {
      toast.error("Select at least one weekday.", {
        description: "Availability can be applied to one day, all days, or the specific weekdays you select.",
      });
      return;
    }

    await runAction(
      () =>
        apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(
            prune({
              employeeId: permissions.canTenantSchedule ? stringValue(formData, "employeeId") : undefined,
              applyMode,
              date: dateTimeValue(formData, "date", "00:00"),
              weekdays: applyMode === "SELECTED_DAYS" ? weekdays : undefined,
              startsAt: stringValue(formData, "startsAt")
                ? dateTimeValue(formData, "date", stringValue(formData, "startsAt"))
                : undefined,
              endsAt: stringValue(formData, "endsAt")
                ? dateTimeValue(formData, "date", stringValue(formData, "endsAt"))
                : undefined,
              timezone: stringValue(formData, "timezone") || undefined,
              status: stringValue(formData, "status"),
              reason: stringValue(formData, "reason") || undefined,
              replaceExisting: formData.get("replaceExisting") === "on",
            }),
          ),
        }),
      applyMode === "SINGLE_DAY" ? "Availability saved." : "Weekly availability saved.",
    );
  }

  async function createCoverageRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const weekdays = formData
      .getAll("weekdays")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

    if (weekdays.length === 0) {
      toast.error("Select at least one operating day.", {
        description: "Coverage demand rules need weekdays so the planner can calculate gaps.",
      });
      return;
    }

    await runAction(
      () =>
        apiFetch("/scheduling/coverage-rules", {
          method: "POST",
          body: JSON.stringify(
            prune({
              code: stringValue(formData, "code"),
              name: stringValue(formData, "name"),
              description: stringValue(formData, "description") || undefined,
              policyId: stringValue(formData, "policyId") || undefined,
              shiftId: stringValue(formData, "shiftId") || undefined,
              organizationNodeId: stringValue(formData, "organizationNodeId") || undefined,
              costCenterId: stringValue(formData, "costCenterId") || undefined,
              positionId: stringValue(formData, "positionId") || undefined,
              weekdays,
              startsAtTime: stringValue(formData, "startsAtTime") || undefined,
              endsAtTime: stringValue(formData, "endsAtTime") || undefined,
              timezone: stringValue(formData, "timezone") || undefined,
              locationName: stringValue(formData, "locationName") || undefined,
              requiredHeadcount: numberValue(formData, "requiredHeadcount"),
              minimumHeadcount: numberValue(formData, "minimumHeadcount"),
              effectiveFrom: optionalDateTimeValue(formData, "effectiveFrom", "00:00"),
              effectiveTo: optionalDateTimeValue(formData, "effectiveTo", "23:59"),
              status: stringValue(formData, "status") || "DRAFT",
            }),
          ),
        }),
      "Coverage demand rule saved.",
    );
  }

  async function updateCoverageRuleStatus(rule: ScheduleCoverageRule, status: ScheduleCoverageRule["status"]) {
    await runAction(
      () =>
        apiFetch(`/scheduling/coverage-rules/${rule.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      status === "ACTIVE" ? "Coverage rule activated." : status === "ARCHIVED" ? "Coverage rule archived." : "Coverage rule updated.",
    );
  }

  async function createSwapRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch("/scheduling/my/swap-requests", {
          method: "POST",
          body: JSON.stringify(
            prune({
              assignmentId: stringValue(formData, "assignmentId"),
              targetEmployeeId: stringValue(formData, "targetEmployeeId") || undefined,
              reason: stringValue(formData, "reason") || undefined,
            }),
          ),
        }),
      "Swap request submitted.",
    );
  }

  async function decideSwapRequest(request: ScheduleSwapRequest, status: "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED", decisionNote?: string) {
    await runAction(
      () =>
        apiFetch(`/scheduling/swap-requests/${request.id}/decision`, {
          method: "POST",
          body: JSON.stringify({ status, decisionNote }),
        }),
      status === "APPROVED"
        ? "Swap request approved."
        : status === "REJECTED"
          ? "Swap request rejected."
          : status === "CANCELLED"
            ? "Swap request cancelled."
            : "Swap request completed.",
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-[0_18px_55px_rgba(18,31,67,0.07)] backdrop-blur-xl">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(109,40,217,0.10),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,251,255,0.78))]" />
          <div className="relative grid gap-4 p-4 xl:grid-cols-[1fr_300px]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Pill icon={CalendarClock} label="Scheduling command center" />
                <Pill icon={ShieldCheck} label={policy?.overtimeMode === "DISABLED" ? "No overtime policy" : "Overtime governed"} />
              </div>
              <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(460px,520px)] lg:items-end">
                <div className="min-w-0">
                  <h2 className="max-w-3xl text-[clamp(1.25rem,1.65vw,1.75rem)] font-black leading-tight text-[#11143a]">
                    Plan coverage, shifts, open work, and overtime in one place.
                  </h2>
                  <p className="mt-2 max-w-3xl text-[13px] font-semibold leading-6 text-[#63708a]">
                    {permissions.canTenantSchedule
                      ? "Govern schedule periods, assignment coverage, open shifts, and policy controls without leaving the planner."
                      : permissions.canTeamSchedule
                        ? "Coordinate team coverage while tenant policy controls overtime, self-service, and approvals."
                        : `Review upcoming work, open shifts, availability, and overtime requests for ${employeeName}.`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniMetric label="Today" value={summary?.metrics.assignmentsToday ?? 0} icon={CalendarClock} tone="blue" />
                  <MiniMetric label="Open" value={summary?.metrics.openShifts ?? 0} icon={UsersRound} tone="green" />
                  <MiniMetric label="Overtime" value={summary?.metrics.pendingOvertime ?? 0} icon={TimerReset} tone="amber" />
                  <MiniMetric label="Unavailable" value={summary?.metrics.unavailableToday ?? 0} icon={Clock3} tone="purple" />
                </div>
              </div>
            </div>
            <aside className="rounded-2xl border border-white/10 bg-[#11143a] p-4 text-white shadow-[0_18px_42px_rgba(17,20,58,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">Active policy</p>
                  <h3 className="mt-2 line-clamp-2 text-lg font-black leading-tight">{policy?.name ?? "Policy pending"}</h3>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                  <ShieldCheck size={17} />
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <CompactDarkStat label="OT" value={policy?.overtimeMode?.replaceAll("_", " ") ?? "Not set"} />
                <CompactDarkStat label="Approval" value={policy?.overtimeApprovalMode?.replaceAll("_", " ") ?? "Not set"} />
                <CompactDarkStat label="Week" value={`${policy?.standardHoursPerWeek ?? "No"}h`} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-[0_18px_45px_rgba(18,31,67,0.05)] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-[#edf1f7]/90 bg-white/55 p-2">
          <button
            type="button"
            aria-label="Scroll scheduling tabs left"
            onClick={() => scrollTabRail("left")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] shadow-[0_10px_22px_rgba(18,31,67,0.06)] transition hover:border-[#c8d5ea] hover:text-[#3820d7]"
          >
            <ChevronLeft size={17} />
          </button>
          <div
            ref={tabRailRef}
            role="tablist"
            aria-label="Scheduling workspace sections"
            className="flex flex-1 gap-2 overflow-x-auto scroll-smooth py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {visibleTabs.map((tab, index) => {
              const active = currentTab === tab.id;
              const tone = tabTone(index, active);

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex min-w-[178px] max-w-[205px] shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left backdrop-blur transition hover:-translate-y-0.5 ${tone.card}`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm transition ${tone.icon}`}>
                    <tab.icon size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{tab.label}</span>
                    <span className="block truncate text-[11px] font-semibold opacity-70">{tab.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Scroll scheduling tabs right"
            onClick={() => scrollTabRail("right")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] shadow-[0_10px_22px_rgba(18,31,67,0.06)] transition hover:border-[#c8d5ea] hover:text-[#3820d7]"
          >
            <ChevronRight size={17} />
          </button>
        </div>

        <div className="p-5">
          {currentTab === "overview" ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <Panel title="Upcoming coverage" eyebrow="Next scheduled work" icon={CalendarClock}>
                <div className="grid gap-3">
                  {upcomingRows.length > 0 ? (
                    upcomingRows.slice(0, 8).map((assignment) => <AssignmentRow key={assignment.id} assignment={assignment} />)
                  ) : (
                    <EmptyState title="No upcoming assignments yet" body="Published assignments will appear here once coverage is planned." />
                  )}
                </div>
              </Panel>
              <Panel title="Readiness controls" eyebrow="Policy behavior" icon={ShieldCheck}>
                <div className="grid gap-3">
                  <ReadinessItem label="Self scheduling" enabled={Boolean(policy?.allowSelfScheduling)} />
                  <ReadinessItem label="Open shift pickup" enabled={Boolean(policy?.allowOpenShiftPickup)} />
                  <ReadinessItem label="Manager assignment" enabled={Boolean(policy?.allowManagerAssignment)} />
                  <ReadinessItem label="HR assignment" enabled={Boolean(policy?.allowHrAssignment)} />
                </div>
              </Panel>
            </div>
          ) : null}

          {currentTab === "board" ? (
            <div className="space-y-5">
              {canPlan ? (
                <PlanningFilterBar
                  tab="board"
                  filters={planningFilters}
                  employees={employeeOptions}
                  organizationNodes={organizationNodes}
                  costCenters={costCenters}
                  positions={positions}
                  statusOptions={assignmentStatuses}
                  buttonLabel="Plan view"
                />
              ) : null}
              <PlannerViewSwitch filters={planningFilters} activeView={plannerView} />
              <PlanningCalendar
                title="Roster calendar"
                eyebrow={`${plannerView.toLowerCase()} planner`}
                summary={plannerSummary}
                fallbackDays={fallbackPlanningDays}
                view={plannerView}
                assignments={boardRows}
                openShifts={openShifts}
                availability={availability}
              />
              {canPlan ? (
                <PlannerActionRail
                  assignHref={assignShiftHref}
                  bulkHref={bulkAssignmentHref}
                  periodHref={permissions.canTenantSchedule ? createPeriodHref : undefined}
                />
              ) : (
                <SelfAssignmentNotice enabled={Boolean(policy?.allowSelfScheduling)} />
              )}
              <ScheduleBoardTable
                assignments={visibleBoardRows}
                scopeLabel={permissions.canTenantSchedule ? "Tenant coverage" : permissions.canTeamSchedule ? "Team coverage" : "My schedule"}
                hiddenRows={hiddenBoardRows}
                dayHref={`/scheduling/day?date=${planningDaysDateKey(plannerSummary, fallbackPlanningDays)}`}
              />
              {permissions.canTenantSchedule ? (
                <div className="grid gap-5">
                  <Panel title="Planning periods" eyebrow="Publishable schedule windows" icon={CalendarClock}>
                    <div className="grid gap-3">
                      {periods.length > 0 ? (
                        periods.map((period) => (
                          <article key={period.id} className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-[#11143a]">{period.name}</p>
                                <p className="mt-1 text-xs font-bold text-[#667089]">
                                  {new Date(period.startsOn).toLocaleDateString()} - {new Date(period.endsOn).toLocaleDateString()}
                                </p>
                              </div>
                              <StatusPill label={period.status} tone={period.status === "PUBLISHED" ? "green" : "blue"} />
                            </div>
                            {period.status === "DRAFT" ? (
                              <button
                                type="button"
                                onClick={() => publishPeriod(period)}
                                disabled={isPending}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cfd8ea] bg-white px-4 py-2 text-xs font-black text-[#11143a] disabled:opacity-60"
                              >
                                Publish <ArrowRight size={14} />
                              </button>
                            ) : period.status === "PUBLISHED" ? (
                              <button
                                type="button"
                                onClick={() => lockPeriod(period)}
                                disabled={isPending}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cfd8ea] bg-white px-4 py-2 text-xs font-black text-[#11143a] disabled:opacity-60"
                              >
                                Lock period <ShieldCheck size={14} />
                              </button>
                            ) : null}
                          </article>
                        ))
                      ) : (
                        <EmptyState title="No schedule periods" body="Create a period before publishing weekly or monthly coverage." />
                      )}
                    </div>
                  </Panel>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentTab === "coverage" ? (
            <div className="space-y-5">
              <PlanningFilterBar
                tab="coverage"
                filters={planningFilters}
                employees={employeeOptions}
                organizationNodes={organizationNodes}
                costCenters={costCenters}
                positions={positions}
                statusOptions={coverageRuleStatuses}
                buttonLabel="Coverage view"
              />
              <PlanningCalendar
                title="Demand calendar"
                eyebrow="Coverage gaps"
                summary={plannerSummary}
                fallbackDays={fallbackPlanningDays}
                view={plannerView}
                assignments={boardRows}
                openShifts={openShifts}
                availability={availability}
              />
              <div className="grid gap-5 xl:grid-cols-[1fr_460px]">
                <Panel title="Coverage demand rules" eyebrow="Staffing requirements" icon={Target}>
                  <div className="grid gap-3">
                    {coverageRules.length > 0 ? (
                      coverageRules.map((rule) => (
                        <CoverageRuleRow
                          key={rule.id}
                          rule={rule}
                          loading={isPending}
                          onActivate={() => updateCoverageRuleStatus(rule, "ACTIVE")}
                          onArchive={() => updateCoverageRuleStatus(rule, "ARCHIVED")}
                        />
                      ))
                    ) : (
                      <EmptyState
                        title="No coverage demand rules"
                        body="Create demand rules for the teams, locations, positions, and shifts that must be staffed before a roster can be trusted."
                      />
                    )}
                  </div>
                </Panel>
                <Panel title="Create demand rule" eyebrow="Required coverage" icon={Plus}>
                  <form onSubmit={createCoverageRule} className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InputField name="code" label="Code" placeholder="CARE_WEEKDAY_DAY" required />
                      <InputField name="name" label="Name" placeholder="Care weekday day coverage" required />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField name="status" label="Status" defaultValue="DRAFT">
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                      </SelectField>
                      <SelectField name="policyId" label="Policy" defaultValue={policy?.id ?? ""}>
                        <option value="">No policy binding</option>
                        {policies.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </SelectField>
                    </div>
                    <SelectField name="shiftId" label="Shift template" defaultValue={defaultShiftId}>
                      <option value="">Custom coverage time</option>
                      {shifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>{shift.name}</option>
                      ))}
                    </SelectField>
                    <WeekdayCheckboxGroup days={orderedWeekDays} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <InputField name="startsAtTime" label="Starts" type="time" defaultValue="08:00" required />
                      <InputField name="endsAtTime" label="Ends" type="time" defaultValue="16:00" required />
                      <InputField name="timezone" label="Timezone" defaultValue={policy?.timezone ?? ""} placeholder="Africa/Lagos" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InputField name="minimumHeadcount" label="Minimum" type="number" defaultValue="1" required />
                      <InputField name="requiredHeadcount" label="Required" type="number" defaultValue="1" required />
                    </div>
                    <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">
                        Operational scope
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[#65708a]">
                        Tie demand to the place where staffing is needed. Large organizations should avoid general demand rules.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <SelectField name="organizationNodeId" label="Org unit" defaultValue="">
                          <option value="">Select org unit</option>
                          {organizationNodes.map((node) => (
                            <option key={node.id} value={node.id}>
                              {node.name} ({humanize(node.type)})
                            </option>
                          ))}
                        </SelectField>
                        <SelectField name="costCenterId" label="Cost center" defaultValue="">
                          <option value="">Select cost center</option>
                          {costCenters.map((costCenter) => (
                            <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>
                          ))}
                        </SelectField>
                        <SelectField name="positionId" label="Position" defaultValue="">
                          <option value="">Select position</option>
                          {positions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.title} ({position.code})
                            </option>
                          ))}
                        </SelectField>
                        <InputField name="locationName" label="Location note" placeholder="Ward, floor, store, branch, or site" />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InputField name="effectiveFrom" label="Effective from" type="date" defaultValue={today} />
                      <InputField name="effectiveTo" label="Effective to" type="date" />
                    </div>
                    <TextAreaField name="description" label="Description" placeholder="Explain the staffing rule and operating context" />
                    <PrimaryButton label="Save coverage rule" loading={isPending} />
                  </form>
                </Panel>
              </div>
            </div>
          ) : null}

          {currentTab === "open" ? (
            <div className="space-y-5">
              {canPlan ? (
                <PlanningFilterBar
                  tab="open"
                  filters={planningFilters}
                  employees={employeeOptions}
                  organizationNodes={organizationNodes}
                  costCenters={costCenters}
                  positions={positions}
                  statusOptions={openShiftFilterStatuses}
                  buttonLabel="Open work view"
                />
              ) : null}
              <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
                <Panel title="Open shifts" eyebrow="Pickup marketplace" icon={UsersRound}>
                  <div className="grid gap-3">
                    {openShifts.length > 0 ? (
                      openShifts.map((shift) => {
                        const currentClaim = claimByOpenShiftForCurrentEmployee.get(shift.id);

                        return (
                          <OpenShiftRow
                            key={shift.id}
                            openShift={shift}
                            currentClaim={currentClaim}
                            canClaim={Boolean(currentEmployeeId && !permissions.canTenantSchedule)}
                            onClaim={() => claimOpenShift(shift)}
                            loading={isPending}
                          />
                        );
                      })
                    ) : (
                      <EmptyState title="No open shifts published" body="When coverage gaps are published, eligible employees can request or pick them up here." />
                    )}
                  </div>
                </Panel>
                {permissions.canTenantSchedule || permissions.canTeamSchedule ? (
                <div className="grid gap-5">
                  <Panel title="Pickup requests" eyebrow="Approval queue" icon={ShieldCheck}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7edf7] bg-[#fbfcff] p-3">
                      <p className="text-xs font-bold leading-5 text-[#68748c]">
                        Showing the first waiting requests. Open the full queue for search, filters, and pagination.
                      </p>
                      <Link
                        href={pickupRequestsHref(planningFilters)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#3820d7] px-3 text-xs font-black text-white! shadow-[0_10px_20px_rgba(56,32,215,0.16)]"
                      >
                        View all
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                    <div className="grid gap-3">
                      {pendingOpenShiftClaims.length > 0 ? (
                        pendingOpenShiftClaims.map((claim) => (
                          <OpenShiftClaimRow
                            key={claim.id}
                            claim={claim}
                            canDecide={permissions.canTenantSchedule || permissions.canTeamSchedule}
                            loading={isPending}
                            onApprove={() => decideOpenShiftClaim(claim, "APPROVED")}
                            onReject={(note) => decideOpenShiftClaim(claim, "REJECTED", note)}
                          />
                        ))
                      ) : (
                        <EmptyState
                          title="No pickup requests waiting"
                          body={
                            permissions.canTeamSchedule && !permissions.canTenantSchedule
                              ? "Requests from employees in your reporting group will appear here for manager review."
                              : "Employee pickup requests that require approval will appear here for HR review."
                          }
                        />
                      )}
                    </div>
                  </Panel>

                  {canPlan ? (
                    <Panel title="Publish targeted open shift" eyebrow="Coverage gap" icon={Plus}>
                      <form onSubmit={createOpenShift} className="grid gap-3">
                        {periods.length > 0 ? (
                          <SelectField name="scheduleId" label="Schedule period" defaultValue="">
                            <option value="">No period</option>
                            {periods.map((period) => (
                              <option key={period.id} value={period.id}>{period.name}</option>
                            ))}
                          </SelectField>
                        ) : null}
                        <SelectField name="shiftId" label="Shift" defaultValue={defaultShiftId}>
                          <option value="">Custom time</option>
                          {shifts.map((shift) => (
                            <option key={shift.id} value={shift.id}>{shift.name}</option>
                          ))}
                        </SelectField>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <InputField name="workDate" label="Date" type="date" defaultValue={today} required />
                          <InputField name="startsAt" label="Starts" type="time" defaultValue="08:00" required />
                          <InputField name="endsAt" label="Ends" type="time" defaultValue="16:00" required />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InputField name="requiredHeadcount" label="Headcount" type="number" defaultValue="1" />
                          <InputField name="breakMinutes" label="Break minutes" type="number" defaultValue="30" />
                        </div>
                        <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">
                            Targeting required
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-[#65708a]">
                            Open shifts must be tied to an org unit, cost center, or position so only eligible employees see the pickup opportunity.
                          </p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <SelectField name="organizationNodeId" label="Org unit" defaultValue="">
                              <option value="">Select org unit</option>
                              {organizationNodes.map((node) => (
                                <option key={node.id} value={node.id}>
                                  {node.name} ({humanize(node.type)})
                                </option>
                              ))}
                            </SelectField>
                            <SelectField name="costCenterId" label="Cost center" defaultValue="">
                              <option value="">Select cost center</option>
                              {costCenters.map((costCenter) => (
                                <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>
                              ))}
                            </SelectField>
                            <SelectField name="positionId" label="Position" defaultValue="">
                              <option value="">Select position</option>
                              {positions.map((position) => (
                                <option key={position.id} value={position.id}>
                                  {position.title} ({position.code})
                                </option>
                              ))}
                            </SelectField>
                            <InputField name="locationName" label="Location note" type="text" placeholder="Ward, floor, store, branch, or site detail" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-3 text-sm font-bold text-[#11143a]">
                          <input name="pickupRequiresApproval" type="checkbox" defaultChecked className="h-4 w-4 accent-[#3820d7]" />
                          Require approval before pickup is confirmed
                        </label>
                        <PrimaryButton label="Publish open shift" loading={isPending} />
                      </form>
                    </Panel>
                  ) : (
                    <Panel title="Manager review scope" eyebrow="Team coverage" icon={ShieldCheck}>
                      <p className="text-sm font-semibold leading-6 text-[#65708a]">
                        You can approve or reject pickup requests for employees in your reporting group. Open-shift publishing is available when your role includes team scheduling access.
                      </p>
                    </Panel>
                  )}
                </div>
                ) : (
                  <Panel title="Pickup rules" eyebrow="Eligibility" icon={ShieldCheck}>
                    <p className="text-sm font-semibold leading-6 text-[#65708a]">
                      Open shift pickup is controlled by your workplace policy. Some regions and companies require HR approval before additional time is confirmed.
                    </p>
                  </Panel>
                )}
              </div>
            </div>
          ) : null}

          {currentTab === "swaps" ? (
            <div className="space-y-5">
              {canPlan ? (
                <PlanningFilterBar
                  tab="swaps"
                  filters={planningFilters}
                  employees={employeeOptions}
                  organizationNodes={organizationNodes}
                  costCenters={costCenters}
                  positions={positions}
                  statusOptions={swapRequestStatuses}
                  buttonLabel="Swap queue"
                />
              ) : null}
              <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
                <Panel
                  title={canPlan ? "Swap and coverage-change queue" : "My swap requests"}
                  eyebrow={canPlan ? "Manager approval" : "Employee requests"}
                  icon={Repeat2}
                >
                  <div className="grid gap-3">
                    {swapRequests.length > 0 ? (
                      swapRequests.map((request) => (
                        <SwapRequestRow
                          key={request.id}
                          request={request}
                          canDecide={canPlan && request.status === "REQUESTED"}
                          canCancel={!canPlan && request.status === "REQUESTED"}
                          loading={isPending}
                          onApprove={() => decideSwapRequest(request, "APPROVED")}
                          onReject={(note) => decideSwapRequest(request, "REJECTED", note)}
                          onCancel={(note) => decideSwapRequest(request, "CANCELLED", note)}
                          onComplete={() => decideSwapRequest(request, "COMPLETED")}
                        />
                      ))
                    ) : (
                      <EmptyState
                        title="No swap requests in this view"
                        body={
                          canPlan
                            ? "Employee shift swaps, coverage-change requests, and manager decisions will appear here."
                            : "Request a swap for one of your upcoming assignments when you need coverage changed."
                        }
                      />
                    )}
                  </div>
                </Panel>
                <div className="space-y-5">
                  {canPlan ? (
                    <Panel title="Decision rules" eyebrow="Governed exchange" icon={ShieldCheck}>
                      <div className="grid gap-3">
                        <ReadinessItem label="Rejection reasons are required" enabled />
                        <ReadinessItem label="Replacement eligibility is checked" enabled />
                        <ReadinessItem label="Assignment conflicts are blocked" enabled />
                        <p className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#65708a]">
                          Use filters for department, cost center, position, location, status, employee, and date range before approving high-volume requests.
                        </p>
                      </div>
                    </Panel>
                  ) : (
                    <Panel title="Request a swap" eyebrow="Employee initiated" icon={Plus}>
                      {mySchedule?.assignments.data.length ? (
                        <form onSubmit={createSwapRequest} className="grid gap-3">
                          <SelectField name="assignmentId" label="Assignment" defaultValue={mySchedule.assignments.data[0]?.id ?? ""}>
                            {mySchedule.assignments.data.map((assignment) => (
                              <option key={assignment.id} value={assignment.id}>
                                {(assignment.shift?.name ?? assignment.position?.title ?? "Assignment")} · {formatTimeRange(assignment.startsAt, assignment.endsAt)}
                              </option>
                            ))}
                          </SelectField>
                          <SelectField name="targetEmployeeId" label="Preferred replacement" defaultValue="">
                            <option value="">No specific employee</option>
                            {employeeOptions
                              .filter((employee) => employee.id !== currentEmployeeId)
                              .map((employee) => (
                                <option key={employee.id} value={employee.id}>{formatEmployee(employee)}</option>
                              ))}
                          </SelectField>
                          <TextAreaField
                            name="reason"
                            label="Reason"
                            placeholder="Explain the coverage need so managers can make a clean decision"
                          />
                          <PrimaryButton label="Submit swap request" loading={isPending} />
                        </form>
                      ) : (
                        <EmptyState
                          title="No upcoming assignment available"
                          body="Swap requests are tied to a specific assignment, so there must be scheduled work before a swap can be requested."
                        />
                      )}
                    </Panel>
                  )}
                  <Panel title="Waiting decisions" eyebrow="Queue signal" icon={ListChecks}>
                    <div className="grid gap-3">
                      <MiniFact label="Requested" value={requestedSwapRequests.length} />
                      <MiniFact label="Visible requests" value={swapRequests.length} />
                      <MiniFact label="Scope" value={canPlan ? "Team or tenant" : "My schedule"} />
                    </div>
                  </Panel>
                </div>
              </div>
            </div>
          ) : null}

          {currentTab === "overtime" ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <Panel title="Overtime requests" eyebrow={policy?.overtimeMode === "DISABLED" ? "Disabled by policy" : "Governed approval"} icon={TimerReset}>
                <div className="grid gap-3">
                  {overtime.length > 0 ? (
                    overtime.map((request) => (
                      <OvertimeRow
                        key={request.id}
                        request={request}
                        canDecide={permissions.canApproveOvertime && request.status === "REQUESTED"}
                        onApprove={() => decideOvertime(request, "APPROVED")}
                        onReject={() => decideOvertime(request, "REJECTED")}
                        loading={isPending}
                      />
                    ))
                  ) : (
                    <EmptyState title="No overtime requests" body="Requests appear here only when overtime is enabled and submitted." />
                  )}
                </div>
              </Panel>
              <Panel title="Request overtime" eyebrow="Policy checked" icon={Plus}>
                {policy?.overtimeMode === "DISABLED" ? (
                  <EmptyState title="Overtime is disabled" body="This workplace currently operates without overtime requests. HR can change this in the policy tab if the company policy changes." />
                ) : (
                  <form onSubmit={requestOvertime} className="grid gap-3">
                    {permissions.canTenantSchedule ? <EmployeeSelect employees={employeeOptions} defaultValue={defaultEmployeeId} /> : null}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <InputField name="requestDate" label="Date" type="date" defaultValue={today} required />
                      <InputField name="startsAt" label="Starts" type="time" defaultValue="17:00" required />
                      <InputField name="endsAt" label="Ends" type="time" defaultValue="19:00" required />
                    </div>
                    <TextAreaField name="reason" label="Reason" placeholder="Coverage need, emergency, handover, approved extra work" />
                    <PrimaryButton label="Submit overtime" loading={isPending} />
                  </form>
                )}
              </Panel>
            </div>
          ) : null}

          {currentTab === "availability" ? (
            <div className="space-y-5">
              {canPlan ? (
                <PlanningFilterBar
                  tab="availability"
                  filters={planningFilters}
                  employees={employeeOptions}
                  organizationNodes={organizationNodes}
                  costCenters={costCenters}
                  positions={positions}
                  statusOptions={availabilityFilterStatuses}
                  buttonLabel="Show availability"
                />
              ) : null}
              <PlanningCalendar
                title="Availability calendar"
                eyebrow="Working and available"
                summary={plannerSummary}
                fallbackDays={fallbackPlanningDays}
                view={plannerView}
                assignments={boardRows}
                openShifts={openShifts}
                availability={availability}
              />
              <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
                <Panel title="Availability" eyebrow="Work preference and absence windows" icon={Clock3}>
                  <div className="grid gap-3">
                    {visibleAvailability.length > 0 ? (
                      <>
                        {visibleAvailability.map((item) => <AvailabilityRow key={item.id} availability={item} />)}
                        {hiddenAvailability > 0 ? (
                          <VolumeNotice
                            count={hiddenAvailability}
                            href={`/scheduling/day?date=${planningDaysDateKey(plannerSummary, fallbackPlanningDays)}`}
                            label="Open day workspace"
                          />
                        ) : null}
                      </>
                    ) : (
                      <EmptyState title="No availability records yet" body="Add preferred or unavailable windows so planners can see constraints before assignment." />
                    )}
                  </div>
                </Panel>
                <Panel title="Add availability" eyebrow="Self-service aware" icon={Plus}>
                  <form onSubmit={createAvailability} className="grid gap-3">
                    {permissions.canTenantSchedule ? <EmployeeSelect employees={employeeOptions} defaultValue={defaultEmployeeId} /> : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField
                        name="applyMode"
                        label="Apply to"
                        defaultValue={availabilityApplyMode}
                        onChange={(value) => setAvailabilityApplyMode(value as AvailabilityApplyMode)}
                      >
                        {availabilityApplyModes.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </SelectField>
                      <SelectField name="status" label="Status" defaultValue="AVAILABLE">
                        {availabilityStatuses.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </SelectField>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <InputField
                        name="date"
                        label={availabilityApplyMode === "SINGLE_DAY" ? "Date" : "Week of"}
                        type="date"
                        defaultValue={today}
                        required
                      />
                      <InputField name="startsAt" label="Starts" type="time" />
                      <InputField name="endsAt" label="Ends" type="time" />
                    </div>
                    {availabilityApplyMode !== "SINGLE_DAY" ? (
                      <WeekdayPicker
                        days={orderedWeekDays}
                        mode={availabilityApplyMode}
                      />
                    ) : null}
                    <CheckboxField
                      name="replaceExisting"
                      label="Replace existing entries on selected dates"
                      description="Use this when changing a weekly preference so duplicate windows are not left behind."
                    />
                    {policy?.timezone ? <input type="hidden" name="timezone" value={policy.timezone} /> : null}
                    <TextAreaField name="reason" label="Reason" placeholder="Availability note" />
                    <PrimaryButton label="Save availability" loading={isPending} />
                  </form>
                </Panel>
              </div>
            </div>
          ) : null}

          {currentTab === "policy" ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_460px]">
              <Panel title="Scheduling policies" eyebrow="Tenant governance" icon={ShieldCheck}>
                <div className="grid gap-3">
                  {policies.length > 0 ? (
                    policies.map((item) => <PolicyRow key={item.id} policy={item} />)
                  ) : (
                    <EmptyState title="No policies beyond the active default" body="Create a policy to tailor overtime, week start, open pickup, and manager assignment rules." />
                  )}
                </div>
              </Panel>
              <Panel title="Create policy" eyebrow="Regional rules" icon={Plus}>
                <form onSubmit={createPolicy} className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InputField name="code" label="Code" placeholder="NG_NO_OVERTIME" required />
                    <InputField name="name" label="Name" placeholder="Nigeria no-overtime policy" required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField name="status" label="Status" defaultValue="DRAFT">
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                    </SelectField>
                    <SelectField name="weekStartsOn" label="Week starts" defaultValue="MONDAY">
                      <option value="MONDAY">Monday</option>
                      <option value="SUNDAY">Sunday</option>
                      <option value="SATURDAY">Saturday</option>
                    </SelectField>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SelectField name="overtimeMode" label="Overtime mode" defaultValue="DISABLED">
                      {overtimeModes.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </SelectField>
                    <SelectField name="overtimeApprovalMode" label="Approval mode" defaultValue="MANAGER">
                      {approvalModes.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </SelectField>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InputField name="standardHoursPerDay" label="Daily hours" type="number" defaultValue="8" />
                    <InputField name="standardHoursPerWeek" label="Weekly hours" type="number" defaultValue="40" />
                    <InputField name="overtimeMultiplier" label="Multiplier" type="number" step="0.1" defaultValue="1.5" />
                  </div>
                  <InputField name="timezone" label="Timezone" placeholder="Africa/Lagos" />
                  <div className="grid gap-2">
                    {[
                      ["allowSelfScheduling", "Allow employee self scheduling"],
                      ["allowOpenShiftPickup", "Allow open shift pickup"],
                      ["allowManagerAssignment", "Allow manager assignment"],
                      ["allowHrAssignment", "Allow HR assignment"],
                    ].map(([name, label]) => (
                      <label key={name} className="flex items-center gap-2 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-3 text-sm font-bold text-[#11143a]">
                        <input name={name} type="checkbox" defaultChecked={name !== "allowSelfScheduling" && name !== "allowOpenShiftPickup"} className="h-4 w-4 accent-[#3820d7]" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <PrimaryButton label="Save policy" loading={isPending} />
                </form>
              </Panel>
            </div>
          ) : null}

          {currentTab === "shifts" ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <Panel title="Shift library" eyebrow="Reusable work patterns" icon={BriefcaseBusiness}>
                <div className="grid gap-3">
                  {shifts.length > 0 ? (
                    shifts.map((shift) => <ShiftRow key={shift.id} shift={shift} />)
                  ) : (
                    <EmptyState title="No shifts configured" body="Create day, night, rotating, standby, or project shifts to speed up schedule assignment." />
                  )}
                </div>
              </Panel>
              <Panel title="Create shift" eyebrow="Time template" icon={Plus}>
                <form onSubmit={createShift} className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InputField name="code" label="Code" placeholder="DAY_0800_1600" required />
                    <InputField name="name" label="Name" placeholder="Day shift" required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InputField name="startTime" label="Starts" type="time" defaultValue="08:00" required />
                    <InputField name="endTime" label="Ends" type="time" defaultValue="16:00" required />
                    <InputField name="breakMinutes" label="Break" type="number" defaultValue="30" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InputField name="minHeadcount" label="Min headcount" type="number" defaultValue="1" />
                    <InputField name="maxHeadcount" label="Max headcount" type="number" />
                  </div>
                  <InputField name="timezone" label="Timezone" placeholder="Africa/Lagos" />
                  <InputField name="color" label="Color" placeholder="#3820d7" />
                  <TextAreaField name="description" label="Description" placeholder="Where and when this shift is normally used" />
                  <label className="flex items-center gap-2 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-3 text-sm font-bold text-[#11143a]">
                    <input name="isOvertimeEligible" type="checkbox" defaultChecked className="h-4 w-4 accent-[#3820d7]" />
                    Eligible for overtime calculation when policy allows it
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-3 text-sm font-bold text-[#11143a]">
                    <input name="requiresApproval" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
                    Require approval before assignment
                  </label>
                  <input type="hidden" name="status" value="ACTIVE" />
                  <PrimaryButton label="Create shift" loading={isPending} />
                </form>
              </Panel>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-black text-[#11143a]">{title}</h3>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-[#3865ff]">
          <Icon size={18} />
        </span>
      </div>
      {children}
    </section>
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

function CompactScope({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.08em] text-[#63708a]">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function PlanningFilterBar({
  tab,
  filters,
  employees,
  organizationNodes,
  costCenters,
  positions,
  statusOptions,
  buttonLabel,
}: {
  tab: ScheduleTab;
  filters: SchedulingCommandCenterProps["planningFilters"];
  employees: ScheduleEmployee[];
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  positions: Position[];
  statusOptions: ReadonlyArray<readonly [string, string]>;
  buttonLabel: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeFilters = planningFilterChips(filters, employees, organizationNodes, costCenters, positions, statusOptions);
  const clearHref = clearPlanningHref(tab, filters);

  return (
    <>
      <section className="rounded-2xl border border-[#dfe8f6] bg-white/85 p-3 shadow-[0_14px_36px_rgba(18,31,67,0.05)] backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(56,32,215,0.18)] transition hover:-translate-y-0.5"
          >
            <SlidersHorizontal size={16} />
            Planner filters
            {activeFilters.length > 0 ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{activeFilters.length}</span>
            ) : null}
          </button>

          <div className="min-w-0 flex-1">
            {activeFilters.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeFilters.map((filter) => (
                  <span
                    key={`${filter.label}:${filter.value}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1.5 text-xs font-black text-[#11143a]"
                  >
                    <span className="text-[#63708a]">{filter.label}</span>
                    {filter.value}
                  </span>
                ))}
              </div>
            ) : (
              <p className="px-1 text-sm font-semibold text-[#63708a]">
                Showing the full visible planning scope. Open filters to narrow by worker, org unit, cost center, position, date, status, or location.
              </p>
            )}
          </div>

          {activeFilters.length > 0 ? (
            <Link
              href={clearHref}
              className="inline-flex min-h-10 items-center rounded-xl border border-[#dfe8f6] bg-white px-3 text-xs font-black text-[#63708a] transition hover:border-[#c8d5ea] hover:text-[#11143a]"
            >
              Clear
            </Link>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CompactScope label="Employee" value={filters.employeeId ? "Selected" : "All visible"} />
          <CompactScope label="Dates" value={filters.from || filters.to ? "Filtered" : "Open range"} />
          <CompactScope label="Org" value={filters.organizationNodeId ? "Scoped" : "All units"} />
          <CompactScope label="Status" value={filters.status ? humanize(filters.status) : "All"} />
        </div>
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[90] bg-[#09102b]/45 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close planner filters"
            className="absolute inset-0 cursor-default"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-white/60 bg-white shadow-[0_30px_90px_rgba(9,16,43,0.28)]">
            <div className="border-b border-[#edf1f7] bg-[linear-gradient(135deg,#ffffff,#f8fbff)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#3820d7]">Planner scope</p>
                  <h3 className="mt-2 text-2xl font-black text-[#11143a]">Filter scheduling work.</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#63708a]">
                    Narrow the planner by employee, placement, date range, status, and location.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] transition hover:border-[#c8d5ea] hover:text-[#11143a]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form action="/scheduling" method="GET" className="flex min-h-0 flex-1 flex-col">
              <input type="hidden" name="tab" value={tab} />
              <input type="hidden" name="view" value={normalizePlannerView(filters.view)} />
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="grid gap-4">
                  <section className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
                    <p className="mb-3 text-[11px] font-black uppercase text-[#63708a]">Worker and status</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField name="employeeId" label="Employee" defaultValue={filters.employeeId}>
                        <option value="">All visible employees</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {formatEmployee(employee)}
                          </option>
                        ))}
                      </SelectField>
                      <InputField name="employeeSearch" label="Employee search" defaultValue={filters.employeeSearch} placeholder="Name or employee number" />
                      <SelectField name="status" label="Status" defaultValue={filters.status}>
                        {statusOptions.map(([value, label]) => (
                          <option key={value || "all"} value={value}>
                            {label}
                          </option>
                        ))}
                      </SelectField>
                      <InputField name="locationName" label="Location" defaultValue={filters.locationName} placeholder="Ward, floor, branch, site" />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
                    <p className="mb-3 text-[11px] font-black uppercase text-[#63708a]">Date range</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InputField name="from" label="From" type="date" defaultValue={filters.from} />
                      <InputField name="to" label="To" type="date" defaultValue={filters.to} />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
                    <p className="mb-3 text-[11px] font-black uppercase text-[#63708a]">Placement scope</p>
                    <div className="grid gap-3">
                      <SelectField name="organizationNodeId" label="Org unit" defaultValue={filters.organizationNodeId}>
                        <option value="">All org units</option>
                        {organizationNodes.map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.name} ({humanize(node.type)})
                          </option>
                        ))}
                      </SelectField>
                      <SelectField name="costCenterId" label="Cost center" defaultValue={filters.costCenterId}>
                        <option value="">All cost centers</option>
                        {costCenters.map((costCenter) => (
                          <option key={costCenter.id} value={costCenter.id}>
                            {costCenter.name} ({costCenter.code})
                          </option>
                        ))}
                      </SelectField>
                      <SelectField name="positionId" label="Position" defaultValue={filters.positionId}>
                        <option value="">All positions</option>
                        {positions.map((position) => (
                          <option key={position.id} value={position.id}>
                            {position.title} ({position.code})
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  </section>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] bg-[#fbfcff] p-4">
                <Link
                  href={clearHref}
                  className="inline-flex min-h-11 items-center rounded-xl border border-[#dfe8f6] bg-white px-4 text-sm font-black text-[#63708a] transition hover:border-[#c8d5ea] hover:text-[#11143a]"
                >
                  Clear filters
                </Link>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3820d7] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(56,32,215,0.20)] transition hover:-translate-y-0.5"
                >
                  {buttonLabel}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function PlannerViewSwitch({
  filters,
  activeView,
}: {
  filters: SchedulingCommandCenterProps["planningFilters"];
  activeView: PlannerView;
}) {
  const views: Array<[PlannerView, string, string]> = [
    ["DAY", "Day", "One operating day"],
    ["WEEK", "Week", "Policy week"],
    ["MONTH", "Month", "Roster month"],
  ];

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-3 shadow-[0_14px_36px_rgba(18,31,67,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Planner range</p>
          <p className="mt-1 text-sm font-semibold text-[#63708a]">
            Switch between a daily control room, a weekly roster, and a monthly capacity view.
          </p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          {views.map(([view, label, description]) => (
            <Link
              key={view}
              href={planningHref(filters, "board", view)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                activeView === view
                  ? "border-[#3820d7] bg-[#f3f0ff] text-[#3820d7] shadow-[0_14px_28px_rgba(56,32,215,0.10)]"
                  : "border-[#dfe8f6] bg-[#fbfcff] text-[#11143a] hover:border-[#3820d7]"
              }`}
            >
              <span className="block text-sm font-black">{label}</span>
              <span className="mt-1 block text-[11px] font-bold text-[#7a8499]">{description}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanningCalendar({
  eyebrow,
  title,
  summary,
  fallbackDays,
  view,
}: {
  eyebrow: string;
  title: string;
  summary: SchedulePlannerSummary | null;
  fallbackDays: Date[];
  view: PlannerView;
  assignments: ScheduleAssignment[];
  openShifts: OpenShift[];
  availability: EmployeeAvailability[];
}) {
  const calendarDays = summary?.days ?? fallbackDays.map((date) => emptyPlannerDay(dateKeyFromDate(date)));
  const totals = summary?.totals ?? calendarDays.reduce(
    (result, day) => ({
      assignmentCount: result.assignmentCount + day.assignmentCount,
      openShiftCount: result.openShiftCount + day.openShiftCount,
      openShiftSlots: result.openShiftSlots + day.openShiftSlots,
      claimedOpenShiftSlots: result.claimedOpenShiftSlots + day.claimedOpenShiftSlots,
      coverageRuleCount: result.coverageRuleCount + day.coverageRuleCount,
      coverageRequiredHeadcount: result.coverageRequiredHeadcount + day.coverageRequiredHeadcount,
      coverageMinimumHeadcount: result.coverageMinimumHeadcount + day.coverageMinimumHeadcount,
      coverageGap: result.coverageGap + day.coverageGap,
      availabilityCount: result.availabilityCount + day.availabilityCount,
      availableCount: result.availableCount + day.availableCount,
      preferredCount: result.preferredCount + day.preferredCount,
      unavailableCount: result.unavailableCount + day.unavailableCount,
      pendingClaimCount: 0,
      approvedClaimCount: 0,
      rejectedClaimCount: 0,
    }),
    {
      assignmentCount: 0,
      openShiftCount: 0,
      openShiftSlots: 0,
      claimedOpenShiftSlots: 0,
      coverageRuleCount: 0,
      coverageRequiredHeadcount: 0,
      coverageMinimumHeadcount: 0,
      coverageGap: 0,
      availabilityCount: 0,
      availableCount: 0,
      preferredCount: 0,
      unavailableCount: 0,
      pendingClaimCount: 0,
      approvedClaimCount: 0,
      rejectedClaimCount: 0,
    },
  );

  return (
    <Panel title={title} eyebrow={eyebrow} icon={CalendarClock}>
      <div className="mb-4 flex flex-wrap gap-2">
        <CalendarSummaryChip label="Working" value={totals.assignmentCount} tone="blue" />
        <CalendarSummaryChip label="Demand gap" value={totals.coverageGap} tone={totals.coverageGap > 0 ? "red" : "green"} />
        <CalendarSummaryChip label="Open slots" value={Math.max(0, totals.openShiftSlots - totals.claimedOpenShiftSlots)} tone="purple" />
        <CalendarSummaryChip label="Available" value={totals.availableCount + totals.preferredCount} tone="green" />
        <CalendarSummaryChip label="Unavailable" value={totals.unavailableCount} tone="amber" />
        <CalendarSummaryChip label="Days" value={calendarDays.length} tone="amber" />
      </div>
      <div className={`grid gap-3 ${view === "DAY" ? "grid-cols-1" : view === "MONTH" ? "md:grid-cols-3 2xl:grid-cols-7" : "md:grid-cols-2 xl:grid-cols-7"}`}>
        {calendarDays.map((day) => (
          <Link
            key={day.date}
            href={`/scheduling/day?date=${day.date.slice(0, 10)}`}
            className={`${view === "MONTH" ? "min-h-[170px]" : "min-h-[215px]"} rounded-xl border p-3 ${
              isTodayKey(day.date.slice(0, 10))
                ? "border-[#3820d7] bg-[#f5f2ff] shadow-[0_14px_30px_rgba(56,32,215,0.10)]"
                : "border-[#e3e9f4] bg-[#fbfcff]"
            } transition hover:-translate-y-0.5 hover:border-[#3820d7] hover:shadow-[0_16px_34px_rgba(56,32,215,0.10)]`}
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#63708a]">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p className="mt-1 text-lg font-black text-[#11143a]">
                  {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#3820d7] shadow-sm">
                {day.assignmentCount + day.openShiftCount + day.availabilityCount}
              </span>
            </header>

            <div className="mt-4 grid gap-3">
              <CalendarMetricLine
                label="Working"
                value={day.assignmentCount}
                max={Math.max(totals.assignmentCount, 1)}
                tone="blue"
              />
              <CalendarMetricLine
                label="Demand gap"
                value={day.coverageGap}
                max={Math.max(totals.coverageGap, 1)}
                tone={day.coverageGap > 0 ? "red" : "green"}
              />
              <CalendarMetricLine
                label="Open slots"
                value={Math.max(0, day.openShiftSlots - day.claimedOpenShiftSlots)}
                max={Math.max(totals.openShiftSlots, 1)}
                tone="purple"
              />
              <CalendarMetricLine
                label="Available"
                value={day.availableCount + day.preferredCount}
                max={Math.max(totals.availableCount + totals.preferredCount, 1)}
                tone="green"
              />
              <CalendarMetricLine
                label="Unavailable"
                value={day.unavailableCount}
                max={Math.max(totals.unavailableCount, 1)}
                tone="amber"
              />
              <span className="mt-1 inline-flex items-center gap-2 text-xs font-black text-[#3820d7]">
                Open day <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function CalendarSummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "amber" | "purple" | "red";
}) {
  const tones = {
    blue: "bg-[#eef5ff] text-[#3865ff]",
    green: "bg-[#eafaf1] text-[#07845b]",
    amber: "bg-[#fff4dc] text-[#9a5a00]",
    purple: "bg-[#f1ebff] text-[#6d3ff6]",
    red: "bg-[#fff1f1] text-[#b42318]",
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}>
      {label}
      <strong>{value}</strong>
    </span>
  );
}

function CalendarMetricLine({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "blue" | "green" | "amber" | "purple" | "red";
}) {
  const tones = {
    blue: "bg-[#3865ff]",
    green: "bg-[#12a66a]",
    amber: "bg-[#f59e0b]",
    purple: "bg-[#6d3ff6]",
    red: "bg-[#b42318]",
  };
  const width = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#63708a]">{label}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#11143a] shadow-sm">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#edf1f7]">
        <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function AssignmentRow({ assignment }: { assignment: ScheduleAssignment }) {
  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#11143a]">
            {assignment.shift?.name ?? assignment.position?.title ?? "Custom assignment"}
          </p>
          <p className="mt-1 text-xs font-bold text-[#667089]">
            {formatEmployee(assignment.employee)} · {formatTimeRange(assignment.startsAt, assignment.endsAt)}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#7a8499]">
            {assignment.organizationNode?.name ?? assignment.locationName ?? "Location pending"}
          </p>
        </div>
        <StatusPill label={assignment.status} tone={assignment.status === "CONFIRMED" ? "green" : assignment.status === "CANCELLED" ? "red" : "blue"} />
      </div>
      {assignment.overtimeMinutes > 0 ? (
        <p className="mt-3 rounded-lg bg-[#fff4dc] px-3 py-2 text-xs font-bold text-[#9a5a00]">
          {assignment.overtimeMinutes} overtime minutes calculated by policy.
        </p>
      ) : null}
    </article>
  );
}

function OpenShiftRow({
  openShift,
  currentClaim,
  canClaim,
  onClaim,
  loading,
}: {
  openShift: OpenShift;
  currentClaim?: OpenShiftClaim;
  canClaim: boolean;
  onClaim: () => void;
  loading: boolean;
}) {
  const claimLocked = Boolean(currentClaim);
  const claimButtonLabel =
    currentClaim?.status === "REQUESTED"
      ? "Requested"
      : currentClaim?.status === "APPROVED"
        ? "Approved"
        : currentClaim
          ? "Closed"
          : "Pick up";
  const isTargeted = Boolean(openShift.organizationNode || openShift.costCenter || openShift.position);

  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#11143a]">{openShift.shift?.name ?? openShift.position?.title ?? "Open shift"}</p>
          <p className="mt-1 text-xs font-bold text-[#667089]">{formatTimeRange(openShift.startsAt, openShift.endsAt)}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#7a8499]">
            <MapPin size={13} /> {openShift.organizationNode?.name ?? openShift.locationName ?? "Location pending"}
          </p>
        </div>
        <div className="text-right">
          <StatusPill label={`${openShift.claimedHeadcount}/${openShift.requiredHeadcount} claimed`} tone="purple" />
          {!isTargeted ? (
            <div className="mt-2">
              <StatusPill label="Needs targeting" tone="amber" />
            </div>
          ) : null}
          {currentClaim ? (
            <div className="mt-3">
              <StatusPill
                label={currentClaim.status === "REQUESTED" ? "Waiting approval" : currentClaim.status}
                tone={currentClaim.status === "REJECTED" || currentClaim.status === "CANCELLED" ? "red" : currentClaim.status === "APPROVED" ? "green" : "amber"}
              />
            </div>
          ) : null}
          {canClaim && openShift.status === "OPEN" ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={loading || claimLocked}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#3820d7] px-4 py-2 text-xs font-black text-white shadow-[0_10px_20px_rgba(56,32,215,0.22)] disabled:opacity-60"
            >
              {claimButtonLabel} <ArrowRight size={14} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <OpenShiftScopeFact label="Org unit" value={openShift.organizationNode?.name ?? "Not targeted"} />
        <OpenShiftScopeFact label="Cost center" value={openShift.costCenter?.name ?? "Not targeted"} />
        <OpenShiftScopeFact label="Position" value={openShift.position?.title ?? "Not targeted"} />
      </div>
      {currentClaim?.status === "REJECTED" && currentClaim.note ? (
        <p className="mt-3 rounded-xl border border-[#ffd6d6] bg-[#fff8f8] px-3 py-2 text-xs font-bold leading-5 text-[#9f1d14]">
          Rejection reason: {currentClaim.note}
        </p>
      ) : null}
    </article>
  );
}

function OpenShiftScopeFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e9eef8] bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#7a8499]">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function OpenShiftClaimRow({
  claim,
  canDecide,
  onApprove,
  onReject,
  loading,
}: {
  claim: OpenShiftClaim;
  canDecide: boolean;
  onApprove: () => void;
  onReject: (note: string) => void;
  loading: boolean;
}) {
  const [isRejecting, setIsRejecting] = useState(false);
  const shiftName = claim.openShift?.shift?.name ?? claim.openShift?.position?.title ?? "Open shift";

  function submitRejection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("note")?.toString().trim();

    if (!note) {
      toast.error("Rejection reason required.", {
        description: "The employee will see this note on the pickup request.",
      });
      return;
    }

    onReject(note);
  }

  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#11143a]">{formatEmployee(claim.employee)}</p>
          <p className="mt-1 text-xs font-bold text-[#667089]">{shiftName}</p>
          {claim.openShift ? (
            <p className="mt-1 text-xs font-semibold text-[#7a8499]">
              {formatTimeRange(claim.openShift.startsAt, claim.openShift.endsAt)}
            </p>
          ) : null}
        </div>
        <StatusPill label={claim.status} tone={claim.status === "REQUESTED" ? "amber" : claim.status === "APPROVED" ? "green" : "red"} />
      </div>

      {canDecide && claim.status === "REQUESTED" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading}
            onClick={onApprove}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3820d7] px-4 text-xs font-black text-white shadow-[0_10px_20px_rgba(56,32,215,0.18)] disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setIsRejecting((value) => !value)}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#ffd6d6] bg-white px-4 text-xs font-black text-[#b42318] disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      ) : null}
      {isRejecting ? (
        <form onSubmit={submitRejection} className="mt-3 rounded-xl border border-[#ffd6d6] bg-[#fff8f8] p-3">
          <TextAreaField
            name="note"
            label="Rejection reason"
            placeholder="Explain why this pickup cannot be approved"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#b42318] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            Send rejection
          </button>
        </form>
      ) : null}
      {claim.status === "REJECTED" && claim.note ? (
        <p className="mt-3 rounded-xl border border-[#ffd6d6] bg-[#fff8f8] px-3 py-2 text-xs font-bold leading-5 text-[#9f1d14]">
          Rejection reason: {claim.note}
        </p>
      ) : null}
    </article>
  );
}

function OvertimeRow({
  request,
  canDecide,
  onApprove,
  onReject,
  loading,
}: {
  request: OvertimeRequest;
  canDecide: boolean;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#11143a]">{formatEmployee(request.employee)} · {request.minutes} minutes</p>
          <p className="mt-1 text-xs font-bold text-[#667089]">{formatTimeRange(request.startsAt, request.endsAt)}</p>
          {request.reason ? <p className="mt-2 text-sm font-semibold text-[#63708a]">{request.reason}</p> : null}
        </div>
        <StatusPill label={request.status} tone={request.status === "APPROVED" ? "green" : request.status === "REJECTED" ? "red" : "amber"} />
      </div>
      {canDecide ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onApprove} disabled={loading} className="rounded-xl bg-[#12a66a] px-4 py-2 text-xs font-black text-white disabled:opacity-60">
            Approve
          </button>
          <button type="button" onClick={onReject} disabled={loading} className="rounded-xl border border-[#ffd6d6] bg-[#fff7f7] px-4 py-2 text-xs font-black text-[#b42318] disabled:opacity-60">
            Reject
          </button>
        </div>
      ) : null}
    </article>
  );
}

function AvailabilityRow({ availability }: { availability: EmployeeAvailability }) {
  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#11143a]">{formatEmployee(availability.employee)}</p>
          <p className="mt-1 text-xs font-bold text-[#667089]">
            {new Date(availability.date).toLocaleDateString()} {availability.startsAt ? `· ${formatTimeRange(availability.startsAt, availability.endsAt ?? availability.startsAt)}` : ""}
          </p>
          {availability.reason ? <p className="mt-2 text-sm font-semibold text-[#63708a]">{availability.reason}</p> : null}
        </div>
        <StatusPill label={availability.status} tone={availability.status === "UNAVAILABLE" ? "red" : availability.status === "PREFERRED" ? "purple" : "green"} />
      </div>
    </article>
  );
}

function PolicyRow({ policy }: { policy: SchedulePolicy }) {
  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#11143a]">{policy.name}</p>
          <p className="mt-1 text-xs font-bold text-[#667089]">{policy.code} · {policy.overtimeMode.replaceAll("_", " ")}</p>
        </div>
        <StatusPill label={policy.status} tone={policy.status === "ACTIVE" ? "green" : "blue"} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniFact label="Daily" value={policy.standardHoursPerDay ?? "Off"} />
        <MiniFact label="Weekly" value={policy.standardHoursPerWeek ?? "Off"} />
        <MiniFact label="Multiplier" value={policy.overtimeMultiplier} />
      </div>
    </article>
  );
}

function ShiftRow({ shift }: { shift: WorkShift }) {
  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#11143a]">{shift.name}</p>
          <p className="mt-1 text-xs font-bold text-[#667089]">
            {shift.code} · {shift.startTime}-{shift.endTime} · {Math.round(shift.durationMinutes / 60)}h
          </p>
        </div>
        <StatusPill label={shift.status} tone={shift.status === "ACTIVE" ? "green" : "blue"} />
      </div>
    </article>
  );
}

function CoverageRuleRow({
  rule,
  loading,
  onActivate,
  onArchive,
}: {
  rule: ScheduleCoverageRule;
  loading: boolean;
  onActivate: () => void;
  onArchive: () => void;
}) {
  const gapSignal = Math.max(0, rule.requiredHeadcount - rule.minimumHeadcount);

  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#11143a]">{rule.name}</p>
          <p className="mt-1 text-xs font-bold text-[#667089]">
            {rule.code} · {rule.startsAtTime ?? "--:--"}-{rule.endsAtTime ?? "--:--"} · {formatWeekdays(rule.weekdays)}
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#63708a]">
            {coverageScope(rule)}
          </p>
        </div>
        <StatusPill
          label={rule.status}
          tone={rule.status === "ACTIVE" ? "green" : rule.status === "ARCHIVED" ? "red" : "blue"}
        />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <MiniFact label="Required" value={rule.requiredHeadcount} />
        <MiniFact label="Minimum" value={rule.minimumHeadcount} />
        <MiniFact label="Buffer" value={gapSignal} />
        <MiniFact label="Shift" value={rule.shift?.name ?? "Custom"} />
      </div>
      {rule.description ? (
        <p className="mt-3 rounded-xl border border-[#e9eef8] bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#63708a]">
          {rule.description}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {rule.status !== "ACTIVE" && rule.status !== "ARCHIVED" ? (
          <button
            type="button"
            onClick={onActivate}
            disabled={loading}
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#3820d7] px-4 text-xs font-black text-white shadow-[0_10px_20px_rgba(56,32,215,0.16)] disabled:opacity-60"
          >
            Activate
          </button>
        ) : null}
        {rule.status !== "ARCHIVED" ? (
          <button
            type="button"
            onClick={onArchive}
            disabled={loading}
            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#dfe8f6] bg-white px-4 text-xs font-black text-[#11143a] disabled:opacity-60"
          >
            Archive
          </button>
        ) : null}
      </div>
    </article>
  );
}

function WeekdayCheckboxGroup({ days }: { days: typeof weekDays }) {
  return (
    <fieldset className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-3">
      <legend className="px-1 text-[11px] font-black uppercase text-[#63708a]">Operating days</legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {days.map((day) => (
          <label
            key={`coverage-${day.value}`}
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[#dfe8f6] bg-white px-3 text-sm font-black text-[#11143a] transition hover:border-[#3820d7]"
            title={day.longLabel}
          >
            <span>{day.label}</span>
            <input
              type="checkbox"
              name="weekdays"
              value={day.value}
              defaultChecked={day.value >= 1 && day.value <= 5}
              className="h-4 w-4 accent-[#3820d7]"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SwapRequestRow({
  request,
  canDecide,
  canCancel,
  loading,
  onApprove,
  onReject,
  onCancel,
  onComplete,
}: {
  request: ScheduleSwapRequest;
  canDecide: boolean;
  canCancel: boolean;
  loading: boolean;
  onApprove: () => void;
  onReject: (note: string) => void;
  onCancel: (note?: string) => void;
  onComplete: () => void;
}) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const assignment = request.assignment;
  const shiftName = assignment?.shift?.name ?? assignment?.position?.title ?? "Assignment";

  function submitDecision(event: FormEvent<HTMLFormElement>, kind: "reject" | "cancel") {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("note")?.toString().trim();

    if (kind === "reject" && !note) {
      toast.error("Decision reason required.", {
        description: "The employee should understand why the swap cannot be approved.",
      });
      return;
    }

    if (kind === "reject") {
      onReject(note ?? "");
    } else {
      onCancel(note);
    }
  }

  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#11143a]">{formatEmployee(request.requesterEmployee)}</p>
          <p className="mt-1 text-xs font-bold text-[#667089]">
            {shiftName}
            {assignment ? ` · ${formatTimeRange(assignment.startsAt, assignment.endsAt)}` : ""}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#7a8499]">
            Replacement: {request.targetEmployee ? formatEmployee(request.targetEmployee) : "Open replacement pool"}
          </p>
        </div>
        <StatusPill
          label={request.status}
          tone={
            request.status === "COMPLETED" || request.status === "APPROVED"
              ? "green"
              : request.status === "REJECTED" || request.status === "CANCELLED"
                ? "red"
                : "amber"
          }
        />
      </div>
      {request.reason ? (
        <p className="mt-3 rounded-xl border border-[#e9eef8] bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#63708a]">
          {request.reason}
        </p>
      ) : null}
      {request.decisionNote ? (
        <p className="mt-3 rounded-xl border border-[#ffd6d6] bg-[#fff8f8] px-3 py-2 text-xs font-bold leading-5 text-[#9f1d14]">
          Decision note: {request.decisionNote}
        </p>
      ) : null}
      {canDecide ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={loading}
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#3820d7] px-4 text-xs font-black text-white shadow-[0_10px_20px_rgba(56,32,215,0.16)] disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setIsRejecting((value) => !value)}
            disabled={loading}
            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#ffd6d6] bg-white px-4 text-xs font-black text-[#b42318] disabled:opacity-60"
          >
            Reject
          </button>
          {request.targetEmployeeId ? (
            <button
              type="button"
              onClick={onComplete}
              disabled={loading}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#c8efe0] bg-[#effcf7] px-4 text-xs font-black text-[#07845b] disabled:opacity-60"
            >
              Complete
            </button>
          ) : null}
        </div>
      ) : null}
      {canCancel ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setIsCancelling((value) => !value)}
            disabled={loading}
            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#dfe8f6] bg-white px-4 text-xs font-black text-[#11143a] disabled:opacity-60"
          >
            Cancel request
          </button>
        </div>
      ) : null}
      {isRejecting ? (
        <form onSubmit={(event) => submitDecision(event, "reject")} className="mt-3 rounded-xl border border-[#ffd6d6] bg-[#fff8f8] p-3">
          <TextAreaField name="note" label="Rejection reason" placeholder="Explain why this swap cannot be approved" required />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#b42318] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            Send rejection
          </button>
        </form>
      ) : null}
      {isCancelling ? (
        <form onSubmit={(event) => submitDecision(event, "cancel")} className="mt-3 rounded-xl border border-[#dfe8f6] bg-white p-3">
          <TextAreaField name="note" label="Cancellation note" placeholder="Optional note for audit" />
          <button
            type="submit"
            disabled={loading}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3820d7] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            Cancel swap request
          </button>
        </form>
      ) : null}
    </article>
  );
}

function ReadinessItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <span className="text-sm font-black text-[#11143a]">{label}</span>
      <StatusPill label={enabled ? "Enabled" : "Off"} tone={enabled ? "green" : "blue"} />
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-white p-3">
      <p className="text-[10px] font-black uppercase text-[#7a8499]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function SelfAssignmentNotice({ enabled }: { enabled: boolean }) {
  return (
    <Panel title="Self scheduling" eyebrow="Employee control" icon={Sparkles}>
      <p className="text-sm font-semibold leading-6 text-[#65708a]">
        {enabled
          ? "Your workplace allows self-service schedule assignments from approved rules."
          : "Self-service assignment is not enabled for this workplace. Open shifts and overtime remain policy-controlled."}
      </p>
    </Panel>
  );
}

function PlannerActionRail({
  assignHref,
  bulkHref,
  periodHref,
}: {
  assignHref: string;
  bulkHref: string;
  periodHref?: string;
}) {
  const actions = [
    {
      title: "Assign a shift",
      body: "Create one controlled assignment with employee, placement, date, time, and shift context.",
      href: assignHref,
      icon: Plus,
      tone: "from-[#3820d7] to-[#6d5df6]",
    },
    {
      title: "Bulk assignment",
      body: "Build roster batches from a searchable worker table and selected work dates.",
      href: bulkHref,
      icon: UsersRound,
      tone: "from-[#0f766e] to-[#14b8a6]",
    },
    ...(periodHref
      ? [
          {
            title: "Create period",
            body: "Start a draft planning window for weekly or monthly schedule publishing.",
            href: periodHref,
            icon: CalendarClock,
            tone: "from-[#b45309] to-[#f59e0b]",
          },
        ]
      : []),
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            key={action.title}
            href={action.href}
            className="group relative overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.05)] transition hover:-translate-y-0.5 hover:border-[#c8d5ea] hover:shadow-[0_22px_55px_rgba(18,31,67,0.09)]"
          >
            <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${action.tone}`} />
            <div className="flex items-start gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${action.tone} text-white shadow-[0_14px_28px_rgba(18,31,67,0.14)]`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black text-[#11143a]">{action.title}</span>
                <span className="mt-1 block text-sm font-semibold leading-6 text-[#63708a]">{action.body}</span>
              </span>
              <ArrowRight size={17} className="ml-auto shrink-0 text-[#7a8499] transition group-hover:translate-x-1 group-hover:text-[#3820d7]" aria-hidden="true" />
            </div>
          </Link>
        );
      })}
    </section>
  );
}

function ScheduleBoardTable({
  assignments,
  scopeLabel,
  hiddenRows,
  dayHref,
}: {
  assignments: ScheduleAssignment[];
  scopeLabel: string;
  hiddenRows: number;
  dayHref: string;
}) {
  const columns: Array<DataTableColumn<ScheduleAssignment>> = [
    {
      key: "employee",
      header: "Employee",
      render: (assignment) => (
        <div className="min-w-0">
          <p className="truncate font-black text-[#11143a]">{formatEmployee(assignment.employee)}</p>
          <p className="mt-1 truncate text-xs font-bold text-[#7a8499]">{assignment.employee?.id ?? assignment.employeeId}</p>
        </div>
      ),
    },
    {
      key: "shift",
      header: "Shift",
      render: (assignment) => (
        <div className="min-w-0">
          <p className="truncate font-black text-[#11143a]">{assignment.shift?.name ?? assignment.position?.title ?? "Custom coverage"}</p>
          <p className="mt-1 truncate text-xs font-bold text-[#7a8499]">{assignment.schedule?.name ?? "No period"}</p>
        </div>
      ),
    },
    {
      key: "time",
      header: "Date and time",
      render: (assignment) => (
        <div>
          <p className="font-black text-[#11143a]">{new Date(assignment.workDate).toLocaleDateString()}</p>
          <p className="mt-1 text-xs font-bold text-[#63708a]">{formatTimeRange(assignment.startsAt, assignment.endsAt)}</p>
        </div>
      ),
    },
    {
      key: "placement",
      header: "Placement",
      render: (assignment) => (
        <div className="min-w-0">
          <p className="truncate font-black text-[#11143a]">{assignment.organizationNode?.name ?? "Unassigned org"}</p>
          <p className="mt-1 truncate text-xs font-bold text-[#7a8499]">{assignment.costCenter?.name ?? assignment.locationName ?? "No cost center"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (assignment) => (
        <div className="flex flex-wrap gap-2">
          <StatusPill label={assignment.status} tone={assignment.status === "CANCELLED" || assignment.status === "NO_SHOW" ? "red" : assignment.status === "COMPLETED" ? "green" : "purple"} />
          {assignment.isOvertime ? <StatusPill label="Overtime" tone="amber" /> : null}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (assignment) => <span className="text-sm font-black text-[#63708a]">{assignment.source.replaceAll("_", " ")}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (assignment) => (
        <Link
          href={`/scheduling/assignments/${assignment.id}`}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#dfe8f6] bg-white px-3 text-xs font-black text-[#11143a] transition hover:border-[#3820d7] hover:text-[#3820d7]"
        >
          Open
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      title="Schedule board"
      eyebrow={scopeLabel}
      description="Review planned coverage by employee, shift, placement, status, and source. Open a row for full assignment controls."
      rows={assignments}
      columns={columns}
      getRowKey={(assignment) => assignment.id}
      minWidth="1060px"
      emptyTitle="No schedule assignments in this view"
      emptyBody="Create assignments from the planner or publish open shifts for pickup."
      footer={
        hiddenRows > 0 ? (
          <VolumeNotice count={hiddenRows} href={dayHref} label="Open day workspace" />
        ) : (
          <p className="text-sm font-semibold text-[#63708a]">Showing the current planner result set.</p>
        )
      }
    />
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-6 text-center">
      <p className="text-sm font-black text-[#11143a]">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#74809a]">{body}</p>
    </div>
  );
}

function VolumeNotice({ count, href, label }: { count: number; href: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
      <p className="text-sm font-bold text-[#63708a]">
        {count} more record{count === 1 ? "" : "s"} match this view.
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-xl bg-[#3820d7] px-4 py-2 text-xs font-black text-white shadow-[0_10px_20px_rgba(56,32,215,0.18)]"
      >
        {label}
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function Pill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe8f6] bg-white/80 px-3 py-1 text-[11px] font-black uppercase text-[#3820d7]">
      <Icon size={13} />
      {label}
    </span>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "blue" | "green" | "amber" | "red" | "purple" }) {
  const tones = {
    blue: "bg-[#eef5ff] text-[#3865ff]",
    green: "bg-[#eafaf1] text-[#07845b]",
    amber: "bg-[#fff4dc] text-[#9a5a00]",
    red: "bg-[#fff1f1] text-[#b42318]",
    purple: "bg-[#f1ebff] text-[#6d3ff6]",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase ${tones[tone]}`}>
      {label.replaceAll("_", " ")}
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

function EmployeeSelect({
  employees,
  defaultValue,
  endpoint = "/scheduling/employees",
  filters,
}: {
  employees: ScheduleEmployee[];
  defaultValue: string;
  endpoint?: string;
  filters?: SchedulingCommandCenterProps["planningFilters"];
}) {
  const listId = useId();
  const [query, setQuery] = useState(filters?.employeeSearch ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [remoteCandidates, setRemoteCandidates] = useState<ScheduleEmployee[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const candidates = remoteCandidates ?? employees;
  const selectedEmployee = candidates.find((employee) => employee.id === selectedId) ?? employees.find((employee) => employee.id === selectedId);
  const searchTerm = query.trim();
  const matchingCandidates = searchTerm.length >= 2 ? candidates.filter((employee) => employeeMatchesSearch(employee, searchTerm)) : [];
  const filteredCandidates = matchingCandidates.slice(0, 5);
  const hiddenCandidates = Math.max(0, matchingCandidates.length - filteredCandidates.length);
  const selectedAssignment = selectedEmployee?.assignments?.[0];

  useEffect(() => {
    if (searchTerm.length < 2) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams({ limit: "8", employeeSearch: searchTerm });

      if (filters?.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
      if (filters?.costCenterId) params.set("costCenterId", filters.costCenterId);
      if (filters?.positionId) params.set("positionId", filters.positionId);

      setLoading(true);
      try {
        const results = await apiFetch<ScheduleEmployee[]>(`${endpoint}?${params.toString()}`);
        setRemoteCandidates(mergeEmployees(results, employees));
      } catch (caught) {
        toast.error("Employee search failed.", {
          description: caught instanceof Error ? caught.message : "Please try again.",
        });
      } finally {
        setLoading(false);
      }
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [endpoint, employees, filters?.costCenterId, filters?.organizationNodeId, filters?.positionId, searchTerm]);

  return (
    <section className="relative rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-3">
      <input type="hidden" name="employeeId" value={selectedId} />
      <input type="hidden" name="organizationNodeId" value={selectedAssignment?.organizationNodeId ?? ""} />
      <input type="hidden" name="costCenterId" value={selectedAssignment?.costCenterId ?? ""} />
      <input type="hidden" name="positionId" value={selectedAssignment?.positionId ?? ""} />
      <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
        Employee
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            setOpen(true);
            if (nextValue.trim().length < 2) {
              setRemoteCandidates(null);
            }
          }}
          placeholder="Search name, employee number, team, position"
          className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
        />
      </label>

      <div className="mt-3 rounded-xl border border-[#dfe8f6] bg-white p-3 shadow-[0_12px_28px_rgba(18,31,67,0.05)]">
        {selectedEmployee ? (
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-sm font-black text-[#3865ff]">
              {employeeInitials(selectedEmployee)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-[#11143a]">{formatEmployee(selectedEmployee)}</span>
              <span className="mt-1 line-clamp-2 text-[11px] font-bold leading-5 text-[#63708a]">
                {employeeAssignmentContext(selectedAssignment)}
              </span>
            </span>
          </div>
        ) : (
          <p className="text-sm font-bold text-[#63708a]">No employee selected.</p>
        )}
      </div>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-3 right-3 top-[78px] z-40 overflow-hidden rounded-2xl border border-[#cfd8ea] bg-white shadow-[0_24px_60px_rgba(18,31,67,0.18)]"
        >
          <div className="max-h-72 overflow-y-auto p-2">
            {searchTerm.length < 2 ? (
              <div className="rounded-xl bg-[#f7f9fd] p-3 text-sm font-bold text-[#63708a]">
                Type at least two characters to search scoped employees.
              </div>
            ) : filteredCandidates.length > 0 ? (
              <div className="grid gap-1">
                {filteredCandidates.map((employee) => {
                  const active = employee.id === selectedId;
                  const assignment = employee.assignments?.[0];

                  return (
                    <button
                      key={employee.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setSelectedId(employee.id);
                        setQuery("");
                        setOpen(false);
                      }}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active ? "bg-[#f2efff] text-[#11143a]" : "hover:bg-[#f7f9fd]"
                      }`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${active ? "bg-[#3820d7] text-white" : "bg-[#eef5ff] text-[#3865ff]"}`}>
                        {employeeInitials(employee)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-[#11143a]">{formatEmployee(employee)}</span>
                        <span className="block truncate text-[11px] font-bold text-[#63708a]">{employeeAssignmentContext(assignment)}</span>
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${active ? "bg-[#3820d7] text-white" : "bg-[#eef3fb] text-[#63708a]"}`}>
                        {active ? "Selected" : "Choose"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#cfd8ea] bg-[#fbfcff] p-3 text-sm font-bold text-[#63708a]">
                No matching worker in this scope. Adjust filters or search by full name or employee number.
              </div>
            )}
          </div>
          <div className="border-t border-[#edf1f7] bg-[#fbfcff] px-3 py-2 text-[11px] font-semibold text-[#7a8499]">
            {loading
              ? "Searching..."
              : hiddenCandidates > 0
                ? `${hiddenCandidates} more matches. Keep typing to narrow the result.`
                : "Search is limited to the current scheduling scope."}
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-[11px] font-semibold leading-5 text-[#7a8499]">
        Search stays scoped to the selected organization, cost center, position, and schedule filters.
      </p>
    </section>
  );
}

function InputField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  onChange,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a] outline-none transition focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
      >
        {children}
      </select>
    </label>
  );
}

function WeekdayPicker({
  days,
  mode,
}: {
  days: typeof weekDays;
  mode: AvailabilityApplyMode;
}) {
  return (
    <fieldset className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-3">
      <legend className="px-1 text-[11px] font-black uppercase text-[#63708a]">
        {mode === "ALL_WEEK" ? "Selected week" : "Select weekdays"}
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {days.map((day) => (
          <label
            key={`${mode}-${day.value}`}
            className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-sm font-black transition ${
              mode === "ALL_WEEK"
                ? "border-[#c8efe0] bg-[#effcf7] text-[#0f8f66]"
                : "border-[#dfe8f6] bg-white text-[#11143a] hover:border-[#3820d7]"
            }`}
            title={day.longLabel}
          >
            <span>{day.label}</span>
            <input
              type="checkbox"
              name="weekdays"
              value={day.value}
              defaultChecked={mode === "ALL_WEEK" || (mode === "SELECTED_DAYS" && day.value >= 1 && day.value <= 5)}
              disabled={mode === "ALL_WEEK"}
              className="h-4 w-4 accent-[#3820d7]"
            />
          </label>
        ))}
      </div>
      {mode === "ALL_WEEK" ? (
        <p className="mt-2 text-[11px] font-bold leading-5 text-[#63708a]">
          Every day in the policy week will be created as a separate availability record.
        </p>
      ) : null}
    </fieldset>
  );
}

function CheckboxField({
  name,
  label,
  description,
}: {
  name: string;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-[#dfe8f6] bg-white p-3">
      <input name={name} type="checkbox" className="mt-1 h-4 w-4 accent-[#3820d7]" />
      <span>
        <span className="block text-sm font-black text-[#11143a]">{label}</span>
        {description ? (
          <span className="mt-1 block text-[12px] font-semibold leading-5 text-[#63708a]">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

function TextAreaField({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <textarea
        name={name}
        placeholder={placeholder}
        required={required}
        className="min-h-24 rounded-xl border border-[#cfd8ea] bg-white px-3 py-3 text-sm font-bold normal-case text-[#11143a] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
      />
    </label>
  );
}

function PrimaryButton({ label, loading }: { label: string; loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white shadow-[0_16px_32px_rgba(56,32,215,0.24)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
      {label}
    </button>
  );
}

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateTimeValue(formData: FormData, dateKey: string, timeValue: string) {
  const date = stringValue(formData, dateKey);
  return `${date}T${timeValue || "00:00"}:00.000Z`;
}

function optionalDateTimeValue(formData: FormData, dateKey: string, timeValue: string) {
  const date = stringValue(formData, dateKey);
  return date ? `${date}T${timeValue}:00.000Z` : undefined;
}

function prune<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")) as Partial<T>;
}

function formatEmployee(employee?: ScheduleEmployee | null) {
  if (!employee) return "Unassigned employee";
  const person = employee.person;
  const name = [person?.preferredName || person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return name ? `${name} · ${employee.employeeNumber}` : employee.employeeNumber;
}

function employeeInitials(employee?: ScheduleEmployee | null) {
  if (!employee) return "EE";
  const person = employee.person;
  const first = person?.preferredName || person?.firstName || employee.employeeNumber;
  const last = person?.lastName || "";
  return `${first.charAt(0)}${last.charAt(0) || employee.employeeNumber.charAt(0)}`.toUpperCase();
}

function employeeSearchBlob(employee: ScheduleEmployee) {
  const assignment = employee.assignments?.[0];
  return [
    formatEmployee(employee),
    assignment?.organizationNode?.name,
    assignment?.organizationNode?.code,
    assignment?.costCenter?.name,
    assignment?.costCenter?.code,
    assignment?.position?.title,
    assignment?.position?.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function employeeMatchesSearch(employee: ScheduleEmployee, query: string) {
  const term = query.trim().toLowerCase();
  return !term || employeeSearchBlob(employee).includes(term);
}

function mergeEmployees(primary: ScheduleEmployee[], fallback: ScheduleEmployee[]) {
  const rows = new Map<string, ScheduleEmployee>();

  for (const employee of [...primary, ...fallback]) {
    rows.set(employee.id, employee);
  }

  return [...rows.values()];
}

function employeeAssignmentContext(assignment?: NonNullable<ScheduleEmployee["assignments"]>[number]) {
  if (!assignment) return "No current placement recorded";

  return [
    assignment.position?.title,
    assignment.organizationNode?.name,
    assignment.costCenter?.name,
  ]
    .filter(Boolean)
    .join(" · ") || "Current placement available";
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatWeekdays(values: number[]) {
  if (values.length === 0) return "No days";
  const labels = new Map(weekDays.map((day) => [day.value, day.label]));
  return values
    .slice()
    .sort((left, right) => left - right)
    .map((value) => labels.get(value) ?? String(value))
    .join(", ");
}

function coverageScope(rule: ScheduleCoverageRule) {
  const scope = [
    rule.organizationNode?.name,
    rule.costCenter?.name,
    rule.position?.title,
    rule.locationName,
  ].filter(Boolean);

  return scope.length > 0 ? scope.join(" · ") : "No operational scope";
}

function orderWeekDays(weekStartsOn: SchedulePolicy["weekStartsOn"]) {
  const startDay = weekStartsOn === "SUNDAY" ? 0 : weekStartsOn === "SATURDAY" ? 6 : 1;
  const startIndex = weekDays.findIndex((day) => day.value === startDay);

  return [...weekDays.slice(startIndex), ...weekDays.slice(0, startIndex)];
}

function buildPlanningDays(from: string, to: string, weekStartsOn: SchedulePolicy["weekStartsOn"]) {
  const today = new Date();
  const start = parseDateInput(from) ?? startOfPolicyWeek(today, weekStartsOn);
  const requestedEnd = parseDateInput(to) ?? addDays(start, 6);
  const end = requestedEnd < start ? addDays(start, 6) : requestedEnd;
  const dayCount = Math.min(daysBetween(start, end) + 1, 35);

  return Array.from({ length: dayCount }, (_, index) => addDays(start, index));
}

function planningDaysDateKey(summary: SchedulePlannerSummary | null, fallbackDays: Date[]) {
  return summary?.days[0]?.date.slice(0, 10) ?? dateKeyFromDate(fallbackDays[0] ?? new Date());
}

function normalizePlannerView(value: string): PlannerView {
  const normalized = value.toUpperCase();
  return normalized === "DAY" || normalized === "MONTH" ? normalized : "WEEK";
}

function planningHref(filters: SchedulingCommandCenterProps["planningFilters"], tab: ScheduleTab, view?: PlannerView) {
  const params = new URLSearchParams({ tab });
  const nextView = view ?? normalizePlannerView(filters.view);
  params.set("view", nextView);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  return `/scheduling?${params.toString()}`;
}

function schedulingActionHref(path: string, returnTo: string, filters: SchedulingCommandCenterProps["planningFilters"]) {
  const params = new URLSearchParams({ returnTo });
  params.set("view", normalizePlannerView(filters.view));
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  return `${path}?${params.toString()}`;
}

function clearPlanningHref(tab: ScheduleTab, filters: SchedulingCommandCenterProps["planningFilters"]) {
  const params = new URLSearchParams({ tab });
  params.set("view", normalizePlannerView(filters.view));
  return `/scheduling?${params.toString()}`;
}

function planningFilterChips(
  filters: SchedulingCommandCenterProps["planningFilters"],
  employees: ScheduleEmployee[],
  organizationNodes: OrganizationNode[],
  costCenters: CostCenter[],
  positions: Position[],
  statusOptions: ReadonlyArray<readonly [string, string]>,
) {
  const chips: Array<{ label: string; value: string }> = [];
  const employee = employees.find((item) => item.id === filters.employeeId);
  const node = organizationNodes.find((item) => item.id === filters.organizationNodeId);
  const costCenter = costCenters.find((item) => item.id === filters.costCenterId);
  const position = positions.find((item) => item.id === filters.positionId);
  const statusLabel = statusOptions.find(([value]) => value === filters.status)?.[1];

  if (employee) chips.push({ label: "Employee", value: formatEmployee(employee) });
  if (filters.employeeSearch) chips.push({ label: "Search", value: filters.employeeSearch });
  if (filters.from) chips.push({ label: "From", value: filters.from });
  if (filters.to) chips.push({ label: "To", value: filters.to });
  if (filters.status && statusLabel) chips.push({ label: "Status", value: statusLabel });
  if (node) chips.push({ label: "Org", value: node.name });
  if (costCenter) chips.push({ label: "Cost", value: costCenter.name });
  if (position) chips.push({ label: "Position", value: position.title });
  if (filters.locationName) chips.push({ label: "Location", value: filters.locationName });

  return chips;
}

function pickupRequestsHref(filters: SchedulingCommandCenterProps["planningFilters"]) {
  const params = new URLSearchParams({ status: "REQUESTED" });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  return `/scheduling/pickup-requests?${params.toString()}`;
}

function parseDateInput(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function startOfPolicyWeek(value: Date, weekStartsOn: SchedulePolicy["weekStartsOn"]) {
  const startDay = weekStartsOn === "SUNDAY" ? 0 : weekStartsOn === "SATURDAY" ? 6 : 1;
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const offset = (date.getDay() - startDay + 7) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  date.setDate(date.getDate() + days);
  return date;
}

function daysBetween(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.round((endUtc - startUtc) / 86_400_000));
}

function dateKeyFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyPlannerDay(dateKey: string) {
  return {
    date: `${dateKey}T00:00:00.000Z`,
    assignmentCount: 0,
    openShiftCount: 0,
    openShiftSlots: 0,
    claimedOpenShiftSlots: 0,
    coverageRuleCount: 0,
    coverageRequiredHeadcount: 0,
    coverageMinimumHeadcount: 0,
    coverageGap: 0,
    availabilityCount: 0,
    availableCount: 0,
    preferredCount: 0,
    unavailableCount: 0,
  };
}

function isTodayKey(value: string) {
  return value === dateKeyFromDate(new Date());
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}-${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
