"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getEntryPointData } from "@/actions/entry";
import { KPICard } from "@/components/KPICard";
import { PageSkeleton } from "@/components/Skeleton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { Plane, Ship, Bus, MapPinned } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

export default function EntryPointsPage() {
    const { filters } = useGlobalFilters();
    const { t } = usePreferences();
    const { data, loading, lastUpdated } = useLiveData(() => getEntryPointData(filters), [filters]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(num || 0);

    const getMetric = (type: string) => {
        if (!data?.composition) return 0;
        const match = data.composition.find((x: any) => x.name === type);
        return match ? match.value : 0;
    };

    const airportsVal = getMetric("Airports");
    const bordersVal = getMetric("Land Borders");
    const seaportsVal = getMetric("Seaports");

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("Entry Point Analysis")}</h1>
                <p className="text-slate-400">{t("Discover how visitors enter Myanmar via Airports, Seaports, and Land Borders.")}</p>
                <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
            </div>

            <GlobalFilters showYear />

            {loading ? (
                <PageSkeleton kpis={4} charts={2} />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard
                            title={t("Total Entries")}
                            value={formatNumber(data?.total ?? 0)}
                            icon={MapPinned}
                            colorClass="from-cyan-400 to-blue-600"
                        />
                        <KPICard
                            title={t("Airports")}
                            value={formatNumber(airportsVal)}
                            subtitle={data?.total && data.total > 0 ?`${((airportsVal / data.total) * 100).toFixed(1)}%` : '0%'}
                        icon={Plane}
                        colorClass="from-emerald-400 to-teal-500"
            />
                        <KPICard
                            title={t("Land Borders")}
                            value={formatNumber(bordersVal)}
                            subtitle={data?.total && data.total > 0 ?`${((bordersVal / data.total) * 100).toFixed(1)}%` : '0%'}
                        icon={Bus}
                        colorClass="from-amber-400 to-orange-500"
            />
                        <KPICard
                            title={t("Seaports")}
                            value={formatNumber(seaportsVal)}
                            subtitle={data?.total && data.total > 0 ?`${((seaportsVal / data.total) * 100).toFixed(1)}%` : '0%'}
                        icon={Ship}
                        colorClass="from-purple-400 to-fuchsia-600"
            />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

                        {/* Sub-gateways Bar */}
                        <div className="glass-panel p-6 flex flex-col h-[400px] lg:col-span-2">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                                {t("Airports Breakdown")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.airports || []} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={120} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            cursor={{ fill: '#1e293b' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Bar dataKey="value" name={t("Visitors")} fill="#06b6d4" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trends Area Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px] lg:col-span-2">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                                {t("Historical Transport Method Trends")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.yearlyTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} domain={[0, 'dataMax']} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />

                                        <Area type="monotone" dataKey="Land Borders" name={t("Land Borders")} stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                                        <Area type="monotone" dataKey="Airports" name={t("Airports")} stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                                        <Area type="monotone" dataKey="Seaports" name={t("Seaports")} stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
