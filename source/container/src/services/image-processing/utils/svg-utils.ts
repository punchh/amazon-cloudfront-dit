// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const SVG_CONTENT_TYPE = 'image/svg+xml';

export function normalizeSvgContentType(contentType: string | undefined): string | undefined {
  if (!contentType) return undefined;
  const bare = contentType.split(';')[0].trim().toLowerCase();
  return bare === SVG_CONTENT_TYPE ? SVG_CONTENT_TYPE : undefined;
}

export function isSvgContentType(contentType: string | undefined): boolean {
  return normalizeSvgContentType(contentType) === SVG_CONTENT_TYPE;
}

/** Detect SVG markup from the start of a buffer (after optional BOM/whitespace). */
export function isSvgBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const start = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).replace(/^\uFEFF/, '').trimStart();
  return (
    start.startsWith('<svg') ||
    start.startsWith('<?xml') ||
    start.startsWith('<!DOCTYPE svg') ||
    start.startsWith('<!doctype svg')
  );
}
