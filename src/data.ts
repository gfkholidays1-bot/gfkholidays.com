import {
  Package,
  TransportRoute,
  Hotel,
  Ticket,
  Agent,
  Booking,
  Allotment,
  CustomerMediaItem,
  SocialMediaChannel,
  OtaPartner,
  PartnerLogoItem,
  GlobalSettings
} from './types';

const createBrandSvgDataUri = (
  bgHex: string,
  accentHex: string,
  monogram: string,
  label: string
) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 120" width="280" height="120">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgHex}" />
        <stop offset="100%" stop-color="#09090b" />
      </linearGradient>
    </defs>
    <rect width="280" height="120" rx="20" fill="url(#g)" stroke="${accentHex}" stroke-opacity="0.45" stroke-width="2"/>
    <circle cx="54" cy="60" r="28" fill="${accentHex}" fill-opacity="0.18" stroke="${accentHex}" stroke-width="1.5"/>
    <text x="54" y="67" text-anchor="middle" fill="${accentHex}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-weight="800" font-size="20" letter-spacing="1">${monogram}</text>
    <text x="100" y="56" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-weight="800" font-size="16" letter-spacing="0.5">${label}</text>
    <text x="100" y="76" fill="${accentHex}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-weight="700" font-size="10" letter-spacing="2">OFFICIAL PARTNER</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};


