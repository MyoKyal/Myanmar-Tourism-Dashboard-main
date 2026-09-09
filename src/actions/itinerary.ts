"use server";

import { getAllDestinations } from "@/lib/documentStore";
import { getClusterForDestination } from "@/lib/destinationClusters";
import { generateAiInsight } from "@/lib/ollama";
import type { InterestKey } from "@/lib/interests";

export type ItineraryInput = {
  days: number;
  budgetPerDayUSD: number;
  travelers: number;
  interests: string[]; // subset of INTEREST_KEYS
  travelMonth?: string;
};

// Real geography/culture, not a guess: Bagan and Mandalay are Myanmar's historic
// temple/heritage centers (culture); Inle Lake, Shan, Kachin, Chin, and Kayah are
// highland/lake nature destinations; Ngapali and Tanintharyi are the coastal/beach region;
// Yangon and Naypyidaw are the commercial/administrative cities (urban); Kayin, Rakhine
// (inland), and the remote states double as adventure/off-the-beaten-path given their lower
// safety scores and higher-effort access already recorded in destinationProfiles. A
// destination can honestly belong to more than one tag.
const INTEREST_TAGS: Record<string, InterestKey[]> = {
  Yangon: ["urban"], Mandalay: ["culture", "urban"], Bagan: ["culture"],
  "Inle Lake": ["nature"], "Ngapali Beach": ["beach"], "Shan State": ["nature", "adventure"],
  "Mon State": ["culture", "nature"], "Rakhine State": ["adventure", "beach"],
  "Chin State": ["nature", "adventure"], "Kayin State": ["nature", "adventure"],
  "Kachin State": ["nature", "adventure"], "Sagaing Region": ["culture"],
  "Tanintharyi Region": ["beach", "adventure"], "Ayeyarwady Region": ["nature"],
  Naypyidaw: ["urban"], "Bago Region": ["culture"], "Kayah State": ["nature", "adventure"],
  "Magway Region": ["culture"],
};

function budgetFit(ratio: number): number {
  if (ratio < 0.5) return 10;
  if (ratio < 0.65) return 30;
  if (ratio < 1.0) return 55;
  if (ratio <= 1.5) return 100 - Math.abs(ratio - 1.15) * 40;
  if (ratio <= 3) return Math.max(40, 100 - (ratio - 1.5) * 25);
  return 35;
}

// Splits the trip across up to 3 destinations -- more than that in one itinerary starts
// producing the "unrealistic schedule" the brief explicitly warns against (a 5-day trip
// covering 4 destinations means half of it is transit, not travel). Days are allocated by
// each stop's relative score so the best-fit destination gets the most time, not an even split.
function planStopCounts(days: number): number {
  if (days <= 2) return 1;
  if (days <= 5) return 2;
  return 3;
}

function allocateDays(days: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0) || weights.length;
  const raw = weights.map((w) => (w / total) * days);
  const floors = raw.map(Math.floor).map((n) => Math.max(1, n));
  let remainder = days - floors.reduce((a, b) => a + b, 0);
  // Distribute leftover days (from flooring) to the highest-weighted stops first.
  const highToLow = weights.map((w, i) => i).sort((a, b) => weights[b] - weights[a]);
  let idx = 0;
  while (remainder > 0 && idx < highToLow.length) {
    floors[highToLow[idx]] += 1;
    remainder -= 1;
    idx = (idx + 1) % highToLow.length;
  }
  // The Math.max(1, ...) floor above can push the total over `days` when one stop's weight
  // dominates the others (every stop still needs at least 1 day). Claw the excess back from
  // the lowest-weighted stops first, never dropping any stop below 1 day.
  const lowToHigh = [...highToLow].reverse();
  while (remainder < 0) {
    let reclaimed = false;
    for (const i of lowToHigh) {
      if (remainder >= 0) break;
      if (floors[i] > 1) {
        floors[i] -= 1;
        remainder += 1;
        reclaimed = true;
      }
    }
    if (!reclaimed) break; // every stop is already at the 1-day floor -- can't reconcile further
  }
  return floors;
}

