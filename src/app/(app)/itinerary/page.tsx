"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Route, Loader2, CalendarDays, Users, Coins, Compass, CalendarClock,
  Landmark, Trees, Umbrella, Building2, Mountain, Bot, ShieldAlert, MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { generateItinerary, type ItineraryResult } from "@/actions/itinerary";
import { INTEREST_KEYS, type InterestKey } from "@/lib/interests";
import { usePreferences } from "@/components/AppPreferences";

const inputClass = "w-full rounded-lg border border-slate-700/50 bg-slate-950/50 pl-9 pr-3 py-2.5 text-slate-200 outline-none focus:border-cyan-500 transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const INTEREST_META: Record<InterestKey, { label: string; icon: LucideIcon }> = {
  culture: { label: "Culture & History", icon: Landmark },
  nature: { label: "Nature & Lakes", icon: Trees },
  beach: { label: "Beach & Coast", icon: Umbrella },
  urban: { label: "Cities & Business", icon: Building2 },
  adventure: { label: "Adventure & Remote", icon: Mountain },
};

function Field({ icon: Icon, label, hint, children }: { icon: LucideIcon; label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-slate-400">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        {children}
      </div>
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export default function ItineraryPage() {
  const { t, language } = usePreferences();
  const [days, setDays] = useState(4);
  const [budgetPerDay, setBudgetPerDay] = useState(100);
  const [travelers, setTravelers] = useState(1);
  const [travelMonth, setTravelMonth] = useState("");
  const [interests, setInterests] = useState<InterestKey[]>([]);
  const [result, setResult] = useState<ItineraryResult | null>(null);
  const [generating, setGenerating] = useState(false);

  const toggleInterest = (key: InterestKey) => {
    setInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setGenerating(true);
    try {
      setResult(await generateItinerary({ days, budgetPerDayUSD: budgetPerDay, travelers, interests, travelMonth: travelMonth || undefined }));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{t("AI Itinerary Generator")}</h1>
        <p className="text-slate-400 mt-2">{t("Turn a trip length and budget into a realistic day-by-day plan across Myanmar.")}</p>
      </div>

      <section className="glass-panel p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-purple-900/40 text-purple-400 border-purple-800/30">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{t("Plan your trip")}</h2>
            <p className="text-sm text-slate-400">{t("The schedule below is deterministic (day counts and budget always add up); an AI-written suggestion is layered on top of each stop, best-effort only.")}</p>
          </div>
        </div>

        <form onSubmit={generate} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          <Field icon={CalendarDays} label={t("Trip length (days)")} hint={t("1-30 days")}>
            <input type="number" min="1" max="30" value={days} onChange={(e) => setDays(Number(e.target.value))} className={inputClass} />
          </Field>
          <Field icon={Coins} label={t("Budget per day (USD)")}>
            <input type="number" min="1" value={budgetPerDay} onChange={(e) => setBudgetPerDay(Number(e.target.value))} className={inputClass} />
          </Field>
          <Field icon={Users} label={t("Travellers")} hint={t("1-20 travellers")}>
            <input type="number" min="1" max="20" value={travelers} onChange={(e) => setTravelers(Number(e.target.value))} className={inputClass} />
          </Field>
          <Field icon={CalendarClock} label={t("Travel Month")} hint={t("Improves the match")}>
            <select value={travelMonth} onChange={(e) => setTravelMonth(e.target.value)} className={inputClass + " appearance-none"}>
              <option value="">{t("Not sure yet")}</option>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                <option key={m} value={m}>{t(m)}</option>
              ))}
            </select>
          </Field>

          <div className="md:col-span-2 xl:col-span-4">
            <span className="text-sm font-semibold text-slate-400 flex items-center gap-1.5 mb-2"><Compass className="w-4 h-4" /> {t("Interests (optional)")}</span>
            <div className="flex flex-wrap gap-2">
              {INTEREST_KEYS.map((key) => {
                const meta = INTEREST_META[key];
                const active = interests.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleInterest(key)}
                    className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${active ? "bg-cyan-600 border-cyan-500 text-white" : "border-slate-700/50 text-slate-400 hover:bg-slate-800"}`}
                  >
                    <meta.icon className="w-3.5 h-3.5" /> {t(meta.label)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <button type="submit" disabled={generating} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-90 disabled:opacity-60 text-white font-semibold py-3 transition-opacity">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
              {generating ? t("Generating...") : t("Generate itinerary")}
            </button>
          </div>
        </form>

        {!result && !generating && (
          <div className="mt-6 rounded-xl border border-dashed border-slate-700/50 p-6 text-center text-sm text-slate-500">
            {t("Set your trip length and budget above and click Generate to see a day-by-day plan here.")}
          </div>
        )}

        {result && (
          <div className="mt-6 flex flex-col gap-5">
            <div className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${result.overBudget ? "border-amber-800/50 bg-amber-950/30" : "border-emerald-800/50 bg-emerald-950/30"}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t("Estimated total cost")}</p>
                <p className="text-2xl font-extrabold text-white">${result.totalEstimatedCost.toLocaleString()}</p>
              </div>
              <div className="text-sm text-slate-400">
                {t("Budget")}: ${result.budgetTotal.toLocaleString()} · {result.totalDays} {t("days")}
              </div>
              {result.overBudget && (
                <span className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-900/50 text-amber-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> {t("Over budget")}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {result.stops.map((stop, i) => (
                <div key={stop.destination} className="glass-panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-900/40 border border-cyan-800/40 flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">{i + 1}</div>
                      <div>
                        <p className="font-bold text-slate-100 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-cyan-400" /> {stop.destination}</p>
                        <p className="text-xs text-slate-500">{t("Day")} {stop.dayStart}{stop.dayEnd !== stop.dayStart ? `–${stop.dayEnd}` : ""} · {stop.days} {t(stop.days === 1 ? "day" : "days")}</p>
                      </div>
                    </div>
                    {stop.clusterLabel && <span className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-slate-800 text-slate-300">{language === "my" ? stop.clusterLabelMm : stop.clusterLabel}</span>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div><p className="text-[11px] text-slate-500 uppercase">{t("Est. cost")}</p><p className="text-slate-200 font-semibold">${stop.estimatedCost.toLocaleString()}</p></div>
                    <div><p className="text-[11px] text-slate-500 uppercase">{t("Daily rate")}</p><p className="text-slate-200 font-semibold">${stop.dailyCost}/day</p></div>
                    <div><p className="text-[11px] text-slate-500 uppercase">{t("Safety score")}</p><p className="text-slate-200 font-semibold">{stop.safetyScore}/100</p></div>
                    <div><p className="text-[11px] text-slate-500 uppercase">{t("Best months")}</p><p className="text-slate-200 font-semibold text-xs">{stop.peakMonths.slice(0, 2).map((m) => t(m)).join(", ") || t("Varies")}</p></div>
                  </div>

                  <p className="text-xs text-slate-500 mb-2">{language === "my" ? stop.safetyNotesMm : stop.safetyNotes}</p>
                  <p className="text-xs text-slate-500 mb-3">{language === "my" ? stop.visaRuleMm : stop.visaRule}</p>

                  {stop.aiSuggestion && (
                    <div className="rounded-lg border border-purple-800/30 bg-purple-950/20 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-purple-400 flex items-center gap-1.5 mb-1"><Bot className="w-3 h-3" /> {t("AI Suggestion")} · English</p>
                      <p className="text-xs text-slate-300">{stop.aiSuggestion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
