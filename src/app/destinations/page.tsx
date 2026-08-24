"use client";

import { useGlobalFilters } from "@/lib/FilterContext";
import { useLiveData } from "@/lib/useLiveData";
import GlobalFilters from "@/components/GlobalFilters";
import { getDestinationsMapData } from "@/actions/destinations";
import { LiveIndicator } from "@/components/LiveIndicator";
import { usePreferences } from "@/components/AppPreferences";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamically import map component because react-simple-maps requires browser APIs
const MapComponent = dynamic(() => import("./MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center w-full h-full min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
    )
}) as React.FC<{ data: any }>;

export default function DestinationsPage() {
    const { filters } = useGlobalFilters();
    const { t } = usePreferences();
    const { data, loading, lastUpdated } = useLiveData(() => getDestinationsMapData(filters), [filters]);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{t("Interactive Destination Map")}</h1>
                <p className="text-slate-400">{t("Explore travel metrics and best seasons visually across Myanmar's regions.")}</p>
                <div className="mt-2"><LiveIndicator lastUpdated={lastUpdated} /></div>
            </div>

            <GlobalFilters showYear />

            {loading && !data ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
                    <div className="glass-panel p-6 flex flex-col min-h-[600px] lg:col-span-12">
                        <h3 className="text-lg font-bold mb-4 text-slate-100 flex items-center gap-2">
                            <div className="w-2 h-6 bg-cyan-500 rounded-sm" />
                            {t("Myanmar State & Region Metrics")}
                        </h3>
                        <div className="flex-1 w-full bg-slate-900/50 rounded-xl overflow-hidden relative">
                            {data && <MapComponent data={data} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
