const sharp = require('sharp');
const path = require('path');

const smooth = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

(async () => {
  const src = path.resolve(process.argv[2]);
  const out = path.resolve(process.argv[3]);
  const img = sharp(src);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rgba = Buffer.alloc(width * height * 4);

  for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const br = (r + g + b) / 3;
    // Background score: fully 1 when clearly checkerboard-grey, fully 0 when clearly artwork.
    const satBg = 1 - smooth(sat, 8, 16);              // grey (low sat) -> background
    const brBg = smooth(br, 95, 108) * (1 - smooth(br, 222, 236)); // inside checker's brightness band
    const bg = Math.max(0, Math.min(1, satBg * brBg));
    rgba[j] = r; rgba[j + 1] = g; rgba[j + 2] = b;
    rgba[j + 3] = Math.round((1 - bg) * 255);
  }

  await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toFile(out);
  console.log('wrote', out);
})();
