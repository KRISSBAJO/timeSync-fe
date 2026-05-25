import Link from "next/link";
import { ArrowRight, BookOpen, Search, Sparkles } from "lucide-react";

import { HrGuideCard } from "@/components/hr-guides/hr-guide-card";
import type { HrArticleListResponse } from "@/lib/hr-guides/types";

export function HrGuidesIndex({
  payload,
  title = "HR Guides for modern workforce operators.",
  eyebrow = "TimeSync HR Guides",
  copy = "Practical thinking for tenant administration, employee lifecycle, skills intelligence, workforce movement, approvals, and the operating systems behind serious HR teams.",
  activeCategory,
}: {
  payload: HrArticleListResponse;
  title?: string;
  eyebrow?: string;
  copy?: string;
  activeCategory?: string;
}) {
  const [featured, ...rest] = payload.data;

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-[#101735]">
      <section className="relative overflow-hidden border-b border-[#e3e9f4] bg-white">
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(120deg,rgba(56,32,215,0.09),rgba(47,110,234,0.06),rgba(18,184,134,0.05))]" />
        <div className="section-inner relative py-20">
          <div className="max-w-3xl">
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-normal text-[#11143a] md:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5b667c]">{copy}</p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <Metric icon={BookOpen} label="Published guides" value={payload.page.total} />
            <Metric icon={Sparkles} label="Focus areas" value={payload.categories.length} />
            <Metric icon={Search} label="Operating lens" value="HR + Skills" />
          </div>
        </div>
      </section>

      <section className="section-inner py-10">
        <div className="flex flex-wrap gap-2">
          <CategoryPill href="/hr-guides" active={!activeCategory} label="All guides" />
          {payload.categories.map((category) => (
            <CategoryPill
              key={category.id}
              href={`/hr-guides?category=${category.slug}`}
              active={activeCategory === category.slug}
              label={category.name}
            />
          ))}
        </div>
      </section>

      <section className="section-inner pb-20">
        {featured ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <HrGuideCard article={featured} priority />
            <div className="rounded-lg border border-[#dfe7f4] bg-[#11143a] p-6 text-white shadow-[0_24px_80px_rgba(17,20,58,0.18)]">
              <p className="text-[11px] font-black uppercase text-[#9db3ff]">Editorial brief</p>
              <h2 className="mt-4 text-2xl font-black leading-tight">Build HR operations that can be audited, explained, and scaled.</h2>
              <p className="mt-4 text-sm leading-7 text-[#d9def0]">
                These guides are written for operators who need reliable workforce data, governed workflows, and employee experiences that hold up as the organization grows.
              </p>
              <Link href="/explore-hr-and-skills" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-[#11143a]">
                Explore HR and skills
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((article) => (
            <HrGuideCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-[#dfe7f4] bg-white/85 p-4 shadow-[0_12px_34px_rgba(17,20,58,0.06)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef2ff] text-[#3820d7]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-xl font-black text-[#11143a]">{value}</span>
          <span className="block text-[12px] font-bold text-[#667085]">{label}</span>
        </span>
      </div>
    </div>
  );
}

function CategoryPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-lg bg-[#3820d7] px-4 py-2 text-sm font-black text-white shadow-[0_12px_28px_rgba(56,32,215,0.18)]"
          : "rounded-lg border border-[#dfe7f4] bg-white px-4 py-2 text-sm font-black text-[#34405f] transition hover:border-[#cbd5e8] hover:bg-[#f9fbff]"
      }
    >
      {label}
    </Link>
  );
}
