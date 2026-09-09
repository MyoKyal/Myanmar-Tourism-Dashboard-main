"use server";

import { getAnalyticsRows, getAllDestinations } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";
import { CITY_TO_REGION, UNMAPPED_REGION_KEY, normalizePlace } from "@/lib/regionMapping";

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

export async function getDestinationsMapData(filters: GlobalFiltersState) {
    const q = yearQuery(filters);
    const [domestic, hotelRows, seasonality] = await Promise.all([
        getAnalyticsRows("domestic_visitors", q),
        // Hotel capacity is a snapshot, not a sum-over-years metric — when no single year is
        // selected, pull every year and let the latest-year logic below pick the right one.
        getAnalyticsRows("hotels_rooms", filters.year === "All" ? {} : q),
        getAllDestinations(),
    ]);

    const domesticMap: Record<string, { region: string; visitors: number }> = {};
    domestic.forEach((row) => {
        const region = String(row.region);
        domesticMap[region] ??= { region, visitors: 0 };
        domesticMap[region].visitors += Number(row.visitors_millions || 0) * 1_000_000;
    });

    let hotelSourceRows = hotelRows;
    if (filters.year === "All" && hotelRows.length) {
        const latestYear = Math.max(...hotelRows.map((row) => Number(row.year)));
        hotelSourceRows = hotelRows.filter((row) => Number(row.year) === latestYear);
    }

    const hotelMap: Record<string, { hotels: number; rooms: number }> = {};
    hotelSourceRows.forEach((row) => {
        const place = normalizePlace(String(row.place));
        const region = CITY_TO_REGION[place] || UNMAPPED_REGION_KEY;
        hotelMap[region] ??= { hotels: 0, rooms: 0 };
        hotelMap[region].hotels += Number(row.hotels || 0);
        hotelMap[region].rooms += Number(row.rooms || 0);
    });
    // The unmapped bucket is aggregated (so its capacity isn't silently lost from the totals
    // elsewhere on this page) but deliberately excluded from what the map matches against,
    // since UNMAPPED_REGION_KEY is designed to never match a real region name.
    const hotelCapacity = Object.entries(hotelMap)
        .filter(([region]) => region !== UNMAPPED_REGION_KEY)
        .map(([region, data]) => ({ region, hotels: data.hotels, rooms: data.rooms }));

    return {
        domesticVisitors: Object.values(domesticMap),
        hotelCapacity,
        seasonality,
    };
}
