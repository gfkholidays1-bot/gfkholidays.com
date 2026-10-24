import React, { useState, useEffect, useRef } from 'react';
import { loadVideoBlob } from '../lib/videoStorage';
import {
  Package,
  Ticket,
  Hotel,
  TransportRoute,
  Agent,
  CustomerMediaItem,
  SocialMediaChannel,
  OtaPartner,
  GlobalSettings
} from '../types';
import {
  DEFAULT_CUSTOMER_MEDIA,
  DEFAULT_SOCIAL_CHANNELS,
  DEFAULT_OTA_PARTNERS,
  DEFAULT_HOTEL_PARTNER_LOGOS,
  DEFAULT_FLIGHT_PARTNER_LOGOS,
  DEFAULT_GLOBAL_SETTINGS
} from '../data';
import {
  MapPin,
  ArrowRight,
  Compass,
  Car,
  Building,
  Building2,
  Ticket as TicketIcon,
  Wrench,
  Play,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Camera,
  Video,
  Share2,
  Award,
  X,
  Search,
  Palmtree,
  UtensilsCrossed,
  Waves
} from 'lucide-react';
import MobileB2CHome from './MobileB2CHome';

interface MalaysiaHomeProps {
  packages: Package[];
  tickets: Ticket[];
  hotels: Hotel[];
  transport: TransportRoute[];
  userRole?: string;
  currentAgent: Agent | null;
  globalSettings: Partial<GlobalSettings>;
  imageMap: Record<string, string>;
  onNavigate: (path: string, params?: any) => void;
  onRequestLogin?: (role: 'customer' | 'agent') => void;
}

