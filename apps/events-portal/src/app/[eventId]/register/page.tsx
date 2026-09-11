"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/authClient";
import {
  Users, Plus, Search, Check, X, ArrowRight, Copy, Link2,
  Crown, Shield, UserPlus, Loader2, Hash, Sparkles, LogOut,
  ChevronDown, Bell
} from "lucide-react";

import { getApiUrl } from "@/lib/api";

type TeamMember = {
  id: string;
  user?: { id: string; name: string; email: string; image?: string };
  participant?: {
    user: { id: string; name: string; email: string; image?: string };
  };
  joinedAt: string;
};

type Team = {
  id: string;
  name: string;
  totalPoints: number;
  createdAt: string;
  members: TeamMember[];
  _count?: { members: number };
};

type JoinRequest = {
  id: string;
  teamId: string;
  status: string;
  team?: { id: string; name: string };
  participant?: { user: { id: string; name: string; email: string } };
};

// ── Avatar ─────────────────────────────────────────────────
function Avatar({ name, image, size = "md" }: { name: string; image?: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm";
  const initial = (name || "?").charAt(0).toUpperCase();
  const colors = [
    "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "bg-green-500/20 text-green-400 border-green-500/30",
    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "bg-pink-500/20 text-pink-400 border-pink-500/30",
  ];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];

  return (
    <div className={`${sz} rounded-full ${color} border flex items-center justify-center font-bold flex-shrink-0 overflow-hidden`}>
      {image ? <img src={image} alt={name} className="w-full h-full object-cover" /> : initial}
    </div>
  );
}

