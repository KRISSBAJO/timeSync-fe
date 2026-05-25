import Image from "next/image";
import { CandidateSignupBuilder } from "@/components/hire/candidate-signup-builder";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";

export const dynamic = "force-dynamic";

export default function CandidateSignupPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f6f8fc]">
        <section className="relative overflow-hidden bg-[#10142f] text-white">
          <Image
            src="/images/work.png"
            alt="Candidate preparing a professional profile"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-[#10142f]/62" />
          <div className="relative mx-auto max-w-7xl px-4 py-16">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-white/72">TimeSync Hire</p>
            <h1 className="mt-3 max-w-4xl text-5xl font-black leading-[0.98] md:text-7xl">Create your candidate profile.</h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/78 md:text-lg">
              Build a public talent profile, upload a resume, and join the hiring marketplace without using the employer app login.
            </p>
          </div>
        </section>
        <CandidateSignupBuilder />
      </main>
      <Footer />
    </>
  );
}
