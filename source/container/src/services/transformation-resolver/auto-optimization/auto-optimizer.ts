// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Request } from "express";
import { Transformation, TransformationPolicy } from "../../../types/transformation";
import { ImageProcessingRequest } from "../../../types/image-processing-request";

const FORMAT_PRIORITY = ["webp", "avif", "jpeg", "png", "heif", "tiff", "raw", "gif"];
// TODO, DISCUSS WITH TEAM FOR OPTIMAL FORMAT PRIORITIY LIST
const ANIMATION_CAPABLE_FORMATS = new Set(["webp", "avif", "gif"]);
// Source content-types that may carry an alpha channel. JPEG output drops alpha,
// so we must not auto-select jpeg when the source is one of these.
const POTENTIALLY_TRANSPARENT_SOURCE_TYPES = new Set(["image/png", "image/webp"]);
const FORMAT_MAPPING: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/avif": "avif",
  "image/heif": "heif",
  "image/heic": "heif",
  "image/tiff": "tiff",
  "image/raw": "raw",
  "image/gif": "gif",
};

export function applyAutoOptimizations(
  transformations: Transformation[],
  req: Request,
  policy?: TransformationPolicy,
  imageRequest?: ImageProcessingRequest
): Transformation[] {
  const optimizations: Transformation[] = [];

  const outputs = parseOutputs(policy);

  optimizations.push(...getFormatOptimizations(req, outputs.format, imageRequest));
  optimizations.push(...getQualityOptimizations(req, outputs.quality));
  optimizations.push(...getSizeOptimizations(req, outputs.autosize));

  return [...transformations, ...optimizations];
}

function parseOutputs(policy?: TransformationPolicy) {
  const outputs = { quality: null, format: null, autosize: null };

  if (!policy?.outputs) {
    return outputs;
  }

  for (const output of policy.outputs) {
    if (output.type === "quality") {
      outputs.quality = output.value;
    } else if (output.type === "format") {
      outputs.format = output.value;
    } else if (output.type === "autosize") {
      outputs.autosize = output.value;
    }
  }

  return outputs;
}

function getFormatOptimizations(
  req: Request,
  formatConfig: any,
  imageRequest?: ImageProcessingRequest
): Transformation[] {
  if (!formatConfig) {
    return [];
  }

  if (formatConfig !== "auto") {
    return [createOptimizationTransformation("format", formatConfig)];
  }

  const accept = req.header("dit-accept") || "";
  console.log("Accept header found as: ", req.header("dit-accept"));
  const compatibleFormats = Object.keys(FORMAT_MAPPING)
    .filter((mimeType) => accept.includes(mimeType))
    .map((mimeType) => FORMAT_MAPPING[mimeType]);

  let selectedFormat = FORMAT_PRIORITY.find((format) => compatibleFormats.includes(format));

  if (!selectedFormat) {
    return [];
  }

  // Block jpeg selection for sources that may have an alpha channel (png, webp).
  // JPEG has no alpha — choosing it would flatten transparency and visually break
  // logos/icons/UI overlays. Fall back to the next non-jpeg accepted format; if
  // none, return [] so the source format passes through unchanged.
  if (selectedFormat === "jpeg" && POTENTIALLY_TRANSPARENT_SOURCE_TYPES.has(imageRequest?.sourceImageContentType)) {
    selectedFormat = FORMAT_PRIORITY.find((format) => format !== "jpeg" && compatibleFormats.includes(format));
    if (!selectedFormat) {
      return [];
    }
  }

  // Skip format conversion if source is a GIF and selected format cannot carry animation
  const sourceIsGif = imageRequest?.sourceImageContentType === "image/gif";
  if (sourceIsGif && !ANIMATION_CAPABLE_FORMATS.has(selectedFormat)) {
    return [];
  }

  // Check if source image format matches selected format to avoid unnecessary transformation
  if (imageRequest?.sourceImageContentType) {
    const sourceFormat = FORMAT_MAPPING[imageRequest.sourceImageContentType];
    if (sourceFormat === selectedFormat) {
      return [];
    }
  }

  return [createOptimizationTransformation("format", selectedFormat)];
}

function getQualityOptimizations(req: Request, qualityConfig: any): Transformation[] {
  console.log("getQuality: ", qualityConfig);
  if (!qualityConfig || !Array.isArray(qualityConfig) || qualityConfig.length === 0) {
    return [];
  }

  const defaultQuality = qualityConfig[0];

  // Static quality only (no DPR ranges)
  if (qualityConfig.length === 1) {
    return [createOptimizationTransformation("quality", defaultQuality)];
  }

  const dpr = req.header("dit-dpr");
  if (!dpr) {
    return [createOptimizationTransformation("quality", defaultQuality)];
  }

  const dprValue = parseFloat(dpr);
  const mappings = qualityConfig.slice(1) as [number, number, number][];

  for (const [lowerBound, upperBound, qualityValue] of mappings) {
    if (dprValue >= lowerBound && dprValue < upperBound) {
      return [createOptimizationTransformation("quality", qualityValue)];
    }
  }

  return [createOptimizationTransformation("quality", defaultQuality)];
}

function getSizeOptimizations(req: Request, autosizeConfig: any): Transformation[] {
  if (!autosizeConfig || !Array.isArray(autosizeConfig)) {
    return [];
  }

  const viewportWidth = req.header("dit-viewport-width");
  if (!viewportWidth) {
    return [];
  }

  const vw = parseInt(viewportWidth);
  if (isNaN(vw) || vw <= 0) {
    return [];
  }

  const breakpoints = autosizeConfig.sort((a, b) => a - b);
  const closestBreakpoint = breakpoints.find((bp) => bp > vw) || breakpoints[breakpoints.length - 1];

  return [createOptimizationTransformation("resize", { width: closestBreakpoint })];
}

function createOptimizationTransformation(type: string, value: any): Transformation {
  return {
    type,
    value,
    source: "auto",
  };
}
