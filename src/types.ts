export interface DayItinerary {
  day: number;
  title: string;
  activities: string;
}

export interface RoomCategory {
  name: string;
  price: number;
  pax: number;
}

export interface TicketCategory {
  name: string;
  price: number;
  description: string;
}

export interface Wallet {
  credit: number;
  earned: number;
  pending: number;
}

export interface Agent {
  id: string;
  company: string;
  email: string;
  password?: string;
  commission: number; // e.g., 15 for 15%
  wallet: Wallet;
}

export interface Booking {
  id: string;
  pkgId: string; // references any item (pkg, tr, ht, tk)
  client: string;
  email?: string;
  phone?: string;
  date: string;
  timeSlot?: string; // e.g. "09:00 AM", "02:00 PM"
  total: number;
  commission: number;
  status: 'CONFIRMED' | 'PENDING' | 'REQUEST_RECEIVED' | 'CANCELLED' | 'INVOICE_SENT' | 'PAID' | 'REJECTED';
  paymentStatus?: 'PAID' | 'PENDING_BANK_TRANSFER' | 'CREDIT_CHARGED';
  paymentMethod?: 'credit' | 'bank_transfer';
  agentId: string | null; // null for direct customers
  createdAt: string;
  invoiceSentAt?: string;
  paidAt?: string;
  paymentNotes?: string;
  invoiceMessage?: string;
  invoiceItems?: { desc: string; amount: number }[];
}

export interface Package {
  id: string;
  category: 'Packages' | 'Transport' | 'Attractions' | 'Food & Dining';
  title: string;
  destination: string;
  base_price: number;
  net_price: number;
  original_price?: number;
  duration_days: number;
  rating: number;
  reviews: number;
  image: string;
  mediaUrls?: string[];
  videoUrl?: string;
  tags: string[];
  description: string;
  itinerary?: DayItinerary[];
  instructions?: string;
  termsAndConditions?: string;
  importantInfo?: string;
  timings?: string;
  childPolicy?: string;
  childPrice?: number;
  featured?: boolean;
}

export interface TransportRoute {
  id: string;
  name: string;
  image: string;
  mediaUrls?: string[];
  videoUrl?: string;
  rating?: number;
  reviews?: number;
  car: number;    // price for 1-3 Pax
  mpv: number;    // price for 4-5 Pax
  van7: number;   // price for 6-7 Pax
  van13: number;  // price for 8-13 Pax
  instructions?: string;
  termsAndConditions?: string;
  importantInfo?: string;
  timings?: string;
  childPolicy?: string;
}

export interface Hotel {
  id: string;
  name: string;
  location?: string;
  image: string;
  mediaUrls?: string[];
  videoUrl?: string;
  rating?: number;
  reviews?: number;
  cat: '3-Star' | '4-Star' | '5-Star' | 'Resort' | 'Regional';
  price: number; // nightly rate
  originalPrice?: number;
  contractBadge?: string;
  roomCategories?: RoomCategory[];
  instructions?: string;
  termsAndConditions?: string;
  importantInfo?: string;
  timings?: string;
  childPolicy?: string;
  featuredContract?: boolean;
}

export interface Ticket {
  id: string;
  name: string;
  location?: string;
  image: string;
  mediaUrls?: string[];
  videoUrl?: string;
  rating?: number;
  reviews?: number;
  price: number;
  originalPrice?: number;
  info: string; // cancellation, etc.
  addInfo: string; // timings, slot info
  ticketCategories?: TicketCategory[];
  instructions?: string;
  termsAndConditions?: string;
  importantInfo?: string;
  timings?: string;
  childPolicy?: string;
  featured?: boolean;
}

export interface Allotment {
  id: string;
  itemId: string; // references package / transport / hotel / ticket ID
  itemName: string; // helpful reference
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g., "10:00 AM", "02:00 PM"
  totalSlots: number; // capacity allotted
  bookedSlots: number; // quantity currently booked
}

export interface Review {
  id: string;
  itemId: string;
  author: string;
  rating: number;
  content: string;
  createdAt: string;
  reply?: string; // Admin reply
}

export interface CustomerMediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  posterUrl?: string;
  customerName: string;
  location: string;
  experienceTitle: string;
  caption: string;
  rating: number;
  date: string;
}

export interface SocialMediaChannel {
  id: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'Facebook' | 'WhatsApp' | 'X' | 'RED';
  handle: string;
  url: string;
  followers: string;
  highlightText: string;
  enabled: boolean;
}

export interface OtaPartner {
  id: string;
  name: string;
  logoUrl?: string;
  roleBadge: string;
  description: string;
  rating: string;
  reviewsCount: string;
  accentColor: string;
  url?: string;
  verified: boolean;
}

export interface PartnerLogoItem {
  id: string;
  category: 'hotel' | 'supplier' | 'flight' | 'ota';
  name: string;
  logoUrl: string;
  subtitle: string;
  badgeText: string;
  accentColor?: string;
  verified?: boolean;
}

export interface GlobalSettings {
  id: string;
  logoUrl: string;
  invoiceLogoUrl?: string;
  logoScale?: number;
  logoPadding?: number;
  logoRounded?: string;
  logoFit?: string;
  logoHeight?: number;
  logoAlign?: string;
  showBrandText?: boolean;
  heroVideoUrl: string;
  featuredVideoEmbedUrl?: string;
  heroVideoSource?: 'upload' | 'url';
  heroVideoFileName?: string;
  heroFallbackImage?: string;
  heroBgColor: string;
  heroOverlayOpacity?: number;
  heroBadgeText?: string;
  heroTitleLine1?: string;
  heroTitleLine2?: string;
  heroSubtitle?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  heroPrimaryCta?: string;
  mediaPresentationStyle?: 'sliding' | 'carousel' | 'bento' | 'stories';
  mediaAnimationSpeed?: 'slow' | 'normal' | 'fast';
  mediaSlideDirection?: 'left' | 'right';
  customerGalleryStyle?: string;
  customerGallerySpeed?: string;
  partnerAnimationStyle?: 'grid' | 'sliding';
  hotelContractsStyle?: 'grid' | 'sliding';
  hotelContractsTitle?: string;
  hotelContractsSubtitle?: string;
  // Live Video Sequenced Partnership Broadcast Reel settings
  partnerReelStyle?: 'live-video-sequence' | 'triple-cinema-stream' | 'spotlight-stage';
  partnerReelStageDuration?: number; // seconds per stage before transitioning to next stage
  partnerReelBgVideoUrl?: string;
  partnerReelAutoPlay?: boolean;
  partnerReelShowHud?: boolean;
  partnerReelTitle?: string;
  partnerReelSubtitle?: string;
  hotelPartnerLogos?: PartnerLogoItem[];
  flightPartnerLogos?: PartnerLogoItem[];
  customerMedia?: CustomerMediaItem[];
  socialChannels?: SocialMediaChannel[];
  otaPartners?: OtaPartner[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  invoiceMessage?: string;
  bankAccountName?: string;
  bankPartner?: string;
  bankAccountNumber?: string;
  invoiceTemplate?: string;
  customInvoiceHtml?: string;
  accountsEmail?: string;
  bookingEmail?: string;
  bookingEmailToken?: string;
  accountsEmailToken?: string;
  partnerMarqueeEnabled?: boolean;
  partnerMarqueeDirection?: 'left' | 'right';
  partnerMarqueeSpeed?: 'slow' | 'normal' | 'fast';
  partnerMarqueeLogos?: PartnerLogoItem[];
  voucherDisplayMode?: 'payment_only' | 'homepage' | 'both' | 'hidden';
}
