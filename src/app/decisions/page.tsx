"use client";

import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Lightbulb, ArrowUpRight, CheckCircle2, Sparkles, Loader2,
  Flag, CalendarDays, Users, Briefcase, MapPin,
  Building2, MapPinned, Hotel,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getDecisionInsights, makeTravelDecision } from '@/actions/decisions';
import { useGlobalFilters } from '@/lib/FilterContext';
import { usePreferences } from '@/components/AppPreferences';

const inputClass = "w-full rounded-lg border border-slate-700/50 bg-slate-950/50 pl-9 pr-3 py-2.5 text-slate-200 outline-none focus:border-cyan-500 transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const MMK_PER_USD = 4500;
type Currency = 'MMK' | 'USD';

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

function insightIcon(title: string): LucideIcon {
  if (title.includes('Capacity')) return Building2;
  if (title.includes('Entry-point')) return MapPinned;
  if (title.includes('Accommodation')) return Hotel;
  return Lightbulb;
}

function priorityBadgeClass(priority: string, isLight: boolean) {
  if (priority === 'high') return isLight ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-rose-900/40 border-rose-800/50 text-rose-400';
  if (priority === 'medium') return isLight ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-amber-900/40 border-amber-800/50 text-amber-400';
  return isLight ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-emerald-900/40 border-emerald-800/50 text-emerald-400';
}

