"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollText, Filter, Download, Clock, Users, Package, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL as string;

type LogEntry = {
  id: string;
  type: string;
  teamId: string;
  teamName: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  initiatedBy: string;
  resolvedAt: string | null;
  members: Array<{ userId: string; name: string; vote: string }>;
};

export default function AdminLogsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState("");

  useEffect(() => {
    fetch(`${API}/events/admin/events`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events || []);
        if (d.events?.length) setEventId(d.events[0].id);
      })
      .catch(() => {});
  }, []);

  const loadLogs = useCallback(() => {
    if (!eventId) return;
    setLoading(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
      ...(teamFilter && { teamId: teamFilter }),
    });

    fetch(`${API}/events/admin/${eventId}/admin/logs?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs || []);
        setTotalPages(d.pagination?.totalPages || 1);
        setTotal(d.pagination?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId, page, teamFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const exportCsv = () => {
    const header = ["Team", "Resource", "Type", "Initiated By", "Claimed At", "Members"];
    const rows = logs.map((l) => [
      l.teamName,
      l.resourceName,
      l.resourceType,
      l.initiatedBy,
      l.resolvedAt ? new Date(l.resolvedAt).toLocaleString() : "—",
      l.members.map((m) => `${m.name}:${m.vote}`).join("; "),
    ]);

    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan-logs-${eventId}.csv`;
    a.click();
  };

  const getVoteColor = (vote: string) => {
    if (vote === "ACCEPTED") return "text-green-400";
    if (vote === "DECLINED") return "text-red-400";
    return "text-gray-500";
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ScrollText className="w-7 h-7 text-green-400" />
            Activity Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Complete audit trail — {total} events recorded
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={eventId}
            onChange={(e) => { setEventId(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>

          <button
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-4 p-4 border-b border-white/8">
          <Filter className="w-4 h-4 text-gray-600" />
          <input
            type="text"
            placeholder="Filter by team name or ID..."
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <ScrollText className="w-10 h-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No scan logs yet.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_120px_40px] gap-4 px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-white/5">
              <span>Team</span>
              <span>Resource</span>
              <span>Initiated By</span>
              <span>Claimed At</span>
              <span />
            </div>

            {logs.map((log) => (
              <div key={log.id}>
                <div
                  onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  className="grid grid-cols-[1fr_1fr_1fr_120px_40px] gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  {/* Team */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
                      {log.teamName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white truncate">{log.teamName}</span>
                  </div>

                  {/* Resource */}
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{log.resourceName}</div>
                    <div className="text-xs text-gray-600 font-mono">{log.resourceType}</div>
                  </div>

                  {/* Initiated by */}
                  <div className="text-sm text-gray-400 truncate">{log.initiatedBy}</div>

                  {/* Time */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                    <Clock className="w-3 h-3" />
                    {log.resolvedAt
                      ? new Date(log.resolvedAt).toLocaleTimeString()
                      : "—"}
                  </div>

                  {/* Expand */}
                  <div className="flex items-center justify-center">
                    {expandedRow === log.id ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                </div>

                {/* Expanded member votes */}
                {expandedRow === log.id && (
                  <div className="px-6 py-4 bg-black/30 border-b border-white/5">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Member Votes
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {log.members.map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg"
                        >
                          {m.vote === "ACCEPTED" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          ) : m.vote === "DECLINED" ? (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                          )}
                          <span className={`text-xs font-medium ${getVoteColor(m.vote)}`}>
                            {m.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-gray-700 font-mono">
                      Log ID: {log.id} | {log.resolvedAt ? new Date(log.resolvedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white hover:bg-white/10 transition-all disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 font-mono">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white hover:bg-white/10 transition-all disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
