import { PNG } from "pngjs";
import ssim, { Options } from "ssim.js";
import { getGrayPixel } from "./utils";

type compareWithSSIMArgs = {
  config: Partial<Options>;
  diffImage: PNG;
  height: number;
  referenceImage: PNG;
  testImage: PNG;
  width: number;
};

export const compareWithSSIM = ({
  config,
  diffImage,
  height,
  referenceImage,
  testImage,
  width,
}: compareWithSSIMArgs) => {
  // from https://github.com/americanexpress/jest-image-snapshot/blob/2ef1ca810e60c4aa9951e1f373744dd05938e4cb/src/diff-snapshot.js#L91
  // getGrayPixel(testImage.data, 1, 0.5);

  const reference: ImageData = {
    data: new Uint8ClampedArray(referenceImage.data),
    width: width,
    height: height,
  };
  const test: ImageData = { data: new Uint8ClampedArray(testImage.data), width: width, height: height };
  const { ssim_map, mssim } = ssim(test, reference, config);
  const diffPixels = (1 - mssim) * width * height;
  const diffRgbaPixels = new DataView(diffImage.data.buffer, diffImage.data.byteOffset);

  for (let ln = 0; ln !== height; ++ln) {
    for (let pos = 0; pos !== width; ++pos) {
      const rpos = ln * width + pos;
      // initial value is transparent.  We'll add in the SSIM offset.
      const diffResult = Math.floor(
        0xff *
          (1 -
            ssim_map.data[
              ssim_map.width * Math.round((ssim_map.height * ln) / height) +
                Math.round((ssim_map.width * pos) / width)
            ])
      );
      // red (ff) green (00) blue (00) alpha (00)
      const diffValue = handleTransparent(0xff000000 + diffResult, testImage.data, rpos * 4);

      diffRgbaPixels.setUint32(rpos * 4, diffValue);
    }
  }

  return diffPixels;
};

function isTransparent(rgba: number) {
  const a = rgba & 0xff;
  // const b = (rgba >> 8) & 0xff;
  // const g = (rgba >> 16) & 0xff;
  // const r = (rgba >> 24) & 0xff;
  return a === 0;
}
function handleTransparent(diffValue: number, testImageBuffer: Buffer, i: number) {
  if (isTransparent(diffValue)) {
    const v = Math.floor(getGrayPixel(testImageBuffer, i, 0.2));
    return 255 + (v << 8) + (v << 16) + (v << 24);
  } else {
    return diffValue;
  }
}
