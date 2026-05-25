import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PlatformLoginPage() {
  redirect("/login?mode=platform");
}