export const INITIAL_PACKAGES: Package[] = [
  {
    id: 'pkg-1',
    category: 'Packages',
    title: 'Langkawi Luxury Overwater & Island Hopping Escape',
    destination: 'Langkawi, Kedah, Malaysia',
    base_price: 1899,
    original_price: 2350,
    net_price: 1550,
    duration_days: 5,
    rating: 4.9,
    reviews: 348,
    image: 'langkawi',
    tags: ['Luxury', 'Beach', 'Island Hopping'],
    featured: true,
    description: 'Experience Malaysia\'s premier Andaman island paradise with overwater villa stays, private sunset catamaran dining, Langkawi SkyCab & SkyBridge fast-track passes, and Kilim Geoforest mangrove eco-safari.',
    instructions: 'Includes twin-sharing overwater accommodation, daily gourmet breakfast, private return airport transfers from LGK, and sunset yacht dinner cruise.',
    timings: 'Daily Departures · Flexible Check-in',
    childPolicy: 'Children aged 3–11 enjoy 35% off adult twin-share rate. Infants under 2 travel free.',
    termsAndConditions: 'Free cancellation up to 7 days prior to departure. 50% deposit required to confirm. All ferry and speed boat transfers are subject to marine weather safety regulations.',
    importantInfo: 'Includes private LGK airport transfers, daily breakfast buffet, sunset catamaran cruise dinner, and SkyCab VIP express passes.',
    itinerary: [
      { day: 1, title: 'Arrival in Langkawi & Sunset Yacht Cruise', activities: 'VIP meet and greet at Langkawi International Airport, private transfer to your overwater villa, and evening Andaman Sea sunset dinner cruise with saltwater jacuzzi net.' },
      { day: 2, title: 'Kilim Karst Geoforest Park & Eagle Watching', activities: 'Morning private boat safari through ancient limestone caves, mangrove forests, eagle feeding cove, crocodile cave, and secluded Tanjung Rhu beach.' },
      { day: 3, title: 'Langkawi SkyCab, SkyBridge & 3D Art Museum', activities: 'Express lane access to the steepest cable car on Gunung Mat Cincang, panoramic walk across the iconic curved SkyBridge, and Oriental Village 3D art experience.' },
      { day: 4, title: 'Island Hopping: Dayang Bunting & Beras Basah', activities: 'Private speed boat excursion to the Lake of the Pregnant Maiden (Dayang Bunting), crystal white sands of Beras Basah Island, and coral snorkeling.' },
      { day: 5, title: 'Duty-Free Shopping & Departure Transfer', activities: 'Morning free leisure in Kuah Town for duty-free chocolates & perfumes, followed by private chauffeur transfer to Langkawi Airport.' }
    ]
  },
  {
    id: 'pkg-2',
    category: 'Packages',
    title: 'Sabah Borneo Rainforest, Kinabalu & Wildlife Expedition',
    destination: 'Kota Kinabalu & Sandakan, Sabah, Malaysia',
    base_price: 2150,
    original_price: 2690,
    net_price: 1800,
    duration_days: 6,
    rating: 4.9,
    reviews: 219,
    image: 'sabah',
    tags: ['Adventure', 'Nature', 'Borneo Wildlife'],
    featured: true,
    description: 'Trek through ancient Bornean rainforests, explore Mount Kinabalu UNESCO National Park, soak in Poring Hot Springs, and cruise the Kinabatangan River to spot wild orangutans, proboscis monkeys, and pygmy elephants.',
    instructions: 'All land transfers, Sabah Parks conservation permits, licensed naturalist guides, rainforest eco-lodge stays, and full-board meals are included.',
    timings: '07:30 AM Pick-up · Multi-Day Guided',
    childPolicy: 'Suitable for children aged 5 and above. Child rate applies for ages 5–11.',
    termsAndConditions: 'Sabah wildlife park conservation permits are non-refundable once registered with Sabah Wildlife Department. Moderate walking fitness recommended.',
    importantInfo: 'Includes Sabah Parks entrance permits, certified naturalist wildlife guide, Kinabatangan River riverboat safaris, and rainforest eco-lodge stays.',
    itinerary: [
      { day: 1, title: 'Arrival in Kota Kinabalu & Waterfront Market', activities: 'Arrive at BKI Airport, check into 5-star seafront hotel, and evening guided walk through Filipino Handicraft Market and fresh seafood dining.' },
      { day: 2, title: 'Mount Kinabalu National Park & Canopy Walk', activities: 'Scenic mountain drive to Kinabalu UNESCO World Heritage Park, botanical garden nature trek, Poring Hot Springs sulfur dip, and treetop canopy walkway.' },
      { day: 3, title: 'Fly to Sandakan & Sepilok Orangutan Sanctuary', activities: 'Short morning flight to Sandakan, visit Sepilok Orangutan Rehabilitation Centre feeding platform, and Sun Bear Conservation Centre.' },
      { day: 4, title: 'Kinabatangan River Sunset Wildlife Cruise', activities: 'Journey into Sukau Rainforest Eco-Lodge, afternoon river boat safari spotting wild proboscis monkeys, hornbills, and Bornean pygmy elephants.' },
      { day: 5, title: 'Oxbow Lake Dawn Birding & Gomantong Caves', activities: 'Early 06:00 AM dawn river cruise on Kelenanap Oxbow Lake for exotic bird watching, followed by visit to ancient swiftlet limestone Gomantong Caves.' },
      { day: 6, title: 'Sandakan City Highlights & Departure', activities: 'Visit Agnes Keith Colonial House and Puu Jih Shih Buddhist Temple before airport transfer for onward flight.' }
    ]
  },
  {
    id: 'pkg-3',
    category: 'Packages',
    title: 'Kuala Lumpur Twin Towers, Batu Caves & Urban Luxury',
    destination: 'Kuala Lumpur, Malaysia',
    base_price: 850,
    original_price: 1090,
    net_price: 700,
    duration_days: 4,
    rating: 4.8,
    reviews: 512,
    image: 'kl',
    tags: ['City Highlight', 'Twin Towers', 'Culture'],
    featured: true,
    description: 'Stay in the heart of Bukit Bintang & KLCC. Includes skip-the-line Petronas Twin Towers Skybridge & 86th Floor tickets, Batu Caves & Royal Selangor heritage tour, KL Tower Atmosphere 360 revolving high-tea, and private airport transfers.',
    instructions: 'Includes 4-star/5-star KLCC hotel stay, guaranteed Twin Towers slot, private chauffeur-guide, and KLIA Ekspres or private car return transfer.',
    timings: 'Daily · 09:00 AM - 09:00 PM',
    childPolicy: 'Children under 90cm enter attractions free. Ages 3–12 qualify for child package rate.',
    termsAndConditions: 'Twin Towers observation slots are subject to government quota and guaranteed upon booking. Free cancellation up to 72 hours before check-in.',
    importantInfo: 'Includes private KLIA airport roundtrip transfers, 4-star KLCC hotel, guaranteed Twin Towers 86th-floor entry, and Batu Caves private tour.',
    itinerary: [
      { day: 1, title: 'KLIA Private Arrival & Bukit Bintang Check-in', activities: 'Private air-conditioned chauffeur pickup from KLIA/KLIA2 directly to your luxury hotel. Evening stroll through Jalan Alor foodie haven.' },
      { day: 2, title: 'Petronas Twin Towers & KL City Heritage Tour', activities: 'Morning skip-the-line pass to Petronas Twin Towers Level 86 Observation Deck, King\'s Palace (Istana Negara), National Mosque, and Merdeka 118 viewpoint.' },
      { day: 3, title: 'Batu Caves 272 Rainbow Steps & KL Tower High-Tea', activities: 'Visit iconic Lord Murugan statue and limestone cathedral caves, Royal Selangor pewter crafting, followed by high-tea at KL Tower revolving lounge.' },
      { day: 4, title: 'Pavilion Luxury Shopping & KLIA Chauffeur Transfer', activities: 'Morning leisure for shopping in Bukit Bintang, followed by timely private hotel checkout and transfer to KLIA.' }
    ]
  },
  {
    id: 'pkg-4',
    category: 'Packages',
    title: 'Cameron Highlands Mossy Forest & Boh Tea Sanctuary',
    destination: 'Cameron Highlands, Pahang, Malaysia',
    base_price: 750,
    original_price: 920,
    net_price: 600,
    duration_days: 3,
    rating: 4.7,
    reviews: 264,
    image: 'cameron',
    tags: ['Highlands', 'Tea Trails', 'Eco Nature'],
    featured: true,
    description: 'Escape the tropical heat at 1,500m elevation among emerald BOH tea plantations, misty ancient Mossy Forest boardwalks, organic strawberry farms, and colonial English heritage cottages.',
    instructions: 'Private 4x4 Land Rover excursion into Mossy Forest, boutique highland resort stay, steamboat dinner, and private return transfer from Kuala Lumpur or Penang.',
    timings: '08:00 AM Departure from KL',
    childPolicy: 'Family-friendly itinerary. Child discount available for ages 3–11.',
    termsAndConditions: 'Mossy Forest boardwalk is operated under Pahang Forestry Department permits (included). Warm clothing recommended for 15-20°C temperatures.',
    importantInfo: 'Includes private Land Rover 4x4, tea factory guided tour, boutique Tudor-style resort, and traditional fresh highland steamboat feast.',
    itinerary: [
      { day: 1, title: 'Scenic Mountain Drive & Lata Iskandar Waterfall', activities: 'Private morning pickup from Kuala Lumpur/Penang, scenic winding drive via Lata Iskandar jungle cascade, and check-in to your highland resort.' },
      { day: 2, title: 'BOH Sungei Palas Tea Centre & Ancient Mossy Forest', activities: 'Early morning 4x4 Land Rover ascent to Mount Brinchang, elevated boardwalk walk through prehistoric Jurassic Mossy Forest, and artisanal tea tasting.' },
      { day: 3, title: 'Raju Hill Strawberry Picking & Return Transfer', activities: 'Pick fresh highland strawberries, browse Kea Farm local farmers market for honey and lavender, and relaxed scenic drive back to KL/Penang.' }
    ]
  },
  {
    id: 'pkg-5',
    category: 'Packages',
    title: 'Penang UNESCO George Town Heritage, Hill & Michelin Hawker Trail',
    destination: 'George Town, Penang, Malaysia',
    base_price: 980,
    original_price: 1250,
    net_price: 780,
    duration_days: 4,
    rating: 4.9,
    reviews: 440,
    image: 'penang',
    tags: ['UNESCO Heritage', 'Food Trail', 'Culture'],
    featured: true,
    description: 'Discover the cultural soul of Malaysia across George Town\'s UNESCO streets, Pinang Peranakan Mansion, Kek Lok Si Temple, Clan Jetties, The Habitat Penang Hill canopy walk, and curated Michelin Bib Gourmand street food tastings.',
    instructions: 'Includes boutique heritage Mansion stay, Fast-Lane Penang Hill funicular pass, guided trishaw ride, and private culinary guide.',
    timings: 'Daily · Flexible Start',
    childPolicy: 'Children aged 3–11 receive 30% discount.',
    termsAndConditions: 'Trishaw rides and street food tastings included. Free cancellation up to 5 days prior to arrival.',
    importantInfo: 'Includes boutique Peranakan mansion stay, VIP Fast-Lane Penang Hill funicular railway, and curated Michelin street food safari.',
    itinerary: [
      { day: 1, title: 'Arrival in Pearl of the Orient & Trishaw Heritage Ride', activities: 'Private Penang Airport (PEN) transfer to George Town, nostalgic bicycle trishaw ride through Armenian Street mural alleys, and Chew Clan Jetty on stilts.' },
      { day: 2, title: 'Kek Lok Si Temple & The Habitat Penang Hill Rainforest', activities: 'Ascend Penang Hill via VIP fast-track funicular train to Curtis Crest Tree Top Walk, followed by Southeast Asia’s largest Buddhist temple Kek Lok Si.' },
      { day: 3, title: 'Michelin Street Food Trail & Peranakan Mansion', activities: 'Guided walking tasting of Penang Char Kway Teow, Assam Laksa, and Chendol, followed by private tour of opulent 19th-century Pinang Peranakan Mansion.' },
      { day: 4, title: 'Batu Ferringhi Coastline & Airport Transfer', activities: 'Scenic coastal drive, visit Tropical Spice Garden, and comfortable private chauffeur transfer back to Penang International Airport.' }
    ]
  },
  {
    id: 'pkg-6',
    category: 'Packages',
    title: 'Genting Highlands SkyWorlds Theme Park & Cloud Resort Escape',
    destination: 'Genting Highlands, Pahang, Malaysia',
    base_price: 650,
    original_price: 820,
    net_price: 520,
    duration_days: 3,
    rating: 4.8,
    reviews: 389,
    image: 'genting',
    tags: ['Theme Park', 'Family Fun', 'Cool Mountain'],
    featured: true,
    description: 'Experience Malaysia\'s premier entertainment resort above the clouds with Genting SkyWorlds outdoor theme park passes, Skytropolis Indoor Park, Awana SkyWay glass-floor cable car, Chin Swee Caves Temple, and Genting Premium Outlets.',
    instructions: 'Includes Genting SkyWorlds 1-Day Unlimited Pass with Virtual Queue access, Awana SkyWay return cable car, and resort accommodation.',
    timings: '10:00 AM - 06:00 PM Theme Park Hours',
    childPolicy: 'Children under 90cm free. Child tickets apply for height 90cm–110cm.',
    termsAndConditions: 'Theme park passes include 6 complimentary Virtual Queue (VQ) reservations. Rides subject to park operating hours and weather safety.',
    importantInfo: 'Includes 1-day unlimited Genting SkyWorlds entry, Awana SkyWay glass-bottom gondola, and mountain resort stay.',
    itinerary: [
      { day: 1, title: 'KL to Genting Cable Car & Cloud Check-in', activities: 'Private transfer from KL to Awana SkyWay station, scenic glass-floor gondola ride over ancient rainforests, and check-in to Resorts World Genting.' },
      { day: 2, title: 'Full Day Genting SkyWorlds 9 Themed Worlds', activities: 'Unlimited thrill rides across Eagle Mountain, Central Park, Ice Age, Rio, and Andromeda Base with Virtual Queue fast access.' },
      { day: 3, title: 'Chin Swee Caves Temple & Premium Outlets', activities: 'Visit the 9-storey pagoda at Chin Swee Temple with sweeping valley views, duty-free designer shopping at Genting Premium Outlets, and return transfer.' }
    ]
  },
  {
    id: 'pkg-7',
    category: 'Packages',
    title: 'Semporna, Bohey Dulang & Mabul Water Bungalow Dive Paradise',
    destination: 'Semporna & Mabul, Sabah, Malaysia',
    base_price: 2490,
    original_price: 2990,
    net_price: 2050,
    duration_days: 5,
    rating: 5.0,
    reviews: 194,
    image: 'semporna',
    tags: ['Crystal Water', 'Snorkeling', 'Maldives of Malaysia'],
    featured: true,
    description: 'Sail across the world\'s most biodiverse coral triangle in Semporna. Hike Bohey Dulang viewpoint, snorkel pristine Sibuan & Mataking coral reefs, and stay in luxury water bungalows over translucent turquoise lagoons.',
    instructions: 'Includes Tawau Airport (TWU) return transfers, speedboat island hopping permits, snorkeling gear, underwater photography by boat crew, and full-board meals.',
    timings: 'Daily Departures from Tawau / Semporna Jetty',
    childPolicy: 'Life vests provided in all child sizes. Suitable for all ages.',
    termsAndConditions: 'Island hopping permits registered in advance with Sabah Parks. Subject to weather & marine conditions. Free reschedule in case of extreme weather.',
    importantInfo: 'Overwater bungalow accommodation, private island speedboats, full-board gourmet meals, and professional underwater Go-Pro photographer included.',
    itinerary: [
      { day: 1, title: 'Tawau Airport Pickup & Semporna Jetty Check-in', activities: 'Private airport pickup from TWU, transfer to Semporna marina, speedboat to luxury overwater chalet, and sunset welcome dinner.' },
      { day: 2, title: 'Bohey Dulang Volcano Hike & Sibuan Island', activities: 'Hike 600m to the spectacular panoramic volcanic caldera viewpoint over Tun Sakaran Marine Park, followed by swimming with sea turtles at Sibuan.' },
      { day: 3, title: 'Mataking Island Sandbar & Timba-Timba Snorkeling', activities: 'Explore the natural sandbar connecting Mataking islands, snorkel over coral gardens with clownfish, and underwater photography sessions.' },
      { day: 4, title: 'Mabul & Kapalai Overwater Coral Reefs', activities: 'Full day snorkeling and relaxing around Mabul water village, shallow coral shelves, and encounters with manta rays and green turtles.' },
      { day: 5, title: 'Lagoon Sunrise & Airport Departure', activities: 'Sunrise breakfast over the turquoise ocean deck, speedboat return to Semporna, and private transfer back to Tawau Airport.' }
    ]
  },
  {
    id: 'pkg-8',
    category: 'Packages',
    title: 'Historic Melaka Straits River Cruise & Nyonya Cultural Day Experience',
    destination: 'Melaka UNESCO City, Malaysia',
    base_price: 295,
    original_price: 380,
    net_price: 230,
    duration_days: 1,
    rating: 4.8,
    reviews: 327,
    image: 'melaka',
    tags: ['Day Tour', 'UNESCO', 'Peranakan Dining'],
    featured: true,
    description: 'Full-day private cultural excursion from Kuala Lumpur to historic Melaka. Visit Dutch Square (Stadthuys), St. Paul\'s Hill, A Famosa fortress, Jonker Street, enjoy a Melaka River boat cruise, and savor authentic Nyonya Peranakan lunch.',
    instructions: 'Includes hotel pick-up and drop-off in Kuala Lumpur, Melaka River Cruise ticket, Nyonya lunch set, and English-speaking heritage driver-guide.',
    timings: '08:30 AM - 06:30 PM (10 Hours)',
    childPolicy: 'Children aged 3–11 at RM 210.',
    termsAndConditions: 'Door-to-door hotel pickup included. 100% refund for cancellations made at least 24 hours prior to departure.',
    importantInfo: 'Includes private driver-guide, Dutch Square admission, Melaka River boat cruise pass, and 6-course Nyonya Peranakan feast.',
    itinerary: [
      { day: 1, title: 'Full-Day Historic Melaka Discovery', activities: '08:30 AM pickup from KL hotel. Explore 16th-century A Famosa Portuguese fortress, St. Paul’s Church on the hill, red brick Stadthuys, scenic 45-min Melaka River boat cruise, traditional Peranakan banquet lunch, and afternoon shopping for antiques & gula melaka on Jonker Street before 06:30 PM return to KL.' }
    ]
  }
];

