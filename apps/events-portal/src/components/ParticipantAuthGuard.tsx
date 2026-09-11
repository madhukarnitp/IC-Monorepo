"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "../authClient";

export function ParticipantAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isPending, session, router, pathname]);

  if (isPending) {
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
          <p className="text-gray-500 text-sm font-mono">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-cyan-500/30 flex items-center justify-center mx-auto p-2.5 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            <img
              src="/ic_logo.png"
              alt="Incubation Centre NIT Patna"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-gray-400 text-sm font-mono">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
