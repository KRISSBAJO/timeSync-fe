import { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/lib/api/route-proxy";

export async function POST(request: NextRequest) {
  return proxyBackendRequest(request, "/auth/logout-all", {
    method: "POST",
  });
}
