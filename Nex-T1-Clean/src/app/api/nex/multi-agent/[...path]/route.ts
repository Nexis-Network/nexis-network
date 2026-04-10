import { forwardNexProxy } from "@/server/api/helpers/nex-proxy";


export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return forwardNexProxy(request, "GET", context, {
    pathPrefix: "/api/v1/multi-agent",
    requireOrg: true,
    timeoutMs: 20_000,
    errorMessage: "Multi-agent request failed",
  });
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return forwardNexProxy(request, "POST", context, {
    pathPrefix: "/api/v1/multi-agent",
    requireOrg: true,
    timeoutMs: 20_000,
    errorMessage: "Multi-agent request failed",
  });
}

export async function PUT(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return forwardNexProxy(request, "PUT", context, {
    pathPrefix: "/api/v1/multi-agent",
    requireOrg: true,
    timeoutMs: 20_000,
    errorMessage: "Multi-agent request failed",
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return forwardNexProxy(request, "PATCH", context, {
    pathPrefix: "/api/v1/multi-agent",
    requireOrg: true,
    timeoutMs: 20_000,
    errorMessage: "Multi-agent request failed",
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return forwardNexProxy(request, "DELETE", context, {
    pathPrefix: "/api/v1/multi-agent",
    requireOrg: true,
    timeoutMs: 20_000,
    errorMessage: "Multi-agent request failed",
  });
}
