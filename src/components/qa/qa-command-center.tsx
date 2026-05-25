"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Database,
  FlaskConical,
  Hammer,
  Play,
  RefreshCw,
  Server,
  TerminalSquare,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/client";
import type { AuthSession } from "@/lib/api/types";
import { hasAnyPermission } from "@/lib/auth/permissions";
import type { QaRunDetail, QaRunListItem, QaRunStatus, QaScriptCategory, QaScriptSummary } from "@/lib/qa/types";

type QaCommandCenterProps = {
  session: AuthSession;
  scripts: QaScriptSummary[];
  runs: QaRunListItem[];
};

const categoryIcons: Record<QaScriptCategory, LucideIcon> = {
  smoke: FlaskConical,
  regression: Hammer,
  static: CheckCircle2,
  build: Server,
  database: Database,
  frontend: TerminalSquare,
};

export function QaCommandCenter({ session, scripts, runs }: QaCommandCenterProps) {
  const canRun = hasAnyPermission(session.user, ["qa.run"]);
  const [scriptRows, setScriptRows] = useState(scripts);
  const [runRows, setRunRows] = useState(runs);
  const [selectedRun, setSelectedRun] = useState<QaRunDetail | null>(null);
  const [busyScriptId, setBusyScriptId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const latestRun = selectedRun ?? runRows[0] ?? null;
  const runningCount = runRows.filter((run) => run.status === "RUNNING" || run.status === "QUEUED").length;
  const passedCount = runRows.filter((run) => run.status === "PASSED").length;
  const failedCount = runRows.filter((run) => run.status === "FAILED").length;
  const hasActiveRun = runningCount > 0 || selectedRun?.status === "RUNNING" || selectedRun?.status === "QUEUED";

  const refresh = useCallback(async (runId?: string) => {
    setRefreshing(true);
    try {
      const [nextScripts, nextRuns] = await Promise.all([
        apiFetch<QaScriptSummary[]>("/qa/scripts"),
        apiFetch<QaRunListItem[]>("/qa/runs?limit=25"),
      ]);
      setScriptRows(nextScripts);
      setRunRows(nextRuns);

      if (runId) {
        setSelectedRun(await apiFetch<QaRunDetail>(`/qa/runs/${runId}`));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh QA runs.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const startRun = useCallback(async (script: QaScriptSummary) => {
    setBusyScriptId(script.id);
    try {
      const run = await apiFetch<QaRunDetail>("/qa/runs", {
        method: "POST",
        body: JSON.stringify({ scriptId: script.id }),
      });
      setSelectedRun(run);
      toast.success(`${script.name} started.`);
      await refresh(run.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start QA script.");
    } finally {
      setBusyScriptId(null);
    }
  }, [refresh]);

  const openRun = useCallback(async (run: QaRunListItem) => {
    try {
      setSelectedRun(await apiFetch<QaRunDetail>(`/qa/runs/${run.id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open QA run.");
    }
  }, []);

  const cancelRun = useCallback(async () => {
    if (!selectedRun) return;

    try {
      const run = await apiFetch<QaRunDetail>(`/qa/runs/${selectedRun.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSelectedRun(run);
      toast.success("Cancellation requested.");
      await refresh(run.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel QA run.");
    }
  }, [refresh, selectedRun]);

  const scriptColumns = useMemo<Array<DataTableColumn<QaScriptSummary>>>(
    () => [
      {
        key: "script",
        header: "Script",
        render: (script) => {
          const Icon = categoryIcons[script.category];
          return (
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#dfe8f6] bg-[#f7f9fd] text-[#2f2a85]">
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-black text-[#11143a]">{script.name}</p>
                <p className="mt-1 max-w-xl truncate text-xs font-semibold text-[#74809a]">{script.description}</p>
              </div>
            </div>
          );
        },
      },
      {
        key: "scope",
        header: "Scope",
        render: (script) => <Badge tone={script.scope === "backend" ? "blue" : "purple"}>{script.scope}</Badge>,
      },
      {
        key: "category",
        header: "Category",
        render: (script) => <span className="font-black capitalize text-[#11143a]">{script.category}</span>,
      },
      {
        key: "last",
        header: "Last Result",
        render: (script) => (script.lastRun ? <StatusBadge status={script.lastRun.status} /> : <span className="text-xs font-bold text-[#8b95aa]">Not run</span>),
      },
      {
        key: "command",
        header: "Command",
        render: (script) => <code className="rounded-lg bg-[#f4f7fb] px-2 py-1 text-xs font-bold text-[#33405f]">{script.command}</code>,
      },
      {
        key: "action",
        header: "",
        headerClassName: "text-right",
        className: "text-right",
        render: (script) => (
          <button
            type="button"
            disabled={!canRun || !script.available || Boolean(busyScriptId)}
            onClick={(event) => {
              event.stopPropagation();
              void startRun(script);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3418b8] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(52,24,184,0.22)] transition hover:bg-[#2b1499] disabled:cursor-not-allowed disabled:bg-[#a9b3c7] disabled:shadow-none"
          >
            {busyScriptId === script.id ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            Run
          </button>
        ),
      },
    ],
    [busyScriptId, canRun, startRun],
  );

  const runColumns = useMemo<Array<DataTableColumn<QaRunListItem>>>(
    () => [
      {
        key: "run",
        header: "Run",
        render: (run) => (
          <div>
            <p className="font-black text-[#11143a]">{run.scriptName}</p>
            <p className="mt-1 text-xs font-semibold text-[#74809a]">{run.id.slice(0, 8)} · {run.command}</p>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (run) => <StatusBadge status={run.status} />,
      },
      {
        key: "actor",
        header: "Actor",
        render: (run) => <span className="font-bold text-[#33405f]">{run.actorEmail}</span>,
      },
      {
        key: "started",
        header: "Started",
        render: (run) => <span className="font-bold text-[#33405f]">{formatDateTime(run.startedAt)}</span>,
      },
      {
        key: "duration",
        header: "Duration",
        render: (run) => <span className="font-black text-[#11143a]">{formatDuration(run.durationMs)}</span>,
      },
    ],
    [],
  );

  useEffect(() => {
    if (!hasActiveRun) return;

    const timer = window.setInterval(() => {
      void refresh(selectedRun?.id);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [hasActiveRun, refresh, selectedRun?.id]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.5rem] border border-[#dfe8f6] bg-[linear-gradient(135deg,#f7fbff,#ffffff_55%,#f4f0ff)] p-6 shadow-[0_20px_55px_rgba(18,31,67,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe8f6] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.04em] text-[#2f2a85]">
              <FlaskConical size={14} />
              QA command center
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight text-[#11143a]">Run smoke, regression, build, and validation checks from one place.</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#5f6b84]">
              Whitelisted scripts execute on the backend host with role controls, captured output, history, and cancel support.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh(selectedRun?.id)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d9e3f2] bg-white px-4 text-sm font-black text-[#11143a] transition hover:bg-[#f7f9fd]"
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Scripts" value={scriptRows.length} icon={TerminalSquare} tone="blue" />
          <Metric label="Running" value={runningCount} icon={Clock3} tone="amber" />
          <Metric label="Passed" value={passedCount} icon={CheckCircle2} tone="green" />
          <Metric label="Failed" value={failedCount} icon={XCircle} tone="red" />
        </div>
      </section>

      <DataTable
        eyebrow="Controlled launcher"
        title="Script catalog"
        description="Only approved npm scripts are exposed here; unavailable workspaces remain visible but cannot be started."
        rows={scriptRows}
        columns={scriptColumns}
        getRowKey={(script) => script.id}
        minWidth="1060px"
        emptyTitle="No scripts registered"
        emptyBody="Add whitelisted scripts in the backend QA service to populate this catalog."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <DataTable
          eyebrow="Recent execution"
          title="Run history"
          description="Open a row to inspect captured output and status details."
          rows={runRows}
          columns={runColumns}
          getRowKey={(run) => run.id}
          onRowClick={openRun}
          getRowActionLabel={(run) => `Open ${run.scriptName}`}
          minWidth="860px"
          emptyTitle="No QA runs yet"
          emptyBody="Launch a script from the catalog to create the first run."
        />

        <section className="overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white shadow-[0_20px_55px_rgba(18,31,67,0.06)]">
          <div className="flex items-start justify-between gap-4 border-b border-[#edf1f7] bg-[linear-gradient(135deg,#ffffff,#f8fbff)] px-5 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Output</p>
              <h3 className="mt-1 truncate text-xl font-black text-[#11143a]">{latestRun ? latestRun.scriptName : "No run selected"}</h3>
              {latestRun ? <p className="mt-2 text-xs font-bold text-[#74809a]">{latestRun.command}</p> : null}
            </div>
            {selectedRun?.status === "RUNNING" || selectedRun?.status === "QUEUED" ? (
              <button
                type="button"
                onClick={() => void cancelRun()}
                disabled={!canRun}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ffd2d2] bg-[#fff6f6] px-3 text-sm font-black text-[#a41414] transition hover:bg-[#ffecec] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Ban size={16} />
                Cancel
              </button>
            ) : null}
          </div>

          <div className="border-b border-[#edf1f7] px-5 py-4">
            {latestRun ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Status" value={<StatusBadge status={latestRun.status} />} />
                <Info label="Exit" value={latestRun.exitCode === null ? "—" : latestRun.exitCode} />
                <Info label="Duration" value={formatDuration(latestRun.durationMs)} />
              </div>
            ) : (
              <p className="text-sm font-semibold text-[#74809a]">Select a run to inspect its output.</p>
            )}
          </div>

          <pre className="max-h-[560px] min-h-[320px] overflow-auto bg-[#0d1020] p-5 text-xs font-semibold leading-6 text-[#d9e2ff]">
            {selectedRun?.output?.trim() || (latestRun ? "Loading captured output..." : "No output yet.")}
          </pre>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "blue" | "amber" | "green" | "red" }) {
  const tones = {
    blue: "border-[#cfe0ff] bg-[#f3f7ff] text-[#2442a7]",
    amber: "border-[#ffe4ad] bg-[#fff9ea] text-[#9b5b05]",
    green: "border-[#c8f4df] bg-[#effcf5] text-[#08764a]",
    red: "border-[#ffd0d0] bg-[#fff4f4] text-[#a41414]",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.04em]">{label}</span>
        <Icon size={17} />
      </div>
      <p className="mt-2 text-2xl font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#63708a]">{label}</p>
      <div className="mt-1 text-sm font-black text-[#11143a]">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: QaRunStatus }) {
  const tone = {
    QUEUED: "border-[#dfe8f6] bg-[#f7f9fd] text-[#4d5b75]",
    RUNNING: "border-[#ffe4ad] bg-[#fff9ea] text-[#9b5b05]",
    PASSED: "border-[#c8f4df] bg-[#effcf5] text-[#08764a]",
    FAILED: "border-[#ffd0d0] bg-[#fff4f4] text-[#a41414]",
    CANCELLED: "border-[#dfe8f6] bg-[#f7f9fd] text-[#63708a]",
  } satisfies Record<QaRunStatus, string>;
  const Icon = status === "PASSED" ? CheckCircle2 : status === "FAILED" ? XCircle : status === "RUNNING" ? RefreshCw : CircleDashed;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black uppercase ${tone[status]}`}>
      <Icon size={14} className={status === "RUNNING" ? "animate-spin" : ""} />
      {status.toLowerCase()}
    </span>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "blue" | "purple" }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black uppercase ${
        tone === "blue" ? "border-[#cfe0ff] bg-[#f3f7ff] text-[#2442a7]" : "border-[#decfff] bg-[#f7f2ff] text-[#3418b8]"
      }`}
    >
      {children}
    </span>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (value === null) return "—";
  if (value < 1000) return `${value}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}