export const INITIAL_TRANSPORT: TransportRoute[] = [
  { id: 'tr-1', name: 'KLIA / KLIA2 Airport ↔ Kuala Lumpur City Hotel (Private Transfer)', image: 'transfer', car: 110, mpv: 120, van7: 180, van13: 250, rating: 4.9, reviews: 640, instructions: 'Includes flight tracking, 60-minute complimentary airport waiting time, highway tolls, and fuel.', termsAndConditions: 'Free cancellation up to 6 hours before scheduled pickup. Child safety seats available upon request.', timings: '24/7 Service' },
  { id: 'tr-2', name: 'KLIA Airport → KL Hotel via Putrajaya Pink Mosque Photo Stop', image: 'transfer', car: 160, mpv: 180, van7: 250, van13: 300, rating: 4.8, reviews: 215, instructions: 'Includes 2-hour Putrajaya sightseeing stop enroute to your Kuala Lumpur hotel.', termsAndConditions: 'Tolls, parking, and luggage assistance included.', timings: '24/7 Service' },
  { id: 'tr-3', name: 'KLIA / KLIA2 Airport ↔ Genting Highlands Resort (Direct)', image: 'genting', car: 200, mpv: 220, van7: 300, van13: 400, rating: 4.9, reviews: 310, instructions: 'Direct door-to-door mountain highway transfer.', termsAndConditions: 'Direct express highway transfer with mountain-certified drivers.', timings: '24/7 Service' },
  { id: 'tr-4', name: 'Kuala Lumpur Hotel ↔ Genting Highlands (One-Way Private)', image: 'genting', car: 130, mpv: 140, van7: 250, van13: 320, rating: 4.8, reviews: 420, instructions: 'Includes optional stop at Batu Caves (45 mins) upon request.', termsAndConditions: 'Fixed price with no surge pricing.', timings: 'Daily · 07:00 AM - 10:00 PM' },
  { id: 'tr-5', name: 'KL Hotel ↔ Terminal Bersepadu Selatan (TBS Coach Hub)', image: 'transfer', car: 110, mpv: 120, van7: 280, van13: 250, rating: 4.7, instructions: 'Luggage assistance included.', timings: '24/7 Service' },
  { id: 'tr-6', name: 'KL Hotel ↔ Sunway Lagoon Theme Park (Return Chauffeur)', image: 'sunway', car: 50, mpv: 60, van7: 120, van13: 150, rating: 4.9, instructions: 'Return transfers at pre-coordinated times.', timings: 'Daily · 09:00 AM - 07:00 PM' },
  { id: 'tr-7', name: 'Kuala Lumpur ↔ Port Dickson Lexis Hibiscus Beach Resort', image: 'transfer', car: 300, mpv: 350, van7: 430, van13: 550, rating: 4.8, instructions: 'Approx. 1.5-hour coastal highway drive.', timings: '24/7 Service' },
  { id: 'tr-8', name: 'KLIA Airport ↔ Port Dickson Beach Resort', image: 'transfer', car: 300, mpv: 350, van7: 430, van13: 550, rating: 4.8, instructions: 'Airport pickup directly to coast.', timings: '24/7 Service' },
  { id: 'tr-9', name: 'Kuala Lumpur / KLIA ↔ Penang Island Hotel (Private Cross-State)', image: 'penang', car: 800, mpv: 900, van7: 1050, van13: 1150, rating: 4.9, instructions: 'Long-distance mainland drive crossing the iconic Penang Bridge.', timings: 'Daily · Flexible Departure' },
  { id: 'tr-10', name: 'Kuala Lumpur / KLIA ↔ Johor Bahru / Legoland Malaysia Resort', image: 'transfer', car: 800, mpv: 900, van7: 1050, van13: 1150, rating: 4.8, instructions: 'Approx. 4-hour direct private highway transfer.', timings: 'Daily · Flexible Departure' },
  { id: 'tr-11', name: 'Kuala Lumpur Inner City Point-to-Point Chauffeur Transfer', image: 'transfer', car: 50, mpv: 60, van7: 100, van13: 150, rating: 4.7, instructions: 'Subject to rush hour peak surcharges.', timings: '06:00 AM - 11:59 PM' },
  { id: 'tr-12', name: 'Genting Highlands Private Day Charter (10 Hours Chauffeur)', image: 'genting', car: 280, mpv: 300, van7: 450, van13: 550, rating: 4.9, instructions: 'Private driver at your disposal for 10 hours.', timings: '10 Hours Flexible Charter' },
  { id: 'tr-13', name: 'Cameron Highlands Day Charter + Tea & Countryside Tour', image: 'cameron', car: 700, mpv: 800, van7: 950, van13: 1050, rating: 4.9, instructions: 'Full day private charter covering strawberry farms, BOH tea gardens, and waterfalls.', timings: 'Full Day Charter' },
  { id: 'tr-14', name: 'Kuala Lumpur Half-Day City Highlights + Batu Caves (4 Hours)', image: 'kl', car: 100, mpv: 120, van7: 250, van13: 300, rating: 4.9, instructions: 'Covering National Mosque, King\'s Palace, Independence Square, and Batu Caves.', timings: '4-Hour Sightseeing Charter' },
  { id: 'tr-15', name: 'Kuala Lumpur Full-Day Private Chauffeur + Twin Towers Photo Stop (8 Hours)', image: 'petronas', car: 150, mpv: 180, van7: 300, van13: 400, rating: 5.0, instructions: 'Flexible itinerary, driver-guided trip (8 hours).', timings: '8-Hour VIP Chauffeur' }
];

