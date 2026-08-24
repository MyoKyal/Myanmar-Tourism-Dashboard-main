"use server";

import { getDestinationProfile, getTourismCollection } from '@/lib/documentStore';
import { GlobalFiltersState } from '@/lib/FilterContext';

export type DecisionInput = {
  budget: number;
  nationality: string;
  days: number;
  travelers: number;
  purpose: 'leisure' | 'business' | 'family';
  preferredRegion: 'any' | 'yangon' | 'mandalay' | 'bagan' | 'inle' | 'shan' | 'mon' | 'rakhine' | 'chin' | 'kayin' | 'kachin' | 'sagaing' | 'tanintharyi' | 'ayeyarwady' | 'naypyidaw' | 'beach';
};

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
  const destination = input.preferredRegion === 'any' ? (input.purpose === 'business' ? 'Yangon' : dailyPerPerson >= 85 ? 'Ngapali Beach' : dailyPerPerson >= 45 ? 'Bagan + Inle Lake' : 'Yangon + Bago') : destinationMap[input.preferredRegion];
  const profile = await getDestinationProfile(destination.split(' + ')[0], input.nationality);
  const recommendedDailyCost = profile?.dailyCost || 45;
  const isAsean = ['Thailand', 'Singapore', 'Malaysia', 'Indonesia', 'Vietnam', 'Philippines', 'Brunei', 'Cambodia', 'Laos'].some((country) => input.nationality.toLowerCase().includes(country.toLowerCase()));
  const visaNote = profile?.visaRule || (isAsean ? 'ASEAN passport: check the current visa exemption/arrival rules before booking.' : 'Non-ASEAN passport: budget time and fees for an eVisa or embassy process.');
  const visaNoteMm = profile?.visaRule || (isAsean ? 'အာဆီယံနိုင်ငံကူးလက်မှတ်: မှာယူမီ လက်ရှိဗီဇာကင်းလွတ်ခွင့်/ရောက်ရှိချက်စည်းမျဉ်းများကို စစ်ဆေးပါ။' : 'အာဆီယံမဟုတ်သော နိုင်ငံကူးလက်မှတ်: eVisa သို့မဟုတ် သံရုံးလုပ်ငန်းစဉ်အတွက် အချိန်နှင့်စရိတ်ကို ကြိုတင်စီစဉ်ထားပါ။');
  const risk = dailyPerPerson < recommendedDailyCost * 0.65 ? 'high' : dailyPerPerson < recommendedDailyCost ? 'medium' : 'low';
  const reasons = [`${days} days × ${travelers} traveller(s)`, `${input.purpose} itinerary`, `Typical daily cost for this destination: $${recommendedDailyCost}`, risk === 'low' ? 'Comfortable budget buffer' : 'Budget needs careful monitoring'];
  const reasonsMm = [`${days} ရက် × ခရီးသွား ${travelers} ဦး`, `${input.purpose === 'leisure' ? 'အပန်းဖြေ' : input.purpose === 'business' ? 'စီးပွားရေး' : 'မိသားစု'} ခရီးစဉ်`, `ဤခရီးစဉ်အတွက် ပုံမှန်နေ့စဉ်စရိတ်: $${recommendedDailyCost}`, risk === 'low' ? 'ဘတ်ဂျက် လုံလောက်စွာ ရရှိနိုင်သည်' : 'ဘတ်ဂျက်ကို ဂရုတစိုက် စောင့်ကြည့်ရန်လိုအပ်သည်'];
  const visaNoteMmFinal = profile?.visaRuleMm || visaNoteMm;
  return { decision: `Choose ${destination}`, decisionMm: `${destination} ကို ရွေးချယ်ပါ`, destination, estimatedSpend: Math.round(totalBudget * 0.88), reserve: Math.round(totalBudget * 0.12), dailyPerPerson: Math.round(dailyPerPerson), benchmarkDailyCost: recommendedDailyCost, visaNote, visaNoteMm: visaNoteMmFinal, safetyScore: profile?.safetyScore || 50, safetyNotes: profile?.safetyNotes || 'Verify current local advisories.', safetyNotesMm: profile?.safetyNotesMm || 'လက်ရှိ ဒေသန္တရအကြံပြုချက်များကို စစ်ဆေးပါ။', peakMonths: profile?.peakMonths || [], shoulderMonths: profile?.shoulderMonths || [], risk, confidence: input.preferredRegion === 'any' ? 76 : 91, reasons, reasonsMm };
}
