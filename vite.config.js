import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

/** Hash final inline scripts and keep the production page limited to local assets. */
function productionCsp() {
  return {
    name:'slide-sync-production-csp', apply:'build',
    generateBundle: {
      order:'post',
      handler(_options, bundle) {
        for (const asset of Object.values(bundle)) {
          if (asset.type !== 'asset' || !asset.fileName.endsWith('.html')) continue;
          let html = String(asset.source);
          const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
            .filter(match => match[1].trim()).map(match => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
          const policy = `default-src 'self'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'self' about:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`;
          html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
          asset.source = html;
        }
      },
    },
  };
}

export default defineConfig({
  plugins:[react(), productionCsp()],
  resolve:{alias:Object.fromEntries(Object.entries({tslib:'tslib.es6.js',jszip:'jszip-adapter.js',lodash:'lodash-adapter.js',uuid:'uuid-adapter.js',echarts:'echarts-adapter.js'}).map(([name,file])=>[name,fileURLToPath(new URL(`./src/vendor/${file}`,import.meta.url))]))},
  build:{target:'es2022', sourcemap:false},
  server:{host:'127.0.0.1'},
  preview:{host:'127.0.0.1'},
});
