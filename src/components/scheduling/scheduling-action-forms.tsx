"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { apiFetch } from "@/lib/api/client";
import type { ScheduleEmployee, SchedulePeriod, WorkShift } from "@/lib/scheduling/types";

type SchedulingActionFormProps = {
  returnTo: string;
  permissions: {
    canTenantSchedule: boolean;
    canTeamSchedule: boolean;
  };
  employees: ScheduleEmployee[];
  periods: SchedulePeriod[];
  shifts: WorkShift[];
  employeeEndpoint: string;
  employeeSearch?: string;
  defaultEmployeeId?: string;
  today: string;
};

const fallbackReturnTo = "/scheduling?tab=open&view=WEEK&employeeId=&employeeSearch=&from=&to=&status=&organizationNodeId=&costCenterId=&positionId=&locationName=";

export function SingleAssignmentForm({
  returnTo,
  permissions,
  employees,
  periods,
  shifts,
  employeeEndpoint,
  employeeSearch,
  defaultEmployeeId,
  today,
}: SchedulingActionFormProps) {
  const endpoint = permissions.canTenantSchedule ? "/scheduling/assignments" : "/scheduling/manager/assignments";
  const defaultShiftId = shifts[0]?.id ?? "";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const employeeId = stringValue(formData, "employeeId");

    if (!employeeId) {
      toast.error("Choose an employee first.", {
        description: "Search by name, employee number, team, or position, then select the worker.",
      });
      return;
    }

    await runAction({
      action: () =>
        apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(
            prune({
              employeeId,
              scheduleId: stringValue(formData, "scheduleId") || undefined,
              shiftId: stringValue(formData, "shiftId") || undefined,
              organizationNodeId: stringValue(formData, "organizationNodeId") || undefined,
              costCenterId: stringValue(formData, "costCenterId") || undefined,
              positionId: stringValue(formData, "positionId") || undefined,
              workDate: dateTimeValue(formData, "workDate", "00:00"),
              startsAt: dateTimeValue(formData, "workDate", stringValue(formData, "startsAt")),
              endsAt: dateTimeValue(formData, "workDate", stringValue(formData, "endsAt")),
              breakMinutes: numberValue(formData, "breakMinutes"),
              timezone: stringValue(formData, "timezone") || undefined,
              locationName: stringValue(formData, "locationName") || undefined,
              notes: stringValue(formData, "notes") || undefined,
            }),
          ),
        }),
      successMessage: "Schedule assignment created.",
      router,
      startTransition,
      returnTo,
    });
  }

  return (
    <SchedulingActionShell
      eyebrow="Single coverage"
      title="Assign one employee to a shift."
      body="Use this when you know the worker and the exact coverage window. The assignment keeps employee, placement, period, shift, and time context together."
      returnTo={returnTo}
      asideTitle="Enterprise guardrails"
      asideItems={["Search is scoped to the current schedule filters.", "Employee placement is copied from the selected active assignment.", "Unavailable-time collisions are checked by the scheduling API."]}
    >
      <form onSubmit={submit} className="grid gap-5">
        <EmployeePicker
          employees={employees}
          defaultValue={defaultEmployeeId ?? ""}
          endpoint={employeeEndpoint}
          defaultSearch={employeeSearch}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField name="scheduleId" label="Schedule period" defaultValue="">
            <option value="">No period</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>{period.name}</option>
            ))}
          </SelectField>
          <SelectField name="shiftId" label="Shift" defaultValue={defaultShiftId}>
            <option value="">Custom time</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>{shift.name}</option>
            ))}
          </SelectField>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <InputField name="workDate" label="Date" type="date" defaultValue={today} required />
          <InputField name="startsAt" label="Starts" type="time" defaultValue="08:00" required />
          <InputField name="endsAt" label="Ends" type="time" defaultValue="16:00" required />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <InputField name="breakMinutes" label="Break minutes" type="number" defaultValue="30" />
          <InputField name="timezone" label="Timezone" placeholder="Africa/Lagos" />
          <InputField name="locationName" label="Location" placeholder="Ward, branch, floor, site" />
        </div>
        <TextAreaField name="notes" label="Notes" placeholder="Coverage note" />
        <ActionFooter returnTo={returnTo} submitLabel="Create assignment" loading={isPending} />
      </form>
    </SchedulingActionShell>
  );
}

