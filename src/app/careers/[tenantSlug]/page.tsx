import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefcaseBusiness, Building2, Clock3, Search, type LucideIcon } from "lucide-react";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { tryServerApiJson } from "@/lib/api/server";
import type { PublicCareersBoard } from "@/lib/recruitment/types";

export const dynamic = "force-dynamic";

type CareersPageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CareersPage({ params, searchParams }: CareersPageProps) {
  const { tenantSlug } = await params;
  const queryParams = await searchParams;
  const search = readParam(queryParams.search);
  const query = new URLSearchParams({ limit: "50" });
  if (search) query.set("search", search);

  const board = await tryServerApiJson<PublicCareersBoard>(`/careers/${tenantSlug}?${query}`);
  if (!board) notFound();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f6f8fc]">
        <section className="border-b border-[#dfe8f6] bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-xs font-black uppercase tracking-[0.06em] text-[#25109f]">
                  <BriefcaseBusiness size={14} />
                  Public careers
                </span>
                {board.tenant.industry ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">{board.tenant.industry}</span> : null}
              </div>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-[#11143a] md:text-5xl">
                Careers at {board.tenant.name}
              </h1>
              <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-[#65708a]">
                Open roles flow directly into the hiring pipeline, where recruiters can review applications, move candidates through stages, and keep every decision auditable.
              </p>
              <form className="mt-6 flex max-w-2xl gap-2" action={`/careers/${board.tenant.slug}`}>
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a95aa]" size={18} />
                  <input name="search" defaultValue={search} className="h-12 w-full rounded-md border border-[#dfe8f6] bg-white pl-10 pr-3 text-sm font-bold outline-none focus:border-[#3820d7]" placeholder="Search open jobs" />
                </label>
                <button className="h-12 rounded-md bg-[#2b1ab8] px-5 text-sm font-black text-white">Search</button>
              </form>
            </div>
            <aside className="rounded-lg border border-[#dfe8f6] bg-[#11143a] p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-white/55">Hiring board</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric label="Open jobs" value={board.page.total} />
                <Metric label="Tenant" value={board.tenant.slug} />
              </div>
              <div className="mt-5 space-y-2 text-sm font-semibold text-white/68">
                {board.tenant.website ? <p>{board.tenant.website}</p> : null}
                {board.tenant.supportEmail ? <p>{board.tenant.supportEmail}</p> : null}
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="overflow-hidden rounded-lg border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <div className="border-b border-[#edf1f7] p-5">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">Open vacancies</p>
              <h2 className="mt-1 text-2xl font-black text-[#11143a]">{board.data.length} public role{board.data.length === 1 ? "" : "s"}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full text-left">
                <thead className="bg-[#fbfcff] text-xs font-black uppercase tracking-[0.06em] text-[#63708a]">
                  <tr>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Applications</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f7]">
                  {board.data.map((job) => (
                    <tr key={job.id} className="align-top transition hover:bg-[#fbfcff]">
                      <td className="px-5 py-4">
                        <p className="font-black text-[#11143a]">{job.title}</p>
                        <p className="mt-1 max-w-lg text-sm font-semibold leading-6 text-[#65708a]">{job.summary}</p>
                        <p className="mt-2 text-xs font-black uppercase text-[#8a95aa]">{job.requisition.code}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-[#4c5872]">{job.departmentName ?? "General"}</td>
                      <td className="px-5 py-4 text-sm font-bold text-[#4c5872]">{job.locationName ?? "Flexible"}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Chip icon={Clock3} label={humanize(job.employmentType)} />
                          <Chip icon={Building2} label={humanize(job.workMode)} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-[#11143a]">{job.requisition.applications}</td>
                      <td className="px-5 py-4">
                        <Link href={`/careers/${board.tenant.slug}/jobs/${job.slug}`} className="inline-flex h-10 items-center rounded-md bg-[#2b1ab8] px-4 text-sm font-black text-white">
                          View role
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!board.data.length ? (
                    <tr>
                      <td className="px-5 py-10 text-sm font-bold text-[#65708a]" colSpan={6}>
                        No open jobs match this search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
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
    <span className="inline-flex items-center gap-1 rounded-md border border-[#dfe8f6] bg-[#fbfcff] px-2 py-1 text-xs font-black text-[#4c5872]">
      <Icon size={13} />
      {label}
    </span>
  );
}

function humanize(value?: string | null) {
  return value ? value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Flexible";
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
