"use client";

import { useEffect, useState } from "react";
import { usePreferences } from "@/components/AppPreferences";

function formatAgo(lastUpdated: Date, language: "en" | "my", t: (text: string) => string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    if (seconds < 5) return t("just now");
    if (seconds < 60) return language === "my" ? `စက္ကန့် ${seconds} အကြာက` : `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return language === "my" ? `မိနစ် ${minutes} အကြာက` : `${minutes}m ago`;
}

export function LiveIndicator({ lastUpdated }: { lastUpdated: Date | null }) {
    const { language, t } = usePreferences();
    const [ago, setAgo] = useState<string | null>(null);

    useEffect(() => {
        function tick() {
            setAgo(lastUpdated ? formatAgo(lastUpdated, language, t) : null);
        }
        tick();
        if (!lastUpdated) return;
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [lastUpdated, language, t]);

    if (!lastUpdated || ago === null) return null;

    return (
        <div className="flex items-center gap-2 text-xs text-slate-400" title={lastUpdated.toLocaleTimeString()}>
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-emerald-400">{t("Live")}</span>
            <span>· {ago}</span>
        </div>
    );
}
