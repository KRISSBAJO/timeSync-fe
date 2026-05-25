"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, History, Loader2, RotateCcw, Send, UploadCloud } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { EmployeeImportBatch } from "@/lib/workforce/types";

type WorkforceFilters = {
  search: string;
  status: string;
  employmentType: string;
};

type EmployeeImportPreview = {
  dryRun: boolean;
  rows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{ line: number; message: string }>;
  preview: Array<{
    line: number;
    valid: boolean;
    errors: string[];
    normalized: Record<string, unknown>;
  }>;
  acceptedHeaders: string[];
};

type EmployeeImportCommitResult = {
  committed: boolean;
  queued?: boolean;
  batchId: string;
  jobId?: string;
  status?: EmployeeImportBatch["status"];
  rows: number;
  processed?: number;
  created: number;
  failed?: number;
  skipped: number;
  employees: Array<{
    line: number;
    id: string;
    employeeNumber: string;
    status: string;
  }>;
};

type OperationError = {
  title: string;
  message: string;
} | null;

const EMPLOYEE_IMPORT_TEMPLATE_HEADERS = [
  "employeeNumber",
  "firstName",
  "middleName",
  "lastName",
  "preferredName",
  "email",
  "employmentType",
  "status",
  "hireDate",
  "source",
];

const EMPLOYEE_IMPORT_TEMPLATE_CSV = [
  EMPLOYEE_IMPORT_TEMPLATE_HEADERS.join(","),
  [
    "",
    "Ada",
    "",
    "Byron",
    "Ada",
    "ada.byron@example.com",
    "FULL_TIME",
    "PREBOARDING",
    "2026-06-01",
    "CSV_IMPORT",
  ].join(","),
  [
    "",
    "Grace",
    "B",
    "Hopper",
    "Grace",
    "grace.hopper@example.com",
    "CONTRACT",
    "ACTIVE",
    "2026-06-15",
    "CSV_IMPORT",
  ].join(","),
].join("\n");

