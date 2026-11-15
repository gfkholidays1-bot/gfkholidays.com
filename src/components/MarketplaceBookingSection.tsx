import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Flame,
  Globe,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Ticket as TicketIcon,
  X
} from 'lucide-react';
import {
  Agent,
  GlobalSettings,
  Hotel,
  OtaPartner,
  Package,
  Ticket,
  TransportRoute
} from '../types';
import { DEFAULT_OTA_PARTNERS } from '../data';
import { useCurrencyRate } from '../lib/currency';

interface MarketplaceBookingSectionProps {
  settings: GlobalSettings;
  packages?: Package[];
  tickets: Ticket[];
  hotels?: Hotel[];
  transport?: TransportRoute[];
  imageMap: Record<string, string>;
  currentAgent: Agent | null;
  onNavigate: (path: string, params?: any) => void;
  variant?: 'page' | 'desktop' | 'mobile';
}

interface MarketplaceAttractionItem {
  id: string;
  title: string;
  location: string;
  category: string;
  priceMyr: number;
  originalPriceMyr?: number;
  rating: number;
  reviews: number;
  trending: boolean;
  image: string;
  viatorUrl: string;
  tripadvisorUrl: string;
  getyourguideUrl: string;
  klookUrl: string;
}

function getPlatformFocus(partnerName: string): string {
  const lower = partnerName.toLowerCase();
  if (lower.includes('getyourguide')) {
    return 'Trending Attraction Tickets · Skip-the-Line Passes';
  }
  if (lower.includes('viator')) {
    return 'Curated Attraction Tickets · City Pass Experiences';
  }
  if (lower.includes('tripadvisor')) {
    return 'Top-Rated Attraction Tickets · Traveler Choice';
  }
  if (lower.includes('klook')) {
    return 'Theme Park & Observatory QR Tickets';
  }
  return 'Attraction Tickets & Experiences';
}

