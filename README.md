# playwright-image-snapshot

Enhanced image snapshots for @playwright/test. A modified fork of [playwright-image-snapshot](https://github.com/florianbepunkt/playwright-image-snapshot) which is derived from `jest-image-snapshot` (https://github.com/americanexpress/jest-image-snapshot) for Playwright.

## Installation

`npm install --save-dev @ayroblu/playwright-image-snapshot`

## Usage

```ts
// add a global.d.ts to your src directory (if you use TypeScript)
import type {
  ImageSnapshotOptions,
  TestInfo,
} from "@ayroblu/playwright-image-snapshot";

declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toMatchImageSnapshot(
        testInfo: TestInfo,
        name: string[] | string,
        options?: ImageSnapshotOptions,
      ): R;
    }
  }
}

// playwright.config.ts file
import { toMatchImageSnapshot } from "playwright-image-snapshot";
expect.extend({ toMatchImageSnapshot });

// or if you want to configure it
import { configureToMatchImageSnapshot } from "playwright-image-snapshot";
const toMatchImageSnapshot = configureToMatchImageSnapshot({
  failureThreshold: process.env["CI"] ? 0.05 : 0.01,
});
expect.extend({ toMatchImageSnapshot });

// In your test.spec.ts
expect(await page.screenshot()).toMatchImageSnapshot(test.info(), ["folder-name", "name-to-identify-snapshot.png"]);

// alternatively for more control
// expect(await page.screenshot()).toMatchImageSnapshot(test.info(), "name-to-identify-snapshot.png", {
//   blur: 2,
//   comparisonMethod: "ssim",
//   failureThreshold: 0.02,
//   failureThresholdType: "percent",
// });
```
