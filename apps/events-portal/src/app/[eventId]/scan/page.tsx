"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { authClient } from "@/authClient";
import { getApiUrl } from "@/lib/api";
import Link from "next/link";
import {
  QrCode, CheckCircle2, XCircle, Clock, Zap, ShieldAlert, ArrowLeft,
  Loader2, AlertTriangle, Users, Timer, Snowflake, RefreshCw, Package
} from "lucide-react";

const POLL_INTERVAL = 4000; // 4s polling

type VoteMember = {
  id: string;
  name: string;
  image?: string;
  vote: "PENDING" | "ACCEPTED" | "DECLINED";
};

type ActiveSession = {
  id: string;
  expiresAt: string;
  initiatedBy: string;
  resource: { id: string; name: string; description?: string; type: string };
  votes: Array<{ userId: string; user: { id: string; name: string; image?: string }; vote: string }>;
  myVote: string | null;
  isInitiator: boolean;
};

type CooldownInfo = {
  expiresAt: string;
  reason: string;
  secondsLeft: number;
};

type Phase = "SCAN" | "VOTING" | "COOLDOWN" | "SUCCESS" | "FAILED";

// ── Avatar ─────────────────────────────────────────────────
function MiniAvatar({ name, vote }: { name: string; vote: string }) {
  const colors: Record<string, string> = {
    ACCEPTED: "border-green-500/60 shadow-[0_0_10px_rgba(74,222,128,0.4)]",
    DECLINED: "border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.4)]",
    PENDING: "border-yellow-500/30 animate-pulse",
  };
  const textColors: Record<string, string> = {
    ACCEPTED: "text-green-400",
    DECLINED: "text-red-400",
    PENDING: "text-yellow-400",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-12 h-12 rounded-full bg-white/5 border-2 ${colors[vote] || "border-white/20"} flex items-center justify-center text-base font-bold text-white transition-all`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className={`text-[10px] font-mono ${textColors[vote] || "text-gray-500"}`}>
        {vote === "PENDING" ? "..." : vote === "ACCEPTED" ? "✓" : "✗"}
      </div>
      <div className="text-[10px] text-gray-600 truncate max-w-[52px] text-center">{name.split(" ")[0]}</div>
    </div>
  );
}

// ── Countdown Timer ────────────────────────────────────────
function Countdown({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [secs, setSecs] = useState(() =>
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (secs <= 0) {
      onExpire?.();
      return;
    }
    const t = setInterval(() => {
      setSecs((s) => {
        const next = s - 1;
        if (next <= 0) {
          clearInterval(t);
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const pct = Math.min(100, (secs / 60) * 100);
  const isUrgent = secs <= 10;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-4xl font-black tabular-nums font-mono ${
          isUrgent ? "text-red-400 animate-pulse" : "text-white"
        }`}
      >
        {String(Math.floor(secs / 60)).padStart(2, "0")}:{String(secs % 60).padStart(2, "0")}
      </div>
      <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isUrgent
              ? "bg-red-500"
              : secs < 30
              ? "bg-yellow-500"
              : "bg-gradient-to-r from-cyan-500 to-green-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function ScanPage() {
  const { eventId } = useParams() as { eventId: string };
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [phase, setPhase] = useState<Phase>("SCAN");
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [cooldown, setCooldown] = useState<CooldownInfo | null>(null);
  const [successResource, setSuccessResource] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState<"ACCEPTED" | "DECLINED" | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const phaseRef = useRef<Phase>(phase);

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.session?.token) {
      headers["Authorization"] = `Bearer ${session.session.token}`;
    }
    return headers;
  }, [session]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── Poll for active session ────────────────────────────
  const pollSession = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/events/${eventId}/scan/scan-votes/active`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.cooldown) {
        setCooldown(data.cooldown);
        setActiveSession(null);
        setPhase("COOLDOWN");
        return;
      }

      if (data.activeSession) {
        setActiveSession(data.activeSession);
        setPhase("VOTING");
      } else if (phaseRef.current === "VOTING") {
        // Session resolved externally — check for success
        setPhase("SCAN");
        setActiveSession(null);
      }
    } catch {}
  }, [eventId, getAuthHeaders]);

  useEffect(() => {
    pollRef.current = setInterval(pollSession, POLL_INTERVAL);
    pollSession(); // immediate first poll
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollSession]);

  // ── Scanner setup ─────────────────────────────────────
  useEffect(() => {
    if (phase !== "SCAN" || isProcessing) {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        const element = document.getElementById("qr-reader");
        if (!element) return;

        const qrCode = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = qrCode;

        await qrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (isMounted) {
              if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().catch(() => {});
              }
              inititateScan(decodedText);
            }
          },
          () => {} // Ignore failure frames
        );
      } catch (err) {
        console.warn("Camera start warning/error:", err);
      }
    };

    const timer = setTimeout(startScanner, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [phase, isProcessing]);

  const [scanTimestamps, setScanTimestamps] = useState<{ scannedAt?: string; resolvedAt?: string } | null>(null);

  // ── Initiate scan ──────────────────────────────────────
  const inititateScan = async (token: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${getApiUrl()}/events/${eventId}/scan`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "TEAM_ON_COOLDOWN") {
          setCooldown({
            expiresAt: data.cooldownExpiresAt,
            reason: data.message,
            secondsLeft: data.secondsLeft,
          });
          setPhase("COOLDOWN");
        } else {
          setScanTimestamps({
            scannedAt: data.scannedAt,
            resolvedAt: data.resolvedAt,
          });
          if (data.cooldownExpiresAt) {
            setCooldown({
              expiresAt: data.cooldownExpiresAt,
              reason: data.message || "30s Cold Period",
              secondsLeft: data.secondsLeft || 30,
            });
          }
          setError(data.message || data.error || "Scan failed");
          setPhase("FAILED");
        }
        return;
      }

      if (data.resolved && data.outcome === "ACCEPTED") {
        setScanTimestamps({
          scannedAt: data.scannedAt || new Date().toISOString(),
          resolvedAt: data.resolvedAt || new Date().toISOString(),
        });
        setSuccessResource(data.resourceUnlocked);
        if (data.cooldownExpiresAt) {
          setCooldown({
            expiresAt: data.cooldownExpiresAt,
            reason: "30s Cold Period",
            secondsLeft: data.cooldownSeconds || 30,
          });
        }
        setPhase("SUCCESS");
      } else {
        await pollSession();
      }
    } catch (err: any) {
      setError(err.message || "Network error");
      setPhase("FAILED");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToScan = () => {
    setPhase("SCAN");
    setError(null);
    setActiveSession(null);
    setSuccessResource(null);
    setScanTimestamps(null);
    setVoted(false);
    setVoteSubmitting(null);
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-sm mx-auto w-full px-4 py-8">

      {/* ── SCAN PHASE ── */}
      {phase === "SCAN" && !isProcessing && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
              <QrCode className="w-7 h-7 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Scan Checkpoint</h2>
            <p className="text-gray-500 text-sm mt-1">Point your camera at the resource QR code</p>
          </div>

          <div
            id="qr-reader"
            className="w-full rounded-2xl border border-white/10 overflow-hidden bg-zinc-950"
          />

          <p className="text-center text-xs text-gray-600 font-mono">
            30s cold period applies between scans
          </p>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {isProcessing && (
        <div className="text-center py-20 space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
          <p className="text-indigo-400 font-medium">Verifying QR code...</p>
        </div>
      )}

      {/* ── COOLDOWN PHASE ── */}
      {phase === "COOLDOWN" && cooldown && (
        <div className="text-center py-8 space-y-6 animate-in fade-in duration-300">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: "2s" }} />
            </div>
            <div className="relative w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(239,68,68,0.3)]">
              <Snowflake className="w-10 h-10 text-red-400" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black text-red-400">Team Cold Period</h3>
            <p className="text-gray-400 text-sm mt-2">{cooldown.reason}</p>
          </div>

          <Countdown
            expiresAt={cooldown.expiresAt}
            onExpire={() => {
              setCooldown(null);
              setPhase("SCAN");
              setVoted(false);
            }}
          />

          <p className="text-xs text-gray-600 font-mono">
            30-second cold period active before next scan can be initiated.
          </p>
        </div>
      )}

      {/* ── SUCCESS PHASE ── */}
      {phase === "SUCCESS" && successResource && (
        <div className="text-center py-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: "1.5s" }} />
            </div>
            <div className="relative w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(74,222,128,0.4)]">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-black text-green-400">Resource Claimed!</h3>
            <p className="text-gray-400 text-sm mt-1">Scan processed & accepted</p>
          </div>

          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5 text-left space-y-3">
            <div>
              <div className="text-xs text-cyan-400/70 font-mono uppercase tracking-wider mb-1">Unlocked Resource</div>
              <div className="text-xl font-bold text-white">{successResource.name}</div>
              {successResource.description && (
                <p className="text-sm text-gray-400 mt-1">{successResource.description}</p>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <div className="text-gray-500 text-[10px] uppercase">Team Scan Time</div>
                <div className="text-cyan-300 font-bold mt-0.5">
                  {scanTimestamps?.scannedAt ? new Date(scanTimestamps.scannedAt).toLocaleTimeString() : "Just now"}
                </div>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <div className="text-gray-500 text-[10px] uppercase">Accept Time</div>
                <div className="text-green-400 font-bold mt-0.5">
                  {scanTimestamps?.resolvedAt ? new Date(scanTimestamps.resolvedAt).toLocaleTimeString() : "Just now"}
                </div>
              </div>
            </div>
          </div>

          {/* 30s Cold Period Countdown */}
          {cooldown && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-sm">
                <Snowflake className="w-4 h-4" />
                30s Cold Period Active
              </div>
              <Countdown expiresAt={cooldown.expiresAt} />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={resetToScan}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Scan Again
            </button>
            <button
              onClick={() => router.push(`/${eventId}/resources`)}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-green-500 text-black text-sm font-bold hover:opacity-90 transition-all"
            >
              View Inventory
            </button>
          </div>
        </div>
      )}

      {/* ── FAILED / ERROR ── */}
      {phase === "FAILED" && (
        <div className="text-center py-8 space-y-5 animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <AlertTriangle className="w-9 h-9 text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Scan Failed</h3>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </div>
          <button
            onClick={resetToScan}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Back link */}
      {phase === "SCAN" && !isProcessing && (
        <div className="mt-6 text-center">
          <Link
            href={`/${eventId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
