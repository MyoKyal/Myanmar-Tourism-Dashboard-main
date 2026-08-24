"use client";

import { useEffect, useState } from "react";

/**
 * Fetches data on mount / whenever `deps` changes, then keeps re-fetching in the
 * background on an interval so the dashboard reflects new data (e.g. a re-run of
 * scripts/ingest.cjs) without the user needing to reload the page.
 */
export function useLiveData<T>(fetcher: () => Promise<T>, deps: unknown[], intervalMs = 45000) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load(background: boolean) {
            if (!background) setLoading(true);
            try {
                const result = await fetcher();
                if (!cancelled) {
                    setData(result);
                    setLastUpdated(new Date());
                }
            } catch (err) {
                console.error("Failed to load live data", err);
            }
            if (!background && !cancelled) setLoading(false);
        }

        load(false);
        const id = setInterval(() => load(true), intervalMs);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return { data, loading, lastUpdated };
}
