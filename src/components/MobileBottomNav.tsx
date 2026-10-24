import React, { useState } from 'react';
import { Home, Compass, Ticket, Building2, UtensilsCrossed, Car, Waves, Menu, X, Search, ChevronRight } from 'lucide-react';
import { Agent } from '../types';

interface MobileBottomNavProps {
  currentPath: string;
  userRole: 'guest' | 'customer' | 'agent' | 'admin';
  currentAgent: Agent | null;
  onNavigate: (path: string, params?: any) => void;
  onRequestLogin?: (role: 'customer' | 'agent') => void;
}

export default function MobileBottomNav({
  currentPath,
  userRole: _userRole,
  currentAgent: _currentAgent,
  onNavigate,
  onRequestLogin: _onRequestLogin
}: MobileBottomNavProps) {
  const [otherMenuOpen, setOtherMenuOpen] = useState(false);

  // Hide on admin portal view
  if (currentPath === '/admin') return null;

  const isHome = currentPath === '/';
  const isPackages = currentPath === '/search' || currentPath === '/ctfu-builder';
  const isTickets = currentPath === '/tickets';
  const isHotels = currentPath === '/hotels';
  const isOther = currentPath === '/transport' || otherMenuOpen;

  const handleSelectService = (path: string, params?: any) => {
    onNavigate(path, params);
    setOtherMenuOpen(false);
  };

  return (
    <>
      {/* Other Services Popup Modal / Bottom Sheet */}
      {otherMenuOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex flex-col justify-end animate-fade-in md:hidden"
          onClick={() => setOtherMenuOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl p-5 text-zinc-900 shadow-2xl border-t border-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-extrabold text-zinc-950">Other Services &amp; Exploration</h3>
                <p className="text-xs text-zinc-500">Search and book dining, transport, and cruises together</p>
              </div>
              <button
                type="button"
                onClick={() => setOtherMenuOpen(false)}
                className="p-2 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 pb-6">
              <button
                type="button"
                onClick={() => handleSelectService('/restaurants')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
                    🍽️
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-zinc-900 group-hover:text-emerald-800">Restaurants &amp; Dining</h4>
                    <p className="text-[11px] text-zinc-500">Michelin trails, high-tea &amp; local delights</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-700" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectService('/transport')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                    🚗
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-zinc-900 group-hover:text-emerald-800">Transport Services</h4>
                    <p className="text-[11px] text-zinc-500">KLIA cabs, VIP MPVs &amp; private chauffeurs</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-700" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectService('/cruises')}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-lg">
                    ⛵
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-zinc-900 group-hover:text-emerald-800">Cruises &amp; Yacht Charters</h4>
                    <p className="text-[11px] text-zinc-500">Langkawi island sunset catamaran &amp; marina yachts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Mobile Bottom Navigation"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Tab 1: Home */}
          <button
            type="button"
            onClick={() => { setOtherMenuOpen(false); onNavigate('/'); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isHome && !otherMenuOpen ? 'text-emerald-700 font-extrabold' : 'text-zinc-500 hover:text-zinc-900 font-medium'
            }`}
          >
            <div className="relative">
              <Home className={`w-5 h-5 ${isHome && !otherMenuOpen ? 'stroke-[2.6]' : 'stroke-[1.8]'}`} />
              {isHome && !otherMenuOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-700 rounded-full" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1">Home</span>
          </button>

          {/* Tab 2: Holidays */}
          <button
            type="button"
            onClick={() => { setOtherMenuOpen(false); onNavigate('/search', { category: 'Packages' }); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isPackages && !otherMenuOpen ? 'text-emerald-700 font-extrabold' : 'text-zinc-500 hover:text-zinc-900 font-medium'
            }`}
          >
            <div className="relative">
              <Compass className={`w-5 h-5 ${isPackages && !otherMenuOpen ? 'stroke-[2.6]' : 'stroke-[1.8]'}`} />
              {isPackages && !otherMenuOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-700 rounded-full" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1">Holidays</span>
          </button>

          {/* Tab 3: Tickets */}
          <button
            type="button"
            onClick={() => { setOtherMenuOpen(false); onNavigate('/tickets'); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isTickets && !otherMenuOpen ? 'text-emerald-700 font-extrabold' : 'text-zinc-500 hover:text-zinc-900 font-medium'
            }`}
          >
            <div className="relative">
              <Ticket className={`w-5 h-5 ${isTickets && !otherMenuOpen ? 'stroke-[2.6]' : 'stroke-[1.8]'}`} />
              {isTickets && !otherMenuOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-700 rounded-full" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1">Tickets</span>
          </button>

          {/* Tab 4: Hotels */}
          <button
            type="button"
            onClick={() => { setOtherMenuOpen(false); onNavigate('/hotels'); }}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isHotels && !otherMenuOpen ? 'text-emerald-700 font-extrabold' : 'text-zinc-500 hover:text-zinc-900 font-medium'
            }`}
          >
            <div className="relative">
              <Building2 className={`w-5 h-5 ${isHotels && !otherMenuOpen ? 'stroke-[2.6]' : 'stroke-[1.8]'}`} />
              {isHotels && !otherMenuOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-700 rounded-full" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1">Hotels</span>
          </button>

          {/* Tab 5: Other (Restaurants, Transport, Cruises) instead of Sign In */}
          <button
            type="button"
            onClick={() => setOtherMenuOpen(!otherMenuOpen)}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              isOther ? 'text-emerald-700 font-extrabold' : 'text-zinc-500 hover:text-zinc-900 font-medium'
            }`}
          >
            <div className="relative">
              <UtensilsCrossed className={`w-5 h-5 ${isOther ? 'stroke-[2.6]' : 'stroke-[1.8]'}`} />
              {isOther && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-700 rounded-full" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1">Other</span>
          </button>
        </div>
      </nav>
    </>
  );
}
