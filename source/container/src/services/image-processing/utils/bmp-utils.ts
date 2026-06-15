// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import sharp from 'sharp';
import * as bmp from 'bmp-js';
import { ImageProcessingError } from '../types';

// Content types that browsers/origins use for BMP. Sharp/libvips ships without
// a BMP codec, so all of these must be transcoded before Sharp can touch them.
const BMP_CONTENT_TYPES = new Set(['image/bmp', 'image/x-ms-bmp', 'image/x-bmp']);

export class BmpUtils {
  static isBmp(contentType?: string): boolean {
    if (!contentType) return false;
    const normalized = contentType.split(';')[0].trim().toLowerCase();
    return BMP_CONTENT_TYPES.has(normalized);
  }

  /**
   * Sharp/libvips has no BMP decoder, so BMP sources cannot be read, resized, or
   * re-encoded directly — they would otherwise blow up as a 500 ProcessingFailure.
   * Decode the BMP to raw pixels and re-encode as PNG so the rest of the pipeline
   * (metadata, resize, format conversion, passthrough) can treat it like any other
   * raster. PNG is lossless, so no source detail is lost in the conversion.
   */
  static async transcodeToPng(buffer: Buffer): Promise<Buffer> {
    let decoded: bmp.BmpDecoded;
    try {
      decoded = bmp.decode(buffer);
    } catch (error) {
      throw new ImageProcessingError(
        415,
        'InvalidImage',
        'Invalid BMP image',
        `BMP decode failed: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }

    const { width, height, data } = decoded;
    if (!width || !height || !data?.length) {
      throw new ImageProcessingError(415, 'InvalidImage', 'Invalid BMP image', 'BMP decode returned no pixel data.');
    }

    // bmp-js emits pixels in ABGR byte order. Only 32-bit BMPs carry a real alpha
    // channel; for <=24-bit the alpha byte is 0, which must be read as fully opaque.
    const hasAlpha = decoded.bitPP === 32;
    const channels = hasAlpha ? 4 : 3;
    const pixelCount = width * height;
    const raw = Buffer.allocUnsafe(pixelCount * channels);

    for (let i = 0; i < pixelCount; i++) {
      const src = i * 4;
      const dst = i * channels;
      raw[dst] = data[src + 3];     // R
      raw[dst + 1] = data[src + 2]; // G
      raw[dst + 2] = data[src + 1]; // B
      if (hasAlpha) raw[dst + 3] = data[src]; // A
    }

    return sharp(raw, { raw: { width, height, channels } }).png().toBuffer();
  }
}
