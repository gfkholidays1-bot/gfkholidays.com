import { useState, useMemo } from 'react';
import { Agent, Booking, Package, TransportRoute, Hotel, Ticket } from '../types';
import { CreditCard, Activity, TrendingUp, Clock, Download, Shield, Eye, ChevronRight, Search } from 'lucide-react';

interface AgentPortalProps {
  currentUser: Agent | null;
  bookings: Booking[];
  packages: Package[];
  transport: TransportRoute[];
  hotels: Hotel[];
  tickets: Ticket[];
  onNavigate: (path: string, params?: any) => void;
  getNormalizedItem: (id: string) => any;
  showToast: (msg: string) => void;
}

type AgentTab = 'overview' | 'packages' | 'transport' | 'hotels' | 'tickets';

export default function AgentPortal({
  currentUser,
  bookings,
  packages,
  transport,
  hotels,
  tickets,
  onNavigate,
  getNormalizedItem,
  showToast
}: AgentPortalProps) {
  const [activeTab, setActiveTab] = useState<AgentTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-zinc-300 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-900">Agent Access Required</h2>
          <p className="text-sm text-zinc-500">Please log in as an agent to view this portal.</p>
        </div>
      </div>
    );
  }

  // Filter bookings to only this agent's actions
  const myBookings = useMemo(() => {
    return bookings.filter(b => b.agentId === currentUser.id);
  }, [bookings, currentUser]);

  const stats = useMemo(() => {
    const credit = currentUser.wallet.credit;
    const earned = currentUser.wallet.earned;
    const pending = currentUser.wallet.pending;
    const count = myBookings.length;
    return { credit, earned, pending, count };
  }, [currentUser, myBookings]);

  // Export my bookings to CSV file
  const handleExportCSV = () => {
    if (myBookings.length === 0) {
      showToast('No bookings in your account to export');
      return;
    }
    let csv = "Booking Reference,Date Created,Traveler Client,Product Service,Rate Charged (RM),Earned Commission (RM),Status\n";
    myBookings.forEach(b => {
      const item = getNormalizedItem(b.pkgId);
      const rawTitle = item ? (item.title || item.name || 'Deleted Product') : 'Deleted Product';
      const title = rawTitle.replace(/,/g, '');
      csv += `${b.id},${b.createdAt},${b.client.replace(/,/g, '')},${title},${b.total},${b.commission},${b.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `GFK_Agent_${currentUser.id}_Bookings_Report.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Spreadsheet exported successfully!');
  };

  const handleBookNow = (id: string) => {
    onNavigate('/package', { id });
  };

  // Filter dynamic lists based on search bar query
  const filteredPackages = useMemo(() => {
    return packages.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [packages, searchQuery]);

  const filteredTransport = useMemo(() => {
    return transport.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transport, searchQuery]);

  const filteredHotels = useMemo(() => {
    return hotels.filter(h => 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.cat.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [hotels, searchQuery]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tickets, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 animate-fade-in w-full">
      {/* Banner info */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-100 pb-8">
        <div>
          <div className="inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-3">
            ID: {currentUser.id} • Verified B2B Partner Agent ({currentUser.commission}% base markdown)
          </div>
          <h1 className="text-4xl font-black text-zinc-950 tracking-tighter">Welcome back, {currentUser.company}</h1>
          <p className="text-zinc-500 font-semibold mt-1">
            Access live nett tariffs, manage corporate bookings, and track deposit allocations
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-zinc-100 p-1.5 rounded-full border border-zinc-250 overflow-x-auto hide-scrollbar max-w-full">
          {(['overview', 'packages', 'transport', 'hotels', 'tickets'] as AgentTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
              className={`px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer border-none ${
                activeTab === tab
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-950'
              }`}
            >
              {tab === 'overview' ? 'My Hub' : tab === 'tickets' ? 'E-Tickets' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW MAIN TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-zinc-150 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Available Credit Balance</span>
                <span className="text-3xl font-black text-zinc-950">RM {stats.credit.toLocaleString()}</span>
                <span className="text-[0.65rem] font-bold text-emerald-600 block mt-1">Instant B2B ticketing ready</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 text-zinc-400">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-zinc-150 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">My Bookings Count</span>
                <span className="text-3xl font-black text-zinc-950">{stats.count}</span>
                <span className="text-[0.65rem] font-bold text-zinc-400 block mt-1">Completed bookings</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 text-zinc-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-indigo-650 p-8 rounded-[2rem] shadow-xl text-white flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider block mb-2">Earned Commission Margin</span>
                <span className="text-3xl font-black text-white">RM {stats.earned.toLocaleString()}</span>
                <span className="text-[0.65rem] font-bold text-indigo-150 block mt-1">Withdrawn on monthly audit cycle</span>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl text-indigo-200">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-zinc-150 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Pending Escrow</span>
                <span className="text-3xl font-black text-zinc-950">RM {stats.pending.toLocaleString()}</span>
                <span className="text-[0.65rem] font-bold text-amber-600 block mt-1">Awaiting travel completion</span>
              </div>
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100 text-zinc-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Bookings Table list */}
          <div className="bg-white rounded-[2rem] border border-zinc-150 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-zinc-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50/50">
              <div>
                <h3 className="font-black text-xl text-zinc-950 tracking-tight">Recent B2B Reservations</h3>
                <p className="text-xs font-bold text-zinc-400 mt-0.5">Corporate listings purchased with your wallet credit</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 px-5 py-2.5 rounded-full text-xs font-black transition-all flex items-center cursor-pointer"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export My Ledger (.CSV)
              </button>
            </div>

            {myBookings.length === 0 ? (
              <div className="p-16 text-center text-zinc-400 font-bold bg-white">
                No bookings locked yet on this corporate account. Browse tariff sheets to lock your first rate!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50/30 border-b border-zinc-100 text-[0.65rem] font-black text-zinc-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Ref Code</th>
                      <th className="px-6 py-4">Created Date</th>
                      <th className="px-6 py-4">Lead Traveler</th>
                      <th className="px-6 py-4">Tour / Package</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Commission Margin</th>
                      <th className="px-6 py-4 text-right">Debit Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs font-bold text-zinc-600">
                    {myBookings.map(b => {
                      const item = getNormalizedItem(b.pkgId);
                      return (
                        <tr key={b.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4 font-black text-zinc-900 text-sm">{b.id}</td>
                          <td className="px-6 py-4 text-zinc-400">{b.createdAt}</td>
                          <td className="px-6 py-4 text-zinc-900">{b.client}</td>
                          <td className="px-6 py-4 max-w-xs truncate text-zinc-800">
                            {item ? (item.title || item.name || 'Active Custom Service') : 'Active Custom Service'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`border font-black px-2.5 py-1 rounded-full text-[0.6rem] uppercase tracking-wider ${
                              b.status === 'CONFIRMED'
                                ? 'bg-emerald-50 border-emerald-150 text-emerald-700'
                                : b.status === 'CANCELLED'
                                ? 'bg-red-50 border-red-150 text-red-700'
                                : b.status === 'REQUEST_RECEIVED'
                                ? 'bg-blue-50 border-blue-150 text-blue-700'
                                : 'bg-amber-50 border-amber-150 text-amber-700'
                            }`}>
                              {b.status === 'REQUEST_RECEIVED' ? 'REQUEST RECEIVED' : b.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-emerald-600 font-black">
                            +RM {b.commission.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-zinc-900 text-sm">
                            RM {b.total.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIRECTORY CONTRACT SHEETS FOR AGENT */}
      {activeTab !== 'overview' && (
        <div className="space-y-6">
          <div className="bg-zinc-50 px-6 py-4 rounded-3xl border border-zinc-150 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-black text-xl text-zinc-950 tracking-tight capitalize">
                B2B {activeTab === 'tickets' ? 'Attractions' : activeTab} Nett Tarif Sheet
              </h3>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">
                Contract rates pre-calculated with your {currentUser.commission}% markdown override
              </p>
            </div>

            {/* Quick Filter */}
            <div className="w-full md:w-80 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inventory keywords..."
                className="w-full bg-white border border-zinc-250 rounded-full pl-10 pr-4 py-2.5 font-bold text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-zinc-300"
              />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-zinc-150 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                {activeTab === 'packages' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[0.65rem] font-black text-zinc-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Itinerary details</th>
                        <th className="px-6 py-4 text-center">Retail Rate</th>
                        <th className="px-6 py-4 text-center text-indigo-700">B2B Cost Rate (Nett)</th>
                        <th className="px-6 py-4 text-center text-emerald-600">My Earned Margin</th>
                        <th className="px-6 py-4 text-right">Reservation action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-600">
                      {filteredPackages.map(pkg => {
                        const netRate = Math.round(pkg.base_price * (1 - currentUser.commission / 100));
                        const margin = pkg.base_price - netRate;
                        return (
                          <tr key={pkg.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-5">
                              <span className="font-black text-zinc-900 text-sm leading-tight block">{pkg.title}</span>
                              <span className="text-[0.65rem] font-bold text-zinc-400 block mt-1">{pkg.destination} • {pkg.duration_days} Days</span>
                            </td>
                            <td className="px-6 py-5 text-center font-bold text-zinc-400 line-through">RM {pkg.base_price}</td>
                            <td className="px-6 py-5 text-center font-black text-indigo-700 text-sm">RM {netRate}</td>
                            <td className="px-6 py-5 text-center font-black text-emerald-600 text-sm">+RM {margin}</td>
                            <td className="px-6 py-5 text-right">
                              <button
                                onClick={() => handleBookNow(pkg.id)}
                                className="bg-zinc-950 text-white px-5 py-2.5 rounded-full font-black text-xs hover:bg-zinc-850 cursor-pointer shadow-sm border-none"
                              >
                                Book (Nett)
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {activeTab === 'transport' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[0.65rem] font-black text-zinc-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Transfer route connections</th>
                        <th className="px-6 py-4 text-center">Car (1-3 Pax) <span className="text-[0.6rem] text-zinc-400 font-normal block">(Base / Nett)</span></th>
                        <th className="px-6 py-4 text-center">MPV (4-5 Pax) <span className="text-[0.6rem] text-zinc-400 font-normal block">(Base / Nett)</span></th>
                        <th className="px-6 py-4 text-center">Van-7 <span className="text-[0.6rem] text-zinc-400 font-normal block">(Base / Nett)</span></th>
                        <th className="px-6 py-4 text-center">Van-13 <span className="text-[0.6rem] text-zinc-400 font-normal block">(Base / Nett)</span></th>
                        <th className="px-6 py-4 text-right">Reservation action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-600">
                      {filteredTransport.map(tr => {
                        const netCar = Math.round(tr.car * (1 - currentUser.commission / 100));
                        const netMpv = Math.round(tr.mpv * (1 - currentUser.commission / 100));
                        const netVan7 = Math.round(tr.van7 * (1 - currentUser.commission / 100));
                        const netVan13 = Math.round(tr.van13 * (1 - currentUser.commission / 100));
                        return (
                          <tr key={tr.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-5">
                              <span className="font-black text-zinc-900 text-sm leading-tight block">{tr.name}</span>
                              {tr.instructions && <span className="text-[0.65rem] font-bold text-zinc-400 block mt-1">{tr.instructions}</span>}
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-zinc-400 line-through block text-[0.65rem] mb-1">RM {tr.car}</span>
                              <span className="font-black text-indigo-700 text-sm block">RM {netCar}</span>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-zinc-400 line-through block text-[0.65rem] mb-1">RM {tr.mpv}</span>
                              <span className="font-black text-indigo-700 text-sm block">RM {netMpv}</span>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-zinc-400 line-through block text-[0.65rem] mb-1">RM {tr.van7}</span>
                              <span className="font-black text-indigo-700 text-sm block">RM {netVan7}</span>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-zinc-400 line-through block text-[0.65rem] mb-1">RM {tr.van13}</span>
                              <span className="font-black text-indigo-700 text-sm block">RM {netVan13}</span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <button
                                onClick={() => handleBookNow(tr.id)}
                                className="bg-zinc-950 text-white px-5 py-2.5 rounded-full font-black text-xs hover:bg-zinc-850 cursor-pointer shadow-sm border-none"
                              >
                                Book (Nett)
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {activeTab === 'hotels' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[0.65rem] font-black text-zinc-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Property Contracted Name</th>
                        <th className="px-6 py-4 text-center">Retail Rate</th>
                        <th className="px-6 py-4 text-center text-indigo-700">B2B cost Rate (Nett)</th>
                        <th className="px-6 py-4 text-center text-emerald-600">My Earned Margin</th>
                        <th className="px-6 py-4 text-right">Reservation action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-600">
                      {filteredHotels.map(ht => {
                        const netRate = Math.round(ht.price * (1 - currentUser.commission / 100));
                        const margin = ht.price - netRate;
                        return (
                          <tr key={ht.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-5">
                              <span className="font-black text-zinc-900 text-sm leading-tight block">{ht.name}</span>
                              <span className="text-[0.65rem] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md inline-block mt-1">{ht.cat}</span>
                            </td>
                            <td className="px-6 py-5 text-center font-bold text-zinc-400 line-through">RM {ht.price}</td>
                            <td className="px-6 py-5 text-center font-black text-indigo-700 text-sm">RM {netRate}</td>
                            <td className="px-6 py-5 text-center font-black text-emerald-600 text-sm">+RM {margin}</td>
                            <td className="px-6 py-5 text-right">
                              <button
                                onClick={() => handleBookNow(ht.id)}
                                className="bg-zinc-950 text-white px-5 py-2.5 rounded-full font-black text-xs hover:bg-zinc-850 cursor-pointer shadow-sm border-none"
                              >
                                Book (Nett)
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {activeTab === 'tickets' && (
                  <>
                    <thead className="bg-zinc-50 border-b border-zinc-100 text-[0.65rem] font-black text-zinc-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Entry Pass specification</th>
                        <th className="px-6 py-4 text-center">Retail Rate</th>
                        <th className="px-6 py-4 text-center text-indigo-700">B2B cost Rate (Nett)</th>
                        <th className="px-6 py-4 text-center text-emerald-600">My Earned Margin</th>
                        <th className="px-6 py-4 text-right">Reservation action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-600">
                      {filteredTickets.map(tk => {
                        const netRate = Math.round(tk.price * (1 - currentUser.commission / 100));
                        const margin = tk.price - netRate;
                        return (
                          <tr key={tk.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-5">
                              <span className="font-black text-zinc-900 text-sm leading-tight block">{tk.name}</span>
                              <span className="text-[0.65rem] font-bold text-zinc-400 block mt-1">{tk.info} • {tk.addInfo}</span>
                            </td>
                            <td className="px-6 py-5 text-center font-bold text-zinc-400 line-through">RM {tk.price}</td>
                            <td className="px-6 py-5 text-center font-black text-indigo-700 text-sm">RM {netRate}</td>
                            <td className="px-6 py-5 text-center font-black text-emerald-600 text-sm">+RM {margin}</td>
                            <td className="px-6 py-5 text-right">
                              <button
                                onClick={() => handleBookNow(tk.id)}
                                className="bg-zinc-950 text-white px-5 py-2.5 rounded-full font-black text-xs hover:bg-zinc-850 cursor-pointer shadow-sm border-none"
                              >
                                Book (Nett)
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
