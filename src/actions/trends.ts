"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";

export async function getTrendsData(filters: GlobalFiltersState) {
    const db = getDb();

    // We only apply location filters here if relevant, but typically timeframe is filtered internally
    // For trends, we want the whole timeline to show trends, unless restricted by yearRange.
    let rangeCondition = "";
    const params: any[] = [];
    if (filters.yearRange) {
        rangeCondition = "AND year >= ? AND year <= ?";
        params.push(filters.yearRange[0], filters.yearRange[1]);
    }

    // 1. Yearly Arrivals
    const yearlyRows = db.prepare(`SELECT year, SUM(visitors) as total FROM fast_facts WHERE gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total') ${rangeCondition} GROUP BY year ORDER BY year`).all(...params) as any[];

    // Calculate YoY Growth
    const yearly = yearlyRows.map((row, index) => {
        let yoy = 0;
        if (index > 0 && yearlyRows[index - 1].total > 0) {
            yoy = ((row.total - yearlyRows[index - 1].total) / yearlyRows[index - 1].total) * 100;
        }
        return {
            ...row,
            yoy: parseFloat(yoy.toFixed(1))
        };
    });

    // 2. Monthly Seasonality (Averaged across years? We only have the generic Monthly_Visitor_Arrivals which looks like 2024 or an aggregate)
    // Actually Monthly_Visitor_Arrivals has 'month' and 'total'. Since there's no year column, we just display it as typical seasonality.
    const seasonality = db.prepare(`SELECT month, SUM(total_visitors) as total FROM monthly_visitors GROUP BY month`).all() as any[];
    // Order months chronologically
    const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    seasonality.sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    // 3. Pandemic Timeline Comparison
    let preCovid = 0; // 2015-2019
    let covid = 0; // 2020-2022
    let recovery = 0; // 2023-2024

    for (const r of yearlyRows) {
        if (r.year <= 2019) preCovid += r.total;
        else if (r.year <= 2022) covid += r.total;
        else recovery += r.total;
    }

    const periods = [
        { period: "Pre-COVID (15-19)", total: preCovid },
        { period: "COVID (20-22)", total: covid },
        { period: "Recovery (23-24)", total: recovery }
    ];

    // 4. Next-year forecast via simple linear regression over the *recent* yearly totals.
    // A regression over the full history gets dominated by the 2020-2022 pandemic crash and
    // produces a nonsensical downward trend, so this uses a trailing window (last 5 years,
    // or fewer if the filtered range is shorter) to reflect the current trajectory instead.
    // Transparent, explainable projection (matches the rules-based approach used in the
    // Decision Center) rather than an opaque model.
    let forecast: { year: number; projected: number; growthRateUsed: number; windowYears: number } | null = null;
    const trendWindow = yearlyRows.slice(-5);
    if (trendWindow.length >= 2) {
        const n = trendWindow.length;
        const xMean = trendWindow.reduce((sum, r) => sum + r.year, 0) / n;
        const yMean = trendWindow.reduce((sum, r) => sum + r.total, 0) / n;
        let num = 0, den = 0;
        for (const r of trendWindow) {
            num += (r.year - xMean) * (r.total - yMean);
            den += (r.year - xMean) ** 2;
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
        forecast
    };
}
