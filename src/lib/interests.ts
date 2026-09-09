export const INTEREST_KEYS = ["culture", "nature", "beach", "urban", "adventure"] as const;
export type InterestKey = (typeof INTEREST_KEYS)[number];
