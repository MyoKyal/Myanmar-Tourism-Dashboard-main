import { describe, it, expect } from "vitest";
import { pearsonCorrelation, correlationStrength, trailingLinearForecast, detectAnomalies, kMeans2D } from "./statistics";

describe("pearsonCorrelation", () => {
  it("returns 1 for a perfect positive linear relationship", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 10);
  });

  it("returns -1 for a perfect negative linear relationship", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 10);
  });

  it("returns null with fewer than 3 points -- the threshold below which a coefficient is not meaningful", () => {
    expect(pearsonCorrelation([1, 2], [1, 2])).toBeNull();
  });

  it("returns null when one series is constant (undefined correlation, not a misleading 0)", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [5, 5, 5, 5])).toBeNull();
  });

  it("matches a hand-computed value for a real, non-trivial series", () => {
    // x: 1..5, y: 2,1,4,3,5 -- meanX=meanY=3, cov=8, varX=varY=10, r = 8/sqrt(10*10) = 0.8
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.8, 10);
  });
});

describe("correlationStrength", () => {
  it("labels |r| >= 0.7 as Strong", () => {
    expect(correlationStrength(0.85).label).toBe("Strong positive");
    expect(correlationStrength(-0.72).label).toBe("Strong negative");
  });

  it("labels |r| < 0.2 as Negligible regardless of sign", () => {
    expect(correlationStrength(0.1).direction).toBe("none");
    expect(correlationStrength(-0.05).label).toBe("Negligible");
  });

  it("labels the boundary values consistently with the documented thresholds", () => {
    expect(correlationStrength(0.7).label).toBe("Strong positive");
    expect(correlationStrength(0.4).label).toBe("Moderate positive");
    expect(correlationStrength(0.2).label).toBe("Weak positive");
  });
});

describe("trailingLinearForecast", () => {
  it("returns null with fewer than 2 points", () => {
    expect(trailingLinearForecast([{ x: 2020, y: 100 }])).toBeNull();
  });

  it("projects a perfectly linear series forward exactly", () => {
    const points = [
      { x: 2020, y: 100 }, { x: 2021, y: 110 }, { x: 2022, y: 120 },
      { x: 2023, y: 130 }, { x: 2024, y: 140 },
    ];
    const result = trailingLinearForecast(points);
    expect(result).not.toBeNull();
    expect(result!.nextX).toBe(2025);
    expect(result!.projected).toBeCloseTo(150, 5);
    expect(result!.growthRateUsed).toBeCloseTo(7.1, 1); // (150-140)/140 * 100
  });

  it("only uses the trailing window, not the full history -- an early outlier must not shift the projection", () => {
    // A huge early spike, then a clean linear run for the trailing 5 points.
    const points = [
      { x: 2015, y: 100000 }, // pandemic-scale outlier the window should ignore
      { x: 2020, y: 100 }, { x: 2021, y: 110 }, { x: 2022, y: 120 },
      { x: 2023, y: 130 }, { x: 2024, y: 140 },
    ];
    const result = trailingLinearForecast(points, 5);
    expect(result!.windowYears).toBe(5);
    expect(result!.projected).toBeCloseTo(150, 5); // same as the clean-series test above
  });

  it("never projects a negative value", () => {
    const points = [{ x: 2020, y: 10 }, { x: 2021, y: 5 }, { x: 2022, y: 0 }];
    const result = trailingLinearForecast(points);
    expect(result!.projected).toBeGreaterThanOrEqual(0);
  });
});

describe("detectAnomalies", () => {
  it("flags a single far-outlying point and nothing else", () => {
    const points = [
      { year: 2015, value: 100 }, { year: 2016, value: 105 }, { year: 2017, value: 98 },
      { year: 2018, value: 102 }, { year: 2019, value: 1000 }, { year: 2020, value: 101 },
    ];
    const result = detectAnomalies(points, 1.5);
    const flagged = result.filter((p) => p.isAnomaly).map((p) => p.year);
    expect(flagged).toEqual([2019]);
  });

  it("flags nothing with fewer than 3 points -- too few to establish a baseline", () => {
    const result = detectAnomalies([{ value: 1 }, { value: 1000 }]);
    expect(result.every((p) => !p.isAnomaly)).toBe(true);
  });

  it("flags nothing when every value is identical (zero variance, no outlier is possible)", () => {
    const result = detectAnomalies([{ value: 5 }, { value: 5 }, { value: 5 }, { value: 5 }]);
    expect(result.every((p) => p.zScore === 0 && !p.isAnomaly)).toBe(true);
  });

  it("respects a custom threshold", () => {
    const points = [{ value: 10 }, { value: 12 }, { value: 11 }, { value: 20 }];
    const lenient = detectAnomalies(points, 3);
    const strict = detectAnomalies(points, 0.5);
    expect(lenient.filter((p) => p.isAnomaly).length).toBeLessThanOrEqual(strict.filter((p) => p.isAnomaly).length);
  });
});

describe("kMeans2D", () => {
  it("separates two obviously distinct clusters", () => {
    const points = [
      { x: 0, y: 0 }, { x: 0.1, y: 0.1 }, { x: 0.05, y: 0 },
      { x: 10, y: 10 }, { x: 10.1, y: 9.9 }, { x: 9.9, y: 10.1 },
    ];
    const assignments = kMeans2D(points, 2);
    // The first three points must share a cluster, the last three a different one.
    expect(new Set(assignments.slice(0, 3)).size).toBe(1);
    expect(new Set(assignments.slice(3, 6)).size).toBe(1);
    expect(assignments[0]).not.toBe(assignments[3]);
  });

  it("is deterministic -- identical input always produces identical output", () => {
    const points = [{ x: 1, y: 2 }, { x: 3, y: 1 }, { x: 8, y: 9 }, { x: 9, y: 8 }, { x: 0, y: 0 }];
    const first = kMeans2D(points, 2);
    const second = kMeans2D(points, 2);
    expect(first).toEqual(second);
  });

  it("returns one cluster per point when k >= n", () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    expect(kMeans2D(points, 5)).toEqual([0, 1]);
  });

  it("returns an empty assignment list for an empty input", () => {
    expect(kMeans2D([], 3)).toEqual([]);
  });
});
