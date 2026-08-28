"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

const GATEWAYS = ["International Airports", "Cruise (By Sea)", "Land Borders Total"];

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

export async function getHotelsData(filters: GlobalFiltersState) {
    let rows = await getAnalyticsRows("hotels_rooms", yearQuery(filters));

    // Hotel capacity is a point-in-time snapshot, not something to sum across years —
    // when no single year is selected, use the latest year within the filtered range.
    if (filters.year === "All" && rows.length) {
        const latestYear = Math.max(...rows.map((row) => Number(row.year)));
        rows = rows.filter((row) => Number(row.year) === latestYear);
    }

    const regionMap: Record<string, { name: string; hotels: number; rooms: number }> = {};
    rows.forEach((row) => {
        const name = String(row.place);
        regionMap[name] ??= { name, hotels: 0, rooms: 0 };
        regionMap[name].hotels += Number(row.hotels || 0);
        regionMap[name].rooms += Number(row.rooms || 0);
    });
    const regions = Object.values(regionMap).sort((a, b) => b.rooms - a.rooms).slice(0, 15);

    const totalHotels = rows.reduce((total, row) => total + Number(row.hotels || 0), 0);
    const totalRooms = rows.reduce((total, row) => total + Number(row.rooms || 0), 0);

    // Trends always span the full selected year range, regardless of the single-year snapshot above.
    const trendRows = await getAnalyticsRows("hotels_rooms", filters.yearRange ? { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] } : {});
    const trendMap: Record<number, { year: number; hotels: number; rooms: number }> = {};
    trendRows.forEach((row) => {
        const year = Number(row.year);
        trendMap[year] ??= { year, hotels: 0, rooms: 0 };
        trendMap[year].hotels += Number(row.hotels || 0);
        trendMap[year].rooms += Number(row.rooms || 0);
    });

    // Capacity vs. demand: room supply only means something next to how many visitors
    // actually showed up. Always compares the full history (not the page's year filter)
    // since the point is to see whether supply has kept pace with demand over time.
    const [intlRows, domesticRows] = await Promise.all([
        getAnalyticsRows("fast_facts"),
        getAnalyticsRows("domestic_visitors"),
    ]);
    const visitorsByYear: Record<number, number> = {};
    intlRows.filter((row) => GATEWAYS.includes(String(row.gateway))).forEach((row) => {
        const year = Number(row.year);
        visitorsByYear[year] = (visitorsByYear[year] || 0) + Number(row.visitors || 0);
    });
    domesticRows.forEach((row) => {
        const year = Number(row.year);
        visitorsByYear[year] = (visitorsByYear[year] || 0) + Number(row.visitors_millions || 0) * 1_000_000;
    });

    const capacityVsDemand = Object.values(trendMap)
        .filter((row) => visitorsByYear[row.year] > 0)
        .sort((a, b) => a.year - b.year)
        .map((row) => ({
            year: row.year,
            rooms: row.rooms,
            visitors: visitorsByYear[row.year],
            roomsPer1000Visitors: Number(((row.rooms / visitorsByYear[row.year]) * 1000).toFixed(2)),
        }));

    return {
        totalHotels,
        totalRooms,
        avgRoomsPerHotel: totalHotels ? (totalRooms / totalHotels).toFixed(1) : "0",
        regions,
        yearlyTrends: Object.values(trendMap).sort((a, b) => a.year - b.year),
        capacityVsDemand,
    };
}
