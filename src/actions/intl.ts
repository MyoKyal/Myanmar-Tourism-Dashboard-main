"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

const GATEWAYS = ["International Airports", "Cruise (By Sea)", "Land Borders Total"];

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

export async function getIntlTourismData(filters: GlobalFiltersState) {
    const q = yearQuery(filters);
    const [facts, countries, asean] = await Promise.all([
        getAnalyticsRows("fast_facts", q),
        getAnalyticsRows("border_entry_visa_country", q),
        getAnalyticsRows("asean_arrivals", q),
    ]);

    const hasCountry = Boolean(filters.country && filters.country !== "All");
    const countryQuery = filters.country.toLowerCase();
    const matchesCountry = (row: Record<string, unknown>) => String(row.country).toLowerCase().includes(countryQuery);

    // Country breakdowns aren't available on fast_facts, so a country filter switches
    // the source to border_entry_visa_country instead.
    const source = hasCountry ? countries : facts.filter((row) => GATEWAYS.includes(String(row.gateway)));
    const filtered = hasCountry ? source.filter(matchesCountry) : source;

    const totalArrivals = filtered.reduce((total, row) => total + Number(row.visitors || 0), 0);

    const yearlyMap: Record<number, { year: number; visitors: number }> = {};
    filtered.forEach((row) => {
        const year = Number(row.year);
        yearlyMap[year] ??= { year, visitors: 0 };
        yearlyMap[year].visitors += Number(row.visitors || 0);
    });
    const yearly = Object.values(yearlyMap).sort((a, b) => a.year - b.year);

    // Top countries always comes from the country-level dataset, independent of which
    // source fed totalArrivals/yearly above (fast_facts has no `country` field at all).
    const countryMap: Record<string, { country: string; visitors: number }> = {};
    countries.filter((row) => !hasCountry || matchesCountry(row)).forEach((row) => {
        const country = String(row.country);
        countryMap[country] ??= { country, visitors: 0 };
        countryMap[country].visitors += Number(row.visitors || 0);
    });
    const topCountries = Object.values(countryMap).sort((a, b) => b.visitors - a.visitors).slice(0, 10);

    const aseanTotal = asean
        .filter((row) => !hasCountry || matchesCountry(row))
        .reduce((total, row) => total + Number(row.visitors || 0), 0);
    const nonAseanTotal = Math.max(0, totalArrivals - aseanTotal);

    return {
        totalArrivals,
        yearly,
        topCountries,
        aseanComparison: [
            { name: "ASEAN", value: aseanTotal },
            { name: "Non-ASEAN", value: nonAseanTotal },
        ],
    };
}
