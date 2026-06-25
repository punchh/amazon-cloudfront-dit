"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOptions = getOptions;
/**
 * If the SOLUTION_ID and SOLUTION_VERSION environment variables are set, this will return
 * an object with a custom user agent string. Otherwise, the object returned will be empty.
 * @param options The current options.
 * @returns Either object with `customUserAgent` string or an empty object.
 */
function getOptions(options = {}) {
    const { SOLUTION_ID, SOLUTION_VERSION } = process.env;
    if (SOLUTION_ID && SOLUTION_VERSION) {
        if (SOLUTION_ID.trim() !== "" && SOLUTION_VERSION.trim() !== "") {
            options.customUserAgent = `AwsSolution/${SOLUTION_ID}/${SOLUTION_VERSION}`;
        }
    }
    return options;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LW9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtb3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUVBQXFFO0FBQ3JFLHNDQUFzQzs7QUFRdEMsZ0NBU0M7QUFmRDs7Ozs7R0FLRztBQUNILFNBQWdCLFVBQVUsQ0FBQyxVQUFtQyxFQUFFO0lBQzlELE1BQU0sRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0lBQ3RELElBQUksV0FBVyxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDcEMsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLGdCQUFnQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ2hFLE9BQU8sQ0FBQyxlQUFlLEdBQUcsZUFBZSxXQUFXLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUM3RSxDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG5cbi8qKlxuICogSWYgdGhlIFNPTFVUSU9OX0lEIGFuZCBTT0xVVElPTl9WRVJTSU9OIGVudmlyb25tZW50IHZhcmlhYmxlcyBhcmUgc2V0LCB0aGlzIHdpbGwgcmV0dXJuXG4gKiBhbiBvYmplY3Qgd2l0aCBhIGN1c3RvbSB1c2VyIGFnZW50IHN0cmluZy4gT3RoZXJ3aXNlLCB0aGUgb2JqZWN0IHJldHVybmVkIHdpbGwgYmUgZW1wdHkuXG4gKiBAcGFyYW0gb3B0aW9ucyBUaGUgY3VycmVudCBvcHRpb25zLlxuICogQHJldHVybnMgRWl0aGVyIG9iamVjdCB3aXRoIGBjdXN0b21Vc2VyQWdlbnRgIHN0cmluZyBvciBhbiBlbXB0eSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRPcHRpb25zKG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gIGNvbnN0IHsgU09MVVRJT05fSUQsIFNPTFVUSU9OX1ZFUlNJT04gfSA9IHByb2Nlc3MuZW52O1xuICBpZiAoU09MVVRJT05fSUQgJiYgU09MVVRJT05fVkVSU0lPTikge1xuICAgIGlmIChTT0xVVElPTl9JRC50cmltKCkgIT09IFwiXCIgJiYgU09MVVRJT05fVkVSU0lPTi50cmltKCkgIT09IFwiXCIpIHtcbiAgICAgIG9wdGlvbnMuY3VzdG9tVXNlckFnZW50ID0gYEF3c1NvbHV0aW9uLyR7U09MVVRJT05fSUR9LyR7U09MVVRJT05fVkVSU0lPTn1gO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufVxuIl19