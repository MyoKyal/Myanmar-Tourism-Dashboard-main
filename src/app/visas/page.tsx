"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getVisaData } from "@/actions/visa";
import { KPICard } from "@/components/KPICard";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { Briefcase, Plane, PlaneTakeoff } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

export default function VisasPage() {
    const { filters } = useGlobalFilters();
    const { t, language } = usePreferences();
    const { data, loading, lastUpdated } = useLiveData(() => getVisaData(filters), [filters]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(num || 0);

    const getMetric = (type: string) => {
        if (!data?.visaDistribution) return 0;
        const match = data.visaDistribution.find((x: any) => x.name === type);
        return match ? match.value : 0;
    };

    const tourist = getMetric("Tourist");
    const business = getMetric("Business");

    const touristPct = data?.total ? ((tourist / data.total) * 100).toFixed(1) : 0;
    const businessPct = data?.total ? ((business / data.total) * 100).toFixed(1) : 0;
    const arrivalsSubtitle = (n: number) => language === 'my' ? `ဧည့်သည် ${formatNumber(n)} ဦး` : `${formatNumber(n)} arrivals`;

    const visaDistribution = data?.visaDistribution?.map((row: any) => ({ ...row, name: t(row.name) }));

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("Visa Analysis")}</h1>
                <p className="text-slate-400">{t("Discover breakdown of visitor types and their historical trends.")}</p>
                <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
            </div>

            <GlobalFilters showYear showVisaType />

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KPICard
                            title={t("Tourist Visas")}
                            value={`${touristPct}%`}
                        subtitle={arrivalsSubtitle(tourist)}
                        icon={Plane}
                        colorClass="from-emerald-400 to-teal-500"
            />
                        <KPICard
                            title={t("Business Visas")}
                            value={`${businessPct}%`}
                        subtitle={arrivalsSubtitle(business)}
                        icon={Briefcase}
                        colorClass="from-blue-400 to-indigo-600"
            />
                        <KPICard
                            title={t("Total Visas Processed")}
                            value={formatNumber(data?.total ?? 0)}
                            icon={PlaneTakeoff}
                            colorClass="from-purple-400 to-fuchsia-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

                        {/* Pie Distribution */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                                {t("Visa Type Distribution")}
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={visaDistribution || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={110}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="rgba(255,255,255,0.1)"
                                        >
                                            {data?.visaDistribution?.map((entry: any, index: number) => {
                                                let color = '#3b82f6'; // others
                                                if (entry.name === 'Tourist') color = '#10b981';
                                                if (entry.name === 'Business') color = '#8b5cf6';
                                                return <Cell key={`cell-${index}`} fill={color} />;
                      })}
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

                        {/* Trends Area Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                                {t("Historical Visa Trends")}
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

                                        {(!filters.visaType || filters.visaType === 'All' || filters.visaType === 'Tourist') &&
                                            <Area type="monotone" dataKey="Tourist" name={t("Tourist")} stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                                        }
                                        {(!filters.visaType || filters.visaType === 'All' || filters.visaType === 'Business') &&
                                            <Area type="monotone" dataKey="Business" name={t("Business")} stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                                        }
                                        {(!filters.visaType || filters.visaType === 'All' || filters.visaType === 'Others') &&
                                            <Area type="monotone" dataKey="Others" name={t("Others")} stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                                        }
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
