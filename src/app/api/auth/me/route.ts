import { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/lib/api/route-proxy";

export async function GET(request: NextRequest) {
  return proxyBackendRequest(request, "/auth/me", {
    method: "GET",
  });
}
