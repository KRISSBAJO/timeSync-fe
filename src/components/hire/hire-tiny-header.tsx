import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, UserRoundPlus } from "lucide-react";

type HireTinyHeaderProps = {
  active?: "marketplace" | "signup";
};

export function HireTinyHeader({ active = "marketplace" }: HireTinyHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e5ebf6] bg-white/94 backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <Link href="/hire" className="flex min-w-0 items-center gap-2">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-[#dfe7f4]">
            <Image src="/images/logo.png" alt="TimeSync" fill sizes="32px" className="object-cover" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-[#11143a]">TimeSync Hire</span>
            <span className="block truncate text-[10px] font-black uppercase text-[#7a8297]">Public hiring</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-xs font-black text-[#4f5a75] sm:flex">
          <Link
            href="/hire"
            className={`rounded-md px-3 py-2 transition hover:bg-[#f2f6fd] hover:text-[#3820d7] ${active === "marketplace" ? "bg-[#f1edff] text-[#3820d7]" : ""}`}
          >
            Jobs
          </Link>
          <a href="/hire#talent" className="rounded-md px-3 py-2 transition hover:bg-[#f2f6fd] hover:text-[#3820d7]">
            Talent
          </a>
          <Link
            href="/hire/signup"
            className={`rounded-md px-3 py-2 transition hover:bg-[#f2f6fd] hover:text-[#3820d7] ${active === "signup" ? "bg-[#f1edff] text-[#3820d7]" : ""}`}
          >
            Candidate
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/hire/signup" className="hidden h-9 items-center gap-2 rounded-md border border-[#dfe8f6] bg-white px-3 text-xs font-black text-[#3820d7] md:inline-flex">
            <UserRoundPlus size={14} />
            Join
          </Link>
          <Link href="/recruitment" className="inline-flex h-9 items-center gap-2 rounded-md bg-[#2b1ab8] px-3 text-xs font-black text-white">
            <BriefcaseBusiness size={14} />
            Employer
          </Link>
        </div>
      </div>
    </header>
  );
}
