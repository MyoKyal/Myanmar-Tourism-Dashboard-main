"use server";

import { getDb } from "@/lib/db";
import { GlobalFiltersState } from "@/lib/FilterContext";

// Utility to apply common filters like Year or YearRange
function applyCommonFilters(
    baseQuery: string,
    filters: GlobalFiltersState,
    params: any[],
    whereClauses: string[]
) {
    if (filters.year !== 'All') {
        whereClauses.push('year = ?');
        params.push(parseInt(filters.year));
    } else {
        // If year range is modified and year is All
        if (filters.yearRange) {
            whereClauses.push('year >= ? AND year <= ?');
            params.push(filters.yearRange[0], filters.yearRange[1]);
        }
    }
}

// 1. Overview KPIs
export async function getOverviewKPIs(filters: GlobalFiltersState) {
    const db = getDb();
    const params: any[] = [];
    const whereClauses: string[] = [];

    applyCommonFilters("", filters, params, whereClauses);
    const whereSql = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    const intl = db.prepare(`SELECT SUM(visitors) as total FROM intl_airports ${whereSql}`).get(...params) as any;
    const domestic = db.prepare(`SELECT SUM(visitors_millions) as total FROM domestic_visitors ${whereSql}`).get(...params) as any;
    const expenditure = db.prepare(`SELECT SUM(value) as total FROM expenditure WHERE category = 'Total Expenditure (US$)' AND ${whereClauses.length > 0 ? whereClauses.join(" AND ") : "1=1"}`).get(...params) as any;
    const hotelsData = db.prepare(`SELECT SUM(hotels) as th, SUM(rooms) as tr FROM hotels_rooms ${whereSql}`).get(...params) as any;

    return {
        intlVisitors: intl?.total || 0,
        domesticVisitors: (domestic?.total || 0) * 1000000,
        expenditureTotal: expenditure?.total || 0,
        hotelsCount: hotelsData?.th || 0,
        roomsCount: hotelsData?.tr || 0
    };
}

// 2. Overview Charts
export async function getOverviewChartsData(filters: GlobalFiltersState) {
    const db = getDb();

    // Yearly International
    const yearlyIntlParams: any[] = [];
    const yearlyIntlWheres: string[] = ["gateway IN ('International Airports', 'Cruise (By Sea)', 'Land Borders Total')"];
    applyCommonFilters("", filters, yearlyIntlParams, yearlyIntlWheres);
    const wSql = "WHERE " + yearlyIntlWheres.join(" AND ");

    // Group by year for international
    const yearlyIntl = db.prepare(`SELECT year, SUM(visitors) as visitors FROM fast_facts ${wSql} GROUP BY year ORDER BY year`).all(...yearlyIntlParams) as any[];

    // Monthly international (does not have year filter generally since monthly_visitors lacks year, but we return all)
    const monthlyIntl = db.prepare(`SELECT month, SUM(total_visitors) as visitors FROM monthly_visitors GROUP BY month`).all() as any[];

    return {
        yearlyIntl,
        monthlyIntl
    };
}
