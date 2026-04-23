import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'public/data/paintings-catalog.json');
const paintingsDir = path.join(root, 'public/data/paintings');
const outputDir = path.join(root, 'public/paintings');

await fs.mkdir(outputDir, { recursive: true });

const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));

const userAgent = 'ArtSleuth/1.0 (educational project)';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, label) {
  const attempts = 5;
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (res.status !== 429 && res.status < 500) return res;
    if (i === attempts) return res;
    console.log(`${label}: retry ${i}/${attempts - 1} after ${res.status}`);
    await wait(700 * i);
  }
  throw new Error(`Unexpected retry exit for ${label}`);
}

for (const item of catalog) {
  const jsonPath = path.join(paintingsDir, `${item.id}.json`);
  const data = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  const wikiPage = data.painting.wikiPage;
  if (!wikiPage) {
    console.log(`Skip ${item.id}: no wikiPage`);
    continue;
  }

  const thumbApiUrl =
    `https://en.wikipedia.org/w/api.php` +
    `?action=query&format=json&origin=*` +
    `&prop=pageimages&pithumbsize=1800&titles=${encodeURIComponent(wikiPage)}`;
  const thumbRes = await fetchWithRetry(thumbApiUrl, {
    headers: { 'User-Agent': userAgent },
  }, `${item.id} thumb`);
  if (!thumbRes.ok) {
    throw new Error(`Cannot get thumbnail metadata for ${item.id}: ${thumbRes.status}`);
  }
  const thumbData = await thumbRes.json();
  const pages = thumbData.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const imageUrl = page?.thumbnail?.source;
  if (!imageUrl) {
    throw new Error(`No thumbnail source for ${item.id}`);
  }
  const imageRes = await fetchWithRetry(imageUrl, {
    headers: { 'User-Agent': userAgent },
  }, `${item.id} image`);
  if (!imageRes.ok) {
    throw new Error(`Cannot download image for ${item.id}: ${imageRes.status}`);
  }
  const arrayBuffer = await imageRes.arrayBuffer();
  const ext = imageUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const fileName = `${item.id}.${ext}`;
  const outputPath = path.join(outputDir, fileName);
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

  data.painting.image = `paintings/${fileName}`;
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Saved ${item.id} -> ${fileName}`);
}
