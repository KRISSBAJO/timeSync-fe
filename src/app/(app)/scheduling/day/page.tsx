import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Clock3,
  ClipboardList,
  LayoutGrid,
  MapPin,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import {
  AssignmentOperations,
  OpenShiftOperations,
} from "@/components/scheduling/day-schedule-actions";
import type {
  PaginatedCostCenters,
  PaginatedOrganizationNodes,
  CostCenter,
  OrganizationNode,
} from "@/lib/organization/types";
import type { PaginatedPositions, Position } from "@/lib/positions/types";
import type {
  EmployeeAvailability,
  MyScheduleWorkspace,
  OpenShift,
  PaginatedSchedule,
  ScheduleAssignment,
  ScheduleEmployee,
  SchedulePlannerSummary,
} from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type DayPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DaySection = "overview" | "assignments" | "open-shifts" | "availability";

type DayFilters = {
  date: string;
  section: DaySection;
  employeeId: string;
  employeeSearch: string;
  organizationNodeId: string;
  costCenterId: string;
  positionId: string;
  locationName: string;
  assignmentStatus: string;
  openShiftStatus: string;
  availabilityStatus: string;
};

const DETAIL_LIMIT = 25;
const DAY_SECTIONS: Array<{
  id: DaySection;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: "overview", label: "Overview", description: "Coverage, gaps, and decisions", icon: LayoutGrid },
  { id: "assignments", label: "Assignments", description: "Who is working and where", icon: CalendarClock },
  { id: "open-shifts", label: "Open shifts", description: "Unfilled work and pickup", icon: UsersRound },
  { id: "availability", label: "Availability", description: "Available and unavailable windows", icon: Clock3 },
];

