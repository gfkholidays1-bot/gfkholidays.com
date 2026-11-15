import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Flame,
  Globe,
  MapPin,
  Search,
  ShieldCheck,
  Star,
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
  packages: Package[];
  tickets: Ticket[];
  hotels: Hotel[];
  transport: TransportRoute[];
  imageMap: Record<string, string>;
  currentAgent: Agent | null;
  onNavigate: (path: string, params?: any) => void;
  variant?: 'page' | 'desktop' | 'mobile';
}

type CategoryFilter = 'all' | 'tickets' | 'packages' | 'hotels' | 'transport';

interface NormalizedMarketplaceItem {
  id: string;
  kind: 'ticket' | 'package' | 'hotel' | 'transport';
  kindLabel: string;
  title: string;
  location: string;
  priceMyr: number;
  originalPriceMyr?: number;
  unitLabel: string;
  rating: number;
  reviews: number;
  trending: boolean;
  image: string;
  viatorUrl: string;
  tripadvisorUrl: string;
  getyourguideUrl: string;
  klookUrl: string;
}

function getPlatformCategories(partnerName: string): string {
  const lower = partnerName.toLowerCase();
  if (lower.includes('viator') || lower.includes('tripadvisor')) {
    return 'Attractions · Day Tours · Private Transfers';
  }
  if (lower.includes('getyourguide')) {
    return 'Guided Tours · Skip-the-Line Tickets · Transfers';
  }
  if (lower.includes('klook')) {
    return 'Attraction QR Passes · Theme Parks · Chauffeurs';
  }
  if (lower.includes('agoda')) {
    return '5-Star Resorts · Direct Stays · Airport Transfers';
  }
  if (lower.includes('trip.com')) {
    return 'Tickets · Hotel Combos · Flight & Tour Bundles';
  }
  return 'Tours · Tickets · Transfers';
}

