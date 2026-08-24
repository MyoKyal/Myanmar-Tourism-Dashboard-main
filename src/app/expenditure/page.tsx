"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getExpenditureData } from "@/actions/expenditure";
import { KPICard } from "@/components/KPICard";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { DollarSign, Coins, TrendingUp, HandCoins } from "lucide-react";
import {
    Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Legend, Line, Bar
} from 'recharts';

export default function ExpenditurePage() {
    const { filters } = useGlobalFilters();
    const { t, language } = usePreferences();
    const { data, loading, lastUpdated } = useLiveData(() => getExpenditureData(filters), [filters]);

    const formatNumber = (num: number | string) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(Number(num) || 0);
    const nightsLabel = (val: any) => language === 'my' ? `${val} ${t("Nights")}` : `${val} Nights`;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("Tourism Expenditure")}</h1>
                <p className="text-slate-400">{t("Analyze the economic impact, foreign spending, and financial trends of tourism.")}</p>
                <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
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
                            title={t("Total Expenditure")}
                            value={`$${formatNumber(data?.totalExpenditure ?? 0)}M`}
                            icon={DollarSign}
                            colorClass="from-emerald-400 to-teal-500"
                        />
                        <KPICard
                            title={t("Rev Per Visitor (Est)")}
                            value={`$${formatNumber(data?.estimatedPerVisitor ?? 0)}`}
                            icon={HandCoins}
                            colorClass="from-cyan-400 to-blue-600"
                        />
                        <KPICard
                            title={t("Daily Spend Target")}
                            value={`$${formatNumber(data?.avgPerDay ?? 0)}`}
                            icon={Coins}
                            colorClass="from-amber-400 to-orange-500"
                        />
                        <KPICard
                            title={t("Avg Stay")}
                            value={nightsLabel(data?.avgLengthOfStay)}
                            icon={TrendingUp}
                            colorClass="from-purple-400 to-fuchsia-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 mt-4">

                        {/* Expenditure vs Visitors Composed Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[480px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                                {t("Expenditure vs Tourist Arrivals Growth")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data?.yearlyTrends || []} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" stroke="#10b981" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: any) => `$${formatNumber(val)}M`} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                            formatter={(val: any, name: any) => [
                                                name === 'Total Expenditure (US$)' ? `$${new Intl.NumberFormat('en-US').format(val)} M` : new Intl.NumberFormat('en-US').format(val),
                                                name === 'Total Expenditure (US$)' ? t('Expenditure in USD (Millions)') : t('Tourist Arrivals')
                                            ]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                        <Bar yAxisId="left" dataKey="Total Expenditure (US$)" name={t("Expenditure in USD (Millions)")} fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                        <Line yAxisId="right" type="monotone" dataKey="Tourist Arrivals" name={t("Tourist Arrivals")} stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: "#06b6d4", strokeWidth: 2, stroke: "#020617" }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Daily spend & stay over time */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                                {t("Average Spend per Day vs Average Length of Stay")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data?.yearlyTrends || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" stroke="#f59e0b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: any) => `$${val}`} domain={[0, 'dataMax']} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={12} tickLine={false} axisLine={false} tickFormatter={nightsLabel} domain={[0, 'dataMax']} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                            formatter={(val: any, name: any) => [
                                                name === t("Average Length of Stay (Night)") ? nightsLabel(val) : `$${val}`,
                                                name
                                            ]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                        <Line yAxisId="left" type="step" dataKey="Average Expenditure per day per person" name={t("Average Expenditure per day per person")} stroke="#f59e0b" strokeWidth={3} dot={false} />
                                        <Area yAxisId="right" type="monotone" dataKey="Average Length of Stay (Night)" name={t("Average Length of Stay (Night)")} stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
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
