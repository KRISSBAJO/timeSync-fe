"use client";

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, RotateCcw, Save, UsersRound, X } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { CostCenter, OrganizationNode } from "@/lib/organization/types";
import type { Position } from "@/lib/positions/types";
import type { OpenShift, ScheduleAssignment, ScheduleEmployee } from "@/lib/scheduling/types";

type ScheduleActionOptions = {
  employees: ScheduleEmployee[];
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  positions: Position[];
  canManage: boolean;
};

type AssignmentOperationsProps = ScheduleActionOptions & {
  assignment: ScheduleAssignment;
};

type OpenShiftOperationsProps = ScheduleActionOptions & {
  openShift: OpenShift;
};

type TabKey = "edit" | "unassign" | "assign";

export function AssignmentOperations({
  assignment,
  employees,
  organizationNodes,
  costCenters,
  positions,
  canManage,
}: AssignmentOperationsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("edit");
  const [isPending, startTransition] = useTransition();

  if (!canManage) return null;

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch(`/scheduling/assignments/${assignment.id}`, {
          method: "PATCH",
          body: JSON.stringify(
            prune({
              employeeId: stringValue(formData, "employeeId"),
              workDate: dateValue(formData, "workDate"),
              startsAt: dateTimeValue(formData, "startsAt"),
              endsAt: dateTimeValue(formData, "endsAt"),
              organizationNodeId: stringValue(formData, "organizationNodeId"),
              costCenterId: stringValue(formData, "costCenterId"),
              positionId: stringValue(formData, "positionId"),
              locationName: stringValue(formData, "locationName"),
              notes: stringValue(formData, "notes"),
            }),
          ),
        }),
      "Schedule assignment updated.",
    );
  }

  async function submitUnassign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch(`/scheduling/assignments/${assignment.id}/unassign`, {
          method: "POST",
          body: JSON.stringify(
            prune({
              mode: stringValue(formData, "mode") || "CANCEL_ONLY",
              reason: stringValue(formData, "reason"),
            }),
          ),
        }),
      formData.get("mode") === "RETURN_TO_OPEN_SHIFT"
        ? "Shift returned to open coverage."
        : "Employee removed from shift.",
    );
  }

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage, {
        description: "The day planner has been refreshed.",
      });
      setIsOpen(false);
      startTransition(() => router.refresh());
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Schedule action failed.", {
        description: "Check the employee, coverage, and time window before retrying.",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#cfd8ea] bg-white px-3 text-xs font-black text-[#11143a] transition hover:border-[#4a2df3]"
      >
        Manage
        <ArrowRight size={14} aria-hidden="true" />
      </button>
      {isOpen ? (
        <ScheduleModal
          title="Manage assignment"
          subtitle={`${formatEmployee(assignment.employee)} · ${formatTimeRange(assignment.startsAt, assignment.endsAt)}`}
          onClose={() => setIsOpen(false)}
        >
          <TabBar
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "edit", label: "Edit assignment" },
              { id: "unassign", label: "Unassign" },
            ]}
          />
          {activeTab === "edit" ? (
            <form onSubmit={submitEdit} className="mt-4 grid gap-4">
              <SelectField label="Employee" name="employeeId" defaultValue={assignment.employeeId}>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {formatEmployee(employee)}
                  </option>
                ))}
              </SelectField>
              <div className="grid gap-3 md:grid-cols-3">
                <InputField label="Work date" name="workDate" type="date" defaultValue={toDateInput(assignment.workDate)} />
                <InputField label="Starts" name="startsAt" type="datetime-local" defaultValue={toLocalDateTimeInput(assignment.startsAt)} />
                <InputField label="Ends" name="endsAt" type="datetime-local" defaultValue={toLocalDateTimeInput(assignment.endsAt)} />
              </div>
              <DimensionFields
                organizationNodes={organizationNodes}
                costCenters={costCenters}
                positions={positions}
                organizationNodeId={assignment.organizationNodeId ?? assignment.organizationNode?.id ?? ""}
                costCenterId={assignment.costCenterId ?? assignment.costCenter?.id ?? ""}
                positionId={assignment.positionId ?? assignment.position?.id ?? ""}
                locationName={assignment.locationName ?? ""}
              />
              <TextAreaField label="Scheduler note" name="notes" defaultValue={assignment.notes ?? ""} />
              <SubmitButton disabled={isPending} icon={Save}>
                Save assignment
              </SubmitButton>
            </form>
          ) : (
            <form onSubmit={submitUnassign} className="mt-4 grid gap-4">
              <SelectField label="Coverage outcome" name="mode" defaultValue="RETURN_TO_OPEN_SHIFT">
                <option value="RETURN_TO_OPEN_SHIFT">Return this work to open shifts</option>
                <option value="CANCEL_ONLY">Cancel this staffed slot only</option>
              </SelectField>
              <TextAreaField
                label="Reason"
                name="reason"
                placeholder="Explain the change so audit, employee communication, and coverage review stay clear."
              />
              <SubmitButton disabled={isPending} icon={RotateCcw}>
                Apply unassignment
              </SubmitButton>
            </form>
          )}
        </ScheduleModal>
      ) : null}
    </>
  );
}

