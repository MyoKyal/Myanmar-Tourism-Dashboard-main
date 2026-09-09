"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, ArrowUpRight, ShieldCheck } from "lucide-react";
import { getAlerts, type Severity } from "@/actions/alerts";
import { PageSkeleton } from "@/components/Skeleton";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import { useLiveData } from "@/lib/useLiveData";

const SEVERITY_META: Record<Severity, { icon: typeof Info; className: string; label: string; labelMm: string }> = {
  CRITICAL: { icon: AlertTriangle, className: "border-rose-800/50 bg-rose-950/30 text-rose-400", label: "Critical", labelMm: "အလွန်အရေးကြီး" },
  WARNING: { icon: AlertCircle, className: "border-amber-800/50 bg-amber-950/30 text-amber-400", label: "Warning", labelMm: "သတိပေးချက်" },
  INFO: { icon: Info, className: "border-cyan-800/50 bg-cyan-950/30 text-cyan-400", label: "Info", labelMm: "သတင်းအချက်အလက်" },
};

export default function AlertsPage() {
  const { t, language } = usePreferences();
  const { data, loading, lastUpdated } = useLiveData(() => getAlerts(), []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{t("Alert Center")}</h1>
        <p className="text-slate-400 mt-2">{t("Every statistical anomaly and overcrowding signal already computed elsewhere in this app, in one place.")}</p>
        <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
      </div>

      {loading ? (
        <PageSkeleton kpis={0} charts={1} />
      ) : data && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <p className="text-slate-300 font-semibold">{t("No active alerts.")}</p>
          <p className="text-slate-500 text-sm max-w-sm">{t("Nothing currently flagged as a statistical outlier or overcrowding signal.")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(data || []).map((alert) => {
            const meta = SEVERITY_META[alert.severity];
            const Icon = meta.icon;
            return (
              <div key={alert.id} className={`rounded-xl border p-4 flex items-start gap-3 ${meta.className}`}>
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-black/20">{language === "my" ? meta.labelMm : meta.label}</span>
                    <p className="font-semibold text-slate-100">{language === "my" ? alert.titleMm : alert.title}</p>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{language === "my" ? alert.detailMm : alert.detail}</p>
                </div>
                <Link href={alert.sourcePage} className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors">
                  {t("View")} <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
