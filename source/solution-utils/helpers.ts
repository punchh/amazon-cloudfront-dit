// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Indicates whether a specified string is null, empty, or consists only of white-space characters.
 * @param str String to test.
 * @returns `true` if the `str` parameter is null or empty, or if value consists exclusively of white-space characters.
 */
export function isNullOrWhiteSpace(str: string): boolean {
  return !str || str.replace(/\s/g, "") === "";
}

/**
 * Parses an environment variable into a non-negative integer.
 * @param value The raw environment variable value.
 * @param fallback The value to use when parsing fails or the input is empty.
 * @returns A non-negative integer.
 */
function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  if (isNullOrWhiteSpace(value)) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Extracts the `max-age` (seconds) from an existing Cache-Control header.
 * @param cacheControl An existing Cache-Control directive string.
 * @returns The parsed max-age in seconds, or undefined when not present.
 */
export function extractMaxAge(cacheControl: string | undefined): number | undefined {
  if (isNullOrWhiteSpace(cacheControl)) return undefined;
  const match = /max-age\s*=\s*(\d+)/i.exec(cacheControl);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

/**
 * Builds a Cache-Control header value that mitigates the CloudFront "thundering herd" problem
 * on cache expiry by adding `stale-while-revalidate` and `stale-if-error` directives, plus
 * optional per-object TTL jitter so that objects cached together do not all expire at once.
 *
 * All behavior is configurable through environment variables (with safe defaults):
 * - DEFAULT_CACHE_MAX_AGE   : base max-age in seconds when the source object has none (default 7776000 = 90d)
 * - STALE_WHILE_REVALIDATE_SECONDS : stale-while-revalidate window in seconds (default 86400 = 24h)
 * - STALE_IF_ERROR_SECONDS         : stale-if-error window in seconds (default 86400 = 24h)
 * - CACHE_TTL_JITTER_SECONDS       : max random seconds subtracted from max-age to stagger expiry (default 0 = off)
 * - ENABLE_STALE_CACHE_CONTROL     : "No" disables SWR/SIE augmentation entirely (default enabled)
 *
 * @param baseCacheControl An existing Cache-Control directive (e.g. from the S3 object). When it
 *   contains a `max-age`, that value is preserved as the base; otherwise DEFAULT_CACHE_MAX_AGE is used.
 * @returns A composed Cache-Control header value.
 */
export function buildCacheControl(baseCacheControl?: string): string {
  const {
    DEFAULT_CACHE_MAX_AGE,
    STALE_WHILE_REVALIDATE_SECONDS,
    STALE_IF_ERROR_SECONDS,
    CACHE_TTL_JITTER_SECONDS,
    ENABLE_STALE_CACHE_CONTROL,
  } = process.env;

  const defaultMaxAge = parseNonNegativeInt(DEFAULT_CACHE_MAX_AGE, 7776000); // 90 days
  const swr = parseNonNegativeInt(STALE_WHILE_REVALIDATE_SECONDS, 86400); // 24 hours
  const sie = parseNonNegativeInt(STALE_IF_ERROR_SECONDS, 86400); // 24 hours
  const jitter = parseNonNegativeInt(CACHE_TTL_JITTER_SECONDS, 0);

  // Preserve an explicit max-age from the source object; otherwise use the configured default.
  const baseMaxAge = extractMaxAge(baseCacheControl) ?? defaultMaxAge;

  // Apply TTL jitter so objects populated in the same burst don't all expire simultaneously.
  // Subtract a random amount in [0, jitter], never dropping below 1 second.
  const jitterOffset = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
  const maxAge = Math.max(1, baseMaxAge - jitterOffset);

  const directives = [`max-age=${maxAge}`, "public"];

  // Augment with stale-serving directives unless explicitly disabled.
  if (ENABLE_STALE_CACHE_CONTROL !== "No") {
    if (swr > 0) directives.push(`stale-while-revalidate=${swr}`);
    if (sie > 0) directives.push(`stale-if-error=${sie}`);
  }

  return directives.join(",");
}
