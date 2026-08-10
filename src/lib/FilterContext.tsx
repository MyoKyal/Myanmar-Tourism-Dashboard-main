"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type GlobalFiltersState = {
    year: string;
    yearRange: [number, number];
    month: string;
    country: string;
    region: string;
    visaType: string;
    entryPoint: string;
    visitorType: string;
};

export const defaultFilters: GlobalFiltersState = {
    year: 'All',            // "All" or "2015", "2016" etc
    yearRange: [2015, 2025], // Start and End year (slider)
    month: 'All',
    country: 'All',
    region: 'All',
    visaType: 'All',
    entryPoint: 'All',
    visitorType: 'All',
};

type FilterContextType = {
    filters: GlobalFiltersState;
    setFilter: (key: keyof GlobalFiltersState, value: any) => void;
    resetFilters: () => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
    const [filters, setFilters] = useState<GlobalFiltersState>(defaultFilters);

    const setFilter = (key: keyof GlobalFiltersState, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => setFilters(defaultFilters);

    return (
        <FilterContext.Provider value={{ filters, setFilter, resetFilters }}>
            {children}
        </FilterContext.Provider>
    );
}

export function useGlobalFilters() {
    const context = useContext(FilterContext);
    if (!context) {
        throw new Error('useGlobalFilters must be used within a FilterProvider');
    }
    return context;
}
