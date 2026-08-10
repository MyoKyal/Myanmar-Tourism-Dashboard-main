"use client";

import { useEffect, useState } from "react";
import { useGlobalFilters } from "@/lib/FilterContext";
import GlobalFilters from "@/components/GlobalFilters";
import { getDomesticData } from "@/actions/domestic";
import { KPICard } from "@/components/KPICard";
import { Users, UserPlus, MapPin, TentTree } from "lucide-react";
import {
    Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';

export default function DomesticPage() {
    const { filters } = useGlobalFilters();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const result = await getDomesticData(filters);
                setData(result);
            } catch (err) {
                console.error("Failed to load domestic data", err);
            }
            setLoading(false);
        }
        fetchData();
    }, [filters]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(num || 0);

    const bestRegion = data?.regions && data.regions.length > 0 ? data.regions[0] : null;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Domestic Tourism Analysis</h1>
                <p className="text-slate-400">Evaluate local tourism footprints and regional popularity among citizens.</p>
            </div>

            <GlobalFilters showYear />

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard
                            title="Total Domestic Visitors"
                            value={formatNumber(data?.totalDomestic)}
                            icon={Users}
                            colorClass="from-emerald-400 to-teal-600"
                        />
                        <KPICard
                            title="Locals vs Internationals"
                            value={data?.totalDomestic > 0 ?`${((data.totalDomestic / (data.totalDomestic + data.totalIntl)) * 100).toFixed(1)}%` : '0%'}
                        subtitle="Share of Total Tourism"
                        icon={UserPlus}
                        colorClass="from-cyan-400 to-blue-500"
            />
                        <KPICard
                            title="Top Destination"
                            value={bestRegion ? bestRegion.name : 'N/A'}
                            subtitle={bestRegion ?`${formatNumber(bestRegion.visitors)} Visitors` : ''}
                        icon={MapPin}
                        colorClass="from-rose-400 to-pink-600"
            />
                        <KPICard
                            title="Regions Tracked"
                            value={data?.regions?.length || 0}
                            icon={TentTree}
                            colorClass="from-amber-400 to-orange-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

                        {/* Top Regions Bar Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[500px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-rose-500 rounded-sm" />
                                Regional Popularity Ranking
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.regions || []} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={90} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            cursor={{ fill: '#1e293b' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Bar dataKey="visitors" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trends Composed Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[500px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                                Domestic vs International Year-over-Year
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data?.yearlyTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />

                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />

                                        <Area type="monotone" dataKey="domestic" name="Domestic Arrivals" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                        <Line type="monotone" dataKey="intl" name="Intl Arrivals" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
