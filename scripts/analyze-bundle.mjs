import { build } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

await build({
  build: { outDir: '.local/bundle/dist', sourcemap: 'hidden' },
  plugins: [
    visualizer({ filename: '.local/bundle/stats.html', template: 'treemap', sourcemap: true, open: false }),
    visualizer({ filename: '.local/bundle/stats.json', template: 'raw-data', sourcemap: true, open: false }),
  ],
});

await import('./bundle-library-report.mjs');
