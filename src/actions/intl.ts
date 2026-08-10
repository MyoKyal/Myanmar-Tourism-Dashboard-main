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
    const wSql = wheres.length > 0 ? "WHERE " + wheres.join(" AND ") : "";

    // 1. Total arrivals
    const totalRow = db.prepare(`SELECT SUM(visitors) as total FROM fast_facts WHERE gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total') ${wheres.length > 0 ? "AND " + wheres.join(" AND ") : ""}`).get(...params) as any;

    // 2. Arrivals by year (line chart)
    const yearly = db.prepare(`SELECT year, SUM(visitors) as visitors FROM fast_facts WHERE gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total') ${wheres.length > 0 ? "AND " + wheres.join(" AND ") : ""} GROUP BY year ORDER BY year`).all(...params) as any[];

    // 3. Top Visitor Countries
    // We can use border_entry_visa_country joined if possible, but actually ASEAN arrivals have country data, and Border Entry Visa Country has "Country/Region"
    // The safest is querying border_entry_visa_country where region != ''
    const countries = db.prepare(`
        SELECT country, SUM(visitors) as visitors 
        FROM border_entry_visa_country 
        ${wSql} 
        GROUP BY country 
        ORDER BY visitors DESC 
        LIMIT 10
    `).all(...params) as any[];

    // 4. ASEAN vs NON-ASEAN comparison
    // We approximate ASEAN by summing all ASEAN countries and subtracting from Total
    const aseanRow = db.prepare(`
        SELECT SUM(visitors) as total 
        FROM asean_arrivals
        ${wSql}
    `).get(...params) as any;

    const aseanTotal = aseanRow?.total || 0;
    const globalTotal = totalRow?.total || 0;
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
