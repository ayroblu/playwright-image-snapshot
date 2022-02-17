import type { Expect, TestInfo } from "@playwright/test";

import type { ImageSnapshotOptions } from "./image-snapshot-options.type";
import { ImageSnapshotMatcher } from "./matcher";

export function toMatchImageSnapshot(
  this: ReturnType<Expect["getState"]>,
  received: Buffer,
  testInfo: TestInfo,
  name: string,
  options: ImageSnapshotOptions = {}
) {
  const negateComparison = this.isNot;
  const { message, pass } = ImageSnapshotMatcher.compare({
    diffDir: (name: string) => testInfo.outputPath(name),
    name,
    negateComparison,
    options,
    snapshotsDir: (name: string) => testInfo.snapshotPath(name),
    testImageBuffer: received,
    updateSnapshots: testInfo.config.updateSnapshots,
  });

  return { pass, message: () => message };
}
