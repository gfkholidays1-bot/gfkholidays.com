import { useState, useMemo } from 'react';
import { ArrowLeft, Star, MapPin, Info, ArrowRight, Briefcase, Clock, Calendar, Check, Car } from 'lucide-react';
import { Allotment, Review } from '../types';

interface ProductDetailProps {
  pkgId: string;
  userRole: 'guest' | 'customer' | 'agent' | 'admin';
  agentCommission: number;
  allotments: Allotment[];
  reviews: Review[];
  onAddReview: (review: Review) => void;
  getNormalizedItem: (id: string) => any;
  onNavigate: (path: string, params?: any) => void;
  imageMap: Record<string, string>;
  showToast: (msg: string) => void;
}

export default function ProductDetail({
  pkgId,
  userRole,
  agentCommission,
  allotments = [],
  reviews = [],
  onAddReview,
  getNormalizedItem,
  onNavigate,
  imageMap,
  showToast
}: ProductDetailProps) {
  const [travelDate, setTravelDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [selectedOption, setSelectedOption] = useState(-1);
  const [transportType, setTransportType] = useState<'car' | 'mpv' | 'van7' | 'van13'>('car');
  const [bags, setBags] = useState(2);

  const product = useMemo(() => {
    return getNormalizedItem(pkgId);
  }, [pkgId, getNormalizedItem]);

  // Filter allotments associated with this specific product
  const activeAllotments = useMemo(() => {
    if (!product) return [];
    return allotments.filter(al => al.itemId === product.id);
  }, [allotments, product]);

  // Unique allotted dates for this item to help guide the customer
  const uniqueAllottedDates = useMemo(() => {
    const dates = activeAllotments.map(al => al.date);
    return Array.from(new Set(dates)).sort();
  }, [activeAllotments]);

  // Allotments matching the currently selected travel date
  const slotsForSelectedDate = useMemo(() => {
    if (!travelDate) return [];
    return activeAllotments.filter(al => al.date === travelDate);
  }, [activeAllotments, travelDate]);

  const tomorrowStr = useMemo(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  }, []);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center font-sans">
        <h2 className="text-2xl font-bold text-zinc-900">Product not found</h2>
        <button
          onClick={() => onNavigate('/')}
          className="mt-6 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-full font-semibold transition-colors cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  const img = product.image && product.image.match(/^(http|data:)/) ? product.image : (imageMap[product.image] || imageMap.petronas);
  const isAgent = userRole === 'agent';

  // Calculations
  const isTransport = pkgId.startsWith('tr-');
  const hasOptions = (product.roomCategories && product.roomCategories.length > 0) || (product.ticketCategories && product.ticketCategories.length > 0) || isTransport;
  
  let basePrice = product.base_price || 0;
  let optionName = '';
  if (isTransport) {
    basePrice = product[transportType] || 0;
    const typeNames = { car: 'Sedan (1-3 Pax)', mpv: 'MPV (4-5 Pax)', van7: 'Van (6-7 Pax)', van13: 'Van (8-13 Pax)' };
    optionName = typeNames[transportType];
  } else if (selectedOption >= 0) {
    if (product.roomCategories && product.roomCategories.length > selectedOption) {
      basePrice = product.roomCategories[selectedOption].price;
      optionName = product.roomCategories[selectedOption].name;
    } else if (product.ticketCategories && product.ticketCategories.length > selectedOption) {
      basePrice = product.ticketCategories[selectedOption].price;
      optionName = product.ticketCategories[selectedOption].name;
    }
  }

  const displayPrice = isAgent
    ? Math.round(basePrice * (1 - agentCommission / 100))
    : basePrice;

  const childPrice = product.childPrice !== undefined ? product.childPrice : Math.round(displayPrice * 0.75);
  const childDisplayPrice = isAgent ? Math.round(childPrice * (1 - agentCommission / 100)) : childPrice;
  const b2bDiscount = basePrice - displayPrice;
  const total = (displayPrice * adults) + (childDisplayPrice * children); // infants free
  const totalDiscount = (b2bDiscount * adults) + (Math.round(b2bDiscount * 0.75) * children);
  const totalPax = adults + children + infants;

  // Click handler to quickly select preset date/slot
  const handleSelectPresetAllotment = (al: Allotment) => {
    setTravelDate(al.date);
    setSelectedSlot(al.timeSlot);
    showToast(`Selected allotted slot: ${al.date} at ${al.timeSlot}`);
  };

  const handleBooking = () => {
    if (!travelDate) {
      showToast('Please select your travel date to proceed');
      return;
    }

    // If slots are allotted by admin for this service, user must select a valid one
    if (activeAllotments.length > 0) {
      const dateAllotments = activeAllotments.filter(al => al.date === travelDate);
      if (dateAllotments.length > 0) {
        if (!selectedSlot) {
          showToast('Please select one of the available time slots for this date');
          return;
        }

        const selectedAllotmentObj = dateAllotments.find(al => al.timeSlot === selectedSlot);
        if (selectedAllotmentObj) {
          const spotsLeft = selectedAllotmentObj.totalSlots - selectedAllotmentObj.bookedSlots;
          if (totalPax > spotsLeft) {
            showToast(`Only ${spotsLeft} spots are left for this slot. Adjust your travelers count.`);
            return;
          }
        }
      }
    }

    onNavigate('/checkout', {
      product,
      pax: totalPax,
      adults,
      children,
      infants,
      date: travelDate,
      timeSlot: selectedSlot || 'Standard Admission Slot',
      optionName,
      displayPrice,
      childDisplayPrice,
      total,
      commission: totalDiscount
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 animate-fade-in w-full font-sans">
      
      {/* Return button */}
      <button
        onClick={() => {
          if (pkgId.startsWith('pkg-')) onNavigate('/search');
          else if (pkgId.startsWith('tr-')) onNavigate('/transport');
          else if (pkgId.startsWith('ht-')) onNavigate('/hotels');
          else if (pkgId.startsWith('tk-')) onNavigate('/tickets');
          else onNavigate('/');
        }}
        className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-900 mb-8 bg-white px-5 py-2.5 rounded-full border border-zinc-200 transition-all shadow-sm hover:shadow cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Return to Listings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column (Details) */}
        <div className="lg:col-span-2 space-y-10">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider">
                {product.category || 'Direct Listing'}
              </span>
              <span className="flex items-center text-[0.65rem] font-bold text-zinc-500 bg-zinc-100 px-4 py-1 rounded-full">
                <MapPin className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                {product.destination || 'Malaysia'}
              </span>
              {activeAllotments.length > 0 && (
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-[0.65rem] font-bold">
                  ● Admin Allotted Availability
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 mb-6 tracking-tight leading-tight">
              {product.title}
            </h1>

            {/* Main Picture */}
            <div className="w-full h-[350px] sm:h-[450px] rounded-[2rem] overflow-hidden relative shadow-sm border border-zinc-100 bg-zinc-100">
              <img
                src={img}
                alt={product.title}
                className="w-full h-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center font-bold text-zinc-800 shadow-lg border border-zinc-100 text-sm">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-1.5" />
                {product.rating || 4.5} <span className="text-zinc-400 text-[0.65rem] font-semibold ml-2">({reviews.filter((r: any) => r.itemId === pkgId).length || product.reviews || 0} reviews)</span>
              </div>
            </div>

            {/* Extra Media Gallery */}
            {(product.videoUrl || (product.mediaUrls && product.mediaUrls.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {product.videoUrl && (
                  <div className="rounded-[1.5rem] overflow-hidden bg-zinc-950 aspect-video relative shadow-sm">
                    <iframe
                      src={product.videoUrl.replace('watch?v=', 'embed/')}
                      className="absolute inset-0 w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Service Video"
                    ></iframe>
                  </div>
                )}
                {product.mediaUrls && product.mediaUrls.map((mUrl: string, idx: number) => (
                  <div key={idx} className="rounded-[1.5rem] overflow-hidden bg-zinc-100 aspect-video relative shadow-sm border border-zinc-200/50">
                    <img src={mUrl} className="absolute inset-0 w-full h-full object-cover" alt="Service Gallery" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options Selector */}
                    {hasOptions && !isTransport && (product.roomCategories || product.ticketCategories) && (
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 tracking-tight flex items-center">
                <Check className="w-5 h-5 mr-2.5 text-rose-600" />
                Select Category
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(product.roomCategories || product.ticketCategories).map((opt: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={`text-left p-4 rounded-[1.25rem] border transition-all cursor-pointer ${
                      selectedOption === idx
                        ? 'border-rose-500 bg-rose-50/50 shadow-md ring-4 ring-rose-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-zinc-900">{opt.name}</span>
                      <span className="font-black text-rose-600">RM {opt.price}</span>
                    </div>
                    {opt.description && <p className="text-[0.65rem] text-zinc-500 font-semibold">{opt.description}</p>}
                    {opt.pax && <p className="text-[0.65rem] text-zinc-500 font-semibold mt-1">Max Pax: {opt.pax}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTransport && (
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 tracking-tight flex items-center">
                <Car className="w-5 h-5 mr-2.5 text-indigo-600" />
                Select Vehicle & Luggage
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                {[
                  { id: 'car', name: 'Sedan', cap: '1-3 Pax', price: product.car },
                  { id: 'mpv', name: 'MPV', cap: '4-5 Pax', price: product.mpv },
                  { id: 'van7', name: 'Van', cap: '6-7 Pax', price: product.van7 },
                  { id: 'van13', name: 'Large Van', cap: '8-13 Pax', price: product.van13 }
                ].map((veh) => (
                  <button
                    key={veh.id}
                    onClick={() => setTransportType(veh.id as any)}
                    className={`text-left p-4 rounded-[1.25rem] border transition-all cursor-pointer ${
                      transportType === veh.id
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-4 ring-indigo-500/10'
                        : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-zinc-900">{veh.name}</span>
                      <span className="font-black text-indigo-600">RM {veh.price}</span>
                    </div>
                    <p className="text-[0.65rem] text-zinc-500 font-semibold">Capacity: {veh.cap}</p>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-900 mb-2">Number of Bags / Luggage</label>
                <div className="flex items-center">
                  <button onClick={() => setBags(Math.max(0, bags - 1))} className="w-10 h-10 flex items-center justify-center bg-zinc-100 rounded-l-full font-black text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors cursor-pointer">-</button>
                  <input type="number" readOnly value={bags} className="w-16 h-10 text-center bg-zinc-50 border-y border-zinc-100 font-black text-zinc-900" />
                  <button onClick={() => setBags(bags + 1)} className="w-10 h-10 flex items-center justify-center bg-zinc-100 rounded-r-full font-black text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors cursor-pointer">+</button>
                </div>
                <p className="text-xs text-zinc-400 mt-3 font-medium">Please ensure your vehicle selection matches your passenger and luggage count.</p>
              </div>
            </div>
          )}

          {/* Day-by-Day Itinerary (Packages only) */}
          {product.itinerary && product.itinerary.length > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-zinc-200">
              <h3 className="text-lg font-bold text-zinc-900 mb-6 tracking-tight flex items-center">
                <MapPin className="w-5 h-5 mr-2.5 text-indigo-600" />
                Day-by-Day Itinerary
              </h3>
              <div className="space-y-6">
                {product.itinerary.map((day: any, idx: number) => (
                  <div key={idx} className="relative pl-8 border-l-2 border-zinc-100 pb-2">
                    <div className="absolute w-4 h-4 rounded-full bg-indigo-500 -left-[9px] top-1 border-4 border-white shadow-sm" />
                    <span className="text-[0.65rem] font-black text-indigo-600 uppercase tracking-widest block mb-1">
                      Day {day.day}
                    </span>
                    <h4 className="font-bold text-zinc-900 mb-2">{day.title}</h4>
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                      {day.activities}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allotted Slots Guide (If available) */}
          {activeAllotments.length > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-zinc-200">
              <h3 className="text-lg font-bold text-zinc-900 mb-4 tracking-tight flex items-center">
                <Calendar className="w-5 h-5 mr-2.5 text-indigo-600" />
                Guaranteed Allotted Slots
              </h3>
              <p className="text-xs text-zinc-500 font-medium mb-5">
                The administrator has set pre-arranged availability with real-time remaining quotas. Select one of the allotments below for instant confirmation:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {activeAllotments.map((al) => {
                  const spotsLeft = al.totalSlots - al.bookedSlots;
                  const isSelected = travelDate === al.date && selectedSlot === al.timeSlot;
                  const isSoldOut = spotsLeft <= 0;

                  return (
                    <button
                      key={al.id}
                      disabled={isSoldOut}
                      onClick={() => handleSelectPresetAllotment(al)}
                      className={`text-left p-4 rounded-2xl border transition-all flex justify-between items-center ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/10'
                          : isSoldOut
                          ? 'bg-zinc-50 border-zinc-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                          <span>{al.date}</span>
                          <span className="text-[0.65rem] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full font-medium">
                            {al.timeSlot}
                          </span>
                        </div>
                        <div className="text-[0.7rem] text-zinc-500 font-medium mt-1">
                          {isSoldOut ? 'Sold Out' : `${spotsLeft} of ${al.totalSlots} slots remaining`}
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="text-[0.65rem] font-bold text-indigo-600">Select</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-sm border border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-900 mb-4 tracking-tight">The Experience Description</h3>
            <p className="text-sm font-medium text-zinc-500 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Information & Policies Section */}
          <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-sm border border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-900 mb-6 tracking-tight flex items-center">
              <Info className="w-5 h-5 mr-2.5 text-indigo-600" />
              Policies & Important Information
            </h3>
            
            <div className="space-y-6">
              {product.importantInfo && (
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-2">Points to be noted</h4>
                  <div className="text-xs font-semibold text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100 whitespace-pre-line">
                    {product.importantInfo}
                  </div>
                </div>
              )}
              
              {product.timings && (
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-2 flex items-center"><Clock className="w-4 h-4 mr-1.5" /> Timings</h4>
                  <div className="text-xs font-semibold text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100 whitespace-pre-line">
                    {product.timings}
                  </div>
                </div>
              )}
              
              {product.childPolicy && (
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-2">Child Policy</h4>
                  <div className="text-xs font-semibold text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100 whitespace-pre-line">
                    {product.childPolicy}
                  </div>
                </div>
              )}
              
              {product.termsAndConditions && (
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-2">Terms and Conditions</h4>
                  <div className="text-xs font-semibold text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100 whitespace-pre-line">
                    {product.termsAndConditions}
                  </div>
                </div>
              )}

              {product.instructions && (
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-2">General Guidelines</h4>
                  <div className="text-xs font-semibold text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100 whitespace-pre-line">
                    {product.instructions}
                  </div>
                </div>
              )}

              {(!product.importantInfo && !product.timings && !product.childPolicy && !product.termsAndConditions && !product.instructions) && (
                <div className="text-xs font-semibold text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  Standard tourism terms apply. Surcharges might apply for outskirt transfers, public holidays, or high-occupancy cycles.
                </div>
              )}
            </div>
          </div>
          
          {/* Customer Reviews Section */}
          <div className="pt-8 border-t border-zinc-200">
            <h3 className="text-2xl font-bold text-zinc-900 mb-6 tracking-tight">Customer Reviews</h3>
            
            <div className="space-y-6 mb-8">
              {reviews.filter((r: any) => r.itemId === pkgId).length === 0 ? (
                <p className="text-sm text-zinc-500 font-medium bg-zinc-50 p-6 rounded-2xl border border-zinc-100">No reviews yet for this product. Be the first to leave a review!</p>
              ) : (
                reviews.filter((r: any) => r.itemId === pkgId).map((review: any) => (
                  <div key={review.id} className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-zinc-900">{review.author}</p>
                        <p className="text-[0.65rem] text-zinc-400 font-semibold uppercase tracking-wider">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-zinc-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-600 font-medium leading-relaxed">{review.content}</p>
                    
                    {/* Admin Reply */}
                    {review.reply && (
                      <div className="mt-4 pt-4 border-t border-zinc-200 flex gap-3">
                        <div className="w-1.5 bg-emerald-400 rounded-full"></div>
                        <div>
                          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">GFK Holidays Reply</p>
                          <p className="text-xs text-zinc-600 font-medium">{review.reply}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Leave a review form (Available to guest/customer) */}
            {userRole !== 'admin' && (
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-zinc-200 mt-8">
                <h4 className="text-lg font-bold text-zinc-900 mb-4 tracking-tight">Write a Review</h4>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = fd.get('name') as string;
                    const text = fd.get('review') as string;
                    const rating = parseInt(fd.get('rating') as string);
                    
                    onAddReview({
                      id: 'rv-' + Math.random().toString(36).substr(2, 9),
                      itemId: pkgId,
                      author: name || 'Anonymous',
                      rating: rating,
                      content: text,
                      createdAt: new Date().toISOString()
                    });
                    
                    e.currentTarget.reset();
                    showToast('Review submitted successfully!');
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Your Name</label>
                      <input name="name" required className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-zinc-400" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Rating (1-5)</label>
                      <select name="rating" required className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-zinc-400">
                        <option value="5">5 - Excellent</option>
                        <option value="4">4 - Very Good</option>
                        <option value="3">3 - Average</option>
                        <option value="2">2 - Poor</option>
                        <option value="1">1 - Terrible</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Review</label>
                    <textarea name="review" required rows={3} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-400" placeholder="Share your experience..."></textarea>
                  </div>
                  <button type="submit" className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">
                    Submit Review
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (Live booking calculator) */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-250 sticky top-28 space-y-6">
            
            {/* Price Box */}
            <div>
              <span className="text-[0.6rem] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Pricing per person</span>
              <div className="text-2xl font-bold text-zinc-900 tracking-tight">
                RM {displayPrice} 
                <span className="text-sm text-zinc-400 font-medium ml-1">/Pax</span>
              </div>
            </div>

            {/* B2B Margin Alert */}
            {isAgent && (
              <div className="bg-indigo-50 border border-indigo-150 p-5 rounded-2xl">
                <div className="flex items-center text-indigo-700 font-bold text-xs">
                  <Briefcase className="w-4 h-4 mr-1.5" /> Special B2B Net Contract
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-indigo-200/50 text-xs">
                  <span className="text-indigo-900/60 font-semibold">Standard Public: RM {product.base_price}</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    +RM {b2bDiscount} Commission
                  </span>
                </div>
              </div>
            )}

            {/* Enforce 24-Hours prior booking Warning strictly requested by user */}
            <div className="bg-amber-50/70 border border-amber-200/60 p-4.5 rounded-2xl text-xs text-amber-900 font-medium leading-relaxed flex items-start gap-2.5">
              <Clock className="w-4.5 h-4.5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950 block mb-0.5">Prior Booking & Non-Guarantee Policy</span>
                Kindly book prior to 24 hours of activity. Please note we do not guarantee immediate booking of that service, as allocations are subject to operator availability and confirmation.
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Travel Date</label>
                <input
                  type="date"
                  min={tomorrowStr}
                  value={travelDate}
                  onChange={(e) => {
                    setTravelDate(e.target.value);
                    setSelectedSlot(''); // reset slot when date changes
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Dynamic Time Slot Selector (if slots are defined for chosen date) */}
              {travelDate && (
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Available Time Slots
                  </label>
                  {slotsForSelectedDate.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {slotsForSelectedDate.map((al) => {
                        const spotsLeft = al.totalSlots - al.bookedSlots;
                        const isSoldOut = spotsLeft <= 0;
                        const isSelected = selectedSlot === al.timeSlot;

                        return (
                          <button
                            key={al.id}
                            type="button"
                            disabled={isSoldOut}
                            onClick={() => setSelectedSlot(al.timeSlot)}
                            className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : isSoldOut
                                ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed opacity-50'
                                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border-zinc-200'
                            }`}
                          >
                            <div>{al.timeSlot}</div>
                            <div className={`text-[0.6rem] font-medium mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-zinc-400'}`}>
                              {isSoldOut ? 'Sold Out' : `${spotsLeft} left`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      {activeAllotments.length > 0 ? (
                        <div className="text-[0.7rem] text-amber-800 bg-amber-50 p-3 rounded-xl font-medium">
                          No guaranteed allotments configured for this specific date. Please pick one of the indigo allotment cards above, or contact support for manual requests.
                        </div>
                      ) : (
                        <select
                          value={selectedSlot}
                          onChange={(e) => setSelectedSlot(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">Standard Admission Hours</option>
                          <option value="09:00 AM">Morning Session (09:00 AM)</option>
                          <option value="01:00 PM">Afternoon Session (01:00 PM)</option>
                          <option value="04:00 PM">Late Afternoon Session (04:00 PM)</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Travelers &amp; Child Considerations</label>
                
                {/* Adults */}
                <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-2xl p-3">
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Adults (12+ yrs)</span>
                    <span className="text-[10px] text-zinc-500">RM {displayPrice} / pax</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setAdults(Math.max(1, adults - 1))} className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-200 rounded-lg font-bold text-zinc-900 cursor-pointer">-</button>
                    <span className="w-6 text-center font-bold text-sm">{adults}</span>
                    <button type="button" onClick={() => setAdults(adults + 1)} className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-200 rounded-lg font-bold text-zinc-900 cursor-pointer">+</button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-2xl p-3">
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Children (3-11 yrs)</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">RM {childDisplayPrice} / child (25% off)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setChildren(Math.max(0, children - 1))} className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-200 rounded-lg font-bold text-zinc-900 cursor-pointer">-</button>
                    <span className="w-6 text-center font-bold text-sm">{children}</span>
                    <button type="button" onClick={() => setChildren(children + 1)} className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-200 rounded-lg font-bold text-zinc-900 cursor-pointer">+</button>
                  </div>
                </div>

                {/* Infants */}
                <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-2xl p-3">
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">Infants (0-2 yrs)</span>
                    <span className="text-[10px] text-indigo-700 font-semibold">Free of charge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInfants(Math.max(0, infants - 1))} className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-200 rounded-lg font-bold text-zinc-900 cursor-pointer">-</button>
                    <span className="w-6 text-center font-bold text-sm">{infants}</span>
                    <button type="button" onClick={() => setInfants(infants + 1)} className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-200 rounded-lg font-bold text-zinc-900 cursor-pointer">+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Row */}
            <div className="pt-5 border-t border-zinc-100 flex justify-between items-center font-bold text-zinc-900">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Total charge</span>
              <span className="text-xl tracking-tight">RM {total.toLocaleString()}</span>
            </div>

            {/* Confirm action */}
            <button
              onClick={handleBooking}
              className="w-full bg-zinc-950 hover:bg-zinc-850 text-white py-4 rounded-full font-semibold text-xs uppercase tracking-wider shadow-md transition-all flex justify-center items-center cursor-pointer border-none"
            >
              {isAgent ? 'Secure B2B Allocation' : 'Book Now'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
