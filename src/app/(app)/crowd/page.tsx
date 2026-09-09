"use client";

import { AlertTriangle, Gauge, Info } from "lucide-react";
import { getCrowdMonitoring } from "@/actions/crowd";
import { PageSkeleton } from "@/components/Skeleton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { useLiveData } from "@/lib/useLiveData";

const LEVEL_META: Record<string, { label: string; labelMm: string; className: string }> = {
  LOW: { label: "Low pressure", labelMm: "ဖိအားနည်း", className: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50" },
  MODERATE: { label: "Moderate", labelMm: "အလယ်အလတ်", className: "bg-cyan-900/40 text-cyan-400 border-cyan-800/50" },
  HIGH: { label: "High pressure", labelMm: "ဖိအားများ", className: "bg-amber-900/40 text-amber-400 border-amber-800/50" },
  OVERCROWDED: { label: "Overcrowded signal", labelMm: "လူပိုလျှံနေသည့် အချက်ပြ", className: "bg-rose-900/40 text-rose-400 border-rose-800/50" },
  UNKNOWN: { label: "No data", labelMm: "ဒေတာမရှိ", className: "bg-slate-800 text-slate-500 border-slate-700/50" },
};

export default function CrowdMonitoringPage() {
  const { t, language } = usePreferences();
  const { data, loading, lastUpdated } = useLiveData(() => getCrowdMonitoring(), []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{t("Crowd Monitoring")}</h1>
        <p className="text-slate-400 mt-2">{t("Which destinations are under more visitor pressure relative to their own accommodation capacity.")}</p>
        <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
      </div>

      <div className="rounded-xl border border-cyan-800/30 bg-cyan-950/20 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400">
          {t("This app has no live visitor-counting or ticketing feed, so \"crowd level\" here is an accommodation-pressure proxy -- real hotel-room supply against real domestic-visitor volume, benchmarked against the national median of that same ratio (median, not average, so one outlier region can't skew every other destination's rating) -- not a live headcount. Destinations sharing a region (e.g. Bagan and Mandalay) share one signal, since visitor and hotel data isn't tracked at city level.")}
        </p>
      </div>

      {loading ? (
        <PageSkeleton kpis={1} charts={2} />
      ) : (
        <>
          <div className="glass-panel p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-slate-800 text-slate-300 border-slate-700/50">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{t("National median")}</p>
              <p className="text-lg font-bold text-white">{data?.nationalMedianRoomsPer1000 ?? "—"} {t("rooms per 1,000 domestic visitors")}</p>
              <p className="text-xs text-slate-500">{data?.year} {t("data")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.signals || []).map((s) => {
              const meta = LEVEL_META[s.pressureLevel];
              return (
                <div key={s.destination} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-bold text-slate-100">{t(s.destination)}</p>
                    {s.pressureLevel === "OVERCROWDED" && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                  </div>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border mb-3 ${meta.className}`}>
                    {language === "my" ? meta.labelMm : meta.label}
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-slate-500">{t("Rooms/1000 visitors")}</p><p className="text-slate-200 font-semibold">{s.roomsPer1000Visitors ?? t("N/A")}</p></div>
                    <div><p className="text-slate-500">{t("Domestic visitors")}</p><p className="text-slate-200 font-semibold">{(s.domesticVisitors / 1000).toFixed(0)}K</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
