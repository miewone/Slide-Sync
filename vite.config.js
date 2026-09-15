import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readdirSync,readFileSync} from 'node:fs';

/** Invalidate persisted HTML when rendering code or bundled resources change. */
function previewCacheVersion() {
  const hash=createHash('sha256');
  const visit=url=>{
    for(const entry of readdirSync(url,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const child=new URL(entry.name+(entry.isDirectory()?'/':''),url);
      if(entry.isDirectory())visit(child);
      else {hash.update(child.pathname);hash.update(readFileSync(child));}
    }
  };
  visit(new URL('./src/',import.meta.url));visit(new URL('./public/',import.meta.url));
  return hash.digest('hex');
}

/** Expose optional GA4 configuration without loading tags before consent; hash inline scripts for CSP. */
function productionCsp() {
  let measurementId = '';
  return {
    name:'slide-sync-production-csp', apply:'build',
    configResolved(config) {
      measurementId = config.isProduction ? 'G-E1J2X2B0FL' : '';
    },
    generateBundle: {
      order:'post',
      handler(_options, bundle) {
        for (const asset of Object.values(bundle)) {
          if (asset.type !== 'asset' || !asset.fileName.endsWith('.html')) continue;
          let html = String(asset.source);
          if (measurementId)html=html.replace('</head>',`<meta name="slide-sync-ga4" content="${measurementId}"></head>`);
          const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
            .filter(match => match[1].trim()).map(match => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
          const analyticsScript = measurementId ? ' https://www.googletagmanager.com' : '';
          const analyticsImages = measurementId ? ' https://*.google-analytics.com https://www.googletagmanager.com' : '';
          const analyticsConnections = measurementId ? ' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com' : '';
          const googleScripts=' https://accounts.google.com/gsi/client https://apis.google.com';
          const googleFrames=' https://accounts.google.com https://docs.google.com https://drive.google.com https://apis.google.com';
          const googleConnections=' https://accounts.google.com/gsi/ https://www.googleapis.com https://slides.googleapis.com https://apis.google.com';
          const googleImages=' https://*.googleusercontent.com';
          const googleStyles=' https://accounts.google.com/gsi/style';
          const policy = `default-src 'self'; script-src 'self'${analyticsScript}${googleScripts} ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'${googleStyles}; img-src 'self' data: blob:${analyticsImages}${googleImages}; font-src 'self' data: blob:; frame-src 'self' about:${googleFrames}; connect-src 'self'${analyticsConnections}${googleConnections}; object-src 'none'; base-uri 'self'; form-action 'none'`;
          html = html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
          asset.source = html;
        }
      },
    },
  };
}

export default defineConfig({
  define:{__PREVIEW_CACHE_VERSION__:JSON.stringify(previewCacheVersion())},
  plugins:[react(), productionCsp()],
  resolve:{alias:Object.fromEntries(Object.entries({tslib:'tslib.es6.js',jszip:'jszip-adapter.js',lodash:'lodash-adapter.js',uuid:'uuid-adapter.js',echarts:'echarts-adapter.js'}).map(([name,file])=>[name,fileURLToPath(new URL(`./src/vendor/${file}`,import.meta.url))]))},
  build:{target:'es2022', sourcemap:false},
  server:{host:'127.0.0.1'},
  preview:{host:'127.0.0.1'},
});
