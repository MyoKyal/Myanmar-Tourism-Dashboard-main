"use client";

import { useEffect, useState } from "react";
import { useGlobalFilters } from "@/lib/FilterContext";
import GlobalFilters from "@/components/GlobalFilters";
import { getIntlTourismData } from "@/actions/intl";
import { KPICard } from "@/components/KPICard";
import { Globe2, Users, Earth, TrendingUp } from "lucide-react";
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#f43f5e'];

export default function InternationalPage() {
    const { filters } = useGlobalFilters();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const result = await getIntlTourismData(filters);
                setData(result);
            } catch (err) {
                console.error("Failed to load intl data", err);
            }
            setLoading(false);
        }
        fetchData();
    }, [filters]);

    const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(num || 0);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">International Tourism Analysis</h1>
                <p className="text-slate-400">Deep dive into international visitor origins and travel footprints.</p>
            </div>

            <GlobalFilters showYear showCountry />

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KPICard
                            title="Total Intl Visitors"
                            value={formatNumber(data?.totalArrivals)}
                            icon={Users}
                        />
                        <KPICard
                            title="ASEAN Visitors"
                            value={formatNumber(data?.aseanComparison?.[0]?.value)}
                            icon={Globe2}
                            colorClass="from-emerald-400 to-teal-600"
                        />
                        <KPICard
                            title="Global Contribution"
                            value={data?.totalArrivals > 0 ? ((data?.aseanComparison?.[1]?.value / data?.totalArrivals) * 100).toFixed(1) + '%' : '0%'}
                            subtitle="From Non-ASEAN Nations"
                            icon={Earth}
                            colorClass="from-purple-400 to-fuchsia-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                        {/* Top Countries Bar Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                                Top 10 Visitor Countries
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
                                        <Bar dataKey="visitors" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ASEAN vs NON ASEAN Pie */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                                ASEAN vs Non-ASEAN
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.aseanComparison || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="rgba(255,255,255,0.1)"
                                        >
                                            {data?.aseanComparison?.map((entry: any, index: number) => (
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