export default function DecisionsPage() {
  const { filters } = useGlobalFilters();
  const { language, theme, t } = usePreferences();
  const [insights, setInsights] = useState<any[]>([]);
  const [input, setInput] = useState({ budget: 1000000, nationality: 'Myanmar', days: 5, travelers: 1, purpose: 'leisure' as const, preferredRegion: 'any' as const });
  const [currency, setCurrency] = useState<Currency>('MMK');
  const [recommendation, setRecommendation] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  useEffect(() => { getDecisionInsights(filters).then(setInsights).catch(console.error); }, [filters]);
  const text = language === 'my';
  const isLight = theme === 'light';

  // The budget input holds a value in whatever currency is currently selected. Switching
  // currency converts the number in place, so the field always shows a sensible amount
  // instead of silently reinterpreting the same digits in a different currency.
  const changeCurrency = (next: Currency) => {
    if (next === currency) return;
    setInput(prev => ({
      ...prev,
      budget: next === 'USD' ? Math.round(prev.budget / MMK_PER_USD) : Math.round(prev.budget * MMK_PER_USD),
    }));
    setCurrency(next);
  };

  // destinationProfiles (and all downstream math in makeTravelDecision) are USD-denominated,
  // so the entered budget is converted to USD before submitting, and every dollar amount in
  // the result is converted back to the selected currency for display -- the underlying
  // calculation always happens in USD regardless of what the user sees.
  const formatMoney = (usdAmount: number) =>
    currency === 'MMK' ? `${Math.round(usdAmount * MMK_PER_USD).toLocaleString()} Ks` : `$${Math.round(usdAmount).toLocaleString()}`;

  const decide = async (event: FormEvent) => {
    event.preventDefault();
    setGenerating(true);
    try {
      const budgetUSD = currency === 'MMK' ? input.budget / MMK_PER_USD : input.budget;
      setRecommendation(await makeTravelDecision({ ...input, budget: budgetUSD }));
    } finally {
      setGenerating(false);
    }
  };

  const peakLabel = recommendation ? (recommendation.peakMonths.length ? recommendation.peakMonths.map((m: string) => t(m)).join(', ') : t('varies')) : '';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{text ? 'ဆုံးဖြတ်ချက် စင်တာ' : 'Decision Center'}</h1>
        <p className="text-slate-400 mt-2">{text ? 'ဒေတာမှ လုပ်ဆောင်နိုင်သော အကြံပြုချက်များကို ရယူပါ။' : 'Turn tourism data into practical planning actions.'}</p>
      </div>

      <section className="glass-panel p-6">
        <div className="flex items-start gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isLight ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-purple-900/40 text-purple-400 border-purple-800/30'}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{text ? 'ခရီးစဉ် ဆုံးဖြတ်ချက် ဖန်တီးရန်' : 'Interactive trip decision'}</h2>
            <p className="text-sm text-slate-400">{text ? 'သင့်အချက်အလက်များ ထည့်ပြီး အကြံပြုချက် ရယူပါ။' : 'Enter constraints and the system will recommend a destination, spend plan, and visa next step.'}</p>
          </div>
        </div>

        <form onSubmit={decide} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-start">
          <label className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-400">{t('Total Budget / Person')}</span>
              <div className="inline-flex rounded-md border border-slate-700/50 overflow-hidden shrink-0" title={t('Exchange rate: 1 USD = 4,500 MMK')}>
                <button type="button" onClick={() => changeCurrency('MMK')} className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${currency === 'MMK' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>MMK</button>
                <button type="button" onClick={() => changeCurrency('USD')} className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${currency === 'USD' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>USD</button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">{currency === 'MMK' ? 'Ks' : '$'}</span>
              <input
                type="text"
                inputMode="numeric"
                value={input.budget ? input.budget.toLocaleString() : ''}
                onChange={e => {
                  const digits = e.target.value.replace(/[^0-9]/g, '');
                  setInput({ ...input, budget: digits ? Number(digits) : 0 });
                }}
                className={inputClass}
              />
            </div>
            <span className="text-[11px] text-slate-500">{t('For the whole trip, per traveller')}</span>
          </label>
          <Field icon={Flag} label={t('Passport nationality')}>
            <input value={input.nationality} onChange={e => setInput({ ...input, nationality: e.target.value })} placeholder={t('e.g. Thailand')} className={inputClass} />
          </Field>
          <Field icon={CalendarDays} label={t('Days')} hint={t('1-60 days')}>
            <input type="number" min="1" max="60" value={input.days} onChange={e => setInput({ ...input, days: Number(e.target.value) })} className={inputClass} />
          </Field>
          <Field icon={Users} label={t('Travellers')} hint={t('1-20 travellers')}>
            <input type="number" min="1" max="20" value={input.travelers} onChange={e => setInput({ ...input, travelers: Number(e.target.value) })} className={inputClass} />
          </Field>
          <Field icon={Briefcase} label={t('Purpose')}>
            <select value={input.purpose} onChange={e => setInput({ ...input, purpose: e.target.value as any })} className={inputClass + " appearance-none"}>
              <option value="leisure">{t('Leisure')}</option>
              <option value="business">{t('Business')}</option>
              <option value="family">{t('Family')}</option>
            </select>
          </Field>
          <Field icon={MapPin} label={t('Region')}>
            <select value={input.preferredRegion} onChange={e => setInput({ ...input, preferredRegion: e.target.value as any })} className={inputClass + " appearance-none"}>
              <option value="any">{t('Best fit')}</option>
              <option value="yangon">{t('Yangon')}</option>
              <option value="mandalay">{t('Mandalay')}</option>
              <option value="bagan">{t('Bagan')}</option>
              <option value="inle">{t('Inle Lake')}</option>
              <option value="shan">{t('Shan State')}</option>
              <option value="mon">{t('Mon State')}</option>
              <option value="rakhine">{t('Rakhine State')}</option>
              <option value="chin">{t('Chin State')}</option>
              <option value="kayin">{t('Kayin State')}</option>
              <option value="kachin">{t('Kachin State')}</option>
              <option value="sagaing">{t('Sagaing Region')}</option>
              <option value="tanintharyi">{t('Tanintharyi Region')}</option>
              <option value="ayeyarwady">{t('Ayeyarwady Region')}</option>
              <option value="naypyidaw">{t('Naypyidaw')}</option>
              <option value="beach">{t('Beach / Ngapali')}</option>
            </select>
          </Field>

          <button
            type="submit"
            disabled={generating}
            className="xl:col-span-6 md:col-span-2 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 hover:shadow-cyan-500/30 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('Generating...')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {text ? 'ဆုံးဖြတ်ချက် ရယူရန်' : 'Generate recommendation'}
              </>
            )}
          </button>
        </form>

        {!recommendation && !generating && (
          <div className="mt-6 rounded-xl border border-dashed border-slate-700/50 p-6 text-center text-sm text-slate-500">
            {t('Fill in your trip details above and click Generate to see a personalized recommendation here.')}
          </div>
        )}

        {recommendation && (
          <div className={`mt-6 rounded-xl border p-5 shadow-inner ${isLight ? 'border-cyan-200 bg-cyan-50' : 'border-cyan-800/50 bg-cyan-950/30'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>{t('Recommendation')} · {recommendation.confidence}% {t('confidence')}</p>
                <h3 className="text-2xl font-extrabold text-white mt-1">{text ? recommendation.decisionMm : recommendation.decision}</h3>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase border ${recommendation.risk === 'low' ? (isLight ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-emerald-900/40 border-emerald-800/50 text-emerald-400') : recommendation.risk === 'medium' ? (isLight ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-amber-900/40 border-amber-800/50 text-amber-400') : (isLight ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-rose-900/40 border-rose-800/50 text-rose-400')}`}>
                {t(recommendation.risk)} {t('budget risk')}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm">
              <div><span className="text-slate-400">{t('Planned spend')}</span><strong className="block text-slate-200">{formatMoney(recommendation.estimatedSpend)}</strong></div>
              <div><span className="text-slate-400">{t('Reserve')}</span><strong className="block text-slate-200">{formatMoney(recommendation.reserve)}</strong></div>
              <div><span className="text-slate-400">{t('Daily / person')}</span><strong className="block text-slate-200">{formatMoney(recommendation.dailyPerPerson)} / {formatMoney(recommendation.benchmarkDailyCost)} {t('typical')}</strong></div>
              <div><span className="text-slate-400">{t('Safety score')}</span><strong className="block text-slate-200">{recommendation.safetyScore}/100</strong></div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-950/50 p-4 rounded-lg">
              <p className="text-slate-300"><strong className="text-slate-200">{t('Visa:')}</strong> {text ? recommendation.visaNoteMm : recommendation.visaNote}</p>
              <p className="text-slate-300"><strong className="text-slate-200">{t('Seasonality:')}</strong> {t('Peak')} {peakLabel}.</p>
            </div>
            <div className="mt-4 text-sm text-slate-300"><strong className="text-slate-200">{t('Safety:')}</strong> {text ? recommendation.safetyNotesMm : recommendation.safetyNotes}</div>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-400 space-y-1">
              <li className="leading-relaxed">{t('Typical daily cost for this destination:')} {formatMoney(recommendation.benchmarkDailyCost)}</li>
              {(text ? recommendation.reasonsMm : recommendation.reasons).map((reason: string) => <li key={reason} className="leading-relaxed">{reason}</li>)}
            </ul>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {insights.map((insight) => {
          const Icon = insightIcon(insight.title);
          return (
            <article key={insight.title} className="glass-card p-6 relative overflow-hidden transition-colors hover:bg-slate-900/60">
              <div className="flex items-start justify-between mb-5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${isLight ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-cyan-900/40 text-cyan-400 border-cyan-800/50'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border ${priorityBadgeClass(insight.priority, isLight)}`}>
                  {t(insight.priority)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100">{text ? insight.titleMm : insight.title}</h2>
              <p className="text-sm text-slate-400 mt-2 min-h-12 leading-relaxed">{text ? insight.detailMm : insight.detail}</p>
              <div className="mt-5 border-t border-slate-700/50 pt-4 flex gap-2 text-sm font-medium text-slate-300">
                <ArrowUpRight className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-cyan-600' : 'text-cyan-500'}`} />
                {text ? insight.actionMm : insight.action}
              </div>
            </article>
          );
        })}
      </div>

      <div className="glass-panel p-5 flex items-start gap-3 text-sm text-slate-400">
        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-500'}`} />
        {text ? 'အကြံပြုချက်များသည် ၂၀၂၅ ခန့်မှန်းဒေတာ ပါဝင်သောကြောင့် စီမံကိန်းအတွက် အသုံးပြုပါ။' : 'Planning note: 2025 figures are modelled estimates and should be replaced with official releases before external reporting.'}
      </div>
    </div>
  );
}