export const INITIAL_HOTELS: Hotel[] = [
  {
    id: 'ht-1',
    name: 'Howard Johnson by Wyndham Kuala Lumpur',
    location: 'Kuala Lumpur City Centre',
    image: 'hotel',
    cat: '3-Star',
    price: 120,
    originalPrice: 165,
    rating: 4.5,
    reviews: 180,
    contractBadge: 'Direct DMC Contract Rate',
    featuredContract: true,
    instructions: 'Daily buffet breakfast included. Deluxe twin/king rooms.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children aged 0–11 stay free using existing bedding. Extra bed available at RM60/night.',
    termsAndConditions: 'Free cancellation up to 48 hours prior to check-in. Malaysian Tourism Tax of RM10/night applies to non-citizens payable at front desk.',
    importantInfo: 'Includes high-speed WiFi, rooftop pool access, 24/7 fitness centre, and complimentary bottled water.',
    roomCategories: [
      { name: 'Deluxe King Room', price: 120, pax: 2 },
      { name: 'Superior Twin Room', price: 135, pax: 2 },
      { name: 'Executive Suite (Breakfast Included)', price: 185, pax: 3 }
    ]
  },
  {
    id: 'ht-2',
    name: 'Metro Star Hotel Kuala Lumpur',
    location: 'Masjid Jamek, Kuala Lumpur',
    image: 'hotel',
    cat: '3-Star',
    price: 125,
    originalPrice: 170,
    rating: 4.5,
    reviews: 142,
    contractBadge: 'Allotment Guaranteed',
    instructions: 'Located 2 mins from LRT station. Safe and central.',
    timings: 'Check-in: 2:00 PM | Check-out: 12:00 PM',
    childPolicy: '1 child under 6 stays free with parents.',
    termsAndConditions: 'Free cancellation up to 24 hours prior to arrival date.',
    importantInfo: 'Prime location adjacent to historic Masjid Jamek LRT interchange and Chinatown.',
    roomCategories: [
      { name: 'Standard Room', price: 125, pax: 2 },
      { name: 'Deluxe Room', price: 155, pax: 3 },
      { name: 'Family Triple Room', price: 195, pax: 4 }
    ]
  },
  {
    id: 'ht-3',
    name: 'Metro Hotel Bukit Bintang',
    location: 'Bukit Bintang, Kuala Lumpur',
    image: 'hotel',
    cat: '3-Star',
    price: 130,
    originalPrice: 180,
    rating: 4.6,
    reviews: 210,
    contractBadge: 'Direct DMC Contract Rate',
    instructions: 'In the heart of food and shopping district Bukit Bintang.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children under 10 stay free without extra bed.',
    termsAndConditions: 'Non-refundable within 48h of check-in.',
    importantInfo: 'Walking distance to Berjaya Times Square, Lot 10, and Pavilion KL.',
    roomCategories: [
      { name: 'Standard Twin Room', price: 130, pax: 2 },
      { name: 'Superior King Room', price: 150, pax: 2 },
      { name: 'Deluxe Family Room', price: 210, pax: 4 }
    ]
  },
  {
    id: 'ht-4',
    name: 'Ramada Encore by Wyndham Chinatown KL',
    location: 'Chinatown, Kuala Lumpur',
    image: 'hotel',
    cat: '3-Star',
    price: 140,
    originalPrice: 195,
    rating: 4.6,
    reviews: 165,
    contractBadge: 'Preferred Partner',
    instructions: 'Modern boutique rooms steps from Petaling Street & Merdeka 118.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children under 12 stay free with parents.',
    termsAndConditions: 'Free cancellation up to 48 hours prior to check-in.',
    importantInfo: 'Boutique stay right by Merdeka 118 tower and historic Petaling Street.',
    roomCategories: [
      { name: 'Encore Superior King', price: 140, pax: 2 },
      { name: 'Encore Premier City View', price: 170, pax: 2 }
    ]
  },
  {
    id: 'ht-7',
    name: 'Starus Hotel Bukit Bintang (formerly Grand Continental)',
    location: 'Bukit Bintang, Kuala Lumpur',
    image: 'hotel',
    cat: '4-Star',
    price: 210,
    originalPrice: 280,
    rating: 4.7,
    reviews: 295,
    contractBadge: 'Direct Nett Allotment',
    featuredContract: true,
    instructions: 'Executive rooms with city skyline vistas & outdoor pool.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Up to 2 children under 12 stay free using existing beds.',
    termsAndConditions: 'Free cancellation up to 3 days before arrival.',
    importantInfo: 'Includes outdoor pool, buffet breakfast option, and gym.',
    roomCategories: [
      { name: 'Deluxe City View Room', price: 210, pax: 2 },
      { name: 'Grand Executive Suite', price: 280, pax: 3 },
      { name: 'Family 2-Bedroom Suite', price: 390, pax: 4 }
    ]
  },
  {
    id: 'ht-8',
    name: 'Verdant Hill Hotel Kuala Lumpur',
    location: 'Bukit Ceylon, Kuala Lumpur',
    image: 'hotel',
    cat: '4-Star',
    price: 215,
    originalPrice: 290,
    rating: 4.8,
    reviews: 310,
    contractBadge: 'Direct DMC Contract Rate',
    featuredContract: true,
    instructions: 'Infinity pool access, international breakfast buffet.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children up to 11 stay free with parents.',
    termsAndConditions: 'Free cancellation up to 48h before check-in date.',
    importantInfo: 'Quiet hillside sanctuary in Bukit Ceylon with rooftop infinity pool.',
    roomCategories: [
      { name: 'Deluxe King Bed', price: 215, pax: 2 },
      { name: 'Premier Twin with Breakfast', price: 260, pax: 2 },
      { name: 'Verdant Executive Suite', price: 340, pax: 3 }
    ]
  },
  {
    id: 'ht-9',
    name: 'Swiss-Garden Hotel Bukit Bintang KL',
    location: 'Bukit Bintang, Kuala Lumpur',
    image: 'hotel',
    cat: '4-Star',
    price: 220,
    originalPrice: 310,
    rating: 4.7,
    reviews: 275,
    contractBadge: 'Contracted B2B/B2C Rate',
    instructions: 'Spacious family rooms and premier fitness facilities.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children under 12 stay free.',
    termsAndConditions: 'Free cancellation up to 72h prior to arrival.',
    importantInfo: 'Olympic-style pool, squash courts, sauna, and gourmet restaurant.',
    roomCategories: [
      { name: 'Deluxe Room', price: 220, pax: 2 },
      { name: 'Executive Club Room', price: 290, pax: 2 },
      { name: 'Swiss Family Suite', price: 380, pax: 4 }
    ]
  },
  {
    id: 'ht-12',
    name: 'ibis Kuala Lumpur City Centre (KLCC)',
    location: 'KLCC, Kuala Lumpur',
    image: 'kl',
    cat: '4-Star',
    price: 230,
    originalPrice: 320,
    rating: 4.8,
    reviews: 410,
    contractBadge: 'Direct DMC Contract Rate',
    featuredContract: true,
    instructions: 'Rooftop infinity pool with spectacular Petronas Twin Towers view.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children stay free. Baby cots available upon request.',
    termsAndConditions: 'Free cancellation up to 24h prior to check-in.',
    importantInfo: 'Signature rooftop infinity pool with unobstructed Petronas Twin Towers skyline vista.',
    roomCategories: [
      { name: 'Standard King Room', price: 230, pax: 2 },
      { name: 'Superior Twin Room (Twin Towers View)', price: 275, pax: 2 },
      { name: 'Premium King with Breakfast', price: 310, pax: 2 }
    ]
  },
  {
    id: 'ht-14',
    name: 'Pacific Regency Hotel Suites KLCC',
    location: 'KL Tower Precinct, Kuala Lumpur',
    image: 'hotel',
    cat: '4-Star',
    price: 290,
    originalPrice: 390,
    rating: 4.7,
    reviews: 230,
    contractBadge: 'Suite Allotment Partner',
    instructions: 'Large suite apartments with panoramic views and kitchenettes.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Family suites accommodate up to 4 guests.',
    termsAndConditions: 'Free cancellation up to 48 hours before check-in.',
    importantInfo: 'All rooms are spacious luxury suites with kitchenettes, sitting lounge, and Luna Bar rooftop access.',
    roomCategories: [
      { name: 'Superior Studio Suite (55 sqm)', price: 290, pax: 2 },
      { name: 'Deluxe Regency Suite (70 sqm)', price: 360, pax: 3 },
      { name: 'Executive 2-Bedroom Suite', price: 520, pax: 4 }
    ]
  },
  {
    id: 'ht-15',
    name: 'Berjaya Times Square Hotel Kuala Lumpur',
    location: 'Bukit Bintang, Kuala Lumpur',
    image: 'kl',
    cat: '5-Star',
    price: 380,
    originalPrice: 520,
    rating: 4.9,
    reviews: 580,
    contractBadge: 'Official 5-Star Contract',
    featuredContract: true,
    instructions: 'Directly integrated with shopping mall, indoor theme park, and Imbi Monorail.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children under 12 stay free. High chairs and cribs provided.',
    termsAndConditions: 'Free cancellation up to 48h before arrival. Non-smoking property.',
    importantInfo: 'Over-sized suites directly connected to 1,000 retail shops, indoor roller coaster, and monorail.',
    roomCategories: [
      { name: 'Studio Suite (51 sqm)', price: 380, pax: 2 },
      { name: 'Superior 1-Bedroom Suite (71 sqm)', price: 460, pax: 3 },
      { name: 'Club Premier Suite with Lounge Access', price: 580, pax: 3 }
    ]
  },
  {
    id: 'ht-16',
    name: 'Royale Chulan Kuala Lumpur',
    location: 'Jalan Conlay, Kuala Lumpur',
    image: 'hotel',
    cat: '5-Star',
    price: 320,
    originalPrice: 460,
    rating: 4.8,
    reviews: 390,
    contractBadge: 'Official 5-Star Contract',
    featuredContract: true,
    instructions: 'Grand Malay royal architecture with luxury courtyard pool and spa.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children stay free. Babysitting services available.',
    termsAndConditions: 'Free cancellation up to 72h prior to check-in.',
    importantInfo: 'Malay heritage palace design, indoor heated pool, Samsara spa, and 5 gourmet restaurants.',
    roomCategories: [
      { name: 'Superior King Room', price: 320, pax: 2 },
      { name: 'Deluxe Heritage Pool View', price: 390, pax: 2 },
      { name: 'Royale Executive Suite with Lounge Access', price: 550, pax: 3 }
    ]
  },
  {
    id: 'ht-18',
    name: 'Resorts World Genting – First World & Awana Resort',
    location: 'Genting Highlands, Pahang',
    image: 'genting',
    cat: 'Resort',
    price: 300,
    originalPrice: 420,
    rating: 4.8,
    reviews: 620,
    contractBadge: 'Direct Resort Contract',
    featuredContract: true,
    instructions: 'Cool mountain retreat at 1,800m with complimentary SkyWorlds shuttle.',
    timings: 'Check-in: 3:00 PM | Check-out: 11:00 AM',
    childPolicy: 'Children under 12 stay free on existing beds.',
    termsAndConditions: 'Guaranteed mountain allocation. Surcharges apply on national peak holidays.',
    importantInfo: 'Includes complimentary shuttle to Genting SkyWorlds, Awana Golf Course access, and heated outdoor pool.',
    roomCategories: [
      { name: 'Deluxe Mountain View Room', price: 300, pax: 2 },
      { name: 'Awana Club Suite with Breakfast', price: 420, pax: 3 },
      { name: 'Villa Suite with Private Balcony', price: 680, pax: 4 }
    ]
  },
  {
    id: 'ht-20',
    name: 'Berjaya Langkawi Resort & Overwater Chalets',
    location: 'Burau Bay, Langkawi, Kedah',
    image: 'langkawi',
    cat: 'Resort',
    price: 460,
    originalPrice: 650,
    rating: 4.9,
    reviews: 490,
    contractBadge: 'Exclusive Island Contract',
    featuredContract: true,
    instructions: 'Rainforest and overwater chalets steps from Langkawi SkyCab.',
    timings: 'Check-in: 3:00 PM | Check-out: 12:00 PM',
    childPolicy: 'Children aged 0–11 stay free. Complimentary baby cot available.',
    termsAndConditions: 'Free cancellation up to 7 days before arrival. Overwater chalets reserved for ages 12 and above.',
    importantInfo: 'Overwater stilted chalets, private private beach, 8 dining venues, and direct proximity to Langkawi SkyCab.',
    roomCategories: [
      { name: 'Rainforest Chalet (Twin/King)', price: 460, pax: 2 },
      { name: 'Seaview Chalet with Private Balcony', price: 590, pax: 2 },
      { name: 'Premier Overwater Chalet on the Andaman Sea', price: 890, pax: 2 }
    ]
  }
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'tk-1',
    name: 'KL Tower Observatory & Sky Deck Pass (Adult)',
    location: 'Kuala Lumpur',
    image: 'petronas',
    price: 67,
    originalPrice: 85,
    rating: 4.8,
    reviews: 720,
    featured: true,
    info: 'Instant E-Ticket | Official Supplier Rate',
    addInfo: '9:00 AM - 10:00 PM Daily',
    instructions: 'Present mobile QR code directly at the turnstile. Valid for all nationalities.',
    timings: '09:00 AM - 10:00 PM Daily (Last entry 09:30 PM)',
    childPolicy: 'Children aged 3-12 enter at child rate. Infants under 3 enter free of charge.',
    termsAndConditions: 'Instant QR delivery. Pass valid for 90 days from purchase. Direct gate entry with turnstile scan. Sky Box access is subject to local weather safety regulations.',
    importantInfo: 'Includes indoor Observation Deck (276m) and open-air Sky Deck (300m) with 360-degree panoramic Kuala Lumpur skyline vistas.',
    ticketCategories: [
      { name: 'Malaysian Citizen (MyKad) - Adult', price: 45, description: 'Requires valid Malaysian MyKad at turnstile' },
      { name: 'International Visitor - Adult', price: 67, description: 'Standard admission for all nationalities' },
      { name: 'Sky Deck + Sky Box Combo (Express Lane)', price: 95, description: 'Includes glass Sky Box photo access and fast-track line' },
      { name: 'Child / Senior Citizen (MyKad / Intl)', price: 35, description: 'Ages 3-12 or 60+ with photo verification' }
    ]
  },
  {
    id: 'tk-2',
    name: 'KL Tower Observatory & Sky Deck Pass (Child)',
    location: 'Kuala Lumpur',
    image: 'petronas',
    price: 43,
    originalPrice: 55,
    rating: 4.8,
    reviews: 310,
    info: 'Instant E-Ticket | Official Supplier Rate',
    addInfo: '9:00 AM - 10:00 PM Daily',
    instructions: 'Child policy: 3-12 years. Under 2 years free of charge.',
    timings: '09:00 AM - 10:00 PM Daily',
    childPolicy: 'Ages 3 to 12. Must be accompanied by a paying adult.',
    termsAndConditions: 'Valid for 90 days. Instant QR turnstile scan.',
    ticketCategories: [
      { name: 'Child (Malaysian MyKid)', price: 28, description: 'Ages 3-12 Malaysian citizen' },
      { name: 'Child (International Visitor)', price: 43, description: 'Ages 3-12 international' }
    ]
  },
  {
    id: 'tk-3',
    name: 'KL Bird Park World\'s Largest Walk-In Aviary (Adult)',
    location: 'Perdana Botanical Gardens, KL',
    image: 'kl',
    price: 85,
    originalPrice: 95,
    rating: 4.7,
    reviews: 415,
    featured: true,
    info: 'Flexible Date | Mobile QR Voucher',
    addInfo: '9:00 AM - 6:00 PM Daily',
    instructions: 'Walk through the world\'s largest free-flight walk-in aviary with daily hornbill & flamingo feeding.',
    timings: '09:00 AM - 06:00 PM Daily (Last admission 05:00 PM)',
    childPolicy: 'Child rate applies for ages 3 to 11. Under 3 enter free.',
    termsAndConditions: 'Instant voucher issuance. Voucher is valid for 90 days. Same-day re-entry allowed with hand stamp. Rain or shine attraction.',
    importantInfo: 'Over 3,000 birds across 20.9 acres of landscaped tropical rainforest. Includes daily bird shows at 12:30 PM & 3:30 PM.',
    ticketCategories: [
      { name: 'Malaysian Citizen (MyKad) - Adult', price: 45, description: 'Proof of MyKad required at turnstile' },
      { name: 'International Visitor - Adult', price: 85, description: 'General international visitor entry' },
      { name: 'Child Admission (Ages 3-11)', price: 50, description: 'Under 3 years old enter free' }
    ]
  },
  {
    id: 'tk-4',
    name: 'KL Bird Park Admission Ticket (Child)',
    location: 'Perdana Botanical Gardens, KL',
    image: 'kl',
    price: 67,
    originalPrice: 75,
    rating: 4.7,
    reviews: 190,
    info: 'Flexible Date | Mobile QR Voucher',
    addInfo: '9:00 AM - 6:00 PM Daily',
    instructions: 'Child policy: 3-12 years. Under 2 free.',
    timings: '09:00 AM - 06:00 PM Daily',
    childPolicy: 'Ages 3–11.',
    termsAndConditions: 'Instant QR voucher valid 90 days.',
    ticketCategories: [
      { name: 'Child (MyKid)', price: 20, description: 'Malaysian children 3-11' },
      { name: 'Child (International)', price: 67, description: 'International children 3-11' }
    ]
  },
  {
    id: 'tk-5',
    name: 'Aquaria KLCC Oceanarium Skip-The-Line Pass (Adult)',
    location: 'KLCC, Kuala Lumpur',
    image: 'kl',
    price: 64,
    originalPrice: 79,
    rating: 4.9,
    reviews: 980,
    featured: true,
    info: 'Instant Confirmation | Direct Gate Entry',
    addInfo: '10:00 AM - 8:00 PM Daily',
    instructions: '90-meter underwater tunnel oceanarium right beneath Kuala Lumpur Convention Centre.',
    timings: '10:00 AM - 08:00 PM Daily (Last entry 07:00 PM)',
    childPolicy: 'Child tickets apply for ages 3-12. Children under 3 enter free.',
    termsAndConditions: 'Instant mobile QR entry. Scan directly at gate turnstiles. Non-refundable once scanned. Valid for 90 days from purchase.',
    importantInfo: 'Includes 90m underwater tunnel with moving walkway, shark feeding sessions at 3:00 PM, and touch pool interactions.',
    ticketCategories: [
      { name: 'Malaysian Citizen (MyKad) - Adult', price: 52, description: 'Valid MyKad required at gate' },
      { name: 'International Visitor - Adult', price: 64, description: 'Direct gate QR entry' },
      { name: 'Aquaria + VR Experience Combo', price: 82, description: 'Includes 360-degree ocean VR exploration' },
      { name: 'Child / Senior Citizen (MyKad / Intl)', price: 45, description: 'Ages 3-12 or Seniors 60+' }
    ]
  },
  {
    id: 'tk-6',
    name: 'Aquaria KLCC Oceanarium Pass (Child)',
    location: 'KLCC, Kuala Lumpur',
    image: 'kl',
    price: 58,
    originalPrice: 69,
    rating: 4.9,
    reviews: 410,
    info: 'Instant Confirmation | Direct Gate Entry',
    addInfo: '10:00 AM - 8:00 PM Daily',
    instructions: 'Ages 3 to 12. Must be accompanied by an adult.',
    timings: '10:00 AM - 08:00 PM Daily',
    childPolicy: 'Ages 3-12.',
    termsAndConditions: 'Instant gate QR delivery.',
    ticketCategories: [
      { name: 'Child (MyKid)', price: 42, description: 'Malaysian MyKid holders' },
      { name: 'Child (International)', price: 58, description: 'International child 3-12' }
    ]
  },
  {
    id: 'tk-9',
    name: 'Sunway Lagoon All 6 Adventure & Water Parks Pass (Adult)',
    location: 'Bandar Sunway, Selangor',
    image: 'sunway',
    price: 165,
    originalPrice: 220,
    rating: 4.9,
    reviews: 1120,
    featured: true,
    info: 'All 6 Parks | Express E-Voucher',
    addInfo: '10:00 AM - 6:00 PM (Closed Tue)',
    instructions: 'Includes Water Park, Amusement Park, Wildlife Park, Extreme Park, Scream Park & Nickelodeon Lost Lagoon.',
    timings: '10:00 AM - 06:00 PM (Wed - Mon, Closed Tuesdays except Malaysian school holidays)',
    childPolicy: 'Child entry applies for height 90cm–120cm or under age 12. Children below 90cm enter free.',
    termsAndConditions: 'Instant QR wristband exchange at express counters. Re-entry not permitted once wristband is removed. Lockers and tube rentals payable separately.',
    importantInfo: 'Full all-day access to all 6 theme parks including the world’s largest surf pool and Vuvuzela water ride.',
    ticketCategories: [
      { name: 'Malaysian Citizen (MyKad) - Adult', price: 125, description: 'Requires MyKad at turnstile' },
      { name: 'International Visitor - Adult Pass', price: 165, description: 'All-inclusive 6-park admission' },
      { name: 'Quack Xpress (Skip-The-Line Fast Track)', price: 245, description: 'Dedicated express lane access to 21 top rides' },
      { name: 'Child / Senior Pass (Under 12 / 60+)', price: 110, description: 'Covers children above 90cm and seniors' }
    ]
  },
  {
    id: 'tk-10',
    name: 'Sunway Lagoon All 6 Adventure Parks Pass (Child)',
    location: 'Bandar Sunway, Selangor',
    image: 'sunway',
    price: 130,
    originalPrice: 185,
    rating: 4.9,
    reviews: 530,
    info: 'All 6 Parks | Express E-Voucher',
    addInfo: '10:00 AM - 6:00 PM',
    instructions: 'Child height below 90cm enters free. Child ticket covers up to age 12.',
    timings: '10:00 AM - 06:00 PM',
    childPolicy: 'Height 90cm–120cm.',
    termsAndConditions: 'Wristband exchange at express counter.',
    ticketCategories: [
      { name: 'Child (MyKid)', price: 95, description: 'Malaysian child with MyKid' },
      { name: 'Child (International)', price: 130, description: 'International child' }
    ]
  },
  {
    id: 'tk-11',
    name: 'Genting SkyWorlds Outdoor Theme Park 1-Day Pass',
    location: 'Genting Highlands, Pahang',
    image: 'genting',
    price: 143,
    originalPrice: 198,
    rating: 4.9,
    reviews: 870,
    featured: true,
    info: 'Includes Complimentary Virtual Queue (VQ)',
    addInfo: '11:00 AM - 6:00 PM',
    instructions: 'Link your QR ticket in the Genting SkyWorlds App for complimentary VQ ride reservations.',
    timings: '11:00 AM - 06:00 PM Daily',
    childPolicy: 'Children under 90cm enter free. Child ticket applies for 90cm–110cm.',
    termsAndConditions: 'Instant QR turnstile entry. Valid on selected date. Includes Rainy Day Guarantee: free return visit if it rains for more than 2 consecutive hours between 11 AM - 4 PM.',
    importantInfo: 'Includes unlimited access to 26 rides across 9 movie & adventure-themed worlds, plus 6 free Virtual Queue reservations via mobile app.',
    ticketCategories: [
      { name: 'Standard 1-Day Pass (Adult)', price: 143, description: 'Full access to all 9 themed worlds' },
      { name: 'Combo: SkyWorlds + Skytropolis Indoor Pass', price: 185, description: 'Both outdoor SkyWorlds & multi-level indoor park' },
      { name: 'Child / Senior / Pregnant Guest Pass', price: 115, description: 'Height 90-110cm or seniors aged 60+' }
    ]
  },
  {
    id: 'tk-15',
    name: 'Petronas Twin Towers Skybridge & Level 86 Observation Deck',
    location: 'KLCC, Kuala Lumpur',
    image: 'petronas',
    price: 145,
    originalPrice: 175,
    rating: 5.0,
    reviews: 1450,
    featured: true,
    info: 'Guaranteed Time Slot | Authorized Allotment',
    addInfo: '09:00 AM - 09:00 PM (Closed Mon)',
    instructions: 'Official timed-entry ticket to the Double-Decker Skybridge (Level 41/42) and Level 86 Spire Deck.',
    timings: '09:00 AM - 09:00 PM (Closed Mondays except public holidays)',
    childPolicy: 'Children under 3 enter free. Child rate applies for ages 3–12.',
    termsAndConditions: 'Fixed timed entry. Please arrive at the concourse level 15 minutes before your allotted slot. Luggage storage available. Non-refundable once slot is confirmed by KLCC management.',
    importantInfo: 'Guaranteed entry allotment to the world\'s tallest twin towers. Includes high-speed double-deck elevator, Skybridge walk at 170m, and 86th-floor observation gallery.',
    ticketCategories: [
      { name: 'Malaysian Citizen (MyKad) - Adult', price: 35, description: 'Requires valid MyKad at registration desk' },
      { name: 'International Visitor - Adult Pass', price: 145, description: 'Guaranteed slot reservation' },
      { name: 'Child Ticket (Ages 3-12)', price: 80, description: 'Requires birth certificate or passport' },
      { name: 'VIP Fast Track Escort Pass', price: 195, description: 'Skip all lines with dedicated host' }
    ]
  },
  {
    id: 'tk-19',
    name: 'Luxury Sunset Dinner Cruise with Open Bar',
    location: 'Penang / Langkawi Marina',
    image: 'cruise',
    price: 219,
    originalPrice: 280,
    rating: 4.9,
    reviews: 460,
    featured: true,
    info: 'Daily Sunset Sail | Jacuzzi Net & BBQ Buffet',
    addInfo: '4:30 PM - 8:00 PM',
    instructions: 'Set sail across the Andaman Straits with live music, saltwater jacuzzi net, and gourmet buffet.',
    timings: '04:30 PM - 08:00 PM Daily (Boarding at 04:00 PM)',
    childPolicy: 'Children aged 4-11 enjoy child rate. Infants under 4 travel free with life vest.',
    termsAndConditions: 'Departs punctually from Awana Porto Malai / Telaga Terminal. 100% refund or free date change in the event of Coast Guard weather advisory.',
    importantInfo: 'Includes 3.5-hour sunset catamaran cruise, saltwater jacuzzi boom netting, unlimited drinks, and BBQ seafood banquet.',
    ticketCategories: [
      { name: 'Standard Sunset Cruise & BBQ Buffet', price: 219, description: 'Includes open bar and dinner buffet' },
      { name: 'VIP Front Deck Lounger + Champagne', price: 289, description: 'Reserved premium bow seating with chilled bubbly' },
      { name: 'Child Pass (Ages 4-11)', price: 149, description: 'Full dinner buffet and fruit punch' }
    ]
  }
];

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'AG-1001',
    company: 'Wanderlust Travels Ltd',
    email: 'agent@gfk.com',
    password: 'password123',
    commission: 15,
    wallet: { credit: 15000, earned: 4250, pending: 0 }
  },
  {
    id: 'AG-1002',
    company: 'Global Explorers Agency',
    email: 'global@gfk.com',
    password: 'password123',
    commission: 10,
    wallet: { credit: 5400, earned: 680, pending: 0 }
  },
  {
    id: 'AG-1003',
    company: 'Pacific Blue Tourism',
    email: 'pacific@gfk.com',
    password: 'password123',
    commission: 12,
    wallet: { credit: 2100, earned: 190, pending: 0 }
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'GFK-8821',
    pkgId: 'pkg-1',
    client: 'Johnathan Doe',
    email: 'johnathan.doe@example.com',
    phone: '+60 12 345 6789',
    date: '2026-08-15',
    total: 3410,
    commission: 698,
    status: 'CONFIRMED',
    agentId: 'AG-1001',
    createdAt: '2026-07-10'
  },
  {
    id: 'GFK-9932',
    pkgId: 'tr-1',
    client: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+60 17 889 1122',
    date: '2026-08-20',
    total: 110,
    commission: 22,
    status: 'CONFIRMED',
    agentId: 'AG-1001',
    createdAt: '2026-07-12'
  },
  {
    id: 'GFK-3211',
    pkgId: 'pkg-3',
    client: 'Robert Kowalski',
    email: 'robert.k@example.com',
    phone: '+44 7700 900077',
    date: '2026-07-28',
    total: 850,
    commission: 0,
    status: 'CONFIRMED',
    agentId: null,
    createdAt: '2026-07-14'
  },
  {
    id: 'GFK-4491',
    pkgId: 'ht-15',
    client: 'Michael Chang',
    email: 'm.chang@example.com',
    phone: '+65 9123 4567',
    date: '2026-08-01',
    total: 1140,
    commission: 114,
    status: 'CONFIRMED',
    agentId: 'AG-1002',
    createdAt: '2026-07-15'
  }
];

