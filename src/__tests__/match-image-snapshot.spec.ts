import {test as base, expect} from "@playwright/test";
import http from "http";
import StaticServer from "node-static";

const startServer = async (port: number = 0, timeout: number = 5000): Promise<http.Server> => {
  const staticServer = new StaticServer.Server("./test-files");

  return new Promise((resolve, reject) => {
    const rejectTimer = setTimeout(() => reject(new Error("Server start timed out")), timeout);

    const server = http
      .createServer((request, response) => {
        request
          .addListener("end", function () {
            staticServer.serve(request, response);
          })
          .resume();
      })
      .listen(port, () => {
        clearTimeout(rejectTimer);
        resolve(server);
      });
  });
};

type ServerWorkerFixtures = {
  port: number;
  server: http.Server;
};

const test = base.extend<{}, ServerWorkerFixtures>({
  port: [
    async ({}, use) => {
      let server = await startServer();
      await use((server.address() as any).port);
      await new Promise((resolve) => server.close(resolve));
    },
    {scope: "worker", auto: true},
  ],
});

test.describe("pixelmatch", () => {
  const config = {comparisonAlgorithm: "pixelmatch" as "pixelmatch"};
  test.beforeEach(async ({}, testInfo) => (testInfo.snapshotSuffix = ""));

  test("matches images", async ({page, port}, testInfo) => {
    console.log("testInfo.snapshotSuffix", testInfo.snapshotSuffix);
    await page.goto(`http://localhost:${port}/green-page.html`);
    expect(await page.screenshot()).toMatchImageSnapshot(test.info(), `green-page.png`, config);
  });

  test("does not match image", async ({page, port}) => {
    await page.goto(`http://localhost:${port}/red-page.html`);
    expect(await page.screenshot()).not.toMatchImageSnapshot(test.info(), `green-page.png`, config);
  });
});

test.describe("SSIM", () => {
  const config = {comparisonAlgorithm: "ssim" as "ssim"};

  test("matches images", async ({page, port}) => {
    await page.goto(`http://localhost:${port}/green-page.html`);
    expect(await page.screenshot()).toMatchImageSnapshot(test.info(), `green-page.png`, config);
  });

  test("does not match image", async ({page, port}) => {
    await page.goto(`http://localhost:${port}/red-page.html`);
    expect(await page.screenshot()).not.toMatchImageSnapshot(test.info(), `green-page.png`, config);
  });
});
