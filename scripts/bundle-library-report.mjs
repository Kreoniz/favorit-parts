import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';

const stats = JSON.parse(await readFile('.local/bundle/stats.json', 'utf8'));
const directory = '.local/bundle/dist';
const chunks = [];
const groups = new Map();
const add = (name, bytes) => groups.set(name, (groups.get(name) || 0) + bytes);

function library(id) {
  if (id.includes('@reduxjs/toolkit/dist/query/')) return 'RTK Query';
  if (!id.includes('/node_modules/')) return id.startsWith('/src/') ? 'Приложение' : 'Служебный код';
  const path = id.split('/node_modules/').at(-1);
  return path.split('/').slice(0, path.startsWith('@') ? 2 : 1).join('/');
}

for (const meta of Object.values(stats.nodeMetas)) {
  for (const uid of Object.values(meta.moduleParts)) {
    add(library(meta.id), stats.nodeParts[uid].renderedLength);
  }
}

for (const file of (await readdir(`${directory}/assets`)).filter(file => /\.(js|css)$/.test(file))) {
  const bytes = await readFile(`${directory}/assets/${file}`);
  chunks.push({ file: `assets/${file}`, raw: bytes.length, gzip: gzipSync(bytes).length });
}
const jsBytes = chunks.filter(chunk => chunk.file.endsWith('.js')).reduce((sum, chunk) => sum + chunk.raw, 0);
const mappedBytes = [...groups.values()].reduce((sum, bytes) => sum + bytes, 0);
if (mappedBytes > jsBytes) throw new Error('Module attribution exceeds the JavaScript bundle size');
add('Служебный код', jsBytes - mappedBytes);
const libraries = [...groups].filter(([, bytes]) => bytes > 0)
  .map(([name, bytes]) => ({ name, bytes, percent: bytes / jsBytes * 100 }))
  .sort((a, b) => b.bytes - a.bytes);
const report = {
  measuredAt: new Date().toISOString(),
  method: 'Minified UTF-8 bytes attributed with rollup-plugin-visualizer sourcemaps; unmapped bytes included in runtime',
  gzipLevel: 6,
  chunks,
  libraries,
};
await mkdir('docs/assets', { recursive: true });
await writeFile('docs/bundle-libraries.json', JSON.stringify(report, null, 2) + '\n');

const kb = bytes => (bytes / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const escape = value => value.replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
const colors = ['#8795e8', '#71b5c3', '#d6bc82', '#9b9ccc', '#8db5a3', '#c69eb0', '#a7b684', '#77818f'];
const displayed = libraries.slice(0, 7);
const small = libraries.slice(7);
if (small.length) displayed.push({ name: 'Другое', bytes: small.reduce((sum, item) => sum + item.bytes, 0) });
displayed.sort((a, b) => b.bytes - a.bytes);
const tiles = [];

function layout(items, x, y, width, height) {
  if (items.length === 1) {
    tiles.push({ ...items[0], x, y, width, height });
    return;
  }
  const total = items.reduce((sum, item) => sum + item.bytes, 0);
  let split = 1;
  let first = items[0].bytes;
  while (split < items.length - 1 && Math.abs(first + items[split].bytes - total / 2) < Math.abs(first - total / 2)) {
    first += items[split++].bytes;
  }
  const ratio = first / total;
  if (width >= height) {
    layout(items.slice(0, split), x, y, width * ratio, height);
    layout(items.slice(split), x + width * ratio, y, width * (1 - ratio), height);
  } else {
    layout(items.slice(0, split), x, y, width, height * ratio);
    layout(items.slice(split), x, y + height * ratio, width, height * (1 - ratio));
  }
}

layout(displayed.map((item, index) => ({ ...item, index })), 20, 118, 620, 350);
const rectangles = tiles.map(tile => {
  const x = tile.x + 2;
  const y = tile.y + 2;
  const width = tile.width - 4;
  const height = tile.height - 4;
  const label = width > tile.name.length * 12 + 28 && height > 48
    ? `<text x="${x + 14}" y="${y + 31}" class="tile-name">${escape(tile.name)}</text>` : '';
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="${colors[tile.index]}"/>${label}</g>`;
}).join('');
const legend = displayed.map((item, index) => {
  const y = 158 + index * 40;
  return `<rect x="670" y="${y - 12}" width="11" height="11" rx="2" fill="${colors[index]}"/><text x="693" y="${y}" class="legend">${escape(item.name)}</text><text x="976" y="${y}" text-anchor="end" class="legend">${kb(item.bytes)} КБ</text>`;
}).join('');
const cards = chunks.map((chunk, index) => {
  const x = 20 + index * 490;
  const label = chunk.file.endsWith('.js') ? 'JS' : 'CSS';
  return `<g transform="translate(${x},0)"><rect y="20" width="470" height="64" rx="8" fill="#27272a"/><text x="16" y="60" class="chunk">${label} ${kb(chunk.raw)} КБ</text><text x="454" y="59" text-anchor="end" class="muted">gzip ${kb(chunk.gzip)} КБ</text></g>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="488" viewBox="0 0 1000 488" role="img" aria-labelledby="title desc"><title id="title">Бандл Favorit Parts</title><desc id="desc">Минифицированные байты по sourcemaps; 1 КБ = 1000 байт. ${libraries.map(item => `${escape(item.name)}: ${kb(item.bytes)} КБ`).join('. ')}</desc><rect width="1000" height="488" rx="12" fill="#18181b"/><style>text{font-family:system-ui,sans-serif;fill:#e4e4e7}.chunk{font-size:23px;font-weight:600}.muted{font-size:18px;fill:#a1a1aa}.legend{font-size:17px}.tile-name{font-size:22px;font-weight:600;fill:#18181b}</style>${cards}<text x="670" y="112" class="muted">JS · минификация</text>${rectangles}${legend}</svg>\n`;
await writeFile('docs/assets/bundle-libraries.svg', svg);
await writeFile('docs/assets/bundle-libraries.png', new Resvg(svg, { font: { defaultFontFamily: 'DejaVu Sans' } }).render().asPng());
await writeFile('.local/bundle/library-chart.html', `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><style>html,body{margin:0!important;padding:0!important}svg{display:block}</style></head><body>${svg}</body></html>`);
console.table(libraries.map(item => ({ library: item.name, bytes: item.bytes })));
console.log('Interactive report: .local/bundle/stats.html');
