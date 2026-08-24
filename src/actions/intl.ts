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

    const matchedBorderRows = hasCountry ? countries.filter(matchesCountry) : countries;
    const matchedAseanRows = asean.filter((row) => !hasCountry || matchesCountry(row));

    // border_entry_visa_country doesn't track every ASEAN neighbor -- Cambodia, Laos,
    // Brunei, and Indonesia never appear in it at all (only asean_arrivals covers them).
    // Without this fallback, filtering by one of those countries returned a nonsensical
    // 0 total while the ASEAN-specific KPI still showed a real, larger number.
    const borderHasNoRowsForCountry = hasCountry && matchedBorderRows.length === 0;

    // Country breakdowns aren't available on fast_facts, so a country filter switches
    // the source to border_entry_visa_country (or asean_arrivals, for countries only
    // tracked there) instead.
    const source = hasCountry
        ? (borderHasNoRowsForCountry ? matchedAseanRows : matchedBorderRows)
        : facts.filter((row) => GATEWAYS.includes(String(row.gateway)));
    const filtered = source;

    const totalArrivals = filtered.reduce((total, row) => total + Number(row.visitors || 0), 0);

    const yearlyMap: Record<number, { year: number; visitors: number }> = {};
    filtered.forEach((row) => {
        const year = Number(row.year);
        yearlyMap[year] ??= { year, visitors: 0 };
        yearlyMap[year].visitors += Number(row.visitors || 0);
    });
    const yearly = Object.values(yearlyMap).sort((a, b) => a.year - b.year);

    // Top countries merges both datasets -- border_entry_visa_country is the primary
    // source, but countries it doesn't track at all (Cambodia, Laos, Brunei, Indonesia)
    // are filled in from asean_arrivals so they aren't invisible in the ranking.
    // Countries present in both are NOT summed, to avoid double-counting. Names are
    // normalized (lowercased, whitespace stripped) before comparing so spelling
    // differences between the two datasets -- e.g. "VIETNAM" vs "Viet Nam" -- still match.
    const normalizeCountry = (name: string) => name.toLowerCase().replace(/\s+/g, "");
    const countryMap: Record<string, { country: string; visitors: number }> = {};
    const bevcCountryNames = new Set(countries.map((row) => normalizeCountry(String(row.country))));
    countries.filter((row) => !hasCountry || matchesCountry(row)).forEach((row) => {
        const country = String(row.country);
        countryMap[country] ??= { country, visitors: 0 };
        countryMap[country].visitors += Number(row.visitors || 0);
    });
    asean.filter((row) => !hasCountry || matchesCountry(row)).forEach((row) => {
        const country = String(row.country);
        if (bevcCountryNames.has(normalizeCountry(country))) return;
        countryMap[country] ??= { country, visitors: 0 };
        countryMap[country].visitors += Number(row.visitors || 0);
    });
    const topCountries = Object.values(countryMap).sort((a, b) => b.visitors - a.visitors).slice(0, 10);

    const aseanTotal = matchedAseanRows.reduce((total, row) => total + Number(row.visitors || 0), 0);
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
