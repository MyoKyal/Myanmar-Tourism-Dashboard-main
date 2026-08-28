"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getIntlTourismData } from "@/actions/intl";
import { KPICard } from "@/components/KPICard";
import { PageSkeleton } from "@/components/Skeleton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { Globe2, Users, Earth, TrendingUp } from "lucide-react";
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, ComposedChart, Line
} from 'recharts';

const PIE_COLORS = ['#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#f43f5e'];

export default function InternationalPage() {
    const { filters, setFilter } = useGlobalFilters();
    const { t } = usePreferences();
    const { data, loading, lastUpdated } = useLiveData(() => getIntlTourismData(filters), [filters]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(num || 0);
    const aseanComparison = data?.aseanComparison?.map((row: any) => ({ ...row, name: t(row.name) }));
    const revenueBenchmark = data?.revenueBenchmark?.map((row: any) => ({ ...row, label: `${t(row.country)} (${row.year})` }));

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("International Tourism Analysis")}</h1>
                <p className="text-slate-400">{t("Deep dive into international visitor origins and travel footprints.")}</p>
                <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
            </div>

            <GlobalFilters showYear />

            {loading ? (
                <PageSkeleton kpis={3} charts={4} />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KPICard
                            title={t("Total Intl Visitors")}
                            value={formatNumber(data?.totalArrivals ?? 0)}
                            icon={Users}
                        />
                        <KPICard
                            title={t("ASEAN Visitors")}
                            value={formatNumber(data?.aseanComparison?.[0]?.value ?? 0)}
                            icon={Globe2}
                            colorClass="from-emerald-400 to-teal-600"
                        />
                        <KPICard
                            title={t("Global Contribution")}
                            value={data?.totalArrivals && data.totalArrivals > 0 ? ((data?.aseanComparison?.[1]?.value / data.totalArrivals) * 100).toFixed(1) + '%' : '0%'}
                            subtitle={t("From Non-ASEAN Nations")}
                            icon={Earth}
                            colorClass="from-purple-400 to-fuchsia-600"
                        />
                    </div>

                    {/* Myanmar vs selected ASEAN country */}
                    <div className="glass-panel p-6 flex flex-col mt-4">
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                            <div>
                                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                                    {t("Myanmar vs ASEAN Country")}
                                </h3>
                                <p className="text-sm text-slate-400 mt-1 max-w-xl">{t("Compare Myanmar's total international arrivals against one ASEAN country's arrivals, year by year.")}</p>
                            </div>
                            <div className="flex flex-col gap-1.5 min-w-[160px]">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">{t("Compare with")}</label>
                                <select
                                    className="bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none"
                                    value={data?.selectedCountry || ''}
                                    onChange={(e) => setFilter('country', e.target.value)}
                                >
                                    {(data?.aseanCountries || []).map((c: string) => <option key={c} value={c}>{t(c)}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="w-full h-[350px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data?.comparison || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#f59e0b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} domain={[0, 'dataMax']} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} domain={[0, 'dataMax']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                        formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                    <Bar yAxisId="left" dataKey="country" name={t(data?.selectedCountry || '')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="myanmar" name={t("Myanmar (Total Arrivals)")} stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ASEAN tourism revenue benchmark -- real World Bank receipts, not just visitor counts */}
                    <div className="glass-panel p-6 flex flex-col mt-4">
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <div className="w-2 h-6 bg-rose-500 rounded-sm" />
                            {t("ASEAN Tourism Revenue Benchmark")}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1 mb-4 max-w-2xl">{t("International tourism receipts (World Bank), each country shown for its own most recently reported year since reporting timelines differ.")}</p>
                        <div className="w-full h-[420px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueBenchmark || []} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val: any) => `$${formatNumber(val)}M`} />
                                    <YAxis dataKey="label" type="category" stroke="#94a3b8" fontSize={11} width={130} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                        cursor={{ fill: '#1e293b' }}
                                        formatter={(val: any) => [`$${new Intl.NumberFormat('en-US').format(val)}M`, t("Tourism Receipts")]}
                                    />
                                    <Bar dataKey="receiptsUsdM" radius={[0, 4, 4, 0]}>
                                        {(revenueBenchmark || []).map((row: any) => (
                                            <Cell key={row.country} fill={row.isMyanmar ? '#f43f5e' : '#06b6d4'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                        {/* Top Countries Bar Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                                {t("Top 10 Visitor Countries")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.topCountries || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <YAxis dataKey="country" type="category" stroke="#94a3b8" fontSize={11} width={80} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            cursor={{ fill: '#1e293b' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Bar dataKey="visitors" name={t("Visitors")} fill="#06b6d4" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ASEAN vs NON ASEAN Pie */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                                {t("ASEAN vs Non-ASEAN")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={aseanComparison || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="rgba(255,255,255,0.1)"
                                        >
                                            {aseanComparison?.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#a855f7'} />
                      ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
