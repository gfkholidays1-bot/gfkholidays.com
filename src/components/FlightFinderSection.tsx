import React, { useMemo, useState } from 'react';
import {
  Plane,
  Search,
  Calendar,
  ArrowRight,
  ChevronRight,
  Mail,
  Send,
  CheckCircle2,
  X,
  Clock,
  Users,
  Sparkles,
  FileText
} from 'lucide-react';
import { AvailableFlight, FlightInquiry } from '../types';
import { useCurrencyRate } from '../lib/currency';

interface FlightFinderSectionProps {
  flights: AvailableFlight[];
  variant: 'mobile-upper' | 'desktop-upper' | 'full';
  sectionId?: string;
  flightsEmail?: string;
  bookingEmail?: string;
  priceRange?: [number, number];
  onResetPriceRange?: () => void;
  getFareRate?: (baseFare: number) => number;
  onReserveFlight: (flight: AvailableFlight) => void;
  onNavigate?: (path: string, params?: any) => void;
  onSubmitInquiry?: (
    inquiry: Omit<FlightInquiry, 'id' | 'status' | 'createdAt' | 'targetEmail'>
  ) => Promise<FlightInquiry | null>;
}

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultFutureDate(daysAhead = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

function getUpcomingLabel(departureDate: string, status: AvailableFlight['status'], todayIso: string): string | null {
  if (status === 'DEPARTED') return null;
  if (!departureDate) return 'Upcoming';
  if (departureDate === todayIso) return 'Departing Today';
  const diffMs = new Date(`${departureDate}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays <= 14) {
    return diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
  }
  if (diffDays > 14) return 'Upcoming';
  return null;
}

export function sortFlightsUpcomingFirst(list: AvailableFlight[]): AvailableFlight[] {
  const todayIso = getTodayIso();
  return [...list].sort((a, b) => {
    const aDeparted = a.status === 'DEPARTED' || (Boolean(a.departureDate) && a.departureDate < todayIso);
    const bDeparted = b.status === 'DEPARTED' || (Boolean(b.departureDate) && b.departureDate < todayIso);
    if (aDeparted !== bDeparted) return aDeparted ? 1 : -1;

    const aDateKey = `${a.departureDate || '9999-12-31'} ${a.departureTime || '23:59'}`;
    const bDateKey = `${b.departureDate || '9999-12-31'} ${b.departureTime || '23:59'}`;
    return aDateKey.localeCompare(bDateKey);
  });
}

function getStatusBadgeClass(status: AvailableFlight['status']): string {
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
}

export default function FlightFinderSection({
  flights,
  variant,
  sectionId,
  flightsEmail = 'flights@gfkholidays.com',
  bookingEmail = 'booking@gfkholidays.com',
  priceRange,
  onResetPriceRange,
  getFareRate,
  onReserveFlight,
  onNavigate,
  onSubmitInquiry
}: FlightFinderSectionProps) {
  const { formatPrice } = useCurrencyRate();
  const todayIso = useMemo(() => getTodayIso(), []);
  const sortedFlights = useMemo(() => sortFlightsUpcomingFirst(flights || []), [flights]);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'LIMITED'>('ALL');
  const [showAllRows, setShowAllRows] = useState(variant === 'full');
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Flight Fare Quote / Code & Non-Banking Flight Inquiry Modal / Inline Form
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryAirline, setInquiryAirline] = useState('');
  const [inquiryFlightCode, setInquiryFlightCode] = useState('');
  const [inquiryOrigin, setInquiryOrigin] = useState('KUL');
  const [inquiryDestination, setInquiryDestination] = useState('');
  const [inquiryDate, setInquiryDate] = useState(() => getDefaultFutureDate(5));
  const [inquiryPax, setInquiryPax] = useState(2);
  const [inquiryType, setInquiryType] = useState<FlightInquiry['inquiryType']>('fare_quote');
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryCustomerEmail, setInquiryCustomerEmail] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<FlightInquiry | null>(null);

  const uniqueRoutes = useMemo(() => {
    const map = new Map<string, string>();
    sortedFlights.forEach((fl) => {
      const key = `${fl.originCode}->${fl.destinationCode}`;
      if (!map.has(key)) {
        map.set(key, `${fl.originCode} → ${fl.destinationCode}`);
      }
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [sortedFlights]);

  const filteredFlights = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedFlights.filter((fl) => {
      const unitFare = getFareRate ? getFareRate(fl.farePerPax) : fl.farePerPax;
      if (priceRange && (unitFare < priceRange[0] || unitFare > priceRange[1])) {
        return false;
      }
      if (routeFilter !== 'ALL' && `${fl.originCode}->${fl.destinationCode}` !== routeFilter) {
        return false;
      }
      if (dateFilter && fl.departureDate !== dateFilter) {
        return false;
      }
      if (statusFilter === 'UPCOMING') {
        if (fl.status === 'DEPARTED' || (fl.departureDate && fl.departureDate < todayIso)) {
          return false;
        }
      } else if (statusFilter === 'LIMITED') {
        if (fl.status !== 'LIMITED SEATS' && fl.seatsAvailable > 8) {
          return false;
        }
      }

      if (!q) return true;
      const haystack = [
        fl.airline,
        fl.flightNumber,
        fl.originCode,
        fl.originCity,
        fl.destinationCode,
        fl.destinationCity,
        fl.tripTitle,
        fl.departureDate,
        fl.cabinClass,
        fl.notes,
        `${fl.originCode} ${fl.destinationCode}`,
        `${fl.originCode}->${fl.destinationCode}`,
        `${fl.originCode}→${fl.destinationCode}`
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedFlights, searchQuery, dateFilter, routeFilter, statusFilter, todayIso, priceRange, getFareRate]);

  const isMobileUpper = variant === 'mobile-upper';
  const isFull = variant === 'full';
  const hasActiveSearch = Boolean(
    searchQuery.trim() || dateFilter || routeFilter !== 'ALL' || statusFilter !== 'ALL'
  );
  const shouldShowResults = isFull || searchTriggered || hasActiveSearch;
  const maxDefaultCards = variant === 'mobile-upper' ? 4 : variant === 'desktop-upper' ? 4 : filteredFlights.length;
  const displayedFlights =
    showAllRows || hasActiveSearch || isFull ? filteredFlights : filteredFlights.slice(0, maxDefaultCards);

  const openInquiryPrefilled = (preset?: { flight?: AvailableFlight; fromSearch?: boolean }) => {
    setSubmittedRecord(null);
    if (preset?.flight) {
      const fl = preset.flight;
      setInquiryAirline(fl.airline);
      setInquiryFlightCode(fl.flightNumber);
      setInquiryOrigin(`${fl.originCode} (${fl.originCity})`);
      setInquiryDestination(`${fl.destinationCode} (${fl.destinationCity})`);
      setInquiryDate(fl.departureDate || getDefaultFutureDate(5));
      setInquiryType('general_flight');
      setInquiryNotes(`Inquiry regarding ${fl.airline} ${fl.flightNumber} (${fl.originCode} → ${fl.destinationCode} on ${fl.departureDate}): `);
    } else if (preset?.fromSearch) {
      const q = searchQuery.trim();
      const routeParts = routeFilter !== 'ALL' ? routeFilter.split('->') : [];
      const looksLikeCode = /^[a-zA-Z]{2}\s*\d{2,4}$/i.test(q);
      setInquiryFlightCode(looksLikeCode ? q.toUpperCase() : '');
      setInquiryAirline(!looksLikeCode && q ? q : '');
      setInquiryOrigin(routeParts[0] || 'KUL');
      setInquiryDestination(routeParts[1] || (!looksLikeCode && q ? q : ''));
      setInquiryDate(dateFilter || getDefaultFutureDate(5));
      setInquiryType('fare_quote');
      setInquiryNotes(q ? `Requesting airline fare quote / fare code for search: "${q}"` : '');
    } else {
      setInquiryAirline('');
      setInquiryFlightCode('');
      setInquiryOrigin('KUL');
      setInquiryDestination('');
      setInquiryDate(dateFilter || getDefaultFutureDate(5));
      setInquiryType('fare_quote');
      setInquiryNotes('');
    }
    setInquiryOpen(true);
  };

  const handleInquiryFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryCustomerEmail.trim() || (!inquiryAirline.trim() && !inquiryDestination.trim() && !inquiryFlightCode.trim())) {
      return;
    }
    setSubmittingInquiry(true);
    try {
      const payload = {
        airline: inquiryAirline.trim() || 'Preferred Airline',
        flightCode: inquiryFlightCode.trim() || undefined,
        origin: inquiryOrigin.trim() || 'KUL',
        destination: inquiryDestination.trim() || 'Malaysia / International',
        departureDate: inquiryDate || getDefaultFutureDate(5),
        pax: Number(inquiryPax) || 1,
        inquiryType,
        customerName: inquiryName.trim(),
        customerEmail: inquiryCustomerEmail.trim(),
        customerPhone: inquiryPhone.trim() || '-',
        notes: inquiryNotes.trim() || 'Requesting latest airline fare quote / booking code.'
      };

      let saved: FlightInquiry | null = null;
      if (onSubmitInquiry) {
        saved = await onSubmitInquiry(payload);
      }

      const fallbackRecord: FlightInquiry = saved || {
        ...payload,
        id: `FLT-${Math.floor(100000 + Math.random() * 900000)}`,
        targetEmail: flightsEmail,
        status: 'NEW',
        createdAt: new Date().toISOString().split('T')[0]
      };

      setSubmittedRecord(fallbackRecord);
      setInquiryNotes('');
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const buildMailtoHref = (rec?: FlightInquiry | null) => {
    const subject = rec
      ? `[${rec.id}] Airline Fare Quote / Flight Inquiry: ${rec.airline}${rec.flightCode ? ` (${rec.flightCode})` : ''} - ${rec.origin} to ${rec.destination}`
      : `Airline Fare Quote / Flight Inquiry (${searchQuery.trim() || 'Custom Route'})`;
    const body = rec
      ? [
          `Reference: ${rec.id}`,
          `Airline: ${rec.airline}`,
          rec.flightCode ? `Flight / Fare Code: ${rec.flightCode}` : '',
          `Route: ${rec.origin} -> ${rec.destination}`,
          `Travel Date: ${rec.departureDate}`,
          `Passengers: ${rec.pax}`,
          `Inquiry Type: ${rec.inquiryType}`,
          `Name: ${rec.customerName}`,
          `Email: ${rec.customerEmail}`,
          `Phone/WhatsApp: ${rec.customerPhone}`,
          `Notes: ${rec.notes || '-'}`
        ]
          .filter(Boolean)
          .join('\n')
      : `Hello GFK Flight Desk,\n\nI would like to request an airline fare quote / fare code for:\nSearch: ${searchQuery || 'Custom flight'}\nDate: ${dateFilter || 'Flexible'}\n\nPlease reply with availability and fare quote.`;
    return `mailto:${flightsEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const renderEmptyInquiryBox = () => (
    <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-sky-800 bg-sky-100 border border-sky-200 px-2.5 py-0.5 rounded-lg mb-1.5">
            <Plane className="w-3.5 h-3.5" />
            <span>No Matching Flight Record Found</span>
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-zinc-950">
            Ask for the Airline Fare Quote / Code Directly
          </h3>
          <p className="text-xs text-zinc-600 mt-0.5">
            No live seat record matched{' '}
            {searchQuery.trim() ? <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> : 'your filter'}. Submit your airline, route, or fare code request right here — routed directly to{' '}
            <strong className="text-sky-800">{flightsEmail}</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
            setDateFilter('');
            setRouteFilter('ALL');
            setStatusFilter('ALL');
            if (onResetPriceRange) onResetPriceRange();
          }}
          className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 px-3 py-2 rounded-xl cursor-pointer shrink-0 self-start sm:self-auto"
        >
          Reset Search
        </button>
      </div>

      {submittedRecord ? (
        renderSubmittedConfirmation(submittedRecord)
      ) : (
        <form onSubmit={handleInquiryFormSubmit} className="bg-white border border-sky-200/80 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Airline / Carrier *</label>
              <input
                type="text"
                required
                value={inquiryAirline || (!/^[a-zA-Z]{2}\s*\d{2,4}$/i.test(searchQuery.trim()) ? searchQuery : '')}
                onChange={(e) => setInquiryAirline(e.target.value)}
                placeholder="e.g. Malaysia Airlines, AirAsia"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Flight / Fare Code (Optional)</label>
              <input
                type="text"
                value={inquiryFlightCode}
                onChange={(e) => setInquiryFlightCode(e.target.value.toUpperCase())}
                placeholder="e.g. MH 1432 / Fare Code"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold font-mono text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">From → To Route *</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  required
                  value={inquiryOrigin}
                  onChange={(e) => setInquiryOrigin(e.target.value)}
                  placeholder="KUL"
                  className="w-20 px-2.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
                />
                <span className="text-zinc-400 text-xs font-bold">→</span>
                <input
                  type="text"
                  required
                  value={inquiryDestination}
                  onChange={(e) => setInquiryDestination(e.target.value)}
                  placeholder="LGK / Destination"
                  className="flex-1 min-w-0 px-2.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Travel Date *</label>
                <input
                  type="date"
                  required
                  value={inquiryDate || dateFilter}
                  onChange={(e) => setInquiryDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Pax</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={inquiryPax}
                  onChange={(e) => setInquiryPax(Number(e.target.value) || 1)}
                  className="w-full px-2.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={inquiryName}
                onChange={(e) => setInquiryName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={inquiryCustomerEmail}
                onChange={(e) => setInquiryCustomerEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">WhatsApp / Phone *</label>
              <input
                type="tel"
                required
                value={inquiryPhone}
                onChange={(e) => setInquiryPhone(e.target.value)}
                placeholder="+60 12-345 6789"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 mb-1">
              Fare Quote / Code Details (Non-banking flight inquiry)
            </label>
            <textarea
              rows={2}
              value={inquiryNotes}
              onChange={(e) => setInquiryNotes(e.target.value)}
              placeholder="Specify cabin preference, return date, baggage needs, or airline fare code you want quoted..."
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:bg-white focus:border-sky-600 outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <p className="text-[11px] text-zinc-500">
              Sent directly to <strong className="text-sky-800">{flightsEmail}</strong> · Payments &amp; banking go to{' '}
              <strong className="text-zinc-800">{bookingEmail}</strong>
            </p>
            <button
              type="submit"
              disabled={submittingInquiry}
              className="bg-sky-700 hover:bg-sky-800 disabled:bg-zinc-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingInquiry ? 'Sending Request...' : 'Request Airline Fare Quote / Code'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const renderSubmittedConfirmation = (rec: FlightInquiry) => (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-emerald-950">
            Flight Inquiry Sent to {flightsEmail}
          </div>
          <p className="text-xs text-emerald-900 mt-0.5">
            Reference <strong className="font-mono">{rec.id}</strong> · {rec.airline}
            {rec.flightCode ? ` (${rec.flightCode})` : ''} · {rec.origin} → {rec.destination} ({rec.departureDate}, {rec.pax} pax)
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <a
          href={buildMailtoHref(rec)}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold"
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email {flightsEmail} Directly</span>
        </a>
        <button
          type="button"
          onClick={() => {
            setSubmittedRecord(null);
            setInquiryOpen(false);
          }}
          className="text-xs font-bold text-emerald-800 hover:underline px-2 py-1 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <section
      id={!isFull ? sectionId || 'flights' : undefined}
      className={
        isMobileUpper
          ? 'scroll-mt-16 w-full max-w-full overflow-x-clip px-3.5 py-6 bg-white border-b border-zinc-200'
          : isFull
          ? 'w-full max-w-full space-y-5'
          : 'scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full'
      }
    >
      <div
        className={
          isMobileUpper
            ? 'space-y-4'
            : isFull
            ? 'space-y-5'
            : 'bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xs space-y-5'
        }
      >
        {/* Bold Differentiated Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3.5 border-b border-zinc-200">
          <div className="border-l-4 border-sky-700 pl-3 sm:pl-4">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-widest text-sky-700">
              <Plane className="w-3.5 h-3.5 shrink-0" />
              <span>Flight Search Desk</span>
            </div>
            <h2
              className={
                isMobileUpper
                  ? 'text-xl font-black text-zinc-950 tracking-tight leading-tight mt-0.5'
                  : 'text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight leading-tight mt-1'
              }
            >
              Search Available Flights
            </h2>
            <p className="text-[11px] sm:text-sm font-medium text-zinc-500 mt-1">
              {isFull
                ? `Soonest departures first — search by airline, flight code, or route.`
                : `Enter an airline, flight code, route, or date to check available departures and live fares.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openInquiryPrefilled({ fromSearch: Boolean(searchQuery.trim()) })}
              className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>Ask Fare Quote / Code</span>
            </button>

            {!isFull && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('/flights')}
                className="text-xs font-bold text-sky-700 hover:text-sky-800 inline-flex items-center gap-0.5 cursor-pointer py-1 px-1"
              >
                <span>All Flights ({sortedFlights.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Flight Search & Filter Strip (Search-Only until submitted/filtered on Home) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchTriggered(true);
          }}
          className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 sm:p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-6 relative flex items-center bg-white border border-zinc-200 rounded-xl px-3 py-2.5 focus-within:border-sky-600">
              <Search className="w-4 h-4 text-sky-700 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Flight code, airline, city or route (e.g. MH 1432, KUL, Langkawi)..."
                className="w-full text-xs sm:text-sm font-semibold text-zinc-900 bg-transparent outline-none placeholder-zinc-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                  aria-label="Clear flight search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="sm:col-span-3 flex items-center bg-white border border-zinc-200 rounded-xl px-3 py-2 focus-within:border-sky-600">
              <Calendar className="w-4 h-4 text-sky-700 mr-2 shrink-0" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full text-xs font-semibold text-zinc-900 bg-transparent outline-none"
                aria-label="Filter by departure date"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer ml-1"
                  aria-label="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="sm:col-span-3 flex gap-1.5">
              {isFull ? (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-zinc-800 outline-none cursor-pointer"
                >
                  <option value="ALL">All Flights</option>
                  <option value="UPCOMING">Upcoming Only</option>
                  <option value="LIMITED">Limited Seats</option>
                </select>
              ) : (
                <div className="w-full flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 bg-sky-700 hover:bg-sky-800 text-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span>Search Flights</span>
                  </button>
                  {shouldShowResults && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDateFilter('');
                        setRouteFilter('ALL');
                        setStatusFilter('ALL');
                        setSearchTriggered(false);
                        setShowAllRows(false);
                      }}
                      className="px-3 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Route Filter Chips */}
          {uniqueRoutes.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain no-scrollbar pt-0.5">
              <span className="text-[10.5px] font-bold text-zinc-500 shrink-0 mr-1">
                Quick Routes:
              </span>
              {uniqueRoutes.map((rt) => (
                <button
                  key={rt.key}
                  type="button"
                  onClick={() => {
                    setRouteFilter(rt.key);
                    setSearchTriggered(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer border transition-colors tabular-nums ${
                    routeFilter === rt.key
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-sky-400'
                  }`}
                >
                  {rt.label}
                </button>
              ))}
              {routeFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    setRouteFilter('ALL');
                    if (!searchQuery.trim() && !dateFilter) {
                      setSearchTriggered(true);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer border bg-zinc-200 text-zinc-800 border-zinc-300"
                >
                  All Routes
                </button>
              )}
            </div>
          )}
        </form>

        {/* Dedicated Routing Clarity Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 bg-sky-50/50 border border-sky-200/70 rounded-xl px-3 py-2">
          <span className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span>
              Flight Quotes, Fare Codes &amp; Inquiries:{' '}
              <a href={`mailto:${flightsEmail}`} className="font-bold text-sky-800 hover:underline">
                {flightsEmail}
              </a>
            </span>
          </span>
          <span className="text-zinc-500">
            Payments &amp; Bank Slips:{' '}
            <a href={`mailto:${bookingEmail}`} className="font-bold text-zinc-800 hover:underline">
              {bookingEmail}
            </a>
          </span>
        </div>

        {/* Flight Results: Shown ONLY after search is triggered on Home (always shown on /flights full page) */}
        {!shouldShowResults ? null : filteredFlights.length === 0 ? (
          renderEmptyInquiryBox()
        ) : (
          <div className="space-y-3">
            <div
              className={
                isMobileUpper
                  ? 'space-y-2.5'
                  : isFull
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5'
              }
            >
              {displayedFlights.map((fl, idx) => {
                const unitFare = getFareRate ? getFareRate(fl.farePerPax) : fl.farePerPax;
                const isClosed = fl.status === 'DEPARTED' || fl.seatsAvailable <= 0;
                const upcomingTag = getUpcomingLabel(fl.departureDate, fl.status, todayIso);

                return (
                  <div
                    key={fl.id}
                    className="bg-zinc-50/70 hover:bg-white border border-zinc-200 hover:border-sky-500/60 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5 transition-colors"
                  >
                    <div className="space-y-2">
                      {/* Airline + Upcoming / Live Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                            <Plane className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-zinc-950 truncate">
                              {fl.airline} · <span className="font-mono text-sky-700">{fl.flightNumber}</span>
                            </div>
                            <div className="text-[10.5px] text-zinc-500 font-semibold truncate">
                              {fl.departureDate} · {fl.cabinClass || 'Economy'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {idx === 0 && upcomingTag && (
                            <span className="px-1.5 py-0.5 rounded-md bg-sky-700 text-white text-[9px] font-black uppercase tracking-wide">
                              {upcomingTag}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[9.5px] font-black uppercase tracking-wide ${getStatusBadgeClass(
                              fl.status
                            )}`}
                          >
                            {fl.status}
                          </span>
                        </div>
                      </div>

                      {/* Route Strip */}
                      <div className="bg-white border border-zinc-200/80 rounded-xl px-3 py-2 flex items-center justify-between gap-2 tabular-nums">
                        <div>
                          <div className="text-sm font-black text-zinc-950 leading-none">{fl.originCode}</div>
                          <div className="text-[10px] text-zinc-500 font-semibold mt-0.5">{fl.departureTime}</div>
                        </div>
                        <div className="flex-1 flex flex-col items-center px-2 min-w-0">
                          <div className="w-full flex items-center gap-1">
                            <span className="h-px flex-1 bg-zinc-300" />
                            <Plane className="w-3 h-3 text-sky-600 shrink-0" />
                            <span className="h-px flex-1 bg-zinc-300" />
                          </div>
                          <span className="text-[9.5px] text-zinc-500 font-semibold mt-0.5 truncate max-w-full">
                            {fl.baggage || '20kg Included'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-zinc-950 leading-none">{fl.destinationCode}</div>
                          <div className="text-[10px] text-zinc-500 font-semibold mt-0.5">{fl.arrivalTime}</div>
                        </div>
                      </div>

                      {fl.tripTitle && (
                        <div className="text-[10.5px] font-semibold text-emerald-700 truncate">
                          Upcoming Trip: {fl.tripTitle}
                        </div>
                      )}
                      {isFull && fl.notes && (
                        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{fl.notes}</p>
                      )}
                    </div>

                    {/* Fare & Actions */}
                    <div className="pt-2 border-t border-zinc-200/70 flex items-center justify-between gap-2">
                      <div className="tabular-nums">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-extrabold text-zinc-950">
                            {formatPrice(Number(unitFare) || 0)}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            · {fl.seatsAvailable} left
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium block">
                          per traveler · taxes included
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openInquiryPrefilled({ flight: fl })}
                          className="px-2.5 py-1.5 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 text-sky-800 text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors"
                          title={`Ask flight desk (${flightsEmail})`}
                        >
                          Ask Desk
                        </button>
                        <button
                          type="button"
                          disabled={isClosed}
                          onClick={() => onReserveFlight(fl)}
                          className="bg-zinc-950 hover:bg-sky-700 disabled:bg-zinc-300 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors"
                        >
                          {isClosed ? 'Departed' : 'Reserve'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expand More / Custom Quote Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {!isFull && !hasActiveSearch && filteredFlights.length > maxDefaultCards ? (
                <button
                  type="button"
                  onClick={() => setShowAllRows(!showAllRows)}
                  className="text-xs font-bold text-sky-700 hover:text-sky-800 cursor-pointer"
                >
                  {showAllRows
                    ? 'Show Fewer Flights'
                    : `Show All ${filteredFlights.length} Upcoming Flights`}
                </button>
              ) : (
                <span className="text-[11px] font-medium text-zinc-500">
                  Showing {displayedFlights.length} of {filteredFlights.length} flights (upcoming first)
                </span>
              )}

              <button
                type="button"
                onClick={() => openInquiryPrefilled({ fromSearch: Boolean(searchQuery.trim()) })}
                className="text-xs font-bold text-sky-800 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Need another airline fare quote or code? Ask {flightsEmail}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Flight Fare Quote / Code & Non-Banking Flight Inquiry Modal */}
      {inquiryOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInquiryOpen(false)}
        >
          <div
            className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between gap-3 bg-zinc-50">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-700 uppercase tracking-wide">
                  <Plane className="w-3.5 h-3.5" />
                  <span>Routed to {flightsEmail}</span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-zinc-950 mt-0.5">
                  Request Airline Fare Quote / Flight Inquiry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInquiryOpen(false)}
                className="p-2 rounded-full hover:bg-zinc-200 text-zinc-500 cursor-pointer"
                aria-label="Close flight inquiry modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {submittedRecord ? (
                renderSubmittedConfirmation(submittedRecord)
              ) : (
                <form onSubmit={handleInquiryFormSubmit} className="space-y-3.5">
                  <div className="bg-sky-50 border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-sky-900 leading-relaxed">
                    <strong>Email Routing Notice:</strong> All airline fare quotes, fare codes, baggage, and schedule inquiries go directly to{' '}
                    <strong>{flightsEmail}</strong>. For payments, invoices, or bank transfers, email{' '}
                    <strong>{bookingEmail}</strong>.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Inquiry Type *</label>
                      <select
                        value={inquiryType}
                        onChange={(e) => setInquiryType(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 outline-none focus:border-sky-600"
                      >
                        <option value="fare_quote">Request Airline Fare Quote / Code</option>
                        <option value="schedule_baggage">Flight Schedule / Baggage Question</option>
                        <option value="group_booking">Group Flight Allotment Request</option>
                        <option value="general_flight">General Flight Inquiry (Non-Banking)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Airline Name *</label>
                      <input
                        type="text"
                        required
                        value={inquiryAirline}
                        onChange={(e) => setInquiryAirline(e.target.value)}
                        placeholder="e.g. Malaysia Airlines, AirAsia"
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Flight / Fare Code</label>
                      <input
                        type="text"
                        value={inquiryFlightCode}
                        onChange={(e) => setInquiryFlightCode(e.target.value.toUpperCase())}
                        placeholder="e.g. MH 1432"
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold font-mono text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Origin *</label>
                      <input
                        type="text"
                        required
                        value={inquiryOrigin}
                        onChange={(e) => setInquiryOrigin(e.target.value)}
                        placeholder="KUL / Kuala Lumpur"
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Destination *</label>
                      <input
                        type="text"
                        required
                        value={inquiryDestination}
                        onChange={(e) => setInquiryDestination(e.target.value)}
                        placeholder="LGK / Langkawi"
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-700" /> Travel Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={inquiryDate}
                        onChange={(e) => setInquiryDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-sky-700" /> Passengers *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        required
                        value={inquiryPax}
                        onChange={(e) => setInquiryPax(Number(e.target.value) || 1)}
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={inquiryCustomerEmail}
                        onChange={(e) => setInquiryCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">WhatsApp / Phone *</label>
                      <input
                        type="tel"
                        required
                        value={inquiryPhone}
                        onChange={(e) => setInquiryPhone(e.target.value)}
                        placeholder="+60 12-345 6789"
                        className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-sky-700" /> Inquiry / Fare Details
                    </label>
                    <textarea
                      rows={3}
                      value={inquiryNotes}
                      onChange={(e) => setInquiryNotes(e.target.value)}
                      placeholder="Ask about airline fare quote, fare code, luggage allowance, infant ticket, or schedule..."
                      className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 outline-none focus:bg-white focus:border-sky-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingInquiry}
                    className="w-full bg-sky-700 hover:bg-sky-800 disabled:bg-zinc-400 text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {submittingInquiry
                        ? `Sending to ${flightsEmail}...`
                        : `Send Inquiry to ${flightsEmail}`}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