export const IMAGE_MAP: Record<string, string> = {
  langkawi: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
  sabah: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1000&q=80',
  kl: 'https://images.unsplash.com/photo-1596422846543-75c6fc1f4767?auto=format&fit=crop&w=1000&q=80',
  transfer: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=80',
  petronas: 'https://images.unsplash.com/photo-1509144933932-a5e012920fca?auto=format&fit=crop&w=1000&q=80',
  penang: 'https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=1000&q=80',
  genting: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=80',
  cameron: 'https://images.unsplash.com/photo-1511216113906-8f57bb83e776?auto=format&fit=crop&w=1000&q=80',
  sunway: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=1000&q=80',
  cruise: 'https://images.unsplash.com/photo-1500930287596-c1ecadcbee7e?auto=format&fit=crop&w=1000&q=80',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
  semporna: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
  melaka: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1000&q=80'
};

export const INITIAL_ALLOTMENTS: Allotment[] = [
  { id: 'al-1', itemId: 'tk-1', itemName: 'KL Tower Observatory Deck Pass (Adult)', date: '2026-07-25', timeSlot: '10:00 AM', totalSlots: 20, bookedSlots: 3 },
  { id: 'al-2', itemId: 'tk-1', itemName: 'KL Tower Observatory Deck Pass (Adult)', date: '2026-07-25', timeSlot: '02:00 PM', totalSlots: 20, bookedSlots: 15 },
  { id: 'al-3', itemId: 'tk-15', itemName: 'Petronas Twin Towers Skybridge (Adult)', date: '2026-08-01', timeSlot: '09:00 AM', totalSlots: 10, bookedSlots: 8 },
  { id: 'al-4', itemId: 'tk-15', itemName: 'Petronas Twin Towers Skybridge (Adult)', date: '2026-08-01', timeSlot: '03:00 PM', totalSlots: 10, bookedSlots: 2 },
  { id: 'al-5', itemId: 'pkg-1', itemName: 'Langkawi Luxury Overwater Escape', date: '2026-07-30', timeSlot: '09:00 AM', totalSlots: 5, bookedSlots: 1 },
  { id: 'al-6', itemId: 'pkg-2', itemName: 'Sabah Rainforest Wildlife Expedition', date: '2026-08-10', timeSlot: '08:00 AM', totalSlots: 8, bookedSlots: 4 },
  { id: 'al-7', itemId: 'tk-9', itemName: 'Sunway Lagoon Water Theme Park Pass (Adult)', date: '2026-07-28', timeSlot: '10:00 AM', totalSlots: 50, bookedSlots: 12 }
];

