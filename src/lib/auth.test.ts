import { describe, it, expect } from "vitest";
import { canAccessPath, allowedPaths, ROLE_HOME } from "./auth";

// canAccessPath is the actual page-level gate proxy.ts and the Sidebar both call -- a bug
// here means either a page silently becomes reachable by an unauthorized role, or a
// legitimate page becomes unreachable. Worth real test coverage precisely because it's
// security-relevant, not just because it's convenient to test.
describe("canAccessPath", () => {
  it("grants Super Admin every path, including ones not explicitly listed anywhere", () => {
    expect(canAccessPath("SUPER_ADMIN", "/")).toBe(true);
    expect(canAccessPath("SUPER_ADMIN", "/manage-destinations")).toBe(true);
    expect(canAccessPath("SUPER_ADMIN", "/some-future-page-nobody-has-written-yet")).toBe(true);
  });

  it("matches an exact listed path for a restricted role", () => {
    expect(canAccessPath("BUSINESS_USER", "/business")).toBe(true);
  });

  it("denies a Business User every analytics page -- their role is scoped to their own business only", () => {
    expect(canAccessPath("BUSINESS_USER", "/")).toBe(false);
    expect(canAccessPath("BUSINESS_USER", "/trends")).toBe(false);
    expect(canAccessPath("BUSINESS_USER", "/manage-destinations")).toBe(false);
  });

  it("denies a Tourist every page outside their small allowed set", () => {
    expect(canAccessPath("TOURIST", "/")).toBe(false);
    expect(canAccessPath("TOURIST", "/manage-destinations")).toBe(false);
    expect(canAccessPath("TOURIST", "/decisions")).toBe(true);
  });

  it("prefix-matches sub-routes of a listed path (e.g. a specific destination's edit page)", () => {
    expect(canAccessPath("DESTINATION_MANAGER", "/manage-destinations/Bagan")).toBe(true);
    expect(canAccessPath("DESTINATION_MANAGER", "/manage-destinations/Bagan/nested")).toBe(true);
  });

  it("does not treat an unrelated path that merely starts with the same letters as a match", () => {
    // "/decisions" is allowed for a Tourist; "/decisions-export" is a different route and
    // must not be granted just because the string happens to start the same way.
    expect(canAccessPath("TOURIST", "/decisions-export")).toBe(false);
  });

  it("every role's home page is itself reachable by that role -- a login redirect that lands somewhere the role can't open would be a real dead end", () => {
    (Object.keys(ROLE_HOME) as (keyof typeof ROLE_HOME)[]).forEach((role) => {
      expect(canAccessPath(role, ROLE_HOME[role])).toBe(true);
    });
  });
});

describe("allowedPaths", () => {
  it("returns the wildcard for Super Admin, and a concrete array for every other role", () => {
    expect(allowedPaths("SUPER_ADMIN")).toBe("*");
    expect(Array.isArray(allowedPaths("TOURIST"))).toBe(true);
    expect(Array.isArray(allowedPaths("BUSINESS_USER"))).toBe(true);
    expect(Array.isArray(allowedPaths("DESTINATION_MANAGER"))).toBe(true);
  });
});
