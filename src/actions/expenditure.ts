"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";
import { trailingLinearForecast, detectAnomalies } from "@/lib/statistics";

const GATEWAYS = ["International Airports", "Cruise (By Sea)", "Land Borders Total"];

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

export async function getExpenditureData(filters: GlobalFiltersState) {
    const [rows, allRows, gdpRows, receiptsRows, arrivalsRows] = await Promise.all([
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
        // Fetched only for the forecast cross-check below (see forecastConsistencyNote) --
        // arrivals themselves are already charted on the Time Trends page.
        getAnalyticsRows("fast_facts"),
    ]);

    // Pivot category rows into one row per year (Recharts wants year -> {category: value}).
    const pivot: Record<number, Record<string, number>> = {};
    rows.forEach((row) => {
        const year = Number(row.year);
        pivot[year] ??= { year };
        pivot[year][String(row.category)] = Number(row.value || 0);
    });
    const yearlyTrendsRaw = Object.values(pivot).sort((a, b) => a.year - b.year);

    const totalExpenditure = yearlyTrendsRaw.reduce((total, row) => total + Number(row["Total Expenditure (US$)"] || 0), 0);
    const totalArrivals = yearlyTrendsRaw.reduce((total, row) => total + Number(row["Tourist Arrivals"] || 0), 0);

    const average = (key: string) =>
        yearlyTrendsRaw.length ? yearlyTrendsRaw.reduce((total, row) => total + Number(row[key] || 0), 0) / yearlyTrendsRaw.length : 0;

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

    // Expenditure anomalies -- the same z-score outlier test already applied to international
    // arrivals (Time Trends) and hotel room supply (Hotels page), reused here rather than
    // left as a one-off. Always computed over the full 2015-2025 history (expenditureByYear,
    // already fetched above) regardless of the page's Year filter, for the same reason as
    // those other two: too few points in a narrowed window to establish a real baseline.
    const expenditureAnomalyByYear = new Map(
        detectAnomalies(Object.entries(expenditureByYear).map(([year, value]) => ({ year: Number(year), value }))).map((row) => [row.year, row])
    );
    const yearlyTrends = yearlyTrendsRaw.map((row) => {
        const anomaly = expenditureAnomalyByYear.get(row.year);
        return { ...row, expenditureZScore: anomaly?.zScore ?? 0, isExpenditureAnomaly: anomaly?.isAnomaly ?? false };
    });

    // Next-year revenue forecast, via the same trailing-window linear regression used for
    // the arrivals forecast on the Time Trends page (see getTrendsData in trends.ts) --
    // same reasoning applies: a regression over the full 2015-2025 history gets dominated
    // by the 2020-2022 pandemic crash, so this uses a trailing window (last 5 years, or
    // fewer if shorter) to reflect the current trajectory. Kept as a plain, explainable OLS
    // line rather than a fancier model for the same transparency reason documented there.
    const revenueWindow = allYearlyTrends.filter((row) => Number(row["Total Expenditure (US$)"] || 0) > 0);
    const revenueRaw = trailingLinearForecast(revenueWindow.map((row) => ({ x: row.year, y: Number(row["Total Expenditure (US$)"] || 0) })));
    const revenueForecast = revenueRaw
        ? { year: revenueRaw.nextX, projectedUsdM: Number(revenueRaw.projected.toFixed(1)), growthRateUsed: revenueRaw.growthRateUsed, windowYears: revenueRaw.windowYears }
        : null;

    // Cross-check: revenue and arrivals are forecast independently (different source series,
    // different windows of available data), so nothing previously stopped them from silently
    // pointing in opposite directions -- e.g. revenue projected to grow while the arrivals
    // driving that revenue are projected to shrink. That combination is possible in reality
    // (higher spend per visitor), but it's unusual enough that a reader should be told when
    // it happens rather than seeing two confidently-drawn lines that quietly disagree.
    const arrivalsByYear: Record<number, number> = {};
    arrivalsRows.filter((row) => GATEWAYS.includes(String(row.gateway))).forEach((row) => {
        const year = Number(row.year);
        arrivalsByYear[year] = (arrivalsByYear[year] || 0) + Number(row.visitors || 0);
    });
    const arrivalsForecast = trailingLinearForecast(Object.entries(arrivalsByYear).map(([year, visitors]) => ({ x: Number(year), y: visitors })));
    let forecastConsistencyNote: string | null = null;
    let forecastConsistencyNoteMm: string | null = null;
    if (revenueForecast && arrivalsForecast) {
        const revenueUp = revenueForecast.growthRateUsed > 2;
        const revenueDown = revenueForecast.growthRateUsed < -2;
        const arrivalsUp = arrivalsForecast.growthRateUsed > 2;
        const arrivalsDown = arrivalsForecast.growthRateUsed < -2;
        if (revenueUp && arrivalsDown) {
            forecastConsistencyNote = `Revenue is projected to grow (${revenueForecast.growthRateUsed}%) while arrivals are projected to fall (${arrivalsForecast.growthRateUsed}%) -- these are independent trailing-trend projections, not a single reconciled model, so treat the gap as a flag to investigate rather than a settled forecast.`;
            forecastConsistencyNoteMm = `ဝင်ငွေသည် တိုးတက်ရန် ခန့်မှန်းထားသော်လည်း (${revenueForecast.growthRateUsed}%) လာရောက်မှုမှာ ကျဆင်းရန် ခန့်မှန်းထားသည် (${arrivalsForecast.growthRateUsed}%) -- ဤသည်တို့သည် သီးခြား trailing-trend ခန့်မှန်းချက်များဖြစ်ပြီး တစ်ခုတည်းသော ပြန်လည်ညှိနှိုင်းထားသော မော်ဒယ် မဟုတ်သောကြောင့် ဤကွာဟမှုကို စုံစမ်းစစ်ဆေးရန် အလံအဖြစ်သတ်မှတ်ပါ၊ အတည်ပြုပြီးသား ခန့်မှန်းချက်အဖြစ် မယူဆပါနှင့်။`;
        } else if (revenueDown && arrivalsUp) {
            forecastConsistencyNote = `Arrivals are projected to grow (${arrivalsForecast.growthRateUsed}%) while revenue is projected to fall (${revenueForecast.growthRateUsed}%) -- these are independent trailing-trend projections, not a single reconciled model, so treat the gap as a flag to investigate rather than a settled forecast.`;
            forecastConsistencyNoteMm = `လာရောက်မှုသည် တိုးတက်ရန် ခန့်မှန်းထားသော်လည်း (${arrivalsForecast.growthRateUsed}%) ဝင်ငွေမှာ ကျဆင်းရန် ခန့်မှန်းထားသည် (${revenueForecast.growthRateUsed}%) -- ဤသည်တို့သည် သီးခြား trailing-trend ခန့်မှန်းချက်များဖြစ်ပြီး တစ်ခုတည်းသော ပြန်လည်ညှိနှိုင်းထားသော မော်ဒယ် မဟုတ်သောကြောင့် ဤကွာဟမှုကို စုံစမ်းစစ်ဆေးရန် အလံအဖြစ်သတ်မှတ်ပါ၊ အတည်ပြုပြီးသား ခန့်မှန်းချက်အဖြစ် မယူဆပါနှင့်။`;
        }
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
        forecastConsistencyNote,
        forecastConsistencyNoteMm,
    };
}
