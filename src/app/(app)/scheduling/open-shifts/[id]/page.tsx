import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Clock3,
  MapPin,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { OpenShiftOperations } from "@/components/scheduling/day-schedule-actions";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type {
  PaginatedCostCenters,
  PaginatedOrganizationNodes,
} from "@/lib/organization/types";
import type { PaginatedPositions } from "@/lib/positions/types";
import type {
  OpenShift,
  OpenShiftClaim,
  PaginatedSchedule,
  ScheduleEmployee,
} from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type OpenShiftDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OpenShiftDetailPage({ params, searchParams }: OpenShiftDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const employeeSearch = readParam(query.employeeSearch);
  const session = await requireServerSession(`/scheduling/open-shifts/${id}`);
  const user = session.user;
  const canTenantSchedule = hasAnyPermission(user, ["scheduling.write"]);
  const canTeamSchedule = hasAnyPermission(user, ["scheduling.team.write"]);
  const canManage = canTenantSchedule || canTeamSchedule;

  const [
    openShift,
    eligibleEmployees,
    organizationOptions,
    costCenterOptions,
    positionOptions,
  ] = await Promise.all([
    tryServerApiJson<OpenShift>(`/scheduling/open-shifts/${id}`),
    canManage
      ? tryServerApiJson<PaginatedSchedule<ScheduleEmployee>>(
          `/scheduling/open-shifts/${id}/eligible-employees?${eligibleQuery(employeeSearch)}`,
        )
      : Promise.resolve(null),
    canManage ? tryServerApiJson<PaginatedOrganizationNodes>("/organization/nodes?limit=100") : Promise.resolve(null),
    canManage ? tryServerApiJson<PaginatedCostCenters>("/organization/cost-centers?limit=100") : Promise.resolve(null),
    canManage ? tryServerApiJson<PaginatedPositions>("/positions?limit=100") : Promise.resolve(null),
  ]);

  if (!openShift) {
    notFound();
  }

  const dayHref = `/scheduling/day?date=${toDateInput(openShift.workDate)}&section=open-shifts`;
  const openShiftTitle = openShift.shift?.name ?? openShift.position?.title ?? "Open shift";
  const unfilledSlots = Math.max(0, openShift.requiredHeadcount - openShift.claimedHeadcount);

  return (
    <main className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={dayHref} className="inline-flex items-center gap-2 text-sm font-black text-[#3820d7]">
              <ArrowLeft size={16} />
              Day planner
            </Link>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Open shift workspace</p>
            <h1 className="mt-2 text-[clamp(1.8rem,3vw,2.8rem)] font-black leading-tight text-[#11143a]">
              {openShiftTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#63708a]">
              {formatDate(openShift.workDate)} from {formatTimeRange(openShift.startsAt, openShift.endsAt)} with{" "}
              {unfilledSlots} slot{unfilledSlots === 1 ? "" : "s"} still open.
            </p>
          </div>
          {canManage ? (
            <OpenShiftOperations
              openShift={openShift}
              canManage={canManage}
              employees={eligibleEmployees?.data ?? []}
              organizationNodes={organizationOptions?.data ?? []}
              costCenters={costCenterOptions?.data ?? []}
              positions={positionOptions?.data ?? []}
            />
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FactCard icon={UsersRound} label="Claimed" value={`${openShift.claimedHeadcount}/${openShift.requiredHeadcount}`} />
          <FactCard icon={Clock3} label="Time" value={formatTimeRange(openShift.startsAt, openShift.endsAt)} />
          <FactCard icon={ShieldCheck} label="Status" value={humanize(openShift.status)} />
          <FactCard icon={CalendarClock} label="Pickup approval" value={openShift.pickupRequiresApproval ? "Required" : "Automatic"} />
        </div>
      </section>

      {canManage ? (
        <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_14px_36px_rgba(18,31,67,0.05)]">
          <form action={`/scheduling/open-shifts/${id}`} method="GET" className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
              Eligible employee search
              <input
                type="search"
                name="employeeSearch"
                defaultValue={employeeSearch}
                placeholder="Search by name or employee number"
                className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a]"
              />
            </label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white md:mt-[22px]">
              Find eligible people
            </button>
          </form>
          <p className="mt-3 text-xs font-bold leading-5 text-[#63708a]">
            Assignment options are filtered by active work scope and schedule conflicts, so large teams stay manageable.
          </p>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Targeting</p>
          <h2 className="mt-2 text-2xl font-black text-[#11143a]">Who should see this work</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#63708a]">
            Open shifts are targeted by organization unit, cost center, and position so employees only see work that belongs to
            their current assignment scope.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <DetailFact icon={Building2} label="Org unit" value={openShift.organizationNode?.name ?? "Not targeted"} />
            <DetailFact icon={BriefcaseBusiness} label="Position" value={openShift.position?.title ?? "Not targeted"} />
            <DetailFact icon={BriefcaseBusiness} label="Cost center" value={openShift.costCenter?.name ?? "Not targeted"} />
            <DetailFact icon={MapPin} label="Location" value={openShift.locationName ?? openShift.organizationNode?.name ?? "Location pending"} />
          </div>
        </article>

        <article className="rounded-xl bg-[#11143a] p-5 text-white shadow-[0_20px_50px_rgba(17,20,58,0.16)]">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/55">Pickup requests</p>
          <h2 className="mt-2 text-2xl font-black">Claim activity</h2>
          <div className="mt-5 grid gap-3">
            {(openShift.claims ?? []).length > 0 ? (
              openShift.claims?.map((claim) => <ClaimCard key={claim.id} claim={claim} />)
            ) : (
              <p className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-white/70">
                No pickup requests have been submitted for this open shift yet.
              </p>
            )}
          </div>
        </article>
      </section>

      {openShift.notes ? (
        <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Notes</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#4c5874]">{openShift.notes}</p>
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

function ClaimCard({ claim }: { claim: OpenShiftClaim }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{formatEmployee(claim.employee)}</p>
          <p className="mt-1 text-xs font-bold text-white/55">{formatDate(claim.requestedAt)}</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black uppercase text-white">
          {humanize(claim.status)}
        </span>
      </div>
      {claim.note ? <p className="mt-3 text-sm font-semibold leading-6 text-white/70">{claim.note}</p> : null}
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

function eligibleQuery(employeeSearch: string) {
  const params = new URLSearchParams({ limit: "50" });
  if (employeeSearch) params.set("employeeSearch", employeeSearch);
  return params.toString();
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
