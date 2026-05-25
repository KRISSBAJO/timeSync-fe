import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    tenantSlug?: string;
    mode?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentServerSession();
  const params = await searchParams;

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_1fr]">
        <section className="relative hidden overflow-hidden bg-[#99a4fa] px-14 py-20 lg:block">
          <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-white/18 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-160px] right-[8%] h-[360px] w-[360px] rounded-full bg-[#3820d7]/16 blur-3xl" />
          <Link href="/" className="absolute left-10 top-8 block h-14 w-[190px]" aria-label="TimeSync home">
            <Image
              src="/images/timesync_logo.png"
              alt="TimeSync"
              fill
              sizes="190px"
              priority
              className="object-contain object-left"
            />
          </Link>

          <div className="mt-20 max-w-[460px]">
            <h2 className="text-[54px] font-black leading-[1.08] tracking-[-0.04em] text-[#25175c]">
              Welcome to
              <br />
              Timesync
            </h2>
            <p className="mt-6 max-w-[360px] text-[15px] leading-7 text-[#25175c]">
              Take the hassle out of HR management and focus on what matters most, your people.
              Our intuitive platform helps you operate with clarity.
            </p>
          </div>

          <div className="relative mt-11 h-[154px] max-w-[580px]">
            <div className="pointer-events-none absolute left-10 top-3 h-[128px] w-[470px] rounded-full bg-[#25175c]/18 blur-3xl" />
            <div className="pointer-events-none absolute left-14 top-5 h-[112px] w-[410px] rounded-full border border-white/30" />
            <TestimonialBubble
              className="absolute left-0 top-0 z-30 w-[430px]"
              text="I just love how seamless and functional the TimeSync software is."
              label="HR operations lead"
            />
            <TestimonialBubble
              className="absolute left-[56px] top-[38px] z-20 w-[430px]"
              text="The customer support team are fast, calm, and seriously dependable."
              label="Tenant admin"
              reverse
            />
            <TestimonialBubble
              className="absolute left-[112px] top-[76px] z-10 w-[430px]"
              text="TimeSync keeps our workforce data organized without the chaos."
              label="People team"
            />
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-[430px]">
            <Link href="/" className="relative mb-12 block h-14 w-[190px] lg:hidden" aria-label="TimeSync home">
              <Image
                src="/images/timesync_logo.png"
                alt="TimeSync"
                fill
                sizes="190px"
                priority
                className="object-contain object-left"
              />
            </Link>
            <LoginForm
              nextPath={params.next ?? "/dashboard"}
              defaultTenantSlug={params.tenantSlug ?? ""}
              defaultMode={params.mode === "platform" ? "platform" : "tenant"}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function TestimonialBubble({
  text,
  label,
  reverse,
  className,
}: {
  text: string;
  label: string;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`group relative isolate flex min-h-[76px] items-center gap-3 overflow-hidden rounded-full border border-white/75 bg-white/52 px-4 py-3 shadow-[0_24px_58px_rgba(37,23,92,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:bg-white/64 hover:shadow-[0_32px_78px_rgba(37,23,92,0.28),inset_0_1px_0_rgba(255,255,255,0.95)] ${reverse ? "flex-row-reverse pl-5 pr-3" : "pl-3 pr-5"} ${className ?? ""}`}
    >
      <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-white/90" />
      <span className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/40 blur-2xl transition group-hover:bg-white/55" />
      <span className="pointer-events-none absolute -bottom-14 left-14 h-24 w-40 rounded-full bg-[#6bb5ff]/20 blur-2xl" />

      <SmileySticker delay={0} />

      <div className={`relative min-w-0 ${reverse ? "text-right" : ""}`}>
        <span className={`absolute -top-3 text-3xl font-black leading-none text-white/50 ${reverse ? "right-0" : "left-0"}`}>
          “
        </span>
        <p className="relative text-[12px] font-semibold leading-5 text-[#151229]">
          {text}
        </p>
        <div className={`mt-0.5 flex items-center gap-2 ${reverse ? "justify-end" : ""}`}>
          <span className="text-[11px] font-black text-[#151229]">@omoye</span>
          <span className="h-1 w-1 rounded-full bg-[#25175c]/35" />
          <span className="text-[10px] font-bold text-[#4f4a81]">{label}</span>
        </div>
      </div>
    </div>
  );
}

function SmileySticker({ delay }: { delay: number }) {
  return (
    <span className="relative grid h-[48px] w-[48px] shrink-0 place-items-center rounded-full bg-white/56 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_18px_rgba(37,23,92,0.12)] ring-1 ring-white/80">
      <span className="relative grid h-[38px] w-[38px] place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_32%_24%,#fff7a7_0,#ffd84d_42%,#ff9c2f_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]">
        <span
          className="absolute left-2.5 top-3 h-1.5 w-1.5 animate-[smiley-blink_4s_ease-in-out_infinite] rounded-full bg-[#25175c]"
          style={{ animationDelay: `${delay}ms` }}
        />
        <span
          className="absolute right-2.5 top-3 h-1.5 w-1.5 animate-[smiley-blink_4s_ease-in-out_infinite] rounded-full bg-[#25175c]"
          style={{ animationDelay: `${delay + 180}ms` }}
        />
        <span className="absolute bottom-2 h-2.5 w-5 rounded-b-full border-b-[3px] border-[#25175c]" />
      </span>
      <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-[#3ecf8e] shadow-sm" />
    </span>
  );
}
