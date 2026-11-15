import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Package, TransportRoute, Hotel, Ticket, AvailableFlight, GlobalSettings, FlightInquiry } from '../types';
import { DEFAULT_AVAILABLE_FLIGHTS } from '../data';
import FlightFinderSection from './FlightFinderSection';
import { useCurrencyRate } from '../lib/currency';
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
  Info,
  DollarSign,
  Coffee,
  HelpCircle,
  SlidersHorizontal,
  Plus,
  Minus,
  Layers,
  Palmtree,
  UtensilsCrossed,
  FileText,
  QrCode,
  Plane,
  Flame,
  ExternalLink
} from 'lucide-react';

interface CatalogBrowserProps {
  viewType: 'packages' | 'transport' | 'hotels' | 'tickets' | 'restaurants' | 'cruises' | 'flights';
  packages: Package[];
  transport: TransportRoute[];
  hotels: Hotel[];
  tickets: Ticket[];
  globalSettings?: Partial<GlobalSettings>;
  userRole: 'guest' | 'customer' | 'agent' | 'admin';
  agentCommission: number;
  onNavigate: (path: string, params?: any) => void;
  imageMap: Record<string, string>;
  onSubmitFlightInquiry?: (
    inquiry: Omit<FlightInquiry, 'id' | 'status' | 'createdAt' | 'targetEmail'>
  ) => Promise<FlightInquiry | null>;
}

