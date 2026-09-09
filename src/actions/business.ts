"use server";

import { getAllDestinations, getDestinationProfile } from "@/lib/documentStore";
import { getCrowdMonitoring } from "@/actions/crowd";
import { getClusterForDestination } from "@/lib/destinationClusters";
import { generateAiInsight } from "@/lib/ollama";
import { MONTHS } from "@/lib/months";

// A business account has no owned hotel/tour-operator entity in the data model yet (that
// needs Phase 3's ownership-linking work), so this can't show a real occupancy/booking/
// revenue number for the user's own listing without inventing one. What IS real and already
// computed elsewhere: each destination's accommodation-pressure signal (Crowd Monitoring),
// its seasonality and typical cost (the destinations catalog), and its data-driven category
// (clustering). Reusing those same real signals here, scoped to whichever market the business
// user asks about, gives them something genuinely actionable today instead of a fabricated
// dashboard -- the same real-vs-simulated-data discipline the rest of this app follows.
export type BusinessMarketInsights = {
  destination: string;
  region: string;
  year: number;
  pressureLevel: "LOW" | "MODERATE" | "HIGH" | "OVERCROWDED" | "UNKNOWN";
  roomsPer1000Visitors: number | null;
  nationalMedianRoomsPer1000: number | null;
  domesticVisitors: number;
  hotelRooms: number;
  dailyCost: number;
  peakMonths: string[];
  shoulderMonths: string[];
  seasonNow: "peak" | "shoulder" | "off";
  clusterLabel: string | null;
  clusterLabelMm: string | null;
  aiInsight: string | null;
};

export async function getBusinessDestinationOptions(): Promise<string[]> {
  const destinations = await getAllDestinations();
  return destinations.map((d) => d.destination);
}

export async function getBusinessMarketInsights(destination: string): Promise<BusinessMarketInsights | null> {
  const [crowd, profile, cluster] = await Promise.all([
    getCrowdMonitoring(),
    getDestinationProfile(destination),
    getClusterForDestination(destination),
  ]);
  const signal = crowd.signals.find((s) => s.destination === destination);
  if (!signal || !profile) return null;

  const currentMonth = MONTHS[new Date().getMonth()];
  const seasonNow: BusinessMarketInsights["seasonNow"] = profile.peakMonths.includes(currentMonth)
    ? "peak"
    : profile.shoulderMonths.includes(currentMonth)
      ? "shoulder"
      : "off";

  // AI Insight: same "deterministic facts, optional AI narrative" split used by the Decision
  // Center and AI Itinerary -- best-effort only, and every number above is already correct
  // and shown either way if Ollama isn't running.
  const prompt = `You are a practical tourism business advisor in Myanmar. A hotel or tour operator in ${destination} wants a short read on their current local market. Facts: accommodation pressure (hotel-room supply vs. domestic-visitor demand) is currently ${signal.pressureLevel} for this region (${signal.roomsPer1000Visitors ?? "unknown"} rooms per 1,000 domestic visitors, vs. a national median of ${crowd.nationalMedianRoomsPer1000}); it is currently ${seasonNow} season for this destination. In 2-3 sentences, explain what this means for them and give one concrete, practical suggestion (pricing, staffing, or promotion). Plain text only, no markdown, no preamble.`;
  const aiInsight = await generateAiInsight(prompt);

  return {
    destination,
    region: signal.region,
    year: crowd.year,
    pressureLevel: signal.pressureLevel,
    roomsPer1000Visitors: signal.roomsPer1000Visitors,
    nationalMedianRoomsPer1000: crowd.nationalMedianRoomsPer1000,
    domesticVisitors: signal.domesticVisitors,
    hotelRooms: signal.hotelRooms,
    dailyCost: profile.dailyCost,
    peakMonths: profile.peakMonths,
    shoulderMonths: profile.shoulderMonths,
    seasonNow,
    clusterLabel: cluster?.label ?? null,
    clusterLabelMm: cluster?.labelMm ?? null,
    aiInsight,
  };
}
