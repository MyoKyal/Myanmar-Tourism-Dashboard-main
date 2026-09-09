"use client";

import { useEffect, useState } from "react";
import { Briefcase, Info, Gauge, Users, Hotel, Banknote, CalendarClock, Tag, Bot, Hammer } from "lucide-react";
import { usePreferences } from "@/components/AppPreferences";
import { useSession } from "@/components/SessionProvider";
import { getBusinessDestinationOptions, getBusinessMarketInsights, type BusinessMarketInsights } from "@/actions/business";
import { KPICard } from "@/components/KPICard";
import { PageSkeleton } from "@/components/Skeleton";

const LEVEL_META: Record<BusinessMarketInsights["pressureLevel"], { label: string; labelMm: string; colorClass: string }> = {
  LOW: { label: "Low pressure", labelMm: "ဖိအားနည်း", colorClass: "from-emerald-400 to-teal-500" },
  MODERATE: { label: "Moderate", labelMm: "အလယ်အလတ်", colorClass: "from-cyan-400 to-blue-500" },
  HIGH: { label: "High pressure", labelMm: "ဖိအားများ", colorClass: "from-amber-400 to-orange-500" },
  OVERCROWDED: { label: "Overcrowded signal", labelMm: "လူပိုလျှံနေသည့် အချက်ပြ", colorClass: "from-rose-400 to-red-500" },
  UNKNOWN: { label: "No data", labelMm: "ဒေတာမရှိ", colorClass: "from-slate-500 to-slate-600" },
};

const SEASON_META: Record<BusinessMarketInsights["seasonNow"], { label: string; labelMm: string }> = {
  peak: { label: "Peak season", labelMm: "အထွတ်အထိပ်ရာသီ" },
  shoulder: { label: "Shoulder season", labelMm: "အလယ်ကာလ" },
  off: { label: "Off season", labelMm: "ရာသီပြင်ပ" },
};

// Real regional market signals (already computed for Crowd Monitoring / Decision Center /
// AI Itinerary), scoped to whichever destination a business owner picks -- not a fake
// occupancy/booking/revenue number for their own listing. That needs a business account
// linked to an actual hotel or tour-operator record, which doesn't exist in the data model
// yet (Phase 3 of the roadmap: "Manage hotels", "Manage tour operators", ownership linking).
// Showing invented numbers for a specific property would violate the real-vs-simulated-data
// discipline the rest of this app is built around; this gives real, actionable data instead.
export default function BusinessPage() {
  const { t, language } = usePreferences();
  const user = useSession();
  const [destinations, setDestinations] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [insights, setInsights] = useState<BusinessMarketInsights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBusinessDestinationOptions().then(setDestinations);
  }, []);

  useEffect(() => {
    if (!selected) {
      setInsights(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getBusinessMarketInsights(selected).then((data) => {
      if (!cancelled) {
        setInsights(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const pressureMeta = insights ? LEVEL_META[insights.pressureLevel] : null;
  const seasonMeta = insights ? SEASON_META[insights.seasonNow] : null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-900/30 border border-purple-800/40 flex items-center justify-center text-purple-400 shrink-0">
          <Briefcase className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t("Business Dashboard")}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {user.businessName ? `${user.businessName} — ` : ""}
            {t("Real market signals for the destinations you operate in.")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-800/30 bg-cyan-950/20 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400">
          {t("This shows real regional market data -- accommodation pressure, seasonality, and typical cost for a destination -- not booking, occupancy, or revenue figures for your own listing. That needs your account linked to an actual hotel or tour-operator record, which isn't built yet (Phase 3 of the platform roadmap).")}
        </p>
      </div>

      <div className="glass-panel p-5">
        <label className="flex flex-col gap-1.5 max-w-sm">
          <span className="text-sm font-semibold text-slate-400">{t("Market / destination")}</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-slate-700/50 bg-slate-950/50 px-3 py-2.5 text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none"
          >
            <option value="">{t("Choose a destination to see its market signal")}</option>
            {destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      {!selected && (
        <div className="rounded-xl border border-dashed border-slate-700/50 p-6 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
          <Hammer className="w-5 h-5 text-amber-400" />
          {t("Pick a destination above to see its current accommodation pressure, seasonality, and market category.")}
        </div>
      )}

      {selected && loading && <PageSkeleton kpis={6} charts={0} />}

      {selected && !loading && !insights && (
        <div className="rounded-xl border border-dashed border-slate-700/50 p-6 text-center text-sm text-slate-500">
          {t("No market data is available for this destination yet.")}
        </div>
      )}

      {selected && !loading && insights && pressureMeta && seasonMeta && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              title={t("Accommodation pressure")}
              value={language === "my" ? pressureMeta.labelMm : pressureMeta.label}
              icon={Gauge}
              colorClass={pressureMeta.colorClass}
              subtitle={`${insights.roomsPer1000Visitors ?? t("N/A")} ${t("vs")} ${insights.nationalMedianRoomsPer1000 ?? t("N/A")} ${t("rooms/1,000 visitors (national median)")}`}
            />
            <KPICard
              title={t("Domestic visitors")}
              value={`${(insights.domesticVisitors / 1000).toFixed(0)}K`}
              icon={Users}
              colorClass="from-cyan-400 to-blue-500"
              subtitle={`${insights.region} · ${insights.year}`}
            />
            <KPICard
              title={t("Hotel rooms in region")}
              value={insights.hotelRooms.toLocaleString()}
              icon={Hotel}
              colorClass="from-blue-400 to-indigo-500"
              subtitle={insights.region}
            />
            <KPICard
              title={t("Typical daily cost")}
              value={`$${insights.dailyCost}`}
              icon={Banknote}
              colorClass="from-emerald-400 to-teal-500"
              subtitle={insights.destination}
            />
            <KPICard
              title={t("Season right now")}
              value={language === "my" ? seasonMeta.labelMm : seasonMeta.label}
              icon={CalendarClock}
              colorClass={insights.seasonNow === "peak" ? "from-amber-400 to-orange-500" : insights.seasonNow === "shoulder" ? "from-cyan-400 to-blue-500" : "from-slate-500 to-slate-600"}
              subtitle={insights.peakMonths.length ? `${t("Peak")}: ${insights.peakMonths.slice(0, 3).map((m) => t(m)).join(", ")}` : t("Varies")}
            />
            <KPICard
              title={t("Market category")}
              value={(language === "my" ? insights.clusterLabelMm : insights.clusterLabel) || t("N/A")}
              icon={Tag}
              colorClass="from-purple-400 to-fuchsia-500"
              subtitle={t("Data-driven, by cost and safety")}
            />
          </div>

          {insights.aiInsight && (
            <div className="glass-panel p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-purple-400 flex items-center gap-1.5 mb-2">
                <Bot className="w-3.5 h-3.5" /> {t("AI Insight")} · English
              </p>
              <p className="text-sm text-slate-300">{insights.aiInsight}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