export default function CatalogBrowser({
  viewType,
  packages,
  transport,
  hotels,
  tickets,
  globalSettings,
  userRole,
  agentCommission,
  onNavigate,
  imageMap,
  onSubmitFlightInquiry
}: CatalogBrowserProps) {
  const { currency, baseRates, fxConfig, formatPrice } = useCurrencyRate();

  // Explicit helper converting base MYR pricing to INR using the admin-configured rate and +1 INR safety buffer
  const convertMyrToInr = useCallback(
    (myrAmount: number) => {
      const safeMyr = Number(myrAmount) || 0;
      const useManual = Boolean(globalSettings?.fxUseManualRate);
      const manualRate = Number(globalSettings?.fxManualRateOverride);
      const adminMarkupInr =
        globalSettings?.fxMarkupInr !== undefined
          ? Number(globalSettings.fxMarkupInr)
          : fxConfig.markupInr ?? 1;
      const adminMarkupPct =
        globalSettings?.fxMarkupPercent !== undefined
          ? Math.max(0, Number(globalSettings.fxMarkupPercent))
          : fxConfig.markupPercent ?? 0;

      const bufferedRate =
        useManual && Number.isFinite(manualRate) && manualRate > 5
          ? manualRate
          : (Number(baseRates.INR) || 19.65) * (1 + adminMarkupPct / 100) +
            (Number.isFinite(adminMarkupInr) ? adminMarkupInr : 1);

      return Math.round(safeMyr * bufferedRate);
    },
    [
      globalSettings?.fxUseManualRate,
      globalSettings?.fxManualRateOverride,
      globalSettings?.fxMarkupInr,
      globalSettings?.fxMarkupPercent,
      fxConfig.markupInr,
      fxConfig.markupPercent,
      baseRates.INR
    ]
  );

  const formatCatalogPrice = useCallback(
    (myrAmount: number) => {
      const safeMyr = Number(myrAmount) || 0;
      if (currency === 'INR') {
        return `₹${convertMyrToInr(safeMyr).toLocaleString('en-IN')}`;
      }
      return formatPrice(safeMyr);
    },
    [currency, convertMyrToInr, formatPrice]
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('ALL');
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'price_asc' | 'price_desc' | 'rating'>('recommended');
  
  // Specific filters
  const [selectedHotelClass, setSelectedHotelClass] = useState('ALL');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [selectedBudget, setSelectedBudget] = useState<'ALL' | 'budget' | 'mid' | 'luxury'>('ALL');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [onlyTrending, setOnlyTrending] = useState(false);
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
  const getB2BRate = useCallback(
    (basePrice: number) => {
      if (userRole === 'agent') {
        return Math.round(basePrice * (1 - agentCommission / 100));
      }
      return basePrice;
    },
    [userRole, agentCommission]
  );

  const flightsList: AvailableFlight[] = useMemo(
    () =>
      Array.isArray(globalSettings?.availableFlights) && globalSettings.availableFlights.length > 0
        ? globalSettings.availableFlights
        : DEFAULT_AVAILABLE_FLIGHTS,
    [globalSettings?.availableFlights]
  );

  // Dynamic Price Range Bounds computed from active catalog items (in base MYR)
  const priceBounds = useMemo(() => {
    let prices: number[] = [];
    if (viewType === 'packages' || viewType === 'cruises') {
      prices = packages.map((p) => getB2BRate(Number(p.base_price) || 0)).filter((n) => n > 0);
    } else if (viewType === 'flights') {
      prices = flightsList.map((f) => getB2BRate(Number(f.farePerPax) || 0)).filter((n) => n > 0);
    } else if (viewType === 'hotels') {
      prices = hotels.map((h) => getB2BRate(Number(h.price) || 0)).filter((n) => n > 0);
    } else if (viewType === 'tickets' || viewType === 'restaurants') {
      prices = tickets.map((t) => getB2BRate(Number(t.price) || 0)).filter((n) => n > 0);
    } else if (viewType === 'transport') {
      prices = transport.map((tr) => getB2BRate(Number(tr.car) || 0)).filter((n) => n > 0);
    }

    if (prices.length === 0) {
      return { min: 0, max: 2000 };
    }
    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const min = Math.max(0, Math.floor(rawMin / 10) * 10);
    const max = Math.max(min + 50, Math.ceil(rawMax / 10) * 10);
    return { min, max };
  }, [viewType, packages, flightsList, hotels, tickets, transport, getB2BRate]);

  const [priceRangeMin, setPriceRangeMin] = useState<number>(priceBounds.min);
  const [priceRangeMax, setPriceRangeMax] = useState<number>(priceBounds.max);

  useEffect(() => {
    setPriceRangeMin(priceBounds.min);
    setPriceRangeMax(priceBounds.max);
  }, [viewType, priceBounds.min, priceBounds.max]);

  const isPriceSliderActive =
    priceRangeMin > priceBounds.min || priceRangeMax < priceBounds.max;

  const matchesDynamicPrice = useCallback(
    (baseAmount: number) => {
      const effectivePrice = getB2BRate(Number(baseAmount) || 0);
      return effectivePrice >= priceRangeMin && effectivePrice <= priceRangeMax;
    },
    [getB2BRate, priceRangeMin, priceRangeMax]
  );

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
      const matchSlider = matchesDynamicPrice(p.base_price);
      const matchSty = matchesStyle(p);
      const matchTrending = !onlyTrending || Boolean(p.trending);

      return matchSearch && matchLoc && matchDur && matchBud && matchSlider && matchSty && matchTrending;
    });

    if (selectedSort === 'price_asc') {
      result.sort((a, b) => a.base_price - b.base_price);
    } else if (selectedSort === 'price_desc') {
      result.sort((a, b) => b.base_price - a.base_price);
    } else if (selectedSort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [packages, searchQuery, selectedDestination, selectedDuration, selectedBudget, selectedStyle, selectedSort, onlyTrending, matchesDynamicPrice]);

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
      const matchSlider = matchesDynamicPrice(h.price);
      const matchSty = matchesStyle(h);
      const matchTrending = !onlyTrending || Boolean(h.trending);
      return matchClass && matchSearch && matchLoc && matchBud && matchSlider && matchSty && matchTrending;
    });

    if (selectedSort === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [hotels, selectedHotelClass, searchQuery, selectedDestination, selectedBudget, selectedStyle, selectedSort, onlyTrending, matchesDynamicPrice]);

  // 3. Tickets Filter & Sort
  const filteredTickets = useMemo(() => {
    let result = tickets.filter(t => {
      const matchSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.location && t.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchLoc = matchesDest(t.location) || matchesDest(t.name);
      const matchBud = matchesBudget(t.price);
      const matchSlider = matchesDynamicPrice(t.price);
      const matchSty = matchesStyle(t);
      const matchTrending = !onlyTrending || Boolean(t.trending);
      return matchSearch && matchLoc && matchBud && matchSlider && matchSty && matchTrending;
    });

    if (selectedSort === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [tickets, searchQuery, selectedDestination, selectedBudget, selectedStyle, selectedSort, onlyTrending, matchesDynamicPrice]);

  // 4. Transport Filter & Sort
  const filteredTransport = useMemo(() => {
    return transport.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLoc = matchesDest(t.name);
      const matchSlider = matchesDynamicPrice(t.car);
      const matchTrending = !onlyTrending || Boolean(t.trending);
      return matchSearch && matchLoc && matchSlider && matchTrending;
    });
  }, [transport, searchQuery, selectedDestination, onlyTrending, matchesDynamicPrice]);

  // 5. Restaurants Filter & Sort
  const filteredRestaurants = useMemo(() => {
    return tickets.filter(t => {
      const combined = `${t.name} ${t.location || ''} ${t.info || ''}`.toLowerCase();
      const matchSearch = combined.includes(searchQuery.toLowerCase());
      const matchLoc = matchesDest(t.location) || matchesDest(t.name);
      const matchBud = matchesBudget(t.price);
      const matchSlider = matchesDynamicPrice(t.price);
      const matchTrending = !onlyTrending || Boolean(t.trending);
      return matchSearch && matchLoc && matchBud && matchSlider && matchTrending;
    });
  }, [tickets, searchQuery, selectedDestination, selectedBudget, onlyTrending, matchesDynamicPrice]);

  // 6. Cruises Filter & Sort
  const filteredCruises = useMemo(() => {
    return packages.filter(p => {
      const combined = `${p.title} ${p.description} ${p.destination} ${p.tags.join(' ')}`.toLowerCase();
      const matchSearch = combined.includes(searchQuery.toLowerCase());
      const matchLoc = matchesDest(p.destination) || matchesDest(p.title);
      const matchBud = matchesBudget(p.base_price);
      const matchSlider = matchesDynamicPrice(p.base_price);
      const matchTrending = !onlyTrending || Boolean(p.trending);
      return matchSearch && matchLoc && matchBud && matchSlider && matchTrending;
    });
  }, [packages, searchQuery, selectedDestination, selectedBudget, onlyTrending, matchesDynamicPrice]);

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
    selectedDuration !== 'ALL' ||
    onlyTrending ||
    isPriceSliderActive;

  const resetAllCustomFilters = () => {
    setSearchQuery('');
    setSelectedDestination('ALL');
    setSelectedBudget('ALL');
    setSelectedStyle('ALL');
    setSelectedHotelClass('ALL');
    setSelectedDuration('ALL');
    setOnlyTrending(false);
    setSelectedSort('recommended');
    setPriceRangeMin(priceBounds.min);
    setPriceRangeMax(priceBounds.max);
  };

  const renderDynamicPriceRangeBar = () => {
    const span = Math.max(1, priceBounds.max - priceBounds.min);
    const minPct = Math.max(0, Math.min(100, ((priceRangeMin - priceBounds.min) / span) * 100));
    const maxPct = Math.max(0, Math.min(100, ((priceRangeMax - priceBounds.min) / span) * 100));
    const stepSize = span >= 1000 ? 25 : 10;

    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 sm:p-4 mb-4 sm:mb-6 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-zinc-950">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
              <span>Dynamic Price Range</span>
            </span>
            <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg tabular-nums">
              {formatCatalogPrice(priceRangeMin)} – {formatCatalogPrice(priceRangeMax)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isPriceSliderActive && (
              <button
                type="button"
                onClick={() => {
                  setPriceRangeMin(priceBounds.min);
                  setPriceRangeMax(priceBounds.max);
                }}
                className="text-[11px] font-bold text-rose-700 hover:underline px-1.5 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Dual-Handle Interactive Range Slider */}
        <div className="pt-1 pb-0.5">
          <div className="relative h-6 flex items-center">
            <div className="w-full h-2 bg-zinc-200 rounded-full relative overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-emerald-600 rounded-full"
                style={{
                  left: `${minPct}%`,
                  right: `${100 - maxPct}%`
                }}
              />
            </div>
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={stepSize}
              value={priceRangeMin}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPriceRangeMin(Math.min(val, priceRangeMax - stepSize));
              }}
              aria-label="Minimum price slider"
              className="gfk-range-input absolute inset-0 w-full h-6 m-0"
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              step={stepSize}
              value={priceRangeMax}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPriceRangeMax(Math.max(val, priceRangeMin + stepSize));
              }}
              aria-label="Maximum price slider"
              className="gfk-range-input absolute inset-0 w-full h-6 m-0"
            />
          </div>

          <div className="flex items-center justify-between text-[10.5px] font-bold text-zinc-500 tabular-nums mt-0.5">
            <span>Min: {formatCatalogPrice(priceBounds.min)}</span>
            <span>Max: {formatCatalogPrice(priceBounds.max)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 md:py-16 animate-fade-in w-full font-sans text-zinc-900">
      
      {/* =====================================================================
          1. TOP NAVIGATION SERVICE TABS
      ===================================================================== */}
      <div className="bg-white rounded-2xl p-1.5 border border-zinc-200 mb-3 sm:mb-6 flex items-center justify-between overflow-x-auto no-scrollbar gap-1.5">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => onNavigate('/search')}
            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewType === 'packages'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <Palmtree className="w-3.5 h-3.5 shrink-0" />
            <span>Holidays · {packages.length}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/tickets')}
            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewType === 'tickets'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <TicketIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Tickets · {tickets.length}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/hotels')}
            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewType === 'hotels'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>Hotels · {hotels.length}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/transport')}
            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewType === 'transport'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <Car className="w-3.5 h-3.5 shrink-0" />
            <span>Transfers · {transport.length}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/restaurants')}
            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewType === 'restaurants'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
            <span>Dining</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/cruises')}
            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewType === 'cruises'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <Waves className="w-3.5 h-3.5 shrink-0" />
            <span>Cruises</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/flights')}
            className={`px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              viewType === 'flights'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <Plane className="w-3.5 h-3.5 shrink-0" />
            <span>Flights · {(globalSettings?.availableFlights?.length || DEFAULT_AVAILABLE_FLIGHTS.length)}</span>
          </button>
        </div>

      {userRole === 'agent' && (
          <span className="text-emerald-700 font-bold text-[11px] sm:text-xs px-2.5 py-1 shrink-0 whitespace-nowrap">
            Agent Net Rates ({agentCommission}% Off)
          </span>
        )}
      </div>

      {/* =====================================================================
          1B. DYNAMIC PRICE RANGE SLIDER BAR
          (Active on Holidays, Available Flights, Hotels, Tickets & Transfers)
      ===================================================================== */}
      {renderDynamicPriceRangeBar()}

      {/* =====================================================================
          2A. PHONE VIEW OPTIMIZED SEARCH & CUSTOM PRIVILEGE CONSOLE (MOBILE ONLY)
          (Strictly hidden on Flights view — FlightFinderSection provides flight search)
      ===================================================================== */}
      {viewType !== 'flights' && (
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
            className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Custom Trip</span>
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
                  { id: 'budget', label: `< ${formatCatalogPrice(200)}` },
                  { id: 'mid', label: `${formatCatalogPrice(200)}-${formatCatalogPrice(500)}` },
                  { id: 'luxury', label: `${formatCatalogPrice(500)}+` }
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
            <button
              type="button"
              onClick={() => setOnlyTrending((prev) => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap inline-flex items-center gap-1 transition-all cursor-pointer ${
                onlyTrending
                  ? 'bg-amber-400 text-zinc-950'
                  : 'bg-zinc-100 text-zinc-700'
              }`}
            >
              <Flame className="w-3 h-3 shrink-0" />
              <span>Trending</span>
            </button>

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
      )}

      {/* =====================================================================
          2B. DESKTOP VIEW CONTROL BAR (Strictly hidden on Flights view)
      ===================================================================== */}
      {viewType !== 'flights' && (
      <div className="hidden md:block bg-zinc-950 text-white rounded-3xl p-6 mb-8 border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Compass className="w-4 h-4" />
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

            {/* Trending Only Toggle */}
            <button
              type="button"
              onClick={() => setOnlyTrending((prev) => !prev)}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                onlyTrending
                  ? 'bg-amber-400 text-zinc-950'
                  : 'bg-zinc-900 text-amber-300 border border-zinc-800 hover:border-amber-400/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>Trending Only</span>
            </button>

            {/* Budget filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-bold">Budget:</span>
              {[
                { id: 'ALL', label: 'Any' },
                { id: 'budget', label: `< ${formatCatalogPrice(200)}` },
                { id: 'mid', label: `${formatCatalogPrice(200)} - ${formatCatalogPrice(500)}` },
                { id: 'luxury', label: `${formatCatalogPrice(500)}+` }
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
      )}

      {/* =====================================================================
          3. HOLIDAYS & TOUR PACKAGES PAGE (Systematic Mobile Cards + Full Desktop View)
      ===================================================================== */}
      {viewType === 'packages' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-zinc-600 tabular-nums">
              {filteredPackages.length} Malaysia Holiday Packages
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              Itineraries &amp; Transfers Included
            </span>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-zinc-200 p-6">
              <Compass className="w-10 h-10 text-zinc-300 mx-auto mb-2.5" />
              <h3 className="text-base font-extrabold text-zinc-900">No holiday packages match your filters</h3>
              <p className="text-zinc-500 text-xs mt-1">Try resetting destination or duration filters</p>
              <button
                type="button"
                onClick={resetAllCustomFilters}
                className="mt-4 px-4 py-2 bg-zinc-950 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
              {filteredPackages.map((pkg) => {
                const img = resolveImage(pkg.image, 'langkawi');
                const displayPrice = getB2BRate(pkg.base_price);
                const origPrice = pkg.original_price || Math.round(pkg.base_price * 1.25);
                const isExpanded = expandedItineraryId === pkg.id;

                return (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-2xl border border-zinc-200 hover:border-emerald-600/60 transition-colors overflow-hidden flex flex-col lg:flex-row"
                  >
                    {/* Media Column (Compact on Mobile, Full Column on Desktop) */}
                    <div
                      onClick={() => {
                        setActivePackageModal(pkg);
                        setModalTab('options');
                      }}
                      className="relative w-full lg:w-72 h-40 lg:h-auto shrink-0 bg-zinc-950 cursor-pointer"
                    >
                      <img
                        src={img}
                        alt={pkg.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                      {pkg.trending && (
                        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-extrabold">
                          <Flame className="w-3 h-3 shrink-0" />
                          Trending
                        </span>
                      )}
                      <div className="absolute top-2.5 right-2.5 bg-zinc-950/85 text-white font-bold text-[10px] px-2 py-0.5 rounded-md tabular-nums">
                        {pkg.duration_days}D/{pkg.duration_days - 1}N
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white font-semibold">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{pkg.destination}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0 ml-2 tabular-nums">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>{pkg.rating || 4.9}</span>
                          <span className="text-zinc-300 text-[10px]">({pkg.reviews || 240})</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle Info Column */}
                    <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Quiet Unboxed Metadata */}
                        <div className="text-[11px] font-semibold text-emerald-700 mb-1 truncate">
                          Guided Tour · Hotel &amp; Transfers Included
                        </div>

                        <h2
                          onClick={() => {
                            setActivePackageModal(pkg);
                            setModalTab('options');
                          }}
                          className="text-sm sm:text-lg font-extrabold text-zinc-950 leading-snug line-clamp-2 cursor-pointer hover:text-emerald-700 transition-colors"
                        >
                          {pkg.title}
                        </h2>

                        <p className="text-xs text-zinc-600 leading-relaxed mt-1 line-clamp-2">
                          {pkg.description}
                        </p>

                        {/* Clean Desktop Inclusions Line (Hidden on Mobile to prevent card bloat) */}
                        <div className="hidden sm:grid mt-3 py-2 px-3 bg-zinc-50 border border-zinc-200/70 rounded-xl grid-cols-4 gap-2 text-[11px] font-semibold text-zinc-700">
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

                        {/* Desktop Day-by-Day Accordion (Mobile uses systematic bottom sheet) */}
                        {pkg.itinerary && pkg.itinerary.length > 0 && (
                          <div className="hidden sm:block mt-3">
                            <button
                              type="button"
                              onClick={() => setExpandedItineraryId(isExpanded ? null : pkg.id)}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Day-by-Day Breakdown' : `Preview ${pkg.itinerary.length}-Day Itinerary Breakdown`}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-2.5 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 animate-fade-in text-xs">
                                {pkg.itinerary.map((day, idx) => (
                                  <div key={idx} className="flex items-start gap-2.5">
                                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                                      {day.day || idx + 1}
                                    </span>
                                    <div>
                                      <h4 className="font-bold text-zinc-900">{day.title}</h4>
                                      <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">{day.activities}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Mobile Compact Price & Action Row */}
                      <div className="lg:hidden mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <div className="tabular-nums">
                          <span className="text-[10px] text-zinc-400 line-through block leading-none">
                            {formatCatalogPrice(Number(origPrice) || 0)}
                          </span>
                          <div className="text-base font-extrabold text-zinc-950 leading-tight mt-0.5">
                            {formatCatalogPrice(Number(displayPrice) || 0)}
                            <span className="text-[10px] font-normal text-zinc-500"> /pax</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePackageModal(pkg);
                              setModalTab('options');
                            }}
                            className="px-2.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                          >
                            Itinerary
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePackageModal(pkg);
                              setModalTab('options');
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] py-2 px-3 rounded-xl cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          >
                            <span>Book Tour</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Right Pricing & Quick Book Column */}
                    <div className="hidden lg:flex p-6 bg-zinc-50 border-l border-zinc-200/80 w-64 shrink-0 flex-col justify-between">
                      <div className="text-right tabular-nums">
                        <span className="text-xs text-zinc-400 line-through font-semibold block">
                          {formatCatalogPrice(Number(origPrice) || 0)}
                        </span>
                        <div className="text-2xl font-black text-zinc-950 tracking-tight leading-none mt-0.5">
                          {formatCatalogPrice(Number(displayPrice) || 0)}
                        </div>
                        <span className="text-[11px] text-zinc-500 font-medium block">
                          per person
                        </span>
                        <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                          Sightseeing, Hotel &amp; Cabs
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActivePackageModal(pkg);
                            setModalTab('options');
                          }}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
                            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-[11px] py-1.5 px-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                            title="Customize this itinerary with your own dates and hotel"
                          >
                            <Compass className="w-3 h-3 text-emerald-700" />
                            <span>Customize</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePackageModal(pkg);
                              setModalTab('terms');
                            }}
                            className="bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-[11px] py-1.5 px-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
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
          4. ATTRACTION TICKETS PAGE (Systematic Mobile + Desktop Cards)
      ===================================================================== */}
      {viewType === 'tickets' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-zinc-600 tabular-nums">
              {filteredTickets.length} Attraction Tickets &amp; E-Passes
            </span>
            <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              <span>Instant Gate QR</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {filteredTickets.map((tk) => {
              const img = resolveImage(tk.image, 'petronas');
              const displayPrice = getB2BRate(tk.price);
              const origPrice = tk.originalPrice || Math.round(tk.price * 1.25);
              const hasVariants = tk.ticketCategories && tk.ticketCategories.length > 0;

              return (
                <div
                  key={tk.id}
                  className="bg-white rounded-2xl border border-zinc-200 hover:border-purple-500/60 transition-colors overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div
                      onClick={() => {
                        setActiveTicketModal(tk);
                        setModalTab('options');
                        setModalSelectedVariantIdx(0);
                      }}
                      className="relative h-36 sm:h-44 bg-zinc-950 overflow-hidden cursor-pointer"
                    >
                      <img
                        src={img}
                        alt={tk.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                      {tk.trending && (
                        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-extrabold">
                          <Flame className="w-3 h-3 shrink-0" />
                          Trending
                        </span>
                      )}
                      <div className="absolute top-2.5 right-2.5 bg-zinc-950/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-purple-300" />
                        <span>Gate QR</span>
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white font-semibold">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{tk.location || 'Malaysia'}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0 ml-2 tabular-nums">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>{tk.rating || 4.8}</span>
                          <span className="text-zinc-300 text-[10px]">({tk.reviews || 420})</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4">
                      <div className="text-[11px] font-semibold text-purple-700 mb-1 truncate">
                        Instant Turnstile Entry · {tk.info || 'Valid 90 Days'}
                      </div>
                      <h3
                        onClick={() => {
                          setActiveTicketModal(tk);
                          setModalTab('options');
                          setModalSelectedVariantIdx(0);
                        }}
                        className="font-extrabold text-sm sm:text-base text-zinc-950 leading-snug line-clamp-2 cursor-pointer hover:text-purple-700"
                      >
                        {tk.name}
                      </h3>

                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{tk.timings || tk.addInfo || 'Daily 09:00 AM - 09:00 PM'}</span>
                      </div>

                      {/* Desktop Option Preview Table (Hidden on Mobile to prevent congestion) */}
                      <div className="hidden sm:block mt-3 p-2.5 bg-zinc-50 border border-zinc-200/70 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Available Ticket Tiers
                        </span>
                        {(hasVariants ? tk.ticketCategories! : [
                          { name: 'Standard Gate Pass', price: tk.price, description: 'Direct turnstile entry' }
                        ]).slice(0, 2).map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                            <span className="font-semibold text-zinc-800 truncate pr-2">{cat.name}</span>
                            <span className="font-bold text-purple-700 shrink-0 tabular-nums">
                              {formatCatalogPrice(Number(getB2BRate(cat.price)) || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <div className="tabular-nums">
                      <span className="text-[10px] text-zinc-400 line-through block leading-none">
                        {formatCatalogPrice(Number(origPrice) || 0)}
                      </span>
                      <div className="text-base sm:text-lg font-extrabold text-zinc-950 leading-tight mt-0.5">
                        {formatCatalogPrice(Number(displayPrice) || 0)}
                        <span className="text-[10px] font-normal text-zinc-500"> /pass</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTicketModal(tk);
                          setModalTab('terms');
                        }}
                        className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-[11px] py-2 px-2.5 rounded-xl cursor-pointer whitespace-nowrap"
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
                        className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] sm:text-xs py-2 px-3 rounded-xl transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <span>Select Pass</span>
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
          5. HOTELS & STAYS PAGE (Systematic Mobile + Desktop Cards)
      ===================================================================== */}
      {viewType === 'hotels' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-zinc-600 tabular-nums">
              {filteredHotels.length} Contracted Hotels &amp; Resorts
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              Direct Allotments · Instant Rooms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
            {filteredHotels.map((ht) => {
              const img = resolveImage(ht.image, 'hotel');
              const displayPrice = getB2BRate(ht.price);
              const origPrice = ht.originalPrice || Math.round(ht.price * 1.3);

              return (
                <div
                  key={ht.id}
                  className="bg-white rounded-2xl border border-zinc-200 hover:border-emerald-600/60 transition-colors overflow-hidden flex flex-col lg:flex-row"
                >
                  {/* Hotel Photo */}
                  <div
                    onClick={() => {
                      setActiveHotelModal(ht);
                      setModalTab('options');
                      setModalSelectedVariantIdx(0);
                    }}
                    className="relative w-full lg:w-72 h-40 lg:h-auto shrink-0 bg-zinc-950 cursor-pointer"
                  >
                    <img
                      src={img}
                      alt={ht.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    {ht.trending && (
                      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-extrabold">
                        <Flame className="w-3 h-3 shrink-0" />
                        Trending
                      </span>
                    )}
                    <div className="absolute top-2.5 right-2.5 bg-zinc-950/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {ht.cat || 'Direct Contract'}
                    </div>
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white font-semibold">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{ht.location || 'Malaysia'}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0 ml-2 tabular-nums">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{ht.rating || 4.7}</span>
                        <span className="text-zinc-300 text-[10px]">({ht.reviews || 290})</span>
                      </span>
                    </div>
                  </div>

                  {/* Hotel Details & Room Options */}
                  <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-700 mb-1 truncate">
                        {ht.contractBadge || 'Direct DMC Allotment'} · {ht.timings || 'Check-in 3:00 PM'}
                      </div>

                      <h2
                        onClick={() => {
                          setActiveHotelModal(ht);
                          setModalTab('options');
                          setModalSelectedVariantIdx(0);
                        }}
                        className="text-sm sm:text-lg font-extrabold text-zinc-950 leading-snug line-clamp-2 cursor-pointer hover:text-emerald-700"
                      >
                        {ht.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] font-medium text-zinc-600">
                        <span className="flex items-center gap-1">
                          <Wifi className="w-3 h-3 text-emerald-600" /> Free WiFi
                        </span>
                        <span className="flex items-center gap-1">
                          <Waves className="w-3 h-3 text-blue-600" /> Pool
                        </span>
                        <span className="flex items-center gap-1">
                          <Coffee className="w-3 h-3 text-amber-600" /> Breakfast Option
                        </span>
                      </div>

                      {/* Room Categories preview (Desktop only — mobile uses quick modal selector) */}
                      <div className="hidden sm:block mt-3 p-2.5 bg-zinc-50 border border-zinc-200/70 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Contracted Room Categories
                        </span>
                        {(ht.roomCategories && ht.roomCategories.length > 0 ? ht.roomCategories : [
                          { name: 'Standard Room', price: ht.price, pax: 2 }
                        ]).slice(0, 2).map((room, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                            <div>
                              <span className="font-semibold text-zinc-800">{room.name}</span>
                              <span className="text-[10px] text-zinc-400 ml-2">Max {room.pax || 2} Pax</span>
                            </div>
                            <span className="font-bold text-emerald-700 tabular-nums">
                              {formatCatalogPrice(Number(getB2BRate(room.price)) || 0)} /night
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mobile Compact Price & Action Row */}
                    <div className="lg:hidden mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <div className="tabular-nums">
                        <span className="text-[10px] text-zinc-400 line-through block leading-none">
                          {formatCatalogPrice(Number(origPrice) || 0)}
                        </span>
                        <div className="text-base font-extrabold text-zinc-950 leading-tight mt-0.5">
                          {formatCatalogPrice(Number(displayPrice) || 0)}
                          <span className="text-[10px] font-normal text-zinc-500"> /night</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveHotelModal(ht);
                            setModalTab('terms');
                          }}
                          className="px-2.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                        >
                          Policies
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveHotelModal(ht);
                            setModalTab('options');
                            setModalSelectedVariantIdx(0);
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] py-2 px-3 rounded-xl flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>Choose Room</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Pricing & Booking Column */}
                  <div className="hidden lg:flex p-6 bg-zinc-50 border-l border-zinc-200/80 w-60 shrink-0 flex-col justify-between">
                    <div className="text-right tabular-nums">
                      <span className="text-xs text-zinc-400 line-through font-semibold block">
                        {formatCatalogPrice(Number(origPrice) || 0)}
                      </span>
                      <div className="text-2xl font-black text-zinc-950 leading-none mt-0.5">
                        {formatCatalogPrice(Number(displayPrice) || 0)}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-medium block">
                        per room / night
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveHotelModal(ht);
                          setModalTab('options');
                          setModalSelectedVariantIdx(0);
                        }}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
                        className="w-full bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
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
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-zinc-600 tabular-nums">
              {filteredTransport.length} Private Transfers &amp; Chauffeur Routes
            </span>
            <span className="text-[11px] font-semibold text-blue-700">
              Fixed Fares · Flight Tracking
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {filteredTransport.map(tr => {
              const img = resolveImage(tr.image, 'transfer');
              return (
                <div
                  key={tr.id}
                  className="bg-white rounded-2xl border border-zinc-200 hover:border-blue-500/60 transition-colors overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-36 sm:h-44 bg-zinc-950 overflow-hidden">
                      <img
                        src={img}
                        alt={tr.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3.5 flex items-end">
                        {tr.trending && (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-extrabold">
                            <Flame className="w-3 h-3 shrink-0" />
                            Trending
                          </span>
                        )}
                        <h3 className="font-extrabold text-white text-sm leading-snug">{tr.name}</h3>
                      </div>
                    </div>

                    <div className="p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                        Vehicle Tariffs (Tolls &amp; Fuel Included)
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs tabular-nums">
                        <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/70 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-zinc-500">Car 1-3p</span>
                          <span className="font-extrabold text-zinc-950">{formatCatalogPrice(getB2BRate(tr.car))}</span>
                        </div>
                        <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/70 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-zinc-500">MPV 4-5p</span>
                          <span className="font-extrabold text-zinc-950">{formatCatalogPrice(getB2BRate(tr.mpv))}</span>
                        </div>
                        <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/70 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-zinc-500">Van 7p</span>
                          <span className="font-extrabold text-zinc-950">{formatCatalogPrice(getB2BRate(tr.van7))}</span>
                        </div>
                        <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200/70 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-zinc-500">Van 13p</span>
                          <span className="font-extrabold text-zinc-950">{formatCatalogPrice(getB2BRate(tr.van13))}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-700">Door-to-Door Pickup</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('/package', { id: tr.id })}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl cursor-pointer flex items-center gap-1 whitespace-nowrap"
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
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-zinc-600 tabular-nums">
              {filteredRestaurants.length} Dining &amp; High-Tea Passes
            </span>
            <span className="text-[11px] font-semibold text-rose-700">
              Instant Table Voucher
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
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
                  className="bg-white rounded-2xl border border-zinc-200 hover:border-rose-500/60 transition-colors overflow-hidden flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="relative h-36 sm:h-44 bg-zinc-950 overflow-hidden">
                      <img
                        src={img}
                        alt={tk.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent p-3.5 flex items-end">
                        <div>
                          <div className="text-[10px] font-bold text-rose-300 mb-0.5">Dining Experience</div>
                          <h3 className="font-extrabold text-white text-sm leading-snug">{tk.name}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{tk.location || 'Kuala Lumpur'}</span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-2">
                        {tk.info || tk.instructions || 'Authentic Malaysian dining experience with instant voucher.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                    <div className="tabular-nums">
                      <span className="text-[10px] text-zinc-400 block leading-none">From</span>
                      <span className="text-base font-extrabold text-zinc-950">
                        {formatCatalogPrice(Number(displayPrice) || 0)} <span className="text-[11px] font-normal text-zinc-500">/pax</span>
                      </span>
                    </div>
                    <span className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl inline-flex items-center gap-1 whitespace-nowrap">
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
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-zinc-600 tabular-nums">
              {filteredCruises.length} Sunset Cruises &amp; Yacht Charters
            </span>
            <span className="text-[11px] font-semibold text-cyan-700">
              Langkawi &amp; Marina Charters
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {filteredCruises.map(pkg => {
              const img = resolveImage(pkg.image, 'langkawi');
              const displayPrice = getB2BRate(pkg.base_price);
              return (
                <div
                  key={pkg.id}
                  onClick={() => onNavigate('/package', { id: pkg.id })}
                  className="bg-white rounded-2xl border border-zinc-200 hover:border-cyan-500/60 transition-colors overflow-hidden flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="relative h-36 sm:h-44 bg-zinc-950 overflow-hidden">
                      <img
                        src={img}
                        alt={pkg.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent p-3.5 flex items-end">
                        <div>
                          <div className="text-[10px] font-bold text-cyan-300 mb-0.5">Cruise Charter</div>
                          <h3 className="font-extrabold text-white text-sm leading-snug">{pkg.title}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span className="truncate">{pkg.destination}</span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-2">
                        {pkg.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                    <div className="tabular-nums">
                      <span className="text-[10px] text-zinc-400 block leading-none">From</span>
                      <span className="text-base font-extrabold text-zinc-950">
                        {formatCatalogPrice(Number(displayPrice) || 0)} <span className="text-[11px] font-normal text-zinc-500">/pax</span>
                      </span>
                    </div>
                    <span className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl inline-flex items-center gap-1 whitespace-nowrap">
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
          9. AVAILABLE FLIGHTS & UPCOMING TRIP FLIGHT SEARCH + QUOTE REQUEST
      ===================================================================== */}
      {viewType === 'flights' && (
        <FlightFinderSection
          flights={flightsList}
          variant="full"
          flightsEmail={globalSettings?.flightsEmail || 'flights@gfkholidays.com'}
          bookingEmail={globalSettings?.bookingEmail || 'booking@gfkholidays.com'}
          priceRange={[priceRangeMin, priceRangeMax]}
          onResetPriceRange={() => {
            setPriceRangeMin(priceBounds.min);
            setPriceRangeMax(priceBounds.max);
          }}
          getFareRate={(baseFare) => getB2BRate(baseFare)}
          onReserveFlight={(fl) => {
            const unitFare = getB2BRate(fl.farePerPax);
            onNavigate('/checkout', {
              product: {
                id: fl.id,
                title: `${fl.airline} ${fl.flightNumber} (${fl.originCode} → ${fl.destinationCode})`,
                name: `${fl.airline} ${fl.flightNumber}`,
                destination: fl.destinationCity,
                image: 'kl',
                base_price: unitFare,
                category: 'Flight',
                isFlight: true
              },
              pax: 1,
              date: fl.departureDate,
              timeSlot: `${fl.departureTime} – ${fl.arrivalTime}`,
              optionName: `${fl.cabinClass || 'Economy'} · ${fl.baggage || '20kg Baggage'}`,
              displayPrice: unitFare,
              total: unitFare,
              commission: 0
            });
          }}
          onNavigate={onNavigate}
          onSubmitInquiry={onSubmitFlightInquiry}
        />
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

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-zinc-600">Book via Marketplace:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={
                      activePackageModal.viatorUrl ||
                      `https://www.viator.com/searchResults/all?text=${encodeURIComponent(`${activePackageModal.title} Malaysia`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-950 text-[#34E0A1] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>Viator</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <a
                    href={
                      activePackageModal.tripadvisorUrl ||
                      `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${activePackageModal.title} Malaysia`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 text-[#34E0A1] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>TripAdvisor</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Sticky Safe-Area Footer (Never Clipped by Bottom Bar) */}
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 sm:p-5 flex items-center justify-between shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[10px] text-zinc-500 block font-semibold">Total Price ({modalPax} Travelers)</span>
                <span className="text-xl font-black text-zinc-950">
                  {formatCatalogPrice(getB2BRate(activePackageModal.base_price) * modalPax)}
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
                            <span className="text-sm font-black text-purple-700">{formatCatalogPrice(getB2BRate(cat.price))}</span>
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

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-zinc-600">Book via Marketplace:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={
                      activeTicketModal.viatorUrl ||
                      `https://www.viator.com/searchResults/all?text=${encodeURIComponent(`${activeTicketModal.name} Malaysia`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-950 text-[#34E0A1] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>Viator</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <a
                    href={
                      activeTicketModal.tripadvisorUrl ||
                      `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${activeTicketModal.name} Malaysia`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 text-[#34E0A1] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>TripAdvisor</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Sticky Safe-Area Footer (Never Clipped by Bottom Bar) */}
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 sm:p-5 flex items-center justify-between shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[10px] text-zinc-500 block font-semibold">Total Price ({modalPax} Passes)</span>
                <span className="text-xl font-black text-zinc-950">
                  {formatCatalogPrice(
                    getB2BRate(
                      activeTicketModal.ticketCategories?.[modalSelectedVariantIdx]?.price ||
                        activeTicketModal.price
                    ) * modalPax
                  )}
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
                              {formatCatalogPrice(getB2BRate(room.price))}
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

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-zinc-600">Book via Marketplace:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={
                      activeHotelModal.viatorUrl ||
                      `https://www.viator.com/searchResults/all?text=${encodeURIComponent(`${activeHotelModal.name} Malaysia`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-950 text-[#34E0A1] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>Viator</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                  <a
                    href={
                      activeHotelModal.tripadvisorUrl ||
                      `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${activeHotelModal.name} Malaysia`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 text-[#34E0A1] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>TripAdvisor</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Sticky Safe-Area Footer (Never Clipped by Bottom Bar) */}
            <div className="sticky bottom-0 bg-white border-t border-zinc-200 p-4 sm:p-5 flex items-center justify-between shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-30 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div>
                <span className="text-[10px] text-zinc-500 block font-semibold">Total Price ({modalNights} Nights)</span>
                <span className="text-xl font-black text-zinc-950">
                  {formatCatalogPrice(
                    getB2BRate(
                      activeHotelModal.roomCategories?.[modalSelectedVariantIdx]?.price ||
                        activeHotelModal.price
                    ) * modalNights
                  )}
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
                    { id: 'none', label: 'Self Arranged', price: 0, desc: 'No hotel needed' },
                    { id: '3-Star', label: '3-Star Comfort', price: 180, desc: 'ibis / Mercure' },
                    { id: '4-Star', label: '4-Star Premium', price: 280, desc: 'Hilton / Parkroyal' },
                    { id: '5-Star', label: '5-Star Luxury', price: 450, desc: 'Mandarin / Ritz' }
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
                      <div className="text-[10px] text-emerald-700 font-black mt-0.5">{formatCatalogPrice(tier.price)}/night</div>
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
                    { id: 'none', label: 'Public Transit', price: 0, cap: 'No car' },
                    { id: 'sedan', label: 'Sedan', price: 180, cap: '1-3 Pax' },
                    { id: 'mpv', label: 'Toyota MPV', price: 260, cap: '4-5 Pax' },
                    { id: 'van', label: 'Hiace Van', price: 380, cap: '6-10 Pax' }
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
                      <div className="text-[10px] text-blue-700 font-black mt-0.5">{formatCatalogPrice(veh.price)}</div>
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
                        <span className="font-black text-xs text-zinc-900">{formatCatalogPrice(att.price)}/pax</span>
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
                  {formatCatalogPrice(
                    (customTripHotelTier === '5-Star' ? 450 : customTripHotelTier === '4-Star' ? 280 : customTripHotelTier === '3-Star' ? 180 : 0) * Math.max(1, customTripDays - 1) +
                    (customTripVehicle === 'van' ? 380 : customTripVehicle === 'mpv' ? 260 : customTripVehicle === 'sedan' ? 180 : 0) +
                    customTripAttractions.length * 75 * (customAdults + customKids)
                  )}
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
