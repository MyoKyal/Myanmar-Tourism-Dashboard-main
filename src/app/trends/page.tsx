"use client";

import { useEffect, useState } from "react";
import { useGlobalFilters } from "@/lib/FilterContext";
import GlobalFilters from "@/components/GlobalFilters";
import { getTrendsData } from "@/actions/trends";
import { KPICard } from "@/components/KPICard";
import { LineChart as LineChartIcon, Activity, CalendarDays, TrendingUp } from "lucide-react";
import {
    AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, ComposedChart, Cell
} from 'recharts';

export default function TrendsPage() {
    const { filters } = useGlobalFilters();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const result = await getTrendsData(filters);
                setData(result);
            } catch (err) {
                console.error("Failed to load trends data", err);
            }
            setLoading(false);
        }
        fetchData();
    }, [filters]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(num || 0);

    const getLatestYoY = () => {
        if (!data?.yearly || data.yearly.length === 0) return { value: 0, isPositive: true };
        const latest = data.yearly[data.yearly.length - 1];
        return { value: latest.yoy, isPositive: latest.yoy >= 0 };
    };

    const trendYoY = getLatestYoY();

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Time Trend Analysis</h1>
                <p className="text-slate-400">Evaluate year-over-year growth, monthly seasonality, and pandemic impact.</p>
            </div>

            <GlobalFilters showYear />

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KPICard
                            title="Latest Year Growth"
                            value={`${trendYoY.value}%`}
                            icon={TrendingUp}
                            trend={trendYoY}
                            colorClass="from-cyan-400 to-blue-500"
                        />
                        <KPICard
                            title="Best Performing Month"
                            value={data?.seasonality ? [...data.seasonality].sort((a, b) => b.total - a.total)[0]?.month?.substring(0, 3) || 'N/A' : 'N/A'}
                            icon={CalendarDays}
                            colorClass="from-emerald-400 to-teal-500"
                        />
                        <KPICard
                            title="Pre-COVID Peak"
                            value={formatNumber(data?.periods?.find((p: any) => p.period.includes('Pre'))?.total || 0)}
                            icon={Activity}
                            colorClass="from-purple-400 to-fuchsia-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                        {/* YoY Trend Line Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                                Year-over-Year Growth Trend
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data?.yearly || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                            formatter={(val: any, name: string) => [
                                                name === 'total' ? new Intl.NumberFormat('en-US').format(val) : `${val}%`,
                                                name === 'total' ? 'Visitors' : 'YoY Growth'
                                            ]}
                                        />
                                        <Bar yAxisId="left" dataKey="total" fill="#334155" radius={[4, 4, 0, 0]} />
                                        <Line yAxisId="right" type="monotone" dataKey="yoy" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#020617" }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Monthly Seasonality Area Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-purple-500 rounded-sm" />
                                Monthly Seasonality
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.seasonality || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => val.substring(0, 3)} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Area type="monotone" dataKey="total" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorMonth)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* COVID Impact Bar */}
                        <div className="glass-panel p-6 flex flex-col h-[400px] lg:col-span-2">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-rose-500 rounded-sm" />
                                Pandemic Impact Timeline
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.periods || []} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <YAxis type="category" dataKey="period" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            cursor={{ fill: '#1e293b' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                            {
                                                (data?.periods || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.period.includes('Pre') ? '#34d399' : entry.period.includes('Recovery') ? '#38bdf8' : '#fb7185'} />
                                                ))
                                            }
                                        </Bar>
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
