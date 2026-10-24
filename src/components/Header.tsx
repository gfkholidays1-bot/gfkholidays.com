import { useState, useEffect } from 'react';
import { Menu, X, Briefcase, Users, LogOut, ChevronRight } from 'lucide-react';
import { Agent } from '../types';

interface HeaderProps {
  onRequestLogin?: (role: 'customer' | 'agent') => void;
  logoUrl?: string;
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
  onRequestLogin
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (path: string, params?: any) => {
    onNavigate(path, params);
    setMobileMenuOpen(false);
  };

  const [logoSettings, setLogoSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('gfk_active_logo');
      const validCached = cached && cached !== 'https://iili.io/ChVw1zF.png' && cached !== '/logo-transparent.svg' ? cached : null;
      return {
        url: validCached || logoUrl || '/logo-transparent.svg',
        height: Number(localStorage.getItem('gfk_logo_height') || 54),
        showBrandText: localStorage.getItem('gfk_show_brand_text') !== 'false'
      };
    }
    return { url: logoUrl || '/logo-transparent.svg', height: 54, showBrandText: true };
  });

  useEffect(() => {
    if (logoUrl && logoUrl !== 'https://iili.io/ChVw1zF.png' && logoUrl !== '/android-chrome-512x512.png') {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('gfk_active_logo') : null;
      // Do not overwrite custom uploaded logo with the default vector logo or placeholder
      if ((logoUrl === '/logo-transparent.svg' || logoUrl === '/android-chrome-512x512.png') && cached && cached !== '/logo-transparent.svg') {
        return;
      }
      setLogoSettings(prev => ({ ...prev, url: logoUrl }));
    }
  }, [logoUrl]);

  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      if (e.detail) {
        const rawNew = typeof e.detail === 'string' ? e.detail : e.detail?.logoUrl;
        if (rawNew === '/android-chrome-512x512.png' || rawNew === 'https://iili.io/ChVw1zF.png') {
          return; // Ignore fallback placeholder events
        }
        if (typeof e.detail === 'string') {
          setLogoSettings(prev => ({ ...prev, url: e.detail }));
        } else if (typeof e.detail === 'object') {
          setLogoSettings(prev => ({
            url: e.detail.logoUrl || prev.url,
            height: e.detail.height !== undefined ? Number(e.detail.height) : prev.height,
            showBrandText: e.detail.showBrandText !== undefined ? Boolean(e.detail.showBrandText) : prev.showBrandText
          }));
        }
      }
    };
    window.addEventListener('gfk-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('gfk-logo-updated', handleLogoUpdate);
  }, []);

  return (
    <header className="fixed w-full top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 md:gap-8 h-16 md:h-20">
          {/* Zone 1: Brand Wordmark & Official Logo (Edge-to-Edge display) */}
          <div
            onClick={() => handleNavClick('/')}
            className="flex items-center gap-3 cursor-pointer group shrink-0 select-none py-1"
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
              style={{
                height: `${logoSettings.height}px`,
                maxHeight: '72px'
              }}
              className="w-auto max-w-[240px] sm:max-w-[320px] object-contain shrink-0 transition-transform duration-200 group-hover:scale-102 bg-transparent"
            />
            {logoSettings.showBrandText && (
              <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-zinc-950 group-hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0">
                GFK Holidays
              </span>
            )}
          </div>

          {/* Zone 2: 5 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-zinc-600">
            <button
              onClick={() => handleNavClick('/search', { category: 'Packages' })}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Malaysia Packages
            </button>
            <button
              onClick={() => handleNavClick('/tickets')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Attraction Tickets
            </button>
            <button
              onClick={() => handleNavClick('/hotels')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Contracted Hotels
            </button>
            <button
              onClick={() => handleNavClick('/transport')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Private Transfers
            </button>
            <button
              onClick={() => handleNavClick('/ctfu-builder')}
              className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Trip Builder
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
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

          {/* Mobile Right Action & Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {userRole === 'guest' ? (
              <button
                type="button"
                onClick={() => (onRequestLogin ? onRequestLogin('customer') : onLoginAs('customer'))}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
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
              className="text-zinc-900 p-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel (Notice: NO Admin Panel link — Admin is strictly /admin via URL) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-zinc-200 absolute w-full shadow-xl">
          <div className="p-4 space-y-1.5">
            <button
              onClick={() => handleNavClick('/')}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Home — Explore Malaysia
            </button>
            <button
              onClick={() => handleNavClick('/search', { category: 'Packages' })}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Malaysia Tour Packages
            </button>
            <button
              onClick={() => handleNavClick('/tickets')}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Attraction Tickets & Passes
            </button>
            <button
              onClick={() => handleNavClick('/hotels')}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Contracted Hotels Directory
            </button>
            <button
              onClick={() => handleNavClick('/transport')}
              className="block w-full text-left font-bold text-sm p-3 rounded-xl hover:bg-zinc-50 text-zinc-900"
            >
              Private Transfers & Fleet
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
