import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export type ModuleHomeProps = {
  title: string;
  kicker: string;
  description: string;
  icon: LucideIcon;
  endpoints: string[];
  permissions: string[];
  nextBuild: string[];
};

export function ModuleHome({
  title,
  kicker,
  description,
  icon: Icon,
  endpoints,
  permissions,
  nextBuild,
}: ModuleHomeProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#dfe8f6] bg-white p-6 shadow-[0_20px_60px_rgba(18,31,67,0.07)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-kicker">{kicker}</p>
            <h2 className="mt-3 text-3xl font-black tracking-normal text-[#121a46] md:text-4xl">{title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5d6782]">{description}</p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
            <Icon size={25} aria-hidden="true" />
          </span>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-lg border border-[#dfe8f6] bg-white p-5 xl:col-span-2">
          <p className="text-xs font-black uppercase text-[#68748c]">Implementation status</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              `${endpoints.length} contracts active`,
              "Tenant-scoped access",
              "UI workspace ready",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md bg-[#f8fbff] px-4 py-3">
                <CheckCircle2 size={16} className="text-[#12b886]" aria-hidden="true" />
                <span className="text-xs font-black text-[#33415f]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#dfe8f6] bg-white p-5">
          <p className="text-xs font-black uppercase text-[#68748c]">Required permissions</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-md border border-[#dfe8f6] bg-[#f8fbff] px-3 py-2 text-xs font-black text-[#33415f]"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#dfe8f6] bg-[#101735] p-5 text-white">
        <p className="text-xs font-black uppercase text-white/60">Next UI build</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {nextBuild.map((item) => (
            <div key={item} className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/8 p-4">
              <p className="text-sm font-black">{item}</p>
              <ArrowRight size={16} className="text-white/50" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