export function BulkWorkforceTools({
  filters,
  canImport,
  importBatches,
}: {
  filters: WorkforceFilters;
  canImport: boolean;
  importBatches: EmployeeImportBatch[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [csv, setCsv] = useState("");
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rollingBackBatchId, setRollingBackBatchId] = useState<string | null>(null);
  const [error, setError] = useState<OperationError>(null);
  const [rollbackMessage, setRollbackMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmployeeImportPreview | null>(null);
  const [commitResult, setCommitResult] = useState<EmployeeImportCommitResult | null>(null);

  useEffect(() => {
    const batchId = commitResult?.batchId;

    if (!batchId || !isImportRunning(commitResult.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const batch = await apiFetch<EmployeeImportBatch>(`/employees/import-batches/${batchId}`);

          setCommitResult((current) =>
            current?.batchId === batchId
              ? {
                  ...current,
                  status: batch.status ?? current.status,
                  processed: batch.processed ?? current.processed,
                  created: batch.created,
                  failed: batch.failed ?? current.failed,
                  skipped: batch.skipped ?? current.skipped,
                  committed: batch.status === "COMPLETED" || batch.status === "PARTIAL",
                }
              : current,
          );

          if (!isImportRunning(batch.status)) {
            router.refresh();
          }
        } catch {
          // The next poll will retry; visible errors are reserved for explicit user actions.
        }
      })();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [commitResult?.batchId, commitResult?.status, router]);

  async function exportCsv() {
    setExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filters.search) params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.employmentType) params.set("employmentType", filters.employmentType);

      const response = await fetch(`/api/backend/employees/export.csv?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "timesync-employees.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError({
        title: "Export failed",
        message: caught instanceof Error ? caught.message : "Could not export employees.",
      });
    } finally {
      setExporting(false);
    }
  }

  function downloadTemplate() {
    downloadCsv("timesync-employee-import-template.csv", EMPLOYEE_IMPORT_TEMPLATE_CSV);
  }

  function useTemplate() {
    setError(null);
    setPreview(null);
    setCommitResult(null);
    setCsv(EMPLOYEE_IMPORT_TEMPLATE_CSV);
  }

  async function loadFile(file?: File) {
    if (!file) {
      return;
    }

    setError(null);
    setPreview(null);
    setCommitResult(null);
    setCsv(await file.text());
  }

  async function previewImport() {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setCommitResult(null);

    try {
      const result = await apiFetch<EmployeeImportPreview>("/employees/import-preview", {
        method: "POST",
        body: JSON.stringify({ csv, dryRun: true }),
      });
      setPreview(result);
    } catch (caught) {
      setError({
        title: "Import preview failed",
        message: caught instanceof Error ? caught.message : "Could not preview import.",
      });
    } finally {
      setPreviewing(false);
    }
  }

  async function commitImport() {
    if (!preview || preview.invalidRows > 0) {
      return;
    }

    setCommitting(true);
    setError(null);
    setCommitResult(null);

    try {
      const result = await apiFetch<EmployeeImportCommitResult>("/employees/import-commit", {
        method: "POST",
        body: JSON.stringify({
          csv,
          metadata: {
            committedFrom: "workforce_bulk_tools",
          },
        }),
      });
      setCommitResult(result);
      setRollbackMessage(null);
      router.refresh();
    } catch (caught) {
      setError({
        title: "Import commit failed",
        message: caught instanceof Error ? caught.message : "Could not commit import.",
      });
    } finally {
      setCommitting(false);
    }
  }

  async function rollbackBatch(batchId: string) {
    setRollingBackBatchId(batchId);
    setError(null);
    setRollbackMessage(null);

    try {
      const result = await apiFetch<{ rolledBack: number; blocked: Array<{ reason: string }> }>(
        `/employees/import-batches/${batchId}/rollback`,
        { method: "POST" },
      );
      setRollbackMessage(`Rolled back ${result.rolledBack} records${result.blocked.length ? `; ${result.blocked.length} blocked for review` : ""}.`);
      router.refresh();
    } catch (caught) {
      setError({
        title: "Rollback failed",
        message: caught instanceof Error ? caught.message : "Could not roll back this import batch.",
      });
    } finally {
      setRollingBackBatchId(null);
    }
  }

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Bulk workforce operations</p>
          <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">CSV export and governed import preview</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68748c]">
            Export the current filtered directory, or validate a workforce CSV before creating person and employment records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.18)]"
          >
            <Download size={15} aria-hidden="true" />
            Download template
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d] transition hover:bg-[#f7f9fd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
            Export current CSV
          </button>
        </div>
      </div>

      {canImport ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-[#e4eaf4] bg-[#fbfcff] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.16)] transition hover:bg-[#1e0eb8]"
              >
                <UploadCloud size={15} aria-hidden="true" />
                Choose CSV
              </button>
              <button
                type="button"
                onClick={useTemplate}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d] transition hover:bg-[#f7f9fd]"
              >
                <FileSpreadsheet size={15} aria-hidden="true" />
                Use template
              </button>
              <button
                type="button"
                onClick={previewImport}
                disabled={!csv.trim() || previewing || committing}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d] transition hover:bg-[#f7f9fd] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {previewing ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet size={15} aria-hidden="true" />}
                Preview import
              </button>
              <button
                type="button"
                onClick={commitImport}
                disabled={!preview || preview.invalidRows > 0 || preview.validRows === 0 || committing || previewing}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#11143a] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(17,20,58,0.16)] transition hover:bg-[#1e2452] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {committing ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
                Commit import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => loadFile(event.target.files?.[0])}
              />
            </div>
            <textarea
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              placeholder="employeeNumber,firstName,lastName,email,employmentType,status,hireDate"
              className="mt-4 h-36 w-full resize-none rounded-lg border border-[#d9e1ee] bg-white p-3 text-[12px] font-semibold leading-5 text-[#151936] outline-none placeholder:text-[#9ba2b5]"
            />
            <p className="mt-2 text-[11px] font-semibold text-[#7a8297]">
              Required headers: firstName, lastName, employmentType. Optional: employeeNumber, middleName, preferredName, email, status, hireDate, source. Leave employeeNumber blank to use the tenant sequence.
            </p>
          </div>

          <ImportPreviewPanel preview={preview} error={error} commitResult={commitResult} />
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-[#ffdcb5] bg-[#fff8ed] p-4">
          <p className="text-sm font-black text-[#a15c00]">Import permission required</p>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a5c34]">
            This account can export employees, but needs employees.write to validate import files.
          </p>
          {error ? <p className="mt-2 text-[12px] font-bold text-[#b42318]">{error.message}</p> : null}
        </div>
      )}

      {canImport ? (
        <ImportBatchHistory
          batches={importBatches}
          rollingBackBatchId={rollingBackBatchId}
          rollbackMessage={rollbackMessage}
          onRollback={rollbackBatch}
        />
      ) : null}
    </section>
  );
}

function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob([csv.endsWith("\n") ? csv : `${csv}\n`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ImportBatchHistory({
  batches,
  rollingBackBatchId,
  rollbackMessage,
  onRollback,
}: {
  batches: EmployeeImportBatch[];
  rollingBackBatchId: string | null;
  rollbackMessage: string | null;
  onRollback: (batchId: string) => void;
}) {
  return (
    <div className="mt-5 rounded-xl border border-[#e4eaf4] bg-[#fbfcff] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase text-[#68748c]">
            <History size={14} aria-hidden="true" />
            Import batch history
          </p>
          <p className="mt-1 text-sm font-bold text-[#121a46]">Recent governed commits and rollback controls</p>
        </div>
        {rollbackMessage ? (
          <span className="rounded-full border border-[#ccefe2] bg-[#f1fbf6] px-3 py-1 text-[11px] font-black text-[#0f9f72]">
            {rollbackMessage}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {batches.length > 0 ? (
          batches.slice(0, 6).map((batch) => (
            <article key={batch.id} className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_12px_30px_rgba(18,31,67,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[11px] font-black uppercase text-[#3820d7]">{batch.id}</p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${importStatusClass(batch.status)}`}>
                  {humanizeImportStatus(batch.status)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PreviewMetric label="Rows" value={batch.rows} />
                <PreviewMetric label="Processed" value={batch.processed ?? batch.created} />
                <PreviewMetric label="Created" value={batch.created} good />
                <PreviewMetric label="Failed" value={batch.failed ?? 0} danger={(batch.failed ?? 0) > 0} />
              </div>
              <p className="mt-3 text-[11px] font-semibold leading-5 text-[#7a8297]">
                {new Date(batch.committedAt).toLocaleString()} by {batch.committedBy?.username ?? batch.committedBy?.email ?? "system"}
              </p>
              <button
                type="button"
                onClick={() => onRollback(batch.id)}
                disabled={rollingBackBatchId === batch.id || isImportRunning(batch.status)}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#ffd5d5] bg-[#fff7f7] px-3 text-[11px] font-black text-[#b42318] transition hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rollingBackBatchId === batch.id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />}
                {isImportRunning(batch.status) ? "Processing" : "Safe rollback"}
              </button>
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-white p-4 text-sm font-semibold text-[#68748c] xl:col-span-3">
            No import batches have been committed yet.
          </p>
        )}
      </div>
    </div>
  );
}