export function BulkAssignmentForm({
  returnTo,
  permissions,
  employees,
  periods,
  shifts,
  today,
}: SchedulingActionFormProps) {
  const endpoint = permissions.canTenantSchedule ? "/scheduling/assignments/bulk" : "/scheduling/manager/assignments/bulk";
  const defaultShiftId = shifts[0]?.id ?? "";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const employeeIds = formData
      .getAll("employeeIds")
      .flatMap((value) => splitTokens(String(value)))
      .map((value) => value.trim())
      .filter(Boolean);
    const workDates = formData
      .getAll("workDates")
      .flatMap((value) => splitTokens(String(value)))
      .map((value) => value.trim())
      .filter(Boolean);

    if (employeeIds.length === 0 || workDates.length === 0) {
      toast.error("Select employees and work dates.", {
        description: "Bulk scheduling needs at least one worker and one work date.",
      });
      return;
    }

    await runAction({
      action: () =>
        apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(
            prune({
              employeeIds,
              workDates,
              scheduleId: stringValue(formData, "scheduleId") || undefined,
              shiftId: stringValue(formData, "shiftId") || undefined,
              startsAtTime: stringValue(formData, "startsAtTime"),
              endsAtTime: stringValue(formData, "endsAtTime"),
              breakMinutes: numberValue(formData, "breakMinutes"),
              timezone: stringValue(formData, "timezone") || undefined,
              locationName: stringValue(formData, "locationName") || undefined,
              notes: stringValue(formData, "notes") || undefined,
              skipConflicts: formData.get("skipConflicts") === "on",
            }),
          ),
        }),
      successMessage: "Bulk schedule assignment completed.",
      router,
      startTransition,
      returnTo,
    });
  }

  return (
    <SchedulingActionShell
      eyebrow="Roster build"
      title="Assign many employees across selected dates."
      body="Use this for weekly rosters, department coverage, and controlled batches. Workers are selected from a searchable table and dates are built deliberately."
      returnTo={returnTo}
      asideTitle="Batch behavior"
      asideItems={["Choose workers from a searchable table, not a cramped multi-select.", "Generate dates from a range and selected weekdays.", "Skip conflicts creates only clean assignments and reports blocked rows."]}
    >
      <form onSubmit={submit} className="grid gap-5">
        <BulkEmployeePicker employees={employees} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField name="scheduleId" label="Schedule period" defaultValue="">
            <option value="">No period</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>{period.name}</option>
            ))}
          </SelectField>
          <SelectField name="shiftId" label="Shift" defaultValue={defaultShiftId}>
            <option value="">Custom time</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>{shift.name}</option>
            ))}
          </SelectField>
        </div>
        <WorkDateSelector today={today} />
        <div className="grid gap-4 md:grid-cols-4">
          <InputField name="startsAtTime" label="Starts" type="time" defaultValue="08:00" required />
          <InputField name="endsAtTime" label="Ends" type="time" defaultValue="16:00" required />
          <InputField name="breakMinutes" label="Break" type="number" defaultValue="30" />
          <InputField name="timezone" label="Timezone" placeholder="Africa/Lagos" />
        </div>
        <InputField name="locationName" label="Location" placeholder="Ward, branch, floor, site" />
        <CheckboxField
          name="skipConflicts"
          label="Skip conflicts"
          description="Create clean rows and report employees blocked by existing work or unavailability."
        />
        <TextAreaField name="notes" label="Notes" placeholder="Bulk schedule batch note" />
        <ActionFooter returnTo={returnTo} submitLabel="Create bulk assignments" loading={isPending} />
      </form>
    </SchedulingActionShell>
  );
}

