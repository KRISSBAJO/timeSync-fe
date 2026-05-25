import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CirclePlus,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  Search,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { DocumentVersionPanel } from "@/components/documents/document-version-panel";
import type {
  DocumentCompliance,
  DocumentRecord,
  DocumentVerificationStatus,
  DocumentVersion,
  DocumentVisibility,
  PaginatedDocumentTypes,
  PaginatedDocuments,
} from "@/lib/documents/types";

type DocumentFilters = {
  search: string;
  verificationStatus: string;
  visibility: string;
  expiredOnly: string;
};

const verificationStatuses: Array<{ label: string; value: "" | DocumentVerificationStatus }> = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Verified", value: "VERIFIED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Not required", value: "NOT_REQUIRED" },
];

const visibilityOptions: Array<{ label: string; value: "" | DocumentVisibility }> = [
  { label: "All visibility", value: "" },
  { label: "HR only", value: "HR_ONLY" },
  { label: "Employee", value: "EMPLOYEE_VISIBLE" },
  { label: "Manager", value: "MANAGER_VISIBLE" },
  { label: "Private", value: "PRIVATE" },
  { label: "Internal public", value: "PUBLIC_INTERNAL" },
];

export function DocumentComplianceCenter({
  documents,
  compliance,
  expiring,
  documentTypes,
  selectedDocument,
  selectedVersions,
  filters,
  permissions,
}: {
  documents: PaginatedDocuments | null;
  compliance: DocumentCompliance | null;
  expiring: DocumentRecord[] | null;
  documentTypes: PaginatedDocumentTypes | null;
  selectedDocument: DocumentRecord | null;
  selectedVersions: DocumentVersion[] | null;
  filters: DocumentFilters;
  permissions: {
    canWriteDocuments: boolean;
    canVerifyDocuments: boolean;
  };
}) {
  const rows = documents?.data ?? [];
  const expiringRows = expiring ?? [];
  const issueRows = compliance?.issues ?? [];
  const byStatus = compliance?.byVerificationStatus ?? {};

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Document control
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <ShieldCheck size={13} aria-hidden="true" />
                Document compliance
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.45rem,2.4vw,2.2rem)] font-extrabold leading-tight tracking-normal text-[#10143f]">
              Compliance documents, immutable versions, expiry risk, and verification queues.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Track employee files, required document types, version coverage, verification status, and expiry exposure from one governed workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <TopAction href="/documents?panel=create" icon={CirclePlus} label="Add Document" primary />
            <TopAction href="/documents?panel=version" icon={UploadCloud} label="Upload Version" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DocMetric label="Documents" value={compliance?.totalDocuments ?? rows.length} icon={FileText} tone="blue" />
          <DocMetric label="Expiring soon" value={compliance?.expiringSoon ?? expiringRows.length} icon={Clock3} tone="amber" />
          <DocMetric label="Expired" value={compliance?.expiredDocuments ?? 0} icon={AlertTriangle} tone="red" />
          <DocMetric label="Missing versions" value={compliance?.missingCurrentVersion ?? 0} icon={FileCheck2} tone="violet" />
        </div>
      </section>

      {selectedDocument ? (
        <DocumentVersionPanel document={selectedDocument} versions={selectedVersions} permissions={permissions} />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
          <div className="border-b border-[#e5ebf5] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Document registry</p>
                <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Files under compliance control</h3>
              </div>
              <form action="/documents" className="grid gap-2 sm:grid-cols-[1fr_170px_170px_auto] xl:w-[760px]">
                <label className="flex h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[13px] font-semibold text-[#7b8195]">
                  <Search size={16} aria-hidden="true" />
                  <input
                    name="search"
                    defaultValue={filters.search}
                    placeholder="Search title, type, employee"
                    className="min-w-0 flex-1 bg-transparent text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  />
                </label>
                <select
                  name="verificationStatus"
                  defaultValue={filters.verificationStatus}
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
                >
                  {verificationStatuses.map((status) => (
                    <option key={status.value || "all"} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <select
                  name="visibility"
                  defaultValue={filters.visibility}
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
                >
                  {visibilityOptions.map((visibility) => (
                    <option key={visibility.value || "all"} value={visibility.value}>
                      {visibility.label}
                    </option>
                  ))}
                </select>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white">
                  <Filter size={15} aria-hidden="true" />
                  Apply
                </button>
              </form>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {verificationStatuses.map((status) => (
                <Link
                  key={status.value || "all"}
                  href={statusHref(filters, status.value)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-black transition ${
                    filters.verificationStatus === status.value
                      ? "border-[#3820d7] bg-[#3820d7] text-white"
                      : "border-[#dfe6f1] bg-white text-[#596277] hover:bg-[#f7f9fd]"
                  }`}
                >
                  {status.label}
                  <span className={filters.verificationStatus === status.value ? "ml-2 text-white/70" : "ml-2 text-[#9aa3b6]"}>
                    {status.value ? byStatus[status.value] ?? 0 : compliance?.totalDocuments ?? rows.length}
                  </span>
                </Link>
              ))}
              <Link href="/documents?expiredOnly=true" className="shrink-0 rounded-full border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-[11px] font-black text-[#b42318]">
                Expired only
              </Link>
            </div>
          </div>

          <DocumentTable rows={rows} />
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
            <p className="text-[11px] font-extrabold uppercase text-white/58">Compliance issues</p>
            <h3 className="mt-2 text-lg font-extrabold">{issueRows.length} active issues</h3>
            <div className="mt-5 space-y-3">
              {issueRows.length > 0 ? (
                issueRows.slice(0, 6).map((issue) => (
                  <div key={issue.document.id} className="rounded-lg border border-white/10 bg-white/8 p-4">
                    <p className="truncate text-sm font-black">{issue.document.title}</p>
                    <p className="mt-1 truncate text-[12px] font-semibold text-white/58">
                      {issue.issueCodes.map(humanize).join(", ")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-white/64">No compliance exceptions returned.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Expiry radar</p>
            <div className="mt-4 space-y-2">
              {expiringRows.length > 0 ? (
                expiringRows.slice(0, 7).map((document) => (
                  <div key={document.id} className="rounded-lg bg-[#fff8ed] px-3 py-3">
                    <p className="truncate text-sm font-black text-[#151936]">{document.title}</p>
                    <p className="mt-1 text-[12px] font-black text-[#b66b00]">Expires {formatDate(document.expiresAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#68748c]">No documents are expiring in the configured window.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Document type catalog</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniFact label="Types" value={documentTypes?.data.length ?? 0} />
              <MiniFact label="No docs" value={compliance?.employeesWithoutDocuments ?? 0} />
              <MiniFact label="Pending" value={byStatus.PENDING ?? 0} />
              <MiniFact label="Verified" value={byStatus.VERIFIED ?? 0} />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function DocumentTable({ rows }: { rows: DocumentRecord[] }) {
  if (rows.length === 0) {
    return (
      <div className="grid min-h-[340px] place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#eef5ff] text-[#2f6eea]">
            <FileText size={30} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-extrabold text-[#121a46]">No documents found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
            Add contracts, IDs, certifications, work permits, and policy records to begin compliance tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#8a92a6]">
            <th className="border-b border-[#e5ebf5] px-5 py-3">Document</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Owner</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Verification</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Version</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Expiry</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((document) => (
            <tr key={document.id}>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <p className="truncate text-sm font-black text-[#151936]">{document.title}</p>
                <p className="mt-1 truncate text-[12px] font-semibold text-[#7a8297]">
                  {document.documentType?.name ?? "Unclassified"} · {humanize(document.visibility)}
                </p>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                {document.employee ? employeeName(document.employee) : "Tenant document"}
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <StatusPill status={document.verificationStatus} />
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                {document.currentVersion ? `v${document.currentVersion.versionNo}` : "Missing"}
                <p className="mt-1 text-[12px] font-semibold text-[#8a92a6]">{document._count?.versions ?? 0} total</p>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                {formatDate(document.expiresAt)}
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-right">
                <Link href={`/documents?document=${document.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#3820d7]">
                  Open
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocMetric({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: LucideIcon; tone: "blue" | "green" | "amber" | "red" | "violet" }) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    green: "bg-[#eaf9f2] text-[#0f9f72]",
    amber: "bg-[#fff4db] text-[#d97706]",
    red: "bg-[#fff5f5] text-[#b42318]",
    violet: "bg-[#f1ebff] text-[#7c3aed]",
  }[tone];

  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
          <p className="mt-3 text-2xl font-extrabold text-[#121a46]">{value}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-lg ${toneClass}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function TopAction({ href, icon: Icon, label, primary = false }: { href: string; icon: LucideIcon; label: string; primary?: boolean }) {
  return (
    <Link href={href} className={primary ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white! shadow-[0_12px_26px_rgba(56,32,215,0.18)]" : "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d]"}>
      <Icon size={15} aria-hidden="true" />
      {label}
    </Link>
  );
}

function StatusPill({ status }: { status: DocumentVerificationStatus }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(status)}`}>{humanize(status)}</span>;
}

function MiniFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[#f8fbff] p-3">
      <p className="text-[10px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#121a46]">{value}</p>
    </div>
  );
}

function employeeName(employee: NonNullable<DocumentRecord["employee"]>) {
  return employee.person.preferredName || [employee.person.firstName, employee.person.middleName, employee.person.lastName].filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not set";
}

function statusHref(filters: DocumentFilters, status: string) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (status) params.set("verificationStatus", status);
  if (filters.visibility) params.set("visibility", filters.visibility);
  const query = params.toString();
  return query ? `/documents?${query}` : "/documents";
}

function statusClass(status: DocumentVerificationStatus) {
  const classes: Record<DocumentVerificationStatus, string> = {
    NOT_REQUIRED: "bg-[#f3f4f8] text-[#596277]",
    PENDING: "bg-[#fff4db] text-[#b66b00]",
    VERIFIED: "bg-[#eaf9f2] text-[#0f8f66]",
    REJECTED: "bg-[#fff5f5] text-[#b42318]",
    EXPIRED: "bg-[#fff5f5] text-[#b42318]",
  };
  return classes[status];
}

function humanize(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
