import { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { requireServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
  const session = await requireServerSession("/dashboard");

  return <AppShell session={session}>{children}</AppShell>;
}
