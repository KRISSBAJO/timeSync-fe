import Image from "next/image";
import { FiCheckCircle } from "react-icons/fi";

const features = [
  {
    title: "Time and attendance",
    description: "Clock-ins, schedules, geofence signals, exceptions, and payroll-ready hours.",
  },
  {
    title: "Lifecycle workflows",
    description: "Hiring, transfers, approvals, role changes, documents, and governed actions.",
  },
  {
    title: "Enterprise governance",
    description: "RBAC, tenant isolation, audit trails, outbox events, and analytics foundations.",
  },
  {
    title: "Employee experience",
    description: "Profiles, communication, document access, notifications, and self-service.",
  },
];

export function FeatureOverviewSection() {
  return (
    <section id="solutions" className="section-shell landing-band soft-grid">
      <div className="section-inner grid items-center gap-12 lg:grid-cols-[1fr_0.92fr]">
        <div className="motion-fade-up">
          <p className="section-kicker">Key features</p>
          <h2 className="section-title mt-4 max-w-3xl">
            A cleaner way to run workforce operations end to end.
          </h2>
          <p className="section-copy mt-6 max-w-2xl">
            TimeSync connects the operational layer with enterprise HR governance, so leaders
            can see what is happening now and still preserve the history behind every decision.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="landing-card p-4 shadow-none">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#eef4ff] text-[#3820d7]">
                    <FiCheckCircle aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-[#11143a]">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#596579]">{feature.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="visual-card relative min-h-[410px] overflow-hidden bg-white motion-float">
          <Image
            src="/images/fouth.png"
            alt="Multi-currency workforce payment and localization experience"
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover object-center"
          />
        </div>
      </div>
    </section>
  );
}
