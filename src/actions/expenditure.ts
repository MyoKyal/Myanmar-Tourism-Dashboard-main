"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

export async function getExpenditureData(filters: GlobalFiltersState) {
    const [rows, gdpRows, receiptsRows] = await Promise.all([
        getAnalyticsRows("expenditure", yearQuery(filters)),
        // GDP and World Bank tourism receipts are always fetched for their full history,
        // independent of the page's Year filter -- tourism's share of GDP is only
        // meaningful as a multi-year trend, the same reasoning used for the Myanmar vs
        // ASEAN Country comparison on the International Tourism page.
        getAnalyticsRows("worldbank_gdp"),
        getAnalyticsRows("worldbank_tourism_receipts"),
    ]);

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

    // Tourism's share of GDP: our own "Total Expenditure (US$)" figure (in millions) against
    // real, independently-published GDP figures from the World Bank (in raw US$). Only years
    // present in both sources produce a data point -- World Bank GDP covers 2013-2025 for
    // Myanmar, but its own tourism receipts series stops at 2019 (pandemic/coup-era reporting
    // gap), so receiptsUsdM is left undefined for years it doesn't cover rather than guessed.
    const gdpByYear: Record<number, number> = {};
    gdpRows.forEach((row) => { gdpByYear[Number(row.year)] = Number(row.gdpUsd || 0); });
    // worldbank_tourism_receipts now covers Myanmar plus its ASEAN neighbors (for the
    // revenue benchmark on the International Tourism page) -- scope to Myanmar only here.
    const receiptsByYear: Record<number, number> = {};
    receiptsRows.filter((row) => row.country === 'Myanmar').forEach((row) => { receiptsByYear[Number(row.year)] = Number(row.receiptsUsd || 0); });

    const expenditureByYear: Record<number, number> = {};
    Object.values(pivot).forEach((row) => { expenditureByYear[Number(row.year)] = Number(row["Total Expenditure (US$)"] || 0); });

    const gdpImpact = Object.keys(expenditureByYear)
        .map(Number)
        .filter((year) => gdpByYear[year] > 0)
        .sort((a, b) => a - b)
        .map((year) => {
            const expenditureUsdM = expenditureByYear[year];
            const gdpUsdM = gdpByYear[year] / 1_000_000;
            return {
                year,
                expenditureUsdM: Number(expenditureUsdM.toFixed(1)),
                gdpUsdM: Number(gdpUsdM.toFixed(1)),
                gdpContributionPct: Number(((expenditureUsdM / gdpUsdM) * 100).toFixed(2)),
                worldBankReceiptsUsdM: receiptsByYear[year] ? Number((receiptsByYear[year] / 1_000_000).toFixed(1)) : undefined,
            };
        });
    const latestGdpImpact = gdpImpact.length ? gdpImpact[gdpImpact.length - 1] : null;

    return {
        totalExpenditure,
        estimatedPerVisitor: totalArrivals > 0 ? ((totalExpenditure * 1_000_000) / totalArrivals).toFixed(2) : "0",
        avgPerDay: average("Average Expenditure per day per person").toFixed(2),
        avgLengthOfStay: average("Average Length of Stay (Night)").toFixed(1),
        yearlyTrends,
        gdpImpact,
        latestGdpImpact,
    };
}