export function CreatePeriodForm({ returnTo, today }: { returnTo: string; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await runAction({
      action: () =>
        apiFetch("/scheduling/periods", {
          method: "POST",
          body: JSON.stringify({
            code: stringValue(formData, "code"),
            name: stringValue(formData, "name"),
            startsOn: dateTimeValue(formData, "startsOn", "00:00"),
            endsOn: dateTimeValue(formData, "endsOn", "23:59"),
            timezone: stringValue(formData, "timezone") || undefined,
            status: "DRAFT",
          }),
        }),
      successMessage: "Schedule period created.",
      router,
      startTransition,
      returnTo,
    });
  }

  return (
    <SchedulingActionShell
      eyebrow="Planning window"
      title="Create a schedule period."
      body="Periods give HR a controlled planning window for weekly or monthly rosters before publishing and locking coverage."
      returnTo={returnTo}
      asideTitle="Period lifecycle"
      asideItems={["Draft periods can be edited and reviewed.", "Published periods become visible to schedule operators.", "Locked periods protect payroll and audit integrity."]}
    >
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField name="code" label="Code" placeholder="MAY_2026_WEEK_3" required />
          <InputField name="name" label="Name" placeholder="May 2026 week 3" required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <InputField name="startsOn" label="Starts" type="date" defaultValue={today} required />
          <InputField name="endsOn" label="Ends" type="date" defaultValue={today} required />
        </div>
        <InputField name="timezone" label="Timezone" placeholder="Africa/Lagos" />
        <ActionFooter returnTo={returnTo} submitLabel="Create period" loading={isPending} />
      </form>
    </SchedulingActionShell>
  );
}

