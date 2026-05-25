import type { AuthUser } from "@/lib/api/types";

export function displayUserName(user: AuthUser) {
  return user.username ?? user.email.split("@")[0] ?? user.email;
}