export default function MarketplaceBookingSection({
  settings,
  tickets,
  imageMap,
  currentAgent,
  onNavigate
}: MarketplaceBookingSectionProps) {
  const { formatPrice } = useCurrencyRate();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'getyourguide' | 'viator'>('all');

  const partners: OtaPartner[] = useMemo(() => {
    const raw =
      Array.isArray(settings.otaPartners) && settings.otaPartners.length > 0
        ? settings.otaPartners
        : DEFAULT_OTA_PARTNERS;
    // Focus partner portal cards on attraction ticket marketplaces (GetYourGuide, Viator, TripAdvisor, Klook)
    const ticketPortals = raw.filter((p) => {
      const n = p.name.toLowerCase();
      return (
        n.includes('getyourguide') ||
        n.includes('viator') ||
        n.includes('tripadvisor') ||
        n.includes('klook') ||
        n.includes('trip.com')
      );
    });
    return ticketPortals.length > 0 ? ticketPortals : raw;
  }, [settings.otaPartners]);

  const resolveImage = (key: string | undefined, fallbackKey = 'petronas'): string => {
    if (!key) return imageMap[fallbackKey] || imageMap.kl;
    if (key.startsWith('http') || key.startsWith('data:') || key.startsWith('/')) {
      return key;
    }
    return imageMap[key] || imageMap[fallbackKey] || imageMap.kl;
  };

  const buildViatorUrl = (title: string, explicitUrl?: string): string => {
    if (explicitUrl && explicitUrl.trim()) return explicitUrl.trim();
    return `https://www.viator.com/searchResults/all?text=${encodeURIComponent(
      `${title} Malaysia`
    )}`;
  };

  const buildTripadvisorUrl = (title: string, explicitUrl?: string): string => {
    if (explicitUrl && explicitUrl.trim()) return explicitUrl.trim();
    return `https://www.tripadvisor.com/Search?q=${encodeURIComponent(
      `${title} Malaysia`
    )}`;
  };

  const buildGygUrl = (title: string, explicitUrl?: string): string => {
    if (explicitUrl && explicitUrl.trim()) return explicitUrl.trim();
    return `https://www.getyourguide.com/s/?q=${encodeURIComponent(`${title} Malaysia`)}`;
  };

  const buildKlookUrl = (title: string, explicitUrl?: string): string => {
    if (explicitUrl && explicitUrl.trim()) return explicitUrl.trim();
    return `https://www.klook.com/search/result/?query=${encodeURIComponent(`${title} Malaysia`)}`;
  };

  // Strictly curated & trending ATTRACTION TICKETS promoted for external marketplace booking
  // Packages, Hotels, Private Transfers & Dining stay exclusively on our own website.
  const attractionItems: MarketplaceAttractionItem[] = useMemo(() => {
    const commPct = Number(currentAgent?.commission) || 0;
    const applyComm = (price: number) =>
      currentAgent ? Math.round(price * (1 - commPct / 100)) : price;

    const curated = tickets.filter((tk) => Boolean(tk.marketplaceEnabled || tk.trending));
    const sourceList =
      curated.length > 0 ? curated : tickets.filter((tk) => Boolean(tk.featured));

    return sourceList.map((tk) => ({
      id: tk.id,
      title: tk.name,
      location: tk.location || 'Kuala Lumpur, Malaysia',
      category: tk.category || 'Attraction Ticket',
      priceMyr: applyComm(Number(tk.price) || 0),
      originalPriceMyr: tk.originalPrice,
      rating: tk.rating || 4.9,
      reviews: tk.reviews || 420,
      trending: Boolean(tk.trending || tk.marketplaceEnabled),
      image: resolveImage(tk.image, 'petronas'),
      viatorUrl: buildViatorUrl(tk.name, tk.viatorUrl),
      tripadvisorUrl: buildTripadvisorUrl(tk.name, tk.tripadvisorUrl),
      getyourguideUrl: buildGygUrl(tk.name, tk.getyourguideUrl),
      klookUrl: buildKlookUrl(tk.name, tk.klookUrl)
    }));
  }, [tickets, currentAgent, imageMap]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attractionItems.filter((item) => {
      if (platformFilter === 'getyourguide' && !item.getyourguideUrl) return false;
      if (platformFilter === 'viator' && !item.viatorUrl) return false;
      if (!q) return true;
      return `${item.title} ${item.location} ${item.category}`.toLowerCase().includes(q);
    });
  }, [attractionItems, platformFilter, searchQuery]);

  return (
    <div className="w-full max-w-full overflow-x-clip bg-zinc-50 min-h-screen pb-24 sm:pb-16 text-zinc-900">
      {/* Top Navigation & Policy Clarification Bar */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-700 hover:text-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to Home</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{attractionItems.length} Trending Attraction Tickets</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('/search')}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
            >
              <span>Website Holiday Packages, Hotels &amp; Transfers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header & Scope Statement */}
      <section className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-2">
              <Globe className="w-4 h-4 shrink-0" />
              <span>Attraction Tickets Marketplace Hub · GetYourGuide &amp; Viator</span>
            </div>
            <h1
              className="text-2xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {settings.otaSectionTitle ||
                'Trending Attraction Tickets on GetYourGuide & Viator'}
            </h1>
            <p className="text-xs sm:text-base text-zinc-600 mt-2.5 leading-relaxed">
              {settings.otaSectionSubtitle ||
                'Browse curated trending Malaysia attraction tickets promoted on GetYourGuide, Viator, TripAdvisor, and Klook. Tap any portal link to complete your attraction ticket reservation directly on that marketplace. Holiday packages, contracted hotels, private transfers, and dining remain exclusive to our direct website booking engine.'}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* Official External Marketplace Platforms */}
        <section aria-labelledby="platforms-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2
                id="platforms-heading"
                className="text-lg sm:text-2xl font-extrabold text-zinc-950 tracking-tight"
              >
                Official Attraction Ticket Marketplaces
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Explore global attraction ticket portals below and complete booking directly on their platform.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 inline-flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Attraction Tickets Only · External Marketplace Checkout
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => {
              const perks =
                partner.perks && partner.perks.length > 0
                  ? partner.perks
                  : [
                      'Verified Attraction Ticket Fulfillment',
                      'Instant Mobile QR Pass',
                      'Free 24-Hour Cancellation Options'
                    ];
              const focusText = getPlatformFocus(partner.name);

              return (
                <div
                  key={partner.id}
                  className="bg-white border border-zinc-200 hover:border-emerald-500/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-colors shadow-2xs min-w-0"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {partner.logoUrl ? (
                          <img
                            src={partner.logoUrl}
                            alt={partner.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover border border-zinc-200 shrink-0"
                          />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm text-white shrink-0"
                            style={{ backgroundColor: partner.accentColor || '#059669' }}
                          >
                            {partner.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-extrabold text-zinc-950 truncate">
                              {partner.name}
                            </h3>
                            {partner.verified && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-zinc-500 truncate">
                            {partner.roleBadge}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 tabular-nums">
                        <div className="text-xs font-extrabold text-amber-600">
                          ★ {partner.rating}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {partner.reviewsCount}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {partner.description}
                    </p>

                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Scope: {focusText}
                      </div>
                      <ul className="space-y-1">
                        {perks.slice(0, 3).map((perk) => (
                          <li
                            key={perk}
                            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-zinc-500 truncate">
                      Opens external marketplace
                    </span>
                    <a
                      href={partner.url || 'https://www.getyourguide.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>{partner.ctaLabel || `Explore on ${partner.name}`}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trending Attraction Tickets Only — Direct Marketplace Launch */}
        <section aria-labelledby="activities-heading" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-1">
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Trending Attractions on GetYourGuide &amp; Viator</span>
              </div>
              <h2
                id="activities-heading"
                className="text-lg sm:text-2xl font-extrabold text-zinc-950 tracking-tight"
              >
                Choose a Trending Attraction Ticket &amp; Book on Marketplace
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              <div className="relative flex items-center bg-white border border-zinc-200 rounded-xl px-3 py-2 flex-1 sm:w-72 focus-within:border-emerald-600">
                <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search attraction pass or landmark..."
                  className="w-full text-xs sm:text-sm font-medium text-zinc-900 bg-transparent outline-none placeholder-zinc-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Portals' },
                  { id: 'getyourguide', label: 'GetYourGuide' },
                  { id: 'viator', label: 'Viator' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPlatformFilter(tab.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                      platformFilter === tab.id
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-3">
              <TicketIcon className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-sm font-medium text-zinc-600">
                No trending attraction tickets matched your search on external marketplaces.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPlatformFilter('all');
                  }}
                  className="px-4 py-2 bg-zinc-950 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Show All Marketplace Attractions
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/search')}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Explore Website Holiday Packages, Hotels &amp; Transfers
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-zinc-200 hover:border-emerald-500/70 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors shadow-2xs min-w-0"
                >
                  <div>
                    <div className="relative h-44 bg-zinc-900 overflow-hidden group">
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = imageMap.kl;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 text-zinc-950 text-[11px] font-extrabold">
                        <Flame className="w-3 h-3 shrink-0" />
                        Trending Attraction
                      </span>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white font-semibold">
                        <span className="flex items-center gap-1 min-w-0 truncate">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-amber-300 shrink-0 ml-2 tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {item.rating}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="text-[11px] font-bold text-emerald-700 mb-1">
                        {item.category} · External Marketplace Listing
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 leading-snug line-clamp-2">
                        {item.title}
                      </h3>

                      <div className="mt-2.5 flex items-baseline gap-2 tabular-nums">
                        <span className="text-base sm:text-lg font-extrabold text-zinc-950">
                          From {formatPrice(item.priceMyr)}
                        </span>
                        <span className="text-xs text-zinc-500">/ pass</span>
                        {item.originalPriceMyr && item.originalPriceMyr > item.priceMyr && (
                          <span className="text-xs text-zinc-400 line-through">
                            {formatPrice(item.originalPriceMyr)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Strictly External Marketplace Links Only */}
                  <div className="px-4 pb-4 pt-3 border-t border-zinc-100 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Reserve directly on external marketplace:
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <a
                        href={item.getyourguideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors truncate"
                      >
                        <span>GetYourGuide</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <a
                        href={item.viatorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-[#34E0A1] text-xs font-bold inline-flex items-center justify-center gap-1 transition-colors truncate"
                      >
                        <span>Viator</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <a
                        href={item.tripadvisorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2 rounded-lg bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-400 text-[11px] font-bold text-zinc-800 inline-flex items-center justify-center gap-1 transition-colors truncate"
                      >
                        <span>TripAdvisor</span>
                        <ExternalLink className="w-3 h-3 text-emerald-700 shrink-0" />
                      </a>
                      <a
                        href={item.klookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2 rounded-lg bg-zinc-50 hover:bg-orange-50 border border-zinc-200 hover:border-orange-300 text-[11px] font-bold text-zinc-800 inline-flex items-center justify-center gap-1 transition-colors truncate"
                      >
                        <span>Klook</span>
                        <ExternalLink className="w-3 h-3 text-orange-600 shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clear Footer Banner Reminding Users Where Direct Website Services Live */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-zinc-950">
                Looking for Holiday Packages, Hotels &amp; Resorts, Private Transfers, or Dining?
              </h3>
              <p className="text-xs text-zinc-600 mt-0.5">
                Those core travel services are booked directly on our website with Stripe Checkout. External marketplaces above showcase trending attraction tickets only.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/search')}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
            >
              Browse Direct Website Catalog
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
