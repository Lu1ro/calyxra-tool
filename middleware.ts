import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // TODO: Before launch, read a real session (e.g. signed JWT or NextAuth session)
  // and redirect unauthenticated users to the marketing site's login page.
  // For now, we allow all requests in development.
  return NextResponse.next();
}

