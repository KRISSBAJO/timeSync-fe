import { NextRequest } from "next/server";

import { proxyBackendRequest } from "@/lib/api/route-proxy";

type ProxyContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

async function proxy(request: NextRequest, context: ProxyContext) {
  const { path } = await context.params;
  return proxyBackendRequest(request, `/${path.join("/")}`);
}
