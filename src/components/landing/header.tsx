import { getCurrentServerSession } from "@/lib/auth/session";
import { HeaderClient } from "./header-client";

export async function Header() {
  const session = await getCurrentServerSession();

  return <HeaderClient session={session} />;
}
