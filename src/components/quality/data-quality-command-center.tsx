import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  FileWarning,
  Gauge,
  ShieldAlert,
} from "lucide-react";

import { QualityRemediationActions } from "@/components/quality/quality-remediation-actions";
import type { DataQualityDashboard, DataQualityGroup, QualitySeverity } from "@/lib/quality/types";

const severityClass: Record<QualitySeverity, string> = {
  critical: "bg-[#fff1f1] text-[#b42318] border-[#ffd5d5]",
  high: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]",
  medium: "bg-[#fff8db] text-[#a16207] border-[#fde68a]",
  low: "bg-[#eef5ff] text-[#2f6eea] border-[#d8e7ff]",
};

const groupIcon = {
  WORKFORCE_DATA: DatabaseZap,
  DOCUMENT_COMPLIANCE: FileWarning,
  POSITION_CONTROL: Gauge,
  APPROVAL_SLA: ShieldAlert,
  IAM_GOVERNANCE: ShieldAlert,
  EVENT_GOVERNANCE: DatabaseZap,
};

export function DataQualityCommandCenter({ quality }: { quality: DataQualityDashboard | null }) {
  const groups = quality?.groups ?? [];
  const score = quality?.score ?? 100;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="relative grid gap-5 p-5 xl:grid-cols-[1fr_320px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(56,32,215,0.1),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(18,184,134,0.12),transparent_34%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Data quality command center
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-white px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <CheckCircle2 size={13} aria-hidden="true" />
                Backend governed
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.55rem,2.8vw,2.35rem)] font-extrabold leading-tight text-[#10143f]">
              Compliance, data quality, and remediation signals in one admin workspace.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Find incomplete employee records, missing assignments, expired documents, workflow SLA risks, IAM issues, and event publishing problems before they become operational noise.
            </p>
          </div>

          <div className="relative rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/48">Quality score</p>
            <p className="mt-3 text-5xl font-black">{score}%</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-[#36d399]"
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-white/58">
              Generated {quality?.generatedAt ? new Date(quality.generatedAt).toLocaleString() : "from current tenant data"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total issues" value={quality?.summary.totalIssues ?? 0} />
        <SummaryCard label="Critical" value={quality?.summary.critical ?? 0} severity="critical" />
        <SummaryCard label="High" value={quality?.summary.high ?? 0} severity="high" />
        <SummaryCard label="Medium" value={quality?.summary.medium ?? 0} severity="medium" />
        <SummaryCard label="Low" value={quality?.summary.low ?? 0} severity="low" />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5 xl:grid-cols-2">
          {groups.length > 0 ? (
            groups.map((group) => <QualityGroupCard key={group.code} group={group} />)
          ) : (
            <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-white p-8 text-center xl:col-span-2">
              <CheckCircle2 className="mx-auto text-[#0f9f72]" size={34} aria-hidden="true" />
              <h3 className="mt-4 text-xl font-extrabold text-[#121a46]">No data quality issues returned</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#68748c]">
                The current quality scan did not report workforce, document, workflow, IAM, or event issues.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Recommended actions</p>
            <div className="mt-4 space-y-2">
              {(quality?.recommendedActions ?? []).length > 0 ? (
                quality?.recommendedActions.map((action) => (
                  <div key={action} className="rounded-lg bg-[#f8fbff] p-3 text-sm font-bold leading-6 text-[#4d566d]">
                    {action}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#68748c]">No remediation actions are currently required.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
            <p className="text-[11px] font-extrabold uppercase text-white/58">Operating model</p>
            <h3 className="mt-2 text-lg font-extrabold">Quality gates now exist</h3>
            <p className="mt-3 text-sm leading-6 text-white/66">
              This workspace is fed by tenant-scoped checks, so future payroll, attendance, leave, and intelligence modules can reuse the same quality signal pattern.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  severity,
}: {
  label: string;
  value: number;
  severity?: QualitySeverity;
}) {
  return (
    <article className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <p className="text-[11px] font-extrabold uppercase text-[#68748c]">{label}</p>
      <p className={`mt-3 text-2xl font-extrabold ${severity ? severityClass[severity].split(" ")[1] : "text-[#121a46]"}`}>
        {value}
      </p>
    </article>
  );
}

function QualityGroupCard({ group }: { group: DataQualityGroup }) {
  const Icon = groupIcon[group.code as keyof typeof groupIcon] ?? AlertTriangle;

  return (
    <article className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#3820d7]">
            <Icon size={19} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-extrabold text-[#121a46]">{group.title}</h3>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a8297]">{group.description}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#f0f3f8] px-3 py-1 text-[10px] font-black uppercase text-[#68748c]">
          {group.issueCount} issues
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {group.metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg bg-[#f8fbff] p-3">
            <p className="text-[9px] font-black uppercase text-[#8a92a6]">{metric.label}</p>
            <p className="mt-1 text-lg font-black text-[#10143f]">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
        {group.issues.length > 0 ? (
          group.issues.map((issue) => (
            <article
              key={issue.id}
              className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3 transition hover:border-[#cbd5e8] hover:bg-white"
            >
              <div className="flex items-start gap-3">
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${severityClass[issue.severity]}`}>
                  {issue.severity}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[#10143f]">{issue.title}</span>
                  <span className="mt-1 block text-[12px] font-semibold leading-5 text-[#68748c]">
                    {issue.description}
                  </span>
                </span>
                <Link
                  href={issue.href}
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dfe8f6] bg-white text-[#9aa2b3] transition hover:translate-x-0.5 hover:text-[#3820d7]"
                  aria-label={`Open ${issue.title}`}
                >
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <QualityRemediationActions issue={issue} />
            </article>
          ))
        ) : (
          <p className="rounded-lg bg-[#f8fbff] p-4 text-sm leading-6 text-[#68748c]">
            No issues in this quality group.
          </p>
        )}
      </div>
    </article>
  );
}
