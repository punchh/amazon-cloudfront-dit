/**
 * If the SOLUTION_ID and SOLUTION_VERSION environment variables are set, this will return
 * an object with a custom user agent string. Otherwise, the object returned will be empty.
 * @param options The current options.
 * @returns Either object with `customUserAgent` string or an empty object.
 */
export declare function getOptions(options?: Record<string, unknown>): Record<string, unknown>;
