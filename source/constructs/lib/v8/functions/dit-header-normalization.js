// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import cf from 'cloudfront';

const kvsHandle = cf.kvs();



//const FORMAT_PRIORITY = ['webp', 'avif', 'jpeg', 'png', 'heif', 'tiff', 'raw', 'gif'];
// Priority: WebP first to avoid Chromium AVIF top-level-navigation download bug
// (Chrome/Edge fail to render AVIF on direct URL nav even with Content-Disposition: inline).
// Reverts the Issue #5 reorder. AVIF is still served when client explicitly accepts only AVIF.
const FORMAT_PRIORITY = ['webp', 'avif', 'jpeg', 'png', 'heif', 'tiff', 'raw', 'gif'];




const FORMAT_MAPPING = {
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/heif': 'heif',
  'image/heic': 'heif',
  'image/tiff': 'tiff',
  'image/raw': 'raw',
  'image/gif': 'gif'
};
const SVG_PASSTHROUGH_PATHS = ['/themes-editor/'];  

function isSvgPassthroughPath(uri) { 
  if (!uri) return false; 
  for (var i = 0; i < SVG_PASSTHROUGH_PATHS.length; i++) { 
    if (uri.indexOf(SVG_PASSTHROUGH_PATHS[i]) !== -1) { 
      return true; 
    }  
  } 
  return false; 
}        

const NON_ALPHA_FORMATS = ['jpeg'];

// Accept-header wildcard tokens that mean "any image type"
const WILDCARD_TOKENS = ['*/*', 'image/*'];

// User-Agent substrings that confirm WebP support.
// Verified support matrices:
//   - Chrome 32+ (Jan 2014), Edge 18+, Firefox 65+, Opera 19+: WebP full support
//   - Safari 14+ (macOS 11/iOS 14, Sep 2020): WebP full support
//   - Mobile WebViews (Android Chrome, iOS WKWebView 14+): WebP full support
// References: https://caniuse.com/webp
const WEBP_CAPABLE_UA_PATTERNS = [
  /Chrome\/\d+/i,           // Chrome, Edge (Chromium), Opera, modern Android browsers
  /Firefox\/(6[5-9]|[7-9]\d|\d{3,})/i,  // Firefox 65+
  /Version\/(1[4-9]|[2-9]\d|\d{3,})[\d.]*\s.*Safari\//i,  // Safari 14+ desktop and iOS (Mobile token may appear between Version and Safari)
 // Safari 14+ desktop and iOS (Mobile token may appear between Version and Safari)
  // Safari 14+ (Version token, Safari trailing)
  /CriOS\/\d+/i,            // Chrome on iOS
  /FxiOS\/\d+/i,            // Firefox on iOS (uses iOS WebView, WebP support tied to OS)
  /EdgiOS\/\d+/i            // Edge on iOS
];

function isWebpCapableUserAgent(ua) {
  if (!ua) return false;
  for (var i = 0; i < WEBP_CAPABLE_UA_PATTERNS.length; i++) {
    if (WEBP_CAPABLE_UA_PATTERNS[i].test(ua)) {
      return true;
    }
  }
  return false;
}

function normalizeAcceptHeader(acceptHeader, userAgent, excludeFormats) {
  if (!acceptHeader) return null;

  const mimeTypes = acceptHeader
    .split(',')
    .map(part => part.split(';')[0].trim().toLowerCase());

  var supportedFormats = [];
  var hasWildcard = false;
  for (var i = 0; i < mimeTypes.length; i++) {
    if (WILDCARD_TOKENS.indexOf(mimeTypes[i]) !== -1) {
      hasWildcard = true;
      continue;
    }
    if (FORMAT_MAPPING[mimeTypes[i]]) {
      supportedFormats.push(FORMAT_MAPPING[mimeTypes[i]]);
    }
  }

  // Issue #2: drop alpha-incompatible formats (e.g. JPEG) when source has alpha
  if (excludeFormats && excludeFormats.length > 0) {
    supportedFormats = supportedFormats.filter(function (fmt) {
      return excludeFormats.indexOf(fmt) === -1;
    });
  }

  // Specific MIME types win over wildcard
  for (var j = 0; j < FORMAT_PRIORITY.length; j++) {
    if (supportedFormats.indexOf(FORMAT_PRIORITY[j]) !== -1) {
      return 'image/' + FORMAT_PRIORITY[j];
    }
  }

  // Wildcard fallback: only set dit-accept if UA confirms WebP support.
  // Unknown UAs fall through to null -> no dit-accept -> source format served (status quo).
  if (hasWildcard && isWebpCapableUserAgent(userAgent)) {
    return 'image/webp';
  }

  return null;
}


