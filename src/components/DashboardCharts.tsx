import { useState, useMemo } from 'react';
import { Booking, Agent, Package } from '../types';
import { TrendingUp, BarChart2, PieChart, Award } from 'lucide-react';

interface DashboardChartsProps {
  bookings: Booking[];
  agents: Agent[];
  getNormalizedItem: (id: string) => any;
}

export default function DashboardCharts({ bookings, agents, getNormalizedItem }: DashboardChartsProps) {
  const [activeChart, setActiveChart] = useState<'sales' | 'categories' | 'agents'>('sales');

  // Compute stats
  const totalSales = useMemo(() => bookings.reduce((sum, b) => sum + b.total, 0), [bookings]);
  const totalComm = useMemo(() => bookings.reduce((sum, b) => sum + b.commission, 0), [bookings]);
  const directSales = useMemo(() => bookings.filter(b => !b.agentId).reduce((sum, b) => sum + b.total, 0), [bookings]);
  const b2bSales = useMemo(() => bookings.filter(b => b.agentId).reduce((sum, b) => sum + b.total, 0), [bookings]);

  // Chart 1: Sales Trend by Date (Last 7 Days or unique dates in our db)
  const salesByDate = useMemo(() => {
    const datesMap: Record<string, number> = {};
    bookings.forEach(b => {
      const d = b.createdAt || '2026-07-15';
      datesMap[d] = (datesMap[d] || 0) + b.total;
    });
    // Sort dates
    const sortedDates = Object.keys(datesMap).sort();
    return sortedDates.map(date => ({
      date,
      amount: datesMap[date]
    }));
  }, [bookings]);

  // Chart 2: Category distribution
  const categoryStats = useMemo(() => {
    const catMap: Record<string, number> = {
      'Packages': 0,
      'Transport': 0,
      'Hotels': 0,
      'Attractions': 0,
    };
    bookings.forEach(b => {
      const item = getNormalizedItem(b.pkgId);
      const cat = item ? item.category || 'Packages' : 'Packages';
      catMap[cat] = (catMap[cat] || 0) + b.total;
    });
    return Object.keys(catMap).map(name => ({
      name,
      value: catMap[name]
    })).filter(c => c.value > 0);
  }, [bookings, getNormalizedItem]);

  // Chart 3: Agent sales ranking
  const agentRankings = useMemo(() => {
    const rankMap: Record<string, { name: string; sales: number }> = {};
    // Seed existing agents
    agents.forEach(a => {
      rankMap[a.id] = { name: a.company, sales: 0 };
    });
    // Add direct
    rankMap['direct'] = { name: 'Direct Retail Customers', sales: 0 };

    bookings.forEach(b => {
      const id = b.agentId || 'direct';
      if (rankMap[id]) {
        rankMap[id].sales += b.total;
      } else {
        rankMap[id] = { name: `Agent ${id}`, sales: b.total };
      }
    });

    return Object.keys(rankMap)
      .map(id => ({ id, ...rankMap[id] }))
      .sort((a, b) => b.sales - a.sales);
  }, [bookings, agents]);

  // Max values for scaling SVG
  const maxSalesAmount = useMemo(() => {
    if (salesByDate.length === 0) return 1000;
    return Math.max(...salesByDate.map(d => d.amount), 1000);
  }, [salesByDate]);

  const maxAgentSales = useMemo(() => {
    if (agentRankings.length === 0) return 1000;
    return Math.max(...agentRankings.map(a => a.sales), 1000);
  }, [agentRankings]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-zinc-150 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-black text-zinc-900 tracking-tight flex items-center">
            <TrendingUp className="w-5 h-5 text-emerald-600 mr-2" />
            Visual Statistics Engine
          </h3>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-1">
            Real-time charts of GFK bookings and agency distributions
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
          <button
            onClick={() => setActiveChart('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-tight transition-all flex items-center cursor-pointer ${
              activeChart === 'sales' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
            Sales Trend
          </button>
          <button
            onClick={() => setActiveChart('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-tight transition-all flex items-center cursor-pointer ${
              activeChart === 'categories' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 mr-1.5" />
            Category Share
          </button>
          <button
            onClick={() => setActiveChart('agents')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-tight transition-all flex items-center cursor-pointer ${
              activeChart === 'agents' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 mr-1.5" />
            Agent rankings
          </button>
        </div>
      </div>

      {/* Stats row inside chart wrapper */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
          <div className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-widest mb-1">Gross Booking Sales</div>
          <div className="text-xl font-black text-zinc-900">RM {totalSales.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
          <div className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-widest mb-1">B2B Agent Sales</div>
          <div className="text-xl font-black text-amber-600">RM {b2bSales.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
          <div className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-widest mb-1">Direct Retail Sales</div>
          <div className="text-xl font-black text-emerald-600">RM {directSales.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
          <div className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-widest mb-1">Agent Margins Paid</div>
          <div className="text-xl font-black text-rose-600">RM {totalComm.toLocaleString()}</div>
        </div>
      </div>

      {/* Core Chart Canvas Area */}
      <div className="h-64 flex items-center justify-center bg-zinc-50 rounded-2xl border border-zinc-150 p-4 relative overflow-hidden">
        {/* Sales Trend Chart */}
        {activeChart === 'sales' && (
          <div className="w-full h-full flex flex-col justify-between">
            {salesByDate.length === 0 ? (
              <div className="text-zinc-400 text-sm font-bold m-auto">No sales records to plot</div>
            ) : (
              <>
                {/* SVG Graph */}
                <div className="flex-1 w-full relative flex items-end justify-between px-6 pt-4 gap-4">
                  {salesByDate.map((item, index) => {
                    const pct = (item.amount / maxSalesAmount) * 80; // keep some top margin
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        {/* Hover Value Badge */}
                        <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[0.65rem] font-bold px-2 py-1 rounded-md -translate-y-full z-10 shadow-md">
                          RM {item.amount.toLocaleString()}
                        </div>
                        {/* Bar */}
                        <div 
                          className="w-full bg-emerald-600 group-hover:bg-emerald-700 rounded-t-lg transition-all duration-500 ease-out min-h-[4px]"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        ></div>
                      </div>
                    );
                  })}
                </div>
                {/* Dates X-Axis */}
                <div className="border-t border-zinc-200 pt-3 flex justify-between px-6 text-[0.65rem] font-black text-zinc-400 uppercase tracking-wider">
                  {salesByDate.map((item, idx) => (
                    <span key={idx}>{item.date.slice(5)}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Category Share Chart (Dynamic SVG Circle/Pie) */}
        {activeChart === 'categories' && (
          <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around gap-6">
            {categoryStats.length === 0 ? (
              <div className="text-zinc-400 text-sm font-bold m-auto">No categorized booking data</div>
            ) : (
              <>
                {/* Draw Beautiful SVG Ring */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#f4f4f5"
                      strokeWidth="12"
                    />
                    {/* Ring Segments */}
                    {(() => {
                      let accumulatedPct = 0;
                      const colors = ['#047857', '#d97706', '#be123c', '#4f46e5'];
                      return categoryStats.map((cat, idx) => {
                        const pct = (cat.value / totalSales) * 100;
                        const strokeDash = `${pct} 100`;
                        const strokeOffset = 100 - accumulatedPct;
                        accumulatedPct += pct;
                        return (
                          <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="12"
                            strokeDasharray={strokeDash}
                            strokeDashoffset={strokeOffset}
                            className="transition-all duration-1000"
                          />
                        );
                      });
                    })()}
                  </svg>
                  {/* Inside Center Badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-full m-8 shadow-inner">
                    <span className="text-[0.6rem] font-bold text-zinc-400 uppercase tracking-widest leading-none">Gross</span>
                    <span className="text-sm font-black text-zinc-800 mt-1">RM {(totalSales/1000).toFixed(1)}K</span>
                  </div>
                </div>

                {/* Legends */}
                <div className="space-y-2.5 text-xs font-bold max-w-[200px] w-full">
                  {(() => {
                    const colors = ['bg-emerald-700', 'bg-amber-600', 'bg-rose-700', 'bg-indigo-600'];
                    return categoryStats.map((cat, idx) => {
                      const share = ((cat.value / totalSales) * 100).toFixed(1);
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${colors[idx % colors.length]}`}></span>
                            <span className="text-zinc-600">{cat.name}</span>
                          </div>
                          <span className="text-zinc-900 font-black">{share}%</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* Agent Rankings Leaderboard */}
        {activeChart === 'agents' && (
          <div className="w-full h-full flex flex-col justify-center space-y-4 px-4 overflow-y-auto">
            {agentRankings.slice(0, 4).map((agent, index) => {
              const sharePct = totalSales > 0 ? (agent.sales / totalSales) * 100 : 0;
              const barWidth = maxAgentSales > 0 ? (agent.sales / maxAgentSales) * 100 : 0;
              
              let medal = '';
              if (index === 0) medal = '🥇';
              else if (index === 1) medal = '🥈';
              else if (index === 2) medal = '🥉';
              else medal = '💼';

              return (
                <div key={agent.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black text-zinc-700">
                    <span className="flex items-center">
                      <span className="mr-1.5">{medal}</span>
                      {agent.name}
                    </span>
                    <span className="text-zinc-900">
                      RM {agent.sales.toLocaleString()} <span className="text-[0.6rem] text-zinc-400 font-normal">({sharePct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-zinc-150 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        agent.id === 'direct' ? 'bg-emerald-600' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.max(barWidth, 2)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
