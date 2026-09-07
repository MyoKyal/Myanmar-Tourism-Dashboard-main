"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getOverviewKPIs, getOverviewChartsData } from "@/actions/tourism";
import { getBusinessSnapshot } from "@/actions/businessSnapshot";
import { getCorrelationInsights } from "@/actions/insights";
import { KPICard } from "@/components/KPICard";
import { PageSkeleton } from "@/components/Skeleton";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { Plane, Users, Hotel, DollarSign, Bed, Landmark, Target, Award, GitCompareArrows } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

export default function OverviewDashboard() {
  const { filters } = useGlobalFilters();
  const { t, language } = usePreferences();
  const text = language === 'my';

  const { data, loading, lastUpdated } = useLiveData(async () => {
    const [kpis, charts, business, correlations] = await Promise.all([getOverviewKPIs(filters), getOverviewChartsData(filters), getBusinessSnapshot(filters), getCorrelationInsights()]);
    return { kpis, charts, business, correlations };
  }, [filters]);
  const kpiData = data?.kpis;
  const chartData = data?.charts;
  const business = data?.business;
  const correlations = data?.correlations;

  // Color by direction + magnitude rather than a fixed palette per card, so the strongest
  // relationships are visually louder than the weak/negligible ones.
  const correlationColor = (direction: string, r: number | null) => {
    const abs = Math.abs(r ?? 0);
    if (direction === 'none' || r == null) return { border: 'border-slate-700/50', text: 'text-slate-400', bg: 'bg-slate-800/40' };
    if (direction === 'positive') return abs >= 0.7 ? { border: 'border-emerald-800/50', text: 'text-emerald-400', bg: 'bg-emerald-900/30' } : { border: 'border-cyan-800/50', text: 'text-cyan-400', bg: 'bg-cyan-900/30' };
    return abs >= 0.7 ? { border: 'border-rose-800/50', text: 'text-rose-400', bg: 'bg-rose-900/30' } : { border: 'border-amber-800/50', text: 'text-amber-400', bg: 'bg-amber-900/30' };
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num || 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("Main Overview")}</h1>
          <p className="text-slate-400">{t("High-level analysis of Myanmar's tourism performance.")}</p>
          <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
        </div>
        <ExportCsvButton data={chartData?.yearlyIntl} filename="myanmar-tourism-yearly-arrivals.csv" label={t("Export Arrivals CSV")} />
      </div>

      <GlobalFilters showYear />

      {loading ? (
        <PageSkeleton kpis={5} charts={2} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <KPICard
              title={t("Intl Visitors")}
              value={formatNumber(kpiData?.intlVisitors ?? 0)}
              icon={Plane}
              colorClass="from-blue-400 to-indigo-600"
            />
            <KPICard
              title={t("Domestic Visitors")}
              value={formatNumber(kpiData?.domesticVisitors ?? 0)}
              icon={Users}
              colorClass="from-emerald-400 to-teal-600"
            />
            <KPICard
              title={t("Total Hotels")}
              value={formatNumber(kpiData?.hotelsCount ?? 0)}
              icon={Hotel}
              colorClass="from-amber-400 to-orange-600"
            />
            <KPICard
              title={t("Total Rooms")}
              value={formatNumber(kpiData?.roomsCount ?? 0)}
              icon={Bed}
              colorClass="from-rose-400 to-pink-600"
            />
            <KPICard
              title={t("Expenditure ($)")}
              value={formatNumber(kpiData?.expenditureTotal ?? 0) + 'M'}
              icon={DollarSign}
              colorClass="from-cyan-400 to-blue-500"
            />
          </div>

          {/* Business Snapshot -- one stat tile per business angle built across the
              Expenditure, Hotels, and International pages, each with a trend sparkline
              so the headline number never appears without its trajectory. */}
          <div className="mt-2">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">{t("Business Snapshot")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KPICard
                title={t("Tourism's Share of GDP")}
                value={business?.gdp.valuePct != null ? `${business.gdp.valuePct}%` : t("N/A")}
                subtitle={business?.gdp.year ? `${business.gdp.year} · ${t("World Bank GDP data")}` : undefined}
                trend={business?.gdp.deltaPct != null ? { value: Math.abs(business.gdp.deltaPct), isPositive: business.gdp.deltaPct >= 0 } : undefined}
                sparkline={business?.gdp.trend}
                icon={Landmark}
                colorClass="from-rose-400 to-red-600"
              />
              <KPICard
                title={business?.revenueForecast.year ? `${business.revenueForecast.year} ${t("Revenue Forecast")}` : t("Revenue Forecast")}
                value={business?.revenueForecast.projectedUsdM != null ? `$${formatNumber(business.revenueForecast.projectedUsdM)}M` : t("N/A")}
                subtitle={t("5yr trailing trend")}
                trend={business?.revenueForecast.growthRateUsed != null ? { value: Math.abs(business.revenueForecast.growthRateUsed), isPositive: business.revenueForecast.growthRateUsed >= 0 } : undefined}
                sparkline={business?.revenueForecast.trend}
                icon={Target}
                colorClass="from-fuchsia-400 to-purple-600"
              />
              <KPICard
                title={t("ASEAN Revenue Rank")}
                value={business?.aseanRank.rank ? `#${business.aseanRank.rank} ${t("of")} ${business.aseanRank.outOf}` : t("N/A")}
                subtitle={business?.aseanRank.receiptsUsdM ? `$${formatNumber(business.aseanRank.receiptsUsdM)}M · ${business.aseanRank.year}` : undefined}
                icon={Award}
                colorClass="from-amber-400 to-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Chart 1 */}
            <div className="glass-panel p-6 flex flex-col h-[400px]">
              <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                {t("International Arrivals by Year")}
              </h3>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData?.yearlyIntl || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} domain={[0, 'dataMax']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      itemStyle={{ color: '#22d3ee' }}
                      formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                    />
                    <Area type="monotone" dataKey="visitors" name={t("Visitors")} stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorVis)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2 */}
            <div className="glass-panel p-6 flex flex-col h-[400px]">
              <h3 className="text-lg font-bold mb-6 text-slate-100 flex items-center gap-2">
                <div className="w-2 h-6 bg-purple-500 rounded-sm" />
                {t("Monthly Aggregate Interntional Visitors")}
              </h3>
              <div className="flex-1 w-full h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData?.monthlyIntl || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={60} tickFormatter={(val) => t(String(val))} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(value)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      cursor={{ fill: '#1e293b' }}
                      formatter={(val: any) => new Intl.NumberFormat('en-US').format(val)}
                      labelFormatter={(label) => t(String(label))}
                    />
                    <Bar dataKey="visitors" name={t("Visitors")} fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Correlation Insights -- Pearson correlation coefficients between real metric
              pairs, not just two charts placed side by side. Every pair is drawn from data
              already ingested for other features this session, aligned to their shared
              years; n (years of overlapping data) is shown alongside r since ~10-year
              series support a suggestive read, not a statistically airtight one. */}
          <div className="glass-panel p-6 mt-4">
            <h3 className="text-lg font-bold mb-1 text-slate-100 flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-cyan-400" />
              {t("Correlation Insights")}
            </h3>
            <p className="text-xs text-slate-500">{t("How strongly key metrics actually move together across years, measured with Pearson correlation (r).")}</p>
            <p className="text-xs text-slate-500 mb-5 italic">{t("Correlation shows two metrics moved together, not that one caused the other -- e.g. hotel supply and arrivals decoupled during the pandemic years, not because either drove the other down.")}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(correlations || []).map((c: any) => {
                const color = correlationColor(c.direction, c.r);
                return (
                  <div key={c.id} className={`rounded-lg border p-4 ${color.border} ${color.bg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-200">{text ? c.labelMm : c.label}</p>
                      <span className={`shrink-0 text-lg font-extrabold ${color.text}`}>{c.r != null ? `r=${c.r}` : t("N/A")}</span>
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${color.text}`}>{text ? c.strengthMm : c.strength}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{t("Based on")} {c.n} {t("years of overlapping data")}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
