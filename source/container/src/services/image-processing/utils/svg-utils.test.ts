// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { isSvgBuffer, isSvgContentType, normalizeSvgContentType } from './svg-utils';

describe('svg-utils', () => {
  const TEST_SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>');

  it('detects SVG buffers', () => {
    expect(isSvgBuffer(TEST_SVG)).toBe(true);
    expect(isSvgBuffer(Buffer.from('<?xml version="1.0"?><svg></svg>'))).toBe(true);
    expect(isSvgBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
  });

  it('normalizes SVG content types', () => {
    expect(isSvgContentType('image/svg+xml')).toBe(true);
    expect(isSvgContentType('image/svg+xml; charset=utf-8')).toBe(true);
    expect(isSvgContentType('IMAGE/SVG+XML')).toBe(true);
    expect(normalizeSvgContentType('image/svg+xml; charset=utf-8')).toBe('image/svg+xml');
    expect(isSvgContentType('image/png')).toBe(false);
  });
});
