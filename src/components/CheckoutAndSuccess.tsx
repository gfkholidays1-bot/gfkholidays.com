import React, { useState } from 'react';
import { Agent, Booking } from '../types';
import { 
  ShieldCheck, Mail, Users, ArrowRight, CheckCircle, 
  FileText, ArrowLeft, Calendar, Clock, DollarSign, 
  Send, Phone, Landmark, ChevronRight, Inbox, HelpCircle,
  CreditCard
} from 'lucide-react';

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
  onConfirm: (clientName: string, email: string, phone: string, paymentMethod: 'credit' | 'bank_transfer') => void;
  onCancel: () => void;
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
  onConfirm,
  onCancel,
  showToast
}: CheckoutFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'bank_transfer'>(
    userRole === 'agent' ? 'credit' : 'bank_transfer'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !phone) {
      showToast('Please fill out all mandatory traveler fields');
      return;
    }

    // Agent credit safety checks
    if (userRole === 'agent' && currentUser && paymentMethod === 'credit') {
      if (currentUser.wallet.credit < total) {
        showToast(`Insufficient credit balance. You need RM ${total} but have RM ${currentUser.wallet.credit}`);
        return;
      }
    }

    const leadName = `${firstName} ${lastName}`;
    onConfirm(leadName, email, phone, paymentMethod);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 animate-fade-in w-full font-sans">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onCancel}
          className="bg-white p-2.5 rounded-full border border-zinc-200 text-zinc-400 hover:text-zinc-900 shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Reservation Checkout</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        
        {/* Left Form Column */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Traveler info card */}
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-zinc-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center">
                <Users className="w-5 h-5 mr-2.5 text-indigo-600" />
                Lead Traveler Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-semibold text-zinc-500">
                <div>
                  <label className="block mb-2 font-bold text-zinc-700">First Name (as in Passport)</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none font-semibold text-zinc-900 focus:ring-2 focus:ring-indigo-500/10 placeholder-zinc-300"
                    placeholder="e.g. Isveen"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-bold text-zinc-700">Last Name (Family Name)</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none font-semibold text-zinc-900 focus:ring-2 focus:ring-indigo-500/10 placeholder-zinc-300"
                    placeholder="e.g. Kaur"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-2 font-bold text-zinc-700">Primary Email Address</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none font-semibold text-zinc-900 focus:ring-2 focus:ring-indigo-500/10 placeholder-zinc-300"
                    placeholder="e.g. client@domain.com"
                  />
                  <p className="text-[0.65rem] text-zinc-400 mt-1.5 font-medium">
                    Your official booking voucher, invoice copy, and Maybank bank transfer instructions will be sent instantly to this address.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block mb-2 font-bold text-zinc-700">Mobile Contact Number (WhatsApp Preferred)</label>
                  <input
                    required
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none font-semibold text-zinc-900 focus:ring-2 focus:ring-indigo-500/10 placeholder-zinc-300"
                    placeholder="e.g. +60 12-345 6789"
                  />
                </div>
              </div>
            </div>

            {/* B2B Agent Payment Method Options */}
            {userRole === 'agent' && (
              <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-zinc-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center">
                    <Landmark className="w-5 h-5 mr-2.5 text-indigo-600" />
                    B2B Payment Mode Select
                  </h3>
                  <p className="text-zinc-400 text-xs mt-1 font-semibold">
                    Choose to debit from your GFK corporate wallet or transfer directly to our Malaysian corporate account.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Wallet Credit */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-4 ${
                      paymentMethod === 'credit'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950'
                        : 'border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-600'
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 mt-0.5 ${paymentMethod === 'credit' ? 'text-indigo-600' : 'text-zinc-400'}`} />
                    <div className="text-xs">
                      <p className="font-bold text-zinc-900">Corporate Wallet Credit</p>
                      <p className="text-[0.68rem] text-zinc-500 font-semibold mt-1">
                        Instant reservation settlement. Balance: RM {currentUser?.wallet.credit.toLocaleString()}
                      </p>
                    </div>
                  </button>

                  {/* Maybank Bank Transfer */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-4 ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950'
                        : 'border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-600'
                    }`}
                  >
                    <Landmark className={`w-5 h-5 mt-0.5 ${paymentMethod === 'bank_transfer' ? 'text-indigo-600' : 'text-zinc-400'}`} />
                    <div className="text-xs">
                      <p className="font-bold text-zinc-900">Maybank Direct Banking</p>
                      <p className="text-[0.68rem] text-zinc-500 font-semibold mt-1">
                        Transfer RM {total.toLocaleString()} directly to our Malaysian corporate account.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Terms reminder */}
            <div className="bg-amber-50/70 border border-amber-200/50 p-6 rounded-2xl space-y-2">
              <div className="flex items-center text-amber-900 font-bold text-xs gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Notice on Confirmation & 2-Hour Payment Deadline</span>
              </div>
              <p className="text-xs text-amber-850 font-semibold leading-relaxed">
                By confirming, you request this service. Bookings must be placed <strong className="text-amber-950 font-bold">at least 24 hours prior</strong> to the travel date. Please note that GFK <strong className="text-amber-950 font-bold">does not guarantee booking of that service</strong>, as allocations are subject to real-time physical confirmation.
              </p>
              <p className="text-xs text-amber-850 font-semibold leading-relaxed">
                For bank transfers (Retail &amp; B2B): Payment proof must be shared with <span className="font-bold text-amber-950">accounts@gfkholidays.com</span> <strong className="text-amber-950 font-bold">within 2 hours of invoice issuance</strong>, otherwise no tickets, packages, or services will be issued under any circumstances.
              </p>
            </div>

            {/* Confirm buttons */}
            <button
              type="submit"
              className="w-full bg-zinc-950 hover:bg-zinc-850 text-white py-4.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md transition-all flex justify-center items-center cursor-pointer border-none"
            >
              <ShieldCheck className="w-5 h-5 mr-2.5" />
              Confirm Booking & Generate Invoice
            </button>
          </form>
        </div>

        {/* Right Cart Summary Column */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 sticky top-28 space-y-6 shadow-sm">
            <div>
              <h3 className="font-bold text-lg text-zinc-900 tracking-tight">Booking Summary</h3>
              <p className="text-xs font-semibold text-zinc-400 mt-1">Pending GFK secure checkout</p>
            </div>

            <div className="border-t border-b border-zinc-150 py-4 space-y-3.5 text-xs font-semibold">
              <div>
                <h4 className="text-zinc-900 font-bold leading-snug">{product.title}</h4>
                <p className="text-[0.65rem] text-zinc-400 font-bold uppercase tracking-wider mt-1">
                  {product.category || 'Travel package'}{optionName ? ` • ${optionName}` : ' '}
                </p>
              </div>

              <div className="space-y-2 text-zinc-500 font-medium">
                <p className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-zinc-400" />
                  <span>Travel Date: <strong className="text-zinc-800">{date}</strong></span>
                </p>
                <p className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-zinc-400" />
                  <span>Time Slot: <strong className="text-zinc-800">{timeSlot}</strong></span>
                </p>
                <p className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-zinc-400" />
                  <span>Quantity: <strong className="text-zinc-800">{pax} traveler{pax > 1 ? 's' : ''}</strong></span>
                </p>
              </div>
            </div>

            {/* Price line items */}
            <div className="space-y-3.5 text-xs font-semibold">
              <div className="flex justify-between text-zinc-500">
                <span>Public Rate Subtotal</span>
                <span>RM {(product.base_price * pax).toLocaleString()}</span>
              </div>

              {userRole === 'agent' && commission > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special B2B Net Discount</span>
                  <span>-RM {commission.toLocaleString()}</span>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-150 flex justify-between items-center font-bold text-zinc-900">
                <span className="text-sm">Total Charge</span>
                <span className="text-xl tracking-tight">RM {total.toLocaleString()}</span>
              </div>
            </div>

            {userRole === 'agent' && currentUser && paymentMethod === 'credit' && (
              <div className="pt-4 border-t border-zinc-150 text-center bg-zinc-50 p-3 rounded-xl">
                <span className="text-[0.6rem] font-bold text-zinc-400 uppercase tracking-wider block">Charged to Agent Balance</span>
                <span className="text-xs font-bold text-indigo-700 mt-1 block">
                  Remaining Credit: RM {(currentUser.wallet.credit - total).toLocaleString()}
                </span>
              </div>
            )}

            {userRole === 'agent' && currentUser && paymentMethod === 'bank_transfer' && (
              <div className="pt-4 border-t border-zinc-150 text-center bg-indigo-50/50 p-3 rounded-xl">
                <span className="text-[0.6rem] font-bold text-indigo-700 uppercase tracking-wider block">Direct Banking Selected</span>
                <span className="text-[0.65rem] font-bold text-zinc-600 mt-1 block">
                  No credit debited. Pay invoice within 2 hours.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

interface BookingSuccessProps {
  booking: Booking;
  product: any;
  userRole: 'guest' | 'customer' | 'agent' | 'admin';
  onNavigate: (path: string, params?: any) => void;
}

export function BookingSuccess({
  booking,
  product,
  userRole,
  onNavigate
}: BookingSuccessProps) {
  // Toggle view between standard voucher and the requested "accounts@gfkholidays.com live inbox email client"
  

  const isB2B = userRole === 'agent' || (booking.agentId !== null);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 animate-fade-in w-full font-sans">
      
      {/* Top Banner Success */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-100 shadow-sm">
          <CheckCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">We've Received Your Request!</h1>
        <p className="text-zinc-500 font-medium text-sm leading-relaxed mb-4">
          <strong className="text-zinc-900">We will contact you in 30 minutes.</strong><br/>
          An automated confirmation has been sent to you from <span className="font-bold text-zinc-700">accounts@gfkholidays.com</span> indicating we have received your request.
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl">
          Once your booking is approved by our team, an official invoice will be generated and dispatched to your email.
        </p>
      </div>

      {/* Container display */}
      
      /* STANDARD VOUCHER DISPLAY */
        <div className="bg-white p-8 sm:p-10 rounded-[2rem] border border-zinc-200 shadow-sm text-left max-w-2xl mx-auto space-y-6 animate-fade-in">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-150">
            <div>
              <span className="text-[0.6rem] font-bold text-zinc-400 uppercase tracking-wider block">Reference Voucher ID</span>
              <span className="text-lg font-bold text-zinc-900 mt-1 block font-mono">{booking.id}</span>
            </div>
            <span className={`border font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider ${
              booking.status === 'CONFIRMED'
                ? 'bg-emerald-50 border-emerald-150 text-emerald-700'
                : booking.status === 'REQUEST_RECEIVED'
                ? 'bg-blue-50 border-blue-150 text-blue-700'
                : booking.status === 'CANCELLED'
                ? 'bg-red-50 border-red-150 text-red-700'
                : 'bg-amber-50 border-amber-150 text-amber-700'
            }`}>
              {booking.status === 'REQUEST_RECEIVED' ? 'REQUEST RECEIVED' : booking.status}
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
              <p className="text-zinc-900 font-bold text-sm leading-snug">{product ? product.title : 'Selected Listing'}</p>
            </div>
            <div className="border-t border-zinc-150 pt-4 sm:col-span-2 flex justify-between items-center text-zinc-900">
              <span className="font-bold">Total Cost</span>
              <span className="text-xl font-bold">RM {booking.total.toLocaleString()}</span>
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
