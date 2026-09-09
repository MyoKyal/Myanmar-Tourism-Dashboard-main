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
    , Sun, Moon, Languages, Lightbulb, X, Briefcase, LogOut, Settings2, Route, Gauge, Bell, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/components/AppPreferences";
import { useSession } from "@/components/SessionProvider";
import { logoutAction } from "@/actions/auth";
import { canAccessPath, type Role } from "@/lib/auth";

// Grouped instead of one flat list of 10 -- easier to scan, and each group name gives a
// quick sense of what lives inside it before the user even reads the individual items.
const navGroups = [
    {
        label: "Analytics", labelMm: "ခွဲခြမ်းစိတ်ဖြာမှု",
        items: [
            { name: "Overview", href: "/", icon: BarChart3 },
            { name: "Time Trends", href: "/trends", icon: LineChart },
        ],
    },
    {
        label: "International", labelMm: "နိုင်ငံတကာ",
        items: [
            { name: "International Tourism", href: "/international", icon: Globe2 },
            { name: "Visa Analysis", href: "/visas", icon: PlaneTakeoff },
            { name: "Entry Points", href: "/entry-points", icon: Map },
        ],
    },
    {
        label: "Domestic", labelMm: "ပြည်တွင်း",
        items: [
            { name: "Domestic Tourism", href: "/domestic", icon: MapPin },
            { name: "Destinations Map", href: "/destinations", icon: Map },
        ],
    },
    {
        label: "Business", labelMm: "စီးပွားရေး",
        items: [
            { name: "Expenditure", href: "/expenditure", icon: Banknote },
            { name: "Hotels & Accommodation", href: "/hotels", icon: Hotel },
            { name: "Decision Center", href: "/decisions", icon: Lightbulb },
            { name: "AI Itinerary", href: "/itinerary", icon: Route },
            { name: "Crowd Monitoring", href: "/crowd", icon: Gauge },
            { name: "Business Dashboard", href: "/business", icon: Briefcase },
        ],
    },
    {
        label: "Management", labelMm: "စီမံခန့်ခွဲမှု",
        items: [
            { name: "Alert Center", href: "/alerts", icon: Bell },
            { name: "Manage Destinations", href: "/manage-destinations", icon: Settings2 },
            { name: "Manage Users", href: "/manage-users", icon: Users },
        ],
    },
];

const myanmarLabels: Record<string, string> = {
    Overview: 'အနှစ်ချုပ်', 'International Tourism': 'နိုင်ငံတကာ ခရီးသွား', 'Time Trends': 'အချိန်လိုက် လမ်းကြောင်း',
    'Visa Analysis': 'ဗီဇာ ခွဲခြမ်းစိတ်ဖြာမှု', 'Entry Points': 'ဝင်ပေါက်များ', 'Hotels & Accommodation': 'ဟိုတယ်နှင့် တည်းခိုခန်း',
    Expenditure: 'အသုံးစရိတ်', 'Domestic Tourism': 'ပြည်တွင်း ခရီးသွား', 'Destinations Map': 'ခရီးစဉ်များ မြေပုံ', 'Decision Center': 'ဆုံးဖြတ်ချက် စင်တာ',
    'Business Dashboard': 'စီးပွားရေး ဒက်ရှ်ဘုတ်', 'Manage Destinations': 'ခရီးစဉ်ဇုန်များ စီမံခန့်ခွဲရန်', 'AI Itinerary': 'AI ခရီးစဉ်အစီအစဉ်',
    'Crowd Monitoring': 'လူစုလူပေါင်း စောင့်ကြည့်ခြင်း', 'Alert Center': 'သတိပေးချက် စင်တာ',
    'Manage Users': 'အသုံးပြုသူများ စီမံခန့်ခွဲရန်',
};

