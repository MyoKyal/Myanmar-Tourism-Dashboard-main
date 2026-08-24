"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { GlobalFiltersState } from "@/lib/FilterContext";

const GATEWAYS = ["International Airports", "Cruise (By Sea)", "Land Borders Total"];

function yearQuery(filters: GlobalFiltersState) {
    return filters.year !== "All"
        ? { year: Number(filters.year) }
        : { fromYear: filters.yearRange[0], toYear: filters.yearRange[1] };
}

function sum(rows: Record<string, unknown>[], field: string) {
    return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

// 1. Overview KPIs
export async function getOverviewKPIs(filters: GlobalFiltersState) {
    const q = yearQuery(filters);
    const [intl, domestic, expenditure, hotels] = await Promise.all([
        getAnalyticsRows("fast_facts", q),
        getAnalyticsRows("domestic_visitors", q),
        getAnalyticsRows("expenditure", q),
        getAnalyticsRows("hotels_rooms", q),
    ]);

    return {
        intlVisitors: sum(intl.filter((row) => GATEWAYS.includes(String(row.gateway))), "visitors"),
        domesticVisitors: sum(domestic, "visitors_millions") * 1_000_000,
        expenditureTotal: sum(expenditure.filter((row) => row.category === "Total Expenditure (US$)"), "value"),
        hotelsCount: sum(hotels, "hotels"),
        roomsCount: sum(hotels, "rooms"),
    };
}

// 2. Overview Charts
export async function getOverviewChartsData(filters: GlobalFiltersState) {
    const q = yearQuery(filters);
    const [intl, monthly] = await Promise.all([
        getAnalyticsRows("fast_facts", q),
        getAnalyticsRows("monthly_visitors"),
    ]);

    const yearlyTotals: Record<number, { year: number; visitors: number }> = {};
    intl.filter((row) => GATEWAYS.includes(String(row.gateway))).forEach((row) => {
        const year = Number(row.year);
        yearlyTotals[year] ??= { year, visitors: 0 };
        yearlyTotals[year].visitors += Number(row.visitors || 0);
    });

    return {
        yearlyIntl: Object.values(yearlyTotals).sort((a, b) => a.year - b.year),
        monthlyIntl: monthly.map((row) => ({ month: row.month, visitors: Number(row.total_visitors || 0) })),
    };
}
