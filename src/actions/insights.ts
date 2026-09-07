"use server";

import { getAnalyticsRows } from "@/lib/documentStore";
import { pearsonCorrelation, correlationStrength } from "@/lib/statistics";

const GATEWAYS = ["International Airports", "Cruise (By Sea)", "Land Borders Total"];

function sumByYear(rows: Record<string, unknown>[], field: string): Record<number, number> {
    const map: Record<number, number> = {};
    rows.forEach((row) => {
        const year = Number(row.year);
        map[year] = (map[year] || 0) + Number(row[field] || 0);
    });
    return map;
}

// Aligns two year->value maps to only the years both actually have data for, then returns
// parallel arrays ready for pearsonCorrelation. Years present in only one series would
// otherwise silently corrupt the correlation (comparing a real value to an implicit 0).
function alignByYear(a: Record<number, number>, b: Record<number, number>): { x: number[]; y: number[]; years: number[] } {
    const years = Object.keys(a).map(Number).filter((year) => b[year] !== undefined).sort((x, y) => x - y);
    return { x: years.map((year) => a[year]), y: years.map((year) => b[year]), years };
}

export type CorrelationInsight = {
    id: string;
    label: string;
    labelMm: string;
    r: number | null;
    n: number;
    strength: string;
    strengthMm: string;
    direction: 'positive' | 'negative' | 'none';
};

// Correlation analysis: measures how strongly pairs of real metrics actually move
// together across years, rather than just placing two charts side by side and letting the
// reader guess at a relationship. Every pair below draws from data already ingested for
// other features this session, aligned to their common years (this app has ~10-11 years
// of history per metric, so n is reported alongside r -- a correlation over 5-6 points is
// suggestive, not proof, and the UI says so).
export async function getCorrelationInsights(): Promise<CorrelationInsight[]> {
    const [factsRows, domesticRows, hotelsRows, gdpRows, expenditureRows] = await Promise.all([
        getAnalyticsRows("fast_facts"),
        getAnalyticsRows("domestic_visitors"),
        getAnalyticsRows("hotels_rooms"),
        getAnalyticsRows("worldbank_gdp"),
        getAnalyticsRows("expenditure"),
    ]);

    const intlByYear = sumByYear(factsRows.filter((row) => GATEWAYS.includes(String(row.gateway))), "visitors");
    const domesticByYear: Record<number, number> = {};
    domesticRows.forEach((row) => {
        const year = Number(row.year);
        domesticByYear[year] = (domesticByYear[year] || 0) + Number(row.visitors_millions || 0);
    });
    const roomsByYear = sumByYear(hotelsRows, "rooms");
    const gdpByYear: Record<number, number> = {};
    gdpRows.forEach((row) => { gdpByYear[Number(row.year)] = Number(row.gdpUsd || 0); });
    const expenditureByYear: Record<number, number> = {};
    expenditureRows.filter((row) => row.category === "Total Expenditure (US$)").forEach((row) => {
        expenditureByYear[Number(row.year)] = Number(row.value || 0);
    });

    const pairs: { id: string; label: string; labelMm: string; a: Record<number, number>; b: Record<number, number> }[] = [
        { id: 'rooms-vs-intl', label: 'Hotel Room Supply vs. International Arrivals', labelMm: 'ဟိုတယ်အခန်း ရရှိနိုင်မှု နှင့် နိုင်ငံတကာ လာရောက်မှု', a: roomsByYear, b: intlByYear },
        { id: 'gdp-vs-expenditure', label: "Myanmar's GDP vs. Tourism Expenditure", labelMm: 'မြန်မာ့ GDP နှင့် ခရီးသွားလုပ်ငန်း အသုံးစရိတ်', a: gdpByYear, b: expenditureByYear },
        { id: 'intl-vs-domestic', label: 'International vs. Domestic Arrivals', labelMm: 'နိုင်ငံတကာ နှင့် ပြည်တွင်း လာရောက်မှု', a: intlByYear, b: domesticByYear },
        { id: 'expenditure-vs-intl', label: 'Tourism Expenditure vs. International Arrivals', labelMm: 'ခရီးသွားလုပ်ငန်း အသုံးစရိတ် နှင့် နိုင်ငံတကာ လာရောက်မှု', a: expenditureByYear, b: intlByYear },
    ];

    return pairs.map(({ id, label, labelMm, a, b }) => {
        const { x, y, years } = alignByYear(a, b);
        const r = pearsonCorrelation(x, y);
        const { label: strength, labelMm: strengthMm, direction } = r != null ? correlationStrength(r) : { label: 'Not enough data', labelMm: 'ဒေတာ မလုံလောက်ပါ', direction: 'none' as const };
        return {
            id,
            label,
            labelMm,
            r: r != null ? Number(r.toFixed(2)) : null,
            n: years.length,
            strength,
            strengthMm,
            direction,
        };
    });
}
