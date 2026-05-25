import { CheckCircle2, Clock3, Globe2, Star } from "lucide-react";

const stats = [
  {
    value: "96%",
    label: "Verified shifts",
    description: "Accurate attendance records",
    icon: CheckCircle2,
  },
  {
    value: "42k+",
    label: "Monthly punches",
    description: "Clock-ins processed securely",
    icon: Clock3,
  },
  {
    value: "18",
    label: "Countries ready",
    description: "Built for distributed teams",
    icon: Globe2,
  },
  {
    value: "4.8/5",
    label: "Team experience",
    description: "Simple for admins and staff",
    icon: Star,
  },
];

export function StatsBand() {
  return (
    <section className="relative z-20 -mt-14 px-4">
      <div className="mx-auto max-w-[1120px] rounded-lg border border-[#dfe7f4] bg-white/94 p-2 shadow-[0_24px_70px_rgba(28,45,86,0.12)] backdrop-blur-xl">
        <div className="grid gap-2 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="group rounded-lg border border-transparent px-5 py-5 transition duration-300 hover:border-[#dce7fb] hover:bg-[#f8fbff]"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-[#edf4ff] text-[#3820d7] transition group-hover:bg-[#3820d7] group-hover:text-white">
                  <Icon size={21} strokeWidth={2.4} />
                </div>

                <p className="text-[32px] font-black leading-none tracking-normal text-[#16213e]">
                  {stat.value}
                </p>

                <p className="mt-3 text-[14px] font-extrabold text-[#344054]">
                  {stat.label}
                </p>

                <p className="mt-1 text-[13px] leading-5 text-[#667085]">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
