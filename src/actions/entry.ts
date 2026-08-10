"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";

export async function getEntryPointData(filters: GlobalFiltersState) {
    const db = getDb();

    // Base params for filtering logic
    let filterCondition = "";
    const params: any[] = [];
    if (filters.year !== 'All') {
        filterCondition = "WHERE year = ?";
        params.push(parseInt(filters.year));
    } else if (filters.yearRange) {
        filterCondition = "WHERE year >= ? AND year <= ?";
        params.push(filters.yearRange[0], filters.yearRange[1]);
    }

    // 1. Airports
    const airports = db.prepare(`
        SELECT gateway as name, SUM(visitors) as value 
        FROM intl_airports 
        ${filterCondition} 
        GROUP BY gateway
        ORDER BY value DESC
    `).all(...params) as any[];

    // 2. Borders
    const borders = db.prepare(`
        SELECT gateway as name, SUM(visitors) as value 
        FROM border_entry_points 
        ${filterCondition} 
        GROUP BY gateway
        ORDER BY value DESC
    `).all(...params) as any[];

    // 3. Seaports
    const seaports = db.prepare(`
        SELECT gateway as name, SUM(visitors) as value 
        FROM intl_seaport 
        ${filterCondition} 
        GROUP BY gateway
        ORDER BY value DESC
    `).all(...params) as any[];

    const totalAirports = airports.reduce((acc, curr) => acc + curr.value, 0);
    const totalBorders = borders.reduce((acc, curr) => acc + curr.value, 0);
    const totalSeaports = seaports.reduce((acc, curr) => acc + curr.value, 0);
    const total = totalAirports + totalBorders + totalSeaports;

    const composition = [
        { name: "Airports", value: totalAirports },
        { name: "Land Borders", value: totalBorders },
        { name: "Seaports", value: totalSeaports }
    ];

    // Historical trends
    const fastFacts = db.prepare(`
        SELECT year, gateway, SUM(visitors) as total 
        FROM fast_facts 
        WHERE gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total')
        GROUP BY year, gateway 
        ORDER BY year
    `).all() as any[];

    const trendsMap: Record<number, any> = {};
    for (const row of fastFacts) {
        if (!trendsMap[row.year]) trendsMap[row.year] = { year: row.year };
        if (row.gateway === 'International Airports') trendsMap[row.year]['Airports'] = row.total;
        if (row.gateway === 'Land Borders Total') trendsMap[row.year]['Land Borders'] = row.total;
        if (row.gateway === 'Cruise (By Sea)') trendsMap[row.year]['Seaports'] = row.total;
    }
    const yearlyTrends = Object.values(trendsMap).sort((a: any, b: any) => a.year - b.year);

    return {
        airports,
        borders,
        seaports,
        composition,
        yearlyTrends,
        total
    };
}
