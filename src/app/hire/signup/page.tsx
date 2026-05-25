import Image from "next/image";
import { CandidateSignupBuilder } from "@/components/hire/candidate-signup-builder";
import { HireTinyHeader } from "@/components/hire/hire-tiny-header";

export const dynamic = "force-dynamic";

export default function CandidateSignupPage() {
  return (
    <>
      <HireTinyHeader active="signup" />
      <main className="min-h-screen bg-[#f6f8fc] pb-8">
        <section className="mx-auto max-w-7xl px-4 pt-4">
          <div className="relative overflow-hidden rounded-lg bg-[#10142f] text-white shadow-[0_22px_60px_rgba(17,20,58,0.16)]">
          <Image
            src="/images/hire_hero.png"
            alt="Candidate preparing a professional profile"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#10142f]/20" />
          <div className="relative px-5 py-8 md:px-8">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-white/70">Candidate signup</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-none md:text-6xl">Build your profile.</h1>
          </div>
          </div>
        </section>
        <CandidateSignupBuilder />
      </main>
    </>
  );
}
