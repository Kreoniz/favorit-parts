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
const percent = value => value.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%';
const escape = value => value.replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
const colors = ['#a370f7', '#61c4c0', '#f4be64', '#a5a4f0', '#72ba92', '#e29ab2', '#b7c866', '#7aabe0', '#b7a294', '#cf95d6', '#94b8b3', '#d9ab83'];
const displayed = [...libraries.filter(item => item.percent >= .5)];
const small = libraries.filter(item => item.percent < .5);
if (small.length) displayed.push({ name: 'Остальные', bytes: small.reduce((sum, item) => sum + item.bytes, 0), percent: small.reduce((sum, item) => sum + item.percent, 0) });
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

layout(displayed.map((item, index) => ({ ...item, index })), 24, 192, 740, 456);
const rectangles = tiles.map(tile => {
  const x = tile.x + 2;
  const y = tile.y + 2;
  const width = tile.width - 4;
  const height = tile.height - 4;
  const label = width > Math.max(150, tile.name.length * 12 + 28) && height > 58 ? tile.name : `${tile.index + 1}`;
  const labelX = x + (width < 50 ? 6 : 14);
  const labelSize = Math.min(21, (width - 12) / (label.length * .65));
  const size = width > 150 && height > 84 ? `<text x="${x + 14}" y="${y + 58}" class="tile-size">${kb(tile.bytes)} КБ · ${percent(tile.percent)}</text>` : '';
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="${colors[tile.index % colors.length]}"/><text x="${labelX}" y="${y + Math.min(32, height - 8)}" class="tile-name" style="font-size:${labelSize}px">${escape(label)}</text>${size}</g>`;
}).join('');
const legend = displayed.map((item, index) => {
  const y = 212 + index * 31;
  return `<rect x="796" y="${y - 13}" width="12" height="12" rx="2" fill="${colors[index % colors.length]}"/><text x="818" y="${y}" class="legend">${index + 1}. ${escape(item.name)}</text><text x="1176" y="${y}" text-anchor="end" class="legend">${kb(item.bytes)} КБ</text>`;
}).join('');
const cards = chunks.map((chunk, index) => {
  const x = 24 + index * 588;
  return `<g transform="translate(${x},0)"><rect y="88" width="564" height="72" rx="8" fill="#27272a"/><text x="16" y="115" class="chunk">${escape(chunk.file)}</text><text x="16" y="143" class="note">${kb(chunk.raw)} КБ минификация · ${kb(chunk.gzip)} КБ gzip</text></g>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="744" viewBox="0 0 1200 744" role="img" aria-labelledby="title desc"><title id="title">Состав production-бандла по библиотекам и чанкам</title><desc id="desc">${libraries.map(item => `${escape(item.name)}: ${kb(item.bytes)} КБ`).join('. ')}</desc><rect width="1200" height="744" rx="12" fill="#18181b"/><style>text{font-family:system-ui,sans-serif;fill:#e4e4e7}.title{font-size:26px;font-weight:600}.chunk{font-size:20px;font-weight:600}.note{font-size:18px;fill:#a1a1aa}.legend{font-size:16px}.tile-name{font-size:21px;font-weight:600;fill:#18181b}.tile-size{font-size:18px;fill:#18181b}</style><text x="24" y="40" class="title">Состав JavaScript по библиотекам</text><text x="24" y="68" class="note">Минифицированные байты по sourcemaps. Транспортное сжатие показано отдельно для чанков.</text>${cards}${rectangles}${legend}<text x="24" y="688" class="note">Площадь блоков пропорциональна вкладу в JS. CSS показан отдельным файлом сверху.</text><text x="24" y="719" class="note">1 КБ = 1000 байт. Общий gzip нельзя точно разложить на сумму gzip отдельных библиотек.</text></svg>\n`;
await writeFile('docs/assets/bundle-libraries.svg', svg);
await writeFile('docs/assets/bundle-libraries.png', new Resvg(svg, { font: { defaultFontFamily: 'DejaVu Sans' } }).render().asPng());
await writeFile('.local/bundle/library-chart.html', `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><style>html,body{margin:0!important;padding:0!important}svg{display:block}</style></head><body>${svg}</body></html>`);
console.table(libraries.map(item => ({ library: item.name, bytes: item.bytes, share: percent(item.percent) })));
console.log('Interactive report: .local/bundle/stats.html');