export default function MalaysiaHome({
  packages,
  tickets,
  hotels,
  transport,
  userRole = 'guest',
  currentAgent,
  globalSettings,
  imageMap,
  onNavigate,
  onRequestLogin
}: MalaysiaHomeProps) {
  const settings: GlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...globalSettings,
    customerMedia: Array.isArray(globalSettings?.customerMedia)
      ? globalSettings.customerMedia
      : DEFAULT_CUSTOMER_MEDIA,
    socialChannels: Array.isArray(globalSettings?.socialChannels)
      ? globalSettings.socialChannels
      : DEFAULT_SOCIAL_CHANNELS,
    otaPartners: Array.isArray(globalSettings?.otaPartners)
      ? globalSettings.otaPartners
      : DEFAULT_OTA_PARTNERS,
    hotelPartnerLogos: Array.isArray(globalSettings?.hotelPartnerLogos)
      ? globalSettings.hotelPartnerLogos
      : DEFAULT_HOTEL_PARTNER_LOGOS,
    flightPartnerLogos: Array.isArray(globalSettings?.flightPartnerLogos)
      ? globalSettings.flightPartnerLogos
      : DEFAULT_FLIGHT_PARTNER_LOGOS
  };

  // Hero state
  const [heroSearch, setHeroSearch] = useState('');
  const [heroCategory, setHeroCategory] = useState<'all' | 'packages' | 'tickets' | 'hotels' | 'transport'>('all');
  const [heroMuted, setHeroMuted] = useState(true);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Active Hero & Featured Video state (loaded from globalSettings)
  const [activeHeroVideoUrl, setActiveHeroVideoUrl] = useState<string>(() => {
    return (
      settings.heroVideoUrl ||
      'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4'
    );
  });

  const [activeFeaturedVideoUrl, setActiveFeaturedVideoUrl] = useState<string>(() => {
    return (
      settings.featuredVideoEmbedUrl ||
      'https://viddler.com/embed/player?id=20382&color=default'
    );
  });

  // Load videos from high-speed IndexedDB and listen for admin live updates
  useEffect(() => {
    let isMounted = true;

    // Load background video from IndexedDB
    loadVideoBlob('hero_background_video').then((blobUrl) => {
      if (isMounted && blobUrl) {
        setActiveHeroVideoUrl(blobUrl);
      }
    });

    // Load featured attractions video from IndexedDB
    loadVideoBlob('featured_attractions_video').then((blobUrl) => {
      if (isMounted && blobUrl) {
        setActiveFeaturedVideoUrl(blobUrl);
      }
    });

    const handleVideoUpdated = (event: any) => {
      const { key, videoUrl } = event.detail || {};
      if (key === 'hero_background_video') {
        setActiveHeroVideoUrl(videoUrl);
      } else if (key === 'featured_attractions_video') {
        setActiveFeaturedVideoUrl(videoUrl);
      }
    };

    window.addEventListener('gfk-video-updated', handleVideoUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('gfk-video-updated', handleVideoUpdated);
    };
  }, []);

  // Keep video playing in continuous loop without stopping on re-renders
  useEffect(() => {
    const el = heroVideoRef.current;
    if (!el) return;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    }
  }, [activeHeroVideoUrl, heroMuted]);

  // Update when settings props change from Firestore ONLY if not using a custom local blob
  useEffect(() => {
    if (
      settings.heroVideoUrl &&
      settings.heroVideoUrl !== activeHeroVideoUrl &&
      !activeHeroVideoUrl.startsWith('blob:')
    ) {
      setActiveHeroVideoUrl(settings.heroVideoUrl);
    }
  }, [settings.heroVideoUrl]);

  useEffect(() => {
    if (
      settings.featuredVideoEmbedUrl &&
      settings.featuredVideoEmbedUrl !== activeFeaturedVideoUrl &&
      !activeFeaturedVideoUrl.startsWith('blob:')
    ) {
      setActiveFeaturedVideoUrl(settings.featuredVideoEmbedUrl);
    }
  }, [settings.featuredVideoEmbedUrl]);

  // Priority Malaysia Activities & Packages state
  const [activeCatalogTab, setActiveCatalogTab] = useState<'all' | 'packages' | 'tickets' | 'transport'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');

  // Hotel Contracts filter state
  const [hotelCategoryFilter, setHotelCategoryFilter] = useState<string>('ALL');

  // Customer Media state (for carousel mode & lightbox)
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<CustomerMediaItem | null>(null);

  const resolveImage = (keyOrUrl?: string, fallbackKey = 'kl') => {
    if (!keyOrUrl) return imageMap[fallbackKey] || imageMap.kl;
    if (keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/') || keyOrUrl.startsWith('data:')) {
      return keyOrUrl;
    }
    return imageMap[keyOrUrl] || imageMap[fallbackKey] || imageMap.kl;
  };

  const handleHeroSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (heroCategory === 'tickets') {
      onNavigate('/tickets', { query: heroSearch });
    } else if (heroCategory === 'hotels') {
      onNavigate('/hotels', { query: heroSearch });
    } else if (heroCategory === 'transport') {
      onNavigate('/transport', { query: heroSearch });
    } else {
      onNavigate('/search', { query: heroSearch });
    }
  };

  const malaysiaLocations = [
    { id: 'ALL', label: 'All Malaysia' },
    { id: 'Kuala Lumpur', label: 'Kuala Lumpur' },
    { id: 'Langkawi', label: 'Langkawi' },
    { id: 'Penang', label: 'Penang' },
    { id: 'Sabah', label: 'Sabah & Borneo' },
    { id: 'Genting', label: 'Genting Highlands' },
    { id: 'Cameron', label: 'Cameron Highlands' },
    { id: 'Semporna', label: 'Semporna & Mabul' },
    { id: 'Melaka', label: 'Melaka' }
  ];

  // Filter packages & tickets by selectedLocation
  const matchesLocation = (text?: string) => {
    if (selectedLocation === 'ALL') return true;
    if (!text) return false;
    return text.toLowerCase().includes(selectedLocation.toLowerCase());
  };

  const filteredPackages = packages.filter(
    (p) => matchesLocation(p.destination) || matchesLocation(p.title)
  );
  const filteredTickets = tickets.filter(
    (t) => matchesLocation(t.location) || matchesLocation(t.name)
  );
  const filteredTransport = transport.filter((tr) => matchesLocation(tr.name));

  // Filtered hotels for Direct Hotel Contracts section
  const filteredHotels = hotels.filter((h) => {
    if (hotelCategoryFilter === 'ALL') return true;
    return h.cat === hotelCategoryFilter;
  });

  // Marquee class computation based on Admin Portal settings
  const speed = settings.mediaAnimationSpeed || 'normal';
  const direction = settings.mediaSlideDirection || 'left';
  const marqueeClass = `gfk-marquee-${direction}-${speed}`;

  const customerMediaList = settings.customerMedia || DEFAULT_CUSTOMER_MEDIA;
  const activeSocials = (settings.socialChannels || DEFAULT_SOCIAL_CHANNELS).filter(
    (s) => s.enabled !== false
  );
  const otaPartnersList = settings.otaPartners || DEFAULT_OTA_PARTNERS;

  // Curated Malaysia Destination Spotlights
  const destinationSpotlights = [
    {
      name: 'Kuala Lumpur & KLCC',
      region: 'Federal Territory',
      tagline: 'Petronas Twin Towers, Batu Caves & Rooftop Dining',
      fromPrice: 43,
      image: imageMap.kl,
      filterKey: 'Kuala Lumpur',
      countLabel: '18+ Tours & Passes'
    },
    {
      name: 'Langkawi Archipelago',
      region: 'Kedah, Andaman Sea',
      tagline: 'Overwater Villas, SkyBridge, Sunset Yachts & Mangroves',
      fromPrice: 219,
      image: imageMap.langkawi,
      filterKey: 'Langkawi',
      countLabel: '12+ Island Experiences'
    },
    {
      name: 'Sabah & Semporna',
      region: 'Malaysian Borneo',
      tagline: 'Mount Kinabalu, Orangutans & Mabul Water Bungalows',
      fromPrice: 2150,
      image: imageMap.sabah,
      filterKey: 'Sabah',
      countLabel: '9+ Expeditions'
    },
    {
      name: 'George Town, Penang',
      region: 'UNESCO World Heritage',
      tagline: 'Peranakan Mansions, Penang Hill & Michelin Street Food',
      fromPrice: 219,
      image: imageMap.penang,
      filterKey: 'Penang',
      countLabel: '14+ Heritage Trails'
    },
    {
      name: 'Genting Highlands',
      region: 'Pahang Cloud Resort',
      tagline: 'SkyWorlds Theme Park, Awana SkyWay & Mountain Resorts',
      fromPrice: 130,
      image: imageMap.genting,
      filterKey: 'Genting',
      countLabel: '10+ Passes & Transfers'
    },
    {
      name: 'Cameron Highlands',
      region: 'Pahang Tea Country',
      tagline: 'BOH Tea Sanctuaries, Mossy Forest 4x4 & Strawberry Farms',
      fromPrice: 700,
      image: imageMap.cameron,
      filterKey: 'Cameron',
      countLabel: '8+ Highland Tours'
    }
  ];

  return (
    <div className="flex flex-col">
      {/* =====================================================================
          MOBILE B2C PHONE INTERFACE (Matching MakeMyTrip, Cleartrip, Trip.com & Akbar Travels)
      ===================================================================== */}
      <div className="md:hidden">
        <MobileB2CHome
          packages={packages}
          tickets={tickets}
          hotels={hotels}
          transport={transport}
          userRole={userRole}
          currentAgent={currentAgent}
          globalSettings={settings}
          imageMap={imageMap}
          onNavigate={onNavigate}
          onRequestLogin={onRequestLogin}
        />
      </div>

      {/* =====================================================================
          DESKTOP B2C HOMEPAGE (Tablets & Desktop Viewports)
      ===================================================================== */}
      <div className="hidden md:flex md:flex-col">
        {/* =====================================================================
            1. HERO SECTION WITH MALAYSIA VIDEO BACKGROUND (ADMIN-MANAGED)
        ===================================================================== */}
        <section className="relative mx-4 md:mx-8 mt-4 rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-xl">
        {/* Background Video & Measured Contrast Scrim */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {(() => {
              const src =
                activeHeroVideoUrl ||
                settings.heroVideoUrl ||
                'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4';
              const isDirectVideo =
                src.startsWith('blob:') ||
                src.startsWith('data:video') ||
                src.includes('.mp4') ||
                src.includes('.webm') ||
                src.includes('.mov') ||
                src.includes('pixabay.com/video');
              if (isDirectVideo) {
                return (
                  <video
                    ref={heroVideoRef}
                    key={src}
                    src={src}
                    autoPlay
                    loop
                    muted={heroMuted}
                    playsInline
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    tabIndex={-1}
                    aria-hidden="true"
                    onContextMenu={(e) => e.preventDefault()}
                    onKeyDown={(e) => e.preventDefault()}
                    onSeeking={(e) => {
                      e.preventDefault();
                    }}
                    onEnded={() => {
                      heroVideoRef.current?.play().catch(() => {});
                    }}
                    className="w-[200%] h-[200%] min-w-full min-h-full object-cover scale-110 pointer-events-none select-none"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  />
                );
              }
              return (
                <iframe
                  key={src}
                  src={src}
                  className="w-[200%] h-[200%] min-w-full min-h-full object-cover scale-110 pointer-events-none border-0"
                  style={{ aspectRatio: '16/9' }}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title="Malaysia Experience Video"
                />
              );
            })()}
          </div>
          {/* Color tint from Admin settings */}
          <div
            className="absolute inset-0 mix-blend-multiply pointer-events-none"
            style={{
              backgroundColor: settings.heroBgColor || '#091e1a',
              opacity: (settings.heroOverlayOpacity ?? 60) / 100
            }}
          />
          {/* Measured contrast scrim guaranteeing >= 4.5:1 legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-zinc-950/35 pointer-events-none" />
        </div>

        {/* Audio Mute/Unmute Toggle for Malaysia Background Video */}
        <button
          type="button"
          onClick={() => setHeroMuted(!heroMuted)}
          className="absolute top-6 right-6 z-30 bg-zinc-900/80 hover:bg-zinc-900 backdrop-blur-md text-zinc-200 border border-zinc-700/80 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          title={heroMuted ? 'Unmute Malaysia Video Audio' : 'Mute Video Audio'}
        >
          {heroMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span className="hidden sm:inline">{heroMuted ? 'Malaysia Aerial Film (Muted)' : 'Sound On'}</span>
        </button>

        {/* Hero Foreground Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 pt-20 pb-16 lg:pt-28 lg:pb-24">
          <div className="max-w-3xl">
            <p className="text-xs sm:text-sm font-bold tracking-wide text-emerald-400 mb-4">
              {settings.heroBadgeText || "Malaysia's #1 Direct Destination & Activity Specialist"}
            </p>

            <h1
              className="font-extrabold text-white tracking-tight leading-[1.08] mb-6"
              style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)', textWrap: 'balance' }}
            >
              <span className="font-serif italic font-semibold text-amber-300 block mb-1">
                {settings.heroTitleLine1 || 'Experience Truly Asia:'}
              </span>
              {settings.heroTitleLine2 || "Malaysia's Finest Tours, Activities & Stays."}
            </h1>

            <p className="text-base sm:text-lg text-zinc-200 leading-relaxed mb-10 max-w-2xl font-normal">
              {settings.heroSubtitle ||
                'Book direct with Malaysia’s premier licensed DMC and official local supplier for GetYourGuide, Viator & Trip.com. Instant attraction e-tickets, curated island packages, private transfers & contracted hotels at direct local rates.'}
            </p>
          </div>

          {/* Interactive Malaysia Experience & Package Search Bar */}
          <form
            onSubmit={handleHeroSearchSubmit}
            className="bg-white p-2.5 rounded-2xl shadow-2xl max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-2 border border-zinc-200/80"
          >
            <div className="md:col-span-6 flex items-center px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
              <Search className="text-emerald-700 w-5 h-5 mr-3 shrink-0" />
              <div className="w-full">
                <label className="block text-[11px] font-bold text-zinc-500">
                  Destination or Activity in Malaysia
                </label>
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Langkawi yacht, Petronas Twin Towers, Sabah, Genting..."
                  className="w-full focus:outline-none text-zinc-900 bg-transparent text-sm font-bold placeholder-zinc-400"
                />
              </div>
            </div>

            <div className="md:col-span-3 flex items-center px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
              <Compass className="text-emerald-700 w-5 h-5 mr-3 shrink-0" />
              <div className="w-full">
                <label className="block text-[11px] font-bold text-zinc-500">
                  Experience Category
                </label>
                <select
                  value={heroCategory}
                  onChange={(e) => setHeroCategory(e.target.value as any)}
                  className="w-full focus:outline-none text-zinc-900 bg-transparent text-sm font-bold cursor-pointer"
                >
                  <option value="all">All Malaysia</option>
                  <option value="packages">Tour Packages</option>
                  <option value="tickets">Attraction Passes</option>
                  <option value="hotels">Contracted Hotels</option>
                  <option value="transport">Private Transfers</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-3 flex">
              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{settings.heroPrimaryCta || 'Search Malaysia'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Malaysia Destination Filter Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300 mr-1">
              Trending Locations:
            </span>
            {malaysiaLocations.slice(1).map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  setSelectedLocation(loc.id);
                  const el = document.getElementById('malaysia-priority-catalog');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedLocation === loc.id
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-zinc-900/75 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/70'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Full-Width 4-Column Quantitative Proof Bar at Bottom of Hero */}
        <div className="relative z-20 bg-zinc-950/90 border-t border-zinc-800/80 px-6 sm:px-10 py-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">
                73,900+ Travelers
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Served across Peninsular &amp; East Malaysia in 2025–2026
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 tabular-nums">
                4.9 / 5.0 Verified
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Official Local Supplier on GetYourGuide, Trip.com &amp; Viator
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-white tabular-nums">
                Up to 25% Direct Savings
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Zero third-party markup on Malaysia packages &amp; attraction tickets
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400 tabular-nums">
                Instant E-Vouchers
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                Direct gate entry &amp; 24/7 Kuala Lumpur operations support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          OUR SERVICES (DISPLAYED FIRST FOR ALL SCREEN SIZES - 6 CORE PILLARS)
          1. Day Out & Packages
          2. Hotels & Stays
          3. Restaurants
          4. Sightseeing & Attractions
          5. Transport Services
          6. Cruises
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2 w-full">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-zinc-200/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
                  Our Services
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">
                Explore Malaysia&apos;s 6 direct local travel services with instant confirmation
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full self-start sm:self-auto">
              Direct Local Supplier Rates
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* SERVICE 1: Day Out & Packages */}
            <button
              type="button"
              onClick={() => onNavigate('/search', { category: 'Packages' })}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-amber-400/80 rounded-2xl p-4 text-left shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-[136px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Palmtree className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="bg-amber-100 text-amber-900 border border-amber-300/80 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Island &amp; City
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-zinc-950 group-hover:text-amber-800 transition-colors leading-tight">
                  Day Out &amp; Packages
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                  Langkawi, Sabah &amp; KL
                </p>
              </div>
            </button>

            {/* SERVICE 2: Hotels & Stays */}
            <button
              type="button"
              onClick={() => onNavigate('/hotels')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-emerald-500/80 rounded-2xl p-4 text-left shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-[136px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300/80 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Direct Rates
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-zinc-950 group-hover:text-emerald-800 transition-colors leading-tight">
                  Hotels &amp; Stays
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                  Resorts &amp; 5-Star Rooms
                </p>
              </div>
            </button>

            {/* SERVICE 3: Restaurants */}
            <button
              type="button"
              onClick={() => onNavigate('/search', { query: 'Dining' })}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-rose-400/80 rounded-2xl p-4 text-left shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-[136px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="bg-rose-100 text-rose-900 border border-rose-300/80 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Authentic Taste
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-zinc-950 group-hover:text-rose-800 transition-colors leading-tight">
                  Restaurants
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                  Michelin Trails &amp; High-Tea
                </p>
              </div>
            </button>

            {/* SERVICE 4: Sightseeing & Attractions */}
            <button
              type="button"
              onClick={() => onNavigate('/tickets')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-purple-400/80 rounded-2xl p-4 text-left shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-[136px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <TicketIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="bg-purple-100 text-purple-900 border border-purple-300/80 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Instant QR
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-zinc-950 group-hover:text-purple-800 transition-colors leading-tight">
                  Sightseeing &amp; Attractions
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                  Twin Towers &amp; Parks
                </p>
              </div>
            </button>

            {/* SERVICE 5: Transport Services */}
            <button
              type="button"
              onClick={() => onNavigate('/transport')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-blue-400/80 rounded-2xl p-4 text-left shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-[136px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Car className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="bg-blue-100 text-blue-900 border border-blue-300/80 text-[10px] font-black px-2 py-0.5 rounded-full">
                  VIP Fleet
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-zinc-950 group-hover:text-blue-800 transition-colors leading-tight">
                  Transport Services
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                  KLIA Cabs &amp; Chauffeurs
                </p>
              </div>
            </button>

            {/* SERVICE 6: Cruises */}
            <button
              type="button"
              onClick={() => onNavigate('/search', { query: 'Cruise' })}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-teal-400/80 rounded-2xl p-4 text-left shadow-xs hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between h-[136px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Waves className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="bg-cyan-100 text-cyan-900 border border-cyan-300/80 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Sunset Catamaran
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-zinc-950 group-hover:text-teal-800 transition-colors leading-tight">
                  Cruises
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                  Langkawi &amp; Marina Yachts
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. PRIORITY SECTION: MALAYSIA ACTIVITIES, ATTRACTION PASSES & PACKAGES
      ===================================================================== */}
      <section
        id="malaysia-priority-catalog"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 w-full"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-6">
          <div>
            <p className="text-xs font-bold text-emerald-700 mb-2">
              01. Curated Malaysia Experiences &amp; All-Inclusive Packages
            </p>
            <h2
              className="text-2xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Top-Selling Malaysia Activities &amp; Holiday Packages
            </h2>
            <p className="text-zinc-600 text-sm sm:text-base mt-2 max-w-2xl">
              Book directly with the local Malaysian operator. Transparent retail and B2B rates across Kuala Lumpur, Langkawi, Penang, Sabah, Genting Highlands, and Semporna.
            </p>
          </div>

          {/* Interactive Category Segmented Control */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-100 rounded-xl border border-zinc-200/80 self-start">
            {[
              { id: 'all', label: 'All Highlights' },
              { id: 'packages', label: `Tour Packages (${packages.length})` },
              { id: 'tickets', label: `Attraction Tickets (${tickets.length})` },
              { id: 'transport', label: `Private Chauffeur (${transport.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCatalogTab(tab.id as any)}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCatalogTab === tab.id
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Location Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-zinc-200">
          {malaysiaLocations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setSelectedLocation(loc.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedLocation === loc.id
                  ? 'bg-zinc-950 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>

        {/* Priority Grid of Malaysia Packages, Attraction Tickets & Transfers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Render Packages */}
          {(activeCatalogTab === 'all' || activeCatalogTab === 'packages') &&
            filteredPackages
              .slice(0, activeCatalogTab === 'packages' ? 8 : 4)
              .map((pkg) => {
                const img = resolveImage(pkg.image, 'langkawi');
                const displayPrice = currentAgent
                  ? Math.round(pkg.base_price * (1 - currentAgent.commission / 100))
                  : pkg.base_price;
                const origPrice = pkg.original_price || Math.round(pkg.base_price * 1.22);
                const savingsPct = Math.max(
                  5,
                  Math.round(((origPrice - displayPrice) / origPrice) * 100)
                );

                return (
                  <div
                    key={pkg.id}
                    onClick={() => onNavigate('/package', { id: pkg.id })}
                    className="bg-white rounded-2xl border border-zinc-200/90 overflow-hidden hover:border-emerald-600/60 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-52 overflow-hidden bg-zinc-900">
                        <img
                          src={img}
                          alt={pkg.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = imageMap.kl;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white font-semibold">
                          <span className="flex items-center truncate">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                            <span className="truncate">{pkg.destination}</span>
                          </span>
                          <span className="tabular-nums shrink-0 ml-2">
                            {pkg.duration_days} {pkg.duration_days === 1 ? 'Day' : 'Days'}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        {/* Unboxed clean metadata */}
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2 tabular-nums">
                          <span className="font-semibold text-emerald-700">Malaysia Package</span>
                          <span aria-hidden="true">·</span>
                          <span>★ {pkg.rating || 4.9} ({pkg.reviews || 210})</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-semibold">Save {savingsPct}%</span>
                        </div>

                        <h3 className="text-base font-bold text-zinc-950 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                          {pkg.title}
                        </h3>

                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                          {pkg.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-3 border-t border-zinc-100 flex items-end justify-between">
                      <div>
                        <span className="text-[11px] text-zinc-400 line-through block tabular-nums">
                          RM {origPrice.toLocaleString()}
                        </span>
                        <div className="text-lg font-extrabold text-zinc-950 tabular-nums leading-none">
                          RM {displayPrice.toLocaleString()}
                          <span className="text-xs font-normal text-zinc-500"> / pax</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center whitespace-nowrap">
                        Book Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </span>
                    </div>
                  </div>
                );
              })}

          {/* Render Attraction Tickets */}
          {(activeCatalogTab === 'all' || activeCatalogTab === 'tickets') &&
            filteredTickets
              .slice(0, activeCatalogTab === 'tickets' ? 8 : 4)
              .map((tk) => {
                const img = resolveImage(tk.image, 'petronas');
                const displayPrice = currentAgent
                  ? Math.round(tk.price * (1 - currentAgent.commission / 100))
                  : tk.price;
                const origPrice = tk.originalPrice || Math.round(tk.price * 1.25);

                return (
                  <div
                    key={tk.id}
                    onClick={() => onNavigate('/package', { id: tk.id })}
                    className="bg-white rounded-2xl border border-zinc-200/90 overflow-hidden hover:border-emerald-600/60 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-52 overflow-hidden bg-zinc-900">
                        <img
                          src={img}
                          alt={tk.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = imageMap.petronas;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white font-semibold">
                          <span className="flex items-center truncate">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-amber-400 shrink-0" />
                            <span className="truncate">{tk.location || 'Kuala Lumpur, Malaysia'}</span>
                          </span>
                          <span className="shrink-0 ml-2 text-emerald-300">Instant E-Ticket</span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2 tabular-nums">
                          <span className="font-semibold text-rose-700">Attraction Pass</span>
                          <span aria-hidden="true">·</span>
                          <span>★ {tk.rating || 4.8} ({tk.reviews || 340})</span>
                        </div>

                        <h3 className="text-base font-bold text-zinc-950 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                          {tk.name}
                        </h3>

                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                          {tk.instructions || tk.info}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-3 border-t border-zinc-100 flex items-end justify-between">
                      <div>
                        <span className="text-[11px] text-zinc-400 line-through block tabular-nums">
                          RM {origPrice.toLocaleString()}
                        </span>
                        <div className="text-lg font-extrabold text-zinc-950 tabular-nums leading-none">
                          RM {displayPrice.toLocaleString()}
                          <span className="text-xs font-normal text-zinc-500"> / ticket</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center whitespace-nowrap">
                        Get Pass <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </span>
                    </div>
                  </div>
                );
              })}

          {/* Render Transport Routes when selected */}
          {activeCatalogTab === 'transport' &&
            filteredTransport.slice(0, 8).map((tr) => {
              const img = resolveImage(tr.image, 'transfer');
              return (
                <div
                  key={tr.id}
                  onClick={() => onNavigate('/package', { id: tr.id })}
                  className="bg-white rounded-2xl border border-zinc-200/90 overflow-hidden hover:border-emerald-600/60 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-48 overflow-hidden bg-zinc-900">
                      <img
                        src={img}
                        alt={tr.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = imageMap.transfer;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 text-xs text-white font-semibold">
                        Private Chauffeur · Sedan / MPV / Van
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2 tabular-nums">
                        <span className="font-semibold text-indigo-700">Malaysia Transfer</span>
                        <span aria-hidden="true">·</span>
                        <span>★ {tr.rating || 4.9}</span>
                      </div>
                      <h3 className="text-base font-bold text-zinc-950 group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {tr.name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                        {tr.instructions || 'Door-to-door private transfer inclusive of fuel & highway tolls.'}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-3 border-t border-zinc-100 flex items-end justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-400 block">Private Vehicle From</span>
                      <div className="text-lg font-extrabold text-zinc-950 tabular-nums leading-none">
                        RM {tr.car.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 inline-flex items-center">
                      Book Fleet <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Quick Catalog Directory Actions */}
        <div className="mt-10 pt-8 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-600 font-semibold">
            <button
              onClick={() => onNavigate('/search')}
              className="hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-700" /> View All {packages.length} Malaysia Tour Packages
            </button>
            <button
              onClick={() => onNavigate('/tickets')}
              className="hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
            >
              <TicketIcon className="w-4 h-4 text-rose-600" /> View All {tickets.length} Attraction E-Tickets
            </button>
            <button
              onClick={() => onNavigate('/transport')}
              className="hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Car className="w-4 h-4 text-indigo-600" /> View All {transport.length} Private Transfer Routes
            </button>
            <button
              onClick={() => onNavigate('/ctfu-builder')}
              className="hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-amber-600" /> Custom Malaysia Itinerary Builder
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. ICONIC MALAYSIA DESTINATIONS BENTO SPOTLIGHT
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-bold text-emerald-700 mb-2">
              02. Destination Directory Across Peninsular &amp; East Malaysia
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Explore Malaysia by Destination &amp; Starting Price
            </h2>
          </div>
          <button
            onClick={() => onNavigate('/search')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            Explore Full Malaysia Directory <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {destinationSpotlights.map((dest, idx) => (
            <div
              key={dest.name}
              onClick={() => {
                setSelectedLocation(dest.filterKey);
                const el = document.getElementById('malaysia-priority-catalog');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer border border-zinc-200 bg-zinc-900 ${
                idx === 0 || idx === 3 ? 'md:col-span-2 h-72' : 'col-span-1 h-72'
              }`}
            >
              <img
                src={dest.image}
                alt={dest.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/35 to-transparent" />
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-zinc-200 font-semibold">
                  <span>{dest.region}</span>
                  <span className="tabular-nums">{dest.countLabel}</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {dest.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-lg">
                    {dest.tagline}
                  </p>
                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
                    <span className="text-xs text-emerald-300 font-bold tabular-nums">
                      Activities &amp; Packages from RM {dest.fromPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-white inline-flex items-center group-hover:translate-x-1 transition-transform">
                      View Experiences <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          4. CUSTOMER PHOTOS & VIDEOS SHOWCASE (SLIDING / CAROUSEL / BENTO / STORIES)
      ===================================================================== */}
      <section className="bg-zinc-950 text-white py-20 my-12 border-y border-zinc-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold text-emerald-400 mb-2">
                03. Verified Guest Gallery · Photos &amp; Videos Across Malaysia
              </p>
              <h2
                className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                Real Travelers, Unforgettable Malaysian Moments
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base mt-2 max-w-2xl">
                Watch live guest videos and candid travel photography from Petronas Twin Towers, Langkawi sunset yachts, Semporna coral lagoons, and Borneo rainforest safaris.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" /> Customer Photos
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Video className="w-4 h-4 text-amber-400" /> Live Trip Videos
              </span>
            </div>
          </div>
        </div>

        {/* PRESENTATION MODE 1: CONTINUOUS SLIDING CINEMA REEL (DEFAULT) */}
        {(!settings.mediaPresentationStyle || settings.mediaPresentationStyle === 'sliding') && (
          <div className="relative w-full overflow-hidden py-2">
            <div className={`flex gap-6 w-max gfk-marquee-track ${marqueeClass} px-4`}>
              {[...customerMediaList, ...customerMediaList].map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => setActiveLightboxMedia(item)}
                  className="w-[340px] sm:w-[400px] shrink-0 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-emerald-500/60 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="relative h-60 bg-zinc-950 overflow-hidden">
                    {item.type === 'video' ? (
                      <>
                        <video
                          src={item.url}
                          poster={item.posterUrl || imageMap.kl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md text-amber-400 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-zinc-700">
                          <Play className="w-3 h-3 fill-amber-400" /> Video Reel
                        </div>
                      </>
                    ) : (
                      <>
                        <img
                          src={item.url}
                          alt={item.experienceTitle}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = imageMap.langkawi;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md text-emerald-400 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-zinc-700">
                          <Camera className="w-3 h-3" /> Verified Photo
                        </div>
                      </>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-zinc-200 font-semibold">
                      <span className="flex items-center truncate">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                      <span className="text-amber-400 tabular-nums shrink-0 ml-2">
                        {'★'.repeat(item.rating || 5)}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-400 mb-1 truncate">
                        {item.experienceTitle}
                      </p>
                      <p className="text-sm text-zinc-200 leading-relaxed line-clamp-2">
                        "{item.caption}"
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-bold text-white">{item.customerName}</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRESENTATION MODE 2: INTERACTIVE SPOTLIGHT CAROUSEL */}
        {settings.mediaPresentationStyle === 'carousel' && customerMediaList.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {(() => {
              const currentItem = customerMediaList[carouselIdx % customerMediaList.length];
              return (
                <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  <div
                    onClick={() => setActiveLightboxMedia(currentItem)}
                    className="lg:col-span-7 relative min-h-[340px] lg:min-h-[440px] bg-zinc-950 cursor-pointer"
                  >
                    {currentItem.type === 'video' ? (
                      <video
                        key={currentItem.url}
                        src={currentItem.url}
                        poster={currentItem.posterUrl || imageMap.kl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={currentItem.url}
                        alt={currentItem.experienceTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-6 flex items-center gap-2 text-xs text-white font-bold">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>{currentItem.location}</span>
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-8 lg:p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mb-3">
                        <span>{currentItem.type === 'video' ? 'Featured Guest Video' : 'Featured Guest Photo'}</span>
                        <span>·</span>
                        <span className="text-amber-400">{'★'.repeat(currentItem.rating || 5)}</span>
                      </div>
                      <h3 className="text-2xl font-extrabold text-white mb-4">
                        {currentItem.experienceTitle}
                      </h3>
                      <p className="text-base text-zinc-300 leading-relaxed mb-6">
                        "{currentItem.caption}"
                      </p>
                      <div className="text-sm font-bold text-white">
                        {currentItem.customerName}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Traveled {currentItem.date} · Verified GFK Holidays Booking
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCarouselIdx(
                              (carouselIdx - 1 + customerMediaList.length) % customerMediaList.length
                            )
                          }
                          className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
                          aria-label="Previous media"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCarouselIdx((carouselIdx + 1) % customerMediaList.length)}
                          className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-colors cursor-pointer"
                          aria-label="Next media"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-zinc-400 ml-2 tabular-nums">
                          {(carouselIdx % customerMediaList.length) + 1} / {customerMediaList.length}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate('/search')}
                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        Book Similar Trip <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* PRESENTATION MODE 3: EDITORIAL BENTO MOSAIC */}
        {settings.mediaPresentationStyle === 'bento' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {customerMediaList.slice(0, 6).map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setActiveLightboxMedia(item)}
                className={`group relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer ${
                  idx === 0 || idx === 3 ? 'md:col-span-2 h-80' : 'col-span-1 h-80'
                }`}
              >
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    poster={item.posterUrl || imageMap.kl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.experienceTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-transparent" />
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs text-zinc-200 font-semibold">
                    <span>{item.location}</span>
                    <span>{item.type === 'video' ? '▶ Video' : 'Photo'}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400 mb-1">
                      {item.experienceTitle}
                    </p>
                    <p className="text-sm text-white font-medium line-clamp-2">
                      "{item.caption}"
                    </p>
                    <p className="text-xs text-zinc-400 mt-2">
                      {item.customerName} · {item.date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRESENTATION MODE 4: VERTICAL SOCIAL STORY REELS */}
        {settings.mediaPresentationStyle === 'stories' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {customerMediaList.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveLightboxMedia(item)}
                className="group relative h-[420px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer"
              >
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    poster={item.posterUrl || imageMap.kl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.experienceTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/20 to-transparent" />
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div className="text-[11px] font-bold text-emerald-300 truncate">
                    {item.location}
                  </div>
                  <div>
                    <p className="text-xs text-white font-medium line-clamp-3 mb-2">
                      "{item.caption}"
                    </p>
                    <p className="text-[11px] font-bold text-zinc-300 truncate">
                      {item.customerName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================================
          5. SOCIAL MEDIA PRESENCE & LIVE COMMUNITY HUB ON HOMEPAGE
      ===================================================================== */}
      {activeSocials.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-700 mb-2">
                04. Official Social Media Presence &amp; Daily Malaysia Dispatches
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                Follow GFK Holidays Malaysia Across Social Media
              </h2>
              <p className="text-zinc-600 text-sm sm:text-base mt-1.5 max-w-2xl">
                Join over 500,000+ Malaysia travel lovers for daily 4K island drone reels, street food trails, live weather updates, and flash package deals.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
              <Share2 className="w-4 h-4 text-emerald-700" />
              <span>Tag #GFKMalaysia to be featured on our homepage</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {activeSocials.map((soc) => (
              <a
                key={soc.id}
                href={soc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white hover:bg-zinc-50 rounded-2xl p-6 border border-zinc-200/90 hover:border-emerald-600/60 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-extrabold text-zinc-950">
                      {soc.platform}
                    </span>
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-emerald-700 transition-colors" />
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mb-2 truncate">
                    {soc.handle}
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {soc.highlightText}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-zinc-900 tabular-nums">
                    {soc.followers}
                  </span>
                  <span className="font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                    Connect →
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          6. END OF HOMEPAGE: DIRECT HOTEL CONTRACTS & GLOBAL OTA SUPPLIER PARTNERSHIPS
      ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full border-t border-zinc-200">
        {/* PART A: DIRECT MALAYSIA HOTEL CONTRACTS DISPLAY */}
        <div className="mb-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-6">
            <div>
              <p className="text-xs font-bold text-emerald-700 mb-2">
                05. Direct Hotelier Allotments &amp; Corporate Contracts
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
                {settings.hotelContractsTitle ||
                  'Direct Malaysia Hotel Contracts & Resort Allotments'}
              </h2>
              <p className="text-zinc-600 text-sm sm:text-base mt-1.5 max-w-2xl">
                {settings.hotelContractsSubtitle ||
                  'Pre-negotiated direct DMC hotel contracts across Kuala Lumpur, Langkawi, Genting Highlands & Penang. Instant room confirmation without middleman markups.'}
              </p>
            </div>

            {/* Hotel Star/Category Filter */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-100 rounded-xl border border-zinc-200/80 self-start">
              {['ALL', '5-Star', '4-Star', 'Resort', '3-Star'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setHotelCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    hotelCategoryFilter === cat
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {cat === 'ALL' ? 'All Contracted Hotels' : cat}
                </button>
              ))}
            </div>
          </div>

          {settings.hotelContractsStyle === 'sliding' ? (
            <div className="relative w-full overflow-hidden py-2">
              <div className="flex gap-6 w-max gfk-marquee-track gfk-marquee-left-normal">
                {[...filteredHotels, ...filteredHotels].map((ht, index) => {
                  const img = resolveImage(ht.image, 'hotel');
                  const displayPrice = currentAgent
                    ? Math.round(ht.price * (1 - currentAgent.commission / 100))
                    : ht.price;
                  const origPrice = ht.originalPrice || Math.round(ht.price * 1.28);
                  return (
                    <div
                      key={`${ht.id}-${index}`}
                      onClick={() => onNavigate('/package', { id: ht.id })}
                      className="w-[320px] shrink-0 bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:border-emerald-600 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="relative h-44 bg-zinc-900 overflow-hidden">
                        <img
                          src={img}
                          alt={ht.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex justify-between text-xs text-white font-semibold">
                          <span className="truncate">{ht.location || 'Kuala Lumpur, Malaysia'}</span>
                          <span className="text-amber-300 shrink-0 ml-2">{ht.cat}</span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="text-xs font-semibold text-emerald-700 mb-1">
                          {ht.contractBadge || 'Direct DMC Contract Rate'}
                        </div>
                        <h3 className="text-base font-bold text-zinc-950 line-clamp-1">
                          {ht.name}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                          {ht.instructions}
                        </p>
                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-end justify-between">
                          <div>
                            <span className="text-[11px] text-zinc-400 line-through block tabular-nums">
                              RM {origPrice}
                            </span>
                            <span className="text-base font-extrabold text-zinc-950 tabular-nums">
                              RM {displayPrice} <span className="text-xs font-normal text-zinc-500">/ night</span>
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-700">Book Room →</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredHotels.slice(0, 8).map((ht) => {
                const img = resolveImage(ht.image, 'hotel');
                const displayPrice = currentAgent
                  ? Math.round(ht.price * (1 - currentAgent.commission / 100))
                  : ht.price;
                const origPrice = ht.originalPrice || Math.round(ht.price * 1.28);

                return (
                  <div
                    key={ht.id}
                    onClick={() => onNavigate('/package', { id: ht.id })}
                    className="bg-white rounded-2xl border border-zinc-200/90 overflow-hidden hover:border-emerald-600/60 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 bg-zinc-900 overflow-hidden">
                        <img
                          src={img}
                          alt={ht.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = imageMap.hotel;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white font-semibold">
                          <span className="flex items-center truncate">
                            <Building className="w-3.5 h-3.5 mr-1 text-amber-400 shrink-0" />
                            <span className="truncate">{ht.location || 'Kuala Lumpur'}</span>
                          </span>
                          <span className="text-amber-300 shrink-0 ml-2">{ht.cat}</span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 tabular-nums">
                          <span className="font-semibold text-emerald-700">
                            {ht.contractBadge || 'Direct Hotel Contract'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>★ {ht.rating || 4.7}</span>
                        </div>

                        <h3 className="text-base font-bold text-zinc-950 group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {ht.name}
                        </h3>

                        <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">
                          {ht.instructions}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-3 border-t border-zinc-100 flex items-end justify-between">
                      <div>
                        <span className="text-[11px] text-zinc-400 line-through block tabular-nums">
                          OTA Rate RM {origPrice}
                        </span>
                        <div className="text-lg font-extrabold text-zinc-950 tabular-nums leading-none">
                          RM {displayPrice}
                          <span className="text-xs font-normal text-zinc-500"> / night</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 inline-flex items-center whitespace-nowrap">
                        Contract Rate <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => onNavigate('/hotels')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
            >
              View All {hotels.length} Direct Contracted Hotels in Malaysia <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>


      {/* =====================================================================
          LIGHTBOX MODAL FOR CUSTOMER PHOTO / VIDEO PREVIEW
      ===================================================================== */}
      {activeLightboxMedia && (
        <div
          className="fixed inset-0 z-[100] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveLightboxMedia(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveLightboxMedia(null)}
              className="absolute top-4 right-4 z-10 bg-zinc-950/80 hover:bg-zinc-800 text-white p-2 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-80 sm:h-[420px] bg-black">
              {activeLightboxMedia.type === 'video' ? (
                <video
                  src={activeLightboxMedia.url}
                  poster={activeLightboxMedia.posterUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={activeLightboxMedia.url}
                  alt={activeLightboxMedia.experienceTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="p-6 sm:p-8 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-400 font-bold mb-2">
                <span>{activeLightboxMedia.location}</span>
                <span className="text-amber-400">
                  {'★'.repeat(activeLightboxMedia.rating || 5)} Verified Traveler Moment
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">
                {activeLightboxMedia.experienceTitle}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                "{activeLightboxMedia.caption}"
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-zinc-800">
                <div className="text-xs text-zinc-400">
                  Shared by <strong className="text-white">{activeLightboxMedia.customerName}</strong> ·{' '}
                  {activeLightboxMedia.date}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveLightboxMedia(null);
                    onNavigate('/search');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Book This Malaysia Experience</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Partner Photos Marquee Ticker (Controllable by Admin Portal) */}
      {settings.partnerMarqueeEnabled !== false && (
        <section className="bg-zinc-950 border-t border-b border-zinc-800 py-6 overflow-hidden mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Official Partners, OTAs &amp; Airlines Alliance Network</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
              Live Verified Ticker • {settings.partnerMarqueeDirection === 'right' ? 'Right-to-Left' : 'Left-to-Right'}
            </span>
          </div>
          <div className="relative w-full overflow-hidden py-1">
            <div
              className={`flex gap-6 w-max gfk-marquee-track ${
                settings.partnerMarqueeDirection === 'right'
                  ? `gfk-marquee-right-${settings.partnerMarqueeSpeed || 'normal'}`
                  : `gfk-marquee-left-${settings.partnerMarqueeSpeed || 'normal'}`
              }`}
            >
              {[
                ...(settings.partnerMarqueeLogos || []),
                ...(settings.partnerMarqueeLogos || [])
              ].map((logo, idx) => (
                <div
                  key={`${logo.id}-${idx}`}
                  className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-3 shrink-0 shadow-sm hover:border-zinc-700 transition-colors"
                >
                  <div className="w-12 h-10 rounded-xl bg-zinc-950 border border-zinc-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={logo.logoUrl}
                      alt={logo.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-white tracking-tight flex items-center gap-1.5">
                      <span>{logo.name}</span>
                      {logo.verified && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      {logo.subtitle || logo.badgeText || 'Verified Partner'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
