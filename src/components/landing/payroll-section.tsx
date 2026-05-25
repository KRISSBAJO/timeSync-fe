import Image from "next/image";
import { CreditCard, Globe2, ShieldCheck, WalletCards } from "lucide-react";

const payrollFeatures = [
  { label: "Multi-currency payroll preparation", icon: Globe2 },
  { label: "Verified hours and approvals", icon: ShieldCheck },
  { label: "Employee wallet experiences", icon: WalletCards },
  { label: "Clean finance handoff", icon: CreditCard },
];

export function PayrollSection() {
  return (
    <section id="pricing" className="section-shell connected-band">
      <div className="section-inner grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="visual-card relative min-h-[420px] overflow-hidden bg-white motion-fade-up">
          <Image
            src="/images/five.png"
            alt="TimeSync wallet, balance, and recent transactions interface"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-center"
          />
        </div>

        <div className="motion-fade-up-delay">
          <p className="section-kicker">Payroll readiness</p>
          <h2 className="section-title mt-4 max-w-xl">From approved time to cleaner payroll operations.</h2>
          <p className="section-copy mt-5 max-w-lg">
            Keep finance, HR, and operations aligned with verified work records, approval history, and globally aware payment preparation.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {payrollFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <div key={feature.label} className="landing-card flex items-start gap-3 p-4 shadow-none transition hover:-translate-y-1 hover:shadow-lg">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#eef6ff] text-[#3820d7]">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <p className="text-sm font-extrabold leading-6 text-[#263258]">{feature.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
