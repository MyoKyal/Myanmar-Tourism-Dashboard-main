"use client";

import { useEffect, useState } from "react";
import { useGlobalFilters } from "@/lib/FilterContext";
import GlobalFilters from "@/components/GlobalFilters";
import { getExpenditureData } from "@/actions/expenditure";
import { KPICard } from "@/components/KPICard";
import { DollarSign, Coins, TrendingUp, HandCoins } from "lucide-react";
import {
    Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ComposedChart, Legend, Line, Bar
} from 'recharts';

export default function ExpenditurePage() {
    const { filters } = useGlobalFilters();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const result = await getExpenditureData(filters);
                setData(result);
            } catch (err) {
                console.error("Failed to load expenditure data", err);
            }
            setLoading(false);
        }
        fetchData();
    }, [filters]);

    const formatNumber = (num: number | string) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(Number(num) || 0);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Tourism Expenditure</h1>
                <p className="text-slate-400">Analyze the economic impact, foreign spending, and financial trends of tourism.</p>
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
                            title="Total Expenditure"
                            value={`$${formatNumber(data?.totalExpenditure)}M`}
                        icon={DollarSign}
                        colorClass="from-emerald-400 to-teal-500"
            />
                        <KPICard
                            title="Rev Per Visitor (Est)"
                            value={`$${formatNumber(data?.estimatedPerVisitor)}`}
                        icon={HandCoins}
                        colorClass="from-cyan-400 to-blue-600"
            />
                        <KPICard
                            title="Daily Spend Target"
                            value={`$${formatNumber(data?.avgPerDay)}`}
                        icon={Coins}
                        colorClass="from-amber-400 to-orange-500"
            />
                        <KPICard
                            title="Avg Stay"
                            value={`${data?.avgLengthOfStay} Nights`}
                        icon={TrendingUp}
                        colorClass="from-purple-400 to-fuchsia-600"
            />
                    </div>

                    <div className="grid grid-cols-1 gap-6 mt-4">

                        {/* Expenditure vs Visitors Composed Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[480px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                                Expenditure vs Tourist Arrivals Growth
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
                                            formatter={(val: any, name: string) => [
                                                name === 'Total Expenditure (US$)' ?`$${new Intl.NumberFormat('en-US').format(val)} M` : new Intl.NumberFormat('en-US').format(val),
                                        name === 'Total Expenditure (US$)' ? 'Expenditure in USD (Millions)' : 'Tourist Arrivals'
                        ]}
                      />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                        <Bar yAxisId="left" dataKey="Total Expenditure (US$)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                        <Line yAxisId="right" type="monotone" dataKey="Tourist Arrivals" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: "#06b6d4", strokeWidth: 2, stroke: "#020617" }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Daily spend & stay over time */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                                Average Spend per Day vs Average Length of Stay
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data?.yearlyTrends || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="left" stroke="#f59e0b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: any) => `$${val}`} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: any) => `${val} Nights`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                        <Line yAxisId="left" type="step" dataKey="Average Expenditure per day per person" stroke="#f59e0b" strokeWidth={3} dot={false} />
                                        <Area yAxisId="right" type="monotone" dataKey="Average Length of Stay (Night)" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
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
