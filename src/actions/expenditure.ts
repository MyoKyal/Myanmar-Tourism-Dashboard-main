"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

export async function getExpenditureData(filters: GlobalFiltersState) {
    const [rows, allRows, gdpRows, receiptsRows] = await Promise.all([
        getAnalyticsRows("expenditure", yearQuery(filters)),
        // GDP contribution and the revenue forecast are always computed over the full
        // expenditure history, independent of the page's Year filter -- both are only
        // meaningful as multi-year trends, the same reasoning used for the Myanmar vs
        // ASEAN Country comparison on the International Tourism page. Bug fixed here:
        // this used to reuse the year-filtered `rows`/`pivot` below, so picking a single
        // year on this page collapsed the GDP chart to one data point instead of the
        // full trend it's designed to show.
        getAnalyticsRows("expenditure"),
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

    const allPivot: Record<number, Record<string, number>> = {};
    allRows.forEach((row) => {
        const year = Number(row.year);
        allPivot[year] ??= { year };
        allPivot[year][String(row.category)] = Number(row.value || 0);
    });
    const allYearlyTrends = Object.values(allPivot).sort((a, b) => a.year - b.year);

    const expenditureByYear: Record<number, number> = {};
    allYearlyTrends.forEach((row) => { expenditureByYear[Number(row.year)] = Number(row["Total Expenditure (US$)"] || 0); });

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

    // Next-year revenue forecast, via the same trailing-window linear regression used for
    // the arrivals forecast on the Time Trends page (see getTrendsData in trends.ts) --
    // same reasoning applies: a regression over the full 2015-2025 history gets dominated
    // by the 2020-2022 pandemic crash, so this uses a trailing window (last 5 years, or
    // fewer if shorter) to reflect the current trajectory. Kept as a plain, explainable OLS
    // line rather than a fancier model for the same transparency reason documented there.
    let revenueForecast: { year: number; projectedUsdM: number; growthRateUsed: number; windowYears: number } | null = null;
    const revenueWindow = allYearlyTrends
        .filter((row) => Number(row["Total Expenditure (US$)"] || 0) > 0)
        .slice(-5);
    if (revenueWindow.length >= 2) {
        const n = revenueWindow.length;
        const xMean = revenueWindow.reduce((sum, row) => sum + row.year, 0) / n;
        const yMean = revenueWindow.reduce((sum, row) => sum + Number(row["Total Expenditure (US$)"] || 0), 0) / n;
        let num = 0, den = 0;
        for (const row of revenueWindow) {
            const y = Number(row["Total Expenditure (US$)"] || 0);
            num += (row.year - xMean) * (y - yMean);
            den += (row.year - xMean) ** 2;
        }
        const slope = den !== 0 ? num / den : 0;
        const intercept = yMean - slope * xMean;
        const nextYear = revenueWindow[n - 1].year + 1;
        const projectedUsdM = Math.max(0, Number((slope * nextYear + intercept).toFixed(1)));
        const lastActual = Number(revenueWindow[n - 1]["Total Expenditure (US$)"] || 0);
        const growthRateUsed = lastActual > 0
            ? parseFloat((((projectedUsdM - lastActual) / lastActual) * 100).toFixed(1))
            : 0;
        revenueForecast = { year: nextYear, projectedUsdM, growthRateUsed, windowYears: n };
    }

    return {
        totalExpenditure,
        estimatedPerVisitor: totalArrivals > 0 ? ((totalExpenditure * 1_000_000) / totalArrivals).toFixed(2) : "0",
        avgPerDay: average("Average Expenditure per day per person").toFixed(2),
        avgLengthOfStay: average("Average Length of Stay (Night)").toFixed(1),
        yearlyTrends,
        gdpImpact,
        latestGdpImpact,
        revenueForecast,
    };
}
