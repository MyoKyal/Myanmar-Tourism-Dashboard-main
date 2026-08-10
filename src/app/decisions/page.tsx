"use client";

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Lightbulb, ArrowUpRight, CheckCircle2, Sparkles } from 'lucide-react';
import { getDecisionInsights, makeTravelDecision } from '@/actions/decisions';
import { useGlobalFilters } from '@/lib/FilterContext';
import { usePreferences } from '@/components/AppPreferences';
import GlobalFilters from '@/components/GlobalFilters';

export default function DecisionsPage() {
  const { filters } = useGlobalFilters();
  const { language } = usePreferences();
  const [insights, setInsights] = useState<any[]>([]);
  const [input, setInput] = useState({ budget: 1000, nationality: 'Myanmar', days: 5, travelers: 1, purpose: 'leisure' as const, preferredRegion: 'any' as const });
  const [recommendation, setRecommendation] = useState<any>(null);
  useEffect(() => { getDecisionInsights(filters).then(setInsights).catch(console.error); }, [filters]);
  const text = language === 'my';
  const decide = async (event: FormEvent) => { event.preventDefault(); setRecommendation(await makeTravelDecision(input)); };
  return <div className="flex flex-col gap-6 animate-in fade-in duration-500">
    <div><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{text ? 'ဆုံးဖြတ်ချက် စင်တာ' : 'Decision Center'}</h1><p className="text-slate-500 mt-2">{text ? 'ဒေတာမှ လုပ်ဆောင်နိုင်သော အကြံပြုချက်များကို ရယူပါ။' : 'Turn tourism data into practical planning actions.'}</p></div>
    <GlobalFilters showYear />
    <section className="glass-panel p-6">
      <div className="flex items-start gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div><div><h2 className="text-xl font-bold text-slate-900">{text ? 'ခရီးစဉ် ဆုံးဖြတ်ချက် ဖန်တီးရန်' : 'Interactive trip decision'}</h2><p className="text-sm text-slate-500">{text ? 'သင့်အချက်အလက်များ ထည့်ပြီး အကြံပြုချက် ရယူပါ။' : 'Enter constraints and the system will recommend a destination, spend plan, and visa next step.'}</p></div></div>
      <form onSubmit={decide} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-end">
        <label className="text-sm text-slate-600">Budget / person ($)<input type="number" min="0" value={input.budget} onChange={e => setInput({ ...input, budget: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" /></label>
        <label className="text-sm text-slate-600">Passport nationality<input value={input.nationality} onChange={e => setInput({ ...input, nationality: e.target.value })} placeholder="e.g. Thailand" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" /></label>
        <label className="text-sm text-slate-600">Days<input type="number" min="1" max="60" value={input.days} onChange={e => setInput({ ...input, days: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" /></label>
        <label className="text-sm text-slate-600">Travellers<input type="number" min="1" max="20" value={input.travelers} onChange={e => setInput({ ...input, travelers: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" /></label>
        <label className="text-sm text-slate-600">Purpose<select value={input.purpose} onChange={e => setInput({ ...input, purpose: e.target.value as any })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"><option value="leisure">Leisure</option><option value="business">Business</option><option value="family">Family</option></select></label>
        <label className="text-sm text-slate-600">Region<select value={input.preferredRegion} onChange={e => setInput({ ...input, preferredRegion: e.target.value as any })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"><option value="any">Best fit</option><option value="yangon">Yangon</option><option value="mandalay">Mandalay</option><option value="bagan">Bagan</option><option value="inle">Inle Lake</option><option value="shan">Shan State</option><option value="mon">Mon State</option><option value="rakhine">Rakhine State</option><option value="chin">Chin State</option><option value="kayin">Kayin State</option><option value="kachin">Kachin State</option><option value="sagaing">Sagaing Region</option><option value="tanintharyi">Tanintharyi Region</option><option value="ayeyarwady">Ayeyarwady Region</option><option value="naypyidaw">Naypyidaw</option><option value="beach">Beach / Ngapali</option></select></label>
        <button className="xl:col-span-6 md:col-span-2 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 hover:shadow-cyan-500/30 transition-all active:scale-[0.99]">{text ? 'ဆုံးဖြတ်ချက် ရယူရန်' : 'Generate recommendation'}</button>
      </form>
      {recommendation && <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Recommendation · {recommendation.confidence}% confidence</p><h3 className="text-2xl font-extrabold text-slate-900 mt-1">{text ? recommendation.decisionMm : recommendation.decision}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${recommendation.risk === 'low' ? 'bg-emerald-100 text-emerald-700' : recommendation.risk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{recommendation.risk} budget risk</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm"><div><span className="text-slate-500">Planned spend</span><strong className="block text-slate-900">${recommendation.estimatedSpend.toLocaleString()}</strong></div><div><span className="text-slate-500">Reserve</span><strong className="block text-slate-900">${recommendation.reserve.toLocaleString()}</strong></div><div><span className="text-slate-500">Daily / person</span><strong className="block text-slate-900">${recommendation.dailyPerPerson} / ${recommendation.benchmarkDailyCost} typical</strong></div><div><span className="text-slate-500">Safety score</span><strong className="block text-slate-900">{recommendation.safetyScore}/100</strong></div></div><div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"><p className="text-slate-700"><strong>Visa:</strong> {recommendation.visaNote}</p><p className="text-slate-700"><strong>Seasonality:</strong> Peak {recommendation.peakMonths.join(', ') || 'varies'}.</p></div><p className="mt-2 text-sm text-slate-700"><strong>Safety:</strong> {recommendation.safetyNotes}</p><ul className="mt-3 list-disc pl-5 text-sm text-slate-600">{recommendation.reasons.map((reason: string) => <li key={reason}>{reason}</li>)}</ul></div>}
    </section>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {insights.map((insight) => <article key={insight.title} className="glass-card p-6 relative overflow-hidden">
        <div className="flex items-start justify-between mb-5"><div className="w-11 h-11 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center"><Lightbulb className="w-5 h-5" /></div><span className={`text-xs font-bold uppercase tracking-widest ${insight.priority === 'high' ? 'text-rose-600' : insight.priority === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`}>{insight.priority}</span></div>
        <h2 className="text-lg font-bold text-slate-900">{text ? insight.titleMm : insight.title}</h2><p className="text-sm text-slate-500 mt-2 min-h-12">{insight.detail}</p>
        <div className="mt-5 border-t border-slate-200 pt-4 flex gap-2 text-sm text-slate-700"><ArrowUpRight className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />{insight.action}</div>
      </article>)}
    </div>
    <div className="glass-panel p-5 flex items-start gap-3 text-sm text-slate-600"><CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />{text ? 'အကြံပြုချက်များသည် ၂၀၂၅ ခန့်မှန်းဒေတာ ပါဝင်သောကြောင့် စီမံကိန်းအတွက် အသုံးပြုပါ။' : 'Planning note: 2025 figures are modelled estimates and should be replaced with official releases before external reporting.'}</div>
  </div>;
}
