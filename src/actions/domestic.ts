"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

const GATEWAYS = ["International Airports", "Cruise (By Sea)", "Land Borders Total"];

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

function sum(rows: Record<string, unknown>[], field: string) {
    return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

export async function getDomesticData(filters: GlobalFiltersState) {
    const q = yearQuery(filters);
    const [domestic, intl] = await Promise.all([
        getAnalyticsRows("domestic_visitors", q),
        getAnalyticsRows("fast_facts", q),
    ]);
    const intlArrivals = intl.filter((row) => GATEWAYS.includes(String(row.gateway)));

    const regionMap: Record<string, { name: string; visitors: number }> = {};
    domestic.forEach((row) => {
        const name = String(row.region);
        regionMap[name] ??= { name, visitors: 0 };
        regionMap[name].visitors += Number(row.visitors_millions || 0) * 1_000_000;
    });
    const regions = Object.values(regionMap).sort((a, b) => b.visitors - a.visitors);

    const trendMap: Record<number, { year: number; domestic: number; intl: number }> = {};
    domestic.forEach((row) => {
        const year = Number(row.year);
        trendMap[year] ??= { year, domestic: 0, intl: 0 };
        trendMap[year].domestic += Number(row.visitors_millions || 0) * 1_000_000;
    });
    intlArrivals.forEach((row) => {
        const year = Number(row.year);
        trendMap[year] ??= { year, domestic: 0, intl: 0 };
        trendMap[year].intl += Number(row.visitors || 0);
    });

    const totalDomestic = sum(domestic, "visitors_millions") * 1_000_000;
    const totalIntl = sum(intlArrivals, "visitors");

    return {
        totalDomestic,
        totalIntl,
        regions,
        yearlyTrends: Object.values(trendMap).sort((a, b) => a.year - b.year),
    };
}
