"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/authClient";
import { getApiUrl } from "@/lib/api";
import {
  Shield,
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  Terminal,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/resources", label: "Resources & QR", icon: Package },
  { href: "/admin/logs", label: "Activity Logs", icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login" || pathname?.startsWith("/admin/login");
  const { data: session, isPending } = authClient.useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (isLoginPage) return;
    if (isPending) return;

    if (!session) {
      router.push(`/admin/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    // Verify admin role with backend
    const apiUrl = getApiUrl();
    const headers: Record<string, string> = {};
    if (session?.session?.token) {
      headers["Authorization"] = `Bearer ${session.session.token}`;
    }

    fetch(`${apiUrl}/users/me/roles`, {
      headers,
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) {
          setIsAdmin(false);
          return;
        }
        const data = await r.json();
        const ok = Boolean(
          data?.isSuperAdmin ||
          data?.roles?.some((r: any) => {
            const norm = (r.name || "").toUpperCase().replace(/\s+/g, "_");
            return ["ADMIN", "SUPER_ADMIN", "EVENT_ADMIN"].includes(norm);
          })
        );
        setIsAdmin(ok);
      })
      .catch(() => {
        setIsAdmin(false);
      });
  }, [isLoginPage, isPending, session, router, pathname]);

  // If on login page, render children directly without sidebar or auth gate
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isPending || isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-cyan-500/30 flex items-center justify-center mx-auto p-2.5 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
            <img
              src="/ic_logo.png"
              alt="Incubation Centre NIT Patna"
              className="w-full h-full object-contain animate-pulse"
            />
          </div>
          <p className="text-gray-500 text-sm font-mono">Verifying admin credentials...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-mono relative overflow-hidden">
        {/* Ambient grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(239,68,68,1) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,1) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 max-w-md w-full bg-zinc-950 border border-red-500/30 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 font-bold text-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            403
          </div>

          <h1 className="text-2xl font-bold text-red-500">Unauthorized</h1>
          
          <p className="text-gray-400 text-sm leading-relaxed">
            Access Denied: You do not have administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } flex-shrink-0 flex flex-col bg-zinc-950 border-r border-white/8 transition-all duration-300`}
      >
        {/* Logo */}
        <Link
          href="/admin"
          className="h-16 flex items-center px-3.5 border-b border-white/8 gap-3 group hover:bg-white/[0.02] transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 p-1.5 group-hover:border-cyan-500/40 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all">
            <img
              src="/ic_logo.png"
              alt="Incubation Centre NIT Patna Logo"
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest leading-none mb-0.5 font-semibold">
                IC NIT Patna
              </div>
              <div className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                Event Admin
              </div>
            </div>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-cyan-400" : "group-hover:text-white"}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
                {sidebarOpen && active && (
                  <ChevronRight className="w-3 h-3 ml-auto text-cyan-400/50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/8 space-y-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all"
          >
            <Terminal className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Toggle Sidebar</span>}
          </button>

          <button
            onClick={() => authClient.signOut().then(() => router.push("/admin/login"))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/8 bg-black/50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-700">/</span>
            <span>admin</span>
            {pathname !== "/admin" && (
              <>
                <span className="text-gray-700">/</span>
                <span className="text-white capitalize">
                  {pathname.split("/admin/")[1]?.split("/")[0]}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-cyan-400/60 bg-cyan-500/5 border border-cyan-500/20 px-3 py-1 rounded-full">
              {session?.user?.name || session?.user?.email || "Admin"}
            </div>
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
              {(session?.user?.name || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
