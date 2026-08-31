// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildCacheControl, extractMaxAge, isNullOrWhiteSpace } from "../helpers";

describe("helpers", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    // Clear cache-control related env so each test controls its own inputs.
    delete process.env.DEFAULT_CACHE_MAX_AGE;
    delete process.env.STALE_WHILE_REVALIDATE_SECONDS;
    delete process.env.STALE_IF_ERROR_SECONDS;
    delete process.env.CACHE_TTL_JITTER_SECONDS;
    delete process.env.ENABLE_STALE_CACHE_CONTROL;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe("isNullOrWhiteSpace", () => {
    it("returns true for empty/whitespace and false otherwise", () => {
      expect(isNullOrWhiteSpace("")).toBe(true);
      expect(isNullOrWhiteSpace("   ")).toBe(true);
      expect(isNullOrWhiteSpace(undefined)).toBe(true);
      expect(isNullOrWhiteSpace("x")).toBe(false);
    });
  });

  describe("extractMaxAge", () => {
    it("parses max-age when present", () => {
      expect(extractMaxAge("max-age=1234,public")).toBe(1234);
      expect(extractMaxAge("public, max-age = 42")).toBe(42);
    });
    it("returns undefined when absent", () => {
      expect(extractMaxAge("public,no-store")).toBeUndefined();
      expect(extractMaxAge("")).toBeUndefined();
      expect(extractMaxAge(undefined)).toBeUndefined();
    });
  });

  describe("buildCacheControl", () => {
    it("uses 90d default max-age + 24h SWR + 24h SIE when no env or base is provided", () => {
      expect(buildCacheControl()).toBe(
        "max-age=7776000,public,stale-while-revalidate=86400,stale-if-error=86400"
      );
    });

    it("preserves an explicit max-age from the source object's Cache-Control", () => {
      expect(buildCacheControl("max-age=300,public")).toBe(
        "max-age=300,public,stale-while-revalidate=86400,stale-if-error=86400"
      );
    });

    it("honors configurable SWR/SIE/default via environment variables", () => {
      process.env.DEFAULT_CACHE_MAX_AGE = "1000";
      process.env.STALE_WHILE_REVALIDATE_SECONDS = "60";
      process.env.STALE_IF_ERROR_SECONDS = "120";
      expect(buildCacheControl()).toBe(
        "max-age=1000,public,stale-while-revalidate=60,stale-if-error=120"
      );
    });

    it("omits SWR/SIE when ENABLE_STALE_CACHE_CONTROL is 'No'", () => {
      process.env.ENABLE_STALE_CACHE_CONTROL = "No";
      process.env.DEFAULT_CACHE_MAX_AGE = "500";
      expect(buildCacheControl()).toBe("max-age=500,public");
    });

    it("applies TTL jitter within bounds (deterministic via Math.random mock)", () => {
      process.env.DEFAULT_CACHE_MAX_AGE = "1000";
      process.env.CACHE_TTL_JITTER_SECONDS = "100";
      process.env.STALE_WHILE_REVALIDATE_SECONDS = "0";
      process.env.STALE_IF_ERROR_SECONDS = "0";
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5); // -> floor(0.5*101)=50
      expect(buildCacheControl()).toBe("max-age=950,public");
      randomSpy.mockRestore();
    });

    it("never drops max-age below 1 even with large jitter", () => {
      process.env.DEFAULT_CACHE_MAX_AGE = "10";
      process.env.CACHE_TTL_JITTER_SECONDS = "1000";
      process.env.STALE_WHILE_REVALIDATE_SECONDS = "0";
      process.env.STALE_IF_ERROR_SECONDS = "0";
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.999999);
      const result = buildCacheControl();
      const maxAge = extractMaxAge(result);
      expect(maxAge).toBeGreaterThanOrEqual(1);
      randomSpy.mockRestore();
    });
  });
});
