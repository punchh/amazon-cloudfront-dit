// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// New Relic must be imported before other modules for full instrumentation
import newrelic from "newrelic";
import { ECSClient } from "@aws-sdk/client-ecs";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { SupportedEvent } from "./types";
import { EcsDeploymentUtility } from "./utilities/ecs-deployment";
import { MetricsCollectorUtility } from "./utilities/metrics-collector";
import { getOptions } from "../solution-utils/get-options";
import { createAirbrakeNotifier } from "./observability";

// Initialize clients outside handler for cold start optimization
const awsSdkOptions = getOptions();
const ecsClient = new ECSClient({...awsSdkOptions});
const cloudWatchClient = new CloudWatchClient({...awsSdkOptions});
const airbrake = createAirbrakeNotifier();

// Initialize utilities
const utilities = [
  new EcsDeploymentUtility(ecsClient),
  new MetricsCollectorUtility(cloudWatchClient)
];

async function utilityHandler(event: SupportedEvent): Promise<void> {
  for (const utility of utilities) {
    if (utility.canHandle(event)) {
      try {
        await utility.execute(event);
      } catch (error) {
        await airbrake?.notify(error);
        throw error;
      }
      return;
    }
  }
  
  console.warn("No utility found to handle event", JSON.stringify(event, null, 2));
}

// Wrap handler with New Relic for Lambda instrumentation
export const handler = newrelic.setLambdaHandler(utilityHandler);
