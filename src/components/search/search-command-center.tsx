import Link from "next/link";
import { ArrowRight, Building2, FileText, GitBranch, ListChecks, Search, UsersRound } from "lucide-react";

import type { GlobalSearchResults, SearchResultGroup } from "@/lib/search/types";

const searchTypes = [
  { label: "Everything", value: "" },
  { label: "Employees", value: "employees" },
  { label: "Positions", value: "positions" },
  { label: "Documents", value: "documents" },
  { label: "Organization", value: "organization" },
  { label: "Workflows", value: "workflows" },
];

const groupIcon = {
  employees: UsersRound,
  positions: GitBranch,
  documents: FileText,
  organization: Building2,
  workflows: ListChecks,
};

export function SearchCommandCenter({
  results,
  query,
  type,
}: {
  results: GlobalSearchResults | null;
  query: string;
  type: string;
}) {
  const groups = results?.groups ?? [];
  const resultCount = groups.reduce((sum, group) => sum + group.results.length, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
              Global search
            </span>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.45rem,2.3vw,2.05rem)] font-extrabold leading-tight text-[#10143f]">
              Find people, positions, documents, org nodes, and workflow controls from one tenant-safe index.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Results are permission-aware and scoped to the active tenant.
            </p>
          </div>
          <div className="rounded-xl border border-[#e4eaf4] bg-[#fbfcff] p-4 xl:min-w-[240px]">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a92a6]">Matched records</p>
            <p className="mt-2 text-3xl font-black text-[#10143f]">{resultCount}</p>
          </div>
        </div>

        <form action="/search" className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <label className="flex h-12 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-4 text-[13px] font-semibold text-[#7b8195]">
            <Search size={17} aria-hidden="true" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search employee name, permit, job title, workflow code..."
              className="min-w-0 flex-1 bg-transparent text-[#151936] outline-none placeholder:text-[#9ba2b5]"
            />
          </label>
          <select
            name="types"
            defaultValue={type}
            className="h-12 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
          >
            {searchTypes.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-6 text-sm font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.18)]"
          >
            Search
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </form>
      </section>

      {groups.length > 0 ? (
        <section className="grid gap-5 xl:grid-cols-2">
          {groups.map((group) => (
            <SearchGroup key={group.type} group={group} />
          ))}
        </section>
      ) : (
        <section className="grid min-h-[360px] place-items-center rounded-xl border border-dashed border-[#dfe8f6] bg-white p-8 text-center">
          <div>
            <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#eef5ff] text-[#2f6eea]">
              <Search size={30} aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-[#121a46]">
              {query ? "No matching records found" : "Search the tenant workspace"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
              {query
                ? "Try a broader keyword, employee number, document type, position code, or workflow module."
                : "Enter a keyword to search workforce, governance, and operations records."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function SearchGroup({ group }: { group: SearchResultGroup }) {
  const Icon = groupIcon[group.type];

  return (
    <article className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef2ff] text-[#3820d7]">
            <Icon size={19} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-extrabold text-[#121a46]">{group.label}</h3>
            <p className="text-[12px] font-bold text-[#7a8297]">{group.total} returned in this slice</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {group.results.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center gap-3 rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3 transition hover:border-[#cbd5e8] hover:bg-white"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-[#10143f]">{item.title}</span>
              <span className="mt-1 block truncate text-[12px] font-semibold text-[#68748c]">
                {item.subtitle}
              </span>
            </span>
            <ArrowRight size={16} className="text-[#9aa2b3] transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </article>
  );
}
