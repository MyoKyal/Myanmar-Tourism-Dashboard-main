"use client";

import { Menu, Globe2 } from "lucide-react";
import { usePreferences } from "@/components/AppPreferences";

export default function MobileHeader() {
    const { language, setMobileNavOpen, t } = usePreferences();

    return (
        <div className="lg:hidden sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-white/10 bg-slate-900/70 backdrop-blur-xl mobile-header">
            <button
                onClick={() => setMobileNavOpen(true)}
                className="p-2 -ml-2 rounded-lg text-slate-300 hover:bg-white/10"
                aria-label={t("Open navigation")}
            >
                <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2 truncate">
                <Globe2 className="w-5 h-5 text-emerald-400 shrink-0" />
                {language === 'my' ? 'မြန်မာ ခရီးသွား' : 'Myanmar Tourism'}
            </h1>
        </div>
    );
}
