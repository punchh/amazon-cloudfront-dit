// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildCacheControl, buildErrorCacheControl, extractMaxAge } from './cache-control';

describe('cache-control', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.DEFAULT_CACHE_MAX_AGE;
    delete process.env.STALE_WHILE_REVALIDATE_SECONDS;
    delete process.env.STALE_IF_ERROR_SECONDS;
    delete process.env.CACHE_TTL_JITTER_SECONDS;
    delete process.env.ERROR_CACHE_MAX_AGE;
    delete process.env.ENABLE_STALE_CACHE_CONTROL;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('extractMaxAge', () => {
    it('parses max-age when present and returns undefined otherwise', () => {
      expect(extractMaxAge('max-age=90,public')).toBe(90);
      expect(extractMaxAge('public')).toBeUndefined();
      expect(extractMaxAge(undefined)).toBeUndefined();
    });
  });

  describe('buildCacheControl', () => {
    it('emits 90d max-age + 24h SWR + 24h SIE by default', () => {
      expect(buildCacheControl()).toBe(
        'max-age=7776000,public,stale-while-revalidate=86400,stale-if-error=86400'
      );
    });

    it('preserves upstream max-age when provided', () => {
      expect(buildCacheControl('max-age=120,public')).toBe(
        'max-age=120,public,stale-while-revalidate=86400,stale-if-error=86400'
      );
    });

    it('is fully configurable via env vars', () => {
      process.env.DEFAULT_CACHE_MAX_AGE = '3600';
      process.env.STALE_WHILE_REVALIDATE_SECONDS = '30';
      process.env.STALE_IF_ERROR_SECONDS = '45';
      expect(buildCacheControl()).toBe(
        'max-age=3600,public,stale-while-revalidate=30,stale-if-error=45'
      );
    });

    it('disables SWR/SIE when ENABLE_STALE_CACHE_CONTROL=No', () => {
      process.env.ENABLE_STALE_CACHE_CONTROL = 'No';
      expect(buildCacheControl('max-age=200,public')).toBe('max-age=200,public');
    });

    it('applies TTL jitter deterministically', () => {
      process.env.DEFAULT_CACHE_MAX_AGE = '1000';
      process.env.CACHE_TTL_JITTER_SECONDS = '100';
      process.env.STALE_WHILE_REVALIDATE_SECONDS = '0';
      process.env.STALE_IF_ERROR_SECONDS = '0';
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1); // floor(0.1*101)=10
      expect(buildCacheControl()).toBe('max-age=990,public');
      randomSpy.mockRestore();
    });
  });

  describe('buildErrorCacheControl', () => {
    it('emits short max-age + stale-if-error by default', () => {
      expect(buildErrorCacheControl()).toBe('max-age=600,public,stale-if-error=86400');
    });

    it('honors ERROR_CACHE_MAX_AGE and STALE_IF_ERROR_SECONDS', () => {
      process.env.ERROR_CACHE_MAX_AGE = '30';
      process.env.STALE_IF_ERROR_SECONDS = '3600';
      expect(buildErrorCacheControl()).toBe('max-age=30,public,stale-if-error=3600');
    });

    it('omits stale-if-error when disabled', () => {
      process.env.ENABLE_STALE_CACHE_CONTROL = 'No';
      expect(buildErrorCacheControl()).toBe('max-age=600,public');
    });
  });
});
