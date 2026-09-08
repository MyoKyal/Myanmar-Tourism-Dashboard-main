"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

function groupByGateway(rows: Record<string, unknown>[]) {
    const map: Record<string, { name: string; value: number }> = {};
    rows.forEach((row) => {
        const name = String(row.gateway);
        map[name] ??= { name, value: 0 };
        map[name].value += Number(row.visitors || 0);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
}

export async function getEntryPointData(filters: GlobalFiltersState) {
    const q = yearQuery(filters);
    const [airportRows, borderRows, seaportRows, fastFacts, allAirportRows, monthlyRows] = await Promise.all([
        getAnalyticsRows("intl_airports", q),
        getAnalyticsRows("border_entry_points", q),
        getAnalyticsRows("intl_seaport", q),
        getAnalyticsRows("fast_facts"),
        // Per-airport trend and flight-capacity analysis are always computed over the full
        // history / the one available monthly snapshot, independent of the page's Year
        // filter -- both are only meaningful as a multi-year or full-year view, the same
        // reasoning used for every other multi-year trend in this app.
        getAnalyticsRows("intl_airports"),
        getAnalyticsRows("monthly_visitors"),
    ]);

    const airports = groupByGateway(airportRows);
    const borders = groupByGateway(borderRows);
    const seaports = groupByGateway(seaportRows);

    const composition = [
        { name: "Airports", value: airports.reduce((total, row) => total + row.value, 0) },
        { name: "Land Borders", value: borders.reduce((total, row) => total + row.value, 0) },
        { name: "Seaports", value: seaports.reduce((total, row) => total + row.value, 0) },
    ];

    // Historical trends always span the full dataset, split by gateway category.
    const trendMap: Record<number, { year: number; Airports?: number; ["Land Borders"]?: number; Seaports?: number }> = {};
    fastFacts.forEach((row) => {
        const year = Number(row.year);
        const gateway = String(row.gateway);
        if (!["International Airports", "Land Borders Total", "Cruise (By Sea)"].includes(gateway)) return;
        trendMap[year] ??= { year };
        const total = Number(row.visitors || 0);
        if (gateway === "International Airports") trendMap[year]["Airports"] = total;
        if (gateway === "Land Borders Total") trendMap[year]["Land Borders"] = total;
        if (gateway === "Cruise (By Sea)") trendMap[year]["Seaports"] = total;
    });
    const yearlyTrends = Object.values(trendMap).sort((a, b) => a.year - b.year);

    // Per-airport arrivals trend -- the Airports Breakdown bar above only ever shows one
    // year (or the summed range) at a time, so it can't answer the question a government
    // aviation authority or airline actually has: is a given airport's traffic growing or
    // shrinking over time? "Total" rows in the source CSV are excluded (already represented
    // by summing the named airports).
    const airportTrendMap: Record<number, Record<string, number> & { year: number }> = {};
    const airportNames = new Set<string>();
    allAirportRows.forEach((row) => {
        const name = String(row.gateway);
        if (name === 'Total') return;
        airportNames.add(name);
        const year = Number(row.year);
        airportTrendMap[year] ??= { year } as Record<string, number> & { year: number };
        airportTrendMap[year][name] = Number(row.visitors || 0);
    });
    const airportTrends = Object.values(airportTrendMap).sort((a, b) => a.year - b.year);
    const latestAirportYear = airportTrends.length ? airportTrends[airportTrends.length - 1] : null;
    const busiestAirport = latestAirportYear
        ? [...airportNames].map((name) => ({ name, value: Number(latestAirportYear[name] || 0) })).sort((a, b) => b.value - a.value)[0]
        : null;

    // Flight capacity & occupancy -- monthly flight count, seat capacity, and load factor
    // (occupancy rate), the metrics an airline or civil aviation authority actually uses to
    // decide whether to add, cut, or reallocate capacity. Sourced from the same single-year
    // monthly snapshot used for Monthly Seasonality on the Time Trends page (see
    // MONTHLY_VISITORS_YEAR in scripts/ingest.cjs for how that year was inferred).
    const MONTH_ORDER = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const flightCapacity = monthlyRows
        .map((row) => ({
            month: String(row.month),
            flights: Number(row.flights || 0),
            seatCapacity: Number(row.seat_capacity || 0),
            occupancyRate: Number(row.occupancy_rate || 0),
        }))
        .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));
    const totalAnnualFlights = flightCapacity.reduce((total, row) => total + row.flights, 0);
    const avgLoadFactor = flightCapacity.length
        ? Number((flightCapacity.reduce((total, row) => total + row.occupancyRate, 0) / flightCapacity.length).toFixed(1))
        : 0;
    const peakLoadMonth = flightCapacity.length ? [...flightCapacity].sort((a, b) => b.occupancyRate - a.occupancyRate)[0] : null;
    const lowLoadMonth = flightCapacity.length ? [...flightCapacity].sort((a, b) => a.occupancyRate - b.occupancyRate)[0] : null;

    return {
        airports,
        borders,
        seaports,
        composition,
        yearlyTrends,
        total: composition.reduce((total, row) => total + row.value, 0),
        airportTrends,
        airportNames: [...airportNames],
        busiestAirport,
        flightCapacity,
        totalAnnualFlights,
        avgLoadFactor,
        peakLoadMonth,
        lowLoadMonth,
    };
}
