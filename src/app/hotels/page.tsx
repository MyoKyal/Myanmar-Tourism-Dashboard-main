"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getHotelsData } from "@/actions/hotels";
import { KPICard } from "@/components/KPICard";
import { PageSkeleton } from "@/components/Skeleton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { Hotel, Bed, Key, Gauge } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, ComposedChart, Line, Legend
} from 'recharts';

export default function HotelsPage() {
    const { filters } = useGlobalFilters();
    const { t } = usePreferences();
    const { data, loading, lastUpdated } = useLiveData(() => getHotelsData(filters), [filters]);

    const formatNumber = (num: number | string) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(Number(num) || 0);
    const latestCapacity = data?.capacityVsDemand?.length ? data.capacityVsDemand[data.capacityVsDemand.length - 1] : null;
    const earliestCapacity = data?.capacityVsDemand?.length ? data.capacityVsDemand[0] : null;
    const capacityTrendPct = latestCapacity && earliestCapacity && earliestCapacity.roomsPer1000Visitors > 0
        ? (((latestCapacity.roomsPer1000Visitors - earliestCapacity.roomsPer1000Visitors) / earliestCapacity.roomsPer1000Visitors) * 100).toFixed(0)
        : null;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("Hotel & Accommodation")}</h1>
                <p className="text-slate-400">{t("Discover hotel capacity, room availability, and infrastructure across regions.")}</p>
                <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
            </div>

            <GlobalFilters showYear />

            {loading ? (
                <PageSkeleton kpis={4} charts={3} />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard
                            title={t("Total Hotels")}
                            value={formatNumber(data?.totalHotels ?? 0)}
                            icon={Hotel}
                            colorClass="from-amber-400 to-orange-500"
                        />
                        <KPICard
                            title={t("Total Rooms")}
                            value={formatNumber(data?.totalRooms ?? 0)}
                            icon={Bed}
                            colorClass="from-rose-400 to-pink-500"
                        />
                        <KPICard
                            title={t("Avg Rooms Per Hotel")}
                            value={data?.avgRoomsPerHotel ?? "0"}
                            icon={Key}
                            colorClass="from-cyan-400 to-blue-600"
                        />
                        <KPICard
                            title={t("Rooms per 1,000 Visitors")}
                            value={latestCapacity ? latestCapacity.roomsPer1000Visitors.toString() : t("N/A")}
                            subtitle={latestCapacity && capacityTrendPct ? `${latestCapacity.year} · ${Number(capacityTrendPct) >= 0 ? '+' : ''}${capacityTrendPct}% ${t("vs")} ${earliestCapacity?.year}` : undefined}
                            icon={Gauge}
                            colorClass="from-emerald-400 to-teal-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

                        {/* Top Regions */}
                        <div className="glass-panel p-6 flex flex-col h-[450px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-rose-500 rounded-sm" />
                                {t("Top Regions by Capacity")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.regions || []} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            cursor={{ fill: '#1e293b' }}
                                            formatter={(val: any, name: any) => [new Intl.NumberFormat('en-US').format(val), name === 'rooms' ? t('Rooms') : t('Hotels')]}
                                        />
                                        <Bar dataKey="rooms" name={t("Rooms")} fill="#f43f5e" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trends Area Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[450px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                                {t("Hotel Capacity Growth")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.yearlyTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />

                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                            formatter={(val: any, name: any) => [new Intl.NumberFormat('en-US').format(val), name === 'rooms' ? t('Total Rooms Trend') : t('Total Hotels Trend')]}
                                        />

                                        <Area yAxisId="left" type="monotone" dataKey="rooms" name={t("Total Rooms Trend")} stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.5} />
                                        <Area yAxisId="right" type="monotone" dataKey="hotels" name={t("Total Hotels Trend")} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.8} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* Capacity vs. Demand -- is room supply keeping pace with visitor growth? */}
                    <div className="glass-panel p-6 flex flex-col h-[400px] mt-4">
                        <h3 className="text-lg font-bold mb-1 text-slate-100 flex items-center gap-2">
                            <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                            {t("Capacity vs. Demand")}
                        </h3>
                        <p className="text-xs text-slate-500 mb-5">{t("Room supply per 1,000 visitors (domestic + international), nationally. A rising line means capacity is outpacing demand; a falling line signals a supply crunch.")}</p>
                        <div className="flex-1 w-full h-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data?.capacityVsDemand || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} domain={[0, 'dataMax']} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} domain={[0, 'dataMax']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                        formatter={(val: any, name: any) => [
                                            name === t("Rooms per 1,000 Visitors") ? val : new Intl.NumberFormat('en-US').format(val),
                                            name
                                        ]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                    <Bar yAxisId="right" dataKey="visitors" name={t("Total Visitors")} fill="#334155" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="left" type="monotone" dataKey="roomsPer1000Visitors" name={t("Rooms per 1,000 Visitors")} stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
