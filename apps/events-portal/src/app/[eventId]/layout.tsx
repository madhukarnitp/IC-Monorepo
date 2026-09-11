"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import { fetchApi } from "../../lib/api";
import { useSession } from "../../authClient";

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { eventId } = useParams() as { eventId: string };
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isPending, session, router, pathname]);

  useEffect(() => {
    if (!session) return;
    fetchApi(`/events/${eventId}`)
      .then((data) => {
        setEvent(data.event);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [eventId, session]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-cyan-500/30 flex items-center justify-center mx-auto p-2.5 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
            <img src="/ic_logo.png" alt="IC Logo" className="w-full h-full object-contain animate-pulse" />
          </div>
          <p className="text-gray-500 text-sm font-mono">Verifying participant session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-cyan-500/30 flex items-center justify-center mx-auto p-2.5 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            <img src="/ic_logo.png" alt="IC Logo" className="w-full h-full object-contain" />
          </div>
          <p className="text-gray-400 text-sm font-mono">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-cyan-500/30 flex items-center justify-center mx-auto p-2.5 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
            <img src="/ic_logo.png" alt="IC Logo" className="w-full h-full object-contain animate-pulse" />
          </div>
          <p className="text-cyan-400 text-sm font-mono">Loading Quest Arena...</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-mono">{error}</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <header className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-cyan-400 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-white/5" title="Back to Arena">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <Link href="/" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 p-1 flex items-center justify-center hover:border-cyan-500/40 transition-colors flex-shrink-0" title="Incubation Centre NIT Patna">
            <img src="/ic_logo.png" alt="IC Logo" className="w-full h-full object-contain" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-cyan-400">{event?.name}</h1>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">{event?.type?.replace("_", " ")}</span>
          </div>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href={`/${eventId}`} className="text-gray-400 hover:text-cyan-400 transition-colors">Dashboard</Link>
          <Link href={`/${eventId}/register`} className="text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1">Team</Link>
          
          {["TREASURE_HUNT", "STARTUP_HUNT"].includes(event?.type) && (
            <Link href={`/${eventId}/scan`} className="text-gray-400 hover:text-cyan-400 transition-colors">Scan QR</Link>
          )}
          
          {["HACKATHON", "STARTUP_HUNT", "COMPETITION"].includes(event?.type) && (
            <Link href={`/${eventId}/resources`} className="text-gray-400 hover:text-cyan-400 transition-colors">Resources</Link>
          )}
          
          {["HACKATHON", "STARTUP_HUNT", "COMPETITION"].includes(event?.type) && (
            <Link href={`/${eventId}/submission`} className="text-gray-400 hover:text-cyan-400 transition-colors">Builder</Link>
          )}
        </nav>
      </header>
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
