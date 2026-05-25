import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Building2, Clock3, MapPin, UsersRound, type LucideIcon } from "lucide-react";

import { PublicJobApplicationForm } from "@/components/careers/public-job-application-form";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { tryServerApiJson } from "@/lib/api/server";
import type { PublicJobDetailResponse } from "@/lib/recruitment/types";

export const dynamic = "force-dynamic";

type PublicJobPageProps = {
  params: Promise<{ tenantSlug: string; jobSlug: string }>;
};

export default async function PublicJobPage({ params }: PublicJobPageProps) {
  const { tenantSlug, jobSlug } = await params;
  const payload = await tryServerApiJson<PublicJobDetailResponse>(`/careers/${tenantSlug}/jobs/${jobSlug}`);
  if (!payload) notFound();

  const { tenant, job } = payload;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f6f8fc]">
        <section className="border-b border-[#dfe8f6] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <Link href={`/careers/${tenant.slug}`} className="inline-flex items-center gap-2 text-sm font-black text-[#3820d7]">
              <ArrowLeft size={16} />
              Back to all jobs
            </Link>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-xs font-black uppercase tracking-[0.06em] text-[#25109f]">
                    <BriefcaseBusiness size={14} />
                    {tenant.name}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">{job.requisition.code}</span>
                </div>
                <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-[#11143a] md:text-5xl">{job.title}</h1>
                <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-[#65708a]">{job.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Chip icon={MapPin} label={job.locationName ?? "Flexible"} />
                  <Chip icon={Building2} label={humanize(job.workMode)} />
                  <Chip icon={Clock3} label={humanize(job.employmentType)} />
                  <Chip icon={UsersRound} label={`${job.requisition.headcount} opening${job.requisition.headcount === 1 ? "" : "s"}`} />
                </div>
              </div>
              <aside className="rounded-lg border border-[#dfe8f6] bg-[#11143a] p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-white/55">Role snapshot</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Metric label="Applicants" value={job.requisition.applications} />
                  <Metric label="Currency" value={job.currencyCode} />
                  <Metric label="Min pay" value={formatMoney(job.salaryMinCents, job.currencyCode)} />
                  <Metric label="Max pay" value={formatMoney(job.salaryMaxCents, job.currencyCode)} />
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_440px]">
          <div className="space-y-5">
            <ContentPanel title="Role Overview" content={job.description} />
            <ContentPanel title="Requirements" content={job.requirements} />
            {job.questionSet?.questions?.length ? (
              <div className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">Application questions</p>
                <ul className="mt-3 space-y-3">
                  {job.questionSet.questions.map((question) => (
                    <li key={question.id} className="rounded-md border border-[#edf1f7] bg-[#fbfcff] p-3 text-sm font-bold text-[#4c5872]">
                      {question.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <PublicJobApplicationForm tenantSlug={tenant.slug} job={job} />
        </section>
      </main>
      <Footer />
    </>
  );
}

function ContentPanel({ title, content }: { title: string; content?: string | null }) {
  return (
    <section className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">{title}</p>
      <div className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-[#4c5872]">
        {content || "Details will be shared by the hiring team during the recruitment process."}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/8 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/45">{label}</p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-[#dfe8f6] bg-[#fbfcff] px-3 py-2 text-xs font-black text-[#4c5872]">
      <Icon size={14} />
      {label}
    </span>
  );
}

function humanize(value?: string | null) {
  return value ? value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Flexible";
}

function formatMoney(value?: number | null, currency = "USD") {
  if (!value) return "TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}
