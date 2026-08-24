"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

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

    return {
        totalHotels,
        totalRooms,
        avgRoomsPerHotel: totalHotels ? (totalRooms / totalHotels).toFixed(1) : "0",
        regions,
        yearlyTrends: Object.values(trendMap).sort((a, b) => a.year - b.year),
    };
}
