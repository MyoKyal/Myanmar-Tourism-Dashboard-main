"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";

export async function getExpenditureData(filters: GlobalFiltersState) {
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

    // Since expenditure data contains categories like "Total Expenditure (US$)", "Average Expenditure per day per person", "Average Length of Stay (Night)"
    // We pivot by year.
    const rawData = db.prepare(`
        SELECT year, category, SUM(value) as val 
        FROM expenditure 
        ${filterCondition} 
        GROUP BY year, category 
        ORDER BY year
    `).all(...params) as any[];

    // Pivot data for Recharts (year -> categories)
    const trendsMap: Record<number, any> = {};
    for (const row of rawData) {
        if (!trendsMap[row.year]) trendsMap[row.year] = { year: row.year };
        trendsMap[row.year][row.category] = row.val;
    }

    // We also need visitor arrivals to compare. The expenditure table already has "Tourist Arrivals" as a category if we ingested it perfectly.
    // Wait, the "Visitor_Arrivals_Expenditure.csv" actually contains a "Tourist Arrivals" row!
    
    let totalExpenditure = 0;
    let totalArrivals = 0;
    
    const yearlyTrends = Object.values(trendsMap).sort((a: any, b: any) => a.year - b.year);
    
    for (const row of yearlyTrends) {
        if (row['Total Expenditure (US$)']) totalExpenditure += row['Total Expenditure (US$)'];
        if (row['Tourist Arrivals']) totalArrivals += row['Tourist Arrivals'];
    }

    const estimatedPerVisitor = totalArrivals > 0 ? ((totalExpenditure * 1000000) / totalArrivals).toFixed(2) : 0;
    
    // Average values over selected period
    let avgPerDay = 0;
    let avgLengthOfStay = 0;
    let totalYears = yearlyTrends.length;
    
    if (totalYears > 0) {
        avgPerDay = yearlyTrends.reduce((acc, curr) => acc + (curr['Average Expenditure per day per person'] || 0), 0) / totalYears;
        avgLengthOfStay = yearlyTrends.reduce((acc, curr) => acc + (curr['Average Length of Stay (Night)'] || 0), 0) / totalYears;
    }

    return {
        totalExpenditure,
        estimatedPerVisitor,
        avgPerDay: avgPerDay.toFixed(2),
        avgLengthOfStay: avgLengthOfStay.toFixed(1),
        yearlyTrends
    };
}