function ImportPreviewPanel({
  preview,
  error,
  commitResult,
}: {
  preview: EmployeeImportPreview | null;
  error: OperationError;
  commitResult: EmployeeImportCommitResult | null;
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-[#ffd5d5] bg-[#fff5f5] p-4">
        <div className="flex items-center gap-2 text-[#b42318]">
          <AlertTriangle size={17} aria-hidden="true" />
          <p className="text-sm font-black">{error.title}</p>
        </div>
        <p className="mt-2 line-clamp-5 text-[12px] font-semibold leading-5 text-[#9b4c4c]">{error.message}</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="grid min-h-[250px] place-items-center rounded-xl border border-dashed border-[#dfe8f6] bg-white p-6 text-center">
        <div>
          <FileSpreadsheet className="mx-auto text-[#7a8297]" size={30} aria-hidden="true" />
          <p className="mt-3 text-sm font-black text-[#10143f]">Awaiting CSV preview</p>
          <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
            Validation results, duplicate checks, and normalized rows will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e4eaf4] bg-white p-4">
      {commitResult ? (
        <div
          className={`mb-4 rounded-xl border p-4 ${
            isImportRunning(commitResult.status)
              ? "border-[#ffe4ad] bg-[#fff8ed]"
              : "border-[#ccefe2] bg-[#f1fbf6]"
          }`}
        >
          <div className={`flex items-center gap-2 ${isImportRunning(commitResult.status) ? "text-[#b66b00]" : "text-[#0f9f72]"}`}>
            {isImportRunning(commitResult.status) ? (
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={17} aria-hidden="true" />
            )}
            <p className="text-sm font-black">
              {isImportRunning(commitResult.status) ? "Import queued for processing" : "Import completed"}
            </p>
          </div>
          <p className={`mt-2 text-[12px] font-semibold leading-5 ${isImportRunning(commitResult.status) ? "text-[#7a5c34]" : "text-[#3d7460]"}`}>
            {isImportRunning(commitResult.status)
              ? `Batch ${commitResult.batchId} is ${humanizeImportStatus(commitResult.status)}. Processed ${commitResult.processed ?? 0}/${commitResult.rows}; created ${commitResult.created}.`
              : `Created ${commitResult.created} employee records from ${commitResult.rows} validated rows. Batch ${commitResult.batchId}.`}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <PreviewMetric label="Rows" value={preview.rows} />
        <PreviewMetric label="Valid" value={preview.validRows} good />
        <PreviewMetric label="Invalid" value={preview.invalidRows} danger />
      </div>

      <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
        {preview.preview.map((row) => (
          <div
            key={row.line}
            className={`rounded-lg border p-3 ${
              row.valid ? "border-[#ccefe2] bg-[#f1fbf6]" : "border-[#ffd5d5] bg-[#fff7f7]"
            }`}
          >
            <div className="flex items-start gap-2">
              {row.valid ? (
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0f9f72]" aria-hidden="true" />
              ) : (
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#b42318]" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="truncate text-[12px] font-black text-[#10143f]">
                  Line {row.line} · {String(row.normalized.firstName ?? "")} {String(row.normalized.lastName ?? "")}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#68748c]">
                  {row.valid ? "Ready for governed import." : row.errors.join(" ")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  good = false,
  danger = false,
}: {
  label: string;
  value: number;
  good?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#f8fbff] p-3">
      <p className="text-[9px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className={`mt-1 text-xl font-black ${good ? "text-[#0f9f72]" : danger ? "text-[#b42318]" : "text-[#10143f]"}`}>
        {value}
      </p>
    </div>
  );
}

function isImportRunning(status?: EmployeeImportBatch["status"]) {
  return status === "QUEUED" || status === "PROCESSING";
}

function humanizeImportStatus(status?: EmployeeImportBatch["status"]) {
  return (status ?? "COMPLETED")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function importStatusClass(status?: EmployeeImportBatch["status"]) {
  switch (status) {
    case "QUEUED":
    case "PROCESSING":
      return "bg-[#fff4db] text-[#b66b00]";
    case "FAILED":
    case "CANCELLED":
      return "bg-[#fff5f5] text-[#b42318]";
    case "PARTIAL":
      return "bg-[#fff8ed] text-[#b66b00]";
    case "COMPLETED":
    default:
      return "bg-[#eaf9f2] text-[#0f8f66]";
  }
}
