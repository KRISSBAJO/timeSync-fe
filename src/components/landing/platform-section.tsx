import Image from "next/image";
import { FiBriefcase, FiGlobe, FiUserCheck } from "react-icons/fi";

const workforceTypes = [
  {
    title: "EOR employees",
    description: "Hire and support employees where you do not yet have an entity, while keeping HR operations consistent.",
    icon: FiGlobe,
    color: "#22b573",
  },
  {
    title: "Contractors",
    description: "Manage contractor profiles, documents, approvals, and operational workflows in one workforce record.",
    icon: FiBriefcase,
    color: "#4b7bec",
  },
  {
    title: "Direct employees",
    description: "Onboard, schedule, pay, and communicate with employees hired through your own entities.",
    icon: FiUserCheck,
    color: "#f59f00",
  },
];

export function PlatformSection() {
  return (
    <section id="product" className="section-shell bg-white">
      <div className="section-inner">
        <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="motion-fade-up">
            <p className="section-kicker">Global HR platform</p>
            <h2 className="section-title mt-4 max-w-xl">
              One operating layer for every type of worker.
            </h2>
            <p className="section-copy mt-6 max-w-xl">
              Manage direct employees, contractors, distributed teams, and future
              entities without rebuilding your HR stack each time the organization changes.
            </p>
            <a
              href="#demo"
              className="landing-button-primary mt-8"
            >
              Request a demo
            </a>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg bg-[#f6f9ff] motion-float-slow">
            <Image
              src="/images/second.png"
              alt="Global HR management profile cards and worker image"
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-contain"
            />
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {workforceTypes.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="landing-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(31,49,88,0.12)]"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-md text-white"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon aria-hidden="true" className="text-2xl" />
                </span>
                <h3 className="mt-5 text-lg font-black text-[#11143a]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4f5a75]">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