export const DEFAULT_CUSTOMER_MEDIA: CustomerMediaItem[] = [
  {
    id: 'cm-1',
    type: 'video',
    url: 'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1596422846543-75c6fc1f4767?auto=format&fit=crop&w=900&q=80',
    customerName: 'Sarah & Liam Jenkins (UK)',
    location: 'Petronas Twin Towers, Kuala Lumpur',
    experienceTitle: 'KL Twin Towers & Urban Luxury 4D3N',
    caption: 'Skip-the-line Level 86 Skybridge views at twilight arranged seamlessly by GFK Holidays! Best Malaysia trip ever.',
    rating: 5,
    date: 'October 2026'
  },
  {
    id: 'cm-2',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=80',
    customerName: 'Aisha Al-Mansoor (UAE)',
    location: 'Langkawi SkyBridge & Tanjung Rhu, Kedah',
    experienceTitle: 'Langkawi Luxury Overwater Escape',
    caption: 'Our private sunset yacht cruise and overwater villa in Langkawi exceeded every expectation. Truly 5-star service!',
    rating: 5,
    date: 'September 2026'
  },
  {
    id: 'cm-3',
    type: 'video',
    url: 'https://cdn.pixabay.com/video/2022/04/09/113366-697718069_large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    customerName: 'Daniel & Chloe Tan (Singapore)',
    location: 'Mabul & Semporna Islands, Sabah',
    experienceTitle: 'Semporna & Mabul Water Bungalow Dive Paradise',
    caption: 'Crystal clear waters in Semporna! Swimming with sea turtles right from our water bungalow deck.',
    rating: 5,
    date: 'October 2026'
  },
  {
    id: 'cm-4',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1511216113906-8f57bb83e776?auto=format&fit=crop&w=900&q=80',
    customerName: 'Priya & Arjun Sharma (India)',
    location: 'Boh Tea Valley, Cameron Highlands',
    experienceTitle: 'Cameron Highlands Mossy Forest & Tea Sanctuary',
    caption: 'Waking up to misty emerald tea hills and fresh strawberries. Our private chauffeur from KL was so punctual and friendly!',
    rating: 5,
    date: 'August 2026'
  },
  {
    id: 'cm-5',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=900&q=80',
    customerName: 'Marcus Vance (Australia)',
    location: 'George Town UNESCO Precinct, Penang',
    experienceTitle: 'Penang Heritage & Michelin Hawker Trail',
    caption: 'Every street corner in Penang has a story and world-class food. GFK\'s local foodie guide knew all the hidden gems.',
    rating: 5,
    date: 'September 2026'
  },
  {
    id: 'cm-6',
    type: 'video',
    url: 'https://cdn.pixabay.com/video/2021/08/10/84574-586228759_large.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=900&q=80',
    customerName: 'Elena Rostova (Germany)',
    location: 'Kinabatangan River & Mount Kinabalu, Sabah',
    experienceTitle: 'Sabah Borneo Rainforest & Wildlife Expedition',
    caption: 'Spotted wild Bornean orangutans and pygmy elephants on our morning river safari! A once-in-a-lifetime Malaysian adventure.',
    rating: 5,
    date: 'October 2026'
  }
];

