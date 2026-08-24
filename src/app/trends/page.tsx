"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getTrendsData } from "@/actions/trends";
import { KPICard } from "@/components/KPICard";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { LineChart as LineChartIcon, Activity, CalendarDays, TrendingUp, Target } from "lucide-react";
import {
    AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, ComposedChart, Cell
} from 'recharts';

export default function TrendsPage() {
    const { filters } = useGlobalFilters();
    const { t, language } = usePreferences();
    const { data, loading, lastUpdated } = useLiveData(() => getTrendsData(filters), [filters]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(num || 0);

    const getLatestYoY = () => {
        if (!data?.yearly || data.yearly.length === 0) return { value: 0, isPositive: true };
        const latest = data.yearly[data.yearly.length - 1];
        return { value: latest.yoy, isPositive: latest.yoy >= 0 };
    };

    const trendYoY = getLatestYoY();

    const exportRows = [
        ...(data?.yearly || []).map((r: any) => ({ year: r.year, visitors: r.total, yoy_growth_pct: r.yoy, type: "actual" })),
        ...(data?.forecast ? [{ year: data.forecast.year, visitors: data.forecast.projected, yoy_growth_pct: data.forecast.growthRateUsed, type: "forecast" }] : [])
    ];

    const bestMonth = data?.seasonality ? [...data.seasonality].sort((a: any, b: any) => b.total - a.total)[0]?.month : null;
    const bestMonthValue = bestMonth ? (language === 'my' ? t(bestMonth) : bestMonth.substring(0, 3)) : t("N/A");

    const forecastSubtitle = data?.forecast
        ? (language === 'my'
            ? `လွန်ခဲ့သော ${data.forecast.windowYears} နှစ် လမ်းကြောင်း၊ လတ်တလောနှစ်နှင့်နှိုင်းစာလျှင် ${data.forecast.growthRateUsed >= 0 ? '+' : ''}${data.forecast.growthRateUsed}%`
            : `Trend over last ${data.forecast.windowYears}yr, ${data.forecast.growthRateUsed >= 0 ? '+' : ''}${data.forecast.growthRateUsed}% vs latest year`)
        : undefined;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("Time Trend Analysis")}</h1>
                    <p className="text-slate-400">{t("Evaluate year-over-year growth, monthly seasonality, and pandemic impact.")}</p>
                    <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
                </div>
                <ExportCsvButton data={exportRows} filename="myanmar-tourism-trends.csv" label={t("Export Trends CSV")} />
            </div>

            <GlobalFilters showYear />

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <KPICard
                            title={t("Latest Year Growth")}
                            value={`${trendYoY.value}%`}
                            icon={TrendingUp}
                            trend={trendYoY}
                            colorClass="from-cyan-400 to-blue-500"
                        />
                        <KPICard
                            title={t("Best Performing Month")}
                            value={bestMonthValue}
                            icon={CalendarDays}
                            colorClass="from-emerald-400 to-teal-500"
                        />
                        <KPICard
                            title={t("Pre-COVID Peak")}
                            value={formatNumber(data?.periods?.find((p: any) => p.period.includes('Pre'))?.total || 0)}
                            icon={Activity}
                            colorClass="from-purple-400 to-fuchsia-600"
                        />
                        <KPICard
                            title={data?.forecast ? `${data.forecast.year} ${t("Forecast")}` : t("Forecast")}
                            value={data?.forecast ? formatNumber(data.forecast.projected) : t("N/A")}
                            icon={Target}
                            subtitle={forecastSubtitle}
                            colorClass="from-amber-400 to-orange-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                        {/* YoY Trend Line Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                                {t("Year-over-Year Growth Trend")}
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
                                            formatter={(val: any, name: any) => [
                                                name === 'total' ? new Intl.NumberFormat('en-US').format(val) : `${val}%`,
                                                name === 'total' ? t('Visitors') : t('YoY Growth')
                                            ]}
                                        />
                                        <Bar yAxisId="left" dataKey="total" name={t("Visitors")} fill="#334155" radius={[4, 4, 0, 0]} />
                                        <Line yAxisId="right" type="monotone" dataKey="yoy" name={t("YoY Growth")} stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#020617" }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Monthly Seasonality Area Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-purple-500 rounded-sm" />
                                {t("Monthly Seasonality")}
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
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => language === 'my' ? t(val) : val.substring(0, 3)} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                            labelFormatter={(label) => t(String(label))}
                                        />
                                        <Area type="monotone" dataKey="total" name={t("Visitors")} stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorMonth)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* COVID Impact Bar */}
                        <div className="glass-panel p-6 flex flex-col h-[400px] lg:col-span-2">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-rose-500 rounded-sm" />
                                {t("Pandemic Impact Timeline")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.periods || []} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <YAxis type="category" dataKey="period" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={100} tickFormatter={(label) => t(label)} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            cursor={{ fill: '#1e293b' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                            labelFormatter={(label) => t(String(label))}
                                        />
                                        <Bar dataKey="total" name={t("Visitors")} radius={[0, 4, 4, 0]}>
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
