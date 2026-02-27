import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicPaths = ["/login", "/signup", "/forgot-password", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { response, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Allow API routes for auth callback
  if (pathname.startsWith("/api/auth")) {
    return response;
  }

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check profile approval status
  const { data: profile } = await supabase
    .from("lcb_profiles")
    .select("status, role")
    .eq("id", user.id)
    .single<{ status: string; role: string }>();

  if (!profile) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Pending users can only see the pending-approval page
  if (profile.status === "pending" && pathname !== "/pending-approval") {
    const url = request.nextUrl.clone();
    url.pathname = "/pending-approval";
    return NextResponse.redirect(url);
  }

  // Approved users shouldn't see the pending page
  if (profile.status === "approved" && pathname === "/pending-approval") {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  // Rejected or suspended users go to login
  if (profile.status === "rejected" || profile.status === "suspended") {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "error",
      profile.status === "suspended" ? "suspended" : "rejected"
    );
    return NextResponse.redirect(url);
  }

  // Admin routes require CA or Bureau role
  if (
    pathname.startsWith("/admin") &&
    profile.role !== "ca" &&
    profile.role !== "bureau"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
