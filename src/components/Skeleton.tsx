"use client";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** A single pulsing placeholder bar/block. Building block for every skeleton below. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
    return <div className={cn("animate-pulse rounded-md bg-slate-700/40", className)} style={style} />;
}

/** Mirrors KPICard's exact layout (icon chip top-right, big value, optional subtitle/sparkline row) so the page doesn't jump when real data swaps in. */
export function KPICardSkeleton() {
    return (
        <div className="glass-card p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

/** Mirrors a glass-panel chart card: title bar + a placeholder plot area. */
export function ChartCardSkeleton({ height = 400 }: { height?: number }) {
    return (
        <div className="glass-panel p-6 flex flex-col" style={{ height }}>
            <div className="flex items-center gap-2 mb-6">
                <Skeleton className="w-2 h-6 rounded-sm" />
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex-1 min-h-0 flex items-end gap-2 px-2 pb-2">
                {[62, 85, 45, 70, 95, 55, 78, 40, 88, 65].map((h, i) => (
                    <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-none" style={{ height: `${h}%` }} />
                ))}
            </div>
        </div>
    );
}

/**
 * Drop-in replacement for the bare spinner every analytics page used while loading --
 * renders the same KPI-grid + chart-grid shape the real content will fill, so the page
 * doesn't visually "pop" from an unrelated spinner into its actual layout.
 */
export function PageSkeleton({ kpis = 4, charts = 2, chartHeight = 400 }: { kpis?: number; charts?: number; chartHeight?: number }) {
    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: kpis }).map((_, i) => <KPICardSkeleton key={i} />)}
            </div>
            <div className={cn("grid grid-cols-1 gap-6", charts > 1 && "lg:grid-cols-2")}>
                {Array.from({ length: charts }).map((_, i) => <ChartCardSkeleton key={i} height={chartHeight} />)}
            </div>
        </div>
    );
}
