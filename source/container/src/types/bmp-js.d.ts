// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// Minimal ambient declaration for the untyped `bmp-js` package. Only the fields
// the BMP transcode path relies on are declared.
declare module 'bmp-js' {
  export interface BmpDecoded {
    width: number;
    height: number;
    /** Pixel data in ABGR byte order (alpha byte is 0 for <=24-bit sources). */
    data: Buffer;
    /** Source bit depth: 1, 4, 8, 16, 24 or 32. Only 32 carries a real alpha channel. */
    bitPP: number;
  }

  export function decode(buffer: Buffer): BmpDecoded;
  export function encode(image: { data: Buffer; width: number; height: number }): { data: Buffer; width: number; height: number };
}
