import Image from "next/image";
import { FiArrowRight, FiGlobe, FiLinkedin, FiMail, FiTwitter } from "react-icons/fi";

const footerColumns = [
  {
    title: "Platform",
    links: ["Workforce Core", "Time & Scheduling", "Documents", "Approvals"],
  },
  {
    title: "Enterprise",
    links: ["Multi-tenancy", "RBAC", "Audit Logs", "Analytics"],
  },
  {
    title: "Company",
    links: ["About", "Security", "Support", "Roadmap"],
  },
];

const legalLinks = ["Privacy", "Terms", "Cookies", "Status"];

export function Footer() {
  return (
    <footer className="bg-[#0d102b] text-white">
      <div className="section-inner py-10">
        <div className="grid items-center gap-6 rounded-lg border border-white/10 bg-[#161a42] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)] md:grid-cols-[1fr_auto] md:p-8">
          <div>
            <p className="text-xs font-black uppercase text-[#9db6ff]">Ready for enterprise rollout</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight sm:text-3xl">
              Run HR, time, approvals, documents, and analytics from one secure WorkforceOS.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="#demo"
              className="landing-button-primary"
            >
              Request demo
            </a>
            <a
              href="#features"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/22 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              View platform
              <FiArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <a href="#" className="inline-flex items-center gap-3" aria-label="TimeSync home">
              <span className="relative h-10 w-10 overflow-hidden rounded-md bg-white">
                <Image src="/images/logo.png" alt="TimeSync logo" fill sizes="40px" className="object-cover" />
              </span>
              <span className="text-2xl font-black">TimeSync</span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/68">
              Enterprise workforce operations with tenant isolation, historical integrity, and workflow-first HR governance.
            </p>
            <div className="mt-6 flex gap-3">
              {[FiTwitter, FiLinkedin, FiMail].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  aria-label="TimeSync social link"
                  className="grid h-9 w-9 place-items-center rounded-md bg-white/8 text-white/76 transition hover:bg-[#2f6eea] hover:text-white"
                >
                  <Icon aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-black text-white">{column.title}</h3>
                <ul className="mt-4 space-y-3 text-sm text-white/66">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a href="#features" className="transition hover:text-white">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-white/12 pt-6 text-xs text-white/58 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <FiGlobe aria-hidden="true" />
            English
            <span className="hidden text-white/25 md:inline">|</span>
            <span>© 2026 TimeSync. All rights reserved.</span>
          </div>
          <nav className="flex flex-wrap gap-4">
            {legalLinks.map((link) => (
              <a key={link} href="#" className="transition hover:text-white">
                {link}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
