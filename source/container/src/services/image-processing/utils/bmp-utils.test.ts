// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import sharp from 'sharp';

const mockBmpDecode = jest.fn();
jest.mock('bmp-js', () => ({
  decode: (...args: unknown[]) => mockBmpDecode(...args),
}));

import { BmpUtils } from './bmp-utils';
import { ImageProcessingError } from '../types';

/**
 * Build a minimal, valid uncompressed BMP. Sharp cannot encode BMP, so test
 * fixtures must be hand-assembled. Pixels are supplied top-down; this packs them
 * bottom-up (BMP storage order) as BGR(A) with 4-byte row padding.
 */
function buildBmp(width: number, height: number, pixels: number[][], bpp: 24 | 32 = 24): Buffer {
  const bytesPerPixel = bpp / 8;
  const rowBytes = width * bytesPerPixel;
  const padding = (4 - (rowBytes % 4)) % 4;
  const rows: Buffer[] = [];
  for (let y = height - 1; y >= 0; y--) {
    const row = Buffer.alloc(rowBytes + padding);
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = pixels[y * width + x];
      const off = x * bytesPerPixel;
      row[off] = b;
      row[off + 1] = g;
      row[off + 2] = r;
      if (bpp === 32) row[off + 3] = a;
    }
    rows.push(row);
  }
  const pixelData = Buffer.concat(rows);
  const fileHeader = Buffer.alloc(14);
  fileHeader.write('BM', 0);
  fileHeader.writeUInt32LE(54 + pixelData.length, 2);
  fileHeader.writeUInt32LE(54, 10);
  const dib = Buffer.alloc(40);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(width, 4);
  dib.writeInt32LE(height, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(bpp, 14);
  dib.writeUInt32LE(pixelData.length, 20);
  return Buffer.concat([fileHeader, dib, pixelData]);
}

describe('BmpUtils', () => {
  beforeEach(() => {
    mockBmpDecode.mockReset();
    mockBmpDecode.mockImplementation((buffer: Buffer) => jest.requireActual('bmp-js').decode(buffer));
  });

  describe('isBmp', () => {
    it.each([
      'image/bmp',
      'image/x-ms-bmp',
      'image/x-bmp',
      'IMAGE/BMP',
      'image/bmp; charset=binary'
    ])('returns true for %s', (ct) => {
      expect(BmpUtils.isBmp(ct)).toBe(true);
    });

    it.each(['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream', '', undefined])(
      'returns false for %s',
      (ct) => {
        expect(BmpUtils.isBmp(ct as any)).toBe(false);
      }
    );
  });

  describe('transcodeToPng', () => {
    it('decodes a 24-bit BMP to a PNG with correct colors', async () => {
      // 2x2 top-down: TL red, TR green, BL blue, BR white
      const bmpBuffer = buildBmp(2, 2, [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 255]
      ]);

      const png = await BmpUtils.transcodeToPng(bmpBuffer);

      const meta = await sharp(png).metadata();
      expect(meta.format).toBe('png');
      expect(meta.width).toBe(2);
      expect(meta.height).toBe(2);

      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      const pixel = (i: number) => [...data.subarray(i * info.channels, i * info.channels + 3)];
      expect(pixel(0)).toEqual([255, 0, 0]); // red
      expect(pixel(1)).toEqual([0, 255, 0]); // green
      expect(pixel(2)).toEqual([0, 0, 255]); // blue
      expect(pixel(3)).toEqual([255, 255, 255]); // white
    });

    it('treats <=24-bit sources as fully opaque (no spurious transparency)', async () => {
      const bmpBuffer = buildBmp(1, 1, [[10, 20, 30]]);
      const png = await BmpUtils.transcodeToPng(bmpBuffer);
      const meta = await sharp(png).metadata();
      // 24-bit source -> 3 channels, no alpha. Sharp reports hasAlpha=false.
      expect(meta.hasAlpha).toBe(false);
    });

    it('preserves the alpha channel for 32-bit BMP sources', async () => {
      // single semi-transparent pixel
      const bmpBuffer = buildBmp(1, 1, [[200, 100, 50, 128]], 32);
      const png = await BmpUtils.transcodeToPng(bmpBuffer);
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      expect(info.channels).toBe(4);
      expect([...data.subarray(0, 4)]).toEqual([200, 100, 50, 128]);
    });

    it('throws a 415 ImageProcessingError for non-BMP / corrupt input', async () => {
      const garbage = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
      await expect(BmpUtils.transcodeToPng(garbage)).rejects.toBeInstanceOf(ImageProcessingError);
      await expect(BmpUtils.transcodeToPng(garbage)).rejects.toMatchObject({ statusCode: 415 });
    });

    it('throws 415 when decoded dimensions exceed the pixel buffer', async () => {
      mockBmpDecode.mockReturnValue({
        width: 10,
        height: 10,
        data: Buffer.alloc(16),
        bitPP: 24,
      });

      await expect(BmpUtils.transcodeToPng(Buffer.from('BM-fake'))).rejects.toMatchObject({
        statusCode: 415,
        errorType: 'InvalidImage',
      });
    });
  });
});
