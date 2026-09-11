"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { BookOpen, Lock, Unlock } from "lucide-react";
import Link from "next/link";

export default function ResourceInventoryPage() {
  const { eventId } = useParams() as { eventId: string };

  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    fetchApi(`/events/${eventId}/team`)
      .then((data) => {
        setResources(data.team.resources || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [eventId]);

  if (loading) return <div className="py-20 text-center animate-pulse">Loading resources...</div>;
  if (error) {
    const isNoTeam = error.includes("Participant not found") || error.includes("No team found");
    if (isNoTeam) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 bg-zinc-900/60 border border-cyan-500/30 rounded-3xl backdrop-blur-xl text-center space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Team Setup Required</h2>
            <p className="text-zinc-400 text-sm mt-2">
              You need to be part of a team to unlock and view inventory resources.
            </p>
          </div>
          <Link
            href={`/${eventId}/register`}
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all"
          >
            Create or Join Team
          </Link>
        </div>
      );
    }
    return <div className="text-red-500 text-center py-10">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <Link href={`/${eventId}`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors text-sm font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.1)]">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-zinc-100">Inventory</h2>
          <p className="text-zinc-500 font-mono text-sm mt-1">Resources you've unlocked</p>
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/40 rounded-3xl border border-zinc-800 border-dashed backdrop-blur-sm">
          <Lock className="w-12 h-12 text-zinc-700 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
          <h3 className="text-lg font-medium text-zinc-300">No resources unlocked yet</h3>
          <p className="text-zinc-500 mt-1">Scan checkpoints to unlock hints and resources.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((tr, idx) => (
            <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 shadow-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:border-cyan-500/50 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Unlock className="w-16 h-16 text-cyan-500" />
              </div>
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
                  {tr.resource.type}
                </span>
                <h3 className="text-xl font-bold text-zinc-100 mb-2">{tr.resource.name}</h3>
                <p className="text-zinc-400 mb-6 leading-relaxed">{tr.resource.description}</p>

                <div className="text-xs text-zinc-500 font-mono">
                  Unlocked at {new Date(tr.unlockedAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
