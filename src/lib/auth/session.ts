import { redirect } from "next/navigation";

import { serverApiJson, tryServerApiJson } from "@/lib/api/server";
import type { AuthSession } from "@/lib/api/types";
import { hasEveryPermission } from "./permissions";

export async function getCurrentServerSession() {
  const session = await tryServerApiJson<unknown>("/auth/me");
  return isAuthSession(session) ? session : null;
}

export async function requireServerSession(nextPath?: string) {
  const session = await getCurrentServerSession();

  if (!session) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${next}`);
  }

  return session;
}

export async function requireServerPermissions(requiredPermissions: string[], nextPath?: string) {
  const session = await requireServerSession(nextPath);

  if (!hasEveryPermission(session.user, requiredPermissions)) {
    return {
      session,
      authorized: false,
    };
  }

  return {
    session,
    authorized: true,
  };
}

export async function refreshServerSession() {
  return serverApiJson<AuthSession>("/auth/refresh", {
    method: "POST",
  });
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AuthSession>;
  const user = session.user;

  return Boolean(
    user &&
      typeof user === "object" &&
      typeof user.id === "string" &&
      typeof user.email === "string" &&
      typeof user.type === "string" &&
      Array.isArray(user.roles) &&
      Array.isArray(user.permissions),
  );
}
