"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import Link from "next/link";
import { Trophy, CheckCircle, Target, BookOpen, Users, UserPlus, Sparkles } from "lucide-react";

export default function ParticipantDashboard() {
  const { eventId } = useParams() as { eventId: string };
  const router = useRouter();
  
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi(`/events/${eventId}/team`)
      .then((data) => {
        setTeam(data.team);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [eventId]);

  if (loading) return <div className="py-20 text-center text-cyan-400 animate-pulse font-mono">Loading dashboard...</div>;
  if (error) {
    const isNoTeam = error.includes("Participant not found") || error.includes("No team found");
    if (isNoTeam) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 bg-zinc-900/60 border border-cyan-500/30 rounded-3xl backdrop-blur-xl text-center space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Users className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Join the Event Arena</h2>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
              You are logged in and ready to participate! To access team checkpoints, view resources, and submit projects, you must create or join a team first.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/${eventId}/register`}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Create or Join Team
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-red-500/10 text-red-400 p-6 rounded-2xl border border-red-500/20 backdrop-blur-md">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Target className="w-5 h-5" /> Error Loading Dashboard</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Team Header */}
      <div className="bg-zinc-900/40 p-8 rounded-3xl border border-zinc-800 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-100 mb-2 tracking-tight">
            {team?.name}
          </h2>
          <p className="text-zinc-500 font-mono text-sm">
            {team?.members?.length} Members • Joined {new Date(team?.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="relative z-10 bg-zinc-950 border border-zinc-800 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(250,204,21,0.05)]">
          <Trophy className="w-10 h-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Total Points</div>
            <div className="text-3xl font-black text-white">{team?.totalPoints || 0}</div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href={`/${eventId}/scan`} className="group relative block bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Target className="relative z-10 w-10 h-10 mb-4 text-indigo-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
          <h3 className="relative z-10 text-xl font-bold text-zinc-100 mb-2">Scan Checkpoints</h3>
          <p className="relative z-10 text-zinc-500 text-sm">Find QR checkpoints and scan them to earn points and unlock resources.</p>
        </Link>

        <Link href={`/${eventId}/resources`} className="group relative block bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <BookOpen className="relative z-10 w-10 h-10 mb-4 text-blue-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <h3 className="relative z-10 text-xl font-bold text-zinc-100 mb-2">Inventory</h3>
          <p className="relative z-10 text-zinc-500 text-sm">View all resources and hints you've unlocked so far.</p>
        </Link>

        <Link href={`/${eventId}/submission`} className="group relative block bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl overflow-hidden hover:border-green-500/50 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CheckCircle className="relative z-10 w-10 h-10 mb-4 text-green-400 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
          <h3 className="relative z-10 text-xl font-bold text-zinc-100 mb-2">Project Builder</h3>
          <p className="relative z-10 text-zinc-500 text-sm">Assemble your final project and submit it for judging.</p>
        </Link>
      </div>

    </div>
  );
}
