import type { Expect, TestInfo } from "@playwright/test";

import type { ImageSnapshotOptions } from "./image-snapshot-options.type";
import { ImageSnapshotMatcher } from "./matcher";

export function configureToMatchImageSnapshot(configOptions: ImageSnapshotOptions = {}) {
  return function toMatchImageSnapshot(
    this: ReturnType<Expect["getState"]>,
    received: Buffer,
    testInfo: TestInfo,
    name: string | string[],
    options: ImageSnapshotOptions = {}
  ) {
    const adjustedOptions = { ...options, ...configOptions };
    const negateComparison = this.isNot;
    const { message, pass, expectedPath, actualPath, diffPath, mimeType } = ImageSnapshotMatcher.compare(
      {
        outputPath: (...pathSegments: string[]) => testInfo.outputPath(...pathSegments),
        name: Array.isArray(name) ? name : [name],
        negateComparison,
        options: adjustedOptions,
        snapshotsPath: (...pathSegments: string[]) => testInfo.snapshotPath(...pathSegments),
        testImageBuffer: received,
        updateSnapshots: testInfo.config.updateSnapshots,
      }
    );

    const contentType = mimeType || "application/octet-stream";
    if (diffPath) testInfo.attachments.push({ name: "diff", contentType, path: diffPath });
    if (expectedPath) testInfo.attachments.push({ name: "expected", contentType, path: expectedPath });
    if (actualPath) testInfo.attachments.push({ name: "actual", contentType, path: actualPath });

    return { pass, message: () => message };
  };
}

export const toMatchImageSnapshot = configureToMatchImageSnapshot();