export default function MarketplaceBookingSection({
  settings,
  packages,
  tickets,
  hotels,
  transport,
  imageMap,
  currentAgent,
  onNavigate
}: MarketplaceBookingSectionProps) {
  const { formatPrice } = useCurrencyRate();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [onlyTrending, setOnlyTrending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const partners: OtaPartner[] = useMemo(() => {
    return Array.isArray(settings.otaPartners) && settings.otaPartners.length > 0
      ? settings.otaPartners
      : DEFAULT_OTA_PARTNERS;
  }, [settings.otaPartners]);

  const resolveImage = (key: string | undefined, fallbackKey = 'kl'): string => {
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

  const buildGygUrl = (title: string): string =>
    `https://www.getyourguide.com/s/?q=${encodeURIComponent(`${title} Malaysia`)}`;

  const buildKlookUrl = (title: string): string =>
    `https://www.klook.com/search/result/?query=${encodeURIComponent(`${title} Malaysia`)}`;

  const allItems: NormalizedMarketplaceItem[] = useMemo(() => {
    const commPct = Number(currentAgent?.commission) || 0;
    const applyComm = (price: number) =>
      currentAgent ? Math.round(price * (1 - commPct / 100)) : price;

    const mappedTickets: NormalizedMarketplaceItem[] = tickets.map((tk) => ({
      id: tk.id,
      kind: 'ticket',
      kindLabel: 'Attraction Pass',
      title: tk.name,
      location: tk.location || 'Kuala Lumpur, Malaysia',
      priceMyr: applyComm(Number(tk.price) || 0),
      originalPriceMyr: tk.originalPrice,
      unitLabel: '/ pass',
      rating: tk.rating || 4.9,
      reviews: tk.reviews || 420,
      trending: Boolean(tk.trending || tk.featured),
      image: resolveImage(tk.image, 'petronas'),
      viatorUrl: buildViatorUrl(tk.name, tk.viatorUrl),
      tripadvisorUrl: buildTripadvisorUrl(tk.name, tk.tripadvisorUrl),
      getyourguideUrl: buildGygUrl(tk.name),
      klookUrl: buildKlookUrl(tk.name)
    }));

    const mappedPackages: NormalizedMarketplaceItem[] = packages.map((pkg) => ({
      id: pkg.id,
      kind: 'package',
      kindLabel: `${pkg.duration_days || 3}D Tour Package`,
      title: pkg.title,
      location: pkg.destination || 'Malaysia',
      priceMyr: applyComm(Number(pkg.base_price) || 0),
      originalPriceMyr: pkg.original_price,
      unitLabel: '/ pax',
      rating: pkg.rating || 4.9,
      reviews: pkg.reviews || 280,
      trending: Boolean(pkg.trending || pkg.featured),
      image: resolveImage(pkg.image, 'langkawi'),
      viatorUrl: buildViatorUrl(pkg.title, pkg.viatorUrl),
      tripadvisorUrl: buildTripadvisorUrl(pkg.title, pkg.tripadvisorUrl),
      getyourguideUrl: buildGygUrl(pkg.title),
      klookUrl: buildKlookUrl(pkg.title)
    }));

    const mappedHotels: NormalizedMarketplaceItem[] = hotels.map((ht) => ({
      id: ht.id,
      kind: 'hotel',
      kindLabel: `${ht.cat || 'Luxury'} Contract Stay`,
      title: ht.name,
      location: ht.location || 'Malaysia',
      priceMyr: applyComm(Number(ht.price) || 0),
      originalPriceMyr: ht.originalPrice,
      unitLabel: '/ night',
      rating: ht.rating || 4.8,
      reviews: ht.reviews || 310,
      trending: Boolean(ht.trending),
      image: resolveImage(ht.image, 'hotel'),
      viatorUrl: buildViatorUrl(ht.name, ht.viatorUrl),
      tripadvisorUrl: buildTripadvisorUrl(ht.name, ht.tripadvisorUrl),
      getyourguideUrl: buildGygUrl(ht.name),
      klookUrl: buildKlookUrl(ht.name)
    }));

    const mappedTransport: NormalizedMarketplaceItem[] = transport.map((tr) => ({
      id: tr.id,
      kind: 'transport',
      kindLabel: 'Private Chauffeur',
      title: tr.name,
      location: 'Peninsular Malaysia',
      priceMyr: applyComm(Number(tr.car) || 0),
      unitLabel: '/ vehicle',
      rating: tr.rating || 4.9,
      reviews: tr.reviews || 240,
      trending: Boolean(tr.trending),
      image: resolveImage(tr.image, 'transfer'),
      viatorUrl: buildViatorUrl(tr.name, tr.viatorUrl),
      tripadvisorUrl: buildTripadvisorUrl(tr.name, tr.tripadvisorUrl),
      getyourguideUrl: buildGygUrl(tr.name),
      klookUrl: buildKlookUrl(tr.name)
    }));

    return [
      ...mappedTickets,
      ...mappedPackages,
      ...mappedHotels,
      ...mappedTransport
    ].sort((a, b) => Number(b.trending) - Number(a.trending));
  }, [tickets, packages, hotels, transport, currentAgent, imageMap]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((item) => {
      if (activeCategory !== 'all' && item.kind !== activeCategory.slice(0, -1) && item.kind !== activeCategory) {
        if (
          !(activeCategory === 'tickets' && item.kind === 'ticket') &&
          !(activeCategory === 'packages' && item.kind === 'package') &&
          !(activeCategory === 'hotels' && item.kind === 'hotel') &&
          !(activeCategory === 'transport' && item.kind === 'transport')
        ) {
          return false;
        }
      }
      if (onlyTrending && !item.trending) return false;
      if (!q) return true;
      return `${item.title} ${item.location} ${item.kindLabel}`
        .toLowerCase()
        .includes(q);
    });
  }, [allItems, activeCategory, onlyTrending, searchQuery]);

  const trendingCount = useMemo(
    () => allItems.filter((i) => i.trending).length,
    [allItems]
  );

  return (
    <div className="w-full max-w-full overflow-x-clip bg-zinc-50 min-h-screen pb-24 sm:pb-16 text-zinc-900">
      {/* Top Return Navigation Bar */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-700 hover:text-emerald-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to Home</span>
          </button>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
            <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{trendingCount} Trending Services Available</span>
          </span>
        </div>
      </div>

      {/* Main Header & Intro */}
      <section className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-2">
              <Globe className="w-4 h-4 shrink-0" />
              <span>Verified Marketplace Portals &amp; Direct Reservation</span>
            </div>
            <h1
              className="text-2xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {settings.otaSectionTitle ||
                'Marketplace Booking: Platforms, Offers & Trending Services'}
            </h1>
            <p className="text-xs sm:text-base text-zinc-600 mt-2.5 leading-relaxed">
              {settings.otaSectionSubtitle ||
                'Choose any verified travel marketplace below to see active perks, compare platform offers, or jump straight to Viator, TripAdvisor, GetYourGuide, Klook, Trip.com, or Direct GFK Booking.'}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* SECTION 1: ALL VERIFIED MARKETPLACE PLATFORMS & ACTIVE OFFERS */}
        <section aria-labelledby="platforms-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2
                id="platforms-heading"
                className="text-lg sm:text-2xl font-extrabold text-zinc-950 tracking-tight"
              >
                1. Official Platforms &amp; Active Portal Offers
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Tap any platform to book directly with their traveler protection and offers.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 inline-flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              All bookings fulfilled by GFK Holidays Malaysia
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => {
              const perks =
                partner.perks && partner.perks.length > 0
                  ? partner.perks
                  : [
                      'Verified Partner Fulfillment',
                      'Instant Mobile Voucher',
                      '24/7 Local Concierge Support'
                    ];
              const categories = getPlatformCategories(partner.name);

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
                        Available: {categories}
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
                      Verified Global Checkout
                    </span>
                    <a
                      href={partner.url || 'https://www.viator.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>{partner.ctaLabel || `Go to ${partner.name}`}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: AVAILABLE & TRENDING SERVICES WITH PER-PLATFORM LINKS */}
        <section aria-labelledby="activities-heading" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-1">
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Trending &amp; Available Services Across All Platforms</span>
              </div>
              <h2
                id="activities-heading"
                className="text-lg sm:text-2xl font-extrabold text-zinc-950 tracking-tight"
              >
                2. Select an Activity &amp; Choose Your Platform
              </h2>
            </div>

            {/* Search & Trending Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              <div className="relative flex items-center bg-white border border-zinc-200 rounded-xl px-3 py-2 flex-1 sm:w-72 focus-within:border-emerald-600">
                <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tour, pass, hotel..."
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

              <button
                type="button"
                onClick={() => setOnlyTrending((prev) => !prev)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  onlyTrending
                    ? 'bg-amber-400 text-zinc-950 border-amber-500'
                    : 'bg-white text-zinc-800 border-zinc-200 hover:border-amber-400'
                }`}
              >
                <Flame className="w-3.5 h-3.5 shrink-0" />
                <span>Trending Only ({trendingCount})</span>
              </button>
            </div>
          </div>

          {/* Wrapped Systematic Category Filter Buttons (Zero horizontal page spillover) */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Services' },
              { id: 'tickets', label: 'Attraction Passes' },
              { id: 'packages', label: 'Tour Packages' },
              { id: 'hotels', label: 'Hotels & Resorts' },
              { id: 'transport', label: 'Private Transfers' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as CategoryFilter)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  activeCategory === tab.id
                    ? 'bg-zinc-950 text-white border-zinc-950'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Systematic Listings Grid */}
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center">
              <p className="text-sm font-medium text-zinc-500">
                No matching services found for your filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setOnlyTrending(false);
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredItems.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="bg-white border border-zinc-200 hover:border-emerald-500/70 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors shadow-2xs min-w-0"
                >
                  <div>
                    <div
                      onClick={() => onNavigate('/package', { id: item.id })}
                      className="relative h-44 bg-zinc-900 overflow-hidden cursor-pointer group"
                    >
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
                      {item.trending && (
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 text-zinc-950 text-[11px] font-extrabold">
                          <Flame className="w-3 h-3 shrink-0" />
                          Trending
                        </span>
                      )}
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
                        {item.kindLabel}
                      </div>
                      <h3
                        onClick={() => onNavigate('/package', { id: item.id })}
                        className="text-sm sm:text-base font-extrabold text-zinc-950 leading-snug line-clamp-2 hover:text-emerald-700 cursor-pointer"
                      >
                        {item.title}
                      </h3>

                      <div className="mt-2.5 flex items-baseline gap-2 tabular-nums">
                        <span className="text-base sm:text-lg font-extrabold text-zinc-950">
                          {formatPrice(item.priceMyr)}
                        </span>
                        <span className="text-xs text-zinc-500">{item.unitLabel}</span>
                        {item.originalPriceMyr && item.originalPriceMyr > item.priceMyr && (
                          <span className="text-xs text-zinc-400 line-through">
                            {formatPrice(item.originalPriceMyr)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Direct & External Marketplace Links */}
                  <div className="px-4 pb-4 pt-3 border-t border-zinc-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('/package', { id: item.id })}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Book Direct with GFK Holidays</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      <a
                        href={item.viatorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2 rounded-lg bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-400 text-[11px] font-bold text-zinc-800 inline-flex items-center justify-center gap-1 transition-colors truncate"
                      >
                        <span>Viator</span>
                        <ExternalLink className="w-3 h-3 text-emerald-700 shrink-0" />
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
                        href={item.getyourguideUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2 rounded-lg bg-zinc-50 hover:bg-orange-50 border border-zinc-200 hover:border-orange-300 text-[11px] font-bold text-zinc-800 inline-flex items-center justify-center gap-1 transition-colors truncate"
                      >
                        <span>GetYourGuide</span>
                        <ExternalLink className="w-3 h-3 text-orange-600 shrink-0" />
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
        </section>
      </div>
    </div>
  );
}
