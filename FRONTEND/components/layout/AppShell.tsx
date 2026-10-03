"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { Shield } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/privacy", "/terms"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check authentication token in localStorage
    const token = typeof window !== "undefined" ? localStorage.getItem("caseintel_token") : null;
    const hasAuth = !!token;

    setIsAuthenticated(hasAuth);

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    // If not authenticated and attempting to view any protected page, bounce to /login immediately
    if (!hasAuth && !isPublic) {
      router.replace("/login");
    }
  }, [pathname, router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isLoginPage = pathname === "/login";
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // If on a protected route and still checking authentication, show a clean security check banner
  if (!isPublicRoute && isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-4 shadow-md animate-pulse">
          <Shield size={24} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">
          Verifying Official Credentials...
        </p>
      </div>
    );
  }

  // If on a protected route and not authenticated, do not flash protected dashboard
  if (!isPublicRoute && !isAuthenticated) {
    return null;
  }

  // If on the login page, render clean full-screen layout without Topbar / Sidebar
  if (isLoginPage) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  // Authenticated: render responsive dashboard shell with mobile drawer support
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-900 w-full overflow-x-hidden">
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Topbar onOpenSidebar={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
