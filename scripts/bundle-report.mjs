import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

const files = [];
for (const path of ['index.html', 'favicon.svg', ...(await readdir('dist/assets')).map(name => `assets/${name}`)]) {
  const bytes = await readFile(`dist/${path}`);
  files.push({
    file: path,
    raw: bytes.length,
    gzip: gzipSync(bytes).length,
    brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  });
}

const chunks = files.filter(file => /\.(js|css)$/.test(file.file));
const kb = bytes => (bytes / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const height = 144 + chunks.length * 96;
const panels = ['raw', 'gzip'].map((encoding, index) => {
  const maximum = Math.max(...chunks.map(chunk => chunk[encoding]));
  const rows = chunks.map((chunk, row) => {
    const css = chunk.file.endsWith('.css');
    const width = chunk[encoding] / maximum * 380;
    const y = 86 + row * 96;
    return `<text x="0" y="${y}" class="label">${css ? 'CSS' : 'JavaScript'}<tspan x="380" text-anchor="end">${kb(chunk[encoding])} КБ</tspan></text>
      <rect y="${y + 16}" width="380" height="22" rx="4" fill="#3f3f46"/>
      <rect y="${y + 16}" width="${width.toFixed(2)}" height="22" rx="4" fill="${css ? '#a1a1aa' : '#a370f7'}"/>
      <text y="${y + 59}" class="note">${chunk.file.replace('assets/', '')}</text>`;
  }).join('');
  return `<g transform="translate(${32 + index * 444},0)"><text y="42" class="title">${encoding === 'raw' ? 'Минифицированные файлы' : 'После gzip'}</text>${rows}</g>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Размер JavaScript и CSS в production-сборке</title>
  <desc id="desc">${chunks.map(chunk => `${chunk.file}: ${kb(chunk.raw)} КБ, gzip ${kb(chunk.gzip)} КБ`).join('. ')}. Шкала каждого графика отдельная.</desc>
  <rect width="920" height="${height}" rx="12" fill="#18181b"/>
  <style>text{fill:#e4e4e7;font-family:system-ui,sans-serif}.title{font-size:21px;font-weight:600}.label{font-size:18px}.note{font-size:15px;fill:#a1a1aa}</style>
  ${panels}
  <text x="32" y="${height - 51}" class="note">Размеры по файлам. Шкалы графиков независимы.</text>
  <text x="32" y="${height - 25}" class="note">1 КБ = 1000 байт. Сжатие рассчитано локально; способ передачи зависит от хостинга.</text>
</svg>\n`;

await mkdir('docs/assets', { recursive: true });
await writeFile('docs/assets/bundle-size.svg', svg);
await writeFile('docs/bundle-size.json', JSON.stringify({ measuredAt: new Date().toISOString(), compression: { gzipLevel: 6, brotliQuality: 11 }, files }, null, 2) + '\n');
console.table(files.map(file => ({ file: file.file, 'minified, KB': kb(file.raw), 'gzip, KB': kb(file.gzip), 'brotli, KB': kb(file.brotli) })));
