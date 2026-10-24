import React, { useState, useEffect } from 'react';
import { MapPin, Mail, Phone, ExternalLink } from 'lucide-react';
import { SocialMediaChannel } from '../types';

interface FooterProps {
  onNavigate: (path: string, params?: any) => void;
  onLoginAs: (role: 'guest' | 'customer' | 'agent' | 'admin') => void;
  onRequestLogin?: (role: 'customer' | 'agent') => void;
  logoUrl?: string;
  socialChannels?: SocialMediaChannel[];
}

export default function Footer({
  onNavigate,
  onLoginAs,
  onRequestLogin,
  logoUrl,
  socialChannels = []
}: FooterProps) {
  const [liveLogo, setLiveLogo] = useState<string>(() => {
    return logoUrl && logoUrl !== 'https://iili.io/ChVw1zF.png'
      ? logoUrl
      : '/logo-transparent.svg';
  });

  useEffect(() => {
    if (logoUrl && logoUrl !== 'https://iili.io/ChVw1zF.png') {
      setLiveLogo(logoUrl);
    }
  }, [logoUrl]);

  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      const newUrl = typeof e.detail === 'string' ? e.detail : e.detail?.logoUrl;
      if (newUrl && newUrl !== 'https://iili.io/ChVw1zF.png') {
        setLiveLogo(newUrl);
      }
    };
    window.addEventListener('gfk-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('gfk-logo-updated', handleLogoUpdate);
  }, []);

  const resolvedLogo = liveLogo;

  const activeSocials = socialChannels.filter((s) => s.enabled !== false);

  return (
    <footer className="bg-zinc-950 text-white pt-10 pb-6 border-t border-zinc-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b border-zinc-800/80">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={resolvedLogo}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.endsWith('/android-chrome-512x512.png')) {
                    target.src = '/android-chrome-512x512.png';
                  }
                }}
                alt="GFK Holidays Logo"
                referrerPolicy="no-referrer"
                className="h-12 w-auto max-h-14 object-contain shrink-0"
              />
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white block leading-none">
                  GFK Holidays
                </span>
                <span className="text-xs text-emerald-400 font-medium mt-1 block">
                  Licensed Malaysia DMC &amp; OTA Supplier
                </span>
              </div>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Malaysia's premier Destination Management Company. Direct supplier for GetYourGuide, Trip.com &amp; Viator with contracted 3-to-5 star hotels, attraction passes, and private tours across Peninsular &amp; East Malaysia.
            </p>
            {activeSocials.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {activeSocials.map((soc) => (
                  <a
                    key={soc.id}
                    href={soc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-zinc-300 hover:text-emerald-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                  >
                    <span>{soc.platform}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Malaysia Destinations & Services */}
          <div>
            <h4 className="text-base font-bold mb-5 tracking-tight text-zinc-100">
              Malaysia Experiences
            </h4>
            <ul className="space-y-2.5 text-zinc-400 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('/search', { category: 'Packages' })}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  Malaysia Holiday Packages
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/tickets')}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  Skip-The-Line Attraction Tickets
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/hotels')}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  Direct Contracted Hotels &amp; Resorts
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/transport')}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  KLIA &amp; Intercity Chauffeur Transfers
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/ctfu-builder')}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  Custom Malaysia Trip Architect
                </button>
              </li>
            </ul>
          </div>

          {/* Other Services: Restaurants, Transport Services & Cruises */}
          <div>
            <h4 className="text-base font-bold mb-4 tracking-tight text-zinc-100">
              Other Services &amp; Exploration
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Search and book dining, transport, and cruises together.
            </p>
            <ul className="space-y-2.5 text-zinc-400 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/search', { query: 'Dining' })}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                >
                  <span>🍽️</span> Restaurants &amp; Dining
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/transport')}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                >
                  <span>🚗</span> Transport Services
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/search', { query: 'Cruise' })}
                  className="hover:text-emerald-400 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                >
                  <span>⛵</span> Cruises &amp; Yacht Charters
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-base font-bold mb-5 tracking-tight text-zinc-100">
              Kuala Lumpur Headquarters
            </h4>
            <ul className="space-y-3.5 text-zinc-400 text-sm">
              <li className="flex items-start">
                <MapPin className="w-4 h-4 mr-2.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  299a First Floor, Jalan Pudu, Pudu, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia
                </span>
              </li>
              <li className="flex items-start">
                <Mail className="w-4 h-4 mr-2.5 text-emerald-400 flex-shrink-0 mt-1" />
                <div className="flex flex-col space-y-1">
                  <span>booking@gfkholidays.com</span>
                  <span>info@gfkholidays.com</span>
                  <span>accounts@gfkholidays.com</span>
                </div>
              </li>
              <li className="flex items-start">
                <Phone className="w-4 h-4 mr-2.5 text-emerald-400 flex-shrink-0 mt-1" />
                <div className="flex flex-col space-y-1 tabular-nums">
                  <span>+60 18 941 3812 (Malaysia HQ)</span>
                  <span>+91 7888971303 (International Desk)</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-zinc-500 text-xs font-medium gap-4">
          <div>
            © {new Date().getFullYear()} GFK Holidays Sdn Bhd (Co. No. 1290384-H). Licensed Malaysian Inbound &amp; Outbound Tour Operator.
          </div>
          <div className="text-zinc-400">
            Kuala Lumpur · Langkawi · Penang · Sabah · Genting Highlands · Semporna
          </div>
        </div>
      </div>
    </footer>
  );
}
