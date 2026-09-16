// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Notifier } from "@airbrake/node";

/**
 * Creates and returns an Airbrake Notifier when credentials are provided via
 * AIRBRAKE_PROJECT_ID and AIRBRAKE_PROJECT_KEY environment variables.
 * Returns null if credentials are not configured.
 */
export function createAirbrakeNotifier(): Notifier | null {
  const { AIRBRAKE_PROJECT_ID, AIRBRAKE_PROJECT_KEY } = process.env;
  if (!AIRBRAKE_PROJECT_ID || !AIRBRAKE_PROJECT_KEY) {
    return null;
  }
  return new Notifier({
    projectId: parseInt(AIRBRAKE_PROJECT_ID, 10),
    projectKey: AIRBRAKE_PROJECT_KEY,
    environment: process.env.NODE_ENV ?? "production",
  });
}
