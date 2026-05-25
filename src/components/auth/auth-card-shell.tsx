import Link from "next/link";
import { ReactNode } from "react";
import { Check, X } from "lucide-react";

export function AuthCardShell({
  children,
  showClose = true,
}: {
  children: ReactNode;
  showClose?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f0f0f0] px-5 py-10">
      <section className="relative w-full max-w-[540px] rounded-lg bg-white px-8 py-14 shadow-[0_22px_60px_rgba(25,22,47,0.04)]">
        {showClose ? (
          <Link
            href="/login"
            aria-label="Close"
            className="absolute right-6 top-6 grid h-7 w-7 place-items-center rounded-full bg-[#eef0f5] text-[#6e7285] transition hover:bg-[#e1e3ea] hover:text-[#25175c]"
          >
            <X size={14} aria-hidden="true" />
          </Link>
        ) : null}
        {children}
      </section>
    </main>
  );
}

export function AuthShieldIcon({ success = false }: { success?: boolean }) {
  if (success) {
    return (
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-[#4cc59b] bg-[#eaf9f2]">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#4cc59b] text-xl font-black text-white">
          <Check size={25} aria-hidden="true" />
        </span>
      </span>
    );
  }

  return (
    <span className="mx-auto block h-12 w-12 rounded-[14px] bg-[linear-gradient(135deg,#a9a4c4_0_50%,#25175c_50%_100%)]" />
  );
}
