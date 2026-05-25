import { DemoRequestForm } from "./demo-request-form";

export function QuoteSection() {
  return (
    <section id="demo" className="section-shell bg-[#11143a] text-white">
      <div className="section-inner grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-black uppercase text-[#9db6ff]">Enterprise readiness</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">
            See how TimeSync fits your workforce operating model.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/72">
            Meet with our team to review your structure, security needs, approval flows,
            and launch path. From there, your organization can be configured with the
            right tenant setup, governance model, and administrator rollout.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Discovery", "Configuration", "Launch"].map((step, index) => (
              <div key={step} className="rounded-lg border border-white/12 bg-white/7 p-4">
                <p className="text-2xl font-black text-[#9db6ff]">0{index + 1}</p>
                <p className="mt-2 text-sm font-black">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <DemoRequestForm />
      </div>
    </section>
  );
}
