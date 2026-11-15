import React, { useState, useEffect } from 'react';
import { Agent, Booking } from '../types';
import {
  useCurrencyRate,
  SupportedCurrency,
  CURRENCY_ORDER,
  SUPPORTED_CURRENCIES,
  formatCurrencyValue
} from '../lib/currency';
import {
  ShieldCheck,
  Users,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Lock,
  Globe
} from 'lucide-react';

export interface StripeCheckoutMeta {
  currency: SupportedCurrency;
  xeRate: number;
  chargedAmount: number;
  chargedAmountInr: number;
}

interface CheckoutFormProps {
  product: any;
  pax: number;
  date: string;
  timeSlot?: string;
  optionName?: string;
  displayPrice: number;
  total: number;
  commission: number;
  userRole: 'guest' | 'customer' | 'agent' | 'admin';
  currentUser: Agent | null;
  bookingEmail?: string;
  flightsEmail?: string;
  assignedDeskEmail?: string;
  serviceHierarchyLabel?: string;
  onConfirm: (
    clientName: string,
    email: string,
    phone: string,
    paymentMethod: 'stripe' | 'credit',
    stripeMeta: StripeCheckoutMeta
  ) => void | Promise<void>;
  onCancel: () => void;
  backLabel?: string;
  showToast: (msg: string) => void;
}

