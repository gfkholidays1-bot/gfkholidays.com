import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  X,
  ArrowRight,
  Compass
} from 'lucide-react';
import { GlobalSettings, OtaPartner, PartnerLogoItem } from '../types';
import {
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_OTA_PARTNERS
} from '../data';

type PartnerCategoryTab = 'ota' | 'hotel' | 'flight';

interface UnifiedPartnerEntry {
  id: string;
  category: PartnerCategoryTab;
  name: string;
  logoUrl?: string;
  roleTitle: string;
  summary: string;
  rating?: string;
  volumeMetric?: string;
  url?: string;
  verified: boolean;
  mandatePoints: string[];
  targetRoute: string;
  targetRouteLabel: string;
}

interface PartnerAllianceSectionProps {
  settings: Partial<GlobalSettings>;
  onNavigate: (path: string, params?: any) => void;
  variant?: 'mobile' | 'desktop';
}

export default function PartnerAllianceSection({
  settings,
  onNavigate,
  variant = 'desktop'
}: PartnerAllianceSectionProps) {
  const [selectedPartner, setSelectedPartner] = useState<UnifiedPartnerEntry | null>(null);

  useEffect(() => {
    if (!selectedPartner) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPartner(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPartner]);

  if (settings.partnerMarqueeEnabled === false) {
    return null;
  }

  const otaList: OtaPartner[] =
    Array.isArray(settings.otaPartners) && settings.otaPartners.length > 0
      ? settings.otaPartners
      : DEFAULT_OTA_PARTNERS;

  const rawLogos: PartnerLogoItem[] =
    Array.isArray(settings.partnerMarqueeLogos) && settings.partnerMarqueeLogos.length > 0
      ? settings.partnerMarqueeLogos
      : DEFAULT_GLOBAL_SETTINGS.partnerMarqueeLogos || [];

  if (rawLogos.length === 0) {
    return null;
  }

  const buildUnifiedOta = (ota: OtaPartner): UnifiedPartnerEntry => ({
    id: ota.id,
    category: 'ota',
    name: ota.name,
    logoUrl: ota.logoUrl,
    roleTitle: ota.roleBadge || 'Official Malaysia Ground Supplier',
    summary: ota.description,
    rating: ota.rating || '4.9 / 5.0',
    volumeMetric: ota.reviewsCount || 'Verified Supplier Fulfillment',
    url: ota.url,
    verified: ota.verified !== false,
    mandatePoints: [
      'Direct Malaysian ground tour execution & licensed English/Multilingual guide dispatch',
      'Instant gate turnstile barcode & e-voucher fulfillment across Peninsular & East Malaysia',
      'Dedicated KLIA airport fleet & 24/7 Kuala Lumpur operations escalation desk'
    ],
    targetRoute: '/search',
    targetRouteLabel: 'Browse Supplied Tours & Passes'
  });

  const buildUnifiedHotel = (ht: PartnerLogoItem): UnifiedPartnerEntry => ({
    id: ht.id,
    category: 'hotel',
    name: ht.name,
    logoUrl: ht.logoUrl,
    roleTitle: ht.badgeText || 'Direct Contracted Hotel Partner',
    summary: `GFK Holidays holds direct corporate & wholesale room allotments with ${ht.name}, delivering contracted net rates and priority check-in allocation for inbound travelers and travel agencies.`,
    rating: 'Guaranteed Allotment',
    volumeMetric: ht.subtitle || 'Malaysia Contracted Property',
    verified: ht.verified !== false,
    mandatePoints: [
      'Pre-negotiated contracted B2B & direct retail room blocks across peak travel seasons',
      'Immediate reservation confirmation with verified property check-in & family policies',
      'Synchronized airport chauffeur transfers & multi-day tour add-on packaging'
    ],
    targetRoute: '/hotels',
    targetRouteLabel: 'View Contracted Hotel Stays'
  });

  const buildUnifiedFlight = (fl: PartnerLogoItem): UnifiedPartnerEntry => ({
    id: fl.id,
    category: 'flight',
    name: fl.name,
    logoUrl: fl.logoUrl,
    roleTitle: fl.badgeText || 'Official Aviation & Ground Alliance',
    summary: `GFK Holidays coordinates arrival meet-and-greet transfers, fly-and-stay holiday itineraries, and domestic connection ground logistics for passengers arriving via ${fl.name}.`,
    rating: 'KLIA / Domestic Hub',
    volumeMetric: fl.subtitle || 'Aviation Ground Alliance',
    verified: fl.verified !== false,
    mandatePoints: [
      'Flight-tracked KLIA Terminal 1, KLIA2 & island airport chauffeur meet-and-greet',
      'Tailored Malaysia stopover, twin-centre & group series ground land packages',
      'Seamless luggage-assisted private sedans, MPVs & 13-seater coaches'
    ],
    targetRoute: '/flights',
    targetRouteLabel: 'View Available Flights & Status'
  });

  const marqueeItems: UnifiedPartnerEntry[] = rawLogos.map((logo) => {
    if (logo.category === 'hotel') return buildUnifiedHotel(logo);
    if (logo.category === 'flight') return buildUnifiedFlight(logo);
    const matchingOta = otaList.find((o) =>
      o.name.toLowerCase().includes(logo.name.toLowerCase().split(' ')[0])
    );
    if (matchingOta) return buildUnifiedOta(matchingOta);
    return {
      id: logo.id,
      category: 'ota',
      name: logo.name,
      logoUrl: logo.logoUrl,
      roleTitle: logo.badgeText || 'Registered Supply Partner',
      summary: `GFK Holidays operates verified Malaysian ground excursions, e-ticketing, and passenger logistics within the ${logo.name} global travel ecosystem.`,
      rating: '4.9 / 5.0 SLA',
      volumeMetric: logo.subtitle || 'Verified Network Partner',
      verified: logo.verified !== false,
      mandatePoints: [
        'Official registered Malaysian ground fulfillment partner',
        'Real-time availability, gate QR issuance & transfer coordination',
        'Direct contracted local operations without intermediary delays'
      ],
      targetRoute: '/search',
      targetRouteLabel: 'Explore Supplied Malaysia Catalog'
    };
  });

  const isMobile = variant === 'mobile';
  const speed = settings.partnerMarqueeSpeed || 'normal';
  // gfk-marquee-left-* translates 0 -> -50%, moving partner cards smoothly right-to-left
  const marqueeTrackClass =
    settings.partnerMarqueeDirection === 'left'
      ? `gfk-marquee-right-${speed}`
      : `gfk-marquee-left-${speed}`;

  return (
    <section
      aria-label="Official Partners & Airlines Preview"
      className={
        isMobile
          ? 'w-full max-w-full bg-zinc-950 border-t border-b border-zinc-800 py-4 overflow-hidden'
          : 'w-full max-w-full bg-zinc-950 border-t border-b border-zinc-800 py-6 overflow-hidden mt-8'
      }
      style={{ contain: 'layout paint' }}
    >
      <div className={isMobile ? 'px-3.5 mb-2.5 flex items-center justify-between gap-2' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3 flex items-center justify-between'}>
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 min-w-0">
          <Award className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">Official Partners, OTAs &amp; Airlines Network</span>
        </div>
        <span className="text-[10px] font-semibold text-zinc-400 shrink-0">
          Tap any partner
        </span>
      </div>

      <div className="relative w-full max-w-full overflow-hidden py-0.5">
        <div className={`flex gap-3 sm:gap-5 w-max gfk-marquee-track ${marqueeTrackClass}`}>
          {[...marqueeItems, ...marqueeItems].map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              type="button"
              onClick={() => setSelectedPartner(item)}
              className="flex items-center gap-3 bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/70 rounded-2xl px-3.5 py-2.5 shrink-0 transition-colors cursor-pointer text-left"
            >
              <div className="w-10 h-9 rounded-xl bg-zinc-950 border border-zinc-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                {item.logoUrl ? (
                  <img
                    src={item.logoUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Award className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div>
                <div className="text-xs font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  <span>{item.name}</span>
                  {item.verified && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                  {item.volumeMetric || item.roleTitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Optimized Partner Mandate Modal / Bottom Sheet on Click */}
      {selectedPartner && (
        <div
          className="fixed inset-0 z-[95] bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setSelectedPartner(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-dossier-title"
        >
          <div
            className="w-full sm:max-w-lg bg-white text-zinc-900 rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-zinc-300" />
            </div>

            <div className="px-5 py-4 border-b border-zinc-200 flex items-start justify-between gap-3 bg-zinc-50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  {selectedPartner.logoUrl ? (
                    <img
                      src={selectedPartner.logoUrl}
                      alt={selectedPartner.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Award className="w-6 h-6 text-emerald-700" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{selectedPartner.roleTitle}</span>
                  </div>
                  <h3
                    id="partner-dossier-title"
                    className="text-base sm:text-lg font-extrabold text-zinc-950 truncate"
                  >
                    {selectedPartner.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                aria-label="Close partner details"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-zinc-200/80 hover:bg-zinc-300 text-zinc-700 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain space-y-4 text-xs sm:text-sm">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Operational Relationship
                </h4>
                <p className="text-zinc-700 leading-relaxed text-xs sm:text-[13px]">
                  {selectedPartner.summary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 tabular-nums">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Service Standard
                  </span>
                  <span className="text-sm font-extrabold text-zinc-950 mt-0.5 block">
                    {selectedPartner.rating || '4.9 / 5.0'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                    Supply Coverage
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700 mt-0.5 block truncate">
                    {selectedPartner.volumeMetric || 'Peninsular & East Malaysia'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
                  Services Executed by GFK Holidays
                </h4>
                <div className="space-y-2">
                  {selectedPartner.mandatePoints.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span className="text-xs text-zinc-800 font-medium leading-relaxed">
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
                <Compass className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>
                  Coverage: Kuala Lumpur · Langkawi · Penang · Genting Highlands · Sabah &amp; Borneo
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 bg-white flex flex-wrap items-center gap-2.5 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => {
                  const dest = selectedPartner.targetRoute;
                  setSelectedPartner(null);
                  onNavigate(dest);
                }}
                className="flex-1 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>{selectedPartner.targetRouteLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {selectedPartner.url && (
                <a
                  href={selectedPartner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>Official Site</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
