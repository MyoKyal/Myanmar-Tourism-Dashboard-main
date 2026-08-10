"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";

export async function getVisaData(filters: GlobalFiltersState) {
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

    let typeFilter = "";
    const typeParams: any[] = [];
    if (filters.visaType && filters.visaType !== 'All') {
        typeFilter = filterCondition ?`AND visa_type = ?` : `WHERE visa_type = ?`;
        typeParams.push(filters.visaType);
    }
    const fullWhere = filterCondition + typeFilter;
    const fullParams = [...params, ...typeParams];

    // 1. Arrivals by visa type (aggregate across filtered years)
    const visaTypes = db.prepare(`
        SELECT visa_type as name, SUM(visitors) as value 
        FROM visa_types 
        ${fullWhere} 
        GROUP BY visa_type
    `).all(...fullParams) as any[];

    // Calculate total from filtered types (to give percentages)
    const total = visaTypes.reduce((acc, curr) => acc + curr.value, 0);

    // 2. Visa trends by year (area / line chart)
    const trendsCondition = typeFilter ? `WHERE visa_type = ?` : "";
    const yearlyRaw = db.prepare(`SELECT year, visa_type, SUM(visitors) as total FROM visa_types ${trendsCondition} GROUP BY year, visa_type ORDER BY year`).all(...(typeFilter ? typeParams : [])) as any[];
    
    // Pivot data for Recharts (year -> Tourist, Business, Others)
    const trendsMap: Record<number, any> = {};
    for (const row of yearlyRaw) {
        if (!trendsMap[row.year]) trendsMap[row.year] = { year: row.year };
        trendsMap[row.year][row.visa_type] = row.total;
    }
    const yearlyTrends = Object.values(trendsMap).sort((a: any, b: any) => a.year - b.year);

    return {
        visaDistribution: visaTypes,
        yearlyTrends,
        total
    };
}
