import Image from "next/image";
import { FiArrowRight, FiBell, FiBookOpen, FiMessageCircle, FiUsers } from "react-icons/fi";
import type { IconType } from "react-icons";

const channels: Array<{ title: string; description: string; icon: IconType }> = [
  {
    title: "Company updates",
    description: "Broadcast policy, site, and leadership updates to the right audiences.",
    icon: FiBell,
  },
  {
    title: "Work chat",
    description: "Keep operational conversations attached to teams, locations, and shifts.",
    icon: FiMessageCircle,
  },
  {
    title: "Knowledge base",
    description: "Give employees one place for policies, guides, forms, and FAQs.",
    icon: FiBookOpen,
  },
  {
    title: "Directory",
    description: "Help teams find colleagues, managers, HR contacts, and expertise quickly.",
    icon: FiUsers,
  },
];

export function CommunicationsSection() {
  return (
    <section className="section-shell bg-white">
      <div className="section-inner grid items-center gap-14 lg:grid-cols-2">
        <div className="motion-fade-up">
          <p className="section-kicker text-[#22376d]">Internal communications</p>
          <h2 className="section-title mt-4 max-w-xl">
            The right message reaches the right team.
          </h2>
          <p className="section-copy mt-5 max-w-lg">
            Connect every employee with timely information, whether they are at a desk,
            on the floor, in the field, or moving between locations.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {channels.map((channel) => {
              const Icon = channel.icon;

              return (
                <article key={channel.title} className="landing-card p-4 shadow-none transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#eef4ff] text-[#3820d7]">
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-[#11143a]">{channel.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#596579]">{channel.description}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <a href="#demo" className="mt-8 inline-flex items-center gap-2 text-sm font-black text-[#3820d7] transition hover:translate-x-1">
            Explore communications
            <FiArrowRight aria-hidden="true" />
          </a>
        </div>

        <div className="visual-card relative min-h-[420px] overflow-hidden bg-[#f6f9ff] motion-float">
          <Image
            src="/images/seven.png"
            alt="Warehouse communication card and safety report"
            fill
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="object-cover"
          />
          <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-white/70 bg-white/92 p-4 shadow-[0_22px_50px_rgba(17,20,58,0.14)] backdrop-blur sm:left-auto sm:w-[300px]">
            <p className="text-sm font-black text-[#11143a]">Message delivered</p>
            <p className="mt-1 text-xs leading-5 text-[#596579]">
              Safety report shared with the site team and stored in the activity feed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