// ── MemberCard ─────────────────────────────────────────────
function MemberCard({ member, isLeader, isMe }: { member: TeamMember; isLeader: boolean; isMe: boolean }) {
  const user = member.user || member.participant?.user;
  const name = user?.name || "Unknown";
  const email = user?.email || "";
  const image = user?.image;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      isMe ? "bg-cyan-500/5 border-cyan-500/20" : "bg-white/[0.02] border-white/5 hover:border-white/10"
    }`}>
      <Avatar name={name} image={image} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">
            {name}
          </span>
          {isLeader && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-[9px] font-bold uppercase tracking-wider">
              <Crown className="w-2.5 h-2.5" />
              Leader
            </span>
          )}
          {isMe && (
            <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-400 text-[9px] font-bold uppercase">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 truncate">{email}</p>
      </div>
      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(74,222,128,0.8)] flex-shrink-0" />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function TeamHubPage() {
  const { eventId } = useParams() as { eventId: string };
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;

  const [view, setView] = useState<"SELECT" | "CREATE" | "JOIN">("SELECT");
  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [teamRequests, setTeamRequests] = useState<JoinRequest[]>([]);
  const [myRequests, setMyRequests] = useState<JoinRequest[]>([]);
  const [createName, setCreateName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const authHeaders = {
    Authorization: `Bearer ${session?.session?.token}`,
    "Content-Type": "application/json",
  };

  const loadData = useCallback(async () => {
    if (!session?.user || !eventId) return;
    setLoading(true);

    try {
      const resTeam = await fetch(`${getApiUrl()}/events/${eventId}/team`, {
        headers: authHeaders,
        credentials: "include",
      });

      if (resTeam.ok) {
        const data = await resTeam.json();
        setMyTeam(data.team);

        // Fetch incoming join requests
        const resRequests = await fetch(
          `${getApiUrl()}/events/${eventId}/teams/${data.team.id}/join-requests`,
          { headers: authHeaders, credentials: "include" }
        );
        if (resRequests.ok) {
          const reqData = await resRequests.json();
          setTeamRequests(reqData.requests || []);
        }
      } else {
        setMyTeam(null);
        const [sentRes, allRes] = await Promise.all([
          fetch(`${getApiUrl()}/events/${eventId}/join-requests/me`, {
            headers: authHeaders,
            credentials: "include",
          }),
          fetch(`${getApiUrl()}/events/${eventId}/teams`, {
            headers: authHeaders,
            credentials: "include",
          }),
        ]);
        if (sentRes.ok) setMyRequests((await sentRes.json()).requests || []);
        if (allRes.ok) setAllTeams((await allRes.json()).teams || []);
      }
    } catch {}
    setLoading(false);
  }, [session, eventId]);

  useEffect(() => {
    if (!isPending && !session) router.push("/login");
  }, [isPending, session]);

  useEffect(() => {
    if (!isPending && session) loadData();
  }, [isPending, session, loadData]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setActionLoading("create");

    const res = await fetch(`${getApiUrl()}/events/${eventId}/teams`, {
      method: "POST",
      headers: authHeaders,
      credentials: "include",
      body: JSON.stringify({ name: createName }),
    });

    setActionLoading(null);
    if (res.ok) {
      loadData();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create team");
    }
  };

  const handleJoinRequest = async (teamId: string) => {
    setActionLoading(teamId);
    const res = await fetch(`${getApiUrl()}/events/${eventId}/teams/${teamId}/join-requests`, {
      method: "POST",
      headers: authHeaders,
      credentials: "include",
    });
    setActionLoading(null);
    if (res.ok) {
      loadData();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to send request");
    }
  };

  const handleRespondToRequest = async (
    teamId: string,
    requestId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    setActionLoading(requestId);
    await fetch(`${getApiUrl()}/events/${eventId}/teams/${teamId}/join-requests/${requestId}`, {
      method: "PATCH",
      headers: authHeaders,
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    setActionLoading(null);
    loadData();
  };

  const handleCancelRequest = async (requestId: string) => {
    setActionLoading(requestId);
    await fetch(`${getApiUrl()}/events/${eventId}/join-requests/me/${requestId}`, {
      method: "DELETE",
      headers: authHeaders,
      credentials: "include",
    });
    setActionLoading(null);
    loadData();
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/${eventId}/register?invite=${myTeam?.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading || isPending) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
          <p className="text-gray-500 text-sm font-mono">Loading team hub...</p>
        </div>
      </div>
    );
  }

  // ── PENDING REQUEST STATE ────────────────────────────────
  const pendingReq = myRequests.find((r) => r.status === "PENDING");
  if (pendingReq && !myTeam) {
    return (
      <div className="max-w-md mx-auto w-full py-12 px-4">
        <div className="bg-white/[0.03] border border-cyan-500/20 rounded-3xl p-8 text-center space-y-6 backdrop-blur-xl">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Request Pending</h2>
            <p className="text-gray-400 mt-2">
              You've requested to join{" "}
              <span className="text-cyan-400 font-semibold">{pendingReq.team?.name}</span>.
              Waiting for team acceptance.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600 font-mono">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
            Awaiting team response...
          </div>
          <button
            onClick={() => handleCancelRequest(pendingReq.id)}
            disabled={actionLoading === pendingReq.id}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {actionLoading === pendingReq.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Cancel Request
          </button>
        </div>
      </div>
    );
  }

  // ── TEAM DASHBOARD ───────────────────────────────────────
  if (myTeam) {
    const leaderUser = myTeam.members[0]?.user || myTeam.members[0]?.participant?.user;
    const isLeader = leaderUser?.id === userId;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Team Header Card */}
        <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Team avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
              {myTeam.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white">{myTeam.name}</h1>
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {myTeam.members.length} online
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Team since {new Date(myTeam.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Points */}
            <div className="bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-center flex-shrink-0">
              <div className="text-xs text-gray-500 font-mono uppercase mb-1">Points</div>
              <div className="text-3xl font-black text-yellow-400">{myTeam.totalPoints}</div>
            </div>
          </div>

          {/* Invite link */}
          <div className="relative mt-5 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-4 py-2 min-w-0">
              <Link2 className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
              <span className="text-xs font-mono text-gray-600 truncate">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/${eventId}/register?invite=${myTeam.id}`
                  : "Loading..."}
              </span>
            </div>
            <button
              onClick={copyInviteLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                copied
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Invite"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Members List */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/8">
              <Users className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-white">Members</h2>
              <span className="ml-auto text-xs text-gray-600 font-mono bg-white/5 px-2 py-0.5 rounded-full">
                {myTeam.members.length}
              </span>
            </div>
            <div className="p-4 space-y-2">
              {myTeam.members.map((m, idx) => {
                const mUser = m.user || m.participant?.user;
                return (
                  <MemberCard
                    key={m.id}
                    member={m}
                    isLeader={idx === 0}
                    isMe={mUser?.id === userId}
                  />
                );
              })}
            </div>
          </div>

          {/* Join Requests (if team member) */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/8">
              <UserPlus className="w-4 h-4 text-green-400" />
              <h2 className="font-bold text-white">Join Requests</h2>
              {teamRequests.length > 0 && (
                <span className="ml-auto flex items-center gap-1 text-xs text-orange-400 font-mono bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  <Bell className="w-2.5 h-2.5" />
                  {teamRequests.length} pending
                </span>
              )}
            </div>
            <div className="p-4">
              {teamRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No pending requests</p>
                  <p className="text-xs mt-1 text-gray-700">Share your invite link to recruit members</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-white/5"
                    >
                      <Avatar name={req.participant?.user.name || "?"} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {req.participant?.user.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{req.participant?.user.email}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRespondToRequest(myTeam.id, req.id, "APPROVED")}
                          disabled={actionLoading === req.id}
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg transition-all"
                        >
                          {actionLoading === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRespondToRequest(myTeam.id, req.id, "REJECTED")}
                          disabled={actionLoading === req.id}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── REGISTER: SELECT / CREATE / JOIN ─────────────────────
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md">
        {view === "SELECT" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                <Hash className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-3xl font-black text-white">Join the Arena</h1>
              <p className="text-gray-500 mt-2">Create or join a team to participate</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setView("CREATE")}
                className="w-full group p-5 bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.06] rounded-2xl transition-all text-left flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all">
                  <Plus className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                    Create a Team
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">Lead your squad to victory</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-cyan-400 transition-colors" />
              </button>

              <button
                onClick={() => setView("JOIN")}
                className="w-full group p-5 bg-white/[0.03] border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06] rounded-2xl transition-all text-left flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors">
                    Join a Team
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">Browse and apply to existing teams</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-purple-400 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {view === "CREATE" && (
          <div>
            <button
              onClick={() => setView("SELECT")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-cyan-400 mb-6 transition-colors"
            >
              ← Back
            </button>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-1">Create Team</h2>
              <p className="text-gray-500 text-sm mb-6">Choose a unique name for your squad</p>

              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="team-name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder-gray-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading === "create" || !createName.trim()}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === "create" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Create Team
                </button>
              </form>
            </div>
          </div>
        )}

        {view === "JOIN" && (
          <div>
            <button
              onClick={() => setView("SELECT")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-400 mb-6 transition-colors"
            >
              ← Back
            </button>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/8">
                <h2 className="text-xl font-bold text-white mb-1">Join a Team</h2>
                <p className="text-gray-500 text-sm">Search teams and send a join request</p>
              </div>

              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-colors placeholder-gray-600"
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                {allTeams
                  .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((team) => {
                    const alreadyRequested = myRequests.some(
                      (r) => r.teamId === team.id && r.status === "PENDING"
                    );
                    return (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{team.name}</p>
                          <p className="text-xs text-gray-600">{team._count?.members || 0} members</p>
                        </div>
                        <button
                          onClick={() => handleJoinRequest(team.id)}
                          disabled={alreadyRequested || actionLoading === team.id}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                            alreadyRequested
                              ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 cursor-default"
                              : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {actionLoading === team.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : alreadyRequested ? (
                            "Pending"
                          ) : (
                            <>
                              <ArrowRight className="w-3 h-3" />
                              Request
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                {allTeams.filter((t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-sm">
                    No teams found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
