import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
  DEFAULT_GLOBAL_SETTINGS
} from './data';
import AdminPortal from './components/AdminPortal';
import { Sparkles } from 'lucide-react';
import './index.css';

function AdminApp() {
  const [packages, setPackages] = useFirestoreCollection<Package>('packages', INITIAL_PACKAGES);
  const [transport, setTransport] = useFirestoreCollection<TransportRoute>('transport', INITIAL_TRANSPORT);
  const [hotels, setHotels] = useFirestoreCollection<Hotel>('hotels', INITIAL_HOTELS);
  const [tickets, setTickets] = useFirestoreCollection<Ticket>('tickets', INITIAL_TICKETS);
  const [agents, setAgents] = useFirestoreCollection<Agent>('agents', INITIAL_AGENTS);
  const [bookings, setBookings] = useFirestoreCollection<Booking>('bookings', INITIAL_BOOKINGS);
  const [allotments, setAllotments] = useFirestoreCollection<Allotment>('allotments', INITIAL_ALLOTMENTS);
  const [reviews, setReviews] = useFirestoreCollection<Review>('reviews', []);
  const [settings, setSettings] = useFirestoreCollection<GlobalSettings>('settings', [DEFAULT_GLOBAL_SETTINGS]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
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

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 font-sans text-zinc-900 selection:bg-emerald-500 selection:text-white">
      {toastMsg && (
        <div className="fixed top-8 right-4 z-[110] bg-zinc-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-slide-in flex items-center font-bold tracking-tight border border-zinc-800">
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
        />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
);
