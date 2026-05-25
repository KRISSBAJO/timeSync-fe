import Image from "next/image";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiShield,
} from "react-icons/fi";
import type { IconType } from "react-icons";

const capabilities: Array<{
  title: string;
  description: string;
  icon: IconType;
}> = [
  {
    title: "Smart scheduling",
    description: "Build shift plans, balance coverage, and see availability before gaps become operational risk.",
    icon: FiCalendar,
  },
  {
    title: "Verified time",
    description: "Capture punches, breaks, late arrivals, and exceptions with clean history for every employee.",
    icon: FiClock,
  },
  {
    title: "Location confidence",
    description: "Use geofence-ready attendance signals to understand where work started and ended.",
    icon: FiMapPin,
  },
  {
    title: "Payroll handoff",
    description: "Route approved hours into payroll preparation with fewer manual corrections.",
    icon: FiShield,
  },
];

const metrics = [
  { value: "96%", label: "verified shifts" },
  { value: "8.4k", label: "monthly punches" },
  { value: "14", label: "open exceptions" },
];

export function SchedulingSection() {
  return (
    <section id="features" className="section-shell relative overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f6f9ff] to-white" />

      <div className="section-inner relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="motion-fade-up">
          <p className="section-kicker text-[#22376d]">Scheduling and time intelligence</p>
          <h2 className="section-title mt-4 max-w-xl">
            Turn every shift into verified workforce history.
          </h2>
          <p className="section-copy mt-5 max-w-xl">
            TimeSync connects scheduling, time clock, geofence signals, exceptions,
            approvals, and payroll-ready exports so workforce operations stay accurate at scale.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {capabilities.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="landing-card group p-4 shadow-none transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_rgba(31,49,88,0.12)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#eef5ff] text-[#3820d7] transition group-hover:bg-[#3820d7] group-hover:text-white">
                      <Icon aria-hidden="true" className="text-lg" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-[#17204a]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#5b657d]">{item.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#demo"
              className="landing-button-primary motion-shine"
            >
              Explore workforce time
              <FiArrowRight aria-hidden="true" />
            </a>
            <span className="feature-check text-[#536079]">
              <FiCheckCircle aria-hidden="true" className="text-[#12b886]" />
              Built for audit-ready operations
            </span>
          </div>
        </div>

        <div className="relative min-h-[560px] motion-fade-up-delay lg:min-h-[640px]">
          <div className="visual-card absolute inset-0 overflow-hidden bg-[#f3f7fc]">
            <Image
              src="/images/work.png"
              alt="Work schedule and clocked-in today dashboard"
              fill
              sizes="(min-width: 1024px) 54vw, 100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1738]/10 via-transparent to-white/5" />
          </div>

          <div className="absolute left-4 right-4 top-4 grid gap-3 sm:left-6 sm:right-auto sm:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-white/70 bg-white/88 px-4 py-3 shadow-[0_18px_38px_rgba(31,49,88,0.14)] backdrop-blur"
              >
                <p className="text-xl font-black text-[#17204a]">{metric.value}</p>
                <p className="mt-1 text-[11px] font-extrabold uppercase text-[#68748c]">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-[#dfe9f8] bg-white/92 p-4 shadow-[0_20px_45px_rgba(31,49,88,0.16)] backdrop-blur md:left-auto md:w-[330px]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#17204a]">Payroll export ready</p>
                <p className="mt-1 text-xs leading-5 text-[#68748c]">
                  128 approved hours queued for review.
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#eaf9f2] text-[#12b886]">
                <FiCheckCircle aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
