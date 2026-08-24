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
    { priority: yoy >= 10 ? 'high' : 'medium', title: 'Capacity planning', titleMm: 'တည်းခိုခန်းစွမ်းရည် စီမံရန်', detail: `International arrivals are ${yoy.toFixed(1)}% ${yoy >= 0 ? 'above' : 'below'} ${year - 1}.`, action: yoy >= 0 ? 'Reserve room inventory and transport capacity for peak weeks.' : 'Use targeted campaigns and flexible pricing to recover demand.' },
    { priority: 'medium', title: 'Entry-point focus', titleMm: 'ဝင်ပေါက် အာရုံစိုက်ရန်', detail: `${topEntry?.payload.gateway || 'Top gateway'} is the strongest arrival channel.`, action: 'Prioritise staffing, signage, and visa support at this gateway.' },
    { priority: rooms?.rooms > 0 && visitors / rooms.rooms > 75 ? 'high' : 'low', title: 'Accommodation signal', titleMm: 'တည်းခိုခန်း အချက်ပြချက်', detail: `${Number(rooms?.hotels || 0).toLocaleString()} properties provide ${Number(rooms?.rooms || 0).toLocaleString()} rooms.`, action: 'Compare room supply against arrivals before approving new capacity.' },
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
  const visaNote = profile?.visaRule || (['Thailand', 'Singapore', 'Malaysia', 'Indonesia', 'Vietnam', 'Philippines', 'Brunei', 'Cambodia', 'Laos'].some((country) => input.nationality.toLowerCase().includes(country.toLowerCase())) ? 'ASEAN passport: check the current visa exemption/arrival rules before booking.' : 'Non-ASEAN passport: budget time and fees for an eVisa or embassy process.');
  const risk = dailyPerPerson < recommendedDailyCost * 0.65 ? 'high' : dailyPerPerson < recommendedDailyCost ? 'medium' : 'low';
  return { decision: `Choose ${destination}`, decisionMm: `${destination} ကို ရွေးချယ်ပါ`, destination, estimatedSpend: Math.round(totalBudget * 0.88), reserve: Math.round(totalBudget * 0.12), dailyPerPerson: Math.round(dailyPerPerson), benchmarkDailyCost: recommendedDailyCost, visaNote, safetyScore: profile?.safetyScore || 50, safetyNotes: profile?.safetyNotes || 'Verify current local advisories.', peakMonths: profile?.peakMonths || [], shoulderMonths: profile?.shoulderMonths || [], risk, confidence: input.preferredRegion === 'any' ? 76 : 91, reasons: [`${days} days × ${travelers} traveller(s)`, `${input.purpose} itinerary`, `Typical daily cost for this destination: $${recommendedDailyCost}`, risk === 'low' ? 'Comfortable budget buffer' : 'Budget needs careful monitoring'] };
}