async function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var uri = request.uri.toLowerCase();
  console.log("DIT Function - Processing request:", JSON.stringify(event, null, 2));
  
  delete request.headers['x-custom-origin'];
  const pathParts = request.uri.split('/');
  if (pathParts.length >= 3 && pathParts[1]) {
    const pathPrefix = pathParts[1];
    console.log('pathPrefix =',pathPrefix)
    const newPath = '/' + pathParts.slice(2).join('/');
    console.log('newPath =',newPath)
    try {
      const bucketName = await kvsHandle.get(pathPrefix);
      if (bucketName) {
        request.headers['x-custom-origin'] = { value: bucketName };
        request.uri = newPath;
      }
    } catch (err) {
      console.log('KVS lookup failed for prefix:', pathPrefix, err && err.message);
    }
  }
  
  try {
    // Get header mapping configuration from KVS
    const ditHostHeader = "dit-host";
    const ditAcceptHeader = "dit-accept";
    const ditDprHeader = "dit-dpr";
    const ditViewportWidthHeader = "dit-viewport-width";
    const ditOriginHeader = ""; // eg. dit-origin
    const viewportBreakpoints = "320,480,768,1024,1200,1440,1920";

    // Parse viewport breakpoints
    const breakpoints = viewportBreakpoints
      ? viewportBreakpoints
          .split(",")
          .map(Number)
          .sort((a, b) => a - b)
      : [320, 480, 768, 1024, 1200, 1440, 1920];

    // Normalize viewport width to nearest breakpoint and map to DIT header
    if (headers["sec-ch-viewport-width"] && ditViewportWidthHeader) {
      const viewportWidth = parseInt(headers["sec-ch-viewport-width"]["value"]);
      let normalizedWidth = breakpoints[0]; // Default to smallest

      for (let i = 0; i < breakpoints.length; i++) {
        if (viewportWidth <= breakpoints[i]) {
          normalizedWidth = breakpoints[i];
          break;
        }
        if (i === breakpoints.length - 1) {
          normalizedWidth = breakpoints[i]; // Use the largest if exceeds all
        }
      }

      // Set normalized viewport width header
      request.headers[ditViewportWidthHeader] = { value: normalizedWidth.toString() };
    }

    // Issue #2: detect alpha-capable source via URL extension to prevent
    // transparent PNG/GIF/WebP being converted to JPEG (which loses alpha).
    var excludeFormats = [];
    //var uri = request.uri ? request.uri.toLowerCase() : '';
    if (uri.endsWith('.png') || uri.endsWith('.gif') || uri.endsWith('.webp')) {
      excludeFormats = NON_ALPHA_FORMATS;
    }

    var isSvgSource = uri.endsWith('.svg');
    var isSvgAllowlistedPassthrough = isSvgSource && isSvgPassthroughPath(uri);
    
    if (isSvgSource && !isSvgPassthroughPath(uri) && !(request.querystring && request.querystring.format)) {
      if (!request.querystring) request.querystring = {};
      request.querystring.format = { value: 'png' };
    } 

    var isWebpSource = uri.endsWith('.webp');
    var acceptMissing = !headers["accept"]; 
    if (isWebpSource && acceptMissing && !(request.querystring && request.querystring.format)) {
      request.headers["dit-webp-fallback"] = { value: "gif" }; 
    } 


    // Map standard headers to DIT headers for cache key optimization
    
    
    // Map standard headers to DIT headers for cache key optimization
    if (headers["host"] && ditHostHeader) {
      request.headers[ditHostHeader] = { value: headers["host"]["value"] };
    }

    // Only set dit-accept if format parameter is not present in query string
    if (headers["accept"] && ditAcceptHeader && !(request.querystring && request.querystring.format) && !isSvgAllowlistedPassthrough) { 
      const userAgent = headers["user-agent"] && headers["user-agent"]["value"];
      const normalizedFormat = normalizeAcceptHeader(headers["accept"]["value"], userAgent, excludeFormats);    
      if (normalizedFormat) {
        request.headers[ditAcceptHeader] = { value: normalizedFormat };
      }
    }

    // Normalize DPR values to nearest tenth and cap at 5.0
    if (headers["sec-ch-dpr"] && ditDprHeader) {
      const dprValue = parseFloat(headers["sec-ch-dpr"]["value"]);
      const normalizedDpr = Math.min(Math.round(dprValue * 10) / 10, 5.0);
      request.headers[ditDprHeader] = { value: normalizedDpr.toString() };
    }

    console.log("DIT Function - Processed headers:", JSON.stringify(request.headers, null, 2));
  } catch (error) {
    console.error("DIT Function - Error processing request:", error);
    // Continue with original request on error
  }

  return request;
}
