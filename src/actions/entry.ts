"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

function groupByGateway(rows: Record<string, unknown>[]) {
    const map: Record<string, { name: string; value: number }> = {};
    rows.forEach((row) => {
        const name = String(row.gateway);
        map[name] ??= { name, value: 0 };
        map[name].value += Number(row.visitors || 0);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
}

export async function getEntryPointData(filters: GlobalFiltersState) {
    const q = yearQuery(filters);
    const [airportRows, borderRows, seaportRows, fastFacts] = await Promise.all([
        getAnalyticsRows("intl_airports", q),
        getAnalyticsRows("border_entry_points", q),
        getAnalyticsRows("intl_seaport", q),
        getAnalyticsRows("fast_facts"),
    ]);

    const airports = groupByGateway(airportRows);
    const borders = groupByGateway(borderRows);
    const seaports = groupByGateway(seaportRows);

    const composition = [
        { name: "Airports", value: airports.reduce((total, row) => total + row.value, 0) },
        { name: "Land Borders", value: borders.reduce((total, row) => total + row.value, 0) },
        { name: "Seaports", value: seaports.reduce((total, row) => total + row.value, 0) },
    ];

    // Historical trends always span the full dataset, split by gateway category.
    const trendMap: Record<number, { year: number; Airports?: number; ["Land Borders"]?: number; Seaports?: number }> = {};
    fastFacts.forEach((row) => {
        const year = Number(row.year);
        const gateway = String(row.gateway);
        if (!["International Airports", "Land Borders Total", "Cruise (By Sea)"].includes(gateway)) return;
        trendMap[year] ??= { year };
        const total = Number(row.visitors || 0);
        if (gateway === "International Airports") trendMap[year]["Airports"] = total;
        if (gateway === "Land Borders Total") trendMap[year]["Land Borders"] = total;
        if (gateway === "Cruise (By Sea)") trendMap[year]["Seaports"] = total;
    });
    const yearlyTrends = Object.values(trendMap).sort((a, b) => a.year - b.year);

    return {
        airports,
        borders,
        seaports,
        composition,
        yearlyTrends,
        total: composition.reduce((total, row) => total + row.value, 0),
    };
}
