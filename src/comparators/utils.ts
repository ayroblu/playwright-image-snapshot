function rgb2y(r: number, g: number, b: number) {
  return r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
}

// blend semi-transparent color with white
function blend(c: number, a: number) {
  return 255 + (c - 255) * a;
}

export function getGrayPixel(img: Buffer, i: number, alpha: number) {
  const r = img[i + 0];
  const g = img[i + 1];
  const b = img[i + 2];
  const a = img[i + 3];
  return blend(rgb2y(r, g, b), (alpha * a) / 255);
}
