"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    Globe2,
    LineChart,
    PlaneTakeoff,
    Map,
    Hotel,
    Banknote,
    MapPin
    , Sun, Moon, Languages, Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/components/AppPreferences";

const navItems = [
    { name: "Overview", href: "/", icon: BarChart3 },
    { name: "International Tourism", href: "/international", icon: Globe2 },
    { name: "Time Trends", href: "/trends", icon: LineChart },
    { name: "Visa Analysis", href: "/visas", icon: PlaneTakeoff },
    { name: "Entry Points", href: "/entry-points", icon: Map },
    { name: "Hotels & Accommodation", href: "/hotels", icon: Hotel },
    { name: "Expenditure", href: "/expenditure", icon: Banknote },
    { name: "Domestic Tourism", href: "/domestic", icon: MapPin },
    { name: "Destinations Map", href: "/destinations", icon: Map },
    { name: "Decision Center", href: "/decisions", icon: Lightbulb },
];

const myanmarLabels: Record<string, string> = {
    Overview: 'အနှစ်ချုပ်', 'International Tourism': 'နိုင်ငံတကာ ခရီးသွား', 'Time Trends': 'အချိန်လိုက် လမ်းကြောင်း',
    'Visa Analysis': 'ဗီဇာ ခွဲခြမ်းစိတ်ဖြာမှု', 'Entry Points': 'ဝင်ပေါက်များ', 'Hotels & Accommodation': 'ဟိုတယ်နှင့် တည်းခိုခန်း',
    Expenditure: 'အသုံးစရိတ်', 'Domestic Tourism': 'ပြည်တွင်း ခရီးသွား', 'Destinations Map': 'ခရီးစဉ်များ မြေပုံ', 'Decision Center': 'ဆုံးဖြတ်ချက် စင်တာ'
};

export default function Sidebar() {
    const pathname = usePathname();
    const { language, setLanguage, theme, toggleTheme } = usePreferences();

    return (
        <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-slate-900/50 backdrop-blur-xl flex flex-col h-screen sticky top-0">
            <div className="h-16 flex items-center px-6 border-b border-white/10">
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent truncate flex items-center gap-2">
                    <Globe2 className="w-6 h-6 text-emerald-400" />
                    {language === 'my' ? 'မြန်မာ ခရီးသွား' : 'Myanmar Tourism'}
                </h1>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
                    {language === 'my' ? 'ခွဲခြမ်းစိတ်ဖြာမှု ဒက်ရှ်ဘုတ်' : 'Analytics Dashboard'}
                </div>

                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                isActive
                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300")} />
                            {language === 'my' ? myanmarLabels[item.name] : item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10 text-xs text-slate-500 space-y-3">
                <div className="flex gap-2">
                    <button onClick={() => setLanguage(language === 'en' ? 'my' : 'en')} className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-slate-300/50 px-2 py-1.5 hover:bg-slate-100/70" title="Change language"><Languages className="w-3.5 h-3.5" /> {language === 'en' ? 'မြန်မာ' : 'English'}</button>
                    <button onClick={toggleTheme} className="rounded-md border border-slate-300/50 px-2 py-1.5 hover:bg-slate-100/70" title="Toggle theme">{theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}</button>
                </div>
                <div>{language === 'my' ? 'ဒေတာ အပ်ဒိတ်: ၂၀၂၅ (ခန့်မှန်း)' : 'Data updated: 2025 (estimate)'}</div>
            </div>
        </aside>
    );
}
