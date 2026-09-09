"use server";

import { getDestinationProfile, getAllDestinations, getTourismCollection, type DestinationProfile } from '@/lib/documentStore';
import { GlobalFiltersState } from '@/lib/FilterContext';
import { generateAiInsight } from '@/lib/ollama';
import { getClusterForDestination } from '@/lib/destinationClusters';

export type DecisionInput = {
  budget: number;
  nationality: string;
  days: number;
  travelers: number;
  purpose: 'leisure' | 'business' | 'family';
  preferredRegion: 'any' | 'yangon' | 'mandalay' | 'bagan' | 'inle' | 'shan' | 'mon' | 'rakhine' | 'chin' | 'kayin' | 'kachin' | 'sagaing' | 'tanintharyi' | 'ayeyarwady' | 'naypyidaw' | 'beach';
  /** Optional -- when given, scoring rewards shoulder-season timing and penalizes
   *  off-season travel to seasonal destinations instead of staying blind to timing. */
  travelMonth?: string;
};

// Yangon, Mandalay, and Naypyidaw are Myanmar's actual commercial/administrative hubs
// (Naypyidaw is the capital; Yangon and Mandalay are the two largest business centers) --
// a real-world fact, not an arbitrary preference, used to weight business-purpose trips.
const BUSINESS_HUBS = new Set(['Yangon', 'Mandalay', 'Naypyidaw']);

// Budget fit as a smooth curve rather than a hard threshold: a budget that barely covers
// the destination's typical daily cost is risky (low score), a budget that comfortably
// clears it without wildly overshooting scores best, and a budget many times over "wastes"
// precision without being wrong, so it decays gently rather than dropping off a cliff.
function budgetFitScore(ratio: number): number {
  if (ratio < 0.5) return 10;
  if (ratio < 0.65) return 30;
  if (ratio < 1.0) return 55;
  if (ratio <= 1.5) return 100 - Math.abs(ratio - 1.15) * 40;
  if (ratio <= 3) return Math.max(40, 100 - (ratio - 1.5) * 25);
  return 35;
}

