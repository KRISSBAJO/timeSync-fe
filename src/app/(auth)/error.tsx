"use client";

import Link from "next/link";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f5f8] p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_22px_70px_rgba(18,31,67,0.08)]">
        <p className="text-[11px] font-extrabold uppercase text-[#b42318]">Authentication route failed</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#10143f]">The auth screen could not load</h1>
        <p className="mt-3 text-sm leading-6 text-[#5d6782]">Try again, or return to login and restart the session.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#3820d7] px-4 text-sm font-extrabold text-white"
          >
            Try again
          </button>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#dfe8f6] px-4 text-sm font-extrabold text-[#4d566d]"
          >
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