function SchedulingActionShell({
  eyebrow,
  title,
  body,
  returnTo,
  asideTitle,
  asideItems,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  returnTo: string;
  asideTitle: string;
  asideItems: string[];
  children: ReactNode;
}) {
  return (
    <main className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white shadow-[0_22px_60px_rgba(18,31,67,0.07)]">
        <div className="relative grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_5%_0%,rgba(56,32,215,0.11),transparent_30%),radial-gradient(circle_at_95%_0%,rgba(16,185,129,0.10),transparent_32%)]" />
          <div className="relative">
            <Link href={returnTo || fallbackReturnTo} className="inline-flex items-center gap-2 text-sm font-black text-[#3820d7]">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to planner
            </Link>
            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.12em] text-[#3820d7]">{eyebrow}</p>
            <h1 className="mt-2 max-w-4xl text-[clamp(1.85rem,4vw,3.2rem)] font-black leading-tight text-[#11143a]">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#63708a]">{body}</p>
          </div>
          <aside className="relative rounded-2xl bg-[#11143a] p-5 text-white shadow-[0_24px_60px_rgba(17,20,58,0.18)]">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10">
              <ShieldCheck size={21} aria-hidden="true" />
            </span>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.14em] text-white/50">{asideTitle}</p>
            <ul className="mt-3 grid gap-3">
              {asideItems.map((item) => (
                <li key={item} className="flex gap-2 text-sm font-bold leading-6 text-white/72">
                  <CheckCircle2 size={15} className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-[0_22px_60px_rgba(18,31,67,0.06)]">
        {children}
      </section>
    </main>
  );
}

function ActionFooter({ returnTo, submitLabel, loading }: { returnTo: string; submitLabel: string; loading: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f7] pt-5">
      <Link
        href={returnTo || fallbackReturnTo}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe8f6] bg-white px-5 text-sm font-black text-[#11143a] transition hover:border-[#c8d5ea]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Cancel
      </Link>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-11 min-w-52 items-center justify-center gap-2 rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(56,32,215,0.22)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
        {submitLabel}
      </button>
    </div>
  );
}

function EmployeePicker({
  employees,
  defaultValue,
  endpoint,
  defaultSearch,
}: {
  employees: ScheduleEmployee[];
  defaultValue: string;
  endpoint: string;
  defaultSearch?: string;
}) {
  const [query, setQuery] = useState(defaultSearch ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [remoteCandidates, setRemoteCandidates] = useState<ScheduleEmployee[] | null>(null);
  const [loading, setLoading] = useState(false);
  const candidates = remoteCandidates ?? employees;
  const selectedEmployee = candidates.find((employee) => employee.id === selectedId) ?? employees.find((employee) => employee.id === selectedId);
  const selectedAssignment = selectedEmployee?.assignments?.[0];
  const searchTerm = query.trim();
  const visibleCandidates = (searchTerm ? candidates.filter((employee) => employeeMatchesSearch(employee, searchTerm)) : candidates).slice(0, 8);

  useEffect(() => {
    if (searchTerm.length < 2) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "20", employeeSearch: searchTerm });
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
  }, [endpoint, employees, searchTerm]);

  return (
    <section className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
      <input type="hidden" name="employeeId" value={selectedId} />
      <input type="hidden" name="organizationNodeId" value={selectedAssignment?.organizationNodeId ?? ""} />
      <input type="hidden" name="costCenterId" value={selectedAssignment?.costCenterId ?? ""} />
      <input type="hidden" name="positionId" value={selectedAssignment?.positionId ?? ""} />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <label className="relative block">
            <span className="text-[11px] font-black uppercase text-[#63708a]">Search employee</span>
            <Search size={17} className="absolute left-4 top-[42px] text-[#7a8499]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                if (value.trim().length < 2) {
                  setRemoteCandidates(null);
                }
              }}
              placeholder="Name, employee number, team, position"
              className="mt-2 min-h-12 w-full rounded-xl border border-[#cfd8ea] bg-white pl-11 pr-4 text-sm font-bold text-[#11143a] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
            />
          </label>
          <div className="mt-3 grid max-h-[380px] gap-2 overflow-y-auto pr-1">
            {visibleCandidates.length > 0 ? (
              visibleCandidates.map((employee) => {
                const active = employee.id === selectedId;
                const assignment = employee.assignments?.[0];

                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => setSelectedId(employee.id)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      active ? "border-[#3820d7] bg-[#f2efff]" : "border-[#dfe8f6] bg-white hover:border-[#c8d5ea]"
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black ${active ? "bg-[#3820d7] text-white" : "bg-[#eef5ff] text-[#3865ff]"}`}>
                      {employeeInitials(employee)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-[#11143a]">{formatEmployee(employee)}</span>
                      <span className="mt-1 block truncate text-xs font-bold text-[#63708a]">{employeeAssignmentContext(assignment)}</span>
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${active ? "bg-[#3820d7] text-white" : "bg-[#eef3fb] text-[#63708a]"}`}>
                      {active ? "Selected" : "Choose"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-[#cfd8ea] bg-white p-5 text-sm font-bold text-[#63708a]">
                No matching worker in this scope.
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#7a8499]">
            {loading ? "Searching..." : "Only the first matches are shown. Keep typing to narrow large employee populations."}
          </p>
        </div>

        <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Selected worker</p>
          {selectedEmployee ? (
            <div className="mt-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eef5ff] text-lg font-black text-[#3865ff]">
                {employeeInitials(selectedEmployee)}
              </span>
              <h3 className="mt-4 text-xl font-black text-[#11143a]">{formatEmployee(selectedEmployee)}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#63708a]">{employeeAssignmentContext(selectedAssignment)}</p>
              <div className="mt-4 grid gap-2">
                <MiniFact label="Organization" value={selectedAssignment?.organizationNode?.name ?? "Not assigned"} />
                <MiniFact label="Cost center" value={selectedAssignment?.costCenter?.name ?? "Not assigned"} />
                <MiniFact label="Position" value={selectedAssignment?.position?.title ?? "Not assigned"} />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm font-semibold leading-6 text-[#63708a]">
              Search and select a worker before creating the assignment.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BulkEmployeePicker({ employees }: { employees: ScheduleEmployee[] }) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedEmployees = useMemo(
    () => selectedIds.map((id) => employees.find((employee) => employee.id === id)).filter(Boolean) as ScheduleEmployee[],
    [employees, selectedIds],
  );
  const matchingEmployees = useMemo(() => employees.filter((employee) => employeeMatchesSearch(employee, query)), [employees, query]);
  const visibleEmployees = matchingEmployees.slice(0, 100);
  const visibleSelected = visibleEmployees.length > 0 && visibleEmployees.every((employee) => selectedSet.has(employee.id));

  function toggleEmployee(employeeId: string) {
    setSelectedIds((current) =>
      current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId],
    );
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const employee of visibleEmployees) {
        next.add(employee.id);
      }
      return [...next];
    });
  }

  function removeVisible() {
    const visibleIds = new Set(visibleEmployees.map((employee) => employee.id));
    setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
  }

  return (
    <section className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="employeeIds" value={id} />
      ))}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase text-[#63708a]">Employees</p>
          <h3 className="mt-1 text-xl font-black text-[#11143a]">{selectedIds.length} selected</h3>
          <p className="mt-1 text-sm font-semibold text-[#63708a]">Search and select from the scoped employee table.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={visibleSelected ? removeVisible : selectVisible} className="rounded-xl border border-[#dfe8f6] bg-white px-4 py-2 text-sm font-black text-[#11143a]">
            {visibleSelected ? "Unselect visible" : "Select visible"}
          </button>
          <button type="button" onClick={() => setSelectedIds([])} className="rounded-xl border border-[#ffd4d4] bg-[#fff7f7] px-4 py-2 text-sm font-black text-[#b42318]">
            Clear
          </button>
        </div>
      </div>
      <label className="relative mt-4 block">
        <span className="sr-only">Search employees</span>
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a8499]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search employee, number, team, position, cost center"
          className="min-h-12 w-full rounded-xl border border-[#cfd8ea] bg-white pl-11 pr-4 text-sm font-bold text-[#11143a] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
        />
      </label>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white">
        <div className="grid min-w-[860px] grid-cols-[64px_1.35fr_1fr_1fr_1fr] bg-[#f7f9fd] px-4 py-3 text-[11px] font-black uppercase text-[#63708a]">
          <span>Select</span>
          <span>Employee</span>
          <span>Position</span>
          <span>Organization</span>
          <span>Cost center</span>
        </div>
        <div className="max-h-[430px] min-w-[860px] overflow-y-auto">
          {visibleEmployees.length > 0 ? (
            visibleEmployees.map((employee) => {
              const assignment = employee.assignments?.[0];
              const active = selectedSet.has(employee.id);

              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => toggleEmployee(employee.id)}
                  className={`grid w-full grid-cols-[64px_1.35fr_1fr_1fr_1fr] items-center border-t border-[#edf1f7] px-4 py-3 text-left transition ${
                    active ? "bg-[#f2efff]" : "bg-white hover:bg-[#fbfcff]"
                  }`}
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-md border ${active ? "border-[#3820d7] bg-[#3820d7] text-white" : "border-[#cfd8ea] text-transparent"}`}>
                    <CheckCircle2 size={13} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 pr-4">
                    <span className="block truncate text-sm font-black text-[#11143a]">{formatEmployee(employee)}</span>
                    <span className="block truncate text-[11px] font-bold text-[#7a8499]">{employee.id}</span>
                  </span>
                  <span className="truncate pr-4 text-sm font-bold text-[#11143a]">{assignment?.position?.title ?? "Unassigned"}</span>
                  <span className="truncate pr-4 text-sm font-bold text-[#63708a]">{assignment?.organizationNode?.name ?? "No org placement"}</span>
                  <span className="truncate text-sm font-bold text-[#63708a]">{assignment?.costCenter?.name ?? "No cost center"}</span>
                </button>
              );
            })
          ) : (
            <div className="border-t border-[#edf1f7] p-8 text-center text-sm font-bold text-[#63708a]">
              No employees match this search.
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[#dfe8f6] bg-white p-3">
        {selectedEmployees.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedEmployees.slice(0, 8).map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => toggleEmployee(employee.id)}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#eef5ff] px-3 py-1.5 text-xs font-black text-[#3865ff] transition hover:bg-[#fff1f1] hover:text-[#b42318]"
              >
                <span className="truncate">{formatEmployee(employee)}</span>
                <span aria-hidden="true">x</span>
              </button>
            ))}
            {selectedEmployees.length > 8 ? (
              <span className="inline-flex rounded-full bg-[#f2efff] px-3 py-1.5 text-xs font-black text-[#3820d7]">
                +{selectedEmployees.length - 8} more
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-sm font-semibold text-[#7a8499]">No workers selected yet.</p>
        )}
      </div>
    </section>
  );
}

function WorkDateSelector({ today }: { today: string }) {
  const [singleDate, setSingleDate] = useState(today);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(dateKeyFromDate(addDays(new Date(`${today}T00:00:00`), 6)));
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dates, setDates] = useState<string[]>([]);
  const selectedDates = useMemo(() => [...new Set(dates)].sort(), [dates]);

  function mergeDates(nextDates: string[]) {
    setDates((current) => [...new Set([...current, ...nextDates])].sort());
  }

  function addSingleDate() {
    if (!singleDate) {
      toast.error("Choose a work date.");
      return;
    }

    mergeDates([singleDate]);
  }

  function addDateRange() {
    const start = parseDateInput(rangeStart);
    const end = parseDateInput(rangeEnd);

    if (!start || !end) {
      toast.error("Choose a valid date range.");
      return;
    }

    if (selectedWeekdays.length === 0) {
      toast.error("Select at least one weekday.");
      return;
    }

    const from = start <= end ? start : end;
    const to = start <= end ? end : start;
    const totalDays = daysBetween(from, to);

    if (totalDays > 120) {
      toast.error("Date range is too large.", {
        description: "Use a smaller planning window for this roster batch.",
      });
      return;
    }

    const nextDates = Array.from({ length: totalDays + 1 }, (_, index) => addDays(from, index))
      .filter((date) => selectedWeekdays.includes(date.getDay()))
      .map(dateKeyFromDate);

    if (nextDates.length === 0) {
      toast.error("No dates match the selected weekdays.");
      return;
    }

    mergeDates(nextDates);
  }

  function toggleWeekday(day: number) {
    setSelectedWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );
  }

  return (
    <section className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
      {selectedDates.map((date) => (
        <input key={date} type="hidden" name="workDates" value={date} />
      ))}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase text-[#63708a]">Work dates</p>
          <h3 className="mt-1 text-xl font-black text-[#11143a]">
            {selectedDates.length > 0 ? `${selectedDates.length} date${selectedDates.length === 1 ? "" : "s"} selected` : "No dates selected"}
          </h3>
        </div>
        {selectedDates.length > 0 ? (
          <button type="button" onClick={() => setDates([])} className="rounded-xl border border-[#ffd4d4] bg-[#fff7f7] px-3 py-2 text-xs font-black text-[#b42318]">
            Clear dates
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-[#dfe8f6] bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <InputLikeDate label="Add one date" value={singleDate} onChange={setSingleDate} />
            <button type="button" onClick={addSingleDate} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#3820d7] px-4 text-sm font-black text-white">
              <Plus size={15} aria-hidden="true" />
              Add date
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-[#dfe8f6] bg-white p-3">
          <p className="text-[11px] font-black uppercase text-[#63708a]">Build from range</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <InputLikeDate label="From" value={rangeStart} onChange={setRangeStart} />
            <InputLikeDate label="To" value={rangeEnd} onChange={setRangeEnd} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {weekDays.map((day) => {
              const active = selectedWeekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeekday(day.value)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                    active ? "border-[#3820d7] bg-[#3820d7] text-white" : "border-[#dfe8f6] bg-[#f7f9fd] text-[#63708a]"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={addDateRange} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#dfe8f6] bg-[#f7f9fd] px-4 text-sm font-black text-[#11143a]">
            <CalendarClock size={15} aria-hidden="true" />
            Add matching dates
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-[#dfe8f6] bg-white p-3">
        {selectedDates.length > 0 ? (
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
            {selectedDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setDates((current) => current.filter((value) => value !== date))}
                className="inline-flex items-center gap-2 rounded-full bg-[#eef5ff] px-3 py-1.5 text-xs font-black text-[#3865ff] transition hover:bg-[#ffecec] hover:text-[#b42318]"
              >
                {date}
                <span aria-hidden="true">x</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-[#7a8499]">Add individual dates or generate dates from a range and weekdays.</p>
        )}
      </div>
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
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="min-h-12 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
      />
    </label>
  );
}

function InputLikeDate({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a] outline-none transition focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
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
        className="min-h-12 rounded-xl border border-[#cfd8ea] bg-white px-3 text-sm font-bold normal-case text-[#11143a] outline-none transition focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
      >
        {children}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-[11px] font-black uppercase text-[#63708a]">
      {label}
      <textarea
        name={name}
        placeholder={placeholder}
        rows={4}
        className="rounded-xl border border-[#cfd8ea] bg-white px-3 py-3 text-sm font-bold normal-case text-[#11143a] outline-none transition placeholder:text-[#9aa4b8] focus:border-[#3820d7] focus:ring-4 focus:ring-[#3820d7]/10"
      />
    </label>
  );
}

function CheckboxField({ label, name, description }: { label: string; name: string; description: string }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
      <input name={name} type="checkbox" className="mt-1 h-4 w-4 accent-[#3820d7]" />
      <span>
        <span className="block text-sm font-black text-[#11143a]">{label}</span>
        <span className="mt-1 block text-sm font-semibold leading-6 text-[#63708a]">{description}</span>
      </span>
    </label>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-3">
      <p className="text-[10px] font-black uppercase text-[#7a8499]">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#11143a]">{value}</p>
    </div>
  );
}

async function runAction({
  action,
  successMessage,
  router,
  startTransition,
  returnTo,
}: {
  action: () => Promise<unknown>;
  successMessage: string;
  router: ReturnType<typeof useRouter>;
  startTransition: (callback: () => void) => void;
  returnTo: string;
}) {
  try {
    await action();
    toast.success(successMessage, {
      description: "Returning to the scheduling planner.",
    });
    startTransition(() => {
      router.push(returnTo || fallbackReturnTo);
      router.refresh();
    });
  } catch (caught) {
    toast.error(caught instanceof Error ? caught.message : "Scheduling action failed.", {
      description: "Please review the request and try again.",
    });
  }
}

function formatEmployee(employee?: ScheduleEmployee | null) {
  if (!employee) return "Unassigned employee";
  const person = employee.person;
  const name = [person?.preferredName || person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return name ? `${name} · ${employee.employeeNumber}` : employee.employeeNumber;
}

function employeeInitials(employee: ScheduleEmployee) {
  const person = employee.person;
  const first = person?.preferredName || person?.firstName || employee.employeeNumber;
  const last = person?.lastName ?? "";
  return `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase();
}

function employeeAssignmentContext(assignment?: NonNullable<ScheduleEmployee["assignments"]>[number]) {
  return [
    assignment?.position?.title,
    assignment?.organizationNode?.name,
    assignment?.costCenter?.name,
  ]
    .filter(Boolean)
    .join(" · ") || "No active placement recorded";
}

function employeeMatchesSearch(employee: ScheduleEmployee, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const assignment = employee.assignments?.[0];
  return [
    formatEmployee(employee),
    employee.employeeNumber,
    assignment?.position?.title,
    assignment?.position?.code,
    assignment?.organizationNode?.name,
    assignment?.organizationNode?.code,
    assignment?.costCenter?.name,
    assignment?.costCenter?.code,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

function mergeEmployees(remote: ScheduleEmployee[], local: ScheduleEmployee[]) {
  const map = new Map<string, ScheduleEmployee>();

  for (const employee of [...remote, ...local]) {
    map.set(employee.id, employee);
  }

  return [...map.values()];
}

function dateTimeValue(formData: FormData, dateKey: string, timeValue: string) {
  const date = stringValue(formData, dateKey);
  const time = timeValue || "00:00";
  return new Date(`${date}T${time}:00`).toISOString();
}

function stringValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function numberValue(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : undefined;
}

function splitTokens(value: string) {
  return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function prune<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")) as Partial<T>;
}

function parseDateInput(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKeyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / 86_400_000);
}

const weekDays = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];
