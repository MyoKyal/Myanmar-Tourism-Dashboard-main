"use client";

import { useEffect, useState } from "react";
import { useGlobalFilters } from "@/lib/FilterContext";
import GlobalFilters from "@/components/GlobalFilters";
import { getOverviewKPIs, getOverviewChartsData } from "@/actions/tourism";
import { KPICard } from "@/components/KPICard";
import { Plane, Users, Hotel, DollarSign, Bed } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export default function OverviewDashboard() {
  const { filters } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const kpis = await getOverviewKPIs(filters);
        const charts = await getOverviewChartsData(filters);
        setKpiData(kpis);
        setChartData(charts);
      } catch (err) {
        console.error("Failed to load overview data", err);
      }
      setLoading(false);
    }
    fetchData();
  }, [filters]);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num || 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Main Overview</h1>
        <p className="text-slate-400">High-level analysis of Myanmar's tourism performance.</p>
      </div>

      <GlobalFilters showYear />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <KPICard
              title="Intl Visitors"
              value={formatNumber(kpiData?.intlVisitors)}
              icon={Plane}
              colorClass="from-blue-400 to-indigo-600"
            />
            <KPICard
              title="Domestic Visitors"
              value={formatNumber(kpiData?.domesticVisitors)}
              icon={Users}
              colorClass="from-emerald-400 to-teal-600"
            />
            <KPICard
              title="Total Hotels"
              value={formatNumber(kpiData?.hotelsCount)}
              icon={Hotel}
              colorClass="from-amber-400 to-orange-600"
            />
            <KPICard
              title="Total Rooms"
              value={formatNumber(kpiData?.roomsCount)}
              icon={Bed}
              colorClass="from-rose-400 to-pink-600"
            />
            <KPICard
              title="Expenditure ($)"
              value={formatNumber(kpiData?.expenditureTotal) + 'M'}
              icon={DollarSign}
              colorClass="from-cyan-400 to-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Chart 1 */}
            <div className="glass-panel p-6 flex flex-col h-[400px]">
              <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                International Arrivals by Year
              </h3>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData?.yearlyIntl || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      itemStyle={{ color: '#22d3ee' }}
                      formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                    />
                    <Area type="monotone" dataKey="visitors" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorVis)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="glass-panel p-6 flex flex-col h-[400px]">
              <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                <div className="w-2 h-6 bg-purple-500 rounded-sm" />
                Monthly Aggregate Interntional Visitors
              </h3>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData?.monthlyIntl || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      cursor={{ fill: '#1e293b' }}
                      formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                    />
                    <Bar dataKey="visitors" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
