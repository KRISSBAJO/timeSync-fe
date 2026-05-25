import Image from "next/image";
import { FiArrowRight, FiAward, FiFileText, FiTrendingUp, FiUserPlus } from "react-icons/fi";
import type { IconType } from "react-icons";

const growthItems: Array<{ title: string; description: string; icon: IconType }> = [
  {
    title: "Structured onboarding",
    description: "Turn first-day steps, documents, and approvals into reusable employee journeys.",
    icon: FiUserPlus,
  },
  {
    title: "Document readiness",
    description: "Track employee files, certifications, expiry dates, and verification state.",
    icon: FiFileText,
  },
  {
    title: "Capability growth",
    description: "Map skills, training, certifications, and future workforce intelligence.",
    icon: FiTrendingUp,
  },
  {
    title: "Recognition",
    description: "Surface the work that matters and keep morale visible across teams.",
    icon: FiAward,
  },
];

export function EmployeeGrowthSection() {
  return (
    <section className="section-shell connected-band">
      <div className="section-inner grid items-center gap-14 lg:grid-cols-2">
        <div className="visual-card relative order-2 min-h-[430px] overflow-hidden bg-white motion-fade-up lg:order-1">
          <Image
            src="/images/phone.png"
            alt="Employee growth dashboard on laptop and mobile"
            fill
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="object-contain"
          />
        </div>

        <div className="order-1 motion-fade-up-delay lg:order-2">
          <p className="section-kicker text-[#22376d]">Employee growth</p>
          <h2 className="section-title mt-4 max-w-xl">
            Build employee journeys that leave a reliable trail.
          </h2>
          <p className="section-copy mt-5 max-w-lg">
            Onboard faster, keep employee records current, track capabilities,
            and recognize the work that moves the organization forward.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {growthItems.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="landing-card p-4 shadow-none transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#eaf9f2] text-[#12b886]">
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-[#11143a]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#596579]">{item.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <a href="/explore-hr-and-skills" className="mt-8 inline-flex items-center gap-2 text-sm font-black text-[#3820d7] transition hover:translate-x-1">
            Explore HR and skills
            <FiArrowRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