export function CheckoutForm({
  product,
  pax,
  date,
  timeSlot = 'Standard Admission Hour',
  optionName,
  displayPrice,
  total,
  commission,
  userRole,
  currentUser,
  bookingEmail = 'booking@gfkholidays.com',
  flightsEmail = 'flights@gfkholidays.com',
  assignedDeskEmail,
  serviceHierarchyLabel,
  onConfirm,
  onCancel,
  backLabel = 'Back',
  showToast
}: CheckoutFormProps) {
  const {
    currency: detectedCurrency,
    geoInfo,
    getEffectiveRateFor,
    convertToCurrencyExact,
    formatExact,
    toInrExact
  } = useCurrencyRate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'credit'>('stripe');
  const [paymentCurrency, setPaymentCurrency] = useState<SupportedCurrency>(detectedCurrency || 'INR');
  const [hasCustomCurrencyChoice, setHasCustomCurrencyChoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync payment currency to resolved visitor region unless customer manually picked another currency (e.g. USD)
  useEffect(() => {
    if (!hasCustomCurrencyChoice && detectedCurrency) {
      setPaymentCurrency(detectedCurrency);
    }
  }, [detectedCurrency, hasCustomCurrencyChoice]);

  const productTitle = product?.title || product?.name || 'Selected Travel Service';
  const safeTotalMyr = Number(total) || 0;
  const safeUnitMyr = Number(displayPrice || product?.base_price || product?.price || 0);

  const activeCurrencyMeta = SUPPORTED_CURRENCIES[paymentCurrency] || SUPPORTED_CURRENCIES.INR;
  const effectivePayRate = getEffectiveRateFor(paymentCurrency);
  const exactPayableAmount = convertToCurrencyExact(safeTotalMyr, paymentCurrency);
  const exactUnitAmount = convertToCurrencyExact(safeUnitMyr, paymentCurrency);
  const exactInrEquivalent = toInrExact(safeTotalMyr);
  const formattedPayable = formatExact(exactPayableAmount, paymentCurrency);
  const formattedUnit = formatExact(exactUnitAmount, paymentCurrency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      showToast('Please fill out all mandatory traveler fields');
      return;
    }

    if (userRole === 'agent' && currentUser && paymentMethod === 'credit') {
      if (currentUser.wallet.credit < safeTotalMyr) {
        showToast(
          `Insufficient credit balance. You need RM ${safeTotalMyr} but have RM ${currentUser.wallet.credit}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const leadName = `${firstName.trim()} ${lastName.trim()}`;
      await onConfirm(leadName, email.trim(), phone.trim(), paymentMethod, {
        currency: paymentCurrency,
        xeRate: effectivePayRate,
        chargedAmount: exactPayableAmount,
        chargedAmountInr: exactInrEquivalent
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-16 animate-fade-in w-full font-sans text-zinc-900">
      {/* Top Back Bar & Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </button>

        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight">
          Stripe Checkout &amp; Booking Confirmation
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Localized for {geoInfo.countryName || geoInfo.countryCode || 'your region'} ({detectedCurrency}). Switch payment currency below if you prefer to settle in USD or another currency.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Trip Summary Column (Top on Mobile, Right Sticky on Desktop) */}
        <div className="lg:col-span-5 order-first lg:order-last">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 lg:sticky lg:top-24 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3.5">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block">
                  {serviceHierarchyLabel || product?.category || 'Malaysia Experience'}
                </span>
                <h2 className="text-base font-extrabold text-zinc-950 leading-snug mt-0.5">
                  {productTitle}
                </h2>
                {optionName && (
                  <p className="text-xs font-semibold text-zinc-500 mt-1">{optionName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 text-sm text-zinc-600">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-zinc-500">
                  <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Travel Date</span>
                </span>
                <span className="font-bold text-zinc-900">{date}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-zinc-500">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Schedule</span>
                </span>
                <span className="font-bold text-zinc-900">{timeSlot}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-zinc-500">
                  <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Travelers</span>
                </span>
                <span className="font-bold text-zinc-900">
                  {pax} {pax === 1 ? 'Traveler' : 'Travelers'}
                </span>
              </div>
            </div>

            {/* Clean Itemized Settlement Summary */}
            <div className="border-t border-zinc-100 pt-3.5 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>
                  Base Rate ({pax} &times; {formattedUnit})
                </span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {formattedPayable}
                </span>
              </div>

              {userRole === 'agent' && commission > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>B2B Net Discount Included</span>
                  <span>Applied</span>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-200 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-bold text-zinc-900 block">
                    Amount to Pay via Stripe
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Settled in {activeCurrencyMeta.label}
                  </span>
                </div>
                <span className="text-2xl font-black text-zinc-950 tracking-tight tabular-nums">
                  {formattedPayable}
                </span>
              </div>
            </div>

            {userRole === 'agent' && currentUser && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs text-zinc-600 flex items-center justify-between">
                <span className="font-semibold">
                  {paymentMethod === 'credit' ? 'Wallet Balance After:' : 'Payment Gateway:'}
                </span>
                <span className="font-bold text-indigo-700">
                  {paymentMethod === 'credit'
                    ? `RM ${((Number(currentUser?.wallet?.credit) || 0) - safeTotalMyr).toLocaleString()}`
                    : `Stripe (${paymentCurrency})`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Left Form Column */}
        <div className="lg:col-span-7 order-last lg:order-first">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Traveler Contact Details */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>Lead Traveler Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    First Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 outline-none focus:bg-white focus:border-emerald-600 transition-colors"
                    placeholder="e.g. Isveen"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Last Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 outline-none focus:bg-white focus:border-emerald-600 transition-colors"
                    placeholder="e.g. Kaur"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Email Address (for Voucher &amp; Stripe Receipt) *
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 outline-none focus:bg-white focus:border-emerald-600 transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Mobile / WhatsApp Number *
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-900 outline-none focus:bg-white focus:border-emerald-600 transition-colors"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>

            {/* Stripe-Only Settlement Card with Final Checkout Currency Conversion */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>Payment Method &amp; Checkout Currency</span>
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                  <Lock className="w-3 h-3" />
                  <span>Stripe Secured</span>
                </span>
              </div>

              {/* Optional Final Payment Currency Selector (USD, INR, MYR, SGD, GBP, EUR, AED, AUD) */}
              {paymentMethod === 'stripe' && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-zinc-800 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Select Payment Currency (Stripe Checkout)</span>
                    </label>
                    <span className="text-[11px] font-semibold text-zinc-500">
                      Auto-detected: {detectedCurrency}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CURRENCY_ORDER.map((code) => {
                      const meta = SUPPORTED_CURRENCIES[code];
                      const active = paymentCurrency === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            setPaymentCurrency(code);
                            setHasCustomCurrencyChoice(true);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-colors cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                          }`}
                        >
                          {meta.symbol.trim()} {code}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Your booking total is automatically converted to <strong>{activeCurrencyMeta.label}</strong> ({formattedPayable}) for settlement on Stripe.
                  </p>
                </div>
              )}

              <div className={userRole === 'agent' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    paymentMethod === 'stripe'
                      ? 'border-indigo-600 bg-indigo-50/50 text-zinc-950'
                      : 'border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CreditCard
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        paymentMethod === 'stripe' ? 'text-indigo-700' : 'text-zinc-400'
                      }`}
                    />
                    <div>
                      <p className="text-xs font-extrabold text-zinc-950">
                        Pay Online via Stripe ({paymentCurrency})
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Cards, International Visa / Mastercard, &amp; Stripe Checkout ({formattedPayable})
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-indigo-700 tabular-nums shrink-0">
                    {formattedPayable}
                  </span>
                </button>

                {userRole === 'agent' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      paymentMethod === 'credit'
                        ? 'border-emerald-600 bg-emerald-50/60 text-zinc-950'
                        : 'border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-600'
                    }`}
                  >
                    <ShieldCheck
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        paymentMethod === 'credit' ? 'text-emerald-700' : 'text-zinc-400'
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Agent Wallet</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Balance: RM {(Number(currentUser?.wallet?.credit) || 0).toLocaleString()}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Concise Stripe & Desk Routing Notice */}
            <div className="bg-amber-50/80 border border-amber-200 px-4 py-3 rounded-xl text-xs text-amber-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Stripe Settlement &amp; Allotment Notice</span>
              </div>
              <p>
                Bookings must be placed at least 24 hours in advance and are settled directly on our platform in your selected currency ({paymentCurrency}). Service desk:{' '}
                <strong className="text-amber-950">{assignedDeskEmail || bookingEmail}</strong> · Stripe billing &amp; receipts:{' '}
                <strong className="text-amber-950">{bookingEmail}</strong>.
              </p>
              {(product?.category === 'Flight' || product?.isFlight) && (
                <p className="text-sky-900 pt-1">
                  For non-banking flight inquiries (baggage, schedule, or airline fare codes), contact{' '}
                  <strong>{flightsEmail}</strong>.
                </p>
              )}
            </div>

            {/* Confirm Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white py-3.5 px-6 rounded-xl font-bold text-sm shadow-sm transition-colors flex justify-center items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Preparing Stripe Checkout...'
                  : paymentMethod === 'credit'
                  ? `Confirm with Agent Wallet · RM ${safeTotalMyr.toLocaleString()}`
                  : `Proceed to Pay with Stripe · ${formattedPayable}`}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

interface BookingSuccessProps {
  booking: Booking;
  product: any;
  userRole: 'guest' | 'customer' | 'agent' | 'admin';
  bookingEmail?: string;
  flightsEmail?: string;
  assignedDeskEmail?: string;
  serviceHierarchyLabel?: string;
  onNavigate: (path: string, params?: any) => void;
}

export function BookingSuccess({
  booking,
  product,
  userRole,
  bookingEmail = 'booking@gfkholidays.com',
  flightsEmail = 'flights@gfkholidays.com',
  assignedDeskEmail,
  serviceHierarchyLabel,
  onNavigate
}: BookingSuccessProps) {
  const settledCurrency = (booking.currency as SupportedCurrency) || 'INR';
  const settledAmount =
    booking.chargedAmount ??
    (settledCurrency === 'INR' ? booking.chargedAmountInr : undefined);
  const formattedSettled =
    settledAmount !== undefined
      ? formatCurrencyValue(settledAmount, settledCurrency, true)
      : `RM ${booking.total.toLocaleString()}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16 animate-fade-in w-full font-sans">
      {/* Top Banner Success */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
          <CheckCircle className="w-7 h-7 text-emerald-700" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 mb-2 tracking-tight">
          Booking &amp; Stripe Request Confirmed
        </h1>
        <p className="text-zinc-600 font-medium text-sm leading-relaxed mb-3">
          {serviceHierarchyLabel ? (
            <>
              Routed to <strong>{serviceHierarchyLabel}</strong> (<span className="font-bold text-zinc-800">{assignedDeskEmail || bookingEmail}</span>).{' '}
            </>
          ) : null}
          All Stripe payment links, receipts &amp; billing confirmations come from{' '}
          <span className="font-bold text-zinc-800">{bookingEmail}</span>
          {(product?.category === 'Flight' || product?.isFlight) && (
            <>
              {' '}· Flight desk queries via <span className="font-bold text-sky-800">{flightsEmail}</span>
            </>
          )}
          .
        </p>
        <p className="text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 rounded-xl">
          Settlement Method: <strong>Stripe ({settledCurrency})</strong> · Need billing assistance? Email{' '}
          <strong>{bookingEmail}</strong>.
        </p>
      </div>

      {/* Voucher Display */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-xs text-left max-w-2xl mx-auto space-y-5 animate-fade-in">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-150">
          <div>
            <span className="text-[0.6rem] font-bold text-zinc-400 uppercase tracking-wider block">
              Reference Voucher ID
            </span>
            <span className="text-lg font-bold text-zinc-900 mt-1 block font-mono">{booking.id}</span>
          </div>
          <span
            className={`border font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider ${
              booking.status === 'CONFIRMED'
                ? 'bg-emerald-50 border-emerald-150 text-emerald-700'
                : booking.status === 'REQUEST_RECEIVED'
                ? 'bg-blue-50 border-blue-150 text-blue-700'
                : booking.status === 'CANCELLED'
                ? 'bg-red-50 border-red-150 text-red-700'
                : 'bg-amber-50 border-amber-150 text-amber-700'
            }`}
          >
            {booking.status === 'REQUEST_RECEIVED' ? 'STRIPE PENDING' : booking.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold text-zinc-500">
          <div>
            <span className="block mb-1 text-zinc-400">Lead Passenger</span>
            <p className="text-zinc-900 font-bold text-sm">{booking.client}</p>
          </div>
          <div>
            <span className="block mb-1 text-zinc-400">Travel Date</span>
            <p className="text-zinc-900 font-bold text-sm">{booking.date}</p>
          </div>
          <div>
            <span className="block mb-1 text-zinc-400">Selected Time Slot</span>
            <p className="text-zinc-900 font-bold text-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {booking.timeSlot || 'Standard Hours'}
            </p>
          </div>
          <div>
            <span className="block mb-1 text-zinc-400">Created Timestamp</span>
            <p className="text-zinc-900 font-bold text-sm">{booking.createdAt}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="block mb-1 text-zinc-400">Reserved Product</span>
            <p className="text-zinc-900 font-bold text-sm leading-snug">
              {product ? product.title : 'Selected Listing'}
            </p>
          </div>
          <div className="border-t border-zinc-150 pt-4 sm:col-span-2 flex flex-wrap justify-between items-center gap-2 text-zinc-900">
            <div>
              <span className="font-bold block">Total Stripe Payable ({settledCurrency})</span>
              <span className="text-[11px] text-zinc-500 font-medium">
                All-inclusive Stripe {settledCurrency} settlement
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-indigo-700 block tabular-nums">
                {formattedSettled}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Triggers */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
        <button
          onClick={() => onNavigate(userRole === 'agent' ? '/agent' : '/')}
          className="bg-zinc-950 hover:bg-zinc-850 text-white font-bold py-4 px-8 rounded-full text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer border-none"
        >
          {userRole === 'agent' ? 'Return to Agent Hub' : 'Go to Homepage'}
        </button>
        <button
          onClick={() => onNavigate('/search')}
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-850 font-bold py-4 px-8 rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
        >
          Browse other services
        </button>
      </div>
    </div>
  );
}
