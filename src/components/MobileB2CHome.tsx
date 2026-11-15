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
  Search,
  MapPin,
  Star,
  ArrowRight,
  Shield,
  Building2,
  Ticket,
  Car,
  ChevronRight,
  Clock,
  CheckCircle2,
  Tag,
  Percent,
  Palmtree,
  Waves,
  Award,
  Copy,
  Check,
  UtensilsCrossed,
  Compass,
  Calendar,
  Users,
  FileText,
  X,
  Info,
  QrCode,
  Plane,
  Camera,
  Play,
  Flame,
  ExternalLink,
  Globe
} from 'lucide-react';
import {
  Package,
  Ticket as TicketType,
  Hotel,
  TransportRoute,
  Agent,
  GlobalSettings,
  AvailableFlight,
  CustomerMediaItem,
  PackagePoster,
  FlightInquiry
} from '../types';
import {
  DEFAULT_AVAILABLE_FLIGHTS,
  DEFAULT_CUSTOMER_MEDIA,
  DEFAULT_PACKAGE_POSTERS
} from '../data';
import PartnerAllianceSection from './PartnerAllianceSection';
import FlightFinderSection from './FlightFinderSection';
import { useCurrencyRate } from '../lib/currency';

interface MobileB2CHomeProps {
  packages: Package[];
  tickets: TicketType[];
  hotels: Hotel[];
  transport: TransportRoute[];
  userRole: string;
  currentAgent: Agent | null;
  globalSettings: Partial<GlobalSettings>;
  imageMap: Record<string, string>;
  onNavigate: (path: string, params?: any) => void;
  onRequestLogin?: (role: 'customer' | 'agent') => void;
  onSubmitFlightInquiry?: (
    inquiry: Omit<FlightInquiry, 'id' | 'status' | 'createdAt' | 'targetEmail'>
  ) => Promise<FlightInquiry | null>;
}

