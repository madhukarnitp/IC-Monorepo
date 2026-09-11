'use client';

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import { motion } from 'motion/react';


export default function EventSponsorsSection({ sponsors = [] }) {
  if (!sponsors || sponsors.length === 0) {
    return null;
  }

  const highlightedSponsors = sponsors.filter((s) => s.isHighlighted);
  const regularSponsors = sponsors.filter((s) => !s.isHighlighted);

  return (
    <GlassCard className="p-6 sm:p-8 rounded-3xl border border-white/10" hoverEffect={false}>
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <span className="w-1.5 h-5 rounded-full bg-[#0ef]" />
          Event Sponsors & Partners
        </h2>
        <Badge variant="cyan">
          {sponsors.length} {sponsors.length === 1 ? 'Partner' : 'Partners'}
        </Badge>
      </div>

      {/* FEATURED SPONSORS - Full Visibility, No Truncation, No "Highlighted" Badge */}
      {highlightedSponsors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {highlightedSponsors.map((sponsor) => (
            <motion.div
              key={sponsor.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1424] to-[#070b15] border border-[#0ef]/40 hover:border-[#0ef] shadow-[0_0_15px_rgba(0,238,255,0.1)] transition-all flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="shrink-0 group-hover:scale-110 transition-transform pt-0.5">
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    className="w-12 h-12 min-w-12 min-h-12 object-contain rounded-lg bg-white p-1.5"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white leading-snug group-hover:text-[#0ef] transition-colors">
                    {sponsor.name}
                  </h3>
                  {sponsor.tier && (
                    <span className="text-xs text-[#0ef]/90 font-semibold block mt-1">
                      {sponsor.tier}
                    </span>
                  )}
                  {sponsor.perk && (
                    <span className="text-[0.75rem] text-amber-300 font-medium block mt-1 leading-normal">
                      ✨ {sponsor.perk}
                    </span>
                  )}
                </div>
              </div>

              {sponsor.website && (
                <a
                  href={sponsor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/5 hover:bg-[#0ef]/15 text-white/60 hover:text-[#0ef] border border-white/10 hover:border-[#0ef]/30 transition-all shrink-0 mt-0.5"
                  title="Visit Website"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* SUPPORTING PARTNERS - Full Visibility */}
      {regularSponsors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {regularSponsors.map((sponsor) => (
            <motion.div
              key={sponsor.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#0ef]/40 transition-all flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="shrink-0 group-hover:scale-110 transition-transform pt-0.5">
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    className="w-10 h-10 min-w-10 min-h-10 object-contain rounded-md bg-white p-1"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white leading-snug group-hover:text-[#0ef] transition-colors">
                    {sponsor.name}
                  </h3>
                  {sponsor.tier && (
                    <span className="text-xs text-white/70 block font-medium mt-0.5">
                      {sponsor.tier}
                    </span>
                  )}
                </div>
              </div>

              {sponsor.website && (
                <a
                  href={sponsor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.7rem] text-[#0ef]/80 hover:text-[#0ef] hover:underline font-semibold shrink-0 mt-0.5"
                >
                  Website ↗
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
