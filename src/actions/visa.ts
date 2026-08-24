"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

export async function getVisaData(filters: GlobalFiltersState) {
    let rows = await getAnalyticsRows("visa_types", yearQuery(filters));
    if (filters.visaType && filters.visaType !== "All") {
        rows = rows.filter((row) => row.visa_type === filters.visaType);
    }

    const distributionMap: Record<string, { name: string; value: number }> = {};
    rows.forEach((row) => {
        const name = String(row.visa_type);
        distributionMap[name] ??= { name, value: 0 };
        distributionMap[name].value += Number(row.visitors || 0);
    });
    const visaDistribution = Object.values(distributionMap);

    const trendMap: Record<number, Record<string, number>> = {};
    rows.forEach((row) => {
        const year = Number(row.year);
        trendMap[year] ??= { year };
        const type = String(row.visa_type);
        trendMap[year][type] = (trendMap[year][type] || 0) + Number(row.visitors || 0);
    });
    const yearlyTrends = Object.values(trendMap).sort((a, b) => a.year - b.year);

    return {
        visaDistribution,
        yearlyTrends,
        total: visaDistribution.reduce((total, row) => total + row.value, 0),
    };
}
