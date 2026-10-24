import { useState, useEffect, FormEvent } from 'react';
import { Agent, Booking, Package, TransportRoute, Hotel, Ticket, Allotment, Review, GlobalSettings } from './types';
import { useFirestoreCollection } from './hooks/useFirestore';
import {
  INITIAL_PACKAGES,
  INITIAL_TRANSPORT,
  INITIAL_HOTELS,
  INITIAL_TICKETS,
  INITIAL_AGENTS,
  INITIAL_BOOKINGS,
  INITIAL_ALLOTMENTS,
  DEFAULT_GLOBAL_SETTINGS,
  IMAGE_MAP
} from './data';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import MalaysiaHome from './components/MalaysiaHome';
import CatalogBrowser from './components/CatalogBrowser';
import ProductDetail from './components/ProductDetail';
import { CheckoutForm, BookingSuccess } from './components/CheckoutAndSuccess';
import AgentPortal from './components/AgentPortal';
import AdminPortal from './components/AdminPortal';
import CtfuBuilder from './components/CtfuBuilder';
import MobileBottomNav from './components/MobileBottomNav';
import { Sparkles } from 'lucide-react';

export default function App() {
  // 1. Core Persistent State Engines using Firestore
  const [packages, setPackages] = useFirestoreCollection<Package>('packages', INITIAL_PACKAGES);
  const [transport, setTransport] = useFirestoreCollection<TransportRoute>('transport', INITIAL_TRANSPORT);
  const [hotels, setHotels] = useFirestoreCollection<Hotel>('hotels', INITIAL_HOTELS);
  const [tickets, setTickets] = useFirestoreCollection<Ticket>('tickets', INITIAL_TICKETS);
  const [agents, setAgents] = useFirestoreCollection<Agent>('agents', INITIAL_AGENTS);
  const [bookings, setBookings] = useFirestoreCollection<Booking>('bookings', INITIAL_BOOKINGS);
  const [allotments, setAllotments] = useFirestoreCollection<Allotment>('allotments', INITIAL_ALLOTMENTS);
  const [reviews, setReviews] = useFirestoreCollection<Review>('reviews', []);
  const [settings, setSettings] = useFirestoreCollection<GlobalSettings>('settings', [DEFAULT_GLOBAL_SETTINGS]);

  const rawGlobalSettings = settings.find(s => s.id === 'global');

  // Reactive active logo state that immediately syncs with localStorage & CustomEvents
  const [activeLogo, setActiveLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('gfk_active_logo');
      if (cached && cached !== 'https://iili.io/ChVw1zF.png' && cached !== '/android-chrome-512x512.png') return cached;
    }
    return rawGlobalSettings?.logoUrl && rawGlobalSettings.logoUrl !== 'https://iili.io/ChVw1zF.png' && rawGlobalSettings.logoUrl !== '/android-chrome-512x512.png'
      ? rawGlobalSettings.logoUrl
      : DEFAULT_GLOBAL_SETTINGS.logoUrl;
  });

  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      const newUrl = typeof e.detail === 'string' ? e.detail : e.detail?.logoUrl;
      if (newUrl && newUrl !== 'https://iili.io/ChVw1zF.png' && newUrl !== '/android-chrome-512x512.png') {
        setActiveLogo(newUrl);
        try {
          localStorage.setItem('gfk_active_logo', newUrl);
        } catch (_e) {}
      }
    };
    window.addEventListener('gfk-logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('gfk-logo-updated', handleLogoUpdate);
  }, []);

  useEffect(() => {
    if (!rawGlobalSettings?.logoUrl || rawGlobalSettings.logoUrl === 'https://iili.io/ChVw1zF.png' || rawGlobalSettings.logoUrl === '/android-chrome-512x512.png') return;
    const url = rawGlobalSettings.logoUrl;

    if (url.startsWith('data:') || (url.startsWith('http') && url !== 'https://iili.io/ChVw1zF.png')) {
      setActiveLogo(url);
      try {
        localStorage.setItem('gfk_active_logo', url);
      } catch (_e) {}
    } else {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('gfk_active_logo') : null;
      if (cached && cached !== '/logo-transparent.svg' && cached !== 'https://iili.io/ChVw1zF.png' && cached !== '/android-chrome-512x512.png') {
        setActiveLogo(cached);
      } else {
        setActiveLogo(url);
      }
    }
  }, [rawGlobalSettings?.logoUrl]);

  const globalSettings: GlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    ...(rawGlobalSettings || {}),
    logoUrl: activeLogo
  };

  // 2. Navigation State Engine
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/'))) {
      return '/admin';
    }
    return '/';
  });
  const [routeParams, setRouteParams] = useState<any>({});

  // 3. Authentication & Sessions State Engine
  const [userRole, setUserRole] = useState<'guest' | 'customer' | 'agent' | 'admin'>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/'))) {
      return 'admin';
    }
    return 'guest';
  });
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);

  // 4. Custom Inline Toast Alert
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [authModalRole, setAuthModalRole] = useState<'customer' | 'agent' | null>(null);

  // Sync dynamic SEO & Favicon from Admin Portal settings
  useEffect(() => {
    if (globalSettings.seoTitle) {
      document.title = globalSettings.seoTitle;
    }
    if (globalSettings.seoDescription) {
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute('content', globalSettings.seoDescription);
    }
    if (globalSettings.seoKeywords) {
      const kwMeta = document.querySelector('meta[name="keywords"]');
      if (kwMeta) kwMeta.setAttribute('content', globalSettings.seoKeywords);
    }
  }, [globalSettings.seoTitle, globalSettings.seoDescription, globalSettings.seoKeywords]);

  // Browser URL /admin detection (Admin portal is only accessible via browser URL /admin)
  useEffect(() => {
    const checkBrowserAdminUrl = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      if (
        pathname === '/admin' ||
        pathname.startsWith('/admin/') ||
        hash === '#admin' ||
        hash === '#admin-panel' ||
        searchParams.get('admin') === 'true'
      ) {
        setUserRole('admin');
        setCurrentPath('/admin');
      }
    };

    checkBrowserAdminUrl();
    window.addEventListener('hashchange', checkBrowserAdminUrl);
    window.addEventListener('popstate', checkBrowserAdminUrl);
    return () => {
      window.removeEventListener('hashchange', checkBrowserAdminUrl);
      window.removeEventListener('popstate', checkBrowserAdminUrl);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleNavigate = (path: string, params: any = {}) => {
    setCurrentPath(path);
    setRouteParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoleLogin = (role: 'guest' | 'customer' | 'agent' | 'admin') => {
    setUserRole(role);
    if (role === 'guest' || role === 'customer') {
      setCurrentAgent(null);
    }
  };

  const handleAuthLogin = async (email: string, role: 'customer' | 'agent', isGoogle: boolean) => {
    if (isGoogle) {
      try {
        const { signInWithGoogle } = await import('./lib/firebase');
        const { user } = await signInWithGoogle();

        if (role === 'agent') {
          let agentUser = agents.find(a => a.email === user.email);
          if (!agentUser) {
            agentUser = agents.length > 0 ? agents[0] : undefined;
          }
          if (agentUser) {
            setCurrentAgent(agentUser);
            setUserRole('agent');
            handleNavigate('/agent');
            showToast('Agent Google Sign In successful.');
          } else {
            showToast('No agent profile found for this Google account.');
            return;
          }
        } else {
          setUserRole('customer');
          showToast('Client Google Sign In successful.');
        }
      } catch (err: any) {
        showToast('Google Sign In failed.');
        return;
      }
    } else {
      if (role === 'agent') {
        if (email === 'B2B_APPLICATION') {
          showToast('Your partner application has been submitted to info@gfqld.com.');
          setAuthModalRole(null);
          return;
        }
        const agentUser = agents.find(a => a.email === email);
        if (agentUser) {
          setCurrentAgent(agentUser);
          setUserRole('agent');
          handleNavigate('/agent');
          showToast('Agent logged in successfully.');
        } else {
          showToast('Agent account not found. Document verification pending.');
          return;
        }
      } else {
        setUserRole('customer');
        showToast('Client Sign In successful.');
      }
    }
    setAuthModalRole(null);
  };

  const getNormalizedItem = (id: string, category?: string) => {
    if (category) {
      switch (category) {
        case 'packages': return packages.find(p => p.id === id);
        case 'transport': return transport.find(t => t.id === id);
        case 'hotels': return hotels.find(h => h.id === id);
        case 'tickets': return tickets.find(t => t.id === id);
        default: return null;
      }
    }
    return (
      packages.find(p => p.id === id) ||
      transport.find(t => t.id === id) ||
      hotels.find(h => h.id === id) ||
      tickets.find(t => t.id === id)
    );
  };

  const handleConfirmCheckout = async (clientName: string, email: string, phone: string, paymentMethod: string) => {
    const productItem = routeParams.product;
    if (!productItem) return;

    const voucherCode = 'GFK' + Math.floor(100000 + Math.random() * 900000);
    const checkoutTotal = routeParams.total;
    const customMessage =
      globalSettings?.invoiceMessage ||
      `Direct Bank Transfers: Payment proof must be emailed to ${globalSettings?.accountsEmail || 'accounts@gfkholidays.com'} within 2 hours of this invoice, otherwise no tickets, packages, or services will be issued under any circumstances.`;

    const newBooking: Booking = {
      id: voucherCode,
      agentId: currentAgent ? currentAgent.id : null,
      pkgId: productItem.id,
      client: clientName || 'Traveler',
      date: routeParams.date || new Date().toISOString().split('T')[0],
      timeSlot: routeParams.timeSlot,
      total: checkoutTotal,
      commission: routeParams.commission || 0,
      status: 'REQUEST_RECEIVED',
      paymentMethod: paymentMethod as any,
      paymentStatus: paymentMethod === 'credit' ? 'CREDIT_CHARGED' : 'PENDING_BANK_TRANSFER',
      createdAt: new Date().toISOString().split('T')[0],
      phone: phone,
      email: email
    };

    setBookings([...bookings, newBooking]);

    if (currentAgent && paymentMethod === 'credit') {
      const updatedAgents = agents.map(a => {
        if (a.id === currentAgent.id) {
          return { ...a, wallet: { ...a.wallet, credit: a.wallet.credit - checkoutTotal } };
        }
        return a;
      });
      setAgents(updatedAgents);
      setCurrentAgent(updatedAgents.find(a => a.id === currentAgent.id) || null);
    }

    const activeLogoSrc =
      globalSettings?.logoUrl?.startsWith('http') || globalSettings?.logoUrl?.startsWith('data:')
        ? globalSettings.logoUrl
        : `${window.location.origin}${globalSettings?.logoUrl || '/android-chrome-512x512.png'}`;

    const requestReceivedHtml = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 40px auto; color: #3f3f46; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); background: #ffffff;">
  <div style="padding: 30px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${activeLogoSrc}" alt="GFK Logo" style="height: 44px; width: 44px; object-fit: contain;" />
        <div>
          <h1 style="font-size: 24px; font-weight: 800; color: #18181b; margin: 0; letter-spacing: -0.5px;">GFK <span style="color: #059669; font-weight: 400;">Holidays</span></h1>
          <p style="font-size: 10px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; margin: 5px 0 0 0; letter-spacing: 0.5px;">Booking Request Received</p>
        </div>
      </div>
    </div>
    
    <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 0 0 30px 0;" />

    <p style="font-size: 14px; font-weight: 700; color: #18181b; margin: 0 0 10px 0;">Dear ${clientName.toUpperCase()},</p>
    <p style="font-size: 13px; line-height: 1.6; margin: 0 0 25px 0; color: #52525b;">We have received your booking request for <strong>${productItem?.title || productItem?.name || 'Service'}</strong>.</p>
    <p style="font-size: 13px; line-height: 1.6; margin: 0 0 25px 0; color: #52525b;">We are currently reviewing your request with the operator to ensure availability. Once confirmed, we will send you the official invoice and payment instructions.</p>
    
    <div style="background-color: #fefce8; border: 1px solid #fef08a; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #9a3412;">
        Next Steps & Reservation Policy:
      </p>
      <p style="margin: 0; font-size: 12px; color: #9a3412; line-height: 1.5;">${customMessage}</p>
    </div>
  </div>
</div>`;

    try {
      const token = globalSettings?.bookingEmailToken || globalSettings?.accountsEmailToken;
      const adminEmail = globalSettings?.accountsEmail || 'accounts@gfkholidays.com';

      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          to: email,
          subject: `Booking Request Received: ${productItem.title || productItem.name} [${voucherCode}]`,
          html: requestReceivedHtml
        })
      });

      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          to: adminEmail,
          subject: `[NEW BOOKING ALERT] ${productItem.title || productItem.name} - ${voucherCode}`,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h2>New Booking Received!</h2>
            <p><strong>Booking ID:</strong> ${voucherCode}</p>
            <p><strong>Customer:</strong> ${clientName} (${email})</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Product:</strong> ${productItem.title || productItem.name}</p>
            <p><strong>Total:</strong> RM ${checkoutTotal.toLocaleString()}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
            <p>Log into the admin portal (/admin) to confirm and invoice this booking.</p>
          </div>`
        })
      });
    } catch (err) {
      console.error('Failed to trigger email API', err);
    }

    handleNavigate('/booking-success', { booking: newBooking, product: productItem });
  };

  // If browser navigated to /admin, render the standalone Admin Portal directly
  if (currentPath === '/admin') {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 font-sans text-zinc-900">
        {toastMsg && (
          <div className="fixed top-6 right-4 z-[110] bg-zinc-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center font-bold tracking-tight border border-zinc-800">
            <Sparkles className="w-5 h-5 mr-3 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}
        <main className="flex-grow flex flex-col">
          <AdminPortal
            packages={packages}
            setPackages={setPackages}
            onUpdatePackages={setPackages}
            transport={transport}
            setTransport={setTransport}
            onUpdateTransport={setTransport}
            hotels={hotels}
            setHotels={setHotels}
            onUpdateHotels={setHotels}
            tickets={tickets}
            setTickets={setTickets}
            onUpdateTickets={setTickets}
            agents={agents}
            setAgents={setAgents}
            onUpdateAgents={setAgents}
            bookings={bookings}
            setBookings={setBookings}
            onUpdateBookings={setBookings}
            allotments={allotments}
            setAllotments={setAllotments}
            onUpdateAllotments={setAllotments}
            reviews={reviews}
            setReviews={setReviews}
            onUpdateReviews={setReviews}
            settings={settings}
            setSettings={setSettings}
            onUpdateSettings={setSettings}
            emailSettings={settings}
            onUpdateEmailSettings={setSettings}
            getNormalizedItem={getNormalizedItem}
            showToast={showToast}
            onNavigate={handleNavigate}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-500 selection:text-white">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-24 right-4 z-[110] bg-zinc-950 text-white px-6 py-4 rounded-2xl shadow-2xl animate-slide-in flex items-center font-bold tracking-tight border border-zinc-800">
          <Sparkles className="w-5 h-5 mr-3 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Menu (Strictly no Admin Portal links) */}
      <Header
        userRole={userRole}
        currentUser={currentAgent}
        onNavigate={handleNavigate}
        onLoginAs={handleRoleLogin}
        onRequestLogin={setAuthModalRole}
        logoUrl={globalSettings.logoUrl}
      />

      <AuthModal
        isOpen={authModalRole !== null}
        role={authModalRole || 'customer'}
        onClose={() => setAuthModalRole(null)}
        onLogin={handleAuthLogin}
      />

      {/* Main Container */}
      <main className="flex-grow pt-16 md:pt-20 pb-16 md:pb-0 flex flex-col">
        {/* Path: HOME — Flagship Malaysia B2C Experience & Activities Hub */}
        {currentPath === '/' && (
          <MalaysiaHome
            packages={packages}
            tickets={tickets}
            hotels={hotels}
            transport={transport}
            userRole={userRole}
            currentAgent={currentAgent}
            globalSettings={globalSettings}
            onNavigate={handleNavigate}
            onRequestLogin={setAuthModalRole}
            imageMap={IMAGE_MAP}
          />
        )}

        {/* Path: B2C CATEGORY EXPLORERS */}
        {currentPath === '/search' && (
          <CatalogBrowser
            viewType="packages"
            packages={packages}
            transport={transport}
            hotels={hotels}
            tickets={tickets}
            userRole={userRole}
            agentCommission={currentAgent ? currentAgent.commission : 10}
            onNavigate={handleNavigate}
            imageMap={IMAGE_MAP}
          />
        )}

        {/* Path: B2C TRANSPORT DIRECTORY */}
        {currentPath === '/transport' && (
          <CatalogBrowser
            viewType="transport"
            packages={packages}
            transport={transport}
            hotels={hotels}
            tickets={tickets}
            userRole={userRole}
            agentCommission={currentAgent ? currentAgent.commission : 10}
            onNavigate={handleNavigate}
            imageMap={IMAGE_MAP}
          />
        )}

        {/* Path: B2C RESTAURANTS DIRECTORY */}
        {currentPath === '/restaurants' && (
          <CatalogBrowser
            viewType="restaurants"
            packages={packages}
            transport={transport}
            hotels={hotels}
            tickets={tickets}
            userRole={userRole}
            agentCommission={currentAgent ? currentAgent.commission : 10}
            onNavigate={handleNavigate}
            imageMap={IMAGE_MAP}
          />
        )}

        {/* Path: B2C CRUISES DIRECTORY */}
        {currentPath === '/cruises' && (
          <CatalogBrowser
            viewType="cruises"
            packages={packages}
            transport={transport}
            hotels={hotels}
            tickets={tickets}
            userRole={userRole}
            agentCommission={currentAgent ? currentAgent.commission : 10}
            onNavigate={handleNavigate}
            imageMap={IMAGE_MAP}
          />
        )}

        {/* Path: B2C HOTELS DIRECTORY */}
        {currentPath === '/hotels' && (
          <CatalogBrowser
            viewType="hotels"
            packages={packages}
            transport={transport}
            hotels={hotels}
            tickets={tickets}
            userRole={userRole}
            agentCommission={currentAgent ? currentAgent.commission : 10}
            onNavigate={handleNavigate}
            imageMap={IMAGE_MAP}
          />
        )}

        {/* Path: B2C TICKETS CATALOG */}
        {currentPath === '/tickets' && (
          <CatalogBrowser
            viewType="tickets"
            packages={packages}
            transport={transport}
            hotels={hotels}
            tickets={tickets}
            userRole={userRole}
            agentCommission={currentAgent ? currentAgent.commission : 10}
            onNavigate={handleNavigate}
            imageMap={IMAGE_MAP}
          />
        )}

        {/* Path: LISTING DETAIL SCREEN */}
        {currentPath === '/package' && (
          <ProductDetail
            pkgId={routeParams.id}
            userRole={userRole}
            agentCommission={currentAgent ? currentAgent.commission : 10}
            allotments={allotments}
            reviews={reviews}
            onAddReview={rev => setReviews([...reviews, rev])}
            getNormalizedItem={getNormalizedItem}
            onNavigate={handleNavigate}
            imageMap={IMAGE_MAP}
            showToast={showToast}
          />
        )}

        {/* Path: CHECKOUT FORM */}
        {currentPath === '/checkout' && (
          <CheckoutForm
            product={routeParams.product}
            pax={routeParams.pax}
            date={routeParams.date}
            optionName={routeParams.optionName}
            timeSlot={routeParams.timeSlot}
            displayPrice={routeParams.displayPrice}
            total={routeParams.total}
            commission={routeParams.commission}
            userRole={userRole}
            currentUser={currentAgent}
            onConfirm={handleConfirmCheckout}
            onCancel={() => handleNavigate('/package', { id: routeParams.product.id })}
            showToast={showToast}
          />
        )}

        {/* Path: SUCCESS CONFIRMATION VOUCHER */}
        {currentPath === '/booking-success' && (
          <BookingSuccess
            booking={routeParams.booking}
            product={routeParams.product}
            userRole={userRole}
            onNavigate={handleNavigate}
          />
        )}

        {/* Path: B2B AGENT CORE HUB */}
        {currentPath === '/agent' && currentAgent && (
          <AgentPortal
            currentUser={currentAgent}
            bookings={bookings}
            packages={packages}
            transport={transport}
            hotels={hotels}
            tickets={tickets}
            onNavigate={handleNavigate}
            getNormalizedItem={getNormalizedItem}
            showToast={showToast}
          />
        )}

        {/* Path: CTFU BUILDER */}
        {currentPath === '/ctfu-builder' && <CtfuBuilder />}
      </main>

      {/* Footer shortlinks (Strictly no Admin Portal links) */}
      <Footer
        onNavigate={handleNavigate}
        onLoginAs={handleRoleLogin}
        logoUrl={globalSettings.logoUrl}
        socialChannels={globalSettings.socialChannels}
      />

      {/* Mobile Bottom Navigation Bar (B2C Travel OTA Native App Experience) */}
      <MobileBottomNav
        currentPath={currentPath}
        userRole={userRole}
        currentAgent={currentAgent}
        onNavigate={handleNavigate}
        onRequestLogin={setAuthModalRole}
      />
    </div>
  );
}
