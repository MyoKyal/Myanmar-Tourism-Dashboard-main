"use server";

import { getAnalyticsRows, getAllDestinations } from "@/lib/documentStore";
import { CITY_TO_REGION, UNMAPPED_REGION_KEY, normalizePlace } from "@/lib/regionMapping";

// Each curated destination's real state/region -- distinct from CITY_TO_REGION (which maps
// individual hotel-survey towns to regions): this maps the Decision Center's destination
// catalog itself, which is already at city or region granularity, to the region key that
// domestic-visitor and hotel data is reported under. Two destinations in the same region
// (Bagan and Mandalay both sit in Mandalay Region) necessarily share one signal below --
// domestic tourism and hotel-room data isn't tracked at city granularity, so anything finer
// would be invented, not measured.
const DESTINATION_REGION_KEY: Record<string, string> = {
  Yangon: "yangon", Mandalay: "mandalay", Bagan: "mandalay", "Inle Lake": "shan",
  "Ngapali Beach": "rakhine", "Shan State": "shan", "Mon State": "mon", "Rakhine State": "rakhine",
  "Chin State": "chin", "Kayin State": "kayin", "Kachin State": "kachin", "Sagaing Region": "sagaing",
  "Tanintharyi Region": "tanintharyi", "Ayeyarwady Region": "ayeyarwady", Naypyidaw: "naypyitaw",
  "Bago Region": "bago", "Kayah State": "kayah", "Magway Region": "magway",
};

// Domestic_Visitor_Arrivals.csv's own "State & Region" column spells this "Ayeyawaddy" (no
// "r", double "d") -- a real, officially-reported alternate transliteration, not a typo to
// "fix" in the source data. Every other internal region key in this app (CITY_TO_REGION,
// DESTINATION_REGION_KEY above) already standardized on "ayeyarwady", so this alias reconciles
// the raw CSV spelling to that same key -- without it, domestic-visitor lookups for Ayeyarwady
// silently returned 0 (a real bug caught by checking this feature's output against the raw
// CSV, not a genuine reporting gap like Chin/Kayah's near-zero recent-year figures).
const REGION_NAME_ALIASES: Record<string, string> = { ayeyawaddy: "ayeyarwady" };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export type CrowdSignal = {
  destination: string;
  region: string;
  domesticVisitors: number;
  hotelRooms: number;
  roomsPer1000Visitors: number | null;
  pressureLevel: "LOW" | "MODERATE" | "HIGH" | "OVERCROWDED" | "UNKNOWN";
  year: number;
};

export type CrowdMonitoringResult = {
  signals: CrowdSignal[];
  nationalMedianRoomsPer1000: number | null;
  year: number;
};

// Accommodation-pressure proxy, not literal foot-traffic crowding: this app has no real-time
// visitor-counting or ticketing data (the honest options per the brief are real-time,
// periodic, manual, or predicted -- a live headcount at Bagan's temples simply isn't one of
// them). What IS real is each region's domestic-visitor volume and hotel-room supply, both
// already ingested. Rooms-per-1000-visitors, benchmarked against the national average of that
// same real ratio, is a defensible stand-in for "is this area under more visitor pressure
// than most" -- clearly labeled as such in the UI rather than presented as a live crowd count.
export async function getCrowdMonitoring(): Promise<CrowdMonitoringResult> {
  const [domesticRows, hotelRows, destinations] = await Promise.all([
    getAnalyticsRows("domestic_visitors"),
    getAnalyticsRows("hotels_rooms"),
    getAllDestinations(),
  ]);

  const latestDomesticYear = Math.max(...domesticRows.map((r) => Number(r.year)));
  const latestHotelYear = Math.max(...hotelRows.map((r) => Number(r.year)));

  const domesticByRegion: Record<string, number> = {};
  domesticRows.filter((r) => Number(r.year) === latestDomesticYear).forEach((r) => {
    const raw = normalizePlace(String(r.region));
    const region = REGION_NAME_ALIASES[raw] || raw;
    domesticByRegion[region] = (domesticByRegion[region] || 0) + Number(r.visitors_millions || 0) * 1_000_000;
  });

  const roomsByRegion: Record<string, number> = {};
  hotelRows.filter((r) => Number(r.year) === latestHotelYear).forEach((r) => {
    const place = normalizePlace(String(r.place));
    const region = CITY_TO_REGION[place] || UNMAPPED_REGION_KEY;
    if (region === UNMAPPED_REGION_KEY) return;
    roomsByRegion[region] = (roomsByRegion[region] || 0) + Number(r.rooms || 0);
  });

  const rawSignals = destinations
    .filter((d) => DESTINATION_REGION_KEY[d.destination])
    .map((d) => {
      const regionKey = DESTINATION_REGION_KEY[d.destination];
      const domesticVisitors = domesticByRegion[regionKey] || 0;
      const hotelRooms = roomsByRegion[regionKey] || 0;
      const roomsPer1000Visitors = domesticVisitors > 0 ? Number(((hotelRooms / domesticVisitors) * 1000).toFixed(2)) : null;
      return { destination: d.destination, region: regionKey, domesticVisitors, hotelRooms, roomsPer1000Visitors };
    });

  // Median, not mean: Rakhine's ratio is a genuine outlier (Ngapali's resort-heavy room
  // count against a comparatively small reported domestic-visitor figure for the whole
  // state), and a mean gets dragged far enough by one outlier that most other destinations
  // would misleadingly land in the bottom "overcrowded" bucket relative to it. The median is
  // the typical destination's real ratio, not skewed by the one that isn't typical.
  const validRatios = rawSignals.map((s) => s.roomsPer1000Visitors).filter((v): v is number => v != null);
  const nationalMedian = validRatios.length ? median(validRatios) : null;

  const signals: CrowdSignal[] = rawSignals.map((s) => {
    let pressureLevel: CrowdSignal["pressureLevel"] = "UNKNOWN";
    if (s.roomsPer1000Visitors != null && nationalMedian) {
      const ratio = s.roomsPer1000Visitors / nationalMedian;
      pressureLevel = ratio >= 1.3 ? "LOW" : ratio >= 0.8 ? "MODERATE" : ratio >= 0.5 ? "HIGH" : "OVERCROWDED";
    }
    return { ...s, pressureLevel, year: latestDomesticYear };
  });

  return { signals, nationalMedianRoomsPer1000: nationalMedian ? Number(nationalMedian.toFixed(2)) : null, year: latestDomesticYear };
}
