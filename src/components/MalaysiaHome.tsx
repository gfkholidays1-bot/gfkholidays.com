import React, { useState, useEffect, useRef } from 'react';
import {
  loadVideoBlob,
  getVideoSourceMode,
  getUploadedServerVideoUrl,
  isDirectVideoSource,
  isUploadedVideoUrl,
  isUniversalHttpVideoUrl,
  ensureUploadedVideoSyncedToServer,
  getWarmMemoryBlobUrl,
  getWarmHttpBlobUrl,
  getCachedPlayableVideoUrl,
  cacheHttpVideoInBackground,
  getHeroPosterCache,
  DEFAULT_SCENIC_HERO_VIDEO
} from '../lib/videoStorage';
import { HOME_SECTIONS, HOME_SECTION_EVENT, scrollToHomeSection } from '../lib/homeSections';
import {
  Package,
  Ticket,
  Hotel,
  TransportRoute,
  Agent,
  CustomerMediaItem,
  SocialMediaChannel,
  OtaPartner,
  AvailableFlight,
  GlobalSettings,
  FlightInquiry
} from '../types';
import {
  DEFAULT_CUSTOMER_MEDIA,
  DEFAULT_SOCIAL_CHANNELS,
  DEFAULT_OTA_PARTNERS,
  DEFAULT_HOTEL_PARTNER_LOGOS,
  DEFAULT_FLIGHT_PARTNER_LOGOS,
  DEFAULT_AVAILABLE_FLIGHTS,
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
  Waves,
  Plane,
  Flame,
  Globe
} from 'lucide-react';
import MobileB2CHome from './MobileB2CHome';
import PartnerAllianceSection from './PartnerAllianceSection';
import FlightFinderSection from './FlightFinderSection';
import { useCurrencyRate } from '../lib/currency';

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
  onSubmitFlightInquiry?: (
    inquiry: Omit<FlightInquiry, 'id' | 'status' | 'createdAt' | 'targetEmail'>
  ) => Promise<FlightInquiry | null>;
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
  onRequestLogin,
  onSubmitFlightInquiry
}: MalaysiaHomeProps) {
  const { formatPrice } = useCurrencyRate();
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
      : DEFAULT_FLIGHT_PARTNER_LOGOS,
    availableFlights:
      Array.isArray(globalSettings?.availableFlights) && globalSettings.availableFlights.length > 0
        ? globalSettings.availableFlights
        : DEFAULT_AVAILABLE_FLIGHTS
  };

  // Hero state
  const [heroSearch, setHeroSearch] = useState('');
  const [heroCategory, setHeroCategory] = useState<'all' | 'packages' | 'tickets' | 'hotels' | 'transport'>('all');
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  const isExpressHost = (): boolean =>
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('run.app') || window.location.hostname === 'localhost');

  // Unified Active Hero & Featured Video state (Firestore cloud state takes strict precedence over localStorage)
  const resolvePreferredVideoUrl = (): string => {
    const hasExplicitSource = Boolean(settings.heroVideoSource);
    const isUploadMode =
      settings.heroVideoSource === 'upload' ||
      isUploadedVideoUrl(settings.heroVideoUrl) ||
      (!hasExplicitSource && getVideoSourceMode() === 'upload');

    if (isUploadMode) {
      const warmBlob = getWarmMemoryBlobUrl('hero_background_video', settings.heroVideoFileName);
      if (warmBlob) return warmBlob;

      if (isUniversalHttpVideoUrl(settings.heroVideoUrl)) {
        return getWarmHttpBlobUrl(settings.heroVideoUrl) || settings.heroVideoUrl!;
      }
      if (settings.heroVideoUrl && isExpressHost() && settings.heroVideoUrl.startsWith('/api/cms-video/')) {
        return settings.heroVideoUrl;
      }
      const serverUpload = getUploadedServerVideoUrl();
      if (serverUpload && (isUniversalHttpVideoUrl(serverUpload) || (isExpressHost() && serverUpload.startsWith('/api/cms-video/')))) {
        return getWarmHttpBlobUrl(serverUpload) || serverUpload;
      }
      // Do NOT download DEFAULT_SCENIC_HERO_VIDEO while resolving uploaded firestore-video:// blob;
      // show 0ms poster frame until IndexedDB/chunks finish cleanly!
      return '';
    }

    const rawUrl = settings.heroVideoUrl || settings.featuredVideoEmbedUrl;
    if (rawUrl && !rawUrl.includes('viddler.com') && !rawUrl.startsWith('firestore-video://')) {
      return getWarmHttpBlobUrl(rawUrl) || rawUrl;
    }
    return getWarmHttpBlobUrl(DEFAULT_SCENIC_HERO_VIDEO) || DEFAULT_SCENIC_HERO_VIDEO;
  };

  const [activeHeroVideoUrl, setActiveHeroVideoUrl] = useState<string>(resolvePreferredVideoUrl);
  const [heroVideoReady, setHeroVideoReady] = useState<boolean>(false);
  const heroPosterUrl = settings.heroFallbackImage || getHeroPosterCache() || imageMap.kl;

  useEffect(() => {
    setHeroVideoReady(false);
  }, [activeHeroVideoUrl]);

  // Listen for instant local admin video changes
  useEffect(() => {
    const handleVideoUpdated = (event: any) => {
      const { videoUrl, serverUrl, fileName } = event.detail || {};
      const preferredPlayable =
        (videoUrl && !String(videoUrl).startsWith('firestore-video://') ? videoUrl : null) ||
        (isUniversalHttpVideoUrl(serverUrl) ? getWarmHttpBlobUrl(serverUrl) || serverUrl : null) ||
        (serverUrl && isExpressHost() && String(serverUrl).startsWith('/api/cms-video/') ? serverUrl : null);

      if (preferredPlayable) {
        setActiveHeroVideoUrl((prev) => (prev !== preferredPlayable ? preferredPlayable : prev));
        return;
      }

      if (serverUrl && String(serverUrl).startsWith('firestore-video://')) {
        loadVideoBlob('hero_background_video', fileName || settings.heroVideoFileName, serverUrl).then(
          (blobUrl) => {
            if (blobUrl) {
              setActiveHeroVideoUrl((prev) => (prev !== blobUrl ? blobUrl : prev));
            }
          }
        );
      }
    };

    window.addEventListener('gfk-video-updated', handleVideoUpdated);
    return () => {
      window.removeEventListener('gfk-video-updated', handleVideoUpdated);
    };
  }, [settings.heroVideoFileName]);

  // Keep video playing in continuous loop without stopping on re-renders
  useEffect(() => {
    const el = heroVideoRef.current;
    if (!el || !activeHeroVideoUrl) return;
    el.loop = true;
    el.muted = true;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    }
  }, [activeHeroVideoUrl]);

  // Reactively sync when Firestore settings update from any browser, Netlify, or Phone
  useEffect(() => {
    let isMounted = true;
    const incomingUrl = settings.heroVideoUrl || settings.featuredVideoEmbedUrl;
    const isUploadMode =
      settings.heroVideoSource === 'upload' || isUploadedVideoUrl(incomingUrl);

    if (isUploadMode) {
      ensureUploadedVideoSyncedToServer('hero_background_video', settings.heroVideoFileName);

      // 1. Universal Firebase Storage HTTPS URL -> check local Cache API for <10ms playback, else stream directly
      if (isUniversalHttpVideoUrl(incomingUrl)) {
        setActiveHeroVideoUrl((prev) => {
          if (prev && prev.startsWith('blob:') && getWarmHttpBlobUrl(incomingUrl) === prev) return prev;
          return prev !== incomingUrl! ? incomingUrl! : prev;
        });
        getCachedPlayableVideoUrl(incomingUrl!).then((resolved) => {
          if (!isMounted) return;
          if (resolved && resolved.startsWith('blob:')) {
            setActiveHeroVideoUrl((prev) => (prev !== resolved ? resolved : prev));
          } else {
            cacheHttpVideoInBackground(incomingUrl).catch(() => {});
          }
        });
        return () => {
          isMounted = false;
        };
      }

      // 2. Reconstruct from IndexedDB / Firestore chunks (`cms_video_chunks`) or AI Studio server
      loadVideoBlob('hero_background_video', settings.heroVideoFileName, incomingUrl).then((resolvedUrl) => {
        if (!isMounted || !resolvedUrl) return;
        if (!resolvedUrl.startsWith('firestore-video://')) {
          setActiveHeroVideoUrl((prev) => (prev !== resolvedUrl ? resolvedUrl : prev));
        }
      });

      return () => {
        isMounted = false;
      };
    }

    const targetUrl =
      incomingUrl && !incomingUrl.includes('viddler.com') && !incomingUrl.startsWith('firestore-video://')
        ? incomingUrl
        : DEFAULT_SCENIC_HERO_VIDEO;

    setActiveHeroVideoUrl((prev) => {
      const warm = getWarmHttpBlobUrl(targetUrl);
      const next = warm || targetUrl;
      return prev !== next ? next : prev;
    });
    getCachedPlayableVideoUrl(targetUrl).then((resolved) => {
      if (!isMounted) return;
      if (resolved && resolved.startsWith('blob:')) {
        setActiveHeroVideoUrl((prev) => (prev !== resolved ? resolved : prev));
      } else {
        cacheHttpVideoInBackground(targetUrl).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    settings.heroVideoUrl,
    settings.featuredVideoEmbedUrl,
    settings.heroVideoSource,
    settings.heroVideoFileName,
    (settings as any)._updatedAt
  ]);

  // Responsive viewport lock so only the active Mobile OR Desktop tree is mounted (guarantees unique DOM section IDs)
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(mq.matches);
    updateViewport();
    mq.addEventListener('change', updateViewport);
    return () => mq.removeEventListener('change', updateViewport);
  }, []);

  // Priority Malaysia Activities & Packages state
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedQuickCategory, setSelectedQuickCategory] = useState<string>('ALL');
  const [activeDesktopTab, setActiveDesktopTab] = useState<'all' | 'flights' | 'packages' | 'tickets' | 'hotels'>('all');

  const quickCategoryOptions: Array<{
    id: string;
    label: string;
    targetId: string;
    keywords: string[];
  }> = [
    { id: 'ALL', label: 'All Experiences', targetId: HOME_SECTIONS.packages, keywords: [] },
    {
      id: 'luxury',
      label: 'Luxury Escapes',
      targetId: HOME_SECTIONS.packages,
      keywords: ['luxury', '5-star', '5 star', 'resort', 'villa', 'yacht', 'ritz', 'four seasons', 'mandarin', 'shangri', 'private']
    },
    {
      id: 'family',
      label: 'Family Fun',
      targetId: HOME_SECTIONS.packages,
      keywords: ['family', 'theme park', 'lagoon', 'skyworlds', 'aquaria', 'zoo', 'genting', 'sunway', 'cameron']
    },
    {
      id: 'adventure',
      label: 'Adventure',
      targetId: HOME_SECTIONS.packages,
      keywords: ['adventure', 'kinabalu', 'island', 'semporna', 'mabul', 'skybridge', 'sabah', 'langkawi', 'caves', 'cable']
    },
    {
      id: 'transfers',
      label: 'Private Transfers',
      targetId: HOME_SECTIONS.packages,
      keywords: ['transfer', 'chauffeur', 'klia', 'private', 'van', 'mpv']
    },
    {
      id: 'attractions',
      label: 'Attraction Tickets',
      targetId: HOME_SECTIONS.tickets,
      keywords: ['ticket', 'pass', 'tower', 'sky', 'park', 'cable']
    },
    {
      id: 'hotels',
      label: 'Hotels & Resorts',
      targetId: HOME_SECTIONS.hotels,
      keywords: ['hotel', 'resort', '5-star', '4-star', 'suite']
    },
    {
      id: 'dining',
      label: 'Dining',
      targetId: HOME_SECTIONS.packages,
      keywords: ['dining', 'food', 'dinner', 'michelin', 'restaurant', 'cruise', 'penang']
    }
  ];

  const handleSelectQuickCategory = (catId: string) => {
    setSelectedQuickCategory(catId);
    const chosen = quickCategoryOptions.find((c) => c.id === catId);
    const targetSection = chosen?.targetId || HOME_SECTIONS.packages;
    if (catId === 'hotels') setActiveDesktopTab('hotels');
    else if (catId === 'attractions') setActiveDesktopTab('tickets');
    else setActiveDesktopTab('packages');
    requestAnimationFrame(() => {
      scrollToHomeSection(targetSection, false);
    });
  };

  const scrollToDesktopSection = (tabId: 'all' | 'flights' | 'packages' | 'tickets' | 'hotels', targetId: string) => {
    setActiveDesktopTab(tabId);
    requestAnimationFrame(() => {
      scrollToHomeSection(targetId, tabId === 'flights');
    });
  };

  useEffect(() => {
    const handleSectionFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ sectionId?: string }>).detail;
      const id = detail?.sectionId;
      if (
        id === HOME_SECTIONS.flights ||
        id === HOME_SECTIONS.packages ||
        id === HOME_SECTIONS.tickets ||
        id === HOME_SECTIONS.hotels
      ) {
        setActiveDesktopTab(id);
      }
    };
    window.addEventListener(HOME_SECTION_EVENT, handleSectionFocus);
    return () => window.removeEventListener(HOME_SECTION_EVENT, handleSectionFocus);
  }, []);

  useEffect(() => {
    if (isMobileViewport || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const sectionMap: Array<{ id: string; tab: 'flights' | 'packages' | 'tickets' | 'hotels' }> = [
      { id: HOME_SECTIONS.flights, tab: 'flights' },
      { id: HOME_SECTIONS.packages, tab: 'packages' },
      { id: HOME_SECTIONS.tickets, tab: 'tickets' },
      { id: HOME_SECTIONS.hotels, tab: 'hotels' }
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const match = sectionMap.find((item) => item.id === visible[0].target.id);
          if (match) {
            setActiveDesktopTab(match.tab);
          }
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.1, 0.3] }
    );

    sectionMap.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [isMobileViewport]);

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

  // Filter packages, tickets & hotels by selectedLocation + selectedQuickCategory
  const matchesLocation = (text?: string) => {
    if (selectedLocation === 'ALL') return true;
    if (!text) return false;
    return text.toLowerCase().includes(selectedLocation.toLowerCase());
  };

  const matchesQuickCategory = (haystack: string) => {
    if (selectedQuickCategory === 'ALL' || selectedQuickCategory === 'attractions' || selectedQuickCategory === 'hotels') {
      return true;
    }
    const activeCat = quickCategoryOptions.find((c) => c.id === selectedQuickCategory);
    if (!activeCat || activeCat.keywords.length === 0) return true;
    const lower = haystack.toLowerCase();
    return activeCat.keywords.some((kw) => lower.includes(kw));
  };

  const locationPackages = packages.filter(
    (p) => matchesLocation(p.destination) || matchesLocation(p.title)
  );
  const categoryMatchedPackages = locationPackages.filter((p) =>
    matchesQuickCategory(`${p.title} ${p.description} ${p.category} ${(p.tags || []).join(' ')} ${p.destination}`)
  );
  const filteredPackages = categoryMatchedPackages.length > 0 ? categoryMatchedPackages : locationPackages;

  const locationTickets = tickets.filter(
    (t) => matchesLocation(t.location) || matchesLocation(t.name)
  );
  const categoryMatchedTickets = locationTickets.filter((t) =>
    matchesQuickCategory(`${t.name} ${t.category || ''} ${t.location || ''} ${t.info || ''}`)
  );
  const filteredTickets = categoryMatchedTickets.length > 0 ? categoryMatchedTickets : locationTickets;

  // Filtered hotels for Direct Hotel Contracts section
  const baseHotels = hotels.filter((h) => {
    if (hotelCategoryFilter === 'ALL') return true;
    return h.cat === hotelCategoryFilter;
  });
  const categoryMatchedHotels = baseHotels.filter((h) =>
    matchesQuickCategory(`${h.name} ${h.cat} ${h.location || ''} ${h.instructions || ''}`)
  );
  const filteredHotels = categoryMatchedHotels.length > 0 ? categoryMatchedHotels : baseHotels;

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

  if (isMobileViewport) {
    return (
      <div className="flex flex-col w-full max-w-full overflow-x-clip">
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
          onSubmitFlightInquiry={onSubmitFlightInquiry}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-full overflow-x-clip">
      {/* =====================================================================
          DESKTOP B2C HOMEPAGE (Tablets & Desktop Viewports)
      ===================================================================== */}
      <div className="flex flex-col">
        {/* =====================================================================
            1. HERO SECTION WITH MALAYSIA VIDEO BACKGROUND (ADMIN-MANAGED)
        ===================================================================== */}
        <section className="relative mx-4 md:mx-8 mt-4 rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-xl">
        {/* Background Video & 0ms Instant Poster Backdrop */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-zinc-950">
          {heroPosterUrl && (
            <img
              src={heroPosterUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none select-none"
            />
          )}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {(() => {
              const src = activeHeroVideoUrl;
              if (!src) return null;
              const isDirectVideo = isDirectVideoSource(src);
              if (isDirectVideo) {
                return (
                  <video
                    ref={heroVideoRef}
                    key={src}
                    src={src}
                    poster={heroPosterUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    tabIndex={-1}
                    aria-hidden="true"
                    onContextMenu={(e) => e.preventDefault()}
                    onKeyDown={(e) => e.preventDefault()}
                    onLoadedData={() => setHeroVideoReady(true)}
                    onCanPlay={() => setHeroVideoReady(true)}
                    onEnded={(e) => {
                      const v = e.currentTarget;
                      v.currentTime = 0;
                      v.play().catch(() => {});
                    }}
                    onPause={(e) => {
                      const v = e.currentTarget;
                      if (!document.hidden && !v.ended) {
                        v.play().catch(() => {});
                      }
                    }}
                    onError={() => {
                      loadVideoBlob(
                        'hero_background_video',
                        settings.heroVideoFileName,
                        settings.heroVideoUrl
                      ).then((blobUrl) => {
                        if (blobUrl && blobUrl !== src && !blobUrl.startsWith('firestore-video://')) {
                          setActiveHeroVideoUrl(blobUrl);
                        } else if (src !== DEFAULT_SCENIC_HERO_VIDEO) {
                          setActiveHeroVideoUrl(DEFAULT_SCENIC_HERO_VIDEO);
                        }
                      });
                    }}
                    className={`w-full h-full object-cover scale-105 pointer-events-none select-none transition-opacity duration-300 ${
                      heroVideoReady ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  />
                );
              }
              return (
                <iframe
                  key={src}
                  src={src}
                  className="w-full h-full object-cover scale-105 pointer-events-none border-0"
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
                  scrollToHomeSection(HOME_SECTIONS.packages, false);
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

          {/* Quick Category Filter & Smooth Scroll Chips Beneath Search */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-amber-300 mr-1">
              Quick Category:
            </span>
            {quickCategoryOptions.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectQuickCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                  selectedQuickCategory === cat.id
                    ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-sm'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/25'
                }`}
              >
                {cat.label}
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full">
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-zinc-200/90">
          <div className="mb-5">
            <h2 className="text-lg sm:text-xl font-black text-zinc-950 tracking-tight">
              Our Services
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-0.5">
              Direct Malaysia travel services &amp; flight allotments
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* SERVICE 1: Day Out & Packages */}
            <button
              type="button"
              onClick={() => onNavigate('/search', { category: 'Packages' })}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-amber-400/80 rounded-xl p-3.5 text-left shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center gap-3 min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                <Palmtree className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-zinc-950 group-hover:text-amber-800 transition-colors leading-snug">
                  Day Out &amp; Packages
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  Langkawi, Sabah &amp; KL
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
            </button>

            {/* SERVICE 2: Hotels & Stays */}
            <button
              type="button"
              onClick={() => onNavigate('/hotels')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-emerald-500/80 rounded-xl p-3.5 text-left shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center gap-3 min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                <Building2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-zinc-950 group-hover:text-emerald-800 transition-colors leading-snug">
                  Hotels &amp; Stays
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  Resorts &amp; 5-Star Rooms
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
            </button>

            {/* SERVICE 3: Restaurants */}
            <button
              type="button"
              onClick={() => onNavigate('/search', { query: 'Dining' })}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-rose-400/80 rounded-xl p-3.5 text-left shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center gap-3 min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-zinc-950 group-hover:text-rose-800 transition-colors leading-snug">
                  Restaurants
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  Dining &amp; High-Tea
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-rose-700 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
            </button>

            {/* SERVICE 4: Sightseeing & Attractions */}
            <button
              type="button"
              onClick={() => onNavigate('/tickets')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-purple-400/80 rounded-xl p-3.5 text-left shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center gap-3 min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                <TicketIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-zinc-950 group-hover:text-purple-800 transition-colors leading-snug">
                  Sightseeing &amp; Attractions
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  Twin Towers &amp; Parks
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
            </button>

            {/* SERVICE 5: Transport Services */}
            <button
              type="button"
              onClick={() => onNavigate('/transport')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-blue-400/80 rounded-xl p-3.5 text-left shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center gap-3 min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                <Car className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-zinc-950 group-hover:text-blue-800 transition-colors leading-snug">
                  Transport Services
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  KLIA Cabs &amp; Chauffeurs
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
            </button>

            {/* SERVICE 6: Cruises */}
            <button
              type="button"
              onClick={() => onNavigate('/cruises')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-teal-400/80 rounded-xl p-3.5 text-left shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center gap-3 min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                <Waves className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-zinc-950 group-hover:text-teal-800 transition-colors leading-snug">
                  Cruises
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  Langkawi &amp; Yachts
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
            </button>

            {/* SERVICE 7: Available Flights */}
            <button
              type="button"
              onClick={() => onNavigate('/flights')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-sky-400/80 rounded-xl p-3.5 text-left shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center gap-3 min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                <Plane className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-zinc-950 group-hover:text-sky-800 transition-colors leading-snug">
                  Flights
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  Live Status &amp; Seats
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
            </button>

            {/* SERVICE 8: Marketplace Booking (Viator, TripAdvisor, GetYourGuide, Klook + Trending) */}
            <button
              type="button"
              onClick={() => onNavigate('/marketplaces')}
              className="group relative bg-zinc-50/80 hover:bg-white border border-zinc-200/80 hover:border-emerald-500/80 rounded-xl p-3.5 text-left shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex items-center gap-3 min-h-[80px]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                <Globe className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-zinc-950 group-hover:text-emerald-800 transition-colors leading-snug">
                  Marketplace Booking
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  Viator, TripAdvisor &amp; GYG
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          DESKTOP QUICK CATEGORY JUMP BAR (AUTO-SCROLLS TO SELECTED SECTION)
      ===================================================================== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/95 border border-zinc-200/90 rounded-2xl px-3 py-2 shadow-2xs">
          <div className="inline-flex flex-wrap items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200/80">
            {[
              { id: 'all', label: 'All Services', targetId: HOME_SECTIONS.flights },
              { id: 'flights', label: 'Flights', targetId: HOME_SECTIONS.flights },
              { id: 'packages', label: 'Packages', targetId: HOME_SECTIONS.packages },
              { id: 'tickets', label: 'Tickets', targetId: HOME_SECTIONS.tickets },
              { id: 'hotels', label: 'Hotels', targetId: HOME_SECTIONS.hotels }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToDesktopSection(tab.id as any, tab.targetId)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeDesktopTab === tab.id
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-white/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 pr-2">
            <Compass className="w-3.5 h-3.5 text-emerald-700" />
            Select a category to jump smoothly to its section
          </span>
        </div>
      </div>

      {/* =====================================================================
          UPPER VIEW FLIGHTS: UPCOMING FLIGHTS FIRST + SEARCH + FARE QUOTES
      ===================================================================== */}
      <FlightFinderSection
        sectionId={HOME_SECTIONS.flights}
        flights={settings.availableFlights || DEFAULT_AVAILABLE_FLIGHTS}
        variant="desktop-upper"
        flightsEmail={settings.flightsEmail || 'flights@gfkholidays.com'}
        bookingEmail={settings.bookingEmail || 'booking@gfkholidays.com'}
        onReserveFlight={(fl: AvailableFlight) =>
          onNavigate('/checkout', {
            product: {
              id: fl.id,
              title: `${fl.airline} ${fl.flightNumber} (${fl.originCode} → ${fl.destinationCode})`,
              name: `${fl.airline} ${fl.flightNumber}`,
              destination: fl.destinationCity,
              image: 'kl',
              base_price: fl.farePerPax,
              category: 'Flight',
              isFlight: true
            },
            pax: 1,
            date: fl.departureDate,
            timeSlot: `${fl.departureTime} – ${fl.arrivalTime}`,
            optionName: `${fl.cabinClass || 'Economy'} · ${fl.baggage || '20kg Baggage'}`,
            displayPrice: fl.farePerPax,
            total: fl.farePerPax,
            commission: 0
          })
        }
        onNavigate={onNavigate}
        onSubmitInquiry={onSubmitFlightInquiry}
      />

      {/* =====================================================================
          SYSTEMATIC TRANSITION BAND BETWEEN FLIGHT SEARCH & TRAVEL SERVICES
      ===================================================================== */}
      <div className="w-full bg-zinc-100 border-y border-zinc-200 my-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-700">
              Malaysia Direct Operator Catalog
            </p>
            <p className="text-sm sm:text-base font-bold text-zinc-900 mt-1">
              Explore curated Holiday Packages, Instant Attraction E-Tickets &amp; Contracted Hotels below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollToDesktopSection('packages', HOME_SECTIONS.packages)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 border border-zinc-200 hover:border-amber-300 text-xs font-bold text-zinc-800 transition-colors cursor-pointer"
            >
              Tour Packages
            </button>
            <button
              type="button"
              onClick={() => scrollToDesktopSection('tickets', HOME_SECTIONS.tickets)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-purple-50 border border-zinc-200 hover:border-purple-300 text-xs font-bold text-zinc-800 transition-colors cursor-pointer"
            >
              Attraction E-Tickets
            </button>
            <button
              type="button"
              onClick={() => scrollToDesktopSection('hotels', HOME_SECTIONS.hotels)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-300 text-xs font-bold text-zinc-800 transition-colors cursor-pointer"
            >
              Contracted Hotels
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          HOLIDAY TOUR PACKAGES SECTION
      ===================================================================== */}
      <section
        id={HOME_SECTIONS.packages}
        className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full"
      >
        {/* Differentiated Bold Landmark Heading */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-6 pb-4 border-b border-zinc-200 gap-6">
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700 mb-1">
              Holiday Tour Packages
            </p>
            <h2
              className="text-2xl sm:text-4xl font-black text-zinc-950 tracking-tight leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Curated Malaysia Holiday Packages
            </h2>
            <p className="text-zinc-600 text-sm mt-1.5 max-w-2xl">
              Book multi-day tours, hotel stays, and private airport transfers directly with our Malaysian ground desk.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/search', { category: 'Packages' })}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer self-start lg:self-auto shrink-0"
          >
            View All {packages.length} Packages <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Location + Quick Category Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

          {selectedQuickCategory !== 'ALL' && (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-950 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0">
              <span>
                Filtered: {quickCategoryOptions.find((c) => c.id === selectedQuickCategory)?.label}
              </span>
              <button
                type="button"
                onClick={() => setSelectedQuickCategory('ALL')}
                className="text-amber-800 hover:text-zinc-950 underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Private Transfers Spotlight when Private Transfers Quick Category is clicked */}
        {selectedQuickCategory === 'transfers' && transport.length > 0 && (
          <div className="mb-8 bg-blue-50/60 border border-blue-200 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-700" />
                  <span>Direct Private Chauffeur Transfers Across Malaysia</span>
                </h3>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Instant rate selection for Sedans, MPVs &amp; VIP Vans · Direct Website Checkout
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/transport')}
                className="text-xs font-bold text-blue-800 hover:text-blue-950 inline-flex items-center gap-1 cursor-pointer"
              >
                All {transport.length} Transfer Routes <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {transport.slice(0, 4).map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => onNavigate('/package', { id: tr.id })}
                  className="bg-white border border-zinc-200 hover:border-blue-500 rounded-xl p-4 cursor-pointer transition-colors flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      Private Transfer
                    </span>
                    <h4 className="text-sm font-extrabold text-zinc-950 mt-1 line-clamp-2">
                      {tr.name}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-sm font-black text-zinc-950 tabular-nums">
                      {formatPrice(Number(tr.car) || 0)}
                      <span className="text-[11px] font-normal text-zinc-500"> / car</span>
                    </span>
                    <span className="text-xs font-bold text-blue-700 inline-flex items-center">
                      Select <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPackages.slice(0, 4).map((pkg) => {
                const img = resolveImage(pkg.image, 'langkawi');
                const safeBase = Number(pkg.base_price) || 0;
                const commPct = Number(currentAgent?.commission) || 0;
                const displayPrice = currentAgent
                  ? Math.round(safeBase * (1 - commPct / 100))
                  : safeBase;
                const origPrice = Number(pkg.original_price) || Math.round(safeBase * 1.22);
                const savingsPct =
                  origPrice > 0
                    ? Math.max(5, Math.round(((origPrice - displayPrice) / origPrice) * 100))
                    : 5;

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
                        {pkg.trending && (
                          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 text-zinc-950 text-[11px] font-extrabold">
                            <Flame className="w-3 h-3 shrink-0" />
                            Trending
                          </span>
                        )}
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
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 tabular-nums">
                          <span className="font-bold text-amber-700">Tour Package</span>
                          <span aria-hidden="true">·</span>
                          <span>★ {pkg.rating || 4.9} ({pkg.reviews || 210})</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 font-bold">Save {savingsPct}%</span>
                        </div>

                        <h3 className="text-[15px] font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
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
                          {formatPrice(origPrice || 0)}
                        </span>
                        <div className="text-lg font-extrabold text-zinc-950 tabular-nums leading-none">
                          {formatPrice(displayPrice || 0)}
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
          </div>
      </section>

      {/* =====================================================================
          ATTRACTION E-TICKETS & PASSES SECTION
      ===================================================================== */}
      <section id={HOME_SECTIONS.tickets} className="scroll-mt-24 w-full bg-white border-y border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-zinc-200 gap-4">
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-purple-700 mb-1">
                Attraction Passes &amp; Gate E-Tickets
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-zinc-950 tracking-tight leading-tight">
                Instant Attraction E-Tickets
              </h2>
              <p className="text-zinc-600 text-sm mt-1.5">
                Direct turnstile barcode admission for Petronas Twin Towers, Genting SkyWorlds, Sunway Lagoon &amp; Langkawi SkyCab.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/tickets')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0"
            >
              View All {tickets.length} Passes <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTickets.slice(0, 4).map((tk) => {
              const img = resolveImage(tk.image, 'petronas');
              const safePrice = Number(tk.price) || 0;
              const commPct = Number(currentAgent?.commission) || 0;
              const displayPrice = currentAgent
                ? Math.round(safePrice * (1 - commPct / 100))
                : safePrice;
              const origPrice = Number(tk.originalPrice) || Math.round(safePrice * 1.25);

              return (
                <div
                  key={tk.id}
                  onClick={() => onNavigate('/package', { id: tk.id })}
                  className="bg-zinc-50/70 hover:bg-white rounded-2xl border border-zinc-200/90 overflow-hidden hover:border-purple-600/60 transition-all cursor-pointer group flex flex-col justify-between"
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
                      {tk.trending && (
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 text-zinc-950 text-[11px] font-extrabold">
                          <Flame className="w-3 h-3 shrink-0" />
                          Trending
                        </span>
                      )}
                      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white font-semibold">
                        <span className="flex items-center truncate">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-amber-400 shrink-0" />
                          <span className="truncate">{tk.location || 'Kuala Lumpur, Malaysia'}</span>
                        </span>
                        <span className="shrink-0 ml-2 text-emerald-300">Instant E-Ticket</span>
                      </div>
                    </div>

                    <div className="p-5 bg-white">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 tabular-nums">
                        <span className="font-bold text-purple-700">Attraction Pass</span>
                        <span aria-hidden="true">·</span>
                        <span>★ {tk.rating || 4.8} ({tk.reviews || 340})</span>
                      </div>

                      <h3 className="text-[15px] font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                        {tk.name}
                      </h3>

                      <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                        {tk.instructions || tk.info}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 bg-white border-t border-zinc-100 flex items-end justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-400 line-through block tabular-nums">
                        {formatPrice(origPrice || 0)}
                      </span>
                      <div className="text-lg font-extrabold text-zinc-950 tabular-nums leading-none">
                        {formatPrice(displayPrice || 0)}
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
          </div>
        </div>
      </section>

      {/* =====================================================================
          DIRECT CONTRACTED HOTELS & RESORTS SECTION
      ===================================================================== */}
      <section id={HOME_SECTIONS.hotels} className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 pb-4 border-b border-zinc-200 gap-6">
          <div className="border-l-4 border-emerald-600 pl-4">
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 mb-1">
              Contracted Hotels &amp; Stays
            </p>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-950 tracking-tight leading-tight">
              {settings.hotelContractsTitle ||
                'Direct Malaysia Hotel Contracts & Resorts'}
            </h2>
            <p className="text-zinc-600 text-sm mt-1.5 max-w-2xl">
              {settings.hotelContractsSubtitle ||
                'Pre-negotiated hotel allotments across Kuala Lumpur, Langkawi, Genting Highlands & Penang without intermediary markups.'}
            </p>
          </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredHotels.slice(0, 8).map((ht) => {
            const img = resolveImage(ht.image, 'hotel');
            const safePrice = Number(ht.price) || 0;
            const commPct = Number(currentAgent?.commission) || 0;
            const displayPrice = currentAgent
              ? Math.round(safePrice * (1 - commPct / 100))
              : safePrice;
            const origPrice = Number(ht.originalPrice) || Math.round(safePrice * 1.28);

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
                    {ht.trending && (
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 text-zinc-950 text-[11px] font-extrabold">
                        <Flame className="w-3 h-3 shrink-0" />
                        Trending
                      </span>
                    )}
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white font-semibold">
                      <span className="flex items-center truncate">
                        <Building className="w-3.5 h-3.5 mr-1 text-amber-400 shrink-0" />
                        <span className="truncate">{ht.location || 'Kuala Lumpur'}</span>
                      </span>
                      <span className="text-amber-300 shrink-0 ml-2">{ht.cat}</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 tabular-nums">
                      <span className="font-bold text-emerald-700">
                        {ht.contractBadge || 'Contract Hotel'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>★ {ht.rating || 4.7}</span>
                    </div>

                    <h3 className="text-[15px] font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
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
                      {formatPrice(origPrice)}
                    </span>
                    <div className="text-lg font-extrabold text-zinc-950 tabular-nums leading-none">
                      {formatPrice(displayPrice)}
                      <span className="text-xs font-normal text-zinc-500"> / night</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 inline-flex items-center whitespace-nowrap">
                    Book Stay <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-600 font-semibold">
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

          <button
            onClick={() => onNavigate('/hotels')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
          >
            View All {hotels.length} Direct Contracted Hotels <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* =====================================================================
          3. ICONIC MALAYSIA DESTINATIONS BENTO SPOTLIGHT
      ===================================================================== */}
      <section id={HOME_SECTIONS.destinations} className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-zinc-200 gap-4">
          <div className="border-l-4 border-emerald-600 pl-4">
            <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 mb-1">
              Destination Directory Across Peninsular &amp; East Malaysia
            </p>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-950 tracking-tight leading-tight">
              Explore Malaysia by Destination &amp; Starting Price
            </h2>
          </div>
          <button
            onClick={() => onNavigate('/search')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0"
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
                scrollToDesktopSection('packages', HOME_SECTIONS.packages);
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
                      Activities &amp; Packages from {formatPrice(dest.fromPrice)}
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
      <section id={HOME_SECTIONS.gallery} className="scroll-mt-24 bg-zinc-950 text-white py-20 my-12 border-y border-zinc-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-5 border-b border-zinc-800 gap-6">
            <div className="border-l-4 border-emerald-500 pl-4">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-1">
                Verified Guest Gallery · Photos &amp; Videos Across Malaysia
              </p>
              <h2
                className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight"
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
        <section id={HOME_SECTIONS.social} className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-zinc-200 gap-4">
            <div className="border-l-4 border-emerald-600 pl-4">
              <p className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 mb-1">
                Official Social Media Presence &amp; Daily Malaysia Dispatches
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-zinc-950 tracking-tight leading-tight">
                Follow GFK Holidays Malaysia Across Social Media
              </h2>
              <p className="text-zinc-600 text-sm sm:text-base mt-1.5 max-w-2xl">
                Join over 500,000+ Malaysia travel lovers for daily 4K island drone reels, street food trails, live weather updates, and flash package deals.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 shrink-0">
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

      {/* Hotel contracts moved seamlessly into sequential section 04 above */}


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

      {/* Right-to-Left Partner Preview Ticker */}
      <PartnerAllianceSection
        settings={settings}
        onNavigate={onNavigate}
        variant="desktop"
      />
      </div>
    </div>
  );
}