// Multi-factor fit score (0-100) for one destination against this trip's actual inputs --
// replaces the old fixed 2-3-bucket threshold that only ever considered budget size and
// ignored safety, purpose, and timing entirely.
function scoreDestination(profile: DestinationProfile, input: DecisionInput, dailyPerPerson: number): number {
  const ratio = dailyPerPerson / profile.dailyCost;
  const budgetScore = budgetFitScore(ratio);
  // Family trips weight safety more heavily than a solo leisure or business trip would.
  const safetyWeight = input.purpose === 'family' ? 0.35 : input.purpose === 'business' ? 0.2 : 0.25;
  let score = budgetScore * (1 - safetyWeight) + profile.safetyScore * safetyWeight;
  if (input.purpose === 'business' && BUSINESS_HUBS.has(profile.destination)) score += 15;
  if (input.travelMonth) {
    if (profile.shoulderMonths.includes(input.travelMonth)) score += 8; // ideal: good weather, thinner crowds
    else if (!profile.peakMonths.includes(input.travelMonth)) score -= 5; // off-season: some seasonal destinations scale back
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function getDecisionInsights(filters: GlobalFiltersState) {
  const arrivals = await getTourismCollection('arrival');
  const accommodation = await getTourismCollection('accommodation');
  const year = filters.year === 'All' ? 2025 : Number(filters.year);
  const arrivalsFor = (targetYear: number) => arrivals.filter((doc) => doc.year === targetYear && ['International Airports', 'Cruise (By Sea)', 'Land Borders Total'].includes(String(doc.payload.gateway))).reduce((sum, doc) => sum + Number(doc.payload.visitors || 0), 0);
  const visitors = arrivalsFor(year);
  const prior = arrivalsFor(year - 1);
  const topEntry = arrivals.filter((doc) => doc.year === year && doc.dataset === 'border_entry_points').sort((a, b) => Number(b.payload.visitors || 0) - Number(a.payload.visitors || 0))[0];
  const rooms = accommodation.filter((doc) => doc.year === year).reduce((acc, doc) => ({ rooms: acc.rooms + Number(doc.payload.rooms || 0), hotels: acc.hotels + Number(doc.payload.hotels || 0) }), { rooms: 0, hotels: 0 });
  const yoy = prior ? ((visitors - prior) / prior) * 100 : 0;

  return [
    {
      priority: yoy >= 10 ? 'high' : 'medium', title: 'Capacity planning', titleMm: 'တည်းခိုခန်းစွမ်းရည် စီမံရန်',
      detail: `International arrivals are ${yoy.toFixed(1)}% ${yoy >= 0 ? 'above' : 'below'} ${year - 1}.`,
      detailMm: `နိုင်ငံတကာလာရောက်မှုသည် ${year - 1} ထက် ${Math.abs(yoy).toFixed(1)}% ${yoy >= 0 ? 'ပိုများ' : 'ပိုနည်း'}သည်။`,
      action: yoy >= 0 ? 'Reserve room inventory and transport capacity for peak weeks.' : 'Use targeted campaigns and flexible pricing to recover demand.',
      actionMm: yoy >= 0 ? 'အထွတ်အထိပ်ရာသီအတွက် အခန်းနှင့် သယ်ယူပို့ဆောင်ရေး စွမ်းရည်ကို ကြိုတင်စီစဉ်ထားပါ။' : 'ဦးတည်ကြော်ငြာမှုနှင့် ပြောင်းလွယ်ပြင်လွယ် စျေးနှုန်းများဖြင့် လိုအပ်ချက်ကို ပြန်လည်ရယူပါ။',
    },
    {
      priority: 'medium', title: 'Entry-point focus', titleMm: 'ဝင်ပေါက် အာရုံစိုက်ရန်',
      detail: `${topEntry?.payload.gateway || 'Top gateway'} is the strongest arrival channel.`,
      detailMm: `${topEntry?.payload.gateway || 'ထိပ်တန်းဝင်ပေါက်'} သည် အခိုင်မာဆုံး လာရောက်မှုလမ်းကြောင်း ဖြစ်သည်။`,
      action: 'Prioritise staffing, signage, and visa support at this gateway.',
      actionMm: 'ဤဝင်ပေါက်တွင် ဝန်ထမ်းအင်အား၊ လမ်းညွှန်ဆိုင်းဘုတ်နှင့် ဗီဇာအထောက်အပံ့ကို ဦးစားပေးပါ။',
    },
    {
      priority: rooms?.rooms > 0 && visitors / rooms.rooms > 75 ? 'high' : 'low', title: 'Accommodation signal', titleMm: 'တည်းခိုခန်း အချက်ပြချက်',
      detail: `${Number(rooms?.hotels || 0).toLocaleString()} properties provide ${Number(rooms?.rooms || 0).toLocaleString()} rooms.`,
      detailMm: `ဟိုတယ် ${Number(rooms?.hotels || 0).toLocaleString()} ခုတွင် အခန်း ${Number(rooms?.rooms || 0).toLocaleString()} ခန်း ရရှိနိုင်သည်။`,
      action: 'Compare room supply against arrivals before approving new capacity.',
      actionMm: 'စွမ်းရည်အသစ် ခွင့်ပြုမီ အခန်းရရှိနိုင်မှုကို လာရောက်မှုနှင့် နှိုင်းယှဉ်စစ်ဆေးပါ။',
    },
  ];
}

export async function makeTravelDecision(input: DecisionInput) {
  const budget = Math.max(0, Number(input.budget) || 0);
  const days = Math.max(1, Math.min(60, Number(input.days) || 1));
  const travelers = Math.max(1, Math.min(20, Number(input.travelers) || 1));
  const totalBudget = budget * travelers;
  const dailyPerPerson = budget / days;
  const destinationMap: Record<string, string> = { yangon: 'Yangon', mandalay: 'Mandalay', bagan: 'Bagan', inle: 'Inle Lake', shan: 'Shan State', mon: 'Mon State', rakhine: 'Rakhine State', chin: 'Chin State', kayin: 'Kayin State', kachin: 'Kachin State', sagaing: 'Sagaing Region', tanintharyi: 'Tanintharyi Region', ayeyarwady: 'Ayeyarwady Region', naypyidaw: 'Naypyidaw', beach: 'Ngapali Beach' };

  // Score every active destination (from the `destinations` Mongo collection, not a static
  // array -- see documentStore.ts) against this trip's actual budget, purpose, and (if given)
  // travel month. Reading live from the database, rather than an in-memory catalog, is what
  // makes an admin's edit in manage-destinations actually change what gets recommended.
  const allDestinations = await getAllDestinations();
  const ranked = allDestinations
    .map((profile) => ({ profile, score: scoreDestination(profile, input, dailyPerPerson) }))
    .sort((a, b) => b.score - a.score);

  let destination: string;
  let matchScore: number;
  let rank: number;
  if (input.preferredRegion === 'any') {
    destination = ranked[0].profile.destination;
    matchScore = ranked[0].score;
    rank = 1;
  } else {
    destination = destinationMap[input.preferredRegion];
    const index = ranked.findIndex((r) => r.profile.destination === destination);
    matchScore = index >= 0 ? ranked[index].score : 50;
    rank = index >= 0 ? index + 1 : ranked.length;
  }

  const profile = await getDestinationProfile(destination);
  const recommendedDailyCost = profile?.dailyCost || 123;
  // Data-driven destination type (k-means clustering over cost + safety across all active
  // destinations, see destinationClusters.ts) -- an independent, algorithmic categorization
  // shown alongside the scoring-based recommendation above, not a factor in its ranking.
  const destinationCluster = await getClusterForDestination(destination);
  const isAsean = ['Thailand', 'Singapore', 'Malaysia', 'Indonesia', 'Vietnam', 'Philippines', 'Brunei', 'Cambodia', 'Laos'].some((country) => input.nationality.toLowerCase().includes(country.toLowerCase()));
  const visaNote = profile?.visaRule || (isAsean ? 'ASEAN passport: check the current visa exemption/arrival rules before booking.' : 'Non-ASEAN passport: budget time and fees for an eVisa or embassy process.');
  const visaNoteMm = profile?.visaRuleMm || (isAsean ? 'အာဆီယံနိုင်ငံကူးလက်မှတ်: မှာယူမီ လက်ရှိဗီဇာကင်းလွတ်ခွင့်/ရောက်ရှိချက်စည်းမျဉ်းများကို စစ်ဆေးပါ။' : 'အာဆီယံမဟုတ်သော နိုင်ငံကူးလက်မှတ်: eVisa သို့မဟုတ် သံရုံးလုပ်ငန်းစဉ်အတွက် အချိန်နှင့်စရိတ်ကို ကြိုတင်စီစဉ်ထားပါ။');
  const risk = dailyPerPerson < recommendedDailyCost * 0.65 ? 'high' : dailyPerPerson < recommendedDailyCost ? 'medium' : 'low';
  const fitReason = rank === 1
    ? `Best fit among all ${ranked.length} tracked destinations for this budget and purpose`
    : `Ranked #${rank} of ${ranked.length} tracked destinations for this budget and purpose`;
  const fitReasonMm = rank === 1
    ? `ဤဘတ်ဂျက်နှင့် ရည်ရွယ်ချက်အတွက် ခြေရာခံထားသော ခရီးစဉ်ဇုန် ${ranked.length} ခုအနက် အသင့်တော်ဆုံး`
    : `ဤဘတ်ဂျက်နှင့် ရည်ရွယ်ချက်အတွက် ခြေရာခံထားသော ခရီးစဉ်ဇုန် ${ranked.length} ခုအနက် အဆင့် #${rank}`;
  const reasons = [`${days} days × ${travelers} traveller(s)`, `${input.purpose} itinerary`, fitReason, risk === 'low' ? 'Comfortable budget buffer' : 'Budget needs careful monitoring'];
  const reasonsMm = [`${days} ရက် × ခရီးသွား ${travelers} ဦး`, `${input.purpose === 'leisure' ? 'အပန်းဖြေ' : input.purpose === 'business' ? 'စီးပွားရေး' : 'မိသားစု'} ခရီးစဉ်`, fitReasonMm, risk === 'low' ? 'ဘတ်ဂျက် လုံလောက်စွာ ရရှိနိုင်သည်' : 'ဘတ်ဂျက်ကို ဂရုတစိုက် စောင့်ကြည့်ရန်လိုအပ်သည်'];
  const visaNoteMmFinal = profile?.visaRuleMm || visaNoteMm;

  // AI Insight: a local Ollama model reasons over the same computed facts (destination,
  // budget breakdown, risk, safety, season) to write a short, personalized explanation --
  // additive on top of the deterministic reasons/reasonsMm above, never a replacement for
  // them. Purely best-effort: if Ollama isn't running or times out, this is just null and
  // the UI shows nothing extra -- every number above is already computed and correct either way.
  const aiPrompt = `You are a knowledgeable, warm Myanmar travel advisor. Given this trip recommendation, write a short 2-3 sentence personalized explanation of why it fits, plus one practical tip. Respond in plain English text only, no preamble, no markdown.

Destination: ${destination}
Traveller nationality: ${input.nationality}
Trip purpose: ${input.purpose}
Duration: ${days} days, ${travelers} traveller(s)
Budget: $${Math.round(dailyPerPerson)}/day per person (typical for this destination: $${recommendedDailyCost}/day)
Budget risk level: ${risk}
Safety score: ${profile?.safetyScore ?? 50}/100
Peak season: ${(profile?.peakMonths || []).join(', ') || 'varies year-round'}
${input.travelMonth ? `Planned travel month: ${input.travelMonth}` : ''}
Match rank: #${rank} of ${ranked.length} tracked destinations for this trip`;
  const aiInsight = await generateAiInsight(aiPrompt);

  return { decision: `Choose ${destination}`, decisionMm: `${destination} ကို ရွေးချယ်ပါ`, destination, estimatedSpend: Math.round(totalBudget * 0.88), reserve: Math.round(totalBudget * 0.12), dailyPerPerson: Math.round(dailyPerPerson), benchmarkDailyCost: recommendedDailyCost, visaNote, visaNoteMm: visaNoteMmFinal, safetyScore: profile?.safetyScore || 50, safetyNotes: profile?.safetyNotes || 'Verify current local advisories.', safetyNotesMm: profile?.safetyNotesMm || 'လက်ရှိ ဒေသန္တရအကြံပြုချက်များကို စစ်ဆေးပါ။', peakMonths: profile?.peakMonths || [], shoulderMonths: profile?.shoulderMonths || [], risk, confidence: matchScore, rank, totalDestinations: ranked.length, reasons, reasonsMm, aiInsight, destinationType: destinationCluster?.label ?? null, destinationTypeMm: destinationCluster?.labelMm ?? null };
}
