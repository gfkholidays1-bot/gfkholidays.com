import React, { useState, useMemo } from 'react';
import { Package, TransportRoute, Hotel, Ticket } from '../types';
import {
  MapPin,
  Star,
  Compass,
  Car,
  Building2,
  Ticket as TicketIcon,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Shield,
  Tag,
  ArrowRight,
  Filter,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Wifi,
  Waves,
  FileText,
  Sparkles,
  QrCode,
  Info,
  DollarSign,
  Coffee,
  HelpCircle,
  SlidersHorizontal,
  Plus,
  Minus,
  Layers,
  Palmtree
} from 'lucide-react';

interface CatalogBrowserProps {
  viewType: 'packages' | 'transport' | 'hotels' | 'tickets' | 'restaurants' | 'cruises';
  packages: Package[];
  transport: TransportRoute[];
  hotels: Hotel[];
  tickets: Ticket[];
  userRole: 'guest' | 'customer' | 'agent' | 'admin';
  agentCommission: number;
  onNavigate: (path: string, params?: any) => void;
  imageMap: Record<string, string>;
}

export default function CatalogBrowser({
  viewType,
  packages,
  transport,
  hotels,
  tickets,
  userRole,
  agentCommission,
  onNavigate,
  imageMap
}: CatalogBrowserProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('ALL');
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'price_asc' | 'price_desc' | 'rating'>('recommended');
  
  // Specific filters
  const [selectedHotelClass, setSelectedHotelClass] = useState('ALL');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [selectedBudget, setSelectedBudget] = useState<'ALL' | 'budget' | 'mid' | 'luxury'>('ALL');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [expandedItineraryId, setExpandedItineraryId] = useState<string | null>(null);

  // Self-Search & Custom Filters Drawer (Mobile & Desktop)
  const [customSearchOpen, setCustomSearchOpen] = useState(false);
  const [customTravelDate, setCustomTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [customNights, setCustomNights] = useState(3);
  const [customAdults, setCustomAdults] = useState(2);
  const [customKids, setCustomKids] = useState(0);

  // Interactive Custom Trip Builder Modal (Self-Plan & Build from scratch)
  const [isCustomTripModalOpen, setIsCustomTripModalOpen] = useState(false);
  const [customTripDest, setCustomTripDest] = useState('Kuala Lumpur');
  const [customTripDays, setCustomTripDays] = useState(4);
  const [customTripHotelTier, setCustomTripHotelTier] = useState<'3-Star' | '4-Star' | '5-Star' | 'none'>('4-Star');
  const [customTripVehicle, setCustomTripVehicle] = useState<'sedan' | 'mpv' | 'van' | 'none'>('sedan');
  const [customTripAttractions, setCustomTripAttractions] = useState<string[]>([
    'Petronas Twin Towers Skybridge',
    'Batu Caves & Highland Escapade'
  ]);

  // Quick-Booking / Detail Drawer Modals
  const [activePackageModal, setActivePackageModal] = useState<Package | null>(null);
  const [activeTicketModal, setActiveTicketModal] = useState<Ticket | null>(null);
  const [activeHotelModal, setActiveHotelModal] = useState<Hotel | null>(null);

  // Modal interaction state
  const [modalTab, setModalTab] = useState<'options' | 'terms'>('options');
  const [modalDate, setModalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [modalPax, setModalPax] = useState(2);
  const [modalSelectedVariantIdx, setModalSelectedVariantIdx] = useState(0);
  const [modalNights, setModalNights] = useState(2);
  const [modalSlot, setModalSlot] = useState('10:00 AM');

  // Helper to adjust prices for logged B2B Agent
  const getB2BRate = (basePrice: number) => {
    if (userRole === 'agent') {
      return Math.round(basePrice * (1 - agentCommission / 100));
    }
    return basePrice;
  };

  const resolveImage = (keyOrUrl?: string, fallbackKey = 'kl') => {
    if (!keyOrUrl) return imageMap[fallbackKey] || imageMap.kl;
    if (keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/') || keyOrUrl.startsWith('data:')) {
      return keyOrUrl;
    }
    return imageMap[keyOrUrl] || imageMap[fallbackKey] || imageMap.kl;
  };

  const destinations = [
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

  const travelStyles = [
    { id: 'ALL', label: 'All Styles' },
    { id: 'island', label: 'Islands & Beaches' },
    { id: 'theme', label: 'Theme Parks' },
    { id: 'highland', label: 'Highland Escapes' },
    { id: 'city', label: 'City & Culture' },
    { id: 'wildlife', label: 'Rainforest & Eco' }
  ];

  const matchesDest = (text?: string) => {
    if (selectedDestination === 'ALL') return true;
    if (!text) return false;
    return text.toLowerCase().includes(selectedDestination.toLowerCase());
  };

  const matchesBudget = (price: number) => {
    if (selectedBudget === 'ALL') return true;
    if (selectedBudget === 'budget') return price <= 200;
    if (selectedBudget === 'mid') return price > 200 && price <= 500;
    if (selectedBudget === 'luxury') return price > 500;
    return true;
  };

  const matchesStyle = (item: any) => {
    if (selectedStyle === 'ALL') return true;
    const combined = `${item.title || ''} ${item.name || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
    if (selectedStyle === 'island') return combined.includes('island') || combined.includes('beach') || combined.includes('langkawi') || combined.includes('semporna') || combined.includes('mabul') || combined.includes('snorkel');
    if (selectedStyle === 'theme') return combined.includes('park') || combined.includes('theme') || combined.includes('skyworld') || combined.includes('sunway') || combined.includes('legoland') || combined.includes('aquaria');
    if (selectedStyle === 'highland') return combined.includes('highland') || combined.includes('cameron') || combined.includes('genting') || combined.includes('tea') || combined.includes('cable car');
    if (selectedStyle === 'city') return combined.includes('kuala lumpur') || combined.includes('penang') || combined.includes('melaka') || combined.includes('city') || combined.includes('heritage') || combined.includes('tower');
    if (selectedStyle === 'wildlife') return combined.includes('borneo') || combined.includes('sabah') || combined.includes('kinabalu') || combined.includes('jungle') || combined.includes('rainforest') || combined.includes('wildlife');
    return true;
  };

  // 1. Packages Filter & Sort
  const filteredPackages = useMemo(() => {
    let result = packages.filter(p => {
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = matchesDest(p.destination) || matchesDest(p.title);
      
      let matchDur = true;
      if (selectedDuration === '1-3') matchDur = p.duration_days <= 3;
      else if (selectedDuration === '4-5') matchDur = p.duration_days >= 4 && p.duration_days <= 5;
      else if (selectedDuration === '6+') matchDur = p.duration_days >= 6;

      const matchBud = matchesBudget(p.base_price);
      const matchSty = matchesStyle(p);

      return matchSearch && matchLoc && matchDur && matchBud && matchSty;
    });

    if (selectedSort === 'price_asc') {
      result.sort((a, b) => a.base_price - b.base_price);
    } else if (selectedSort === 'price_desc') {
      result.sort((a, b) => b.base_price - a.base_price);
    } else if (selectedSort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [packages, searchQuery, selectedDestination, selectedDuration, selectedBudget, selectedStyle, selectedSort]);

  // 2. Hotels Filter & Sort
  const hotelClasses = ['ALL', '5-Star', '4-Star', '3-Star', 'Resort', 'Regional'];
  const filteredHotels = useMemo(() => {
    let result = hotels.filter(h => {
      const matchClass = selectedHotelClass === 'ALL' || h.cat === selectedHotelClass;
      const matchSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.location && h.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = matchesDest(h.location) || matchesDest(h.name);
      const matchBud = matchesBudget(h.price);
      const matchSty = matchesStyle(h);
      return matchClass && matchSearch && matchLoc && matchBud && matchSty;
    });

    if (selectedSort === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [hotels, selectedHotelClass, searchQuery, selectedDestination, selectedBudget, selectedStyle, selectedSort]);

  // 3. Tickets Filter & Sort
  const filteredTickets = useMemo(() => {
    let result = tickets.filter(t => {
      const matchSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.location && t.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = matchesDest(t.location) || matchesDest(t.name);
      const matchBud = matchesBudget(t.price);
      const matchSty = matchesStyle(t);
      return matchSearch && matchLoc && matchBud && matchSty;
    });

    if (selectedSort === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [tickets, searchQuery, selectedDestination, selectedBudget, selectedStyle, selectedSort]);

  // 4. Transport Filter & Sort
  const filteredTransport = useMemo(() => {
    return transport.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLoc = matchesDest(t.name);
      return matchSearch && matchLoc;
    });
  }, [transport, searchQuery, selectedDestination]);

  // 5. Restaurants Filter & Sort
  const filteredRestaurants = useMemo(() => {
    return tickets.filter(t => {
      const combined = `${t.name} ${t.location || ''} ${t.info || ''}`.toLowerCase();
      const matchSearch = combined.includes(searchQuery.toLowerCase());
      const matchLoc = matchesDest(t.location) || matchesDest(t.name);
      const matchBud = matchesBudget(t.price);
      return matchSearch && matchLoc && matchBud;
    });
  }, [tickets, searchQuery, selectedDestination, selectedBudget]);

  // 6. Cruises Filter & Sort
  const filteredCruises = useMemo(() => {
    return packages.filter(p => {
      const combined = `${p.title} ${p.description} ${p.destination} ${p.tags.join(' ')}`.toLowerCase();
      const matchSearch = combined.includes(searchQuery.toLowerCase());
      const matchLoc = matchesDest(p.destination) || matchesDest(p.title);
      const matchBud = matchesBudget(p.base_price);
      return matchSearch && matchLoc && matchBud;
    });
  }, [packages, searchQuery, selectedDestination, selectedBudget]);

  // Direct checkout handlers
  const handleCheckoutPackage = (pkg: Package) => {
    const unitPrice = getB2BRate(pkg.base_price);
    const total = unitPrice * modalPax;
    onNavigate('/checkout', {
      product: pkg,
      pax: modalPax,
      date: modalDate,
      timeSlot: 'Morning Tour Departure',
      optionName: `${pkg.duration_days}D/${pkg.duration_days - 1}N Guided Package`,
      displayPrice: unitPrice,
      total,
      commission: 0
    });
    setActivePackageModal(null);
  };

  const handleCheckoutTicket = (tk: Ticket) => {
    const cats = tk.ticketCategories || [];
    const chosenCat = cats[modalSelectedVariantIdx] || {
      name: 'Standard Admission Pass',
      price: tk.price
    };
    const unitPrice = getB2BRate(chosenCat.price || tk.price);
    const total = unitPrice * modalPax;

    onNavigate('/checkout', {
      product: tk,
      pax: modalPax,
      date: modalDate,
      timeSlot: modalSlot,
      optionName: chosenCat.name,
      displayPrice: unitPrice,
      total,
      commission: 0
    });
    setActiveTicketModal(null);
  };

  const handleCheckoutHotel = (ht: Hotel) => {
    const rooms = ht.roomCategories || [];
    const chosenRoom = rooms[modalSelectedVariantIdx] || {
      name: 'Standard Room',
      price: ht.price,
      pax: 2
    };
    const nightlyPrice = getB2BRate(chosenRoom.price || ht.price);
    const total = nightlyPrice * modalNights;

    onNavigate('/checkout', {
      product: ht,
      pax: modalPax,
      date: modalDate,
      timeSlot: `${modalNights} Night(s) Stay`,
      optionName: `${chosenRoom.name} (${modalNights} Nights)`,
      displayPrice: nightlyPrice,
      total,
      commission: 0
    });
    setActiveHotelModal(null);
  };

  // Instant Custom Trip Checkout Generator (Self-Search & Build from Scratch)
  const handleCheckoutCustomTrip = () => {
    const hotelNightly = customTripHotelTier === '5-Star' ? 450 : customTripHotelTier === '4-Star' ? 280 : customTripHotelTier === '3-Star' ? 180 : 0;
    const vehicleCost = customTripVehicle === 'van' ? 380 : customTripVehicle === 'mpv' ? 260 : customTripVehicle === 'sedan' ? 180 : 0;
    const attractionCost = customTripAttractions.length * 75 * (customAdults + customKids);
    const totalDays = customTripDays;
    const totalNights = Math.max(1, totalDays - 1);
    const hotelTotal = hotelNightly * totalNights;
    const baseTotal = hotelTotal + vehicleCost + attractionCost;
    const totalPax = Math.max(1, customAdults + customKids);
    const unitPrice = getB2BRate(Math.round(baseTotal / totalPax));
    const finalTotal = unitPrice * totalPax;

    const customPkg: Package = {
      id: `custom-${Date.now()}`,
      category: 'Packages',
      title: `${totalDays}D/${totalNights}N Tailored ${customTripDest} Package`,
      duration_days: totalDays,
      base_price: unitPrice,
      net_price: Math.round(unitPrice * 0.85),
      original_price: Math.round(unitPrice * 1.25),
      rating: 5.0,
      reviews: 1,
      destination: customTripDest,
      description: `Customized itinerary created for ${customAdults} Adults${customKids > 0 ? `, ${customKids} Children` : ''} including ${customTripHotelTier !== 'none' ? customTripHotelTier + ' Stay' : 'Self accommodation'}, ${customTripVehicle !== 'none' ? customTripVehicle.toUpperCase() + ' Chauffeur' : 'Local transport'}, and ${customTripAttractions.length} attraction experiences.`,
      image: 'kl',
      tags: ['Customized', 'Direct Supplier', customTripDest],
      itinerary: Array.from({ length: totalDays }, (_, i) => ({
        day: i + 1,
        title: i === 0 ? `Arrival in ${customTripDest}` : i === totalDays - 1 ? 'Departure & Airport Transfer' : `Day ${i + 1} Customized Exploration`,
        activities: i === 0 ? 'Airport pickup, hotel check-in, and welcome orientation.' : i === totalDays - 1 ? 'Morning leisure, hotel checkout, and chauffeured airport drop.' : `Explore ${customTripDest} highlights: ${customTripAttractions.slice(0, 2).join(' & ')} with private transfers.`
      })),
      importantInfo: `Custom itinerary created on-demand. Hotel: ${customTripHotelTier}. Vehicle: ${customTripVehicle.toUpperCase()}.`,
      termsAndConditions: 'Free amendment up to 5 days before travel date. Transparent local direct supplier booking.',
      timings: 'Pickup arranged per customer flight schedule.'
    };

    onNavigate('/checkout', {
      product: customPkg,
      pax: totalPax,
      date: customTravelDate,
      timeSlot: 'Custom Tour Schedule',
      optionName: `${totalDays}D Tailored ${customTripDest} (${customAdults} Ad, ${customKids} Ch)`,
      displayPrice: unitPrice,
      total: finalTotal,
      commission: 0
    });
    setIsCustomTripModalOpen(false);
  };

  const hasActiveCustomFilters =
    searchQuery !== '' ||
    selectedDestination !== 'ALL' ||
    selectedBudget !== 'ALL' ||
    selectedStyle !== 'ALL' ||
    selectedHotelClass !== 'ALL' ||
    selectedDuration !== 'ALL';

  const resetAllCustomFilters = () => {
    setSearchQuery('');
    setSelectedDestination('ALL');
    setSelectedBudget('ALL');
    setSelectedStyle('ALL');
    setSelectedHotelClass('ALL');
    setSelectedDuration('ALL');
    setSelectedSort('recommended');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 md:py-16 animate-fade-in w-full font-sans text-zinc-900">
      
      {/* =====================================================================
          1. TOP NAVIGATION SERVICE TABS (MakeMyTrip / Cleartrip / Trip.com style)
      ===================================================================== */}
      <div className="bg-white rounded-2xl p-1.5 sm:p-2 shadow-xs border border-zinc-200 mb-4 sm:mb-6 flex items-center justify-between overflow-x-auto no-scrollbar gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onNavigate('/search')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              viewType === 'packages'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <span>🌴</span>
            <span>Holidays &amp; Packages</span>
            <span className="bg-black/15 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {packages.length}
            </span>
          </button>

          <button
            onClick={() => onNavigate('/tickets')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              viewType === 'tickets'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <TicketIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Attraction Tickets</span>
            <span className="bg-black/15 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {tickets.length}
            </span>
          </button>

          <button
            onClick={() => onNavigate('/hotels')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              viewType === 'hotels'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Hotels &amp; Stays</span>
            <span className="bg-black/15 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {hotels.length}
            </span>
          </button>

          <button
            onClick={() => onNavigate('/transport')}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              viewType === 'transport'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Private Fleet</span>
            <span className="bg-black/15 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {transport.length}
            </span>
          </button>
        </div>

        {userRole === 'agent' && (
          <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[11px] sm:text-xs px-2.5 py-1 sm:py-1.5 rounded-xl shrink-0">
            Agent Net Rates ({agentCommission}% Off)
          </span>
        )}
      </div>

      {/* =====================================================================
          2A. PHONE VIEW OPTIMIZED SEARCH & CUSTOM PRIVILEGE CONSOLE (MOBILE ONLY)
          (Replaces the oversized black box on phone screens with compact OTA controls)
      ===================================================================== */}
      <div className="md:hidden bg-white border border-zinc-200/90 rounded-2xl p-3 shadow-xs mb-4">
        {/* Row 1: Search Input with Instant Clear & Filter Drawer Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${viewType} in Malaysia...`}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-zinc-900 placeholder-zinc-400 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCustomSearchOpen(!customSearchOpen)}
            className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
              customSearchOpen || hasActiveCustomFilters
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
            title="Custom Search Options"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Customer Privilege Fast Actions */}
        <div className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={() => setCustomSearchOpen(!customSearchOpen)}
            className="flex-1 py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Search by My Own Criteria</span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${customSearchOpen ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCustomTripModalOpen(true)}
            className="py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Build Custom Trip</span>
          </button>
        </div>

        {/* Expandable Custom Search & Filter Drawer (Dates, Guests, Budget, Travel Theme) */}
        {customSearchOpen && (
          <div className="mt-3 pt-3 border-t border-zinc-100 space-y-3 animate-fade-in text-xs">
            {/* Custom Dates & Length */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/70">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">
                  Travel Date
                </label>
                <input
                  type="date"
                  value={customTravelDate}
                  onChange={(e) => setCustomTravelDate(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-500 block mb-1">
                  Stay Duration
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCustomNights(n)}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-bold border transition-all ${
                        customNights === n
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {n}N
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Travelers Stepper */}
            <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-500 block">Travelers</span>
                <span className="font-extrabold text-zinc-900 text-xs">
                  {customAdults} Adults{customKids > 0 ? `, ${customKids} Kids` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-bold mr-1">Adults:</span>
                <button
                  type="button"
                  onClick={() => setCustomAdults(Math.max(1, customAdults - 1))}
                  className="w-6 h-6 rounded-md bg-white border border-zinc-300 font-bold text-xs flex items-center justify-center text-zinc-700"
                >
                  -
                </button>
                <span className="font-bold text-xs w-4 text-center">{customAdults}</span>
                <button
                  type="button"
                  onClick={() => setCustomAdults(customAdults + 1)}
                  className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Budget Filters */}
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1.5">
                Budget / Price Filter
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'ALL', label: 'Any' },
                  { id: 'budget', label: '< RM200' },
                  { id: 'mid', label: '200-500' },
                  { id: 'luxury', label: 'RM500+' }
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBudget(b.id as any)}
                    className={`py-1 rounded-lg text-[10px] font-bold border transition-all text-center ${
                      selectedBudget === b.id
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Themes */}
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-500 block mb-1.5">
                Travel Style &amp; Preference
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {travelStyles.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStyle(s.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border shrink-0 transition-all ${
                      selectedStyle === s.id
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={resetAllCustomFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setCustomSearchOpen(false)}
                className="px-3 py-1 bg-zinc-900 text-white rounded-lg text-[11px] font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Row 3: Horizontal Destination Chips (Compact & Thumb Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 border-t border-zinc-100 mt-2.5">
          {destinations.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDestination(d.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                selectedDestination === d.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 border border-zinc-200/80 hover:bg-zinc-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Row 4: Category Specific Filters & Sorter */}
        <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-zinc-100 text-xs">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {viewType === 'hotels' && (
              hotelClasses.slice(0, 4).map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedHotelClass(c)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-all ${
                    selectedHotelClass === c
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {c}
                </button>
              ))
            )}

            {viewType === 'packages' && (
              [
                { id: 'ALL', label: 'All Days' },
                { id: '1-3', label: '1-3D' },
                { id: '4-5', label: '4-5D' },
                { id: '6+', label: '6D+' }
              ].map(dur => (
                <button
                  key={dur.id}
                  onClick={() => setSelectedDuration(dur.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-all ${
                    selectedDuration === dur.id
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {dur.label}
                </button>
              ))
            )}
          </div>

          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value as any)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-lg px-2 py-1 text-[10px] font-bold outline-none shrink-0"
          >
            <option value="recommended">Recommended</option>
            <option value="price_asc">Price: Low-High</option>
            <option value="price_desc">Price: High-Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        {/* Row 5: Results Feedback Bar with 1-click Clear */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-100 text-[10px] text-zinc-500 font-semibold">
          <span>
            Showing{' '}
            <strong className="text-zinc-900 font-extrabold">
              {viewType === 'packages' ? filteredPackages.length : viewType === 'tickets' ? filteredTickets.length : viewType === 'hotels' ? filteredHotels.length : filteredTransport.length}
            </strong>{' '}
            results {selectedDestination !== 'ALL' ? `in ${selectedDestination}` : 'across Malaysia'}
          </span>
          {hasActiveCustomFilters && (
            <button
              type="button"
              onClick={resetAllCustomFilters}
              className="text-emerald-700 font-bold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          2B. DESKTOP VIEW CONTROL BAR (Enhanced with Self-Search Privilege)
      ===================================================================== */}
      <div className="hidden md:block bg-zinc-950 text-white rounded-3xl p-6 mb-8 border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                100% Direct Malaysia Tourism Supplier
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              {viewType === 'packages' && 'Malaysia Tour Packages & Holidays'}
              {viewType === 'tickets' && 'Attraction Gate Passes & Instant QR E-Tickets'}
              {viewType === 'hotels' && 'Direct Contracted Hotels & Luxury Resorts'}
              {viewType === 'transport' && 'Airport Transfers & Private Chauffeur Fleet'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
              Instant confirmation, transparent local pricing, child policies, and official terms
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCustomTripModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Design Custom Trip</span>
            </button>

            {/* Quick Search Field */}
            <div className="relative w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, attraction, hotel..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Destination Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar border-t border-zinc-800/80 pt-3">
          <span className="text-xs font-bold text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            City:
          </span>
          {destinations.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDestination(d.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                selectedDestination === d.id
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters & Sorter Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Specific Sub-filter */}
            {viewType === 'hotels' && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-bold">Class:</span>
                {hotelClasses.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedHotelClass(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedHotelClass === c
                        ? 'bg-white text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {viewType === 'packages' && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-bold">Duration:</span>
                {[
                  { id: 'ALL', label: 'Any Days' },
                  { id: '1-3', label: '1 - 3 Days' },
                  { id: '4-5', label: '4 - 5 Days' },
                  { id: '6+', label: '6+ Days' }
                ].map(dur => (
                  <button
                    key={dur.id}
                    onClick={() => setSelectedDuration(dur.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedDuration === dur.id
                        ? 'bg-white text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            )}

            {/* Budget filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-bold">Budget:</span>
              {[
                { id: 'ALL', label: 'Any' },
                { id: 'budget', label: '< RM 200' },
                { id: 'mid', label: 'RM 200 - 500' },
                { id: 'luxury', label: 'RM 500+' }
              ].map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBudget(b.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedBudget === b.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-bold">Sort By:</span>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-700 text-white rounded-xl px-2.5 py-1 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. HOLIDAYS & TOUR PACKAGES PAGE (MakeMyTrip / Cleartrip / Trip.com style)
      ===================================================================== */}
      {viewType === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">
              Showing {filteredPackages.length} Malaysia Holiday Packages
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Full Day-by-Day Itineraries &amp; T&amp;Cs Available
            </span>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200 p-8 shadow-xs">
              <Compass className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-lg font-black text-zinc-900">No holiday packages match your filters</h3>
              <p className="text-zinc-500 text-xs mt-1">Try resetting destination or duration filters</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedDestination('ALL');
                  setSelectedDuration('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-zinc-950 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPackages.map((pkg) => {
                const img = resolveImage(pkg.image, 'langkawi');
                const displayPrice = getB2BRate(pkg.base_price);
                const origPrice = pkg.original_price || Math.round(pkg.base_price * 1.25);
                const isExpanded = expandedItineraryId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-3xl border border-zinc-200/90 hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col lg:flex-row"
                  >
                    {/* Media Column */}
                    <div className="relative w-full lg:w-72 h-52 lg:h-auto shrink-0 bg-zinc-950">
                      <img
                        src={img}
                        alt={pkg.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 bg-zinc-950/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{pkg.rating || 4.9}</span>
                        <span className="text-zinc-400">({pkg.reviews || 240})</span>
                      </div>
                      <div className="absolute top-3 right-3 bg-amber-500 text-zinc-950 font-black text-[10px] px-2 py-0.5 rounded shadow-sm">
                        {pkg.duration_days}D/{pkg.duration_days - 1}N
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{pkg.destination}</span>
                      </div>
                    </div>

                    {/* Middle Info Column */}
                    <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {pkg.tags.map((t, idx) => (
                            <span key={idx} className="bg-zinc-100 text-zinc-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                              {t}
                            </span>
                          ))}
                          <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Transfers Included
                          </span>
                        </div>

                        <h2 className="text-base sm:text-xl font-black text-zinc-950 leading-snug">
                          {pkg.title}
                        </h2>

                        <p className="text-xs text-zinc-600 font-medium leading-relaxed mt-1 line-clamp-2">
                          {pkg.description}
                        </p>

                        {/* Inclusions Strip (MakeMyTrip style) */}
                        <div className="mt-3 py-2 px-3 bg-zinc-50 border border-zinc-100 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-semibold text-zinc-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Hotel Stay</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Airport Cabs</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Breakfast</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TicketIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>Entry Passes</span>
                          </div>
                        </div>

                        {/* Day-by-Day Accordion Toggle */}
                        {pkg.itinerary && pkg.itinerary.length > 0 && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setExpandedItineraryId(isExpanded ? null : pkg.id)}
                              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Day-by-Day Breakdown' : `Preview ${pkg.itinerary.length}-Day Itinerary Breakdown`}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-2.5 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5 animate-fade-in text-xs">
                                {pkg.itinerary.map((day, idx) => (
                                  <div key={idx} className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                      {day.day || idx + 1}
                                    </span>
                                    <div>
                                      <h4 className="font-extrabold text-zinc-900">{day.title}</h4>
                                      <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">{day.activities}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Terms & Conditions preview note */}
                      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {pkg.termsAndConditions ? 'Flexible Cancellation & Local DMC Guarantee' : '100% Verified Local Operator'}
                        </span>
                        <span className="text-zinc-400">
                          {pkg.childPolicy || 'Child discounts available'}
                        </span>
                      </div>
                    </div>

                    {/* Right Pricing & Quick Book Column */}
                    <div className="p-4 sm:p-6 bg-zinc-50 border-t lg:border-t-0 lg:border-l border-zinc-200/80 w-full lg:w-64 shrink-0 flex flex-col justify-between">
                      <div>
                        <div className="text-left lg:text-right">
                          <span className="text-xs text-zinc-400 line-through font-semibold block">
                            RM {origPrice.toLocaleString()}
                          </span>
                          <div className="text-2xl font-black text-zinc-950 tracking-tight leading-none mt-0.5">
                            RM {displayPrice.toLocaleString()}
                          </div>
                          <span className="text-[11px] text-zinc-500 font-medium">per person (twin-sharing)</span>
                        </div>

                        <div className="mt-3 bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-[10px] font-extrabold px-2.5 py-1 rounded-lg text-center">
                          Includes All Sightseeing &amp; Hotel
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActivePackageModal(pkg);
                            setModalTab('options');
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Select Dates &amp; Book</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomTripDest(pkg.destination || 'Kuala Lumpur');
                              setIsCustomTripModalOpen(true);
                            }}
                            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-extrabold text-[11px] py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                            title="Customize this itinerary with your own dates and hotel"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Customize</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePackageModal(pkg);
                              setModalTab('terms');
                            }}
                            className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-extrabold text-[11px] py-1.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-zinc-500" />
                            <span>Policies</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          4. ATTRACTION TICKETS PAGE (Trip.com / MakeMyTrip style)
      ===================================================================== */}
      {viewType === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">
              Showing {filteredTickets.length} Attraction Tickets &amp; E-Passes
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              <span>Instant Gate Turnstile Barcode Scan</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTickets.map((tk) => {
              const img = resolveImage(tk.image, 'petronas');
              const displayPrice = getB2BRate(tk.price);
              const origPrice = tk.originalPrice || Math.round(tk.price * 1.25);
              const hasVariants = tk.ticketCategories && tk.ticketCategories.length > 0;

              return (
                <div
                  key={tk.id}
                  className="bg-white rounded-3xl border border-zinc-200/90 hover:border-purple-500/50 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Image Banner with Gate QR Badges */}
                    <div className="relative h-48 bg-zinc-950 overflow-hidden">
                      <img
                        src={img}
                        alt={tk.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 bg-purple-950/85 backdrop-blur-xs text-purple-200 border border-purple-700/60 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-purple-400" />
                        <span>Instant Gate QR</span>
                      </div>
                      <div className="absolute top-3 right-3 bg-white/95 text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{tk.rating || 4.8}</span>
                        <span className="text-zinc-400">({tk.reviews || 420})</span>
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{tk.location || 'Malaysia'}</span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5">
                      <h3 className="font-black text-base text-zinc-950 leading-snug line-clamp-2">
                        {tk.name}
                      </h3>

                      {/* Timings & Operational Info */}
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{tk.timings || tk.addInfo || 'Daily 09:00 AM - 09:00 PM'}</span>
                      </div>

                      {/* Variants Preview Box (MakeMyTrip / Trip.com style) */}
                      <div className="mt-3 p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                          Available Ticket Options &amp; Rates:
                        </span>
                        {(hasVariants ? tk.ticketCategories! : [
                          { name: 'Standard Gate Pass', price: tk.price, description: 'Direct turnstile entry' }
                        ]).slice(0, 3).map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-zinc-100 last:border-0">
                            <span className="font-bold text-zinc-800 truncate pr-2">{cat.name}</span>
                            <span className="font-black text-purple-700 shrink-0">RM {getB2BRate(cat.price)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Cancellation & T&C Pill */}
                      <div className="mt-3 flex items-center justify-between text-[10.5px]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {tk.info || 'Valid 90 Days'}
                        </span>
                        <span className="text-zinc-400 font-medium">Turnstile Barcode</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer & Action */}
                  <div className="p-5 pt-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 line-through font-semibold block leading-none">
                        RM {origPrice}
                      </span>
                      <div className="text-xl font-black text-zinc-950 leading-none mt-1">
                        RM {displayPrice}
                        <span className="text-[10px] font-normal text-zinc-400"> /pass</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTicketModal(tk);
                          setModalTab('terms');
                        }}
                        className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs py-2 px-2.5 rounded-xl cursor-pointer"
                        title="View Terms & Conditions"
                      >
                        T&amp;Cs
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTicketModal(tk);
                          setModalTab('options');
                          setModalSelectedVariantIdx(0);
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-2 px-3 rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>Select Option</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          5. HOTELS & STAYS PAGE (MakeMyTrip / Akbar Travels style)
      ===================================================================== */}
      {viewType === 'hotels' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">
              Showing {filteredHotels.length} Contracted Hotels &amp; Resorts
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Guaranteed Direct Allotments · Free Cancellation Available
            </span>
          </div>

          <div className="space-y-4">
            {filteredHotels.map((ht) => {
              const img = resolveImage(ht.image, 'hotel');
              const displayPrice = getB2BRate(ht.price);
              const origPrice = ht.originalPrice || Math.round(ht.price * 1.3);

              return (
                <div
                  key={ht.id}
                  className="bg-white rounded-3xl border border-zinc-200/90 hover:border-emerald-500/50 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row"
                >
                  {/* Hotel Photo */}
                  <div className="relative w-full md:w-80 h-52 md:h-auto shrink-0 bg-zinc-950">
                    <img
                      src={img}
                      alt={ht.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-zinc-950/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{ht.rating || 4.7}</span>
                      <span className="text-zinc-400">({ht.reviews || 290})</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
                      {ht.cat || 'Direct Contract'}
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>{ht.location || 'Malaysia'}</span>
                    </div>
                  </div>

                  {/* Hotel Details & Room Options */}
                  <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {ht.contractBadge || 'Direct DMC Allotment'}
                        </span>
                        <span className="text-[10px] text-zinc-400">•</span>
                        <span className="text-[11px] font-bold text-zinc-500">
                          {ht.timings || 'Check-in: 3:00 PM | Check-out: 12:00 PM'}
                        </span>
                      </div>

                      <h2 className="text-lg sm:text-xl font-black text-zinc-950 leading-snug">
                        {ht.name}
                      </h2>

                      {/* Amenities Icons Strip */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-zinc-600">
                        <span className="flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Free WiFi
                        </span>
                        <span className="flex items-center gap-1">
                          <Waves className="w-3.5 h-3.5 text-blue-600" /> Swimming Pool
                        </span>
                        <span className="flex items-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" /> Breakfast Available
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-cyan-600" /> 24/7 Security
                        </span>
                      </div>

                      {/* Room Categories preview (MakeMyTrip style) */}
                      <div className="mt-3 p-3 bg-zinc-50 border border-zinc-200/70 rounded-2xl space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                          Contracted Room Categories:
                        </span>
                        {(ht.roomCategories && ht.roomCategories.length > 0 ? ht.roomCategories : [
                          { name: 'Standard Room', price: ht.price, pax: 2 }
                        ]).slice(0, 3).map((room, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-zinc-200/40 last:border-0">
                            <div>
                              <span className="font-bold text-zinc-800">{room.name}</span>
                              <span className="text-[10px] text-zinc-400 ml-2">Max {room.pax || 2} Pax</span>
                            </div>
                            <span className="font-black text-emerald-700">RM {getB2BRate(room.price)} /night</span>
                          </div>
                        ))}
                      </div>

                      {/* Policies note */}
                      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {ht.termsAndConditions ? 'Free Cancellation up to 48 Hours' : 'Guaranteed Hotel Allocation'}
                        </span>
                        <span className="text-zinc-400">
                          {ht.childPolicy || 'Kids stay free with parents'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Booking Column */}
                  <div className="p-4 sm:p-6 bg-zinc-50 border-t md:border-t-0 md:border-l border-zinc-200/80 w-full md:w-60 shrink-0 flex flex-col justify-between">
                    <div className="text-left md:text-right">
                      <span className="text-xs text-zinc-400 line-through font-semibold block">
                        RM {origPrice}
                      </span>
                      <div className="text-2xl font-black text-zinc-950 leading-none mt-0.5">
                        RM {displayPrice}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-medium">per room / night</span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveHotelModal(ht);
                          setModalTab('options');
                          setModalSelectedVariantIdx(0);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Choose Room &amp; Book</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveHotelModal(ht);
                          setModalTab('terms');
                        }}
                        className="w-full bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Stay Policies &amp; T&amp;C</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          6. TRANSPORT FLEET VIEW
      ===================================================================== */}
      {viewType === 'transport' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">
              Showing {filteredTransport.length} Private Transfer Routes &amp; Chauffeur Charters
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
              Flight Tracking Included · Fixed Fares (No Surge)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTransport.map(tr => {
              const img = resolveImage(tr.image, 'transfer');
              return (
                <div
                  key={tr.id}
                  className="bg-white rounded-3xl border border-zinc-200/90 hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-zinc-950 overflow-hidden">
                      <img
                        src={img}
                        alt={tr.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex items-end">
                        <h3 className="font-black text-white text-sm leading-snug">{tr.name}</h3>
                      </div>
                    </div>

                    <div className="p-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                        Vehicle Tariffs (All Tolls &amp; Fuel Included):
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/60 text-center">
                          <span className="text-[10px] font-bold text-zinc-500 block">Car (1-3 Pax)</span>
                          <span className="font-black text-zinc-900 mt-0.5 block">RM {getB2BRate(tr.car)}</span>
                        </div>
                        <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/60 text-center">
                          <span className="text-[10px] font-bold text-zinc-500 block">MPV (4-5 Pax)</span>
                          <span className="font-black text-zinc-900 mt-0.5 block">RM {getB2BRate(tr.mpv)}</span>
                        </div>
                        <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/60 text-center">
                          <span className="text-[10px] font-bold text-zinc-500 block">Van-7 (6-7 Pax)</span>
                          <span className="font-black text-zinc-900 mt-0.5 block">RM {getB2BRate(tr.van7)}</span>
                        </div>
                        <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/60 text-center">
                          <span className="text-[10px] font-bold text-zinc-500 block">Van-13 (8-13 Pax)</span>
                          <span className="font-black text-zinc-900 mt-0.5 block">RM {getB2BRate(tr.van13)}</span>
                        </div>
                      </div>

                      {tr.instructions && (
                        <p className="text-[11px] text-zinc-500 font-medium mt-3 line-clamp-2">
                          {tr.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">Door-to-Door</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('/package', { id: tr.id })}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-2 px-3.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <span>Book Transfer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          7. RESTAURANTS & DINING VIEW
      ===================================================================== */}
      {viewType === 'restaurants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">
              Showing {filteredRestaurants.length} Restaurant Dining &amp; High-Tea Passes
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
              Instant Table QR · Michelin Trails &amp; Buffets
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRestaurants.map(tk => {
              const img = resolveImage(tk.image, 'petronas');
              const displayPrice = getB2BRate(tk.price);
              return (
                <div
                  key={tk.id}
                  onClick={() => {
                    setActiveTicketModal(tk);
                    setModalSelectedVariantIdx(0);
                  }}
                  className="bg-white rounded-3xl border border-zinc-200/90 hover:border-rose-500/50 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="relative h-48 bg-zinc-950 overflow-hidden">
                      <img
                        src={img}
                        alt={tk.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex items-end">
                        <div>
                          <span className="bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase mb-1 inline-block">Dining Pass</span>
                          <h3 className="font-black text-white text-sm leading-snug">{tk.name}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{tk.location || 'Kuala Lumpur'}</span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-2">
                        {tk.info || tk.instructions || 'Authentic Malaysian dining experience with instant voucher.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block leading-none">Starting From</span>
                      <span className="text-base font-extrabold text-zinc-950">RM {displayPrice.toLocaleString()} <span className="text-xs font-normal text-zinc-500">/pax</span></span>
                    </div>
                    <span className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs py-2 px-3.5 rounded-xl shadow-xs inline-flex items-center gap-1">
                      <span>Reserve Table</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          8. CRUISES & YACHT CHARTERS VIEW
      ===================================================================== */}
      {viewType === 'cruises' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">
              Showing {filteredCruises.length} Sunset Cruises &amp; Yacht Charters
            </span>
            <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full">
              Langkawi Andaman Sea &amp; Marina Charters
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCruises.map(pkg => {
              const img = resolveImage(pkg.image, 'langkawi');
              const displayPrice = getB2BRate(pkg.base_price);
              return (
                <div
                  key={pkg.id}
                  onClick={() => onNavigate('/package', { id: pkg.id })}
                  className="bg-white rounded-3xl border border-zinc-200/90 hover:border-cyan-500/50 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="relative h-48 bg-zinc-950 overflow-hidden">
                      <img
                        src={img}
                        alt={pkg.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex items-end">
                        <div>
                          <span className="bg-cyan-600 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase mb-1 inline-block">Cruise Experience</span>
                          <h3 className="font-black text-white text-sm leading-snug">{pkg.title}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span className="truncate">{pkg.destination}</span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-2">
                        {pkg.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 block leading-none">Starting From</span>
                      <span className="text-base font-extrabold text-zinc-950">RM {displayPrice.toLocaleString()} <span className="text-xs font-normal text-zinc-500">/pax</span></span>
                    </div>
                    <span className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs py-2 px-3.5 rounded-xl shadow-xs inline-flex items-center gap-1">
                      <span>Book Cruise</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE QUICK BOOKING MODALS FOR PACKAGES, TICKETS & HOTELS
      ===================================================================== */}
      {/* 1. PACKAGE DETAIL & QUICK BOOK MODAL */}
      {activePackageModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl h-[88vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden text-zinc-900 shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-start justify-between bg-zinc-50 shrink-0">
              <div>
                <span className="bg-amber-500 text-zinc-950 font-black text-[10px] px-2 py-0.5 rounded uppercase">
                  {activePackageModal.duration_days}D/{activePackageModal.duration_days - 1}N Guided Tour
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-950 mt-1 line-clamp-1">
                  {activePackageModal.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{activePackageModal.destination}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePackageModal(null)}
                className="p-1.5 rounded-full bg-zinc-200 text-zinc-600 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-zinc-200 bg-zinc-100 px-4 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('options')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer ${
                  modalTab === 'options' ? 'border-amber-600 text-amber-800' : 'border-transparent text-zinc-500'
                }`}
              >
                1. Itinerary &amp; Dates
              </button>
              <button
                type="button"
                onClick={() => setModalTab('terms')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer ${
                  modalTab === 'terms' ? 'border-amber-600 text-amber-800' : 'border-transparent text-zinc-500'
                }`}
              >
                2. Inclusions &amp; T&amp;C
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 text-xs">
              {modalTab === 'options' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Select Travel Date
                      </label>
                      <input
                        type="date"
                        value={modalDate}
                        onChange={(e) => setModalDate(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-emerald-600" /> Number of Travelers (Pax)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModalPax(Math.max(1, modalPax - 1))}
                          className="w-8 h-8 rounded-lg bg-zinc-200 font-black text-sm flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-black text-sm w-8 text-center">{modalPax}</span>
                        <button
                          type="button"
                          onClick={() => setModalPax(modalPax + 1)}
                          className="w-8 h-8 rounded-lg bg-emerald-600 font-black text-white text-sm flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-black text-zinc-900 text-sm mb-2">Day-by-Day Itinerary</h4>
                    <div className="space-y-2">
                      {(activePackageModal.itinerary && activePackageModal.itinerary.length > 0
                        ? activePackageModal.itinerary
                        : [
                            { day: 1, title: 'Arrival & Welcome Dinner', activities: 'Airport pickup and transfer to hotel.' },
                            { day: 2, title: 'Guided Tour', activities: 'Full day city tour and key sights.' }
                          ]
                      ).map((day, idx) => (
                        <div key={idx} className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black text-[10px] flex items-center justify-center">
                              {day.day || idx + 1}
                            </span>
                            <span className="font-bold text-zinc-900 text-xs">{day.title}</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 pl-7 mt-1">{day.activities}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <h4 className="font-black text-emerald-900 text-xs mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Package Inclusions
                    </h4>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      {activePackageModal.instructions ||
                        'Includes roundtrip airport transfers, daily gourmet breakfast, accommodations, licensed guide, and attraction admission.'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                    <h4 className="font-black text-zinc-900 text-xs mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-700" /> Terms and Conditions (T&amp;C)
                    </h4>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      {activePackageModal.termsAndConditions ||
                        'Free cancellation up to 7 days prior to departure. Deposit required to secure booking. Sightseeing excursions subject to local weather safety.'}
                    </p>
                  </div>

                  {activePackageModal.childPolicy && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                      <h4 className="font-bold text-amber-900 text-xs mb-1">Child Policy</h4>
                      <p className="text-[11px] text-amber-800">{activePackageModal.childPolicy}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Safe-Area Footer (Never Clipped by Bottom Bar) */}
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 sm:p-5 flex items-center justify-between shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[10px] text-zinc-500 block font-semibold">Total Price ({modalPax} Travelers)</span>
                <span className="text-xl font-black text-zinc-950">
                  RM {(getB2BRate(activePackageModal.base_price) * modalPax).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCheckoutPackage(activePackageModal)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Proceed to Booking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TICKET OPTION & QUICK BOOK MODAL */}
      {activeTicketModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl h-[88vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden text-zinc-900 shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-start justify-between bg-zinc-50 shrink-0">
              <div>
                <span className="bg-purple-600 text-white font-black text-[10px] px-2 py-0.5 rounded">
                  Instant Gate QR E-Ticket
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-950 mt-1 line-clamp-1">
                  {activeTicketModal.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{activeTicketModal.location}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicketModal(null)}
                className="p-1.5 rounded-full bg-zinc-200 text-zinc-600 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-zinc-200 bg-zinc-100 px-4 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('options')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer ${
                  modalTab === 'options' ? 'border-purple-600 text-purple-800' : 'border-transparent text-zinc-500'
                }`}
              >
                1. Select Variant &amp; Date
              </button>
              <button
                type="button"
                onClick={() => setModalTab('terms')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer ${
                  modalTab === 'terms' ? 'border-purple-600 text-purple-800' : 'border-transparent text-zinc-500'
                }`}
              >
                2. Terms &amp; Conditions (T&amp;C)
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 text-xs">
              {modalTab === 'options' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider mb-1.5">
                      Select Ticket Variant / Category
                    </label>
                    <div className="space-y-1.5">
                      {(activeTicketModal.ticketCategories && activeTicketModal.ticketCategories.length > 0
                        ? activeTicketModal.ticketCategories
                        : [
                            { name: 'Standard Gate Pass', price: activeTicketModal.price, description: 'Direct turnstile entry' }
                          ]
                      ).map((cat, idx) => (
                        <div
                          key={idx}
                          onClick={() => setModalSelectedVariantIdx(idx)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            modalSelectedVariantIdx === idx
                              ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/20'
                              : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-bold text-zinc-900 text-xs">{cat.name}</div>
                            {cat.description && (
                              <div className="text-[10px] text-zinc-500 mt-0.5">{cat.description}</div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-purple-700">RM {getB2BRate(cat.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Visit Date
                      </label>
                      <input
                        type="date"
                        value={modalDate}
                        onChange={(e) => setModalDate(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Number of Passes
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setModalPax(Math.max(1, modalPax - 1))}
                          className="w-8 h-8 rounded-lg bg-zinc-200 font-black text-sm flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-black text-sm w-6 text-center">{modalPax}</span>
                        <button
                          type="button"
                          onClick={() => setModalPax(modalPax + 1)}
                          className="w-8 h-8 rounded-lg bg-purple-600 font-black text-white text-sm flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                      Preferred Entry Time Slot
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['09:30 AM', '11:30 AM', '02:00 PM', '04:30 PM'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setModalSlot(s)}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            modalSlot === s
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white border-zinc-200 text-zinc-700'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl">
                    <h4 className="font-black text-purple-900 text-xs mb-1 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-purple-700" />
                      Gate QR Redemption &amp; T&amp;Cs
                    </h4>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      {activeTicketModal.termsAndConditions ||
                        'Pass valid for 90 days from purchase date. Scan mobile QR barcode directly at the turnstiles. Non-refundable once scanned or redeemed at gates.'}
                    </p>
                  </div>

                  {activeTicketModal.childPolicy && (
                    <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                      <h4 className="font-bold text-zinc-900 text-xs mb-1">Child Policy</h4>
                      <p className="text-[11px] text-zinc-600">{activeTicketModal.childPolicy}</p>
                    </div>
                  )}

                  {activeTicketModal.instructions && (
                    <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                      <h4 className="font-bold text-zinc-900 text-xs mb-1">Redemption Notes</h4>
                      <p className="text-[11px] text-zinc-600">{activeTicketModal.instructions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Safe-Area Footer (Never Clipped by Bottom Bar) */}
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 sm:p-5 flex items-center justify-between shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[10px] text-zinc-500 block font-semibold">Total Price ({modalPax} Passes)</span>
                <span className="text-xl font-black text-zinc-950">
                  RM{' '}
                  {(
                    getB2BRate(
                      activeTicketModal.ticketCategories?.[modalSelectedVariantIdx]?.price ||
                        activeTicketModal.price
                    ) * modalPax
                  ).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCheckoutTicket(activeTicketModal)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-3 px-5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Instant Book Passes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. HOTEL ROOM OPTION & QUICK BOOK MODAL */}
      {activeHotelModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl h-[88vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden text-zinc-900 shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-start justify-between bg-zinc-50 shrink-0">
              <div>
                <span className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded">
                  {activeHotelModal.cat || 'Contracted Stay'}
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-950 mt-1 line-clamp-1">
                  {activeHotelModal.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{activeHotelModal.location}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveHotelModal(null)}
                className="p-1.5 rounded-full bg-zinc-200 text-zinc-600 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-zinc-200 bg-zinc-100 px-4 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('options')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer ${
                  modalTab === 'options' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-zinc-500'
                }`}
              >
                1. Choose Room Type &amp; Nights
              </button>
              <button
                type="button"
                onClick={() => setModalTab('terms')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer ${
                  modalTab === 'terms' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-zinc-500'
                }`}
              >
                2. Stay Policies &amp; T&amp;C
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 flex-1 text-xs">
              {modalTab === 'options' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider mb-1.5">
                      Select Room Category
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
                          onClick={() => setModalSelectedVariantIdx(idx)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            modalSelectedVariantIdx === idx
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-bold text-zinc-900 text-xs">{room.name}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              Capacity: Max {room.pax || 2} Guests • Twin/King Bed
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-emerald-700">
                              RM {getB2BRate(room.price)}
                            </span>
                            <span className="text-[9px] text-zinc-400 block">/night</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Check-in Date
                      </label>
                      <input
                        type="date"
                        value={modalDate}
                        onChange={(e) => setModalDate(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Nights Count
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setModalNights(n)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              modalNights === n
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white border-zinc-200 text-zinc-700'
                            }`}
                          >
                            {n}N
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <h4 className="font-black text-emerald-900 text-xs mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      Stay Policies &amp; T&amp;C
                    </h4>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      {activeHotelModal.termsAndConditions ||
                        'Free cancellation up to 48 hours prior to check-in. Tourism tax of RM10/room/night applies to non-Malaysian passports payable at hotel reception.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <span className="text-zinc-500 font-bold block text-[10px]">Check-in Time</span>
                      <span className="font-black text-zinc-900 text-xs mt-0.5 block">From 3:00 PM</span>
                    </div>
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <span className="text-zinc-500 font-bold block text-[10px]">Check-out Time</span>
                      <span className="font-black text-zinc-900 text-xs mt-0.5 block">Until 12:00 PM</span>
                    </div>
                  </div>

                  {activeHotelModal.childPolicy && (
                    <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                      <h4 className="font-bold text-zinc-900 text-xs mb-1">Child Policy</h4>
                      <p className="text-[11px] text-zinc-600">{activeHotelModal.childPolicy}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Safe-Area Footer (Never Clipped by Bottom Bar) */}
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 sm:p-5 flex items-center justify-between shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[10px] text-zinc-500 block font-semibold">Total Price ({modalNights} Nights)</span>
                <span className="text-xl font-black text-zinc-950">
                  RM{' '}
                  {(
                    getB2BRate(
                      activeHotelModal.roomCategories?.[modalSelectedVariantIdx]?.price ||
                        activeHotelModal.price
                    ) * modalNights
                  ).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCheckoutHotel(activeHotelModal)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Reserve Room Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. CUSTOM TRIP BUILDER MODAL (Full Customer Privilege to Self-Plan)
      ===================================================================== */}
      {isCustomTripModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl h-[90vh] sm:h-auto sm:max-h-[88vh] flex flex-col overflow-hidden text-zinc-900 shadow-2xl">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-start justify-between bg-zinc-50 shrink-0">
              <div>
                <span className="bg-emerald-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Self-Plan &amp; Build Custom Package
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-950 mt-1">
                  Design Your Tailored Malaysia Trip
                </h3>
                <p className="text-xs text-zinc-500">
                  Select destination, dates, hotel tier, private car, and attraction passes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomTripModalOpen(false)}
                className="p-1.5 rounded-full bg-zinc-200 text-zinc-600 hover:text-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Configuration Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 flex-1 text-xs">
              {/* Step 1: Destination Selection */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider mb-1.5">
                  1. Choose Destination
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Kuala Lumpur',
                    'Langkawi',
                    'Penang',
                    'Sabah & Borneo',
                    'Genting Highlands',
                    'Cameron Highlands'
                  ].map((dest) => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => setCustomTripDest(dest)}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        customTripDest === dest
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 mb-1 text-emerald-600" />
                      <span>{dest}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Dates, Days & Travelers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customTravelDate}
                    onChange={(e) => setCustomTravelDate(e.target.value)}
                    className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-2 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                    Trip Length
                  </label>
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 5, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCustomTripDays(d)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                          customTripDays === d
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-zinc-200 text-zinc-700'
                        }`}
                      >
                        {d}D
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                    Travelers
                  </label>
                  <div className="flex items-center justify-between bg-white border border-zinc-300 rounded-xl p-1.5">
                    <span className="font-extrabold text-xs pl-1">
                      {customAdults} Ad{customKids > 0 ? `, ${customKids} Ch` : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCustomAdults(Math.max(1, customAdults - 1))}
                        className="w-6 h-6 rounded bg-zinc-100 font-bold text-xs"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomAdults(customAdults + 1)}
                        className="w-6 h-6 rounded bg-emerald-600 text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Accommodation Tier */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider mb-1.5">
                  2. Select Accommodation Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Self Arranged', price: 'RM 0', desc: 'No hotel needed' },
                    { id: '3-Star', label: '3-Star Comfort', price: 'RM 180', desc: 'ibis / Mercure' },
                    { id: '4-Star', label: '4-Star Premium', price: 'RM 280', desc: 'Hilton / Parkroyal' },
                    { id: '5-Star', label: '5-Star Luxury', price: 'RM 450', desc: 'Mandarin / Ritz' }
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setCustomTripHotelTier(tier.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        customTripHotelTier === tier.id
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="font-bold text-zinc-900 text-xs">{tier.label}</div>
                      <div className="text-[10px] text-emerald-700 font-black mt-0.5">{tier.price}/night</div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{tier.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Private Chauffeur & Vehicle */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider mb-1.5">
                  3. Select Private Chauffeur Fleet
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Public Transit', price: 'RM 0', cap: 'No car' },
                    { id: 'sedan', label: 'Sedan', price: 'RM 180', cap: '1-3 Pax' },
                    { id: 'mpv', label: 'Toyota MPV', price: 'RM 260', cap: '4-5 Pax' },
                    { id: 'van', label: 'Hiace Van', price: 'RM 380', cap: '6-10 Pax' }
                  ].map((veh) => (
                    <button
                      key={veh.id}
                      type="button"
                      onClick={() => setCustomTripVehicle(veh.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        customTripVehicle === veh.id
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                          : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="font-bold text-zinc-900 text-xs">{veh.label}</div>
                      <div className="text-[10px] text-blue-700 font-black mt-0.5">{veh.price}</div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{veh.cap}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 5: Attraction Experiences Checkboxes */}
              <div>
                <label className="block text-[11px] font-extrabold text-zinc-700 uppercase tracking-wider mb-1.5">
                  4. Add Must-See Attraction Passes (Optional)
                </label>
                <div className="space-y-1.5">
                  {[
                    { name: 'Petronas Twin Towers Skybridge', price: 98, tag: 'Iconic View' },
                    { name: 'Batu Caves & Highland Escapade', price: 65, tag: 'Cultural Trail' },
                    { name: 'Genting Awana SkyWay Cable Car', price: 38, tag: 'Genting Highlands' },
                    { name: 'Sunway Lagoon 6-Park Multi-Pass', price: 150, tag: 'Theme Park' },
                    { name: 'Aquaria KLCC Underwater Tunnel', price: 65, tag: 'Family Friendly' }
                  ].map((att) => {
                    const isChecked = customTripAttractions.includes(att.name);
                    return (
                      <div
                        key={att.name}
                        onClick={() => {
                          if (isChecked) {
                            setCustomTripAttractions(customTripAttractions.filter((a) => a !== att.name));
                          } else {
                            setCustomTripAttractions([...customTripAttractions, att.name]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500/20'
                            : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-bold text-zinc-900 text-xs">{att.name}</span>
                            <span className="text-[10px] text-purple-700 font-bold ml-2">({att.tag})</span>
                          </div>
                        </div>
                        <span className="font-black text-xs text-zinc-900">RM {att.price}/pax</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sticky Safe-Area Footer (Instant Booking + CTFU Builder shortcut) */}
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 sm:p-5 flex items-center justify-between shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[10px] text-zinc-500 block font-semibold">
                  Custom Estimate ({customTripDays}D / {Math.max(1, customTripDays - 1)}N)
                </span>
                <span className="text-xl font-black text-zinc-950">
                  RM{' '}
                  {(
                    (customTripHotelTier === '5-Star' ? 450 : customTripHotelTier === '4-Star' ? 280 : customTripHotelTier === '3-Star' ? 180 : 0) * Math.max(1, customTripDays - 1) +
                    (customTripVehicle === 'van' ? 380 : customTripVehicle === 'mpv' ? 260 : customTripVehicle === 'sedan' ? 180 : 0) +
                    customTripAttractions.length * 75 * (customAdults + customKids)
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/ctfu-builder')}
                  className="hidden sm:inline-flex px-3 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 font-bold text-xs hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Advanced AI Builder
                </button>
                <button
                  type="button"
                  onClick={handleCheckoutCustomTrip}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-5 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>Book Custom Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
