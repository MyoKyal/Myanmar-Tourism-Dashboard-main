"use client";

import React, { useState, useEffect } from "react";
import { useGlobalFilters } from "@/lib/FilterContext";
import { FilterX } from "lucide-react";

type GlobalFiltersProps = {
    showYear?: boolean;
    showMonth?: boolean;
    showCountry?: boolean;
    showRegion?: boolean;
    showVisaType?: boolean;
    showEntryPoint?: boolean;
    showVisitorType?: boolean;
};

const YEARS = ["All", ...Array.from({ length: 11 }, (_, i) => (2015 + i).toString())];
const MONTHS = ["All", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const VISA_TYPES = ["All", "Tourist", "Business", "Others"];

export default function GlobalFilters({
    showYear,
    showMonth,
    showCountry,
    showRegion,
    showVisaType,
    showEntryPoint,
    showVisitorType,
}: GlobalFiltersProps) {
    const { filters, setFilter, resetFilters } = useGlobalFilters();

    // Local state for debouncing country input to prevent re-renders on every stroke
    const [localCountry, setLocalCountry] = useState(filters.country !== 'All' ? filters.country : '');

    // Sync from global down to local when global resets
    useEffect(() => {
        if (filters.country === 'All') setLocalCountry('');
    }, [filters.country]);

    // Debounce syncing local up to global
    useEffect(() => {
        const timer = setTimeout(() => {
            if ((localCountry || 'All') !== filters.country) {
                setFilter('country', localCountry || 'All');
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localCountry, filters.country, setFilter]);

    return (
        <div className="glass-panel p-4 mb-6 flex flex-wrap gap-4 items-end z-20 relative">
            {showYear && (
                <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">Year</label>
                    <select
                        className="bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none"
                        value={filters.year}
                        onChange={(e) => setFilter('year', e.target.value)}
                    >
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            )}

            {showMonth && (
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">Month</label>
                    <select
                        className="bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none"
                        value={filters.month}
                        onChange={(e) => setFilter('month', e.target.value)}
                    >
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            )}

            {showVisaType && (
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">Visa Type</label>
                    <select
                        className="bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors appearance-none"
                        value={filters.visaType}
                        onChange={(e) => setFilter('visaType', e.target.value)}
                    >
                        {VISA_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            )}

            {/* Extensible for Country / Region if we provide explicit lists passed as props or static later */}
            {showCountry && (
                <div className="flex flex-col gap-1.5 min-w-[160px]">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest pl-1">Country</label>
                    <input
                        type="text"
                        placeholder="Type to filter..."
                        className="bg-slate-950/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500 transition-colors"
                        value={localCountry}
                        onChange={(e) => setLocalCountry(e.target.value)}
                    />
                </div>
            )}

            <button
                onClick={resetFilters}
                className="ml-auto text-sm flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10 transition-colors active:scale-95"
            >
                <FilterX className="w-4 h-4" />
                Reset Filters
            </button>
        </div>
    );
}
