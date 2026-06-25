// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export type YesNo = "Yes" | "No";

/**
 * Observability configuration for New Relic and Airbrake.
 * All fields are optional; observability tools activate only when credentials are provided.
 */
export interface ObservabilityConfig {
  readonly newRelicLicenseKey?: string;
  readonly airbrakeProjectId?: string;
  readonly airbrakeProjectKey?: string;
}

export interface SolutionConstructProps {
  readonly corsEnabled: string;
  readonly corsOrigin: string;
  readonly sourceBuckets: string;
  readonly deployUI: YesNo;
  readonly logRetentionPeriod: string;
  readonly autoWebP: string;
  readonly enableSignature: YesNo;
  readonly originShieldRegion: string;
  readonly secretsManager: string;
  readonly secretsManagerKey: string;
  readonly enableDefaultFallbackImage: YesNo;
  readonly fallbackImageS3Bucket: string;
  readonly fallbackImageS3KeyBucket: string;
  readonly enableS3ObjectLambda: string;
  readonly useExistingCloudFrontDistribution: YesNo;
  readonly existingCloudFrontDistributionId: string;
  readonly observability?: ObservabilityConfig;
}