const ASSIGNMENT_STATUSES = ["DRAFT", "ASSIGNED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const;
const OPEN_SHIFT_STATUSES = ["OPEN", "CLAIMED", "CANCELLED", "EXPIRED"] as const;
const AVAILABILITY_STATUSES = ["AVAILABLE", "PREFERRED", "UNAVAILABLE"] as const;

export default async function SchedulingDayPage({ searchParams }: DayPageProps) {
  const params = await searchParams;
  const session = await requireServerSession("/scheduling/day");
  const user = session.user;
  const canTenantSchedule = hasAnyPermission(user, ["scheduling.write"]);
  const canTeamSchedule = hasAnyPermission(user, ["scheduling.team.write"]);
  const canUseOperationalFilters = canTenantSchedule || canTeamSchedule;
  const filters = normalizeFilters(params);
  const assignmentCursor = readParam(params.assignmentCursor);
  const openCursor = readParam(params.openCursor);
  const availabilityCursor = readParam(params.availabilityCursor);
  const dayRange = {
    from: startOfDayIso(filters.date),
    to: endOfDayIso(filters.date),
  };
  const titleDate = new Date(`${filters.date}T00:00:00.000`);

  const plannerQuery = buildSchedulingQuery(dayRange, filters, "planner");
  const assignmentQuery = buildSchedulingQuery(dayRange, filters, "assignments", assignmentCursor);
  const openQuery = buildSchedulingQuery(dayRange, filters, "open-shifts", openCursor);
  const availabilityQuery = buildSchedulingQuery(dayRange, filters, "availability", availabilityCursor);
  const myQuery = new URLSearchParams({ from: dayRange.from, to: dayRange.to, limit: String(DETAIL_LIMIT) });

  if (filters.section === "assignments" && assignmentCursor) myQuery.set("cursor", assignmentCursor);
  if (filters.section === "availability" && availabilityCursor) myQuery.set("cursor", availabilityCursor);

  const shouldFetchAssignments = filters.section === "assignments";
  const shouldFetchOpenShifts = filters.section === "open-shifts";
  const shouldFetchAvailability = filters.section === "availability";
  const shouldFetchMySchedule = !canTenantSchedule && !canTeamSchedule && (shouldFetchAssignments || shouldFetchAvailability);

  const [
    planner,
    tenantAssignments,
    teamAssignments,
    mySchedule,
    openShifts,
    tenantAvailability,
    employeeOptions,
    organizationOptions,
    costCenterOptions,
    positionOptions,
  ] = await Promise.all([
    tryServerApiJson<SchedulePlannerSummary>(`/scheduling/planner?${plannerQuery}`),
    canTenantSchedule && shouldFetchAssignments
      ? tryServerApiJson<PaginatedSchedule<ScheduleAssignment>>(`/scheduling/assignments?${assignmentQuery}`)
      : Promise.resolve(null),
    canTeamSchedule && shouldFetchAssignments
      ? tryServerApiJson<PaginatedSchedule<ScheduleAssignment>>(`/scheduling/manager/assignments?${assignmentQuery}`)
      : Promise.resolve(null),
    shouldFetchMySchedule
      ? tryServerApiJson<MyScheduleWorkspace>(`/scheduling/my?${myQuery}`)
      : Promise.resolve(null),
    shouldFetchOpenShifts
      ? tryServerApiJson<PaginatedSchedule<OpenShift>>(`/scheduling/open-shifts?${openQuery}`)
      : Promise.resolve(null),
    (canTenantSchedule || canTeamSchedule) && shouldFetchAvailability
      ? tryServerApiJson<PaginatedSchedule<EmployeeAvailability>>(`/scheduling/availability?${availabilityQuery}`)
      : Promise.resolve(null),
    canTenantSchedule
      ? tryServerApiJson<ScheduleEmployee[]>("/scheduling/employees")
      : canTeamSchedule
        ? tryServerApiJson<ScheduleEmployee[]>("/scheduling/manager/employees")
        : Promise.resolve(null),
    canUseOperationalFilters
      ? tryServerApiJson<PaginatedOrganizationNodes>("/organization/nodes?limit=100")
      : Promise.resolve(null),
    canUseOperationalFilters
      ? tryServerApiJson<PaginatedCostCenters>("/organization/cost-centers?limit=100")
      : Promise.resolve(null),
    canUseOperationalFilters
      ? tryServerApiJson<PaginatedPositions>("/positions?limit=100")
      : Promise.resolve(null),
  ]);

  const assignments = canTenantSchedule ? tenantAssignments : canTeamSchedule ? teamAssignments : mySchedule?.assignments;
  const availability = canTenantSchedule || canTeamSchedule ? tenantAvailability : mySchedule?.availability;
  const day = planner?.days[0];
  const openSlots = Math.max(0, (day?.openShiftSlots ?? 0) - (day?.claimedOpenShiftSlots ?? 0));
  const availableSignals = (day?.availableCount ?? 0) + (day?.preferredCount ?? 0);

  return (
    <main className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/scheduling?tab=board" className="inline-flex items-center gap-2 text-sm font-black text-[#3820d7]">
              <ArrowLeft size={16} />
              Scheduling
            </Link>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Day operations</p>
            <h1 className="mt-2 text-[clamp(1.8rem,3vw,3rem)] font-black leading-tight text-[#11143a]">
              {titleDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#63708a]">
              Review coverage, open work, availability, and exceptions for one operating day. Use filters to narrow by team,
              location, cost center, position, or employee.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={dayHref(filters, "assignments")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cfd8ea] bg-white px-4 text-sm font-black text-[#11143a]"
            >
              Assignment queue
              <ArrowRight size={15} />
            </Link>
            <Link
              href={dayHref(filters, "availability")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(56,32,215,0.18)]"
            >
              Availability
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DayMetric label="Working assignments" value={day?.assignmentCount ?? 0} icon={CalendarClock} tone="blue" />
          <DayMetric label="Open slots" value={openSlots} icon={UsersRound} tone="purple" />
          <DayMetric label="Available or preferred" value={availableSignals} icon={Clock3} tone="green" />
          <DayMetric label="Unavailable" value={day?.unavailableCount ?? 0} icon={Clock3} tone="amber" />
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_14px_36px_rgba(18,31,67,0.05)]">
        <form action="/scheduling/day" method="GET" className="grid gap-3">
          <input type="hidden" name="section" value={filters.section} />
          <div className="grid gap-3 lg:grid-cols-[150px_1fr_1fr] xl:grid-cols-[150px_1fr_1fr_1fr_1fr_auto]">
            <Input name="date" label="Date" type="date" defaultValue={filters.date} />
            <Select name="employeeId" label="Employee" defaultValue={filters.employeeId}>
              <option value="">All visible employees</option>
              {(employeeOptions ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {formatEmployee(employee)}
                </option>
              ))}
            </Select>
            <Input name="employeeSearch" label="Employee search" type="search" defaultValue={filters.employeeSearch} />
            <Select name="organizationNodeId" label="Department / unit" defaultValue={filters.organizationNodeId}>
              <option value="">All org units</option>
              {(organizationOptions?.data ?? []).map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({humanize(node.type)})
                </option>
              ))}
            </Select>
            <Select name="costCenterId" label="Cost center" defaultValue={filters.costCenterId}>
              <option value="">All cost centers</option>
              {(costCenterOptions?.data ?? []).map((costCenter) => (
                <option key={costCenter.id} value={costCenter.id}>
                  {costCenter.name} ({costCenter.code})
                </option>
              ))}
            </Select>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white xl:mt-[22px]">
              Apply
            </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
            <Select name="positionId" label="Position" defaultValue={filters.positionId}>
              <option value="">All positions</option>
              {(positionOptions?.data ?? []).map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title} ({position.code})
                </option>
              ))}
            </Select>
            <Input name="locationName" label="Location search" type="search" defaultValue={filters.locationName} />
            <Select name="assignmentStatus" label="Assignment status" defaultValue={filters.assignmentStatus}>
              <option value="">All assignments</option>
              {ASSIGNMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </Select>
            <Select name="openShiftStatus" label="Open shift status" defaultValue={filters.openShiftStatus}>
              <option value="">All open shift states</option>
              {OPEN_SHIFT_STATUSES.map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </Select>
            <Select name="availabilityStatus" label="Availability status" defaultValue={filters.availabilityStatus}>
              <option value="">All availability</option>
              {AVAILABILITY_STATUSES.map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </Select>
          </div>
        </form>

        <div className="mt-4 grid gap-2 lg:grid-cols-4" role="tablist" aria-label="Day schedule queues">
          {DAY_SECTIONS.map((section) => (
            <DayTab
              key={section.id}
              section={section}
              href={dayHref(filters, section.id)}
              active={filters.section === section.id}
              count={sectionCount(section.id, day)}
            />
          ))}
        </div>
      </section>

      {filters.section === "overview" ? (
        <OverviewSection
          filters={filters}
          assignmentCount={day?.assignmentCount ?? 0}
          openSlots={openSlots}
          availabilityCount={day?.availabilityCount ?? 0}
          unavailableCount={day?.unavailableCount ?? 0}
        />
      ) : null}

      {filters.section === "assignments" ? (
        <AssignmentsQueue
          assignments={assignments}
          filters={filters}
          cursor={assignments?.page.nextCursor}
          canManage={canTenantSchedule || canTeamSchedule}
          employees={employeeOptions ?? []}
          organizationNodes={organizationOptions?.data ?? []}
          costCenters={costCenterOptions?.data ?? []}
          positions={positionOptions?.data ?? []}
        />
      ) : null}

      {filters.section === "open-shifts" ? (
        <OpenShiftQueue
          openShifts={openShifts}
          filters={filters}
          cursor={openShifts?.page.nextCursor}
          canManage={canTenantSchedule || canTeamSchedule}
          employees={employeeOptions ?? []}
          organizationNodes={organizationOptions?.data ?? []}
          costCenters={costCenterOptions?.data ?? []}
          positions={positionOptions?.data ?? []}
        />
      ) : null}

      {filters.section === "availability" ? (
        <AvailabilityQueue availability={availability} filters={filters} cursor={availability?.page.nextCursor} />
      ) : null}
    </main>
  );
}

function OverviewSection({
  filters,
  assignmentCount,
  openSlots,
  availabilityCount,
  unavailableCount,
}: {
  filters: DayFilters;
  assignmentCount: number;
  openSlots: number;
  availabilityCount: number;
  unavailableCount: number;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-4">
      <OverviewCard
        title="Working assignments"
        eyebrow="Coverage"
        value={assignmentCount}
        description="Review confirmed, assigned, and exception-prone work for the selected operating slice."
        href={dayHref(filters, "assignments")}
        icon={CalendarClock}
        tone="blue"
      />
      <OverviewCard
        title="Open shift board"
        eyebrow="Unfilled work"
        value={openSlots}
        description="Inspect unfilled slots, claimed capacity, and pickup demand before the day becomes fragile."
        href={dayHref(filters, "open-shifts")}
        icon={UsersRound}
        tone="purple"
      />
      <OverviewCard
        title="Availability signals"
        eyebrow="Work preferences"
        value={availabilityCount}
        description="See who is available, preferred, or unavailable for this operating day and filtered scope."
        href={dayHref(filters, "availability")}
        icon={Clock3}
        tone="green"
      />
      <OverviewCard
        title="Coverage risks"
        eyebrow="Exceptions"
        value={unavailableCount}
        description="Focus on unavailable windows and conflicts before publishing or approving extra work."
        href={dayHref({ ...filters, availabilityStatus: "UNAVAILABLE" }, "availability")}
        icon={ClipboardList}
        tone="amber"
      />
    </section>
  );
}

function AssignmentsQueue({
  assignments,
  filters,
  cursor,
  canManage,
  employees,
  organizationNodes,
  costCenters,
  positions,
}: {
  assignments?: PaginatedSchedule<ScheduleAssignment> | null;
  filters: DayFilters;
  cursor?: string | null;
  canManage: boolean;
  employees: ScheduleEmployee[];
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  positions: Position[];
}) {
  const rows = assignments?.data ?? [];

  return (
    <DayPanel
      title="Working assignments"
      subtitle="Paged work queue for the selected day and operational filters."
      count={rows.length}
      action={<Pager cursor={cursor} param="assignmentCursor" filters={filters} />}
    >
      <div className="overflow-x-auto">
        <table className="min-w-[980px] text-left text-sm">
          <thead className="text-[11px] font-black uppercase text-[#63708a]">
            <tr>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Work</th>
              <th className="px-3 py-3">Time</th>
              <th className="px-3 py-3">Org unit</th>
              <th className="px-3 py-3">Cost center</th>
              <th className="px-3 py-3">Position</th>
              <th className="px-3 py-3">Status</th>
              {canManage ? <th className="px-3 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1f7]">
            {rows.map((assignment) => (
              <tr key={assignment.id}>
                <td className="px-3 py-3 font-black text-[#11143a]">
                  <Link href={`/scheduling/assignments/${assignment.id}`} className="transition hover:text-[#3820d7]">
                    {formatEmployee(assignment.employee)}
                  </Link>
                </td>
                <td className="px-3 py-3 font-bold text-[#11143a]">
                  <Link href={`/scheduling/assignments/${assignment.id}`} className="transition hover:text-[#3820d7]">
                    {assignment.shift?.name ?? assignment.position?.title ?? "Assignment"}
                  </Link>
                </td>
                <td className="px-3 py-3 font-semibold text-[#63708a]">{formatTimeRange(assignment.startsAt, assignment.endsAt)}</td>
                <td className="px-3 py-3 font-semibold text-[#63708a]">{assignment.organizationNode?.name ?? assignment.locationName ?? "Unassigned"}</td>
                <td className="px-3 py-3 font-semibold text-[#63708a]">{assignment.costCenter?.name ?? "Unassigned"}</td>
                <td className="px-3 py-3 font-semibold text-[#63708a]">{assignment.position?.title ?? "Unassigned"}</td>
                <td className="px-3 py-3"><Status label={assignment.status} /></td>
                {canManage ? (
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/scheduling/assignments/${assignment.id}`}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#cfd8ea] bg-white px-3 text-xs font-black text-[#11143a] transition hover:border-[#4a2df3]"
                      >
                        Open
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    <AssignmentOperations
                      assignment={assignment}
                      canManage={canManage}
                      employees={employees}
                      organizationNodes={organizationNodes}
                      costCenters={costCenters}
                      positions={positions}
                    />
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DayPanel>
  );
}

function OpenShiftQueue({
  openShifts,
  filters,
  cursor,
  canManage,
  employees,
  organizationNodes,
  costCenters,
  positions,
}: {
  openShifts?: PaginatedSchedule<OpenShift> | null;
  filters: DayFilters;
  cursor?: string | null;
  canManage: boolean;
  employees: ScheduleEmployee[];
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  positions: Position[];
}) {
  const rows = openShifts?.data ?? [];

  return (
    <DayPanel
      title="Open shifts"
      subtitle="Paged pickup queue for unfilled work, claimed capacity, and approval readiness."
      count={rows.length}
      action={<Pager cursor={cursor} param="openCursor" filters={filters} />}
    >
      <div className="grid gap-3 xl:grid-cols-2">
        {rows.map((shift) => (
          <article key={shift.id} className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/scheduling/open-shifts/${shift.id}`} className="font-black text-[#11143a] transition hover:text-[#3820d7]">
                  {shift.shift?.name ?? shift.position?.title ?? "Open shift"}
                </Link>
                <p className="mt-1 text-sm font-semibold text-[#63708a]">{formatTimeRange(shift.startsAt, shift.endsAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Status label={`${shift.claimedHeadcount}/${shift.requiredHeadcount} claimed`} />
                {!hasOpenShiftTarget(shift) ? <Status label="Needs targeting" tone="amber" /> : null}
                <Link
                  href={`/scheduling/open-shifts/${shift.id}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#cfd8ea] bg-white px-3 text-xs font-black text-[#11143a] transition hover:border-[#4a2df3]"
                >
                  Open
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <OpenShiftOperations
                  openShift={shift}
                  canManage={canManage}
                  employees={employees}
                  organizationNodes={organizationNodes}
                  costCenters={costCenters}
                  positions={positions}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-xs font-bold text-[#63708a] sm:grid-cols-2">
              <QueueFact icon={Building2} label="Org unit" value={shift.organizationNode?.name ?? "Not targeted"} />
              <QueueFact icon={BriefcaseBusiness} label="Position" value={shift.position?.title ?? "Not targeted"} />
              <QueueFact icon={ClipboardList} label="Cost center" value={shift.costCenter?.name ?? "Not targeted"} />
              <QueueFact icon={MapPin} label="Location" value={shift.locationName ?? shift.organizationNode?.name ?? "Location pending"} />
            </div>
          </article>
        ))}
      </div>
    </DayPanel>
  );
}

function AvailabilityQueue({
  availability,
  filters,
  cursor,
}: {
  availability?: PaginatedSchedule<EmployeeAvailability> | null;
  filters: DayFilters;
  cursor?: string | null;
}) {
  const rows = availability?.data ?? [];

  return (
    <DayPanel
      title="Availability and unavailable windows"
      subtitle="Paged availability queue for employee preferences, absence windows, and coverage planning."
      count={rows.length}
      action={<Pager cursor={cursor} param="availabilityCursor" filters={filters} />}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((item) => (
          <article key={item.id} className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-[#11143a]">{formatEmployee(item.employee)}</p>
                <p className="mt-1 text-sm font-semibold text-[#63708a]">
                  {item.startsAt && item.endsAt ? formatTimeRange(item.startsAt, item.endsAt) : "All day"}
                </p>
                {item.reason ? <p className="mt-2 text-sm font-semibold text-[#63708a]">{item.reason}</p> : null}
              </div>
              <Status label={item.status} />
            </div>
          </article>
        ))}
      </div>
    </DayPanel>
  );
}

function DayTab({
  section,
  href,
  active,
  count,
}: {
  section: (typeof DAY_SECTIONS)[number];
  href: string;
  active: boolean;
  count: number;
}) {
  const Icon = section.icon;

  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={`flex min-h-[86px] items-center justify-between gap-3 rounded-xl border p-4 transition ${
        active
          ? "border-[#4a2df3] bg-[#f2efff] text-[#11143a]"
          : "border-[#e3e9f4] bg-white text-[#11143a] hover:border-[#c8d4ea]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-[#4a2df3] text-white" : "bg-[#f2f6fc] text-[#63708a]"}`}>
          <Icon size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black">{section.label}</span>
          <span className="mt-1 block truncate text-xs font-bold text-[#63708a]">{section.description}</span>
        </span>
      </span>
      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#3820d7] shadow-sm">{count}</span>
    </Link>
  );
}

function OverviewCard({
  eyebrow,
  title,
  value,
  description,
  href,
  icon: Icon,
  tone,
}: {
  eyebrow: string;
  title: string;
  value: number;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "purple";
}) {
  const tones = {
    blue: "bg-[#eef5ff] text-[#3865ff]",
    green: "bg-[#eafaf1] text-[#07845b]",
    amber: "bg-[#fff4dc] text-[#9a5a00]",
    purple: "bg-[#f1ebff] text-[#6d3ff6]",
  };

  return (
    <Link href={href} className="group rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)] transition hover:-translate-y-0.5 hover:border-[#c8d4ea]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">{eyebrow}</p>
          <p className="mt-3 text-4xl font-black text-[#11143a]">{value}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <h2 className="mt-5 text-lg font-black text-[#11143a]">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#63708a]">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#3820d7]">
        Open queue
        <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function DayPanel({
  title,
  subtitle,
  count,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Focused queue</p>
          <h2 className="mt-1 text-xl font-black text-[#11143a]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#63708a]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-black text-[#3865ff]">{count}</span>
          {action}
        </div>
      </div>
      {count > 0 ? children : <p className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-5 text-sm font-bold text-[#63708a]">No records match this day and filter set.</p>}
    </section>
  );
}

function QueueFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
      <Icon size={14} className="text-[#63708a]" />
      <span className="min-w-0">
        <span className="block text-[10px] uppercase text-[#7a8499]">{label}</span>
        <span className="block truncate text-[#11143a]">{value}</span>
      </span>
    </div>
  );
}

function DayMetric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "blue" | "green" | "amber" | "purple" }) {
  const tones = {
    blue: "bg-[#eef5ff] text-[#3865ff]",
    green: "bg-[#eafaf1] text-[#07845b]",
    amber: "bg-[#fff4dc] text-[#9a5a00]",
    purple: "bg-[#f1ebff] text-[#6d3ff6]",
  };

  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase text-[#63708a]">{label}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function Pager({ cursor, param, filters }: { cursor?: string | null; param: string; filters: DayFilters }) {
  if (!cursor) return null;
  return (
    <Link href={dayHref(filters, filters.section, { [param]: cursor })} className="inline-flex items-center gap-2 rounded-xl border border-[#cfd8ea] bg-white px-4 py-2 text-xs font-black text-[#11143a]">
      Next page
      <ArrowRight size={14} />
    </Link>
  );
}

function Input({ label, name, type, defaultValue }: { label: string; name: string; type: string; defaultValue: string }) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a]" />
    </label>
  );
}

function Select({ label, name, defaultValue, children }: { label: string; name: string; defaultValue: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <select name={name} defaultValue={defaultValue} className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a]">
        {children}
      </select>
    </label>
  );
}

function Status({ label, tone = "purple" }: { label: string; tone?: "purple" | "amber" }) {
  const tones = {
    purple: "bg-[#f1ebff] text-[#6d3ff6]",
    amber: "bg-[#fff4dc] text-[#9a5a00]",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase ${tones[tone]}`}>
      {label.replaceAll("_", " ")}
    </span>
  );
}

function sectionCount(section: DaySection, day: SchedulePlannerSummary["days"][number] | undefined) {
  if (!day) return 0;
  if (section === "assignments") return day.assignmentCount;
  if (section === "open-shifts") return Math.max(0, day.openShiftSlots - day.claimedOpenShiftSlots);
  if (section === "availability") return day.availabilityCount;
  return day.assignmentCount + day.openShiftCount + day.availabilityCount;
}

function normalizeFilters(params: Record<string, string | string[] | undefined>): DayFilters {
  const section = normalizeSection(readParam(params.section));
  const assignmentStatus = readParam(params.assignmentStatus);
  const openShiftStatus = readParam(params.openShiftStatus);
  const availabilityStatus = readParam(params.availabilityStatus);

  return {
    date: readParam(params.date) || new Date().toISOString().slice(0, 10),
    section,
    employeeId: readParam(params.employeeId),
    employeeSearch: readParam(params.employeeSearch),
    organizationNodeId: readParam(params.organizationNodeId),
    costCenterId: readParam(params.costCenterId),
    positionId: readParam(params.positionId),
    locationName: readParam(params.locationName),
    assignmentStatus: ASSIGNMENT_STATUSES.includes(assignmentStatus as (typeof ASSIGNMENT_STATUSES)[number]) ? assignmentStatus : "",
    openShiftStatus: OPEN_SHIFT_STATUSES.includes(openShiftStatus as (typeof OPEN_SHIFT_STATUSES)[number]) ? openShiftStatus : "",
    availabilityStatus: AVAILABILITY_STATUSES.includes(availabilityStatus as (typeof AVAILABILITY_STATUSES)[number]) ? availabilityStatus : "",
  };
}

function normalizeSection(value: string): DaySection {
  return DAY_SECTIONS.some((section) => section.id === value) ? (value as DaySection) : "overview";
}

function buildSchedulingQuery(
  range: { from: string; to: string },
  filters: DayFilters,
  target: "planner" | "assignments" | "open-shifts" | "availability",
  cursor?: string,
) {
  const params = new URLSearchParams({ from: range.from, to: range.to });
  if (target !== "planner") params.set("limit", String(DETAIL_LIMIT));
  if (cursor) params.set("cursor", cursor);
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  if ((target === "planner" || target === "assignments") && filters.assignmentStatus) {
    params.set(target === "planner" ? "assignmentStatus" : "status", filters.assignmentStatus);
  }
  if (target === "open-shifts" && filters.openShiftStatus) params.set("status", filters.openShiftStatus);
  if ((target === "planner" || target === "availability") && filters.availabilityStatus) {
    params.set(target === "planner" ? "availabilityStatus" : "status", filters.availabilityStatus);
  }
  return params;
}

function dayHref(filters: DayFilters, section: DaySection, extras: Record<string, string> = {}) {
  const params = new URLSearchParams({ date: filters.date, section });
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  if (filters.assignmentStatus) params.set("assignmentStatus", filters.assignmentStatus);
  if (filters.openShiftStatus) params.set("openShiftStatus", filters.openShiftStatus);
  if (filters.availabilityStatus) params.set("availabilityStatus", filters.availabilityStatus);
  for (const [key, value] of Object.entries(extras)) {
    if (value) params.set(key, value);
  }
  return `/scheduling/day?${params.toString()}`;
}

function formatEmployee(employee?: ScheduleEmployee | null) {
  if (!employee) return "Unassigned employee";
  const person = employee.person;
  const name = [person?.preferredName || person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return name ? `${name} · ${employee.employeeNumber}` : employee.employeeNumber;
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}-${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function hasOpenShiftTarget(shift: OpenShift) {
  return Boolean(shift.organizationNodeId || shift.organizationNode || shift.costCenterId || shift.costCenter || shift.positionId || shift.position);
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function startOfDayIso(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function endOfDayIso(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}
