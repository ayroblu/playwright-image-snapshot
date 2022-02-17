import type { Expect, TestInfo } from "@playwright/test";

import type { ImageSnapshotOptions } from "./image-snapshot-options.type";
import { ImageSnapshotMatcher } from "./matcher";

export function toMatchImageSnapshot(
  this: ReturnType<Expect["getState"]>,
  received: Buffer,
  testInfo: TestInfo,
  name: string | string[],
  options: ImageSnapshotOptions = {}
) {
  const negateComparison = this.isNot;
  const { message, pass } = ImageSnapshotMatcher.compare({
    outputPath: (...pathSegments: string[]) => testInfo.outputPath(...pathSegments),
    name,
    negateComparison,
    options,
    snapshotsPath: (...pathSegments: string[]) => testInfo.snapshotPath(...pathSegments),
    testImageBuffer: received,
    updateSnapshots: testInfo.config.updateSnapshots,
  });

  return { pass, message: () => message };
}