export type ItineraryStop = {
  destination: string;
  dayStart: number;
  dayEnd: number;
  days: number;
  dailyCost: number;
  estimatedCost: number;
  safetyScore: number;
  safetyNotes: string;
  safetyNotesMm: string;
  visaRule: string;
  visaRuleMm: string;
  peakMonths: string[];
  shoulderMonths: string[];
  clusterLabel: string | null;
  clusterLabelMm: string | null;
  aiSuggestion: string | null;
};

export type ItineraryResult = {
  stops: ItineraryStop[];
  totalDays: number;
  totalEstimatedCost: number;
  budgetTotal: number;
  overBudget: boolean;
};

export async function generateItinerary(input: ItineraryInput): Promise<ItineraryResult> {
  const days = Math.max(1, Math.min(30, Math.round(input.days) || 1));
  const travelers = Math.max(1, Math.min(20, Math.round(input.travelers) || 1));
  const budgetPerDay = Math.max(1, input.budgetPerDayUSD || 50);

  const allDestinations = await getAllDestinations();
  const scored = allDestinations.map((profile) => {
    const ratio = budgetPerDay / profile.dailyCost;
    const tags = INTEREST_TAGS[profile.destination] || [];
    const interestMatch = input.interests.length === 0 || input.interests.some((i) => tags.includes(i as InterestKey));
    let score = budgetFit(ratio) * 0.6 + profile.safetyScore * 0.25;
    if (interestMatch) score += 25;
    if (input.travelMonth) {
      if (profile.shoulderMonths.includes(input.travelMonth)) score += 8;
      else if (!profile.peakMonths.includes(input.travelMonth)) score -= 5;
    }
    return { profile, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const stopCount = Math.min(planStopCounts(days), scored.length);
  const chosen = scored.slice(0, stopCount);
  const dayAllocations = allocateDays(days, chosen.map((c) => c.score));

  // Builds each stop's deterministic facts first (day range, cost, safety, cluster), then
  // asks Ollama for one short activity suggestion on top -- same "deterministic plan, optional
  // AI narrative layer" split used by the Decision Center's AI Insight, and for the same
  // reason: an LLM asked to invent the whole schedule can suggest something that doesn't fit
  // the day count or budget, but it can't get a plain suggestion-sentence wrong in a way that
  // breaks the plan.
  let cursor = 1;
  const stops: ItineraryStop[] = await Promise.all(
    chosen.map(async (c, i) => {
      const stopDays = dayAllocations[i];
      const dayStart = cursor;
      const dayEnd = dayStart + stopDays - 1;
      cursor = dayEnd + 1;

      const cluster = await getClusterForDestination(c.profile.destination);
      const prompt = `You are a Myanmar travel planner. In 2 sentences, suggest what a traveller should actually do during ${stopDays} day(s) in ${c.profile.destination} (a ${cluster?.label || "notable"} destination). Be specific and practical. Plain text only, no markdown, no preamble.`;
      const aiSuggestion = await generateAiInsight(prompt);

      return {
        destination: c.profile.destination,
        dayStart,
        dayEnd,
        days: stopDays,
        dailyCost: c.profile.dailyCost,
        estimatedCost: Math.round(c.profile.dailyCost * stopDays * travelers),
        safetyScore: c.profile.safetyScore,
        safetyNotes: c.profile.safetyNotes,
        safetyNotesMm: c.profile.safetyNotesMm,
        visaRule: c.profile.visaRule,
        visaRuleMm: c.profile.visaRuleMm,
        peakMonths: c.profile.peakMonths,
        shoulderMonths: c.profile.shoulderMonths,
        clusterLabel: cluster?.label ?? null,
        clusterLabelMm: cluster?.labelMm ?? null,
        aiSuggestion,
      };
    })
  );

  const totalEstimatedCost = stops.reduce((sum, s) => sum + s.estimatedCost, 0);
  const budgetTotal = Math.round(budgetPerDay * days * travelers);

  return {
    stops,
    totalDays: days,
    totalEstimatedCost,
    budgetTotal,
    overBudget: totalEstimatedCost > budgetTotal * 1.1, // 10% slack before flagging
  };
}
