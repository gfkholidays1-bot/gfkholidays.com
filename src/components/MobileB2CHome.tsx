import React, { useState, useEffect, useRef } from 'react';
import { loadVideoBlob } from '../lib/videoStorage';
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
  Volume2,
  VolumeX,
  Compass,
  Calendar,
  Users,
  FileText,
  X,
  Info,
  Sparkles,
  QrCode
} from 'lucide-react';
import { Package, Ticket as TicketType, Hotel, TransportRoute, Agent, GlobalSettings } from '../types';

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
  onRequestLogin: _onRequestLogin
}: MobileB2CHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'packages' | 'tickets' | 'hotels'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  // Quick Action Modals state (1-2 click instant checkout or details inspection)
  const [activeTicketModal, setActiveTicketModal] = useState<TicketType | null>(null);
  const [activeHotelModal, setActiveHotelModal] = useState<Hotel | null>(null);
  const [activePackageModal, setActivePackageModal] = useState<Package | null>(null);

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

  const [activeFeaturedVideo, setActiveFeaturedVideo] = useState<string>(() => {
    return (
      globalSettings.featuredVideoEmbedUrl ||
      globalSettings.heroVideoUrl ||
      'https://viddler.com/embed/player?id=20382&color=default'
    );
  });

  useEffect(() => {
    let isMounted = true;
    loadVideoBlob('featured_attractions_video').then((blobUrl) => {
      if (isMounted && blobUrl) {
        setActiveFeaturedVideo(blobUrl);
      } else {
        loadVideoBlob('hero_background_video').then((heroBlob) => {
          if (isMounted && heroBlob) setActiveFeaturedVideo(heroBlob);
        });
      }
    });

    const handleVideoUpdated = (event: any) => {
      const { videoUrl } = event.detail || {};
      if (videoUrl) {
        setActiveFeaturedVideo(videoUrl);
      }
    };

    window.addEventListener('gfk-video-updated', handleVideoUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('gfk-video-updated', handleVideoUpdated);
    };
  }, []);

  useEffect(() => {
    const el = mobileVideoRef.current;
    if (!el) return;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    }
  }, [activeFeaturedVideo]);

  useEffect(() => {
    if (
      globalSettings.featuredVideoEmbedUrl &&
      globalSettings.featuredVideoEmbedUrl !== activeFeaturedVideo &&
      !activeFeaturedVideo.startsWith('blob:')
    ) {
      setActiveFeaturedVideo(globalSettings.featuredVideoEmbedUrl);
    }
  }, [globalSettings.featuredVideoEmbedUrl]);

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

  return (
    <div className="flex flex-col bg-zinc-50 pb-20 text-zinc-900 font-sans">
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
          2. EXCLUSIVELY MALAYSIA HERO SECTION (Streamlined & Compact Spacing)
          1. Header Identity
          2. Featured Video Embed (Compact 16:9 with sound toggle)
          3. 6 Core Phone-Size Services (Kept First as requested)
          4. Search Bar & Destination Filters
      ===================================================================== */}
      <section id="mobile-hero-section" data-aistudio-editable="true" className="relative overflow-hidden pt-2.5 pb-4 px-3 bg-gradient-to-br from-amber-50/80 via-yellow-50/40 to-emerald-50/60 border-b border-zinc-200">
        {/* Radiant Sunlight & Glittering Shimmer Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-300/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-yellow-200/40 rounded-full blur-xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200/20 via-transparent to-transparent opacity-70" />
        </div>

        {/* Scenic Background Texture */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none opacity-10">
          <img
            src="https://images.unsplash.com/photo-1596422846543-75c6fc1f4767?auto=format&fit=crop&w=1200&q=80"
            alt="Malaysia Scenery"
            className="w-full h-full object-cover filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white/90" />
        </div>

        {/* HERO TITLE - Compact */}
        <div className="relative z-10 pt-0.5 pb-1.5 flex items-center justify-between">
          <div>
            <h1 className="text-zinc-950 text-lg font-black tracking-tight leading-tight flex items-center gap-1.5">
              <span>Truly Asia Experiences &amp; Stays</span>
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 animate-spin-slow shrink-0" />
            </h1>
            <p className="text-zinc-600 text-[11px] font-medium mt-0.5">
              Direct local booking for tour packages, 5-star hotels &amp; gate QR passes
            </p>
          </div>
        </div>

        {/* FEATURED VIDEO - Sleek 16:9 Clean Video Screen */}
        <div className="relative z-10 mt-1.5 w-full rounded-2xl overflow-hidden shadow-md border border-zinc-200 bg-black">
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            {(() => {
              const src =
                activeFeaturedVideo ||
                globalSettings.featuredVideoEmbedUrl ||
                'https://viddler.com/embed/player?id=20382&color=default';
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
                    ref={mobileVideoRef}
                    key={src}
                    src={src}
                    autoPlay
                    loop
                    muted={videoMuted}
                    playsInline
                    controls={false}
                    disablePictureInPicture
                    disableRemotePlayback
                    tabIndex={-1}
                    aria-hidden="true"
                    onContextMenu={(e) => e.preventDefault()}
                    onKeyDown={(e) => e.preventDefault()}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                  />
                );
              }
              return (
                <iframe
                  key={src}
                  src={src}
                  className="absolute inset-0 w-full h-full border-0 block"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title="Featured Malaysia Experience Video"
                />
              );
            })()}
          </div>
          {/* Floating Audio Toggle Overlay */}
          <button
            type="button"
            onClick={() => {
              setVideoMuted(!videoMuted);
              if (mobileVideoRef.current) mobileVideoRef.current.muted = !videoMuted;
            }}
            className="absolute bottom-3 right-3 z-20 bg-black/75 hover:bg-black text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm transition-colors cursor-pointer shadow-md"
          >
            {videoMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-300" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{videoMuted ? 'Unmute' : 'Muted'}</span>
          </button>
        </div>

        {/* =====================================================================
            3. THE 6 CORE SERVICES (DISPLAYED FIRST AS MANDATED)
            Compact, responsive 2-column grid with clear instant action
        ===================================================================== */}
                <div id="mobile-services-grid" data-aistudio-editable="true" className="relative z-10 mt-3.5">
          <div className="mb-2 px-0.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-zinc-950 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>What would you like to book today?</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
              Tap any category below to instantly browse live availability &amp; direct contract rates
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* SERVICE 1: Holiday Tour Packages */}
            <button
              type="button"
              onClick={() => onNavigate('/search', { category: 'Packages' })}
              className="group relative bg-white hover:bg-emerald-50/40 border border-zinc-200 hover:border-amber-500 rounded-2xl p-3 text-left shadow-xs transition-all cursor-pointer flex flex-col justify-between h-[116px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
                  <Palmtree className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  Guided Tours
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-950 group-hover:text-amber-700 transition-colors leading-tight">
                  Holiday Packages
                </h3>
                <p className="text-[9px] text-zinc-500 font-medium truncate mt-0.5">
                  Langkawi, Sabah &amp; KL Itineraries
                </p>
              </div>
              <div className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5 mt-1">
                <span>Browse Tours</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* SERVICE 2: Hotels & Stays */}
            <button
              type="button"
              onClick={() => onNavigate('/hotels')}
              className="group relative bg-white hover:bg-emerald-50/40 border border-zinc-200 hover:border-emerald-500 rounded-2xl p-3 text-left shadow-xs transition-all cursor-pointer flex flex-col justify-between h-[116px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  Overnight Stays
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-950 group-hover:text-emerald-700 transition-colors leading-tight">
                  Hotels &amp; Resorts
                </h3>
                <p className="text-[9px] text-zinc-500 font-medium truncate mt-0.5">
                  5-Star Rooms &amp; Beach Villas
                </p>
              </div>
              <div className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                <span>View Stays</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* SERVICE 3: Sightseeing & E-Tickets */}
            <button
              type="button"
              onClick={() => onNavigate('/tickets')}
              className="group relative bg-white hover:bg-emerald-50/40 border border-zinc-200 hover:border-purple-500 rounded-2xl p-3 text-left shadow-xs transition-all cursor-pointer flex flex-col justify-between h-[116px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Ticket className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  Gate QR Code
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-950 group-hover:text-purple-700 transition-colors leading-tight">
                  Attraction E-Tickets
                </h3>
                <p className="text-[9px] text-zinc-500 font-medium truncate mt-0.5">
                  Twin Towers &amp; Theme Parks
                </p>
              </div>
              <div className="text-[9px] font-bold text-purple-600 flex items-center gap-0.5 mt-1">
                <span>Get Passes</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* SERVICE 4: Restaurants & Dining */}
            <button
              type="button"
              onClick={() => onNavigate('/restaurants')}
              className="group relative bg-white hover:bg-emerald-50/40 border border-zinc-200 hover:border-rose-500 rounded-2xl p-3 text-left shadow-xs transition-all cursor-pointer flex flex-col justify-between h-[116px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-xs">
                  <UtensilsCrossed className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="bg-rose-100 text-rose-900 border border-rose-300 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  Culinary Dining
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-950 group-hover:text-rose-700 transition-colors leading-tight">
                  Restaurants &amp; Food
                </h3>
                <p className="text-[9px] text-zinc-500 font-medium truncate mt-0.5">
                  Michelin Trails &amp; High-Tea
                </p>
              </div>
              <div className="text-[9px] font-bold text-rose-600 flex items-center gap-0.5 mt-1">
                <span>Explore Dining</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* SERVICE 5: Transport & Transfers */}
            <button
              type="button"
              onClick={() => onNavigate('/transport')}
              className="group relative bg-white hover:bg-emerald-50/40 border border-zinc-200 hover:border-blue-500 rounded-2xl p-3 text-left shadow-xs transition-all cursor-pointer flex flex-col justify-between h-[116px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white flex items-center justify-center shadow-xs">
                  <Car className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  Airport &amp; Cabs
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-950 group-hover:text-blue-700 transition-colors leading-tight">
                  Transport Services
                </h3>
                <p className="text-[9px] text-zinc-500 font-medium truncate mt-0.5">
                  KLIA Cabs &amp; VIP Chauffeurs
                </p>
              </div>
              <div className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5 mt-1">
                <span>Book Transfer</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* SERVICE 6: Island Cruises */}
            <button
              type="button"
              onClick={() => onNavigate('/cruises')}
              className="group relative bg-white hover:bg-emerald-50/40 border border-zinc-200 hover:border-teal-500 rounded-2xl p-3 text-left shadow-xs transition-all cursor-pointer flex flex-col justify-between h-[116px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-xs">
                  <Waves className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="bg-cyan-100 text-cyan-900 border border-cyan-300 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                  Sea &amp; Yacht
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-950 group-hover:text-teal-700 transition-colors leading-tight">
                  Island Cruises
                </h3>
                <p className="text-[9px] text-zinc-500 font-medium truncate mt-0.5">
                  Sunset Catamaran &amp; Ferries
                </p>
              </div>
              <div className="text-[9px] font-bold text-teal-600 flex items-center gap-0.5 mt-1">
                <span>View Cruises</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* 4. SEARCH BAR & QUICK DESTINATION CHIPS */}
        <div id="mobile-search-section" data-aistudio-editable="true" className="relative z-10 mt-3">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-xl p-1 border border-zinc-300/80 shadow-md flex items-center gap-1.5"
          >
            <div className="flex-1 flex items-center gap-1.5 px-2 py-0.5">
              <Search className="w-4 h-4 text-emerald-700 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Malaysia attractions, hotels & tours..."
                className="w-full text-xs font-bold text-zinc-900 bg-transparent focus:outline-none placeholder-zinc-400"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-colors cursor-pointer shadow-xs"
            >
              Search
            </button>
          </form>

          {/* Quick Destination Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-0.5 no-scrollbar scroll-smooth">
            {quickLocations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocation(loc.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer whitespace-nowrap ${
                  selectedLocation === loc.id
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-zinc-900/90 text-zinc-300 border border-zinc-700/80 hover:border-zinc-500'
                }`}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. 1-CLICK QUICK CATEGORY FILTER TAB SWITCHER
          Allows user to instantly jump or filter Holidays, Tickets, Hotels in 1 click
      ===================================================================== */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-3 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-zinc-950 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          ⭐ All Deals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('packages')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === 'packages'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          🌴 Holidays &amp; Packages
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === 'tickets'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          🎟️ Attraction Tickets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hotels')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === 'hotels'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
          }`}
        >
          🏨 Hotels &amp; Stays
        </button>
      </div>

      {/* 5. FESTIVAL PROMO BANNER CAROUSEL - Only if voucherDisplayMode is 'both' */}
      {globalSettings.voucherDisplayMode === 'both' && (
        <section className="px-3 pt-2 pb-1 bg-zinc-50">
          <div className="relative rounded-2xl overflow-hidden shadow-md">
            {banners.map((b, idx) => {
              if (idx !== activeBannerIdx) return null;
              return (
                <div
                  key={b.id}
                  className={`bg-gradient-to-br ${b.bgGradient} p-3.5 text-white relative transition-all duration-300`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="bg-black/30 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/20">
                      {b.badge}
                    </span>
                    <span className="text-[9px] font-bold text-white/90">
                      {idx + 1} / {banners.length}
                    </span>
                  </div>

                  <h3 className="text-sm font-black tracking-tight leading-tight text-white mb-0.5">
                    {b.title}
                  </h3>
                  <p className="text-[11px] text-white/95 font-medium leading-snug mb-2">
                    {b.subtitle}
                  </p>

                  {/* Promo Code & Action Button */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/20">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-200">
                      <Tag className="w-3 h-3" />
                      <span>Code: <button type="button" onClick={() => handleCopyCode(b.promoCode)} className="font-mono underline text-white cursor-pointer">{b.promoCode}</button></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(b.actionPath)}
                      className="bg-white text-zinc-950 font-extrabold text-[11px] px-3 py-1 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>{b.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. TRUST TICKER */}
      <section className="px-3 py-2 bg-white border-b border-zinc-200">
        <div className="bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl px-3 py-2 text-[9.5px] font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Instant Gate QR in 30s</span>
          </div>
          <span className="text-zinc-300">|</span>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Guaranteed Hotel Allotment</span>
          </div>
          <span className="text-zinc-300">|</span>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-600 shrink-0" />
            <span>Licensed DMC</span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION A: HOLIDAYS & TOUR PACKAGES
          High density cards + 1-Click Quick Modal (Itinerary, T&Cs, Dates)
      ===================================================================== */}
      {(activeTab === 'all' || activeTab === 'packages') && (
        <section id="section-packages" data-aistudio-editable="true" className="pt-3 pb-3 bg-white border-b border-zinc-200">
          <div className="px-3 mb-2.5">
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-l-4 border-amber-500 p-3 rounded-r-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block shadow-2xs">
                  Featured Category
                </span>
                <h2 className="text-sm sm:text-base font-black text-zinc-950 flex items-center gap-1.5 tracking-tight">
                  <span>🌴 Holidays &amp; Tour Packages</span>
                </h2>
                <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">Direct packages with full day-by-day itineraries &amp; transfers</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/search', { category: 'Packages' })}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto px-3 pb-2 no-scrollbar scroll-smooth">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="w-[230px] shrink-0 bg-white border border-zinc-200 hover:border-amber-500 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div
                  className="relative h-28 bg-zinc-100 cursor-pointer"
                  onClick={() => setActivePackageModal(pkg)}
                >
                  <img
                    src={resolveImage(pkg.image, 'langkawi')}
                    alt={pkg.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-zinc-900 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                    <span>{pkg.rating || 4.9}</span>
                  </div>
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                    {pkg.duration_days}D/{pkg.duration_days - 1}N
                  </div>
                  <div className="absolute bottom-1.5 left-2 bg-black/75 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="truncate max-w-[120px]">{pkg.destination}</span>
                  </div>
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4
                      onClick={() => setActivePackageModal(pkg)}
                      className="text-xs font-black text-zinc-900 leading-snug line-clamp-2 hover:text-emerald-700 cursor-pointer"
                    >
                      {pkg.title}
                    </h4>

                    {/* Features Tag */}
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-500">
                      <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[8.5px] text-zinc-700">
                        {pkg.itinerary?.length || pkg.duration_days} Days Itinerary
                      </span>
                      <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-[8.5px] text-emerald-800 font-semibold">
                        T&amp;Cs Available
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-400 block line-through">
                        RM {pkg.original_price || Math.round(pkg.base_price * 1.25)}
                      </span>
                      <div className="text-xs font-black text-zinc-950">
                        RM {pkg.base_price}
                        <span className="text-[8.5px] font-normal text-zinc-500"> /pax</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setActivePackageModal(pkg)}
                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Options
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePackageModal(pkg);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer shadow-xs"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION B: ATTRACTION TICKETS & PASSES
          High-density grid + 1-Click Quick Modal (Variants, Slots, T&Cs, QR rules)
      ===================================================================== */}
      {(activeTab === 'all' || activeTab === 'tickets') && (
        <section id="section-tickets" data-aistudio-editable="true" className="px-3 pt-3 pb-3 bg-white border-b border-zinc-200">
          <div className="px-3 mb-2.5">
            <div className="bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent border-l-4 border-purple-600 p-3 rounded-r-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block shadow-2xs">
                  Instant QR Passes
                </span>
                <h2 className="text-sm sm:text-base font-black text-zinc-950 flex items-center gap-1.5 tracking-tight">
                  <span>🎟️ Attraction Tickets &amp; E-Passes</span>
                </h2>
                <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">Direct barcode turnaround with MyKad / Intl options &amp; T&amp;Cs</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/tickets')}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              >
                <span>All Passes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {filteredTickets.slice(0, 6).map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white border border-zinc-200 hover:border-purple-400 rounded-2xl p-2 shadow-xs flex flex-col justify-between"
              >
                <div
                  className="relative h-24 rounded-xl overflow-hidden mb-1.5 bg-zinc-100 cursor-pointer"
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
                  <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                    {ticket.location || 'Malaysia'}
                  </span>
                  <div className="absolute top-1 left-1 bg-purple-900 text-white text-[7.5px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                    <QrCode className="w-2.5 h-2.5" />
                    <span>Instant QR</span>
                  </div>
                </div>

                <div>
                  <h4
                    onClick={() => {
                      setActiveTicketModal(ticket);
                      setTicketSelectedCategoryIdx(0);
                    }}
                    className="text-[11px] font-black text-zinc-900 line-clamp-2 leading-tight hover:text-emerald-700 cursor-pointer"
                  >
                    {ticket.name}
                  </h4>

                  {/* Options Available badge */}
                  <div className="text-[8.5px] text-zinc-500 mt-1 flex items-center justify-between">
                    <span>{ticket.ticketCategories?.length ? `${ticket.ticketCategories.length} Options` : 'Standard Pass'}</span>
                    <span className="text-purple-700 font-semibold">T&amp;C Details</span>
                  </div>

                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-zinc-100">
                    <div>
                      <span className="text-[8px] text-zinc-400 block leading-none">From</span>
                      <span className="text-xs font-black text-emerald-700">
                        RM {ticket.ticketCategories?.[0]?.price || ticket.price}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTicketModal(ticket);
                        setTicketSelectedCategoryIdx(0);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg text-[9.5px] font-bold cursor-pointer"
                    >
                      Options
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          SECTION C: DIRECT CONTRACTED HOTELS & RESORTS
          High density cards + 1-Click Quick Modal (Room Categories, Stay T&Cs, Amenities)
      ===================================================================== */}
      {(activeTab === 'all' || activeTab === 'hotels') && (
        <section id="section-hotels" data-aistudio-editable="true" className="px-3 pt-3 pb-5 bg-white border-b border-zinc-200">
          <div className="px-3 mb-2.5">
            <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-l-4 border-emerald-600 p-3 rounded-r-2xl shadow-2xs flex items-center justify-between">
              <div>
                <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block shadow-2xs">
                  Direct Contracts
                </span>
                <h2 className="text-sm sm:text-base font-black text-zinc-950 flex items-center gap-1.5 tracking-tight">
                  <span>🏨 Direct Contracted Hotels &amp; Stays</span>
                </h2>
                <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">Pre-negotiated net rates with instant room categories &amp; policies</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/hotels')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredHotels.slice(0, 4).map((hotel) => (
              <div
                key={hotel.id}
                className="bg-white border border-zinc-200 hover:border-emerald-400 rounded-2xl p-2 flex items-center gap-2.5 shadow-xs"
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
                  <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[7.5px] font-bold px-1 rounded">
                    {hotel.cat || 'Hotel'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-semibold mb-0.5">
                    <MapPin className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{hotel.location || 'Malaysia'}</span>
                  </div>
                  <h4
                    onClick={() => {
                      setActiveHotelModal(hotel);
                      setHotelSelectedRoomIdx(0);
                    }}
                    className="text-xs font-black text-zinc-900 truncate hover:text-emerald-700 cursor-pointer"
                  >
                    {hotel.name}
                  </h4>
                  <div className="text-[9px] text-zinc-500 font-medium truncate mt-0.5">
                    {hotel.roomCategories?.length ? `${hotel.roomCategories.length} Room Types · Free WiFi` : 'Direct Rate'}
                  </div>

                  <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-zinc-100">
                    <span className="text-xs font-black text-zinc-950">
                      RM {hotel.roomCategories?.[0]?.price || hotel.price}
                      <span className="text-[8.5px] font-normal text-zinc-500"> /night</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHotelModal(hotel);
                        setHotelSelectedRoomIdx(0);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Choose Room
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. PARTNER ALLIANCE MARQUEE (Controllable by Admin) */}
      {globalSettings.partnerMarqueeEnabled !== false && (
        <section className="bg-white border-t border-b border-zinc-200 py-3 overflow-hidden mt-2">
          <div className="px-3 mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-700">
              <Award className="w-3 h-3 text-emerald-600" />
              <span>Partner Alliances &amp; Registered Supplier Network</span>
            </div>
          </div>

          <div className="relative w-full overflow-hidden py-0.5">
            <div
              className={`flex gap-3 w-max gfk-marquee-track ${
                globalSettings.partnerMarqueeDirection === 'right'
                  ? `gfk-marquee-right-${globalSettings.partnerMarqueeSpeed || 'normal'}`
                  : `gfk-marquee-left-${globalSettings.partnerMarqueeSpeed || 'normal'}`
              }`}
            >
              {[
                ...(globalSettings.partnerMarqueeLogos || []),
                ...(globalSettings.partnerMarqueeLogos || [])
              ].map((logo, idx) => (
                <div
                  key={`${logo.id}-${idx}`}
                  className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 shrink-0 shadow-2xs"
                >
                  <div className="w-7 h-6 rounded-md bg-zinc-50 border border-zinc-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={logo.logoUrl}
                      alt={logo.name}
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-zinc-900 tracking-tight flex items-center gap-1">
                      <span>{logo.name}</span>
                      {logo.verified && (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[7.5px] text-zinc-500 font-medium leading-none">
                      {logo.subtitle || logo.badgeText || 'Verified'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
                  RM{' '}
                  {((activeTicketModal.ticketCategories?.[ticketSelectedCategoryIdx]?.price || activeTicketModal.price) * ticketPax).toLocaleString()}
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
                  RM{' '}
                  {((activeHotelModal.roomCategories?.[hotelSelectedRoomIdx]?.price || activeHotelModal.price) * hotelNights).toLocaleString()}
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
                </div>
              )}
            </div>

            {/* Sticky Action Footer - 1-Click Instant Package Booking */}
            <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 sticky bottom-0 z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[9px] text-zinc-400 block font-semibold">Total ({packagePax} Travelers)</span>
                <div className="text-base font-black text-white">
                  RM {(activePackageModal.base_price * packagePax).toLocaleString()}
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
    </div>
  );
}