export default function MobileB2CHome({
  packages,
  tickets,
  hotels,
  transport: _transport,
  userRole: _userRole,
  currentAgent: _currentAgent,
  globalSettings,
  imageMap,
  onNavigate,
  onRequestLogin: _onRequestLogin,
  onSubmitFlightInquiry
}: MobileB2CHomeProps) {
  const { formatPrice } = useCurrencyRate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'packages' | 'tickets' | 'hotels' | 'flights'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleSectionFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ sectionId?: string }>).detail;
      const id = detail?.sectionId;
      if (id === HOME_SECTIONS.flights || id === HOME_SECTIONS.packages || id === HOME_SECTIONS.tickets || id === HOME_SECTIONS.hotels) {
        setActiveTab(id);
      }
    };
    window.addEventListener(HOME_SECTION_EVENT, handleSectionFocus);
    return () => window.removeEventListener(HOME_SECTION_EVENT, handleSectionFocus);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const sectionIds: Array<'flights' | 'packages' | 'tickets' | 'hotels'> = [
      HOME_SECTIONS.flights,
      HOME_SECTIONS.packages,
      HOME_SECTIONS.tickets,
      HOME_SECTIONS.hotels
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const id = visible[0].target.id as 'flights' | 'packages' | 'tickets' | 'hotels';
          if (sectionIds.includes(id)) {
            setActiveTab(id);
          }
        }
      },
      { rootMargin: '-22% 0px -58% 0px', threshold: [0.1, 0.3] }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Quick Action Modals state (1-2 click instant checkout or details inspection)
  const [activeTicketModal, setActiveTicketModal] = useState<TicketType | null>(null);
  const [activeHotelModal, setActiveHotelModal] = useState<Hotel | null>(null);
  const [activePackageModal, setActivePackageModal] = useState<Package | null>(null);
  const [activeReviewLightbox, setActiveReviewLightbox] = useState<CustomerMediaItem | null>(null);

  // Ticket modal selections
  const [ticketSelectedCategoryIdx, setTicketSelectedCategoryIdx] = useState(0);
  const [ticketDate, setTicketDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [ticketSlot, setTicketSlot] = useState('10:00 AM');
  const [ticketPax, setTicketPax] = useState(2);
  const [ticketTab, setTicketTab] = useState<'options' | 'terms'>('options');

  // Hotel modal selections
  const [hotelSelectedRoomIdx, setHotelSelectedRoomIdx] = useState(0);
  const [hotelCheckIn, setHotelCheckIn] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [hotelNights, setHotelNights] = useState(2);
  const [hotelGuests, setHotelGuests] = useState(2);
  const [hotelTab, setHotelTab] = useState<'rooms' | 'terms'>('rooms');

  // Package modal selections
  const [packageDate, setPackageDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [packagePax, setPackagePax] = useState(2);
  const [packageTab, setPackageTab] = useState<'itinerary' | 'terms'>('itinerary');

  const isExpressHost = (): boolean =>
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('run.app') || window.location.hostname === 'localhost');

  const resolvePreferredMobileVideo = (): string => {
    const hasExplicitSource = Boolean(globalSettings.heroVideoSource);
    const isUploadMode =
      globalSettings.heroVideoSource === 'upload' ||
      isUploadedVideoUrl(globalSettings.heroVideoUrl) ||
      (!hasExplicitSource && getVideoSourceMode() === 'upload');

    if (isUploadMode) {
      const warmBlob = getWarmMemoryBlobUrl('hero_background_video', globalSettings.heroVideoFileName);
      if (warmBlob) return warmBlob;

      if (isUniversalHttpVideoUrl(globalSettings.heroVideoUrl)) {
        return getWarmHttpBlobUrl(globalSettings.heroVideoUrl) || globalSettings.heroVideoUrl!;
      }
      if (
        globalSettings.heroVideoUrl &&
        isExpressHost() &&
        globalSettings.heroVideoUrl.startsWith('/api/cms-video/')
      ) {
        return globalSettings.heroVideoUrl;
      }
      const serverUpload = getUploadedServerVideoUrl();
      if (
        serverUpload &&
        (isUniversalHttpVideoUrl(serverUpload) ||
          (isExpressHost() && serverUpload.startsWith('/api/cms-video/')))
      ) {
        return getWarmHttpBlobUrl(serverUpload) || serverUpload;
      }
      return '';
    }

    const rawUrl = globalSettings.heroVideoUrl || globalSettings.featuredVideoEmbedUrl;
    if (rawUrl && !rawUrl.includes('viddler.com') && !rawUrl.startsWith('firestore-video://')) {
      return getWarmHttpBlobUrl(rawUrl) || rawUrl;
    }
    return getWarmHttpBlobUrl(DEFAULT_SCENIC_HERO_VIDEO) || DEFAULT_SCENIC_HERO_VIDEO;
  };

  const [activeFeaturedVideo, setActiveFeaturedVideo] = useState<string>(resolvePreferredMobileVideo);
  const [mobileVideoReady, setMobileVideoReady] = useState<boolean>(false);
  const mobilePosterUrl =
    globalSettings.heroFallbackImage || getHeroPosterCache() || imageMap.kl;

  useEffect(() => {
    setMobileVideoReady(false);
  }, [activeFeaturedVideo]);

  useEffect(() => {
    const handleVideoUpdated = (event: any) => {
      const { videoUrl, serverUrl, fileName } = event.detail || {};
      const preferredPlayable =
        (videoUrl && !String(videoUrl).startsWith('firestore-video://') ? videoUrl : null) ||
        (isUniversalHttpVideoUrl(serverUrl) ? getWarmHttpBlobUrl(serverUrl) || serverUrl : null) ||
        (serverUrl && isExpressHost() && String(serverUrl).startsWith('/api/cms-video/')
          ? serverUrl
          : null);

      if (preferredPlayable) {
        setActiveFeaturedVideo((prev) => (prev !== preferredPlayable ? preferredPlayable : prev));
        return;
      }

      if (serverUrl && String(serverUrl).startsWith('firestore-video://')) {
        loadVideoBlob(
          'hero_background_video',
          fileName || globalSettings.heroVideoFileName,
          serverUrl
        ).then((blobUrl) => {
          if (blobUrl) {
            setActiveFeaturedVideo((prev) => (prev !== blobUrl ? blobUrl : prev));
          }
        });
      }
    };

    window.addEventListener('gfk-video-updated', handleVideoUpdated);
    return () => {
      window.removeEventListener('gfk-video-updated', handleVideoUpdated);
    };
  }, [globalSettings.heroVideoFileName]);

  useEffect(() => {
    const el = mobileVideoRef.current;
    if (!el || !activeFeaturedVideo) return;
    el.loop = true;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    }
  }, [activeFeaturedVideo]);

  useEffect(() => {
    let isMounted = true;
    const incomingUrl = globalSettings.heroVideoUrl || globalSettings.featuredVideoEmbedUrl;
    const isUploadMode =
      globalSettings.heroVideoSource === 'upload' || isUploadedVideoUrl(incomingUrl);

    if (isUploadMode) {
      ensureUploadedVideoSyncedToServer('hero_background_video', globalSettings.heroVideoFileName);

      if (isUniversalHttpVideoUrl(incomingUrl)) {
        setActiveFeaturedVideo((prev) => {
          if (prev && prev.startsWith('blob:') && getWarmHttpBlobUrl(incomingUrl) === prev) return prev;
          return prev !== incomingUrl! ? incomingUrl! : prev;
        });
        getCachedPlayableVideoUrl(incomingUrl!).then((resolved) => {
          if (!isMounted) return;
          if (resolved && resolved.startsWith('blob:')) {
            setActiveFeaturedVideo((prev) => (prev !== resolved ? resolved : prev));
          } else {
            cacheHttpVideoInBackground(incomingUrl).catch(() => {});
          }
        });
        return () => {
          isMounted = false;
        };
      }

      loadVideoBlob(
        'hero_background_video',
        globalSettings.heroVideoFileName,
        incomingUrl
      ).then((resolvedUrl) => {
        if (!isMounted || !resolvedUrl) return;
        if (!resolvedUrl.startsWith('firestore-video://')) {
          setActiveFeaturedVideo((prev) => (prev !== resolvedUrl ? resolvedUrl : prev));
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

    setActiveFeaturedVideo((prev) => {
      const warm = getWarmHttpBlobUrl(targetUrl);
      const next = warm || targetUrl;
      return prev !== next ? next : prev;
    });
    getCachedPlayableVideoUrl(targetUrl).then((resolved) => {
      if (!isMounted) return;
      if (resolved && resolved.startsWith('blob:')) {
        setActiveFeaturedVideo((prev) => (prev !== resolved ? resolved : prev));
      } else {
        cacheHttpVideoInBackground(targetUrl).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    globalSettings.heroVideoUrl,
    globalSettings.featuredVideoEmbedUrl,
    globalSettings.heroVideoSource,
    globalSettings.heroVideoFileName,
    (globalSettings as any)._updatedAt
  ]);

  const resolveImage = (keyOrUrl?: string, fallbackKey = 'kl') => {
    if (!keyOrUrl) return imageMap[fallbackKey] || imageMap.kl;
    if (keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/') || keyOrUrl.startsWith('data:')) {
      return keyOrUrl;
    }
    return imageMap[keyOrUrl] || imageMap[fallbackKey] || imageMap.kl;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const banners = [
    {
      id: 'b1',
      title: 'BIG MALAYSIA TRAVEL FESTIVAL',
      subtitle: 'Flat 15% OFF on Packages, Stays & Island Escapes',
      badge: 'LIMITED TIME DEAL',
      promoCode: 'MYTRULYASIA',
      bgGradient: 'from-amber-600 via-orange-600 to-rose-600',
      actionPath: '/search',
      actionLabel: 'Explore Offers',
      bankPartners: ['Maybank', 'CIMB Bank', 'Touch \'n Go', 'GrabPay']
    },
    {
      id: 'b2',
      title: 'DIRECT 5-STAR HOTEL CONTRACTS',
      subtitle: 'Save up to 40% vs Public OTAs on KL, Langkawi & Penang',
      badge: 'CONTRACT RATES',
      promoCode: 'DIRECTHOTEL',
      bgGradient: 'from-emerald-700 via-teal-800 to-cyan-900',
      actionPath: '/hotels',
      actionLabel: 'Browse Hotels',
      bankPartners: ['Shangri-La', 'Grand Hyatt', 'Four Seasons', 'Lexis']
    },
    {
      id: 'b3',
      title: 'INSTANT ATTRACTION E-TICKETS',
      subtitle: 'Skip-The-Line Gate QR Passes with Instant Delivery',
      badge: 'OFFICIAL PASSES',
      promoCode: 'INSTANTQR',
      bgGradient: 'from-blue-600 via-indigo-700 to-purple-800',
      actionPath: '/tickets',
      actionLabel: 'Get E-Tickets',
      bankPartners: ['Petronas KLCC', 'Sunway Lagoon', 'Genting SkyWorlds']
    }
  ];

  const quickLocations = [
    { id: 'ALL', label: 'All Malaysia' },
    { id: 'Kuala Lumpur', label: 'Kuala Lumpur' },
    { id: 'Langkawi', label: 'Langkawi' },
    { id: 'Penang', label: 'Penang' },
    { id: 'Genting', label: 'Genting' },
    { id: 'Sabah', label: 'Sabah & Borneo' },
    { id: 'Cameron', label: 'Cameron' }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('/search', { query: searchQuery });
  };

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

  const filteredHotels = hotels.filter(
    (h) => matchesLocation(h.location) || matchesLocation(h.name)
  );

  // Fast 1-Click Ticket Booking Dispatcher
  const handleInstantBookTicket = () => {
    if (!activeTicketModal) return;
    const cats = activeTicketModal.ticketCategories || [];
    const chosenCat = cats[ticketSelectedCategoryIdx] || {
      name: 'Standard Admission Pass',
      price: activeTicketModal.price
    };
    const unitPrice = chosenCat.price || activeTicketModal.price;
    const total = unitPrice * ticketPax;

    onNavigate('/checkout', {
      product: activeTicketModal,
      pax: ticketPax,
      date: ticketDate,
      timeSlot: ticketSlot,
      optionName: chosenCat.name,
      displayPrice: unitPrice,
      total,
      commission: 0
    });
    setActiveTicketModal(null);
  };

  // Fast 1-Click Hotel Booking Dispatcher
  const handleInstantBookHotel = () => {
    if (!activeHotelModal) return;
    const rooms = activeHotelModal.roomCategories || [];
    const chosenRoom = rooms[hotelSelectedRoomIdx] || {
      name: 'Standard Room',
      price: activeHotelModal.price,
      pax: 2
    };
    const ratePerNight = chosenRoom.price || activeHotelModal.price;
    const total = ratePerNight * hotelNights;

    onNavigate('/checkout', {
      product: activeHotelModal,
      pax: hotelGuests,
      date: hotelCheckIn,
      timeSlot: `${hotelNights} Night(s) Stay`,
      optionName: `${chosenRoom.name} (${hotelNights} Nights)`,
      displayPrice: ratePerNight,
      total,
      commission: 0
    });
    setActiveHotelModal(null);
  };

  // Fast 1-Click Package Booking Dispatcher
  const handleInstantBookPackage = () => {
    if (!activePackageModal) return;
    const unitPrice = activePackageModal.base_price;
    const total = unitPrice * packagePax;

    onNavigate('/checkout', {
      product: activePackageModal,
      pax: packagePax,
      date: packageDate,
      timeSlot: 'Morning Departure',
      optionName: `${activePackageModal.duration_days}D/${activePackageModal.duration_days - 1}N Tour Package`,
      displayPrice: unitPrice,
      total,
      commission: 0
    });
    setActivePackageModal(null);
  };

  // GFK Fixed-Allotment Flight Seat Request / Booking Dispatcher (payments go to booking@gfkholidays.com)
  const handleBookAvailableFlight = (flight: AvailableFlight) => {
    onNavigate('/checkout', {
      product: {
        id: flight.id,
        title: `${flight.airline} ${flight.flightNumber} (${flight.originCode} → ${flight.destinationCode})`,
        name: `${flight.airline} ${flight.flightNumber}`,
        destination: flight.destinationCity,
        image: 'kl',
        base_price: flight.farePerPax,
        category: 'Flight',
        isFlight: true
      },
      pax: 1,
      date: flight.departureDate,
      timeSlot: `${flight.departureTime} – ${flight.arrivalTime}`,
      optionName: `${flight.cabinClass || 'Economy'} · ${flight.baggage || '20kg Baggage'}`,
      displayPrice: flight.farePerPax,
      total: flight.farePerPax,
      commission: 0
    });
  };

  const availableFlightsList: AvailableFlight[] =
    Array.isArray(globalSettings.availableFlights) && globalSettings.availableFlights.length > 0
      ? globalSettings.availableFlights
      : DEFAULT_AVAILABLE_FLIGHTS;

  const packagePostersList: PackagePoster[] =
    Array.isArray(globalSettings.packagePosters) && globalSettings.packagePosters.length > 0
      ? globalSettings.packagePosters
      : DEFAULT_PACKAGE_POSTERS;

  const customerMediaList: CustomerMediaItem[] =
    Array.isArray(globalSettings.customerMedia) && globalSettings.customerMedia.length > 0
      ? globalSettings.customerMedia
      : DEFAULT_CUSTOMER_MEDIA;

  const getFlightStatusClass = (status: AvailableFlight['status']) => {
    switch (status) {
      case 'ON TIME':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'BOARDING':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'LIMITED SEATS':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DELAYED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'DEPARTED':
        return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="flex flex-col w-full max-w-full overflow-x-clip bg-zinc-50 pb-20 text-zinc-900 font-sans">
      {/* 1. TOP ANNOUNCEMENT RIBBON - Displayed only if voucherDisplayMode is 'both' */}
      {globalSettings.voucherDisplayMode === 'both' && (
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-3 py-1 flex items-center justify-between text-xs font-semibold shadow-xs z-20">
          <div className="flex items-center gap-1.5 truncate">
            <Percent className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate text-[11px]">
              🇲🇾 <strong>100% Malaysia Only</strong> · Promo Code <strong className="text-amber-300 font-mono tracking-wider">MYTRULYASIA</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopyCode('MYTRULYASIA')}
            className="text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-md shrink-0 ml-1.5 cursor-pointer flex items-center gap-1"
          >
            {copiedCode === 'MYTRULYASIA' ? (
              <>
                <Check className="w-3 h-3 text-amber-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* =====================================================================
          2. FULL-BLEED BACKGROUND VIDEO HERO WITH EXPLORE TRAVEL SERVICES OVERLAY
          (iPhone svh-fitted so full video + 8 service cards fit cleanly on screen)
      ===================================================================== */}
      <section
        id="mobile-hero-section"
        data-aistudio-editable="true"
        className="relative w-full min-h-[calc(100svh-134px-env(safe-area-inset-bottom,0px))] flex flex-col justify-between overflow-hidden bg-zinc-950 text-white"
      >
        {/* Full-Bleed Looping Video Backdrop + 0ms Poster Frame */}
        <div
          className="absolute inset-0 overflow-hidden bg-zinc-950 pointer-events-none select-none"
          style={{ userSelect: 'none' }}
        >
          {mobilePosterUrl && (
            <img
              src={mobilePosterUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none select-none"
            />
          )}
          {(() => {
            const src = activeFeaturedVideo;
            if (!src) return null;
            const isDirectVideo = isDirectVideoSource(src);
            if (isDirectVideo) {
              return (
                <video
                  ref={mobileVideoRef}
                  key={src}
                  src={src}
                  poster={mobilePosterUrl}
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
                  onLoadedData={() => setMobileVideoReady(true)}
                  onCanPlay={() => setMobileVideoReady(true)}
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
                      globalSettings.heroVideoFileName,
                      globalSettings.heroVideoUrl
                    ).then((blobUrl) => {
                      if (blobUrl && blobUrl !== src && !blobUrl.startsWith('firestore-video://')) {
                        setActiveFeaturedVideo(blobUrl);
                      } else if (src !== DEFAULT_SCENIC_HERO_VIDEO) {
                        setActiveFeaturedVideo(DEFAULT_SCENIC_HERO_VIDEO);
                      }
                    });
                  }}
                  className={`absolute inset-0 w-full h-full object-cover scale-105 brightness-105 pointer-events-none select-none transition-opacity duration-300 ${
                    mobileVideoReady ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              );
            }
            return (
              <iframe
                key={src}
                src={src}
                className="w-full h-full object-cover scale-105 pointer-events-none border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
                title="Featured Malaysia Experience Video"
              />
            );
          })()}

          {/* Subtle Admin Backdrop Tint & Light Contrast Scrim (preserves video brightness on mobile) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: globalSettings.heroBgColor || '#091e1a',
              opacity: Math.max(0.08, Math.min(0.3, ((globalSettings.heroOverlayOpacity ?? 60) / 100) * 0.38))
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/35 via-zinc-950/10 to-zinc-950/45 pointer-events-none" />
        </div>

        {/* Foreground Content Over Background Video (Balanced top-to-bottom iPhone fit) */}
        <div className="relative z-20 flex-1 flex flex-col justify-between px-3.5 pt-3.5 pb-4 gap-3">
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] font-bold text-emerald-300 tracking-wide uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                {globalSettings.heroBadgeText || 'Licensed Malaysia Destination Operator'}
              </p>
              <h1 className="text-white text-[19px] sm:text-xl font-extrabold tracking-tight leading-[1.14] mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
                <span className="font-serif italic font-semibold text-amber-300 block">
                  {globalSettings.heroTitleLine1 || 'Experience Truly Asia:'}
                </span>
                {globalSettings.heroTitleLine2 || "Malaysia's Finest Tours, Activities & Stays."}
              </h1>
            </div>

            {/* Search Input (Excludes Flight Fares — packages, hotels & attractions only) */}
            <div id="mobile-search-section" data-aistudio-editable="true" className="space-y-1.5">
              <form
                onSubmit={handleSearchSubmit}
                className="bg-white rounded-xl p-1 shadow-lg border border-white/30 flex items-center gap-1.5"
              >
                <div className="flex-1 flex items-center gap-2 px-2 py-0.5">
                  <Search className="w-4 h-4 text-emerald-700 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tours, hotels, attraction tickets..."
                    className="w-full text-xs font-semibold text-zinc-900 bg-transparent focus:outline-none placeholder-zinc-400"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  Explore
                </button>
              </form>

              <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 no-scrollbar">
                {quickLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setSelectedLocation(loc.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition-colors cursor-pointer whitespace-nowrap border ${
                      selectedLocation === loc.id
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                        : 'bg-zinc-950/45 text-white border-white/25 hover:bg-zinc-900/60 backdrop-blur-md'
                    }`}
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* EXPLORE TRAVEL SERVICES IN FRONT OF BACKGROUND VIDEO */}
          <div id="mobile-services-grid" data-aistudio-editable="true" className="pt-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-[10.5px] font-extrabold uppercase tracking-wider text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Explore Travel Services
              </h2>
              <span className="text-[10px] font-bold text-amber-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Direct Operator Rates
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onNavigate('/search', { category: 'Packages' })}
                className="bg-zinc-950/45 hover:bg-zinc-900/60 backdrop-blur-md border border-white/25 hover:border-amber-400/70 rounded-xl p-2 text-left transition-all cursor-pointer flex items-center gap-2 min-h-[50px]"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                  <Palmtree className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-extrabold text-white truncate leading-tight">
                    Holiday Packages
                  </h3>
                  <p className="text-[10px] text-zinc-200 truncate mt-0.5">
                    Guided tours &amp; stays
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/hotels')}
                className="bg-zinc-950/45 hover:bg-zinc-900/60 backdrop-blur-md border border-white/25 hover:border-emerald-400/70 rounded-xl p-2 text-left transition-all cursor-pointer flex items-center gap-2 min-h-[50px]"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-extrabold text-white truncate leading-tight">
                    Hotels &amp; Resorts
                  </h3>
                  <p className="text-[10px] text-zinc-200 truncate mt-0.5">
                    Contracted room rates
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/tickets')}
                className="bg-zinc-950/45 hover:bg-zinc-900/60 backdrop-blur-md border border-white/25 hover:border-purple-400/70 rounded-xl p-2 text-left transition-all cursor-pointer flex items-center gap-2 min-h-[50px]"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-extrabold text-white truncate leading-tight">
                    Attraction Tickets
                  </h3>
                  <p className="text-[10px] text-zinc-200 truncate mt-0.5">
                    Instant gate QR passes
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/flights')}
                className="bg-zinc-950/45 hover:bg-zinc-900/60 backdrop-blur-md border border-white/25 hover:border-sky-400/70 rounded-xl p-2 text-left transition-all cursor-pointer flex items-center gap-2 min-h-[50px]"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <Plane className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-extrabold text-white truncate leading-tight">
                    Flights
                  </h3>
                  <p className="text-[10px] text-sky-200 truncate mt-0.5">
                    GFK available &amp; status
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/transport')}
                className="bg-zinc-950/45 hover:bg-zinc-900/60 backdrop-blur-md border border-white/25 hover:border-blue-400/70 rounded-xl p-2 text-left transition-all cursor-pointer flex items-center gap-2 min-h-[50px]"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Car className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-extrabold text-white truncate leading-tight">
                    Private Transfers
                  </h3>
                  <p className="text-[10px] text-zinc-200 truncate mt-0.5">
                    KLIA cabs &amp; chauffeurs
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/restaurants')}
                className="bg-zinc-950/45 hover:bg-zinc-900/60 backdrop-blur-md border border-white/25 hover:border-rose-400/70 rounded-xl p-2 text-left transition-all cursor-pointer flex items-center gap-2 min-h-[50px]"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-extrabold text-white truncate leading-tight">
                    Dining &amp; Cruises
                  </h3>
                  <p className="text-[10px] text-zinc-200 truncate mt-0.5">
                    Food trails &amp; yachts
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/cruises')}
                className="bg-zinc-950/45 hover:bg-zinc-900/60 backdrop-blur-md border border-white/25 hover:border-teal-400/70 rounded-xl p-2 text-left transition-all cursor-pointer flex items-center gap-2 min-h-[50px] min-w-0"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Waves className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-extrabold text-white truncate leading-tight">
                    Cruises &amp; Yachts
                  </h3>
                  <p className="text-[10px] text-zinc-200 truncate mt-0.5">
                    Langkawi sunset sails
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/marketplaces')}
                className="bg-emerald-950/75 hover:bg-emerald-900/85 backdrop-blur-md border border-emerald-400/45 hover:border-amber-400/80 rounded-xl p-2 text-left transition-all cursor-pointer flex items-center gap-2 min-h-[50px] min-w-0"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h3 className="text-xs font-extrabold text-white truncate leading-tight">
                      Marketplaces
                    </h3>
                    <span className="px-1 py-0.5 rounded bg-amber-400 text-zinc-950 text-[8px] font-black uppercase leading-none shrink-0">
                      Hot
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200 truncate mt-0.5">
                    Viator · GYG · TripAdvisor
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. QUICK CATEGORY JUMP BAR (AUTO-SCROLLS TO SELECTED SECTION)
      ===================================================================== */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-3.5 py-2.5">
        <div className="grid grid-cols-5 gap-1 bg-zinc-200/75 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All', targetId: HOME_SECTIONS.flights },
            { id: 'flights', label: 'Flights', targetId: HOME_SECTIONS.flights },
            { id: 'packages', label: 'Packages', targetId: HOME_SECTIONS.packages },
            { id: 'tickets', label: 'Tickets', targetId: HOME_SECTIONS.tickets },
            { id: 'hotels', label: 'Hotels', targetId: HOME_SECTIONS.hotels }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id as any);
                requestAnimationFrame(() => {
                  scrollToHomeSection(t.targetId, t.id === 'flights');
                });
              }}
              className={`py-2 px-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === t.id ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          UPPER VIEW: FLIGHTS SEARCH FIRST + FARE QUOTE REQUEST
      ===================================================================== */}
      <FlightFinderSection
        sectionId={HOME_SECTIONS.flights}
        flights={availableFlightsList}
        variant="mobile-upper"
        flightsEmail={globalSettings.flightsEmail || 'flights@gfkholidays.com'}
        bookingEmail={globalSettings.bookingEmail || 'booking@gfkholidays.com'}
        onReserveFlight={handleBookAvailableFlight}
        onNavigate={onNavigate}
        onSubmitInquiry={onSubmitFlightInquiry}
      />

      {/* 5. GENEROUS SCROLL BREATHING BAND & OPTIONAL PROMO BANNER */}
      <section className="px-3.5 py-6 bg-zinc-50 border-b border-zinc-200 space-y-4">
        <div className="bg-white border border-zinc-200/90 rounded-2xl px-3.5 py-3 text-[11px] font-bold text-zinc-700 flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>30s Gate QR</span>
          </span>
          <span className="text-zinc-300">·</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Direct Allotments</span>
          </span>
          <span className="text-zinc-300">·</span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Licensed DMC</span>
          </span>
        </div>

        {globalSettings.voucherDisplayMode === 'both' && (
          <div className="relative rounded-2xl overflow-hidden shadow-sm">
            {banners.map((b, idx) => {
              if (idx !== activeBannerIdx) return null;
              return (
                <div
                  key={b.id}
                  className={`bg-gradient-to-br ${b.bgGradient} p-4 text-white relative transition-all duration-300`}
                >
                  <div className="flex items-center justify-between mb-1 text-[10px] font-bold text-white/90">
                    <span>{b.badge}</span>
                    <span className="tabular-nums">
                      {idx + 1} / {banners.length}
                    </span>
                  </div>

                  <h3 className="text-sm font-black tracking-tight leading-tight text-white mb-0.5">
                    {b.title}
                  </h3>
                  <p className="text-[11px] text-white/95 font-medium leading-snug mb-2">
                    {b.subtitle}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/20">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-200">
                      <Tag className="w-3 h-3" />
                      <span>
                        Code:{' '}
                        <button
                          type="button"
                          onClick={() => handleCopyCode(b.promoCode)}
                          className="font-mono underline text-white cursor-pointer"
                        >
                          {b.promoCode}
                        </button>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(b.actionPath)}
                      className="bg-white text-zinc-950 font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>{b.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION A: HOLIDAYS & TOUR PACKAGES
      ===================================================================== */}
      <section id={HOME_SECTIONS.packages} data-aistudio-editable="true" className="scroll-mt-16 pt-8 pb-8 bg-white border-b border-zinc-200">
        <div className="px-3.5 mb-5 pb-3.5 border-b border-zinc-200 flex items-end justify-between gap-2">
          <div className="border-l-4 border-amber-500 pl-3 min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700">
              Holiday Packages
            </p>
            <h2 className="text-xl font-black text-zinc-950 tracking-tight leading-tight mt-0.5">
              Holiday Tour Packages
            </h2>
            <p className="text-[11px] font-medium text-zinc-500 mt-0.5 truncate">
              Guided itineraries &amp; transfers included
            </p>
          </div>
            <button
              type="button"
              onClick={() => onNavigate('/search', { category: 'Packages' })}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer shrink-0 py-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-3.5 pb-1 no-scrollbar">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="w-[242px] shrink-0 snap-start bg-zinc-50/70 hover:bg-white border border-zinc-200 hover:border-emerald-600 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors shadow-2xs"
              >
                <div
                  className="relative h-32 bg-zinc-100 cursor-pointer"
                  onClick={() => setActivePackageModal(pkg)}
                >
                  <img
                    src={resolveImage(pkg.image, 'langkawi')}
                    alt={pkg.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  {pkg.trending && (
                    <div className="absolute top-2 left-2 bg-amber-400 text-zinc-950 text-[9.5px] font-extrabold px-2 py-0.5 rounded-md inline-flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 shrink-0" />
                      Trending
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-zinc-950/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums">
                    {pkg.duration_days}D/{pkg.duration_days - 1}N
                  </div>
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-white font-semibold">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{pkg.destination}</span>
                    </span>
                    <span className="flex items-center gap-0.5 text-amber-300 shrink-0 ml-1 tabular-nums">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {pkg.rating || 4.9}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5">
                      Tour Package · {pkg.duration_days} Days
                    </span>
                    <h4
                      onClick={() => setActivePackageModal(pkg)}
                      className="text-xs font-bold text-zinc-900 leading-snug line-clamp-2 hover:text-emerald-700 cursor-pointer"
                    >
                      {pkg.title}
                    </h4>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <div className="tabular-nums">
                      <span className="text-[10px] text-zinc-400 block line-through leading-none">
                        {formatPrice(Number(pkg.original_price) || Math.round((Number(pkg.base_price) || 0) * 1.25))}
                      </span>
                      <div className="text-sm font-extrabold text-zinc-950 leading-tight mt-0.5">
                        {formatPrice(Number(pkg.base_price) || 0)}
                        <span className="text-[10px] font-normal text-zinc-500"> /pax</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePackageModal(pkg)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      {/* =====================================================================
          SECTION B: ATTRACTION TICKETS & PASSES
      ===================================================================== */}
      <section id={HOME_SECTIONS.tickets} data-aistudio-editable="true" className="scroll-mt-16 px-3.5 pt-8 pb-8 bg-zinc-50 border-b border-zinc-200">
        <div className="mb-5 pb-3.5 border-b border-zinc-200 flex items-end justify-between gap-2">
          <div className="border-l-4 border-purple-600 pl-3 min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-700">
              Attraction Passes
            </p>
            <h2 className="text-xl font-black text-zinc-950 tracking-tight leading-tight mt-0.5">
              Attraction E-Tickets
            </h2>
            <p className="text-[11px] font-medium text-zinc-500 mt-0.5 truncate">
              Instant turnstile QR entry across Malaysia
            </p>
          </div>
            <button
              type="button"
              onClick={() => onNavigate('/tickets')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer shrink-0 py-1"
            >
              <span>All Passes</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {filteredTickets.slice(0, 6).map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white border border-zinc-200 hover:border-purple-500 rounded-2xl overflow-hidden flex flex-col justify-between transition-colors shadow-2xs"
              >
                <div
                  className="relative h-24 bg-zinc-100 cursor-pointer"
                  onClick={() => {
                    setActiveTicketModal(ticket);
                    setTicketSelectedCategoryIdx(0);
                  }}
                >
                  <img
                    src={resolveImage(ticket.image, 'petronas')}
                    alt={ticket.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  {ticket.trending && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-400 text-zinc-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 shrink-0" />
                      Trending
                    </span>
                  )}
                  <span className="absolute bottom-1.5 left-2 right-2 text-white text-[10px] font-semibold truncate">
                    {ticket.location || 'Malaysia'}
                  </span>
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 block mb-0.5">
                      Gate E-Ticket
                    </span>
                    <h4
                      onClick={() => {
                        setActiveTicketModal(ticket);
                        setTicketSelectedCategoryIdx(0);
                      }}
                      className="text-xs font-bold text-zinc-900 line-clamp-2 leading-snug hover:text-emerald-700 cursor-pointer"
                    >
                      {ticket.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100">
                    <div className="tabular-nums">
                      <span className="text-[9px] text-zinc-400 block leading-none">From</span>
                      <span className="text-xs font-extrabold text-zinc-950">
                        {formatPrice(Number(ticket.ticketCategories?.[0]?.price ?? ticket.price) || 0)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTicketModal(ticket);
                        setTicketSelectedCategoryIdx(0);
                      }}
                      className="bg-zinc-900 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      {/* =====================================================================
          SECTION C: DIRECT CONTRACTED HOTELS & RESORTS
      ===================================================================== */}
      <section id={HOME_SECTIONS.hotels} data-aistudio-editable="true" className="scroll-mt-16 px-3.5 pt-8 pb-8 bg-white border-b border-zinc-200">
        <div className="mb-5 pb-3.5 border-b border-zinc-200 flex items-end justify-between gap-2">
          <div className="border-l-4 border-emerald-600 pl-3 min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-700">
              Hotels &amp; Stays
            </p>
            <h2 className="text-xl font-black text-zinc-950 tracking-tight leading-tight mt-0.5">
              Contracted Hotels &amp; Resorts
            </h2>
            <p className="text-[11px] font-medium text-zinc-500 mt-0.5 truncate">
              Guaranteed local room allotments
            </p>
          </div>
            <button
              type="button"
              onClick={() => onNavigate('/hotels')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer shrink-0 py-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {filteredHotels.slice(0, 4).map((hotel) => (
              <div
                key={hotel.id}
                className="bg-white border border-zinc-200 hover:border-emerald-500 rounded-2xl p-2.5 flex items-center gap-3 transition-colors shadow-2xs"
              >
                <div
                  className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 shrink-0 cursor-pointer relative"
                  onClick={() => {
                    setActiveHotelModal(hotel);
                    setHotelSelectedRoomIdx(0);
                  }}
                >
                  <img
                    src={resolveImage(hotel.image, 'hotel')}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {hotel.trending && (
                    <span className="absolute top-1 left-1 bg-amber-400 text-zinc-950 text-[8.5px] font-extrabold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 shrink-0" />
                      Hot
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[9.5px] uppercase tracking-wider text-emerald-700 font-bold truncate">
                    Hotel Contract · {hotel.cat || 'Direct'} · {hotel.location || 'Malaysia'}
                  </div>
                  <h4
                    onClick={() => {
                      setActiveHotelModal(hotel);
                      setHotelSelectedRoomIdx(0);
                    }}
                    className="text-xs font-bold text-zinc-900 truncate hover:text-emerald-700 cursor-pointer mt-0.5"
                  >
                    {hotel.name}
                  </h4>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {hotel.roomCategories?.length ? `${hotel.roomCategories.length} Room Types · Instant Confirm` : 'Direct Nett Allotment'}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-100">
                    <span className="text-xs font-extrabold text-zinc-950 tabular-nums">
                      {formatPrice(Number(hotel.roomCategories?.[0]?.price ?? hotel.price) || 0)}
                      <span className="text-[10px] font-normal text-zinc-500"> /night</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotelModal(hotel);
                        setHotelSelectedRoomIdx(0);
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Rooms
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      {/* =====================================================================
          SECTION D: ONGOING PACKAGE CAMPAIGNS & POSTERS
      ===================================================================== */}
      {packagePostersList.length > 0 && (
        <section id={HOME_SECTIONS.posters} className="scroll-mt-16 pt-7 pb-6 bg-zinc-50 border-b border-zinc-200">
          <div className="px-3.5 mb-4 pb-3 border-b border-zinc-200 flex items-end justify-between gap-2">
            <div className="border-l-4 border-rose-600 pl-3">
              <p className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-rose-700 mb-0.5">
                Active Departures &amp; Posters
              </p>
              <h2 className="text-xl font-black text-zinc-950 tracking-tight leading-tight">
                Ongoing Package Posters
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/search', { category: 'Packages' })}
              className="text-xs font-bold text-emerald-700 flex items-center gap-0.5 cursor-pointer py-1 shrink-0"
            >
              <span>All Tours</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-3.5 pb-1 no-scrollbar">
            {packagePostersList.map((poster) => {
              const linkedPkg = packages.find((p) => p.id === poster.linkedPackageId);
              return (
                <div
                  key={poster.id}
                  onClick={() => {
                    if (linkedPkg) {
                      setActivePackageModal(linkedPkg);
                    } else {
                      onNavigate('/search', { query: poster.destination });
                    }
                  }}
                  className="w-[260px] h-44 shrink-0 snap-start rounded-2xl overflow-hidden relative bg-zinc-900 border border-zinc-200 shadow-xs cursor-pointer group"
                >
                  <img
                    src={resolveImage(poster.imageUrl, 'langkawi')}
                    alt={poster.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/35 to-black/25 p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-amber-400 text-zinc-950 text-[9.5px] font-black px-2 py-0.5 rounded-md tracking-wide uppercase">
                        {poster.badge}
                      </span>
                      {poster.tag && (
                        <span className="bg-black/65 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {poster.tag}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white leading-snug line-clamp-1">
                        {poster.title}
                      </h3>
                      <p className="text-[10.5px] text-zinc-200 line-clamp-1 mt-0.5">
                        {poster.subtitle}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/15 text-[11px]">
                        <span className="font-bold text-amber-300 tabular-nums">{poster.priceLabel}</span>
                        <span className="text-white/90 font-semibold flex items-center gap-0.5">
                          <span>View Poster</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Flights moved into the Upper View above */}

      {/* =====================================================================
          SECTION F: PACKAGE COLLAGE & RECENT COMPLETED TRIPS WITH REVIEWS & PHOTOS
      ===================================================================== */}
      <section id={HOME_SECTIONS.gallery} className="scroll-mt-16 px-3.5 pt-7 pb-6 bg-zinc-50 border-b border-zinc-200 space-y-6">
        {/* Sub-part 1: Package Visual Collage */}
        <div>
          <div className="mb-3.5 pb-3 border-b border-zinc-200 flex items-end justify-between gap-2">
            <div className="border-l-4 border-emerald-600 pl-3">
              <p className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-emerald-700 mb-0.5">
                Featured Trips Visual Collage
              </p>
              <h2 className="text-xl font-black text-zinc-950 tracking-tight leading-tight">
                Packages &amp; Malaysia Gallery
              </h2>
            </div>
              <button
                type="button"
                onClick={() => onNavigate('/search')}
                className="text-xs font-bold text-emerald-700 flex items-center gap-0.5 cursor-pointer py-1 shrink-0"
              >
                <span>Explore</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
              {packages.slice(0, 6).map((pkg, idx) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setActivePackageModal(pkg)}
                  className={`relative overflow-hidden bg-zinc-900 group cursor-pointer ${
                    idx === 0 ? 'col-span-2 row-span-2 h-44' : 'col-span-1 h-[85px]'
                  }`}
                >
                  <img
                    src={resolveImage(pkg.image, 'langkawi')}
                    alt={pkg.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent p-2 flex flex-col justify-end text-left">
                    <span className="text-[9.5px] font-bold text-amber-300 leading-none truncate">
                      {pkg.destination}
                    </span>
                    <span className={`font-extrabold text-white leading-tight line-clamp-1 ${idx === 0 ? 'text-xs mt-0.5' : 'text-[10px] mt-0.5'}`}>
                      {pkg.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-part 2: Recent Packages That Went Through — Traveler Photos & Reviews */}
          <div>
            <div className="mb-3.5 pb-3 border-b border-zinc-200 flex items-end justify-between gap-2">
              <div className="border-l-4 border-amber-500 pl-3">
                <p className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-amber-700 mb-0.5">
                  Completed Groups · 4.9 / 5 Verified
                </p>
                <h2 className="text-xl font-black text-zinc-950 tracking-tight leading-tight">
                  Recent Trips &amp; Guest Reviews
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-zinc-500 shrink-0">
                Tap photo to view
              </span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-1 no-scrollbar">
              {customerMediaList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveReviewLightbox(item)}
                  className="w-[248px] shrink-0 snap-start bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <div>
                    <div className="relative h-32 bg-zinc-900 overflow-hidden">
                      {item.type === 'video' ? (
                        <>
                          <img
                            src={item.posterUrl || resolveImage('kl')}
                            alt={item.experienceTitle}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 right-2 bg-black/75 text-amber-300 px-2 py-0.5 rounded-md text-[9.5px] font-bold flex items-center gap-1">
                            <Play className="w-2.5 h-2.5 fill-amber-300" />
                            <span>Video</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <img
                            src={item.url}
                            alt={item.experienceTitle}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2 right-2 bg-black/75 text-emerald-300 px-2 py-0.5 rounded-md text-[9.5px] font-bold flex items-center gap-1">
                            <Camera className="w-2.5 h-2.5" />
                            <span>Trip Photo</span>
                          </div>
                        </>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-white font-semibold">
                        <span className="truncate">{item.location}</span>
                        <span className="text-amber-300 shrink-0 ml-1 tabular-nums">
                          ★ {item.rating || 5}.0
                        </span>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="text-[10px] font-bold text-emerald-700 truncate">
                        {item.experienceTitle}
                      </div>
                      <p className="text-[11px] text-zinc-700 leading-relaxed line-clamp-2 mt-1">
                        &ldquo;{item.caption}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="px-3 pb-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="font-bold text-zinc-900 truncate">{item.customerName}</span>
                    <span className="shrink-0 ml-1">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      {/* 7. RIGHT-TO-LEFT PARTNER PREVIEW TICKER */}
      <PartnerAllianceSection
        settings={globalSettings}
        onNavigate={onNavigate}
        variant="mobile"
      />

      {/* 8. TRAVELER TRUST GUARANTEE */}
      <section className="px-3 pt-3 bg-white">
        <div className="bg-emerald-50/70 text-zinc-900 border border-emerald-200 rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <Compass className="w-3.5 h-3.5" />
            <span>Why Book Direct with GFK Holidays</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
            <div className="flex items-start gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-zinc-700 font-medium">100% Malaysia Specialist</span>
            </div>
            <div className="flex items-start gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-zinc-700 font-medium">Instant Gate QR Delivery</span>
            </div>
            <div className="flex items-start gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-zinc-700 font-medium">Contracted Allotments</span>
            </div>
            <div className="flex items-start gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-zinc-700 font-medium">24/7 Malaysian Concierge</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          INTERACTIVE BOTTOM SHEET 1: ATTRACTION TICKETS QUICK BOOKING & T&CS
          Gives the customer in 1-2 clicks:
          - Ticket categories (Malaysian MyKad, Intl, Child, Express)
          - Date & Slot picker
          - Terms & Conditions (T&C), cancellation, child policy, validity
          - 1-Click Instant Book Bar
      ===================================================================== */}
      {activeTicketModal && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-zinc-800 flex items-start justify-between">
              <div className="flex-1 pr-3">
                <span className="inline-block bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black px-2 py-0.5 rounded-full mb-1">
                  Instant QR E-Ticket
                </span>
                <h3 className="text-sm font-extrabold text-white leading-snug">
                  {activeTicketModal.name}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {activeTicketModal.location}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">★ {activeTicketModal.rating || 4.9}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicketModal(null)}
                className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtabs (Options & Booking vs Terms & Conditions) */}
            <div className="flex border-b border-zinc-800 px-3 bg-zinc-950/60">
              <button
                type="button"
                onClick={() => setTicketTab('options')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  ticketTab === 'options'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                1. Select Options &amp; Date
              </button>
              <button
                type="button"
                onClick={() => setTicketTab('terms')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                  ticketTab === 'terms'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Terms &amp; Conditions (T&amp;C)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {ticketTab === 'options' ? (
                <>
                  {/* Option 1: Choose Variant (Adult, Child, MyKad, Express) */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                      1. Select Ticket Variant / Category
                    </label>
                    <div className="space-y-1.5">
                      {(activeTicketModal.ticketCategories && activeTicketModal.ticketCategories.length > 0
                        ? activeTicketModal.ticketCategories
                        : [
                            { name: 'Standard Gate QR Pass', price: activeTicketModal.price, description: 'Direct turnstile barcode admission' }
                          ]
                      ).map((cat, idx) => (
                        <div
                          key={idx}
                          onClick={() => setTicketSelectedCategoryIdx(idx)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            ticketSelectedCategoryIdx === idx
                              ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500'
                              : 'bg-zinc-800/70 border-zinc-700/80 hover:border-zinc-500'
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-bold text-white text-xs">{cat.name}</div>
                            {cat.description && (
                              <div className="text-[10px] text-zinc-400 mt-0.5">{cat.description}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-emerald-400">
                              RM {cat.price}
                            </div>
                            <div className="text-[9px] text-zinc-400 font-medium">per ticket</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Option 2: Date Selector */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      2. Visit Date
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                      {(() => {
                        const today = new Date();
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const dayAfter = new Date();
                        dayAfter.setDate(dayAfter.getDate() + 2);

                        const dates = [
                          { label: 'Today', val: today.toISOString().split('T')[0] },
                          { label: 'Tomorrow', val: tomorrow.toISOString().split('T')[0] },
                          { label: 'Day After', val: dayAfter.toISOString().split('T')[0] }
                        ];

                        return dates.map((d) => (
                          <button
                            key={d.val}
                            type="button"
                            onClick={() => setTicketDate(d.val)}
                            className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              ticketDate === d.val
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {d.label}
                          </button>
                        ));
                      })()}
                    </div>
                    <input
                      type="date"
                      value={ticketDate}
                      onChange={(e) => setTicketDate(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Option 3: Time Slot */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      3. Entry Time Slot
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['09:30 AM', '11:30 AM', '02:00 PM', '04:30 PM'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTicketSlot(s)}
                          className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            ticketSlot === s
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 4: Pax Quantity */}
                  <div className="flex items-center justify-between p-2.5 bg-zinc-800/80 rounded-xl border border-zinc-700">
                    <div>
                      <span className="font-bold text-white text-xs block">Number of Tickets</span>
                      <span className="text-[10px] text-zinc-400">Ages 3+ (Turnstile admission)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTicketPax(Math.max(1, ticketPax - 1))}
                        className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 font-black text-white text-base flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-black text-white text-sm w-5 text-center">{ticketPax}</span>
                      <button
                        type="button"
                        onClick={() => setTicketPax(ticketPax + 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-black text-white text-base flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* External Marketplace Options (Viator & TripAdvisor) */}
                  <div className="p-2.5 bg-zinc-950/90 border border-zinc-800 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-zinc-400">Also bookable via:</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={
                          activeTicketModal.viatorUrl ||
                          `https://www.viator.com/searchResults/all?text=${encodeURIComponent(`${activeTicketModal.name} Malaysia`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-[#34E0A1] inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>Viator</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                      <a
                        href={
                          activeTicketModal.tripadvisorUrl ||
                          `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${activeTicketModal.name} Malaysia`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-[#34E0A1] inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>TripAdvisor</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                /* Terms & Conditions Tab */
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1.5">
                    <div className="font-black text-white text-xs flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Official Terms &amp; Conditions (T&amp;C)</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {activeTicketModal.termsAndConditions ||
                        'Instant QR Pass valid for 90 days from issuance. Direct gate turnstile entry. Non-refundable once scanned or redeemed at attraction gates.'}
                    </p>
                  </div>

                  {activeTicketModal.childPolicy && (
                    <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1">
                      <div className="font-bold text-white text-[11px] text-amber-300">
                        👶 Child &amp; Senior Policy
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activeTicketModal.childPolicy}
                      </p>
                    </div>
                  )}

                  {activeTicketModal.instructions && (
                    <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1">
                      <div className="font-bold text-white text-[11px] text-cyan-300">
                        📍 Gate Redemption Instructions
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activeTicketModal.instructions}
                      </p>
                    </div>
                  )}

                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-zinc-400">
                    <strong>Timings:</strong> {activeTicketModal.timings || activeTicketModal.addInfo || 'Daily 09:00 AM - 08:00 PM'}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer - 1-Click Instant Booking */}
            <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 sticky bottom-0 z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[9px] text-zinc-400 block font-semibold">Total Price ({ticketPax} Passes)</span>
                <div className="text-base font-black text-white">
                  {formatPrice((Number(activeTicketModal.ticketCategories?.[ticketSelectedCategoryIdx]?.price ?? activeTicketModal.price) || 0) * ticketPax)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstantBookTicket}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Instant Book E-Ticket</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE BOTTOM SHEET 2: HOTELS & STAYS QUICK BOOKING & T&CS
          Gives the customer in 1-2 clicks:
          - Room Categories (Standard, Deluxe, Executive Suite)
          - Check-in & Check-out date selection
          - Terms & Stay Policies (T&C), check-in/out hours, cancellation
          - 1-Click Instant Room Reserve Bar
      ===================================================================== */}
      {activeHotelModal && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-zinc-800 flex items-start justify-between">
              <div className="flex-1 pr-3">
                <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2 py-0.5 rounded-full mb-1">
                  {activeHotelModal.cat || 'Direct Contracted Hotel'}
                </span>
                <h3 className="text-sm font-extrabold text-white leading-snug">
                  {activeHotelModal.name}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {activeHotelModal.location}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">★ {activeHotelModal.rating || 4.8}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveHotelModal(null)}
                className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex border-b border-zinc-800 px-3 bg-zinc-950/60">
              <button
                type="button"
                onClick={() => setHotelTab('rooms')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  hotelTab === 'rooms'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                1. Room Categories &amp; Dates
              </button>
              <button
                type="button"
                onClick={() => setHotelTab('terms')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                  hotelTab === 'terms'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Stay Policies &amp; T&amp;C</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {hotelTab === 'rooms' ? (
                <>
                  {/* Room Categories */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-300 uppercase tracking-wider mb-1.5">
                      1. Select Room Category
                    </label>
                    <div className="space-y-1.5">
                      {(activeHotelModal.roomCategories && activeHotelModal.roomCategories.length > 0
                        ? activeHotelModal.roomCategories
                        : [
                            { name: 'Standard Room', price: activeHotelModal.price, pax: 2 }
                          ]
                      ).map((room, idx) => (
                        <div
                          key={idx}
                          onClick={() => setHotelSelectedRoomIdx(idx)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            hotelSelectedRoomIdx === idx
                              ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500'
                              : 'bg-zinc-800/70 border-zinc-700/80 hover:border-zinc-500'
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-bold text-white text-xs">{room.name}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-2">
                              <span>Max {room.pax || 2} Guests</span>
                              <span>•</span>
                              <span className="text-emerald-400">Guaranteed Allotment</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-emerald-400">
                              RM {room.price}
                            </div>
                            <div className="text-[9px] text-zinc-400 font-medium">per night</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dates & Duration */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        Check-in Date
                      </label>
                      <input
                        type="date"
                        value={hotelCheckIn}
                        onChange={(e) => setHotelCheckIn(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        Stay Duration
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setHotelNights(n)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              hotelNights === n
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {n}N
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Guests Counter */}
                  <div className="flex items-center justify-between p-2.5 bg-zinc-800/80 rounded-xl border border-zinc-700">
                    <div>
                      <span className="font-bold text-white text-xs block">Number of Guests</span>
                      <span className="text-[10px] text-zinc-400">Adults and children</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHotelGuests(Math.max(1, hotelGuests - 1))}
                        className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 font-black text-white text-base flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-black text-white text-sm w-5 text-center">{hotelGuests}</span>
                      <button
                        type="button"
                        onClick={() => setHotelGuests(hotelGuests + 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-black text-white text-base flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Amenities Highlights */}
                  <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block mb-1">
                      Included Hotel Amenities
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-300">
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>High-Speed WiFi</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Outdoor Swimming Pool</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Fitness Gymnasium</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>24/7 Front Concierge</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Hotel Policies & T&C */
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1.5">
                    <div className="font-black text-white text-xs flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Contract Terms &amp; Conditions (T&amp;C)</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {activeHotelModal.termsAndConditions ||
                        'Free cancellation up to 48 hours prior to check-in date. Malaysian Tourism Tax of RM10 per room per night applies to non-Malaysian passport holders payable at check-in.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl">
                      <span className="font-bold text-zinc-400 block">Check-in Hours</span>
                      <span className="font-extrabold text-white text-xs mt-0.5 block">From 3:00 PM</span>
                    </div>
                    <div className="p-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl">
                      <span className="font-bold text-zinc-400 block">Check-out Hours</span>
                      <span className="font-extrabold text-white text-xs mt-0.5 block">Until 12:00 PM</span>
                    </div>
                  </div>

                  {activeHotelModal.childPolicy && (
                    <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1">
                      <div className="font-bold text-white text-[11px] text-amber-300">
                        👶 Child &amp; Extra Bed Policy
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activeHotelModal.childPolicy}
                      </p>
                    </div>
                  )}

                  {activeHotelModal.instructions && (
                    <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1">
                      <div className="font-bold text-white text-[11px] text-cyan-300">
                        🏨 Important Stay Notes
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activeHotelModal.instructions}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Action Footer - 1-Click Instant Reserve */}
            <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 sticky bottom-0 z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[9px] text-zinc-400 block font-semibold">Total Price ({hotelNights} Nights)</span>
                <div className="text-base font-black text-white">
                  {formatPrice((Number(activeHotelModal.roomCategories?.[hotelSelectedRoomIdx]?.price ?? activeHotelModal.price) || 0) * hotelNights)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstantBookHotel}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Reserve Room Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE BOTTOM SHEET 3: HOLIDAYS & PACKAGES QUICK MODAL
          Gives the customer in 1-2 clicks:
          - Day-by-Day Itinerary Summary (Day 1, 2, 3...)
          - Inclusions & Highlights
          - Departure Dates & Travelers
          - Terms & Conditions (T&C), cancellation, child policy
          - 1-Click Instant Package Booking Bar
      ===================================================================== */}
      {activePackageModal && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-zinc-800 flex items-start justify-between">
              <div className="flex-1 pr-3">
                <span className="inline-block bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black px-2 py-0.5 rounded-full mb-1">
                  {activePackageModal.duration_days}D/{activePackageModal.duration_days - 1}N Guided Tour
                </span>
                <h3 className="text-sm font-extrabold text-white leading-snug">
                  {activePackageModal.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {activePackageModal.destination}
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">★ {activePackageModal.rating || 4.9}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePackageModal(null)}
                className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex border-b border-zinc-800 px-3 bg-zinc-950/60">
              <button
                type="button"
                onClick={() => setPackageTab('itinerary')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  packageTab === 'itinerary'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                1. Itinerary &amp; Dates
              </button>
              <button
                type="button"
                onClick={() => setPackageTab('terms')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                  packageTab === 'terms'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Inclusions &amp; T&amp;C</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {packageTab === 'itinerary' ? (
                <>
                  {/* Date & Travelers selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        Departure Date
                      </label>
                      <input
                        type="date"
                        value={packageDate}
                        onChange={(e) => setPackageDate(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-400" />
                        Travelers Count
                      </label>
                      <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-1">
                        <button
                          type="button"
                          onClick={() => setPackagePax(Math.max(1, packagePax - 1))}
                          className="w-6 h-6 rounded bg-zinc-700 font-black text-white"
                        >
                          -
                        </button>
                        <span className="font-black text-white text-xs">{packagePax} Pax</span>
                        <button
                          type="button"
                          onClick={() => setPackagePax(packagePax + 1)}
                          className="w-6 h-6 rounded bg-emerald-600 font-black text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Day-by-Day Itinerary breakdown */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-300 uppercase tracking-wider mb-2">
                      Day-by-Day Itinerary Breakdown
                    </label>
                    <div className="space-y-2">
                      {(activePackageModal.itinerary && activePackageModal.itinerary.length > 0
                        ? activePackageModal.itinerary
                        : [
                            { day: 1, title: 'Arrival & Welcome Dinner', activities: 'Airport pickup and check-in to accommodation with evening welcome dining.' },
                            { day: 2, title: 'Guided Sightseeing & Highlights', activities: 'Full day exploring key attractions, cultural landmarks, and local dining trails.' },
                            { day: 3, title: 'Leisure & Departure Transfer', activities: 'Morning free leisure for shopping, followed by comfortable airport transfer.' }
                          ]
                      ).map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center justify-center shrink-0">
                              {item.day || idx + 1}
                            </span>
                            <h5 className="font-extrabold text-white text-xs">{item.title}</h5>
                          </div>
                          <p className="text-[10.5px] text-zinc-300 pl-7 leading-relaxed">
                            {item.activities}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Inclusions & Terms & Conditions */
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1.5">
                    <div className="font-black text-white text-xs flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Package Terms &amp; Conditions (T&amp;C)</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {activePackageModal.termsAndConditions ||
                        'Includes twin-sharing accommodation, all stated excursions, and private airport transfers. Free cancellation up to 7 days prior to travel date.'}
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1.5">
                    <div className="font-bold text-white text-xs text-amber-300">
                      ✨ Key Inclusions &amp; Services
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {activePackageModal.importantInfo ||
                        activePackageModal.instructions ||
                        'Includes airport roundtrip transfers, daily breakfast buffet, licensed English-speaking guide, and entry passes.'}
                    </p>
                  </div>

                  {activePackageModal.childPolicy && (
                    <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl space-y-1">
                      <div className="font-bold text-white text-[11px] text-cyan-300">
                        👶 Child &amp; Family Discount Policy
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activePackageModal.childPolicy}
                      </p>
                    </div>
                  )}

                  <div className="p-2.5 bg-zinc-950/90 border border-zinc-800 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-zinc-400">Or reserve via portal:</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={
                          activePackageModal.viatorUrl ||
                          `https://www.viator.com/searchResults/all?text=${encodeURIComponent(`${activePackageModal.title} Malaysia`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-[#34E0A1] inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>Viator</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                      <a
                        href={
                          activePackageModal.tripadvisorUrl ||
                          `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${activePackageModal.title} Malaysia`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-[#34E0A1] inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>TripAdvisor</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer - 1-Click Instant Package Booking */}
            <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 sticky bottom-0 z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[9px] text-zinc-400 block font-semibold">Total ({packagePax} Travelers)</span>
                <div className="text-base font-black text-white">
                  {formatPrice((Number(activePackageModal.base_price) || 0) * packagePax)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstantBookPackage}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Book This Package Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE LIGHTBOX SHEET 4: COMPLETED TRIP PHOTO / VIDEO & REVIEW
      ===================================================================== */}
      {activeReviewLightbox && (
        <div
          className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setActiveReviewLightbox(null)}
        >
          <div
            className="w-full bg-zinc-900 border-t border-zinc-700 rounded-t-3xl max-h-[88vh] flex flex-col overflow-hidden text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-60 bg-black shrink-0">
              {activeReviewLightbox.type === 'video' ? (
                <video
                  src={activeReviewLightbox.url}
                  poster={activeReviewLightbox.posterUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={activeReviewLightbox.url}
                  alt={activeReviewLightbox.experienceTitle}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <button
                type="button"
                onClick={() => setActiveReviewLightbox(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/75 text-white hover:bg-black cursor-pointer"
                aria-label="Close review"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-emerald-400">{activeReviewLightbox.location}</span>
                <span className="text-amber-400">
                  {'★'.repeat(activeReviewLightbox.rating || 5)} Completed Trip
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white leading-snug">
                {activeReviewLightbox.experienceTitle}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                &ldquo;{activeReviewLightbox.caption}&rdquo;
              </p>
              <div className="text-[11px] text-zinc-400 pt-1">
                Traveled by <strong className="text-white">{activeReviewLightbox.customerName}</strong> · {activeReviewLightbox.date}
              </div>
            </div>

            <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => {
                  setActiveReviewLightbox(null);
                  onNavigate('/search');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Book Similar Malaysia Package</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
