"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "../../../lib/api";
import { CheckCircle, Save, Send } from "lucide-react";
import Link from "next/link";

export default function StartupBuilderPage() {
  const { eventId } = useParams() as { eventId: string };
  const router = useRouter();

  const [formData, setFormData] = useState({
    startupName: "",
    tagline: "",
    problem: "",
    solution: "",
    targetCustomer: "",
    businessModel: "",
    revenueModel: "",
    goToMarket: "",
    pitch: "",
  });

  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi(`/events/${eventId}/submission`)
      .then((data) => {
        if (data.submission) {
          setFormData(data.submission.data || {});
          setStatus(data.submission.status);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [eventId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await fetchApi(`/events/${eventId}/submission`, {
        method: "PUT",
        body: JSON.stringify({ data: formData }),
      });
      setStatus(res.submission.status);
      alert("Draft saved successfully!");
    } catch (err: any) {
      alert("Failed to save draft: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm("Are you sure you want to submit? You will not be able to edit this afterward.")) return;
    
    setSaving(true);
    try {
      // Auto save first
      await fetchApi(`/events/${eventId}/submission`, {
        method: "PUT",
        body: JSON.stringify({ data: formData }),
      });

      // Then submit
      const res = await fetchApi(`/events/${eventId}/submission/submit`, {
        method: "POST",
      });
      
      setStatus(res.submission.status);
      alert("Submission successful!");
      router.push(`/${eventId}`);
    } catch (err: any) {
      alert("Failed to submit: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center animate-pulse">Loading builder...</div>;
  if (error) {
    const isNoTeam = error.includes("Participant not found") || error.includes("No team found");
    if (isNoTeam) {
      return (
        <div className="max-w-xl mx-auto my-12 p-8 bg-zinc-900/60 border border-cyan-500/30 rounded-3xl backdrop-blur-xl text-center space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Team Setup Required</h2>
            <p className="text-zinc-400 text-sm mt-2">
              You need to be part of a team to access the project builder and submit your entry.
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

  const isSubmitted = status === "SUBMITTED";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href={`/${eventId}`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors text-sm font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-100 tracking-tight">Project Builder</h2>
          <p className="text-zinc-500 font-mono text-sm mt-2">Compile your resources into a final project.</p>
        </div>
        
        {isSubmitted && (
          <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 font-bold rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(74,222,128,0.1)]">
            <CheckCircle className="w-5 h-5" /> Submitted
          </div>
        )}
      </div>

      <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800 backdrop-blur-xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
        {/* Subtle accent highlight */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10">
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Project / Startup Name</label>
          <input
            type="text"
            name="startupName"
            value={formData.startupName}
            onChange={handleChange}
            disabled={isSubmitted}
            className="w-full bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all text-zinc-100 disabled:bg-zinc-900/50 disabled:text-zinc-500"
            placeholder="e.g. Acme Corp"
          />
        </div>

        <div className="relative z-10">
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Tagline</label>
          <input
            type="text"
            name="tagline"
            value={formData.tagline}
            onChange={handleChange}
            disabled={isSubmitted}
            className="w-full bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all text-zinc-100 disabled:bg-zinc-900/50 disabled:text-zinc-500"
            placeholder="A short, catchy description..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">The Problem</label>
            <textarea
              name="problem"
              value={formData.problem}
              onChange={handleChange}
              disabled={isSubmitted}
              rows={4}
              className="w-full bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all text-zinc-100 disabled:bg-zinc-900/50 disabled:text-zinc-500"
              placeholder="What are you solving?"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">The Solution</label>
            <textarea
              name="solution"
              value={formData.solution}
              onChange={handleChange}
              disabled={isSubmitted}
              rows={4}
              className="w-full bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all text-zinc-100 disabled:bg-zinc-900/50 disabled:text-zinc-500"
              placeholder="How are you solving it?"
            />
          </div>
        </div>

        <div className="relative z-10">
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Target Audience / Customer</label>
          <input
            type="text"
            name="targetCustomer"
            value={formData.targetCustomer}
            onChange={handleChange}
            disabled={isSubmitted}
            className="w-full bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all text-zinc-100 disabled:bg-zinc-900/50 disabled:text-zinc-500"
            placeholder="Who is this for?"
          />
        </div>

        <div className="relative z-10">
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Final Pitch / Project Details</label>
          <textarea
            name="pitch"
            value={formData.pitch}
            onChange={handleChange}
            disabled={isSubmitted}
            rows={6}
            className="w-full bg-zinc-950 px-4 py-3 rounded-xl border border-zinc-800 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all text-zinc-100 disabled:bg-zinc-900/50 disabled:text-zinc-500"
            placeholder="Your comprehensive overview..."
          />
        </div>

        {!isSubmitted && (
          <div className="pt-6 border-t border-zinc-800 flex flex-col md:flex-row gap-4 items-center justify-end relative z-10">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="w-full md:w-auto px-6 py-3 rounded-xl font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" /> Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full md:w-auto px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-green-500 text-black hover:opacity-90 flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              <Send className="w-5 h-5" /> Submit Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
