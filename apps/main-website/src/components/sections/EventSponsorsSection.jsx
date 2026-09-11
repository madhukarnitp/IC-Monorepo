'use client';

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import { motion } from 'motion/react';

// Clean Vector Brand Logos
function BrandLogo({ logoKey, className = 'w-8 h-8' }) {
  switch (logoKey) {
    case 'startup_bihar':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" stroke="#10B981" strokeWidth="2" />
          <path d="M20 10L24 17H16L20 10Z" fill="#F59E0B" />
          <path d="M14 22C14 22 17 20 20 20C23 20 26 22 26 22V26H14V22Z" fill="#10B981" />
          <circle cx="20" cy="28" r="1.5" fill="#34D399" />
        </svg>
      );
    case 'aws':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <path d="M11 20.5L14.2 13H16.8L20 20.5H17.8L17.1 18.7H13.9L13.2 20.5H11ZM14.4 17.1H16.6L15.5 14.1L14.4 17.1Z" fill="#FF9900" />
          <path d="M20.5 13H22.5L24 18.2L25.5 13H27.5L29 18.2L30.5 13H32.5L30.2 20.5H28.2L26.5 15.2L24.8 20.5H22.8L20.5 13Z" fill="#FF9900" />
          <path d="M12 24.5C18 27.5 26 27.5 31 23.5" stroke="#FF9900" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M29.5 22.5L32 23.5L31 26" stroke="#FF9900" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'meity':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="12" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="20" cy="20" r="5" fill="#6366F1" />
          <path d="M20 8V12M20 28V32M8 20H12M28 20H32" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'github':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d="M20 9C13.925 9 9 13.925 9 20C9 24.86 12.15 28.975 16.525 30.425C17.075 30.525 17.275 30.1875 17.275 29.9C17.275 29.6375 17.2625 28.75 17.2625 27.8125C14.5 28.325 13.7875 27.1375 13.5625 26.5125C13.4375 26.1875 12.9 25.2 12.425 24.9375C12.0375 24.725 11.4875 24.2125 12.4125 24.2C13.275 24.1875 13.8875 24.9875 14.0875 25.3125C15.075 26.975 16.65 26.5 17.275 26.2125C17.375 25.5 17.6625 25.0125 17.975 24.7375C15.525 24.4625 12.9625 23.5125 12.9625 19.3C12.9625 18.0875 13.3875 17.0875 14.1 16.3C13.9875 16.025 13.6 14.8875 14.2125 13.35C14.2125 13.35 15.1375 13.0625 17.275 14.5C18.1625 14.25 19.1 14.125 20.0375 14.125C20.975 14.125 21.9125 14.25 22.8 14.5C24.9375 13.05 25.8625 13.35 25.8625 13.35C26.475 14.8875 26.0875 16.025 25.975 16.3C26.6875 17.0875 27.1125 18.075 27.1125 19.3C27.1125 23.525 24.5375 24.4625 22.0875 24.7375C22.4875 25.0875 22.8375 25.7625 22.8375 26.825C22.8375 28.3375 22.825 29.5625 22.825 29.9C22.825 30.1875 23.025 30.5375 23.575 30.425C27.9375 28.975 31 24.85 31 20C31 13.925 26.075 9 20 9Z" fill="white" />
        </svg>
      );
    case 'gcp':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <path d="M15 24C12.7909 24 11 22.2091 11 20C11 17.7909 12.7909 16 15 16C15.65 16 16.26 16.15 16.81 16.42C17.72 14.4 19.7 13 22 13C24.87 13 27.28 15.08 27.88 17.82C29.66 18.23 31 19.82 31 21.75C31 23.96 29.21 25.75 27 25.75H15.5" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M19 22L22 19L25 22" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'zerodha':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <path d="M11 26L20 12L29 26H11Z" stroke="#38BDF8" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M16 26L20 19L24 26H16Z" fill="#38BDF8" />
        </svg>
      );
    case 'groww':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <path d="M11 27L18 19L23 23L29 13" stroke="#00D09C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 13H29V18" stroke="#00D09C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'bse':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <rect x="12" y="14" width="16" height="14" rx="2" stroke="#F59E0B" strokeWidth="2" />
          <path d="M16 19H24M16 23H21" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'mic':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <path d="M20 10L12 15V22L20 27L28 22V15L20 10Z" stroke="#60A5FA" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="20" cy="18.5" r="3" fill="#93C5FD" />
        </svg>
      );
    case 'tinkering':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <rect x="13" y="13" width="14" height="14" rx="3" stroke="#0EF" strokeWidth="2" />
          <path d="M20 9V13M20 27V31M9 20H13M27 20H31" stroke="#0EF" strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2.5" fill="#0EF" />
        </svg>
      );
    case 'ieee':
      return (
        <svg className={className} viewBox="0 0 40 40" fill="none">
          <path d="M20 10L30 20L20 30L10 20L20 10Z" stroke="#38BDF8" strokeWidth="2" />
          <path d="M16 20H24M20 16V24" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <span className="text-[#0ef] text-base font-bold">✦</span>
      );
  }
}

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
                  <BrandLogo logoKey={sponsor.logoKey} className="w-9 h-9" />
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
                  <BrandLogo logoKey={sponsor.logoKey} className="w-7 h-7" />
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
