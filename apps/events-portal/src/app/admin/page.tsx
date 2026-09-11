"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Users,
  Activity,
  Trophy,
  TrendingUp,
  QrCode,
  Clock,
  Zap,
  ChevronRight,
  Loader2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL as string;

type OverviewData = {
  stats: {
    totalTeams: number;
    totalResources: number;
    totalClaims: number;
    claimRate: number;
  };
  leaderboard: Array<{ id: string; name: string; totalPoints: number }>;
  recentActivity: Array<{
    teamName: string;
    resourceName: string;
    claimedAt: string;
  }>;
  resourceStats: Array<{
    id: string;
    name: string;
    quantity: number;
    quantityUsed: number;
    remaining: number;
    claimCount: number;
    active: boolean;
  }>;
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/events/admin/events`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (d && Array.isArray(d.events)) {
          setEvents(d.events);
          if (d.events.length) setSelectedEventId(d.events[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    setOverview(null);
    fetch(`${API}/events/admin/${selectedEventId}/overview`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const fallback = await fetch(`${API}/events/admin/${selectedEventId}/admin/overview`, { credentials: "include" });
          if (!fallback.ok) return null;
          return fallback.json();
        }
        return r.json();
      })
      .then((d) => {
        if (d && d.stats) {
          setOverview(d);
        } else {
          setOverview(null);
        }
      })
      .catch(() => {
        setOverview(null);
      })
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  const StatCard = ({
    label,
    value,
    sub,
    icon: Icon,
    color,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    icon: any;
    color: string;
  }) => (
    <div className="relative bg-white/[0.03] border border-white/8 rounded-2xl p-6 overflow-hidden group hover:border-white/15 transition-all">
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity ${color}`}
      />
      <div className={`inline-flex p-2 rounded-xl mb-4 ${color.replace("bg-", "bg-").replace("/80", "/10")} border border-white/5`}>
        <Icon className={`w-5 h-5 ${color.replace("bg-", "text-").replace("/80", "-400")}`} />
      </div>
      <div className="text-3xl font-black text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-1 font-mono">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Event management & real-time monitoring</p>
      </div>

      {/* Event Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500 font-mono">EVENT:</label>
        <select
          id="admin-event-select"
          value={selectedEventId || ""}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
        >
          {events.length === 0 && <option value="">No events found</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} ({ev.status})
            </option>
          ))}
        </select>

        <Link
          href="/admin/resources"
          className="ml-auto flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
        >
          Manage Resources <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      )}

      {overview?.stats && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Teams"
              value={overview.stats.totalTeams ?? 0}
              icon={Users}
              color="bg-blue-500/80"
            />
            <StatCard
              label="Resources"
              value={overview.stats.totalResources ?? 0}
              icon={Package}
              color="bg-purple-500/80"
            />
            <StatCard
              label="Claims Made"
              value={overview.stats.totalClaims ?? 0}
              icon={QrCode}
              color="bg-green-500/80"
            />
            <StatCard
              label="Claim Rate"
              value={`${overview.stats.claimRate ?? 0}%`}
              sub="of resources claimed"
              icon={TrendingUp}
              color="bg-cyan-500/80"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leaderboard */}
            <div className="lg:col-span-1 bg-white/[0.03] border border-white/8 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="font-bold text-white">Team Leaderboard</h2>
              </div>
              <div className="space-y-3">
                {(overview.leaderboard || []).map((team, i) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                        i === 0
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : i === 1
                          ? "bg-gray-400/20 text-gray-400 border border-gray-400/30"
                          : i === 2
                          ? "bg-amber-600/20 text-amber-600 border border-amber-600/30"
                          : "bg-white/5 text-gray-600"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-200 truncate">
                      {team.name}
                    </span>
                    <span className="text-sm font-mono text-cyan-400 font-bold">
                      {team.totalPoints} pts
                    </span>
                  </div>
                ))}
                {(!overview.leaderboard || overview.leaderboard.length === 0) && (
                  <p className="text-center text-gray-600 text-sm py-4">No teams yet</p>
                )}
              </div>
            </div>

            {/* Resource Stats */}
            <div className="lg:col-span-2 bg-white/[0.03] border border-white/8 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  <h2 className="font-bold text-white">Resource Inventory</h2>
                </div>
                <Link
                  href="/admin/resources"
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-mono"
                >
                  Manage →
                </Link>
              </div>
              <div className="space-y-3">
                {(overview.resourceStats || []).map((r) => (
                  <div key={r.id} className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-200">{r.name}</span>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                          r.remaining === 0
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-green-500/10 text-green-400 border border-green-500/20"
                        }`}
                      >
                        {r.remaining}/{r.quantity} left
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (r.quantityUsed / r.quantity) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {(!overview.resourceStats || overview.resourceStats.length === 0) && (
                  <p className="text-center text-gray-600 text-sm py-4">No resources yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-green-400" />
              <h2 className="font-bold text-white">Recent Activity</h2>
              <div className="ml-auto">
                <Link
                  href="/admin/logs"
                  className="text-xs text-green-400 hover:text-green-300 transition-colors font-mono"
                >
                  View All Logs →
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              {(overview.recentActivity || []).map((act, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/5 text-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-cyan-400 font-medium">{act.teamName}</span>
                    <span className="text-gray-500 mx-2">claimed</span>
                    <span className="text-white font-medium">{act.resourceName}</span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {act.claimedAt ? new Date(act.claimedAt).toLocaleTimeString() : "--"}
                  </div>
                </div>
              ))}
              {(!overview.recentActivity || overview.recentActivity.length === 0) && (
                <p className="text-center text-gray-600 text-sm py-4">No activity yet</p>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && !overview?.stats && selectedEventId && (
        <div className="text-center py-16 bg-white/[0.02] border border-white/8 rounded-2xl p-8">
          <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-white mb-1">No Overview Data</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Unable to load analytics for the selected event. Please ensure your admin session is active.
          </p>
        </div>
      )}

      {!loading && !selectedEventId && (
        <div className="text-center py-20 border border-white/8 rounded-2xl text-gray-600">
          <Package className="w-10 h-10 mx-auto mb-4 opacity-30" />
          <p>No events found. Create one first.</p>
        </div>
      )}
    </div>
  );
}
