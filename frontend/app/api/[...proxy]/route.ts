import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_PROXY_TARGET || "http://localhost:8080";

async function proxyRequest(req: NextRequest, path: string) {
  const url = new URL(req.url);
  const target = `${BACKEND}/api/${path}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  });

  const init: RequestInit & { duplex?: string } = {
    method: req.method,
    headers,
    signal: AbortSignal.timeout(120_000),
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  const res = await fetch(target, init);

  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "transfer-encoding") {
      responseHeaders.set(key, value);
    }
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, { status: res.status, headers: responseHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> },
) {
  const { proxy } = await params;
  return proxyRequest(req, proxy.join("/"));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> },
) {
  const { proxy } = await params;
  return proxyRequest(req, proxy.join("/"));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> },
) {
  const { proxy } = await params;
  return proxyRequest(req, proxy.join("/"));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> },
) {
  const { proxy } = await params;
  return proxyRequest(req, proxy.join("/"));
}
