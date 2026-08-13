"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";

function applyCommonFilters(
    baseQuery: string,
    filters: GlobalFiltersState,
    params: any[],
    whereClauses: string[]
) {
    if (filters.year !== 'All') {
        whereClauses.push('year = ?');
        params.push(parseInt(filters.year));
    } else if (filters.yearRange) {
        whereClauses.push('year >= ? AND year <= ?');
        params.push(filters.yearRange[0], filters.yearRange[1]);
    }
}

export async function getIntlTourismData(filters: GlobalFiltersState) {
    const db = getDb();
    const params: any[] = [];
    const wheres: string[] = [];

    applyCommonFilters("", filters, params, wheres);

    // Country Filter Logic
    const hasCountry = filters.country && filters.country !== 'All';
    let countryWhere = "";
    if (hasCountry) {
        countryWhere = "LOWER(country) LIKE ?";
    }

    const baseWheres = [...wheres];
    const countryWheres = [...wheres];
    const countryParams = [...params];
    if (hasCountry) {
        countryWheres.push(countryWhere);
        countryParams.push(`%${filters.country.toLowerCase()}%`);
    }

    const wSqlDefault = baseWheres.length > 0 ? "AND " + baseWheres.join(" AND ") : "";
    const wSqlCountry = countryWheres.length > 0 ? "WHERE " + countryWheres.join(" AND ") : "";

    // 1. Total arrivals
    // If filtering by country, we can't use fast_facts because it lacks a country column. We must use border_entry_visa_country instead.
    let globalTotal = 0;
    if (hasCountry) {
        const totalRow = db.prepare(`SELECT SUM(visitors) as total FROM border_entry_visa_country ${wSqlCountry}`).get(...countryParams) as any;
        globalTotal = totalRow?.total || 0;
    } else {
        const totalRow = db.prepare(`SELECT SUM(visitors) as total FROM fast_facts WHERE gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total') ${wSqlDefault}`).get(...params) as any;
        globalTotal = totalRow?.total || 0;
    }

    // 2. Arrivals by year (line chart)
    let yearly = [];
    if (hasCountry) {
        yearly = db.prepare(`SELECT year, SUM(visitors) as visitors FROM border_entry_visa_country ${wSqlCountry} GROUP BY year ORDER BY year`).all(...countryParams) as any[];
    } else {
        yearly = db.prepare(`SELECT year, SUM(visitors) as visitors FROM fast_facts WHERE gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total') ${wSqlDefault} GROUP BY year ORDER BY year`).all(...params) as any[];
    }

    // 3. Top Visitor Countries
    const countries = db.prepare(`
        SELECT country, SUM(visitors) as visitors 
        FROM border_entry_visa_country 
        ${wSqlCountry} 
        GROUP BY country 
        ORDER BY visitors DESC 
        LIMIT 10
    `).all(...(hasCountry ? countryParams : params)) as any[];

    // 4. ASEAN vs NON-ASEAN comparison
    const aseanRow = db.prepare(`
        SELECT SUM(visitors) as total 
        FROM asean_arrivals
        ${wSqlCountry}
    `).get(...(hasCountry ? countryParams : params)) as any;

    const aseanTotal = aseanRow?.total || 0;
    const nonAseanTotal = Math.max(0, globalTotal - aseanTotal);

    const aseanComparison = [
        { name: "ASEAN", value: aseanTotal },
        { name: "Non-ASEAN", value: nonAseanTotal }
    ];

    return {
        totalArrivals: globalTotal,
        yearly,
        topCountries: countries,
        aseanComparison
    };
}
