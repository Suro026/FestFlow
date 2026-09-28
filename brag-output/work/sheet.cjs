const sharp = require(require('path').resolve('C:/Users/user/Downloads/FestFlow-main/FestFlow-main/node_modules/sharp'));
const fs = require('fs'), path = require('path');
const [dir, out, cols = 4, w = 405] = process.argv.slice(2);
(async () => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort((a,b)=>parseFloat(a.slice(1))-parseFloat(b.slice(1)));
  const W = +w, H = Math.round(W*1920/1080), C = +cols, R = Math.ceil(files.length / C);
  const comps = await Promise.all(files.map(async (f, i) => ({ input: await sharp(path.join(dir, f)).resize(W, H).toBuffer(), left: (i % C) * (W + 8), top: Math.floor(i / C) * (H + 8) })));
  await sharp({ create: { width: C*(W+8), height: R*(H+8), channels: 3, background: '#000' } }).composite(comps).png().toFile(out);
  console.log(files.join(' '));
})();
