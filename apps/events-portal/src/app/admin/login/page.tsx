"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/authClient";
import { getApiUrl } from "@/lib/api";
import { Shield, Mail, Lock, Eye, EyeOff, Terminal, Loader2, AlertCircle, ArrowLeft, LogOut } from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const reason = searchParams.get("reason");

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [sessionAdminStatus, setSessionAdminStatus] = useState<boolean | null>(null);

  const [mode, setMode] = useState<"email" | "google">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    reason === "insufficient_permissions"
      ? "Access restricted: Administrator privileges required to enter this section."
      : null
  );

  // If already logged in, check role
  useEffect(() => {
    if (sessionPending || !session) return;

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
          setSessionAdminStatus(false);
          return;
        }
        const data = await r.json();
        const ok = Boolean(
          data?.isSuperAdmin ||
          data?.roles?.some((role: any) => {
            const norm = (role.name || "").toUpperCase().replace(/\s+/g, "_");
            return ["ADMIN", "SUPER_ADMIN", "EVENT_ADMIN"].includes(norm);
          })
        );
        setSessionAdminStatus(ok);
        if (ok) {
          router.push(callbackUrl);
        }
      })
      .catch(() => {
        setSessionAdminStatus(false);
      });
  }, [session, sessionPending, callbackUrl, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMode("email");
    setError(null);

    try {
      const res = await authClient.signIn.email({ email, password });

      if ((res as any).error) {
        setError((res as any).error.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      // Check admin role via API
      const apiUrl = getApiUrl();
      const token = (res as any)?.data?.session?.token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const roleRes = await fetch(`${apiUrl}/users/me/roles`, {
        headers,
        credentials: "include",
      });
      const roleData = await roleRes.json();

      const isAdmin = Boolean(
        roleData?.isSuperAdmin ||
        roleData?.roles?.some((r: any) => {
          const norm = (r.name || "").toUpperCase().replace(/\s+/g, "_");
          return ["ADMIN", "SUPER_ADMIN", "EVENT_ADMIN"].includes(norm);
        })
      );

      if (!isAdmin) {
        await authClient.signOut();
        setError("Access denied: Admin privileges required. Your account is not authorized as an administrator.");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMode("google");
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Ambient grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] p-2.5">
            <img
              src="/ic_logo.png"
              alt="Incubation Centre NIT Patna Logo"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2 text-xs font-mono text-cyan-400/60 uppercase tracking-widest">
            <Terminal className="w-3 h-3" />
            <span>Restricted Access</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Admin <span className="text-cyan-400">Portal</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Authorized personnel only</p>
        </div>

        {/* Card */}
        <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          {/* Top accent line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />


          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            id="google-signin-btn"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {loading && mode === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-600 font-mono">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                id="admin-email"
                type="email"
                placeholder="admin@incubationcenter.nitp.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all text-sm"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input
                id="admin-password"
                type={showPass ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold text-sm hover:opacity-90 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Sign In to Admin
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-600">
            This portal is restricted to authorized Incubation Center admins only.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
