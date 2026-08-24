"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

export async function getExpenditureData(filters: GlobalFiltersState) {
    const rows = await getAnalyticsRows("expenditure", yearQuery(filters));

    // Pivot category rows into one row per year (Recharts wants year -> {category: value}).
    const pivot: Record<number, Record<string, number>> = {};
    rows.forEach((row) => {
        const year = Number(row.year);
        pivot[year] ??= { year };
        pivot[year][String(row.category)] = Number(row.value || 0);
    });
    const yearlyTrends = Object.values(pivot).sort((a, b) => a.year - b.year);

    const totalExpenditure = yearlyTrends.reduce((total, row) => total + Number(row["Total Expenditure (US$)"] || 0), 0);
    const totalArrivals = yearlyTrends.reduce((total, row) => total + Number(row["Tourist Arrivals"] || 0), 0);

    const average = (key: string) =>
        yearlyTrends.length ? yearlyTrends.reduce((total, row) => total + Number(row[key] || 0), 0) / yearlyTrends.length : 0;

    return {
        totalExpenditure,
        estimatedPerVisitor: totalArrivals > 0 ? ((totalExpenditure * 1_000_000) / totalArrivals).toFixed(2) : "0",
        avgPerDay: average("Average Expenditure per day per person").toFixed(2),
        avgLengthOfStay: average("Average Length of Stay (Night)").toFixed(1),
        yearlyTrends,
    };
}
