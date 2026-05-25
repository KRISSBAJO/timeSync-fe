"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Filter,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { CostCenter, OrganizationNode } from "@/lib/organization/types";
import type { Position } from "@/lib/positions/types";
import type { OpenShiftClaim, PaginatedSchedule, ScheduleEmployee } from "@/lib/scheduling/types";

export type PickupRequestFilters = {
  search: string;
  status: string;
  from: string;
  to: string;
  cursor: string;
  employeeId: string;
  employeeSearch: string;
  organizationNodeId: string;
  costCenterId: string;
  positionId: string;
  locationName: string;
};

type PickupRequestsCenterProps = {
  claims: PaginatedSchedule<OpenShiftClaim> | null;
  filters: PickupRequestFilters;
  canDecide: boolean;
  employees: ScheduleEmployee[];
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  positions: Position[];
};

const statuses = [
  ["", "All statuses"],
  ["REQUESTED", "Waiting approval"],
  ["APPROVED", "Approved"],
  ["REJECTED", "Rejected"],
  ["CANCELLED", "Cancelled"],
] as const;

export function PickupRequestsCenter({
  claims,
  filters,
  canDecide,
  employees,
  organizationNodes,
  costCenters,
  positions,
}: PickupRequestsCenterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const rows = claims?.data ?? [];
  const waiting = rows.filter((claim) => claim.status === "REQUESTED").length;

  async function decideClaim(claim: OpenShiftClaim, status: "APPROVED" | "REJECTED", note?: string) {
    try {
      await apiFetch(`/scheduling/open-shift-claims/${claim.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ status, note }),
      });
      toast.success(status === "APPROVED" ? "Pickup request approved." : "Pickup request rejected.", {
        description: `${formatEmployee(claim.employee)} has been updated.`,
      });
      startTransition(() => router.refresh());
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "The pickup request could not be updated.", {
        description: "Review the request status and try again.",
      });
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_55px_rgba(18,31,67,0.06)]">
        <div className="relative grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,32,215,0.12),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(54,211,153,0.12),transparent_34%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-black uppercase text-[#3820d7]">
                Open shift governance
              </span>
              <span className="rounded-full border border-[#dfe8f6] bg-white px-3 py-1 text-[10px] font-black uppercase text-[#68748c]">
                Approval queue
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.65rem,3vw,2.65rem)] font-black leading-tight text-[#10143f]">
              Review pickup requests before they become confirmed work.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#5d6782]">
              Search by employee, shift, position, or team. Managers see their reporting scope; HR sees tenant-wide pickup requests.
            </p>
          </div>
          <div className="relative rounded-xl bg-[#11143a] p-5 text-white shadow-[0_22px_60px_rgba(17,20,58,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">Queue health</p>
                <h3 className="mt-2 text-3xl font-black">{waiting}</h3>
                <p className="mt-1 text-sm font-bold text-white/64">waiting on this page</p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10">
                <ShieldCheck size={22} aria-hidden="true" />
              </span>
            </div>
            <Link
              href="/scheduling"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#11143a] transition hover:bg-[#f6f8fd]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to schedule
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <form action="/scheduling/pickup-requests" method="GET" className="grid gap-3">
          <div className="grid gap-3 xl:grid-cols-[1fr_1fr_190px_170px_170px_auto]">
          <label className="relative block">
            <span className="sr-only">Search pickup requests</span>
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a8499]" aria-hidden="true" />
            <input
              name="search"
              defaultValue={filters.search}
              placeholder="Search employee, shift, position, team"
              className="h-12 w-full rounded-xl border border-[#d8e1f0] bg-[#fbfcff] pl-11 pr-4 text-sm font-bold text-[#10143f] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:bg-white"
            />
          </label>
          <select
            name="employeeId"
            defaultValue={filters.employeeId}
            className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition focus:border-[#3820d7] focus:bg-white"
          >
            <option value="">All visible employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{formatScheduleEmployee(employee)}</option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={filters.status}
            className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition focus:border-[#3820d7] focus:bg-white"
          >
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            name="from"
            type="date"
            defaultValue={filters.from}
            className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition focus:border-[#3820d7] focus:bg-white"
          />
          <input
            name="to"
            type="date"
            defaultValue={filters.to}
            className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition focus:border-[#3820d7] focus:bg-white"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(56,32,215,0.18)]"
          >
            <Filter size={16} aria-hidden="true" />
            Filter
          </button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
            <input
              name="employeeSearch"
              defaultValue={filters.employeeSearch}
              placeholder="Employee number or name"
              className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:bg-white"
            />
            <select
              name="organizationNodeId"
              defaultValue={filters.organizationNodeId}
              className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition focus:border-[#3820d7] focus:bg-white"
            >
              <option value="">All org units</option>
              {organizationNodes.map((node) => (
                <option key={node.id} value={node.id}>{node.name} ({humanize(node.type)})</option>
              ))}
            </select>
            <select
              name="costCenterId"
              defaultValue={filters.costCenterId}
              className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition focus:border-[#3820d7] focus:bg-white"
            >
              <option value="">All cost centers</option>
              {costCenters.map((costCenter) => (
                <option key={costCenter.id} value={costCenter.id}>{costCenter.name} ({costCenter.code})</option>
              ))}
            </select>
            <select
              name="positionId"
              defaultValue={filters.positionId}
              className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition focus:border-[#3820d7] focus:bg-white"
            >
              <option value="">All positions</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>{position.title} ({position.code})</option>
              ))}
            </select>
            <input
              name="locationName"
              defaultValue={filters.locationName}
              placeholder="Location, ward, floor, branch"
              className="h-12 rounded-xl border border-[#d8e1f0] bg-[#fbfcff] px-3 text-sm font-black text-[#10143f] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:bg-white"
            />
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_55px_rgba(18,31,67,0.06)]">
        {rows.length > 0 ? (
          <div className="divide-y divide-[#e8eef7]">
            {rows.map((claim) => (
              <PickupRequestRow
                key={claim.id}
                claim={claim}
                canDecide={canDecide}
                loading={isPending}
                onApprove={() => decideClaim(claim, "APPROVED")}
                onReject={(note) => decideClaim(claim, "REJECTED", note)}
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-[300px] place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#ece9ff] text-[#3820d7]">
                <ShieldCheck size={26} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-black text-[#10143f]">No pickup requests match this view</h3>
              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[#68748c]">
                Adjust the filters or return to scheduling to publish open shifts.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-[#e8eef7] bg-[#fbfcff] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#7a8499]">Pagination</p>
            <p className="mt-1 text-sm font-bold text-[#4d566d]">
              Showing {rows.length} request{rows.length === 1 ? "" : "s"} on this page.
            </p>
          </div>
          {claims?.page.nextCursor ? (
            <Link
              href={nextHref(filters, claims.page.nextCursor)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(56,32,215,0.18)]"
            >
              Next page
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <span className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe8f6] bg-white px-5 text-sm font-black text-[#9aa4b8]">
              End of results
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function PickupRequestRow({
  claim,
  canDecide,
  loading,
  onApprove,
  onReject,
}: {
  claim: OpenShiftClaim;
  canDecide: boolean;
  loading: boolean;
  onApprove: () => void;
  onReject: (note: string) => void;
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
    <article className="p-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.2fr_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#10143f]">{formatEmployee(claim.employee)}</p>
          <p className="mt-1 text-xs font-bold text-[#68748c]">
            Requested {formatDateTime(claim.requestedAt)}
          </p>
        </div>
        <div className="min-w-0 rounded-xl bg-[#f7faff] p-3">
          <p className="text-sm font-black text-[#10143f]">{shiftName}</p>
          {claim.openShift ? (
            <p className="mt-1 flex items-center gap-2 text-xs font-bold text-[#68748c]">
              <CalendarClock size={14} aria-hidden="true" />
              {formatTimeRange(claim.openShift.startsAt, claim.openShift.endsAt)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <StatusPill status={claim.status} />
          {canDecide && claim.status === "REQUESTED" ? (
            <>
              <button
                type="button"
                onClick={onApprove}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#18a977] px-4 text-xs font-black text-white disabled:opacity-60"
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setIsRejecting((value) => !value)}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ffd6d6] bg-[#fff7f7] px-4 text-xs font-black text-[#b42318] disabled:opacity-60"
              >
                <XCircle size={15} aria-hidden="true" />
                Reject
              </button>
            </>
          ) : null}
        </div>
      </div>
      {isRejecting ? (
        <form onSubmit={submitRejection} className="mt-4 rounded-xl border border-[#ffd6d6] bg-[#fff8f8] p-3">
          <label className="grid gap-2 text-[11px] font-black uppercase text-[#9f1d14]">
            Rejection reason
            <textarea
              name="note"
              required
              placeholder="Explain why this pickup cannot be approved"
              className="min-h-24 rounded-xl border border-[#ffc7c7] bg-white px-3 py-3 text-sm font-bold normal-case text-[#10143f] outline-none transition placeholder:text-[#a9b1c0] focus:border-[#b42318] focus:ring-4 focus:ring-[#b42318]/10"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#b42318] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            <XCircle size={15} aria-hidden="true" />
            Send rejection
          </button>
        </form>
      ) : null}
      {claim.status === "REJECTED" && claim.note ? (
        <p className="mt-4 rounded-xl border border-[#ffd6d6] bg-[#fff8f8] px-3 py-2 text-xs font-bold leading-5 text-[#9f1d14]">
          Rejection reason: {claim.note}
        </p>
      ) : null}
    </article>
  );
}

function StatusPill({ status }: { status: OpenShiftClaim["status"] }) {
  const className = {
    REQUESTED: "bg-[#fff3d7] text-[#a36000]",
    APPROVED: "bg-[#e7f8f0] text-[#0f8f66]",
    REJECTED: "bg-[#fff0f0] text-[#b42318]",
    CANCELLED: "bg-[#edf2fa] text-[#5d6782]",
  }[status];

  return (
    <span className={`inline-flex h-8 items-center rounded-full px-3 text-[11px] font-black uppercase ${className}`}>
      {status === "REQUESTED" ? "Waiting approval" : status.replaceAll("_", " ")}
    </span>
  );
}

function nextHref(filters: PickupRequestFilters, cursor: string) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  params.set("cursor", cursor);
  return `/scheduling/pickup-requests?${params.toString()}`;
}

function formatScheduleEmployee(employee: ScheduleEmployee) {
  const person = employee.person;
  const name = [person?.preferredName || person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return name ? `${name} · ${employee.employeeNumber}` : employee.employeeNumber;
}

function formatEmployee(employee?: OpenShiftClaim["employee"]) {
  if (!employee) return "Employee";
  const person = employee.person;
  const name = [person?.preferredName || person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return name ? `${name} · ${employee.employeeNumber}` : employee.employeeNumber;
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : date.toLocaleString();
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Time pending";

  return `${start.toLocaleDateString()} · ${start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}-${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