const ROLE_LABEL: Record<Role, { en: string; mm: string }> = {
    SUPER_ADMIN: { en: 'Super Admin', mm: 'အထွေထွေ စီမံခန့်ခွဲသူ' },
    DESTINATION_MANAGER: { en: 'Destination Manager', mm: 'ခရီးစဉ်ဇုန် မန်နေဂျာ' },
    BUSINESS_USER: { en: 'Business User', mm: 'စီးပွားရေး အသုံးပြုသူ' },
    TOURIST: { en: 'Tourist', mm: 'ခရီးသွား' },
};

export default function Sidebar() {
    const pathname = usePathname();
    const { language, setLanguage, theme, toggleTheme, mobileNavOpen, setMobileNavOpen, t } = usePreferences();
    const user = useSession();
    // Page-level RBAC mirrors middleware.ts exactly (same canAccessPath call) so the sidebar
    // never advertises a link the middleware would then bounce the user back out of --
    // showing a link a click immediately undoes is worse than not showing it.
    const visibleGroups = navGroups
        .map((group) => ({ ...group, items: group.items.filter((item) => canAccessPath(user.role, item.href)) }))
        .filter((group) => group.items.length > 0);

    return (
        <>
            {mobileNavOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileNavOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={cn(
                    "print:hidden fixed left-0 top-0 h-screen w-64 flex-shrink-0 border-r border-white/10 bg-slate-900/50 backdrop-blur-xl flex flex-col z-50 transition-transform duration-300 ease-in-out",
                    "lg:static",
                    mobileNavOpen ? "translate-x-0" : "max-lg:-translate-x-full"
                )}
            >
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent truncate flex items-center gap-2">
                        <Globe2 className="w-6 h-6 text-emerald-400" />
                        {language === 'my' ? 'မြန်မာ ခရီးသွား' : 'Myanmar Tourism'}
                    </h1>
                    <button
                        onClick={() => setMobileNavOpen(false)}
                        className="lg:hidden p-1.5 rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-200"
                        aria-label={t("Close navigation")}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
                        {language === 'my' ? 'ခွဲခြမ်းစိတ်ဖြာမှု ဒက်ရှ်ဘုတ်' : 'Analytics Dashboard'}
                    </div>

                    {visibleGroups.map((group, groupIndex) => (
                        <div key={group.label} className={cn(groupIndex > 0 && "mt-5")}>
                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 px-3">
                                {language === 'my' ? group.labelMm : group.label}
                            </div>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileNavOpen(false)}
                                            className={cn(
                                                "relative flex items-center gap-3 pl-3.5 pr-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                                isActive
                                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                                            )}
                                        >
                                            {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-cyan-400" />}
                                            <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300")} />
                                            {language === 'my' ? myanmarLabels[item.name] : item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10 text-xs text-slate-500 space-y-3">
                    <div className="flex items-center gap-2.5 px-1">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-slate-200 font-semibold truncate">{user.fullName}</div>
                            <div className="text-[11px] text-slate-500 truncate">{language === 'my' ? ROLE_LABEL[user.role].mm : ROLE_LABEL[user.role].en}</div>
                        </div>
                        <form action={logoutAction}>
                            <button type="submit" className="p-1.5 rounded-md text-slate-500 hover:bg-white/10 hover:text-rose-400 transition-colors" title={t("Sign out")}>
                                <LogOut className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setLanguage(language === 'en' ? 'my' : 'en')} className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-slate-300/50 px-2 py-1.5 hover:bg-slate-100/70" title={t("Change language")}><Languages className="w-3.5 h-3.5" /> {language === 'en' ? 'မြန်မာ' : 'English'}</button>
                        <button onClick={toggleTheme} className="rounded-md border border-slate-300/50 px-2 py-1.5 hover:bg-slate-100/70" title={t("Toggle theme")}>{theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}</button>
                    </div>
                    <div>{language === 'my' ? 'ဒေတာ အပ်ဒိတ်: ၂၀၂၅ (ခန့်မှန်း)' : 'Data updated: 2025 (estimate)'}</div>
                </div>
            </aside>
        </>
    );
}
