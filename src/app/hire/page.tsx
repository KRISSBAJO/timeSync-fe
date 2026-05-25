import Image from "next/image";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  Clock3,
  FileCheck2,
  MapPin,
  Search,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { HireTinyHeader } from "@/components/hire/hire-tiny-header";
import { PublicTalentProfileForm } from "@/components/hire/public-talent-profile-form";
import { tryServerApiJson } from "@/lib/api/server";
import type { PublicHiringMarketplace, PublicMarketplaceJobSummary, PublicTalentProfilePreview } from "@/lib/recruitment/types";

export const dynamic = "force-dynamic";

type HirePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HirePage({ searchParams }: HirePageProps) {
  const params = await searchParams;
  const search = readParam(params.search);
  const location = readParam(params.location);
  const query = new URLSearchParams({ limit: "60" });

  if (search) query.set("search", search);
  if (location) query.set("location", location);

  const marketplace = await tryServerApiJson<PublicHiringMarketplace>(`/hiring?${query}`) ?? emptyMarketplace();
  const featuredJobs = marketplace.data.slice(0, 6);

  return (
    <>
      <HireTinyHeader />
      <main className="min-h-screen bg-[#f6f8fc] pb-8">
        <section className="mx-auto max-w-7xl px-4 pt-4">
          <div className="relative overflow-hidden rounded-lg bg-[#10142f] text-white shadow-[0_22px_60px_rgba(17,20,58,0.16)]">
            <Image
              src="/images/hire_hero.png"
              alt="Hiring marketplace background"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[#10142f]/18" />
            <div className="relative grid min-h-[340px] items-center gap-6 px-5 py-6 md:min-h-[360px] md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-[0.1em] text-white/70">TimeSync Hire</p>
                <h1 className="mt-3 text-4xl font-black leading-none md:text-6xl">Hire. Apply. Move faster.</h1>
                <form action="/hire" className="mt-6 grid max-w-3xl gap-2 rounded-lg border border-white/18 bg-white p-2 shadow-[0_18px_45px_rgba(0,0,0,0.22)] md:grid-cols-[1fr_190px_auto]">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a95aa]" size={18} />
                    <input name="search" defaultValue={search} className="h-11 w-full rounded-md border border-transparent bg-[#f6f8fc] pl-10 pr-3 text-sm font-bold text-[#11143a] outline-none focus:border-[#3820d7]" placeholder="Role or company" />
                  </label>
                  <label className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a95aa]" size={18} />
                    <input name="location" defaultValue={location} className="h-11 w-full rounded-md border border-transparent bg-[#f6f8fc] pl-10 pr-3 text-sm font-bold text-[#11143a] outline-none focus:border-[#3820d7]" placeholder="Location" />
                  </label>
                  <button className="h-11 rounded-md bg-[#2b1ab8] px-5 text-sm font-black text-white">Search</button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/hire/signup" className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-black text-[#1f128a]">
                    <UserRoundPlus size={16} />
                    Candidate profile
                  </Link>
                  <Link href="/careers/acme-health" className="inline-flex h-10 items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 text-sm font-black text-white">
                    <BriefcaseBusiness size={16} />
                    Sample jobs
                  </Link>
                </div>
              </div>
              <div className="relative hidden h-56 overflow-hidden rounded-lg border border-white/12 lg:block">
                <Image
                  src="/images/hire.png"
                  alt="Hiring profile and job matching visual"
                  fill
                  sizes="360px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-3 px-4 py-4 md:grid-cols-3">
          <Metric icon={BriefcaseBusiness} label="Open jobs" value={marketplace.metrics.openJobs} tone="blue" />
          <Metric icon={Building2} label="Companies hiring" value={marketplace.metrics.companies} tone="green" />
          <Metric icon={UsersRound} label="Talent profiles" value={marketplace.metrics.talentProfiles} tone="violet" />
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <div id="jobs" className="overflow-hidden rounded-lg border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#edf1f7] p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">Marketplace jobs</p>
                  <h2 className="mt-1 text-2xl font-black text-[#11143a]">Public openings from tenant career boards</h2>
                </div>
                <Link href="/careers/acme-health" className="inline-flex h-10 items-center rounded-md border border-[#dfe8f6] px-4 text-sm font-black text-[#3820d7]">
                  View sample board
                </Link>
              </div>
              <JobTable jobs={marketplace.data} />
            </div>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {featuredJobs.map((job) => (
                <article key={job.id} className="rounded-lg border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_35px_rgba(18,31,67,0.05)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{job.tenant.name}</p>
                  <h3 className="mt-2 text-lg font-black text-[#11143a]">{job.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#65708a]">{job.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Chip icon={MapPin} label={job.locationName ?? "Flexible"} />
                    <Chip icon={Clock3} label={humanize(job.employmentType)} />
                  </div>
                  <Link href={job.publicUrl} className="mt-4 inline-flex h-10 items-center rounded-md bg-[#2b1ab8] px-4 text-sm font-black text-white">
                    Open role
                  </Link>
                </article>
              ))}
            </section>

            <div id="talent" className="overflow-hidden rounded-lg border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#edf1f7] p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">Candidate marketplace</p>
                  <h2 className="mt-1 text-2xl font-black text-[#11143a]">Discoverable public talent profiles</h2>
                </div>
                <Link href="/hire/signup" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#2b1ab8] px-4 text-sm font-black text-white">
                  <UserRoundPlus size={16} />
                  Candidate signup
                </Link>
              </div>
              <TalentTable profiles={marketplace.talentProfiles} />
            </div>
          </div>

          <aside className="space-y-5">
            <PublicTalentProfileForm />
            <section className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">Recent profiles</p>
              <div className="mt-4 space-y-3">
                {marketplace.talentProfiles.map((profile) => (
                  <div key={profile.id} className="rounded-md border border-[#edf1f7] bg-[#fbfcff] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#11143a]">{profile.displayName}</p>
                        <p className="mt-1 text-sm font-bold text-[#65708a]">{profile.desiredTitle ?? "Open to opportunities"}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">Active</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {profile.skills.slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-[#63708a]">{skill}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {!marketplace.talentProfiles.length ? <p className="text-sm font-bold text-[#65708a]">No public talent profiles yet.</p> : null}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </>
  );
}

function JobTable({ jobs }: { jobs: PublicMarketplaceJobSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full text-left">
        <thead className="bg-[#fbfcff] text-xs font-black uppercase tracking-[0.06em] text-[#63708a]">
          <tr>
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3">Company</th>
            <th className="px-5 py-3">Location</th>
            <th className="px-5 py-3">Work</th>
            <th className="px-5 py-3">Applicants</th>
            <th className="px-5 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf1f7]">
          {jobs.map((job) => (
            <tr key={job.id} className="align-top transition hover:bg-[#fbfcff]">
              <td className="px-5 py-4">
                <p className="font-black text-[#11143a]">{job.title}</p>
                <p className="mt-1 max-w-xl text-sm font-semibold leading-6 text-[#65708a]">{job.summary}</p>
                <p className="mt-2 text-xs font-black uppercase text-[#8a95aa]">{job.requisition.code}</p>
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-[#11143a]">{job.tenant.name}</p>
                <p className="mt-1 text-xs font-bold text-[#74809a]">{job.departmentName ?? "General"}</p>
              </td>
              <td className="px-5 py-4 text-sm font-bold text-[#4c5872]">{job.locationName ?? "Flexible"}</td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <Chip icon={Building2} label={humanize(job.workMode)} />
                  <Chip icon={Clock3} label={humanize(job.employmentType)} />
                </div>
              </td>
              <td className="px-5 py-4 text-sm font-black text-[#11143a]">{job.requisition.applications}</td>
              <td className="px-5 py-4">
                <Link href={job.publicUrl} className="inline-flex h-10 items-center rounded-md bg-[#2b1ab8] px-4 text-sm font-black text-white">
                  Apply
                </Link>
              </td>
            </tr>
          ))}
          {!jobs.length ? (
            <tr>
              <td className="px-5 py-10 text-sm font-bold text-[#65708a]" colSpan={6}>
                No public jobs match this search.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function TalentTable({ profiles }: { profiles: PublicTalentProfilePreview[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[980px] w-full text-left">
        <thead className="bg-[#fbfcff] text-xs font-black uppercase tracking-[0.06em] text-[#63708a]">
          <tr>
            <th className="px-5 py-3">Candidate</th>
            <th className="px-5 py-3">Target role</th>
            <th className="px-5 py-3">Work</th>
            <th className="px-5 py-3">Skills</th>
            <th className="px-5 py-3">Profile</th>
            <th className="px-5 py-3">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf1f7]">
          {profiles.map((profile) => (
            <tr key={profile.id} className="align-top transition hover:bg-[#fbfcff]">
              <td className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#f1edff] text-sm font-black text-[#3820d7]">
                    {profile.displayName.slice(0, 1)}
                  </span>
                  <div>
                    <p className="font-black text-[#11143a]">{profile.displayName}</p>
                    <p className="mt-1 max-w-md text-sm font-semibold leading-6 text-[#65708a]">
                      {profile.summary ?? profile.headline ?? "Open to conversations"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-[#11143a]">{profile.desiredTitle ?? "Open role"}</p>
                <p className="mt-1 text-xs font-bold text-[#74809a]">{profile.locationName ?? "Flexible"}</p>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {profile.workModes.slice(0, 2).map((mode) => <Chip key={mode} icon={Building2} label={humanize(mode)} />)}
                  {profile.employmentTypes.slice(0, 2).map((type) => <Chip key={type} icon={Clock3} label={humanize(type)} />)}
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex max-w-xs flex-wrap gap-1">
                  {profile.skills.slice(0, 5).map((skill) => (
                    <span key={skill} className="rounded-full bg-[#f6f8fc] px-2 py-1 text-[11px] font-black text-[#63708a]">{skill}</span>
                  ))}
                  {!profile.skills.length ? <span className="text-sm font-bold text-[#74809a]">Open skill set</span> : null}
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                    <FileCheck2 size={13} />
                    {profile.resumeUploaded ? "Resume" : "Builder"}
                  </span>
                  <span className="rounded-md border border-[#dfe8f6] bg-[#fbfcff] px-2 py-1 text-xs font-black text-[#4c5872]">
                    {profile.profileStrength}/6
                  </span>
                </div>
              </td>
              <td className="px-5 py-4 text-sm font-bold text-[#4c5872]">{formatDate(profile.updatedAt)}</td>
            </tr>
          ))}
          {!profiles.length ? (
            <tr>
              <td className="px-5 py-10 text-sm font-bold text-[#65708a]" colSpan={6}>
                No public candidates have created profiles yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: "blue" | "green" | "violet" }) {
  const tones = {
    blue: "border-sky-100 bg-sky-50 text-sky-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.08em]">{label}</p>
        <Icon size={18} />
      </div>
      <p className="mt-2 text-3xl font-black text-[#11143a]">{value}</p>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function emptyMarketplace(): PublicHiringMarketplace {
  return {
    generatedAt: new Date().toISOString(),
    metrics: { openJobs: 0, companies: 0, talentProfiles: 0 },
    data: [],
    talentProfiles: [],
    page: { limit: 60, total: 0 },
  };
}
