"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getEntryPointData } from "@/actions/entry";
import { KPICard } from "@/components/KPICard";
import { PageSkeleton } from "@/components/Skeleton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { Plane, Ship, Bus, MapPinned, Gauge, PlaneTakeoff, TrendingUp } from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, LineChart, Line, ComposedChart, Legend, ReferenceLine
} from 'recharts';

// Distinct colors per named airport so the trend chart below reads at a glance -- Myeik's
// near-zero, single-year presence (see Intl_Airports.csv) still gets its own line rather
// than being dropped, since a government aviation authority reading this chart needs to see
// that it exists at all, not just the airports with real volume.
const AIRPORT_COLORS = ['#06b6d4', '#f59e0b', '#a855f7', '#10b981', '#f43f5e'];

export default function EntryPointsPage() {
    const { filters } = useGlobalFilters();
    const { t, language } = usePreferences();
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
                <PageSkeleton kpis={8} charts={4} />
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

                    {/* Airport & Flight Capacity -- aimed at airlines, CAAM (Civil Aviation
                        Authority of Myanmar), and Ministry of Hotels & Tourism capacity-planning
                        readers: which airports are growing or shrinking, and how full flights
                        actually run month to month, rather than just how visitors entered. */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">{t("Airport & Flight Capacity")}</h2>
                        <p className="text-sm text-slate-400 mt-1">{t("For airlines, airport authorities, and aviation regulators: airport-level traffic trends and how full scheduled flights actually run.")}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <KPICard
                            title={t("Busiest Airport")}
                            value={data?.busiestAirport ? formatNumber(data.busiestAirport.value) : t("N/A")}
                            subtitle={data?.busiestAirport?.name}
                            icon={PlaneTakeoff}
                            colorClass="from-cyan-400 to-blue-600"
                        />
                        <KPICard
                            title={t("Average Load Factor")}
                            value={data?.avgLoadFactor != null ? `${data.avgLoadFactor}%` : t("N/A")}
                            subtitle={t("Seats filled, monthly average")}
                            icon={Gauge}
                            colorClass="from-amber-400 to-orange-500"
                        />
                        <KPICard
                            title={t("Total Annual Flights")}
                            value={data?.totalAnnualFlights ? formatNumber(data.totalAnnualFlights) : t("N/A")}
                            subtitle={t("Scheduled international flights, most recent full year")}
                            icon={Plane}
                            colorClass="from-emerald-400 to-teal-500"
                        />
                        <KPICard
                            title={t("Widest Utilization Gap")}
                            value={data?.peakLoadMonth && data?.lowLoadMonth ? `${data.peakLoadMonth.occupancyRate}% / ${data.lowLoadMonth.occupancyRate}%` : t("N/A")}
                            subtitle={data?.peakLoadMonth && data?.lowLoadMonth ? `${t(data.peakLoadMonth.month)} ${t("vs")} ${t(data.lowLoadMonth.month)}` : undefined}
                            icon={TrendingUp}
                            colorClass="from-purple-400 to-fuchsia-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Per-Airport Arrivals Trend */}
                        <div className="glass-panel p-6 flex flex-col h-[400px] lg:col-span-2">
                            <h3 className="text-lg font-bold mb-1 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                                {t("Per-Airport Arrivals Trend")}
                            </h3>
                            <p className="text-xs text-slate-500 -mt-1 mb-4">{t("Which airports are gaining or losing international traffic over time -- relevant to runway, staffing, and route-investment decisions.")}</p>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data?.airportTrends || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} domain={[0, 'dataMax']} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                        {(data?.airportNames || []).map((name: string, i: number) => (
                                            <Line key={name} type="monotone" dataKey={name} name={name} stroke={AIRPORT_COLORS[i % AIRPORT_COLORS.length]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Flight Capacity & Occupancy */}
                        <div className="glass-panel p-6 flex flex-col h-[400px] lg:col-span-2">
                            <h3 className="text-lg font-bold mb-1 text-slate-100 flex items-center gap-2">
                                <div className="w-2 h-6 bg-orange-500 rounded-sm" />
                                {t("Flight Capacity & Occupancy")}
                            </h3>
                            <p className="text-xs text-slate-500 -mt-1 mb-4">{t("Monthly flight volume, seat capacity, and how full those seats actually were.")} {t("Months below the ~70% load-factor benchmark shown are candidates for capacity or schedule adjustments; months above it signal room to add flights.")}</p>
                            <div className="flex-1 w-full h-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data?.flightCapacity || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => language === 'my' ? t(val) : val.substring(0, 3)} />
                                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} domain={[0, 'dataMax']} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            formatter={(val: any, name: any) => [name === t("Occupancy Rate") ? `${val}%` : new Intl.NumberFormat('en-US').format(val), name]}
                                            labelFormatter={(label) => t(String(label))}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                        <Bar yAxisId="left" dataKey="seatCapacity" name={t("Seat Capacity")} fill="#334155" radius={[4, 4, 0, 0]} />
                                        <ReferenceLine yAxisId="right" y={70} stroke="#64748b" strokeDasharray="4 4" label={{ value: t("~70% breakeven benchmark"), position: 'insideTopRight', fill: '#94a3b8', fontSize: 10 }} />
                                        <Line yAxisId="right" type="monotone" dataKey="occupancyRate" name={t("Occupancy Rate")} stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: "#f59e0b", strokeWidth: 2, stroke: "#020617" }} />
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
