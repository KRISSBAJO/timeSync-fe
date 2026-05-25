import Image from "next/image";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, Workflow } from "lucide-react";

const trustMarks = [
  { label: "Tenant isolation", icon: Building2 },
  { label: "Verified time", icon: CheckCircle2 },
  { label: "Workflow approvals", icon: Workflow },
  { label: "Audit-ready", icon: ShieldCheck },
];

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden border-t border-[#e6ebf4] bg-[#f7f9fd]">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,#ffffff_0%,#f7f9fd_48%,#edf4ff_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-24 origin-bottom-left -skew-y-[3deg] bg-white" />

      <div className="section-inner grid min-h-[640px] grid-cols-1 items-center gap-12 pb-24 pt-14 md:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:pb-28 lg:pt-16">
        <div className="relative z-10 max-w-[610px] motion-fade-up">
          <p className="section-kicker">Enterprise WorkforceOS</p>

          <h1 className="mt-5 max-w-[640px] text-[40px] font-black leading-[1.03] tracking-tighter text-[#11143a] sm:text-[50px] lg:text-[56px]">
            Workforce operations, time, and HR in one system.
          </h1>

          <p className="mt-6 max-w-[560px] text-[16px] leading-[1.8] text-[#596579]">
            TimeSync brings scheduling, employee time, approvals, documents, assignments,
            tenant administration, and workforce history into one governed platform built
            for teams that need clarity at scale.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="landing-button-primary motion-shine"
            >
              Request Demo
              <ArrowRight size={15} aria-hidden="true" />
            </a>
            <a
              href="#features"
              className="landing-button-secondary"
            >
              Explore Platform
            </a>
          </div>

          <div className="mt-10 grid max-w-[560px] gap-3 sm:grid-cols-2">
            {trustMarks.map((mark) => {
              const Icon = mark.icon;

              return (
                <div
                  key={mark.label}
                  className="flex items-center gap-3 rounded-lg border border-[#dfe7f4] bg-white/78 px-3.5 py-3 shadow-[0_12px_30px_rgba(17,20,58,0.05)] backdrop-blur"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-[#eef4ff] text-[#3820d7]">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="text-[13px] font-black text-[#263258]">{mark.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[360px] motion-fade-up-delay md:min-h-[450px] lg:min-h-[520px]">
          <div className="absolute inset-y-10 left-6 right-0 rounded-lg border border-[#dfe8f5] bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(239,245,255,0.7))] shadow-[0_28px_78px_rgba(17,20,58,0.12)] backdrop-blur" />
          <div className="absolute bottom-8 left-0 top-16 w-[42%] rounded-lg border border-[#e1e9f6] bg-white/64 shadow-[0_22px_52px_rgba(17,20,58,0.08)] backdrop-blur" />
          <div className="absolute right-8 top-7 h-2 w-28 rounded-full bg-[#12b886]/70" />
          <div className="absolute bottom-10 right-10 h-2 w-40 rounded-full bg-[#3820d7]/16" />
          <Image
            src="/images/hero.png"
            alt="TimeSync punch, schedule, map, and clocked-in workforce screens"
            fill
            priority
            sizes="(min-width: 1024px) 610px, (min-width: 768px) 52vw, 100vw"
            className="object-contain object-center drop-shadow-[0_28px_42px_rgba(49,74,115,0.2)]"
          />
        </div>
      </div>
    </section>
  );
}
