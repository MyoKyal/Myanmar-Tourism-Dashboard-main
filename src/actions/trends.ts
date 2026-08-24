"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

const GATEWAYS = ["International Airports", "Cruise (By Sea)", "Land Borders Total"];
const MONTH_ORDER = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export async function getTrendsData(filters: GlobalFiltersState) {
    // Trends charts are inherently multi-year (YoY growth, pandemic timeline, forecast),
    // so this page uses a From/To year-range control instead of the single "year" dropdown
    // the other analytics pages use -- collapsing to one year would break those charts.
    const range = filters.yearRange ? { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] } : {};

    const [factsRows, monthlyRows] = await Promise.all([
        getAnalyticsRows("fast_facts", range),
        getAnalyticsRows("monthly_visitors"),
    ]);

    // 1. Yearly Arrivals
    const totalsByYear: Record<number, number> = {};
    factsRows
        .filter((row) => GATEWAYS.includes(String(row.gateway)))
        .forEach((row) => {
            const year = Number(row.year);
            totalsByYear[year] = (totalsByYear[year] || 0) + Number(row.visitors || 0);
        });
    const years = Object.keys(totalsByYear).map(Number).sort((a, b) => a - b);

    // Calculate YoY Growth
    const yearly = years.map((year, index) => {
        const total = totalsByYear[year];
        let yoy = 0;
        if (index > 0 && totalsByYear[years[index - 1]] > 0) {
            yoy = ((total - totalsByYear[years[index - 1]]) / totalsByYear[years[index - 1]]) * 100;
        }
        return { year, total, yoy: parseFloat(yoy.toFixed(1)) };
    });

    // 2. Monthly Seasonality
    const seasonalityMap: Record<string, { month: string; total: number }> = {};
    monthlyRows.forEach((row) => {
        const month = String(row.month);
        seasonalityMap[month] ??= { month, total: 0 };
        seasonalityMap[month].total += Number(row.total_visitors || 0);
    });
    const seasonality = Object.values(seasonalityMap).sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));

    // 3. Pandemic Timeline Comparison
    let preCovid = 0; // 2015-2019
    let covid = 0; // 2020-2022
    let recovery = 0; // 2023-2024
    for (const year of years) {
        if (year <= 2019) preCovid += totalsByYear[year];
        else if (year <= 2022) covid += totalsByYear[year];
        else recovery += totalsByYear[year];
    }
    const periods = [
        { period: "Pre-COVID (15-19)", total: preCovid },
        { period: "COVID (20-22)", total: covid },
        { period: "Recovery (23-24)", total: recovery },
    ];

    // 4. Next-year forecast via simple linear regression over the *recent* yearly totals.
    // A regression over the full history gets dominated by the 2020-2022 pandemic crash and
    // produces a nonsensical downward trend, so this uses a trailing window (last 5 years,
    // or fewer if the filtered range is shorter) to reflect the current trajectory instead.
    // Transparent, explainable projection (matches the rules-based approach used in the
    // Decision Center) rather than an opaque model.
    let forecast: { year: number; projected: number; growthRateUsed: number; windowYears: number } | null = null;
    const trendWindow = yearly.slice(-5);
    if (trendWindow.length >= 2) {
        const n = trendWindow.length;
        const xMean = trendWindow.reduce((sum, row) => sum + row.year, 0) / n;
        const yMean = trendWindow.reduce((sum, row) => sum + row.total, 0) / n;
        let num = 0, den = 0;
        for (const row of trendWindow) {
            num += (row.year - xMean) * (row.total - yMean);
            den += (row.year - xMean) ** 2;
        }
        const slope = den !== 0 ? num / den : 0;
        const intercept = yMean - slope * xMean;
        const nextYear = trendWindow[n - 1].year + 1;
        const projected = Math.max(0, Math.round(slope * nextYear + intercept));
        const lastActual = trendWindow[n - 1].total;
        const growthRateUsed = lastActual > 0
            ? parseFloat((((projected - lastActual) / lastActual) * 100).toFixed(1))
            : 0;
        forecast = { year: nextYear, projected, growthRateUsed, windowYears: n };
    }

    return {
        yearly,
        seasonality,
        periods,
        forecast,
    };
}
