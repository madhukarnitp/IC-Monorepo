import React from "react";
import { DashboardNavbar } from "../components/DashboardNavbar";
import { DashboardFooter } from "../components/DashboardFooter";
import { GamifiedEventCard, EventType } from "../components/GamifiedEventCard";
import { ParticipantAuthGuard } from "../components/ParticipantAuthGuard";
import { Sparkles, Activity, Crosshair, Archive } from "lucide-react";

export const dynamic = "force-dynamic";

async function getEvents(): Promise<EventType[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  try {
    const res = await fetch(`${apiUrl}/events`, { cache: "no-store" });
    if (!res.ok) throw new Error("API not ok");
    const data = await res.json();
    return data.events || [];
  } catch (err) {
    console.error("Failed to fetch events server-side:", err);
    // Return dummy data if backend is not running yet
    return [
      { id: "1", name: "Cyberpunk Hackathon 2026", slug: "cyber-hack-26", description: "Build the next gen AI integrations in 48 hours.", type: "HACKATHON", status: "ACTIVE" },
      { id: "2", name: "Algorithm Treasure Hunt", slug: "algo-hunt", description: "Solve algorithmic puzzles to find the hidden flag.", type: "TREASURE_HUNT", status: "ACTIVE" },
      { id: "3", name: "Web3 Pitch Day", slug: "web3-pitch", description: "Pitch your DApp to top investors.", type: "COMPETITION", status: "REGISTRATION_OPEN" },
      { id: "4", name: "AI Prompt Battle", slug: "prompt-battle", description: "Who can generate the best output?", type: "COMPETITION", status: "DRAFT" },
      { id: "5", name: "Legacy Code Refactor", slug: "legacy-refactor", description: "Clean up the messiest codebase to win.", type: "HACKATHON", status: "COMPLETED" },
    ];
  }
}

export default async function Home() {
  const events = await getEvents();

  const activeStatuses = ["ACTIVE", "BUILDING", "SUBMISSIONS_OPEN"];
  const pastStatuses = ["COMPLETED", "CANCELLED", "SUBMISSIONS_CLOSED"];
  
  const activeEvents = events.filter(e => activeStatuses.includes(e.status));
  const pastEvents = events.filter(e => pastStatuses.includes(e.status));
  const upcomingEvents = events.filter(e => !activeStatuses.includes(e.status) && !pastStatuses.includes(e.status));

  return (
    <ParticipantAuthGuard>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
        <DashboardNavbar />
      
      <main className="container mx-auto px-4 pt-12 pb-24">
        {/* Dashboard Header */}
        <div className="relative mb-16 p-8 rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
          {/* Subtle accent line */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-gray-400 mb-4 font-mono text-sm uppercase tracking-wider font-bold">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Welcome to the Arena</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight text-white">
              SELECT YOUR <span className="text-cyan-400">QUEST</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl">
              Discover active hackathons, upcoming challenges, and past glories. Join events to earn XP, level up your profile, and climb the global leaderboard.
            </p>
          </div>
        </div>

        {/* Active Events Section */}
        {activeEvents.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
              <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30 text-green-400">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Active Quests</h2>
              <div className="ml-auto flex items-center gap-2 text-xs font-mono text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                LIVE NOW
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEvents.map(event => (
                <GamifiedEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events Section */}
        {upcomingEvents.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30 text-blue-400">
                <Crosshair className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Upcoming Challenges</h2>
              <span className="ml-auto text-sm text-gray-500 font-mono">{upcomingEvents.length} Pending</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map(event => (
                <GamifiedEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Past Events Section */}
        {pastEvents.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
              <div className="p-2 bg-gray-500/20 rounded-lg border border-gray-500/30 text-gray-400">
                <Archive className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-300">Quest Archives</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map(event => (
                <GamifiedEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
        
        {events.length === 0 && (
          <div className="text-center py-20 border border-white/10 rounded-2xl bg-white/5 border-dashed">
            <Crosshair className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Quests Found</h3>
            <p className="text-gray-500">The arena is empty. Come back later for new challenges.</p>
          </div>
        )}
      </main>

      <DashboardFooter />
      </div>
    </ParticipantAuthGuard>
  );
}