export function OpenShiftOperations({
  openShift,
  employees,
  organizationNodes,
  costCenters,
  positions,
  canManage,
}: OpenShiftOperationsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("assign");
  const [isPending, startTransition] = useTransition();
  const eligibleEmployees = useMemo(
    () => employees.filter((employee) => employeeMatchesOpenShift(employee, openShift)),
    [employees, openShift],
  );
  const defaultEmployeeId = useMemo(() => eligibleEmployees[0]?.id ?? "", [eligibleEmployees]);

  if (!canManage) return null;

  async function submitAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch(`/scheduling/open-shifts/${openShift.id}/assign`, {
          method: "POST",
          body: JSON.stringify(
            prune({
              employeeId: stringValue(formData, "employeeId"),
              note: stringValue(formData, "note"),
            }),
          ),
        }),
      "Open shift assigned.",
    );
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch(`/scheduling/open-shifts/${openShift.id}`, {
          method: "PATCH",
          body: JSON.stringify(
            prune({
              workDate: dateValue(formData, "workDate"),
              startsAt: dateTimeValue(formData, "startsAt"),
              endsAt: dateTimeValue(formData, "endsAt"),
              requiredHeadcount: numberValue(formData, "requiredHeadcount"),
              status: stringValue(formData, "status"),
              pickupRequiresApproval: formData.get("pickupRequiresApproval") === "on",
              organizationNodeId: stringValue(formData, "organizationNodeId"),
              costCenterId: stringValue(formData, "costCenterId"),
              positionId: stringValue(formData, "positionId"),
              locationName: stringValue(formData, "locationName"),
              notes: stringValue(formData, "notes"),
            }),
          ),
        }),
      "Open shift updated.",
    );
  }

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage, {
        description: "Coverage and pickup queues have been refreshed.",
      });
      setIsOpen(false);
      startTransition(() => router.refresh());
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Open shift action failed.", {
        description: "Check the selected employee, status, and headcount before retrying.",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#cfd8ea] bg-white px-3 text-xs font-black text-[#11143a] transition hover:border-[#4a2df3]"
      >
        Manage
        <ArrowRight size={14} aria-hidden="true" />
      </button>
      {isOpen ? (
        <ScheduleModal
          title="Manage open shift"
          subtitle={`${openShift.shift?.name ?? openShift.position?.title ?? "Open shift"} · ${formatTimeRange(openShift.startsAt, openShift.endsAt)}`}
          onClose={() => setIsOpen(false)}
        >
          <TabBar
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "assign", label: "Assign employee" },
              { id: "edit", label: "Edit open shift" },
            ]}
          />
          {activeTab === "assign" ? (
            <form onSubmit={submitAssign} className="mt-4 grid gap-4">
              <SelectField label="Employee" name="employeeId" defaultValue={defaultEmployeeId}>
                {eligibleEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {formatEmployee(employee)}
                  </option>
                ))}
              </SelectField>
              {eligibleEmployees.length === 0 ? (
                <p className="rounded-xl border border-[#fff0c7] bg-[#fffaf0] px-3 py-2 text-xs font-bold leading-5 text-[#9a5a00]">
                  No eligible employees match this open shift target. Edit the org unit, cost center, or position before assigning it.
                </p>
              ) : null}
              <TextAreaField
                label="Assignment note"
                name="note"
                placeholder="Optional note for audit and coverage handoff."
              />
              <SubmitButton disabled={isPending || !defaultEmployeeId} icon={UsersRound}>
                Assign open shift
              </SubmitButton>
            </form>
          ) : (
            <form onSubmit={submitEdit} className="mt-4 grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <InputField label="Work date" name="workDate" type="date" defaultValue={toDateInput(openShift.workDate)} />
                <InputField label="Starts" name="startsAt" type="datetime-local" defaultValue={toLocalDateTimeInput(openShift.startsAt)} />
                <InputField label="Ends" name="endsAt" type="datetime-local" defaultValue={toLocalDateTimeInput(openShift.endsAt)} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <InputField label="Required slots" name="requiredHeadcount" type="number" defaultValue={String(openShift.requiredHeadcount)} min={String(Math.max(1, openShift.claimedHeadcount))} />
                <SelectField label="Status" name="status" defaultValue={openShift.status}>
                  <option value="OPEN">Open</option>
                  <option value="CLAIMED">Claimed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                </SelectField>
                <label className="mt-[22px] flex min-h-11 items-center gap-3 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-black text-[#11143a]">
                  <input
                    type="checkbox"
                    name="pickupRequiresApproval"
                    defaultChecked={openShift.pickupRequiresApproval}
                    className="h-4 w-4 accent-[#3820d7]"
                  />
                  Pickup requires approval
                </label>
              </div>
              <DimensionFields
                organizationNodes={organizationNodes}
                costCenters={costCenters}
                positions={positions}
                organizationNodeId={openShift.organizationNodeId ?? openShift.organizationNode?.id ?? ""}
                costCenterId={openShift.costCenterId ?? openShift.costCenter?.id ?? ""}
                positionId={openShift.positionId ?? openShift.position?.id ?? ""}
                locationName={openShift.locationName ?? ""}
              />
              <TextAreaField label="Open shift note" name="notes" defaultValue={openShift.notes ?? ""} />
              <SubmitButton disabled={isPending} icon={CalendarClock}>
                Save open shift
              </SubmitButton>
            </form>
          )}
        </ScheduleModal>
      ) : null}
    </>
  );
}

