"use server";

import { getExpenditureData } from "@/actions/expenditure";
import { getHotelsData } from "@/actions/hotels";
import { getIntlTourismData } from "@/actions/intl";
import { GlobalFiltersState } from "@/lib/FilterContext";

// One stat tile per business angle built across the Expenditure, Hotels, and International
// pages this session -- GDP contribution, revenue forecast, capacity vs. demand, and the
// ASEAN revenue benchmark. Reuses those pages' own server actions rather than recomputing
// the underlying aggregation, so this is always consistent with what each page shows.
export async function getBusinessSnapshot(filters: GlobalFiltersState) {
    const [expenditure, hotels, intl] = await Promise.all([
        getExpenditureData(filters),
        getHotelsData(filters),
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

    const capacityTrend = hotels.capacityVsDemand.map((row) => row.roomsPer1000Visitors);
    const capacityFirst = hotels.capacityVsDemand[0];
    const capacityLast = hotels.capacityVsDemand[hotels.capacityVsDemand.length - 1];
    const capacityDeltaPct = capacityFirst && capacityLast && capacityFirst.roomsPer1000Visitors > 0
        ? Number((((capacityLast.roomsPer1000Visitors - capacityFirst.roomsPer1000Visitors) / capacityFirst.roomsPer1000Visitors) * 100).toFixed(1))
        : null;

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
        capacity: {
            roomsPer1000: capacityLast?.roomsPer1000Visitors ?? null,
            year: capacityLast?.year ?? null,
            deltaPct: capacityDeltaPct,
            trend: capacityTrend,
        },
        aseanRank: {
            rank: myanmarRank || null,
            outOf: intl.revenueBenchmark.length,
            receiptsUsdM: myanmarRevenue?.receiptsUsdM ?? null,
            year: myanmarRevenue?.year ?? null,
        },
    };
}