export const DEFAULT_SOCIAL_CHANNELS: SocialMediaChannel[] = [
  {
    id: 'soc-1',
    platform: 'Instagram',
    handle: '@gfkholidays.my',
    url: 'https://instagram.com/gfkholidays',
    followers: '128K Followers',
    highlightText: 'Daily Malaysia reels, island drone shots & flash package drops',
    enabled: true
  },
  {
    id: 'soc-2',
    platform: 'TikTok',
    handle: '@gfkholidays.malaysia',
    url: 'https://tiktok.com/@gfkholidays',
    followers: '245K Likes',
    highlightText: 'Viral KL hidden gems, Penang street food & Genting SkyWorlds POVs',
    enabled: true
  },
  {
    id: 'soc-3',
    platform: 'YouTube',
    handle: 'GFK Holidays Malaysia TV',
    url: 'https://youtube.com/@gfkholidays',
    followers: '64K Subscribers',
    highlightText: '4K cinematic Malaysia destination guides & luxury resort walkthroughs',
    enabled: true
  },
  {
    id: 'soc-4',
    platform: 'Facebook',
    handle: 'GFK Holidays Sdn Bhd Official',
    url: 'https://facebook.com/gfkholidays',
    followers: '92K Community',
    highlightText: 'Verified traveler reviews, family holiday bundles & live Q&A',
    enabled: true
  },
  {
    id: 'soc-5',
    platform: 'WhatsApp',
    handle: '+60 18 941 3812',
    url: 'https://wa.me/60189413812',
    followers: '24/7 Live Desk',
    highlightText: 'Instant Malaysia itinerary customization & express ticket issuance',
    enabled: true
  }
];

export const DEFAULT_HOTEL_PARTNER_LOGOS: PartnerLogoItem[] = [
  {
    id: 'hlogo-1',
    category: 'hotel',
    name: 'Mandarin Oriental KL',
    logoUrl: createBrandSvgDataUri('#1e1b4b', '#f59e0b', 'MO', 'MANDARIN ORIENTAL'),
    subtitle: 'Kuala Lumpur City Centre • 5-Star',
    badgeText: 'Direct Room Allotment',
    accentColor: '#f59e0b',
    verified: true
  },
  {
    id: 'hlogo-2',
    category: 'hotel',
    name: 'The Datai Langkawi',
    logoUrl: createBrandSvgDataUri('#064e3b', '#34d399', 'DL', 'THE DATAI LANGKAWI'),
    subtitle: 'Datai Bay, Langkawi • Luxury Resort',
    badgeText: 'Contracted Net Rates',
    accentColor: '#10b981',
    verified: true
  },
  {
    id: 'hlogo-3',
    category: 'hotel',
    name: 'Shangri-La Malaysia',
    logoUrl: createBrandSvgDataUri('#3b0764', '#fbbf24', 'SL', 'SHANGRI-LA HOTELS'),
    subtitle: 'KL, Penang & Sabah • 5-Star Sanctuary',
    badgeText: 'Preferred DMC Partner',
    accentColor: '#fbbf24',
    verified: true
  },
  {
    id: 'hlogo-4',
    category: 'hotel',
    name: 'Four Seasons Langkawi',
    logoUrl: createBrandSvgDataUri('#0f172a', '#38bdf8', 'FS', 'FOUR SEASONS'),
    subtitle: 'Tanjung Rhu, Langkawi • Beach Resort',
    badgeText: 'VIP Villa Contract',
    accentColor: '#38bdf8',
    verified: true
  },
  {
    id: 'hlogo-5',
    category: 'hotel',
    name: 'Grand Hyatt Kuala Lumpur',
    logoUrl: createBrandSvgDataUri('#450a0a', '#f87171', 'GH', 'GRAND HYATT KL'),
    subtitle: 'KLCC Twin Towers View • 5-Star',
    badgeText: 'Guaranteed Allocation',
    accentColor: '#f87171',
    verified: true
  },
  {
    id: 'hlogo-6',
    category: 'hotel',
    name: 'Sunway Resort & Hotels',
    logoUrl: createBrandSvgDataUri('#431407', '#fb923c', 'SR', 'SUNWAY RESORT'),
    subtitle: 'Bandar Sunway • Theme Park Integrated',
    badgeText: 'Official Key Wholesaler',
    accentColor: '#fb923c',
    verified: true
  },
  {
    id: 'hlogo-7',
    category: 'hotel',
    name: 'Resorts World Genting',
    logoUrl: createBrandSvgDataUri('#172554', '#60a5fa', 'RW', 'RESORTS WORLD'),
    subtitle: 'Genting Highlands • SkyWorlds Hub',
    badgeText: 'High-Volume Contract',
    accentColor: '#60a5fa',
    verified: true
  },
  {
    id: 'hlogo-8',
    category: 'hotel',
    name: 'Lexis Hibiscus Port Dickson',
    logoUrl: createBrandSvgDataUri('#042f2e', '#2dd4bf', 'LH', 'LEXIS HIBISCUS'),
    subtitle: 'Overwater Pool Villas • Malaysia',
    badgeText: 'Direct Charter Rates',
    accentColor: '#2dd4bf',
    verified: true
  }
];

export const DEFAULT_OTA_PARTNERS: OtaPartner[] = [
  {
    id: 'ota-1',
    name: 'GetYourGuide',
    logoUrl: createBrandSvgDataUri('#431407', '#FF5533', 'GYG', 'GETYOURGUIDE'),
    roleBadge: 'Official Malaysia Local Supplier',
    description: 'Direct contracted ground operator & verified activity supplier for Kuala Lumpur, Langkawi, Penang & Sabah tours.',
    rating: '4.9 / 5.0',
    reviewsCount: '14,200+ Verified Bookings',
    accentColor: '#FF5533',
    url: 'https://www.getyourguide.com',
    verified: true
  },
  {
    id: 'ota-2',
    name: 'Trip.com',
    logoUrl: createBrandSvgDataUri('#172554', '#2577E3', 'TRIP', 'TRIP.COM'),
    roleBadge: 'Premier Destination Partner',
    description: 'Preferred Malaysian DMC supplier for attraction e-tickets, airport transfers, and contracted hotel packages.',
    rating: '4.9 / 5.0',
    reviewsCount: '28,500+ Travelers Served',
    accentColor: '#2577E3',
    url: 'https://www.trip.com',
    verified: true
  },
  {
    id: 'ota-3',
    name: 'Viator',
    logoUrl: createBrandSvgDataUri('#064e3b', '#00AA6C', 'VTR', 'VIATOR'),
    roleBadge: 'Badge of Excellence Supplier',
    description: 'Top-rated local tour operator supplying private Malaysia shore excursions, heritage trails, and VIP charters.',
    rating: '4.9 / 5.0',
    reviewsCount: '11,800+ Global Reviews',
    accentColor: '#00AA6C',
    url: 'https://www.viator.com',
    verified: true
  },
  {
    id: 'ota-4',
    name: 'Klook',
    logoUrl: createBrandSvgDataUri('#451a03', '#FF5722', 'KLK', 'KLOOK'),
    roleBadge: 'Authorized Ticket & Fleet Aggregator',
    description: 'Instant API-connected attraction pass fulfillment and private MPV fleet operations across Peninsular & East Malaysia.',
    rating: '4.8 / 5.0',
    reviewsCount: '19,400+ Instant Vouchers',
    accentColor: '#FF5722',
    url: 'https://www.klook.com',
    verified: true
  },
  {
    id: 'ota-5',
    name: 'Agoda & Booking.com',
    logoUrl: createBrandSvgDataUri('#1e1b4b', '#818cf8', 'AGD', 'AGODA • BOOKING'),
    roleBadge: 'Registered Ground & Stay Supplier',
    description: 'Synchronized Malaysia accommodation and airport transfer supplier network with instant confirmation.',
    rating: '4.9 / 5.0',
    reviewsCount: '16,900+ Stay Packages',
    accentColor: '#818cf8',
    url: 'https://www.agoda.com',
    verified: true
  }
];

