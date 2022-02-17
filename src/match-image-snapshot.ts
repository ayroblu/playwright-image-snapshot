import type { Expect, TestInfo } from "@playwright/test";
import path from "path";

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
    diffDir: testInfo.outputPath,
    name,
    negateComparison,
    options,
    snapshotsDir: testInfo.snapshotPath,
    testImageBuffer: received,
    updateSnapshots: testInfo.config.updateSnapshots,
  });

  return { pass, message: () => message };
}
