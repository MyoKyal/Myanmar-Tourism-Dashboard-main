"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";

export async function getDomesticData(filters: GlobalFiltersState) {
    const db = getDb();

    // Filtering logic
    const params: any[] = [];
    let filterCondition = "";
    if (filters.year !== 'All') {
        filterCondition = "WHERE year = ?";
        params.push(parseInt(filters.year));
    } else if (filters.yearRange) {
        filterCondition = "WHERE year >= ? AND year <= ?";
        params.push(filters.yearRange[0], filters.yearRange[1]);
    }

    // 1. Total domestic visitors
    const totalRow = db.prepare(`
        SELECT SUM(visitors_millions) as total 
        FROM domestic_visitors 
        ${filterCondition}
    `).get(...params) as any;

    const totalDomestic = (totalRow?.total || 0) * 1000000;

    // 2. Regional ranking
    const regions = db.prepare(`
        SELECT region as name, SUM(visitors_millions) * 1000000 as visitors 
        FROM domestic_visitors 
        ${filterCondition} 
        GROUP BY region 
        ORDER BY visitors DESC
    `).all(...params) as any[];

    // 3. Domestic vs International Comparison (Total over same period)
    const intlRow = db.prepare(`SELECT SUM(visitors) as total FROM intl_airports ${filterCondition}`).get(...params) as any; // Using intl_airports as proxy or fast_facts Total. Let's use fast_facts for true total.
    const intlTotalRow = db.prepare(`SELECT SUM(visitors) as total FROM fast_facts WHERE gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total') ${filterCondition.replace('WHERE', 'AND')}`).get(...params) as any;
    const totalIntl = intlTotalRow?.total || 0;

    const comparison = [
        { name: "Domestic", value: totalDomestic },
        { name: "International", value: totalIntl }
    ];

    // 4. Yearly trends (compare intl and domestic if possible)
    // Domestic year range: 2019 - 2024
    const dTrendsCondition = filters.yearRange ? "WHERE year >= ? AND year <= ?" : "";
    const trendsParams = filters.yearRange ? [filters.yearRange[0], filters.yearRange[1]] : [];

    const dTrendsRaw = db.prepare(`
        SELECT year, SUM(visitors_millions)*1000000 as domestic 
        FROM domestic_visitors 
        ${dTrendsCondition} 
        GROUP BY year ORDER BY year
    `).all(...trendsParams) as any[];

    const iTrendsRaw = db.prepare(`
        SELECT year, SUM(visitors) as intl
        FROM fast_facts 
        WHERE gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total') ${dTrendsCondition.replace('WHERE', 'AND')} 
        GROUP BY year ORDER BY year
    `).all(...trendsParams) as any[];

    // Merge trends
    const trendsMap: Record<number, any> = {};
    for (const r of dTrendsRaw) {
        if (!trendsMap[r.year]) trendsMap[r.year] = { year: r.year, domestic: 0, intl: 0 };
        trendsMap[r.year].domestic = r.domestic;
    }
    for (const r of iTrendsRaw) {
        if (!trendsMap[r.year]) trendsMap[r.year] = { year: r.year, domestic: 0, intl: 0 };
        trendsMap[r.year].intl = r.intl;
    }
    const yearlyTrends = Object.values(trendsMap).sort((a: any, b: any) => a.year - b.year);

    return {
        totalDomestic,
        totalIntl,
        regions,
        comparison,
        yearlyTrends
    };
}
