import Link from "next/link";

import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";

export const dynamic = "force-dynamic";

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function AcceptInvitationPage({ searchParams }: AcceptInvitationPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-6 py-10">
      <Link href="/" className="mx-auto block w-fit text-xl font-black tracking-[-0.02em] text-[#25175c]">
        TimeSync
      </Link>
      <section className="mx-auto mt-14 w-full max-w-[520px] rounded-2xl bg-white px-7 py-12 shadow-[0_24px_80px_rgba(37,23,92,0.10)] sm:px-12">
        <AcceptInvitationForm token={params.token ?? ""} />
      </section>
    </main>
  );
}
