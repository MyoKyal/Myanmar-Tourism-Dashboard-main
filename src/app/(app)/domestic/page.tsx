"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getDomesticData } from "@/actions/domestic";
import { KPICard } from "@/components/KPICard";
import { PageSkeleton } from "@/components/Skeleton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { Users, UserPlus, MapPin, TentTree, CalendarX } from "lucide-react";
import {
    Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';

export default function DomesticPage() {
    const { filters } = useGlobalFilters();
    const { t, language } = usePreferences();
    const { data, loading, lastUpdated } = useLiveData(() => getDomesticData(filters), [filters]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(num || 0);

    const bestRegion = data?.regions && data.regions.length > 0 ? data.regions[0] : null;
    const visitorsSubtitle = (n: number) => language === 'my' ? `ဧည့်သည် ${formatNumber(n)} ဦး` : `${formatNumber(n)} Visitors`;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("Domestic Tourism Analysis")}</h1>
                <p className="text-slate-400">{t("Evaluate local tourism footprints and regional popularity among citizens.")}</p>
                <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
            </div>

            <GlobalFilters showYear minYear={2019} />

            {loading ? (
                <PageSkeleton kpis={4} charts={2} />
            ) : !data?.regions || data.regions.length === 0 ? (
                <div className="glass-panel p-10 flex flex-col items-center text-center gap-3">
                    <CalendarX className="w-10 h-10 text-slate-500" />
                    <h3 className="text-lg font-bold text-slate-100">{t("No domestic tourism data for this year")}</h3>
                    <p className="text-sm text-slate-400 max-w-md">{t("Domestic visitor arrivals are only tracked from 2019 onward. Choose a year from 2019-2025, or select \"All\" to see every year with data.")}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard
                            title={t("Total Domestic Visitors")}
                            value={formatNumber(data?.totalDomestic ?? 0)}
                            icon={Users}
                            colorClass="from-emerald-400 to-teal-600"
                        />
                        <KPICard
                            title={t("Locals vs Internationals")}
                            value={data?.totalDomestic && data.totalDomestic > 0 ?`${((data.totalDomestic / (data.totalDomestic + data.totalIntl)) * 100).toFixed(1)}%` : '0%'}
                        subtitle={t("Share of Total Tourism")}
                        icon={UserPlus}
                        colorClass="from-cyan-400 to-blue-500"
            />
                        <KPICard
                            title={t("Top Destination")}
                            value={bestRegion ? bestRegion.name : t("N/A")}
                            subtitle={bestRegion ? visitorsSubtitle(bestRegion.visitors) : ''}
                        icon={MapPin}
                        colorClass="from-rose-400 to-pink-600"
            />
                        <KPICard
                            title={t("Regions Tracked")}
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
                                {t("Regional Popularity Ranking")}
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
                                        <Bar dataKey="visitors" name={t("Visitors")} fill="#f43f5e" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trends Composed Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[500px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                                {t("Domestic vs International Year-over-Year")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data?.yearlyTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} domain={[0, 'dataMax']} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} domain={[0, 'dataMax']} />

                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />

                                        <Area yAxisId="left" type="monotone" dataKey="domestic" name={t("Domestic Arrivals")} stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                        <Line yAxisId="right" type="monotone" dataKey="intl" name={t("Intl Arrivals")} stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} />
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
