"use client";

import { useEffect, useState } from "react";
import { useGlobalFilters } from "@/lib/FilterContext";
import GlobalFilters from "@/components/GlobalFilters";
import { getHotelsData } from "@/actions/hotels";
import { KPICard } from "@/components/KPICard";
import { Hotel, Bed, Key } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';

export default function HotelsPage() {
    const { filters } = useGlobalFilters();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const result = await getHotelsData(filters);
                setData(result);
            } catch (err) {
                console.error("Failed to load hotels data", err);
            }
            setLoading(false);
        }
        fetchData();
    }, [filters]);

    const formatNumber = (num: number | string) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(Number(num) || 0);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Hotel & Accommodation</h1>
                <p className="text-slate-400">Discover hotel capacity, room availability, and infrastructure across regions.</p>
            </div>

            <GlobalFilters showYear />

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KPICard
                            title="Total Hotels"
                            value={formatNumber(data?.totalHotels)}
                            icon={Hotel}
                            colorClass="from-amber-400 to-orange-500"
                        />
                        <KPICard
                            title="Total Rooms"
                            value={formatNumber(data?.totalRooms)}
                            icon={Bed}
                            colorClass="from-rose-400 to-pink-500"
                        />
                        <KPICard
                            title="Avg Rooms Per Hotel"
                            value={data?.avgRoomsPerHotel}
                            icon={Key}
                            colorClass="from-cyan-400 to-blue-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">

                        {/* Top Regions */}
                        <div className="glass-panel p-6 flex flex-col h-[450px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-rose-500 rounded-sm" />
                                Top Regions by Capacity
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
                                            formatter={(val: any, name: any) => [new Intl.NumberFormat('en-US').format(val), name === 'rooms' ? 'Rooms' : 'Hotels']}
                                        />
                                        <Bar dataKey="rooms" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trends Area Chart */}
                        <div className="glass-panel p-6 flex flex-col h-[450px]">
                            <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-amber-500 rounded-sm" />
                                Hotel Capacity Growth
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
                                            formatter={(val: any, name: any) => [new Intl.NumberFormat('en-US').format(val), name === 'rooms' ? 'Total Rooms' : 'Total Hotels']}
                                        />

                                        <Area yAxisId="left" type="monotone" dataKey="rooms" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.5} />
                                        <Area yAxisId="right" type="monotone" dataKey="hotels" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.8} />
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