function ScheduleModal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#081128]/45 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-[0_30px_90px_rgba(8,17,40,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#3820d7]">Schedule control</p>
            <h2 className="mt-2 text-2xl font-black text-[#11143a]">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-[#63708a]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-[#f7f9fd] text-[#63708a]"
            aria-label="Close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function TabBar({
  activeTab,
  tabs,
  onChange,
}: {
  activeTab: TabKey;
  tabs: Array<{ id: TabKey; label: string }>;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <div className="mt-5 grid gap-2 rounded-xl bg-[#f5f7fb] p-1.5 sm:grid-cols-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`min-h-10 rounded-lg px-3 text-sm font-black transition ${
            activeTab === tab.id ? "bg-white text-[#3820d7] shadow-sm" : "text-[#63708a] hover:text-[#11143a]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function DimensionFields({
  organizationNodes,
  costCenters,
  positions,
  organizationNodeId,
  costCenterId,
  positionId,
  locationName,
}: {
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  positions: Position[];
  organizationNodeId: string;
  costCenterId: string;
  positionId: string;
  locationName: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SelectField label="Department / unit" name="organizationNodeId" defaultValue={organizationNodeId}>
        <option value="">Keep current or unassigned</option>
        {organizationNodes.map((node) => (
          <option key={node.id} value={node.id}>
            {node.name} ({humanize(node.type)})
          </option>
        ))}
      </SelectField>
      <SelectField label="Cost center" name="costCenterId" defaultValue={costCenterId}>
        <option value="">Keep current or unassigned</option>
        {costCenters.map((costCenter) => (
          <option key={costCenter.id} value={costCenter.id}>
            {costCenter.name} ({costCenter.code})
          </option>
        ))}
      </SelectField>
      <SelectField label="Position" name="positionId" defaultValue={positionId}>
        <option value="">Keep current or unassigned</option>
        {positions.map((position) => (
          <option key={position.id} value={position.id}>
            {position.title} ({position.code})
          </option>
        ))}
      </SelectField>
      <InputField label="Location" name="locationName" type="text" defaultValue={locationName} />
    </div>
  );
}

function InputField({
  label,
  name,
  type,
  defaultValue,
  min,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue?: string;
  min?: string;
}) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        min={min}
        className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a]"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a]"
      >
        {children}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className="rounded-xl border border-[#cfd8ea] bg-white px-3 py-3 text-sm font-bold normal-case text-[#11143a] outline-none placeholder:text-[#9aa4b8]"
      />
    </label>
  );
}

function SubmitButton({
  children,
  disabled,
  icon: Icon,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: typeof Save;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(56,32,215,0.2)] transition hover:bg-[#2e19ba] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon size={16} aria-hidden="true" />
      {children}
    </button>
  );
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value ? Number(value) : undefined;
}

function dateValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
}

function dateTimeValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value ? new Date(value).toISOString() : undefined;
}

function prune<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function employeeMatchesOpenShift(employee: ScheduleEmployee, openShift: OpenShift) {
  if (!openShift.organizationNodeId && !openShift.costCenterId && !openShift.positionId) {
    return false;
  }

  const assignment = employee.assignments?.[0];

  if (!assignment) {
    return false;
  }

  return (
    (!openShift.organizationNodeId || openShift.organizationNodeId === assignment.organizationNodeId) &&
    (!openShift.costCenterId || openShift.costCenterId === assignment.costCenterId) &&
    (!openShift.positionId || openShift.positionId === assignment.positionId)
  );
}
