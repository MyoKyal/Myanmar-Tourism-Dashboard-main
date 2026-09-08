// Shared statistical primitives used across the app's data-analysis features --
// correlation insights (Overview), anomaly detection (Trends), and destination
// clustering (Decision Center). Kept dependency-free and generic so each caller only
// needs to supply plain numeric arrays, not domain-specific shapes.

/** Pearson correlation coefficient (r) between two equal-length numeric series.
 *  Returns null when there isn't enough variation or data to compute a meaningful value
 *  (fewer than 3 points, or either series is constant) rather than returning a
 *  misleading 0 or NaN. */
export function pearsonCorrelation(x: number[], y: number[]): number | null {
    const n = Math.min(x.length, y.length);
    if (n < 3) return null;
    const xs = x.slice(0, n);
    const ys = y.slice(0, n);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let cov = 0, varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        cov += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
    }
    if (varX === 0 || varY === 0) return null;
    return cov / Math.sqrt(varX * varY);
}

/** Plain-language strength/direction label for a correlation coefficient, using the
 *  conventional (Cohen-style) thresholds: |r| >= 0.7 strong, >= 0.4 moderate, >= 0.2 weak,
 *  otherwise negligible. */
export function correlationStrength(r: number): { label: string; labelMm: string; direction: 'positive' | 'negative' | 'none' } {
    const abs = Math.abs(r);
    const direction = abs < 0.2 ? 'none' : r > 0 ? 'positive' : 'negative';
    const strength = abs >= 0.7 ? 'Strong' : abs >= 0.4 ? 'Moderate' : abs >= 0.2 ? 'Weak' : 'Negligible';
    const strengthMm: Record<string, string> = { Strong: 'ခိုင်မာ', Moderate: 'အလယ်အလတ်', Weak: 'အားနည်း', Negligible: 'သိသာမှုမရှိ' };
    if (direction === 'none') return { label: 'Negligible', labelMm: 'သိသာမှုမရှိ', direction };
    return {
        label: `${strength} ${direction}`,
        labelMm: `${strengthMm[strength]} ${direction === 'positive' ? 'အပြုသဘော' : 'အနုတ်သဘော'}`,
        direction,
    };
}

/** Trailing-window linear regression forecast for the next x-value, shared by the Time
 *  Trends (arrivals) and Expenditure (revenue) forecasts so both use identical math -- a
 *  precondition for meaningfully comparing them (see forecastConsistencyNote in
 *  expenditure.ts). Windowed rather than fit over the full history for the same reason in
 *  both callers: a regression spanning the 2020-2022 pandemic crash gets dominated by it and
 *  produces a nonsensical trend, so only the trailing `windowSize` points (or fewer, if the
 *  series is shorter) are used. Returns null when there are fewer than 2 usable points. */
export function trailingLinearForecast(
    points: { x: number; y: number }[],
    windowSize = 5
): { nextX: number; projected: number; growthRateUsed: number; windowYears: number } | null {
    const window = points.slice(-windowSize);
    const n = window.length;
    if (n < 2) return null;
    const xMean = window.reduce((sum, p) => sum + p.x, 0) / n;
    const yMean = window.reduce((sum, p) => sum + p.y, 0) / n;
    let num = 0, den = 0;
    for (const p of window) {
        num += (p.x - xMean) * (p.y - yMean);
        den += (p.x - xMean) ** 2;
    }
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    const nextX = window[n - 1].x + 1;
    const projected = Math.max(0, slope * nextX + intercept);
    const lastActual = window[n - 1].y;
    const growthRateUsed = lastActual > 0 ? ((projected - lastActual) / lastActual) * 100 : 0;
    return { nextX, projected, growthRateUsed: Number(growthRateUsed.toFixed(1)), windowYears: n };
}

export type AnomalyPoint<T> = T & { zScore: number; isAnomaly: boolean };

/** Flags points in a numeric series whose z-score (standard deviations from the series'
 *  own mean) exceeds `threshold` -- a standard, simple statistical outlier test. Applied
 *  to the series as a whole (not a rolling window), which suits short yearly series like
 *  this app's (~11 points) where a rolling window wouldn't have enough data per window. */
export function detectAnomalies<T extends { value: number }>(points: T[], threshold = 1.5): AnomalyPoint<T>[] {
    const n = points.length;
    if (n < 3) return points.map((p) => ({ ...p, zScore: 0, isAnomaly: false }));
    const values = points.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    return points.map((p) => {
        const zScore = stdDev === 0 ? 0 : (p.value - mean) / stdDev;
        return { ...p, zScore: Number(zScore.toFixed(2)), isAnomaly: Math.abs(zScore) >= threshold };
    });
}

/** Deterministic k-means over 2D points (no external deps, fixed iteration count and
 *  seeded-by-sort initial centroids so results are stable across reloads instead of
 *  varying with random initialization -- important for a small, fixed catalog like this
 *  app's 18 destinations, where a "random" clustering that changes every run would be
 *  confusing rather than insightful). Each dimension should be normalized (e.g. 0-1)
 *  before calling this, so no single feature dominates purely due to its raw scale. */
export function kMeans2D(points: { x: number; y: number }[], k: number, iterations = 50): number[] {
    const n = points.length;
    if (n === 0) return [];
    if (k >= n) return points.map((_, i) => i);

    // Deterministic seeding: sort by x+y and pick evenly-spaced points as initial centroids,
    // instead of Math.random() -- same input always produces the same clusters.
    const sortedIndices = points.map((_, i) => i).sort((a, b) => (points[a].x + points[a].y) - (points[b].x + points[b].y));
    let centroids: { x: number; y: number }[] = Array.from({ length: k }, (_, i) => {
        const idx = sortedIndices[Math.floor((i * (n - 1)) / Math.max(1, k - 1))];
        return { ...points[idx] };
    });

    let assignments = new Array(n).fill(0);
    for (let iter = 0; iter < iterations; iter++) {
        let changed = false;
        for (let i = 0; i < n; i++) {
            let bestCluster = 0;
            let bestDist = Infinity;
            for (let c = 0; c < k; c++) {
                const dist = (points[i].x - centroids[c].x) ** 2 + (points[i].y - centroids[c].y) ** 2;
                if (dist < bestDist) { bestDist = dist; bestCluster = c; }
            }
            if (assignments[i] !== bestCluster) changed = true;
            assignments[i] = bestCluster;
        }
        const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));
        for (let i = 0; i < n; i++) {
            const c = assignments[i];
            sums[c].x += points[i].x;
            sums[c].y += points[i].y;
            sums[c].count += 1;
        }
        centroids = centroids.map((old, c) => sums[c].count > 0 ? { x: sums[c].x / sums[c].count, y: sums[c].y / sums[c].count } : old);
        if (!changed) break;
    }
    return assignments;
}
