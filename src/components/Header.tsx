import { useState, useEffect, type CSSProperties } from 'react';
import { Menu, X, Briefcase, Users, LogOut, ChevronRight, Globe } from 'lucide-react';
import { Agent } from '../types';
import { useCurrencyRate, SUPPORTED_CURRENCIES } from '../lib/currency';
import { HOME_SECTIONS } from '../lib/homeSections';

interface HeaderProps {
  onRequestLogin?: (role: 'customer' | 'agent') => void;
  logoUrl?: string;
  showBrandText?: boolean;
  logoHeight?: number;
  logoAlign?: 'left' | 'center';
  userRole: 'guest' | 'customer' | 'agent' | 'admin';
  currentUser: Agent | null;
  onNavigate: (path: string, params?: any) => void;
  onLoginAs: (role: 'guest' | 'customer' | 'agent' | 'admin') => void;
}

export default function Header({
  userRole,
  currentUser,
  onNavigate,
  onLoginAs,
  logoUrl,
  showBrandText = true,
  logoHeight = 54,
  logoAlign = 'left',
  onRequestLogin
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currency, geoInfo } = useCurrencyRate();
  const activeCurrencyMeta = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.INR;

  const handleNavClick = (path: string, params?: any) => {
    onNavigate(path, params);
    setMobileMenuOpen(false);
  };

  const [logoSettings, setLogoSettings] = useState(() => ({
    url: logoUrl || '/logo-transparent.svg',
    height: logoHeight || 54,
    align: logoAlign || 'left',
    showBrandText: showBrandText !== undefined ? showBrandText : true
  }));

  useEffect(() => {
    if (logoUrl) {
      setLogoSettings(prev => ({ ...prev, url: logoUrl }));
    }
  }, [logoUrl]);

  useEffect(() => {
    if (showBrandText !== undefined) {
      setLogoSettings(prev => ({ ...prev, showBrandText: Boolean(showBrandText) }));
    }
  }, [showBrandText]);

  useEffect(() => {
    if (logoHeight !== undefined) {
      setLogoSettings(prev => ({ ...prev, height: Number(logoHeight) || 54 }));
    }
  }, [logoHeight]);

  useEffect(() => {
    if (logoAlign) {
      setLogoSettings(prev => ({ ...prev, align: logoAlign }));
    }
  }, [logoAlign]);

  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      if (e.detail) {
        const rawNew = typeof e.detail === 'string' ? e.detail : e.detail?.logoUrl;
        if (rawNew === '/android-chrome-512x512.png' || rawNew === 'https://iili.io/ChVw1zF.png') {
          return;
        }
        if (typeof e.detail === 'string') {
          setLogoSettings(prev => ({ ...prev, url: e.detail }));
        } else if (typeof e.detail === 'object') {
          setLogoSettings(prev => ({
            url: e.detail.logoUrl || prev.url,
            height:
              e.detail.logoHeight !== undefined
                ? Number(e.detail.logoHeight)
                : e.detail.height !== undefined
                ? Number(e.detail.height)
                : prev.height,
            align: e.detail.logoAlign || e.detail.alignment || prev.align,
            showBrandText:
              e.detail.showBrandText !== undefined
                ? Boolean(e.detail.showBrandText)
                : prev.showBrandText
          }));
        }
      }
    };
    window.addEventListener('gfk-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('gfk-logo-updated', handleLogoUpdate);
  }, []);

  return (
    <header className="fixed w-full max-w-[100vw] overflow-x-clip top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-100 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-3 lg:gap-5 h-[68px] lg:h-20">
          {/* Zone 1: Brand Wordmark & Official Logo (Larger on Mobile, Protected on Laptop/Desktop) */}
          <div
            onClick={() => handleNavClick('/')}
            className="flex items-center gap-2 sm:gap-2.5 lg:gap-3 cursor-pointer group min-w-0 flex-1 lg:flex-initial lg:shrink-0 select-none py-1"
          >
            <img
              src={logoSettings.url}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/logo-transparent.svg') && !target.src.startsWith('data:')) {
                  target.src = '/logo-transparent.svg';
                }
              }}
              alt="GFK Holidays Logo"
              referrerPolicy="no-referrer"
              style={
                {
                  '--gfk-logo-h': `${Math.min(Math.max(Number(logoSettings.height) || 54, 44), 62)}px`
                } as CSSProperties
              }
              className={`w-auto h-12 sm:h-[52px] lg:h-[var(--gfk-logo-h)] max-h-12 sm:max-h-[54px] lg:max-h-[62px] object-contain shrink-0 transition-transform duration-200 group-hover:scale-102 bg-transparent ${
                logoSettings.showBrandText
                  ? 'max-w-[130px] sm:max-w-[180px] lg:max-w-[170px] xl:max-w-[210px]'
                  : 'max-w-[185px] sm:max-w-[240px] lg:max-w-[220px] xl:max-w-[260px]'
              }`}
            />
            {logoSettings.showBrandText && (
              <span className="text-[17px] sm:text-xl lg:text-[21px] xl:text-2xl font-black tracking-tight text-zinc-950 group-hover:text-emerald-700 transition-colors truncate whitespace-nowrap min-w-0">
                GFK Holidays
              </span>
            )}
          </div>

          {/* Zone 2: Concise Single-Line Navigation Links (Smooth-Scrolls to Home Sections) */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-7 text-[13px] xl:text-sm font-semibold text-zinc-600 shrink-0">
            <a
              href={`/#${HOME_SECTIONS.packages}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(`/#${HOME_SECTIONS.packages}`);
              }}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Malaysia Packages
            </a>
            <a
              href={`/#${HOME_SECTIONS.tickets}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(`/#${HOME_SECTIONS.tickets}`);
              }}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Attraction Tickets
            </a>
            <a
              href={`/#${HOME_SECTIONS.hotels}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(`/#${HOME_SECTIONS.hotels}`);
              }}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Contracted Hotels
            </a>
            <button
              type="button"
              onClick={() => handleNavClick('/transport')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Private Transfers
            </button>
            <a
              href={`/#${HOME_SECTIONS.flights}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(`/#${HOME_SECTIONS.flights}`);
              }}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Available Flights
            </a>
            <button
              type="button"
              onClick={() => handleNavClick('/ctfu-builder')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Trip Builder
            </button>
          </nav>

          {/* Zone 3: Auto-Detected Regional Currency Indicator + Primary Action */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <div
              className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold text-zinc-800 whitespace-nowrap"
              title={`Prices automatically localized for ${geoInfo.countryName || geoInfo.countryCode}`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{geoInfo.countryCode || 'IN'}</span>
              <span className="text-zinc-300">·</span>
              <span>{activeCurrencyMeta.symbol.trim()} {currency}</span>
            </div>

            {userRole === 'guest' && (
              <button
                onClick={() => (onRequestLogin ? onRequestLogin('customer') : onLoginAs('customer'))}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In / B2B Portal
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            )}

            {userRole === 'customer' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 px-3 py-1.5 flex items-center whitespace-nowrap">
                  <Users className="w-3.5 h-3.5 mr-1.5" /> Traveler Account
                </span>
                <button
                  onClick={() => onLoginAs('guest')}
                  className="text-zinc-500 hover:text-rose-600 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {userRole === 'agent' && currentUser && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('/agent')}
                  className="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors flex items-center px-4 py-2 rounded-xl whitespace-nowrap cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                  {currentUser.company} Hub
                </button>
                <button
                  onClick={() => onLoginAs('guest')}
                  className="text-zinc-500 hover:text-rose-600 p-2 rounded-lg transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile & Compact Tablet Right Regional Currency + Action & Menu Button */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:hidden shrink-0">
            <span
              className="px-1.5 sm:px-2 py-1 rounded-lg sm:rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 text-[10px] sm:text-[11px] font-extrabold whitespace-nowrap inline-flex items-center gap-1"
              title={`Region: ${geoInfo.countryName || geoInfo.countryCode}`}
            >
              <span>{geoInfo.countryCode || 'IN'}</span>
              <span className="text-zinc-300">·</span>
              <span>{activeCurrencyMeta.symbol.trim()} {currency}</span>
            </span>
            {userRole === 'guest' ? (
              <button
                type="button"
                onClick={() => (onRequestLogin ? onRequestLogin('customer') : onLoginAs('customer'))}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Login</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg">
                {userRole === 'agent' ? 'B2B' : 'User'}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-zinc-900 p-1.5 sm:p-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Menu Panel (Notice: NO Admin Panel link — Admin is strictly /admin via URL) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-zinc-200 absolute w-full shadow-xl max-h-[calc(100svh-72px)] overflow-y-auto">
          <div className="p-4 space-y-1.5">
            <button
              onClick={() => handleNavClick('/')}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Home — Explore Malaysia
            </button>
            <a
              href={`/#${HOME_SECTIONS.packages}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(`/#${HOME_SECTIONS.packages}`);
              }}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Malaysia Tour Packages
            </a>
            <a
              href={`/#${HOME_SECTIONS.tickets}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(`/#${HOME_SECTIONS.tickets}`);
              }}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Attraction Tickets &amp; Passes
            </a>
            <a
              href={`/#${HOME_SECTIONS.hotels}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(`/#${HOME_SECTIONS.hotels}`);
              }}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Contracted Hotels Directory
            </a>
            <button
              type="button"
              onClick={() => handleNavClick('/transport')}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Private Transfers &amp; Fleet
            </button>
            <a
              href={`/#${HOME_SECTIONS.flights}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(`/#${HOME_SECTIONS.flights}`);
              }}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Available Flights &amp; Status
            </a>
            <button
              onClick={() => handleNavClick('/marketplaces')}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-emerald-800"
            >
              Marketplace Booking (Viator · TripAdvisor · GYG)
            </button>
            <button
              onClick={() => handleNavClick('/ctfu-builder')}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Custom Trip Builder
            </button>

            <div className="h-px bg-zinc-100 my-2"></div>

            {userRole === 'guest' ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    if (onRequestLogin) onRequestLogin('customer');
                    else onLoginAs('customer');
                    setMobileMenuOpen(false);
                  }}
                  className="font-bold text-xs p-3 rounded-xl bg-emerald-700 text-white text-center"
                >
                  Traveler Sign In
                </button>
                <button
                  onClick={() => {
                    if (onRequestLogin) onRequestLogin('agent');
                    else onLoginAs('agent');
                    setMobileMenuOpen(false);
                  }}
                  className="font-bold text-xs p-3 rounded-xl text-zinc-900 bg-zinc-100 text-center"
                >
                  Agent B2B Login
                </button>
              </div>
            ) : (
              <div className="pt-2 space-y-2">
                {userRole === 'agent' && (
                  <button
                    onClick={() => handleNavClick('/agent')}
                    className="block w-full font-bold text-xs p-3 rounded-xl text-white bg-emerald-700 text-center"
                  >
                    Open Agent B2B Hub
                  </button>
                )}
                <button
                  onClick={() => {
                    onLoginAs('guest');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full font-bold text-xs p-3 rounded-xl text-zinc-600 bg-zinc-100 text-center"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
