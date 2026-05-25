import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Clock3,
  MapPin,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AssignmentOperations } from "@/components/scheduling/day-schedule-actions";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type {
  PaginatedCostCenters,
  PaginatedOrganizationNodes,
} from "@/lib/organization/types";
import type { PaginatedPositions } from "@/lib/positions/types";
import type { ScheduleAssignment, ScheduleEmployee } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type AssignmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssignmentDetailPage({ params }: AssignmentDetailPageProps) {
  const { id } = await params;
  const session = await requireServerSession(`/scheduling/assignments/${id}`);
  const user = session.user;
  const canTenantSchedule = hasAnyPermission(user, ["scheduling.write"]);
  const canTeamSchedule = hasAnyPermission(user, ["scheduling.team.write"]);
  const canManage = canTenantSchedule || canTeamSchedule;

  const [
    assignment,
    employeeOptions,
    organizationOptions,
    costCenterOptions,
    positionOptions,
  ] = await Promise.all([
    tryServerApiJson<ScheduleAssignment>(`/scheduling/assignments/${id}`),
    canTenantSchedule
      ? tryServerApiJson<ScheduleEmployee[]>("/scheduling/employees")
      : canTeamSchedule
        ? tryServerApiJson<ScheduleEmployee[]>("/scheduling/manager/employees")
        : Promise.resolve(null),
    canManage ? tryServerApiJson<PaginatedOrganizationNodes>("/organization/nodes?limit=100") : Promise.resolve(null),
    canManage ? tryServerApiJson<PaginatedCostCenters>("/organization/cost-centers?limit=100") : Promise.resolve(null),
    canManage ? tryServerApiJson<PaginatedPositions>("/positions?limit=100") : Promise.resolve(null),
  ]);

  if (!assignment) {
    notFound();
  }

  const dayHref = `/scheduling/day?date=${toDateInput(assignment.workDate)}&section=assignments`;
  const assignmentTitle = assignment.shift?.name ?? assignment.position?.title ?? "Schedule assignment";

  return (
    <main className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={dayHref} className="inline-flex items-center gap-2 text-sm font-black text-[#3820d7]">
              <ArrowLeft size={16} />
              Day planner
            </Link>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Assignment workspace</p>
            <h1 className="mt-2 text-[clamp(1.8rem,3vw,2.8rem)] font-black leading-tight text-[#11143a]">
              {assignmentTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#63708a]">
              {formatEmployee(assignment.employee)} is scheduled for {formatDate(assignment.workDate)} from{" "}
              {formatTimeRange(assignment.startsAt, assignment.endsAt)}.
            </p>
          </div>
          {canManage ? (
            <AssignmentOperations
              assignment={assignment}
              canManage={canManage}
              employees={employeeOptions ?? []}
              organizationNodes={organizationOptions?.data ?? []}
              costCenters={costCenterOptions?.data ?? []}
              positions={positionOptions?.data ?? []}
            />
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FactCard icon={UserRound} label="Employee" value={formatEmployee(assignment.employee)} />
          <FactCard icon={Clock3} label="Time" value={formatTimeRange(assignment.startsAt, assignment.endsAt)} />
          <FactCard icon={ShieldCheck} label="Status" value={humanize(assignment.status)} />
          <FactCard icon={RotateCcw} label="Source" value={humanize(assignment.source)} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Coverage context</p>
          <h2 className="mt-2 text-2xl font-black text-[#11143a]">Where this work belongs</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <DetailFact icon={Building2} label="Org unit" value={assignment.organizationNode?.name ?? "Not assigned"} />
            <DetailFact icon={BriefcaseBusiness} label="Position" value={assignment.position?.title ?? "Not assigned"} />
            <DetailFact icon={BriefcaseBusiness} label="Cost center" value={assignment.costCenter?.name ?? "Not assigned"} />
            <DetailFact icon={MapPin} label="Location" value={assignment.locationName ?? assignment.organizationNode?.name ?? "Location pending"} />
          </div>
        </article>

        <article className="rounded-xl bg-[#11143a] p-5 text-white shadow-[0_20px_50px_rgba(17,20,58,0.16)]">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/55">Assignment health</p>
          <h2 className="mt-2 text-2xl font-black">Schedule facts</h2>
          <div className="mt-5 grid gap-3">
            <DarkFact label="Break" value={`${assignment.breakMinutes} minutes`} />
            <DarkFact label="Overtime" value={assignment.isOvertime ? `${assignment.overtimeMinutes} minutes` : "No overtime"} />
            <DarkFact label="Policy" value={assignment.policy?.name ?? "Default policy"} />
          </div>
        </article>
      </section>

      {assignment.notes ? (
        <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Notes</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#4c5874]">{assignment.notes}</p>
        </section>
      ) : null}
    </main>
  );
}

function FactCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-[#3865ff]">
          <Icon size={17} />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-black uppercase text-[#63708a]">{label}</span>
          <span className="mt-1 block truncate text-sm font-black text-[#11143a]">{value}</span>
        </span>
      </div>
    </div>
  );
}

function DetailFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <Icon size={18} className="text-[#3820d7]" />
      <p className="mt-4 text-[11px] font-black uppercase text-[#63708a]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function DarkFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/50">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function formatEmployee(employee?: ScheduleEmployee | null) {
  if (!employee) return "Unassigned employee";
  const person = employee.person;
  const name = [person?.preferredName || person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return name ? `${name} · ${employee.employeeNumber}` : employee.employeeNumber;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}-${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
