"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArchiveX,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  FileClock,
  FileText,
  Loader2,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { DocumentRecord, DocumentVerificationStatus, DocumentVersion } from "@/lib/documents/types";

type DocumentPermissions = {
  canWriteDocuments: boolean;
  canVerifyDocuments: boolean;
};

type DocumentVersionUploadIntent = {
  provider: "external" | "local" | "s3";
  method: "PUT";
  uploadUrl: string;
  fileUrl: string;
  objectKey: string;
  expiresAt: string;
  headers: Record<string, string>;
  version: {
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    sizeBytes?: number;
    checksum?: string;
    setCurrent?: boolean;
    metadata?: Record<string, unknown>;
  };
};

export function DocumentVersionPanel({
  document,
  versions,
  permissions,
}: {
  document: DocumentRecord;
  versions: DocumentVersion[] | null;
  permissions: DocumentPermissions;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [mimeType, setMimeType] = useState("application/pdf");
  const [sizeBytes, setSizeBytes] = useState("");
  const [checksum, setChecksum] = useState("");
  const [setCurrent, setSetCurrent] = useState(true);
  const [verificationNote, setVerificationNote] = useState("");
  const [storageBaseUrl, setStorageBaseUrl] = useState("/uploads/documents");
  const [preparedObjectKey, setPreparedObjectKey] = useState("");
  const [isHashing, setIsHashing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const versionRows = versions ?? document.versions ?? [];
  const busy = Boolean(pending);

  async function addVersion() {
    setPending(selectedFile ? "upload" : "version");
    setMessage(null);

    try {
      if (selectedFile) {
        const intent = await apiFetch<DocumentVersionUploadIntent>(`/documents/${document.id}/versions/upload-intent`, {
          method: "POST",
          body: JSON.stringify(
            compactPayload({
              fileName,
              mimeType,
              sizeBytes: sizeBytes ? Number(sizeBytes) : undefined,
              checksum,
              setCurrent,
              metadata: {
                source: "timesync-browser-upload",
              },
            }),
          ),
        });

        await uploadFileWithIntent(intent, selectedFile, mimeType);

        await apiFetch(`/documents/${document.id}/versions`, {
          method: "POST",
          body: JSON.stringify(intent.version),
        });
      } else {
        await apiFetch(`/documents/${document.id}/versions`, {
          method: "POST",
          body: JSON.stringify(
            compactPayload({
              fileName,
              fileUrl,
              mimeType,
              sizeBytes: sizeBytes ? Number(sizeBytes) : undefined,
              checksum,
              setCurrent,
            }),
          ),
        });
      }

      setFileName("");
      setFileUrl("");
      setSizeBytes("");
      setChecksum("");
      setPreparedObjectKey("");
      setSelectedFile(null);
      setMessage({ type: "success", text: selectedFile ? "File uploaded and immutable version registered." : "New immutable document version registered." });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function prepareSelectedFile(file: File | undefined) {
    if (!file) return;

    const objectKey = `${document.id}/${Date.now()}-${safeFileName(file.name)}`;
    const preparedUrl = buildStorageUrl(storageBaseUrl, objectKey);

    setSelectedFile(file);
    setPreparedObjectKey(objectKey);
    setFileName(file.name);
    setFileUrl(preparedUrl);
    setMimeType(file.type || "application/octet-stream");
    setSizeBytes(String(file.size));
    setChecksum("");
    setIsHashing(true);

    try {
      setChecksum(await sha256Checksum(file));
    } catch {
      setMessage({ type: "error", text: "Could not generate file checksum in this browser session." });
    } finally {
      setIsHashing(false);
    }
  }

  async function setCurrentVersion(version: DocumentVersion) {
    setPending(`current-${version.id}`);
    setMessage(null);

    try {
      await apiFetch(`/documents/${document.id}/versions/${version.id}/current`, { method: "POST" });
      setMessage({ type: "success", text: `Version ${version.versionNo} is now current.` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function verificationAction(action: "request-verification" | "verify" | "reject" | "expire") {
    setPending(action);
    setMessage(null);

    try {
      await apiFetch(`/documents/${document.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(compactPayload({ note: verificationNote })),
      });
      setVerificationNote("");
      setMessage({ type: "success", text: `Document ${humanize(action)} completed.` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
      <div className="grid gap-5 border-b border-[#e5ebf5] p-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
              Document workspace
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(document.verificationStatus)}`}>
              {humanize(document.verificationStatus)}
            </span>
          </div>
          <h3 className="mt-4 max-w-3xl text-2xl font-extrabold text-[#10143f]">{document.title}</h3>
          <p className="mt-2 text-sm font-bold text-[#66708a]">
            {document.documentType?.name ?? "Unclassified"} · {humanize(document.visibility)}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6782]">
            Register immutable file versions, choose the current compliance copy, and move verification state through the
            document governance workflow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <MiniFact icon={FileText} label="Owner" value={document.employee ? employeeName(document.employee) : "Tenant document"} />
          <MiniFact icon={FileClock} label="Expires" value={formatDate(document.expiresAt)} />
          <MiniFact icon={ShieldCheck} label="Versions" value={`${versionRows.length} stored`} />
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Immutable version intake</p>
                <h4 className="mt-1 text-lg font-extrabold text-[#121a46]">Register document file</h4>
              </div>
              <UploadCloud size={20} className="text-[#6b7590]" aria-hidden="true" />
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-[#b9c7e5] bg-white p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-black uppercase text-[#69738c]">Select local file</span>
                  <input
                    type="file"
                    onChange={(event) => prepareSelectedFile(event.currentTarget.files?.[0])}
                    className="block h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] file:mr-3 file:rounded-md file:border-0 file:bg-[#ece9ff] file:px-3 file:py-1.5 file:text-[12px] file:font-black file:text-[#3820d7]"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-black uppercase text-[#69738c]">Storage base URL</span>
                  <input
                    value={storageBaseUrl}
                    onChange={(event) => setStorageBaseUrl(event.target.value)}
                    placeholder="/uploads/documents"
                    className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <StorageFact label="Object key" value={preparedObjectKey || "Generated after file selection"} />
                <StorageFact label="Checksum" value={isHashing ? "Generating SHA-256..." : checksum || "Optional"} />
                <StorageFact label="Strategy" value="Local or S3/R2 upload intent" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">File name</span>
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="employment-contract-v2.pdf"
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">MIME type</span>
                <input
                  value={mimeType}
                  onChange={(event) => setMimeType(event.target.value)}
                  placeholder="application/pdf"
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                />
              </label>
            </div>
            <label className="mt-3 grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">File URL</span>
              <input
                value={fileUrl}
                onChange={(event) => setFileUrl(event.target.value)}
                placeholder="https://storage.example.com/documents/file.pdf"
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
              />
            </label>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Size bytes</span>
                <input
                  type="number"
                  min={0}
                  value={sizeBytes}
                  onChange={(event) => setSizeBytes(event.target.value)}
                  placeholder="245760"
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Checksum</span>
                <input
                  value={checksum}
                  onChange={(event) => setChecksum(event.target.value)}
                  placeholder="sha256:abc123"
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-bold text-[#4d566d]">
                <input type="checkbox" checked={setCurrent} onChange={(event) => setSetCurrent(event.target.checked)} />
                Set as current version
              </label>
              <button
                type="button"
                disabled={!permissions.canWriteDocuments || busy || !fileName.trim() || !fileUrl.trim()}
                onClick={addVersion}
                className="ml-auto inline-flex h-11 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending === "version" || pending === "upload" ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                {selectedFile ? "Upload & register" : "Register version"}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-[#e3e9f4] bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Verification controls</p>
                <h4 className="mt-1 text-lg font-extrabold text-[#121a46]">Compliance review</h4>
              </div>
              <BadgeCheck size={20} className="text-[#6b7590]" aria-hidden="true" />
            </div>
            <label className="mt-4 grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Review note</span>
              <input
                value={verificationNote}
                onChange={(event) => setVerificationNote(event.target.value)}
                placeholder="Verified against original document"
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
              />
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <ReviewButton
                label="Request"
                disabled={!permissions.canWriteDocuments || busy}
                pending={pending === "request-verification"}
                onClick={() => verificationAction("request-verification")}
              />
              <ReviewButton
                label="Verify"
                disabled={!permissions.canVerifyDocuments || busy || !document.currentVersionId}
                pending={pending === "verify"}
                onClick={() => verificationAction("verify")}
              />
              <ReviewButton
                label="Reject"
                disabled={!permissions.canVerifyDocuments || busy}
                pending={pending === "reject"}
                onClick={() => verificationAction("reject")}
              />
              <ReviewButton
                label="Expire"
                disabled={!permissions.canVerifyDocuments || busy}
                pending={pending === "expire"}
                onClick={() => verificationAction("expire")}
              />
            </div>
            {message ? (
              <div
                className={`mt-4 rounded-lg px-3 py-2 text-sm font-bold ${
                  message.type === "success" ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#fff5f5] text-[#b42318]"
                }`}
              >
                {message.text}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-white/58">Version ledger</p>
              <h4 className="mt-1 text-lg font-extrabold">{versionRows.length} immutable files</h4>
            </div>
            <FileClock size={20} className="text-white/54" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {versionRows.length > 0 ? (
              versionRows.map((version) => {
                const isCurrent = document.currentVersionId === version.id;

                return (
                  <div key={version.id} className="rounded-lg border border-white/10 bg-white/8 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          v{version.versionNo} · {version.fileName}
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-white/58">
                          {version.mimeType ?? "file"} · {formatSize(version.sizeBytes)} · {formatDate(version.createdAt)}
                        </p>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full bg-[#36d399]/18 px-2 py-1 text-[9px] font-black uppercase text-[#8ff2cf]">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={fileHref(version.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[11px] font-black text-white/78"
                      >
                        Open file
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                      {!isCurrent ? (
                        <button
                          type="button"
                          disabled={!permissions.canWriteDocuments || busy}
                          onClick={() => setCurrentVersion(version)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[11px] font-black text-white/78 disabled:opacity-45"
                        >
                          {pending === `current-${version.id}` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Set current
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm leading-6 text-white/64">No versions registered. Add a file URL to make the document verifiable.</p>
            )}
          </div>
          <Link
            href="/documents"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-white/16 px-4 text-[12px] font-black text-white/78"
          >
            <X size={14} aria-hidden="true" />
            Close workspace
          </Link>
        </aside>
      </div>
    </section>
  );
}

function MiniFact({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-[#8a92a6]">{label}</p>
          <p className="mt-1 truncate text-sm font-black text-[#121a46]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StorageFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-[#f8fbff] p-3">
      <p className="text-[9px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 truncate text-[12px] font-black text-[#121a46]">{value}</p>
    </div>
  );
}

function ReviewButton({
  label,
  disabled,
  pending,
  onClick,
}: {
  label: string;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[11px] font-black text-[#4d566d] transition hover:bg-[#f7f9fd] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <ArchiveX size={14} />}
      {label}
    </button>
  );
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
}

function buildStorageUrl(baseUrl: string, objectKey: string) {
  const cleanBase = baseUrl.trim() || "/uploads/documents";

  try {
    if (cleanBase.startsWith("http://") || cleanBase.startsWith("https://")) {
      return new URL(objectKey, cleanBase.endsWith("/") ? cleanBase : `${cleanBase}/`).toString();
    }

    const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const normalizedBase = cleanBase.startsWith("/") ? cleanBase : `/${cleanBase}`;
    return `${origin}${normalizedBase.replace(/\/+$/, "")}/${objectKey}`;
  } catch {
    return objectKey;
  }
}

function safeFileName(fileName: string) {
  const cleaned = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "document-file";
}

async function sha256Checksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const bytes = Array.from(new Uint8Array(digest));
  return `sha256:${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function uploadFileWithIntent(intent: DocumentVersionUploadIntent, file: File, mimeType: string) {
  const headers = new Headers(intent.headers);

  if (!headers.has("content-type")) {
    headers.set("content-type", mimeType || file.type || "application/octet-stream");
  }

  const response = await fetch(uploadUrl(intent.uploadUrl), {
    method: intent.method,
    headers,
    body: file,
    credentials: intent.provider === "local" ? "include" : "omit",
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }
}

function uploadUrl(value: string) {
  if (value.startsWith("/api/v1/")) {
    return `/api/backend/${value.slice("/api/v1/".length)}`;
  }

  return value;
}

function fileHref(value: string) {
  if (value.startsWith("/api/v1/")) {
    return `/api/backend/${value.slice("/api/v1/".length)}`;
  }

  return value;
}

function employeeName(employee: NonNullable<DocumentRecord["employee"]>) {
  return employee.person.preferredName || [employee.person.firstName, employee.person.middleName, employee.person.lastName].filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not set";
}

function formatSize(value?: number | null) {
  if (!value) return "Size unknown";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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
  return value
    .toLowerCase()
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Document action could not be completed.";
}
