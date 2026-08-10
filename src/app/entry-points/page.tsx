"use client";

import { useEffect, useState } from "react";
import { useGlobalFilters } from "@/lib/FilterContext";
import GlobalFilters from "@/components/GlobalFilters";
import { getEntryPointData } from "@/actions/entry";
import { KPICard } from "@/components/KPICard";
import { Plane, Ship, Bus, MapPinned } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function EntryPointsPage() {
    const { filters } = useGlobalFilters();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const result = await getEntryPointData(filters);
                setData(result);
            } catch (err) {
                console.error("Failed to load entry points data", err);
            }
            setLoading(false);
        }
        fetchData();
    }, [filters]);

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
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Entry Point Analysis</h1>
                <p className="text-slate-400">Discover how visitors enter Myanmar via Airports, Seaports, and Land Borders.</p>
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
                            title="Total Entries"
                            value={formatNumber(data?.total)}
                            icon={MapPinned}
                            colorClass="from-cyan-400 to-blue-600"
                        />
                        <KPICard
                            title="Airports"
                            value={formatNumber(airportsVal)}
                            subtitle={data?.total > 0 ?`${((airportsVal / data.total) * 100).toFixed(1)}%` : '0%'}
                        icon={Plane}
                        colorClass="from-emerald-400 to-teal-500"
            />
                        <KPICard
                            title="Land Borders"
                            value={formatNumber(bordersVal)}
                            subtitle={data?.total > 0 ?`${((bordersVal / data.total) * 100).toFixed(1)}%` : '0%'}
                        icon={Bus}
                        colorClass="from-amber-400 to-orange-500"
            />
                        <KPICard
                            title="Seaports"
                            value={formatNumber(seaportsVal)}
                            subtitle={data?.total > 0 ?`${((seaportsVal / data.total) * 100).toFixed(1)}%` : '0%'}
                        icon={Ship}
                        colorClass="from-purple-400 to-fuchsia-600"
            />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

                        {/* Composition Pie */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-sm" />
                                Category Contribution
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.composition || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="rgba(255,255,255,0.1)"
                                        >
                                            {data?.composition?.map((entry: any, index: number) => {
                                                let color = '#f59e0b'; // borders
                                                if (entry.name === 'Airports') color = '#10b981';
                                                if (entry.name === 'Seaports') color = '#a855f7';
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

                        {/* Sub-gateways Bar */}
                        <div className="glass-panel p-6 flex flex-col h-[400px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                                Airports Breakdown
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
                                        <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trends Area Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[400px] lg:col-span-2">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                                Historical Transport Method Trends
                            </h3>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.yearlyTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#22d3ee' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />

                                        <Area type="monotone" dataKey="Land Borders" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                                        <Area type="monotone" dataKey="Airports" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                                        <Area type="monotone" dataKey="Seaports" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
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
