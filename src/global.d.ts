import type { TestInfo } from "@playwright/test";

declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toMatchImageSnapshot(
        testInfo: TestInfo,
        name: string[] | string,
        options?: ImageSnapshotOptions
      ): R;
    }
  }
}