export const DEFAULT_FLIGHT_PARTNER_LOGOS: PartnerLogoItem[] = [
  {
    id: 'flogo-1',
    category: 'flight',
    name: 'Malaysia Airlines',
    logoUrl: createBrandSvgDataUri('#172554', '#38bdf8', 'MH', 'MALAYSIA AIRLINES'),
    subtitle: 'KLIA Flagship National Carrier • Domestic & Global',
    badgeText: 'Official Tour & Group Partner',
    accentColor: '#38bdf8',
    verified: true
  },
  {
    id: 'flogo-2',
    category: 'flight',
    name: 'AirAsia Aviation',
    logoUrl: createBrandSvgDataUri('#450a0a', '#ef4444', 'AK', 'AIRASIA MALAYSIA'),
    subtitle: 'KLIA2 • Langkawi, Penang, Sabah & ASEAN Routes',
    badgeText: 'Fly- & -Stay Bundle Partner',
    accentColor: '#ef4444',
    verified: true
  },
  {
    id: 'flogo-3',
    category: 'flight',
    name: 'Batik Air Malaysia',
    logoUrl: createBrandSvgDataUri('#3b0764', '#c084fc', 'OD', 'BATIK AIR'),
    subtitle: 'KLIA Terminal 1 & Subang • Full-Service Network',
    badgeText: 'Series Seat Allotment',
    accentColor: '#c084fc',
    verified: true
  },
  {
    id: 'flogo-4',
    category: 'flight',
    name: 'Singapore Airlines',
    logoUrl: createBrandSvgDataUri('#1e293b', '#f59e0b', 'SQ', 'SINGAPORE AIRLINES'),
    subtitle: 'Changi–Malaysia Twin-Centre & Feeder Routes',
    badgeText: 'Preferred Inbound Partner',
    accentColor: '#f59e0b',
    verified: true
  },
  {
    id: 'flogo-5',
    category: 'flight',
    name: 'Emirates Airline',
    logoUrl: createBrandSvgDataUri('#450a0a', '#fbbf24', 'EK', 'EMIRATES'),
    subtitle: 'Dubai–Kuala Lumpur Long-Haul Luxury Packages',
    badgeText: 'Global Aviation Partner',
    accentColor: '#fbbf24',
    verified: true
  },
  {
    id: 'flogo-6',
    category: 'flight',
    name: 'Qatar Airways',
    logoUrl: createBrandSvgDataUri('#4c0519', '#f43f5e', 'QR', 'QATAR AIRWAYS'),
    subtitle: 'Doha–KLIA & Penang Inbound Holiday Alliance',
    badgeText: 'Authorized Tour Ticketing',
    accentColor: '#f43f5e',
    verified: true
  },
  {
    id: 'flogo-7',
    category: 'flight',
    name: 'Firefly Airlines',
    logoUrl: createBrandSvgDataUri('#431407', '#fb923c', 'FY', 'FIREFLY AIRLINES'),
    subtitle: 'Subang SkyPark & Penang Island Hopping',
    badgeText: 'Domestic Charter Partner',
    accentColor: '#fb923c',
    verified: true
  }
];

export const DEFAULT_SEO_KEYWORDS =
  'Malaysia tour packages, book Malaysia activities, Kuala Lumpur attraction tickets, Langkawi luxury tour package, Petronas Twin Towers Skybridge tickets, Genting SkyWorlds tickets, Penang heritage tour, Sabah Borneo wildlife expedition, Semporna Mabul island hopping, Cameron Highlands tea tour, Sunway Lagoon tickets, KLIA private airport transfer, Malaysia DMC, GFK Holidays Malaysia, GetYourGuide Malaysia supplier, Viator Malaysia tours, Trip.com Malaysia partner';

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  id: 'global',
  logoUrl: '/gfk-custom-logo.webp',
  invoiceLogoUrl: '/gfk-custom-logo.webp',
  showBrandText: false,
  logoHeight: 60,
  logoFit: 'edge-to-edge',
  logoAlign: 'left',
  logoScale: 100,
  logoPadding: 0,
  logoRounded: 'none',
  heroVideoUrl: 'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4',
  featuredVideoEmbedUrl: 'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4',
  heroVideoSource: 'url',
  heroFallbackImage: 'https://images.unsplash.com/photo-1596422846543-75c6fc1f4767?auto=format&fit=crop&w=1600&q=80',
  heroBgColor: '#091e1a',
  heroOverlayOpacity: 60,
  heroBadgeText: 'Malaysia\'s #1 Direct Destination & Activity Specialist',
  heroTitleLine1: 'Experience Truly Asia:',
  heroTitleLine2: 'Malaysia\'s Finest Tours, Activities & Stays.',
  heroSubtitle: 'Book direct with Malaysia\'s premier licensed DMC and official local supplier for GetYourGuide, Viator & Trip.com. Instant e-tickets, luxury island packages, private transfers & contracted 3-to-5 star hotels at unbeatable direct prices.',
  heroPrimaryCta: 'Explore Malaysia Experiences',
  mediaPresentationStyle: 'sliding',
  mediaAnimationSpeed: 'normal',
  mediaSlideDirection: 'left',
  partnerAnimationStyle: 'grid',
  hotelContractsStyle: 'grid',
  hotelContractsTitle: 'Direct Malaysia Hotel Contracts & Resort Allotments',
  hotelContractsSubtitle: 'Pre-negotiated net & retail contract rates across Kuala Lumpur, Langkawi, Genting Highlands & Penang with guaranteed room allotments.',
  partnerReelStyle: 'live-video-sequence',
  partnerReelStageDuration: 7,
  partnerReelBgVideoUrl: 'https://cdn.pixabay.com/video/2020/05/11/38891-421731607_large.mp4',
  partnerReelAutoPlay: true,
  partnerReelShowHud: true,
  partnerReelTitle: 'Official Ecosystem: Contracted Hotels → Registered Supplier Platforms → Airline Partnerships',
  partnerReelSubtitle: 'Watch our live partnership broadcast reel: Direct Malaysia hotel contracts, followed by global OTA supplier platforms we are registered with, and our official flight & airline alliances.',
  hotelPartnerLogos: DEFAULT_HOTEL_PARTNER_LOGOS,
  flightPartnerLogos: DEFAULT_FLIGHT_PARTNER_LOGOS,
  customerMedia: DEFAULT_CUSTOMER_MEDIA,
  socialChannels: DEFAULT_SOCIAL_CHANNELS,
  otaPartners: DEFAULT_OTA_PARTNERS,
  seoTitle: 'GFK Holidays Malaysia | Book Best Malaysia Tour Packages, Activities & Hotels',
  seoDescription: 'Book Malaysia\'s top-rated tour packages, attraction tickets, Langkawi & Sabah island escapes, private transfers, and contracted hotels directly with GFK Holidays — Official Supplier on GetYourGuide, Trip.com & Viator.',
  seoKeywords: DEFAULT_SEO_KEYWORDS,
  invoiceMessage: 'Direct Bank Transfers: Payment proof must be emailed to accounts@gfkholidays.com within 2 hours of this invoice, otherwise no tickets, packages, or services will be issued under any circumstances.',
  bankAccountName: 'GFK HOLIDAYS SDN BHD',
  bankPartner: 'Maybank (Malayan Banking Berhad)',
  bankAccountNumber: '5141 2345 6789',
  invoiceTemplate: 'modern',
  customInvoiceHtml: '',
  partnerMarqueeEnabled: true,
  partnerMarqueeDirection: 'left',
  partnerMarqueeSpeed: 'normal',
  partnerMarqueeLogos: [
    { id: 'pm-1', category: 'ota', name: 'GetYourGuide', logoUrl: 'https://ui-avatars.com/api/?name=GetYourGuide&background=10b981&color=ffffff&size=120&bold=true', subtitle: 'Global OTA Supplier', badgeText: 'Verified', verified: true },
    { id: 'pm-2', category: 'ota', name: 'Trip.com', logoUrl: 'https://ui-avatars.com/api/?name=Trip.com&background=2563eb&color=ffffff&size=120&bold=true', subtitle: 'Global Travel Partner', badgeText: 'Verified', verified: true },
    { id: 'pm-3', category: 'ota', name: 'Viator', logoUrl: 'https://ui-avatars.com/api/?name=Viator&background=7c3aed&color=ffffff&size=120&bold=true', subtitle: 'TripAdvisor Experience', badgeText: 'Verified', verified: true },
    { id: 'pm-4', category: 'ota', name: 'Klook', logoUrl: 'https://ui-avatars.com/api/?name=Klook&background=f97316&color=ffffff&size=120&bold=true', subtitle: 'Asia Activities Partner', badgeText: 'Verified', verified: true },
    { id: 'pm-5', category: 'hotel', name: 'Shangri-La Hotels', logoUrl: 'https://ui-avatars.com/api/?name=Shangri-La&background=991b1b&color=ffffff&size=120&bold=true', subtitle: 'Luxury Hotel Allotment', badgeText: 'Contracted', verified: true },
    { id: 'pm-6', category: 'flight', name: 'Malaysia Airlines', logoUrl: 'https://ui-avatars.com/api/?name=Malaysia+Airlines&background=1e3a8a&color=ffffff&size=120&bold=true', subtitle: 'Official Aviation Partner', badgeText: 'Aviation', verified: true }
  ]
};

