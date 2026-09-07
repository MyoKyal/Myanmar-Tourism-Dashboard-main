"use server";

import { getExpenditureData } from "@/actions/expenditure";
import { getIntlTourismData } from "@/actions/intl";
import { GlobalFiltersState } from "@/lib/FilterContext";

// One stat tile per business angle built across the Expenditure and International pages
// this session -- GDP contribution, revenue forecast, and the ASEAN revenue benchmark.
// Reuses those pages' own server actions rather than recomputing the underlying
// aggregation, so this is always consistent with what each page shows. (A "Rooms per
// 1,000 Visitors" tile lived here too, sourced from Hotels' capacity-vs-demand data, but
// was removed as a duplicate of the same metric already on the Hotels page -- removed the
// getHotelsData call along with it since nothing else here needed it.)
export async function getBusinessSnapshot(filters: GlobalFiltersState) {
    const [expenditure, intl] = await Promise.all([
        getExpenditureData(filters),
        getIntlTourismData(filters),
    ]);

    const gdpTrend = expenditure.gdpImpact.map((row) => row.gdpContributionPct);
    const gdpFirst = expenditure.gdpImpact[0];
    const gdpLast = expenditure.latestGdpImpact;
    const gdpDelta = gdpFirst && gdpLast ? Number((gdpLast.gdpContributionPct - gdpFirst.gdpContributionPct).toFixed(2)) : null;

    const revenueTrend = expenditure.yearlyTrends
        .map((row: any) => Number(row["Total Expenditure (US$)"] || 0))
        .filter((v: number) => v > 0);
    if (expenditure.revenueForecast) revenueTrend.push(expenditure.revenueForecast.projectedUsdM);

    const myanmarRank = intl.revenueBenchmark.findIndex((row) => row.isMyanmar) + 1;
    const myanmarRevenue = intl.revenueBenchmark.find((row) => row.isMyanmar) || null;

    return {
        gdp: {
            valuePct: gdpLast?.gdpContributionPct ?? null,
            year: gdpLast?.year ?? null,
            deltaPct: gdpDelta,
            trend: gdpTrend,
        },
        revenueForecast: {
            projectedUsdM: expenditure.revenueForecast?.projectedUsdM ?? null,
            year: expenditure.revenueForecast?.year ?? null,
            growthRateUsed: expenditure.revenueForecast?.growthRateUsed ?? null,
            trend: revenueTrend,
        },
        aseanRank: {
            rank: myanmarRank || null,
            outOf: intl.revenueBenchmark.length,
            receiptsUsdM: myanmarRevenue?.receiptsUsdM ?? null,
            year: myanmarRevenue?.year ?? null,
        },
    };
}
