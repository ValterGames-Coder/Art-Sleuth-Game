import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

const projectRoot = process.cwd();
const catalogPath = path.join(projectRoot, 'public/data/paintings-catalog.json');
const outDir = path.join(projectRoot, 'public/qr');

const siteUrl =
  process.env.QR_BASE_URL ??
  'https://valtergames-coder.github.io/Art-Sleuth-Game/';

const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
await fs.mkdir(outDir, { recursive: true });

for (const item of catalog) {
  const url = `${siteUrl}#painting/${encodeURIComponent(item.id)}`;
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 768,
    color: {
      dark: '#111111',
      light: '#FFFFFF',
    },
  });
  const outPath = path.join(outDir, `${item.id}.svg`);
  await fs.writeFile(outPath, svg, 'utf8');
}

console.log(`Generated ${catalog.length} QR files in public/qr`);
