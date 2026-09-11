"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import QRCode from "qrcode";
import {
  Package, Plus, Upload, Download, QrCode, Trash2, Edit3, X, Check,
  Loader2, AlertCircle, FileSpreadsheet, RefreshCw, Zap, ChevronDown, Eye
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

type Resource = {
  id: string;
  name: string;
  description?: string;
  type: string;
  quantity: number;
  quantityUsed: number;
  active: boolean;
  createdAt: string;
};

type QrTokenEntry = {
  resourceId: string;
  resourceName: string;
  type?: string;
  quantity?: number;
  remaining?: number;
  token: string;
};

// ── Mini components ────────────────────────────────────────

function QuantityBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 100
              ? "bg-red-500"
              : pct > 60
              ? "bg-orange-500"
              : "bg-gradient-to-r from-cyan-500 to-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-500 w-16 text-right">
        {used}/{total}
      </span>
    </div>
  );
}

// ── QR Modal ───────────────────────────────────────────────

function QrModal({
  tokens,
  onClose,
}: {
  tokens: QrTokenEntry[];
  onClose: () => void;
}) {
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    const generate = async () => {
      const imgs: Record<string, string> = {};
      for (const t of tokens) {
        try {
          imgs[t.resourceId] = await QRCode.toDataURL(t.token, {
            errorCorrectionLevel: "H",
            width: 320,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
        } catch {}
      }
      setQrImages(imgs);
      setGenerating(false);
    };
    generate();
  }, [tokens]);

  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = `
      <html><head><title>Resource QR Codes</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: white; color: #111; }
        .header { text-align: center; padding: 24px 16px; border-bottom: 2px solid #eee; margin-bottom: 20px; }
        .qr-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; padding: 16px; max-width: 800px; margin: 0 auto; }
        .qr-item { text-align: center; border: 2px dashed #ddd; border-radius: 12px; padding: 20px; page-break-inside: avoid; background: #fafafa; }
        .qr-item img { width: 220px; height: 220px; display: block; margin: 0 auto; }
        .resource-name { font-weight: 800; font-size: 16px; margin: 12px 0 4px; }
        .resource-meta { font-size: 11px; color: #666; font-family: monospace; text-transform: uppercase; }
        .notice { font-size: 10px; color: #999; margin-top: 8px; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <div class="header">
          <h2 style="margin:0; font-size: 20px;">Event Resource QR Codes</h2>
          <p style="margin:6px 0; color:#666; font-size:13px">${tokens.length} Secure Resource QR(s) — Each QR can be scanned by any team</p>
          <button onclick="window.print()" style="margin-top:10px; padding:8px 20px; background:#000; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold">Print Codes</button>
        </div>
        <div class="qr-grid">
          ${tokens
            .map((t) => {
              const src = qrImages[t.resourceId] || "";
              return `
                <div class="qr-item">
                  <img src="${src}" alt="QR" />
                  <div class="resource-name">${t.resourceName}</div>
                  <div class="resource-meta">TYPE: ${t.type || "ITEM"} ${t.quantity ? `| TOTAL QTY: ${t.quantity}` : ""}</div>
                  <div class="notice">Scannable by all registered teams • HMAC-SHA256 Protected</div>
                </div>`;
            })
            .join("")}
        </div>
      </body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const downloadQr = (key: string, name: string) => {
    if (!qrImages[key]) return;
    const link = document.createElement("a");
    link.href = qrImages[key];
    link.download = `${name.replace(/\s+/g, "-")}-QR.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-cyan-400" />
              Secure Resource QR Code
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {tokens.length === 1
                ? `1 single secure QR code for "${tokens[0].resourceName}" — scannable by multiple teams`
                : `${tokens.length} secure QR codes (1 per resource) — scannable by all teams`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintAll}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Print All
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {generating ? (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Rendering QR codes...</span>
            </div>
          ) : (
            <div className={`grid gap-6 ${tokens.length === 1 ? "max-w-xs mx-auto" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"}`}>
              {tokens.map((t) => {
                const key = t.resourceId;
                return (
                  <div
                    key={key}
                    className="bg-white p-4 rounded-2xl text-center group relative overflow-hidden shadow-xl border border-gray-100"
                  >
                    {qrImages[key] ? (
                      <img src={qrImages[key]} alt="QR" className="w-full aspect-square object-contain mx-auto" />
                    ) : (
                      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                        Rendering...
                      </div>
                    )}
                    <div className="mt-3">
                      <p className="text-black text-sm font-black truncate">{t.resourceName}</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">
                          {t.type || "ITEM"}
                        </span>
                        {t.remaining !== undefined && (
                          <span className="text-[10px] font-mono text-gray-500 font-medium">
                            {t.remaining} left
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">
                        HMAC-SHA256 • Shared across teams
                      </p>
                    </div>
                    <button
                      onClick={() => downloadQr(key, t.resourceName)}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 opacity-0 group-hover:opacity-100 transition-all rounded-2xl backdrop-blur-xs text-white"
                    >
                      <Download className="w-8 h-8 text-cyan-400" />
                      <span className="text-xs font-bold">Download PNG</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Resource Modal ──────────────────────────────

function ResourceModal({
  initial,
  onSave,
  onClose,
  eventId,
}: {
  initial?: Partial<Resource>;
  onSave: () => void;
  onClose: () => void;
  eventId: string;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [type, setType] = useState(initial?.type || "ITEM");
  const [quantity, setQuantity] = useState(initial?.quantity || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = initial?.id
      ? `${API}/events/admin/${eventId}/resources/${initial.id}`
      : `${API}/events/admin/${eventId}/resources`;
    const method = initial?.id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, description, type, quantity }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save resource");
        return;
      }

      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">
            {initial?.id ? "Edit Resource" : "Add Resource"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block uppercase tracking-wider">
              Resource Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Hint Card 1"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block uppercase tracking-wider">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 appearance-none"
              >
                {["ITEM", "HINT", "CLUE", "TOOL", "BONUS", "CUSTOM"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block uppercase tracking-wider">
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min={1}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 mb-1 block uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {initial?.id ? "Save Changes" : "Create Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function AdminResourcesPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrTokens, setQrTokens] = useState<QrTokenEntry[] | null>(null);
  const [qrLoading, setQrLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Partial<Resource> | undefined>();
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelResult, setExcelResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load events
  useEffect(() => {
    fetch(`${API}/events/admin/events`, { credentials: "include" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.events)) {
          setEvents(d.events);
          if (d.events.length) setEventId(d.events[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const loadResources = useCallback(() => {
    if (!eventId) return;
    setLoading(true);
    fetch(`${API}/events/admin/${eventId}/resources`, { credentials: "include" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.resources)) {
          setResources(d.resources);
        } else {
          setResources([]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleDelete = async (resourceId: string) => {
    if (!confirm("Deactivate this resource?")) return;
    await fetch(`${API}/events/admin/${eventId}/resources/${resourceId}`, {
      method: "DELETE",
      credentials: "include",
    });
    loadResources();
  };

  const generateQrForResource = async (resourceId: string, resourceName: string) => {
    setQrLoading(resourceId);
    try {
      const res = await fetch(
        `${API}/events/admin/${eventId}/resources/${resourceId}/generate-qr`,
        { method: "POST", credentials: "include" }
      );
      const d = await res.json();
      if (d.tokens) setQrTokens(d.tokens);
    } catch {}
    setQrLoading(null);
  };

  const generateAllQrs = async () => {
    setQrLoading("ALL");
    try {
      const res = await fetch(`${API}/events/admin/${eventId}/resources/generate-qrs-all`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (d.tokens) setQrTokens(d.tokens);
    } catch {}
    setQrLoading(null);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    setExcelLoading(true);
    setExcelResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/events/admin/${eventId}/resources/bulk-excel`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const d = await res.json();
      setExcelResult(d);
      loadResources();
    } catch (err: any) {
      setExcelResult({ error: err.message });
    } finally {
      setExcelLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Package className="w-7 h-7 text-purple-400" />
            Resource Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Create resources, manage quantity, generate HMAC-signed QR codes
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Event selector */}
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none appearance-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id} className="bg-zinc-900 text-white">
                {ev.name}
              </option>
            ))}
          </select>

          {/* Excel Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelUpload}
            className="hidden"
            id="excel-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={excelLoading || !eventId}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white hover:bg-white/10 transition-all disabled:opacity-50 cursor-pointer"
          >
            {excelLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
            )}
            Import Excel
          </button>

          {/* Generate All QRs */}
          <button
            onClick={generateAllQrs}
            disabled={qrLoading === "ALL" || !eventId || resources.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-sm text-purple-300 hover:bg-purple-500/20 transition-all disabled:opacity-50"
          >
            {qrLoading === "ALL" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Generate All QRs
          </button>

          {/* Add Resource */}
          <button
            onClick={() => {
              setEditingResource(undefined);
              setShowModal(true);
            }}
            disabled={!eventId}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-sm text-black font-bold hover:opacity-90 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        </div>
      </div>

      {/* Excel Result Banner */}
      {excelResult && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            excelResult.error
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-green-500/10 border-green-500/20 text-green-400"
          }`}
        >
          {excelResult.error ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <div>
            {excelResult.error ? (
              <span>{excelResult.error}</span>
            ) : (
              <>
                <span className="font-bold">{excelResult.created} resources imported</span>
                {excelResult.errors?.length > 0 && (
                  <span className="text-yellow-400 ml-2">
                    ({excelResult.errors.length} rows had errors)
                  </span>
                )}
              </>
            )}
          </div>
          <button onClick={() => setExcelResult(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Resource Table */}
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <span className="text-sm font-medium text-gray-400">
            {resources.length} resources
          </span>
          <button
            onClick={loadResources}
            disabled={loading}
            className="p-1.5 text-gray-600 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <Package className="w-10 h-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No resources yet. Add one or import from Excel.</p>
            <p className="text-xs mt-2 text-gray-700">
              Excel columns: name, type, quantity, description
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {resources.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors ${
                  !r.active ? "opacity-40" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white truncate">{r.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-gray-500 uppercase">
                      {r.type}
                    </span>
                    {!r.active && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-red-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-xs text-gray-600 truncate">{r.description}</p>
                  )}
                  <div className="mt-2 w-48">
                    <QuantityBar used={r.quantityUsed} total={r.quantity} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Generate QR for this resource */}
                  <button
                    onClick={() => generateQrForResource(r.id, r.name)}
                    disabled={qrLoading === r.id || !r.active}
                    title="Generate QR codes for all teams"
                    className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all disabled:opacity-40"
                  >
                    {qrLoading === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setEditingResource(r);
                      setShowModal(true);
                    }}
                    title="Edit resource"
                    className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(r.id)}
                    title="Deactivate resource"
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ResourceModal
          initial={editingResource}
          eventId={eventId}
          onSave={() => {
            setShowModal(false);
            loadResources();
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {qrTokens && (
        <QrModal tokens={qrTokens} onClose={() => setQrTokens(null)} />
      )}
    </div>
  );
}
