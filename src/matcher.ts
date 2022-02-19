import { compareWithSSIM } from "./comparators";
import { ImageSnapshotOptions } from "./image-snapshot-options.type";
import { PNG } from "pngjs";
import colors from "colors/safe";
import fs from "fs";
import glur from "glur";
import path from "path";
import pixelmatch from "pixelmatch";
import rimraf from "rimraf";

export class ImageSnapshotMatcher {
  static readonly DEFAULT_PIXELMATCH_CONFIG = { threshold: 0.01 };
  static readonly DEFAULT_SSIM_CONFIG = { ssim: "fast" };

  static shouldFail = ({
    diffPixelCount,
    failureThreshold,
    failureThresholdType,
    totalPixels,
  }: {
    diffPixelCount: number;
    failureThreshold: number;
    failureThresholdType: "pixel" | "percent";
    totalPixels: number;
  }) => {
    const diffRatio = diffPixelCount / totalPixels;
    let pass: boolean = false;

    if (failureThresholdType === "pixel") {
      pass = diffPixelCount <= failureThreshold;
    } else if (failureThresholdType === "percent") {
      pass = diffRatio <= failureThreshold;
    }

    return { diffRatio, pass };
  };

  static getComparisonConfig(
    comparisonAlgorithm: ImageSnapshotOptions["comparisonAlgorithm"],
    customConfig: ImageSnapshotOptions["comparisonConfig"]
  ) {
    const defaultConfig =
      comparisonAlgorithm === "ssim"
        ? ImageSnapshotMatcher.DEFAULT_SSIM_CONFIG
        : ImageSnapshotMatcher.DEFAULT_PIXELMATCH_CONFIG;

    return Object.assign({}, defaultConfig, customConfig);
  }

  static compare = ({
    outputPath,
    name,
    negateComparison = false,
    options,
    snapshotsPath,
    testImageBuffer,
    updateSnapshots = "missing",
  }: {
    outputPath: (...pathSegments: string[]) => string;
    name: string[];
    negateComparison: boolean;
    options: ImageSnapshotOptions;
    snapshotsPath: (...pathSegments: string[]) => string;
    testImageBuffer: Buffer;
    updateSnapshots: "all" | "none" | "missing";
  }): {
    pass: boolean;
    message?: string;
    expectedPath?: string;
    actualPath?: string;
    diffPath?: string;
    mimeType?: string;
  } => {
    const {
      blur,
      comparisonAlgorithm = "ssim",
      comparisonConfig = {},
      failureThreshold = 0.02,
      failureThresholdType = "percent",
    } = options;

    const writeMissingSnapshots = updateSnapshots === "all" || updateSnapshots === "missing";
    const snapshotFile = snapshotsPath(...name);

    /** write missing snapshots */
    if (!fs.existsSync(snapshotFile) && writeMissingSnapshots) {
      const commonMissingSnapshotMessage = `${snapshotFile} is missing in snapshots`;

      if (negateComparison) {
        const message = `${commonMissingSnapshotMessage}${
          writeMissingSnapshots ? ', matchers using ".not" won\'t write them automatically.' : "."
        }`;

        return { pass: true, message };
      }

      const message = `${commonMissingSnapshotMessage}${
        writeMissingSnapshots ? ", writing actual." : "."
      }`;

      fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
      fs.writeFileSync(snapshotFile, testImageBuffer);

      return {
        pass: updateSnapshots === "missing",
        message,
      };
    }

    const outputFile = outputPath(...name);
    rimraf.sync(outputFile);
    const referenceImageBuffer = fs.readFileSync(snapshotFile);

    const config = ImageSnapshotMatcher.getComparisonConfig(comparisonAlgorithm, comparisonConfig);
    const testImage = PNG.sync.read(testImageBuffer);
    const referenceImage = PNG.sync.read(referenceImageBuffer);
    const width = testImage.width;
    const height = testImage.height;
    const totalPixels = width * height;

    let diffPixelCount = 0;

    /** blur image */
    if (typeof blur === "number" && blur > 0) {
      glur(testImage.data, width, height, blur);
      glur(referenceImage.data, width, height, blur);
    }

    const diffImage = new PNG({ width, height });

    if (comparisonAlgorithm === "ssim") {
      diffPixelCount = compareWithSSIM({
        config: config as any,
        diffImage,
        height,
        referenceImage,
        testImage,
        width,
      });
    } else {
      diffPixelCount = pixelmatch(
        testImage.data as any,
        referenceImage.data as any,
        diffImage.data as any,
        width,
        height,
        config as any // can only be SSIM or PIXELMATCH, so this should be fine
      );
    }

    const { pass, diffRatio } = ImageSnapshotMatcher.shouldFail({
      totalPixels,
      diffPixelCount,
      failureThresholdType,
      failureThreshold,
    });

    if (!pass && negateComparison) {
      return { pass: false };
    }

    if (updateSnapshots === "all") {
      fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
      fs.writeFileSync(snapshotFile, testImageBuffer);
      console.log(snapshotFile + " does not match, writing actual.");
      return {
        pass: true,
        message: snapshotFile + " running with --update-snapshots, writing actual.",
      };
    }

    if (pass) {
      return {
        pass,
        message: `Comparison passed with diff ratio ${diffRatio}`,
      };
    }

    const expectedPath = addSuffixToFilePath(outputFile, "-expected");
    const actualPath = addSuffixToFilePath(outputFile, "-actual");
    const diffPath = addSuffixToFilePath(outputFile, "-diff");

    fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
    fs.mkdirSync(path.dirname(actualPath), { recursive: true });
    fs.writeFileSync(expectedPath, testImageBuffer);
    fs.writeFileSync(actualPath, referenceImageBuffer);
    fs.writeFileSync(diffPath, PNG.sync.write(diffImage, { filterType: 4 }));

    const output = [colors.red(`Snapshot comparison failed: `)];
    output.push(`Expected: ${colors.yellow(expectedPath)}`);
    output.push(`Received: ${colors.yellow(actualPath)}`);
    output.push(`    Diff: ${colors.yellow(diffPath)}`);
    output.push(`Diff ratio: ${diffRatio}`);
    return {
      pass: false,
      message: output.join("\n"),
      expectedPath,
      actualPath,
      diffPath,
      mimeType: "image/png",
    };
  };
}

export function addSuffixToFilePath(
  filePath: string,
  suffix: string,
  customExtension?: string,
  sanitize = false
): string {
  const dirname = path.dirname(filePath);
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const base = path.join(dirname, name);
  return (sanitize ? sanitizeForFilePath(base) : base) + suffix + (customExtension || ext);
}

export function sanitizeForFilePath(s: string) {
  return s.replace(/[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, "-");
}
