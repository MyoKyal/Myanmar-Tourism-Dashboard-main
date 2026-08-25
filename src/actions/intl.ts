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
    const [facts, countries, asean, allFacts, allAsean] = await Promise.all([
        getAnalyticsRows("fast_facts", q),
        getAnalyticsRows("border_entry_visa_country", q),
        getAnalyticsRows("asean_arrivals", q),
        getAnalyticsRows("fast_facts"),
        getAnalyticsRows("asean_arrivals"),
    ]);

    const filtered = facts.filter((row) => GATEWAYS.includes(String(row.gateway)));
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
    countries.forEach((row) => {
        const country = String(row.country);
        countryMap[country] ??= { country, visitors: 0 };
        countryMap[country].visitors += Number(row.visitors || 0);
    });
    asean.forEach((row) => {
        const country = String(row.country);
        if (bevcCountryNames.has(normalizeCountry(country))) return;
        countryMap[country] ??= { country, visitors: 0 };
        countryMap[country].visitors += Number(row.visitors || 0);
    });
    const topCountries = Object.values(countryMap).sort((a, b) => b.visitors - a.visitors).slice(0, 10);

    const aseanTotal = asean.reduce((total, row) => total + Number(row.visitors || 0), 0);
    const nonAseanTotal = Math.max(0, totalArrivals - aseanTotal);

    // Myanmar vs a single selected ASEAN country: always trended across every year we
    // have data for (independent of the page's Year/Year-range filter), since a
    // country-to-country comparison is only meaningful as a multi-year trend. The
    // dropdown is restricted to countries that actually exist in asean_arrivals --
    // the only dataset that tracks ASEAN-origin visitors -- so it never offers a
    // country the database has no rows for.
    const aseanCountries = [...new Set(allAsean.map((row) => String(row.country)))].sort();
    const selectedCountry = aseanCountries.includes(filters.country) ? filters.country : aseanCountries[0];

    const myanmarByYear: Record<number, number> = {};
    allFacts.filter((row) => GATEWAYS.includes(String(row.gateway))).forEach((row) => {
        const year = Number(row.year);
        myanmarByYear[year] = (myanmarByYear[year] || 0) + Number(row.visitors || 0);
    });
    const countryByYear: Record<number, number> = {};
    allAsean.filter((row) => String(row.country) === selectedCountry).forEach((row) => {
        countryByYear[Number(row.year)] = Number(row.visitors || 0);
    });
    const years = [...new Set([...Object.keys(myanmarByYear), ...Object.keys(countryByYear)])].map(Number).sort((a, b) => a - b);
    const comparison = years.map((year) => ({ year, myanmar: myanmarByYear[year] || 0, country: countryByYear[year] || 0 }));

    return {
        totalArrivals,
        yearly,
        topCountries,
        aseanComparison: [
            { name: "ASEAN", value: aseanTotal },
            { name: "Non-ASEAN", value: nonAseanTotal },
        ],
        aseanCountries,
        selectedCountry,
        comparison,
    };
}
