// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Cache-Control builder for the DIT container origin.
 *
 * The container is the CloudFront origin (via the internal ALB). CloudFront reads the
 * origin's Cache-Control directives to decide caching behavior, so emitting
 * `stale-while-revalidate` and `stale-if-error` here is what mitigates the CloudFront
 * "thundering herd" on cache expiry:
 *  - stale-while-revalidate: on expiry, CloudFront serves the cached (stale) image
 *    instantly while it revalidates in the background — collapsed to a single origin
 *    fetch per object by Origin Shield.
 *  - stale-if-error: if the origin returns 5xx during revalidation, CloudFront keeps
 *    serving the stale image instead of surfacing the error to end users.
 *
 * Optional per-object TTL jitter staggers expiry so objects populated in the same burst
 * don't all expire simultaneously.
 *
 * All values are configurable via environment variables (with safe defaults):
 *  - DEFAULT_CACHE_MAX_AGE            : base max-age seconds (default 7776000 = 90 days)
 *  - STALE_WHILE_REVALIDATE_SECONDS   : SWR window seconds (default 86400 = 24h)
 *  - STALE_IF_ERROR_SECONDS           : SIE window seconds (default 86400 = 24h)
 *  - CACHE_TTL_JITTER_SECONDS         : max seconds subtracted from max-age (default 0 = off)
 *  - ERROR_CACHE_MAX_AGE              : max-age for 5xx responses (default 600)
 *  - ENABLE_STALE_CACHE_CONTROL       : "No" disables SWR/SIE augmentation (default enabled)
 */

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  if (!value || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Extracts the `max-age` (seconds) from an existing Cache-Control header, if present.
 * @param cacheControl An existing Cache-Control directive string.
 * @returns The parsed max-age in seconds, or undefined when not present.
 */
export function extractMaxAge(cacheControl: string | undefined): number | undefined {
  if (!cacheControl || cacheControl.trim() === '') return undefined;
  const match = /max-age\s*=\s*(\d+)/i.exec(cacheControl);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

/**
 * Builds the success-response Cache-Control value with SWR + SIE (+ optional TTL jitter).
 * @param baseCacheControl Optional upstream Cache-Control whose max-age should be preserved.
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

  const baseMaxAge = extractMaxAge(baseCacheControl) ?? defaultMaxAge;

  const jitterOffset = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
  const maxAge = Math.max(1, baseMaxAge - jitterOffset);

  const directives = [`max-age=${maxAge}`, 'public'];
  if (ENABLE_STALE_CACHE_CONTROL !== 'No') {
    if (swr > 0) directives.push(`stale-while-revalidate=${swr}`);
    if (sie > 0) directives.push(`stale-if-error=${sie}`);
  }
  return directives.join(',');
}

/**
 * Builds the Cache-Control value for origin 5xx responses: a short max-age (so the error
 * isn't cached long) plus stale-if-error so CloudFront keeps serving previously cached
 * content during an origin outage.
 * @returns A composed Cache-Control header value for error responses.
 */
export function buildErrorCacheControl(): string {
  const { ERROR_CACHE_MAX_AGE, STALE_IF_ERROR_SECONDS, ENABLE_STALE_CACHE_CONTROL } = process.env;
  const maxAge = parseNonNegativeInt(ERROR_CACHE_MAX_AGE, 600);
  const sie = parseNonNegativeInt(STALE_IF_ERROR_SECONDS, 86400);
  const directives = [`max-age=${maxAge}`, 'public'];
  if (ENABLE_STALE_CACHE_CONTROL !== 'No' && sie > 0) {
    directives.push(`stale-if-error=${sie}`);
  }
  return directives.join(',');
}
